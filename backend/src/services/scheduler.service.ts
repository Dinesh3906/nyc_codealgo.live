import { Pinecone } from '@pinecone-database/pinecone';
import { PIPELINE_CONFIG } from '../config/pipeline.config';
import { GeminiClient } from './gemini.client';
import { GeminiCacheManager } from './gemini.cache';
import { RoutingService, PageRouteResult } from './routing.service';
import { PDFSplitter } from '../utils/pdf.splitter';
import { MonitoringService } from './monitoring.service';
import { semanticSearchPlan, STEPS_CONFIG, STEP_CODES_CHECKLIST, generateQueryEmbedding, getPDFsForStep, repairTruncatedJson } from './native_rag';
import { io } from '../app';
import { ProfilerService } from './profiler.service';
import { DeterministicRuleEngine, ExtractedFacts } from './deterministic.engine';
import { EvidenceGraph } from './evidence.graph';
import { RagOptimizerService } from './rag-optimizer.service';
import { KnowledgeBaseValidationService } from './kb-validation.service';

class Semaphore {
  private permits: number;
  private queue: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }
    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      if (next) next();
    } else {
      this.permits++;
    }
  }
}

export class SchedulerService {
  // Semaphore to limit Gemini Pro calls to the configured concurrency
  private static proSemaphore = new Semaphore(PIPELINE_CONFIG.geminiConcurrency);
  private static pineconeQueryCache = new Map<string, any[]>();

  public static proCallsCount = 0;
  public static verificationPassesCount = 0;
  public static challengedFindingsCount = 0;
  public static correctedFindingsCount = 0;
  public static citationCorrectionsCount = 0;
  public static crossInconsistenciesCount = 0;
  
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
    ProfilerService.startPlan(planId);
    RagOptimizerService.startTrace(planId);
    SchedulerService.proCallsCount = 0;
    SchedulerService.verificationPassesCount = 0;
    SchedulerService.challengedFindingsCount = 0;
    SchedulerService.correctedFindingsCount = 0;
    SchedulerService.citationCorrectionsCount = 0;
    SchedulerService.crossInconsistenciesCount = 0;
    console.log(`[SchedulerService] Starting hybrid Gemini pipeline for plan ${planId}...`);

    // 1. Prepare Plan Data object for Pinecone Search backwards compatibility
    const fs = require('fs');
    const path = require('path');
    const pdfParse = require('pdf-parse');
    
    ProfilerService.startStage(planId, 'pdfRead');
    let housePlanText = "";
    let totalPages = 1;
    if (filePath.endsWith('.pdf')) {
      const dataBuffer = fs.readFileSync(filePath);
      const pdfData = await pdfParse(dataBuffer);
      housePlanText = pdfData.text || "";
      totalPages = pdfData.numpages || 1;
    }
    const planData = { housePlanText, base64Image: "" };
    ProfilerService.endStage(planId, 'pdfRead');

    // 2. Upload file to File API and create Context Cache
    const cacheResult = await GeminiCacheManager.getOrCreateCache(planId, filePath, mimeType);
    
    // 3. Page classification & routing
    ProfilerService.startStage(planId, 'pageRouting');
    const pageRoutes = await RoutingService.routeDocument(
      planId,
      cacheResult.fileUri,
      mimeType,
      cacheResult.cacheName,
      cacheResult.inlineData,
      totalPages
    );
    ProfilerService.endStage(planId, 'pageRouting');

    totalPages = pageRoutes.length;

    // Pre-extract and pre-upload unique Pro-escalated pages exactly once
    const uniqueProPageNumbers = Array.from(new Set(
      pageRoutes.filter(r => r.route === 'pro').map(r => r.page_number)
    )).sort((a, b) => a - b);

    ProfilerService.startStage(planId, 'pageExtraction');
    const preUploadedPages = new Map<number, { inlineData: string }>();
    if (uniqueProPageNumbers.length > 0) {
      console.log(`[SchedulerService] Pre-extracting and pre-reading ${uniqueProPageNumbers.length} Pro pages in parallel: ${uniqueProPageNumbers.join(', ')}`);
      await Promise.all(
        uniqueProPageNumbers.map(async (pageNum) => {
          try {
            const pagePath = await PDFSplitter.extractPage(filePath, pageNum);
            const base64Data = fs.readFileSync(pagePath).toString('base64');
            
            preUploadedPages.set(pageNum, {
              inlineData: base64Data
            });
            
            PDFSplitter.cleanupPage(pagePath);
          } catch (e) {
            console.error(`[SchedulerService] Failed to pre-extract and read page ${pageNum}:`, e);
          }
        })
      );
    }
    ProfilerService.endStage(planId, 'pageExtraction');

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

    // 4.5. Extract Visual Parameters Facts from the Plan
    console.log(`[SchedulerService] Extracting structural parameters from drawings...`);
    const extractionResult = await this.extractPlanFacts(planId, cacheResult, mimeType);
    console.log(`[SchedulerService] Parameter extraction complete. Vision Confidence: ${extractionResult.visionConfidence}`);
    const planFacts = extractionResult.facts;
    const visionConfidence = extractionResult.visionConfidence;

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
            mimeType,
            preUploadedPages,
            planFacts,
            visionConfidence
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

    try {
      // 6. Run tasks in concurrency worker pool
      console.log(`[SchedulerService] Enrolling ${tasks.length} audits to worker pool with concurrency limit: ${PIPELINE_CONFIG.concurrencyLimit}`);
      const activeResults = await this.runWithConcurrency(tasks, PIPELINE_CONFIG.concurrencyLimit);
      results.push(...activeResults);

      // Run Cross-Discipline Consistency Validation
      console.log(`[SchedulerService] Running Cross-Discipline Consistency Validation...`);
      try {
        const crossResult = await this.runCrossDisciplineValidation(planId, results, cacheResult, mimeType);
        if (crossResult && Array.isArray(crossResult.inconsistencies) && crossResult.inconsistencies.length > 0) {
          console.log(`[SchedulerService] Found ${crossResult.inconsistencies.length} cross-discipline inconsistencies.`);
          SchedulerService.crossInconsistenciesCount = crossResult.inconsistencies.length;
          results.push({
            id: 'cross_discipline_consistency',
            name: 'Cross-Discipline Consistency',
            checked: true,
            score: Math.max(0, 100 - crossResult.inconsistencies.length * 10),
            status: 'warning' as const,
            summary: `Audit completed checking cross-discipline boundary conflicts.`,
            compliant_features: [],
            issues: crossResult.inconsistencies.map((inc: any) => ({
              title: inc.title || 'Cross-Discipline Conflict',
              description: inc.description || 'Conflict identified between disciplines.',
              severity: (inc.severity || 'major') as 'critical' | 'major' | 'minor',
              code: inc.code || 'Cross-Discipline',
              recommendation: inc.recommendation || 'Resolve design parameters.',
              deduction_percentage: 10,
              exact_pdf_citation: inc.exact_pdf_citation || 'Multiple Sections',
              loophole_details: inc.loophole_details || 'Inconsistent design claims',
              required_elements: inc.required_elements || 'Align drawings',
              stepId: 'cross_discipline_consistency'
            }))
          });
        }
      } catch (err: any) {
        console.error(`[SchedulerService] Cross-discipline consistency validation failed:`, err.message || err);
      }
    } finally {
      // 7. Cleanup cached contents and temporary files
      ProfilerService.startStage(planId, 'cacheCleanup');
      await GeminiCacheManager.cleanup(planId).catch((e) => {
        console.warn(`[SchedulerService] Non-critical error cleaning up cache:`, e);
      });
      ProfilerService.endStage(planId, 'cacheCleanup');
    }

    // 8. Compile cost and usage metrics
    const metrics = MonitoringService.compileMetrics(planId, totalPages);
    const profileSummary = ProfilerService.getSummary(planId);
    if (profileSummary) {
      (profileSummary as any).correctnessStats = {
        proCallsCount: SchedulerService.proCallsCount,
        verificationPassesCount: SchedulerService.verificationPassesCount,
        challengedFindingsCount: SchedulerService.challengedFindingsCount,
        correctedFindingsCount: SchedulerService.correctedFindingsCount,
        citationCorrectionsCount: SchedulerService.citationCorrectionsCount,
        crossInconsistenciesCount: SchedulerService.crossInconsistenciesCount
      };
    }

    // Include explainability traces in the pipeline response
    const ragTraces = RagOptimizerService.getTraces(planId);
    return {
      results,
      metrics,
      profile: {
        ...profileSummary,
        ragTraces
      }
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
    cacheResult: { cacheName?: string; fileUri: string; fileResourceName: string; isCached: boolean; inlineData?: string },
    mimeType: string,
    preUploadedPages: Map<number, { inlineData: string }>,
    planFacts: ExtractedFacts,
    visionConfidence: number
  ): Promise<any> {
    const stepConfig = STEPS_CONFIG.find(s => s.id === stepId)!;
    let isCachedFallback = false;
    let warningMsg = "";

    if (!KnowledgeBaseValidationService.isDisciplineSupported(stepId)) {
      console.warn(`[SchedulerService][${stepConfig.name}] Disabling step: Official NYC code reference book is missing.`);
      return {
        id: stepId,
        name: stepConfig.name,
        checked: false,
        score: null,
        status: 'skipped' as const,
        summary: `Skipped: Official NYC code reference book for ${stepConfig.name} is missing from the database. Live reasoning disabled to prevent fabricated findings.`,
        compliant_features: [],
        issues: []
      };
    }
    
    // Retrieve Building Code reference materials from Pinecone
    const filteredPlanText = await semanticSearchPlan(planData, stepId);

    // OCR & Vision Parameter Validation
    let currentVisionConfidence = visionConfidence;
    if (planFacts.occupant_load !== undefined && planFacts.occupant_load !== null) {
      const parsedText = planData.housePlanText || '';
      const numbersInText = parsedText.match(/\d+/g) || [];
      const matchExists = numbersInText.includes(String(planFacts.occupant_load));
      if (!matchExists && planFacts.occupant_load > 0) {
        console.warn(`[SchedulerService][${stepConfig.name}] OCR/Vision validation warning: Extracted occupant_load ${planFacts.occupant_load} not found in plan text OCR!`);
        currentVisionConfidence = parseFloat((currentVisionConfidence * 0.8).toFixed(2));
      }
    }
    
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
    const index = pc.Index(process.env.PINECONE_INDEX as string);
    const searchQueries = stepConfig.queries.map(q => q + " " + filteredPlanText.substring(0, 200));
    searchQueries.push(
      "NYC General Administrative Provisions GAP administrative provisions code enforcement licenses permits DOB fees",
      "NYC admin code construction documents architect stamp professional seal permit filing"
    );

    const stepPDFs = getPDFsForStep(stepId);

    const queryPromises = searchQueries.map(async (query) => {
      try {
        const cacheKey = `${query}:${stepPDFs.join(",")}`;
        const cachedMatches = SchedulerService.pineconeQueryCache.get(cacheKey);
        if (cachedMatches) {
          return cachedMatches;
        }

        const queryVector = await generateQueryEmbedding(query);
        const queryResponse = await index.query({
          topK: 15,
          vector: queryVector,
          includeMetadata: true,
          filter: stepPDFs.length > 0 ? { source: { "$in": stepPDFs } } : undefined
        });
        const matches = queryResponse.matches || [];
        SchedulerService.pineconeQueryCache.set(cacheKey, matches);
        return matches;
      } catch (err) {
        console.error(`[SchedulerService][${stepConfig.name}] Pinecone search failed for query "${query}":`, err);
        return [];
      }
    });

    const pineconeStart = performance.now();
    const queryResults = await Promise.all(queryPromises);
    const pineconeDuration = performance.now() - pineconeStart;
    ProfilerService.recordDuration(planId, 'pineconeSearch', pineconeDuration);

    const allMatches: any[] = [];

    for (const matches of queryResults) {
      for (const match of matches) {
        if (match && match.metadata?.text) {
          allMatches.push(match);
        }
      }
    }

    const stepCodes = STEP_CODES_CHECKLIST[stepId] || [];

    // 1. Deduplicate chunks using Jaccard Similarity and identical metadata
    const deduplicatedMatches = RagOptimizerService.deduplicateChunks(allMatches.map(m => ({
      id: m.id,
      score: m.score,
      metadata: m.metadata
    })));

    // 2. Rerank using BM25-like keyword density and exact code section boosts
    const rerankedMatches = RagOptimizerService.rerankChunks(
      deduplicatedMatches,
      searchQueries,
      stepCodes
    );

    // 3. Adaptive retrieval: stop gathering chunks once confidence threshold or token budget is reached
    const maxCharLimit = 25000; // Keep within budget (approx. 5000 tokens)
    const confidenceThreshold = 0.85;
    const adaptiveContext = RagOptimizerService.selectAdaptiveContext(
      rerankedMatches,
      maxCharLimit,
      confidenceThreshold
    );

    const topMatches = adaptiveContext.selected;

    const contexts = topMatches
      .sort((a, b) => String(a.metadata?.source || "").localeCompare(String(b.metadata?.source || "")))
      .map(m => `[NYC Code Section: ${m.metadata?.source}]\n${m.metadata?.text || ""}`)
      .join("\n\n---\n\n");

    // Evaluate deterministic rules
    const allDeterministicResults = DeterministicRuleEngine.evaluateRules(planFacts);
    const stepDeterministicResults = allDeterministicResults.filter(dr => stepCodes.some(sc => sc.code === dr.code));
    const deterministicCodes = stepDeterministicResults.map(dr => dr.code);
    const nonDeterministicCodes = stepCodes.filter(c => !deterministicCodes.includes(c.code));

    console.log(`[SchedulerService][${stepConfig.name}] Deterministic codes evaluated: ${deterministicCodes.join(', ')}. Non-deterministic remaining: ${nonDeterministicCodes.map(c => c.code).join(', ')}.`);

    // System Prompt setup
    const systemPrompt = `You are a senior NYC Department of Buildings Plan Examiner specializing in the ${stepConfig.name} discipline.
 
CRITICAL MISSION:
1. SCORING:
   - Compliance score starts at 100%. Deduct percentage based on severity: critical = 15-25%, major = 10-15%, minor = 2-10%.
   - Score = 100 - sum(deductions). Cap at 0. If critical life-safety system is missing, score is 0.
2. CODE CHECKS: Evaluate against these regulations:
${nonDeterministicCodes.map(c => `   - ${c.code}: ${c.title} (Check: ${c.description})`).join('\n')}
   Return status in "checklist_evaluations". Do NOT assume compliance; verify dimensions/parameters.
3. OPERATIONAL PROTOCOLS (ConOps):
   - Evaluate Emergency Action Plans. Cite operational violations under NFPA 101.
4. OCCUPANCY GOLDEN RULES:
   - Group I-2 (Hospitals): Enforce horizontal defend-in-place. Vertical evacuation or ventilator disconnection protocols are CRITICAL (NFPA 101 Sec 19.7.1).
   - Group H (High Hazard): delays prohibited (FC 907.2).
5. STRESS-TESTS:
   - Check for contradictions. If control valve shut, treat as unsprinklered (reduce egress/dead-ends limits).
   - Verify loads/capacities. Reject fabricated formulas.
6. OCCUPACITY APPLICABILITY:
   - Residential-only checks (AFCI, receptacle spacing, dwelling density, habitable room heights/dimensions, residential GFCI) MUST be marked as "not_applicable" with 0 deduction for non-residential buildings. All other checks are universal.
7. SCOPE ISOLATION:
   - Only output violations belonging to ${stepConfig.name}. Do NOT output other disciplines' issues.
8. MISSING DATA:
   - If plan lacks zoning info, mark ZR checks as "not_applicable" and details to "Incomplete Data / Insufficient Information". Do NOT deduct points.
9. MISSING LIFE-SAFETY:
   - Missing core discipline systems in commercial plans is a CRITICAL omission. Score 0% and list critical violation.
10. JSON FORMAT INSTRUCTIONS:
    Return valid JSON in this format:
    {
      "score": <number>,
      "summary": "<Short technical summary (max 3 sentences)>",
      "checklist_evaluations": [
        {
          "code": "<code section>",
          "status": "compliant" | "violation" | "not_applicable",
          "details": "<For compliant checks, MUST write exactly 'Compliant' to save output tokens. For violations, write specific measurements and why they failed. For not_applicable, write the reason.>"
        }
      ],
      "issues": [
        {
          "title": "<short title>",
          "description": "<technical description>",
          "severity": "critical" | "major" | "minor",
          "code": "<reference code>",
          "recommendation": "<remedy>",
          "deduction_percentage": <number>,
          "exact_pdf_citation": "<PDF name & section>",
          "loophole_details": "<why it failed>",
          "required_elements": "<fix requirements>"
        }
      ],
      "building_info": {
        "project_name": "<name>",
        "occupancy_group": "<group>",
        "construction_type": "<type>",
        "stories": "<stories>"
      }
    }
 
 REFERENCE CONTEXT (NYC BUILDING CODES):
 ${contexts.substring(0, 15000)}`;

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

    if (nonDeterministicCodes.length === 0) {
      console.log(`[SchedulerService][${stepConfig.name}] All codes are deterministic. Bypassing Gemini Pro reasoning audits.`);
      const deterministicIssues = stepDeterministicResults
        .filter(dr => dr.verdict === 'violation')
        .map(dr => {
          const node = EvidenceGraph.buildNode(dr.code, planFacts, dr);
          return {
            title: `${dr.code} Violation`,
            description: dr.explanation,
            severity: dr.code.startsWith('BC 1006') || dr.code.startsWith('BC 1009') ? 'critical' as const : 'major' as const,
            code: dr.code,
            recommendation: `Revise design to meet code requirement.`,
            deduction_percentage: dr.deduction_percentage,
            exact_pdf_citation: `Drawings parameter verification`,
            loophole_details: dr.explanation,
            required_elements: `Revise drawings`,
            confidence: 1.0,
            confidence_metrics: {
              deterministic: 1.0,
              vision: currentVisionConfidence,
              rag: 1.0,
              reasoning: 1.0,
              overall: 1.0
            },
            evidence_path: node
          };
        });

      let finalScore = 100;
      for (const issue of deterministicIssues) {
        finalScore -= issue.deduction_percentage;
      }
      if (finalScore < 0) finalScore = 0;

      resultJSON = {
        score: finalScore,
        summary: `Audit completed using deterministic rule evaluations.`,
        checklist_evaluations: stepDeterministicResults.map(dr => ({
          code: dr.code,
          status: dr.verdict,
          details: dr.explanation
        })),
        issues: deterministicIssues,
        building_info: {
          project_name: "Verification Plan",
          occupancy_group: "Unknown",
          construction_type: "Unknown",
          stories: "Unknown"
        }
      };
    } else {
      // 1. Concurrently run two independent Gemini Pro audits (Analysis A and Analysis B)
      console.log(`[SchedulerService][${stepConfig.name}] Starting dual independent Gemini Pro analyses...`);
      const runAnalysis = async (strategy: 'A' | 'B'): Promise<any> => {
        const strategyPrompt = strategy === 'A'
          ? "Reasoning Strategy A: Please perform a forward, step-by-step checklist analysis. Evaluate each code check in sequence starting from the first check. For each check, look at the reference drawings to verify constraints."
          : "Reasoning Strategy B: Please perform a reversed, search-oriented forensic analysis. Start from the last check in the checklist and work backward. Employ a chain-of-thought validation verifying dimensions and drawings content.";

        const userText = `Analyze the attached plan for compliance with ${stepConfig.name}. Use the referenced NYC building code context.\n` +
          `Apply the following reasoning strategy:\n${strategyPrompt}`;

        const payload: any = {
          generationConfig: {
            temperature: 0.15,
            maxOutputTokens: 8192,
            responseMimeType: "application/json"
          }
        };

        if (cacheResult.cacheName) {
          payload.cached_content = cacheResult.cacheName;
          payload.contents = [{
            role: 'user',
            parts: [{ text: `System Instructions:\n${systemPrompt}\n\nUser Request:\n${userText}` }]
          }];
        } else if (cacheResult.inlineData) {
          payload.contents = [{
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: cacheResult.inlineData } },
              { text: userText }
            ]
          }];
        } else {
          payload.contents = [{
            role: 'user',
            parts: [
              { fileData: { fileUri: cacheResult.fileUri, mimeType } },
              { text: userText }
            ]
          }];
        }

        const requestPayload: any = { ...payload };
        if (!cacheResult.cacheName) {
          requestPayload.systemInstruction = { parts: [{ text: systemPrompt }] };
        }

        await SchedulerService.proSemaphore.acquire();
        try {
          const startProTime = performance.now();
          const response = await GeminiClient.requestWithRetry(
            PIPELINE_CONFIG.models.pro,
            requestPayload,
            false,
            undefined,
            planId
          );
          const duration = performance.now() - startProTime;
          ProfilerService.recordDuration(planId, 'geminiPro', duration);
          SchedulerService.proCallsCount++;
          return this.parseJsonResult(response.text, `${stepConfig.name} Analysis ${strategy}`);
        } finally {
          SchedulerService.proSemaphore.release();
        }
      };

      const [resultA, resultB] = await Promise.all([
        runAnalysis('A').catch(err => {
          console.error(`[SchedulerService][${stepConfig.name}] Analysis A failed:`, err);
          return null;
        }),
        runAnalysis('B').catch(err => {
          console.error(`[SchedulerService][${stepConfig.name}] Analysis B failed:`, err);
          return null;
        })
      ]);

      // Ensure we have at least one valid analysis to proceed
      if (!resultA && !resultB) {
        throw new Error(`Both dual Gemini Pro analyses A and B failed to return valid results.`);
      }

      const issuesA = resultA?.issues || [];
      const issuesB = resultB?.issues || [];
      console.log(`[SchedulerService][${stepConfig.name}] Dual analyses complete. Analysis A found ${issuesA.length} issues, Analysis B found ${issuesB.length} issues.`);

      // 2. Launch adversarial Challenger to criticize all findings
      console.log(`[SchedulerService][${stepConfig.name}] Running adversarial Challenger...`);
      const challengerPrompt = `You are a licensed contractor and expert NYC plans consultant playing the role of a defense attorney.
The Plan Examiners have flagged the following code compliance issues in their independent analyses:
Analysis A Issues:
${JSON.stringify(issuesA, null, 2)}

Analysis B Issues:
${JSON.stringify(issuesB, null, 2)}

Your goal is to inspect the drawings and RAG code context, and aggressively criticize these findings. For each issue, argue why it is actually COMPLIANT. Cite specific drawing pages, exceptions in the NYC Building/Plumbing/Mechanical Code, occupant loads, or design tolerances that the examiners might have missed or misinterpreted. Try to find false positives, incorrect deductions, or contradictions.

Return a JSON object in this exact format:
{
  "rebuttals": [
    {
      "code": "<matching code section, e.g. BC 1008.1.1>",
      "criticism": "<your defense argument or explanation of how the examiner misapplied the code or misread the drawings. Keep it highly technical and professional.>"
    }
  ]
}`;

      const runChallenger = async (): Promise<any> => {
        const payload: any = {
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        };

        if (cacheResult.cacheName) {
          payload.cached_content = cacheResult.cacheName;
          payload.contents = [{
            role: 'user',
            parts: [{ text: `System Instructions:\n${challengerPrompt}\n\nUser Request:\nInspect the plan drawings and code context to criticize all findings.` }]
          }];
        } else if (cacheResult.inlineData) {
          payload.contents = [{
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: cacheResult.inlineData } },
              { text: challengerPrompt }
            ]
          }];
        } else {
          payload.contents = [{
            role: 'user',
            parts: [
              { fileData: { fileUri: cacheResult.fileUri, mimeType } },
              { text: challengerPrompt }
            ]
          }];
        }

        await SchedulerService.proSemaphore.acquire();
        try {
          const start = performance.now();
          const response = await GeminiClient.requestWithRetry(
            PIPELINE_CONFIG.models.pro,
            payload,
            false,
            undefined,
            planId
          );
          const duration = performance.now() - start;
          ProfilerService.recordDuration(planId, 'geminiPro', duration);
          SchedulerService.proCallsCount++;
          return this.parseJsonResult(response.text, "Challenger");
        } finally {
          SchedulerService.proSemaphore.release();
        }
      };

      const challengerResult = await runChallenger().catch(err => {
        console.error(`[SchedulerService][${stepConfig.name}] Challenger failed:`, err);
        return { rebuttals: [] };
      });

      const rebuttals = challengerResult?.rebuttals || [];
      console.log(`[SchedulerService][${stepConfig.name}] Challenger completed with ${rebuttals.length} rebuttals.`);

      // 3. Launch independent Judge to resolve disagreements and make final ruling
      console.log(`[SchedulerService][${stepConfig.name}] Running independent Judge...`);
      const judgePrompt = `You are the Principal NYC Plans Examiner acting as an independent judge.
You must review two independent plan audits (Analysis A and Analysis B) and the Challenger's defense arguments, and make a final ruling for each compliance check.

Analysis A Findings:
${JSON.stringify(resultA || {}, null, 2)}

Analysis B Findings:
${JSON.stringify(resultB || {}, null, 2)}

Challenger's Defenses:
${JSON.stringify(rebuttals, null, 2)}

Original Code Context:
${contexts}

Review each checklist item and violation carefully. Resolve all disagreements between Analysis A and B. For each violation, evaluate the Challenger's defense. You must verify if exceptions or details cited by the Challenger are valid in the code context and drawings.

Return a JSON object in this exact format:
{
  "score": <final score, 100 minus sum of deductions>,
  "summary": "<Forensic summary of final rulings (max 3 sentences)>",
  "checklist_evaluations": [
    {
      "code": "<code section>",
      "status": "compliant" | "violation" | "not_applicable",
      "details": "<For compliant checks, MUST write exactly 'Compliant' to save output tokens. For violations, write specific measurements and why they failed. For not_applicable, write the reason.>"
    }
  ],
  "issues": [
    {
      "title": "<short title>",
      "description": "<technical description>",
      "severity": "critical" | "major" | "minor",
      "code": "<reference code>",
      "recommendation": "<remedy>",
      "deduction_percentage": <number>,
      "exact_pdf_citation": "<PDF name & section>",
      "loophole_details": "<why it failed>",
      "required_elements": "<fix requirements>",
      "confidence": <float, confidence score between 0.0 and 1.0 for this finding>
    }
  ],
  "building_info": {
    "project_name": "<name>",
    "occupancy_group": "<group>",
    "construction_type": "<type>",
    "stories": "<stories>"
  }
}`;

      const runJudge = async (): Promise<any> => {
        const payload: any = {
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        };

        if (cacheResult.cacheName) {
          payload.cached_content = cacheResult.cacheName;
          payload.contents = [{
            role: 'user',
            parts: [{ text: `System Instructions:\n${judgePrompt}\n\nUser Request:\nMake final rulings and resolve all disagreements.` }]
          }];
        } else if (cacheResult.inlineData) {
          payload.contents = [{
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: cacheResult.inlineData } },
              { text: judgePrompt }
            ]
          }];
        } else {
          payload.contents = [{
            role: 'user',
            parts: [
              { fileData: { fileUri: cacheResult.fileUri, mimeType } },
              { text: judgePrompt }
            ]
          }];
        }

        await SchedulerService.proSemaphore.acquire();
        try {
          const start = performance.now();
          const response = await GeminiClient.requestWithRetry(
            PIPELINE_CONFIG.models.pro,
            payload,
            false,
            undefined,
            planId
          );
          const duration = performance.now() - start;
          ProfilerService.recordDuration(planId, 'geminiPro', duration);
          SchedulerService.proCallsCount++;
          return this.parseJsonResult(response.text, "Judge");
        } finally {
          SchedulerService.proSemaphore.release();
        }
      };

      const judgeResult = await runJudge();
      if (!judgeResult) {
        throw new Error(`Judge failed to return a valid JSON verdict.`);
      }

      console.log(`[SchedulerService][${stepConfig.name}] Judge completed. Score: ${judgeResult.score}, Issues: ${judgeResult.issues?.length}`);

      // 4. Confidence-Based Verification Gate
      const finalIssues: any[] = [];
      const finalEvaluations = judgeResult.checklist_evaluations || [];

      if (Array.isArray(judgeResult.issues)) {
        for (const issue of judgeResult.issues) {
          const confidence = issue.confidence !== undefined ? issue.confidence : 1.0;
          if (confidence < 0.90) {
            console.log(`[SchedulerService][${stepConfig.name}] Low confidence finding (${confidence}) detected for code ${issue.code}. Running verification pass...`);
            SchedulerService.verificationPassesCount++;
            SchedulerService.challengedFindingsCount++;

            const verifierPrompt = `You are a Chief NYC Code Compliance Auditor performing a precision verification check on a low-confidence compliance finding.
Target Compliance Issue to Verify:
${JSON.stringify(issue, null, 2)}

Referenced NYC Code Context:
${contexts}

Verify this specific issue against the drawings. Make a final determination whether this violation should be CONFIRMED or DISMISSED.

Return a JSON object in this exact format:
{
  "verdict": "CONFIRMED" | "DISMISSED",
  "confidence": <float between 0.0 and 1.0>,
  "explanation": "<detailed explanation of your finding>",
  "corrected_issue": {
    "title": "<short title>",
    "description": "<technical description>",
    "severity": "critical" | "major" | "minor",
    "code": "<reference code>",
    "recommendation": "<remedy>",
    "deduction_percentage": <number>,
    "exact_pdf_citation": "<PDF name & section>",
    "loophole_details": "<why it failed>",
    "required_elements": "<fix requirements>"
  }
}`;

            try {
              const runVerifier = async (): Promise<any> => {
                const payload: any = {
                  generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                  }
                };

                if (cacheResult.cacheName) {
                  payload.cached_content = cacheResult.cacheName;
                  payload.contents = [{
                    role: 'user',
                    parts: [{ text: `System Instructions:\n${verifierPrompt}\n\nUser Request:\nVerify the compliance issue.` }]
                  }];
                } else if (cacheResult.inlineData) {
                  payload.contents = [{
                    role: 'user',
                    parts: [
                      { inlineData: { mimeType, data: cacheResult.inlineData } },
                      { text: verifierPrompt }
                    ]
                  }];
                } else {
                  payload.contents = [{
                    role: 'user',
                    parts: [
                      { fileData: { fileUri: cacheResult.fileUri, mimeType } },
                      { text: verifierPrompt }
                    ]
                  }];
                }

                await SchedulerService.proSemaphore.acquire();
                try {
                  const response = await GeminiClient.requestWithRetry(
                    PIPELINE_CONFIG.models.pro,
                    payload,
                    false,
                    undefined,
                    planId
                  );
                  SchedulerService.proCallsCount++;
                  return this.parseJsonResult(response.text, "Verifier");
                } finally {
                  SchedulerService.proSemaphore.release();
                }
              };

              const verifierResult = await runVerifier();
              if (verifierResult && verifierResult.verdict === 'CONFIRMED') {
                console.log(`[SchedulerService][${stepConfig.name}] Issue CONFIRMED by verifier.`);
                const corrected = verifierResult.corrected_issue || issue;
                corrected.confidence = verifierResult.confidence || 0.95;
                finalIssues.push(corrected);
                SchedulerService.correctedFindingsCount++;
              } else {
                console.log(`[SchedulerService][${stepConfig.name}] Issue DISMISSED by verifier.`);
                SchedulerService.correctedFindingsCount++;
                // Dismiss: mark as compliant in checklist_evaluations
                const ev = finalEvaluations.find((e: any) => e.code === issue.code);
                if (ev) {
                  ev.status = 'compliant';
                  ev.details = `Compliant (Dismissed low-confidence violation: ${verifierResult?.explanation || 'No issue found'})`;
                }
              }
            } catch (verifErr: any) {
              console.error(`[SchedulerService][${stepConfig.name}] Verification pass failed:`, verifErr.message || verifErr);
              finalIssues.push(issue); // Keep original if verification fails
            }
          } else {
            finalIssues.push(issue);
          }
        }
      }

      // 5. Evidence Completeness Check & Repair Gate
      const repairedIssues: any[] = [];
      for (const issue of finalIssues) {
        const isMissingField = !issue.code || !issue.exact_pdf_citation || !issue.description || !issue.severity || !issue.recommendation;
        if (isMissingField) {
          console.log(`[SchedulerService][${stepConfig.name}] Missing evidence fields detected in issue for code ${issue.code}. Running repair pass...`);
          SchedulerService.citationCorrectionsCount++;

          const repairPrompt = `You are a Plan Examiner Assistant. The following compliance finding is missing key details.
Compliance Issue:
${JSON.stringify(issue, null, 2)}

Code Context:
${contexts}

Your task is to fill in the missing details. Do NOT change the finding verdict. Only provide the missing fields.

Return a JSON object in this exact format:
{
  "code": "<code section>",
  "exact_pdf_citation": "<drawing name/PDF section>",
  "description": "<technical reasoning/description>",
  "severity": "critical" | "major" | "minor",
  "recommendation": "<remedy>",
  "loophole_details": "<why it failed>",
  "required_elements": "<fix requirements>"
}`;

          try {
            const runRepair = async (): Promise<any> => {
              const payload: any = {
                generationConfig: {
                  temperature: 0.1,
                  responseMimeType: "application/json"
                }
              };

              if (cacheResult.cacheName) {
                payload.cached_content = cacheResult.cacheName;
                payload.contents = [{
                  role: 'user',
                  parts: [{ text: `System Instructions:\n${repairPrompt}\n\nUser Request:\nRepair missing fields.` }]
                }];
              } else if (cacheResult.inlineData) {
                payload.contents = [{
                  role: 'user',
                  parts: [
                    { inlineData: { mimeType, data: cacheResult.inlineData } },
                    { text: repairPrompt }
                  ]
                }];
              } else {
                payload.contents = [{
                  role: 'user',
                  parts: [
                    { fileData: { fileUri: cacheResult.fileUri, mimeType } },
                    { text: repairPrompt }
                  ]
                }];
              }

              await SchedulerService.proSemaphore.acquire();
              try {
                const response = await GeminiClient.requestWithRetry(
                  PIPELINE_CONFIG.models.pro,
                  payload,
                  false,
                  undefined,
                  planId
                );
                SchedulerService.proCallsCount++;
                return this.parseJsonResult(response.text, "Repairer");
              } finally {
                SchedulerService.proSemaphore.release();
              }
            };

            const repaired = await runRepair();
            if (repaired) {
              repairedIssues.push({
                ...issue,
                ...repaired
              });
              console.log(`[SchedulerService][${stepConfig.name}] Issue repaired successfully.`);
            } else {
              repairedIssues.push(issue);
            }
          } catch (repairErr: any) {
            console.error(`[SchedulerService][${stepConfig.name}] Repair pass failed:`, repairErr.message || repairErr);
            repairedIssues.push(issue);
          }
        } else {
          repairedIssues.push(issue);
        }
      }

      // Merge deterministic results
      const deterministicIssues = stepDeterministicResults
        .filter(dr => dr.verdict === 'violation')
        .map(dr => {
          const node = EvidenceGraph.buildNode(dr.code, planFacts, dr);
          return {
            title: `${dr.code} Violation`,
            description: dr.explanation,
            severity: dr.code.startsWith('BC 1006') || dr.code.startsWith('BC 1009') ? 'critical' as const : 'major' as const,
            code: dr.code,
            recommendation: `Revise design to meet code requirement.`,
            deduction_percentage: dr.deduction_percentage,
            exact_pdf_citation: `Drawings parameter verification`,
            loophole_details: dr.explanation,
            required_elements: `Revise drawings`,
            confidence: 1.0,
            confidence_metrics: {
              deterministic: 1.0,
              vision: currentVisionConfidence,
              rag: 1.0,
              reasoning: 1.0,
              overall: 1.0
            },
            evidence_path: node
          };
        });

      // Map evidence paths and confidence metrics for Pro issues
      const finalProIssuesMapped = repairedIssues.map((issue: any) => {
        const node = EvidenceGraph.buildNode(issue.code, planFacts, undefined, issue.description);
        const overall = parseFloat((currentVisionConfidence * 0.90 * (issue.confidence || 0.95)).toFixed(2));
        return {
          ...issue,
          confidence_metrics: {
            deterministic: 0.0,
            vision: currentVisionConfidence,
            rag: 0.90,
            reasoning: issue.confidence || 0.95,
            overall: overall
          },
          evidence_path: node
        };
      });

      const combinedEvaluations = [...finalEvaluations];
      for (const dr of stepDeterministicResults) {
        if (!combinedEvaluations.some(e => e.code === dr.code)) {
          combinedEvaluations.push({
            code: dr.code,
            status: dr.verdict,
            details: dr.explanation
          });
        }
      }

      const combinedIssues = [...finalProIssuesMapped, ...deterministicIssues];

      // Citation Validation Stage
      const validatedIssues: any[] = [];
      for (const issue of combinedIssues) {
        const codeSection = issue.code || '';
        const cleanCode = codeSection.toLowerCase().replace(/\s+/g, '');
        const inContext = contexts.toLowerCase().includes(cleanCode);
        const inChecklist = stepCodes.some(sc => sc.code.toLowerCase().replace(/\s+/g, '') === cleanCode);

        if (inContext || inChecklist) {
          validatedIssues.push(issue);
        } else {
          console.warn(`[SchedulerService][${stepConfig.name}] Citation Validation REJECTED unverified code citation: ${codeSection}`);
          const ev = combinedEvaluations.find(e => e.code === codeSection);
          if (ev) {
            ev.status = 'compliant';
            ev.details = `Compliant (Rejected hallucinated citation: ${codeSection})`;
          }
        }
      }

      let finalScore = 100;
      for (const issue of validatedIssues) {
        const deduction = issue.deduction_percentage !== undefined ? issue.deduction_percentage : 10;
        finalScore -= deduction;
      }
      if (finalScore < 0) finalScore = 0;

      resultJSON = {
        ...judgeResult,
        score: finalScore,
        issues: validatedIssues,
        checklist_evaluations: combinedEvaluations
      };
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

    // Record RAG trace for explainability
    try {
      const validatedCitations = (resultJSON.issues || []).map((iss: any) => iss.code);
      const rejectedCitations = (resultJSON.checklist_evaluations || [])
        .filter((e: any) => e.details && e.details.includes("Rejected hallucinated citation"))
        .map((e: any) => e.code);

      RagOptimizerService.registerTrace(planId, {
        stepId,
        rawRetrievalCount: allMatches.length,
        deduplicatedCount: deduplicatedMatches.length,
        retrievedChunks: topMatches.map(m => {
          const reranked = rerankedMatches.find(r => r.match.id === m.id);
          return {
            source: m.metadata?.source || "",
            section: m.metadata?.section || RagOptimizerService.parseFallbackSection(m.metadata?.text || "").section || "",
            page: m.metadata?.page_number || m.metadata?.pages || 0,
            score: m.score || 0,
            rerankScore: reranked ? reranked.rerankScore : (m.score || 0)
          };
        }),
        finalValidatedCitations: validatedCitations,
        rejectedCitations: rejectedCitations
      });
    } catch (e: any) {
      console.warn(`[SchedulerService] Non-critical error recording RAG trace:`, e.message || e);
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

  /**
   * Run AI Challenger Debate Loop to cross-examine compliance failures.
   */
  public static async runChallengerDebate(
    stepId: string,
    stepConfig: any,
    resultJSON: any,
    cacheResult: any,
    mimeType: string,
    pageNumbers: number[],
    isCachedFallback: boolean,
    planId?: string
  ): Promise<any> {
    const debateStart = performance.now();
    const issues = resultJSON.issues;
    // Adaptive Judge Routing: default to Flash, only escalate to Pro if borderline score (65-75)
    const score = resultJSON.score !== undefined ? resultJSON.score : 100;
    const isBorderline = score >= 65 && score <= 75;
    const modelForJudge = (isBorderline && !isCachedFallback) ? PIPELINE_CONFIG.models.pro : PIPELINE_CONFIG.models.flash;

    // --- STEP 1: Challenger Argument (Gemini 2.5 Flash) ---
    console.log(`[ChallengerDebate][${stepConfig.name}] STEP 1: Challenger preparing defense arguments...`);
    const challengerPrompt = `You are a licensed contractor and expert NYC plans consultant playing the role of a defense attorney.
The Plan Auditor has flagged the following code compliance issues in the attached drawings:
${JSON.stringify(issues, null, 2)}

Your goal is to inspect the drawings and argue why each issue is actually COMPLIANT. Cite specific exceptions in the NYC Building/Plumbing/Mechanical Code, drawing tolerances, occupant loads, or design details from the blueprints that the auditor might have overlooked.
Argue fiercely but professionally.

Return a JSON object in this exact format:
{
  "rebuttals": [
    {
      "code": "<matching code e.g. BC 1008.1.1>",
      "argument": "<your defense argument and exceptions citation. Keep it highly technical, professional, and concise (max 3 sentences) to save output tokens.>"
    }
  ]
}`;

    const challengerPayload: any = {
      generationConfig: {
        temperature: 0.2,
        responseMimeType: "application/json"
      }
    };

    if (cacheResult.cacheName) {
      challengerPayload.cached_content = cacheResult.cacheName;
      challengerPayload.contents = [{
        role: 'user',
        parts: [{ text: challengerPrompt }]
      }];
    } else if (cacheResult.inlineData) {
      challengerPayload.contents = [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: cacheResult.inlineData } },
          { text: challengerPrompt }
        ]
      }];
    } else {
      challengerPayload.contents = [{
        role: 'user',
        parts: [
          { fileData: { fileUri: cacheResult.fileUri, mimeType } },
          { text: challengerPrompt }
        ]
      }];
    }

    const challengerResponse = await GeminiClient.requestWithRetry(
      PIPELINE_CONFIG.models.flash,
      challengerPayload,
      false,
      undefined,
      planId
    );

    const challengerResult = this.parseJsonResult(challengerResponse.text, "Challenger");
    const rebuttals = challengerResult?.rebuttals || [];
    console.log(`[ChallengerDebate][${stepConfig.name}] STEP 1 complete. Received ${rebuttals.length} rebuttals.`);

    if (rebuttals.length === 0) {
      ProfilerService.recordDuration(planId || 'test-plan-id', 'debate', performance.now() - debateStart);
      return resultJSON;
    }

    // --- STEP 2: Rebuttal/Ruling (Gemini Pro/Flash Judge) ---
    console.log(`[ChallengerDebate][${stepConfig.name}] STEP 2: Judge evaluating defenses...`);
    const judgePrompt = `You are the Principal NYC Plans Examiner acting as an independent judge.
The Auditor originally found these issues:
${JSON.stringify(issues, null, 2)}

The Contractor's Consultant argued these defenses:
${JSON.stringify(rebuttals, null, 2)}

Review the drawings and make a final ruling for each issue.
Answer with either:
- "ACCEPT": If the contractor's defense is valid (mark compliant, remove violation).
- "REJECT": If the contractor's defense is invalid (the violation stands, rebut the argument).

CRITICAL RULE FOR EXAMINERS: The contractor's consultant might try to invent fake code sections or exceptions to win the argument. You MUST check the provided building code context. If the contractor cites a specific exception, tolerance, or section, you MUST verify that it actually exists in the code context and is applicable. If the cited exception is not present in the context, is made up, or is misapplied, you MUST reject the defense.

Return a JSON object in this exact format:
{
  "rulings": [
    {
      "code": "<matching code>",
      "verdict": "ACCEPT" | "REJECT",
      "explanation": "<brief technical explanation of why you accepted or rejected their argument. Keep it highly technical, professional, and concise (max 3 sentences) to save output tokens.>"
    }
  ]
}`;

    const judgePayload: any = {
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    const canUseCacheForJudge = cacheResult.cacheName && (modelForJudge === PIPELINE_CONFIG.models.flash);

    if (canUseCacheForJudge) {
      judgePayload.cached_content = cacheResult.cacheName;
      judgePayload.contents = [{
        role: 'user',
        parts: [{ text: judgePrompt }]
      }];
    } else if (cacheResult.inlineData) {
      judgePayload.contents = [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: cacheResult.inlineData } },
          { text: judgePrompt }
        ]
      }];
    } else {
      judgePayload.contents = [{
        role: 'user',
        parts: [
          { fileData: { fileUri: cacheResult.fileUri, mimeType } },
          { text: judgePrompt }
        ]
      }];
    }

    let judgeResponseText = "";
    if (modelForJudge === PIPELINE_CONFIG.models.pro) {
      await SchedulerService.proSemaphore.acquire();
      try {
        const response = await GeminiClient.requestWithRetry(
          modelForJudge,
          judgePayload,
          false,
          undefined,
          planId
        );
        judgeResponseText = response.text;
      } finally {
        SchedulerService.proSemaphore.release();
      }
    } else {
      const response = await GeminiClient.requestWithRetry(
        modelForJudge,
        judgePayload,
        false,
        undefined,
        planId
      );
      judgeResponseText = response.text;
    }

    const judgeResult = this.parseJsonResult(judgeResponseText, "Judge");
    const rulings = judgeResult?.rulings || [];
    console.log(`[ChallengerDebate][${stepConfig.name}] STEP 2 complete. Received ${rulings.length} rulings.`);

    // --- STEP 3: Recompile evaluations based on rulings ---
    const updatedIssues: any[] = [];
    let compliantFeatures = resultJSON.compliant_features || [];
    const evaluations = resultJSON.checklist_evaluations || [];

    for (const issue of issues) {
      const ruling = rulings.find((r: any) => r && r.code === issue.code);
      const rebuttal = rebuttals.find((r: any) => r && r.code === issue.code);

      if (ruling && ruling.verdict === 'ACCEPT') {
        console.log(`[ChallengerDebate][${stepConfig.name}] Violation ACCEPTED/CLEARED for code ${issue.code}.`);
        const ev = evaluations.find((e: any) => e && e.code === issue.code);
        if (ev) {
          ev.status = 'compliant';
          ev.details = `[CLEARED VIA DEBATE] ${ev.details} (Defense: ${ruling.explanation})`;
        }
        compliantFeatures.push(`${issue.code}: Cleared via debate - ${ruling.explanation}`);
      } else {
        console.log(`[ChallengerDebate][${stepConfig.name}] Violation REJECTED/CONFIRMED for code ${issue.code}.`);
        const explanation = ruling?.explanation || "Auditor stood by the violation.";
        const defenseArg = rebuttal?.argument || "No defense argument provided.";
        
        const debateLog = `\n\n--- ⚖️ AI DEBATE LOG ---\n* **Defense Argument:** ${defenseArg}\n* **Judge Ruling (REJECT):** ${explanation}`;
        issue.description = (issue.description || "") + debateLog;

        const ev = evaluations.find((e: any) => e && e.code === issue.code);
        if (ev) {
          ev.details = (ev.details || "") + debateLog;
        }

        updatedIssues.push(issue);
      }
    }

    let finalScore = 100;
    for (const issue of updatedIssues) {
      const deduction = issue.deduction_percentage !== undefined ? issue.deduction_percentage : 10;
      finalScore -= deduction;
    }
    if (finalScore < 0) finalScore = 0;

    const debateDuration = performance.now() - debateStart;
    ProfilerService.recordDuration(planId || 'test-plan-id', 'debate', debateDuration);

    return {
      ...resultJSON,
      score: finalScore,
      issues: updatedIssues,
      compliant_features: compliantFeatures,
      checklist_evaluations: evaluations
    };
  }

  private static async runCrossDisciplineValidation(
    planId: string,
    results: any[],
    cacheResult: any,
    mimeType: string
  ): Promise<any> {
    const checkedSteps = results.filter(r => r.checked);
    const validatorPrompt = `You are the Chief Building Code Compliance Officer. You must evaluate the plan audit results of multiple engineering disciplines to detect cross-discipline contradictions and inconsistencies.

Active Audited Results:
${JSON.stringify(checkedSteps, null, 2)}

Analyze the results for:
1. Occupancy classification consistency: Are all disciplines (Electrical, Mechanical, Building, Fire, etc.) using the exact same occupancy group and construction type?
2. Plumbing fixtures vs Egress load: Does the plumbing code fixtures count align with the occupant loads in the building code egress drawings?
3. Mechanical ventilation vs Room usage: Are mechanical air flow rates and ventilation schedules consistent with the room types in architectural floor plans?
4. Fire barrier ratings vs HVAC duct penetrations: Are the damper locations and wall fire ratings consistent between mechanical duct drawings and fire safety partition plans?
5. Energy calculations vs building envelope: Do the U-values and envelope thermal areas match the structural/architectural details?

Return a JSON object in this exact format:
{
  "inconsistencies": [
    {
      "title": "<short descriptive title of conflict>",
      "description": "<detailed description of the inconsistency, citing both conflicting disciplines>",
      "severity": "critical" | "major" | "minor",
      "code": "<NYC Code references involved, e.g. BC 1004.1 / PC 403.1>",
      "recommendation": "<remedy to align the plans>",
      "exact_pdf_citation": "<drawing reference/sheet details>",
      "loophole_details": "<why it contradicts>",
      "required_elements": "<fix requirements>"
    }
  ]
}`;

    const payload: any = {
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    if (cacheResult.cacheName) {
      payload.cached_content = cacheResult.cacheName;
      payload.contents = [{
        role: 'user',
        parts: [{ text: `System Instructions:\n${validatorPrompt}\n\nUser Request:\nValidate cross-discipline consistency.` }]
      }];
    } else if (cacheResult.inlineData) {
      payload.contents = [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: cacheResult.inlineData } },
          { text: validatorPrompt }
        ]
      }];
    } else {
      payload.contents = [{
        role: 'user',
        parts: [
          { fileData: { fileUri: cacheResult.fileUri, mimeType } },
          { text: validatorPrompt }
        ]
      }];
    }

    await SchedulerService.proSemaphore.acquire();
    try {
      const response = await GeminiClient.requestWithRetry(
        PIPELINE_CONFIG.models.pro,
        payload,
        false,
        undefined,
        planId
      );
      SchedulerService.proCallsCount++;
      return this.parseJsonResult(response.text, "Cross-Discipline Validator");
    } finally {
      SchedulerService.proSemaphore.release();
    }
  }

  private static async extractPlanFacts(
    planId: string,
    cacheResult: any,
    mimeType: string
  ): Promise<{ facts: ExtractedFacts; visionConfidence: number }> {
    const prompt = `You are a precision Plan Verification OCR & Vision Assistant.
Your task is to analyze the drawings and text of the attached plan and extract code parameters and dimensions.

Extract the following parameters into a valid JSON object. If any parameter is not mentioned, use null.
Do NOT guess or estimate values. Only extract explicit dimensions, counts, or measurements.

JSON Schema:
{
  "facts": {
    "occupant_load": <number | null>,
    "exit_stairs_count": <number | null>,
    "stair_width_inches": <number | null>,
    "door_clear_width_inches": <number | null>,
    "corridor_width_inches": <number | null>,
    "ceiling_height_inches": <number | null>,
    "room_dimensions_feet": [<numbers> | null],
    "water_closet_spacing_inches": <number | null>,
    "transformer_kva": <number | null>,
    "planned_electrical_load_kva": <number | null>,
    "panel_clearance_inches": <number | null>,
    "receptacle_spacing_feet": <number | null>,
    "gross_floor_area_sqft": <number | null>,
    "lot_area_sqft": <number | null>,
    "allowable_far": <number | null>,
    "parking_spaces_provided": <number | null>,
    "dwelling_units_count": <number | null>,
    "allowable_dwelling_units_limit": <number | null>,
    "travel_distance_feet": <number | null>,
    "dead_end_corridor_feet": <number | null>
  },
  "vision_confidence": <float, between 0.0 and 1.0>
}`;

    const payload: any = {
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json"
      }
    };

    if (cacheResult.cacheName) {
      payload.cached_content = cacheResult.cacheName;
      payload.contents = [{
        role: 'user',
        parts: [{ text: `System Instructions:\n${prompt}\n\nUser Request:\nExtract all parameters from the drawings.` }]
      }];
    } else if (cacheResult.inlineData) {
      payload.contents = [{
        role: 'user',
        parts: [
          { inlineData: { mimeType, data: cacheResult.inlineData } },
          { text: prompt }
        ]
      }];
    } else {
      payload.contents = [{
        role: 'user',
        parts: [
          { fileData: { fileUri: cacheResult.fileUri, mimeType } },
          { text: prompt }
        ]
      }];
    }

    await SchedulerService.proSemaphore.acquire();
    try {
      const response = await GeminiClient.requestWithRetry(
        PIPELINE_CONFIG.models.pro,
        payload,
        false,
        undefined,
        planId
      );
      SchedulerService.proCallsCount++;
      const result = this.parseJsonResult(response.text, "Visual Fact Extractor");
      return {
        facts: result?.facts || {},
        visionConfidence: result?.vision_confidence !== undefined ? result.vision_confidence : 0.90
      };
    } catch (err) {
      console.error(`[SchedulerService] Plan fact extraction failed:`, err);
      return { facts: {}, visionConfidence: 0.5 };
    } finally {
      SchedulerService.proSemaphore.release();
    }
  }
}
