import { prisma } from '../config/prisma';

/**
 * Atomically increments (or creates, starting at 1) a named counter and
 * returns the new value — a single round trip, with Postgres itself
 * guaranteeing atomicity under concurrent calls. This replaces the previous
 * `prisma.patient.count() + 1` approach, which relied on catching a unique
 * constraint violation and retrying rather than avoiding the race in the
 * first place.
 */
export async function nextSequenceValue(name: string): Promise<number> {
  const rows = await prisma.$queryRaw<{ value: number }[]>`
    INSERT INTO "IdSequence" (name, value)
    VALUES (${name}, 1)
    ON CONFLICT (name)
    DO UPDATE SET value = "IdSequence".value + 1
    RETURNING value;
  `;
  return rows[0].value;
}

export async function generatePatientNumber(): Promise<string> {
  const value = await nextSequenceValue('patientNumber');
  return `PAT-${String(value).padStart(6, '0')}`;
}

export async function generateEmployeeId(): Promise<string> {
  const value = await nextSequenceValue('employeeId');
  return `EMP-${String(value).padStart(6, '0')}`;
}
