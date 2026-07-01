import { Request, Response, NextFunction } from 'express';
import { Logger } from '../services/logger';

const logger = new Logger({ stage: 'csrf-middleware' });

const allowedOrigins = [
  'https://permitiq.codealgo.live',
  'https://www.permitiq.codealgo.live',
  'http://localhost:3000',
  'http://127.0.0.1:3000'
];

export const csrfProtection = (req: Request, res: Response, next: NextFunction) => {
  const method = req.method;

  // Bypass Razorpay Webhook
  if (req.path === '/api/billing/webhook' || req.originalUrl === '/api/billing/webhook') {
    return next();
  }

  // Bypassed methods (read-only)
  if (['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    return next();
  }

  // 1. Origin / Referer validation for state-changing operations
  const origin = req.headers.origin as string || req.headers.referer as string;
  if (origin) {
    try {
      const parsedUrl = new URL(origin);
      const host = `${parsedUrl.protocol}//${parsedUrl.host}`;
      
      const isAllowed = allowedOrigins.includes(host) || 
                       /^https:\/\/(?:[a-zA-Z0-9-]+\.)*codealgo\.live$/.test(host) ||
                       /^https:\/\/(?:[a-zA-Z0-9-]+\.)*vercel\.app$/.test(host);
                       
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
  if (req.cookies?.access_token) {
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
