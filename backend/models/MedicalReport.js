const mongoose = require('mongoose');

const extractedParameterSchema = new mongoose.Schema(
  {
    testName: {
      type: String,
      required: true,
      trim: true,
    },
    observedValue: {
      type: String,
      required: true,
      trim: true,
    },
    unit: {
      type: String,
      trim: true,
    },
    normalRange: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Normal', 'High', 'Low', 'Abnormal'],
      default: 'Normal',
      required: true,
    },
  },
  { _id: false }
);

const medicalReportSchema = new mongoose.Schema(
  {
    reportId: {
      type: String,
      required: [true, 'Report ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      // Format: REP-001 or REP-2026-001
      match: [/^REP-(?:[A-Z0-9]+-)?\d{3,5}$/i, 'Report ID must follow format REP-XXX or REP-YYYY-XXX'],
    },
    patientId: {
      type: String,
      required: [true, 'Patient ID reference is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    reportType: {
      type: String,
      required: [true, 'Report type is required'],
      trim: true,
    },
    reportDate: {
      type: Date,
      default: Date.now,
      required: true,
    },
    // Raw file storage pointers - avoids storing heavy binary blobs in MongoDB
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
    },
    fileSizeBytes: {
      type: Number,
      required: true,
    },
    storageKey: {
      type: String,
      required: true,
    },
    storageUrl: {
      type: String,
      default: '',
    },
    uploadedByDoctorId: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    processingStatus: {
      type: String,
      enum: ['PENDING_OCR', 'PROCESSING', 'COMPLETED', 'FAILED'],
      default: 'PENDING_OCR',
      index: true,
    },
    // OCR & NLP Structured Extraction Results
    extractedParameters: [extractedParameterSchema],
    nlpFindings: [
      {
        type: String,
        trim: true,
      },
    ],
    reviewedByDoctorId: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Pending', 'Normal', 'Abnormal', 'Reviewed'],
      default: 'Normal',
      index: true,
    },
    clinicianNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('MedicalReport', medicalReportSchema);
