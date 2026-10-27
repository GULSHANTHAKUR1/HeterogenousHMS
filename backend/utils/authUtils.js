const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const SALT_ROUNDS = 12;

/**
 * Retrieve JWT secret from environment. Never embed secrets in source code.
 */
const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is missing.');
    }
    // Safe development-only fallback with warning
    return 'dev_fallback_secret_never_use_in_production_2026';
  }
  return secret;
};

const getRefreshSecret = () => {
  return process.env.JWT_REFRESH_SECRET || `${getJwtSecret()}_refresh`;
};

/**
 * Hash plaintext password using bcrypt with salt rounds 12.
 */
const hashPassword = async (plaintextPassword) => {
  return bcrypt.hash(plaintextPassword, SALT_ROUNDS);
};

/**
 * Compare candidate password with stored bcrypt hash.
 */
const comparePassword = async (candidatePassword, passwordHash) => {
  if (!candidatePassword || !passwordHash) return false;
  return bcrypt.compare(candidatePassword, passwordHash);
};

/**
 * Generate short-lived Access Token (15 minutes).
 */
const generateAccessToken = (doctor) => {
  const payload = {
    doctorId: doctor.doctorId,
    email: doctor.email,
    fullName: doctor.fullName,
    role: doctor.role || 'doctor',
    specialty: doctor.specialty,
  };

  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || '15m',
    issuer: 'heterogeneous-hms',
  });
};

/**
 * Generate longer-lived Refresh Token (7 days).
 */
const generateRefreshToken = (doctor) => {
  const payload = {
    doctorId: doctor.doctorId,
    tokenType: 'refresh',
  };

  return jwt.sign(payload, getRefreshSecret(), {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
    issuer: 'heterogeneous-hms',
  });
};

/**
 * Verify Access Token.
 */
const verifyAccessToken = (token) => {
  return jwt.verify(token, getJwtSecret(), {
    issuer: 'heterogeneous-hms',
  });
};

/**
 * Verify Refresh Token.
 */
const verifyRefreshToken = (token) => {
  return jwt.verify(token, getRefreshSecret(), {
    issuer: 'heterogeneous-hms',
  });
};

/**
 * Standard cookie configuration for HttpOnly session security.
 */
const getCookieOptions = (maxAgeMs) => {
  const isProduction = process.env.NODE_ENV === 'production';
  return {
    httpOnly: true, // Prevents client-side script access (XSS defense)
    secure: isProduction, // Transmitted only over HTTPS in production
    sameSite: isProduction ? 'strict' : 'lax', // CSRF defense
    maxAge: maxAgeMs,
    path: '/',
  };
};

module.exports = {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getCookieOptions,
};
