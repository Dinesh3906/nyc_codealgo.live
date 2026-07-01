import * as fs from 'fs';
import * as path from 'path';
import { Logger } from './logger';

const logger = new Logger({ stage: 'evidence-logger' });

export interface AuditEvidence {
  auditId: string;
  timestamp: string;
  uploadedPlan: string;
  retrievedChunks: Array<{
    id: string;
    score: number;
    mmrScore?: number;
    metadata: any;
    query?: string;
    status?: 'selected' | 'duplicate_removed' | 'mmr_removed';
  }>;
  ocrOutput?: string;
  extractedParameters: any;
  deterministicRules: any[];
  judgeDecisions: any[];
  challengerDecisions: any[];
  citationsBeforeValidation: any[];
  citationsAfterValidation: any[];
  repairedCitations: any[];
  confidenceCalculations: any;
  tokenUsage: any;
  latencyMs: number;
  memoryUsageBytes: number;
  cpuUsagePercentage: number;
  discipline: string;
}

export class EvidenceLogger {
  private static evidenceDir = path.resolve(__dirname, '../../scratch/evidence');

  static logAudit(evidence: Partial<AuditEvidence>) {
    try {
      if (!fs.existsSync(this.evidenceDir)) {
        fs.mkdirSync(this.evidenceDir, { recursive: true });
      }

      const planId = String(evidence.auditId || 'unknown').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
      const filepath = path.join(this.evidenceDir, `audit_${planId}.json`);
      
      let existing: any[] = [];
      if (fs.existsSync(filepath)) {
        try {
          existing = JSON.parse(fs.readFileSync(filepath, 'utf8'));
        } catch (e) {
          existing = [];
        }
      }

      existing.push({
        ...evidence,
        timestamp: new Date().toISOString()
      });

      fs.writeFileSync(filepath, JSON.stringify(existing, null, 2), 'utf8');
    } catch (err) {
      logger.error('Failed to log evidence', err);
    }
  }
}
