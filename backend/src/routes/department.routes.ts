import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit.service';

const departmentSchema = z.object({
  name: z.string().trim().min(1, 'Department name is required').max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')),
});
type DepartmentInput = z.infer<typeof departmentSchema>;

const list = asyncHandler(async (_req: Request, res: Response) => {
  const departments = await prisma.department.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { users: true } } },
  });
  res.json({ success: true, data: { departments } });
});

const create = asyncHandler(async (req: Request<unknown, unknown, DepartmentInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const department = await prisma.department.create({ data: req.body });
  await logAudit({ userId: req.user.id, action: 'DEPARTMENT_CREATED', resource: 'Department', resourceId: department.id, req });
  res.status(201).json({ success: true, message: 'Department created.', data: { department } });
});

const update = asyncHandler(async (req: Request<{ id: string }, unknown, Partial<DepartmentInput>>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const existing = await prisma.department.findUnique({ where: { id: req.params.id } });
  if (!existing) throw AppError.notFound('Department not found.');

  const department = await prisma.department.update({ where: { id: req.params.id }, data: req.body });
  await logAudit({ userId: req.user.id, action: 'DEPARTMENT_UPDATED', resource: 'Department', resourceId: department.id, req });
  res.json({ success: true, message: 'Department updated.', data: { department } });
});

const router = Router();
router.use(requireAuth());

router.get('/', list); // any authenticated role can view (needed for dropdowns everywhere)
router.post('/', requireRole(Role.ADMIN), validate(departmentSchema), create);
router.put('/:id', requireRole(Role.ADMIN), validate(departmentSchema.partial()), update);

export default router;
