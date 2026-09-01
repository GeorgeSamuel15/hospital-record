import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth } from '../middleware/auth';
import { validate } from '../middleware/validate';

const directoryQuerySchema = z.object({
  role: z.enum(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST']).optional(),
});
type DirectoryQuery = z.infer<typeof directoryQuerySchema>;

// Intentionally returns only the minimal fields needed to populate a
// dropdown (id, name, role, department) — never contact info, employee ID,
// or account status. Any authenticated role can call this (e.g. a
// receptionist scheduling a doctor, or a doctor requesting a lab test).
const list = asyncHandler(async (req: Request<unknown, unknown, unknown, DirectoryQuery>, res: Response) => {
  const staff = await prisma.user.findMany({
    where: { isActive: true, ...(req.query.role ? { role: req.query.role as Role } : {}) },
    select: { id: true, firstName: true, lastName: true, role: true, department: { select: { id: true, name: true } } },
    orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
  });
  res.json({ success: true, data: { staff } });
});

const router = Router();
router.use(requireAuth());
router.get('/', validate(directoryQuerySchema, 'query'), list);

export default router;
