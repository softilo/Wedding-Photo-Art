import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getAgencySettings, listAgencyMembers } from '@/service/agency/agency.service';
import { listBookings } from '@/service/bookings/bookings.service';
import { getCalendar, listResources } from '@/service/schedule/schedule.service';
import { CalendarWorkspace } from '@/components/module/admin/CalendarWorkspace';
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

function getMonthBounds(ymd: string): { monthStart: string; monthEnd: string } {
  const year = Number(ymd.slice(0, 4));
  const month = Number(ymd.slice(5, 7));
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return {
    monthStart: `${ymd.slice(0, 7)}-01`,
    monthEnd: `${ymd.slice(0, 7)}-${String(lastDay).padStart(2, '0')}`,
  };
}

async function AdminCalendarContent() {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF') redirect('/staff');

  const settingsRes = await getAgencySettings();
  const timezone =
    settingsRes.ok && settingsRes.data ? settingsRes.data.timezone : 'Asia/Dhaka';

  const todayIso = formatYmdInTz(new Date(), timezone);
  const { monthStart, monthEnd } = getMonthBounds(todayIso);

  const [calRes, resRes, bookingsRes, membersRes] = await Promise.all([
    getCalendar(monthStart, monthEnd),
    listResources(),
    listBookings(),
    listAgencyMembers(),
  ]);

  return (
    <CalendarWorkspace
      timezone={timezone}
      todayIso={todayIso}
      initialFrom={monthStart}
      initialTo={monthEnd}
      initialSessions={calRes.ok && calRes.data ? calRes.data.sessions : []}
      initialResources={resRes.ok && resRes.data ? resRes.data : []}
      bookings={bookingsRes.ok && bookingsRes.data ? bookingsRes.data.data : []}
      members={membersRes.ok && membersRes.data ? membersRes.data.filter((m) => m.isActive) : []}
    />
  );
}

export default function AdminCalendarPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-calendar" label="Loading studio calendar..." />}>
      <AdminCalendarContent />
    </Suspense>
  );
}
