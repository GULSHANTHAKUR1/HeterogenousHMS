const { validatePatientGrant } = require('../services/otpService');

/**
 * Access Grant Middleware.
 * Enforces patient consent by verifying an active, non-expired, non-revoked
 * PatientAccessGrant scoped to BOTH the authenticated doctor and target patient.
 */
const requirePatientAccessGrant = async (req, res, next) => {
  try {
    // 1. Doctor identity check
    if (!req.doctor || !req.doctor.doctorId) {
      return res.status(401).json({
        success: false,
        error: 'Unauthorized',
        message: 'Doctor authentication required before verifying patient access grant.',
      });
    }

    // 2. Target patient ID resolution
    const patientId = req.params.patientId || req.params.pid || req.query.pid || req.body?.patientId;
    if (!patientId) {
      return res.status(400).json({
        success: false,
        error: 'BadRequest',
        message: 'Target Patient ID is required to verify clinical access grant.',
      });
    }

    // 3. Extract grant token
    const grantToken =
      req.headers['x-patient-grant-token'] ||
      req.cookies?.hms_patient_grant ||
      req.query?.grantToken;

    if (!grantToken) {
      return res.status(403).json({
        success: false,
        error: 'AccessDenied',
        code: 'GRANT_REQUIRED',
        message:
          'Patient consent authorization grant required. Please verify patient OTP to access medical records.',
      });
    }

    // 4. Validate grant scope and active status
    const result = await validatePatientGrant({
      grantToken,
      patientId,
      doctorId: req.doctor.doctorId,
    });

    if (!result.valid) {
      let userMessage = 'Access to this patient medical record is not authorized.';
      if (result.reason === 'GRANT_EXPIRED') {
        userMessage = 'Patient consent access grant has expired. Please request a new OTP to continue.';
      } else if (result.reason === 'GRANT_REVOKED') {
        userMessage = 'Patient consent access grant has been revoked.';
      } else if (result.reason === 'GRANT_PATIENT_MISMATCH') {
        userMessage = 'This access grant is bound to a different patient and cannot be used here.';
      } else if (result.reason === 'GRANT_DOCTOR_MISMATCH') {
        userMessage = 'This access grant belongs to another physician and cannot be transferred.';
      }

      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        code: result.reason,
        message: userMessage,
      });
    }

    // 5. Attach verified grant to request
    req.patientGrant = result.grant;
    next();
  } catch (err) {
    console.error('[requirePatientAccessGrant] Error:', err.message);
    return res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: 'Failed to verify patient access grant.',
    });
  }
};

module.exports = {
  requirePatientAccessGrant,
};
