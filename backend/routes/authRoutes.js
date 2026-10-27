const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { loginSchema, registerDoctorSchema } = require('../validators/authValidators');
const validate = require('../middleware/validate');
const { loginLimiter } = require('../middleware/rateLimiter');
const { requireDoctorAuth, requireRole } = require('../middleware/authMiddleware');

// POST /api/v1/auth/login - Doctor login with rate limiting & generic error messages
router.post(
  '/login',
  loginLimiter,
  validate({ body: loginSchema }),
  authController.login
);

// POST /api/v1/auth/logout - Terminate session and clear secure cookies
router.post(
  '/logout',
  authController.logout
);

// GET /api/v1/auth/me - Verify session and retrieve authenticated doctor profile
router.get(
  '/me',
  requireDoctorAuth,
  authController.getCurrentDoctor
);

// POST /api/v1/auth/refresh - Rotate access token using valid refresh cookie
router.post(
  '/refresh',
  authController.refreshSession
);

// POST /api/v1/auth/register - Controlled registration of doctor accounts (admin only)
router.post(
  '/register',
  requireDoctorAuth,
  requireRole('admin'),
  validate({ body: registerDoctorSchema }),
  authController.register
);

module.exports = router;
