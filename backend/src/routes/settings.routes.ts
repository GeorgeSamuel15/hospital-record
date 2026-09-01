import { Request, Response, Router } from 'express';
import { z } from 'zod';
import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';
import { requireAuth, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { logAudit } from '../services/audit.service';

const updateSettingsSchema = z.object({
  hospitalName: z.string().trim().min(1, 'Hospital name is required').max(150),
  supportEmail: z.string().trim().email('Enter a valid email').optional().or(z.literal('')),
  appointmentSlotMinutes: z.coerce.number().int().min(5).max(240),
  sessionTimeoutMinutes: z.coerce.number().int().min(5).max(480),
});
type UpdateSettingsInput = z.infer<typeof updateSettingsSchema>;

// The settings table is a singleton — there is always exactly one row.
// get() creates it with defaults on first access rather than requiring a
// separate seed step.
async function getOrCreateSettings() {
  const existing = await prisma.systemSetting.findFirst();
  if (existing) return existing;
  return prisma.systemSetting.create({ data: {} });
}

const get = asyncHandler(async (_req: Request, res: Response) => {
  const settings = await getOrCreateSettings();
  res.json({ success: true, data: { settings } });
});

const update = asyncHandler(async (req: Request<unknown, unknown, UpdateSettingsInput>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const existing = await getOrCreateSettings();
  const data = { ...req.body, supportEmail: req.body.supportEmail || undefined };

  const settings = await prisma.systemSetting.update({
    where: { id: existing.id },
    data: { ...data, updatedById: req.user.id },
  });

  await logAudit({
    userId: req.user.id,
    action: 'SETTINGS_UPDATED',
    resource: 'SystemSetting',
    resourceId: settings.id,
    req,
  });

  res.json({ success: true, message: 'Settings updated.', data: { settings } });
});

const router = Router();
router.use(requireAuth());

// Any authenticated role can read settings (e.g. appointment slot length is
// used when scheduling), but only admins can change them.
router.get('/', get);
router.put('/', requireRole(Role.ADMIN), validate(updateSettingsSchema), update);

export default router;
