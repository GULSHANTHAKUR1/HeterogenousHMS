const express = require('express');
const router = express.Router();
const {
  searchPatient,
  initiateOtp,
  verifyOtp,
  getPatientHistory,
  revokeAccess,
} = require('../controllers/patientController');
const reportController = require('../controllers/reportController');
const prescriptionController = require('../controllers/prescriptionController');
const {
  patientSearchSchema,
  patientIdParamSchema,
  otpVerifySchema,
  grantRevokeSchema,
} = require('../validators/patientValidators');
const {
  addPrescriptionSchema,
  reportIdParamSchema,
} = require('../validators/clinicalValidators');
const validate = require('../middleware/validate');
const { sensitiveOpLimiter } = require('../middleware/rateLimiter');
const { requireDoctorAuth } = require('../middleware/authMiddleware');
const { requirePatientAccessGrant } = require('../middleware/grantMiddleware');
const { uploadDocumentMiddleware } = require('../middleware/uploadMiddleware');

// GET /api/v1/patients/search?pid=PID-2026-1234
// Returns basic non-clinical identifiers and masked contact method. No medical history!
router.get(
  '/search',
  sensitiveOpLimiter,
  validate({ query: patientSearchSchema }),
  requireDoctorAuth,
  searchPatient
);

// POST /api/v1/patients/:patientId/challenge-otp
// Dispatches cryptographically generated OTP challenge to patient's registered mobile
router.post(
  '/:patientId/challenge-otp',
  requireDoctorAuth,
  sensitiveOpLimiter,
  validate({ params: patientIdParamSchema }),
  initiateOtp
);

// POST /api/v1/patients/:patientId/verify-otp
// Verifies OTP, checks expiry, single-use, max attempts, and returns short-lived PatientAccessGrant
router.post(
  '/:patientId/verify-otp',
  requireDoctorAuth,
  sensitiveOpLimiter,
  validate({ params: patientIdParamSchema, body: otpVerifySchema }),
  verifyOtp
);

// GET /api/v1/patients/:patientId/history
// Accesses full clinical records, chronic conditions, and allergies.
// Strictly requires BOTH active doctor session AND verified patient consent grant!
router.get(
  '/:patientId/history',
  requireDoctorAuth,
  validate({ params: patientIdParamSchema }),
  requirePatientAccessGrant,
  getPatientHistory
);

// POST /api/v1/patients/:patientId/revoke-access
// Explicitly terminates an active clinical session access grant
router.post(
  '/:patientId/revoke-access',
  requireDoctorAuth,
  validate({ params: patientIdParamSchema, body: grantRevokeSchema }),
  revokeAccess
);

// ==========================================
// MEDICAL REPORTS ENDPOINTS (CONSENT GUARDED)
// ==========================================

// GET /api/v1/patients/:patientId/reports
// Lists diagnostic reports for authorized patient
router.get(
  '/:patientId/reports',
  requireDoctorAuth,
  validate({ params: patientIdParamSchema }),
  requirePatientAccessGrant,
  reportController.getReports
);

// POST /api/v1/patients/:patientId/reports/upload
// Securely uploads PDF/PNG/JPEG medical document to private storage
router.post(
  '/:patientId/reports/upload',
  requireDoctorAuth,
  validate({ params: patientIdParamSchema }),
  requirePatientAccessGrant,
  uploadDocumentMiddleware('document'),
  reportController.uploadReport
);

// GET /api/v1/patients/:patientId/reports/:reportId
// Retrieves structured report details, extracted parameters, and NLP findings
router.get(
  '/:patientId/reports/:reportId',
  requireDoctorAuth,
  validate({ params: reportIdParamSchema }),
  requirePatientAccessGrant,
  reportController.getReportById
);

// PATCH /api/v1/patients/:patientId/reports/:reportId/review
// Confirms and updates reviewed report parameters following clinician evaluation
router.patch(
  '/:patientId/reports/:reportId/review',
  requireDoctorAuth,
  validate({ params: reportIdParamSchema }),
  requirePatientAccessGrant,
  reportController.updateReportReview
);


// GET /api/v1/patients/:patientId/reports/:reportId/document
// Securely streams original document bytes without public URL access
router.get(
  '/:patientId/reports/:reportId/document',
  requireDoctorAuth,
  validate({ params: reportIdParamSchema }),
  requirePatientAccessGrant,
  reportController.downloadDocument
);

// ===============================================
// PRESCRIPTIONS ENDPOINTS (CONSENT GUARDED)
// ===============================================

// GET /api/v1/patients/:patientId/prescriptions
// Lists active and historical prescriptions for authorized patient
router.get(
  '/:patientId/prescriptions',
  requireDoctorAuth,
  validate({ params: patientIdParamSchema }),
  requirePatientAccessGrant,
  prescriptionController.getPrescriptions
);

// POST /api/v1/patients/:patientId/prescriptions
// Creates a new prescription, strictly capturing clinician entered medications
router.post(
  '/:patientId/prescriptions',
  requireDoctorAuth,
  validate({ params: patientIdParamSchema, body: addPrescriptionSchema }),
  requirePatientAccessGrant,
  prescriptionController.addPrescription
);

module.exports = router;
