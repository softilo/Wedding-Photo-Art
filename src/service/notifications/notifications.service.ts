'use server';

import { revalidatePath } from 'next/cache';
import { serverFetch } from '@/lib/serverFetch';
import { NotificationsFeed } from '@/types/event-management';
import { ActionResult, parseApiResponse } from '../shared/apiResult';

export async function getNotifications(
  limit = 30,
  unreadOnly = false,
  sync = true,
): Promise<ActionResult<NotificationsFeed>> {
  const qs = new URLSearchParams({ limit: String(limit) });
  if (unreadOnly) qs.set('unreadOnly', 'true');
  if (!sync) qs.set('sync', 'false');
  const res = await serverFetch.get(`/notifications?${qs.toString()}`);

  // Graceful fallback if an older backend instance is still running prior to restart
  if (res.status === 404) {
    return {
      ok: true,
      data: { unreadCount: 0, urgentUnreadCount: 0, items: [] },
    };
  }

  return parseApiResponse<NotificationsFeed>(res);
}

export async function markNotificationRead(
  notificationId: string,
): Promise<ActionResult<{ ok: boolean; id: string }>> {
  const res = await serverFetch.patch(
    `/notifications/${encodeURIComponent(notificationId)}/read`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    },
  );
  const result = await parseApiResponse<{ ok: boolean; id: string }>(res);
  if (result.ok) {
    revalidatePath('/admin');
    revalidatePath('/staff');
  }
  return result;
}

export async function markAllNotificationsRead(): Promise<
  ActionResult<{ ok: boolean; updatedCount: number }>
> {
  const res = await serverFetch.post('/notifications/read-all', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const result = await parseApiResponse<{ ok: boolean; updatedCount: number }>(res);
  if (result.ok) {
    revalidatePath('/admin');
    revalidatePath('/staff');
  }
  return result;
}
