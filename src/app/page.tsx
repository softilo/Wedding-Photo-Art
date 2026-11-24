import React, { Suspense } from 'react';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { PublicAgencyHome } from '@/components/module/public/PublicAgencyHome';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { loadPublicStorefront } from '@/lib/publicStorefront';

async function RootStorefrontContent() {
  const {
    branding,
    eventTypes,
    packages,
    portfolio,
    portfolioEvents,
    heroEvent,
    editorialGridEvent,
    galleryImages,
    isBackendConnected,
  } = await loadPublicStorefront();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar branding={branding} />
      <PublicAgencyHome
        branding={branding}
        eventTypes={eventTypes}
        packages={packages}
        portfolio={portfolio}
        portfolioEvents={portfolioEvents}
        heroEvent={heroEvent}
        editorialGridEvent={editorialGridEvent}
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
