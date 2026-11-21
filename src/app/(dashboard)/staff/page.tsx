import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getAgencySettings } from '@/service/agency/agency.service';
import {
  getMyCrewWorkspace,
  getStudioDispatch,
} from '@/service/operations/operations.service';
import { StaffWorkspace } from '@/components/module/staff/StaffWorkspace';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

async function StaffContent() {
  const session = await getMe();
  if (!session) redirect('/login');

  const isManager = session.role === 'OWNER' || session.role === 'COORDINATOR';

  const [myRes, settingsRes, dispatchRes] = await Promise.all([
    getMyCrewWorkspace(session.id),
    getAgencySettings(),
    isManager ? getStudioDispatch() : Promise.resolve(null),
  ]);

  const timezone =
    settingsRes.ok && settingsRes.data ? settingsRes.data.timezone : 'Asia/Dhaka';

  return (
    <StaffWorkspace
      userRole={session.role}
      currentUserId={session.id}
      timezone={timezone}
      initialAssignments={myRes.ok && myRes.data ? myRes.data.assignments : []}
      initialShoots={myRes.ok && myRes.data ? myRes.data.upcomingShoots : []}
      initialStudioDispatch={
        dispatchRes && dispatchRes.ok && dispatchRes.data ? dispatchRes.data : null
      }
    />
  );
}

export default function StaffPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-table" label="Loading crew dispatch & tasks..." />}>
      <StaffContent />
    </Suspense>
  );
}
