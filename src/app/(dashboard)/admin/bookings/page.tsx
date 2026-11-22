import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getAgencySettings } from '@/service/agency/agency.service';
import { listBookings } from '@/service/bookings/bookings.service';
import { BookingsWorkspace } from '@/components/module/admin/BookingsWorkspace';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

interface AdminBookingsPageProps {
  searchParams?: Promise<{ tab?: string; bookingId?: string }>;
}

async function AdminBookingsContent({ searchParams }: AdminBookingsPageProps) {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF') redirect('/staff');

  const resolvedParams = searchParams ? await searchParams : {};

  // Redirect legacy query-param deep links to their dedicated clean routes
  if (resolvedParams.bookingId) {
    redirect(`/admin/bookings/${encodeURIComponent(resolvedParams.bookingId)}`);
  }
  if (resolvedParams.tab === 'inquiries') {
    redirect('/admin/inquiries');
  }
  if (resolvedParams.tab === 'quotes') {
    redirect('/admin/quotes');
  }

  const [settingsRes, bookingsRes] = await Promise.all([
    getAgencySettings(),
    listBookings(),
  ]);

  return (
    <BookingsWorkspace
      mode="bookings"
      initialInquiries={[]}
      initialQuotes={[]}
      initialBookings={bookingsRes.ok && bookingsRes.data ? bookingsRes.data.data : []}
      initialLoadError={!bookingsRes.ok ? bookingsRes.message || 'Unable to load bookings from backend.' : undefined}
      packages={[]}
      eventTypes={[]}
      initialResources={[]}
      members={[]}
      currency={settingsRes.ok && settingsRes.data ? settingsRes.data.currency : 'BDT'}
      timezone={settingsRes.ok && settingsRes.data ? settingsRes.data.timezone : 'Asia/Dhaka'}
    />
  );
}

export default function AdminBookingsPage({ searchParams }: AdminBookingsPageProps) {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-table" label="Loading bookings..." />}>
      <AdminBookingsContent searchParams={searchParams} />
    </Suspense>
  );
}
