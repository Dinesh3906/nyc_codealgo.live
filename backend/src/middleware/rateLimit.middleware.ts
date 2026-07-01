import rateLimit from 'express-rate-limit';

// General API Rate Limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Stricter Rate Limiter for Authentication routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
});

// Rate Limiter for Plan Uploads
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 25, // Limit each IP to 25 plan uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Upload limit exceeded. Please try again in an hour to protect compliance computing resources.',
  },
});

// Specialized OTP rate limiter
export const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // Limit to 5 OTP requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many verification code requests. Please try again after 15 minutes.',
  },
});

// Specialized Billing/Checkout rate limiter
export const billingLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit to 10 billing requests per 15 minutes per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many billing requests. Please try again after 15 minutes.',
  },
});

// Specialized AI/Analysis rate limiter (prevent resource exhaustion)
export const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20, // Limit to 20 AI executions per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many compliance scans requested. Please try again in an hour.',
  },
});
