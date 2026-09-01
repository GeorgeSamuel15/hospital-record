import { z } from 'zod';

export const createVitalSchema = z.object({
  patientId: z.string().min(1),
  visitId: z.string().optional(),
  temperatureC: z.coerce.number().min(25).max(45).optional(),
  bloodPressureSystolic: z.coerce.number().int().min(40).max(300).optional(),
  bloodPressureDiastolic: z.coerce.number().int().min(20).max(200).optional(),
  pulseRate: z.coerce.number().int().min(20).max(300).optional(),
  respiratoryRate: z.coerce.number().int().min(5).max(80).optional(),
  oxygenSaturation: z.coerce.number().min(0).max(100).optional(),
  weightKg: z.coerce.number().min(0).max(500).optional(),
  heightCm: z.coerce.number().min(0).max(300).optional(),
});
export type CreateVitalInput = z.infer<typeof createVitalSchema>;
