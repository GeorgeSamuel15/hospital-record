import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import type { CreateVisitInput } from '../validators/visit.validator';

function cleanOptional<T extends Record<string, unknown>>(input: T): T {
  const result = { ...input };
  for (const key of Object.keys(result)) {
    if (result[key] === '') (result as Record<string, unknown>)[key] = undefined;
  }
  return result;
}

export async function createVisit(input: CreateVisitInput, doctorId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
  if (!patient) throw AppError.notFound('Patient not found.');

  const data = cleanOptional(input);

  return prisma.visit.create({
    data: { ...data, doctorId },
    include: { doctor: { select: { firstName: true, lastName: true } } },
  });
}

export async function getVisitById(id: string) {
  const visit = await prisma.visit.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, patientNumber: true, firstName: true, lastName: true } },
      doctor: { select: { firstName: true, lastName: true } },
      vitals: true,
      diagnoses: true,
      prescriptions: { include: { items: true } },
      labRequests: { include: { result: true } },
    },
  });
  if (!visit) throw AppError.notFound('Visit not found.');
  return visit;
}
