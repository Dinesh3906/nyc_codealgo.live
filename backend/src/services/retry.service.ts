/**
 * Generic retry wrapper with exponential backoff and jitter.
 * Replaces all ad-hoc retry loops across the codebase with a single, configurable utility.
 */

import { Logger } from './logger';

export interface RetryOptions {
  /** Maximum number of retry attempts (default: 3) */
  maxRetries?: number;
  /** Base delay in ms before first retry (default: 1000) */
  baseDelayMs?: number;
  /** Maximum delay cap in ms (default: 30000) */
  maxDelayMs?: number;
  /** Multiplier for exponential growth (default: 2) */
  backoffMultiplier?: number;
  /** Whether to add jitter to prevent thundering herd (default: true) */
  jitter?: boolean;
  /** Function to determine if an error is retryable (default: all errors) */
  isRetryable?: (error: any) => boolean;
  /** Label for logging */
  operationName?: string;
  /** Logger instance for context-aware logging */
  logger?: Logger;
}

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'logger'>> = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitter: true,
  isRetryable: () => true,
  operationName: 'operation'
};

/**
 * Common retryable error detector for HTTP/API errors.
 * Retries on: 429 (rate limit), 500, 502, 503, 504, ECONNRESET, ETIMEDOUT, network errors.
 */
export function isTransientError(error: any): boolean {
  if (!error) return false;

  const message = (error.message || '').toLowerCase();
  const status = error.status || error.statusCode || error.httpCode || 0;

  // Rate limiting
  if (status === 429) return true;
  // Server errors
  if (status >= 500 && status <= 599) return true;
  // Network errors
  if (message.includes('econnreset') || message.includes('etimedout') || message.includes('econnrefused')) return true;
  if (message.includes('socket hang up') || message.includes('network')) return true;
  // Gemini-specific
  if (message.includes('resource_exhausted') || message.includes('unavailable') || message.includes('deadline_exceeded')) return true;
  // Generic fetch/timeout
  if (message.includes('fetch failed') || message.includes('aborted') || message.includes('timeout')) return true;

  return false;
}

/**
 * Executes a function with automatic retries on failure.
 *
 * @example
 * const result = await withRetry(
 *   () => callGeminiAPI(prompt),
 *   { maxRetries: 5, operationName: 'gemini-pro-audit', isRetryable: isTransientError }
 * );
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const log = opts.logger || new Logger({ stage: 'retry' });

  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      if (attempt >= opts.maxRetries) {
        log.error(`${opts.operationName} failed after ${attempt + 1} attempts`, error, {
          retryCount: attempt,
          stage: opts.operationName
        });
        throw error;
      }

      if (!opts.isRetryable(error)) {
        log.warn(`${opts.operationName} failed with non-retryable error`, {
          retryCount: attempt,
          stage: opts.operationName,
          errorCode: error.code || error.status || 'UNKNOWN'
        });
        throw error;
      }

      // Calculate delay with exponential backoff
      let delay = opts.baseDelayMs * Math.pow(opts.backoffMultiplier, attempt);
      delay = Math.min(delay, opts.maxDelayMs);

      // Add jitter (±25%)
      if (opts.jitter) {
        const jitterRange = delay * 0.25;
        delay = delay + (Math.random() * jitterRange * 2 - jitterRange);
      }

      log.warn(`${opts.operationName} attempt ${attempt + 1} failed, retrying in ${Math.round(delay)}ms`, {
        retryCount: attempt + 1,
        stage: opts.operationName,
        latencyMs: Math.round(delay),
        errorCode: error.code || error.status || 'UNKNOWN'
      });

      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
