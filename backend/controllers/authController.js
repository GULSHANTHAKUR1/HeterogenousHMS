const { authenticateDoctor, registerDoctor, refreshDoctorToken } = require('../services/authService');
const { getCookieOptions } = require('../utils/authUtils');
const { AuditLog } = require('../models');

const ACCESS_TOKEN_MAX_AGE = 15 * 60 * 1000; // 15 minutes
const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Doctor login endpoint.
 * Validates credentials, sets HttpOnly cookies, and returns authenticated profile.
 */
const login = async (req, res, next) => {
  try {
    const { emailOrId, password } = req.body;
    const clientMeta = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const { accessToken, refreshToken, doctor } = await authenticateDoctor(
      emailOrId,
      password,
      clientMeta
    );

    // Set secure HttpOnly cookies
    res.cookie('hms_doctor_token', accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));
    res.cookie('hms_refresh_token', refreshToken, getCookieOptions(REFRESH_TOKEN_MAX_AGE));

    return res.status(200).json({
      success: true,
      message: 'Authentication successful',
      data: {
        doctor,
        accessToken,
      },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.code || 'AuthenticationError',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Doctor logout endpoint.
 * Clears session cookies and logs audit trail.
 */
const logout = async (req, res, next) => {
  try {
    const doctorContext = req.doctor || null;

    if (doctorContext) {
      AuditLog.create({
        action: 'DOCTOR_LOGOUT',
        performedBy: { doctorId: doctorContext.doctorId, email: doctorContext.email },
        patientId: 'N/A',
        details: { ip: req.ip },
      }).catch(() => {});
    }

    res.clearCookie('hms_doctor_token', getCookieOptions(0));
    res.clearCookie('hms_refresh_token', getCookieOptions(0));

    return res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Return current authenticated doctor session profile.
 */
const getCurrentDoctor = async (req, res) => {
  return res.status(200).json({
    success: true,
    data: {
      doctor: req.doctor,
    },
  });
};

/**
 * Refresh expired access token using valid refresh cookie or body token.
 */
const refreshSession = async (req, res, next) => {
  try {
    const token = req.cookies?.hms_refresh_token || req.body?.refreshToken;
    const { accessToken, doctor } = await refreshDoctorToken(token);

    res.cookie('hms_doctor_token', accessToken, getCookieOptions(ACCESS_TOKEN_MAX_AGE));

    return res.status(200).json({
      success: true,
      message: 'Session refreshed successfully',
      data: {
        accessToken,
        doctor,
      },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.code || 'Unauthorized',
        message: error.message,
      });
    }
    next(error);
  }
};

/**
 * Controlled doctor registration (administrator only).
 */
const register = async (req, res, next) => {
  try {
    const createdDoctor = await registerDoctor(req.body);

    return res.status(201).json({
      success: true,
      message: 'Doctor account created successfully',
      data: {
        doctor: createdDoctor,
      },
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: 'RegistrationError',
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  login,
  logout,
  getCurrentDoctor,
  refreshSession,
  register,
};
