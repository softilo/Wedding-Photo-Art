import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getAgencySettings, listAgencyMembers } from '@/service/agency/agency.service';
import {
  listDeliverableLabels,
  listEventTypes,
  listPackages,
  listTaskTemplates,
} from '@/service/catalog/catalog.service';
import { CatalogWorkspace } from '@/components/module/admin/CatalogWorkspace';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

async function AdminCatalogContent() {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF') redirect('/staff');

  const [settingsRes, pkgRes, etRes, memRes, delLabelsRes, taskTplRes] = await Promise.all([
    getAgencySettings(),
    listPackages(),
    listEventTypes(),
    listAgencyMembers(),
    listDeliverableLabels(),
    listTaskTemplates(),
  ]);

  return (
    <CatalogWorkspace
      initialSettings={settingsRes.ok && settingsRes.data ? settingsRes.data : null}
      initialPackages={pkgRes.ok && pkgRes.data ? pkgRes.data.data : []}
      initialEventTypes={etRes.ok && etRes.data ? etRes.data : []}
      initialMembers={memRes.ok && memRes.data ? memRes.data : []}
      initialDeliverableLabels={delLabelsRes.ok && delLabelsRes.data ? delLabelsRes.data : []}
      initialTaskTemplates={taskTplRes.ok && taskTplRes.data ? taskTplRes.data : []}
    />
  );
}

export default function AdminCatalogPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-table" label="Loading packages..." />}>
      <AdminCatalogContent />
    </Suspense>
  );
}
