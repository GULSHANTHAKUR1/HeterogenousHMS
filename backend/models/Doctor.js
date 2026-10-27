const mongoose = require('mongoose');

const doctorSchema = new mongoose.Schema(
  {
    doctorId: {
      type: String,
      required: [true, 'Doctor ID is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
      // Format: DOC-108
    },
    fullName: {
      type: String,
      required: [true, 'Doctor full name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Doctor email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Never return password hashes in queries
    },
    specialty: {
      type: String,
      required: [true, 'Medical specialty is required'],
      trim: true,
    },
    department: {
      type: String,
      required: [true, 'Hospital department is required'],
      trim: true,
    },
    licenseNumber: {
      type: String,
      required: [true, 'Medical license number is required'],
      unique: true,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      enum: ['doctor', 'admin'],
      default: 'doctor',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify password against hashed password
doctorSchema.methods.comparePassword = async function (candidatePassword) {
  const bcrypt = require('bcryptjs');
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

module.exports = mongoose.model('Doctor', doctorSchema);
