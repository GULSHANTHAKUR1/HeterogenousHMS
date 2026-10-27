const mongoose = require('mongoose');

const patientAccessGrantSchema = new mongoose.Schema(
  {
    grantId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    patientId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    doctorId: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    grantToken: {
      type: String,
      required: true,
      index: true,
    },
    grantedAt: {
      type: Date,
      default: Date.now,
    },
    // MongoDB TTL Index: Temporary grant automatically expires after time window
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    revokedAt: {
      type: Date,
    },
    revokedBy: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('PatientAccessGrant', patientAccessGrantSchema);
