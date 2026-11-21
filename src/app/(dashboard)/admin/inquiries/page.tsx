import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getAgencySettings } from '@/service/agency/agency.service';
import { listInquiries } from '@/service/inquiries/inquiries.service';
import { listEventTypes, listPackages } from '@/service/catalog/catalog.service';
import { BookingsWorkspace } from '@/components/module/admin/BookingsWorkspace';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

interface AdminInquiriesPageProps {
  searchParams?: Promise<{ new?: string }>;
}

async function AdminInquiriesContent({ searchParams }: AdminInquiriesPageProps) {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF') redirect('/staff');

  const resolved = searchParams ? await searchParams : {};

  const [settingsRes, inqRes, pkgRes, etRes] = await Promise.all([
    getAgencySettings(),
    listInquiries(),
    listPackages(),
    listEventTypes(),
  ]);

  return (
    <BookingsWorkspace
      mode="inquiries"
      initialInquiries={inqRes.ok && inqRes.data ? inqRes.data.data : []}
      initialLoadError={!inqRes.ok ? inqRes.message || 'Unable to load inquiries from backend.' : undefined}
      initialQuotes={[]}
      initialBookings={[]}
      packages={pkgRes.ok && pkgRes.data ? pkgRes.data.data : []}
      eventTypes={etRes.ok && etRes.data ? etRes.data : []}
      initialResources={[]}
      members={[]}
      currency={settingsRes.ok && settingsRes.data ? settingsRes.data.currency : 'BDT'}
      timezone={settingsRes.ok && settingsRes.data ? settingsRes.data.timezone : 'Asia/Dhaka'}
      initialOpenCreateModal={resolved.new === '1'}
    />
  );
}

export default function AdminInquiriesPage({ searchParams }: AdminInquiriesPageProps) {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-table" label="Loading client inquiries..." />}>
      <AdminInquiriesContent searchParams={searchParams} />
    </Suspense>
  );
}
