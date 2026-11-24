import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  title: 'Studio Workspace',
  robots: {
    index: false,
    follow: false,
  },
};
import { getMe } from '@/service/auth';
import { getNotifications } from '@/service/notifications/notifications.service';
import { DashboardShell } from '@/components/common/DashboardShell';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

async function GuardedDashboard({ children }: { children: React.ReactNode }) {
  const session = await getMe();
  if (!session) {
    redirect('/login');
  }

  const notifRes = await getNotifications(30, false, false);
  const initialNotifications =
    notifRes.ok && notifRes.data
      ? notifRes.data
      : { unreadCount: 0, urgentUnreadCount: 0, items: [] };

  return (
    <DashboardShell session={session} initialNotifications={initialNotifications}>
      {children}
    </DashboardShell>
  );
}

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <Suspense fallback={<PageSkeleton variant="dashboard-shell" label="Verifying session..." />}>
      <GuardedDashboard>{children}</GuardedDashboard>
    </Suspense>
  );
}
