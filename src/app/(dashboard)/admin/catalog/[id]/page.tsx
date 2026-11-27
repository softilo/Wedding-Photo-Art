import React, { Suspense } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getAgencySettings } from '@/service/agency/agency.service';
import {
  getAdminPackage,
  getGalleryStatus,
  listEventTypes,
  listGalleryMedia,
} from '@/service/catalog/catalog.service';
import { PackageFormWorkspace } from '@/components/module/admin/PackageFormWorkspace';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

async function EditPackageContent({ params }: { params: Promise<{ id: string }> }) {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF' || session.role === 'ACCOUNTANT') redirect('/admin');

  const { id } = await params;

  const [pkgRes, settingsRes, etRes, galleryRes, statusRes] = await Promise.all([
    getAdminPackage(id),
    getAgencySettings(),
    listEventTypes(),
    listGalleryMedia('IMAGE'),
    getGalleryStatus(),
  ]);

  if (!pkgRes.ok || !pkgRes.data) {
    return (
      <div className="admin-card p-6 sm:p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-rose-600">
          {pkgRes.message || 'Package not found.'}
        </p>
        <Link
          href="/admin/catalog"
          className="inline-flex items-center rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-xs font-semibold text-[var(--admin-accent-fg)]"
        >
          ← Back to Packages
        </Link>
      </div>
    );
  }

  return (
    <PackageFormWorkspace
      mode="edit"
      initialPackage={pkgRes.data}
      eventTypes={etRes.ok && etRes.data ? etRes.data : []}
      galleryImages={galleryRes.ok && galleryRes.data ? galleryRes.data.data : []}
      cloudinaryStatus={statusRes.ok && statusRes.data ? statusRes.data : null}
      currency={settingsRes.ok && settingsRes.data ? settingsRes.data.currency : 'BDT'}
    />
  );
}

export default function EditAdminPackagePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-detail" label="Loading package editor..." />}>
      <EditPackageContent params={params} />
    </Suspense>
  );
}
