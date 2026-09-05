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
import { notifyRole, notifyUser } from '../services/notification.service';

// --- Validators -----------------------------------------------------------

const createLabRequestSchema = z.object({
  patientId: z.string().min(1),
  visitId: z.string().optional(),
  testName: z.string().trim().min(1, 'Test name is required').max(200),
  priority: z.enum(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
  clinicalNotes: z.string().trim().max(1000).optional().or(z.literal('')),
});

const updateLabRequestStatusSchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']),
});

const createLabResultSchema = z.object({
  labRequestId: z.string().min(1),
  resultData: z.string().trim().min(1, 'Result data is required').max(5000),
  remarks: z.string().trim().max(1000).optional().or(z.literal('')),
});

const listLabRequestsQuerySchema = z.object({
  status: z.enum(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(50),
});

type CreateLabRequestInput = z.infer<typeof createLabRequestSchema>;
type UpdateLabRequestStatusInput = z.infer<typeof updateLabRequestStatusSchema>;
type CreateLabResultInput = z.infer<typeof createLabResultSchema>;
type ListLabRequestsQuery = z.infer<typeof listLabRequestsQuerySchema>;

// --- Service ----------------------------------------------------------

async function createLabRequest(input: CreateLabRequestInput, doctorId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: input.patientId } });
  if (!patient) throw AppError.notFound('Patient not found.');
  await assertVisitBelongsToPatient(input.visitId, input.patientId);

  const labRequest = await prisma.labRequest.create({
    data: { ...input, doctorId },
    include: { patient: { select: { firstName: true, lastName: true, patientNumber: true } } },
  });

  await notifyRole(Role.LAB_TECHNICIAN, {
    type: 'LAB_REQUEST_CREATED',
    title: 'New lab request',
    message: `${input.testName} requested for ${labRequest.patient.firstName} ${labRequest.patient.lastName}`,
    link: '/laboratory',
  });

  return labRequest;
}

async function listLabRequests(query: ListLabRequestsQuery) {
  const { status, page, pageSize } = query;
  const where: Prisma.LabRequestWhereInput = status ? { status } : {};

  const [total, requests] = await prisma.$transaction([
    prisma.labRequest.count({ where }),
    prisma.labRequest.findMany({
      where,
      orderBy: [{ priority: 'desc' }, { requestedAt: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        patient: { select: { firstName: true, lastName: true, patientNumber: true } },
        doctor: { select: { firstName: true, lastName: true } },
        result: true,
      },
    }),
  ]);

  return { requests, pagination: { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

// PENDING -> IN_PROGRESS -> COMPLETED, or PENDING -> CANCELLED. Same
// rationale as the prescription state machine above: without this, a
// cancelled test could be resurrected, or a pending one could skip straight
// to completed without ever being marked in progress.
const LAB_REQUEST_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

async function updateLabRequestStatus(id: string, status: UpdateLabRequestStatusInput['status']) {
  const existing = await prisma.labRequest.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Lab request not found.');

  const allowedNextStatuses = LAB_REQUEST_TRANSITIONS[existing.status] ?? [];
  if (!allowedNextStatuses.includes(status)) {
    throw AppError.badRequest(
      `Cannot change a ${existing.status.toLowerCase().replace('_', ' ')} test to ${status.toLowerCase().replace('_', ' ')}.`
    );
  }

  return prisma.labRequest.update({ where: { id }, data: { status } });
}

async function createLabResult(input: CreateLabResultInput, technicianId: string) {
  const labRequest = await prisma.labRequest.findUnique({
    where: { id: input.labRequestId },
    include: { patient: { select: { firstName: true, lastName: true } } },
  });
  if (!labRequest) throw AppError.notFound('Lab request not found.');
  if (labRequest.status !== 'IN_PROGRESS') {
    throw AppError.badRequest(
      `Cannot record a result for a ${labRequest.status.toLowerCase().replace('_', ' ')} request — start the test first.`
    );
  }

  const [result] = await prisma.$transaction([
    prisma.labResult.create({ data: { ...input, technicianId } }),
    prisma.labRequest.update({ where: { id: input.labRequestId }, data: { status: 'COMPLETED' } }),
  ]);

  await notifyUser(labRequest.doctorId, {
    type: 'LAB_RESULT_READY',
    title: 'Lab result ready',
    message: `${labRequest.testName} result is ready for ${labRequest.patient.firstName} ${labRequest.patient.lastName}`,
    link: '/laboratory',
  });

  return result;
}

// --- Controller -------------------------------------------------------

const createRequest = asyncHandler(async (req: Request<unknown, unknown, CreateLabRequestInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const labRequest = await createLabRequest(req.body, req.user.id);
  await logAudit({ userId: req.user.id, action: 'LAB_REQUEST_CREATED', resource: 'LabRequest', resourceId: labRequest.id, req });
  res.status(201).json({ success: true, message: 'Lab test requested.', data: { labRequest } });
});

const list = asyncHandler(async (req: Request<unknown, unknown, unknown, ListLabRequestsQuery>, res: Response) => {
  const result = await listLabRequests(req.query);
  res.json({ success: true, data: result });
});

const updateStatus = asyncHandler(
  async (req: Request<{ id: string }, unknown, UpdateLabRequestStatusInput>, res: Response) => {
    const labRequest = await updateLabRequestStatus(req.params.id, req.body.status);
    res.json({ success: true, message: 'Test status updated.', data: { labRequest } });
  }
);

const createResult = asyncHandler(async (req: Request<unknown, unknown, CreateLabResultInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const result = await createLabResult(req.body, req.user.id);
  await logAudit({ userId: req.user.id, action: 'LAB_RESULT_ADDED', resource: 'LabResult', resourceId: result.id, req });
  res.status(201).json({ success: true, message: 'Result recorded.', data: { result } });
});

// --- Routes -------------------------------------------------------------

const router = Router();
router.use(requireAuth());

router.get('/requests', requireRole(Role.ADMIN, Role.DOCTOR, Role.LAB_TECHNICIAN), list);
router.post('/requests', requireRole(Role.DOCTOR), validate(createLabRequestSchema), createRequest);
router.put(
  '/requests/:id/status',
  requireRole(Role.LAB_TECHNICIAN, Role.ADMIN),
  validate(updateLabRequestStatusSchema),
  updateStatus
);
router.post('/results', requireRole(Role.LAB_TECHNICIAN), validate(createLabResultSchema), createResult);

export default router;
