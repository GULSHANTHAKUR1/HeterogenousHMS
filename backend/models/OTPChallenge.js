const mongoose = require('mongoose');

const otpChallengeSchema = new mongoose.Schema(
  {
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
    phoneMasked: {
      type: String,
      required: true,
    },
    otpHash: {
      type: String,
      required: true,
    },
    purpose: {
      type: String,
      enum: ['EMR_ACCESS'],
      default: 'EMR_ACCESS',
    },
    // MongoDB TTL Index: Document expires automatically at expiresAt
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 },
    },
    attempts: {
      type: Number,
      default: 0,
    },
    maxAttempts: {
      type: Number,
      default: 3,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    resendCooldownUntil: {
      type: Date,
      default: () => new Date(Date.now() + 60 * 1000), // 60s cooldown
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('OTPChallenge', otpChallengeSchema);
