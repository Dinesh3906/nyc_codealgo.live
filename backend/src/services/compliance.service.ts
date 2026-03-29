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

      // STEP 2: Building full path to script
      const scriptPath = path.join(__dirname, '../../scripts/langchain_query.py');
      const absoluteFilePath = path.resolve(filePath);
      
      // STEP 3: Progress update before heavy lifting
      io.emit('analysis-status', { 
        planId, 
        status: 'AI_ANALYZING', 
        progress: 30,
        message: 'Agent is performing multi-document cross-verification (parallel processing)...'
      });

      // Add a mid-analysis progress update to keep the bar moving
      const progressTimer = setInterval(() => {
         io.emit('analysis-status', { 
           planId, 
           status: 'CHECKING_COMPLIANCE', 
           progress: Math.min(85, Math.floor(Math.random() * 20) + 40),
           message: 'Scanning chapters (Gas, Building, Plumbing)...'
         });
      }, 8000);

// STEP 4: Execute Full TS RAG Loop
      const agentResponse = await checkComplianceTS(absoluteFilePath);

      clearInterval(progressTimer);

      // STEP 5: Progress update before compiling final report
      io.emit('analysis-status', { planId, status: 'GENERATING_REPORT', progress: 90 });

      // STEP 6: Format result for Brickly UI
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
        issues: issues
      };

      // STEP 7-8: DB Storage & Socket Completion
      await pool.query(
        'UPDATE `plan` SET status = ?, analysisResult = ? WHERE id = ?',
        ['analyzed', JSON.stringify(finalResult), planId]
      );

      io.emit('analysis-status', { 
        planId, 
        status: 'COMPLETE', 
        progress: 100, 
        report: finalResult 
      });

      console.log(`[PIPELINE] Finished process for plan ${planId}. Score: ${finalResult.score}`);
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
      
      throw error;
    }
  }
}
