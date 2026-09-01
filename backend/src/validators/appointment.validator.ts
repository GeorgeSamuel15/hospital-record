import { z } from 'zod';

export const createAppointmentSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1),
  departmentId: z.string().optional(),
  scheduledAt: z.coerce.date({ errorMap: () => ({ message: 'Enter a valid date/time' }) }),
  reason: z.string().trim().min(1, 'Reason is required').max(500),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const updateAppointmentSchema = z.object({
  scheduledAt: z.coerce.date().optional(),
  reason: z.string().trim().min(1).max(500).optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  notes: z.string().trim().max(1000).optional().or(z.literal('')),
});

export const listAppointmentsQuerySchema = z.object({
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  status: z.enum(['SCHEDULED', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW']).optional(),
  doctorId: z.string().optional(),
  patientId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

export type CreateAppointmentInput = z.infer<typeof createAppointmentSchema>;
export type UpdateAppointmentInput = z.infer<typeof updateAppointmentSchema>;
export type ListAppointmentsQuery = z.infer<typeof listAppointmentsQuerySchema>;
