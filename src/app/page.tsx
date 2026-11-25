import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { PublicAgencyHome } from '@/components/module/public/PublicAgencyHome';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { JsonLd } from '@/components/shared/JsonLd';
import { loadPublicStorefront } from '@/lib/publicStorefront';
import { buildStudioJsonLdGraph } from '@/lib/seo';

export const metadata: Metadata = {
  title: {
    absolute: 'Wedding PhotoArt — Wedding Photography & Cinematography | Feni, Bangladesh',
  },
  description:
    'Wedding PhotoArt is a premier Wedding Photography & Cinematography studio based at Grand Haque Tower, Feni, Bangladesh. Book full-day Weddings, Holud, Reception, Engagement & Pre-Wedding stories.',
  alternates: {
    canonical: '/',
  },
  openGraph: {
    type: 'website',
    url: '/',
    title: 'Wedding PhotoArt — Wedding Photography & Cinematography | Feni, Bangladesh',
    description:
      'True-to-life color, fine natural light, and heartfelt wedding storytelling across Feni, Chattogram, and Dhaka.',
  },
};

async function RootStorefrontContent() {
  const {
    branding,
    eventTypes,
    packages,
    portfolio,
    portfolioEvents,
    heroEvent,
    editorialGridEvent,
    servicesEvent,
    galleryImages,
    isBackendConnected,
  } = await loadPublicStorefront();

  const jsonLd = buildStudioJsonLdGraph({
    branding,
    packages,
    portfolioEvents,
    galleryImages,
  });

  return (
    <div className="min-h-screen flex flex-col">
      <JsonLd data={jsonLd} />
      <Navbar branding={branding} />
      <PublicAgencyHome
        branding={branding}
        eventTypes={eventTypes}
        packages={packages}
        portfolio={portfolio}
        portfolioEvents={portfolioEvents}
        heroEvent={heroEvent}
        editorialGridEvent={editorialGridEvent}
        servicesEvent={servicesEvent}
        galleryImages={galleryImages}
        isBackendConnected={isBackendConnected}
      />
      <Footer branding={branding} />
    </div>
  );
}

export default function RootPage() {
  return (
    <Suspense
      fallback={
        <PageSkeleton variant="storefront" label="Loading Wedding PhotoArt studio..." />
      }
    >
      <RootStorefrontContent />
    </Suspense>
  );
}
