const mongoose = require('mongoose');

const medicationItemSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Medication name is required'],
      trim: true,
    },
    dosage: {
      type: String,
      required: [true, 'Dosage is required (e.g., 500mg)'],
      trim: true,
    },
    frequency: {
      type: String,
      required: [true, 'Frequency is required (e.g., Twice daily)'],
      trim: true,
    },
    duration: {
      type: String,
      required: [true, 'Duration is required (e.g., 14 days)'],
      trim: true,
    },
    instructions: {
      type: String,
      trim: true,
    },
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: {
      type: String,
      required: [true, 'Prescription ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      // Format: RX-091 or RX-2026-001
      match: [/^RX-(?:[A-Z0-9]+-)?\d{3,5}$/i, 'Prescription ID must follow format RX-XXX or RX-YYYY-XXX'],
    },
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    doctorId: {
      type: String,
      required: [true, 'Doctor ID is required'],
      uppercase: true,
      trim: true,
      index: true,
    },
    doctorName: {
      type: String,
      required: true,
      trim: true,
    },
    diagnosis: {
      type: String,
      required: [true, 'Clinical diagnosis is required'],
      trim: true,
    },
    medications: {
      type: [medicationItemSchema],
      validate: [(val) => val.length > 0, 'Prescription must contain at least one medication'],
    },
    generalInstructions: {
      type: String,
      trim: true,
    },
    status: {
      type: String,
      enum: ['Active', 'Completed', 'Discontinued'],
      default: 'Active',
      index: true,
    },
    issueDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Prescription', prescriptionSchema);
