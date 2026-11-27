'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import {
  DeliverableLabelTemplate,
  EventType,
  StudioPackage,
  StudioSettings,
  TaskTemplate,
  UserRole,
} from '@/types/event-management';
import {
  addAgencyMember,
  updateAgencyBranding,
} from '@/service/agency/agency.service';
import {
  createDeliverableLabel,
  createEventType,
  createTaskTemplate,
  updateDeliverableLabel,
  updatePackage,
  updateTaskTemplate,
} from '@/service/catalog/catalog.service';
import { cn, formatPoisha } from '@/lib/utils';
import { CameraIcon, PaletteIcon, PlusIcon, SlidersIcon, UsersIcon } from '@/components/shared/Icons';

export type StudioSetupSection = 'catalog' | 'team' | 'settings';

interface CatalogWorkspaceProps {
  section?: StudioSetupSection;
  initialSettings: StudioSettings | null;
  initialPackages: StudioPackage[];
  initialEventTypes: EventType[];
  initialMembers: Array<{
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isActive: boolean;
  }>;
  initialDeliverableLabels?: DeliverableLabelTemplate[];
  initialTaskTemplates?: TaskTemplate[];
}

export function CatalogWorkspace({
  section = 'catalog',
  initialSettings,
  initialPackages,
  initialEventTypes,
  initialMembers,
  initialDeliverableLabels = [],
  initialTaskTemplates = [],
}: CatalogWorkspaceProps) {
  const [settings, setSettings] = useState<StudioSettings | null>(initialSettings);
  const [packages, setPackages] = useState<StudioPackage[]>(initialPackages);
  const [eventTypes, setEventTypes] = useState<EventType[]>(initialEventTypes);
  const [members, setMembers] = useState(initialMembers);
  const [deliverableLabels, setDeliverableLabels] =
    useState<DeliverableLabelTemplate[]>(initialDeliverableLabels);
  const [taskTemplates, setTaskTemplates] = useState<TaskTemplate[]>(initialTaskTemplates);

  // Sub-tabs for Team & Rules
  const [teamTab, setTeamTab] = useState<'members' | 'automation'>('members');

  // Modals for clean creation
  const [showAddMember, setShowAddMember] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // Branding state
  const [brandName, setBrandName] = useState(initialSettings?.displayName || '');
  const [logoUrl, setLogoUrl] = useState(initialSettings?.logoUrl || '');
  const [primaryColor, setPrimaryColor] = useState(
    initialSettings?.themeTokens?.primaryColor || '#181611',
  );
  const [accentColor, setAccentColor] = useState(
    initialSettings?.themeTokens?.accentColor || '#8B6A21',
  );
  const [timezone, setTimezone] = useState(initialSettings?.timezone || 'Asia/Dhaka');
  const [advancePolicyType, setAdvancePolicyType] = useState<'NONE' | 'PERCENTAGE' | 'FIXED'>(
    initialSettings?.advancePolicyType || 'PERCENTAGE',
  );
  const [advancePolicyValue, setAdvancePolicyValue] = useState(
    String(initialSettings?.advancePolicyValue ?? 20),
  );

  // Team member creation state
  const [memName, setMemName] = useState('');
  const [memEmail, setMemEmail] = useState('');
  const [memPassword, setMemPassword] = useState('');
  const [memRole, setMemRole] = useState<UserRole>('STAFF');

  // Automation rules state
  const [etName, setEtName] = useState('');
  const [etDesc, setEtDesc] = useState('');
  const [delTplLabel, setDelTplLabel] = useState('');
  const [delTplEventTypeId, setDelTplEventTypeId] = useState(initialEventTypes[0]?.id || '');
  const [delTplDueDays, setDelTplDueDays] = useState('14');
  const [taskTplTitle, setTaskTplTitle] = useState('');
  const [taskTplRole, setTaskTplRole] = useState('Coordinator');
  const [taskTplEventTypeId, setTaskTplEventTypeId] = useState(initialEventTypes[0]?.id || '');
  const [taskTplOffsetDays, setTaskTplOffsetDays] = useState('-2');

  const notify = (type: 'ok' | 'err', text: string) => setFeedback({ type, text });

  const handleSaveBranding = (e: React.FormEvent) => {
    e.preventDefault();
    startTransition(async () => {
      const res = await updateAgencyBranding({
        name: brandName,
        logoUrl: logoUrl || null,
        themeTokens: {
          primaryColor,
          accentColor,
        },
        timezone,
        advancePolicyType,
        advancePolicyValue: Number(advancePolicyValue) || 0,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to update branding (Owner access required)');
        return;
      }
      setSettings(res.data);
      notify('ok', 'Studio branding & advance deposit policy saved.');
    });
  };

  const handleTogglePublish = (pkg: StudioPackage) => {
    startTransition(async () => {
      const res = await updatePackage(pkg.id, { isPublished: !pkg.isPublished });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to update package');
        return;
      }
      setPackages(packages.map((p) => (p.id === pkg.id ? res.data! : p)));
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
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to add member');
        return;
      }
      setMembers([
        ...members,
        {
          id: res.data.id,
          email: res.data.email,
          name: res.data.name,
          role: res.data.role,
          isActive: res.data.isActive,
        },
      ]);
      setMemName('');
      setMemEmail('');
      setMemPassword('');
      setShowAddMember(false);
      notify('ok', `Added ${res.data.name} (${res.data.role})`);
    });
  };

  const handleCreateEventType = (e: React.FormEvent) => {
    e.preventDefault();
    if (!etName.trim()) return;
    startTransition(async () => {
      const res = await createEventType({
        name: etName.trim(),
        description: etDesc.trim() || undefined,
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to add event type');
        return;
      }
      setEventTypes([...eventTypes, res.data]);
      setEtName('');
      setEtDesc('');
      notify('ok', `Event type "${res.data.name}" added`);
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

  const currency = settings?.currency || 'BDT';
  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50/70 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/15 transition-all';

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

      {/* =====================================================================
          ROUTE 1: /admin/catalog — SERVICE PACKAGES & EVENT CATEGORIES
      ===================================================================== */}
      {section === 'catalog' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="admin-page-title">
                Service Packages
              </h1>
              <p className="admin-meta mt-1">
                Configure service packages and event categories. Manage public galleries under Public
                Showcase.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/admin/catalog/new"
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-accent-fg)] shadow-xs hover:opacity-95 transition-opacity"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>New Package</span>
              </Link>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-12">
              <div className="lg:col-span-8 admin-card p-5 sm:p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--admin-border-subtle)] pb-3">
                  <div>
                    <h2 className="admin-section-title">Service Packages</h2>
                    <p className="text-xs text-[var(--admin-muted)]">
                      Published packages appear on your public website and inside Quote presets.
                    </p>
                  </div>
                </div>

                {packages.length === 0 ? (
                  <p className="text-sm text-[var(--admin-muted)] py-8 text-center">
                    No packages yet. Click &ldquo;New Package&rdquo; to create your first offering.
                  </p>
                ) : (
                  <div className="divide-y divide-[var(--admin-border-subtle)]">
                    {packages.map((pkg) => {
                      const thumbUrl = pkg.coverDeliveryUrls?.thumbnailUrl || pkg.coverImageUrl;
                      return (
                        <div
                          key={pkg.id}
                          className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                        >
                          <div className="flex items-start gap-3 min-w-0">
                            <div className="relative h-14 w-20 shrink-0 overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] flex items-center justify-center">
                              {thumbUrl ? (
                                /* eslint-disable-next-line @next/next/no-img-element */
                                <img
                                  src={thumbUrl}
                                  alt={pkg.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <CameraIcon className="w-4 h-4 text-[var(--admin-muted)]" />
                              )}
                            </div>

                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-sm text-[var(--admin-text)] truncate">
                                  {pkg.name}
                                </p>
                                {pkg.eventType && (
                                  <span className="rounded-md bg-[var(--admin-accent-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--admin-accent)]">
                                    {pkg.eventType.name}
                                  </span>
                                )}
                                {pkg.items && pkg.items.length > 0 && (
                                  <span className="rounded-md border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-2 py-0.5 text-[11px] font-medium text-[var(--admin-muted)]">
                                    {pkg.items.length} item{pkg.items.length === 1 ? '' : 's'}
                                  </span>
                                )}
                              </div>
                              <p className="font-mono-code text-xs text-[var(--admin-muted)] font-medium mt-0.5 tabular-nums line-clamp-1">
                                {formatPoisha(pkg.basePricePoisha, currency)}
                                {pkg.description ? ` • ${pkg.description}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                            <Link
                              href={`/admin/catalog/${pkg.id}`}
                              className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors"
                            >
                              Edit
                            </Link>
                            <button
                              type="button"
                              onClick={() => handleTogglePublish(pkg)}
                              className={cn(
                                'rounded-full px-3 py-1 text-xs font-semibold border transition-colors cursor-pointer',
                                pkg.isPublished
                                  ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/35 hover:bg-emerald-500/20'
                                  : 'bg-[var(--admin-surface-subtle)] text-[var(--admin-muted)] border-[var(--admin-border)] hover:text-[var(--admin-text)]',
                              )}
                            >
                              {pkg.isPublished ? 'Published' : 'Draft'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Event Types Side Card */}
              <div className="lg:col-span-4 admin-card p-5 sm:p-6 space-y-4">
                <div className="border-b border-[var(--admin-border-subtle)] pb-3">
                  <h2 className="admin-section-title">
                    Event Categories ({eventTypes.length})
                  </h2>
                  <p className="text-xs text-[var(--admin-muted)]">
                    Used to group packages and trigger event-specific workflows.
                  </p>
                </div>
                <form onSubmit={handleCreateEventType} className="space-y-2.5">
                  <input
                    required
                    value={etName}
                    onChange={(e) => setEtName(e.target.value)}
                    placeholder="Category name (e.g. Wedding, Corporate)"
                    className={inputClass}
                  />
                  <input
                    value={etDesc}
                    onChange={(e) => setEtDesc(e.target.value)}
                    placeholder="Short description (optional)"
                    className={inputClass}
                  />
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 cursor-pointer"
                  >
                    + Add Category
                  </button>
                </form>
                <div className="flex flex-wrap gap-2 pt-1">
                  {eventTypes.map((et) => (
                    <div
                      key={et.id}
                      className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 py-1.5 text-xs"
                    >
                      <span className="font-semibold text-[var(--admin-text)]">{et.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        </>
      )}

      {/* =====================================================================
          ROUTE 2: /admin/team — TEAM MEMBERS & WORKFLOW AUTOMATION
      ===================================================================== */}
      {section === 'team' && (
        <>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="admin-page-title">
                Team &amp; Automation
              </h1>
              <p className="admin-meta mt-1">
                Manage studio staff accounts and automatic post-confirmation deliverables &amp; tasks.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <div className="inline-flex rounded-xl border border-border/60 bg-card p-1 gap-1">
                <button
                  type="button"
                  onClick={() => setTeamTab('members')}
                  className={cn(
                    'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors',
                    teamTab === 'members'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  Team Members ({members.length})
                </button>
                <button
                  type="button"
                  onClick={() => setTeamTab('automation')}
                  className={cn(
                    'rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-colors',
                    teamTab === 'automation'
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  Auto-Workflow Rules ({deliverableLabels.length + taskTemplates.length})
                </button>
              </div>

              {teamTab === 'members' && (
                <button
                  type="button"
                  onClick={() => setShowAddMember(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  <span>Add Member</span>
                </button>
              )}
            </div>
          </div>

          {teamTab === 'members' && (
            <div className="atelier-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <UsersIcon className="w-4 h-4" />
                  </span>
                  <div>
                    <h2 className="text-base font-bold text-slate-900">Studio Staff &amp; Roles</h2>
                    <p className="text-xs text-slate-500">
                      Owners manage all settings; Accountants verify payments; Staff view assigned tasks.
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-sm text-slate-900 truncate">{m.name}</p>
                      <p className="text-xs text-slate-500 truncate">{m.email}</p>
                    </div>
                    <span className="rounded-full bg-white border border-slate-200 px-2.5 py-1 font-mono-code text-[11px] font-bold text-indigo-700 shrink-0">
                      {m.role}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {teamTab === 'automation' && (
            <div className="space-y-5">
              <div className="rounded-xl border border-indigo-200 bg-indigo-50/70 px-4 py-3 text-xs text-indigo-950 flex items-center gap-2.5">
                <SlidersIcon className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  <strong>Auto-Provisioning on Confirmation:</strong> When a booking is confirmed,
                  matching Deliverables and Crew Tasks below are automatically created for that
                  event category.
                </span>
              </div>

              <div className="grid gap-6 lg:grid-cols-2">
                {/* Deliverable Rules */}
                <div className="atelier-card p-6 space-y-4">
                  <div className="border-b border-border/60 pb-3">
                    <h2 className="text-base font-bold text-slate-900">
                      Auto-Deliverable Rules ({deliverableLabels.length})
                    </h2>
                    <p className="text-xs text-slate-500">
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
                      {eventTypes.map((et) => (
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
                      className={`${inputClass} font-mono-code`}
                    />
                    <div className="sm:col-span-4 flex justify-end">
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
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
                          <p className="font-semibold text-slate-900">{lbl.label}</p>
                          <p className="text-slate-500">
                            {lbl.eventType?.name || 'All Categories'} • Due +{lbl.defaultDueDays}d
                          </p>
                        </div>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleDisableDeliverableLabel(lbl.id)}
                          className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Task Templates */}
                <div className="atelier-card p-6 space-y-4">
                  <div className="border-b border-border/60 pb-3">
                    <h2 className="text-base font-bold text-slate-900">
                      Auto-Task Templates ({taskTemplates.length})
                    </h2>
                    <p className="text-xs text-slate-500">
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
                      className={`${inputClass} font-mono-code`}
                    />
                    <select
                      value={taskTplEventTypeId}
                      onChange={(e) => setTaskTplEventTypeId(e.target.value)}
                      className={`${inputClass} sm:col-span-2`}
                    >
                      <option value="">All Categories</option>
                      {eventTypes.map((et) => (
                        <option key={et.id} value={et.id}>
                          {et.name}
                        </option>
                      ))}
                    </select>
                    <div className="sm:col-span-2 flex justify-end">
                      <button
                        type="submit"
                        disabled={isPending}
                        className="rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
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
                          <p className="font-semibold text-slate-900">
                            {tpl.title}{' '}
                            <span className="font-normal text-slate-500">({tpl.roleLabel})</span>
                          </p>
                          <p className="text-slate-500">
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
                          className="rounded-lg border border-rose-200 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50"
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

          {/* Add Team Member Modal */}
          {showAddMember && (
            <div className="fixed inset-0 z-50 flex flex-col sm:flex-row sm:items-center sm:justify-center bg-white sm:bg-slate-900/50 p-0 sm:p-4 sm:backdrop-blur-xs admin-sheet-fade">
              <div className="flex-1 sm:flex-initial w-full sm:max-w-md h-dvh sm:h-auto sm:max-h-[90dvh] rounded-none sm:rounded-2xl border-0 sm:border border-border/60 bg-card p-4 sm:p-6 pt-[calc(1rem+env(safe-area-inset-top))] sm:pt-6 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:pb-6 overflow-y-auto shadow-none sm:shadow-xl space-y-4">
                <div className="flex items-center justify-between border-b border-border/60 pb-3">
                  <h3 className="text-base font-bold text-slate-900">Add Studio Team Member</h3>
                  <button
                    type="button"
                    onClick={() => setShowAddMember(false)}
                    className="rounded-lg px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-100"
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
                      placeholder="e.g. Tanvir Ahmed"
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
                      placeholder="tanvir@studio.com"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Role *
                      </label>
                      <select
                        value={memRole}
                        onChange={(e) => setMemRole(e.target.value as UserRole)}
                        className={inputClass}
                      >
                        <option value="COORDINATOR">Coordinator</option>
                        <option value="ACCOUNTANT">Accountant</option>
                        <option value="STAFF">Staff / Crew</option>
                        <option value="OWNER">Owner</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">
                        Initial Password
                      </label>
                      <input
                        type="password"
                        value={memPassword}
                        onChange={(e) => setMemPassword(e.target.value)}
                        placeholder="Min 6 chars"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMember(false)}
                      className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isPending}
                      className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700"
                    >
                      Add Member
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </>
      )}

      {/* =====================================================================
          ROUTE 3: /admin/settings — BRANDING & BOOKING RULES
      ===================================================================== */}
      {section === 'settings' && (
        <>
          <div>
            <h1 className="admin-page-title">
              Branding &amp; Booking Rules
            </h1>
            <p className="admin-meta mt-1">
              Configure your white-label studio identity, theme colors, timezone, and advance deposit requirements.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-start">
            <form
              onSubmit={handleSaveBranding}
              className="lg:col-span-7 atelier-card p-6 space-y-5"
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Studio Identity &amp; Operational Policy
                  </h2>
                  <p className="text-xs text-slate-500">
                    Editable by Studio Owners. Public storefront updates immediately.
                  </p>
                </div>
                <PaletteIcon className="w-5 h-5 text-indigo-600" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Studio Display Name
                  </label>
                  <input
                    value={brandName}
                    onChange={(e) => setBrandName(e.target.value)}
                    className={inputClass}
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Logo URL (optional)
                  </label>
                  <input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://cdn.example.com/logo.png"
                    className={inputClass}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Primary Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="h-9 w-10 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <input
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className={`${inputClass} font-mono-code text-xs`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="h-9 w-10 rounded-lg border border-slate-200 cursor-pointer"
                    />
                    <input
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className={`${inputClass} font-mono-code text-xs`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Agency Timezone
                  </label>
                  <input
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className={`${inputClass} font-mono-code text-xs`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">
                    Required Advance Deposit Policy
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={advancePolicyType}
                      onChange={(e) =>
                        setAdvancePolicyType(e.target.value as 'NONE' | 'PERCENTAGE' | 'FIXED')
                      }
                      className="rounded-xl border border-slate-200 bg-slate-50/70 px-2.5 py-2 text-xs font-semibold"
                    >
                      <option value="PERCENTAGE">Percentage (%)</option>
                      <option value="FIXED">Fixed ({currency})</option>
                      <option value="NONE">No Advance Required</option>
                    </select>
                    {advancePolicyType !== 'NONE' && (
                      <input
                        type="number"
                        min="0"
                        value={advancePolicyValue}
                        onChange={(e) => setAdvancePolicyValue(e.target.value)}
                        className={`${inputClass} font-mono-code text-xs`}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  Save Branding &amp; Rules
                </button>
              </div>
            </form>

            {/* Live Brand Preview Card */}
            <div className="lg:col-span-5 atelier-card p-6 space-y-4">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Live Storefront Preview
              </p>
              <div
                className="rounded-2xl p-6 text-white space-y-4 shadow-sm"
                style={{ backgroundColor: primaryColor || '#181611' }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold tracking-tight">
                    {brandName || 'Wedding PhotoArt'}
                  </span>
                  <span className="rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-mono-code">
                    {timezone}
                  </span>
                </div>
                <p className="text-xs text-white/80 leading-relaxed">
                  Single-tenant white-label photography &amp; event management storefront.
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span
                    className="rounded-xl px-4 py-2 text-xs font-semibold text-white shadow-xs"
                    style={{ backgroundColor: accentColor || '#8B6A21' }}
                  >
                    Request a Quote →
                  </span>
                  <span className="text-[11px] font-mono-code text-white/75">
                    Advance:{' '}
                    {advancePolicyType === 'NONE'
                      ? '0%'
                      : advancePolicyType === 'PERCENTAGE'
                        ? `${advancePolicyValue}%`
                        : `${advancePolicyValue} ${currency}`}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
