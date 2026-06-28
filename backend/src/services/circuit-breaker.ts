/**
 * Circuit Breaker pattern implementation for external API calls (Gemini, Pinecone).
 * Prevents cascading failures by short-circuiting requests when an external service is down.
 *
 * States:
 *   CLOSED   → Normal operation, requests pass through
 *   OPEN     → Service is down, requests fail immediately without calling the service
 *   HALF_OPEN → Recovery probe: allow one request through to test if service recovered
 */

import { Logger } from './logger';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerOptions {
  /** Name for logging and metrics */
  name: string;
  /** Number of consecutive failures before opening the circuit (default: 5) */
  failureThreshold?: number;
  /** Time in ms to wait before transitioning from OPEN → HALF_OPEN (default: 30000) */
  recoveryTimeoutMs?: number;
  /** Number of successful requests in HALF_OPEN before closing (default: 2) */
  halfOpenSuccessThreshold?: number;
  /** Optional callback on state transitions */
  onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private readonly name: string;
  private readonly failureThreshold: number;
  private readonly recoveryTimeoutMs: number;
  private readonly halfOpenSuccessThreshold: number;
  private readonly onStateChange?: (from: CircuitState, to: CircuitState, name: string) => void;
  private readonly logger: Logger;

  constructor(options: CircuitBreakerOptions) {
    this.name = options.name;
    this.failureThreshold = options.failureThreshold ?? 5;
    this.recoveryTimeoutMs = options.recoveryTimeoutMs ?? 30000;
    this.halfOpenSuccessThreshold = options.halfOpenSuccessThreshold ?? 2;
    this.onStateChange = options.onStateChange;
    this.logger = new Logger({ stage: 'circuit-breaker', circuitBreakerState: this.state });
  }

  /**
   * Returns current circuit state.
   */
  getState(): CircuitState {
    this.checkRecovery();
    return this.state;
  }

  /**
   * Returns circuit breaker stats for monitoring.
   */
  getStats() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null
    };
  }

  /**
   * Transitions to a new state with logging.
   */
  private transitionTo(newState: CircuitState) {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;

    this.logger.info(`Circuit breaker [${this.name}] state transition`, {
      circuitBreakerState: newState,
      stage: 'circuit-breaker'
    });

    this.onStateChange?.(oldState, newState, this.name);
  }

  /**
   * Checks if the recovery timeout has elapsed while OPEN, and transitions to HALF_OPEN.
   */
  private checkRecovery() {
    if (this.state === 'OPEN' && Date.now() - this.lastFailureTime >= this.recoveryTimeoutMs) {
      this.transitionTo('HALF_OPEN');
      this.successCount = 0;
    }
  }

  /**
   * Records a successful operation.
   */
  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.failureCount = 0;
        this.successCount = 0;
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  /**
   * Records a failed operation.
   */
  private onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.state === 'HALF_OPEN') {
      this.transitionTo('OPEN');
    } else if (this.failureCount >= this.failureThreshold) {
      this.transitionTo('OPEN');
    }
  }

  /**
   * Executes a function through the circuit breaker.
   * If the circuit is OPEN, immediately throws without calling the function.
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    this.checkRecovery();

    if (this.state === 'OPEN') {
      const err = new Error(`Circuit breaker [${this.name}] is OPEN — request rejected`);
      (err as any).code = 'CIRCUIT_OPEN';
      this.logger.warn(`Circuit breaker [${this.name}] rejected request`, {
        circuitBreakerState: 'OPEN'
      });
      throw err;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Manually resets the circuit breaker to CLOSED state.
   */
  reset() {
    this.failureCount = 0;
    this.successCount = 0;
    this.transitionTo('CLOSED');
  }
}

// ─── Pre-configured instances for the pipeline's external services ───

export const geminiCircuitBreaker = new CircuitBreaker({
  name: 'gemini-api',
  failureThreshold: parseInt(process.env.CB_GEMINI_FAILURE_THRESHOLD || '5', 10),
  recoveryTimeoutMs: parseInt(process.env.CB_GEMINI_RECOVERY_MS || '30000', 10),
  halfOpenSuccessThreshold: 2
});

export const pineconeCircuitBreaker = new CircuitBreaker({
  name: 'pinecone-api',
  failureThreshold: parseInt(process.env.CB_PINECONE_FAILURE_THRESHOLD || '5', 10),
  recoveryTimeoutMs: parseInt(process.env.CB_PINECONE_RECOVERY_MS || '20000', 10),
  halfOpenSuccessThreshold: 2
});
