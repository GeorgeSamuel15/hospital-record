import { Request, Response, Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit.service';
import { createVisit, getVisitById } from '../services/visit.service';
import { createVisitSchema, CreateVisitInput } from '../validators/visit.validator';

// --- Controller -----------------------------------------------------------

const create = asyncHandler(async (req: Request<unknown, unknown, CreateVisitInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const visit = await createVisit(req.body, req.user.id);
  await logAudit({ userId: req.user.id, action: 'VISIT_CREATED', resource: 'Visit', resourceId: visit.id, req });
  res.status(201).json({ success: true, message: 'Consultation recorded.', data: { visit } });
});

const getById = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const visit = await getVisitById(req.params.id);
  res.json({ success: true, data: { visit } });
});

// --- Routes -----------------------------------------------------------

const router = Router();
router.use(requireAuth());

router.post('/', requireRole(Role.DOCTOR), validate(createVisitSchema), create);
router.get('/:id', requireRole(Role.ADMIN, Role.DOCTOR, Role.NURSE), getById);

export default router;
