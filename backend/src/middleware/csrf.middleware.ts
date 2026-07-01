import { Request, Response, NextFunction } from 'express';
import { Logger } from '../services/logger';

const logger = new Logger({ stage: 'csrf-middleware' });
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const allowedOrigins = new Set<string>([
  'https://permitiq.codealgo.live',
  'https://www.permitiq.codealgo.live',
]);

const addAllowedOrigins = (value: string | undefined) => {
  if (!value) return;
  for (const rawOrigin of value.split(',')) {
    const trimmed = rawOrigin.trim();
    if (!trimmed) continue;
    try {
      const parsed = new URL(trimmed);
      if (parsed.protocol === 'https:' || (!IS_PRODUCTION && parsed.protocol === 'http:')) {
        allowedOrigins.add(parsed.origin);
      }
    } catch {
      logger.warn('Ignoring malformed CSRF origin configuration');
    }
  }
};

addAllowedOrigins(process.env.CORS_ORIGIN);
addAllowedOrigins(process.env.FRONTEND_URL);
addAllowedOrigins(process.env.CORS_ALLOWED_ORIGINS);
if (!IS_PRODUCTION) {
  allowedOrigins.add('http://localhost:3000');
  allowedOrigins.add('http://127.0.0.1:3000');
}

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const method = req.method;

  // Bypass third-party server-to-server webhook and auth routes
  if (
    req.originalUrl === '/api/billing/webhook' || 
    req.path.startsWith('/api/auth') || 
    req.originalUrl.startsWith('/api/auth')
  ) {
    return next();
  }

  // Bypassed methods (read-only)
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // 1. Origin / Referer validation for state-changing operations
  const origin = req.headers.origin as string || req.headers.referer as string;
  if (!origin && IS_PRODUCTION && !req.headers.authorization) {
    logger.warn('CSRF origin validation failed: missing origin');
    return res.status(403).json({ message: 'CSRF validation failed: Origin required.' });
  }

  if (origin) {
    try {
      const parsedUrl = new URL(origin);
      const host = `${parsedUrl.protocol}//${parsedUrl.host}`;
      
      const isAllowed = allowedOrigins.has(host);
                       
      if (!isAllowed) {
        logger.warn('CSRF origin validation failed', { host });
        return res.status(403).json({ message: 'CSRF validation failed: Origin not allowed.' });
      }
    } catch (err: any) {
      logger.error('Failed to parse origin/referer URL', err);
      return res.status(400).json({ message: 'Malformed Origin or Referer header.' });
    }
  }

  // 2. Double Submit Cookie validation (if user has active session)
  if (req.cookies?.access_token || req.cookies?.refresh_token || req.cookies?.admin_session) {
    const csrfHeader = req.headers['x-csrf-token'] as string;
    const csrfCookie = req.cookies?.csrf_token as string;

    if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
      logger.warn('CSRF token validation failed', {
        hasHeader: !!csrfHeader,
        hasCookie: !!csrfCookie,
        match: csrfHeader === csrfCookie
      });
      return res.status(403).json({ message: 'CSRF validation failed: Token mismatch.' });
    }
  }

  next();
};
