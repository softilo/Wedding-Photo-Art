import React, { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { getPublicBranding } from '@/service/agency/agency.service';
import { getPublicPortfolioEventBySlug } from '@/service/catalog/catalog.service';
import { resolvePublicBranding } from '@/lib/publicStorefront';
import { PortfolioEventPageClient } from '@/components/module/public/PortfolioEventPageClient';

interface AlbumSlugPageProps {
  params: Promise<{ slug: string }>;
}

async function DigitalAlbumContent({ params }: AlbumSlugPageProps) {
  const { slug } = await params;

  const [brandRes, eventRes] = await Promise.all([
    getPublicBranding(),
    getPublicPortfolioEventBySlug(slug),
  ]);

  if (!eventRes.ok || !eventRes.data) {
    notFound();
  }

  const branding = resolvePublicBranding(brandRes.ok ? brandRes.data : null);

  return <PortfolioEventPageClient event={eventRes.data} branding={branding} />;
}

export default function AlbumSlugPage({ params }: AlbumSlugPageProps) {
  return (
    <Suspense
      fallback={<PageSkeleton variant="album" label="Opening digital album..." />}
    >
      <DigitalAlbumContent params={params} />
    </Suspense>
  );
}
