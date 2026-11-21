import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { getMe } from '@/service/auth';
import { getFinancialReport } from '@/service/payments/payments.service';
import { FinancialReportWorkspace } from '@/components/module/admin/FinancialReportWorkspace';
import { PageSkeleton } from '@/components/shared/PageSkeleton';

async function AdminFinanceContent() {
  const session = await getMe();
  if (!session) redirect('/login');
  if (session.role === 'STAFF') redirect('/staff');
  if (session.role !== 'OWNER' && session.role !== 'ACCOUNTANT') {
    redirect('/admin');
  }

  const reportRes = await getFinancialReport();

  if (!reportRes.ok || !reportRes.data) {
    return (
      <div className="atelier-card p-8 text-center space-y-2">
        <p className="text-base font-bold text-slate-900">Unable to load Financial Report</p>
        <p className="text-xs text-slate-500">
          {reportRes.message || 'Ensure the NestJS backend is running and you are signed in as Owner or Accountant.'}
        </p>
      </div>
    );
  }

  return <FinancialReportWorkspace initialReport={reportRes.data} />;
}

export default function AdminFinancePage() {
  return (
    <Suspense fallback={<PageSkeleton variant="admin-finance" label="Loading financial report & ledger analytics..." />}>
      <AdminFinanceContent />
    </Suspense>
  );
}
