const { z } = require('zod');

const patientSearchSchema = z.object({
  pid: z
    .string({
      required_error: 'Patient ID (pid) query parameter is required',
    })
    .trim()
    .toUpperCase()
    .regex(/^PID-\d{4}-\d{4}$/, {
      message: 'Patient ID must follow format PID-YYYY-XXXX (e.g., PID-2026-1234)',
    }),
});

const patientIdParamSchema = z.object({
  patientId: z
    .string({ required_error: 'Patient ID route parameter is required' })
    .trim()
    .toUpperCase()
    .regex(/^PID-\d{4}-\d{4}$/, {
      message: 'Patient ID must follow format PID-YYYY-XXXX (e.g., PID-2026-1234)',
    }),
});

const otpVerifySchema = z.object({
  otp: z
    .string({ required_error: '6-digit OTP code is required' })
    .trim()
    .regex(/^\d{6}$/, { message: 'OTP must be exactly 6 numeric digits' }),
});

const grantRevokeSchema = z.object({
  grantId: z
    .string({ required_error: 'Grant ID is required to revoke access' })
    .trim()
    .min(5, 'Invalid Grant ID'),
});

module.exports = {
  patientSearchSchema,
  patientIdParamSchema,
  otpVerifySchema,
  grantRevokeSchema,
};

