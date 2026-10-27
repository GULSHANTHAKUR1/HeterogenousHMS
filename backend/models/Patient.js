const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    patientId: {
      type: String,
      required: [true, 'Patient ID is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
      // Format: PID-2026-1234
      match: [/^PID-\d{4}-\d{4}$/, 'Patient ID must follow format PID-YYYY-XXXX'],
    },
    firstName: {
      type: String,
      required: [true, 'First name is required'],
      trim: true,
    },
    lastName: {
      type: String,
      required: [true, 'Last name is required'],
      trim: true,
    },
    dob: {
      type: Date,
      required: [true, 'Date of birth is required'],
    },
    gender: {
      type: String,
      required: [true, 'Gender is required'],
      enum: ['Male', 'Female', 'Other'],
    },
    bloodGroup: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    },
    // Sensitive contact information: excluded by default from query results
    contactNumber: {
      type: String,
      required: [true, 'Registered contact number is required for OTP delivery'],
      select: false, // Security: Never include raw phone number in general queries
      trim: true,
    },
    // Safe masked representation displayed to physician during OTP verification (e.g., +91 98765-XXXXX)
    contactNumberMasked: {
      type: String,
      required: true,
      trim: true,
    },
    emergencyContact: {
      name: { type: String, trim: true },
      relationship: { type: String, trim: true },
      phone: { type: String, trim: true, select: false },
    },
    address: {
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
    },
    chronicConditions: [
      {
        condition: { type: String, required: true },
        diagnosedYear: { type: Number },
      },
    ],
    allergies: [
      {
        type: String,
        trim: true,
      },
    ],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        // Strip out private fields if accidentally queried
        delete ret.contactNumber;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual for calculating age
patientSchema.virtual('age').get(function () {
  if (!this.dob) return null;
  const diffMs = Date.now() - new Date(this.dob).getTime();
  const ageDt = new Date(diffMs);
  return Math.abs(ageDt.getUTCFullYear() - 1970);
});

// Virtual for full name
patientSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

module.exports = mongoose.model('Patient', patientSchema);
