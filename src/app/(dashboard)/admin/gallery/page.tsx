import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getGalleryStatus, listGalleryMedia } from '@/service/catalog/catalog.service';
import { GalleryMediaManager } from '@/components/module/admin/GalleryMediaManager';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

async function AdminGalleryContent() {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF' || session.role === 'ACCOUNTANT') redirect('/admin');

  const [galleryRes, statusRes] = await Promise.all([
    listGalleryMedia(),
    getGalleryStatus(),
  ]);

  return (
    <GalleryMediaManager
      initialMedia={galleryRes.ok && galleryRes.data ? galleryRes.data.data : []}
      cloudinaryStatus={statusRes.ok && statusRes.data ? statusRes.data : null}
    />
  );
}

export default function AdminGalleryPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-gallery" label="Loading gallery..." />}>
      <AdminGalleryContent />
    </Suspense>
  );
}
