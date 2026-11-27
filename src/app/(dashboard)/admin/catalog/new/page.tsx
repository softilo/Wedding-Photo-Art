import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getAgencySettings } from '@/service/agency/agency.service';
import {
  getGalleryStatus,
  listEventTypes,
  listGalleryMedia,
} from '@/service/catalog/catalog.service';
import { PackageFormWorkspace } from '@/components/module/admin/PackageFormWorkspace';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

async function NewPackageContent() {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF' || session.role === 'ACCOUNTANT') redirect('/admin');

  const [settingsRes, etRes, galleryRes, statusRes] = await Promise.all([
    getAgencySettings(),
    listEventTypes(),
    listGalleryMedia('IMAGE'),
    getGalleryStatus(),
  ]);

  return (
    <PackageFormWorkspace
      mode="create"
      eventTypes={etRes.ok && etRes.data ? etRes.data : []}
      galleryImages={galleryRes.ok && galleryRes.data ? galleryRes.data.data : []}
      cloudinaryStatus={statusRes.ok && statusRes.data ? statusRes.data : null}
      currency={settingsRes.ok && settingsRes.data ? settingsRes.data.currency : 'BDT'}
    />
  );
}

export default function NewAdminPackagePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-detail" label="Loading package builder..." />}>
      <NewPackageContent />
    </Suspense>
  );
}
