import { Request, Response, Router } from 'express';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit.service';
import { notifyUser } from '../services/notification.service';
import {
  createAppointmentSchema,
  updateAppointmentSchema,
  CreateAppointmentInput,
  ListAppointmentsQuery,
  UpdateAppointmentInput,
} from '../validators/appointment.validator';

// --- Service ----------------------------------------------------------

const NON_BLOCKING_STATUSES = ['CANCELLED', 'NO_SHOW'] as const;

async function assertNoDoctorConflict(doctorId: string, scheduledAt: Date, excludeAppointmentId?: string) {
  const settings = await prisma.systemSetting.findFirst();
  const slotMinutes = settings?.appointmentSlotMinutes ?? 30;
  const slotMs = slotMinutes * 60 * 1000;

  // Two appointments conflict if their slots overlap at all. Since every
  // appointment is treated as occupying [scheduledAt, scheduledAt + slot),
  // it's enough to look for any other non-cancelled appointment for this
  // doctor whose slot start falls within one slot-width of the requested time.
  const windowStart = new Date(scheduledAt.getTime() - slotMs + 1);
  const windowEnd = new Date(scheduledAt.getTime() + slotMs - 1);

  const conflict = await prisma.appointment.findFirst({
    where: {
      doctorId,
      scheduledAt: { gte: windowStart, lte: windowEnd },
      status: { notIn: [...NON_BLOCKING_STATUSES] },
      ...(excludeAppointmentId ? { id: { not: excludeAppointmentId } } : {}),
    },
  });

  if (conflict) {
    throw AppError.conflict(
      `This doctor already has an appointment at ${conflict.scheduledAt.toLocaleString()}. Choose a different time.`
    );
  }
}

async function createAppointment(input: CreateAppointmentInput, scheduledById: string) {
  const [patient, doctor] = await Promise.all([
    prisma.patient.findUnique({ where: { id: input.patientId } }),
    prisma.user.findUnique({ where: { id: input.doctorId } }),
  ]);
  if (!patient) throw AppError.notFound('Patient not found.');
  if (!doctor || doctor.role !== Role.DOCTOR) throw AppError.badRequest('Selected doctor is invalid.');

  await assertNoDoctorConflict(input.doctorId, input.scheduledAt);

  const appointment = await prisma.appointment.create({
    data: input,
    include: { patient: { select: { firstName: true, lastName: true, patientNumber: true } }, doctor: { select: { firstName: true, lastName: true } }, department: true },
  });

  // Only notify the doctor if someone else scheduled it on their behalf —
  // no point notifying a doctor about an appointment they booked themselves.
  await notifyUser(
    input.doctorId,
    {
      type: 'APPOINTMENT_ASSIGNED',
      title: 'New appointment',
      message: `${appointment.patient.firstName} ${appointment.patient.lastName} — ${new Date(appointment.scheduledAt).toLocaleString()}`,
      link: '/appointments',
    },
    scheduledById
  );

  return appointment;
}

async function listAppointments(query: ListAppointmentsQuery) {
  const { from, to, status, doctorId, patientId, page, pageSize } = query;

  const where: Prisma.AppointmentWhereInput = {
    ...(status ? { status } : {}),
    ...(doctorId ? { doctorId } : {}),
    ...(patientId ? { patientId } : {}),
    ...(from || to ? { scheduledAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const [total, appointments] = await prisma.$transaction([
    prisma.appointment.count({ where }),
    prisma.appointment.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        patient: { select: { firstName: true, lastName: true, patientNumber: true } },
        doctor: { select: { firstName: true, lastName: true } },
        department: true,
      },
    }),
  ]);

  return { appointments, pagination: { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

async function updateAppointment(id: string, input: UpdateAppointmentInput) {
  const existing = await prisma.appointment.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Appointment not found.');

  // Rescheduling to a new time is just as capable of creating a
  // double-booking as creating a fresh appointment — check it the same way.
  if (input.scheduledAt) {
    await assertNoDoctorConflict(existing.doctorId, input.scheduledAt, id);
  }

  return prisma.appointment.update({ where: { id }, data: input });
}

// --- Controller -------------------------------------------------------

const create = asyncHandler(async (req: Request<unknown, unknown, CreateAppointmentInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const appointment = await createAppointment(req.body, req.user.id);
  await logAudit({ userId: req.user.id, action: 'APPOINTMENT_CREATED', resource: 'Appointment', resourceId: appointment.id, req });
  res.status(201).json({ success: true, message: 'Appointment scheduled.', data: { appointment } });
});

const list = asyncHandler(async (req: Request<unknown, unknown, unknown, ListAppointmentsQuery>, res: Response) => {
  const result = await listAppointments(req.query);
  res.json({ success: true, data: result });
});

const update = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateAppointmentInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const appointment = await updateAppointment(req.params.id, req.body);
  await logAudit({ userId: req.user.id, action: 'APPOINTMENT_UPDATED', resource: 'Appointment', resourceId: appointment.id, req });
  res.json({ success: true, message: 'Appointment updated.', data: { appointment } });
});

// --- Routes -------------------------------------------------------------
// Receptionists schedule/reschedule/cancel; doctors and admins can too.

const router = Router();
router.use(requireAuth());

const canManage = requireRole(Role.ADMIN, Role.RECEPTIONIST, Role.DOCTOR, Role.NURSE);

router.get('/', list);
router.post('/', canManage, validate(createAppointmentSchema), create);
router.put('/:id', canManage, validate(updateAppointmentSchema), update);

export default router;
