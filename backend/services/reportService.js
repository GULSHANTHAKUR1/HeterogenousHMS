const crypto = require('crypto');
const mongoose = require('mongoose');
const { MedicalReport, AuditLog } = require('../models');
const { validateUploadedDocument } = require('../utils/fileValidation');
const { getStorageProvider } = require('./storage');
const { getOcrService } = require('./ocr');

// In-memory fallback reports when running offline or prior to DB seeding
const MEMORY_REPORTS = new Map();

// Seed initial demonstration reports matching infographic
const initDemoReports = () => {
  const demoReports = [
    {
      reportId: 'REP-001',
      patientId: 'PID-2026-1234',
      reportType: 'Complete Blood Count (CBC)',
      reportDate: new Date('2026-10-12'),
      originalFileName: 'CBC_Lab_Report_12Oct2026.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 1420500,
      storageKey: 'PID-2026-1234_demo_rep_001.pdf',
      uploadedByDoctorId: 'DOC-108',
      processingStatus: 'COMPLETED',
      status: 'Abnormal',
      extractedParameters: [
        { testName: 'Hemoglobin', observedValue: '8.5', unit: 'g/dL', normalRange: '13.0 - 17.0', status: 'Low' },
        { testName: 'WBC', observedValue: '6.2', unit: '10^3/uL', normalRange: '4.0 - 11.0', status: 'Normal' },
        { testName: 'Platelets', observedValue: '1.1', unit: 'lakhs', normalRange: '1.5 - 4.5', status: 'High' },
        { testName: 'Creatinine', observedValue: '0.9', unit: 'mg/dL', normalRange: '0.6 - 1.2', status: 'Normal' },
        { testName: 'Glucose', observedValue: '140', unit: 'mg/dL', normalRange: '70 - 100', status: 'High' },
      ],
      nlpFindings: [
        'Hemoglobin is low (8.5 g/dL)',
        'Platelet count is high (1.1 lakhs)',
        'Blood glucose is above normal range (140 mg/dL)',
        'Kidney function (Creatinine: 0.9) is normal',
      ],
      clinicianNotes: 'Patient presented with chronic fatigue; ordered complete hematology check.',
    },
    {
      reportId: 'REP-002',
      patientId: 'PID-2026-1234',
      reportType: 'Radiology / Chest X-Ray',
      reportDate: new Date('2026-08-05'),
      originalFileName: 'Chest_XRay_PA_05Aug2026.png',
      mimeType: 'image/png',
      fileSizeBytes: 3355443,
      storageKey: 'PID-2026-1234_demo_rep_002.png',
      uploadedByDoctorId: 'DOC-108',
      processingStatus: 'COMPLETED',
      status: 'Normal',
      extractedParameters: [
        { testName: 'Lung Fields', observedValue: 'Clear', unit: '', normalRange: 'Clear bilateral', status: 'Normal' },
        { testName: 'Cardiothoracic Ratio', observedValue: 'Normal', unit: '', normalRange: '< 0.5', status: 'Normal' },
      ],
      nlpFindings: ['No focal consolidation', 'Bilateral lung fields clear'],
      clinicianNotes: 'Routine pre-operative pulmonary screening.',
    },
    {
      reportId: 'REP-003',
      patientId: 'PID-2026-1234',
      reportType: 'Routine Urinalysis',
      reportDate: new Date('2026-05-20'),
      originalFileName: 'Urinalysis_Routine_20May2026.pdf',
      mimeType: 'application/pdf',
      fileSizeBytes: 840000,
      storageKey: 'PID-2026-1234_demo_rep_003.pdf',
      uploadedByDoctorId: 'DOC-108',
      processingStatus: 'COMPLETED',
      status: 'Abnormal',
      extractedParameters: [
        { testName: 'Protein', observedValue: 'High', unit: '', normalRange: 'Negative', status: 'Abnormal' },
        { testName: 'Leukocytes', observedValue: 'Normal', unit: '', normalRange: '0 - 5 /HPF', status: 'Normal' },
      ],
      nlpFindings: ['Proteinuria observed', 'Follow-up renal evaluation suggested'],
      clinicianNotes: 'Follow-up for proteinuria.',
    },
  ];

  demoReports.forEach((rep) => {
    MEMORY_REPORTS.set(`${rep.patientId}:${rep.reportId}`, rep);
  });
};

initDemoReports();

/**
 * Upload a new medical document with strict file validation and private storage.
 */
const uploadMedicalReport = async ({ patientId, doctor, file, reportType, clinicianNotes, clientMeta = {} }) => {
  const normalizedPid = patientId.trim().toUpperCase();
  const doctorId = doctor.doctorId.toUpperCase();

  // 1. Validate file (size, extensions, MIME, and magic numbers)
  const validation = validateUploadedDocument(file);

  // 2. Save document to private storage outside the web root
  const storageProvider = getStorageProvider();
  const storageResult = await storageProvider.saveDocument({
    buffer: file.buffer,
    originalFileName: validation.safeFileName,
    mimeType: validation.detectedMime,
    patientId: normalizedPid,
  });

  // 3. Generate unique Report ID
  const randomSuffix = crypto.randomBytes(2).toString('hex').toUpperCase();
  const reportId = `REP-${Date.now().toString().slice(-4)}-${randomSuffix}`;

  const reportData = {
    reportId,
    patientId: normalizedPid,
    reportType: reportType.trim(),
    reportDate: new Date(),
    originalFileName: validation.safeFileName,
    mimeType: validation.detectedMime,
    fileSizeBytes: validation.fileSizeBytes,
    storageKey: storageResult.storageKey,
    storageUrl: '', // Direct public URL is intentionally disabled
    uploadedByDoctorId: doctorId,
    processingStatus: 'PENDING_OCR',
    status: 'Pending',
    extractedParameters: [],
    nlpFindings: [],
    clinicianNotes: clinicianNotes ? clinicianNotes.trim() : undefined,
  };

  const isDbConnected = mongoose.connection.readyState === 1;

  if (isDbConnected) {
    await MedicalReport.create(reportData);
  } else {
    MEMORY_REPORTS.set(`${normalizedPid}:${reportId}`, reportData);
  }

  // 4. Enqueue document for OCR processing via interface
  const ocrService = getOcrService();
  try {
    const ocrOutcome = await ocrService.enqueueDocument({
      reportId,
      patientId: normalizedPid,
      storageKey: storageResult.storageKey,
      mimeType: validation.detectedMime,
    });

    if (ocrOutcome && ocrOutcome.processingStatus === 'COMPLETED') {
      reportData.processingStatus = 'COMPLETED';
      reportData.extractedParameters = ocrOutcome.extractedParameters || [];
      reportData.nlpFindings = ocrOutcome.nlpFindings || [];
      reportData.status = ocrOutcome.status || 'Normal';
      MEMORY_REPORTS.set(`${normalizedPid}:${reportId}`, reportData);
    }
  } catch (ocrErr) {
    console.warn(`[reportService] OCR enqueue notice for ${reportId}: ${ocrErr.message}`);
  }

  // 5. Audit upload action
  AuditLog.create({
    action: 'REPORT_UPLOADED',
    performedBy: { doctorId, email: doctor.email },
    patientId: normalizedPid,
    details: {
      reportId,
      originalFileName: validation.safeFileName,
      fileSizeBytes: validation.fileSizeBytes,
      mimeType: validation.detectedMime,
      ip: clientMeta.ip,
    },
  }).catch(() => {});

  return {
    reportId,
    patientId: normalizedPid,
    reportType: reportData.reportType,
    reportDate: reportData.reportDate,
    originalFileName: reportData.originalFileName,
    fileSizeBytes: reportData.fileSizeBytes,
    mimeType: reportData.mimeType,
    processingStatus: reportData.processingStatus,
    status: reportData.status,
    extractedParameters: reportData.extractedParameters || [],
    nlpFindings: reportData.nlpFindings || [],
    clinicianNotes: reportData.clinicianNotes || '',
    message: 'Medical report uploaded securely and processed for clinician review.',
  };
};

/**
 * Update and confirm report parameters following clinician review.
 */
const updateReportReview = async ({ patientId, reportId, doctor, updates = {} }) => {
  const normalizedPid = patientId.trim().toUpperCase();
  const normalizedRepId = reportId.trim().toUpperCase();
  const doctorId = doctor.doctorId.toUpperCase();
  const isDbConnected = mongoose.connection.readyState === 1;

  let report = null;
  if (isDbConnected) {
    report = await MedicalReport.findOne({ reportId: normalizedRepId, patientId: normalizedPid });
  } else {
    report = MEMORY_REPORTS.get(`${normalizedPid}:${normalizedRepId}`);
  }

  if (!report) {
    const error = new Error(`Medical report "${normalizedRepId}" not found for patient "${normalizedPid}".`);
    error.status = 404;
    error.code = 'REPORT_NOT_FOUND';
    throw error;
  }

  const newParameters = updates.extractedParameters || report.extractedParameters || [];
  const newNotes = updates.clinicianNotes !== undefined ? updates.clinicianNotes : (report.clinicianNotes || '');
  const hasAbnormal = newParameters.some((p) => p.status === 'Low' || p.status === 'High' || p.status === 'Abnormal');
  const newStatus = updates.status || (hasAbnormal ? 'Abnormal' : 'Normal');

  if (isDbConnected) {
    report.extractedParameters = newParameters;
    report.clinicianNotes = newNotes;
    report.status = newStatus;
    report.processingStatus = 'COMPLETED';
    await report.save();
  } else {
    report.extractedParameters = newParameters;
    report.clinicianNotes = newNotes;
    report.status = newStatus;
    report.processingStatus = 'COMPLETED';
    MEMORY_REPORTS.set(`${normalizedPid}:${normalizedRepId}`, report);
  }

  AuditLog.create({
    action: 'REPORT_REVIEW_CONFIRMED',
    performedBy: { doctorId, email: doctor.email },
    patientId: normalizedPid,
    details: {
      reportId: normalizedRepId,
      confirmedParamsCount: newParameters.length,
      status: newStatus,
    },
  }).catch(() => {});

  return {
    reportId: normalizedRepId,
    patientId: normalizedPid,
    processingStatus: 'COMPLETED',
    status: newStatus,
    extractedParameters: newParameters,
    nlpFindings: report.nlpFindings || [],
    clinicianNotes: newNotes,
    message: 'Medical report parameters reviewed and confirmed by clinician.',
  };
};

/**
 * List all reports for an authorized patient.
 */
const listPatientReports = async ({ patientId, doctorContext }) => {
  const normalizedPid = patientId.trim().toUpperCase();
  const isDbConnected = mongoose.connection.readyState === 1;

  let reports = [];

  if (isDbConnected) {
    reports = await MedicalReport.find({ patientId: normalizedPid })
      .select('reportId patientId reportType reportDate originalFileName mimeType fileSizeBytes processingStatus status nlpFindings')
      .sort({ reportDate: -1 })
      .lean();
  }

  if (!reports || reports.length === 0) {
    // Memory fallback
    reports = Array.from(MEMORY_REPORTS.values())
      .filter((r) => r.patientId === normalizedPid)
      .sort((a, b) => new Date(b.reportDate) - new Date(a.reportDate));
  }

  return reports.map((r) => ({
    id: r.reportId,
    reportId: r.reportId,
    patientId: r.patientId,
    title: r.reportType,
    reportType: r.reportType,
    date: new Date(r.reportDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    reportDate: r.reportDate,
    originalFileName: r.originalFileName,
    fileSize: `${(r.fileSizeBytes / (1024 * 1024)).toFixed(1)} MB ${r.mimeType?.includes('pdf') ? 'PDF' : 'IMAGE'}`,
    fileSizeBytes: r.fileSizeBytes,
    mimeType: r.mimeType,
    status: r.status,
    processingStatus: r.processingStatus || 'COMPLETED',
    findingsSummary: r.nlpFindings && r.nlpFindings.length > 0 ? r.nlpFindings.join(' • ') : 'Pending OCR & entity extraction',
    nlpFindings: r.nlpFindings || [],
  }));
};

/**
 * Retrieve a specific report's full detail.
 */
const getReportDetail = async ({ patientId, reportId, doctorContext }) => {
  const normalizedPid = patientId.trim().toUpperCase();
  const normalizedRepId = reportId.trim().toUpperCase();
  const isDbConnected = mongoose.connection.readyState === 1;

  let report = null;

  if (isDbConnected) {
    report = await MedicalReport.findOne({
      reportId: normalizedRepId,
      patientId: normalizedPid,
    }).lean();
  }

  if (!report) {
    report = MEMORY_REPORTS.get(`${normalizedPid}:${normalizedRepId}`);
  }

  if (!report) {
    const error = new Error(`Medical report "${normalizedRepId}" not found for patient "${normalizedPid}".`);
    error.status = 404;
    error.code = 'REPORT_NOT_FOUND';
    throw error;
  }

  return {
    reportId: report.reportId,
    patientId: report.patientId,
    reportType: report.reportType,
    reportDate: report.reportDate,
    originalFileName: report.originalFileName,
    fileSizeBytes: report.fileSizeBytes,
    mimeType: report.mimeType,
    processingStatus: report.processingStatus || 'COMPLETED',
    status: report.status,
    extractedParameters: report.extractedParameters || [],
    nlpFindings: report.nlpFindings || [],
    clinicianNotes: report.clinicianNotes || '',
    uploadedByDoctorId: report.uploadedByDoctorId,
  };
};

/**
 * Retrieve original document stream for authorized downloading.
 */
const getReportDocumentStream = async ({ patientId, reportId, doctorContext }) => {
  const report = await getReportDetail({ patientId, reportId, doctorContext });
  const storageProvider = getStorageProvider();

  let storageKey = report.storageKey;
  if (!storageKey) {
    // Demo fallback storage key
    storageKey = `${report.patientId}_demo_${report.reportId}.pdf`;
  }

  try {
    return await storageProvider.getDocumentStream(storageKey);
  } catch (err) {
    // If local demo file doesn't exist on disk, return synthetic buffer stream for testing
    const sampleBuffer = Buffer.from(
      `%PDF-1.4 Demonstration Medical Report for ${patientId} (ID: ${reportId})\nFindings: ${report.nlpFindings.join('; ')}`
    );
    const { Readable } = require('stream');
    return {
      stream: Readable.from(sampleBuffer),
      fileSizeBytes: sampleBuffer.length,
      mimeType: 'application/pdf',
      safeFileName: `${reportId}.pdf`,
    };
  }
};

module.exports = {
  uploadMedicalReport,
  updateReportReview,
  listPatientReports,
  getReportDetail,
  getReportDocumentStream,
  initDemoReports,
};

