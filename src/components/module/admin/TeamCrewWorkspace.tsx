'use client';

import React, { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  DeliverableLabelTemplate,
  EventType,
  Resource,
  ResourceType,
  StudioMember,
  TaskTemplate,
  UserRole,
} from '@/types/event-management';
import { addAgencyMember, updateAgencyMember } from '@/service/agency/agency.service';
import {
  createDeliverableLabel,
  createTaskTemplate,
  updateDeliverableLabel,
  updateTaskTemplate,
} from '@/service/catalog/catalog.service';
import {
  archiveResource,
  createResource,
  updateResource,
} from '@/service/schedule/schedule.service';
import { cn } from '@/lib/utils';
import {
  CalendarIcon,
  PlusIcon,
  SlidersIcon,
  UsersIcon,
} from '@/components/shared/Icons';

export interface TeamCrewWorkspaceProps {
  currentUserId: string;
  currentUserRole: UserRole;
  initialMembers: StudioMember[];
  initialResources: Resource[];
  initialEventTypes: EventType[];
  initialDeliverableLabels: DeliverableLabelTemplate[];
  initialTaskTemplates: TaskTemplate[];
  initialTab?: 'members' | 'roster' | 'automation';
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

const ROLE_HINTS: Record<UserRole, string> = {
  OWNER: 'Full access: settings, billing, team & operations',
  COORDINATOR: 'Quotes, bookings, shoot scheduling & crew dispatch',
  ACCOUNTANT: 'Payments verification, invoices & financial reports',
  STAFF: 'Field crew / editor — accesses My Shoots & Tasks',
};

export function TeamCrewWorkspace({
  currentUserId,
  currentUserRole,
  initialMembers,
  initialResources,
  initialEventTypes,
  initialDeliverableLabels,
  initialTaskTemplates,
  initialTab = 'members',
}: TeamCrewWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<'members' | 'roster' | 'automation'>(initialTab);
  const [members, setMembers] = useState<StudioMember[]>(initialMembers);
  const [resources, setResources] = useState<Resource[]>(initialResources);
  const [deliverableLabels, setDeliverableLabels] =
    useState<DeliverableLabelTemplate[]>(initialDeliverableLabels);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>(initialTaskTemplates);

  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Add Member modal state
  const [showAddMember, setShowAddMember] = useState(false);
  const [memName, setMemName] = useState('');
  const [memEmail, setMemEmail] = useState('');
  const [memPassword, setMemPassword] = useState('');
  const [memRole, setMemRole] = useState<UserRole>('STAFF');
  const [memIsCrew, setMemIsCrew] = useState(true);
  const [memCrewTitle, setMemCrewTitle] = useState('');

  // Quick inline shoot title editor per member
  const [editingCrewMemberId, setEditingCrewMemberId] = useState<string | null>(null);
  const [editingCrewTitle, setEditingCrewTitle] = useState('');

  // Roster tab: Add Shoot Crew (linked to team member OR freelance)
  const [crewSource, setCrewSource] = useState<'member' | 'freelance'>('member');
  const [selectedCrewUserId, setSelectedCrewUserId] = useState<string>('');
  const [crewSpecialtyInput, setCrewSpecialtyInput] = useState('');
  const [freelanceNameInput, setFreelanceNameInput] = useState('');

  // Roster tab: Add Equipment / Room
  const [gearNameInput, setGearNameInput] = useState('');
  const [gearTypeInput, setGearTypeInput] = useState<ResourceType>('EQUIPMENT');

  // Inline rename resource
  const [editingResourceId, setEditingResourceId] = useState<string | null>(null);
  const [editingResourceName, setEditingResourceName] = useState('');

  // Automation tab state
  const [delTplLabel, setDelTplLabel] = useState('');
  const [delTplEventTypeId, setDelTplEventTypeId] = useState(initialEventTypes[0]?.id || '');
  const [delTplDueDays, setDelTplDueDays] = useState('14');
  const [taskTplTitle, setTaskTplTitle] = useState('');
  const [taskTplRole, setTaskTplRole] = useState('Coordinator');
  const [taskTplEventTypeId, setTaskTplEventTypeId] = useState(initialEventTypes[0]?.id || '');
  const [taskTplOffsetDays, setTaskTplOffsetDays] = useState('-2');

  const isOwner = currentUserRole === 'OWNER';
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

  // Detect unlinked CREW resources that match an existing active Studio Member by name
  const suggestedLinks = useMemo(() => {
    const pairs: Array<{ resource: Resource; member: StudioMember }> = [];
    for (const r of crewResources) {
      if (r.userId) continue;
      const rNorm = normalizeNameForMatch(r.name);
      if (!rNorm) continue;
      const match = members.find((m) => {
        if (!m.isActive) return false;
        const mNorm = normalizeNameForMatch(m.name);
        return Boolean(mNorm) && (rNorm === mNorm || rNorm.startsWith(`${mNorm} `) || mNorm.startsWith(`${rNorm} `));
      });
      if (match) {
        pairs.push({ resource: r, member: match });
      }
    }
    return pairs;
  }, [crewResources, members]);

  const unlinkedActiveMembers = useMemo(
    () =>
      members.filter(
        (m) =>
          m.isActive &&
          !crewResources.some((r) => r.userId === m.id),
      ),
    [members, crewResources],
  );

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-[var(--admin-accent)] focus:bg-white transition-all';

  const replaceMemberInState = (updated: StudioMember) => {
    setMembers((prev) => prev.map((m) => (m.id === updated.id ? updated : m)));
    if (updated.resources) {
      setResources((prev) => {
        const others = prev.filter((r) => !(r.userId === updated.id && r.type === 'CREW'));
        return [...others, ...updated.resources!];
      });
    }
  };

  const handleLinkResourceToMember = (resource: Resource, memberId: string | null) => {
    startTransition(async () => {
      const res = await updateResource(resource.id, { userId: memberId });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to update crew account link.');
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
          `Linked ${updatedMap.size} calendar crew profile${updatedMap.size === 1 ? '' : 's'} to studio team accounts.`,
        );
      } else if (firstError) {
        notify('err', firstError);
      }
    });
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await addAgencyMember({
        name: memName,
        email: memEmail,
        password: memPassword || undefined,
        role: memRole,
        isBookableCrew: memIsCrew,
        crewTitle: memCrewTitle.trim() || undefined,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to add studio member');
        return;
      }
      const createdMember = res.data;
      setMembers((prev) => {
        const exists = prev.some((m) => m.id === createdMember.id);
        return exists
          ? prev.map((m) => (m.id === createdMember.id ? createdMember : m))
          : [...prev, createdMember];
      });
      if (createdMember.resources && createdMember.resources.length > 0) {
        setResources((prev) => {
          const existingIds = new Set(prev.map((r) => r.id));
          const additions = createdMember.resources!.filter((r) => !existingIds.has(r.id));
          return [...prev, ...additions];
        });
      }
      setMemName('');
      setMemEmail('');
      setMemPassword('');
      setMemCrewTitle('');
      setShowAddMember(false);
      notify(
        'ok',
        memIsCrew
          ? `Added ${createdMember.name} (${createdMember.role}) and synced to Shoot Crew Roster.`
          : `Added ${createdMember.name} (${createdMember.role}).`,
      );
    });
  };

  const handleChangeMemberRole = (member: StudioMember, nextRole: UserRole) => {
    if (member.role === nextRole) return;
    startTransition(async () => {
      const res = await updateAgencyMember(member.id, { role: nextRole });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to update member role');
        return;
      }
      replaceMemberInState(res.data);
      notify('ok', `Updated ${res.data.name} to ${res.data.role}.`);
    });
  };

  const handleToggleMemberActive = (member: StudioMember) => {
    startTransition(async () => {
      const res = await updateAgencyMember(member.id, { isActive: !member.isActive });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to update member status');
        return;
      }
      replaceMemberInState(res.data);
      if (!res.data.isActive) {
        setResources((prev) => prev.filter((r) => r.userId !== res.data!.id));
      }
      notify(
        'ok',
        res.data.isActive
          ? `Reactivated ${res.data.name}.`
          : `Suspended ${res.data.name} (removed from active shoot roster).`,
      );
    });
  };

  const handleSaveMemberShootProfile = (member: StudioMember, title: string) => {
    startTransition(async () => {
      const res = await updateAgencyMember(member.id, {
        isBookableCrew: true,
        crewTitle: title.trim() || undefined,
      });
      if (res.ok && res.data) {
        replaceMemberInState(res.data);
        setEditingCrewMemberId(null);
        setEditingCrewTitle('');
        notify('ok', `Enabled ${member.name} on the Shoot Calendar roster.`);
        return;
      }
      // Graceful fallback if PATCH /studio/members/:id isn't loaded yet
      const fallback = await createResource({
        name: formatCrewName(member.name, title),
        type: 'CREW',
        userId: member.id,
      });
      if (!fallback.ok || !fallback.data) {
        notify('err', fallback.message || res.message || 'Failed to enable shoot profile');
        return;
      }
      setResources((prev) => [...prev, fallback.data!]);
      setEditingCrewMemberId(null);
      setEditingCrewTitle('');
      notify('ok', `Enabled ${member.name} on the Shoot Calendar roster.`);
    });
  };

  const handleRemoveMemberFromRoster = (member: StudioMember, linkedResources: Resource[]) => {
    startTransition(async () => {
      for (const r of linkedResources) {
        const res = await archiveResource(r.id);
        if (!res.ok) {
          notify('err', res.message || 'Could not remove from shoot roster.');
          return;
        }
      }
      const linkedIds = new Set(linkedResources.map((r) => r.id));
      setResources((prev) => prev.filter((r) => !linkedIds.has(r.id)));
      notify('ok', `Removed ${member.name} from active Shoot Calendar roster.`);
    });
  };

  const handleAddRosterCrew = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      if (crewSource === 'member') {
        const chosenMember = members.find((m) => m.id === selectedCrewUserId);
        if (!chosenMember) {
          notify('err', 'Select an active studio team member to add to the shoot roster.');
          return;
        }
        const res = await createResource({
          name: formatCrewName(chosenMember.name, crewSpecialtyInput),
          type: 'CREW',
          userId: chosenMember.id,
        });
        if (!res.ok || !res.data) {
          notify('err', res.message || 'Failed to add crew profile');
          return;
        }
        setResources((prev) => [...prev, res.data!]);
        setSelectedCrewUserId('');
        setCrewSpecialtyInput('');
        notify('ok', `Added linked crew profile: ${res.data.name}`);
      } else {
        if (!freelanceNameInput.trim()) return;
        const res = await createResource({
          name: formatCrewName(freelanceNameInput, crewSpecialtyInput),
          type: 'CREW',
        });
        if (!res.ok || !res.data) {
          notify('err', res.message || 'Failed to add freelance crew');
          return;
        }
        setResources((prev) => [...prev, res.data!]);
        setFreelanceNameInput('');
        setCrewSpecialtyInput('');
        notify('ok', `Added freelance crew: ${res.data.name}`);
      }
    });
  };

  const handleAddGearOrRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gearNameInput.trim()) return;
    startTransition(async () => {
      const res = await createResource({
        name: gearNameInput.trim(),
        type: gearTypeInput,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to add equipment or studio room');
        return;
      }
      setResources((prev) => [...prev, res.data!]);
      setGearNameInput('');
      notify('ok', `Added ${res.data.type.toLowerCase()}: ${res.data.name}`);
    });
  };

  const handleSaveResourceRename = (resource: Resource) => {
    if (!editingResourceName.trim()) return;
    startTransition(async () => {
      const res = await updateResource(resource.id, { name: editingResourceName.trim() });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to rename resource');
        return;
      }
      setResources((prev) => prev.map((r) => (r.id === res.data!.id ? res.data! : r)));
      setEditingResourceId(null);
      setEditingResourceName('');
      notify('ok', `Renamed to "${res.data.name}".`);
    });
  };

  const handleArchiveResource = (resource: Resource) => {
    startTransition(async () => {
      const res = await archiveResource(resource.id);
      if (!res.ok) {
        notify('err', res.message || 'Failed to remove item from pool');
        return;
      }
      setResources((prev) => prev.filter((r) => r.id !== resource.id));
      notify('ok', `Archived "${resource.name}" from active shoot pool.`);
    });
  };

  const handleCreateDeliverableLabel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!delTplLabel.trim()) return;
    startTransition(async () => {
      const res = await createDeliverableLabel({
        eventTypeId: delTplEventTypeId || undefined,
        label: delTplLabel.trim(),
        defaultDueDays: Number(delTplDueDays) || 14,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to create deliverable rule');
        return;
      }
      setDeliverableLabels([...deliverableLabels, res.data]);
      setDelTplLabel('');
      notify('ok', `Auto-deliverable "${res.data.label}" added`);
    });
  };

  const handleDisableDeliverableLabel = (id: string) => {
    startTransition(async () => {
      const res = await updateDeliverableLabel(id, { isActive: false });
      if (!res.ok) {
        notify('err', res.message || 'Failed to remove rule');
        return;
      }
      setDeliverableLabels(deliverableLabels.filter((d) => d.id !== id));
      notify('ok', 'Deliverable template removed');
    });
  };

  const handleCreateTaskTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTplTitle.trim() || !taskTplRole.trim()) return;
    startTransition(async () => {
      const res = await createTaskTemplate({
        eventTypeId: taskTplEventTypeId || undefined,
        title: taskTplTitle.trim(),
        roleLabel: taskTplRole.trim(),
        defaultOffsetDays: Number(taskTplOffsetDays) || 0,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to create task template');
        return;
      }
      setTaskTemplates([...taskTemplates, res.data]);
      setTaskTplTitle('');
      notify('ok', `Auto-task "${res.data.title}" added`);
    });
  };

  const handleDisableTaskTemplate = (id: string) => {
    startTransition(async () => {
      const res = await updateTaskTemplate(id, { isActive: false });
      if (!res.ok) {
        notify('err', res.message || 'Failed to remove task template');
        return;
      }
      setTaskTemplates(taskTemplates.filter((t) => t.id !== id));
      notify('ok', 'Task template removed');
    });
  };

  return (
    <div className="space-y-6">
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

      {/* Header + Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="admin-page-title">Team, Shoot Crew &amp; Automation</h1>
          <p className="admin-meta mt-1">
            Team Members manage dashboard logins; linked Shoot Crew profiles prevent double-booking on the calendar and sync to Crew Dispatch.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex flex-wrap rounded-xl border border-slate-200 bg-white p-1 gap-1">
            {[
              { id: 'members' as const, label: `Studio Team (${members.length})` },
              { id: 'roster' as const, label: `Shoot Crew & Gear (${resources.length})` },
              {
                id: 'automation' as const,
                label: `Auto-Rules (${deliverableLabels.length + taskTemplates.length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer tabular-nums',
                  activeTab === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-600 hover:bg-slate-100',
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {activeTab === 'members' && isOwner && (
            <button
              type="button"
              onClick={() => setShowAddMember(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors cursor-pointer"
            >
              <PlusIcon className="w-3.5 h-3.5" />
              <span>Add Team Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Role clarity legend */}
      <div className="atelier-card p-4 grid gap-3 sm:grid-cols-3 text-xs">
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#CAA650]" />
            <span>1. Studio Team (Accounts)</span>
          </p>
          <p className="admin-meta">
            Controls login access &amp; permissions (Owner, Coordinator, Accountant, Staff).
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>2. Shoot Roster &amp; Gear (Calendar)</span>
          </p>
          <p className="admin-meta">
            Locks photographers, freelancers, drones &amp; rooms against overlapping shoots.
          </p>
        </div>
        <div className="space-y-0.5">
          <p className="font-semibold text-slate-900 flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-[#8B6A21]" />
            <span>3. Crew Dispatch (Shoots &amp; Tasks)</span>
          </p>
          <p className="admin-meta">
            Linked staff see their assigned shoot call sheets &amp; post-production tasks under{' '}
            <Link href="/staff" className="font-medium text-[var(--admin-accent)] hover:underline">
              Crew Dispatch ↗
            </Link>
            .
          </p>
        </div>
      </div>

      {/* TAB 1: STUDIO TEAM MEMBERS */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {suggestedLinks.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5 min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  {suggestedLinks.length} unlinked Calendar Crew profile
                  {suggestedLinks.length === 1 ? '' : 's'} match Studio Team accounts
                </p>
                <p className="admin-meta">
                  Link them so shoot reservations in Schedule appear automatically on each crew member&apos;s{' '}
                  <strong>My Shoots &amp; Tasks</strong> view—no duplicate entries.
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={handleLinkAllSuggested}
                className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer disabled:opacity-60"
              >
                Link All {suggestedLinks.length} Matched Crew
              </button>
            </div>
          )}

          <div className="atelier-card p-4 sm:p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
                  <UsersIcon className="w-4 h-4" />
                </span>
                <div>
                  <h2 className="admin-section-title">Studio Team &amp; Shoot Roster Sync</h2>
                  <p className="admin-meta">
                    Enable &ldquo;Shoot Roster&rdquo; on field staff to avoid entering them twice on the calendar.
                  </p>
                </div>
              </div>
              <Link
                href="/admin/crew"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-[var(--admin-accent)] hover:bg-slate-50"
              >
                Open Dedicated Crew &amp; Gear Page →
              </Link>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              {members.map((m) => {
                const linkedCrew = crewResources.filter((r) => r.userId === m.id);
                const suggestedMatch =
                  linkedCrew.length === 0
                    ? suggestedLinks.find((p) => p.member.id === m.id)?.resource
                    : undefined;
                const isSelf = m.id === currentUserId;
                const isEditingCrew = editingCrewMemberId === m.id;

                return (
                  <div
                    key={m.id}
                    className={cn(
                      'rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3 transition-colors',
                      !m.isActive && 'opacity-65',
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              'h-2 w-2 rounded-full shrink-0',
                              m.isActive ? 'bg-emerald-500' : 'bg-rose-400',
                            )}
                            aria-hidden="true"
                          />
                          <p className="admin-row-title line-clamp-1">{m.name}</p>
                          {isSelf && (
                            <span className="text-[11px] font-medium text-[var(--admin-accent)]">(You)</span>
                          )}
                        </div>
                        <p className="admin-meta line-clamp-1 pl-4">{m.email}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {isOwner ? (
                          <select
                            value={m.role}
                            disabled={isPending}
                            onChange={(e) =>
                              handleChangeMemberRole(m, e.target.value as UserRole)
                            }
                            aria-label={`Permission role for ${m.name}`}
                            className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 cursor-pointer"
                          >
                            <option value="OWNER">OWNER</option>
                            <option value="COORDINATOR">COORDINATOR</option>
                            <option value="ACCOUNTANT">ACCOUNTANT</option>
                            <option value="STAFF">STAFF</option>
                          </select>
                        ) : (
                          <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono-code text-[11px] font-semibold text-slate-700">
                            {m.role}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Shoot Calendar Crew Sync Status */}
                    <div className="rounded-lg border border-slate-200/80 bg-white px-3 py-2.5 space-y-2">
                      {linkedCrew.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium text-slate-900 flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span className="truncate">
                                Bookable Crew: {linkedCrew.map((c) => c.name).join(', ')}
                              </span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCrewMemberId(m.id);
                                setEditingCrewTitle(linkedCrew[0]?.name || m.name);
                              }}
                              className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              Edit Title
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleRemoveMemberFromRoster(m, linkedCrew)}
                              className="rounded-md border border-slate-200 px-2 py-0.5 text-[11px] font-medium text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                            >
                              Off Roster
                            </button>
                          </div>
                        </div>
                      ) : suggestedMatch ? (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="admin-meta line-clamp-1">
                            Match in Calendar Pool:{' '}
                            <strong className="text-slate-900">{suggestedMatch.name}</strong>
                          </p>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleLinkResourceToMember(suggestedMatch, m.id)}
                            className="rounded-md bg-[var(--admin-accent)] px-2.5 py-1 text-[11px] font-semibold text-[var(--admin-accent-fg)] hover:opacity-90 cursor-pointer"
                          >
                            Link Profile
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="admin-meta">
                            {m.role === 'ACCOUNTANT'
                              ? 'Finance access only (not bookable on shoots)'
                              : 'Not listed on Shoot Calendar yet'}
                          </span>
                          {m.isActive && (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCrewMemberId(m.id);
                                setEditingCrewTitle('');
                              }}
                              className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                            >
                              + Enable Shoot Crew
                            </button>
                          )}
                        </div>
                      )}

                      {isEditingCrew && (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveMemberShootProfile(m, editingCrewTitle);
                          }}
                          className="flex flex-wrap items-center gap-2 pt-1.5 border-t border-slate-100"
                        >
                          <input
                            value={editingCrewTitle}
                            onChange={(e) => setEditingCrewTitle(e.target.value)}
                            placeholder="Shoot title (e.g. Lead Photographer)"
                            className="flex-1 min-w-[160px] rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs outline-none focus:border-[var(--admin-accent)] focus:bg-white"
                          />
                          <button
                            type="submit"
                            disabled={isPending}
                            className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCrewMemberId(null)}
                            className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-600 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </form>
                      )}
                    </div>

                    {/* Footer row: access hint + open task count + active toggle */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5 text-xs">
                      <span className="admin-meta line-clamp-1">
                        {ROLE_HINTS[m.role]}
                        {typeof m.openAssignmentsCount === 'number' && m.openAssignmentsCount > 0
                          ? ` • ${m.openAssignmentsCount} open task${m.openAssignmentsCount === 1 ? '' : 's'}`
                          : ''}
                      </span>

                      {isOwner && !isSelf && (
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleToggleMemberActive(m)}
                          className={cn(
                            'rounded-md px-2 py-0.5 text-[11px] font-medium border cursor-pointer',
                            m.isActive
                              ? 'border-slate-200 text-slate-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700'
                              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
                          )}
                        >
                          {m.isActive ? 'Deactivate' : 'Reactivate'}
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SHOOT CREW ROSTER & EQUIPMENT */}
      {activeTab === 'roster' && (
        <div className="grid gap-6 lg:grid-cols-2 items-start">
          {/* Card A: Human Shoot Crew (In-House Linked + Freelance) */}
          <div className="atelier-card p-4 sm:p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="admin-section-title">
                Shoot Crew Roster ({crewResources.length})
              </h2>
              <p className="admin-meta mt-0.5">
                Link crew to a Studio Account so shoots sync directly to their{' '}
                <strong>Crew Dispatch</strong> portal, or keep Freelancers without logins.
              </p>
            </div>

            <form
              onSubmit={handleAddRosterCrew}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2.5"
            >
              <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 gap-1">
                <button
                  type="button"
                  onClick={() => setCrewSource('member')}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer',
                    crewSource === 'member'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  From Team Member
                </button>
                <button
                  type="button"
                  onClick={() => setCrewSource('freelance')}
                  className={cn(
                    'rounded-md px-2.5 py-1 text-xs font-medium cursor-pointer',
                    crewSource === 'freelance'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  Freelance / External
                </button>
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                {crewSource === 'member' ? (
                  <select
                    required
                    value={selectedCrewUserId}
                    onChange={(e) => setSelectedCrewUserId(e.target.value)}
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
                    value={freelanceNameInput}
                    onChange={(e) => setFreelanceNameInput(e.target.value)}
                    placeholder="Freelancer full name"
                    className={inputClass}
                  />
                )}
                <input
                  value={crewSpecialtyInput}
                  onChange={(e) => setCrewSpecialtyInput(e.target.value)}
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
                  <span>Add to Shoot Crew</span>
                </button>
              </div>
            </form>

            {crewResources.length === 0 ? (
              <p className="admin-meta py-6 text-center">
                No crew in the calendar roster yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {crewResources.map((r) => {
                  const linkedUser =
                    r.user || (r.userId ? memberById.get(r.userId) : undefined) || null;
                  const isEditing = editingResourceId === r.id;

                  return (
                    <div key={r.id} className="py-3 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                value={editingResourceName}
                                onChange={(e) => setEditingResourceName(e.target.value)}
                                className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs"
                              />
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleSaveResourceRename(r)}
                                className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white cursor-pointer"
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingResourceId(null)}
                                className="text-xs text-slate-500 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <>
                              <p className="admin-row-title line-clamp-1">{r.name}</p>
                              <p className="admin-meta flex items-center gap-1.5">
                                <span
                                  className={cn(
                                    'h-1.5 w-1.5 rounded-full shrink-0',
                                    linkedUser ? 'bg-emerald-500' : 'bg-amber-500',
                                  )}
                                />
                                <span className="truncate">
                                  {linkedUser
                                    ? `Account Linked: ${linkedUser.email} (${linkedUser.role})`
                                    : 'Freelance / No Account Linked'}
                                </span>
                              </p>
                            </>
                          )}
                        </div>

                        {!isEditing && (
                          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
                            {linkedUser ? (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleLinkResourceToMember(r, null)}
                                className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
                              >
                                Unlink
                              </button>
                            ) : (
                              <select
                                defaultValue=""
                                disabled={isPending}
                                onChange={(e) => {
                                  if (e.target.value) {
                                    handleLinkResourceToMember(r, e.target.value);
                                  }
                                }}
                                aria-label={`Link ${r.name} to team member`}
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
                                setEditingResourceId(r.id);
                                setEditingResourceName(r.name);
                              }}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleArchiveResource(r)}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
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

          {/* Card B: Cameras, Drones & Studio Spaces */}
          <div className="atelier-card p-4 sm:p-5 space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="admin-section-title">
                Equipment Kits &amp; Studio Rooms ({gearResources.length})
              </h2>
              <p className="admin-meta mt-0.5">
                Physical gear &amp; studio rooms checked for overlap when scheduling multiple simultaneous weddings.
              </p>
            </div>

            <form
              onSubmit={handleAddGearOrRoom}
              className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 flex flex-wrap gap-2"
            >
              <input
                required
                value={gearNameInput}
                onChange={(e) => setGearNameInput(e.target.value)}
                placeholder="e.g. Sony FX6 + RS4 Kit B / Studio Floor A"
                className="flex-1 min-w-[200px] rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs outline-none focus:border-[var(--admin-accent)]"
              />
              <select
                value={gearTypeInput}
                onChange={(e) => setGearTypeInput(e.target.value as ResourceType)}
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

            {gearResources.length === 0 ? (
              <p className="admin-meta py-6 text-center">
                No camera kits, drones, or studio rooms added yet.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {gearResources.map((r) => {
                  const isEditing = editingResourceId === r.id;
                  return (
                    <div key={r.id} className="py-3 flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div className="flex items-center gap-2">
                            <input
                              value={editingResourceName}
                              onChange={(e) => setEditingResourceName(e.target.value)}
                              className="flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs"
                            />
                            <button
                              type="button"
                              disabled={isPending}
                              onClick={() => handleSaveResourceRename(r)}
                              className="rounded-lg bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white cursor-pointer"
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingResourceId(null)}
                              className="text-xs text-slate-500 cursor-pointer"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <>
                            <p className="admin-row-title line-clamp-1">{r.name}</p>
                            <p className="admin-meta">{r.type}</p>
                          </>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingResourceId(r.id);
                              setEditingResourceName(r.name);
                            }}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-50 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleArchiveResource(r)}
                            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-rose-600 hover:bg-rose-50 cursor-pointer"
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
        </div>
      )}

      {/* TAB 3: AUTO-WORKFLOW RULES */}
      {activeTab === 'automation' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-700 flex items-center gap-2.5">
            <SlidersIcon className="w-4 h-4 text-[var(--admin-accent)] shrink-0" />
            <span>
              <strong>Auto-Provisioning on Confirmation:</strong> When a booking is confirmed,
              matching Deliverables and Crew Tasks below are automatically created for that event category.
            </span>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <div className="atelier-card p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="admin-section-title">
                  Auto-Deliverable Rules ({deliverableLabels.length})
                </h2>
                <p className="admin-meta">
                  Automatically sets target due dates (Event Date + Due Days).
                </p>
              </div>
              <form onSubmit={handleCreateDeliverableLabel} className="grid sm:grid-cols-4 gap-2">
                <input
                  required
                  value={delTplLabel}
                  onChange={(e) => setDelTplLabel(e.target.value)}
                  placeholder="Label (e.g. Edited Gallery)"
                  className={`${inputClass} sm:col-span-2`}
                />
                <select
                  value={delTplEventTypeId}
                  onChange={(e) => setDelTplEventTypeId(e.target.value)}
                  className={inputClass}
                >
                  <option value="">All Categories</option>
                  {initialEventTypes.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min="0"
                  required
                  value={delTplDueDays}
                  onChange={(e) => setDelTplDueDays(e.target.value)}
                  placeholder="Due days"
                  className={`${inputClass} tabular-nums`}
                />
                <div className="sm:col-span-4 flex justify-end">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                  >
                    + Add Deliverable Rule
                  </button>
                </div>
              </form>
              <div className="divide-y divide-slate-100">
                {deliverableLabels.map((lbl) => (
                  <div
                    key={lbl.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="admin-row-title">{lbl.label}</p>
                      <p className="admin-meta tabular-nums">
                        {lbl.eventType?.name || 'All Categories'} • Due +{lbl.defaultDueDays}d
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDisableDeliverableLabel(lbl.id)}
                      className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="atelier-card p-5 space-y-4">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="admin-section-title">
                  Auto-Task Templates ({taskTemplates.length})
                </h2>
                <p className="admin-meta">
                  Negative offset = before event; 0 = shoot day; positive = post-production.
                </p>
              </div>
              <form onSubmit={handleCreateTaskTemplate} className="grid sm:grid-cols-4 gap-2">
                <input
                  required
                  value={taskTplTitle}
                  onChange={(e) => setTaskTplTitle(e.target.value)}
                  placeholder="Task title (e.g. Backup RAW)"
                  className={`${inputClass} sm:col-span-2`}
                />
                <input
                  required
                  value={taskTplRole}
                  onChange={(e) => setTaskTplRole(e.target.value)}
                  placeholder="Role (Editor)"
                  className={inputClass}
                />
                <input
                  type="number"
                  required
                  value={taskTplOffsetDays}
                  onChange={(e) => setTaskTplOffsetDays(e.target.value)}
                  placeholder="Offset"
                  className={`${inputClass} tabular-nums`}
                />
                <select
                  value={taskTplEventTypeId}
                  onChange={(e) => setTaskTplEventTypeId(e.target.value)}
                  className={`${inputClass} sm:col-span-2`}
                >
                  <option value="">All Categories</option>
                  {initialEventTypes.map((et) => (
                    <option key={et.id} value={et.id}>
                      {et.name}
                    </option>
                  ))}
                </select>
                <div className="sm:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={isPending}
                    className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    + Add Task Rule
                  </button>
                </div>
              </form>
              <div className="divide-y divide-slate-100">
                {taskTemplates.map((tpl) => (
                  <div
                    key={tpl.id}
                    className="py-2.5 flex items-center justify-between gap-2 text-xs"
                  >
                    <div>
                      <p className="admin-row-title">
                        {tpl.title}{' '}
                        <span className="font-normal text-slate-500">({tpl.roleLabel})</span>
                      </p>
                      <p className="admin-meta tabular-nums">
                        {tpl.eventType?.name || 'All Categories'} • Offset{' '}
                        {tpl.defaultOffsetDays >= 0
                          ? `+${tpl.defaultOffsetDays}`
                          : tpl.defaultOffsetDays}
                        d
                      </p>
                    </div>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleDisableTaskTemplate(tpl.id)}
                      className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 cursor-pointer"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Team Member Modal (Creates Login + Optional Linked Shoot Profile in 1 step) */}
      {showAddMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="admin-section-title">Add Studio Team Member</h3>
                <p className="admin-meta">Creates login account and optional Shoot Calendar crew profile.</p>
              </div>
              <button
                type="button"
                onClick={() => setShowAddMember(false)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100 cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleAddMember} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Full Name *
                </label>
                <input
                  required
                  value={memName}
                  onChange={(e) => setMemName(e.target.value)}
                  placeholder="e.g. Tariqul Islam"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">
                  Email Address *
                </label>
                <input
                  required
                  type="email"
                  value={memEmail}
                  onChange={(e) => setMemEmail(e.target.value)}
                  placeholder="tariq@studio.com"
                  className={inputClass}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Access Role *
                  </label>
                  <select
                    value={memRole}
                    onChange={(e) => {
                      const next = e.target.value as UserRole;
                      setMemRole(next);
                      setMemIsCrew(next === 'STAFF');
                    }}
                    className={inputClass}
                  >
                    <option value="STAFF">Staff / Crew</option>
                    <option value="COORDINATOR">Coordinator</option>
                    <option value="ACCOUNTANT">Accountant</option>
                    <option value="OWNER">Owner</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Initial Password *
                  </label>
                  <input
                    required
                    minLength={6}
                    type="password"
                    value={memPassword}
                    onChange={(e) => setMemPassword(e.target.value)}
                    placeholder="Min 6 chars"
                    className={inputClass}
                  />
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3 space-y-2">
                <label className="flex items-center gap-2 text-xs font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={memIsCrew}
                    onChange={(e) => setMemIsCrew(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span>Also make bookable as Shoot Crew on Calendar</span>
                </label>
                {memIsCrew && (
                  <input
                    value={memCrewTitle}
                    onChange={(e) => setMemCrewTitle(e.target.value)}
                    placeholder="Shoot specialty (e.g. Lead Photographer, Drone Pilot)"
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs outline-none focus:border-[var(--admin-accent)]"
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddMember(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 cursor-pointer"
                >
                  Add Member
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
