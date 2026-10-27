const mongoose = require('mongoose');
const { Patient, AuditLog } = require('../models');

// Safe fallback demonstration patients when running offline or prior to Atlas provisioning
const DEMO_PATIENTS = {
  'PID-2026-1234': {
    patientId: 'PID-2026-1234',
    firstName: 'Rahul',
    lastName: 'Sharma',
    fullName: 'Rahul Sharma',
    dob: new Date('1994-05-14'),
    age: 32,
    gender: 'Male',
    bloodGroup: 'B+',
    contactNumberMasked: '+91 98765-XXXXX',
    contactNumber: '+919876543210',
    chronicConditions: [
      { condition: 'Diabetes', diagnosedYear: 2020 },
      { condition: 'Hypertension', diagnosedYear: 2021 },
    ],
    allergies: ['None Known'],
    isDemoRecord: true,
  },
  'PID-2026-5678': {
    patientId: 'PID-2026-5678',
    firstName: 'Priya',
    lastName: 'Patel',
    fullName: 'Priya Patel',
    dob: new Date('1998-08-22'),
    age: 28,
    gender: 'Female',
    bloodGroup: 'O+',
    contactNumberMasked: '+91 98210-XXXXX',
    contactNumber: '+919821043210',
    chronicConditions: [{ condition: 'Seasonal Bronchial Allergy', diagnosedYear: 2023 }],
    allergies: ['Penicillin'],
    isDemoRecord: true,
  },
  'PID-2026-9012': {
    patientId: 'PID-2026-9012',
    firstName: 'Amit',
    lastName: 'Verma',
    fullName: 'Amit Verma',
    dob: new Date('1981-11-03'),
    age: 45,
    gender: 'Male',
    bloodGroup: 'A+',
    contactNumberMasked: '+91 97112-XXXXX',
    contactNumber: '+919711243210',
    chronicConditions: [{ condition: 'Moderate Hyperglycemia', diagnosedYear: 2022 }],
    allergies: ['Sulfa drugs'],
    isDemoRecord: true,
  },
};

/**
 * Find patient summary for Step 2 Search.
 * CRITICAL PRIVACY & SECURITY REQUIREMENT:
 * The search response reveals NO medical history, NO chronic conditions,
 * NO allergies, and NO full contact details.
 */
const findPatientByPID = async (patientId, doctorContext = {}) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    try {
      // Exclude contactNumber and medical fields from unconsented search
      const patient = await Patient.findOne({ patientId })
        .select('patientId firstName lastName dob gender contactNumberMasked')
        .lean();

      if (patient) {
        // Calculate age
        const age = patient.dob
          ? Math.abs(new Date(Date.now() - new Date(patient.dob).getTime()).getUTCFullYear() - 1970)
          : null;

        AuditLog.create({
          action: 'PATIENT_SEARCH',
          performedBy: doctorContext,
          patientId,
          details: { matchFound: true, source: 'MongoDB' },
        }).catch(() => {});

        return {
          patientId: patient.patientId,
          firstName: patient.firstName,
          lastName: patient.lastName,
          fullName: `${patient.firstName} ${patient.lastName}`,
          age,
          gender: patient.gender,
          contactNumberMasked: patient.contactNumberMasked,
        };
      }
    } catch (err) {
      console.warn(`[patientService] Error querying MongoDB for ${patientId}: ${err.message}`);
    }
  }

  // Fallback to demonstration record if present
  const demoPatient = DEMO_PATIENTS[patientId];
  if (demoPatient) {
    return {
      patientId: demoPatient.patientId,
      firstName: demoPatient.firstName,
      lastName: demoPatient.lastName,
      fullName: demoPatient.fullName,
      age: demoPatient.age,
      gender: demoPatient.gender,
      contactNumberMasked: demoPatient.contactNumberMasked,
      isDemoRecord: true,
    };
  }

  return null;
};

/**
 * Retrieve complete clinical history for an authorized patient.
 * MUST ONLY be called after requirePatientAccessGrant verification.
 */
const getAuthorizedPatientHistory = async (patientId, doctorContext = {}, grantContext = {}) => {
  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    try {
      const patient = await Patient.findOne({ patientId })
        .select('-contactNumber -emergencyContact.phone')
        .lean();

      if (patient) {
        AuditLog.create({
          action: 'PATIENT_RECORD_VIEWED',
          performedBy: doctorContext,
          patientId,
          details: { grantId: grantContext.grantId, source: 'MongoDB' },
        }).catch(() => {});

        return patient;
      }
    } catch (err) {
      console.warn(`[patientService] Error querying medical history: ${err.message}`);
    }
  }

  // Fallback to demonstration clinical history
  const demoPatient = DEMO_PATIENTS[patientId];
  if (demoPatient) {
    AuditLog.create({
      action: 'PATIENT_RECORD_VIEWED',
      performedBy: doctorContext,
      patientId,
      details: { grantId: grantContext.grantId, source: 'DEMO_SANDBOX' },
    }).catch(() => {});

    return {
      ...demoPatient,
      _note: 'Demonstration medical history record accessible under active consent grant.',
    };
  }

  return null;
};

module.exports = {
  findPatientByPID,
  getAuthorizedPatientHistory,
  DEMO_PATIENTS,
};
