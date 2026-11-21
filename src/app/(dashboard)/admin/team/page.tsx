import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { listAgencyMembers } from '@/service/agency/agency.service';
import {
  listDeliverableLabels,
  listEventTypes,
  listTaskTemplates,
} from '@/service/catalog/catalog.service';
import { listResources } from '@/service/schedule/schedule.service';
import { TeamCrewWorkspace } from '@/components/module/admin/TeamCrewWorkspace';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

interface AdminTeamPageProps {
  searchParams?: Promise<{ tab?: string }>;
}

async function AdminTeamContent({ searchParams }: AdminTeamPageProps) {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF') redirect('/staff');

  const resolvedSearch = searchParams ? await searchParams : {};
  if (resolvedSearch.tab === 'roster') {
    redirect('/admin/crew');
  }
  const initialTab = resolvedSearch.tab === 'automation' ? 'automation' : 'members';

  const [etRes, memRes, resRes, delLabelsRes, taskTplRes] = await Promise.all([
    listEventTypes(),
    listAgencyMembers(),
    listResources(),
    listDeliverableLabels(),
    listTaskTemplates(),
  ]);

  return (
    <TeamCrewWorkspace
      currentUserId={session.id}
      currentUserRole={session.role}
      initialMembers={memRes.ok && memRes.data ? memRes.data : []}
      initialResources={resRes.ok && resRes.data ? resRes.data : []}
      initialEventTypes={etRes.ok && etRes.data ? etRes.data : []}
      initialDeliverableLabels={delLabelsRes.ok && delLabelsRes.data ? delLabelsRes.data : []}
      initialTaskTemplates={taskTplRes.ok && taskTplRes.data ? taskTplRes.data : []}
      initialTab={initialTab}
    />
  );
}

export default function AdminTeamPage({ searchParams }: AdminTeamPageProps) {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-table" label="Loading studio team & crew..." />}>
      <AdminTeamContent searchParams={searchParams} />
    </Suspense>
  );
}
