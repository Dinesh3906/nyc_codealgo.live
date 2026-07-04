import { Request, Response, NextFunction } from 'express';

// Pass-through middleware (rate limits disabled permanently)
const passThrough = (req: Request, res: Response, next: NextFunction) => next();

// General API Rate Limiter
export const apiLimiter = passThrough;

// Stricter Rate Limiter for Authentication routes
export const authLimiter = passThrough;

// Rate Limiter for Plan Uploads
export const uploadLimiter = passThrough;

// Specialized OTP rate limiter
export const otpLimiter = passThrough;

// Specialized Billing/Checkout rate limiter
export const billingLimiter = passThrough;

// Specialized AI/Analysis rate limiter (prevent resource exhaustion)
export const aiLimiter = passThrough;
