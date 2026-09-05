import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit.service';
import { notifyRole } from '../services/notification.service';

// --- Validators -----------------------------------------------------------

const createAdmissionSchema = z.object({
  patientId: z.string().min(1),
  doctorId: z.string().min(1, 'An admitting doctor must be selected'),
  ward: z.string().trim().min(1, 'Ward is required').max(100),
  room: z.string().trim().min(1, 'Room is required').max(50),
  bed: z.string().trim().min(1, 'Bed is required').max(50),
  reason: z.string().trim().min(1, 'Reason is required').max(1000),
});

const dischargeAdmissionSchema = z.object({
  dischargeDiagnosis: z.string().trim().max(500).optional().or(z.literal('')),
  dischargeNotes: z.string().trim().max(2000).optional().or(z.literal('')),
});

const listAdmissionsQuerySchema = z.object({
  status: z.enum(['ADMITTED', 'DISCHARGED', 'TRANSFERRED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

type CreateAdmissionInput = z.infer<typeof createAdmissionSchema>;
type DischargeAdmissionInput = z.infer<typeof dischargeAdmissionSchema>;
type ListAdmissionsQuery = z.infer<typeof listAdmissionsQuerySchema>;

// --- Service ----------------------------------------------------------

async function admitPatient(input: CreateAdmissionInput) {
  const [patient, doctor] = await Promise.all([
    prisma.patient.findUnique({ where: { id: input.patientId } }),
    prisma.user.findUnique({ where: { id: input.doctorId } }),
  ]);
  if (!patient) throw AppError.notFound('Patient not found.');
  // The admitting doctor must actually be a doctor — this is a clinically
  // meaningful field, independent of who is physically submitting the form
  // (a nurse or admin may be the one filling it in on the doctor's behalf).
  if (!doctor || doctor.role !== Role.DOCTOR) {
    throw AppError.badRequest('The selected admitting doctor is invalid.');
  }

  const alreadyAdmitted = await prisma.admission.findFirst({ where: { patientId: input.patientId, status: 'ADMITTED' } });
  if (alreadyAdmitted) throw AppError.conflict('This patient already has an active admission.');

  const { doctorId, ...rest } = input;
  const admission = await prisma.admission.create({
    data: { ...rest, admittingDoctorId: doctorId },
    include: { patient: { select: { firstName: true, lastName: true, patientNumber: true } } },
  });

  await notifyRole(Role.ADMIN, {
    type: 'ADMISSION_CREATED',
    title: 'New admission',
    message: `${admission.patient.firstName} ${admission.patient.lastName} admitted to ${admission.ward}, room ${admission.room}`,
    link: '/admissions',
  });

  return admission;
}

async function listAdmissions(query: ListAdmissionsQuery) {
  const { status, page, pageSize } = query;
  const where: Prisma.AdmissionWhereInput = status ? { status } : {};

  const [total, admissions] = await prisma.$transaction([
    prisma.admission.count({ where }),
    prisma.admission.findMany({
      where,
      orderBy: { admissionDate: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        patient: { select: { firstName: true, lastName: true, patientNumber: true } },
        admittingDoctor: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return { admissions, pagination: { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

async function dischargePatient(id: string, input: DischargeAdmissionInput, dischargedById: string) {
  const admission = await prisma.admission.findUnique({ where: { id } });
  if (!admission) throw AppError.notFound('Admission not found.');
  if (admission.status !== 'ADMITTED') throw AppError.badRequest('This patient is not currently admitted.');

  return prisma.admission.update({
    where: { id },
    data: { ...input, status: 'DISCHARGED', dischargeDate: new Date(), dischargedById },
  });
}

// --- Controller -------------------------------------------------------

const create = asyncHandler(async (req: Request<unknown, unknown, CreateAdmissionInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const admission = await admitPatient(req.body);
  await logAudit({ userId: req.user.id, action: 'ADMISSION_CREATED', resource: 'Admission', resourceId: admission.id, req });
  res.status(201).json({ success: true, message: 'Patient admitted.', data: { admission } });
});

const list = asyncHandler(async (req: Request<unknown, unknown, unknown, ListAdmissionsQuery>, res: Response) => {
  const result = await listAdmissions(req.query);
  res.json({ success: true, data: result });
});

const discharge = asyncHandler(async (req: Request<{ id: string }, unknown, DischargeAdmissionInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const admission = await dischargePatient(req.params.id, req.body, req.user.id);
  await logAudit({ userId: req.user.id, action: 'ADMISSION_DISCHARGED', resource: 'Admission', resourceId: admission.id, req });
  res.json({ success: true, message: 'Patient discharged.', data: { admission } });
});

// --- Routes -------------------------------------------------------------

const router = Router();
router.use(requireAuth());

const canManage = requireRole(Role.ADMIN, Role.DOCTOR, Role.NURSE);

router.get('/', list);
router.post('/', canManage, validate(createAdmissionSchema), create);
router.put('/:id/discharge', canManage, validate(dischargeAdmissionSchema), discharge);

export default router;
