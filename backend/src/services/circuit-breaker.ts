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

export interface BreakerEvent {
  type: 'breaker_opened' | 'breaker_closed' | 'half_open_entered' | 'probe_success' | 'probe_failure' | 'quota_exceeded' | 'timeout' | 'retry';
  timestamp: number;
  metadata?: any;
}

export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureCount = 0;
  private successCount = 0;
  private lastFailureTime = 0;
  private activeProbesCount = 0;
  private readonly halfOpenProbeLimit = 1;
  private recoveryTimer: NodeJS.Timeout | null = null;
  private eventsHistory: BreakerEvent[] = [];

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

  getState(): CircuitState {
    this.checkRecovery();
    return this.state;
  }

  getEventsHistory(): BreakerEvent[] {
    return this.eventsHistory;
  }

  getStats() {
    return {
      name: this.name,
      state: this.getState(),
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      eventsCount: this.eventsHistory.length,
      recoveryETA: this.state === 'OPEN'
        ? new Date(this.lastFailureTime + this.recoveryTimeoutMs).toISOString()
        : null
    };
  }

  reset() {
    this.failureCount = 0;
    this.successCount = 0;
    this.activeProbesCount = 0;
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
      this.recoveryTimer = null;
    }
    this.transitionTo('CLOSED');
  }

  private transitionTo(newState: CircuitState, trigger?: string) {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;

    this.logger.info(`Circuit breaker [${this.name}] transition ${oldState} -> ${newState}`, {
      circuitBreakerState: newState,
      trigger
    });

    if (newState === 'OPEN') {
      this.recordEvent('breaker_opened', { trigger, lastFailure: this.lastFailureTime });
      this.setupBackgroundRecovery();
    } else if (newState === 'CLOSED') {
      this.recordEvent('breaker_closed');
    } else if (newState === 'HALF_OPEN') {
      this.recordEvent('half_open_entered');
    }

    this.onStateChange?.(oldState, newState, this.name);
  }

  private setupBackgroundRecovery() {
    if (this.recoveryTimer) {
      clearTimeout(this.recoveryTimer);
    }
    this.recoveryTimer = setTimeout(() => {
      this.transitionTo('HALF_OPEN', 'BACKGROUND_TIMER');
    }, this.recoveryTimeoutMs);
    
    // Allow process exit without waiting for timers
    if (this.recoveryTimer.unref) {
      this.recoveryTimer.unref();
    }
  }

  private recordEvent(type: BreakerEvent['type'], metadata?: any) {
    this.eventsHistory.push({
      type,
      timestamp: Date.now(),
      metadata
    });
    if (this.eventsHistory.length > 50) {
      this.eventsHistory.shift();
    }
  }

  private checkRecovery() {
    if (this.state === 'OPEN' && Date.now() - this.lastFailureTime >= this.recoveryTimeoutMs) {
      this.transitionTo('HALF_OPEN', 'LAZY_CHECK');
      this.successCount = 0;
      this.activeProbesCount = 0;
    }
  }

  private determineFailureCause(err: any): string {
    if (!err) return 'UNKNOWN';
    const msg = (err.message || '').toLowerCase();
    const status = err.status || '';
    const code = err.code || '';

    if (msg.includes('quota') || msg.includes('limit') || status === 'RESOURCE_EXHAUSTED' || msg.includes('exhausted')) {
      return 'QUOTA_EXHAUSTION';
    }
    if (msg.includes('api key') || msg.includes('key not valid') || msg.includes('invalid api key')) {
      return 'INVALID_API_KEY';
    }
    if (err.name === 'AbortError' || msg.includes('timeout') || msg.includes('deadline')) {
      return 'TIMEOUT';
    }
    if (code === 'ENOTFOUND' || code === 'EAI_AGAIN' || msg.includes('network') || msg.includes('dns')) {
      return 'NETWORK_OR_DNS_FAILURE';
    }
    if (msg.includes('cache') || msg.includes('redis') || msg.includes('s3')) {
      return 'CACHE_FAILURE';
    }
    if (msg.includes('429')) {
      return 'HTTP_429';
    }
    if (msg.includes('500') || msg.includes('503')) {
      return 'HTTP_500_503';
    }
    return 'GENERIC_FAILURE';
  }

  private onSuccess() {
    if (this.state === 'HALF_OPEN') {
      this.activeProbesCount = Math.max(0, this.activeProbesCount - 1);
      this.successCount++;
      this.recordEvent('probe_success', { successCount: this.successCount });
      if (this.successCount >= this.halfOpenSuccessThreshold) {
        this.failureCount = 0;
        this.successCount = 0;
        this.transitionTo('CLOSED');
      }
    } else if (this.state === 'CLOSED') {
      this.failureCount = 0;
    }
  }

  private onFailure(err: any) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    const cause = this.determineFailureCause(err);

    if (cause === 'QUOTA_EXHAUSTION' || cause === 'HTTP_429') {
      this.recordEvent('quota_exceeded', { error: err?.message });
    } else if (cause === 'TIMEOUT') {
      this.recordEvent('timeout', { error: err?.message });
    }

    if (this.state === 'HALF_OPEN') {
      this.activeProbesCount = Math.max(0, this.activeProbesCount - 1);
      this.recordEvent('probe_failure', { error: err?.message, cause });
      this.transitionTo('OPEN', `PROBE_FAILURE_${cause}`);
    } else if (this.failureCount >= this.failureThreshold) {
      this.transitionTo('OPEN', cause);
    }
  }

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

    if (this.state === 'HALF_OPEN') {
      if (this.activeProbesCount >= this.halfOpenProbeLimit) {
        const err = new Error(`Circuit breaker [${this.name}] is HALF_OPEN (probe in progress) — request rejected`);
        (err as any).code = 'CIRCUIT_OPEN';
        throw err;
      }
      this.activeProbesCount++;
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }
}

// ─── Registry of per-discipline breakers (Task 4) ───

export const breakersRegistry: Record<string, CircuitBreaker> = {};

const disciplinesList = [
  'building',
  'plumbing',
  'mechanical',
  'electrical',
  'fuel_gas',
  'energy',
  'cross_discipline',
  'gemini-api',
  'pinecone-api'
];

for (const disc of disciplinesList) {
  breakersRegistry[disc] = new CircuitBreaker({
    name: `${disc}-api`,
    failureThreshold: 3, // consecutive failures to open the circuit
    recoveryTimeoutMs: 15000, // wait 15 seconds to try recovery
    halfOpenSuccessThreshold: 1 // 1 success in HALF_OPEN resets to CLOSED
  });
}

// Global fallback references for backwards compatibility
export const geminiCircuitBreaker = breakersRegistry['gemini-api'];
export const pineconeCircuitBreaker = breakersRegistry['pinecone-api'];

/**
 * Returns the corresponding circuit breaker for a given discipline.
 */
export function getDisciplineBreaker(disciplineName: string): CircuitBreaker {
  const normalized = disciplineName.toLowerCase().replace(/_code$/, '').replace(/_resolution$/, '');
  return breakersRegistry[normalized] || breakersRegistry['gemini-api'];
}
