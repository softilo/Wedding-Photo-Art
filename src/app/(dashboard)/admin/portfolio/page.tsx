import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { listBookings } from '@/service/bookings/bookings.service';
import {
  listAdminPortfolioEvents,
  listEventTypes,
  listGalleryMedia,
} from '@/service/catalog/catalog.service';
import { PortfolioEventManager } from '@/components/module/admin/PortfolioEventManager';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { isSystemPortfolioEventSlug } from '@/lib/heroSlider';

interface AdminPortfolioPageProps {
  searchParams?: Promise<{ eventId?: string }>;
}

async function AdminPortfolioContent({ searchParams }: AdminPortfolioPageProps) {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF' || session.role === 'ACCOUNTANT') redirect('/admin');

  const resolvedSearch = searchParams ? await searchParams : {};

  const [eventsRes, etRes, galleryRes, bookingsRes] = await Promise.all([
    listAdminPortfolioEvents(),
    listEventTypes(),
    listGalleryMedia(),
    listBookings({ status: 'COMPLETED' }),
  ]);

  const portfolioEvents = (eventsRes.ok && eventsRes.data ? eventsRes.data.data : []).filter(
    (ev) => !isSystemPortfolioEventSlug(ev.slug),
  );
  const completedBookings = bookingsRes.ok && bookingsRes.data ? bookingsRes.data.data : [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="admin-page-title">
          Client Digital Portfolios
        </h1>
        <p className="admin-meta mt-1">
          Create a short, shareable digital album (/album/...) for any COMPLETED event
          booking—auto-filled from booking details with zero duplicate entry.
        </p>
      </div>

      <PortfolioEventManager
        initialEvents={portfolioEvents}
        eventTypes={etRes.ok && etRes.data ? etRes.data : []}
        galleryMedia={galleryRes.ok && galleryRes.data ? galleryRes.data.data : []}
        completedBookings={completedBookings}
        initialSelectedEventId={resolvedSearch.eventId}
      />
    </div>
  );
}

export default function AdminPortfolioPage({ searchParams }: AdminPortfolioPageProps) {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-gallery" label="Loading client digital portfolios..." />}>
      <AdminPortfolioContent searchParams={searchParams} />
    </Suspense>
  );
}
