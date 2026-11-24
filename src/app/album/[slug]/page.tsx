import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { JsonLd } from '@/components/shared/JsonLd';
import { getPublicBranding } from '@/service/agency/agency.service';
import { getPublicPortfolioEventBySlug } from '@/service/catalog/catalog.service';
import { parseAlbumDescriptionAndTheme } from '@/lib/albumTheme';
import { resolvePublicBranding } from '@/lib/publicStorefront';
import { isSystemPortfolioEventSlug } from '@/lib/heroSlider';
import { buildAlbumJsonLd, buildCloudinaryOgImageUrl } from '@/lib/seo';
import { PortfolioEventPageClient } from '@/components/module/public/PortfolioEventPageClient';

interface AlbumSlugPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({
  params,
}: AlbumSlugPageProps): Promise<Metadata> {
  const { slug } = await params;
  if (isSystemPortfolioEventSlug(slug)) {
    return {
      title: 'Album Not Found',
      robots: { index: false, follow: false },
    };
  }

  const [brandRes, eventRes] = await Promise.all([
    getPublicBranding(),
    getPublicPortfolioEventBySlug(slug),
  ]);

  if (!eventRes.ok || !eventRes.data) {
    return {
      title: 'Client Album',
      robots: { index: false, follow: false },
    };
  }

  const branding = resolvePublicBranding(brandRes.ok ? brandRes.data : null);
  const ev = eventRes.data;
  const { cleanDescription } = parseAlbumDescriptionAndTheme(ev.description);

  const rawCoverUrl =
    ev.coverMedia?.secureUrl ||
    (ev.media || []).find((m) => m.resourceType === 'IMAGE' && m.status === 'READY')?.secureUrl;
  const ogImageUrl = buildCloudinaryOgImageUrl(rawCoverUrl);

  const pageTitle = ev.eventType?.name ? `${ev.title} — ${ev.eventType.name}` : ev.title;
  const pageDesc =
    cleanDescription ||
    `${ev.title}${ev.location ? ` (${ev.location})` : ''} — digital wedding & event photography gallery captured by ${branding.displayName}.`;
  const canonicalPath = `/album/${encodeURIComponent(ev.slug)}`;

  return {
    title: pageTitle,
    description: pageDesc,
    alternates: {
      canonical: canonicalPath,
    },
    openGraph: {
      type: 'article',
      url: canonicalPath,
      title: `${pageTitle} | ${branding.displayName}`,
      description: pageDesc,
      ...(ogImageUrl
        ? {
            images: [
              {
                url: ogImageUrl,
                width: 1200,
                height: 630,
                alt: ev.title,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: `${pageTitle} | ${branding.displayName}`,
      description: pageDesc,
      ...(ogImageUrl ? { images: [ogImageUrl] } : {}),
    },
  };
}

async function DigitalAlbumContent({ params }: AlbumSlugPageProps) {
  const { slug } = await params;
  if (isSystemPortfolioEventSlug(slug)) {
    notFound();
  }

  const [brandRes, eventRes] = await Promise.all([
    getPublicBranding(),
    getPublicPortfolioEventBySlug(slug),
  ]);

  if (!eventRes.ok || !eventRes.data) {
    notFound();
  }

  const branding = resolvePublicBranding(brandRes.ok ? brandRes.data : null);
  const jsonLd = buildAlbumJsonLd({ branding, event: eventRes.data });

  return (
    <>
      <JsonLd data={jsonLd} />
      <PortfolioEventPageClient event={eventRes.data} branding={branding} />
    </>
  );
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
