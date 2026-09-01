import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

/**
 * Guards against cross-patient data corruption: a client could otherwise
 * submit `patientId: A, visitId: <belongs to patient B>` and Prisma's
 * foreign key alone would happily accept it (it only confirms the visit
 * exists, not that it belongs to the same patient). Call this before
 * creating any record that references both a patient and an optional visit.
 */
export async function assertVisitBelongsToPatient(visitId: string | undefined, patientId: string): Promise<void> {
  if (!visitId) return;

  const visit = await prisma.visit.findUnique({ where: { id: visitId }, select: { patientId: true } });
  if (!visit) throw AppError.notFound('The specified visit was not found.');
  if (visit.patientId !== patientId) {
    throw AppError.badRequest('The specified visit does not belong to this patient.');
  }
}
