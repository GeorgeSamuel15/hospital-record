import { Request, Response, Router } from 'express';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, requireRole } from '../middleware/auth';

function startOfDay(d = new Date()) {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}
function endOfDay(d = new Date()) {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

const getSummary = asyncHandler(async (_req: Request, res: Response) => {
  const todayStart = startOfDay();
  const todayEnd = endOfDay();

  const [
    totalPatients,
    todaysAppointments,
    activeAdmissions,
    pendingLabTests,
    activePrescriptions,
    doctorCount,
    nurseCount,
    staffCount,
  ] = await Promise.all([
    prisma.patient.count(),
    prisma.appointment.count({ where: { scheduledAt: { gte: todayStart, lte: todayEnd } } }),
    prisma.admission.count({ where: { status: 'ADMITTED' } }),
    prisma.labRequest.count({ where: { status: { in: ['PENDING', 'IN_PROGRESS'] } } }),
    prisma.prescription.count({ where: { status: 'PENDING' } }),
    prisma.user.count({ where: { role: Role.DOCTOR, isActive: true } }),
    prisma.user.count({ where: { role: Role.NURSE, isActive: true } }),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  res.json({
    success: true,
    data: {
      totalPatients,
      todaysAppointments,
      activeAdmissions,
      pendingLabTests,
      activePrescriptions,
      doctorCount,
      nurseCount,
      staffCount,
    },
  });
});

/** Patient registrations per day for the last 14 days — powers the trend chart. */
const getRegistrationTrend = asyncHandler(async (_req: Request, res: Response) => {
  const since = new Date();
  since.setDate(since.getDate() - 13);
  since.setHours(0, 0, 0, 0);

  const patients = await prisma.patient.findMany({
    where: { createdAt: { gte: since } },
    select: { createdAt: true },
  });

  const counts = new Map<string, number>();
  for (let i = 0; i < 14; i++) {
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    counts.set(d.toISOString().slice(0, 10), 0);
  }
  for (const p of patients) {
    const key = p.createdAt.toISOString().slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  res.json({ success: true, data: { trend: Array.from(counts, ([date, count]) => ({ date, count })) } });
});

const getTodaysSchedule = asyncHandler(async (_req: Request, res: Response) => {
  const appointments = await prisma.appointment.findMany({
    where: { scheduledAt: { gte: startOfDay(), lte: endOfDay() } },
    orderBy: { scheduledAt: 'asc' },
    include: {
      patient: { select: { firstName: true, lastName: true, patientNumber: true } },
      doctor: { select: { firstName: true, lastName: true } },
    },
    take: 10,
  });
  res.json({ success: true, data: { appointments } });
});

const getPendingLabTests = asyncHandler(async (_req: Request, res: Response) => {
  const labRequests = await prisma.labRequest.findMany({
    where: { status: { in: ['PENDING', 'IN_PROGRESS'] } },
    orderBy: [{ priority: 'desc' }, { requestedAt: 'asc' }],
    include: { patient: { select: { firstName: true, lastName: true, patientNumber: true } } },
    take: 10,
  });
  res.json({ success: true, data: { labRequests } });
});

const getRecentActivity = asyncHandler(async (_req: Request, res: Response) => {
  const logs = await prisma.auditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 15,
    include: { user: { select: { firstName: true, lastName: true, role: true } } },
  });
  res.json({ success: true, data: { logs } });
});

const router = Router();
router.use(requireAuth());

router.get('/summary', getSummary);
router.get('/registration-trend', getRegistrationTrend);
router.get('/todays-schedule', getTodaysSchedule);
router.get('/pending-lab-tests', getPendingLabTests);
// Recent activity surfaces the raw audit trail (who viewed which patient,
// logins, staff changes) — admin-only, unlike the other dashboard widgets
// above which are legitimately useful to every role.
router.get('/recent-activity', requireRole(Role.ADMIN), getRecentActivity);

export default router;
