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

const initialPasswordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain an uppercase letter')
  .regex(/[0-9]/, 'Password must contain a number');

const createStaffSchema = z.object({
  firstName: z.string().trim().min(1).max(100),
  lastName: z.string().trim().min(1).max(100),
  email: z.string().trim().email(),
  phone: z.string().trim().max(30).optional().or(z.literal('')),
  role: roleEnum,
  departmentId: z.string().optional(),
  initialPassword: initialPasswordSchema.optional(),
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

  const { initialPassword, ...staffInput } = input;
  const tempPassword = initialPassword ?? generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  const employeeId = await generateEmployeeId();

  const user = await prisma.user.create({
    data: { ...staffInput, employeeId, passwordHash },
    select: { id: true, employeeId: true, firstName: true, lastName: true, email: true, role: true, isActive: true },
  });

  let emailSent = true;
  try {
    await sendStaffWelcomeEmail(user.email, user.firstName, tempPassword);
  } catch (error) {
    emailSent = false;
    // The account already exists at this point, so keep setup recoverable by
    // returning the one-time password while logging the delivery failure.
    // eslint-disable-next-line no-console
    console.error('Could not send staff welcome email:', error instanceof Error ? error.message : error);
  }

  // Still returned so the frontend can show it once, as a fallback for local
  // development where SMTP isn't configured (email.service.ts logs the same
  // content to the console in that case).
  return { user, tempPassword, emailSent };
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
  const resetAt = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { passwordHash: await hashPassword(tempPassword) } }),
    prisma.passwordResetToken.updateMany({ where: { userId: id, usedAt: null }, data: { usedAt: resetAt } }),
  ]);

  let emailSent = true;
  try {
    await sendStaffWelcomeEmail(existing.email, existing.firstName, tempPassword);
  } catch (error) {
    emailSent = false;
    // eslint-disable-next-line no-console
    console.error('Could not send staff password email:', error instanceof Error ? error.message : error);
  }

  return { tempPassword, emailSent };
}

async function deactivateDemoAccounts() {
  const realAdmin = await prisma.user.findFirst({
    where: { role: Role.ADMIN, isActive: true, isDemo: false },
    select: { id: true },
  });
  if (!realAdmin) {
    throw AppError.conflict('Create and sign in with a non-demo administrator before deactivating demo accounts.');
  }

  const passwordHash = await hashPassword(crypto.randomBytes(32).toString('hex'));
  return prisma.user.updateMany({
    where: { isDemo: true, isActive: true },
    data: { isActive: false, passwordHash },
  });
}

// --- Controller -------------------------------------------------------

const create = asyncHandler(async (req: Request<unknown, unknown, CreateStaffInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const { user, tempPassword, emailSent } = await createStaff(req.body);
  await logAudit({ userId: req.user.id, action: 'STAFF_CREATED', resource: 'User', resourceId: user.id, req });
  res.status(201).json({
    success: true,
    message: 'Staff account created.',
    data: { user, tempPassword, emailSent }, // shown once so the admin can hand it to the new hire
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
  if (!req.user) throw AppError.unauthorized();
  const { tempPassword, emailSent } = await resetStaffPassword(req.params.id);
  await logAudit({ userId: req.user.id, action: 'STAFF_PASSWORD_RESET', resource: 'User', resourceId: req.params.id, req });
  res.json({ success: true, message: 'Password reset.', data: { tempPassword, emailSent } });
});

const deactivateAllDemoAccounts = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  if (req.user.isDemo) {
    throw AppError.conflict('Create and sign in with a non-demo administrator before deactivating demo accounts.');
  }
  const result = await deactivateDemoAccounts();
  await logAudit({
    userId: req.user.id,
    action: 'DEMO_ACCOUNTS_DEACTIVATED',
    resource: 'User',
    metadata: { count: result.count },
    req,
  });
  res.json({ success: true, message: `${result.count} demo account(s) deactivated.`, data: { count: result.count } });
});

// --- Routes -------------------------------------------------------------
// Every staff-management endpoint is Admin-only.

const router = Router();
router.use(requireAuth(), requireRole(Role.ADMIN));

router.get('/', validate(listStaffQuerySchema, 'query'), list);
router.post('/', validate(createStaffSchema), create);
router.put('/demo/deactivate-all', deactivateAllDemoAccounts);
router.put('/:id', validate(updateStaffSchema), update);
router.put('/:id/deactivate', deactivate);
router.put('/:id/activate', activate);
router.put('/:id/reset-password', resetPassword);

export default router;
