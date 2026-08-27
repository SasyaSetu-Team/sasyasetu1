import { supabase } from './supabase';

export interface NotificationRow {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  read_at: string | null;
  created_at: string;
}

export async function fetchNotifications(): Promise<NotificationRow[]> {
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, notification_type, read_at, created_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as NotificationRow[];
}

export async function markNotificationRead(id: string): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

export async function markAllNotificationsRead(): Promise<void> {
  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .is('read_at', null);
  if (error) throw error;
}

const DEMO_NOTIFICATIONS: Omit<NotificationRow, 'id' | 'created_at'>[] = [
  { title: 'notifications.transportRequest', body: 'notifications.transportBody', notification_type: 'transport', read_at: null },
  { title: 'notifications.paymentSuccessful', body: 'notifications.paymentBody', notification_type: 'payment', read_at: null },
  { title: 'notifications.shortageTitle', body: 'notifications.shortageBody', notification_type: 'shortage', read_at: new Date().toISOString() },
];

export async function seedDemoNotificationsIfNeeded(): Promise<void> {
  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true });
  if (error) return;
  if ((count ?? 0) > 0) return;

  const inserts = DEMO_NOTIFICATIONS.map((n) => ({ ...n }));
  await supabase.from('notifications').insert(inserts);
}
