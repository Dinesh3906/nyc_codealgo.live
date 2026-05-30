import rateLimit from 'express-rate-limit';

// General API Rate Limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 150, // Limit each IP to 150 requests per windowMs
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes.',
  },
});

// Stricter Rate Limiter for Authentication and OTP routes
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 authentication/OTP attempts per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many login or verification attempts. Please try again after 15 minutes to secure your account.',
  },
});

// Rate Limiter for Plan Uploads (Gemini usage protection)
export const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 25, // Limit each IP to 25 plan uploads per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Upload limit exceeded. Please try again in an hour to protect compliance computing resources.',
  },
});
