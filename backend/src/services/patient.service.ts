import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';
import { generatePatientNumber } from './idSequence.service';
import type { CreatePatientInput, ListPatientsQuery, UpdatePatientInput } from '../validators/patient.validator';

/** Strips empty-string fields (from optional form inputs) down to undefined. */
function cleanOptional<T extends Record<string, unknown>>(input: T): T {
  const result = { ...input };
  for (const key of Object.keys(result)) {
    if (result[key] === '') (result as Record<string, unknown>)[key] = undefined;
  }
  return result;
}

export async function createPatient(input: CreatePatientInput, registeredById: string) {
  const data = cleanOptional(input);
  const patientNumber = await generatePatientNumber();

  return prisma.patient.create({
    data: { ...data, patientNumber, registeredById },
  });
}

export async function listPatients(query: ListPatientsQuery) {
  const { search, gender, sortBy, sortOrder, page, pageSize } = query;

  const where: Prisma.PatientWhereInput = {
    ...(gender ? { gender } : {}),
    ...(search
      ? {
          OR: [
            { patientNumber: { contains: search, mode: 'insensitive' } },
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { phone: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, patients] = await prisma.$transaction([
    prisma.patient.count({ where }),
    prisma.patient.findMany({
      where,
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        patientNumber: true,
        firstName: true,
        lastName: true,
        dateOfBirth: true,
        gender: true,
        phone: true,
        email: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    patients,
    pagination: { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) },
  };
}

// Field projections per role, per the audit's data-minimization requirement.
// getPatientById(id) alone (no role) is kept for internal use by other
// services that need the full record for legitimate reasons (e.g. checking
// FK existence) — HTTP callers must always go through getPatientForRole.
const FRONT_DESK_SELECT = {
  id: true,
  patientNumber: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  gender: true,
  phone: true,
  email: true,
  address: true,
  emergencyContactName: true,
  emergencyContactPhone: true,
  nextOfKinName: true,
  nextOfKinPhone: true,
  createdAt: true,
  updatedAt: true,
} as const;

const LAB_SELECT = {
  id: true,
  patientNumber: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  gender: true,
  bloodGroup: true,
  createdAt: true,
} as const;

const PHARMACY_SELECT = {
  id: true,
  patientNumber: true,
  firstName: true,
  lastName: true,
  dateOfBirth: true,
  gender: true,
  allergies: true, // safety-critical for dispensing — deliberately included
  createdAt: true,
} as const;

export async function getPatientById(id: string) {
  const patient = await prisma.patient.findUnique({ where: { id } });
  if (!patient) throw AppError.notFound('Patient not found.');
  return patient;
}

/**
 * Role-based projection for the GET /patients/:id endpoint. Admin/Doctor/
 * Nurse get the full record (they need it for care and administration);
 * every other role gets only the fields relevant to their job, per the
 * spec's explicit role-permission table.
 */
export async function getPatientForRole(id: string, role: Role) {
  if (role === Role.ADMIN || role === Role.DOCTOR || role === Role.NURSE) {
    return getPatientById(id);
  }

  const select = role === Role.RECEPTIONIST ? FRONT_DESK_SELECT : role === Role.LAB_TECHNICIAN ? LAB_SELECT : PHARMACY_SELECT;

  const patient = await prisma.patient.findUnique({ where: { id }, select });
  if (!patient) throw AppError.notFound('Patient not found.');
  return patient;
}

/** Full clinical picture for the patient profile screen. */
export async function getPatientOverview(id: string) {
  const patient = await getPatientById(id);

  const [latestVital, recentDiagnoses, currentPrescriptions, recentLabResults] = await Promise.all([
    prisma.vital.findFirst({ where: { patientId: id }, orderBy: { recordedAt: 'desc' } }),
    prisma.diagnosis.findMany({
      where: { patientId: id },
      orderBy: { diagnosedAt: 'desc' },
      take: 5,
      include: { doctor: { select: { firstName: true, lastName: true } } },
    }),
    prisma.prescription.findMany({
      where: { patientId: id, status: { in: ['PENDING', 'DISPENSED'] } },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: { items: true, doctor: { select: { firstName: true, lastName: true } } },
    }),
    prisma.labRequest.findMany({
      where: { patientId: id, status: 'COMPLETED' },
      orderBy: { requestedAt: 'desc' },
      take: 5,
      include: { result: true },
    }),
  ]);

  return { patient, latestVital, recentDiagnoses, currentPrescriptions, recentLabResults };
}

export async function getPatientMedicalHistory(id: string) {
  await getPatientById(id); // 404s if missing

  const [visits, vitals, diagnoses, prescriptions, labRequests, admissions, appointments] = await Promise.all([
    prisma.visit.findMany({
      where: { patientId: id },
      orderBy: { visitDate: 'desc' },
      include: { doctor: { select: { firstName: true, lastName: true } } },
    }),
    prisma.vital.findMany({ where: { patientId: id }, orderBy: { recordedAt: 'desc' } }),
    prisma.diagnosis.findMany({
      where: { patientId: id },
      orderBy: { diagnosedAt: 'desc' },
      include: { doctor: { select: { firstName: true, lastName: true } } },
    }),
    prisma.prescription.findMany({
      where: { patientId: id },
      orderBy: { createdAt: 'desc' },
      include: { items: true, doctor: { select: { firstName: true, lastName: true } } },
    }),
    prisma.labRequest.findMany({
      where: { patientId: id },
      orderBy: { requestedAt: 'desc' },
      include: { result: true, doctor: { select: { firstName: true, lastName: true } } },
    }),
    prisma.admission.findMany({
      where: { patientId: id },
      orderBy: { admissionDate: 'desc' },
      include: { admittingDoctor: { select: { firstName: true, lastName: true } } },
    }),
    prisma.appointment.findMany({
      where: { patientId: id },
      orderBy: { scheduledAt: 'desc' },
      include: { doctor: { select: { firstName: true, lastName: true } }, department: true },
    }),
  ]);

  return { visits, vitals, diagnoses, prescriptions, labRequests, admissions, appointments };
}

export async function updatePatient(id: string, input: UpdatePatientInput) {
  await getPatientById(id); // 404s if missing
  const data = cleanOptional(input);
  return prisma.patient.update({ where: { id }, data });
}
