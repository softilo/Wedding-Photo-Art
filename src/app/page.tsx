import React, { Suspense } from 'react';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { PublicAgencyHome } from '@/components/module/public/PublicAgencyHome';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { loadPublicStorefront } from '@/lib/publicStorefront';

async function RootStorefrontContent() {
  const { branding, eventTypes, packages, portfolio, portfolioEvents, isBackendConnected } =
    await loadPublicStorefront();

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar branding={branding} />
      <PublicAgencyHome
        branding={branding}
        eventTypes={eventTypes}
        packages={packages}
        portfolio={portfolio}
        portfolioEvents={portfolioEvents}
        isBackendConnected={isBackendConnected}
      />
      <Footer branding={branding} />
    </div>
  );
}

export default function RootPage() {
  return (
    <Suspense fallback={<PageSkeleton label="Loading Wedding PhotoArt studio..." />}>
      <RootStorefrontContent />
    </Suspense>
  );
}
