const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        'PATIENT_SEARCH',
        'OTP_REQUESTED',
        'OTP_VERIFIED',
        'REPORT_VIEWED',
        'REPORT_UPLOADED',
        'PRESCRIPTION_CREATED',
        'DOCTOR_LOGIN',
        'ACCESS_DENIED',
      ],
      index: true,
    },
    performedBy: {
      doctorId: { type: String, trim: true },
      doctorEmail: { type: String, trim: true },
      ipAddress: { type: String, trim: true },
      userAgent: { type: String, trim: true },
    },
    patientId: {
      type: String,
      uppercase: true,
      trim: true,
      index: true,
    },
    targetResource: {
      type: String,
      trim: true,
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: false,
  }
);

module.exports = mongoose.model('AuditLog', auditLogSchema);
