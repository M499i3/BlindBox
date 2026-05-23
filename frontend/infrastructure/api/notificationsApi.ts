import { apiFetch } from './apiClient';

export type NotificationItem = {
  id: string;
  type: string;
  typeLabel: string;
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
  actionUrl: string | null;
};

type ApiNotification = {
  id: string;
  type: string;
  type_label: string;
  title: string;
  body: string;
  is_read: boolean;
  created_at: string;
  action_url: string | null;
};

const TYPE_ICONS: Record<string, string> = {
  system: 'settings',
  activity: 'campaign',
  trade: 'swap_horiz',
  support: 'support_agent',
};

export function notificationIcon(type: string): string {
  return TYPE_ICONS[type] ?? 'notifications';
}

export function notificationColor(type: string, unread: boolean): string {
  if (unread) return 'text-primary';
  return type === 'trade' ? 'text-slate-400' : 'text-slate-400';
}

function toFrontend(n: ApiNotification): NotificationItem {
  return {
    id: n.id,
    type: n.type,
    typeLabel: n.type_label,
    title: n.title,
    body: n.body,
    isRead: n.is_read,
    createdAt: n.created_at,
    actionUrl: n.action_url,
  };
}

export async function getNotifications(): Promise<NotificationItem[]> {
  const items = await apiFetch<ApiNotification[]>('/api/notifications');
  return items.map(toFrontend);
}
