import { Role } from '@prisma/client';
import { prisma } from '../config/prisma';

export interface CreateNotificationInput {
  userId: string;
  type: string;
  title: string;
  message: string;
  link?: string;
}

export async function createNotification(input: CreateNotificationInput) {
  return prisma.notification.create({ data: input });
}

export async function notifyUsers(userIds: string[], input: Omit<CreateNotificationInput, 'userId'>) {
  const uniqueUserIds = [...new Set(userIds)].filter(Boolean);
  if (!uniqueUserIds.length) return [];

  return prisma.$transaction(
    uniqueUserIds.map((userId) => prisma.notification.create({ data: { ...input, userId } }))
  );
}

export async function notifyRoles(roles: Role[], input: Omit<CreateNotificationInput, 'userId'>, excludeUserId?: string) {
  const users = await prisma.user.findMany({
    where: { role: { in: roles }, isActive: true, ...(excludeUserId ? { id: { not: excludeUserId } } : {}) },
    select: { id: true },
  });
  return notifyUsers(users.map((user) => user.id), input);
}
