import React from 'react';
import { cn } from '@/lib/utils';

const STATUS_DOTS: Record<string, { dot: string; label?: string }> = {
  // Amber — pending / action needed
  PENDING: { dot: 'bg-amber-500' },
  PENDING_CONFIRMATION: { dot: 'bg-amber-500' },
  QUOTED: { dot: 'bg-amber-500' },
  ASSIGNED: { dot: 'bg-amber-500' },
  CHANGES_REQUESTED: { dot: 'bg-amber-500' },

  // Emerald — confirmed / paid / delivered / completed
  CONFIRMED: { dot: 'bg-emerald-500' },
  COMPLETED: { dot: 'bg-emerald-500' },
  VERIFIED: { dot: 'bg-emerald-500' },
  APPROVED: { dot: 'bg-emerald-500' },
  DELIVERED: { dot: 'bg-emerald-500' },
  ACCEPTED: { dot: 'bg-emerald-500' },
  CONVERTED: { dot: 'bg-emerald-500' },

  // Antique Gold — scheduled / active / incoming
  SCHEDULED: { dot: 'bg-[#8B6A21]' },
  NEW: { dot: 'bg-[#CAA650]' },
  SENT: { dot: 'bg-[#8B6A21]' },
  IN_PROGRESS: { dot: 'bg-[#CAA650]' },
  QUALIFIED: { dot: 'bg-[#8B6A21]' },

  // Champagne Bronze — review
  IN_REVIEW: { dot: 'bg-[#A67C2E]' },

  // Soft Rose — cancelled / rejected
  CANCELLED: { dot: 'bg-rose-400' },
  REJECTED: { dot: 'bg-rose-400' },

  // Muted Neutral — draft / archived / closed
  DRAFT: { dot: 'bg-slate-400' },
  SUPERSEDED: { dot: 'bg-slate-400' },
  CLOSED: { dot: 'bg-slate-400' },
};

const DEFAULT_DOT = 'bg-slate-400';

/**
 * Low-noise status indicator: 7px colored dot + muted label text.
 */
export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  const style = STATUS_DOTS[status];
  const dotClass = style?.dot ?? DEFAULT_DOT;
  const displayLabel = style?.label ?? status.replace(/_/g, ' ').toLowerCase();

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-[12.5px] font-medium leading-none tracking-tight capitalize text-[var(--admin-muted,#5C6575)]',
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn('h-[7px] w-[7px] rounded-full shrink-0', dotClass)}
      />
      <span>{displayLabel}</span>
    </span>
  );
}
