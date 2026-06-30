/**
 * Central version registry for knowledge versioning.
 * Every audit result is stamped with these versions to enable exact historical reproduction.
 * Update these values when prompts, rules, models, or indexes change.
 */

export const VERSIONS = {
  /** Prompt template version — bump when system prompts or audit instructions change */
  PROMPT_VERSION: process.env.PROMPT_VERSION || '2.1.0',

  /** Deterministic rule engine version — bump when rules are added/modified */
  RULE_ENGINE_VERSION: process.env.RULE_ENGINE_VERSION || '2.0.0',

  /** NYC Code edition year */
  NYC_CODE_EDITION: process.env.NYC_CODE_EDITION || '2022',

  /** Gemini model identifier */
  GEMINI_MODEL_VERSION: process.env.GEMINI_PRO_MODEL || 'gemini-2.5-pro',

  /** Pinecone index name/version */
  PINECONE_INDEX_VERSION: process.env.PINECONE_INDEX || 'permitiq',

  /** Embedding model used for RAG vectorization */
  EMBEDDING_MODEL_VERSION: process.env.EMBEDDING_MODEL || 'text-embedding-004',

  /** Vision extraction JSON schema version — bump when ExtractedFacts shape changes */
  VISION_SCHEMA_VERSION: process.env.VISION_SCHEMA_VERSION || '1.0.0',

  /** Application version */
  APP_VERSION: process.env.APP_VERSION || '1.0.0'
} as const;
