import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { Prisma, Role } from '@prisma/client';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit.service';
import { sendStaffWelcomeEmail } from '../services/email.service';
import { generateEmployeeId } from '../services/idSequence.service';
import { hashPassword } from '../utils/password';

// --- Validators -----------------------------------------------------------

const roleEnum = z.enum(['ADMIN', 'DOCTOR', 'NURSE', 'RECEPTIONIST', 'LAB_TECHNICIAN', 'PHARMACIST']);

const createStaffSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  role: roleEnum,
  departmentId: z.string().optional(),
});

const updateStaffSchema = z.object({
  firstName: z.string().trim().min(1).max(100).optional(),
  lastName: z.string().trim().min(1).max(100).optional(),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  role: roleEnum.optional(),
  departmentId: z.string().optional(),
});

const listStaffQuerySchema = z.object({
  role: roleEnum.optional(),
  search: z.string().trim().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

type CreateStaffInput = z.infer<typeof createStaffSchema>;
type UpdateStaffInput = z.infer<typeof updateStaffSchema>;
type ListStaffQuery = z.infer<typeof listStaffQuerySchema>;

// --- Service ----------------------------------------------------------

/** Generates a random temporary password for a newly created staff account. */
function generateTempPassword(): string {
  return crypto.randomBytes(9).toString('base64').replace(/[+/=]/g, '') + 'A1!';
}

async function createStaff(input: CreateStaffInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw AppError.conflict('A staff account with this email already exists.');

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const employeeId = await generateEmployeeId();

  const user = await prisma.user.create({
    data: { ...input, employeeId, passwordHash },
    select: { id: true, employeeId: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
  });

  await sendStaffWelcomeEmail(user.email, user.firstName, tempPassword);

  // Still returned so the frontend can show it once, as a fallback for local
  // development where SMTP isn't configured (email.service.ts logs the same
  // content to the console in that case).
  return { user, tempPassword };
}

async function listStaff(query: ListStaffQuery) {
  const { role, search, page, pageSize } = query;
  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(search
      ? {
          OR: [
            { firstName: { contains: search, mode: 'insensitive' } },
            { lastName: { contains: search, mode: 'insensitive' } },
            { email: { contains: search, mode: 'insensitive' } },
            { employeeId: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const [total, staff] = await prisma.$transaction([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isDemo: true,
        department: { select: { id: true, name: true } },
        lastLoginAt: true,
        createdAt: true,
      },
    }),
  ]);

  return { staff, pagination: { total, page, pageSize, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

async function updateStaff(id: string, input: UpdateStaffInput) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Staff member not found.');
  return prisma.user.update({ where: { id }, data: input });
}

async function setStaffActive(id: string, isActive: boolean) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Staff member not found.');
  return prisma.user.update({ where: { id }, data: { isActive } });
}

async function resetStaffPassword(id: string) {
  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) throw AppError.notFound('Staff member not found.');
  const tempPassword = generateTempPassword();
  await prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(tempPassword) } });
  await sendStaffWelcomeEmail(existing.email, existing.firstName, tempPassword);
  return tempPassword;
}

// --- Controller -------------------------------------------------------

const create = asyncHandler(async (req: Request<unknown, unknown, CreateStaffInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { user, tempPassword } = await createStaff(req.body);
  await logAudit({ userId: req.user.id, action: 'STAFF_CREATED', resource: 'User', resourceId: user.id, req });
  res.status(201).json({
    success: true,
    message: 'Staff account created.',
    data: { user, tempPassword }, // shown once so the admin can hand it to the new hire
  });
});

const list = asyncHandler(async (req: Request<unknown, unknown, unknown, ListStaffQuery>, res: Response) => {
  const result = await listStaff(req.query);
  res.json({ success: true, data: result });
});

const update = asyncHandler(async (req: Request<{ id: string }, unknown, UpdateStaffInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await updateStaff(req.params.id, req.body);
  await logAudit({ userId: req.user.id, action: 'STAFF_UPDATED', resource: 'User', resourceId: user.id, req });
  res.json({ success: true, message: 'Staff account updated.', data: { user } });
});

const deactivate = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  if (req.user.id === req.params.id) throw AppError.badRequest('You cannot deactivate your own account.');
  const user = await setStaffActive(req.params.id, false);
  await logAudit({ userId: req.user.id, action: 'STAFF_DEACTIVATED', resource: 'User', resourceId: user.id, req });
  res.json({ success: true, message: 'Staff account deactivated.', data: { user } });
});

const activate = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const user = await setStaffActive(req.params.id, true);
  await logAudit({ userId: req.user.id, action: 'STAFF_ACTIVATED', resource: 'User', resourceId: user.id, req });
  res.json({ success: true, message: 'Staff account activated.', data: { user } });
});

const resetPassword = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  const tempPassword = await resetStaffPassword(req.params.id);
  res.json({ success: true, message: 'Password reset.', data: { tempPassword } });
});

// --- Routes -------------------------------------------------------------
// Every staff-management endpoint is Admin-only.

const router = Router();
router.use(requireAuth(), requireRole(Role.ADMIN));

router.get('/', validate(listStaffQuerySchema, 'query'), list);
router.post('/', validate(createStaffSchema), create);
router.put('/:id', validate(updateStaffSchema), update);
router.put('/:id/deactivate', deactivate);
router.put('/:id/activate', activate);
router.put('/:id/reset-password', resetPassword);

export default router;
