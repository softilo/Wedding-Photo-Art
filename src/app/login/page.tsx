import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { LoginForm } from '@/components/module/auth/LoginForm';

export const metadata: Metadata = {
  title: 'Team Portal Sign In',
  description: 'Sign in to the Wedding PhotoArt studio workspace.',
  robots: {
    index: false,
    follow: false,
  },
};
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { resolvePublicBranding } from '@/lib/publicStorefront';
import { getPublicBranding } from '@/service/agency/agency.service';

async function LoginContent({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const [params, brandRes] = await Promise.all([searchParams, getPublicBranding()]);
  const branding = resolvePublicBranding(brandRes.ok ? brandRes.data : null);
  const raw = params?.callbackUrl;
  const callbackUrl =
    typeof raw === 'string' &&
    raw.startsWith('/') &&
    !raw.startsWith('//') &&
    !raw.includes('\\') &&
    !raw.includes('://')
      ? raw
      : undefined;

  return <LoginForm callbackUrl={callbackUrl} branding={branding} />;
}

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  return (
    <Suspense fallback={<PageSkeleton variant="auth" label="Loading sign in..." />}>
      <LoginContent searchParams={searchParams} />
    </Suspense>
  );
}
