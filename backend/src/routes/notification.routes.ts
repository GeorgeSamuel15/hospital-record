import { Request, Response, Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';
import { requireAuth } from '../middleware/auth';
import { prisma } from '../config/prisma';

const router = Router();
router.use(requireAuth());

router.get('/', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const unreadCount = await prisma.notification.count({ where: { userId: req.user.id, isRead: false } });

  res.json({ success: true, data: { notifications, unreadCount } });
}));

router.patch('/:id/read', asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  const notification = await prisma.notification.findFirst({ where: { id: req.params.id, userId: req.user.id } });
  if (!notification) throw AppError.notFound('Notification not found.');

  const updated = await prisma.notification.update({ where: { id: notification.id }, data: { isRead: true } });
  res.json({ success: true, data: { notification: updated } });
}));

router.patch('/read-all', asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();

  await prisma.notification.updateMany({ where: { userId: req.user.id, isRead: false }, data: { isRead: true } });
  res.json({ success: true, message: 'All notifications marked as read.' });
}));

export default router;
