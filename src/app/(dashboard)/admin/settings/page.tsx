import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getAgencySettings } from '@/service/agency/agency.service';
import { CatalogWorkspace } from '@/components/module/admin/CatalogWorkspace';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

async function AdminSettingsContent() {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF') redirect('/staff');

  const settingsRes = await getAgencySettings();

  return (
    <CatalogWorkspace
      section="settings"
      initialSettings={settingsRes.ok && settingsRes.data ? settingsRes.data : null}
      initialPackages={[]}
      initialEventTypes={[]}
      initialMembers={[]}
    />
  );
}

export default function AdminSettingsPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-settings" label="Loading branding & studio rules..." />}>
      <AdminSettingsContent />
    </Suspense>
  );
}
