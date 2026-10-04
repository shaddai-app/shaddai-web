import { api } from './http';

export const NOTIFICATION_TYPES = [
  'assignment.created',
  'assignment.declined',
  'loan.overdue',
  'consolidation.overdue',
  'cell.report_missing',
  'announcement.published',
  'prayer.request',
  'prayer.praying',
  'prayer.public',
  'prayer.reply',
  'billing.past_due',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface AppNotification {
  id: number;
  /** Puede llegar un tipo nuevo que este front todavía no conoce. */
  type: NotificationType | (string & {});
  params: Record<string, string | number | null>;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationPref {
  type: NotificationType;
  inApp: boolean;
  email: boolean;
}

export const notificationsApi = {
  list: (q: { unread?: boolean; page?: number; pageSize?: number }) =>
    api.get<{ items: AppNotification[]; total: number; page: number; pageSize: number; unread: number }>(
      '/notifications',
      q,
    ),
  unreadCount: () => api.get<{ count: number }>('/notifications/unread-count'),
  markRead: (id: number) => api.post<{ count: number }>(`/notifications/${id}/read`),
  markAllRead: () => api.post<{ count: number }>('/notifications/read-all'),
  prefs: () => api.get<{ items: NotificationPref[] }>('/me/notification-prefs'),
  setPrefs: (prefs: Partial<NotificationPref>[]) =>
    api.patch<{ items: NotificationPref[] }>('/me/notification-prefs', { prefs }),
};
