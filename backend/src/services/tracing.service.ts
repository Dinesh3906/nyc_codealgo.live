/**
 * Distributed tracing context for audit pipeline observability.
 * Every audit request carries a unique AuditContext through the entire pipeline,
 * enabling end-to-end tracing, correlation, and reproducibility.
 */

import { v4 as uuidv4 } from 'uuid';
import { VERSIONS } from '../config/versions';

export interface AuditContext {
  /** Unique identifier for this audit run */
  auditId: string;
  /** Distributed trace ID (propagated across services) */
  traceId: string;
  /** Correlation ID (groups related audits, e.g., re-runs of the same plan) */
  correlationId: string;
  /** HTTP request ID */
  requestId: string;
  /** Authenticated user ID */
  userId?: string;
  /** Project/plan ID */
  projectId: string;
  /** Timestamp when audit was initiated */
  startedAt: string;

  // ─── Version stamps for reproducibility ───
  promptVersion: string;
  ruleEngineVersion: string;
  nycCodeEdition: string;
  geminiModelVersion: string;
  pineconeIndexVersion: string;
  embeddingModelVersion: string;
  visionSchemaVersion: string;
}

/**
 * Creates a new AuditContext for a pipeline run.
 */
export function createAuditContext(
  projectId: string,
  requestId?: string,
  userId?: string,
  correlationId?: string
): AuditContext {
  return {
    auditId: uuidv4(),
    traceId: uuidv4(),
    correlationId: correlationId || projectId,
    requestId: requestId || uuidv4(),
    userId,
    projectId,
    startedAt: new Date().toISOString(),

    // Stamp current versions
    promptVersion: VERSIONS.PROMPT_VERSION,
    ruleEngineVersion: VERSIONS.RULE_ENGINE_VERSION,
    nycCodeEdition: VERSIONS.NYC_CODE_EDITION,
    geminiModelVersion: VERSIONS.GEMINI_MODEL_VERSION,
    pineconeIndexVersion: VERSIONS.PINECONE_INDEX_VERSION,
    embeddingModelVersion: VERSIONS.EMBEDDING_MODEL_VERSION,
    visionSchemaVersion: VERSIONS.VISION_SCHEMA_VERSION
  };
}

/**
 * Extracts a minimal set of context fields for log entries.
 */
export function traceFields(ctx: AuditContext) {
  return {
    auditId: ctx.auditId,
    traceId: ctx.traceId,
    requestId: ctx.requestId,
    userId: ctx.userId
  };
}
