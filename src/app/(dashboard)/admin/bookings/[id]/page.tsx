import React, { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getAgencySettings, listAgencyMembers } from '@/service/agency/agency.service';
import { getBooking } from '@/service/bookings/bookings.service';
import { getPortfolioEventByBooking } from '@/service/catalog/catalog.service';
import { getBookingLedger } from '@/service/payments/payments.service';
import { listResources } from '@/service/schedule/schedule.service';
import {
  BookingDetailSection,
  BookingsWorkspace,
} from '@/components/module/admin/BookingsWorkspace';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

interface AdminBookingDetailPageProps {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ section?: string }>;
}

async function AdminBookingDetailContent({ params, searchParams }: AdminBookingDetailPageProps) {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF') redirect('/staff');

  const { id } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};

  const initialSection: BookingDetailSection =
    resolvedSearch.section === 'schedule' ||
    resolvedSearch.section === 'deliverables' ||
    resolvedSearch.section === 'tasks'
      ? resolvedSearch.section
      : 'payments';

  const [bookingRes, ledgerRes, settingsRes, resourcesRes, membersRes, portfolioRes] =
    await Promise.all([
      getBooking(id),
      getBookingLedger(id),
      getAgencySettings(),
      listResources(),
      listAgencyMembers(),
      getPortfolioEventByBooking(id),
    ]);

  if (!bookingRes.ok || !bookingRes.data) {
    return (
      <div className="space-y-4">
        <Link
          href="/admin/bookings"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <span>← Back to All Bookings</span>
        </Link>
        <div className="atelier-card p-10 text-center space-y-2">
          <h1 className="text-lg font-bold text-slate-900">Booking not found</h1>
          <p className="text-sm text-slate-500">
            This booking may have been removed or you may not have access to view it.
          </p>
        </div>
      </div>
    );
  }

  return (
    <BookingsWorkspace
      mode="detail"
      initialInquiries={[]}
      initialQuotes={[]}
      initialBookings={[bookingRes.data]}
      packages={[]}
      eventTypes={[]}
      initialResources={resourcesRes.ok && resourcesRes.data ? resourcesRes.data : []}
      members={membersRes.ok && membersRes.data ? membersRes.data.filter((m) => m.isActive) : []}
      currency={settingsRes.ok && settingsRes.data ? settingsRes.data.currency : 'BDT'}
      timezone={settingsRes.ok && settingsRes.data ? settingsRes.data.timezone : 'Asia/Dhaka'}
      initialSelectedBookingId={bookingRes.data.id}
      initialSelectedBooking={bookingRes.data}
      initialLedger={ledgerRes.ok && ledgerRes.data ? ledgerRes.data : null}
      initialBookingPortfolio={portfolioRes.ok && portfolioRes.data ? portfolioRes.data.event : null}
      isDetailPage
      initialDetailSection={initialSection}
    />
  );
}

export default function AdminBookingDetailPage({
  params,
  searchParams,
}: AdminBookingDetailPageProps) {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-detail" label="Loading booking workspace..." />}>
      <AdminBookingDetailContent params={params} searchParams={searchParams} />
    </Suspense>
  );
}
