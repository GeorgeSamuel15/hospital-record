import { z } from 'zod';

export const createVisitSchema = z.object({
  patientId: z.string().min(1),
  appointmentId: z.string().optional(),
  chiefComplaint: z.string().trim().min(1, 'Chief complaint is required').max(1000),
  historyOfPresentIllness: z.string().trim().max(2000).optional().or(z.literal('')),
  examination: z.string().trim().max(2000).optional().or(z.literal('')),
  assessment: z.string().trim().max(2000).optional().or(z.literal('')),
  treatmentPlan: z.string().trim().max(2000).optional().or(z.literal('')),
  notes: z.string().trim().max(2000).optional().or(z.literal('')),
});
export type CreateVisitInput = z.infer<typeof createVisitSchema>;
