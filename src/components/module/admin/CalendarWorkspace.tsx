'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Booking,
  CalendarSubscriptionInfo,
  EventSession,
  Resource,
  ResourceAvailabilityItem,
  SessionStatus,
  StudioMember,
} from '@/types/event-management';
import {
  cancelSession,
  checkResourceAvailability,
  completeSession,
  createSession,
  getCalendar,
  getCalendarSubscription,
  rescheduleSession,
  rotateCalendarSubscription,
} from '@/service/schedule/schedule.service';
import { cn, formatDateTimeInTz } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CalendarIcon, PlusIcon, RefreshCwIcon, SearchIcon } from '@/components/shared/Icons';

interface CalendarWorkspaceProps {
  timezone: string;
  todayIso: string;
  initialFrom: string;
  initialTo: string;
  initialSessions: EventSession[];
  initialResources: Resource[];
  bookings: Booking[];
  members?: StudioMember[];
}

type ViewMode = 'month' | 'agenda' | 'resources';
type StatusFilter = 'ALL' | SessionStatus;

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const BACKEND_PUBLIC_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';

function addDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return dt.toISOString().slice(0, 10);
}

function getMonthRangeYmd(year: number, monthIndexZero: number): { from: string; to: string } {
  const first = new Date(Date.UTC(year, monthIndexZero, 1));
  const last = new Date(Date.UTC(year, monthIndexZero + 1, 0));
  return {
    from: first.toISOString().slice(0, 10),
    to: last.toISOString().slice(0, 10),
  };
}

function formatTimeShortInTz(iso: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(new Date(iso));
  } catch {
    return iso.slice(11, 16);
  }
}

function formatReadableDayHeader(ymd: string): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(dt);
}

function toDatetimeLocalInTz(iso: string, timezone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const get = (type: string) => parts.find((p) => p.type === type)?.value || '00';
    const hour = get('hour') === '24' ? '00' : get('hour');
    return `${get('year')}-${get('month')}-${get('day')}T${hour}:${get('minute')}`;
  } catch {
    return iso.slice(0, 16);
  }
}

function addHoursLocalString(localStr: string, hours: number): string {
  if (!localStr) return '';
  const dt = new Date(localStr);
  if (Number.isNaN(dt.getTime())) return '';
  const shifted = new Date(dt.getTime() + hours * 3600_000);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${shifted.getFullYear()}-${pad(shifted.getMonth() + 1)}-${pad(shifted.getDate())}T${pad(shifted.getHours())}:${pad(shifted.getMinutes())}`;
}

function toGCalUtcStamp(iso: string): string {
  const d = new Date(iso);
  const s = d.toISOString();
  return `${s.slice(0, 4)}${s.slice(5, 7)}${s.slice(8, 10)}T${s.slice(11, 13)}${s.slice(14, 16)}${s.slice(17, 19)}Z`;
}

function buildGoogleCalendarUrl(session: EventSession, timezone: string): string {
  const titlePrefix = session.booking ? `[${session.booking.reference}] ` : '';
  const crewNames = session.reservations
    ?.map((r) => r.resource?.name || r.resourceId)
    .join(', ');
  const detailsParts = [
    session.booking ? `Booking: ${session.booking.reference} — ${session.booking.eventTitle}` : null,
    session.booking ? `Client: ${session.booking.clientName}` : null,
    crewNames ? `Crew & Gear: ${crewNames}` : null,
    session.notes ? `Notes: ${session.notes}` : null,
  ].filter((part): part is string => Boolean(part));

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `${titlePrefix}${session.title}`,
    dates: `${toGCalUtcStamp(session.startAt)}/${toGCalUtcStamp(session.endAt)}`,
    ctz: timezone,
  });
  if (session.location) params.set('location', session.location);
  if (detailsParts.length > 0) params.set('details', detailsParts.join('\n'));
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function CalendarWorkspace({
  timezone,
  todayIso,
  initialFrom,
  initialTo,
  initialSessions,
  initialResources,
  bookings,
  members = [],
}: CalendarWorkspaceProps) {
  const [from, setFrom] = useState(initialFrom);
  const [to, setTo] = useState(initialTo);
  const [sessions, setSessions] = useState<EventSession[]>(initialSessions);
  const resources = initialResources;
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // View & Filters
  const [viewMode, setViewMode] = useState<ViewMode>('month');
  const [monthCursor, setMonthCursor] = useState(() => ({
    year: Number(todayIso.slice(0, 4)),
    month: Number(todayIso.slice(5, 7)) - 1,
  }));
  const [selectedDay, setSelectedDay] = useState<string | null>(todayIso);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [resourceFilter, setResourceFilter] = useState<string>('ALL');

  // Panels ('none' | 'schedule' | 'google')
  const [activePanel, setActivePanel] = useState<'none' | 'schedule' | 'google'>('none');

  // Google Calendar Subscription state
  const [subscriptionInfo, setSubscriptionInfo] = useState<CalendarSubscriptionInfo | null>(null);
  const [copiedFeedUrl, setCopiedFeedUrl] = useState(false);

  // Schedulable bookings (exclude cancelled and completed, prioritize confirmed)
  const schedulableBookings = useMemo(() => {
    return bookings
      .filter((b) => b.status !== 'CANCELLED' && b.status !== 'COMPLETED')
      .sort((a, b) => {
        if (a.status === b.status) return a.reference.localeCompare(b.reference);
        if (a.status === 'CONFIRMED') return -1;
        if (b.status === 'CONFIRMED') return 1;
        return 0;
      });
  }, [bookings]);

  // Create session state
  const defaultBooking = schedulableBookings[0];
  const defaultDatePart = defaultBooking?.eventDate ? defaultBooking.eventDate.slice(0, 10) : todayIso;
  const [bookingId, setBookingId] = useState(defaultBooking?.id || '');
  const [sessionTitle, setSessionTitle] = useState(
    defaultBooking ? `${defaultBooking.eventTitle} — Coverage` : '',
  );
  const [startLocal, setStartLocal] = useState(defaultDatePart ? `${defaultDatePart}T17:00` : '');
  const [endLocal, setEndLocal] = useState(defaultDatePart ? `${defaultDatePart}T23:00` : '');
  const [location, setLocation] = useState('');
  const [selectedResourceIds, setSelectedResourceIds] = useState<string[]>([]);
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, ResourceAvailabilityItem>>({});
  const [checkingAvail, setCheckingAvail] = useState(false);

  // Reschedule & Cancel modal states
  const [rescheduleTarget, setRescheduleTarget] = useState<EventSession | null>(null);
  const [reschedStartLocal, setReschedStartLocal] = useState('');
  const [reschedEndLocal, setReschedEndLocal] = useState('');
  const [reschedReason, setReschedReason] = useState('');
  const [reschedResourceIds, setReschedResourceIds] = useState<string[]>([]);
  const [reschedAvailMap, setReschedAvailMap] = useState<Record<string, ResourceAvailabilityItem>>(
    {},
  );

  const [cancelTarget, setCancelTarget] = useState<EventSession | null>(null);
  const [cancelReason, setCancelReason] = useState('');

  const refreshAvailability = async (
    startVal: string,
    endVal: string,
    target: 'create' | 'reschedule',
    excludeSessionId?: string,
  ) => {
    if (!startVal || !endVal) return;
    const sDate = new Date(startVal);
    const eDate = new Date(endVal);
    if (Number.isNaN(sDate.getTime()) || Number.isNaN(eDate.getTime()) || eDate <= sDate) {
      return;
    }
    setCheckingAvail(true);
    const res = await checkResourceAvailability(
      sDate.toISOString(),
      eDate.toISOString(),
      excludeSessionId,
    );
    setCheckingAvail(false);
    if (res.ok && res.data) {
      const nextMap: Record<string, ResourceAvailabilityItem> = {};
      for (const item of res.data.resources) {
        nextMap[item.id] = item;
      }
      if (target === 'create') {
        setAvailabilityMap(nextMap);
      } else {
        setReschedAvailMap(nextMap);
      }
    }
  };

  const handleSelectBooking = (nextId: string) => {
    setBookingId(nextId);
    const chosen = schedulableBookings.find((b) => b.id === nextId);
    if (!chosen) return;
    setSessionTitle(`${chosen.eventTitle} — Coverage`);
    if (chosen.eventDate) {
      const d = chosen.eventDate.slice(0, 10);
      const nextStart = `${d}T17:00`;
      const nextEnd = `${d}T23:00`;
      setStartLocal(nextStart);
      setEndLocal(nextEnd);
      void refreshAvailability(nextStart, nextEnd, 'create');
    }
  };

  const openScheduleOnDay = (ymd: string) => {
    const nextStart = `${ymd}T17:00`;
    const nextEnd = `${ymd}T22:00`;
    setStartLocal(nextStart);
    setEndLocal(nextEnd);
    setActivePanel('schedule');
    void refreshAvailability(nextStart, nextEnd, 'create');
  };

  const refreshCalendar = (nextFrom = from, nextTo = to) => {
    startTransition(async () => {
      const res = await getCalendar(nextFrom, nextTo);
      if (res.ok && res.data) {
        setSessions(res.data.sessions);
      }
    });
  };

  const applyRangePreset = (nextFrom: string, nextTo: string, nextSelectedDay?: string | null) => {
    setFrom(nextFrom);
    setTo(nextTo);
    if (nextSelectedDay !== undefined) {
      setSelectedDay(nextSelectedDay);
    }
    refreshCalendar(nextFrom, nextTo);
  };

  const navigateMonth = (delta: number) => {
    const dt = new Date(Date.UTC(monthCursor.year, monthCursor.month + delta, 1));
    const nextYear = dt.getUTCFullYear();
    const nextMonth = dt.getUTCMonth();
    setMonthCursor({ year: nextYear, month: nextMonth });
    const range = getMonthRangeYmd(nextYear, nextMonth);
    applyRangePreset(range.from, range.to, null);
  };

  const jumpToToday = () => {
    const year = Number(todayIso.slice(0, 4));
    const month = Number(todayIso.slice(5, 7)) - 1;
    setMonthCursor({ year, month });
    const range = getMonthRangeYmd(year, month);
    applyRangePreset(range.from, range.to, todayIso);
  };

  const openGoogleSyncPanel = () => {
    if (activePanel === 'google') {
      setActivePanel('none');
      return;
    }
    setActivePanel('google');
    if (!subscriptionInfo) {
      startTransition(async () => {
        const res = await getCalendarSubscription();
        if (res.ok && res.data) {
          setSubscriptionInfo(res.data);
        }
      });
    }
  };

  const liveSubscriptionUrl = useMemo(() => {
    if (!subscriptionInfo) return '';
    const base = BACKEND_PUBLIC_URL.endsWith('/')
      ? BACKEND_PUBLIC_URL.slice(0, -1)
      : BACKEND_PUBLIC_URL;
    return `${base}${subscriptionInfo.feedPath}`;
  }, [subscriptionInfo]);

  const handleCopyFeedUrl = async () => {
    if (!liveSubscriptionUrl) return;
    try {
      await navigator.clipboard.writeText(liveSubscriptionUrl);
      setCopiedFeedUrl(true);
      setTimeout(() => setCopiedFeedUrl(false), 2500);
    } catch {
      setFeedback({ type: 'err', text: 'Clipboard permission denied; please copy URL manually.' });
    }
  };

  const handleRotateFeedUrl = () => {
    startTransition(async () => {
      const res = await rotateCalendarSubscription();
      if (!res.ok || !res.data) {
        setFeedback({ type: 'err', text: res.message || 'Failed to rotate calendar feed URL' });
        return;
      }
      setSubscriptionInfo(res.data);
      setCopiedFeedUrl(false);
      setFeedback({
        type: 'ok',
        text: 'Calendar subscription link rotated. Previous link has been revoked.',
      });
    });
  };

  const crewResources = useMemo(
    () => resources.filter((r) => r.type === 'CREW'),
    [resources],
  );
  const gearResources = useMemo(
    () => resources.filter((r) => r.type !== 'CREW'),
    [resources],
  );
  const memberById = useMemo(() => {
    const map = new Map<string, StudioMember>();
    for (const m of members) map.set(m.id, m);
    return map;
  }, [members]);

  const toggleResource = (id: string) => {
    setSelectedResourceIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleCreateSession = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingId || !startLocal || !endLocal) {
      setFeedback({ type: 'err', text: 'Select a booking and valid start/end timestamps.' });
      return;
    }
    const startDt = new Date(startLocal);
    const endDt = new Date(endLocal);
    if (endDt <= startDt) {
      setFeedback({ type: 'err', text: 'End date & time must be after start date & time.' });
      return;
    }
    startTransition(async () => {
      const res = await createSession(bookingId, {
        title: sessionTitle,
        startAt: startDt.toISOString(),
        endAt: endDt.toISOString(),
        location: location || undefined,
        resourceIds: selectedResourceIds,
      });
      if (!res.ok) {
        setFeedback({
          type: 'err',
          text: res.message || 'Resource conflict or invalid schedule slot',
        });
        return;
      }
      setSessionTitle('');
      setLocation('');
      setSelectedResourceIds([]);
      setActivePanel('none');
      setFeedback({ type: 'ok', text: 'Event session scheduled and crew reserved.' });
      refreshCalendar();
    });
  };

  const openRescheduleModal = (session: EventSession) => {
    const startVal = toDatetimeLocalInTz(session.startAt, timezone);
    const endVal = toDatetimeLocalInTz(session.endAt, timezone);
    const resIds = session.reservations?.map((r) => r.resourceId) ?? [];
    setRescheduleTarget(session);
    setReschedStartLocal(startVal);
    setReschedEndLocal(endVal);
    setReschedReason('');
    setReschedResourceIds(resIds);
    void refreshAvailability(startVal, endVal, 'reschedule', session.id);
  };

  const handleRescheduleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget || !reschedStartLocal || !reschedEndLocal || !reschedReason.trim()) {
      setFeedback({ type: 'err', text: 'Provide new times and a brief reason for rescheduling.' });
      return;
    }
    const startDt = new Date(reschedStartLocal);
    const endDt = new Date(reschedEndLocal);
    if (endDt <= startDt) {
      setFeedback({ type: 'err', text: 'End date & time must be after start date & time.' });
      return;
    }
    startTransition(async () => {
      const res = await rescheduleSession(rescheduleTarget.id, {
        startAt: startDt.toISOString(),
        endAt: endDt.toISOString(),
        reason: reschedReason.trim(),
        resourceIds: reschedResourceIds,
      });
      if (!res.ok) {
        setFeedback({
          type: 'err',
          text: res.message || 'Unable to reschedule — check crew/equipment conflicts.',
        });
        return;
      }
      setRescheduleTarget(null);
      setFeedback({ type: 'ok', text: 'Session rescheduled and crew reservations updated.' });
      refreshCalendar();
    });
  };

  const handleCompleteSession = (id: string) => {
    startTransition(async () => {
      const res = await completeSession(id);
      if (!res.ok) {
        setFeedback({ type: 'err', text: res.message || 'Failed to complete session' });
        return;
      }
      setFeedback({
        type: 'ok',
        text: 'Session marked completed (booking balance & deliverables preserved).',
      });
      refreshCalendar();
    });
  };

  const handleCancelSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cancelTarget || !cancelReason.trim()) return;
    startTransition(async () => {
      const res = await cancelSession(cancelTarget.id, cancelReason.trim());
      if (!res.ok) {
        setFeedback({ type: 'err', text: res.message || 'Failed to cancel session' });
        return;
      }
      setCancelTarget(null);
      setCancelReason('');
      setFeedback({
        type: 'ok',
        text: 'Session cancelled and reserved crew/equipment released.',
      });
      refreshCalendar();
    });
  };

  // Filtered sessions across search, status, and resource filters
  const filteredSessions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return sessions.filter((s) => {
      if (statusFilter !== 'ALL' && s.status !== statusFilter) return false;
      if (
        resourceFilter !== 'ALL' &&
        !s.reservations?.some((r) => r.resourceId === resourceFilter)
      ) {
        return false;
      }
      if (!q) return true;
      const haystack = [
        s.title,
        s.location,
        s.booking?.reference,
        s.booking?.eventTitle,
        s.booking?.clientName,
        ...(s.reservations?.map((r) => r.resource?.name || '') ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [sessions, statusFilter, resourceFilter, searchQuery]);

  // Group filtered sessions by studio local date
  const groupedByDay = useMemo(() => {
    return filteredSessions.reduce<Record<string, EventSession[]>>((acc, s) => {
      const key = s.agencyLocalDate || s.startAt.slice(0, 10);
      if (!acc[key]) acc[key] = [];
      acc[key].push(s);
      return acc;
    }, {});
  }, [filteredSessions]);

  // Month grid cells (Sunday-Saturday)
  const monthGridCells = useMemo(() => {
    const firstDayUtc = new Date(Date.UTC(monthCursor.year, monthCursor.month, 1));
    const startWeekday = firstDayUtc.getUTCDay();
    const daysInMonth = new Date(Date.UTC(monthCursor.year, monthCursor.month + 1, 0)).getUTCDate();
    const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

    return Array.from({ length: totalCells }, (_, idx) => {
      const dayNumber = idx - startWeekday + 1;
      const cellDate = new Date(Date.UTC(monthCursor.year, monthCursor.month, dayNumber));
      const ymd = cellDate.toISOString().slice(0, 10);
      const inCurrentMonth = dayNumber >= 1 && dayNumber <= daysInMonth;
      return {
        ymd,
        dayOfMonth: cellDate.getUTCDate(),
        inCurrentMonth,
        items: groupedByDay[ymd] ?? [],
      };
    });
  }, [monthCursor, groupedByDay]);

  const monthLabel = useMemo(() => {
    const dt = new Date(Date.UTC(monthCursor.year, monthCursor.month, 15));
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'UTC',
      month: 'long',
      year: 'numeric',
    }).format(dt);
  }, [monthCursor]);

  const scheduledCount = sessions.filter((s) => s.status === 'SCHEDULED').length;
  const completedCount = sessions.filter((s) => s.status === 'COMPLETED').length;

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 transition-all';

  const renderSessionCard = (s: EventSession) => (
    <div
      key={s.id}
      className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between gap-3 shadow-xs hover:border-indigo-200 transition-colors"
    >
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-semibold text-sm text-slate-900">{s.title}</p>
              <StatusBadge status={s.status} />
            </div>
            <p className="text-xs font-medium text-indigo-700 mt-1">
              {formatTimeShortInTz(s.startAt, timezone)} → {formatTimeShortInTz(s.endAt, timezone)}
              <span className="text-slate-400 font-normal ml-1.5">
                ({formatDateTimeInTz(s.startAt, timezone)})
              </span>
            </p>
          </div>
        </div>

        {s.location && (
          <p className="text-xs text-slate-600">
            <span className="font-semibold text-slate-700">Venue:</span> {s.location}
          </p>
        )}

        {s.booking && (
          <p className="text-xs text-slate-600">
            <Link
              href={`/admin/bookings/${encodeURIComponent(s.booking.id)}`}
              className="font-mono-code font-semibold text-indigo-600 hover:underline"
            >
              {s.booking.reference}
            </Link>{' '}
            • {s.booking.eventTitle} ({s.booking.clientName})
          </p>
        )}

        {s.reservations && s.reservations.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-0.5">
            {s.reservations.map((r) => (
              <span
                key={r.id}
                className="rounded-full bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
              >
                {r.resource?.name || r.resourceId}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Actions row */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <a
            href={buildGoogleCalendarUrl(s, timezone)}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-100 transition-colors"
          >
            + Google Calendar
          </a>
          <a
            href={`/api/schedule/sessions/${encodeURIComponent(s.id)}/calendar.ics`}
            download
            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            .ics
          </a>
        </div>

        {s.status === 'SCHEDULED' && (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              disabled={isPending}
              onClick={() => openRescheduleModal(s)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:border-indigo-300 hover:text-indigo-700 transition-colors"
            >
              Reschedule
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleCompleteSession(s.id)}
              className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-600 hover:text-white transition-colors"
            >
              Mark Done
            </button>
            <button
              type="button"
              disabled={isPending}
              onClick={() => {
                setCancelTarget(s);
                setCancelReason('');
              }}
              className="rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );

  const selectedDayItems = selectedDay ? groupedByDay[selectedDay] ?? [] : [];

  return (
    <div className="space-y-6">
      {/* Header + Action Buttons */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="admin-page-title">
            Schedule &amp; Google Calendar
          </h1>
          <p className="admin-meta mt-1 tabular-nums">
            Interactive studio calendar, live crew conflict checks, and Google Calendar sync •{' '}
            {timezone}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={openGoogleSyncPanel}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 transition-all duration-200',
              activePanel === 'google'
                ? 'border-emerald-700 bg-emerald-700 text-white shadow-xs'
                : 'border-emerald-200 bg-emerald-50/80 text-emerald-800 hover:bg-emerald-100/80',
            )}
          >
            <CalendarIcon className="w-4 h-4" />
            <span>Google Calendar Sync</span>
          </button>

          <Link
            href="/admin/crew"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <span>Crew &amp; Gear ({resources.length}) →</span>
          </Link>

          <button
            type="button"
            onClick={() => {
              if (activePanel === 'schedule') {
                setActivePanel('none');
              } else {
                setActivePanel('schedule');
                if (startLocal && endLocal) {
                  void refreshAvailability(startLocal, endLocal, 'create');
                }
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-indigo-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 transition-all duration-200"
          >
            <PlusIcon className="w-4 h-4" />
            <span>{activePanel === 'schedule' ? 'Close Form' : 'Schedule Event'}</span>
          </button>
        </div>
      </div>

      {/* KPI Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="atelier-card p-3 sm:p-5">
          <p className="admin-meta font-medium truncate">Sessions in Range</p>
          <p className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 mt-1 sm:mt-2 tabular-nums">
            {sessions.length}
          </p>
        </div>
        <div className="atelier-card p-3 sm:p-5">
          <p className="admin-meta font-medium truncate">Upcoming Scheduled</p>
          <p className="text-lg sm:text-2xl font-semibold tracking-tight text-[var(--admin-accent)] mt-1 sm:mt-2 tabular-nums">
            {scheduledCount}
          </p>
        </div>
        <div className="atelier-card p-3 sm:p-5">
          <p className="admin-meta font-medium truncate">Completed Shoots</p>
          <p className="text-lg sm:text-2xl font-semibold tracking-tight text-emerald-600 mt-1 sm:mt-2 tabular-nums">
            {completedCount}
          </p>
        </div>
        <Link
          href="/admin/crew"
          className="atelier-card p-3 sm:p-5 block hover:border-[var(--admin-accent)] transition-colors"
        >
          <p className="admin-meta font-medium truncate">Crew &amp; Gear</p>
          <div className="flex items-baseline justify-between mt-1 sm:mt-2">
            <p className="text-lg sm:text-2xl font-semibold tracking-tight text-slate-900 tabular-nums">
              {resources.length}
            </p>
            <span className="text-[11px] sm:text-xs font-medium text-[var(--admin-accent)]">
              Manage →
            </span>
          </div>
        </Link>
      </div>

      {feedback && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-sm flex items-center justify-between',
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900',
          )}
        >
          <span>{feedback.text}</span>
          <button type="button" onClick={() => setFeedback(null)} className="text-xs underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Modal: Google Calendar Sync */}
      {activePanel === 'google' && (
        <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-center bg-white sm:bg-slate-900/50 p-0 sm:p-4 sm:backdrop-blur-xs admin-sheet-fade">
          <div className="flex-1 sm:flex-initial w-full sm:max-w-2xl h-dvh sm:h-auto sm:max-h-[90dvh] rounded-none sm:rounded-2xl border-0 sm:border sm:border-slate-200 bg-white p-4 sm:p-6 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 overflow-y-auto shadow-none sm:shadow-xl space-y-5">
            <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Google Calendar Integration
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Subscribe once from Google Calendar to mirror studio shoots, or add individual
                  sessions directly.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel('none')}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-bold text-slate-900">
                    1. Subscribe via Live Feed URL
                  </p>
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                    Auto-Syncs
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Copy this signed iCalendar link and add it in Google Calendar under{' '}
                  <strong>Other calendars (+) → From URL</strong>. Client phone numbers and pricing
                  are excluded from the feed for privacy.
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={liveSubscriptionUrl || 'Generating signed calendar feed URL...'}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono-code text-slate-700"
                  />
                  <button
                    type="button"
                    disabled={!liveSubscriptionUrl}
                    onClick={handleCopyFeedUrl}
                    className="shrink-0 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {copiedFeedUrl ? 'Copied!' : 'Copy URL'}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={handleRotateFeedUrl}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                    title="Revoke current feed link and issue a new one"
                  >
                    ↻ Rotate
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <p className="text-xs font-bold text-slate-900">
                  2. Export Snapshot (.ics)
                </p>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Download an <code>.ics</code> file of the currently selected date range (
                  {from} to {to}) for Google Calendar, Apple Calendar, or Outlook import.
                </p>
                <div className="flex flex-wrap gap-2">
                  <a
                    href={`/api/schedule/calendar.ics?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`}
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <CalendarIcon className="w-3.5 h-3.5" />
                    <span>Download Range (.ics)</span>
                  </a>
                  <a
                    href="/api/schedule/calendar.ics"
                    download
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <span>Full Year (.ics)</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Schedule Event Form */}
      {activePanel === 'schedule' && (
        <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-center bg-white sm:bg-slate-900/50 p-0 sm:p-4 sm:backdrop-blur-xs overflow-y-auto admin-sheet-fade">
          <form
            onSubmit={handleCreateSession}
            className="flex-1 sm:flex-initial w-full sm:max-w-xl h-dvh sm:h-auto sm:max-h-[92dvh] rounded-none sm:rounded-2xl border-0 sm:border sm:border-slate-200 bg-white p-4 sm:p-6 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 overflow-y-auto shadow-none sm:shadow-xl space-y-4 sm:my-8"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold tracking-tight text-slate-900">
                  Schedule an Event Session
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live crew &amp; gear availability updates automatically when you pick a time slot.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActivePanel('none')}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Booking *</label>
                <select
                  required
                  value={bookingId}
                  onChange={(e) => handleSelectBooking(e.target.value)}
                  className={inputClass}
                >
                  <option value="">Select a booking...</option>
                  {schedulableBookings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.reference} ({b.status === 'CONFIRMED' ? 'Confirmed' : 'Pending'}) —{' '}
                      {b.eventTitle}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Session Name *
                </label>
                <input
                  required
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  placeholder="e.g. Gaye Holud / Main Wedding Ceremony"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Start Date &amp; Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={startLocal}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setStartLocal(nextStart);
                    if (nextStart && endLocal) {
                      void refreshAvailability(nextStart, endLocal, 'create');
                    }
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-slate-600">
                    End Date &amp; Time *
                  </label>
                  <div className="flex items-center gap-1">
                    {[3, 5, 8].map((hrs) => (
                      <button
                        key={hrs}
                        type="button"
                        onClick={() => {
                          if (!startLocal) return;
                          const nextEnd = addHoursLocalString(startLocal, hrs);
                          setEndLocal(nextEnd);
                          void refreshAvailability(startLocal, nextEnd, 'create');
                        }}
                        className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-semibold text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"
                      >
                        +{hrs}h
                      </button>
                    ))}
                  </div>
                </div>
                <input
                  type="datetime-local"
                  required
                  value={endLocal}
                  onChange={(e) => {
                    const nextEnd = e.target.value;
                    setEndLocal(nextEnd);
                    if (startLocal && nextEnd) {
                      void refreshAvailability(startLocal, nextEnd, 'create');
                    }
                  }}
                  className={inputClass}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Venue / Location
                </label>
                <input
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Pan Pacific Sonargaon / ICCB Hall 4, Dhaka"
                  className={inputClass}
                />
              </div>
            </div>

            {resources.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-slate-600">
                    Assign Shoot Crew &amp; Equipment
                  </p>
                  <div className="flex items-center gap-3">
                    {checkingAvail && (
                      <span className="text-xs text-indigo-600">Checking live availability...</span>
                    )}
                    <Link
                      href="/admin/crew"
                      className="text-xs font-medium text-[var(--admin-accent)] hover:underline"
                    >
                      Manage Pool →
                    </Link>
                  </div>
                </div>

                {crewResources.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Shoot Crew ({crewResources.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-0.5">
                      {crewResources.map((r) => {
                        const active = selectedResourceIds.includes(r.id);
                        const avail = availabilityMap[r.id];
                        const isBusy = avail && !avail.available;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            disabled={Boolean(isBusy)}
                            onClick={() => toggleResource(r.id)}
                            title={
                              isBusy && avail.conflict
                                ? `Busy: ${avail.conflict.bookingReference ?? ''} ${avail.conflict.title}`
                                : r.userId
                                  ? 'Linked studio crew (appears on their My Shoots portal)'
                                  : 'Freelance / external crew'
                            }
                            className={cn(
                              'rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors text-left cursor-pointer',
                              isBusy
                                ? 'bg-rose-50 text-rose-700 border-rose-200 opacity-75 cursor-not-allowed'
                                : active
                                  ? 'bg-indigo-600 text-white border-indigo-600'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-indigo-300',
                            )}
                          >
                            <span>{r.name}</span>
                            {avail && (
                              <span
                                className={cn(
                                  'ml-1.5 font-semibold',
                                  isBusy
                                    ? 'text-rose-700'
                                    : active
                                      ? 'text-indigo-100'
                                      : 'text-emerald-700',
                                )}
                              >
                                {isBusy
                                  ? `• Busy (${avail.conflict?.bookingReference || 'Booked'})`
                                  : '• Free'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {gearResources.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                      Equipment Kits &amp; Studio Rooms ({gearResources.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-0.5">
                      {gearResources.map((r) => {
                        const active = selectedResourceIds.includes(r.id);
                        const avail = availabilityMap[r.id];
                        const isBusy = avail && !avail.available;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            disabled={Boolean(isBusy)}
                            onClick={() => toggleResource(r.id)}
                            title={
                              isBusy && avail.conflict
                                ? `Busy: ${avail.conflict.bookingReference ?? ''} ${avail.conflict.title}`
                                : 'Available for this slot'
                            }
                            className={cn(
                              'rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors text-left cursor-pointer',
                              isBusy
                                ? 'bg-rose-50 text-rose-700 border-rose-200 opacity-75 cursor-not-allowed'
                                : active
                                  ? 'bg-slate-900 text-white border-slate-900'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-slate-400',
                            )}
                          >
                            <span>{r.name}</span>
                            <span className="ml-1 opacity-70 text-[11px]">({r.type})</span>
                            {avail && (
                              <span
                                className={cn(
                                  'ml-1.5 font-semibold',
                                  isBusy
                                    ? 'text-rose-700'
                                    : active
                                      ? 'text-emerald-300'
                                      : 'text-emerald-700',
                                )}
                              >
                                {isBusy
                                  ? `• Busy (${avail.conflict?.bookingReference || 'Booked'})`
                                  : '• Free'}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setActivePanel('none')}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
              >
                <CalendarIcon className="w-4 h-4" />
                <span>Save to Schedule</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Main Calendar Workspace Card */}
      <div className="atelier-card p-3.5 sm:p-6 space-y-4 sm:space-y-5">
        {/* Toolbar: View Tabs + Search + Filters + Date Range */}
        <div className="flex flex-col gap-3 border-b border-slate-100 pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            {/* View Mode Tabs */}
            <div className="grid grid-cols-3 w-full sm:w-auto sm:inline-flex rounded-xl bg-slate-100 p-1 gap-1">
              {(
                [
                  { id: 'month', label: 'Month' },
                  { id: 'agenda', label: 'Agenda' },
                  { id: 'resources', label: 'Crew & Gear' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setViewMode(tab.id)}
                  className={cn(
                    'rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap text-center cursor-pointer',
                    viewMode === tab.id
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Presets & Date Inputs */}
            <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 w-full lg:w-auto">
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full pb-0.5">
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 sm:py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  This Month
                </button>
                <button
                  type="button"
                  onClick={() => applyRangePreset(todayIso, addDaysYmd(todayIso, 7), null)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 sm:py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Next 7 Days
                </button>
                <button
                  type="button"
                  onClick={() => applyRangePreset(todayIso, addDaysYmd(todayIso, 90), null)}
                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 sm:py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Next 90 Days
                </button>
              </div>
              <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
                <input
                  type="date"
                  value={from}
                  onChange={(e) => setFrom(e.target.value)}
                  aria-label="From date"
                  className="w-full sm:w-auto h-9 sm:h-auto rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 min-w-0"
                />
                <span className="hidden sm:inline text-xs text-slate-400">to</span>
                <input
                  type="date"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  aria-label="To date"
                  className="w-full sm:w-auto h-9 sm:h-auto rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 min-w-0"
                />
                <button
                  type="button"
                  disabled={isPending}
                  onClick={() => refreshCalendar(from, to)}
                  className="col-span-2 sm:col-span-1 w-full sm:w-auto h-9 sm:h-auto inline-flex items-center justify-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 sm:py-1 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  <RefreshCwIcon className="w-3 h-3" />
                  <span>Apply Range</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search, Status & Resource Filters */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 sm:gap-2.5">
            <div className="relative col-span-2 sm:flex-1 sm:min-w-[220px]">
              <SearchIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search client, venue, BKG-..., crew..."
                className="w-full h-9 sm:h-auto rounded-xl border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-1.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              aria-label="Filter sessions by status"
              className="w-full sm:w-auto h-9 sm:h-auto rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 min-w-0"
            >
              <option value="ALL">All Statuses</option>
              <option value="SCHEDULED">Scheduled Only</option>
              <option value="COMPLETED">Completed Only</option>
            </select>

            <select
              value={resourceFilter}
              onChange={(e) => setResourceFilter(e.target.value)}
              aria-label="Filter sessions by crew or gear"
              className="w-full sm:w-auto h-9 sm:h-auto rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 sm:px-3 py-1.5 text-xs font-semibold text-slate-700 min-w-0"
            >
              <option value="ALL">All Crew &amp; Gear</option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name} ({r.type})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* VIEW 1: Interactive Month Calendar Grid */}
        {viewMode === 'month' && (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-4">
                <h2 className="text-lg font-bold text-[var(--admin-text)]">{monthLabel}</h2>
                <div className="flex items-center gap-3 text-[11px] text-[var(--admin-muted)]">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="h-2.5 w-2.5 rounded-xs bg-[var(--admin-accent)]" />
                    Scheduled
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="h-2.5 w-2.5 rounded-xs bg-emerald-500" />
                    Completed
                  </span>
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <span className="h-2.5 w-2.5 rounded-full border-2 border-[var(--admin-accent)]" />
                    Today
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => navigateMonth(-1)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  ← Prev
                </button>
                <button
                  type="button"
                  onClick={jumpToToday}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={() => navigateMonth(1)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Next →
                </button>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="grid grid-cols-7 bg-slate-50 border-b border-slate-200">
                {WEEKDAYS.map((day) => (
                  <div
                    key={day}
                    className="px-1 md:px-2.5 py-2 text-center text-[11px] md:text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    <span className="md:hidden">{day.slice(0, 1)}</span>
                    <span className="hidden md:inline">{day}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 divide-x divide-y divide-slate-200 bg-[var(--admin-surface)]">
                {monthGridCells.map((cell) => {
                  const isToday = cell.ymd === todayIso;
                  const isSelected = cell.ymd === selectedDay;
                  const hasSessions = cell.items.length > 0;
                  const allCompleted =
                    hasSessions && cell.items.every((s) => s.status === 'COMPLETED');

                  return (
                    <div
                      key={cell.ymd}
                      onClick={() => setSelectedDay(cell.ymd)}
                      className={cn(
                        'relative min-h-[60px] md:min-h-[110px] p-1 md:p-2 cursor-pointer transition-all flex flex-col justify-between md:justify-start gap-1 md:gap-1.5 active:scale-[0.97] md:active:scale-100',
                        hasSessions
                          ? allCompleted
                            ? 'bg-emerald-500/12 hover:bg-emerald-500/18 shadow-[inset_0_3px_0_0_#10b981]'
                            : 'bg-[var(--admin-accent-soft)] hover:bg-[var(--admin-accent)]/25 shadow-[inset_0_3px_0_0_var(--admin-accent)]'
                          : !cell.inCurrentMonth
                            ? 'bg-[var(--admin-surface-subtle)]/55 text-[var(--admin-muted)]/60'
                            : 'bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-subtle)]/65',
                        isSelected && 'ring-2 ring-inset ring-[var(--admin-text)] z-10',
                      )}
                    >
                      <div className="flex items-center justify-center md:justify-between gap-1">
                        <div className="flex items-center gap-1">
                          <span
                            className={cn(
                              'inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold tabular-nums',
                              hasSessions
                                ? allCompleted
                                  ? 'bg-emerald-600 text-white'
                                  : 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]'
                                : isToday
                                  ? 'border-2 border-[var(--admin-accent)] text-[var(--admin-accent)]'
                                  : cell.inCurrentMonth
                                    ? 'text-[var(--admin-text)] font-semibold'
                                    : 'text-[var(--admin-muted)]/60 font-medium',
                            )}
                          >
                            {cell.dayOfMonth}
                          </span>
                          {isToday && (
                            <span className="hidden md:inline text-[9.5px] font-bold uppercase tracking-wider text-[var(--admin-accent)]">
                              Today
                            </span>
                          )}
                        </div>

                        {hasSessions && (
                          <span
                            className={cn(
                              'hidden md:inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold tracking-tight tabular-nums',
                              allCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]',
                            )}
                          >
                            {cell.items.length} {cell.items.length === 1 ? 'shoot' : 'shoots'}
                          </span>
                        )}
                      </div>

                      {hasSessions && (
                        <div className="md:hidden flex items-center justify-center gap-1 pb-0.5">
                          <span
                            className={cn(
                              'rounded-full px-1.5 py-[1px] text-[9.5px] font-bold leading-tight tabular-nums',
                              allCompleted
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]',
                            )}
                          >
                            {cell.items.length}
                          </span>
                        </div>
                      )}

                      <div className="hidden md:block space-y-1">
                        {cell.items.slice(0, 2).map((sess) => {
                          const isDone = sess.status === 'COMPLETED';
                          return (
                            <div
                              key={sess.id}
                              className={cn(
                                'rounded-lg px-2 py-1 text-[11px] font-semibold truncate border flex items-center gap-1.5',
                                isDone
                                  ? 'bg-[var(--admin-surface)] border-emerald-500/45 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-[var(--admin-surface)] border-[var(--admin-accent)]/50 text-[var(--admin-text)]',
                              )}
                              title={`${formatTimeShortInTz(sess.startAt, timezone)} • ${sess.title}`}
                            >
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 rounded-full shrink-0',
                                  isDone ? 'bg-emerald-500' : 'bg-[var(--admin-accent)]',
                                )}
                              />
                              <span className="truncate">
                                <span className="font-mono-code font-bold">
                                  {formatTimeShortInTz(sess.startAt, timezone)}
                                </span>{' '}
                                {sess.title}
                              </span>
                            </div>
                          );
                        })}
                        {cell.items.length > 2 && (
                          <p className="text-[10px] font-bold text-[var(--admin-accent)] pl-1">
                            +{cell.items.length - 2} more scheduled
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Selected Day Inspector */}
            {selectedDay && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">
                      {formatReadableDayHeader(selectedDay)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {selectedDayItems.length} session{selectedDayItems.length === 1 ? '' : 's'}{' '}
                      scheduled on this date
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openScheduleOnDay(selectedDay)}
                    className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                  >
                    <PlusIcon className="w-3 h-3" />
                    <span>Schedule on {selectedDay}</span>
                  </button>
                </div>

                {selectedDayItems.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">
                    No shoots scheduled on {selectedDay}. Click &ldquo;Schedule on {selectedDay}
                    &rdquo; to book a slot.
                  </p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2">
                    {selectedDayItems.map(renderSessionCard)}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* VIEW 2: Agenda List */}
        {viewMode === 'agenda' && (
          <>
            {Object.keys(groupedByDay).length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <CalendarIcon className="w-8 h-8 mx-auto text-slate-300" />
                <p className="text-sm font-medium text-slate-700">No matching sessions found</p>
                <p className="text-xs text-slate-500">
                  Adjust the date range or filters, or click &ldquo;Schedule Event&rdquo; above.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedByDay)
                  .sort(([a], [b]) => a.localeCompare(b))
                  .map(([localDate, items]) => (
                    <div key={localDate} className="space-y-2.5">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono-code text-sm font-semibold text-indigo-600">
                            {formatReadableDayHeader(localDate)}
                          </span>
                          <span className="text-xs text-slate-400">
                            ({items.length} session{items.length === 1 ? '' : 's'})
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => openScheduleOnDay(localDate)}
                          className="text-xs font-semibold text-indigo-600 hover:underline"
                        >
                          + Add on this date
                        </button>
                      </div>

                      <div className="grid gap-3 md:grid-cols-2">
                        {items.map(renderSessionCard)}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}

        {/* VIEW 3: By Crew & Gear Workload */}
        {viewMode === 'resources' && (
          <div className="space-y-6">
            {crewResources.length > 0 && (
              <div className="space-y-3">
                <h3 className="admin-section-title">Shoot Crew Workload ({crewResources.length})</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {crewResources.map((resource) => {
                    const assignedSessions = filteredSessions.filter((s) =>
                      s.reservations?.some((r) => r.resourceId === resource.id),
                    );
                    const linkedUser =
                      resource.user ||
                      (resource.userId ? memberById.get(resource.userId) : undefined) ||
                      null;
                    return (
                      <div
                        key={resource.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div className="min-w-0">
                            <p className="admin-row-title truncate">{resource.name}</p>
                            <p className="admin-meta flex items-center gap-1.5">
                              <span
                                className={cn(
                                  'h-1.5 w-1.5 rounded-full shrink-0',
                                  linkedUser ? 'bg-emerald-500' : 'bg-amber-500',
                                )}
                              />
                              <span>
                                {linkedUser
                                  ? `Linked: ${linkedUser.name} (${linkedUser.role})`
                                  : 'Freelance Crew'}
                              </span>
                            </p>
                          </div>
                          <span className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 tabular-nums shrink-0">
                            {assignedSessions.length} slot{assignedSessions.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {assignedSessions.length === 0 ? (
                          <p className="admin-meta">Completely free in this filtered date range.</p>
                        ) : (
                          <div className="space-y-2">
                            {assignedSessions.map((sess) => (
                              <div
                                key={sess.id}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-900 truncate">
                                    {sess.title}
                                  </p>
                                  <p className="text-[11px] text-slate-500 tabular-nums">
                                    {formatDateTimeInTz(sess.startAt, timezone)} →{' '}
                                    {formatTimeShortInTz(sess.endAt, timezone)}
                                  </p>
                                </div>
                                <StatusBadge status={sess.status} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {gearResources.length > 0 && (
              <div className="space-y-3">
                <h3 className="admin-section-title">
                  Equipment Kits &amp; Studio Rooms ({gearResources.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {gearResources.map((resource) => {
                    const assignedSessions = filteredSessions.filter((s) =>
                      s.reservations?.some((r) => r.resourceId === resource.id),
                    );
                    return (
                      <div
                        key={resource.id}
                        className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3"
                      >
                        <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                          <div>
                            <p className="admin-row-title">{resource.name}</p>
                            <p className="admin-meta">{resource.type}</p>
                          </div>
                          <span className="rounded-full bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-semibold text-slate-700 tabular-nums">
                            {assignedSessions.length} slot{assignedSessions.length === 1 ? '' : 's'}
                          </span>
                        </div>

                        {assignedSessions.length === 0 ? (
                          <p className="admin-meta">Completely free in this filtered date range.</p>
                        ) : (
                          <div className="space-y-2">
                            {assignedSessions.map((sess) => (
                              <div
                                key={sess.id}
                                className="rounded-lg border border-slate-200 bg-white px-3 py-2 flex items-center justify-between gap-2"
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-900 truncate">
                                    {sess.title}
                                  </p>
                                  <p className="text-[11px] text-slate-500 tabular-nums">
                                    {formatDateTimeInTz(sess.startAt, timezone)} →{' '}
                                    {formatTimeShortInTz(sess.endAt, timezone)}
                                  </p>
                                </div>
                                <StatusBadge status={sess.status} />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal: Reschedule Session */}
      {rescheduleTarget && (
        <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-center bg-white sm:bg-slate-900/50 p-0 sm:p-4 overflow-y-auto admin-sheet-fade">
          <form
            onSubmit={handleRescheduleSubmit}
            className="flex-1 sm:flex-initial w-full sm:max-w-lg h-dvh sm:h-auto sm:max-h-[92dvh] rounded-none sm:rounded-2xl bg-white p-4 sm:p-6 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 overflow-y-auto shadow-none sm:shadow-2xl border-0 sm:border border-slate-200 space-y-4 sm:my-8"
          >
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Reschedule Session</h3>
                <p className="text-xs text-slate-500 mt-0.5">{rescheduleTarget.title}</p>
              </div>
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-900"
              >
                Close
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  New Start Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={reschedStartLocal}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setReschedStartLocal(nextStart);
                    if (nextStart && reschedEndLocal) {
                      void refreshAvailability(
                        nextStart,
                        reschedEndLocal,
                        'reschedule',
                        rescheduleTarget.id,
                      );
                    }
                  }}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  New End Time *
                </label>
                <input
                  type="datetime-local"
                  required
                  value={reschedEndLocal}
                  onChange={(e) => {
                    const nextEnd = e.target.value;
                    setReschedEndLocal(nextEnd);
                    if (reschedStartLocal && nextEnd) {
                      void refreshAvailability(
                        reschedStartLocal,
                        nextEnd,
                        'reschedule',
                        rescheduleTarget.id,
                      );
                    }
                  }}
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-2.5">
              <p className="text-xs font-semibold text-slate-600">
                Shoot Crew &amp; Gear Assignment
              </p>
              {crewResources.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Shoot Crew
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {crewResources.map((r) => {
                      const active = reschedResourceIds.includes(r.id);
                      const avail = reschedAvailMap[r.id];
                      const isBusy = avail && !avail.available;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          disabled={Boolean(isBusy)}
                          onClick={() =>
                            setReschedResourceIds((prev) =>
                              prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id],
                            )
                          }
                          className={cn(
                            'rounded-lg border px-2.5 py-1 text-xs font-medium cursor-pointer',
                            isBusy
                              ? 'bg-rose-50 text-rose-700 border-rose-200 cursor-not-allowed opacity-75'
                              : active
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200',
                          )}
                        >
                          {r.name}
                          {isBusy ? ' (Busy)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {gearResources.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                    Equipment &amp; Rooms
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {gearResources.map((r) => {
                      const active = reschedResourceIds.includes(r.id);
                      const avail = reschedAvailMap[r.id];
                      const isBusy = avail && !avail.available;
                      return (
                        <button
                          key={r.id}
                          type="button"
                          disabled={Boolean(isBusy)}
                          onClick={() =>
                            setReschedResourceIds((prev) =>
                              prev.includes(r.id) ? prev.filter((x) => x !== r.id) : [...prev, r.id],
                            )
                          }
                          className={cn(
                            'rounded-lg border px-2.5 py-1 text-xs font-medium cursor-pointer',
                            isBusy
                              ? 'bg-rose-50 text-rose-700 border-rose-200 cursor-not-allowed opacity-75'
                              : active
                                ? 'bg-slate-900 text-white border-slate-900'
                                : 'bg-slate-50 text-slate-700 border-slate-200',
                          )}
                        >
                          {r.name}
                          {isBusy ? ' (Busy)' : ''}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Reason for Reschedule (Audit Log) *
              </label>
              <input
                required
                value={reschedReason}
                onChange={(e) => setReschedReason(e.target.value)}
                placeholder="e.g. Venue shifted ceremony start time by 2 hours"
                className={inputClass}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRescheduleTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Keep Current
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
              >
                Confirm Reschedule
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal: Cancel Session */}
      {cancelTarget && (
        <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-center bg-white sm:bg-slate-900/50 p-0 sm:p-4 admin-sheet-fade">
          <form
            onSubmit={handleCancelSubmit}
            className="flex-1 sm:flex-initial w-full sm:max-w-md h-dvh sm:h-auto rounded-none sm:rounded-2xl bg-white p-4 sm:p-6 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 overflow-y-auto shadow-none sm:shadow-2xl border-0 sm:border border-slate-200 space-y-4"
          >
            <div>
              <h3 className="text-lg font-bold text-slate-900">Cancel Session</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cancelling <strong>{cancelTarget.title}</strong> releases all reserved crew and
                equipment immediately.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Cancellation Reason *
              </label>
              <input
                required
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="e.g. Client merged Mehendi and Holud into one day"
                className={inputClass}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                Cancel Session
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
