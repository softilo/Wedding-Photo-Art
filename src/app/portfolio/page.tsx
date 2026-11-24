import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { JsonLd } from '@/components/shared/JsonLd';
import { resolvePublicBranding } from '@/lib/publicStorefront';
import { buildPortfolioDirectoryJsonLd } from '@/lib/seo';
import { getPublicBranding } from '@/service/agency/agency.service';
import {
  getPublicEventTypes,
  getPublicPortfolioEvents,
} from '@/service/catalog/catalog.service';
import { ClientPortfoliosDirectory } from '@/components/module/public/ClientPortfoliosDirectory';

export const metadata: Metadata = {
  title: 'Client Wedding Albums & Film Portfolios',
  description:
    'Browse real Wedding, Holud, Reception, Engagement, Couple & Pre-Wedding client digital galleries captured by Wedding PhotoArt in Feni and across Bangladesh.',
  alternates: {
    canonical: '/portfolio',
  },
  openGraph: {
    type: 'website',
    url: '/portfolio',
    title: 'Client Wedding Albums & Film Portfolios | Wedding PhotoArt',
    description:
      'Explore curated real client Wedding, Holud, Reception & Pre-Wedding digital galleries by Wedding PhotoArt.',
  },
};

async function AllPortfoliosContent() {
  const [brandRes, eventsRes, etRes] = await Promise.all([
    getPublicBranding(),
    getPublicPortfolioEvents(),
    getPublicEventTypes(),
  ]);

  const branding = resolvePublicBranding(brandRes.ok ? brandRes.data : null);
  const events =
    eventsRes.ok && eventsRes.data && Array.isArray(eventsRes.data.data)
      ? eventsRes.data.data
      : [];
  const eventTypes = etRes.ok && Array.isArray(etRes.data) ? etRes.data : [];

  const jsonLd = buildPortfolioDirectoryJsonLd({ branding, events });

  return (
    <div className="min-h-screen flex flex-col">
      <JsonLd data={jsonLd} />
      <Navbar branding={branding} />
      <ClientPortfoliosDirectory branding={branding} events={events} eventTypes={eventTypes} />
      <Footer branding={branding} />
    </div>
  );
}

export default function AllPortfoliosPage() {
  return (
    <Suspense
      fallback={<PageSkeleton variant="portfolios" label="Loading client portfolios..." />}
    >
      <AllPortfoliosContent />
    </Suspense>
  );
}
