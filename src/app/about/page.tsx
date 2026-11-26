import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { AboutTeamShowcase } from '@/components/module/public/AboutTeamShowcase';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { JsonLd } from '@/components/shared/JsonLd';
import { loadPublicStorefront } from '@/lib/publicStorefront';
import { buildStudioJsonLdGraph } from '@/lib/seo';

export const metadata: Metadata = {
  title: 'About Us & Creative Team',
  description:
    'Meet Shahadat Hossain (Founder & Lead Photographer) and the creative photographers, cinematographers, and editors behind Wedding PhotoArt in Feni, Bangladesh since 2015.',
  alternates: {
    canonical: '/about',
  },
  openGraph: {
    type: 'website',
    url: '/about',
    title: 'About Us & Creative Team | Wedding PhotoArt',
    description:
      'Meet Founder Shahadat Hossain and the Wedding PhotoArt team — serving couples across Feni and Bangladesh since 2015.',
  },
};

async function AboutPageContent() {
  const {
    branding,
    packages,
    portfolioEvents,
    aboutTeamShowcase,
    galleryImages,
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
      <AboutTeamShowcase
        branding={branding}
        aboutTeamShowcase={aboutTeamShowcase}
      />
      <Footer branding={branding} />
    </div>
  );
}

export default function AboutPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="about" label="Loading about studio..." />}>
      <AboutPageContent />
    </Suspense>
  );
}
