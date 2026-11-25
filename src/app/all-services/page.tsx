import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { PublicServicesSection } from '@/components/module/public/PublicServicesSection';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { JsonLd } from '@/components/shared/JsonLd';
import { loadPublicStorefront } from '@/lib/publicStorefront';
import { buildStudioJsonLdGraph } from '@/lib/seo';
import { ArrowRightIcon, CameraIcon } from '@/components/shared/Icons';

export const metadata: Metadata = {
  title: 'All Photography & Cinematography Services',
  description:
    'Explore all wedding photography, cinematography, Holud, reception, birthday, and couple portrait services crafted by Wedding PhotoArt in Feni and across Bangladesh.',
  alternates: {
    canonical: '/all-services',
  },
  openGraph: {
    type: 'website',
    url: '/all-services',
    title: 'All Photography & Cinematography Services | Wedding PhotoArt',
    description:
      'Discover full-day Wedding Photography, 4K Cinematography, Holud, Reception, Birthday, and Couple Shoots by Wedding PhotoArt.',
  },
};

async function AllServicesContent() {
  const {
    branding,
    packages,
    portfolio,
    portfolioEvents,
    servicesEvent,
    galleryImages,
  } = await loadPublicStorefront();

  const accent = branding.themeTokens.accentColor || '#8B6A21';
  const jsonLd = buildStudioJsonLdGraph({
    branding,
    packages,
    portfolioEvents,
    galleryImages,
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F5] text-[#181611]">
      <JsonLd data={jsonLd} />
      <Navbar branding={branding} />

      <main className="flex-1">
        <section className="border-b border-[#2E291F] bg-[#14120E] text-[#F4EFE4]">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:py-18 sm:px-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="space-y-3 max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#CAA650]/40 bg-[#CAA650]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E7D1AA]">
                <CameraIcon className="w-3.5 h-3.5" />
                <span>Studio Coverage &amp; Offerings</span>
              </span>
              <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-white leading-[1.08]">
                All Photography &amp;{' '}
                <span className="italic text-[#E7D1AA]">Cinema Services</span>
              </h1>
              <p className="text-sm text-[#C7BFA9] leading-relaxed">
                From multi-day weddings and colorful Holud evenings to birthdays and intimate
                couple portraits — tailored coverage by {branding.displayName}.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <Link
                href="/#packages"
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#F4EFE4] hover:border-[#CAA650] transition-colors"
              >
                <span>View Packages</span>
              </Link>
              <Link
                href="/#inquire"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
                style={{ backgroundColor: accent }}
              >
                <span>Book Your Date</span>
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>

        <PublicServicesSection
          branding={branding}
          servicesEvent={servicesEvent}
          portfolioEvents={portfolioEvents}
          galleryImages={galleryImages}
          legacyPortfolio={portfolio}
          variant="all"
        />
      </main>

      <Footer branding={branding} />
    </div>
  );
}

export default function AllServicesPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="storefront" label="Loading studio services..." />}>
      <AllServicesContent />
    </Suspense>
  );
}
