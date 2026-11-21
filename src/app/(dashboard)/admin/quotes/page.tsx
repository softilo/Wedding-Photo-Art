import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getAgencySettings } from '@/service/agency/agency.service';
import { listInquiries } from '@/service/inquiries/inquiries.service';
import { listQuotes } from '@/service/quotes/quotes.service';
import { listEventTypes, listPackages } from '@/service/catalog/catalog.service';
import { BookingsWorkspace } from '@/components/module/admin/BookingsWorkspace';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

interface AdminQuotesPageProps {
  searchParams?: Promise<{ inquiryId?: string; new?: string }>;
}

async function AdminQuotesContent({ searchParams }: AdminQuotesPageProps) {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF') redirect('/staff');

  const resolved = searchParams ? await searchParams : {};

  const [settingsRes, inqRes, quotesRes, pkgRes, etRes] = await Promise.all([
    getAgencySettings(),
    listInquiries(),
    listQuotes(),
    listPackages(),
    listEventTypes(),
  ]);

  return (
    <BookingsWorkspace
      mode="quotes"
      initialInquiries={inqRes.ok && inqRes.data ? inqRes.data.data : []}
      initialQuotes={quotesRes.ok && quotesRes.data ? quotesRes.data.data : []}
      initialBookings={[]}
      packages={pkgRes.ok && pkgRes.data ? pkgRes.data.data : []}
      eventTypes={etRes.ok && etRes.data ? etRes.data : []}
      initialResources={[]}
      members={[]}
      currency={settingsRes.ok && settingsRes.data ? settingsRes.data.currency : 'BDT'}
      timezone={settingsRes.ok && settingsRes.data ? settingsRes.data.timezone : 'Asia/Dhaka'}
      initialInquiryIdForQuote={resolved.inquiryId}
      initialOpenCreateModal={resolved.new === '1'}
    />
  );
}

export default function AdminQuotesPage({ searchParams }: AdminQuotesPageProps) {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-table" label="Loading price quotes..." />}>
      <AdminQuotesContent searchParams={searchParams} />
    </Suspense>
  );
}
