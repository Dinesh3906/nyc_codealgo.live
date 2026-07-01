/**
 * Security middleware for request tracing, abuse detection, and request ID generation.
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../services/logger';

const logger = new Logger({ stage: 'security' });

// ─── Request ID Generation ───

/**
 * Assigns a unique request ID to every incoming request.
 * Checks for X-Request-ID header (from load balancers) or generates a new one.
 */
export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  const incomingRequestId = req.headers['x-request-id'];
  const candidate = Array.isArray(incomingRequestId) ? incomingRequestId[0] : incomingRequestId;
  const requestId = candidate && /^[A-Za-z0-9._:-]{1,128}$/.test(candidate) ? candidate : uuidv4();
  (req as any).requestId = requestId;
  res.setHeader('X-Request-ID', requestId);
  next();
}

// ─── Abuse Detection ───

interface AbuseTracker {
  failedAudits: number;
  failedLogins: number;
  lastResetAt: number;
}

const abuseMap = new Map<string, AbuseTracker>();

const ABUSE_WINDOW_MS = parseInt(process.env.ABUSE_WINDOW_MS || '600000', 10); // 10 minutes
const MAX_FAILED_AUDITS = parseInt(process.env.MAX_FAILED_AUDITS || '5', 10);
const MAX_FAILED_LOGINS = parseInt(process.env.MAX_FAILED_LOGINS || '10', 10);

function getClientIP(req: Request): string {
  return req.ip || req.socket.remoteAddress || 'unknown';
}

function getTracker(ip: string): AbuseTracker {
  const now = Date.now();
  let tracker = abuseMap.get(ip);

  if (!tracker || now - tracker.lastResetAt > ABUSE_WINDOW_MS) {
    tracker = { failedAudits: 0, failedLogins: 0, lastResetAt: now };
    abuseMap.set(ip, tracker);
  }

  return tracker;
}

/**
 * Records a failed audit for abuse tracking.
 */
export function recordFailedAudit(req: Request) {
  const ip = getClientIP(req);
  const tracker = getTracker(ip);
  tracker.failedAudits++;

  if (tracker.failedAudits >= MAX_FAILED_AUDITS) {
    logger.warn(`Abuse detection: IP ${ip} exceeded failed audit threshold`, {
      stage: 'abuse-detection',
      errorCode: 'EXCESSIVE_FAILED_AUDITS'
    });
  }
}

/**
 * Records a failed login for abuse tracking.
 */
export function recordFailedLogin(req: Request) {
  const ip = getClientIP(req);
  const tracker = getTracker(ip);
  tracker.failedLogins++;

  if (tracker.failedLogins >= MAX_FAILED_LOGINS) {
    logger.warn(`Abuse detection: IP ${ip} exceeded failed login threshold`, {
      stage: 'abuse-detection',
      errorCode: 'EXCESSIVE_FAILED_LOGINS'
    });
  }
}

/**
 * Middleware that blocks requests from IPs that exceed abuse thresholds.
 */
export function abuseDetectionMiddleware(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIP(req);
  const tracker = abuseMap.get(ip);

  if (tracker) {
    if (tracker.failedAudits >= MAX_FAILED_AUDITS * 2) {
      logger.warn(`Abuse detection: Blocking request from IP ${ip}`, {
        stage: 'abuse-detection',
        errorCode: 'IP_BLOCKED'
      });
      return res.status(429).json({
        message: 'Too many failed requests. Please contact support.'
      });
    }
  }

  next();
}

// ─── Request Logging ───

/**
 * Structured request logging middleware (replaces console.log-based logging in app.ts).
 */
export function requestLoggingMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  const requestId = (req as any).requestId || 'unknown';

  res.on('finish', () => {
    const latencyMs = Date.now() - start;
    const logData = {
      requestId,
      latencyMs,
      stage: 'http'
    };

    if (res.statusCode >= 500) {
      logger.error(`${req.method} ${req.url} ${res.statusCode}`, undefined, logData);
    } else if (res.statusCode >= 400) {
      logger.warn(`${req.method} ${req.url} ${res.statusCode}`, logData);
    } else {
      logger.info(`${req.method} ${req.url} ${res.statusCode}`, logData);
    }
  });

  next();
}

// ─── Periodic cleanup to prevent memory leak ───

setInterval(() => {
  const now = Date.now();
  for (const [ip, tracker] of abuseMap) {
    if (now - tracker.lastResetAt > ABUSE_WINDOW_MS * 2) {
      abuseMap.delete(ip);
    }
  }
}, ABUSE_WINDOW_MS);
