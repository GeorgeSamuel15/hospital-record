import { Request, Response, Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit.service';
import { createVital, listVitalsForPatient } from '../services/vital.service';
import { createVitalSchema, CreateVitalInput } from '../validators/vital.validator';

const create = asyncHandler(async (req: Request<unknown, unknown, CreateVitalInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const vital = await createVital(req.body, req.user.id);
  await logAudit({ userId: req.user.id, action: 'VITALS_RECORDED', resource: 'Vital', resourceId: vital.id, req });
  res.status(201).json({ success: true, message: 'Vitals recorded.', data: { vital } });
});

const listForPatient = asyncHandler(async (req: Request<{ patientId: string }>, res: Response) => {
  const vitals = await listVitalsForPatient(req.params.patientId);
  res.json({ success: true, data: { vitals } });
});

const router = Router();
router.use(requireAuth());

// Nurses record vitals routinely; doctors and admins can too.
router.post('/', requireRole(Role.NURSE, Role.DOCTOR, Role.ADMIN), validate(createVitalSchema), create);
router.get('/patient/:patientId', requireRole(Role.ADMIN, Role.DOCTOR, Role.NURSE), listForPatient);

export default router;
