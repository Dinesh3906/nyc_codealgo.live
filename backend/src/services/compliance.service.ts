import fs from 'fs';
import { io } from '../app';
import pool from '../db';
import path from 'path';
import { checkComplianceTS, checkStepComplianceTS, extractPlanData, STEPS_CONFIG, STEP_CODES_CHECKLIST } from './native_rag';
import { SchedulerService } from './scheduler.service';
import { AiProviderService } from './provider.service';
import { Logger } from './logger';
import { metrics } from './metrics.service';
import { VERSIONS } from '../config/versions';

const logger = new Logger({ stage: 'compliance-pipeline' });

export interface ScoreBreakdown {
  critical: number;
  major: number;
  minor: number;
}

export interface AnalysisIssue {
  title: string;
  description: string;
  severity: 'critical' | 'major' | 'minor';
  rule: string;
  suggestion: string;
  stepId?: string;
  deductionPercentage?: number;
  exactPdfCitation?: string;
  loopholeDetails?: string;
  requiredElements?: string;
}

export interface ComplianceResult {
  compliant: boolean | null;
  score: number | null;
  severity: ScoreBreakdown;
  issues: AnalysisIssue[];
  summary: string;
  status: 'complete' | 'failed' | 'partial' | 'manual_review';
  issuesCount: number;
  building_info?: any;
  systems_detected?: any[];
  appreciation?: string | string[];
  betterments?: string[];
  steps?: any[];
  metrics?: any;
  profile?: any;
  versions?: typeof VERSIONS;
  aiVerification?: string;
  deterministicChecks?: string;
  ragRetrieval?: string;
  reason?: string;
  property_records?: any;
  auditMetadata?: {
    completedSteps: number;
    totalSteps: number;
    degraded: boolean;
    failedSteps: string[];
    aiExecuted?: boolean;
    providerUsed?: string;
    reasonForDegradation?: string;
    quotaState?: any;
    successfulLlmCalls?: number;
    failedLlmCalls?: number;
  };
}

export class CompliancePipeline {
  static async run(planId: string, filePath: string, fileType: string, selectedSteps?: string[]): Promise<ComplianceResult> {
    const pipelineLogger = logger.child({ auditId: planId });

    let userId: string | null = null;
    try {
      const [planRows]: any = await pool.query("SELECT userId FROM `plan` WHERE id = ?", [planId]);
      userId = planRows[0]?.userId || null;
    } catch (err) {
      pipelineLogger.warn('Failed to fetch plan owner for socket routing');
    }

    const emitStatus = (data: any) => {
      if (userId) {
        io.to(`user:${userId}`).emit('analysis-status', data);
      } else {
        io.emit('analysis-status', data);
      }
    };

    try {
      pipelineLogger.info('Starting NYC compliance pipeline');

      // Idempotency check: skip if already analyzed
      try {
        const [statusCheck]: any = await pool.query(
          "SELECT status FROM `plan` WHERE id = ?", [planId]
        );
        if (statusCheck.length > 0 && statusCheck[0].status === 'analyzed') {
          pipelineLogger.info('Plan already analyzed, returning cached result (idempotent)');
          const [cached]: any = await pool.query(
            "SELECT analysisResult FROM `plan` WHERE id = ?", [planId]
          );
          if (cached.length > 0 && cached[0].analysisResult) {
            return JSON.parse(cached[0].analysisResult);
          }
        }
      } catch (idempErr) {
        pipelineLogger.warn('Idempotency check failed, proceeding with analysis');
      }

      // STEP 1: Initialization progress
      emitStatus({
        planId,
        status: 'INITIALIZING',
        progress: 10,
        message: 'Initializing Vectorless RAG Agent across 114 NYC models...'
      });

      // STEP 2 & 3: Run parallel hybrid Gemini pipeline
      const absoluteFilePath = path.resolve(filePath);
      const pipelineRun = await SchedulerService.runPipeline(
        planId,
        absoluteFilePath,
        fileType,
        selectedSteps
      );

      const stepResults = pipelineRun.results;
      const pipelineMetrics = pipelineRun.metrics;

      // STEP 4: Progress update
      emitStatus({
        planId,
        status: 'GENERATING_REPORT',
        progress: 90,
        message: 'Compiling final forensic compliance report...'
      });

      // ─── Partial Report Recovery ───
      // If some steps failed but others succeeded, generate a partial/degraded report
      const checkedSteps: any[] = stepResults.filter((r: any) => r.checked);
      const failedSteps: any[] = stepResults.filter((r: any) => !r.checked && r.error);
      const isDegraded = failedSteps.length > 0 && checkedSteps.length > 0;

      if (isDegraded) {
        pipelineLogger.warn(`Partial report recovery: ${checkedSteps.length}/${stepResults.length} steps succeeded`, {
          deterministicRuleCount: checkedSteps.length,
          aiRuleCount: failedSteps.length
        });
        metrics.incrementCounter('nyc_audits_partial_total');
      }

      const tracking = pipelineRun.tracking || { successfulCalls: 0, failedCalls: 0, providersUsed: [], aiExecuted: false };
      const aiAnalysesExecuted = tracking.successfulCalls;

      let finalScore: number | null = checkedSteps.length > 0
        ? Math.round(checkedSteps.reduce((acc: number, r: any) => acc + r.score!, 0) / checkedSteps.length)
        : null;

      let severity = { critical: 0, major: 0, minor: 0 };

      const combinedIssues: AnalysisIssue[] = checkedSteps.flatMap((r: any) =>
        r.issues.map((iss: any) => ({
          title: iss.title || `${r.name} issue requiring review`,
          description: iss.description || iss.details || "No violation detail was returned by the analysis provider.",
          severity: String(iss.severity || 'minor').toLowerCase() as 'critical' | 'major' | 'minor',
          rule: iss.rule || iss.code || "Unspecified rule",
          suggestion: iss.suggestion || iss.recommendation || "Manual review required because remediation guidance was not returned.",
          stepId: r.id,
          deductionPercentage: typeof iss.deductionPercentage === 'number' 
            ? iss.deductionPercentage 
            : (typeof iss.deduction_percentage === 'number' ? iss.deduction_percentage : 0),
          exactPdfCitation: iss.exactPdfCitation || iss.exact_pdf_citation,
          loopholeDetails: iss.loopholeDetails || iss.loophole_details,
          requiredElements: iss.requiredElements || iss.required_elements
        }))
      );

      // Integrate property violations from Apify into combinedIssues and apply deductions to finalScore
      if (pipelineRun.propertyRecords && pipelineRun.propertyRecords.violations) {
        pipelineRun.propertyRecords.violations.forEach((v: any) => {
          if (v.status === 'open' && finalScore !== null) {
            const deduction = v.severity === 'critical' ? 15 : (v.severity === 'major' ? 10 : 5);
            finalScore = Math.max(0, finalScore - deduction);
            combinedIssues.push({
              title: `Property Violation: ${v.number}`,
              description: `NYC DOB Active Violation: ${v.description}`,
              severity: v.severity,
              rule: 'NYC DOB BIS Record',
              suggestion: 'Resolve the outstanding violation with the NYC Department of Buildings (DOB) and obtain clearance before proceeding.',
              stepId: 'property_violation',
              deductionPercentage: deduction,
              exactPdfCitation: 'NYC DOB Buildings Information System (BIS) Portal',
              loopholeDetails: 'Property has open violations which can block plan examiner approval or certificate of occupancy issuance.',
              requiredElements: 'DOB Violation Dismissal / Certificate of Correction'
            });
          }
        });
      }

      combinedIssues.forEach(issue => {
        if (issue.severity === 'critical') severity.critical++;
        else if (issue.severity === 'major') severity.major++;
        else severity.minor++;
      });

      const isManualReview = aiAnalysesExecuted === 0;
      const missingMeasuredChecks = finalScore === null;

      const mergedBuildingInfo: any = { rooms: [] };
      let hasBuildingInfo = false;
      checkedSteps.forEach((r: any) => {
        if (r.building_info) {
          hasBuildingInfo = true;
          if (r.building_info.project_name) mergedBuildingInfo.project_name = r.building_info.project_name;
          if (r.building_info.occupancy_group) mergedBuildingInfo.occupancy_group = r.building_info.occupancy_group;
          if (r.building_info.construction_type) mergedBuildingInfo.construction_type = r.building_info.construction_type;
          if (r.building_info.stories) mergedBuildingInfo.stories = r.building_info.stories;
          if (Array.isArray(r.building_info.rooms)) mergedBuildingInfo.rooms.push(...r.building_info.rooms);
        }
      });

      const finalResult: ComplianceResult = {
        compliant: isManualReview || missingMeasuredChecks ? null : (finalScore >= 70),
        score: isManualReview || missingMeasuredChecks ? null : finalScore,
        summary: isManualReview || missingMeasuredChecks
          ? 'Automated AI Verification Unavailable. Manual Review Required.' 
          : checkedSteps.map((r: any) => `### ${r.name} (Score: ${r.score}%)\n${r.summary}`).join('\n\n'),
        status: isManualReview || missingMeasuredChecks ? 'manual_review' : (isDegraded ? 'partial' : 'complete'),
        issuesCount: combinedIssues.length,
        severity: severity,
        issues: combinedIssues,
        building_info: hasBuildingInfo ? mergedBuildingInfo : undefined,
        systems_detected: checkedSteps.map((r: any) => `${r.name}: ${r.status.toUpperCase()}`),
        appreciation: checkedSteps.flatMap((r: any) => r.compliant_features || []).slice(0, 4),
        betterments: checkedSteps.flatMap((r: any) => r.betterments || r.recommendations || []),
        steps: stepResults,
        metrics: pipelineMetrics,
        profile: isManualReview ? null : pipelineRun.profile,
        versions: VERSIONS,
        aiVerification: isManualReview ? 'Unavailable' : 'Available',
        deterministicChecks: 'Completed',
        ragRetrieval: 'Completed',
        reason: isManualReview ? 'AI quota unavailable during audit.' : (missingMeasuredChecks ? 'No completed measured checks were available.' : undefined),
        property_records: pipelineRun.propertyRecords || null,
        auditMetadata: {
          completedSteps: checkedSteps.length,
          totalSteps: stepResults.length,
          degraded: isManualReview || isDegraded,
          failedSteps: failedSteps.map((r: any) => r.id || r.name),
          aiExecuted: tracking.aiExecuted,
          providerUsed: tracking.providersUsed.join(', ') || 'none',
          reasonForDegradation: isManualReview ? 'AI quota unavailable during audit.' : 'none',
          quotaState: AiProviderService.getStats(),
          successfulLlmCalls: tracking.successfulCalls,
          failedLlmCalls: tracking.failedCalls
        }
      };

      // STEP 5: DB Storage & Socket Completion (with retry)
      let saved = false;
      let saveAttempts = 0;
      while (!saved && saveAttempts < 3) {
        try {
          await pool.query(
            'UPDATE `plan` SET status = ?, analysisResult = ? WHERE id = ?',
            [isManualReview || missingMeasuredChecks ? 'manual_review' : (isDegraded ? 'partial' : 'analyzed'), JSON.stringify(finalResult), planId]
          );
          saved = true;
        } catch (saveErr) {
          saveAttempts++;
          pipelineLogger.error(`DB Save attempt ${saveAttempts} failed`, saveErr, { retryCount: saveAttempts });
          if (saveAttempts >= 3) throw saveErr;
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      emitStatus({
        planId,
        status: 'COMPLETE',
        progress: 100,
        report: finalResult
      });

      pipelineLogger.info(`Pipeline finished. Score: ${finalResult.score}`, {
        confidence: finalScore !== null ? finalScore / 100 : null,
        deterministicRuleCount: checkedSteps.length,
        aiRuleCount: failedSteps.length
      });

      metrics.incrementCounter('nyc_audits_total', { status: isDegraded ? 'partial' : 'success' });

      // CLEANUP: Remove file from disk after successful analysis
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        pipelineLogger.debug(`Cleaned up file: ${filePath}`);
      }

      return finalResult;

    } catch (error: any) {
      pipelineLogger.error('Fatal pipeline error', error);
      emitStatus({ planId, status: 'FAILED', error: error.message });

      // Update DB to failed
      try {
        await pool.query('UPDATE `plan` SET status = ? WHERE id = ?', ['failed', planId]);
      } catch (dbErr) {
        pipelineLogger.error('Failed to update DB on error', dbErr);
      }

      // CLEANUP: Remove file from disk after failed analysis
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { }
      }

      throw error;
    }
  }
}
