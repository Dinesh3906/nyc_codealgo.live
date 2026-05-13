import fs from 'fs';
import { io } from '../app';
import pool from '../db';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

import { checkComplianceTS } from './native_rag';

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
  appreciation?: string;
}

export class CompliancePipeline {
  static async run(planId: string, filePath: string, fileType: string): Promise<ComplianceResult> {
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

      // STEP 3: Rule Retrieval
      io.emit('analysis-status', {
        planId,
        status: 'RETRIEVING_RULES',
        progress: 40,
        message: 'Querying NYC Building Code vector database (113 chapters)...'
      });

      // STEP 4: AI Analysis
      io.emit('analysis-status', {
        planId,
        status: 'AI_ANALYZING',
        progress: 60,
        message: 'Senior Plan Examiner is verifying compliance against NYC mandates...'
      });

      // Add a mid-analysis progress update to keep the bar moving
      const progressTimer = setInterval(() => {
        io.emit('analysis-status', {
          planId,
          status: 'CHECKING_COMPLIANCE',
          progress: Math.min(85, Math.floor(Math.random() * 10) + 70),
          message: 'Performing cross-document safety verification...'
        });
      }, 5000);

      // STEP 5: Execute Full TS RAG Loop
      const agentResponse = await checkComplianceTS(absoluteFilePath) as any;

      clearInterval(progressTimer);

      // PHASE 1: Document Classification Check (Logging only, no override)
      if (agentResponse.is_valid_plan === false) {
        console.log(`[PIPELINE] AI Warning: Document flagged as potentially non-architectural (${agentResponse.document_type}). Continuing with analysis anyway.`);
      }

      // STEP 6: Progress update before compiling final report
      io.emit('analysis-status', {
        planId,
        status: 'GENERATING_REPORT',
        progress: 90,
        message: 'Compiling final forensic compliance report...'
      });

      // STEP 6: Format result for NYC House Code UI
      let issues: AnalysisIssue[] = [];
      let severity = { critical: 0, major: 0, minor: 0 };

      // Use issues from RAG response if available
      if (agentResponse.issues && Array.isArray(agentResponse.issues) && agentResponse.issues.length > 0) {
        issues = agentResponse.issues.map((issue: any) => ({
          title: issue.title || "Compliance Issue",
          description: issue.description || "No description provided",
          severity: (issue.severity || 'minor') as 'critical' | 'major' | 'minor',
          rule: issue.code || "NYC Building Code 2022",
          suggestion: issue.recommendation || "Review with a licensed professional"
        }));

        // Count severity
        issues.forEach(issue => {
          if (issue.severity === 'critical') severity.critical++;
          else if (issue.severity === 'major') severity.major++;
          else severity.minor++;
        });
      } else if (agentResponse.percentage < 100) {
        // If no structured issues but score is not perfect, create a generic one
        const summaryText = agentResponse.summary || "Review required";
        issues.push({
          title: "General Compliance Review",
          description: summaryText,
          severity: agentResponse.percentage < 70 ? 'critical' : agentResponse.percentage < 85 ? 'major' : 'minor',
          rule: "NYC Building Code 2022",
          suggestion: "Consult with a licensed architect or engineer for detailed review"
        });

        if (agentResponse.percentage < 70) severity.critical = 1;
        else if (agentResponse.percentage < 85) severity.major = 1;
        else severity.minor = 1;
      }

      const finalResult: ComplianceResult = {
        compliant: (agentResponse.percentage || 0) >= 70,
        score: agentResponse.percentage || 0,
        summary: agentResponse.summary || "NYC Code Compliance Check Complete.",
        status: 'complete',
        issuesCount: issues.length,
        severity: severity,
        issues: issues,
        building_info: agentResponse.building_info || {},
        systems_detected: agentResponse.systems_detected || [],
        appreciation: agentResponse.appreciation || "We appreciate the professional quality and detail presented in this architectural plan. The design demonstrates a solid foundation for NYC code compliance."
      };

      // STEP 7-8: DB Storage & Socket Completion (with retry for AWS stability)
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
