import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { assertVisitBelongsToPatient } from './relationshipValidation.service';
import type { CreateDiagnosisInput } from '../validators/diagnosis.validator';

function cleanOptional<T extends Record<string, unknown>>(input: T): T {
  const result = { ...input };
  for (const key of Object.keys(result)) {
    if (result[key] === '') (result as Record<string, unknown>)[key] = undefined;
  }
  return result;
}

export async function createDiagnosis(input: CreateDiagnosisInput, doctorId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
  if (!patient) throw AppError.notFound('Patient not found.');
  await assertVisitBelongsToPatient(input.visitId, input.patientId);

  const data = cleanOptional(input);

  return prisma.diagnosis.create({
    data: { ...data, doctorId },
    include: { doctor: { select: { firstName: true, lastName: true } } },
  });
}
