const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { OTPChallenge, PatientAccessGrant, Patient, AuditLog } = require('../models');
const { getSmsProvider } = require('./sms');
const { DEMO_PATIENTS } = require('./patientService');

// In-memory store for unit tests or when MongoDB is offline
const MEMORY_CHALLENGES = new Map();
const MEMORY_GRANTS = new Map();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes
const RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds
const MAX_VERIFY_ATTEMPTS = 3;
const GRANT_VALIDITY_MS = 30 * 60 * 1000; // 30 minutes clinical access

const getSalt = () => process.env.OTP_SECRET_SALT || 'hms_secure_otp_salt_2026';
const getJwtSecret = () => process.env.JWT_SECRET || 'dev_fallback_secret_never_use_in_production_2026';

/**
 * Compute HMAC-SHA256 hash of plaintext OTP.
 * Never stores plain OTPs in memory or persistent storage.
 */
const hashOtp = (otp) => {
  return crypto.createHmac('sha256', getSalt()).update(String(otp).trim()).digest('hex');
};

/**
 * Constant-time comparison between candidate OTP hash and stored hash.
 */
const compareOtpHash = (candidateOtp, storedHash) => {
  const candidateHash = hashOtp(candidateOtp);
  const a = Buffer.from(candidateHash, 'hex');
  const b = Buffer.from(storedHash, 'hex');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/**
 * Generate a cryptographically secure 6-digit random code.
 * Enforces strict environment separation for fixed dev codes.
 */
const generateOtpCode = () => {
  // Fixed demo code permitted ONLY in non-production local development if explicitly configured
  if (process.env.NODE_ENV !== 'production' && process.env.DEV_FIXED_OTP) {
    return String(process.env.DEV_FIXED_OTP).trim();
  }
  return crypto.randomInt(100000, 1000000).toString();
};

/**
 * Generate cryptographically signed JWT grant token for authorized clinical sessions.
 */
const createGrantJwt = (grant) => {
  return jwt.sign(
    {
      grantId: grant.grantId,
      patientId: grant.patientId,
      doctorId: grant.doctorId,
      tokenType: 'PATIENT_ACCESS_GRANT',
    },
    getJwtSecret(),
    {
      expiresIn: '30m',
      issuer: 'heterogeneous-hms',
    }
  );
};

/**
 * Verify and decode a Patient Access Grant token.
 */
const verifyGrantJwt = (token) => {
  try {
    const decoded = jwt.verify(token, getJwtSecret(), {
      issuer: 'heterogeneous-hms',
    });
    if (decoded.tokenType !== 'PATIENT_ACCESS_GRANT') {
      return null;
    }
    return decoded;
  } catch (err) {
    return null;
  }
};

/**
 * Initiate an OTP challenge for patient consent.
 * Strictly bound to the requesting doctor and intended patient.
 */
const initiateOtpChallenge = async ({ patientId, doctor, clientMeta = {} }) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const normalizedPid = patientId.trim().toUpperCase();
  const doctorId = doctor.doctorId.toUpperCase();

  // 1. Look up patient record to retrieve registered contact details
  let patient = null;
  if (isDbConnected) {
    patient = await Patient.findOne({ patientId: normalizedPid }).select('+contactNumber');
  } else {
    patient = DEMO_PATIENTS[normalizedPid];
    if (patient) {
      patient = {
        ...patient,
        contactNumber: '+919876543210', // Demo E.164 phone
      };
    }
  }

  if (!patient) {
    // Audit attempt on nonexistent patient
    AuditLog.create({
      action: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      performedBy: { doctorId, email: doctor.email },
      patientId: normalizedPid,
      details: { reason: 'PATIENT_NOT_FOUND', ip: clientMeta.ip },
    }).catch(() => {});

    const error = new Error(`Patient with ID "${normalizedPid}" was not found.`);
    error.status = 404;
    error.code = 'PATIENT_NOT_FOUND';
    throw error;
  }

  // 2. Check for active cooldown on recent challenge for this doctor+patient
  const now = new Date();
  let existingChallenge = null;

  if (isDbConnected) {
    existingChallenge = await OTPChallenge.findOne({
      patientId: normalizedPid,
      doctorId,
      isVerified: false,
      expiresAt: { $gt: now },
    }).sort({ createdAt: -1 });
  } else {
    const key = `${normalizedPid}:${doctorId}`;
    const memCh = MEMORY_CHALLENGES.get(key);
    if (memCh && !memCh.isVerified && memCh.expiresAt > now) {
      existingChallenge = memCh;
    }
  }

  if (existingChallenge && existingChallenge.resendCooldownUntil > now) {
    const remainingSecs = Math.ceil((existingChallenge.resendCooldownUntil - now) / 1000);
    const error = new Error(
      `Please wait ${remainingSecs} seconds before requesting a new verification code.`
    );
    error.status = 429;
    error.code = 'RESEND_COOLDOWN_ACTIVE';
    error.cooldownRemainingSeconds = remainingSecs;
    throw error;
  }

  // 3. Invalidate/supersede any prior unconsumed challenges
  if (isDbConnected) {
    await OTPChallenge.deleteMany({
      patientId: normalizedPid,
      doctorId,
      isVerified: false,
    });
  } else {
    MEMORY_CHALLENGES.delete(`${normalizedPid}:${doctorId}`);
  }

  // 4. Generate cryptographically secure OTP & protected hash
  const plainOtp = generateOtpCode();
  const otpHash = hashOtp(plainOtp);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MS);
  const resendCooldownUntil = new Date(Date.now() + RESEND_COOLDOWN_MS);
  const phoneMasked = patient.contactNumberMasked || '+91 98765-XXXXX';

  let savedChallengeId = null;

  if (isDbConnected) {
    const created = await OTPChallenge.create({
      patientId: normalizedPid,
      doctorId,
      phoneMasked,
      otpHash,
      purpose: 'EMR_ACCESS',
      expiresAt,
      resendCooldownUntil,
      attempts: 0,
      maxAttempts: MAX_VERIFY_ATTEMPTS,
      isVerified: false,
    });
    savedChallengeId = created._id.toString();
  } else {
    savedChallengeId = `mem_ch_${Date.now()}`;
    MEMORY_CHALLENGES.set(`${normalizedPid}:${doctorId}`, {
      _id: savedChallengeId,
      patientId: normalizedPid,
      doctorId,
      phoneMasked,
      otpHash,
      expiresAt,
      resendCooldownUntil,
      attempts: 0,
      maxAttempts: MAX_VERIFY_ATTEMPTS,
      isVerified: false,
    });
  }

  // 5. Dispatch via modular SMS provider
  const smsProvider = getSmsProvider();
  const deliveryResult = await smsProvider.sendOtp({
    to: patient.contactNumber,
    maskedTo: phoneMasked,
    otp: plainOtp,
    patientId: normalizedPid,
    patientName: patient.fullName || `${patient.firstName} ${patient.lastName}`,
    doctorId,
  });

  // 6. Audit log entry without exposing plain OTP
  AuditLog.create({
    action: 'OTP_CHALLENGE_REQUESTED',
    performedBy: { doctorId, email: doctor.email },
    patientId: normalizedPid,
    details: {
      phoneMasked,
      provider: deliveryResult.provider,
      deliveryStatus: deliveryResult.deliveryStatus,
      ip: clientMeta.ip,
    },
  }).catch(() => {});

  return {
    challengeId: savedChallengeId,
    patientId: normalizedPid,
    phoneMasked,
    expiresAt,
    resendCooldownSeconds: 60,
    deliveryStatus: deliveryResult.deliveryStatus,
    deliveryNotice: deliveryResult.message,
    // CRITICAL SECURITY REQUIREMENT:
    // The plaintext OTP is NEVER exposed in the API return payload!
  };
};

/**
 * Verify patient-submitted OTP and issue a short-lived access grant.
 */
const verifyOtpAndGrantAccess = async ({ patientId, doctorId, otp, clientMeta = {} }) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const normalizedPid = patientId.trim().toUpperCase();
  const normalizedDocId = doctorId.trim().toUpperCase();
  const now = new Date();

  let challenge = null;

  if (isDbConnected) {
    challenge = await OTPChallenge.findOne({
      patientId: normalizedPid,
      doctorId: normalizedDocId,
      isVerified: false,
    }).sort({ createdAt: -1 });
  } else {
    challenge = MEMORY_CHALLENGES.get(`${normalizedPid}:${normalizedDocId}`);
  }

  // 1. Missing or already consumed challenge
  if (!challenge || challenge.isVerified) {
    AuditLog.create({
      action: 'OTP_VERIFICATION_FAILED',
      performedBy: { doctorId: normalizedDocId },
      patientId: normalizedPid,
      details: { reason: 'CHALLENGE_NOT_FOUND_OR_CONSUMED', ip: clientMeta.ip },
    }).catch(() => {});

    const error = new Error('No active authorization challenge found for this patient and doctor. Please request a new OTP.');
    error.status = 400;
    error.code = 'CHALLENGE_NOT_FOUND';
    throw error;
  }

  // 2. Expiration check
  if (challenge.expiresAt < now) {
    if (isDbConnected) {
      await OTPChallenge.deleteOne({ _id: challenge._id });
    } else {
      MEMORY_CHALLENGES.delete(`${normalizedPid}:${normalizedDocId}`);
    }

    AuditLog.create({
      action: 'OTP_VERIFICATION_FAILED',
      performedBy: { doctorId: normalizedDocId },
      patientId: normalizedPid,
      details: { reason: 'OTP_EXPIRED', ip: clientMeta.ip },
    }).catch(() => {});

    const error = new Error('Verification code has expired. Please request a fresh code.');
    error.status = 410;
    error.code = 'OTP_EXPIRED';
    throw error;
  }

  // 3. Max attempts rate limit check
  if (challenge.attempts >= challenge.maxAttempts) {
    // Invalidate immediately
    if (isDbConnected) {
      await OTPChallenge.deleteOne({ _id: challenge._id });
    } else {
      MEMORY_CHALLENGES.delete(`${normalizedPid}:${normalizedDocId}`);
    }

    AuditLog.create({
      action: 'OTP_VERIFICATION_FAILED',
      performedBy: { doctorId: normalizedDocId },
      patientId: normalizedPid,
      details: { reason: 'MAX_ATTEMPTS_EXCEEDED', attempts: challenge.attempts, ip: clientMeta.ip },
    }).catch(() => {});

    const error = new Error('Maximum verification attempts exceeded. For security, this code is invalidated. Please request a new OTP.');
    error.status = 429;
    error.code = 'MAX_ATTEMPTS_EXCEEDED';
    throw error;
  }

  // 4. Validate OTP with constant-time hash comparison
  const isValid = compareOtpHash(otp, challenge.otpHash);

  if (!isValid) {
    challenge.attempts += 1;
    const remainingAttempts = challenge.maxAttempts - challenge.attempts;

    if (isDbConnected) {
      if (remainingAttempts <= 0) {
        await OTPChallenge.deleteOne({ _id: challenge._id });
      } else {
        await challenge.save();
      }
    } else {
      if (remainingAttempts <= 0) {
        MEMORY_CHALLENGES.delete(`${normalizedPid}:${normalizedDocId}`);
      }
    }

    AuditLog.create({
      action: 'OTP_VERIFICATION_FAILED',
      performedBy: { doctorId: normalizedDocId },
      patientId: normalizedPid,
      details: {
        reason: 'INVALID_OTP',
        attemptsUsed: challenge.attempts,
        remainingAttempts,
        ip: clientMeta.ip,
      },
    }).catch(() => {});

    if (remainingAttempts <= 0) {
      const error = new Error('Maximum verification attempts exceeded. Challenge has been locked.');
      error.status = 429;
      error.code = 'MAX_ATTEMPTS_EXCEEDED';
      throw error;
    }

    const error = new Error(`Incorrect verification code. ${remainingAttempts} attempt(s) remaining.`);
    error.status = 400;
    error.code = 'INVALID_OTP';
    error.remainingAttempts = remainingAttempts;
    throw error;
  }

  // 5. Successful verification: Mark challenge verified and consumed
  if (isDbConnected) {
    challenge.isVerified = true;
    await challenge.save();
  } else {
    challenge.isVerified = true;
    MEMORY_CHALLENGES.delete(`${normalizedPid}:${normalizedDocId}`);
  }

  // 6. Issue PatientAccessGrant (scoped to 1 doctor and 1 patient)
  const grantId = `PAG-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const grantedAt = new Date();
  const grantExpiresAt = new Date(Date.now() + GRANT_VALIDITY_MS);

  const grantData = {
    grantId,
    patientId: normalizedPid,
    doctorId: normalizedDocId,
    grantedAt,
    expiresAt: grantExpiresAt,
    isActive: true,
  };

  const grantToken = createGrantJwt(grantData);
  grantData.grantToken = grantToken;

  if (isDbConnected) {
    await PatientAccessGrant.create(grantData);
  } else {
    MEMORY_GRANTS.set(grantId, grantData);
    MEMORY_GRANTS.set(`${normalizedPid}:${normalizedDocId}`, grantData);
  }

  // 7. Audit successful grant creation
  AuditLog.create({
    action: 'OTP_VERIFICATION_SUCCESS',
    performedBy: { doctorId: normalizedDocId },
    patientId: normalizedPid,
    details: { grantId, validityMinutes: 30, ip: clientMeta.ip },
  }).catch(() => {});

  AuditLog.create({
    action: 'ACCESS_GRANT_ISSUED',
    performedBy: { doctorId: normalizedDocId },
    patientId: normalizedPid,
    details: { grantId, expiresAt: grantExpiresAt, ip: clientMeta.ip },
  }).catch(() => {});

  return {
    success: true,
    message: 'Patient consent verified successfully. Clinical record access granted.',
    grant: {
      grantId,
      grantToken,
      patientId: normalizedPid,
      doctorId: normalizedDocId,
      grantedAt,
      expiresAt: grantExpiresAt,
      validityMinutes: 30,
    },
  };
};

/**
 * Validate an active PatientAccessGrant for authorization middleware.
 */
const validatePatientGrant = async ({ grantToken, patientId, doctorId }) => {
  if (!grantToken) return { valid: false, reason: 'MISSING_GRANT_TOKEN' };

  const decoded = verifyGrantJwt(grantToken);
  if (!decoded) return { valid: false, reason: 'INVALID_OR_EXPIRED_TOKEN' };

  const normalizedPid = patientId.trim().toUpperCase();
  const normalizedDocId = doctorId.trim().toUpperCase();

  // Scope verification: Token must match both doctor and patient
  if (decoded.patientId !== normalizedPid) {
    return { valid: false, reason: 'GRANT_PATIENT_MISMATCH' };
  }
  if (decoded.doctorId !== normalizedDocId) {
    return { valid: false, reason: 'GRANT_DOCTOR_MISMATCH' };
  }

  const isDbConnected = mongoose.connection.readyState === 1;
  const now = new Date();

  let storedGrant = null;
  if (isDbConnected) {
    storedGrant = await PatientAccessGrant.findOne({ grantId: decoded.grantId });
  } else {
    storedGrant = MEMORY_GRANTS.get(decoded.grantId);
  }

  if (!storedGrant) {
    return { valid: false, reason: 'GRANT_NOT_FOUND' };
  }

  if (!storedGrant.isActive) {
    return { valid: false, reason: 'GRANT_REVOKED' };
  }

  if (new Date(storedGrant.expiresAt) < now) {
    return { valid: false, reason: 'GRANT_EXPIRED' };
  }

  return {
    valid: true,
    grant: storedGrant,
  };
};

/**
 * Revoke an active clinical access grant.
 */
const revokePatientGrant = async ({ grantId, doctorId, reason = 'SESSION_TERMINATED' }) => {
  const isDbConnected = mongoose.connection.readyState === 1;
  const normalizedDocId = doctorId.trim().toUpperCase();
  const now = new Date();

  let grant = null;
  if (isDbConnected) {
    grant = await PatientAccessGrant.findOne({ grantId });
    if (grant) {
      grant.isActive = false;
      grant.revokedAt = now;
      grant.revokedBy = normalizedDocId;
      await grant.save();
    }
  } else {
    grant = MEMORY_GRANTS.get(grantId);
    if (grant) {
      grant.isActive = false;
      grant.revokedAt = now;
      grant.revokedBy = normalizedDocId;
    }
  }

  if (!grant) {
    const error = new Error('Access grant not found.');
    error.status = 404;
    throw error;
  }

  AuditLog.create({
    action: 'ACCESS_GRANT_REVOKED',
    performedBy: { doctorId: normalizedDocId },
    patientId: grant.patientId,
    details: { grantId, reason },
  }).catch(() => {});

  return {
    success: true,
    message: `Patient access grant ${grantId} revoked successfully.`,
  };
};

/**
 * Clear test cache (used in test teardown).
 */
const resetMemoryStore = () => {
  MEMORY_CHALLENGES.clear();
  MEMORY_GRANTS.clear();
};

module.exports = {
  initiateOtpChallenge,
  verifyOtpAndGrantAccess,
  validatePatientGrant,
  revokePatientGrant,
  resetMemoryStore,
  hashOtp,
  compareOtpHash,
  generateOtpCode,
  createGrantJwt,
  verifyGrantJwt,
};
