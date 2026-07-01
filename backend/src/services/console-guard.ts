import { Logger, LogLevel } from './logger';

const SENSITIVE_VALUE_PATTERN = /([A-Za-z0-9_\-.]{20,}\.[A-Za-z0-9_\-.]{20,}\.[A-Za-z0-9_\-.]{20,})|((?:sk|pk|rk|rzp|AIza|pcsk|ghp|gho|xox)[A-Za-z0-9_\-]{12,})/gi;
const EMAIL_PATTERN = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const CACHE_RESOURCE_PATTERN = /projects\/[^/\s]+\/(?:locations\/[^/\s]+\/)?cachedContents\/[^/\s]+/gi;
const LONG_TEXT_LIMIT = 1000;

let installed = false;

const stringifyArg = (arg: unknown): string => {
  if (arg instanceof Error) {
    return `${arg.name}: ${arg.message}`;
  }
  if (typeof arg === 'string') {
    return arg;
  }
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
};

const redactLogText = (value: string): string => {
  const redacted = value
    .replace(SENSITIVE_VALUE_PATTERN, '[REDACTED]')
    .replace(EMAIL_PATTERN, '[REDACTED_EMAIL]')
    .replace(CACHE_RESOURCE_PATTERN, '[REDACTED_CACHE_RESOURCE]');

  if (redacted.length <= LONG_TEXT_LIMIT) {
    return redacted;
  }

  return `${redacted.slice(0, LONG_TEXT_LIMIT)}...[TRUNCATED]`;
};

const emitConsoleLog = (logger: Logger, level: LogLevel, args: unknown[]) => {
  const message = redactLogText(args.map(stringifyArg).join(' '));
  switch (level) {
    case 'ERROR':
      logger.error(message);
      break;
    case 'WARN':
      logger.warn(message);
      break;
    case 'INFO':
      logger.info(message);
      break;
    default:
      logger.debug(message);
      break;
  }
};

export const installConsoleGuard = () => {
  if (installed || process.env.NODE_ENV === 'test') {
    return;
  }

  installed = true;
  const logger = new Logger({ stage: 'console-guard' });

  console.log = (...args: unknown[]) => emitConsoleLog(logger, 'INFO', args);
  console.info = (...args: unknown[]) => emitConsoleLog(logger, 'INFO', args);
  console.warn = (...args: unknown[]) => emitConsoleLog(logger, 'WARN', args);
  console.error = (...args: unknown[]) => emitConsoleLog(logger, 'ERROR', args);
};
