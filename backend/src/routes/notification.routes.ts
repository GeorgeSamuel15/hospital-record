import { Request, Response, Router } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { AppError } from '../utils/AppError';
import { requireAuth } from '../middleware/auth';
import { getUnreadCount, listNotifications, markAllAsRead, markAsRead } from '../services/notification.service';

const list = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const notifications = await listNotifications(req.user.id);
  res.json({ success: true, data: { notifications } });
});

const unreadCount = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const count = await getUnreadCount(req.user.id);
  res.json({ success: true, data: { count } });
});

const readOne = asyncHandler(async (req: Request<{ id: string }>, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  const notification = await markAsRead(req.user.id, req.params.id);
  res.json({ success: true, data: { notification } });
});

const readAll = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) throw AppError.unauthorized();
  await markAllAsRead(req.user.id);
  res.json({ success: true, message: 'All notifications marked as read.' });
});

const router = Router();
router.use(requireAuth());

// No role restriction beyond authentication — every query and mutation here
// is scoped to req.user.id inside the service layer, so there's no way for
// one user to see or modify another's notifications regardless of role.
router.get('/', list);
router.get('/unread-count', unreadCount);
router.put('/:id/read', readOne);
router.put('/read-all', readAll);

export default router;
