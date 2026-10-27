const { patientService, otpService } = require('../services');

/**
 * Handle Patient Search by PID.
 * Strictly reveals NO medical history and NO full contact details.
 */
const searchPatient = async (req, res, next) => {
  try {
    const { pid } = req.query;

    const doctorContext = {
      doctorId: req.doctor ? req.doctor.doctorId : (req.headers['x-doctor-id'] || 'DOC-DEMO'),
      doctorEmail: req.doctor ? req.doctor.email : (req.headers['x-doctor-email'] || 'doctor@hospital.com'),
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    };

    const patient = await patientService.findPatientByPID(pid, doctorContext);

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient Not Found',
        message: `No hospital patient record matches identifier "${pid}".`,
      });
    }

    // STRICT PRIVACY SPECIFICATION:
    // NO chronic conditions, NO allergies, NO medical history returned before consent!
    return res.status(200).json({
      success: true,
      message: 'Patient record located. OTP verification required for clinical access.',
      requiresOtpVerification: true,
      data: {
        patientId: patient.patientId,
        firstName: patient.firstName,
        lastName: patient.lastName,
        fullName: patient.fullName || `${patient.firstName} ${patient.lastName}`,
        age: patient.age,
        gender: patient.gender,
        contactNumberMasked: patient.contactNumberMasked,
        ...(patient.isDemoRecord && { isDemoRecord: true }),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Initiate an authorization challenge (send OTP) for patient consent.
 */
const initiateOtp = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const clientMeta = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const result = await otpService.initiateOtpChallenge({
      patientId,
      doctor: req.doctor,
      clientMeta,
    });

    return res.status(200).json({
      success: true,
      message: `Verification code dispatched to patient's registered mobile number (${result.phoneMasked}).`,
      data: result,
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.code || 'ChallengeError',
        message: error.message,
        cooldownRemainingSeconds: error.cooldownRemainingSeconds,
      });
    }
    next(error);
  }
};

/**
 * Verify patient OTP and issue a doctor+patient scoped access grant.
 */
const verifyOtp = async (req, res, next) => {
  try {
    const { patientId } = req.params;
    const { otp } = req.body;
    const clientMeta = {
      ip: req.ip,
      userAgent: req.get('user-agent'),
    };

    const result = await otpService.verifyOtpAndGrantAccess({
      patientId,
      doctorId: req.doctor.doctorId,
      otp,
      clientMeta,
    });

    // Optionally set session cookie for patient grant
    res.cookie('hms_patient_grant', result.grant.grantToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
      maxAge: 30 * 60 * 1000,
      path: `/api/v1/patients/${encodeURIComponent(patientId)}`,
    });

    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: error.code || 'VerificationError',
        message: error.message,
        remainingAttempts: error.remainingAttempts,
      });
    }
    next(error);
  }
};

/**
 * Retrieve complete clinical history for an authorized patient.
 * Guarded by requireDoctorAuth AND requirePatientAccessGrant.
 */
const getPatientHistory = async (req, res, next) => {
  try {
    const { patientId } = req.params;

    const doctorContext = {
      doctorId: req.doctor.doctorId,
      email: req.doctor.email,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    };

    const patient = await patientService.getAuthorizedPatientHistory(
      patientId,
      doctorContext,
      req.patientGrant
    );

    if (!patient) {
      return res.status(404).json({
        success: false,
        error: 'Patient Not Found',
        message: `No clinical records found for identifier "${patientId}".`,
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Authorized clinical records retrieved successfully.',
      grant: {
        grantId: req.patientGrant.grantId,
        expiresAt: req.patientGrant.expiresAt,
      },
      data: patient,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Explicitly revoke an active patient clinical access grant.
 */
const revokeAccess = async (req, res, next) => {
  try {
    const { grantId } = req.body;

    const result = await otpService.revokePatientGrant({
      grantId,
      doctorId: req.doctor.doctorId,
      reason: req.body.reason || 'DOCTOR_DISCHARGED_SESSION',
    });

    res.clearCookie('hms_patient_grant', { path: '/' });

    return res.status(200).json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({
        success: false,
        error: 'RevocationError',
        message: error.message,
      });
    }
    next(error);
  }
};

module.exports = {
  searchPatient,
  initiateOtp,
  verifyOtp,
  getPatientHistory,
  revokeAccess,
};
