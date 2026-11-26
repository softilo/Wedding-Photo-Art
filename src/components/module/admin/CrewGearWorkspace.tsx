'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  EventSession,
  Resource,
  ResourceAvailabilityItem,
  ResourceType,
  StudioMember,
} from '@/types/event-management';
import {
  archiveResource,
  checkResourceAvailability,
  createResource,
  updateResource,
} from '@/service/schedule/schedule.service';
import { cn, formatDateTimeInTz } from '@/lib/utils';
import {
  CalendarIcon,
  PlusIcon,
  SearchIcon,
  UsersIcon,
} from '@/components/shared/Icons';

interface CrewGearWorkspaceProps {
  timezone: string;
  todayIso: string;
  initialResources: Resource[];
  members: StudioMember[];
  upcomingSessions: EventSession[];
}

function normalizeNameForMatch(value: string): string {
  return value
    .toLowerCase()
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function formatCrewName(memberName: string, title?: string): string {
  const cleanName = memberName.trim();
  const cleanTitle = title?.trim();
  if (!cleanTitle) return cleanName;
  if (cleanName.toLowerCase().includes(cleanTitle.toLowerCase())) return cleanName;
  return `${cleanName} (${cleanTitle})`;
}

export function CrewGearWorkspace({
  timezone,
  todayIso,
  initialResources,
  members,
  upcomingSessions,
}: CrewGearWorkspaceProps) {
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | 'CREW' | 'GEAR'>('ALL');
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Add Shoot Crew form state
  const [crewAddMode, setCrewAddMode] = useState<'member' | 'freelance'>('member');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [crewSpecialty, setCrewSpecialty] = useState('');
  const [freelanceName, setFreelanceName] = useState('');

  // Add Gear / Room form state
  const [gearName, setGearName] = useState('');
  const [gearType, setGearType] = useState<ResourceType>('EQUIPMENT');

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');

  // Live availability checker
  const [slotStart, setSlotStart] = useState(`${todayIso}T17:00`);
  const [slotEnd, setSlotEnd] = useState(`${todayIso}T23:00`);
  const [availabilityMap, setAvailabilityMap] = useState<
    Record<string, ResourceAvailabilityItem> | null
  >(null);
  const [checkingAvail, setCheckingAvail] = useState(false);

  const notify = (type: 'ok' | 'err', text: string) => setFeedback({ type, text });

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

  const unlinkedActiveMembers = useMemo(
    () =>
      members.filter(
        (m) => m.isActive && !crewResources.some((r) => r.userId === m.id),
      ),
    [members, crewResources],
  );

  const suggestedLinks = useMemo(() => {
    const pairs: Array<{ resource: Resource; member: StudioMember }> = [];
    for (const r of crewResources) {
      if (r.userId) continue;
      const rNorm = normalizeNameForMatch(r.name);
      if (!rNorm) continue;
      const match = members.find((m) => {
        if (!m.isActive) return false;
        const mNorm = normalizeNameForMatch(m.name);
        return (
          Boolean(mNorm) &&
          (rNorm === mNorm || rNorm.startsWith(`${mNorm} `) || mNorm.startsWith(`${rNorm} `))
        );
      });
      if (match) pairs.push({ resource: r, member: match });
    }
    return pairs;
  }, [crewResources, members]);

  const sessionsByResource = useMemo(() => {
    const map = new Map<string, EventSession[]>();
    for (const s of upcomingSessions) {
      for (const r of s.reservations ?? []) {
        const list = map.get(r.resourceId) ?? [];
        list.push(s);
        map.set(r.resourceId, list);
      }
    }
    return map;
  }, [upcomingSessions]);

  const filteredCrew = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return crewResources.filter((r) => {
      if (!q) return true;
      const linked = r.user || (r.userId ? memberById.get(r.userId) : undefined);
      return (
        r.name.toLowerCase().includes(q) ||
        (linked?.name.toLowerCase().includes(q) ?? false) ||
        (linked?.email.toLowerCase().includes(q) ?? false)
      );
    });
  }, [crewResources, searchQuery, memberById]);

  const filteredGear = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return gearResources.filter(
      (r) =>
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.type.toLowerCase().includes(q),
    );
  }, [gearResources, searchQuery]);

  const linkedCrewCount = crewResources.filter((r) => Boolean(r.userId)).length;
  const freelanceCrewCount = crewResources.length - linkedCrewCount;
  const totalUpcomingBookings = useMemo(() => {
    let count = 0;
    for (const r of resources) {
      count += sessionsByResource.get(r.id)?.length ?? 0;
    }
    return count;
  }, [resources, sessionsByResource]);

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-[var(--admin-accent)] focus:bg-white transition-all';

  const handleCheckAvailability = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!slotStart || !slotEnd) return;
    const sDate = new Date(slotStart);
    const eDate = new Date(slotEnd);
    if (Number.isNaN(sDate.getTime()) || Number.isNaN(eDate.getTime()) || eDate <= sDate) {
      notify('err', 'End date & time must be after start date & time.');
      return;
    }
    setCheckingAvail(true);
    const res = await checkResourceAvailability(sDate.toISOString(), eDate.toISOString());
    setCheckingAvail(false);
    if (!res.ok || !res.data) {
      notify('err', res.message || 'Failed to check live slot availability');
      return;
    }
    const nextMap: Record<string, ResourceAvailabilityItem> = {};
    for (const item of res.data.resources) {
      nextMap[item.id] = item;
    }
    setAvailabilityMap(nextMap);
  };

  const handleAddCrew = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (crewAddMode === 'member') {
        const chosen = members.find((m) => m.id === selectedUserId);
        if (!chosen) {
          notify('err', 'Please choose a Studio Team member first.');
          return;
        }
        const res = await createResource({
          name: formatCrewName(chosen.name, crewSpecialty),
          type: 'CREW',
          userId: chosen.id,
        });
        if (!res.ok || !res.data) {
          notify('err', res.message || 'Failed to add shoot crew member');
          return;
        }
        setResources((prev) => [...prev, res.data!]);
        setSelectedUserId('');
        setCrewSpecialty('');
        notify('ok', `Added linked shoot crew: ${res.data.name}`);
      } else {
        if (!freelanceName.trim()) return;
        const res = await createResource({
          name: formatCrewName(freelanceName, crewSpecialty),
          type: 'CREW',
        });
        if (!res.ok || !res.data) {
          notify('err', res.message || 'Failed to add freelance crew');
          return;
        }
        setResources((prev) => [...prev, res.data!]);
        setFreelanceName('');
        setCrewSpecialty('');
        notify('ok', `Added freelance crew: ${res.data.name}`);
      }
    });
  };

  const handleAddGear = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gearName.trim()) return;
    startTransition(async () => {
      const res = await createResource({
        name: gearName.trim(),
        type: gearType,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to add equipment or studio room');
        return;
      }
      setResources((prev) => [...prev, res.data!]);
      setGearName('');
      notify('ok', `Added ${res.data.type.toLowerCase()}: ${res.data.name}`);
    });
  };

  const handleLinkResource = (resource: Resource, memberId: string | null) => {
    startTransition(async () => {
      const res = await updateResource(resource.id, { userId: memberId });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to update account link');
        return;
      }
      setResources((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
      notify(
        'ok',
        memberId
          ? `Linked "${res.data.name}" to team account.`
          : `Unlinked "${res.data.name}" (marked as freelance).`,
      );
    });
  };

  const handleLinkAllSuggested = () => {
    if (suggestedLinks.length === 0) return;
    startTransition(async () => {
      const results = await Promise.all(
        suggestedLinks.map(({ resource, member }) =>
          updateResource(resource.id, { userId: member.id }),
        ),
      );
      const updatedMap = new Map<string, Resource>();
      let firstError: string | undefined;
      for (const r of results) {
        if (r.ok && r.data) {
          updatedMap.set(r.data.id, r.data);
        } else if (!firstError) {
          firstError = r.message;
        }
      }
      if (updatedMap.size > 0) {
        setResources((prev) => prev.map((r) => updatedMap.get(r.id) ?? r));
        notify(
          'ok',
          `Linked ${updatedMap.size} shoot crew profile${updatedMap.size === 1 ? '' : 's'} to studio team accounts.`,
        );
      } else if (firstError) {
        notify('err', firstError);
      }
    });
  };

  const handleSaveRename = (resource: Resource) => {
    if (!editingName.trim()) return;
    startTransition(async () => {
      const res = await updateResource(resource.id, { name: editingName.trim() });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to rename item');
        return;
      }
      setResources((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
      setEditingId(null);
      setEditingName('');
      notify('ok', `Updated name to "${res.data.name}".`);
    });
  };

  const handleArchive = (resource: Resource) => {
    startTransition(async () => {
      const res = await archiveResource(resource.id);
      if (!res.ok) {
        notify('err', res.message || 'Cannot remove item while reserved on upcoming shoots.');
        return;
      }
      setResources((prev) => prev.filter((r) => r.id !== resource.id));
      notify('ok', `Removed "${resource.name}" from active pool.`);
    });
  };

  const renderAvailabilityBadge = (resourceId: string) => {
    if (!availabilityMap) return null;
    const avail = availabilityMap[resourceId];
    if (!avail) return null;
    if (avail.available) {
      return (
        <span className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Free in Slot
        </span>
      );
    }
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11.5px] font-medium text-rose-700"
        title={avail.conflict?.title}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Busy ({avail.conflict?.bookingReference || avail.conflict?.title})
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="admin-page-title">Crew &amp; Gear Pool</h1>
          <p className="admin-meta mt-1">
            Dedicated workspace for shoot photographers, freelance crew, camera kits, drones, and studio rooms ({timezone}).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/admin/team"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <UsersIcon className="w-3.5 h-3.5 text-slate-500" />
            <span>Team Accounts →</span>
          </Link>
          <Link
            href="/staff"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            <span>Crew Dispatch →</span>
          </Link>
          <Link
            href="/admin/calendar"
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
          >
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Open Calendar</span>
          </Link>
        </div>
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

      {/* 4 Clean KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="atelier-card p-4 sm:p-5 space-y-1">
          <p className="admin-meta">Shoot Crew Roster</p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums">
            {crewResources.length}
          </p>
          <p className="admin-meta tabular-nums">
            {linkedCrewCount} linked • {freelanceCrewCount} freelance
          </p>
        </div>

        <div className="atelier-card p-4 sm:p-5 space-y-1">
          <p className="admin-meta">Equipment &amp; Rooms</p>
          <p className="text-2xl font-semibold text-slate-900 tabular-nums">
            {gearResources.length}
          </p>
          <p className="admin-meta">Drones, camera kits &amp; spaces</p>
        </div>

        <div className="atelier-card p-4 sm:p-5 space-y-1">
          <p className="admin-meta">Account Sync Status</p>
          <p className="text-xl font-semibold text-slate-900 flex items-center gap-2 mt-1 tabular-nums">
            <span
              className={cn(
                'h-2.5 w-2.5 rounded-full',
                suggestedLinks.length > 0 ? 'bg-amber-500' : 'bg-emerald-500',
              )}
            />
            <span>
              {suggestedLinks.length > 0
                ? `${suggestedLinks.length} Match Unlinked`
                : 'Synced'}
            </span>
          </p>
          <p className="admin-meta">
            {suggestedLinks.length > 0
              ? 'Ready for 1-click link below'
              : 'Linked crew sync to My Shoots'}
          </p>
        </div>

        <div className="atelier-card p-4 sm:p-5 space-y-1">
          <p className="admin-meta">Upcoming Reserved Slots</p>
          <p className="text-2xl font-semibold text-[var(--admin-accent)] tabular-nums">
            {totalUpcomingBookings}
          </p>
          <p className="admin-meta">Active locks next 30 days</p>
        </div>
      </div>

      {/* Smart 1-Click Link Banner */}
      {suggestedLinks.length > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5 min-w-0">
            <p className="text-sm font-semibold text-slate-900">
              {suggestedLinks.length} unlinked Shoot Crew profile
              {suggestedLinks.length === 1 ? '' : 's'} match Studio Team accounts
            </p>
            <p className="admin-meta">
              Link them so schedule bookings appear automatically on each person&apos;s{' '}
              <strong>My Shoots &amp; Tasks</strong> portal without re-typing names.
            </p>
          </div>
          <button
            type="button"
            disabled={isPending}
            onClick={handleLinkAllSuggested}
            className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer disabled:opacity-60"
          >
            Link All {suggestedLinks.length} Matched Profiles
          </button>
        </div>
      )}

      {/* Search + Category Filter + Live Slot Availability Checker */}
      <div className="atelier-card p-3 sm:p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
          <div className="flex items-center overflow-x-auto no-scrollbar max-w-full rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
            {[
              { id: 'ALL' as const, label: `All (${resources.length})` },
              { id: 'CREW' as const, label: `Shoot Crew (${crewResources.length})` },
              { id: 'GEAR' as const, label: `Equipment & Rooms (${gearResources.length})` },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setCategoryFilter(tab.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium whitespace-nowrap shrink-0 cursor-pointer tabular-nums',
                  categoryFilter === tab.id
                    ? 'bg-white text-slate-900 border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:flex-1 sm:max-w-sm">
            <SearchIcon className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search crew name, specialty, camera..."
              className="w-full h-9 sm:h-auto rounded-xl border border-slate-200 bg-slate-50 pl-8 pr-3 py-1.5 text-xs text-slate-900 outline-none focus:border-[var(--admin-accent)] focus:bg-white"
            />
          </div>
        </div>

        <form
          onSubmit={handleCheckAvailability}
          className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:flex sm:flex-wrap items-end gap-2.5"
        >
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              Quick Availability Check — Start ({timezone})
            </label>
            <input
              type="datetime-local"
              value={slotStart}
              onChange={(e) => setSlotStart(e.target.value)}
              className="w-full sm:w-auto h-9 sm:h-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs tabular-nums"
            />
          </div>
          <div className="w-full sm:w-auto">
            <label className="block text-[11px] font-medium text-slate-500 mb-1">
              End ({timezone})
            </label>
            <input
              type="datetime-local"
              value={slotEnd}
              onChange={(e) => setSlotEnd(e.target.value)}
              className="w-full sm:w-auto h-9 sm:h-auto rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs tabular-nums"
            />
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="submit"
              disabled={checkingAvail}
              className="flex-1 sm:flex-initial h-9 sm:h-auto rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer whitespace-nowrap"
            >
              {checkingAvail ? 'Checking...' : 'Check Free / Busy'}
            </button>
            {availabilityMap && (
              <button
                type="button"
                onClick={() => setAvailabilityMap(null)}
                className="h-9 sm:h-auto rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-50 cursor-pointer whitespace-nowrap"
              >
                Clear Check
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Main Content Grid */}
      <div
        className={cn(
          'grid gap-6 items-start',
          categoryFilter === 'ALL' ? 'lg:grid-cols-2' : 'grid-cols-1',
        )}
      >
        {/* SECTION 1: SHOOT CREW ROSTER */}
        {categoryFilter !== 'GEAR' && (
          <div className="atelier-card p-4 sm:p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="admin-section-title">
                Shoot Crew Roster ({filteredCrew.length})
              </h2>
              <p className="admin-meta mt-0.5">
                Link studio staff or add freelancers so overlapping shoots never double-book anyone.
              </p>
            </div>

            <form
              onSubmit={handleAddCrew}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5"
            >
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 gap-1">
                <button
                  type="button"
                  onClick={() => setCrewAddMode('member')}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer',
                    crewAddMode === 'member'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  From Team Member
                </button>
                <button
                  type="button"
                  onClick={() => setCrewAddMode('freelance')}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer',
                    crewAddMode === 'freelance'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  Freelance / External
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {crewAddMode === 'member' ? (
                  <select
                    required
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className={inputClass}
                  >
                    <option value="">Select team member...</option>
                    {(unlinkedActiveMembers.length > 0
                      ? unlinkedActiveMembers
                      : members.filter((m) => m.isActive)
                    ).map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} ({m.role})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    required
                    value={freelanceName}
                    onChange={(e) => setFreelanceName(e.target.value)}
                    placeholder="Freelancer full name"
                    className={inputClass}
                  />
                )}
                <input
                  value={crewSpecialty}
                  onChange={(e) => setCrewSpecialty(e.target.value)}
                  placeholder="Specialty (e.g. Lead Photographer)"
                  className={inputClass}
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer disabled:opacity-60"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add Shoot Crew</span>
                </button>
              </div>
            </form>

            {filteredCrew.length === 0 ? (
              <p className="admin-meta py-8 text-center">No shoot crew match this filter.</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredCrew.map((r) => {
                  const linkedUser =
                    r.user || (r.userId ? memberById.get(r.userId) : undefined) || null;
                  const nextShoots = sessionsByResource.get(r.id) ?? [];
                  const isEditing = editingId === r.id;

                  return (
                    <div key={r.id} className="py-3.5 space-y-2">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0 flex-1 space-y-1">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={editingName}
                                onChange={(e) => setEditingName(e.target.value)}
                                className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs"
                              />
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleSaveRename(r)}
                                className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="text-xs text-slate-500 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="admin-row-title line-clamp-1">{r.name}</p>
                                {renderAvailabilityBadge(r.id)}
                              </div>
                              <p className="admin-meta flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5">
                                  <span
                                    className={cn(
                                      'h-1.5 w-1.5 rounded-full shrink-0',
                                      linkedUser ? 'bg-emerald-500' : 'bg-amber-500',
                                    )}
                                  />
                                  <span>
                                    {linkedUser
                                      ? `Linked: ${linkedUser.email} (${linkedUser.role})`
                                      : 'Freelance / No Account'}
                                  </span>
                                </span>
                                <span className="tabular-nums">
                                  • {nextShoots.length} upcoming shoot
                                  {nextShoots.length === 1 ? '' : 's'}
                                </span>
                              </p>
                              {nextShoots[0] && (
                                <p className="text-[11px] text-slate-500 tabular-nums line-clamp-1">
                                  Next: {nextShoots[0].title} (
                                  {formatDateTimeInTz(nextShoots[0].startAt, timezone)})
                                </p>
                              )}
                            </>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {linkedUser ? (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleLinkResource(r, null)}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                              >
                                Unlink
                              </button>
                            ) : (
                              <select
                                defaultValue=""
                                disabled={isPending}
                                onChange={(e) => {
                                  if (e.target.value) handleLinkResource(r, e.target.value);
                                }}
                                aria-label={`Link ${r.name} to team account`}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 cursor-pointer"
                              >
                                <option value="">Link Account...</option>
                                {members
                                  .filter((m) => m.isActive)
                                  .map((m) => (
                                    <option key={m.id} value={m.id}>
                                      {m.name} ({m.role})
                                    </option>
                                  ))}
                              </select>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setEditingId(r.id);
                                setEditingName(r.name);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleArchive(r)}
                              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                            >
                              Remove
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* SECTION 2: EQUIPMENT KITS & STUDIO ROOMS */}
        {categoryFilter !== 'CREW' && (
          <div className="atelier-card p-4 sm:p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="admin-section-title">
                Equipment Kits &amp; Studio Rooms ({filteredGear.length})
              </h2>
              <p className="admin-meta mt-0.5">
                Track cameras, drones, gimbals, and studio floors to prevent overlapping reservations.
              </p>
            </div>

            <form
              onSubmit={handleAddGear}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-wrap gap-2"
            >
              <input
                required
                value={gearName}
                onChange={(e) => setGearName(e.target.value)}
                placeholder="e.g. Sony FX6 Kit B / DJI Mavic 3 Pro"
                className="flex-1 min-w-[190px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[var(--admin-accent)]"
              />
              <select
                value={gearType}
                onChange={(e) => setGearType(e.target.value as ResourceType)}
                className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium"
              >
                <option value="EQUIPMENT">Equipment Kit</option>
                <option value="ROOM">Studio / Room</option>
                <option value="OTHER">Other Asset</option>
              </select>
              <button
                type="submit"
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add Gear</span>
              </button>
            </form>

            {filteredGear.length === 0 ? (
              <p className="admin-meta py-8 text-center">
                No camera kits, drones, or rooms match this filter.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {filteredGear.map((r) => {
                  const nextShoots = sessionsByResource.get(r.id) ?? [];
                  const isEditing = editingId === r.id;

                  return (
                    <div
                      key={r.id}
                      className="py-3.5 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs"
                            />
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleSaveRename(r)}
                              className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="text-xs text-slate-500 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="admin-row-title line-clamp-1">{r.name}</p>
                              {renderAvailabilityBadge(r.id)}
                            </div>
                            <p className="admin-meta tabular-nums">
                              {r.type} • {nextShoots.length} upcoming reservation
                              {nextShoots.length === 1 ? '' : 's'}
                            </p>
                          </>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingId(r.id);
                              setEditingName(r.name);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleArchive(r)}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
