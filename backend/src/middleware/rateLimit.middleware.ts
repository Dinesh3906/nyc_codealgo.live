import { Request, Response, NextFunction } from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';

const windowMs = (name: string, fallback: number) => parseInt(process.env[`${name}_WINDOW_MS`] || String(fallback), 10);
const maxRequests = (name: string, fallback: number) => parseInt(process.env[`${name}_MAX`] || String(fallback), 10);

const keyGenerator = (req: Request) => {
  const userId = (req as any).user?.id || (req as any).userId;
  const ip = req.ip || req.socket.remoteAddress || '0.0.0.0';
  return userId ? `user:${userId}` : ipKeyGenerator(ip);
};

const standardHandler = (req: Request, res: Response) => {
  res.status(429).json({
    message: 'Too many requests. Please retry later.',
    requestId: (req as any).requestId,
  });
};

const createLimiter = (name: string, fallbackWindowMs: number, fallbackMax: number) => rateLimit({
  windowMs: windowMs(name, fallbackWindowMs),
  max: maxRequests(name, fallbackMax),
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator,
  handler: standardHandler,
});

// General API Rate Limiter
export const apiLimiter = createLimiter('API_RATE_LIMIT', 15 * 60 * 1000, 600);

// Stricter Rate Limiter for Authentication routes
export const authLimiter = createLimiter('AUTH_RATE_LIMIT', 15 * 60 * 1000, 20);

// Rate Limiter for Plan Uploads
export const uploadLimiter = createLimiter('UPLOAD_RATE_LIMIT', 60 * 60 * 1000, 30);

// Specialized OTP rate limiter
export const otpLimiter = createLimiter('OTP_RATE_LIMIT', 10 * 60 * 1000, 5);

// Specialized Billing/Checkout rate limiter
export const billingLimiter = createLimiter('BILLING_RATE_LIMIT', 15 * 60 * 1000, 60);

// Specialized AI/Analysis rate limiter (prevent resource exhaustion)
export const aiLimiter = createLimiter('AI_RATE_LIMIT', 60 * 60 * 1000, 100);
