const { verifyAccessToken } = require('../utils/authUtils');
const Doctor = require('../models/Doctor');
const mongoose = require('mongoose');

/**
 * Authentication middleware that verifies JWT access token from HttpOnly cookie or Authorization header.
 * Performs account active status check and attaches doctor profile to req.doctor.
 */
const requireDoctorAuth = async (req, res, next) => {
  try {
    let token = null;

    // Check cookie first (preferred for browser sessions)
    if (req.cookies && req.cookies.hms_doctor_token) {
      token = req.cookies.hms_doctor_token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      // Fallback for API clients / testing
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication token missing. Please log in to continue.',
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          error: 'SessionExpired',
          message: 'Your session has expired. Please log in again.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        error: 'InvalidToken',
        message: 'Invalid or forged authentication session.',
      });
    }

    // Check account status if database is connected
    let doctor = null;
    if (mongoose.connection.readyState === 1) {
      doctor = await Doctor.findOne({ doctorId: decoded.doctorId });
      if (!doctor) {
        return res.status(401).json({
          success: false,
          error: 'Unauthorized',
          message: 'Doctor account no longer exists.',
        });
      }

      if (!doctor.isActive) {
        return res.status(403).json({
          success: false,
          error: 'AccountDeactivated',
          message: 'This doctor account is deactivated. Please contact the system administrator.',
        });
      }

      req.doctor = {
        doctorId: doctor.doctorId,
        email: doctor.email,
        fullName: doctor.fullName,
        role: doctor.role || 'doctor',
        specialty: doctor.specialty,
        department: doctor.department,
        isActive: doctor.isActive,
      };
    } else {
      // Development/fallback mode or unit testing without DB connection
      req.doctor = {
        doctorId: decoded.doctorId,
        email: decoded.email,
        fullName: decoded.fullName,
        role: decoded.role || 'doctor',
        specialty: decoded.specialty,
        department: decoded.department || 'Cardiology',
        isActive: true,
      };
    }

    next();
  } catch (error) {
    console.error('[AuthMiddleware] Error:', error.message);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to authenticate request.',
    });
  }
};

/**
 * Role-based authorization middleware (e.g. requireRole('admin')).
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.doctor || req.doctor.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'You do not have the required permissions to perform this action.',
      });
    }
    next();
  };
};

module.exports = {
  requireDoctorAuth,
  requireRole,
};
