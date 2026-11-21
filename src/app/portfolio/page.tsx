import React, { Suspense } from 'react';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { resolvePublicBranding } from '@/lib/publicStorefront';
import { getPublicBranding } from '@/service/agency/agency.service';
import {
  getPublicEventTypes,
  getPublicPortfolioEvents,
} from '@/service/catalog/catalog.service';
import { ClientPortfoliosDirectory } from '@/components/module/public/ClientPortfoliosDirectory';

async function AllPortfoliosContent() {
  const [brandRes, eventsRes, etRes] = await Promise.all([
    getPublicBranding(),
    getPublicPortfolioEvents(),
    getPublicEventTypes(),
  ]);

  const branding = resolvePublicBranding(brandRes.ok ? brandRes.data : null);
  const events = eventsRes.ok && eventsRes.data ? eventsRes.data.data : [];
  const eventTypes = etRes.ok && etRes.data ? etRes.data : [];

  return (
    <div className="min-h-screen flex flex-col">
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
