'use client';

import React, { useEffect, useState } from 'react';
import { BookingReceipt } from '@/types/event-management';
import { getBookingReceipt } from '@/service/bookings/bookings.service';
import { formatLocalDate, formatPoisha } from '@/lib/utils';

interface BookingReceiptModalProps {
  bookingId: string;
  onClose: () => void;
}

export function BookingReceiptModal({ bookingId, onClose }: BookingReceiptModalProps) {
  const [receipt, setReceipt] = useState<BookingReceipt | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const res = await getBookingReceipt(bookingId);
      if (cancelled) return;
      if (!res.ok || !res.data) {
        setError(res.message || 'Unable to load money receipt');
      } else {
        setReceipt(res.data);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [bookingId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-0 sm:p-4 sm:backdrop-blur-[1px]"
    >
      <div className="w-full h-dvh sm:h-auto sm:max-w-2xl sm:max-h-[90vh] flex flex-col rounded-none sm:rounded-2xl bg-white shadow-none sm:shadow-2xl border-0 sm:border border-slate-200 pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0 overflow-hidden">
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 bg-slate-50 print:hidden">
          <div>
            <p className="text-sm font-bold text-slate-900">Money Receipt &amp; Booking Invoice</p>
            <p className="text-xs text-slate-500">
              Verified studio financial summary &amp; accepted package terms
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {receipt && (
              <>
                <a
                  href={`/api/bookings/${encodeURIComponent(bookingId)}/invoice.pdf?disposition=inline`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
                >
                  Preview PDF
                </a>
                <a
                  href={`/api/bookings/${encodeURIComponent(bookingId)}/invoice.pdf`}
                  download
                  className="rounded-xl bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                >
                  Download PDF Invoice
                </a>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Print
                </button>
              </>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-300 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100 cursor-pointer"
            >
              ✕ Close
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-6 text-sm text-slate-800">
          {loading && <p className="text-center text-slate-500 py-8">Loading receipt...</p>}
          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-rose-800">
              {error}
            </div>
          )}

          {receipt && (
            <>
              {/* Studio & Receipt Header */}
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-5">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">
                    {receipt.studio.displayName}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    {[
                      receipt.studio.contactDetails?.phone,
                      receipt.studio.contactDetails?.email,
                      receipt.studio.contactDetails?.address,
                    ]
                      .filter(Boolean)
                      .join(' • ') || `Timezone: ${receipt.studio.timezone}`}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-indigo-600">
                    Official Money Receipt
                  </p>
                  <p className="font-mono-code text-base font-bold text-slate-900 mt-0.5">
                    {receipt.booking.reference}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Quote {receipt.quote.reference} (v{receipt.quote.versionNumber})
                  </p>
                </div>
              </div>

              {/* Client & Event Grid */}
              <div className="grid sm:grid-cols-2 gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-xs">
                <div className="space-y-1">
                  <p className="font-semibold uppercase tracking-wider text-slate-500 text-[10px]">
                    Billed To
                  </p>
                  <p className="text-sm font-bold text-slate-900">{receipt.booking.clientName}</p>
                  <p className="text-slate-600">{receipt.booking.clientPhone}</p>
                  {receipt.booking.clientEmail && (
                    <p className="text-slate-600">{receipt.booking.clientEmail}</p>
                  )}
                </div>
                <div className="space-y-1 sm:text-right">
                  <p className="font-semibold uppercase tracking-wider text-slate-500 text-[10px]">
                    Event Details
                  </p>
                  <p className="text-sm font-bold text-slate-900">{receipt.booking.eventTitle}</p>
                  <p className="text-slate-600">
                    {receipt.booking.eventTypeName ? `${receipt.booking.eventTypeName} • ` : ''}
                    Date: {formatLocalDate(receipt.booking.eventDate)}
                  </p>
                  <p className="text-slate-600">Status: {receipt.booking.status}</p>
                </div>
              </div>

              {/* Line Items */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Agreed Services &amp; Package Snapshot
                </h3>
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-50 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="text-left px-3.5 py-2.5 font-semibold">Description</th>
                        <th className="text-right px-3 py-2.5 font-semibold">Qty</th>
                        <th className="text-right px-3 py-2.5 font-semibold">Unit</th>
                        <th className="text-right px-3.5 py-2.5 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {receipt.quote.items.map((item) => (
                        <tr key={item.id}>
                          <td className="px-3.5 py-2.5 text-slate-800 font-medium">
                            {item.description}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono-code">{item.quantity}</td>
                          <td className="px-3 py-2.5 text-right font-mono-code">
                            {formatPoisha(item.unitPricePoisha, receipt.booking.currency)}
                          </td>
                          <td className="px-3.5 py-2.5 text-right font-mono-code font-semibold">
                            {formatPoisha(item.lineTotalPoisha, receipt.booking.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Verified Payment History */}
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Verified Payments &amp; Adjustments
                </h3>
                {receipt.payments.length === 0 ? (
                  <p className="text-xs text-slate-500 rounded-xl border border-slate-200 px-4 py-3">
                    No verified receipts recorded yet.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                    {receipt.payments.map((p) => (
                      <div
                        key={p.id}
                        className="px-4 py-2.5 flex items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <span className="font-semibold text-slate-900">
                            {p.type === 'REFUND' ? 'REFUND' : p.method}
                          </span>
                          {p.transactionRef && (
                            <span className="ml-1.5 font-mono-code text-slate-500">
                              Ref: {p.transactionRef}
                            </span>
                          )}
                          <p className="text-[11px] text-slate-500">
                            Verified {formatLocalDate(p.verifiedAt || p.createdAt)}
                          </p>
                        </div>
                        <span
                          className={`font-mono-code font-semibold tabular-nums ${
                            p.type === 'REFUND' ? 'text-rose-700' : 'text-emerald-700'
                          }`}
                        >
                          {p.type === 'REFUND' ? '-' : ''}
                          {formatPoisha(p.amountPoisha, p.currency)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Totals Summary */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-600">Quote Subtotal</span>
                  <span className="font-mono-code">
                    {formatPoisha(receipt.quote.subtotalPoisha, receipt.booking.currency)}
                  </span>
                </div>
                {receipt.quote.discountPoisha > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span className="font-mono-code">
                      -{formatPoisha(receipt.quote.discountPoisha, receipt.booking.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-semibold text-slate-900">
                  <span>Effective Agreed Total</span>
                  <span className="font-mono-code">
                    {formatPoisha(
                      receipt.ledger.effectiveAgreedChargePoisha,
                      receipt.booking.currency,
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700">
                  <span>Total Verified Paid</span>
                  <span className="font-mono-code">
                    {formatPoisha(
                      receipt.ledger.verifiedReceiptsPoisha,
                      receipt.booking.currency,
                    )}
                  </span>
                </div>
                {receipt.ledger.completedRefundsPoisha > 0 && (
                  <div className="flex justify-between text-rose-700">
                    <span>Completed Refunds</span>
                    <span className="font-mono-code">
                      {formatPoisha(
                        receipt.ledger.completedRefundsPoisha,
                        receipt.booking.currency,
                      )}
                    </span>
                  </div>
                )}
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                  <span>
                    {receipt.ledger.customerCreditPoisha > 0
                      ? 'Customer Credit Balance'
                      : 'Remaining Balance Due'}
                  </span>
                  <span className="font-mono-code tabular-nums">
                    {receipt.ledger.customerCreditPoisha > 0
                      ? formatPoisha(
                          receipt.ledger.customerCreditPoisha,
                          receipt.booking.currency,
                        )
                      : formatPoisha(
                          receipt.ledger.outstandingDuePoisha,
                          receipt.booking.currency,
                        )}
                  </span>
                </div>
              </div>

              {receipt.quote.terms && (
                <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-3">
                  Terms: {receipt.quote.terms}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
