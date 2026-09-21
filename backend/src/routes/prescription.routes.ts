import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit.service';
import { assertVisitBelongsToPatient } from '../services/relationshipValidation.service';
import { notifyRoles, notifyUsers } from '../services/notification.service';

// --- Validators -----------------------------------------------------------

const prescriptionItemSchema = z.object({
  medication: z.string().trim().min(1, 'Medication is required').max(200),
  dosage: z.string().trim().min(1, 'Dosage is required').max(100),
  frequency: z.string().trim().min(1, 'Frequency is required').max(100),
  duration: z.string().trim().min(1, 'Duration is required').max(100),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1'),
  instructions: z.string().trim().max(500).optional().or(z.literal('')),
});

const createPrescriptionSchema = z.object({
  patientId: z.string().min(1),
  visitId: z.string().optional(),
  items: z.array(prescriptionItemSchema).min(1, 'Add at least one medication'),
});

const updatePrescriptionStatusSchema = z.object({
  status: z.enum(['PENDING', 'DISPENSED', 'CANCELLED', 'COMPLETED']),
});

const listPrescriptionsQuerySchema = z.object({
  status: z.enum(['PENDING', 'DISPENSED', 'CANCELLED', 'COMPLETED']).optional(),
  patientId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

type CreatePrescriptionInput = z.infer<typeof createPrescriptionSchema>;
type UpdatePrescriptionStatusInput = z.infer<typeof updatePrescriptionStatusSchema>;
type ListPrescriptionsQuery = z.infer<typeof listPrescriptionsQuerySchema>;

// --- Service ----------------------------------------------------------

async function createPrescription(input: CreatePrescriptionInput, doctorId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
  if (!patient) throw AppError.notFound('Patient not found.');
  await assertVisitBelongsToPatient(input.visitId, input.patientId);

  return prisma.prescription.create({
    data: {
      patientId: input.patientId,
      visitId: input.visitId,
      doctorId,
      items: { create: input.items },
    },
    include: { items: true, patient: { select: { firstName: true, lastName: true, patientNumber: true } } },
  });
}

async function listPrescriptions(query: ListPrescriptionsQuery) {
  const { status, patientId, page, pageSize } = query;
  const where: Prisma.PrescriptionWhereInput = { ...(status ? { status } : {}), ...(patientId ? { patientId } : {}) };

  const [total, prescriptions] = await prisma.$transaction([
    prisma.prescription.count({ where }),
    prisma.prescription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        items: true,
        patient: { select: { firstName: true, lastName: true, patientNumber: true } },
        doctor: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  return { prescriptions, pagination: { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

// Explicit state machine: PENDING -> DISPENSED -> COMPLETED, or PENDING ->
// CANCELLED. Anything not listed here is rejected — this is what actually
// prevents a dispensed prescription from being flipped back to pending, or
// a pending one from jumping straight to completed without ever being
// recorded as dispensed.
const PRESCRIPTION_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['DISPENSED', 'CANCELLED'],
  DISPENSED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

async function updatePrescriptionStatus(id: string, status: UpdatePrescriptionStatusInput['status'], dispensedById: string) {
  const existing = await prisma.prescription.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Prescription not found.');

  const allowedNextStatuses = PRESCRIPTION_TRANSITIONS[existing.status] ?? [];
  if (!allowedNextStatuses.includes(status)) {
    throw AppError.badRequest(
      `Cannot change a ${existing.status.toLowerCase()} prescription to ${status.toLowerCase()}.`
    );
  }

  return prisma.prescription.update({
    where: { id },
    data: {
      status,
      ...(status === 'DISPENSED' ? { dispensedById, dispensedAt: new Date() } : {}),
    },
  });
}

// --- Controller -------------------------------------------------------

const create = asyncHandler(async (req: Request<unknown, unknown, CreatePrescriptionInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const prescription = await createPrescription(req.body, req.user.id);
  await notifyRoles(
    [Role.PHARMACIST],
    {
      type: 'PRESCRIPTION_CREATED',
      title: 'New prescription',
      message: `A new prescription is ready for ${prescription.patient.firstName} ${prescription.patient.lastName} (${prescription.patient.patientNumber}).`,
      link: '/prescriptions',
    },
    req.user.id
  );
  await logAudit({ userId: req.user.id, action: 'PRESCRIPTION_CREATED', resource: 'Prescription', resourceId: prescription.id, req });
  res.status(201).json({ success: true, message: 'Prescription created.', data: { prescription } });
});

const list = asyncHandler(async (req: Request<unknown, unknown, unknown, ListPrescriptionsQuery>, res: Response) => {
  const result = await listPrescriptions(req.query);
  res.json({ success: true, data: result });
});

const updateStatus = asyncHandler(
  async (req: Request<{ id: string }, unknown, UpdatePrescriptionStatusInput>, res: Response) => {
    if (!req.user) throw AppError.unauthorized();
    const prescription = await updatePrescriptionStatus(req.params.id, req.body.status, req.user.id);
    if (req.body.status === 'DISPENSED') {
      await notifyUsers([prescription.doctorId], {
        type: 'PRESCRIPTION_DISPENSED',
        title: 'Prescription dispensed',
        message: 'A prescription you created has been dispensed by the pharmacy.',
        link: '/prescriptions',
      });
      await logAudit({ userId: req.user.id, action: 'PRESCRIPTION_DISPENSED', resource: 'Prescription', resourceId: prescription.id, req });
    }
    res.json({ success: true, message: 'Prescription updated.', data: { prescription } });
  }
);

// --- Routes -------------------------------------------------------------

const router = Router();
router.use(requireAuth());

router.get('/', requireRole(Role.ADMIN, Role.DOCTOR, Role.PHARMACIST), validate(listPrescriptionsQuerySchema, 'query'), list);
router.post('/', requireRole(Role.DOCTOR), validate(createPrescriptionSchema), create);
router.put('/:id', requireRole(Role.PHARMACIST, Role.ADMIN), validate(updatePrescriptionStatusSchema), updateStatus);

export default router;
