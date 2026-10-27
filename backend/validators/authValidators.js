const { z } = require('zod');

const loginSchema = z.object({
  emailOrId: z
    .string({ required_error: 'Email or Doctor ID is required' })
    .trim()
    .min(3, 'Email or Doctor ID must be at least 3 characters'),
  password: z
    .string({ required_error: 'Password is required' })
    .min(6, 'Password must be at least 6 characters'),
});

const registerDoctorSchema = z.object({
  doctorId: z
    .string({ required_error: 'Doctor ID is required' })
    .trim()
    .regex(/^DOC-\d{3,5}$/i, 'Doctor ID must follow the format DOC-XXX (e.g. DOC-108)'),
  fullName: z
    .string({ required_error: 'Full name is required' })
    .trim()
    .min(2, 'Full name must be at least 2 characters'),
  email: z
    .string({ required_error: 'Email is required' })
    .trim()
    .email('Please provide a valid email address')
    .toLowerCase(),
  password: z
    .string({ required_error: 'Password is required' })
    .min(8, 'Password must be at least 8 characters long'),
  specialty: z
    .string({ required_error: 'Specialty is required' })
    .trim()
    .min(2, 'Specialty is required'),
  department: z
    .string({ required_error: 'Department is required' })
    .trim()
    .min(2, 'Department is required'),
  licenseNumber: z
    .string({ required_error: 'Medical license number is required' })
    .trim()
    .min(3, 'License number is required'),
  phone: z.string().trim().optional(),
  role: z.enum(['doctor', 'admin']).optional().default('doctor'),
});

module.exports = {
  loginSchema,
  registerDoctorSchema,
};
