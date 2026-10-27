const dotenv = require('dotenv');
dotenv.config();

const { connectDB, disconnectDB } = require('../config/db');
const {
  Doctor,
  Patient,
  MedicalReport,
  Prescription,
} = require('../models');

/**
 * Fictional Demonstration Seed Data.
 * IMPORTANT: This script will NEVER delete, drop, or overwrite existing records.
 * It uses atomic upserts with $setOnInsert to protect production and existing data.
 */
async function runSeed() {
  // Safety guard check: requires explicit flag
  const isExplicit = process.argv.includes('--run') || process.env.CONFIRM_SEED === 'true';

  if (!isExplicit) {
    console.warn(`
========================================================================
[SEED SAFETY NOTICE]
This seed script inserts demonstration records for B.Tech project review.
It requires explicit confirmation to run and will never delete any data.

To execute:
  node scripts/seed.js --run
or:
  npm run seed
========================================================================
`);
    process.exit(0);
  }

  console.log('[Seed] Initializing connection to MongoDB Atlas...');
  const connected = await connectDB();

  if (!connected) {
    console.error('[Seed] Could not connect to MongoDB Atlas. Ensure MONGODB_URI is configured in backend/.env.');
    process.exit(1);
  }

  try {
    console.log('[Seed] Checking and inserting demonstration records (Safe Upsert)...');

    // 1. Seed Demo Doctor
    const doctorResult = await Doctor.updateOne(
      { doctorId: 'DOC-108' },
      {
        $setOnInsert: {
          doctorId: 'DOC-108',
          fullName: 'Dr. Rahul Mehta, MD',
          email: 'doctor@hospital.com',
          passwordHash: 'argon2_or_bcrypt_mock_hash_hospital2026',
          specialty: 'Internal Medicine',
          department: 'General Clinical Ward',
          licenseNumber: 'MCI-2018-99410',
          phone: '+91 98111-00108',
          isActive: true,
        },
      },
      { upsert: true }
    );
    console.log(`[Seed] Doctor DOC-108: ${doctorResult.upsertedCount ? 'Created' : 'Already Exists (Preserved)'}`);

    // 2. Seed Demo Patients
    const demoPatients = [
      {
        patientId: 'PID-2026-1234',
        firstName: 'Rahul',
        lastName: 'Sharma',
        dob: new Date('1994-05-14'),
        gender: 'Male',
        bloodGroup: 'B+',
        contactNumber: '+919876543210',
        contactNumberMasked: '+91 98765-XXXXX',
        emergencyContact: {
          name: 'Meena Sharma',
          relationship: 'Spouse',
          phone: '+919876543211',
        },
        address: { city: 'Gurugram', state: 'Haryana', postalCode: '122001' },
        chronicConditions: [
          { condition: 'Diabetes', diagnosedYear: 2020 },
          { condition: 'Hypertension', diagnosedYear: 2021 },
        ],
        allergies: ['None Known'],
      },
      {
        patientId: 'PID-2026-5678',
        firstName: 'Priya',
        lastName: 'Patel',
        dob: new Date('1998-08-22'),
        gender: 'Female',
        bloodGroup: 'O+',
        contactNumber: '+919821098210',
        contactNumberMasked: '+91 98210-XXXXX',
        address: { city: 'Noida', state: 'Uttar Pradesh', postalCode: '201301' },
        chronicConditions: [{ condition: 'Seasonal Bronchial Allergy', diagnosedYear: 2023 }],
        allergies: ['Penicillin'],
      },
      {
        patientId: 'PID-2026-9012',
        firstName: 'Amit',
        lastName: 'Verma',
        dob: new Date('1981-11-03'),
        gender: 'Male',
        bloodGroup: 'A+',
        contactNumber: '+919711297112',
        contactNumberMasked: '+91 97112-XXXXX',
        address: { city: 'Delhi', state: 'Delhi', postalCode: '110001' },
        chronicConditions: [{ condition: 'Moderate Hyperglycemia', diagnosedYear: 2022 }],
        allergies: ['Sulfa drugs'],
      },
    ];

    for (const p of demoPatients) {
      const res = await Patient.updateOne(
        { patientId: p.patientId },
        { $setOnInsert: p },
        { upsert: true }
      );
      console.log(`[Seed] Patient ${p.patientId} (${p.firstName} ${p.lastName}): ${res.upsertedCount ? 'Created' : 'Already Exists (Preserved)'}`);
    }

    // 3. Seed Demo Medical Report (Matching Screen 5 of Infographic)
    const demoReport = {
      reportId: 'REP-2026-001',
      patientId: 'PID-2026-1234',
      reportType: 'Complete Blood Count (CBC)',
      reportDate: new Date('2026-10-12'),
      originalFileName: 'blood_panel_rahul_sharma_oct2026.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1420000,
      storageUrl: 'https://storage.hospital-records.local/raw/PID-2026-1234/REP-2026-001.pdf',
      extractedParameters: [
        { testName: 'Hemoglobin', observedValue: '8.5', unit: 'g/dL', normalRange: '13.0 - 17.0', status: 'Low' },
        { testName: 'WBC', observedValue: '6.2', unit: 'x10^3/uL', normalRange: '4.0 - 11.0', status: 'Normal' },
        { testName: 'Platelets', observedValue: '1.1', unit: 'lakhs/uL', normalRange: '1.5 - 4.5', status: 'High' },
        { testName: 'Creatinine', observedValue: '0.9', unit: 'mg/dL', normalRange: '0.6 - 1.2', status: 'Normal' },
        { testName: 'Glucose', observedValue: '140', unit: 'mg/dL', normalRange: '70 - 100', status: 'High' },
      ],
      nlpFindings: [
        'Hemoglobin is low (8.5 g/dL)',
        'Platelet count is high (1.1 lakhs)',
        'Blood glucose is above normal range (140 mg/dL)',
        'Kidney function (Creatinine: 0.9) is normal',
      ],
      reviewedByDoctorId: 'DOC-108',
      status: 'Abnormal',
      clinicianNotes: 'Iron supplementation initiated. Follow up glucose in 4 weeks.',
    };

    const repRes = await MedicalReport.updateOne(
      { reportId: demoReport.reportId },
      { $setOnInsert: demoReport },
      { upsert: true }
    );
    console.log(`[Seed] Medical Report ${demoReport.reportId}: ${repRes.upsertedCount ? 'Created' : 'Already Exists (Preserved)'}`);

    // 4. Seed Demo Prescription
    const demoPrescription = {
      prescriptionId: 'RX-2026-001',
      patientId: 'PID-2026-1234',
      doctorId: 'DOC-108',
      doctorName: 'Dr. Rahul Mehta, MD',
      diagnosis: 'Iron Deficiency Anemia & Moderate Hyperglycemia',
      medications: [
        { name: 'Ferrous Ascorbate', dosage: '100 mg', frequency: 'Once daily after dinner', duration: '30 days', instructions: 'Take with water' },
        { name: 'Metformin Hydrochloride', dosage: '500 mg', frequency: 'Twice daily with meals', duration: '60 days', instructions: 'Maintain low carb diet' },
        { name: 'Folic Acid', dosage: '5 mg', frequency: 'Once daily in morning', duration: '30 days', instructions: 'Empty stomach' },
      ],
      generalInstructions: 'Repeat Complete Blood Count and Fasting Plasma Glucose after 4 weeks.',
      status: 'Active',
      issueDate: new Date('2026-10-12'),
    };

    const rxRes = await Prescription.updateOne(
      { prescriptionId: demoPrescription.prescriptionId },
      { $setOnInsert: demoPrescription },
      { upsert: true }
    );
    console.log(`[Seed] Prescription ${demoPrescription.prescriptionId}: ${rxRes.upsertedCount ? 'Created' : 'Already Exists (Preserved)'}`);

    console.log('\n[Seed] Demonstration seeding complete. Zero production records were deleted or modified.');
  } catch (error) {
    console.error(`[Seed] Error executing seed: ${error.message}`);
  } finally {
    await disconnectDB();
    process.exit(0);
  }
}

runSeed();
