import { NotificationType, Role } from '@prisma/client';
import { prisma } from '../config/prisma';
import { AppError } from '../utils/AppError';

interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({ data: input });
}

/** Notifies every active user with the given role — e.g. "every pharmacist" for a new prescription. */
export async function notifyRole(
  role: Role,
  notification: Omit<CreateNotificationInput, 'userId'>,
  excludeUserId?: string
) {
  const recipients = await prisma.user.findMany({
    where: { role, isActive: true, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    select: { id: true },
  });

  if (recipients.length === 0) return;

  await prisma.notification.createMany({
    data: recipients.map((r) => ({ ...notification, userId: r.id })),
  });
}

export async function notifyUser(
  userId: string,
  notification: Omit<CreateNotificationInput, 'userId'>,
  excludeUserId?: string
) {
  if (excludeUserId && userId === excludeUserId) return; // don't notify someone about their own action
  await createNotification({ ...notification, userId });
}

export async function listNotifications(userId: string, limit = 20) {
  return prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export async function getUnreadCount(userId: string) {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markAsRead(userId: string, notificationId: string) {
  const existing = await prisma.notification.findUnique({ where: { id: notificationId } });
  if (!existing || existing.userId !== userId) throw AppError.notFound('Notification not found.');
  return prisma.notification.update({ where: { id: notificationId }, data: { isRead: true } });
}

export async function markAllAsRead(userId: string) {
  await prisma.notification.updateMany({ where: { userId, isRead: false }, data: { isRead: true } });
}
