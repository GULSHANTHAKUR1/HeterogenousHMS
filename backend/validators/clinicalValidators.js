const { z } = require('zod');

const uploadReportMetaSchema = z.object({
  reportType: z
    .string({ required_error: 'Report type is required' })
    .trim()
    .min(2, 'Report type must be specified'),
  clinicianNotes: z.string().trim().optional(),
});

const medicationItemSchema = z.object({
  name: z
    .string({ required_error: 'Medication name is required' })
    .trim()
    .min(2, 'Medication name must be at least 2 characters'),
  dosage: z
    .string({ required_error: 'Dosage is required (e.g. 500mg)' })
    .trim()
    .min(1, 'Dosage is required'),
  frequency: z
    .string({ required_error: 'Frequency is required (e.g. Twice daily)' })
    .trim()
    .min(2, 'Frequency is required'),
  duration: z
    .string({ required_error: 'Duration is required (e.g. 14 days)' })
    .trim()
    .min(1, 'Duration is required'),
  instructions: z.string().trim().optional(),
});

const addPrescriptionSchema = z.object({
  diagnosis: z
    .string({ required_error: 'Clinical diagnosis is required' })
    .trim()
    .min(2, 'Diagnosis must be at least 2 characters long'),
  medications: z
    .array(medicationItemSchema, { required_error: 'Medications list is required' })
    .min(1, 'Prescription must contain at least one medication item'),
  generalInstructions: z.string().trim().optional(),
  status: z.enum(['Active', 'Completed', 'Discontinued']).optional().default('Active'),
});

const reportIdParamSchema = z.object({
  patientId: z
    .string({ required_error: 'Patient ID is required' })
    .trim()
    .toUpperCase()
    .regex(/^PID-\d{4}-\d{4}$/, 'Patient ID must follow format PID-YYYY-XXXX'),
  reportId: z
    .string({ required_error: 'Report ID is required' })
    .trim()
    .min(3, 'Report ID is required'),
});

module.exports = {
  uploadReportMetaSchema,
  addPrescriptionSchema,
  reportIdParamSchema,
};
