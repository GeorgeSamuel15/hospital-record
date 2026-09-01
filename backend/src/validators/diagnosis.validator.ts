import { z } from 'zod';

export const createDiagnosisSchema = z.object({
  patientId: z.string().min(1),
  visitId: z.string().optional(),
  diagnosis: z.string().trim().min(1, 'Diagnosis is required').max(300),
  description: z.string().trim().max(2000).optional().or(z.literal('')),
});
export type CreateDiagnosisInput = z.infer<typeof createDiagnosisSchema>;
