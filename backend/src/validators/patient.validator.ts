import { z } from 'zod';

const phoneRegex = /^[+]?[0-9\s-()]{7,20}$/;

export const createPatientSchema = z.object({
  firstName: z.string().trim().min(1, 'First name is required').max(100),
  lastName: z.string().trim().min(1, 'Last name is required').max(100),
  dateOfBirth: z.coerce.date({ errorMap: () => ({ message: 'Enter a valid date of birth' }) }),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER'], { errorMap: () => ({ message: 'Select a gender' }) }),
  phone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number').optional().or(z.literal('')),
  email: z.string().trim().email('Enter a valid email address').optional().or(z.literal('')),
  address: z.string().trim().max(500).optional().or(z.literal('')),
  bloodGroup: z.string().trim().max(10).optional().or(z.literal('')),
  genotype: z.string().trim().max(10).optional().or(z.literal('')),
  allergies: z.string().trim().max(1000).optional().or(z.literal('')),
  emergencyContactName: z.string().trim().max(150).optional().or(z.literal('')),
  emergencyContactPhone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number').optional().or(z.literal('')),
  nextOfKinName: z.string().trim().max(150).optional().or(z.literal('')),
  nextOfKinPhone: z.string().trim().regex(phoneRegex, 'Enter a valid phone number').optional().or(z.literal('')),
});

// Same shape, but every field optional — used for PATCH-style edits.
export const updatePatientSchema = createPatientSchema.partial();

export const listPatientsQuerySchema = z.object({
  search: z.string().trim().max(200).optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  sortBy: z.enum(['createdAt', 'firstName', 'lastName', 'dateOfBirth']).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type CreatePatientInput = z.infer<typeof createPatientSchema>;
export type UpdatePatientInput = z.infer<typeof updatePatientSchema>;
export type ListPatientsQuery = z.infer<typeof listPatientsQuerySchema>;
