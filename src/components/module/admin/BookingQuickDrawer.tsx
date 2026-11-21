'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Booking,
  BookingLedgerSummary,
  Deliverable,
  PaymentEntry,
  PaymentMethod,
} from '@/types/event-management';
import { confirmBooking, getBooking } from '@/service/bookings/bookings.service';
import {
  getBookingLedger,
  recordPayment,
  rejectPayment,
  verifyPayment,
} from '@/service/payments/payments.service';
import { deliverDeliverable } from '@/service/operations/operations.service';
import { cn, formatDateTimeInTz, formatLocalDate, formatPoisha } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ArrowRightIcon, CalendarIcon, CheckCircleIcon } from '@/components/shared/Icons';

export interface BookingQuickDrawerProps {
  bookingId: string | null;
  focusSection?: 'payments' | 'confirm' | 'schedule' | 'deliverables' | 'overview';
  timezone?: string;
  onClose: () => void;
  onMutated?: () => void;
}

export function BookingQuickDrawer({
  bookingId,
  focusSection = 'overview',
  timezone = 'Asia/Dhaka',
  onClose,
  onMutated,
}: BookingQuickDrawerProps) {
  const [booking, setBooking] = useState<Booking | null>(null);
  const [ledger, setLedger] = useState<{
    summary: BookingLedgerSummary;
    entries: PaymentEntry[];
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Inline payment recording
  const [showRecordForm, setShowRecordForm] = useState(false);
  const [payAmountTk, setPayAmountTk] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('BKASH');
  const [payRef, setPayRef] = useState('');

  // Inline rejection note
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const loadDrawerData = useCallback(async (id: string) => {
    setLoading(true);
    setFeedback(null);
    const [bRes, lRes] = await Promise.all([getBooking(id), getBookingLedger(id)]);
    if (bRes.ok && bRes.data) {
      setBooking(bRes.data);
    } else {
      setFeedback({ type: 'err', text: bRes.message || 'Unable to load booking details.' });
    }
    if (lRes.ok && lRes.data) {
      setLedger(lRes.data);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!bookingId) {
      return;
    }
    const timer = window.setTimeout(() => {
      setShowRecordForm(false);
      setRejectingId(null);
      setRejectReason('');
      void loadDrawerData(bookingId);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [bookingId, loadDrawerData]);

  useEffect(() => {
    if (!bookingId) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [bookingId, onClose]);

  if (!bookingId) return null;

  const handleVerifyPayment = (paymentId: string, alsoConfirm: boolean) => {
    if (!booking) return;
    startTransition(async () => {
      const res = await verifyPayment(paymentId);
      if (!res.ok) {
        setFeedback({ type: 'err', text: res.message || 'Failed to verify payment.' });
        return;
      }
      if (alsoConfirm && res.data?.ledger.isAdvanceMet && booking.status === 'PENDING_CONFIRMATION') {
        const confRes = await confirmBooking(booking.id, booking.version);
        if (!confRes.ok) {
          setFeedback({
            type: 'err',
            text: `Payment verified, but confirm paused: ${confRes.message}`,
          });
        } else {
          setFeedback({
            type: 'ok',
            text: 'Payment verified & booking confirmed successfully.',
          });
        }
      } else {
        setFeedback({ type: 'ok', text: 'Payment receipt verified.' });
      }
      await loadDrawerData(booking.id);
      window.dispatchEvent(new Event('rongilo-notifications-refresh'));
      onMutated?.();
    });
  };

  const handleRejectPayment = (paymentId: string) => {
    if (!booking || !rejectReason.trim()) {
      setFeedback({ type: 'err', text: 'Please enter a brief rejection reason.' });
      return;
    }
    startTransition(async () => {
      const res = await rejectPayment(paymentId, rejectReason.trim());
      if (!res.ok) {
        setFeedback({ type: 'err', text: res.message || 'Failed to reject payment.' });
        return;
      }
      setRejectingId(null);
      setRejectReason('');
      setFeedback({ type: 'ok', text: 'Payment marked rejected.' });
      await loadDrawerData(booking.id);
      window.dispatchEvent(new Event('rongilo-notifications-refresh'));
      onMutated?.();
    });
  };

  const handleConfirmBooking = () => {
    if (!booking) return;
    startTransition(async () => {
      const res = await confirmBooking(booking.id, booking.version);
      if (!res.ok) {
        setFeedback({ type: 'err', text: res.message || 'Unable to confirm booking yet.' });
        return;
      }
      setFeedback({ type: 'ok', text: 'Booking confirmed & operations synced.' });
      await loadDrawerData(booking.id);
      window.dispatchEvent(new Event('rongilo-notifications-refresh'));
      onMutated?.();
    });
  };

  const handleQuickRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!booking) return;
    const amountPoisha = Math.round((Number(payAmountTk) || 0) * 100);
    if (amountPoisha <= 0) {
      setFeedback({ type: 'err', text: 'Enter a valid amount above 0.' });
      return;
    }
    startTransition(async () => {
      const res = await recordPayment(booking.id, {
        amountPoisha,
        method: payMethod,
        transactionRef: payRef.trim() || undefined,
        idempotencyKey: `drawer-pay-${booking.id}-${Date.now()}`,
      });
      if (!res.ok) {
        setFeedback({ type: 'err', text: res.message || 'Failed to record payment.' });
        return;
      }
      setPayAmountTk('');
      setPayRef('');
      setShowRecordForm(false);
      setFeedback({
        type: 'ok',
        text: 'Payment recorded (pending verification below).',
      });
      await loadDrawerData(booking.id);
      window.dispatchEvent(new Event('rongilo-notifications-refresh'));
      onMutated?.();
    });
  };

  const handleQuickDeliver = (d: Deliverable) => {
    if (!booking) return;
    startTransition(async () => {
      const res = await deliverDeliverable(d.id, {});
      if (!res.ok) {
        setFeedback({ type: 'err', text: res.message || 'Failed to mark delivered.' });
        return;
      }
      setFeedback({ type: 'ok', text: `"${d.label}" marked as delivered.` });
      await loadDrawerData(booking.id);
      window.dispatchEvent(new Event('rongilo-notifications-refresh'));
      onMutated?.();
    });
  };

  const pendingEntries = (ledger?.entries ?? []).filter((e) => e.verificationState === 'PENDING');
  const recentEntries = (ledger?.entries ?? []).slice(0, 6);
  const currency = ledger?.summary.currency || booking?.currency || 'BDT';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Booking quick inspection drawer"
      className="fixed inset-0 z-50 flex justify-end bg-slate-950/35 backdrop-blur-[1px]"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <aside className="h-full w-full max-w-xl flex flex-col border-l border-[var(--admin-border)] bg-[var(--admin-surface)] text-[var(--admin-text)]">
        {/* Drawer Header */}
        <div className="shrink-0 flex items-start justify-between gap-3 px-5 py-4 border-b border-[var(--admin-border)]">
          <div className="min-w-0 space-y-1">
            {booking ? (
              <>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="font-mono-code text-xs font-medium text-[var(--admin-muted)] tabular-nums">
                    {booking.reference}
                  </span>
                  <StatusBadge status={booking.status} />
                </div>
                <h2 className="text-[16px] font-semibold tracking-tight text-[var(--admin-text)] line-clamp-2">
                  {booking.eventTitle}
                </h2>
                <p className="text-[12.5px] text-[var(--admin-muted)] truncate tabular-nums">
                  {booking.clientName} ({booking.clientPhone}) •{' '}
                  {formatLocalDate(booking.eventDate)}
                </p>
              </>
            ) : (
              <div className="space-y-1.5">
                <p className="text-[15px] font-semibold text-[var(--admin-text)]">
                  Loading Booking...
                </p>
                <p className="text-[12.5px] text-[var(--admin-muted)]">
                  Fetching live ledger, receipts, and schedule
                </p>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="shrink-0 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--admin-muted)] hover:text-[var(--admin-text)] cursor-pointer"
          >
            ✕ Close
          </button>
        </div>

        {/* Drawer Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {feedback && (
            <div
              className={cn(
                'rounded-lg border px-3.5 py-2.5 text-[12.5px] flex items-center justify-between gap-2',
                feedback.type === 'ok'
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                  : 'border-rose-500/30 bg-rose-500/10 text-rose-600',
              )}
            >
              <span>{feedback.text}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                className="opacity-70 hover:opacity-100 text-xs cursor-pointer"
              >
                ×
              </button>
            </div>
          )}

          {loading && !booking ? (
            <div role="status" aria-busy="true" aria-label="Loading booking details" className="space-y-4">
              <span className="sr-only">Loading booking details...</span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-[var(--admin-border)] p-3 space-y-2"
                  >
                    <div className="h-2.5 w-16 rounded skeleton-bone" />
                    <div className="h-5 w-20 rounded skeleton-bone" />
                  </div>
                ))}
              </div>
              <div className="h-16 rounded-lg skeleton-bone" />
              <div className="space-y-2">
                {[1, 2, 3].map((row) => (
                  <div key={row} className="h-14 rounded-lg skeleton-bone" />
                ))}
              </div>
            </div>
          ) : (
            booking && (
              <>
                {/* 4 Financial Cells */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {[
                    {
                      label: 'Agreed Total',
                      value: formatPoisha(
                        ledger?.summary.agreedTotalPoisha ?? booking.agreedTotalPoisha,
                        currency,
                      ),
                    },
                    {
                      label: 'Verified Paid',
                      value: formatPoisha(ledger?.summary.verifiedReceiptsPoisha ?? 0, currency),
                    },
                    {
                      label: 'Pending Verify',
                      value: formatPoisha(ledger?.summary.pendingReceiptsPoisha ?? 0, currency),
                    },
                    {
                      label: 'Remaining Due',
                      value: formatPoisha(
                        ledger?.summary.outstandingDuePoisha ?? booking.agreedTotalPoisha,
                        currency,
                      ),
                    },
                  ].map((cell) => (
                    <div
                      key={cell.label}
                      className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-3"
                    >
                      <p className="text-[11px] font-medium text-[var(--admin-muted)]">
                        {cell.label}
                      </p>
                      <p className="font-mono-code text-[13.5px] font-semibold text-[var(--admin-text)] mt-1 tabular-nums">
                        {cell.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Advance / Confirm Callout */}
                {booking.status === 'PENDING_CONFIRMATION' && ledger && (
                  <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <p className="text-[13px] font-medium text-[var(--admin-text)] flex items-center gap-1.5">
                        <span
                          className={cn(
                            'h-[7px] w-[7px] rounded-full',
                            ledger.summary.isAdvanceMet ? 'bg-emerald-500' : 'bg-amber-500',
                          )}
                        />
                        {ledger.summary.isAdvanceMet
                          ? 'Required advance deposit verified'
                          : 'Waiting for required advance'}
                      </p>
                      <p className="text-[12.5px] text-[var(--admin-muted)] tabular-nums">
                        Required: {formatPoisha(ledger.summary.requiredAdvancePoisha, currency)} •
                        Verified: {formatPoisha(ledger.summary.verifiedReceiptsPoisha, currency)}
                      </p>
                    </div>
                    {ledger.summary.isAdvanceMet && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={handleConfirmBooking}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--admin-accent)] px-3.5 py-2 text-xs font-semibold text-[#FCFDFD] hover:opacity-95 disabled:opacity-60 cursor-pointer"
                      >
                        <CheckCircleIcon className="w-3.5 h-3.5" />
                        <span>Confirm Booking</span>
                      </button>
                    )}
                  </div>
                )}

                {/* Payments & Quick Verification */}
                <section
                  className={cn(
                    'rounded-xl border p-4 space-y-3',
                    focusSection === 'payments'
                      ? 'border-[var(--admin-accent)]/50 bg-[var(--admin-surface)]'
                      : 'border-[var(--admin-border)] bg-[var(--admin-surface)]',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h3 className="text-[14.5px] font-semibold text-[var(--admin-text)]">
                        Payments &amp; Receipt Verification
                        {pendingEntries.length > 0 && (
                          <span className="ml-2 text-xs font-medium text-amber-500 tabular-nums">
                            ({pendingEntries.length} pending)
                          </span>
                        )}
                      </h3>
                    </div>
                    {booking.status !== 'CANCELLED' &&
                      (ledger?.summary.outstandingDuePoisha ?? 0) > 0 && (
                        <button
                          type="button"
                          onClick={() => setShowRecordForm((v) => !v)}
                          className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-2.5 py-1 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                        >
                          {showRecordForm ? 'Cancel' : '+ Record Payment'}
                        </button>
                      )}
                  </div>

                  {showRecordForm && (
                    <form
                      onSubmit={handleQuickRecordPayment}
                      className="grid sm:grid-cols-4 gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-2.5"
                    >
                      <input
                        type="number"
                        min="1"
                        step="1"
                        required
                        value={payAmountTk}
                        onChange={(e) => setPayAmountTk(e.target.value)}
                        placeholder={`Amount (${currency})`}
                        className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-xs font-mono-code tabular-nums"
                      />
                      <select
                        value={payMethod}
                        onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                        className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-1.5 text-xs"
                      >
                        <option value="BKASH">bKash</option>
                        <option value="NAGAD">Nagad</option>
                        <option value="BANK">Bank</option>
                        <option value="CASH">Cash</option>
                      </select>
                      <input
                        value={payRef}
                        onChange={(e) => setPayRef(e.target.value)}
                        placeholder="TrxID / Ref"
                        className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-xs"
                      />
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-lg bg-[var(--admin-accent)] px-3 py-1.5 text-xs font-semibold text-[#FCFDFD] hover:opacity-95 cursor-pointer"
                      >
                        Save
                      </button>
                    </form>
                  )}

                  {recentEntries.length === 0 ? (
                    <p className="text-[12.5px] text-[var(--admin-muted)] py-2">
                      No payments logged for this booking yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--admin-border)]">
                      {recentEntries.map((entry) => (
                        <div key={entry.id} className="py-2.5 space-y-2">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-[13px] font-medium text-[var(--admin-text)]">
                                  {entry.method}
                                </span>
                                <StatusBadge status={entry.verificationState} />
                              </div>
                              {entry.transactionRef && (
                                <p className="font-mono-code text-[12px] text-[var(--admin-muted)] truncate tabular-nums">
                                  Ref: {entry.transactionRef}
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono-code text-[13.5px] font-semibold text-[var(--admin-text)] tabular-nums">
                                {formatPoisha(entry.amountPoisha, entry.currency)}
                              </span>
                              {entry.verificationState === 'PENDING' && (
                                <>
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() => handleVerifyPayment(entry.id, false)}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-medium text-[#FCFDFD] hover:bg-emerald-700 cursor-pointer"
                                  >
                                    Verify
                                  </button>
                                  {booking.status === 'PENDING_CONFIRMATION' && (
                                    <button
                                      type="button"
                                      disabled={isPending}
                                      onClick={() => handleVerifyPayment(entry.id, true)}
                                      className="rounded-lg bg-[var(--admin-accent)] px-2.5 py-1 text-xs font-medium text-[#FCFDFD] hover:opacity-95 cursor-pointer"
                                    >
                                      Verify &amp; Confirm
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    disabled={isPending}
                                    onClick={() =>
                                      setRejectingId(rejectingId === entry.id ? null : entry.id)
                                    }
                                    className="rounded-lg border border-[var(--admin-border)] px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </div>

                          {rejectingId === entry.id && (
                            <div className="flex items-center gap-2 pt-1">
                              <input
                                value={rejectReason}
                                onChange={(e) => setRejectReason(e.target.value)}
                                placeholder="Reason for rejecting payment..."
                                className="flex-1 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-2.5 py-1 text-xs"
                              />
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleRejectPayment(entry.id)}
                                className="rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-medium text-white cursor-pointer"
                              >
                                Confirm Reject
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Shoot Sessions Snapshot */}
                <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14.5px] font-semibold text-[var(--admin-text)] flex items-center gap-1.5">
                      <CalendarIcon className="w-4 h-4 text-[var(--admin-accent)]" />
                      <span>Shoot Sessions ({booking.sessions?.length ?? 0})</span>
                    </h3>
                    <Link
                      href={`/admin/bookings/${booking.id}?section=schedule`}
                      className="text-xs font-medium text-[var(--admin-accent)] hover:underline"
                    >
                      Manage Schedule →
                    </Link>
                  </div>

                  {!booking.sessions || booking.sessions.length === 0 ? (
                    <p className="text-[12.5px] text-[var(--admin-muted)]">
                      No shoot sessions scheduled yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {booking.sessions.slice(0, 4).map((s) => (
                        <div
                          key={s.id}
                          className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 py-2 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-medium text-[var(--admin-text)] truncate">
                              {s.title}
                            </p>
                            <p className="text-[12px] text-[var(--admin-muted)] tabular-nums truncate">
                              {formatDateTimeInTz(s.startAt, timezone)}
                              {s.location ? ` • ${s.location}` : ''}
                            </p>
                          </div>
                          <StatusBadge status={s.status} />
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {/* Deliverables Snapshot */}
                <section className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] p-4 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-[14.5px] font-semibold text-[var(--admin-text)]">
                      Deliverables ({booking.deliverables?.length ?? 0})
                    </h3>
                    <Link
                      href={`/admin/bookings/${booking.id}?section=deliverables`}
                      className="text-xs font-medium text-[var(--admin-accent)] hover:underline"
                    >
                      Manage Files →
                    </Link>
                  </div>

                  {!booking.deliverables || booking.deliverables.length === 0 ? (
                    <p className="text-[12.5px] text-[var(--admin-muted)]">
                      No deliverables listed yet.
                    </p>
                  ) : (
                    <div className="divide-y divide-[var(--admin-border)]">
                      {booking.deliverables.slice(0, 5).map((d) => (
                        <div
                          key={d.id}
                          className="py-2 flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0">
                            <p className="text-[13.5px] font-medium text-[var(--admin-text)] truncate">
                              {d.label}
                            </p>
                            <p className="text-[12px] text-[var(--admin-muted)] tabular-nums">
                              {d.dueAt ? `Due ${formatLocalDate(d.dueAt)}` : 'No deadline'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <StatusBadge status={d.reviewStatus} />
                            {d.reviewStatus !== 'DELIVERED' && booking.status !== 'CANCELLED' && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleQuickDeliver(d)}
                                className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-2 py-1 text-[11px] font-medium text-[var(--admin-text)] hover:border-emerald-500/40 cursor-pointer"
                              >
                                ✓ Deliver
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </>
            )
          )}
        </div>

        {/* Drawer Footer */}
        {booking && (
          <div className="shrink-0 px-5 py-3.5 border-t border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] flex items-center justify-between gap-3">
            <a
              href={`/api/bookings/${encodeURIComponent(booking.id)}/invoice.pdf`}
              target="_blank"
              rel="noreferrer"
              className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)]"
            >
              PDF Invoice ↗
            </a>
            <Link
              href={`/admin/bookings/${booking.id}${
                focusSection === 'payments' || focusSection === 'schedule' || focusSection === 'deliverables'
                  ? `?section=${focusSection}`
                  : ''
              }`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--admin-accent)] px-4 py-1.5 text-xs font-semibold text-[#FCFDFD] hover:opacity-95"
            >
              <span>Open Full Workspace</span>
              <ArrowRightIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        )}
      </aside>
    </div>
  );
}
