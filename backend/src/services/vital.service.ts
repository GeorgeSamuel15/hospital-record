import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { assertVisitBelongsToPatient } from './relationshipValidation.service';
import type { CreateVitalInput } from '../validators/vital.validator';

export async function createVital(input: CreateVitalInput, recordedById: string) {
  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
  if (!patient) throw AppError.notFound('Patient not found.');
  await assertVisitBelongsToPatient(input.visitId, input.patientId);

  return prisma.vital.create({
    data: { ...input, recordedById },
    include: { recordedBy: { select: { firstName: true, lastName: true } } },
  });
}

export async function listVitalsForPatient(patientId: string) {
  return prisma.vital.findMany({
    where: { patientId },
    orderBy: { recordedAt: 'desc' },
    include: { recordedBy: { select: { firstName: true, lastName: true } } },
  });
}
