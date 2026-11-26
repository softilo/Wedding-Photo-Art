'use client';

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  BookingStatus,
  ExpenseCategory,
  FinancialReportData,
  PaymentMethod,
} from '@/types/event-management';
import {
  deleteExpense,
  getFinancialReport,
  recordExpense,
  rejectPayment,
  verifyPayment,
} from '@/service/payments/payments.service';
import {
  cn,
  formatDateTimeInTz,
  formatLocalDate,
  formatPoisha,
} from '@/lib/utils';
import {
  ChevronDownIcon,
  DownloadIcon,
  PlusIcon,
  ReceiptIcon,
  SearchIcon,
} from '@/components/shared/Icons';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  BreakdownDonutChart,
  formatCompactPoisha,
  formatMonthShort,
  GroupedBarChart,
  HorizontalRankBars,
} from './AdminCharts';
import { BookingQuickDrawer } from './BookingQuickDrawer';

interface FinancialReportWorkspaceProps {
  initialReport: FinancialReportData;
}

type FinanceTab = 'overview' | 'breakdown' | 'receivables' | 'expenses' | 'ledger';
type DatePreset = 'ALL' | 'THIS_MONTH' | 'LAST_30' | 'THIS_YEAR' | 'CUSTOM';

const METHOD_META: Record<PaymentMethod, { label: string; color: string }> = {
  BKASH: { label: 'bKash', color: '#E11D48' },
  NAGAD: { label: 'Nagad', color: '#F97316' },
  BANK: { label: 'Bank Transfer', color: '#CAA650' },
  CASH: { label: 'Cash', color: '#10B981' },
  OTHER: { label: 'Other', color: '#8A7F69' },
};

const EXPENSE_CATEGORY_META: Record<
  ExpenseCategory,
  { label: string; hint: string; color: string; isEventDirectDefault?: boolean }
> = {
  CREW_PAYOUT: {
    label: 'Crew & Freelancer Payout',
    hint: 'Photographers, cinematographers, editors, assistants',
    color: '#CAA650',
  },
  ALBUM_PRINTING: {
    label: 'Album & Lab Printing',
    hint: 'Story albums, photo frames, pen-drive boxes',
    color: '#8B6A21',
  },
  EQUIPMENT_RENTAL: {
    label: 'Camera & Gear Rental',
    hint: 'Lenses, drone, crane, gimbal, lighting kits',
    color: '#0284C7',
  },
  TRANSPORT_FOOD: {
    label: 'Transport & Crew Food',
    hint: 'Venue travel, fuel, microbus, crew meals',
    color: '#D97706',
  },
  VENUE_DECOR: {
    label: 'Stage, Venue & Vendor',
    hint: 'Sub-contracted stage, floral, sound, or lighting',
    color: '#E11D48',
  },
  STUDIO_OVERHEAD: {
    label: 'Studio Rent & Utilities',
    hint: 'Office rent, electricity, internet, cloud storage',
    color: '#475569',
  },
  MARKETING: {
    label: 'Marketing & Ads',
    hint: 'Facebook/Instagram boosting, bridal fair, promos',
    color: '#10B981',
  },
  OTHER: {
    label: 'Other Expense',
    hint: 'Miscellaneous studio or event expense',
    color: '#64748B',
  },
};

function escapeCsvCell(value: string | number | null | undefined): string {
  const str = String(value ?? '');
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function FinancialReportWorkspace({ initialReport }: FinancialReportWorkspaceProps) {
  const router = useRouter();
  const [report, setReport] = useState<FinancialReportData>(initialReport);
  const [activeTab, setActiveTab] = useState<FinanceTab>('overview');
  const [activePreset, setActivePreset] = useState<DatePreset>(
    initialReport.filters.from || initialReport.filters.to ? 'CUSTOM' : 'ALL',
  );

  // Server filter state
  const [fromDate, setFromDate] = useState(initialReport.filters.from || '');
  const [toDate, setToDate] = useState(initialReport.filters.to || '');
  const [methodFilter, setMethodFilter] = useState<string>(initialReport.filters.method || 'ALL');
  const [bookingStatusFilter, setBookingStatusFilter] = useState<string>(
    initialReport.filters.bookingStatus || 'ALL',
  );

  // Tab-local search & sub-filters
  const [searchQuery, setSearchQuery] = useState('');
  const [receivableSubFilter, setReceivableSubFilter] = useState<
    'ALL' | 'DUE' | 'PAID' | 'PENDING'
  >('ALL');
  const [expenseScopeFilter, setExpenseScopeFilter] = useState<'ALL' | 'BOOKING' | 'OVERHEAD'>('ALL');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState<'ALL' | ExpenseCategory>('ALL');
  const [ledgerSubFilter, setLedgerSubFilter] = useState<
    'ALL' | 'PENDING' | 'VERIFIED' | 'REFUND' | 'REJECTED'
  >('ALL');

  // Record Expense Modal State
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expCategory, setExpCategory] = useState<ExpenseCategory>('CREW_PAYOUT');
  const [expTitle, setExpTitle] = useState('');
  const [expVendor, setExpVendor] = useState('');
  const [expAmountTk, setExpAmountTk] = useState('');
  const [expMethod, setExpMethod] = useState<PaymentMethod>('BKASH');
  const [expRef, setExpRef] = useState('');
  const [expDate, setExpDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [expBookingId, setExpBookingId] = useState('');
  const [expNotes, setExpNotes] = useState('');

  // Export menu + Quick Drawer + Inline actions
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const [drawerState, setDrawerState] = useState<{
    bookingId: string;
    focus: 'overview' | 'payments' | 'confirm' | 'schedule' | 'deliverables';
  } | null>(null);
  const [confirmDeleteExpenseId, setConfirmDeleteExpenseId] = useState<string | null>(null);
  const [rejectingEntryId, setRejectingEntryId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!exportOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setExportOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [exportOpen]);

  const notify = (type: 'ok' | 'err', text: string) => setFeedback({ type, text });

  const refreshReport = (overrides?: {
    from?: string;
    to?: string;
    method?: string;
    bookingStatus?: string;
  }) => {
    const nextFrom = overrides?.from !== undefined ? overrides.from : fromDate;
    const nextTo = overrides?.to !== undefined ? overrides.to : toDate;
    const nextMethod = overrides?.method !== undefined ? overrides.method : methodFilter;
    const nextBookingStatus =
      overrides?.bookingStatus !== undefined ? overrides.bookingStatus : bookingStatusFilter;

    startTransition(async () => {
      const res = await getFinancialReport({
        from: nextFrom || undefined,
        to: nextTo || undefined,
        method: nextMethod !== 'ALL' ? (nextMethod as PaymentMethod) : undefined,
        bookingStatus:
          nextBookingStatus !== 'ALL' ? (nextBookingStatus as BookingStatus) : undefined,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to load financial report.');
        return;
      }
      setReport(res.data);
    });
  };

  const applyDatePreset = (preset: Exclude<DatePreset, 'CUSTOM'>) => {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    let nextFrom = '';
    let nextTo = '';
    if (preset === 'THIS_MONTH') {
      nextFrom = `${yyyy}-${mm}-01`;
      nextTo = todayStr;
    } else if (preset === 'LAST_30') {
      const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      nextFrom = `${past.getFullYear()}-${String(past.getMonth() + 1).padStart(2, '0')}-${String(
        past.getDate(),
      ).padStart(2, '0')}`;
      nextTo = todayStr;
    } else if (preset === 'THIS_YEAR') {
      nextFrom = `${yyyy}-01-01`;
      nextTo = `${yyyy}-12-31`;
    }

    setActivePreset(preset);
    setFromDate(nextFrom);
    setToDate(nextTo);
    refreshReport({ from: nextFrom, to: nextTo });
  };

  const handleResetFilters = () => {
    setActivePreset('ALL');
    setFromDate('');
    setToDate('');
    setMethodFilter('ALL');
    setBookingStatusFilter('ALL');
    refreshReport({ from: '', to: '', method: 'ALL', bookingStatus: 'ALL' });
  };

  const handleRecordExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amountPoisha = Math.round((Number(expAmountTk) || 0) * 100);
    if (!Number.isFinite(amountPoisha) || amountPoisha <= 0) {
      notify('err', 'Please enter a valid expense amount greater than Tk 0.');
      return;
    }

    startTransition(async () => {
      const res = await recordExpense({
        category: expCategory,
        title: expTitle.trim(),
        vendorOrPayee: expVendor.trim() || undefined,
        amountPoisha,
        method: expMethod,
        reference: expRef.trim() || undefined,
        incurredOn: expDate || undefined,
        bookingId: expBookingId || undefined,
        notes: expNotes.trim() || undefined,
      });

      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to record expense.');
        return;
      }

      setExpTitle('');
      setExpVendor('');
      setExpAmountTk('');
      setExpRef('');
      setExpNotes('');
      setShowExpenseModal(false);
      notify(
        'ok',
        `Recorded expense "${res.data.title}" (${formatPoisha(res.data.amountPoisha, report.currency)}).`,
      );
      refreshReport();
    });
  };

  const handleDeleteExpense = (expenseId: string) => {
    startTransition(async () => {
      const res = await deleteExpense(expenseId);
      if (!res.ok) {
        notify('err', res.message || 'Failed to delete expense.');
        return;
      }
      setConfirmDeleteExpenseId(null);
      notify('ok', 'Expense entry deleted and profit recalculated.');
      refreshReport();
    });
  };

  const handleVerifyEntry = (paymentId: string) => {
    startTransition(async () => {
      const res = await verifyPayment(paymentId);
      if (!res.ok) {
        notify('err', res.message || 'Failed to verify payment receipt.');
        return;
      }
      notify('ok', 'Payment verified and added to collected revenue.');
      window.dispatchEvent(new Event('rongilo-notifications-refresh'));
      refreshReport();
      router.refresh();
    });
  };

  const handleRejectEntry = (e: React.FormEvent, paymentId: string) => {
    e.preventDefault();
    if (!rejectReason.trim()) return;
    startTransition(async () => {
      const res = await rejectPayment(paymentId, rejectReason.trim());
      if (!res.ok) {
        notify('err', res.message || 'Failed to reject payment receipt.');
        return;
      }
      setRejectingEntryId(null);
      setRejectReason('');
      notify('ok', 'Payment entry marked as rejected.');
      window.dispatchEvent(new Event('rongilo-notifications-refresh'));
      refreshReport();
      router.refresh();
    });
  };

  const handleExportReceivablesCsv = () => {
    const headers = [
      'Booking Ref',
      'Status',
      'Event Title',
      'Category',
      'Client Name',
      'Client Phone',
      'Event Date',
      'Agreed Price (Tk)',
      'Credit Notes (Tk)',
      'Effective Charge (Tk)',
      'Verified Paid (Tk)',
      'Direct Expenses (Tk)',
      'Booking Net Profit (Tk)',
      'Remaining Customer Due (Tk)',
    ];

    const rows = report.receivables.map((r) => [
      r.reference,
      r.status,
      r.eventTitle,
      r.eventTypeName || '',
      r.clientName,
      r.clientPhone,
      r.eventDate ? r.eventDate.slice(0, 10) : '',
      (r.agreedTotalPoisha / 100).toFixed(2),
      (r.creditNotesPoisha / 100).toFixed(2),
      (r.effectiveAgreedChargePoisha / 100).toFixed(2),
      (r.verifiedReceiptsPoisha / 100).toFixed(2),
      ((r.directExpensesPoisha || 0) / 100).toFixed(2),
      ((r.bookingNetProfitPoisha || 0) / 100).toFixed(2),
      (r.outstandingDuePoisha / 100).toFixed(2),
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-receivables-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const handleExportExpensesCsv = () => {
    const headers = [
      'Date',
      'Category',
      'Expense Title',
      'Vendor / Payee',
      'Linked Booking Ref',
      'Method',
      'Reference / TrxID',
      'Amount (Tk)',
      'Notes',
    ];

    const rows = (report.expenses || []).map((exp) => [
      exp.incurredOn.slice(0, 10),
      EXPENSE_CATEGORY_META[exp.category]?.label || exp.category,
      exp.title,
      exp.vendorOrPayee || '',
      exp.booking?.reference || 'General Studio Overhead',
      exp.method,
      exp.reference || '',
      (exp.amountPoisha / 100).toFixed(2),
      exp.notes || '',
    ]);

    const csvContent = [headers, ...rows]
      .map((row) => row.map(escapeCsvCell).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `financial-expenses-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExportOpen(false);
  };

  const q = searchQuery.trim().toLowerCase();

  const filteredReceivables = useMemo(() => {
    return report.receivables.filter((r) => {
      if (receivableSubFilter === 'DUE' && r.outstandingDuePoisha <= 0) return false;
      if (
        receivableSubFilter === 'PAID' &&
        (r.outstandingDuePoisha > 0 || r.status === 'CANCELLED')
      ) {
        return false;
      }
      if (receivableSubFilter === 'PENDING' && r.pendingReceiptsPoisha <= 0) return false;
      if (
        q &&
        !r.reference.toLowerCase().includes(q) &&
        !r.clientName.toLowerCase().includes(q) &&
        !r.eventTitle.toLowerCase().includes(q) &&
        !r.clientPhone.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [report.receivables, receivableSubFilter, q]);

  const filteredExpenses = useMemo(() => {
    return (report.expenses || []).filter((exp) => {
      if (expenseScopeFilter === 'BOOKING' && !exp.bookingId) return false;
      if (expenseScopeFilter === 'OVERHEAD' && exp.bookingId) return false;
      if (expenseCategoryFilter !== 'ALL' && exp.category !== expenseCategoryFilter) {
        return false;
      }
      if (
        q &&
        !exp.title.toLowerCase().includes(q) &&
        !(exp.vendorOrPayee || '').toLowerCase().includes(q) &&
        !(exp.booking?.reference || '').toLowerCase().includes(q) &&
        !(exp.reference || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [report.expenses, expenseScopeFilter, expenseCategoryFilter, q]);

  const filteredTransactions = useMemo(() => {
    return report.transactions.filter((t) => {
      if (ledgerSubFilter === 'PENDING' && t.verificationState !== 'PENDING') return false;
      if (
        ledgerSubFilter === 'VERIFIED' &&
        (t.type !== 'RECEIPT' || t.verificationState !== 'VERIFIED')
      ) {
        return false;
      }
      if (ledgerSubFilter === 'REFUND' && t.type !== 'REFUND') return false;
      if (ledgerSubFilter === 'REJECTED' && t.verificationState !== 'REJECTED') return false;
      if (
        q &&
        !t.booking.reference.toLowerCase().includes(q) &&
        !t.booking.clientName.toLowerCase().includes(q) &&
        !t.booking.eventTitle.toLowerCase().includes(q) &&
        !(t.transactionRef || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [report.transactions, ledgerSubFilter, q]);

  const { summary, currency, timezone } = report;
  const totalExpensesPoisha = summary.totalExpensesPoisha ?? 0;
  const netCashProfitPoisha =
    summary.netCashProfitPoisha ??
    summary.netCollectedRevenuePoisha - totalExpensesPoisha;
  const projectedNetProfitPoisha =
    summary.projectedNetProfitPoisha ??
    summary.effectiveContractedPoisha - totalExpensesPoisha;

  const hasActiveServerFilter =
    Boolean(fromDate) ||
    Boolean(toDate) ||
    methodFilter !== 'ALL' ||
    bookingStatusFilter !== 'ALL';

  const monthlyChartData = useMemo(() => {
    return [...report.byMonth]
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-8)
      .map((m) => {
        const exp = m.expensesPoisha ?? 0;
        const profit = m.netCashProfitPoisha ?? m.netCollectedPoisha - exp;
        return {
          label: formatMonthShort(m.month),
          sublabel: m.month,
          values: [m.netCollectedPoisha, exp, profit],
        };
      });
  }, [report.byMonth]);

  const cashflowSplitSegments = useMemo(() => {
    return [
      {
        id: 'profit',
        label: 'Net Cash Profit',
        value: Math.max(0, netCashProfitPoisha),
        displayValue: formatCompactPoisha(netCashProfitPoisha, currency),
        hint: `${(summary.profitMarginPercent ?? 0).toFixed(1)}% margin`,
        color: '#10B981',
      },
      {
        id: 'expenses',
        label: 'Studio & Event Expenses',
        value: totalExpensesPoisha,
        displayValue: formatCompactPoisha(totalExpensesPoisha, currency),
        hint: `${summary.expensesCount} recorded entries`,
        color: '#F43F5E',
      },
      {
        id: 'dues',
        label: 'Remaining Client Dues',
        value: summary.totalOutstandingDuePoisha,
        displayValue: formatCompactPoisha(summary.totalOutstandingDuePoisha, currency),
        hint: `${summary.bookingsWithDueCount} bookings with balance`,
        color: '#F59E0B',
      },
    ];
  }, [
    netCashProfitPoisha,
    totalExpensesPoisha,
    summary.profitMarginPercent,
    summary.expensesCount,
    summary.totalOutstandingDuePoisha,
    summary.bookingsWithDueCount,
    currency,
  ]);

  const eventCategoryBars = useMemo(() => {
    const maxAgreed = Math.max(
      1,
      ...report.byEventType.map((e) => e.agreedTotalPoisha),
    );
    return report.byEventType.map((et, idx) => ({
      id: et.eventTypeId,
      label: et.eventTypeName,
      value: et.agreedTotalPoisha,
      displayValue: formatPoisha(et.agreedTotalPoisha, currency),
      percent: (et.agreedTotalPoisha / maxAgreed) * 100,
      subtext: `${et.bookingsCount} bookings • Collected ${formatPoisha(et.collectedPoisha, currency)} • Due ${formatPoisha(et.outstandingDuePoisha, currency)}`,
      color: ['#CAA650', '#8B6A21', '#10B981', '#E7D1AA', '#6F6130'][idx % 5],
    }));
  }, [report.byEventType, currency]);

  const expenseCategoryBars = useMemo(() => {
    return (report.byExpenseCategory || []).map((cat) => {
      const meta = EXPENSE_CATEGORY_META[cat.category];
      return {
        id: cat.category,
        label: meta.label,
        value: cat.amountPoisha,
        displayValue: formatPoisha(cat.amountPoisha, currency),
        percent: cat.sharePercent,
        subtext: `${cat.count} ${cat.count === 1 ? 'item' : 'items'} • ${meta.hint}`,
        color: meta.color,
        onClick: () => {
          setExpenseCategoryFilter(cat.category);
          setActiveTab('expenses');
        },
      };
    });
  }, [report.byExpenseCategory, currency]);

  const inputClass =
    'w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 py-2 text-[13px] text-[var(--admin-text)] placeholder:text-[var(--admin-muted)] outline-none focus:border-[var(--admin-accent)] transition-colors';

  const compactInputClass =
    'h-8 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-2.5 text-[12.5px] text-[var(--admin-text)] outline-none focus:border-[var(--admin-accent)] transition-colors';

  return (
    <div className="space-y-5">
      {feedback && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-[13px] font-medium flex items-center justify-between gap-3',
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900',
          )}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Header & Single-Line Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="admin-page-title">Finance &amp; Profit Ledger</h1>
          <p className="admin-meta mt-1 tabular-nums">
            Collections, expenses, client receivables, and net cash profit in {currency} ({timezone})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 print:hidden">
          <button
            type="button"
            onClick={() => {
              setExpBookingId('');
              setShowExpenseModal(true);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--admin-accent)] px-3.5 py-2 text-[13px] font-semibold text-[#FCFDFD] hover:bg-[var(--admin-accent-hover)] transition-colors whitespace-nowrap cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>

          <div ref={exportRef} className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((o) => !o)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-[13px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-subtle)] transition-colors whitespace-nowrap cursor-pointer"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-[var(--admin-muted)]" />
              <span>Export CSV</span>
              <ChevronDownIcon className="w-3.5 h-3.5 text-[var(--admin-muted)]" />
            </button>

            {exportOpen && (
              <div className="absolute right-0 mt-1.5 w-48 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-1 z-30 shadow-sm">
                <button
                  type="button"
                  onClick={handleExportReceivablesCsv}
                  className="w-full text-left rounded-lg px-3 py-2 text-[12.5px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-subtle)] transition-colors cursor-pointer"
                >
                  Receivables CSV ({report.receivables.length})
                </button>
                <button
                  type="button"
                  onClick={handleExportExpensesCsv}
                  className="w-full text-left rounded-lg px-3 py-2 text-[12.5px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-subtle)] transition-colors cursor-pointer"
                >
                  Expenses CSV ({report.expenses?.length ?? 0})
                </button>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-[13px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-subtle)] transition-colors whitespace-nowrap cursor-pointer"
          >
            <ReceiptIcon className="w-3.5 h-3.5 text-[var(--admin-muted)]" />
            <span>Print</span>
          </button>
        </div>
      </div>

      {/* 4 Calm Soft-Surface Profit Equation KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-4">
        <div className="admin-card p-2.5 sm:p-5 space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] sm:text-[12.5px] font-medium text-[var(--admin-muted)]">
              <span className="h-[6px] w-[6px] sm:h-[7px] sm:w-[7px] rounded-full bg-emerald-500 shrink-0" />
              <span className="truncate">Net Collected</span>
            </span>
            <span className="font-mono-code text-[10px] sm:text-[11px] font-medium text-[var(--admin-muted)] tabular-nums shrink-0">
              {summary.collectionRatePercent.toFixed(0)}%
            </span>
          </div>
          <p className="font-mono-code text-base sm:text-[22px] font-semibold tracking-tight text-[var(--admin-text)] tabular-nums truncate">
            {formatPoisha(summary.netCollectedRevenuePoisha, currency)}
          </p>
          <p className="admin-meta tabular-nums truncate hidden sm:block">
            Verified receipts minus refunds
          </p>
        </div>

        <div className="admin-card p-2.5 sm:p-5 space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] sm:text-[12.5px] font-medium text-[var(--admin-muted)]">
              <span className="h-[6px] w-[6px] sm:h-[7px] sm:w-[7px] rounded-full bg-rose-400 shrink-0" />
              <span className="truncate">Expenses (−)</span>
            </span>
            <span className="font-mono-code text-[10px] sm:text-[11px] font-medium text-[var(--admin-muted)] tabular-nums shrink-0">
              {summary.expensesCount}
            </span>
          </div>
          <p className="font-mono-code text-base sm:text-[22px] font-semibold tracking-tight text-[var(--admin-text)] tabular-nums truncate">
            {formatPoisha(totalExpensesPoisha, currency)}
          </p>
          <p className="admin-meta tabular-nums truncate hidden sm:block">
            Event: {formatPoisha(summary.directBookingExpensesPoisha ?? 0, currency)} • Overhead:{' '}
            {formatPoisha(summary.generalOverheadExpensesPoisha ?? 0, currency)}
          </p>
        </div>

        <div className="admin-card p-2.5 sm:p-5 space-y-1 sm:space-y-2 border-[var(--admin-accent)]/35">
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] sm:text-[12.5px] font-medium text-[var(--admin-text)]">
              <span
                className={cn(
                  'h-[6px] w-[6px] sm:h-[7px] sm:w-[7px] rounded-full shrink-0',
                  netCashProfitPoisha >= 0 ? 'bg-emerald-500' : 'bg-rose-400',
                )}
              />
              <span className="truncate">Net Profit</span>
            </span>
            <span
              className={cn(
                'font-mono-code rounded-md px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-[11px] font-medium tabular-nums shrink-0',
                netCashProfitPoisha >= 0
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-rose-50 text-rose-700',
              )}
            >
              {(summary.profitMarginPercent ?? 0).toFixed(1)}%
            </span>
          </div>
          <p
            className={cn(
              'font-mono-code text-base sm:text-[22px] font-semibold tracking-tight tabular-nums truncate',
              netCashProfitPoisha >= 0 ? 'text-emerald-700' : 'text-rose-700',
            )}
          >
            {formatPoisha(netCashProfitPoisha, currency)}
          </p>
          <p className="admin-meta truncate hidden sm:block">Actual cash surplus after expenses</p>
        </div>

        <div className="admin-card p-2.5 sm:p-5 space-y-1 sm:space-y-2">
          <div className="flex items-center justify-between gap-1.5">
            <span className="inline-flex items-center gap-1.5 text-[10.5px] sm:text-[12.5px] font-medium text-[var(--admin-muted)]">
              <span className="h-[6px] w-[6px] sm:h-[7px] sm:w-[7px] rounded-full bg-[#CAA650] shrink-0" />
              <span className="truncate">Projected</span>
            </span>
            <span className="font-mono-code text-[10px] sm:text-[11px] font-medium text-[var(--admin-muted)] tabular-nums shrink-0">
              {summary.bookingsWithDueCount} due
            </span>
          </div>
          <p className="font-mono-code text-base sm:text-[22px] font-semibold tracking-tight text-[var(--admin-text)] tabular-nums truncate">
            {formatPoisha(projectedNetProfitPoisha, currency)}
          </p>
          <p className="admin-meta tabular-nums truncate hidden sm:block">
            Incl. {formatPoisha(summary.totalOutstandingDuePoisha, currency)} client due
          </p>
        </div>
      </div>

      {/* Compact Unified Filter Strip */}
      <div className="admin-card px-3.5 sm:px-4 py-3 flex flex-col xl:flex-row xl:items-center justify-between gap-3 print:hidden">
        <div className="flex items-center overflow-x-auto no-scrollbar max-w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-1 gap-1 self-start">
          {[
            { id: 'ALL' as const, label: 'All Time' },
            { id: 'THIS_MONTH' as const, label: 'This Month' },
            { id: 'LAST_30' as const, label: 'Last 30d' },
            { id: 'THIS_YEAR' as const, label: 'This Year' },
          ].map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyDatePreset(preset.id)}
              className={cn(
                'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap',
                activePreset === preset.id
                  ? 'bg-[var(--admin-surface)] text-[var(--admin-text)] border border-[var(--admin-border)]'
                  : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
              )}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-[11.5px] font-medium text-[var(--admin-muted)]">From</span>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setActivePreset('CUSTOM');
              }}
              className={`${compactInputClass} font-mono-code`}
            />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[11.5px] font-medium text-[var(--admin-muted)]">To</span>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setActivePreset('CUSTOM');
              }}
              className={`${compactInputClass} font-mono-code`}
            />
          </div>

          <select
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              refreshReport({ method: e.target.value });
            }}
            aria-label="Filter by payment method"
            className={compactInputClass}
          >
            <option value="ALL">All Channels</option>
            <option value="BKASH">bKash</option>
            <option value="NAGAD">Nagad</option>
            <option value="BANK">Bank Transfer</option>
            <option value="CASH">Cash</option>
          </select>

          <select
            value={bookingStatusFilter}
            onChange={(e) => {
              setBookingStatusFilter(e.target.value);
              refreshReport({ bookingStatus: e.target.value });
            }}
            aria-label="Filter by booking status"
            className={compactInputClass}
          >
            <option value="ALL">All Statuses</option>
            <option value="PENDING_CONFIRMATION">Pending Confirmation</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <button
            type="button"
            disabled={isPending}
            onClick={() => refreshReport()}
            className="h-8 rounded-lg bg-[var(--admin-accent)] px-3 text-xs font-semibold text-[#FCFDFD] hover:bg-[var(--admin-accent-hover)] transition-colors cursor-pointer whitespace-nowrap"
          >
            {isPending ? 'Loading...' : 'Apply'}
          </button>

          {hasActiveServerFilter && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="h-8 px-2 text-xs font-medium text-[var(--admin-muted)] hover:text-[var(--admin-text)] underline cursor-pointer"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* 5 Clean Category Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center overflow-x-auto no-scrollbar max-w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-1 gap-1">
          {[
            { id: 'overview' as const, label: 'Overview & Charts' },
            { id: 'breakdown' as const, label: 'Channels & Costs' },
            {
              id: 'receivables' as const,
              label: `Receivables (${report.receivables.length})`,
            },
            {
              id: 'expenses' as const,
              label: `Expenses (${report.expenses?.length ?? 0})`,
            },
            {
              id: 'ledger' as const,
              label: `Receipt Ledger (${report.transactions.length})`,
              alertCount: summary.pendingReceiptsCount,
            },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12.5px] font-medium transition-colors cursor-pointer whitespace-nowrap tabular-nums',
                activeTab === tab.id
                  ? 'bg-[var(--admin-surface)] text-[var(--admin-text)] border border-[var(--admin-border)]'
                  : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
              )}
            >
              {tab.alertCount !== undefined && tab.alertCount > 0 && (
                <span className="h-[6px] w-[6px] rounded-full bg-amber-500 shrink-0" />
              )}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {summary.pendingReceiptsCount > 0 && activeTab !== 'ledger' && (
          <button
            type="button"
            onClick={() => {
              setLedgerSubFilter('PENDING');
              setActiveTab('ledger');
            }}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-[var(--admin-accent)] hover:underline cursor-pointer tabular-nums"
          >
            <span className="h-[6px] w-[6px] rounded-full bg-amber-500 shrink-0" />
            <span>{summary.pendingReceiptsCount} receipts awaiting verification →</span>
          </button>
        )}
      </div>

      {/* TAB 1: OVERVIEW CHARTS & MONTHLY P&L STATEMENT */}
      {activeTab === 'overview' && (
        <div className="space-y-5">
          <div className="grid gap-5 lg:grid-cols-12">
            <section className="lg:col-span-7 admin-card p-4 sm:p-5 space-y-4">
              <div className="border-b border-[var(--admin-border)] pb-3">
                <h2 className="admin-section-title">Monthly Cashflow &amp; Net Profit</h2>
                <p className="admin-meta">
                  Collected receipts vs. recorded expenses vs. cash profit ({timezone})
                </p>
              </div>
              <GroupedBarChart
                data={monthlyChartData}
                series={[
                  { key: 'collected', label: 'Collected', color: '#10B981' },
                  { key: 'expenses', label: 'Expenses', color: '#9E6359' },
                  { key: 'profit', label: 'Net Profit', color: '#CAA650' },
                ]}
                formatValue={(v) => formatPoisha(v, currency)}
                formatAxis={(v) => formatCompactPoisha(v, currency)}
                emptyMessage="No monthly financial entries recorded for this period."
              />
            </section>

            <section className="lg:col-span-5 admin-card p-4 sm:p-5 space-y-4">
              <div className="border-b border-[var(--admin-border)] pb-3">
                <h2 className="admin-section-title">Studio Cashflow Split</h2>
                <p className="admin-meta">
                  Distribution of net profit, expenses, and pending client balances
                </p>
              </div>
              <BreakdownDonutChart
                segments={cashflowSplitSegments}
                centerLabel="Collected"
                centerValue={formatCompactPoisha(summary.netCollectedRevenuePoisha, currency)}
                emptyMessage="No verified collections or dues recorded yet."
              />
            </section>
          </div>

          <section className="admin-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-border)] pb-3">
              <div>
                <h2 className="admin-section-title">Monthly Statement</h2>
                <p className="admin-meta">Grouped by agency local month ({timezone})</p>
              </div>
              <span className="admin-meta tabular-nums">{report.byMonth.length} months</span>
            </div>

            {report.byMonth.length === 0 ? (
              <p className="admin-meta py-8 text-center">
                No monthly financial records for this period.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)] text-[11.5px] font-medium uppercase tracking-wide">
                      <th className="py-2.5 pr-3">Month</th>
                      <th className="py-2.5 px-2 text-right">Contracted</th>
                      <th className="py-2.5 px-2 text-right">Net Collected</th>
                      <th className="py-2.5 px-2 text-right">Expenses</th>
                      <th className="py-2.5 pl-2 text-right">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--admin-border)]">
                    {report.byMonth.map((m) => {
                      const monthExpenses = m.expensesPoisha ?? 0;
                      const monthProfit =
                        m.netCashProfitPoisha ?? m.netCollectedPoisha - monthExpenses;
                      return (
                        <tr
                          key={m.month}
                          className="hover:bg-[var(--admin-surface-subtle)] transition-colors"
                        >
                          <td className="py-3 pr-3 font-mono-code font-medium text-[var(--admin-text)] tabular-nums">
                            {m.month}{' '}
                            <span className="text-[11.5px] font-normal text-[var(--admin-muted)]">
                              ({m.bookingsCount} bkg)
                            </span>
                          </td>
                          <td className="py-3 px-2 text-right font-mono-code text-[var(--admin-muted)] tabular-nums">
                            {formatPoisha(m.contractedPoisha, currency)}
                          </td>
                          <td className="py-3 px-2 text-right font-mono-code font-medium text-emerald-700 tabular-nums">
                            {formatPoisha(m.netCollectedPoisha, currency)}
                          </td>
                          <td className="py-3 px-2 text-right font-mono-code text-rose-700 tabular-nums">
                            {monthExpenses > 0
                              ? `-${formatPoisha(monthExpenses, currency)}`
                              : formatPoisha(0, currency)}
                          </td>
                          <td
                            className={cn(
                              'py-3 pl-2 text-right font-mono-code font-semibold tabular-nums',
                              monthProfit >= 0 ? 'text-[var(--admin-text)]' : 'text-rose-700',
                            )}
                          >
                            {formatPoisha(monthProfit, currency)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      )}

      {/* TAB 2: PAYMENT CHANNELS, EVENT TYPES & EXPENSE CATEGORIES */}
      {activeTab === 'breakdown' && (
        <div className="space-y-5">
          {/* Payment Channels */}
          <section className="admin-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-border)] pb-3">
              <div>
                <h2 className="admin-section-title">Collections by Payment Channel</h2>
                <p className="admin-meta">
                  Verified collections, unverified pending amounts, and share by channel
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('ledger')}
                className="text-xs font-medium text-[var(--admin-accent)] hover:underline cursor-pointer"
              >
                Open Receipt Ledger →
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {report.byMethod
                .filter((m) => m.method !== 'OTHER' || m.transactionCount > 0)
                .map((m) => {
                  const meta = METHOD_META[m.method];
                  return (
                    <div
                      key={m.method}
                      className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--admin-text)]">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: meta.color }}
                          />
                          <span>{meta.label}</span>
                        </span>
                        <span className="font-mono-code text-xs text-[var(--admin-muted)] tabular-nums">
                          {m.sharePercent.toFixed(1)}%
                        </span>
                      </div>

                      <div>
                        <p className="text-[11px] font-medium uppercase tracking-wide text-[var(--admin-muted)]">
                          Net Verified
                        </p>
                        <p className="font-mono-code text-[18px] font-semibold text-[var(--admin-text)] tabular-nums mt-0.5">
                          {formatPoisha(m.netCollectedPoisha, currency)}
                        </p>
                      </div>

                      <div className="h-1.5 w-full rounded-full bg-[var(--admin-border)] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${m.sharePercent > 0 ? Math.max(4, Math.min(100, m.sharePercent)) : 0}%`,
                            backgroundColor: meta.color,
                          }}
                        />
                      </div>

                      <div className="space-y-1 pt-1 border-t border-[var(--admin-border)] text-[12px] text-[var(--admin-muted)] tabular-nums">
                        <div className="flex justify-between">
                          <span>Verified:</span>
                          <span className="font-mono-code font-medium text-[var(--admin-text)]">
                            {formatPoisha(m.verifiedReceiptsPoisha, currency)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Pending verify:</span>
                          <span className="font-mono-code font-medium text-amber-700">
                            {formatPoisha(m.pendingReceiptsPoisha, currency)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>

          {/* Two-Column Breakdown: Event Categories & Expense Categories */}
          <div className="grid gap-5 lg:grid-cols-12">
            <section className="lg:col-span-6 admin-card p-4 sm:p-5 space-y-4">
              <div className="border-b border-[var(--admin-border)] pb-3">
                <h2 className="admin-section-title">Revenue by Event Category</h2>
                <p className="admin-meta">
                  Contracted value, collected totals, and remaining dues per event type
                </p>
              </div>
              <HorizontalRankBars
                items={eventCategoryBars}
                emptyMessage="No active bookings found for category breakdown."
              />
            </section>

            <section className="lg:col-span-6 admin-card p-4 sm:p-5 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--admin-border)] pb-3">
                <div>
                  <h2 className="admin-section-title">Expenses by Category</h2>
                  <p className="admin-meta">Click any category row to filter its entries</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setExpBookingId('');
                    setShowExpenseModal(true);
                  }}
                  className="text-xs font-medium text-[var(--admin-accent)] hover:underline cursor-pointer"
                >
                  + Log Expense
                </button>
              </div>
              <HorizontalRankBars
                items={expenseCategoryBars}
                emptyMessage="No expense categories recorded yet."
              />
            </section>
          </div>
        </div>
      )}

      {/* TAB 3: ACCOUNTS RECEIVABLE & PER-BOOKING PROFITABILITY */}
      {activeTab === 'receivables' && (
        <section className="admin-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-4">
            <div className="inline-flex flex-wrap rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-1 gap-1 self-start">
              {[
                { id: 'ALL' as const, label: `All (${report.receivables.length})` },
                { id: 'DUE' as const, label: `Has Due (${summary.bookingsWithDueCount})` },
                { id: 'PAID' as const, label: `Paid Full (${summary.fullyPaidBookingsCount})` },
                { id: 'PENDING' as const, label: 'Pending Verify' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setReceivableSubFilter(st.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer tabular-nums',
                    receivableSubFilter === st.id
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-text)] border border-[var(--admin-border)]'
                      : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                  )}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <SearchIcon className="w-3.5 h-3.5 text-[var(--admin-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ref, client, or phone..."
                className="w-full h-8 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] pl-8 pr-3 text-xs text-[var(--admin-text)] outline-none focus:border-[var(--admin-accent)]"
              />
            </div>
          </div>

          {filteredReceivables.length === 0 ? (
            <p className="admin-meta py-10 text-center">
              No bookings match this receivable filter.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--admin-border)] text-[var(--admin-muted)] uppercase text-[11px] font-medium">
                    <th className="py-2.5 pr-3">Booking</th>
                    <th className="py-2.5 px-2">Client &amp; Event</th>
                    <th className="py-2.5 px-2 text-right">Agreed</th>
                    <th className="py-2.5 px-2 text-right">Verified Paid</th>
                    <th className="py-2.5 px-2 text-right">Expenses</th>
                    <th className="py-2.5 px-2 text-right">Net Profit</th>
                    <th className="py-2.5 px-2 text-right">Client Due</th>
                    <th className="py-2.5 pl-2 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--admin-border)]">
                  {filteredReceivables.map((r) => {
                    const directExp = r.directExpensesPoisha ?? 0;
                    const bkgProfit =
                      r.bookingNetProfitPoisha ?? r.verifiedReceiptsPoisha - directExp;
                    return (
                      <tr
                        key={r.bookingId}
                        className="hover:bg-[var(--admin-surface-subtle)] transition-colors"
                      >
                        <td className="py-3 pr-3 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setDrawerState({ bookingId: r.bookingId, focus: 'overview' })
                              }
                              className="font-mono-code font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer tabular-nums"
                            >
                              {r.reference}
                            </button>
                            <StatusBadge status={r.status} />
                          </div>
                          {r.eventDate && (
                            <span className="block text-[11.5px] font-mono-code text-[var(--admin-muted)] mt-0.5 tabular-nums">
                              {formatLocalDate(r.eventDate)}
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-2 max-w-[240px]">
                          <p className="admin-row-title line-clamp-1">{r.eventTitle}</p>
                          <p className="admin-meta line-clamp-1 tabular-nums">
                            {r.clientName} ({r.clientPhone})
                          </p>
                        </td>

                        <td className="py-3 px-2 text-right font-mono-code text-[var(--admin-text)] tabular-nums whitespace-nowrap">
                          {formatPoisha(r.effectiveAgreedChargePoisha, currency)}
                        </td>

                        <td className="py-3 px-2 text-right font-mono-code font-medium text-emerald-700 tabular-nums whitespace-nowrap">
                          {formatPoisha(r.verifiedReceiptsPoisha, currency)}
                        </td>

                        <td className="py-3 px-2 text-right font-mono-code text-rose-700 tabular-nums whitespace-nowrap">
                          {directExp > 0
                            ? `-${formatPoisha(directExp, currency)}`
                            : formatPoisha(0, currency)}
                        </td>

                        <td
                          className={cn(
                            'py-3 px-2 text-right font-mono-code font-semibold tabular-nums whitespace-nowrap',
                            bkgProfit >= 0 ? 'text-[var(--admin-text)]' : 'text-rose-700',
                          )}
                        >
                          {formatPoisha(bkgProfit, currency)}
                        </td>

                        <td className="py-3 px-2 text-right font-mono-code font-medium tabular-nums whitespace-nowrap">
                          {r.status === 'CANCELLED' ? (
                            <span className="text-[var(--admin-muted)]">Cancelled</span>
                          ) : r.outstandingDuePoisha <= 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-[12px] text-emerald-700">
                              <span className="h-[6px] w-[6px] rounded-full bg-emerald-500" />
                              Paid
                            </span>
                          ) : (
                            <span className="text-amber-700">
                              {formatPoisha(r.outstandingDuePoisha, currency)}
                            </span>
                          )}
                        </td>

                        <td className="py-3 pl-2 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setExpBookingId(r.bookingId);
                                setShowExpenseModal(true);
                              }}
                              className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-1 text-[11.5px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-subtle)] cursor-pointer"
                            >
                              + Cost
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setDrawerState({ bookingId: r.bookingId, focus: 'payments' })
                              }
                              className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-1 text-[11.5px] font-medium text-[var(--admin-accent)] hover:bg-[var(--admin-surface-subtle)] cursor-pointer"
                            >
                              Inspect
                            </button>
                            <a
                              href={`/api/bookings/${encodeURIComponent(r.bookingId)}/invoice.pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-2 py-1 text-[11.5px] font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)]"
                            >
                              PDF
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* TAB 4: STUDIO & EVENT EXPENSES LEDGER */}
      {activeTab === 'expenses' && (
        <section className="admin-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-1 gap-1">
                {[
                  { id: 'ALL' as const, label: `All (${report.expenses?.length ?? 0})` },
                  { id: 'BOOKING' as const, label: 'Event Costs' },
                  { id: 'OVERHEAD' as const, label: 'Overhead' },
                ].map((sc) => (
                  <button
                    key={sc.id}
                    type="button"
                    onClick={() => setExpenseScopeFilter(sc.id)}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer tabular-nums',
                      expenseScopeFilter === sc.id
                        ? 'bg-[var(--admin-surface)] text-[var(--admin-text)] border border-[var(--admin-border)]'
                        : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                    )}
                  >
                    {sc.label}
                  </button>
                ))}
              </div>

              <select
                value={expenseCategoryFilter}
                onChange={(e) =>
                  setExpenseCategoryFilter(e.target.value as 'ALL' | ExpenseCategory)
                }
                aria-label="Filter expenses by category"
                className={compactInputClass}
              >
                <option value="ALL">All Categories</option>
                {(Object.keys(EXPENSE_CATEGORY_META) as ExpenseCategory[]).map((cat) => (
                  <option key={cat} value={cat}>
                    {EXPENSE_CATEGORY_META[cat].label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-56">
                <SearchIcon className="w-3.5 h-3.5 text-[var(--admin-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search title, vendor, ref..."
                  className="w-full h-8 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] pl-8 pr-3 text-xs text-[var(--admin-text)] outline-none focus:border-[var(--admin-accent)]"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  setExpBookingId('');
                  setShowExpenseModal(true);
                }}
                className="shrink-0 h-8 rounded-lg bg-[var(--admin-accent)] px-3 text-xs font-semibold text-[#FCFDFD] hover:bg-[var(--admin-accent-hover)] cursor-pointer whitespace-nowrap"
              >
                + Add Expense
              </button>
            </div>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="admin-row-title">No expenses match this view</p>
              <p className="admin-meta">
                Click &ldquo;+ Record Expense&rdquo; to log crew payouts, lab printing, gear
                rentals, or studio overheads.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--admin-border)]">
              {filteredExpenses.map((exp) => {
                const catMeta = EXPENSE_CATEGORY_META[exp.category] || EXPENSE_CATEGORY_META.OTHER;
                const methodMeta = METHOD_META[exp.method] || METHOD_META.CASH;
                const confirmingDelete = confirmDeleteExpenseId === exp.id;
                return (
                  <div
                    key={exp.id}
                    className="py-3.5 flex flex-wrap items-center justify-between gap-3 text-[13px]"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-[12px]">
                        <span className="inline-flex items-center gap-1.5 font-medium text-[var(--admin-text)]">
                          <span
                            className="h-2 w-2 rounded-full shrink-0"
                            style={{ backgroundColor: catMeta.color }}
                          />
                          {catMeta.label}
                        </span>
                        <span className="text-[var(--admin-muted)]">• {methodMeta.label}</span>
                        <span className="font-mono-code text-[var(--admin-muted)] tabular-nums">
                          {formatLocalDate(exp.incurredOn)}
                        </span>
                        {exp.booking ? (
                          <button
                            type="button"
                            onClick={() =>
                              setDrawerState({ bookingId: exp.booking!.id, focus: 'overview' })
                            }
                            className="font-mono-code font-medium text-[var(--admin-accent)] hover:underline cursor-pointer"
                          >
                            {exp.booking.reference} • {exp.booking.eventTitle}
                          </button>
                        ) : (
                          <span className="text-[var(--admin-muted)]">Studio Overhead</span>
                        )}
                      </div>

                      <p className="admin-row-title line-clamp-1">
                        {exp.title}
                        {exp.vendorOrPayee && (
                          <span className="font-normal text-[var(--admin-muted)]">
                            {' '}
                            • Paid to {exp.vendorOrPayee}
                          </span>
                        )}
                      </p>

                      {(exp.reference || exp.notes) && (
                        <p className="admin-meta line-clamp-1">
                          {exp.reference ? `Ref: ${exp.reference}` : ''}
                          {exp.reference && exp.notes ? ' • ' : ''}
                          {exp.notes || ''}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <span className="font-mono-code text-[14px] font-semibold text-rose-700 tabular-nums">
                        -{formatPoisha(exp.amountPoisha, exp.currency)}
                      </span>

                      {confirmingDelete ? (
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="rounded-md bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
                          >
                            Confirm
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteExpenseId(null)}
                            className="rounded-md border border-[var(--admin-border)] px-2 py-1 text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => setConfirmDeleteExpenseId(exp.id)}
                          className="rounded-md border border-[var(--admin-border)] px-2.5 py-1 text-xs font-medium text-[var(--admin-muted)] hover:text-rose-700 hover:bg-rose-50 cursor-pointer"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* TAB 5: CUSTOMER TRANSACTION LEDGER & VERIFICATION QUEUE */}
      {activeTab === 'ledger' && (
        <section className="admin-card p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[var(--admin-border)] pb-4">
            <div className="inline-flex flex-wrap rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-1 gap-1 self-start">
              {[
                { id: 'ALL' as const, label: `All (${report.transactions.length})` },
                {
                  id: 'PENDING' as const,
                  label: `Pending Verify (${summary.pendingReceiptsCount})`,
                },
                { id: 'VERIFIED' as const, label: 'Verified' },
                { id: 'REFUND' as const, label: 'Refunds' },
                { id: 'REJECTED' as const, label: 'Rejected' },
              ].map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setLedgerSubFilter(st.id)}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium transition-colors cursor-pointer tabular-nums',
                    ledgerSubFilter === st.id
                      ? 'bg-[var(--admin-surface)] text-[var(--admin-text)] border border-[var(--admin-border)]'
                      : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                  )}
                >
                  {st.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-64">
              <SearchIcon className="w-3.5 h-3.5 text-[var(--admin-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search TrxID, ref, client..."
                className="w-full h-8 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] pl-8 pr-3 text-xs text-[var(--admin-text)] outline-none focus:border-[var(--admin-accent)]"
              />
            </div>
          </div>

          {filteredTransactions.length === 0 ? (
            <p className="admin-meta py-10 text-center">
              No payment ledger entries match this filter.
            </p>
          ) : (
            <div className="divide-y divide-[var(--admin-border)]">
              {filteredTransactions.map((t) => {
                const methodMeta = METHOD_META[t.method];
                return (
                  <div key={t.id} className="py-3.5 space-y-2 text-[13px]">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="min-w-0 space-y-0.5">
                        <div className="flex flex-wrap items-center gap-2 text-[12px]">
                          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--admin-text)]">
                            <span
                              className="h-2 w-2 rounded-full shrink-0"
                              style={{ backgroundColor: methodMeta.color }}
                            />
                            {methodMeta.label}
                          </span>
                          <span className="text-[var(--admin-muted)] capitalize">
                            {t.type.toLowerCase()}
                          </span>
                          {t.transactionRef && (
                            <span className="font-mono-code rounded border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-1.5 py-0.5 text-[11px] text-[var(--admin-text)] tabular-nums">
                              TrxID: {t.transactionRef}
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() =>
                              setDrawerState({ bookingId: t.booking.id, focus: 'payments' })
                            }
                            className="font-mono-code font-semibold text-[var(--admin-accent)] hover:underline cursor-pointer tabular-nums"
                          >
                            {t.booking.reference}
                          </button>
                          <span className="text-[var(--admin-muted)]">
                            • {t.booking.clientName}
                          </span>
                        </div>
                        <p className="admin-meta line-clamp-1 tabular-nums">
                          {t.booking.eventTitle} • {formatDateTimeInTz(t.createdAt, timezone)}
                          {t.reason ? ` • ${t.reason}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span
                          className={cn(
                            'font-mono-code text-[14px] font-semibold tabular-nums',
                            t.type === 'REFUND' ? 'text-rose-700' : 'text-[var(--admin-text)]',
                          )}
                        >
                          {t.type === 'REFUND' ? '-' : ''}
                          {formatPoisha(t.amountPoisha, t.currency)}
                        </span>

                        <StatusBadge status={t.verificationState} />

                        {t.verificationState === 'PENDING' &&
                          t.booking.status !== 'CANCELLED' && (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleVerifyEntry(t.id)}
                                className="rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 cursor-pointer"
                              >
                                Verify
                              </button>
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() =>
                                  setRejectingEntryId(rejectingEntryId === t.id ? null : t.id)
                                }
                                className="rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 cursor-pointer"
                              >
                                Reject
                              </button>
                            </div>
                          )}
                      </div>
                    </div>

                    {rejectingEntryId === t.id && (
                      <form
                        onSubmit={(e) => handleRejectEntry(e, t.id)}
                        className="rounded-lg border border-rose-200 bg-rose-50/70 p-2.5 flex flex-wrap items-center gap-2"
                      >
                        <input
                          required
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Reason for rejecting this receipt (e.g. invalid TrxID)"
                          className="flex-1 min-w-[200px] h-8 rounded-md border border-rose-200 bg-[var(--admin-surface)] px-2.5 text-xs text-[var(--admin-text)] outline-none"
                        />
                        <button
                          type="submit"
                          disabled={isPending}
                          className="h-8 rounded-md bg-rose-600 px-3 text-xs font-semibold text-white hover:bg-rose-700 cursor-pointer"
                        >
                          Confirm Reject
                        </button>
                      </form>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* RECORD EXPENSE MODAL */}
      {showExpenseModal && (
        <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-center bg-[var(--admin-surface)] sm:bg-[#0B1020]/55 p-0 sm:p-4 sm:backdrop-blur-xs admin-sheet-fade">
          <div className="flex-1 sm:flex-initial w-full sm:max-w-xl h-dvh sm:h-auto sm:max-h-[92dvh] rounded-none sm:rounded-2xl border-0 sm:border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 sm:p-6 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 overflow-y-auto space-y-4">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--admin-border)] pb-3">
              <div>
                <h2 className="admin-section-title">Record Studio or Event Expense</h2>
                <p className="admin-meta mt-0.5">
                  Deducted from studio profit without altering customer booking dues.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowExpenseModal(false)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-[var(--admin-muted)] hover:bg-[var(--admin-surface-subtle)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordExpense} className="space-y-3.5">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-medium text-[var(--admin-muted)] mb-1">
                    Expense Category *
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value as ExpenseCategory)}
                    className={inputClass}
                  >
                    {(Object.keys(EXPENSE_CATEGORY_META) as ExpenseCategory[]).map((cat) => (
                      <option key={cat} value={cat}>
                        {EXPENSE_CATEGORY_META[cat].label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--admin-muted)] mb-1">
                    Amount ({currency}) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={expAmountTk}
                    onChange={(e) => setExpAmountTk(e.target.value)}
                    placeholder="e.g. 5000"
                    className={`${inputClass} font-mono-code tabular-nums`}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[12px] font-medium text-[var(--admin-muted)] mb-1">
                    Expense Title / Purpose *
                  </label>
                  <input
                    required
                    value={expTitle}
                    onChange={(e) => setExpTitle(e.target.value)}
                    placeholder="e.g. Freelance Cinematographer Payout / Album Print"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--admin-muted)] mb-1">
                    Vendor / Payee
                  </label>
                  <input
                    value={expVendor}
                    onChange={(e) => setExpVendor(e.target.value)}
                    placeholder="e.g. Tanvir Films / Color Lab"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--admin-muted)] mb-1">
                    Expense Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className={`${inputClass} font-mono-code`}
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--admin-muted)] mb-1">
                    Payment Method
                  </label>
                  <select
                    value={expMethod}
                    onChange={(e) => setExpMethod(e.target.value as PaymentMethod)}
                    className={inputClass}
                  >
                    <option value="BKASH">bKash</option>
                    <option value="NAGAD">Nagad</option>
                    <option value="BANK">Bank Transfer</option>
                    <option value="CASH">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[12px] font-medium text-[var(--admin-muted)] mb-1">
                    TrxID / Voucher Ref
                  </label>
                  <input
                    value={expRef}
                    onChange={(e) => setExpRef(e.target.value)}
                    placeholder="Optional reference"
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[12px] font-medium text-[var(--admin-muted)] mb-1">
                    Link to Specific Event Booking (Optional)
                  </label>
                  <select
                    value={expBookingId}
                    onChange={(e) => setExpBookingId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">General Studio Overhead (Not tied to a booking)</option>
                    {report.receivables.map((b) => (
                      <option key={b.bookingId} value={b.bookingId}>
                        {b.reference} — {b.eventTitle} ({b.clientName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[12px] font-medium text-[var(--admin-muted)] mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    value={expNotes}
                    onChange={(e) => setExpNotes(e.target.value)}
                    placeholder="Additional details..."
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowExpenseModal(false)}
                  className="rounded-lg border border-[var(--admin-border)] px-4 py-2 text-xs font-medium text-[var(--admin-muted)] hover:text-[var(--admin-text)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-lg bg-[var(--admin-accent)] px-4 py-2 text-xs font-semibold text-[#FCFDFD] hover:bg-[var(--admin-accent-hover)] cursor-pointer"
                >
                  {isPending ? 'Saving...' : 'Save Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Slide-over Quick Booking & Payment Drawer */}
      <BookingQuickDrawer
        bookingId={drawerState?.bookingId ?? null}
        focusSection={drawerState?.focus ?? 'overview'}
        timezone={timezone}
        onClose={() => setDrawerState(null)}
        onMutated={() => {
          refreshReport();
          router.refresh();
        }}
      />
    </div>
  );
}
