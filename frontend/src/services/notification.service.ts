import { api, ApiResponse } from './api';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: string;
}

export async function listNotifications() {
  const res = await api.get<ApiResponse<{ notifications: NotificationItem[] }>>('/notifications');
  return res.data.data!.notifications;
}

export async function getUnreadCount() {
  const res = await api.get<ApiResponse<{ count: number }>>('/notifications/unread-count');
  return res.data.data!.count;
}

export async function markNotificationRead(id: string) {
  const res = await api.put<ApiResponse<{ notification: NotificationItem }>>(`/notifications/${id}/read`);
  return res.data.data!.notification;
}

export async function markAllNotificationsRead() {
  await api.put('/notifications/read-all');
}
