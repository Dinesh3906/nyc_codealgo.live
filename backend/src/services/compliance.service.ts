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
  compliant: boolean;
  score: number;
  severity: ScoreBreakdown;
  issues: AnalysisIssue[];
  summary: string;
  status: 'complete' | 'failed' | 'partial';
  issuesCount: number;
  building_info?: any;
  systems_detected?: any[];
  appreciation?: string | string[];
  betterments?: string[];
  steps?: any[];
  metrics?: any;
  profile?: any;
  versions?: typeof VERSIONS;
  auditMetadata?: {
    completedSteps: number;
    totalSteps: number;
    degraded: boolean;
    failedSteps: string[];
  };
}

export class CompliancePipeline {
  static async run(planId: string, filePath: string, fileType: string, selectedSteps?: string[]): Promise<ComplianceResult> {
    const pipelineLogger = logger.child({ auditId: planId });

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
      io.emit('analysis-status', {
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
      io.emit('analysis-status', {
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
        : 100;

      let severity = { critical: 0, major: 0, minor: 0 };
      const combinedIssues: AnalysisIssue[] = checkedSteps.flatMap((r: any) =>
        r.issues.map((iss: any) => ({
          title: iss.title || `${r.name} Compliance Issue`,
          description: iss.description || "Violation detail not provided",
          severity: (iss.severity || 'minor') as 'critical' | 'major' | 'minor',
          rule: iss.rule || "NYC Building Code 2022",
          suggestion: iss.suggestion || "Review with a licensed professional",
          stepId: r.id,
          deductionPercentage: iss.deductionPercentage,
          exactPdfCitation: iss.exactPdfCitation,
          loopholeDetails: iss.loopholeDetails,
          requiredElements: iss.requiredElements
        }))
      );

      combinedIssues.forEach(issue => {
        if (issue.severity === 'critical') severity.critical++;
        else if (issue.severity === 'major') severity.major++;
        else severity.minor++;
      });

      const isManualReview = aiAnalysesExecuted === 0;

      const finalResult: ComplianceResult = {
        compliant: isManualReview ? null : (finalScore >= 70),
        score: isManualReview ? null : finalScore,
        summary: isManualReview 
          ? 'Automated AI Verification Unavailable. Manual Review Required.' 
          : checkedSteps.map((r: any) => `### ${r.name} (Score: ${r.score}%)\n${r.summary}`).join('\n\n'),
        status: isManualReview ? 'manual_review' : (isDegraded ? 'partial' : 'complete'),
        issuesCount: combinedIssues.length,
        severity: severity,
        issues: combinedIssues,
        building_info: (() => {
          const merged: any = { type: "Mixed Use / Residential", rooms: [] };
          checkedSteps.forEach((r: any) => {
            if (r.building_info) {
              if (r.building_info.project_name) merged.project_name = r.building_info.project_name;
              if (r.building_info.occupancy_group) merged.occupancy_group = r.building_info.occupancy_group;
              if (r.building_info.construction_type) merged.construction_type = r.building_info.construction_type;
              if (r.building_info.stories) {
                merged.stories = r.building_info.stories;
                merged.type = `${r.building_info.occupancy_group || 'Mixed Use'} / ${r.building_info.construction_type || 'Unknown'}`;
              }
            }
          });
          return merged;
        })(),
        systems_detected: checkedSteps.map((r: any) => `${r.name}: ${r.status.toUpperCase()}`),
        appreciation: isManualReview ? [
          'Automated AI Verification: Unavailable',
          'Deterministic Analysis: Completed',
          'Manual Review: Recommended'
        ] : [
          `Completed plan examiner audit across ${checkedSteps.length} active categories.`,
          ...checkedSteps.flatMap((r: any) => r.compliant_features.map((f: string) => `Compliant feature detected in ${r.name}: ${f}`)).slice(0, 4)
        ],
        betterments: checkedSteps.map((r: any) => `Enhance detail validation for ${r.name} sub-assemblies.`),
        steps: stepResults,
        metrics: pipelineMetrics,
        profile: isManualReview ? null : pipelineRun.profile,
        versions: VERSIONS,
        aiVerification: isManualReview ? 'Unavailable' : 'Available',
        deterministicChecks: 'Completed',
        ragRetrieval: 'Completed',
        reason: isManualReview ? 'AI quota unavailable during audit.' : undefined,
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
            [isManualReview ? 'manual_review' : (isDegraded ? 'partial' : 'analyzed'), JSON.stringify(finalResult), planId]
          );
          saved = true;
        } catch (saveErr) {
          saveAttempts++;
          pipelineLogger.error(`DB Save attempt ${saveAttempts} failed`, saveErr, { retryCount: saveAttempts });
          if (saveAttempts >= 3) throw saveErr;
          await new Promise(r => setTimeout(r, 1000));
        }
      }

      io.emit('analysis-status', {
        planId,
        status: 'COMPLETE',
        progress: 100,
        report: finalResult
      });

      pipelineLogger.info(`Pipeline finished. Score: ${finalResult.score}`, {
        confidence: finalScore / 100,
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
      io.emit('analysis-status', { planId, status: 'FAILED', error: error.message });

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
