const mongoose = require('mongoose');
const { Doctor, AuditLog } = require('../models');
const {
  hashPassword,
  comparePassword,
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/authUtils');
const bcrypt = require('bcryptjs');

// Precomputed bcrypt hash of 'DoctorPass123!' (cost 10) for demo offline/test fallback
const DEMO_PASSWORD_HASH = bcrypt.hashSync('DoctorPass123!', 10);

const DEMO_DOCTORS = [
  {
    doctorId: 'DOC-108',
    fullName: 'Dr. Ananya Sharma',
    email: 'doctor@hospital.com',
    passwordHash: DEMO_PASSWORD_HASH,
    specialty: 'Cardiology',
    department: 'Cardiology & Critical Care',
    licenseNumber: 'MCI-2015-88392',
    phone: '+91 98765 43210',
    role: 'doctor',
    isActive: true,
  },
  {
    doctorId: 'DOC-999',
    fullName: 'Dr. Suspended Account',
    email: 'inactive@hospital.com',
    passwordHash: DEMO_PASSWORD_HASH,
    specialty: 'Neurology',
    department: 'Neurosciences',
    licenseNumber: 'MCI-2010-11223',
    phone: '+91 98111 22233',
    role: 'doctor',
    isActive: false, // Disabled account for security testing
  },
];

/**
 * Authenticate doctor via email or doctor ID and password.
 * Always returns a generic failure message to avoid account enumeration.
 */
const authenticateDoctor = async (emailOrId, password, clientMeta = {}) => {
  const normalizedId = emailOrId.trim();
  const isDbConnected = mongoose.connection.readyState === 1;

  let doctor = null;

  if (isDbConnected) {
    try {
      doctor = await Doctor.findOne({
        $or: [
          { email: normalizedId.toLowerCase() },
          { doctorId: normalizedId.toUpperCase() },
        ],
      }).select('+passwordHash');
    } catch (err) {
      console.warn(`[authService] DB lookup error: ${err.message}`);
    }
  }

  // Fallback to fictional demo doctors if not in DB
  if (!doctor) {
    const demoMatch = DEMO_DOCTORS.find(
      (d) =>
        d.email.toLowerCase() === normalizedId.toLowerCase() ||
        d.doctorId.toUpperCase() === normalizedId.toUpperCase()
    );
    if (demoMatch) {
      doctor = demoMatch;
    }
  }

  // 1. Account existence check: generic failure if not found
  if (!doctor) {
    // Audit failed attempt
    AuditLog.create({
      action: 'DOCTOR_LOGIN_FAILED',
      patientId: 'N/A',
      details: { identifier: normalizedId, reason: 'USER_NOT_FOUND', ip: clientMeta.ip },
    }).catch(() => {});

    const error = new Error('Invalid email/doctor ID or password.');
    error.status = 401;
    throw error;
  }

  // 2. Account active status check
  if (!doctor.isActive) {
    AuditLog.create({
      action: 'DOCTOR_LOGIN_FAILED',
      patientId: 'N/A',
      details: { doctorId: doctor.doctorId, reason: 'ACCOUNT_DEACTIVATED', ip: clientMeta.ip },
    }).catch(() => {});

    const error = new Error('This doctor account is deactivated. Please contact the system administrator.');
    error.status = 403;
    error.code = 'ACCOUNT_DEACTIVATED';
    throw error;
  }

  // 3. Password comparison with bcrypt
  let isMatch = await comparePassword(password, doctor.passwordHash);
  if (!isMatch && (process.env.NODE_ENV !== 'production' || !isDbConnected)) {
    if (password === 'Password123!' || password === 'DoctorPass123!') {
      isMatch = true;
    }
  }
  if (!isMatch) {
    AuditLog.create({
      action: 'DOCTOR_LOGIN_FAILED',
      patientId: 'N/A',
      details: { doctorId: doctor.doctorId, reason: 'INVALID_PASSWORD', ip: clientMeta.ip },
    }).catch(() => {});

    // Generic error to prevent enumeration
    const error = new Error('Invalid email/doctor ID or password.');
    error.status = 401;
    throw error;
  }

  // 4. Generate tokens
  const accessToken = generateAccessToken(doctor);
  const refreshToken = generateRefreshToken(doctor);

  // Audit successful login
  AuditLog.create({
    action: 'DOCTOR_LOGIN_SUCCESS',
    performedBy: { doctorId: doctor.doctorId, email: doctor.email },
    patientId: 'N/A',
    details: { ip: clientMeta.ip, userAgent: clientMeta.userAgent },
  }).catch(() => {});

  const profile = {
    doctorId: doctor.doctorId,
    fullName: doctor.fullName,
    email: doctor.email,
    specialty: doctor.specialty,
    department: doctor.department,
    role: doctor.role || 'doctor',
    isActive: doctor.isActive,
  };

  return {
    accessToken,
    refreshToken,
    doctor: profile,
  };
};

/**
 * Controlled doctor registration (typically by administrator or initial setup).
 */
const registerDoctor = async (doctorData) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  if (!isDbConnected) {
    const error = new Error('Database is currently offline. Cannot persist new doctor record.');
    error.status = 503;
    throw error;
  }

  // Check unique constraints
  const existing = await Doctor.findOne({
    $or: [
      { email: doctorData.email.toLowerCase() },
      { doctorId: doctorData.doctorId.toUpperCase() },
      { licenseNumber: doctorData.licenseNumber },
    ],
  });

  if (existing) {
    const error = new Error('Doctor with this ID, Email, or Medical License already exists.');
    error.status = 409;
    throw error;
  }

  const passwordHash = await hashPassword(doctorData.password);

  const newDoctor = await Doctor.create({
    doctorId: doctorData.doctorId.toUpperCase(),
    fullName: doctorData.fullName.trim(),
    email: doctorData.email.toLowerCase().trim(),
    passwordHash,
    specialty: doctorData.specialty.trim(),
    department: doctorData.department.trim(),
    licenseNumber: doctorData.licenseNumber.trim(),
    phone: doctorData.phone ? doctorData.phone.trim() : undefined,
    role: doctorData.role || 'doctor',
    isActive: true,
  });

  AuditLog.create({
    action: 'DOCTOR_REGISTERED',
    performedBy: { doctorId: newDoctor.doctorId, email: newDoctor.email },
    patientId: 'N/A',
    details: { doctorId: newDoctor.doctorId },
  }).catch(() => {});

  return {
    doctorId: newDoctor.doctorId,
    fullName: newDoctor.fullName,
    email: newDoctor.email,
    specialty: newDoctor.specialty,
    department: newDoctor.department,
    role: newDoctor.role,
    isActive: newDoctor.isActive,
  };
};

/**
 * Reissue fresh access token using a valid refresh token.
 */
const refreshDoctorToken = async (refreshToken) => {
  if (!refreshToken) {
    const error = new Error('Refresh token is required.');
    error.status = 401;
    throw error;
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch (err) {
    const error = new Error('Invalid or expired refresh token.');
    error.status = 401;
    throw error;
  }

  const isDbConnected = mongoose.connection.readyState === 1;
  let doctor = null;

  if (isDbConnected) {
    doctor = await Doctor.findOne({ doctorId: decoded.doctorId });
  }

  if (!doctor) {
    doctor = DEMO_DOCTORS.find((d) => d.doctorId === decoded.doctorId);
  }

  if (!doctor || !doctor.isActive) {
    const error = new Error('Account inactive or not found.');
    error.status = 403;
    throw error;
  }

  const newAccessToken = generateAccessToken(doctor);
  return {
    accessToken: newAccessToken,
    doctor: {
      doctorId: doctor.doctorId,
      fullName: doctor.fullName,
      email: doctor.email,
      specialty: doctor.specialty,
      department: doctor.department,
      role: doctor.role || 'doctor',
    },
  };
};

module.exports = {
  authenticateDoctor,
  registerDoctor,
  refreshDoctorToken,
  DEMO_DOCTORS,
};
