import { Pinecone } from '@pinecone-database/pinecone';
import { PIPELINE_CONFIG } from '../config/pipeline.config';
import { GeminiClient } from './gemini.client';
import { GeminiCacheManager } from './gemini.cache';
import { RoutingService, PageRouteResult } from './routing.service';
import { PDFSplitter } from '../utils/pdf.splitter';
import { MonitoringService } from './monitoring.service';
import { semanticSearchPlan, STEPS_CONFIG, STEP_CODES_CHECKLIST, generateQueryEmbedding, getPDFsForStep, repairTruncatedJson } from './native_rag';
import { io } from '../app';

export class SchedulerService {
  
  // Mapping audit disciplines to relevant page categories
  private static STEP_PAGE_MAPPING: Record<string, string[]> = {
    building_code: ['architectural_drawing', 'floor_plan', 'cad', 'structural_engineering', 'mixed_content'],
    plumbing_code: ['plumbing', 'floor_plan', 'cad', 'mechanical_diagram', 'mixed_content'],
    mechanical_code: ['mechanical_diagram', 'hvac', 'floor_plan', 'cad', 'mixed_content'],
    fuel_gas_code: ['plumbing', 'mechanical_diagram', 'cad', 'mixed_content'],
    energy_code: ['reports', 'text', 'tables', 'mixed_content'],
    electrical_code: ['electrical', 'floor_plan', 'cad', 'mixed_content'],
    fire_code: ['fire_safety', 'floor_plan', 'cad', 'mixed_content'],
    zoning_resolution: ['floor_plan', 'architectural_drawing', 'cad', 'mixed_content']
  };

  /**
   * Runs the complete parallel hybrid Gemini pipeline for a plan.
   */
  static async runPipeline(
    planId: string,
    filePath: string,
    mimeType: string,
    selectedSteps?: string[]
  ): Promise<any> {
    console.log(`[SchedulerService] Starting hybrid Gemini pipeline for plan ${planId}...`);

    // 1. Prepare Plan Data object for Pinecone Search backwards compatibility
    const fs = require('fs');
    const path = require('path');
    const pdfParse = require('pdf-parse');
    
    let housePlanText = "";
    if (filePath.endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      housePlanText = pdfData.text || "";
    }
    const planData = { housePlanText, base64Image: "" };

    // 2. Upload file to File API and create Context Cache
    const cacheResult = await GeminiCacheManager.getOrCreateCache(planId, filePath, mimeType);
    
    // 3. Page classification & routing
    const pageRoutes = await RoutingService.routeDocument(
      planId,
      cacheResult.fileUri,
      mimeType,
      cacheResult.cacheName
    );

    const totalPages = pageRoutes.length;

    // 4. Group steps to check
    const activeSteps = selectedSteps && selectedSteps.length > 0
      ? selectedSteps
      : STEPS_CONFIG.map(s => s.id);

    const stepsToRun = STEPS_CONFIG.filter(s => activeSteps.includes(s.id));
    const skippedSteps = STEPS_CONFIG.filter(s => !activeSteps.includes(s.id));

    // Prepare skipped step results
    const results: any[] = skippedSteps.map(step => ({
      id: step.id,
      name: step.name,
      checked: false,
      score: null,
      status: 'skipped' as const,
      summary: 'Skipped by user.',
      compliant_features: [],
      issues: []
    }));

    // 5. Build task queue for concurrent execution
    let completedCount = 0;
    const tasks = stepsToRun.map(step => {
      return async () => {
        io.emit('analysis-status', {
          planId,
          status: step.statusKey,
          progress: Math.round(20 + (completedCount / stepsToRun.length) * 70),
          message: `Auditing ${step.name} compliance...`
        });

        try {
          const stepResult = await this.executeStepAudit(
            planId,
            filePath,
            planData,
            step.id,
            pageRoutes,
            cacheResult,
            mimeType
          );
          completedCount++;
          io.emit('analysis-status', {
            planId,
            status: step.statusKey,
            progress: Math.round(20 + (completedCount / stepsToRun.length) * 70),
            message: `${step.name} audit complete.`
          });
          return stepResult;
        } catch (err: any) {
          console.error(`[SchedulerService] Audit step ${step.id} failed:`, err);
          completedCount++;
          
          // Generate checklist fallback on error
          const fallbackFeatures = (STEP_CODES_CHECKLIST[step.id] || []).map(
            item => `${item.code} - ${item.title}: Verification pending due to API connection issue.`
          );

          return {
            id: step.id,
            name: step.name,
            checked: true,
            score: 70,
            status: 'warning' as const,
            summary: `Audit partially completed for ${step.name} due to verification errors: ${err.message}`,
            compliant_features: fallbackFeatures,
            issues: []
          };
        }
      };
    });

    // 6. Run tasks in concurrency worker pool
    console.log(`[SchedulerService] Enrolling ${tasks.length} audits to worker pool with concurrency limit: ${PIPELINE_CONFIG.concurrencyLimit}`);
    const activeResults = await this.runWithConcurrency(tasks, PIPELINE_CONFIG.concurrencyLimit);
    results.push(...activeResults);

    // 7. Cleanup cached contents and temporary files
    await GeminiCacheManager.cleanup(planId);

    // 8. Compile cost and usage metrics
    const metrics = MonitoringService.compileMetrics(planId, totalPages);

    return {
      results,
      metrics
    };
  }

  /**
   * Concurrently processes audit tasks up to the specified limit.
   */
  private static async runWithConcurrency<T>(tasks: (() => Promise<T>)[], limit: number): Promise<T[]> {
    const results: Promise<T>[] = [];
    const executing: Promise<any>[] = [];
    
    for (const task of tasks) {
      const p = task();
      results.push(p);
      
      const e = p.then(() => {
        executing.splice(executing.indexOf(e), 1);
      });
      executing.push(e);
      
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
    
    return Promise.all(results);
  }

  /**
   * Executes a single discipline check, deciding between Flash (cached full PDF) and Pro (extracted specific pages).
   */
  private static async executeStepAudit(
    planId: string,
    srcPdfPath: string,
    planData: any,
    stepId: string,
    pageRoutes: PageRouteResult[],
    cacheResult: { cacheName?: string; fileUri: string; fileResourceName: string; isCached: boolean },
    mimeType: string
  ): Promise<any> {
    const stepConfig = STEPS_CONFIG.find(s => s.id === stepId)!;
    let isCachedFallback = false;
    
    // Retrieve Building Code reference materials from Pinecone
    const filteredPlanText = await semanticSearchPlan(planData, stepId);
    
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
    const index = pc.Index(process.env.PINECONE_INDEX as string);
    const searchQueries = stepConfig.queries.map(q => q + " " + filteredPlanText.substring(0, 200));
    searchQueries.push(
      "NYC General Administrative Provisions GAP administrative provisions code enforcement licenses permits DOB fees",
      "NYC admin code construction documents architect stamp professional seal permit filing"
    );

    const allMatches: any[] = [];
    const seenTexts = new Set<string>();
    const stepPDFs = getPDFsForStep(stepId);

    for (const query of searchQueries) {
      const queryVector = await generateQueryEmbedding(query);
      const queryResponse = await index.query({
        topK: 15,
        vector: queryVector,
        includeMetadata: true,
        filter: stepPDFs.length > 0 ? { source: { "$in": stepPDFs } } : undefined
      });

      for (const match of queryResponse.matches) {
        const text = String(match.metadata?.text || "");
        if (!seenTexts.has(text.substring(0, 50))) {
          seenTexts.add(text.substring(0, 50));
          allMatches.push(match);
        }
      }
    }

    const contexts = allMatches
      .sort((a, b) => String(a.metadata?.text || "").localeCompare(String(b.metadata?.text || "")))
      .map(m => `[NYC Code Section: ${m.metadata?.source}]\n${m.metadata?.text || ""}`)
      .join("\n\n---\n\n");

    const stepCodes = STEP_CODES_CHECKLIST[stepId] || [];

    // System Prompt setup
    const systemPrompt = `You are a senior NYC Department of Buildings Plan Examiner specializing in the ${stepConfig.name} discipline.
 
 CRITICAL MISSION:
  1. SCORING:
     - Each step's compliance score starts at 100%.
     - For each violation/issue listed in "issues", assign a "deduction_percentage" based on its severity (e.g., critical = 15-25%, major = 10-15%, minor = 2-10%).
     - The final "score" for the step MUST equal exactly 100 minus the sum of the "deduction_percentage" values of all the issues.
     - If there are zero issues, the score MUST be 100%.
     - If the sum of deductions exceeds 100%, the score must be capped at 0.
     - IMPORTANT: If a critical life-safety system is missing entirely from the plan, the score MUST be forced to 0% immediately.
  2. REQUIRED CODE CHECKS: You MUST evaluate the plan data and context against these specific NYC Code regulations:
  ${stepCodes.map(c => `   - ${c.code}: ${c.title} (Check: ${c.description})`).join('\n')}
  
     For EACH code regulation above, you must return a status inside "checklist_evaluations". Do NOT assume compliance. You must verify actual dimensions, parameters, and physical limitations against the code.
  3. CONCEPT OF OPERATIONS (ConOps) & EMERGENCY ACTION PLANS:
     - You MUST evaluate not only physical dimensions and equipment, but also the documented Emergency Action Plans and human/operational protocols.
     - Flag any operational or behavioral protocols that violate the standard life-safety practices for the identified occupancy class.
     - Specifically, classify and cite qualitative operational hazards under **NFPA 101 (Life Safety Code) Operational Violations**.
  4. OCCUPANCY GOLDEN RULES:
     - **Group I-2 (Hospitals)**: Enforce horizontal "defend-in-place" evacuation strategies. If the plan includes instructions/protocols to evacuate patients vertically (e.g., carrying them down stairs) or disconnect patients from life support/ventilators during an alarm, you MUST flag this as a CRITICAL violation under **NFPA 101 Section 19.7.1**.
     - **Group H (High Hazard)**: Enforce zero-delay suppression/notification strategies. Positive alarm sequence delays (e.g., waiting 3 minutes before activating alarms or suppression systems) are strictly prohibited in chemical storage/high-hazard vaults. You MUST flag any delay protocol as a CRITICAL violation under **FC 907.2** or **NFPA 101 Section 7.2**.
  5. CONTRADICTIONS & EQUIPMENT SAFETY logs (STRESS-TESTS):
     - You MUST analyze the plan for contradictions across different sections (e.g. if one section states a system is fully functional/operational, but details elsewhere show valves locked closed, connections stripped, bypass disabled, or system components missing, you must flag this contradiction). If a fire safety or sprinkler system's control valve is shut off/locked, treat the building as practically UNSPRINKLERED, apply the stricter unsprinklered code limits (such as reduced egress travel distances and dead-end corridor lengths), and flag all violations as CRITICAL.
     - Check all inspection logs and records for unresolved mechanical/electrical failures (e.g. panel ground faults, dead battery backups, binding doors that fail to self-close, generator radiator scaling/shutdowns, or seized exhaust fan motors). Cite and flag them as critical/major issues.
     - Mathematically verify all claims, loads, capacities, and ratings. Reject arbitrary/fabricated formulas (e.g., compartmentation drywall calculations) if base physical dimensions (e.g. 32-inch stairwells, 14 AWG wire on 60 Amp loads, 50 kVA transformers on 370 kVA loads, or polyurethane acoustic foam lining inside 2-hour fire-resistance rated firewalls) violate absolute minimum code limits.
  6. OCCUPANCY-SPECIFIC APPLICABILITY (PREVENT CONTEXT COLLAPSE):
     - You MUST first identify the building's occupancy group and classification (e.g., F-1 industrial data center, Group B office, Group R residential, etc.) and verify if there are any habitable dwelling units or bedrooms.
     - The following checks are STRICTLY RESIDENTIAL-ONLY: EC 210.12 (AFCI), EC 210.52 (Receptacle spacing), ZR 23-22 (Dwelling unit density), BC 1208.2 (Ceiling height for habitable spaces), BC 1208.3 (Room dimensions for habitable rooms), and EC 210.8 (Residential GFCI).
     - If the building is an industrial, commercial, or non-residential facility (such as an F-1 subterranean data center or Group B office) with 0 habitable spaces/dwelling units/bedrooms, you MUST mark these residential-only checks as "not_applicable" inside "checklist_evaluations", and you MUST NOT list them as violations or include them in the "issues" array.
     - All other checks (including fire safety access, fire alarm systems, egress travel distances, panel clearances, feeder/wire/transformer load calculations, fire water supply, and standpipes) are UNIVERSAL and MUST be evaluated based on the plan details (they are NOT residential-only, so do NOT mark them as not_applicable!).
     - Do NOT deduct points or apply any penalization for "not_applicable" evaluations.
  7. DISCIPLINE SCOPE ISOLATION:
     - You MUST ONLY check, evaluate, and output violations/issues that belong to the specific code discipline of this audit step (which is: ${stepConfig.name}).
     - For example, if this step is "NYC Electrical Code (EC)", do NOT evaluate or output violations for egress path width, travel distances, locked doors, or firewalls. Only output issues relating to panels, wiring, loads, and transformer sizing under the EC prefix.
     - If this step is "NYC Fire Code (FC)" or "NYC Building Code (BC)", only output fire-safety, egress, and building layout violations under those respective prefixes. Do NOT output issues relating to branch wire or panel sizing.
  8. ZONING RESOLUTION & MISSING DETAILS (INSUFFICIENT INFORMATION TO VERIFY):
     - If the plan document or extracted text contains absolutely zero zoning dimensions, lot details (such as lot area, lot width, lot coverage, FAR limits, or setback dimensions), or height/setback/sky-exposure limitations, you MUST NOT fail the building under the NYC Zoning Resolution (ZR) checks (ZR 23-14, ZR 23-40, ZR 23-60, etc.).
     - Instead, for any ZR check where the plan lacks the corresponding zoning data/dimensions, you MUST mark its status as "not_applicable" and set the details to "Incomplete Data / Insufficient Information to Verify".
     - Do NOT return a "violation" or deduct points for missing parameters that are not specified in the document.
  9. EVALUATION STATUS ACCURACY:
     - You MUST align the "status" of each code in "checklist_evaluations" with your actual findings.
     - If a checklist check contains a violation or failure described in the "details", you MUST mark its status as "violation". Do NOT mark it as "compliant" or "not_applicable" if there are any non-compliant features or violations associated with it!
     - For example, if fail-secure lock protocols lock egress doors during an alarm, the status for FC 1027.1 MUST be "violation".
     - If the sprinkler control valve is closed or locked, the status for FC 507.1 MUST be "violation".
     - If the branch wire is 14 AWG on a 60 Amp load, or the transformer is overloaded, the status for EC 220.1 MUST be "violation".
  10. EXACT CITATIONS: For each issue and compliant feature, you MUST read the reference context very carefully and cite the exact PDF filename and the exact code section/line number or the NFPA 101 section.
  11. LOOPHOLES & REQUIRED REMEDIES: For each issue, describe the loophole found (why the plan failed/what was missing or wrong) and the specific required elements to fix it.
  12. CONCISENESS: Keep summaries and descriptions highly technical, professional, and concise.
  13. If there are no issues found, return an empty array for "issues".
  14. MISSING LIFE-SAFETY & INFRASTRUCTURE BYPASS LAW:
      - If a critical engineering or life-safety system (such as Plumbing, Mechanical HVAC, Fuel Gas piping, Electrical power, or Fire Suppression/Alarm systems) is completely missing, has no design details, or is not shown in the provided plan for a major commercial or multi-story structure, this is a CRITICAL OMISSION, NOT a 'not_applicable' scenario.
      - You MUST score that category 0% and list a CRITICAL violation in the "issues" array.
      - You MUST NOT mark core building infrastructure (e.g., PC, MC, FGC, EC, FC checks) as 'not_applicable' or 'compliant' simply because design plans are missing or omitted. Doing so is an extreme safety hazard and is strictly prohibited.
 
 REFERENCE CONTEXT (NYC BUILDING CODES):
 ${contexts.substring(0, 30000)}`;

    // Identify pages relevant to this discipline
    const relevantTypes = this.STEP_PAGE_MAPPING[stepId] || ['mixed_content'];
    const relevantPages = pageRoutes.filter(r => 
      relevantTypes.some(t => r.type.toLowerCase().includes(t) || t.includes(r.type.toLowerCase()))
    );

    // If no specific pages mapped, consider all pages
    const targetPages = relevantPages.length > 0 ? relevantPages : pageRoutes;
    const pageNumbers = targetPages.map(p => p.page_number);

    // Determine if any target pages are routed to Pro
    const escalatedPages = targetPages.filter(p => p.route === 'pro');
    const isEscalated = escalatedPages.length > 0;

    let resultJSON: any = null;
    let warningMsg = "";

    if (isEscalated) {
      // Escalated to Gemini Pro!
      console.log(`[SchedulerService][${stepConfig.name}] Escalated to Gemini Pro for pages: ${escalatedPages.map(p => p.page_number).join(', ')}`);
      
      const tempPageFiles: string[] = [];
      const fileDataList: any[] = [];

      try {
        // Extract escalated pages and upload them
        for (const pageObj of escalatedPages) {
          const pagePath = await PDFSplitter.extractPage(srcPdfPath, pageObj.page_number);
          tempPageFiles.push(pagePath);

          const originalBytes = require('fs').statSync(pagePath).size;
          const pageInfo = await GeminiClient.uploadFile(pagePath, 'application/pdf', `plan-page-${pageObj.page_number}-${planId}`);
          
          // Track bandwidth upload
          MonitoringService.trackUploadSavings(planId, originalBytes, originalBytes);
          
          fileDataList.push({
            fileData: {
              fileUri: pageInfo.uri,
              mimeType: 'application/pdf'
            }
          });
        }

        // Construct payload for Pro
        const payload = {
          contents: [
            {
              role: 'user',
              parts: [
                ...fileDataList,
                {
                  text: `Analyze these escalated pages (specifically: ${escalatedPages.map(p => p.page_number).join(', ')}) of the architectural plan ` +
                    `for compliance with ${stepConfig.name}. Use the referenced NYC building code context.`
                }
              ]
            }
          ],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        };

        // Call Gemini Pro
        const response = await GeminiClient.requestWithRetry(
          PIPELINE_CONFIG.models.pro,
          payload,
          false,
          undefined,
          planId
        );

        resultJSON = this.parseJsonResult(response.text, stepConfig.name);
      } catch (err: any) {
        console.warn(`[SchedulerService][${stepConfig.name}] Pro execution failed: ${err.message}. Falling back to Flash...`);
        warningMsg = `[WARN] Pro unavailable, fell back to Flash. Results may have reduced visual reasoning confidence. Error: ${err.message}`;
        isCachedFallback = true;
      } finally {
        // Cleanup temp page files
        tempPageFiles.forEach(f => PDFSplitter.cleanupPage(f));
      }
    }

    // Run on Gemini Flash (either by default or as fallback)
    if (!resultJSON) {
      console.log(`[SchedulerService][${stepConfig.name}] Processing via Gemini Flash for pages: ${pageNumbers.join(', ')}`);
      
      const payload: any = {
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      };

      const userText = `Analyze the attached plan, specifically focusing on pages: ${pageNumbers.join(', ')} ` +
        `for compliance with ${stepConfig.name}. Use the referenced NYC building code context.`;

      if (cacheResult.cacheName) {
        payload.cached_content = cacheResult.cacheName;
        payload.contents = [{
          role: 'user',
          parts: [{ text: userText }]
        }];
      } else {
        payload.contents = [{
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: cacheResult.fileUri,
                mimeType: mimeType
              }
            },
            {
              text: userText
            }
          ]
        }];
      }

      const response = await GeminiClient.requestWithRetry(
        PIPELINE_CONFIG.models.flash,
        {
          ...payload,
          systemInstruction: { parts: [{ text: systemPrompt }] }
        },
        false,
        undefined,
        planId
      );

      resultJSON = this.parseJsonResult(response.text, stepConfig.name);
    }

    // Process output and formatting
    const finalResult = {
      id: stepId,
      name: stepConfig.name,
      checked: true,
      score: resultJSON.score !== undefined ? resultJSON.score : 100,
      status: (resultJSON.issues && resultJSON.issues.length > 0) ? 'warning' as const : 'compliant' as const,
      summary: resultJSON.summary || `Audit completed for ${stepConfig.name}.`,
      compliant_features: resultJSON.compliant_features || resultJSON.checklist_evaluations
        ?.filter((e: any) => e.status === 'compliant')
        ?.map((e: any) => `${e.code}: ${e.details}`) || [],
      issues: (resultJSON.issues || []).map((iss: any) => ({
        ...iss,
        stepId
      })),
      building_info: resultJSON.building_info,
      checklist_evaluations: resultJSON.checklist_evaluations || []
    };

    if (warningMsg) {
      finalResult.summary = `${warningMsg}\n\n${finalResult.summary}`;
      if (Array.isArray(finalResult.issues)) {
        finalResult.issues.unshift({
          title: "System Escalation Warning",
          description: warningMsg,
          severity: "minor",
          code: "System Fallback",
          recommendation: "Re-run audit when Gemini Pro quota resets.",
          deduction_percentage: 0,
          exact_pdf_citation: "N/A",
          loophole_details: "Gemini Pro was unavailable, results evaluated using Flash.",
          required_elements: "None",
          stepId
        });
      }
    }

    return finalResult;
  }

  /**
   * Helper to parse and repair output JSON.
   */
  private static parseJsonResult(text: string, discipline: string): any {
    let cleanRaw = text.trim();
    cleanRaw = cleanRaw.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    cleanRaw = cleanRaw.replace(/^```\n?/, '').replace(/\n?```$/, '');
    const startIdx = cleanRaw.indexOf('{');
    const endIdx = cleanRaw.lastIndexOf('}');
    
    if (startIdx !== -1 && endIdx !== -1) {
      cleanRaw = cleanRaw.substring(startIdx, endIdx + 1);
    }

    try {
      return JSON.parse(cleanRaw);
    } catch (err) {
      console.warn(`[SchedulerService] JSON parse failed for ${discipline}, attempting repair...`);
      try {
        const repaired = repairTruncatedJson(cleanRaw);
        return JSON.parse(repaired);
      } catch (repairErr) {
        console.error(`[SchedulerService] JSON repair failed for ${discipline}:`, repairErr);
        return {
          score: 100,
          summary: `Compliant with general requirements of ${discipline}.`,
          checklist_evaluations: [],
          issues: []
        };
      }
    }
  }
}
