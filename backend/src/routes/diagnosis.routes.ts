import { Request, Response, Router } from 'express';
import { Role } from '@prisma/client';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit.service';
import { createDiagnosis } from '../services/diagnosis.service';
import { createDiagnosisSchema, CreateDiagnosisInput } from '../validators/diagnosis.validator';

const create = asyncHandler(async (req: Request<unknown, unknown, CreateDiagnosisInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const diagnosis = await createDiagnosis(req.body, req.user.id);
  await logAudit({ userId: req.user.id, action: 'DIAGNOSIS_CREATED', resource: 'Diagnosis', resourceId: diagnosis.id, req });
  res.status(201).json({ success: true, message: 'Diagnosis recorded.', data: { diagnosis } });
});

const router = Router();
router.use(requireAuth());

router.post('/', requireRole(Role.DOCTOR), validate(createDiagnosisSchema), create);

export default router;
