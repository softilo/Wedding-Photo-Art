import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
};
import { PageSkeleton } from '@/components/shared/PageSkeleton';

async function RedirectToAlbum({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return redirect(`/album/${encodeURIComponent(slug)}`);
}

export default function LegacyPortfolioRedirectPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  return (
    <Suspense
      fallback={<PageSkeleton variant="album" label="Opening digital album..." />}
    >
      <RedirectToAlbum params={params} />
    </Suspense>
  );
}
