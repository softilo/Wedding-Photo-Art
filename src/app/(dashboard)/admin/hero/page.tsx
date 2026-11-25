import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import {
  getAdminAboutTeamEvent,
  getAdminEditorialGridEvent,
  getAdminHeroSliderEvent,
  getAdminServicesShowcaseEvent,
  getGalleryStatus,
  listGalleryMedia,
} from '@/service/catalog/catalog.service';
import { HeroSliderManager } from '@/components/module/admin/HeroSliderManager';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

async function AdminHeroContent() {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF' || session.role === 'ACCOUNTANT') redirect('/admin');

  const [
    heroEventRes,
    editorialEventRes,
    servicesEventRes,
    aboutTeamEventRes,
    galleryRes,
    statusRes,
  ] = await Promise.all([
    getAdminHeroSliderEvent(),
    getAdminEditorialGridEvent(),
    getAdminServicesShowcaseEvent(),
    getAdminAboutTeamEvent(),
    listGalleryMedia('IMAGE'),
    getGalleryStatus(),
  ]);

  return (
    <HeroSliderManager
      initialHeroEvent={heroEventRes.ok ? (heroEventRes.data ?? null) : null}
      initialEditorialEvent={editorialEventRes.ok ? (editorialEventRes.data ?? null) : null}
      initialServicesEvent={servicesEventRes.ok ? (servicesEventRes.data ?? null) : null}
      initialAboutTeamEvent={aboutTeamEventRes.ok ? (aboutTeamEventRes.data ?? null) : null}
      galleryImages={galleryRes.ok && galleryRes.data ? galleryRes.data.data : []}
      cloudinaryStatus={statusRes.ok && statusRes.data ? statusRes.data : null}
      studioName={session.studioName || 'Wedding PhotoArt'}
    />
  );
}

export default function AdminHeroPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-gallery" label="Loading public page setup..." />}>
      <AdminHeroContent />
    </Suspense>
  );
}
