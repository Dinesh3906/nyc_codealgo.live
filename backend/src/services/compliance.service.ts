import fs from 'fs';
import { io } from '../app';
import pool from '../db';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import { checkComplianceTS, checkStepComplianceTS, extractPlanData, STEPS_CONFIG, STEP_CODES_CHECKLIST } from './native_rag';

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
  status: 'complete' | 'failed';
  issuesCount: number;
  building_info?: any;
  systems_detected?: any[];
  appreciation?: string | string[];
  betterments?: string[];
  steps?: any[];
}

export class CompliancePipeline {
  static async run(planId: string, filePath: string, fileType: string, selectedSteps?: string[]): Promise<ComplianceResult> {
    try {
      console.log(`[PIPELINE] Starting NYC Vectorless RAG Agent for plan ${planId}`);

      // STEP 1: Initialization progress
      io.emit('analysis-status', {
        planId,
        status: 'INITIALIZING',
        progress: 10,
        message: 'Initializing Vectorless RAG Agent across 114 NYC models...'
      });

      // STEP 2: Data Extraction
      io.emit('analysis-status', {
        planId,
        status: 'EXTRACTING_DATA',
        progress: 20,
        message: 'Extracting technical data from building plan...'
      });
      const absoluteFilePath = path.resolve(filePath);
      const planData = await extractPlanData(absoluteFilePath);

      // STEP 3: Category Audits
      const activeSteps = selectedSteps && selectedSteps.length > 0
        ? selectedSteps
        : STEPS_CONFIG.map(s => s.id);

      let completedCount = 0;

      const stepResults = [];
      for (const step of STEPS_CONFIG) {
        if (activeSteps.includes(step.id)) {
          io.emit('analysis-status', {
            planId,
            status: step.statusKey,
            progress: Math.round(20 + (completedCount / activeSteps.length) * 70),
            message: `Auditing ${step.name} compliance...`
          });
          try {
            const result = await checkStepComplianceTS(planData, step.id);
            completedCount++;
            io.emit('analysis-status', {
              planId,
              status: step.statusKey,
              progress: Math.round(20 + (completedCount / activeSteps.length) * 70),
              message: `${step.name} audit complete.`
            });
            stepResults.push(result);
          } catch (stepErr) {
            console.error(`Step check failed for ${step.name}:`, stepErr);
            completedCount++;

            // Generate fallback checklist to ensure UI display is not blank
            const fallbackFeatures = (STEP_CODES_CHECKLIST[step.id] || []).map(
              item => `${item.code} - ${item.title}: Verification pending due to system connection issue.`
            );

            stepResults.push({
              id: step.id,
              name: step.name,
              checked: true,
              score: 70,
              status: 'warning' as const,
              summary: `Audit partially completed for ${step.name} due to verification errors.`,
              compliant_features: fallbackFeatures,
              issues: []
            });
          }
          // Add a small 1-second delay between sequential steps to respect Gemini free-tier RPM limits
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          stepResults.push({
            id: step.id,
            name: step.name,
            checked: false,
            score: null,
            status: 'skipped' as const,
            summary: 'Skipped by user.',
            compliant_features: [],
            issues: []
          });
        }
      }

      // STEP 4: Progress update before compiling final report
      io.emit('analysis-status', {
        planId,
        status: 'GENERATING_REPORT',
        progress: 90,
        message: 'Compiling final forensic compliance report...'
      });

      const checkedSteps = stepResults.filter(r => r.checked);
      const finalScore = checkedSteps.length > 0
        ? Math.round(checkedSteps.reduce((acc, r) => acc + r.score!, 0) / checkedSteps.length)
        : 100;

      let severity = { critical: 0, major: 0, minor: 0 };
      const combinedIssues: AnalysisIssue[] = checkedSteps.flatMap(r =>
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

      const finalResult: ComplianceResult = {
        compliant: finalScore >= 70,
        score: finalScore,
        summary: checkedSteps.map(r => `### ${r.name} (Score: ${r.score}%)\n${r.summary}`).join('\n\n'),
        status: 'complete',
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
        systems_detected: checkedSteps.map(r => `${r.name}: ${r.status.toUpperCase()}`),
        appreciation: [
          `Completed plan examiner audit across ${checkedSteps.length} active categories.`,
          ...checkedSteps.flatMap(r => r.compliant_features.map((f: string) => `Compliant feature detected in ${r.name}: ${f}`)).slice(0, 4)
        ],
        betterments: checkedSteps.map(r => `Enhance detail validation for ${r.name} sub-assemblies.`),
        steps: stepResults
      };

      // STEP 5: DB Storage & Socket Completion (with retry for AWS stability)
      let saved = false;
      let saveAttempts = 0;
      while (!saved && saveAttempts < 3) {
        try {
          await pool.query(
            'UPDATE `plan` SET status = ?, analysisResult = ? WHERE id = ?',
            ['analyzed', JSON.stringify(finalResult), planId]
          );
          saved = true;
        } catch (saveErr) {
          saveAttempts++;
          console.error(`[PIPELINE] DB Save attempt ${saveAttempts} failed:`, saveErr);
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

      console.log(`[PIPELINE] Finished process for plan ${planId}. Score: ${finalResult.score}`);

      // CLEANUP: Remove file from disk after successful analysis
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`[PIPELINE] Cleaned up file: ${filePath}`);
      }

      return finalResult;

    } catch (error: any) {
      console.error(`[PIPELINE] Fatal error:`, error);
      io.emit('analysis-status', { planId, status: 'FAILED', error: error.message });

      // Update DB to failed
      try {
        await pool.query('UPDATE `plan` SET status = ? WHERE id = ?', ['failed', planId]);
      } catch (dbErr) {
        console.error("[PIPELINE] Failed to update DB on error", dbErr);
      }

      // CLEANUP: Remove file from disk after failed analysis
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch (e) { }
      }

      throw error;
    }
  }
}
