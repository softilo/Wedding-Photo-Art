'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Assignment,
  AssignmentStatus,
  EventSession,
  StudioDispatchData,
  UserRole,
} from '@/types/event-management';
import { updateAssignment } from '@/service/operations/operations.service';
import { cn, formatDateTimeInTz, formatLocalDate } from '@/lib/utils';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CalendarIcon, UsersIcon } from '@/components/shared/Icons';

interface StaffWorkspaceProps {
  userRole: UserRole;
  currentUserId: string;
  timezone?: string;
  initialAssignments: Assignment[];
  initialShoots?: EventSession[];
  initialStudioDispatch?: StudioDispatchData | null;
}

export function StaffWorkspace({
  userRole,
  currentUserId,
  timezone = 'Asia/Dhaka',
  initialAssignments,
  initialShoots = [],
  initialStudioDispatch = null,
}: StaffWorkspaceProps) {
  const isManager = userRole === 'OWNER' || userRole === 'COORDINATOR';
  const [viewMode, setViewMode] = useState<'dispatch' | 'my'>(
    isManager && initialStudioDispatch ? 'dispatch' : 'my',
  );
  const [selectedCrewUserId, setSelectedCrewUserId] = useState<string>('ALL');
  const [taskFilter, setTaskFilter] = useState<'OPEN' | 'ALL' | 'COMPLETED'>('OPEN');

  const [assignments, setAssignments] = useState<Assignment[]>(initialAssignments);
  const [dispatchAssignments, setDispatchAssignments] = useState<Assignment[]>(
    initialStudioDispatch?.assignments ?? [],
  );
  const [isPending, startTransition] = useTransition();

  const handleStatusChange = (id: string, status: AssignmentStatus) => {
    startTransition(async () => {
      const res = await updateAssignment(id, { status });
      if (res.ok && res.data) {
        setAssignments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: res.data!.status } : a)),
        );
        setDispatchAssignments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status: res.data!.status } : a)),
        );
        window.dispatchEvent(new Event('rongilo-notifications-refresh'));
      }
    });
  };

  const upcomingSessions = useMemo(
    () => initialStudioDispatch?.upcomingSessions ?? [],
    [initialStudioDispatch],
  );
  const crewSummary = useMemo(
    () => initialStudioDispatch?.crewSummary ?? [],
    [initialStudioDispatch],
  );

  const filteredDispatchSessions = useMemo(() => {
    if (selectedCrewUserId === 'ALL') return upcomingSessions;
    return upcomingSessions.filter((s) =>
      s.reservations?.some((r) => r.resource?.userId === selectedCrewUserId),
    );
  }, [upcomingSessions, selectedCrewUserId]);

  const filteredDispatchTasks = useMemo(() => {
    return dispatchAssignments.filter((a) => {
      if (selectedCrewUserId !== 'ALL' && a.assigneeUserId !== selectedCrewUserId) {
        return false;
      }
      if (taskFilter === 'OPEN') {
        return a.status === 'ASSIGNED' || a.status === 'ACCEPTED';
      }
      if (taskFilter === 'COMPLETED') {
        return a.status === 'COMPLETED';
      }
      return true;
    });
  }, [dispatchAssignments, selectedCrewUserId, taskFilter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--admin-accent)]">
            {isManager ? 'Operations & Scheduling Sync' : 'Team Portal'}
          </p>
          <h1 className="admin-page-title mt-1">
            {viewMode === 'dispatch' ? 'Studio Crew Dispatch' : 'My Shoots & Tasks'}
          </h1>
          <p className="admin-meta mt-1">
            {viewMode === 'dispatch'
              ? 'Live overview of scheduled shoot call sheets, staff workloads, and workflow tasks.'
              : 'Shoot call sheets reserved for you on the calendar plus your assigned prep & editing tasks.'}
          </p>
        </div>

        {isManager && initialStudioDispatch && (
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="inline-flex rounded-xl border p-1 gap-1"
              style={{
                borderColor: 'var(--admin-border)',
                backgroundColor: 'var(--admin-surface)',
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode('dispatch')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer transition-colors',
                  viewMode === 'dispatch'
                    ? 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)] shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                Studio Dispatch
              </button>
              <button
                type="button"
                onClick={() => setViewMode('my')}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer tabular-nums transition-colors',
                  viewMode === 'my'
                    ? 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)] shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                My Work ({initialShoots.length + assignments.length})
              </button>
            </div>
            <Link
              href="/admin/crew"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Crew &amp; Gear →
            </Link>
            <Link
              href="/admin/team"
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Team &amp; Rules →
            </Link>
          </div>
        )}
      </div>

      {/* ================================================================
          VIEW 1: MANAGER STUDIO CREW DISPATCH BOARD
      ================================================================ */}
      {viewMode === 'dispatch' && initialStudioDispatch && (
        <div className="space-y-6">
          {/* Team Workload & Shoot Roster Strip */}
          <div className="atelier-card p-4 sm:p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="admin-section-title">Studio Members &amp; Shoot Load</h2>
              {selectedCrewUserId !== 'ALL' && (
                <button
                  type="button"
                  onClick={() => setSelectedCrewUserId('ALL')}
                  className="text-xs font-medium text-[var(--admin-accent)] hover:underline cursor-pointer"
                >
                  Show All Crew
                </button>
              )}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {crewSummary.map((member) => {
                const isSelected = selectedCrewUserId === member.id;
                const onShootRoster = member.crewResources.length > 0;
                return (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() =>
                      setSelectedCrewUserId(isSelected ? 'ALL' : member.id)
                    }
                    className={cn(
                      'rounded-xl border p-3.5 text-left transition-colors cursor-pointer space-y-1.5',
                      isSelected
                        ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-white',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="admin-row-title line-clamp-1">{member.name}</span>
                      <span className="font-mono-code text-[10px] font-semibold text-slate-500 shrink-0">
                        {member.role}
                      </span>
                    </div>
                    <p className="admin-meta line-clamp-1">
                      {onShootRoster
                        ? member.crewResources.map((r) => r.name).join(', ')
                        : 'Not on shoot roster'}
                    </p>
                    <div className="flex items-center gap-3 pt-1 text-[11px] font-medium text-slate-600 tabular-nums">
                      <span>{member.upcomingShootsCount} shoots</span>
                      <span>•</span>
                      <span>{member.openTasksCount} open tasks</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Upcoming Shoot Call Sheets */}
            <div className="lg:col-span-7 atelier-card p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h2 className="admin-section-title">
                    Upcoming Shoot Call Sheets ({filteredDispatchSessions.length})
                  </h2>
                  <p className="admin-meta">
                    Sessions with reserved crew &amp; gear — warns if a shoot still has zero crew assigned.
                  </p>
                </div>
                <Link
                  href="/admin/calendar"
                  className="text-xs font-medium text-[var(--admin-accent)] hover:underline shrink-0"
                >
                  Open Calendar →
                </Link>
              </div>

              {filteredDispatchSessions.length === 0 ? (
                <p className="admin-meta py-8 text-center">
                  No scheduled shoot sessions match this filter.
                </p>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredDispatchSessions.map((sess) => {
                    const crewAssigned =
                      sess.reservations?.filter((r) => r.resource?.type === 'CREW') ?? [];
                    const gearAssigned =
                      sess.reservations?.filter((r) => r.resource?.type !== 'CREW') ?? [];

                    return (
                      <div key={sess.id} className="py-3.5 space-y-2">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {sess.booking && (
                                <Link
                                  href={`/admin/bookings/${encodeURIComponent(sess.booking.id)}?section=schedule`}
                                  className="font-mono-code text-xs font-semibold text-[var(--admin-accent)] hover:underline tabular-nums"
                                >
                                  {sess.booking.reference}
                                </Link>
                              )}
                              <span className="admin-row-title line-clamp-1">{sess.title}</span>
                            </div>
                            <p className="admin-meta tabular-nums mt-0.5 line-clamp-1">
                              {formatDateTimeInTz(sess.startAt, timezone)}
                              {sess.location ? ` • ${sess.location}` : ''}
                              {sess.booking ? ` • ${sess.booking.clientName}` : ''}
                            </p>
                          </div>

                          {crewAssigned.length === 0 ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 shrink-0">
                              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                              Needs Crew
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 shrink-0 tabular-nums">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {crewAssigned.length} Crew Assigned
                            </span>
                          )}
                        </div>

                        {(crewAssigned.length > 0 || gearAssigned.length > 0) && (
                          <div className="flex flex-wrap gap-1.5">
                            {crewAssigned.map((r) => (
                              <span
                                key={r.id}
                                className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-700"
                              >
                                {r.resource?.name || r.resourceId}
                              </span>
                            ))}
                            {gearAssigned.map((r) => (
                              <span
                                key={r.id}
                                className="rounded-full border border-slate-200 bg-white px-2.5 py-0.5 text-[11px] text-slate-500"
                              >
                                {r.resource?.name || r.resourceId}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Studio Workflow Tasks */}
            <div className="lg:col-span-5 atelier-card p-4 sm:p-5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <h2 className="admin-section-title">
                  Workflow Tasks ({filteredDispatchTasks.length})
                </h2>
                <div className="flex items-center overflow-x-auto no-scrollbar max-w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5 gap-0.5">
                  {(['OPEN', 'COMPLETED', 'ALL'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setTaskFilter(tab)}
                      className={cn(
                        'rounded-md px-2.5 py-1 text-[11px] font-medium whitespace-nowrap shrink-0 cursor-pointer',
                        taskFilter === tab
                          ? 'bg-white text-slate-900'
                          : 'text-slate-600 hover:text-slate-900',
                      )}
                    >
                      {tab === 'OPEN' ? 'Open' : tab === 'COMPLETED' ? 'Done' : 'All'}
                    </button>
                  ))}
                </div>
              </div>

              {filteredDispatchTasks.length === 0 ? (
                <p className="admin-meta py-8 text-center">
                  No workflow tasks in this filter. Assign tasks inside a Booking&apos;s{' '}
                  <strong>4. Crew Tasks</strong> tab.
                </p>
              ) : (
                <div className="divide-y divide-slate-100 max-h-[540px] overflow-y-auto pr-1">
                  {filteredDispatchTasks.map((a) => (
                    <div key={a.id} className="py-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="admin-row-title line-clamp-1">{a.roleLabel}</p>
                          <p className="admin-meta line-clamp-1">
                            {a.assignee ? a.assignee.name : 'Crew'}
                            {a.booking ? ` • ${a.booking.reference} (${a.booking.eventTitle})` : ''}
                          </p>
                          {a.notes && <p className="admin-meta line-clamp-1">{a.notes}</p>}
                        </div>
                        <StatusBadge status={a.status} />
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                        {a.booking ? (
                          <Link
                            href={`/admin/bookings/${encodeURIComponent(a.booking.id)}?section=tasks`}
                            className="text-[11px] font-medium text-[var(--admin-accent)] hover:underline"
                          >
                            Open Booking →
                          </Link>
                        ) : (
                          <span />
                        )}
                        {a.status !== 'COMPLETED' && a.status !== 'CANCELLED' && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleStatusChange(a.id, 'COMPLETED')}
                            className="rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-100 cursor-pointer"
                          >
                            Mark Done
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================
          VIEW 2: PERSONAL SHOOTS & TASKS (STAFF DEFAULT + MANAGER "MY WORK")
      ================================================================ */}
      {viewMode === 'my' && (
        <div className="space-y-6">
          {assignments.some((a) => a.status === 'ASSIGNED') && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-center gap-2.5 text-xs text-slate-800">
              <span className="h-2 w-2 rounded-full bg-amber-500 shrink-0" />
              <span className="tabular-nums">
                <strong>Action needed:</strong> You have{' '}
                {assignments.filter((a) => a.status === 'ASSIGNED').length} newly assigned task
                {assignments.filter((a) => a.status === 'ASSIGNED').length === 1 ? '' : 's'} awaiting acceptance below.
              </span>
            </div>
          )}

          {/* My Scheduled Shoots from Calendar Reservations */}
          <div className="atelier-card p-4 sm:p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="admin-section-title">
                My Scheduled Shoot Call Sheets ({initialShoots.length})
              </h2>
              <p className="admin-meta mt-0.5">
                Automatically synced whenever a Coordinator books your Shoot Crew profile on a session.
              </p>
            </div>

            {initialShoots.length === 0 ? (
              <div className="py-8 text-center space-y-1.5">
                <CalendarIcon className="w-7 h-7 mx-auto text-[var(--admin-muted)]" />
                <p className="admin-row-title">No upcoming shoots reserved for your profile</p>
                <p className="admin-meta max-w-md mx-auto">
                  When a manager reserves your linked crew profile on a shoot session in Schedule, the date, venue, and gear list appear here automatically.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {initialShoots.map((sess) => {
                  const otherCrewAndGear =
                    sess.reservations?.filter((r) => r.resource?.userId !== currentUserId) ?? [];

                  return (
                    <div
                      key={sess.id}
                      className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-2.5"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          {sess.booking && (
                            <span className="font-mono-code text-xs text-[var(--admin-muted)] tabular-nums">
                              {sess.booking.reference}
                            </span>
                          )}
                          <h3 className="admin-row-title mt-0.5 line-clamp-1">{sess.title}</h3>
                        </div>
                        <StatusBadge status={sess.status} />
                      </div>

                      <p className="text-xs font-medium text-[var(--admin-accent)] tabular-nums">
                        {formatDateTimeInTz(sess.startAt, timezone)} →{' '}
                        {formatDateTimeInTz(sess.endAt, timezone)}
                      </p>

                      <div className="rounded-lg bg-white border border-slate-200 p-3 text-xs space-y-1">
                        {sess.booking && (
                          <p className="line-clamp-1">
                            <span className="text-[var(--admin-muted)]">Client:</span>{' '}
                            <span className="font-medium">{sess.booking.clientName}</span>
                            {sess.booking.clientPhone ? (
                              <>
                                {' '}
                                (<span className="tabular-nums">{sess.booking.clientPhone}</span>)
                              </>
                            ) : null}
                          </p>
                        )}
                        {sess.location && (
                          <p className="line-clamp-1">
                            <span className="text-[var(--admin-muted)]">Venue:</span>{' '}
                            {sess.location}
                          </p>
                        )}
                        {otherCrewAndGear.length > 0 && (
                          <p className="line-clamp-2">
                            <span className="text-[var(--admin-muted)]">Crew &amp; Gear:</span>{' '}
                            {otherCrewAndGear
                              .map((r) => r.resource?.name || r.resourceId)
                              .join(', ')}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <a
                          href={`/api/schedule/sessions/${encodeURIComponent(sess.id)}/calendar.ics`}
                          download
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50"
                        >
                          Add to Calendar (.ics)
                        </a>
                        {isManager && sess.booking && (
                          <Link
                            href={`/admin/bookings/${encodeURIComponent(sess.booking.id)}?section=schedule`}
                            className="text-xs font-medium text-[var(--admin-accent)] hover:underline"
                          >
                            Open Booking →
                          </Link>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* My Assigned Workflow Tasks */}
          <div className="atelier-card p-4 sm:p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="admin-section-title">
                My Assigned Workflow Tasks ({assignments.length})
              </h2>
              <p className="admin-meta mt-0.5">
                Pre-event prep, culling, color grading, and editing deliverables assigned to you.
              </p>
            </div>

            {assignments.length === 0 ? (
              <div className="py-8 text-center space-y-2">
                <UsersIcon className="w-7 h-7 mx-auto text-[var(--admin-muted)]" />
                <p className="admin-row-title">No workflow tasks right now</p>
                <p className="admin-meta max-w-md mx-auto">
                  When a manager assigns a prep or post-production task to you, you will see the client details and due notes here.
                </p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {assignments.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="font-mono-code text-xs text-[var(--admin-muted)] tabular-nums">
                          {a.booking?.reference || 'BOOKING'}
                        </span>
                        <h3 className="admin-section-title mt-0.5 line-clamp-1">
                          {a.booking?.eventTitle || a.roleLabel}
                        </h3>
                      </div>
                      <StatusBadge status={a.status} />
                    </div>

                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--admin-accent)]">
                      {a.roleLabel}
                    </p>

                    {a.booking && (
                      <div className="rounded-lg bg-white border border-[var(--admin-border)] p-3 text-xs space-y-1 text-[var(--admin-text)]">
                        <p className="line-clamp-1">
                          <span className="text-[var(--admin-muted)]">Client:</span>{' '}
                          <span className="font-medium">{a.booking.clientName}</span> (
                          <span className="tabular-nums">{a.booking.clientPhone}</span>)
                        </p>
                        <p className="tabular-nums">
                          <span className="text-[var(--admin-muted)]">Event Date:</span>{' '}
                          {formatLocalDate(a.booking.eventDate)}
                        </p>
                        {a.notes && <p className="admin-meta pt-0.5">{a.notes}</p>}
                      </div>
                    )}

                    {a.session && (
                      <div className="flex items-center gap-2 text-xs text-[var(--admin-muted)] tabular-nums">
                        <CalendarIcon className="w-4 h-4 shrink-0" />
                        <span className="line-clamp-1">
                          {a.session.title}
                          {a.session.startAt
                            ? `: ${formatDateTimeInTz(a.session.startAt, timezone)}`
                            : ''}
                          {a.session.location ? ` • ${a.session.location}` : ''}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-2 pt-1">
                      {a.status === 'ASSIGNED' && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleStatusChange(a.id, 'ACCEPTED')}
                          className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-60 cursor-pointer"
                        >
                          Accept Assignment
                        </button>
                      )}
                      {a.status === 'ACCEPTED' && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleStatusChange(a.id, 'COMPLETED')}
                          className="rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-60 cursor-pointer"
                        >
                          Mark Complete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
