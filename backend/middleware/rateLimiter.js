const rateLimit = require('express-rate-limit');

/**
 * Standard rate limiter for all general API routes.
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' ? 1000 : 120, // High ceiling in test environment
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Requests',
    message: 'Too many requests from this IP address. Please try again after 15 minutes.',
  },
});

/**
 * Strict rate limiter for sensitive patient search, OTP challenge, and auth endpoints.
 */
const sensitiveOpLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: process.env.NODE_ENV === 'test' ? 1000 : 15, // High ceiling in test environment unless explicitly testing rate limits
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Rate Limit Exceeded',
    message: 'Excessive patient lookup or verification attempts. Please wait 1 minute before retrying.',
  },
});

/**
 * Strict rate limiter for doctor authentication / login attempts to prevent brute force attacks.
 */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'test' && process.env.TEST_STRICT_RATE_LIMIT === 'true' ? 3 : 5, // 5 attempts per window (or 3 in strict test mode)
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too Many Login Attempts',
    message: 'Too many login attempts from this IP address. Please try again after 15 minutes.',
  },
});

module.exports = {
  apiLimiter,
  sensitiveOpLimiter,
  loginLimiter,
};

