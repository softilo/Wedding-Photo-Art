import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getAgencySettings } from '@/service/agency/agency.service';
import { listInquiries } from '@/service/inquiries/inquiries.service';
import { listQuotes } from '@/service/quotes/quotes.service';
import { listBookings, getAutomationAlerts } from '@/service/bookings/bookings.service';
import { getFinancialReport } from '@/service/payments/payments.service';
import { getCalendar } from '@/service/schedule/schedule.service';
import { AdminOverview } from '@/components/module/admin/AdminOverview';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

function addDaysIso(days: number): string {
  const d = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
}

async function AdminOverviewContent() {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF') redirect('/staff');

  const from = addDaysIso(0);
  const to = addDaysIso(14);
  const canReadFinance = session.role === 'OWNER' || session.role === 'ACCOUNTANT';

  const [settingsRes, inqRes, quotesRes, bookingsRes, calRes, alertsRes, financeRes] =
    await Promise.all([
      getAgencySettings(),
      listInquiries(),
      listQuotes(),
      listBookings(),
      getCalendar(from, to),
      getAutomationAlerts(),
      canReadFinance ? getFinancialReport() : Promise.resolve(null),
    ]);

  return (
    <AdminOverview
      settings={settingsRes.ok && settingsRes.data ? settingsRes.data : null}
      inquiries={inqRes.ok && inqRes.data ? inqRes.data.data : []}
      quotes={quotesRes.ok && quotesRes.data ? quotesRes.data.data : []}
      bookings={bookingsRes.ok && bookingsRes.data ? bookingsRes.data.data : []}
      upcomingSessions={calRes.ok && calRes.data ? calRes.data.sessions : []}
      alerts={alertsRes.ok && alertsRes.data ? alertsRes.data : null}
      financialReport={financeRes && financeRes.ok && financeRes.data ? financeRes.data : null}
      windowStartDate={from}
    />
  );
}

export default function AdminOverviewPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-overview" label="Loading studio overview..." />}>
      <AdminOverviewContent />
    </Suspense>
  );
}
