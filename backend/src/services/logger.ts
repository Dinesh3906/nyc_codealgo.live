/**
 * Structured JSON Logger for production observability.
 * Replaces all console.log/warn/error with structured, parseable JSON output.
 * Compatible with CloudWatch, Datadog, ELK, Loki, and any JSON log ingestion system.
 */

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface LogContext {
  traceId?: string;
  auditId?: string;
  requestId?: string;
  userId?: string;
  stage?: string;
  stepId?: string;
  latencyMs?: number;
  tokenUsage?: { input?: number; output?: number; cached?: number };
  retryCount?: number;
  confidence?: number;
  deterministicRuleCount?: number;
  aiRuleCount?: number;
  circuitBreakerState?: string;
  errorCode?: string;
  [key: string]: any;
}

interface LogEntry {
  timestamp: string;
  severity: LogLevel;
  message: string;
  service: string;
  environment: string;
  version: string;
  traceId?: string;
  auditId?: string;
  requestId?: string;
  userId?: string;
  stage?: string;
  stepId?: string;
  latencyMs?: number;
  tokenUsage?: { input?: number; output?: number; cached?: number };
  retryCount?: number;
  confidence?: number;
  deterministicRuleCount?: number;
  aiRuleCount?: number;
  circuitBreakerState?: string;
  errorCode?: string;
  error?: { message: string; stack?: string; name: string };
  [key: string]: any;
}

const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  DEBUG: 0,
  INFO: 1,
  WARN: 2,
  ERROR: 3,
  FATAL: 4
};

export class Logger {
  private static serviceName = 'nyc-compliance-engine';
  private static environment = process.env.NODE_ENV || 'development';
  private static version = process.env.APP_VERSION || '1.0.0';
  private static minLevel: LogLevel = (process.env.LOG_LEVEL as LogLevel) || 'INFO';

  private context: LogContext;

  /**
   * Creates a child logger with pre-bound context fields.
   * Useful for scoping all logs within a single audit or request.
   */
  constructor(context: LogContext = {}) {
    this.context = context;
  }

  /**
   * Creates a child logger inheriting parent context with additional fields.
   */
  child(additionalContext: LogContext): Logger {
    return new Logger({ ...this.context, ...additionalContext });
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[Logger.minLevel];
  }

  private formatEntry(level: LogLevel, message: string, extra?: LogContext & { error?: Error }): LogEntry {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      severity: level,
      message,
      service: Logger.serviceName,
      environment: Logger.environment,
      version: Logger.version,
      ...this.context,
      ...extra,
    };

    // Convert Error objects to serializable format
    if (extra?.error) {
      entry.error = {
        message: extra.error.message,
        stack: extra.error.stack,
        name: extra.error.name
      };
      delete (entry as any).error_raw;
    }

    return entry;
  }

  private emit(level: LogLevel, message: string, extra?: LogContext & { error?: Error }) {
    if (!this.shouldLog(level)) return;

    const entry = this.formatEntry(level, message, extra);
    const json = JSON.stringify(entry);

    switch (level) {
      case 'ERROR':
      case 'FATAL':
        process.stderr.write(json + '\n');
        break;
      default:
        process.stdout.write(json + '\n');
    }
  }

  debug(message: string, extra?: LogContext) { this.emit('DEBUG', message, extra); }
  info(message: string, extra?: LogContext) { this.emit('INFO', message, extra); }
  warn(message: string, extra?: LogContext) { this.emit('WARN', message, extra); }
  error(message: string, error?: Error | any, extra?: LogContext) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.emit('ERROR', message, { ...extra, error: err });
  }
  fatal(message: string, error?: Error | any, extra?: LogContext) {
    const err = error instanceof Error ? error : new Error(String(error));
    this.emit('FATAL', message, { ...extra, error: err });
  }

  /**
   * Logs a stage timing measurement.
   */
  timing(stage: string, latencyMs: number, extra?: LogContext) {
    this.info(`Stage completed: ${stage}`, { stage, latencyMs: Math.round(latencyMs), ...extra });
  }

  // ─── Static convenience methods (use when no audit context is needed) ───

  static debug(message: string, extra?: LogContext) { new Logger().debug(message, extra); }
  static info(message: string, extra?: LogContext) { new Logger().info(message, extra); }
  static warn(message: string, extra?: LogContext) { new Logger().warn(message, extra); }
  static error(message: string, error?: Error | any, extra?: LogContext) { new Logger().error(message, error, extra); }
  static fatal(message: string, error?: Error | any, extra?: LogContext) { new Logger().fatal(message, error, extra); }

  /**
   * Creates a logger scoped to an audit.
   */
  static forAudit(auditId: string, traceId?: string, userId?: string): Logger {
    return new Logger({ auditId, traceId, userId });
  }

  /**
   * Creates a logger scoped to a request.
   */
  static forRequest(requestId: string): Logger {
    return new Logger({ requestId });
  }
}
