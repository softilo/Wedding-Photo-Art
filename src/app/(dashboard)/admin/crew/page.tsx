import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getAgencySettings, listAgencyMembers } from '@/service/agency/agency.service';
import { getCalendar, listResources } from '@/service/schedule/schedule.service';
import { CrewGearWorkspace } from '@/components/module/admin/CrewGearWorkspace';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

function formatYmdInTz(date: Date, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function addDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + deltaDays)).toISOString().slice(0, 10);
}

async function AdminCrewContent() {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF') redirect('/staff');

  const settingsRes = await getAgencySettings();
  const timezone =
    settingsRes.ok && settingsRes.data ? settingsRes.data.timezone : 'Asia/Dhaka';
  const todayIso = formatYmdInTz(new Date(), timezone);
  const plus30Iso = addDaysYmd(todayIso, 30);

  const [resourcesRes, membersRes, calRes] = await Promise.all([
    listResources(),
    listAgencyMembers(),
    getCalendar(todayIso, plus30Iso),
  ]);

  return (
    <CrewGearWorkspace
      timezone={timezone}
      todayIso={todayIso}
      initialResources={resourcesRes.ok && resourcesRes.data ? resourcesRes.data : []}
      members={membersRes.ok && membersRes.data ? membersRes.data : []}
      upcomingSessions={calRes.ok && calRes.data ? calRes.data.sessions : []}
    />
  );
}

export default function AdminCrewPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-table" label="Loading crew & gear pool..." />}>
      <AdminCrewContent />
    </Suspense>
  );
}
