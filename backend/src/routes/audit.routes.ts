import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

const listAuditLogsQuerySchema = z.object({
  action: z.string().optional(),
  resource: z.string().optional(),
  userId: z.string().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
});
type ListAuditLogsQuery = z.infer<typeof listAuditLogsQuerySchema>;

const list = asyncHandler(async (req: Request<unknown, unknown, unknown, ListAuditLogsQuery>, res: Response) => {
  const { action, resource, userId, from, to, page, pageSize } = req.query;

  const where: Prisma.AuditLogWhereInput = {
    ...(action ? { action } : {}),
    ...(resource ? { resource } : {}),
    ...(userId ? { userId } : {}),
    ...(from || to ? { createdAt: { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) } } : {}),
  };

  const [total, logs] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { user: { select: { firstName: true, lastName: true, email: true, role: true } } },
    }),
  ]);

  res.json({
    success: true,
    data: { logs, pagination: { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) } },
  });
});

const router = Router();
router.use(requireAuth(), requireRole(Role.ADMIN));
router.get('/', validate(listAuditLogsQuerySchema, 'query'), list);

export default router;
