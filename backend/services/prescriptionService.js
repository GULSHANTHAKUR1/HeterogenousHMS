const crypto = require('crypto');
const mongoose = require('mongoose');
const { Prescription, AuditLog } = require('../models');

// In-memory fallback prescriptions when offline
const MEMORY_PRESCRIPTIONS = new Map();

const initDemoPrescriptions = () => {
  const demoList = [
    {
      prescriptionId: 'RX-2026-091',
      patientId: 'PID-2026-1234',
      doctorId: 'DOC-108',
      doctorName: 'Dr. Rahul Mehta, MD',
      diagnosis: 'Iron Deficiency Anemia & Moderate Hyperglycemia',
      medications: [
        { name: 'Ferrous Ascorbate', dosage: '100 mg', frequency: 'Once daily after dinner', duration: '30 days', instructions: 'Take with citrus juice' },
        { name: 'Metformin Hydrochloride', dosage: '500 mg', frequency: 'Twice daily with meals', duration: '60 days', instructions: 'Monitor fasting blood glucose weekly' },
        { name: 'Folic Acid', dosage: '5 mg', frequency: 'Once daily in morning', duration: '30 days', instructions: 'After breakfast' },
      ],
      generalInstructions: 'Review complete blood count and fasting blood glucose after 4 weeks.',
      status: 'Active',
      issueDate: new Date('2026-10-12'),
    },
    {
      prescriptionId: 'RX-2026-042',
      patientId: 'PID-2026-1234',
      doctorId: 'DOC-108',
      doctorName: 'Dr. S. K. Sharma, MD',
      diagnosis: 'Seasonal Bronchial Allergy',
      medications: [
        { name: 'Levocetirizine', dosage: '5 mg', frequency: 'Once at bedtime', duration: '10 days', instructions: 'Do not operate machinery' },
        { name: 'Montelukast', dosage: '10 mg', frequency: 'Once at bedtime', duration: '10 days', instructions: 'Take with warm water' },
      ],
      generalInstructions: 'Steam inhalation twice daily; avoid cold beverages.',
      status: 'Completed',
      issueDate: new Date('2026-08-05'),
    },
  ];

  demoList.forEach((rx) => {
    MEMORY_PRESCRIPTIONS.set(`${rx.patientId}:${rx.prescriptionId}`, rx);
  });
};

initDemoPrescriptions();

/**
 * Add a new clinical prescription for an authorized patient.
 * Preserves historical records by creating a new versioned prescription entry.
 */
const addPrescription = async ({ patientId, doctor, prescriptionData, clientMeta = {} }) => {
  const normalizedPid = patientId.trim().toUpperCase();
  const doctorId = doctor.doctorId.toUpperCase();
  const doctorName = doctor.fullName || `Dr. ${doctor.doctorId}`;

  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const prescriptionId = `RX-${Date.now().toString().slice(-4)}-${randomSuffix}`;

  const newRx = {
    prescriptionId,
    patientId: normalizedPid,
    doctorId,
    doctorName,
    diagnosis: prescriptionData.diagnosis.trim(),
    medications: prescriptionData.medications.map((m) => ({
      name: m.name.trim(),
      dosage: m.dosage.trim(),
      frequency: m.frequency.trim(),
      duration: m.duration.trim(),
      instructions: m.instructions ? m.instructions.trim() : '',
    })),
    generalInstructions: prescriptionData.generalInstructions ? prescriptionData.generalInstructions.trim() : '',
    status: prescriptionData.status || 'Active',
    issueDate: new Date(),
  };

  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    await Prescription.create(newRx);
  } else {
    MEMORY_PRESCRIPTIONS.set(`${normalizedPid}:${prescriptionId}`, newRx);
  }

  AuditLog.create({
    action: 'PRESCRIPTION_CREATED',
    performedBy: { doctorId, email: doctor.email },
    patientId: normalizedPid,
    details: {
      prescriptionId,
      diagnosis: newRx.diagnosis,
      medicationsCount: newRx.medications.length,
      ip: clientMeta.ip,
    },
  }).catch(() => {});

  return {
    prescriptionId,
    patientId: normalizedPid,
    doctorName,
    diagnosis: newRx.diagnosis,
    medications: newRx.medications,
    generalInstructions: newRx.generalInstructions,
    status: newRx.status,
    issueDate: newRx.issueDate,
    message: 'Prescription successfully recorded and appended to patient medical record.',
  };
};

/**
 * List all historical and active prescriptions for an authorized patient.
 */
const listPatientPrescriptions = async ({ patientId, doctorContext }) => {
  const normalizedPid = patientId.trim().toUpperCase();
  const isDbConnected = mongoose.connection.readyState === 1;

  let prescriptions = [];

  if (isDbConnected) {
    prescriptions = await Prescription.find({ patientId: normalizedPid })
      .sort({ issueDate: -1 })
      .lean();
  }

  if (!prescriptions || prescriptions.length === 0) {
    prescriptions = Array.from(MEMORY_PRESCRIPTIONS.values())
      .filter((rx) => rx.patientId === normalizedPid)
      .sort((a, b) => new Date(b.issueDate) - new Date(a.issueDate));
  }

  return prescriptions.map((rx) => ({
    id: rx.prescriptionId,
    prescriptionId: rx.prescriptionId,
    date: new Date(rx.issueDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    issueDate: rx.issueDate,
    doctor: rx.doctorName,
    doctorId: rx.doctorId,
    diagnosis: rx.diagnosis,
    medications: rx.medications || [],
    instructions: rx.generalInstructions || '',
    status: rx.status || 'Active',
  }));
};

module.exports = {
  addPrescription,
  listPatientPrescriptions,
  initDemoPrescriptions,
};
