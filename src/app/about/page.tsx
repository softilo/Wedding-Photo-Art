import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { AboutTeamShowcase } from '@/components/module/public/AboutTeamShowcase';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { JsonLd } from '@/components/shared/JsonLd';
import { loadPublicStorefront } from '@/lib/publicStorefront';
import { buildStudioJsonLdGraph } from '@/lib/seo';

export async function generateMetadata(): Promise<Metadata> {
  const { branding, aboutTeamShowcase } = await loadPublicStorefront();
  const featured = aboutTeamShowcase?.members?.find((m) => m.isActive && m.isFeatured)
    ?? aboutTeamShowcase?.members?.find((m) => m.isActive)
    ?? null;
  const leadSummary =
    aboutTeamShowcase?.profile?.storyLead?.trim() ||
    `Meet ${featured ? `${featured.name} and the creative team` : 'our creative team'} behind ${branding.displayName}.`;

  return {
    title: `About Us & Creative Team`,
    description: leadSummary,
    alternates: {
      canonical: '/about',
    },
    openGraph: {
      type: 'website',
      url: '/about',
      title: `About Us & Creative Team | ${branding.displayName}`,
      description: leadSummary,
    },
  };
}

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
