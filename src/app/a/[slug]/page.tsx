import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

async function RedirectToAlbum({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return redirect(`/album/${encodeURIComponent(slug)}`);
}

export default function ShortAlbumRedirectPage({
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
