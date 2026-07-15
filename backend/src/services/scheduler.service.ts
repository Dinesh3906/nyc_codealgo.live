import { Pinecone } from '@pinecone-database/pinecone';
import { PIPELINE_CONFIG } from '../config/pipeline.config';
import { GeminiClient } from './gemini.client';
import { AiProviderService } from './provider.service';
import { GeminiCacheManager } from './gemini.cache';
import { RoutingService, PageRouteResult } from './routing.service';
import { PDFSplitter } from '../utils/pdf.splitter';
import { MonitoringService } from './monitoring.service';
import { semanticSearchPlan, STEPS_CONFIG, STEP_CODES_CHECKLIST, generateQueryEmbedding, getPDFsForStep, repairTruncatedJson } from './native_rag';
import { io } from '../app';
import { ProfilerService } from './profiler.service';
import { DeterministicRuleEngine, ExtractedFacts, RuleEvaluationResult } from './deterministic.engine';
import { EvidenceGraph } from './evidence.graph';
import { RagOptimizerService } from './rag-optimizer.service';
import { KnowledgeBaseValidationService } from './kb-validation.service';
import { metrics } from './metrics.service';
import { EvidenceLogger } from './evidence-logger';
import { ApifyService } from './apify.service';

export interface GlobalFacts {
  project_name: string | null;
  project_address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  jurisdiction: string | null;
  applicable_code_set: string | null;
  document_type: 'Concept Drawing' | 'Marketing Drawing' | 'Construction Documents' | null;
  occupancy: string | null;
  construction_type: string | null;
  building_height_feet: number | null;
  story_count: number | null;
  basement: boolean | null;
  building_use: string | null;
  review_scope: string | null;
}

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
    let userId: string | null = null;
    try {
      const dbPool = require('../db').default;
      const [planRows]: any = await dbPool.query("SELECT userId FROM `plan` WHERE id = ?", [planId]);
      userId = planRows[0]?.userId || null;
    } catch (err) {
      console.error('[SchedulerService] Failed to fetch plan owner for socket routing:', err);
    }

    const emitStatus = (data: any) => {
      if (userId) {
        io.to(`user:${userId}`).emit('analysis-status', data);
      } else {
        io.emit('analysis-status', data);
      }
    };

    ProfilerService.startPlan(planId);
    RagOptimizerService.startTrace(planId);
    AiProviderService.startAuditTracking(planId);
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
    let planFacts: any = {};
    let globalFacts: any = {};
    let visionConfidence = 0.5;
    try {
      const extractionResult = await this.extractPlanFacts(planId, cacheResult, mimeType);
      console.log(`[SchedulerService] Parameter extraction complete. Vision Confidence: ${extractionResult.visionConfidence}`);
      planFacts = extractionResult.facts;
      globalFacts = extractionResult.globalFacts;
      visionConfidence = extractionResult.visionConfidence;
    } catch (err: any) {
      throw new Error(`Plan fact extraction failed: ${err.message || err}`);
    }

    // Fetch property violations & records via Apify based on extracted address
    let propertyRecords: any = null;
    if (globalFacts && globalFacts.project_address) {
      emitStatus({
        planId,
        status: 'FETCHING_PROPERTY_DATA',
        progress: 15,
        message: `Querying NYC DOB property violations for "${globalFacts.project_address}"...`
      });
      try {
        propertyRecords = await ApifyService.fetchPropertyData(globalFacts.project_address);
      } catch (apifyErr) {
        console.error('[SchedulerService] Apify fetch error:', apifyErr);
      }
    }

    EvidenceLogger.logAudit({
      auditId: planId,
      uploadedPlan: filePath,
      ocrOutput: planData.housePlanText,
      extractedParameters: planFacts,
      latencyMs: 0,
      memoryUsageBytes: process.memoryUsage().rss,
      cpuUsagePercentage: 0
    });

    // Pre-evaluate deterministic rules once
    const allDeterministicResults = DeterministicRuleEngine.evaluateRules(planFacts);

    // Pre-fetch administrative chunks once per plan audit (saves 16 redundant Pinecone query calls)
    console.log(`[SchedulerService] Pre-fetching NYC administrative code chunks...`);
    const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY as string });
    const index = pc.Index(process.env.PINECONE_INDEX as string);
    const adminQueries = [
      "NYC General Administrative Provisions GAP administrative provisions code enforcement licenses permits DOB fees",
      "NYC admin code construction documents architect stamp professional seal permit filing"
    ];
    const adminChunks: any[] = [];
    try {
      const adminQueryPromises = adminQueries.map(async (query) => {
        const queryVector = await generateQueryEmbedding(query);
        const queryResponse = await index.query({
          topK: 6,
          vector: queryVector,
          includeMetadata: true
        });
        return queryResponse.matches || [];
      });
      const adminQueryResults = await Promise.all(adminQueryPromises);
      for (const matches of adminQueryResults) {
        for (const m of matches) {
          if (m && m.metadata?.text) {
            adminChunks.push(m);
          }
        }
      }
      console.log(`[SchedulerService] Pre-fetched ${adminChunks.length} administrative chunks.`);
    } catch (err) {
      console.error(`[SchedulerService] Failed to pre-fetch administrative chunks:`, err);
    }

    // 5. Build task queue for concurrent execution
    let completedCount = 0;
    const tasks = stepsToRun.map(step => {
      return async () => {
        emitStatus({
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
            visionConfidence,
            adminChunks,
            allDeterministicResults,
            globalFacts
          );
          completedCount++;
          emitStatus({
            planId,
            status: step.statusKey,
            progress: Math.round(20 + (completedCount / stepsToRun.length) * 70),
            message: `${step.name} audit complete.`
          });
          return stepResult;
        } catch (err: any) {
          console.error(`[SchedulerService] Audit step ${step.id} failed:`, err);
          completedCount++;
          throw new Error(`Audit step ${step.id} failed: ${err.message || err}`);
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
    const tracking = AiProviderService.getAuditTracking(planId);
    AiProviderService.endAuditTracking(planId);

    return {
      results,
      metrics,
      profile: {
        ...profileSummary,
        ragTraces
      },
      tracking,
      propertyRecords
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
    visionConfidence: number,
    adminChunks: any[],
    allDeterministicResults: RuleEvaluationResult[],
    globalFacts: GlobalFacts
  ): Promise<any> {
    const stepConfig = STEPS_CONFIG.find(s => s.id === stepId)!;
    let isCachedFallback = false;
    let warningMsg = "";

    // Precondition Gates & Fact Validation (Phase 2 & 5)
    let isNycJurisdiction = true;
    if (globalFacts.city && globalFacts.city.toLowerCase().includes('ocean city')) {
      isNycJurisdiction = false;
    }
    if (globalFacts.state && (globalFacts.state.toLowerCase() === 'md' || globalFacts.state.toLowerCase() === 'maryland' || globalFacts.state.toLowerCase() === 'fl' || globalFacts.state.toLowerCase() === 'florida')) {
      isNycJurisdiction = false;
    }
    if (globalFacts.jurisdiction && !globalFacts.jurisdiction.toLowerCase().includes('nyc') && !globalFacts.jurisdiction.toLowerCase().includes('new york')) {
      isNycJurisdiction = false;
    }

    if (!isNycJurisdiction) {
      console.log(`[SchedulerService][${stepConfig.name}] Precondition Gate: Project outside NYC jurisdiction. Skipping step.`);
      return {
        id: stepId,
        name: stepConfig.name,
        checked: true,
        score: 100,
        status: 'compliant' as const,
        summary: `Not Applicable. Reason: Project outside NYC jurisdiction (${globalFacts.city || 'Ocean City'}, ${globalFacts.state || 'MD'}).`,
        compliant_features: [],
        issues: []
      };
    }

    if (globalFacts.document_type === 'Marketing Drawing') {
      console.log(`[SchedulerService][${stepConfig.name}] Precondition Gate: Document is a Marketing Drawing. Skipping step.`);
      return {
        id: stepId,
        name: stepConfig.name,
        checked: true,
        score: 100,
        status: 'compliant' as const,
        summary: `Not Applicable. Reason: Document is a Marketing Drawing, not construction documents for permit filing.`,
        compliant_features: [],
        issues: []
      };
    }

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
          topK: 12,
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

    const allMatches: any[] = [...adminChunks];

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

    // Apply MMR reranking for diversity
    const mmrReranked = RagOptimizerService.mmrRerank(rerankedMatches, 15, 0.6);

    // 3. Adaptive retrieval: stop gathering chunks once confidence threshold or token budget is reached
    const maxCharLimit = 25000; // Keep within budget (approx. 5000 tokens)
    const confidenceThreshold = 0.85;
    const adaptiveContext = RagOptimizerService.selectAdaptiveContext(
      mmrReranked,
      maxCharLimit,
      confidenceThreshold
    );

    const topMatches = adaptiveContext.selected;

    const contexts = topMatches
      .sort((a, b) => String(a.metadata?.source || "").localeCompare(String(b.metadata?.source || "")))
      .map((m, index) => {
        // Assign temporary chunk ID for LLM structured references
        (m as any).temp_chunk_id = `chunk_${index}`;
        return `[Chunk ID: chunk_${index}]
[Source Document: ${m.metadata?.source || 'Unknown'}]
[Code Family: ${m.metadata?.code_family || ''}]
[Code Edition: ${m.metadata?.code_edition || ''}]
[Chapter: ${m.metadata?.chapter || ''}]
[Section: ${m.metadata?.section || ''}]
[Page: ${m.metadata?.page_number || ''}]
${m.metadata?.text || ""}`;
      })
      .join("\n\n---\n\n");

    // Evaluate deterministic rules using pre-evaluated results passed in
    const stepDeterministicResults = allDeterministicResults.filter(dr => stepCodes.some(sc => sc.code === dr.code));
    const deterministicCodes = stepDeterministicResults.map(dr => dr.code);
    const nonDeterministicCodes = stepCodes.filter(c => !deterministicCodes.includes(c.code));

    console.log(`[SchedulerService][${stepConfig.name}] Deterministic codes evaluated: ${deterministicCodes.join(', ')}. Non-deterministic remaining: ${nonDeterministicCodes.map(c => c.code).join(', ')}.`);

    // System Prompt setup
    const systemPrompt = `You are PermitIQ, an AI-powered decision-support plan review assistant for New York City construction.
You DO NOT have the legal authority to approve plans, issue permits, or provide professional engineering or architectural advice.
You act strictly as a pre-submission compliance analyzer for Licensed Professionals (Registered Architects and Professional Engineers). Your goal is to flag potential violations, missing administrative data, and geometry conflicts before the human professional submits the plans to the NYC Department of Buildings (DOB).

LIABILITY & BEHAVIORAL GUARDRAILS:
1. ZERO-AUTHORITY RULE: Never state that a plan is "approved," "legal," or "certified." Only state that a plan "appears to meet the checked parameters" or "contains no detected flags in the analyzed sections."
2. HUMAN OVERRIDE: Always append warnings to your final output: "This analysis is for decision-support only. The Applicant of Record (RA/PE) assumes 100% legal liability for DOB compliance, including Professional Certification (Pro Cert) audits."
3. NO DESIGNING: If a plan fails a check, do not engineer a solution. You may cite the code requirement, but do not instruct the architect on how to redesign the floorplan to fix it.

CORE KNOWLEDGE BASE: 2026 NYC STANDARDS
Evaluate all uploaded drawings and data against the following primary frameworks, using the date of analysis (current year 2026) to enforce current 2026 laws:
1. 2022 NYC Construction Codes: (Building, Plumbing, Mechanical, Fuel Gas). Ignore the national IBC.
2. 2025 NYC Electrical Code: For filings analyzed after June 2026, enforce the 2025 code requirements and electrical permit limits.
3. NYC Zoning Resolution: Cross-reference the specific property address against current zoning maps, Special Purpose Districts, and contextual zoning mandates.
4. The All-Electric Mandate: For new low-rise buildings (7 stories or fewer) filed after Jan 1, 2026, flag any presence of fossil-fuel systems (gas heating, cooking) as a fatal violation.
5. Local Law 97 (Carbon Caps): Flag MEP systems that exceed the building's specific emission limits based on occupancy type.
6. Local Law 152 & 11: Flag missing inspection protocols for gas piping (152) and facade safety (11/FISP) on applicable existing buildings.

DOB NOW: ADMINISTRATIVE PROTOCOLS
Before evaluating life safety or zoning, perform a strict administrative "Completeness Check" for the DOB NOW: Build portal.
1. Data Consistency: The story count, address, block/lot numbers, and occupancy classifications must match exactly across the title sheet, architectural plans, and zoning diagrams.
2. Form TR1: Flag the absence of Special Inspection requirements (TR1) if the plans indicate structural steel, concrete pouring, or underpinning.
3. Co-op/Condo Attestation (2026 Rule): If the building is a residential co-op or condo, flag that DOB NOW requires a digital board attestation before filing can proceed.
4. Agency Pre-Approvals: Scan the scope of work and flag required prior approvals from FDNY (fire alarms/sprinklers), LPC (landmarks), or DEP (asbestos ACP-5/ACP-7).

CRITICAL MISSION:
1. CITATION INTEGRITY (ABSOLUTE RULE):
   - You may ONLY cite specific code sections that are present in the REFERENCE CONTEXT below.
   - If a code section is not present in the context, do NOT invent it. Instead, write exactly "No applicable section found".
   - Never guess, never estimate, never complete section numbering, and never infer code regulations.
2. SCORING:
   - Compliance score starts at 100%. Deduct percentage based on severity: critical = 15-25%, major = 10-15%, minor = 2-10%.
   - Score = 100 - sum(deductions). Cap at 0. If critical life-safety system is missing, score is 0.
3. CODE CHECKS: Evaluate against these regulations:
${nonDeterministicCodes.map(c => `   - ${c.code}: ${c.title} (Check: ${c.description})`).join('\n')}
   Return status in "checklist_evaluations". Do NOT assume compliance; verify dimensions/parameters.
4. OPERATIONAL PROTOCOLS (ConOps):
   - Evaluate Emergency Action Plans. Cite operational violations under NFPA 101.
5. OCCUPANCY GOLDEN RULES:
   - Group I-2 (Hospitals): Enforce horizontal defend-in-place. Vertical evacuation or ventilator disconnection protocols are CRITICAL (NFPA 101 Sec 19.7.1).
   - Group H (High Hazard): delays prohibited (FC 907.2).
6. STRESS-TESTS:
   - Check for contradictions. If control valve shut, treat as unsprinklered (reduce egress/dead-ends limits).
   - Verify loads/capacities. Reject fabricated formulas.
7. OCCUPACITY APPLICABILITY:
   - Residential-only checks (AFCI, receptacle spacing, dwelling density, habitable room heights/dimensions, residential GFCI) MUST be marked as "not_applicable" with 0 deduction for non-residential buildings. All other checks are universal.
8. SCOPE ISOLATION:
   - Only output violations belonging to ${stepConfig.name}. Do NOT output other disciplines' issues.
9. MISSING DATA:
   - If plan lacks zoning info, mark ZR checks as "not_applicable" and details to "Incomplete Data / Insufficient Information". Do NOT deduct points.
10. MISSING LIFE-SAFETY:
   - Missing core discipline systems in commercial plans is a CRITICAL omission. Score 0% and list critical violation.
11. JSON FORMAT INSTRUCTIONS:
     Return valid JSON in this format:
     {
       "score": <number>,
       "summary": "<Short technical summary (max 3 sentences) accompanied by this warning: 'This analysis is for decision-support only. The Applicant of Record (RA/PE) assumes 100% legal liability for DOB compliance, including Professional Certification (Pro Cert) audits.'>",
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
           "description": "<MUST be formatted exactly like a standard DOB Plan Examiner Objection. Do not write in paragraphs. Use this exact multi-line schema:\n- OBJECTION CATEGORY: [e.g. Zoning, Egress, Administrative, Fire Protection]\n- DOB OBJECTION CODE: [e.g. EN-v.2, or N/A]\n- CITED LAW: [Exact Code Section, e.g. 2022 NYC BC 1006.2.1]\n- DETECTED CONDITION: [Objective statement of what is on the plan]\n- REQUIRED CONDITION: [Objective statement of what the code dictates]>",
           "severity": "critical" | "major" | "minor",
           "citation_chunk_id": "<must be one of the provided chunk IDs e.g. chunk_0, chunk_1, etc. that supports this finding. Set to null if none exists.>",
           "recommendation": "<remedy>",
           "deduction_percentage": <number>,
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
 
  CRITICAL CITATION INSTRUCTION:
  - You MUST NOT write the code section citation string or drawing citation manually in any issue.
  - Instead, specify the correct "citation_chunk_id" referencing a chunk from the context below.
  - If no chunk from the reference context supports the issue, do NOT report it.
  
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
            temperature: 0,
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
          const response = await AiProviderService.executePromptWithFailover(
            requestPayload,
            planId,
            stepId,
            PIPELINE_CONFIG.models.pro
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
      const challengerPrompt = `You are an AI-powered compliance reference consultant playing the role of a fact-checking auditor.
The informational search assistant has flagged the following potential code alignment issues in its independent reference analysis:
Analysis A Issues:
${JSON.stringify(issuesA, null, 2)}

Analysis B Issues:
${JSON.stringify(issuesB, null, 2)}

Your goal is to inspect the drawings and RAG code context, and fact-check these findings. For each issue, identify any possible exceptions in the NYC Building/Plumbing/Mechanical Code, design tolerances, or data parameters that indicate compliance or highlight potential false positives in the initial search results.

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
            temperature: 0,
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
          const response = await AiProviderService.executePromptWithFailover(
            payload,
            planId,
            stepId,
            PIPELINE_CONFIG.models.pro
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
      const judgePrompt = `You are PermitIQ, the Principal NYC Plans Examiner acting as an independent judge.
You DO NOT have the legal authority to approve plans, issue permits, or provide professional engineering or architectural advice.
You act strictly as a pre-submission compliance analyzer for Licensed Professionals. Your goal is to flag potential violations, missing administrative data, and geometry conflicts before the human professional submits the plans to the NYC Department of Buildings (DOB).

LIABILITY & BEHAVIORAL GUARDRAILS:
1. ZERO-AUTHORITY RULE: Never state that a plan is "approved," "legal," or "certified." Only state that a plan "appears to meet the checked parameters" or "contains no detected flags in the analyzed sections."
2. HUMAN OVERRIDE: Always append warnings to your final output: "This analysis is for decision-support only. The Applicant of Record (RA/PE) assumes 100% legal liability for DOB compliance, including Professional Certification (Pro Cert) audits."
3. NO DESIGNING: If a plan fails a check, do not engineer a solution. You may cite the code requirement, but do not instruct the architect on how to redesign the floorplan to fix it.

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
  "summary": "<Forensic summary of final rulings (max 3 sentences) accompanied by this warning: 'This analysis is for decision-support only. The Applicant of Record (RA/PE) assumes 100% legal liability for DOB compliance, including Professional Certification (Pro Cert) audits.'>",
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
      "description": "<MUST be formatted exactly like a standard DOB Plan Examiner Objection. Do not write in paragraphs. Use this exact multi-line schema:\n- OBJECTION CATEGORY: [e.g. Zoning, Egress, Administrative, Fire Protection]\n- DOB OBJECTION CODE: [e.g. EN-v.2, or N/A]\n- CITED LAW: [Exact Code Section, e.g. 2022 NYC BC 1006.2.1]\n- DETECTED CONDITION: [Objective statement of what is on the plan]\n- REQUIRED CONDITION: [Objective statement of what the code dictates]>",
      "severity": "critical" | "major" | "minor",
      "citation_chunk_id": "<must be one of the provided chunk IDs e.g. chunk_0, chunk_1, etc. that supports this finding. Set to null if none exists.>",
      "recommendation": "<remedy>",
      "deduction_percentage": <number>,
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
}

CRITICAL CITATION INSTRUCTION:
- You MUST NOT write the code section citation string or drawing citation manually in any issue.
- Instead, specify the correct "citation_chunk_id" referencing a chunk from the context below.
- If no chunk from the reference context supports the issue, do NOT report it.`;

      const runJudge = async (promptOverride?: string): Promise<any> => {
        const activePrompt = promptOverride || judgePrompt;
        const payload: any = {
          generationConfig: {
            temperature: 0,
            responseMimeType: "application/json"
          }
        };

        if (cacheResult.cacheName) {
          payload.cached_content = cacheResult.cacheName;
          payload.contents = [{
            role: 'user',
            parts: [{ text: `System Instructions:\n${activePrompt}\n\nUser Request:\nMake final rulings and resolve all disagreements.` }]
          }];
        } else if (cacheResult.inlineData) {
          payload.contents = [{
            role: 'user',
            parts: [
              { inlineData: { mimeType, data: cacheResult.inlineData } },
              { text: activePrompt }
            ]
          }];
        } else {
          payload.contents = [{
            role: 'user',
            parts: [
              { fileData: { fileUri: cacheResult.fileUri, mimeType } },
              { text: activePrompt }
            ]
          }];
        }

        await SchedulerService.proSemaphore.acquire();
        try {
          const start = performance.now();
          const response = await AiProviderService.executePromptWithFailover(
            payload,
            planId,
            stepId,
            PIPELINE_CONFIG.models.pro
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

      // 3.5. Citation Reconstruction, Validation, and Retry Gate
      let validatedJudgeIssues: any[] = [];
      let finalEvaluations = judgeResult.checklist_evaluations || [];
      let currentJudgeResult = judgeResult;

      const validateAndReconstruct = (issues: any[]): { reconstructed: any[], isValid: boolean } => {
        let allValid = true;
        const reconstructed: any[] = [];

        // Build code allowlist: stepCodes + retrieved section codes
        const codeAllowlist = new Set<string>();
        stepCodes.forEach(sc => codeAllowlist.add(sc.code.toLowerCase().replace(/\s+/g, '')));
        topMatches.forEach(m => {
          const { section } = RagOptimizerService.parseFallbackSection(m.metadata?.text || "");
          const activeSection = m.metadata?.section || section || "";
          if (activeSection) {
            codeAllowlist.add(activeSection.toLowerCase().replace(/\s+/g, ''));
          }
        });

        for (const issue of issues) {
          const chunkId = issue.citation_chunk_id;
          let matchedChunk = topMatches.find(m => (m as any).temp_chunk_id === chunkId);

          if (!matchedChunk && issue.code) {
            const cleanCode = issue.code.toLowerCase().replace(/\s+/g, '');
            matchedChunk = topMatches.find(m => {
              const { section } = RagOptimizerService.parseFallbackSection(m.metadata?.text || "");
              const activeSection = m.metadata?.section || section || "";
              return activeSection.toLowerCase().replace(/\s+/g, '') === cleanCode;
            });
          }

          if (matchedChunk) {
            const { section } = RagOptimizerService.parseFallbackSection(matchedChunk.metadata?.text || "");
            const activeSection = matchedChunk.metadata?.section || section || "Unknown Section";
            const sourceFile = matchedChunk.metadata?.source || "NYC Building Code";

            const cleanActiveSec = activeSection.toLowerCase().replace(/\s+/g, '');
            if (codeAllowlist.has(cleanActiveSec)) {
              issue.code = activeSection;
              issue.exact_pdf_citation = `${sourceFile}, Page ${matchedChunk.metadata?.page_number || 'N/A'}`;
              reconstructed.push(issue);
            } else {
              console.warn(`[SchedulerService][${stepConfig.name}] Citation allowlist mismatch: "${activeSection}" not in allowlist. Replacing.`);
              issue.code = activeSection;
              issue.exact_pdf_citation = "Citation unavailable";
              issue.confidence_level = 'LOW';
              allValid = false;
              reconstructed.push(issue);
            }
          } else {
            console.warn(`[SchedulerService][${stepConfig.name}] Citation Validation: rejected hallucinated/unverified chunk pointer ${chunkId} for issue:`, issue);
            issue.code = "Citation unavailable";
            issue.exact_pdf_citation = "Citation unavailable";
            issue.confidence_level = 'LOW';
            allValid = false;
            reconstructed.push(issue);
          }
        }

        return { reconstructed, isValid: allValid };
      };

      let checkResult = validateAndReconstruct(currentJudgeResult.issues || []);
      validatedJudgeIssues = checkResult.reconstructed;

      if (!checkResult.isValid) {
        console.log(`[SchedulerService][${stepConfig.name}] Citation validation failed on first attempt. Retrying judge once...`);
        const retryPrompt = `${judgePrompt}\n\nWARNING: Your previous response contained invalid or hallucinated citations. You may ONLY reference the following allowed chunk IDs:\n${topMatches.map(m => `   - ${(m as any).temp_chunk_id}: ${m.metadata?.source || ''}`).join('\n')}\nRetries must strictly comply with this constraint.`;

        const retryResult = await runJudge(retryPrompt);
        if (retryResult) {
          currentJudgeResult = retryResult;
          finalEvaluations = retryResult.checklist_evaluations || [];
          const secondCheck = validateAndReconstruct(currentJudgeResult.issues || []);
          validatedJudgeIssues = secondCheck.reconstructed;
        }
      }

      // Now run verifications in parallel
      const verifierPromises = validatedJudgeIssues.map(async (issue) => {
        const confidence = issue.confidence !== undefined ? issue.confidence : 1.0;
        if (confidence < 0.90 && issue.code !== 'Citation unavailable') {
          console.log(`[SchedulerService][${stepConfig.name}] Low confidence finding (${confidence}) detected for code ${issue.code}. Running verification pass...`);

          const verifierPrompt = `You are PermitIQ, the Chief NYC Code Compliance Auditor performing a precision verification check on a low-confidence compliance finding.
You DO NOT have the legal authority to approve plans, issue permits, or provide professional engineering or architectural advice.
You act strictly as a pre-submission compliance analyzer for Licensed Professionals.

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
    "description": "<MUST be formatted exactly like a standard DOB Plan Examiner Objection. Do not write in paragraphs. Use this exact multi-line schema:\n- OBJECTION CATEGORY: [e.g. Zoning, Egress, Administrative, Fire Protection]\n- DOB OBJECTION CODE: [e.g. EN-v.2, or N/A]\n- CITED LAW: [Exact Code Section, e.g. 2022 NYC BC 1006.2.1]\n- DETECTED CONDITION: [Objective statement of what is on the plan]\n- REQUIRED CONDITION: [Objective statement of what the code dictates]>",
    "severity": "critical" | "major" | "minor",
    "citation_chunk_id": "<must be one of the provided chunk IDs e.g. chunk_0, chunk_1, etc. that supports this finding. Set to null if none exists.>",
    "recommendation": "<remedy>",
    "deduction_percentage": <number>,
    "loophole_details": "<why it failed>",
    "required_elements": "<fix requirements>"
  }
}`;

          const payload: any = {
            generationConfig: {
              temperature: 0,
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
            const response = await AiProviderService.executePromptWithFailover(
              payload,
              planId,
              stepId,
              PIPELINE_CONFIG.models.pro
            );
            SchedulerService.proCallsCount++;
            const verifierResult = this.parseJsonResult(response.text, "Verifier");
            return { issue, verifierResult };
          } catch (err) {
            console.error(`[SchedulerService] Verifier failed for code ${issue.code}:`, err);
            return { issue, verifierResult: null };
          } finally {
            SchedulerService.proSemaphore.release();
          }
        }
        return { issue, verifierResult: { verdict: 'CONFIRMED' } };
      });

      const verifierResults = await Promise.all(verifierPromises);
      const verifiedProIssues: any[] = [];

      for (const { issue, verifierResult } of verifierResults) {
        if (verifierResult && verifierResult.verdict === 'CONFIRMED') {
          const corrected = verifierResult.corrected_issue || issue;
          corrected.confidence = verifierResult.confidence || 0.95;

          if (corrected.citation_chunk_id) {
            const matchedChunk = topMatches.find(m => (m as any).temp_chunk_id === corrected.citation_chunk_id);
            if (matchedChunk) {
              const { section } = RagOptimizerService.parseFallbackSection(matchedChunk.metadata?.text || "");
              const activeSection = matchedChunk.metadata?.section || section || "Unknown Section";
              const sourceFile = matchedChunk.metadata?.source || "NYC Building Code";
              corrected.code = activeSection;
              corrected.exact_pdf_citation = `${sourceFile}, Page ${matchedChunk.metadata?.page_number || 'N/A'}`;
            }
          }

          verifiedProIssues.push(corrected);
        } else if (verifierResult && verifierResult.verdict === 'DISMISSED') {
          console.log(`[SchedulerService][${stepConfig.name}] Issue DISMISSED by verifier.`);
          const ev = finalEvaluations.find((e: any) => e.code === issue.code);
          if (ev) {
            ev.status = 'compliant';
            ev.details = `Compliant (Dismissed low-confidence violation: ${verifierResult?.explanation || 'No issue found'})`;
          }
        } else {
          verifiedProIssues.push(issue);
        }
      }

      // 5. Evidence Completeness Check & Repair Gate in parallel
      const repairPromises = verifiedProIssues.map(async (issue) => {
        const isMissingField = !issue.code || !issue.exact_pdf_citation || !issue.description || !issue.severity || !issue.recommendation;
        if (isMissingField && issue.code !== 'Citation unavailable') {
          console.log(`[SchedulerService][${stepConfig.name}] Missing evidence fields detected in issue for code ${issue.code}. Running repair pass...`);

          const repairPrompt = `You are PermitIQ, the AI-powered Compliance Reference Assistant. The following informational compliance finding is missing key details.
You DO NOT have the legal authority to approve plans, issue permits, or provide professional engineering or architectural advice.
You act strictly as a pre-submission compliance analyzer for Licensed Professionals.

Compliance Issue:
${JSON.stringify(issue, null, 2)}

Code Context:
${contexts}

Your task is to fill in the missing details. Do NOT change the finding verdict. Only provide the missing fields.

Return a JSON object in this exact format:
{
  "code": "<code section>",
  "exact_pdf_citation": "<drawing name/PDF section>",
  "description": "<MUST be formatted exactly like a standard DOB Plan Examiner Objection. Do not write in paragraphs. Use this exact multi-line schema:\n- OBJECTION CATEGORY: [e.g. Zoning, Egress, Administrative, Fire Protection]\n- DOB OBJECTION CODE: [e.g. EN-v.2, or N/A]\n- CITED LAW: [Exact Code Section, e.g. 2022 NYC BC 1006.2.1]\n- DETECTED CONDITION: [Objective statement of what is on the plan]\n- REQUIRED CONDITION: [Objective statement of what the code dictates]>",
  "severity": "critical" | "major" | "minor",
  "recommendation": "<remedy>",
  "loophole_details": "<why it failed>",
  "required_elements": "<fix requirements>"
}`;

          const payload: any = {
            generationConfig: {
              temperature: 0,
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
            const response = await AiProviderService.executePromptWithFailover(
              payload,
              planId,
              stepId,
              PIPELINE_CONFIG.models.pro
            );
            SchedulerService.proCallsCount++;
            const repaired = this.parseJsonResult(response.text, "Repairer");
            return repaired ? { ...issue, ...repaired } : issue;
          } catch (repairErr) {
            console.error(`[SchedulerService] Repair pass failed for code ${issue.code}:`, repairErr);
            return issue;
          } finally {
            SchedulerService.proSemaphore.release();
          }
        }
        return issue;
      });

      const repairedIssues = await Promise.all(repairPromises);

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
        const visConf = currentVisionConfidence;
        const ragConf = 0.90;
        const reasoningConf = issue.confidence !== undefined ? issue.confidence : 0.85;

        const isCitationRemoved = issue.exact_pdf_citation === "Citation unavailable" || issue.code === "Citation unavailable";
        const isOcrLow = visConf < 0.7;
        const isFactMissing = Object.values(planFacts).some(v => v === null);

        let overall = visConf * ragConf * reasoningConf;
        if (isFactMissing) overall *= 0.6;
        if (isCitationRemoved) overall *= 0.4;
        if (isOcrLow) overall *= 0.5;

        let confidence_level: 'HIGH' | 'MEDIUM' | 'LOW' = 'HIGH';
        if (isCitationRemoved || isFactMissing || isOcrLow || overall < 0.5) {
          confidence_level = 'LOW';
        } else if (overall < 0.78) {
          confidence_level = 'MEDIUM';
        }

        return {
          ...issue,
          confidence_level,
          confidence: parseFloat(overall.toFixed(2)),
          confidence_metrics: {
            deterministic: 0.0,
            vision: visConf,
            rag: ragConf,
            reasoning: reasoningConf,
            overall: parseFloat(overall.toFixed(2))
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

        if (!inContext && !inChecklist) {
          console.warn(`[SchedulerService][${stepConfig.name}] Citation Validation: Hallucinated code citation ${codeSection}. Replacing citation.`);
          issue.exact_pdf_citation = "Citation unavailable";
          issue.confidence_level = 'LOW';
          if (issue.confidence_metrics) {
            issue.confidence_metrics.reasoning = Math.max(0.1, issue.confidence_metrics.reasoning - 0.3);
            issue.confidence_metrics.overall = parseFloat((issue.confidence_metrics.overall * 0.7).toFixed(2));
          }
        }

        // Verify exact_pdf_citation against retrieved contexts
        if (issue.exact_pdf_citation && issue.exact_pdf_citation !== "Citation unavailable") {
          const citationLower = issue.exact_pdf_citation.toLowerCase();
          const secMatch = citationLower.match(/(?:section|bc|pc|mc|fc|zr)\s*([0-9]+(?:\.[0-9]+)*)/);
          if (secMatch && secMatch[1]) {
            const secNum = secMatch[1];
            if (!contexts.toLowerCase().includes(secNum)) {
              console.warn(`[SchedulerService][${stepConfig.name}] Citation Validation: exact_pdf_citation "${issue.exact_pdf_citation}" cites section ${secNum} not found in retrieved chunks.`);
              issue.exact_pdf_citation = "Citation unavailable";
              issue.confidence_level = 'LOW';
              if (issue.confidence_metrics) {
                issue.confidence_metrics.reasoning = Math.max(0.1, issue.confidence_metrics.reasoning - 0.2);
                issue.confidence_metrics.overall = parseFloat((issue.confidence_metrics.overall * 0.8).toFixed(2));
              }
            }
          }
        }

        validatedIssues.push(issue);
      }

      // Phase 4: Fact Locking Verification
      for (const issue of validatedIssues) {
        const descLower = (issue.description || "").toLowerCase();
        if (globalFacts.story_count !== null && descLower.includes(`${globalFacts.story_count - 1} stories`)) {
          console.warn(`[SchedulerService][${stepConfig.name}] Fact Locking: rejected reasoning contradicting story_count.`);
          issue.description = `[Reasoning Rejected: Contradicted locked story count] ${issue.description}`;
        }
        if (globalFacts.occupancy && descLower.includes(`occupancy group`) && !descLower.includes(globalFacts.occupancy.toLowerCase())) {
          console.warn(`[SchedulerService][${stepConfig.name}] Fact Locking: rejected reasoning contradicting occupancy group.`);
          issue.description = `[Reasoning Rejected: Contradicted locked occupancy group] ${issue.description}`;
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

      try {
        const totalIssues = validatedIssues.length;
        const hallucinatedCount = validatedIssues.filter((i: any) => i.code === 'Citation unavailable' || i.exact_pdf_citation === 'Citation unavailable').length;
        const hallucinationRate = totalIssues > 0 ? (hallucinatedCount / totalIssues) : 0.0;
        metrics.setGauge('nyc_citation_hallucination_rate', hallucinationRate, { discipline: stepId });

        const ocrConf = currentVisionConfidence;
        metrics.setGauge('nyc_ocr_confidence', ocrConf, { discipline: stepId });

        const judgeDisagreement = resultA && resultB && (resultA.issues?.length !== resultB.issues?.length) ? 1.0 : 0.0;
        metrics.setGauge('nyc_judge_disagreement', judgeDisagreement, { discipline: stepId });

        const verifiedCitations = validatedIssues.filter((i: any) => i.code !== 'Citation unavailable' && i.exact_pdf_citation !== 'Citation unavailable').length;
        const retrievalPrecision = totalIssues > 0 ? (verifiedCitations / totalIssues) : 1.0;
        metrics.setGauge('nyc_retrieval_precision', retrievalPrecision, { discipline: stepId });

        metrics.setGauge('nyc_per_discipline_accuracy', finalScore / 100, { discipline: stepId });
      } catch (metricsErr) {
        console.error(`[SchedulerService] Failed to update Prometheus metrics for step ${stepId}:`, metricsErr);
      }

      try {
        const startCPU = process.cpuUsage();
        const startMemory = process.memoryUsage().rss;

        EvidenceLogger.logAudit({
          auditId: planId,
          discipline: stepId,
          retrievedChunks: topMatches.map(m => ({
            id: m.id,
            score: m.score || 0,
            mmrScore: (m as any).mmrScore,
            metadata: m.metadata,
            status: 'selected'
          })),
          deterministicRules: stepDeterministicResults,
          judgeDecisions: judgeResult?.rulings || [],
          challengerDecisions: challengerResult?.rebuttals || [],
          citationsBeforeValidation: judgeResult?.issues || [],
          citationsAfterValidation: validatedIssues,
          repairedCitations: repairedIssues,
          confidenceCalculations: {
            vision: currentVisionConfidence,
            rag: 0.90,
            overall: finalScore / 100
          },
          latencyMs: Math.round(performance.now() - pineconeStart),
          memoryUsageBytes: process.memoryUsage().rss - startMemory,
          cpuUsagePercentage: Math.round(process.cpuUsage(startCPU).user / 1000)
        });
      } catch (err) {
        console.error(`[SchedulerService] Evidence logging failed for step ${stepId}:`, err);
      }
    }

    // Process output and formatting
    const hasMeasuredScore = typeof resultJSON.score === 'number' && Number.isFinite(resultJSON.score);
    const finalResult = {
      id: stepId,
      name: stepConfig.name,
      checked: hasMeasuredScore,
      score: hasMeasuredScore ? resultJSON.score : null,
      status: !hasMeasuredScore ? 'failed' as const : (resultJSON.issues && resultJSON.issues.length > 0) ? 'warning' as const : 'compliant' as const,
      summary: resultJSON.summary || (hasMeasuredScore ? `Analysis completed for ${stepConfig.name}.` : `No measured score returned for ${stepConfig.name}.`),
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
          code: "Provider Escalation",
          recommendation: "Re-run audit when Gemini Pro quota resets.",
          deduction_percentage: 0,
          exact_pdf_citation: undefined,
          loophole_details: "Gemini Pro was unavailable, results evaluated using Flash.",
          required_elements: undefined,
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
    const score = typeof resultJSON.score === 'number' && Number.isFinite(resultJSON.score) ? resultJSON.score : null;
    const isBorderline = score !== null && score >= 65 && score <= 75;
    const modelForJudge = (isBorderline && !isCachedFallback) ? PIPELINE_CONFIG.models.pro : PIPELINE_CONFIG.models.flash;

    // --- STEP 1: Challenger Argument (Gemini 2.5 Flash) ---
    console.log(`[ChallengerDebate][${stepConfig.name}] STEP 1: Challenger preparing defense arguments...`);
    const challengerPrompt = `You are a licensed contractor and expert NYC plans consultant playing the role of a defense attorney.
The Plan Auditor has flagged the following code compliance issues in the attached drawings:
${JSON.stringify(issues, null, 2)}

Your goal is to inspect the drawings and argue why each issue is actually COMPLIANT. Cite specific exceptions in the NYC Building/Plumbing/Mechanical Code, drawing tolerances, occupant loads, or design details from the blueprints that the auditor might have overlooked.
Argue fiercely but professionally.

CRITICAL CITATION RULES:
- You may ONLY cite specific code sections or exceptions that are present in the provided NYC Building Code reference context.
- If a section or exception is not present in the context, do NOT invent/hallucinate it. Instead, write exactly "No applicable section found".
- Any rebuttal citing non-existent or fabricated sections will be rejected by the Judge.

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
        temperature: 0,
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

    const challengerResponse = await AiProviderService.executePromptWithFailover(
      challengerPayload,
      planId,
      stepId,
      PIPELINE_CONFIG.models.flash
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
If you find the contractor or the auditor has fabricated a citation (citing a section that does not exist in the reference context), you must deduct confidence and reject that specific point.

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
        temperature: 0,
        responseMimeType: "application/json"
      }
    };

    const canUseCacheForJudge = cacheResult.cacheName && (modelForJudge === PIPELINE_CONFIG.models.pro);

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
        const response = await AiProviderService.executePromptWithFailover(
          judgePayload,
          planId,
          stepId,
          modelForJudge
        );
        judgeResponseText = response.text;
      } finally {
        SchedulerService.proSemaphore.release();
      }
    } else {
      const response = await AiProviderService.executePromptWithFailover(
        judgePayload,
        planId,
        stepId,
        modelForJudge
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
        temperature: 0,
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
      const response = await AiProviderService.executePromptWithFailover(
        payload,
        planId,
        'cross_discipline',
        PIPELINE_CONFIG.models.pro
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
  ): Promise<{ facts: ExtractedFacts; globalFacts: GlobalFacts; visionConfidence: number }> {
    const prompt = `You are a precision Plan Verification OCR & Vision Assistant.
Your task is to analyze the drawings and text of the attached plan and extract code parameters, dimensions, and global project metadata.

CRITICAL INSTRUCTION:
1. ONLY extract dimensions, counts, or measurements that are explicitly visible/labeled on the drawings or in the text.
2. If a parameter is not explicitly mentioned or is not readable on the drawings, you MUST set the "value" to null.
3. Do NOT guess, estimate, approximate, or extrapolate any values.
4. For each parameter, provide:
   - "value": The extracted number, boolean, array of numbers, or null.
   - "confidence": Your confidence in the extraction (between 0.0 and 1.0). If value is null, confidence is 1.0.
   - "source_page": The 1-based page number where this information was found.
   - "bounding_box": [ymin, xmin, ymax, xmax] coordinates of the bounding box on the page where the dimension/annotation is located (0-1000 scale). If not applicable, use null.
   - "ocr_evidence": The exact OCR text or labeled text found (e.g. "STAIR WIDTH: 44\""). If not applicable, use null.

JSON Schema:
{
  "global_facts": {
    "project_name": { "value": <string | null>, "confidence": <float>, "source_page": <number | null> },
    "project_address": { "value": <string | null>, "confidence": <float>, "source_page": <number | null> },
    "city": { "value": <string | null>, "confidence": <float>, "source_page": <number | null> },
    "state": { "value": <string | null>, "confidence": <float>, "source_page": <number | null> },
    "country": { "value": <string | null>, "confidence": <float>, "source_page": <number | null> },
    "jurisdiction": { "value": <string | null>, "confidence": <float>, "source_page": <number | null> },
    "applicable_code_set": { "value": <string | null>, "confidence": <float>, "source_page": <number | null> },
    "document_type": { "value": "Concept Drawing" | "Marketing Drawing" | "Construction Documents" | null, "confidence": <float> },
    "occupancy": { "value": <string | null>, "confidence": <float> },
    "construction_type": { "value": <string | null>, "confidence": <float> },
    "building_height_feet": { "value": <number | null>, "confidence": <float> },
    "story_count": { "value": <number | null>, "confidence": <float> },
    "basement": { "value": <boolean | null>, "confidence": <float> },
    "building_use": { "value": <string | null>, "confidence": <float> },
    "review_scope": { "value": <string | null>, "confidence": <float> }
  },
  "facts": {
    "occupant_load": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "exit_stairs_count": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "stair_width_inches": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "door_clear_width_inches": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "corridor_width_inches": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "ceiling_height_inches": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "room_dimensions_feet": { "value": <[numbers] | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "water_closet_spacing_inches": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "transformer_kva": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "planned_electrical_load_kva": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "panel_clearance_inches": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "receptacle_spacing_feet": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "gross_floor_area_sqft": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "lot_area_sqft": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "allowable_far": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "parking_spaces_provided": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "dwelling_units_count": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "allowable_dwelling_units_limit": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "travel_distance_feet": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> },
    "dead_end_corridor_feet": { "value": <number | null>, "confidence": <float>, "source_page": <number | null>, "bounding_box": <[ymin, xmin, ymax, xmax] | null>, "ocr_evidence": <string | null> }
  },
  "vision_confidence": <float, between 0.0 and 1.0>
}`;

    const payload: any = {
      generationConfig: {
        temperature: 0,
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
      const response = await AiProviderService.executePromptWithFailover(
        payload,
        planId,
        'building', // use building as default for visual extraction
        PIPELINE_CONFIG.models.pro
      );
      SchedulerService.proCallsCount++;
      const result = this.parseJsonResult(response.text, "Visual Fact Extractor");

      const rawFacts = result?.facts || {};
      const flattenedFacts: any = {};
      const parameterKeys = Object.keys(rawFacts);

      for (const key of parameterKeys) {
        const item = rawFacts[key];
        if (item && typeof item === 'object' && 'value' in item) {
          const conf = typeof item.confidence === 'number' ? item.confidence : 1.0;
          if (conf < 0.6) {
            console.log(`[VisualFactExtractor] Downgrading low confidence parameter "${key}" (conf: ${conf}) to null.`);
            flattenedFacts[key] = null;
          } else {
            flattenedFacts[key] = item.value;
          }
        } else if (item !== undefined) {
          flattenedFacts[key] = item;
        } else {
          flattenedFacts[key] = null;
        }
      }

      // Parse global facts
      const rawGlobal = result?.global_facts || {};
      const globalFacts: GlobalFacts = {
        project_name: rawGlobal.project_name?.value || null,
        project_address: rawGlobal.project_address?.value || null,
        city: rawGlobal.city?.value || null,
        state: rawGlobal.state?.value || null,
        country: rawGlobal.country?.value || null,
        jurisdiction: rawGlobal.jurisdiction?.value || null,
        applicable_code_set: rawGlobal.applicable_code_set?.value || null,
        document_type: rawGlobal.document_type?.value || null,
        occupancy: rawGlobal.occupancy?.value || null,
        construction_type: rawGlobal.construction_type?.value || null,
        building_height_feet: rawGlobal.building_height_feet?.value || null,
        story_count: rawGlobal.story_count?.value || null,
        basement: rawGlobal.basement?.value || null,
        building_use: rawGlobal.building_use?.value || null,
        review_scope: rawGlobal.review_scope?.value || null
      };

      return {
        facts: flattenedFacts,
        globalFacts,
        visionConfidence: result?.vision_confidence !== undefined ? result.vision_confidence : 0.90
      };
    } catch (err) {
      console.error(`[SchedulerService] Plan fact extraction failed:`, err);
      return {
        facts: {},
        globalFacts: {
          project_name: null,
          project_address: null,
          city: null,
          state: null,
          country: null,
          jurisdiction: null,
          applicable_code_set: null,
          document_type: null,
          occupancy: null,
          construction_type: null,
          building_height_feet: null,
          story_count: null,
          basement: null,
          building_use: null,
          review_scope: null
        },
        visionConfidence: 0.5
      };
    } finally {
      SchedulerService.proSemaphore.release();
    }
  }
}
