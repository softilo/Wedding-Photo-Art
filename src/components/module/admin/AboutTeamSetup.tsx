'use client';

import React, { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AdminAboutTeamResponse,
  PortfolioMediaItem,
  StudioAboutProfileRecord,
  StudioCareerRoleItem,
  StudioMilestoneItem,
} from '@/types/event-management';
import { listGalleryMedia } from '@/service/catalog/catalog.service';
import {
  resetAboutTeamDefaults,
  saveAboutTeamBulk,
  SaveTeamMemberPayload,
  signTeamUpload,
} from '@/service/studio-content/studio-content.service';
import {
  detectImageFormat,
  measureImageDimensions,
  uploadImageToCloudinary,
} from '@/lib/cloudinaryClientUpload';
import { buildCloudinaryImageUrl } from '@/lib/showcaseMedia';
import { cn } from '@/lib/utils';
import {
  CameraIcon,
  ExternalLinkIcon,
  PlusIcon,
  UsersIcon,
} from '@/components/shared/Icons';
import { StudioGalleryPickerModal } from './StudioGalleryPickerModal';

interface AboutTeamSetupProps {
  initialAboutTeamData: AdminAboutTeamResponse | null;
  galleryPool: PortfolioMediaItem[];
  onGalleryPoolUpdate: (nextPool: PortfolioMediaItem[]) => void;
  studioName: string;
  onNotify: (type: 'ok' | 'err', text: string) => void;
  onAboutTeamDataChange?: (data: AdminAboutTeamResponse) => void;
}

interface EditableTeamMember {
  localKey: string;
  id?: string;
  name: string;
  subtitle: string;
  role: string;
  specialty: string;
  bio: string;
  quote: string;
  phone: string;
  instagram: string;
  location: string;
  isFeatured: boolean;
  imageUrl: string | null;
  imageAssetId: string | null;
  imagePublicId: string | null;
  imageFormat: string | null;
  imageBytes: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  imageVersion: number | null;
  imageResponseSignature: string | null;
  isActive: boolean;
}

interface MemberUploadState {
  progress: number;
  statusText: string;
}

const EMPTY_PROFILE: StudioAboutProfileRecord = {
  storyEyebrow: '',
  storyTitle: '',
  storyLead: '',
  storyBody: '',
  milestones: [],
  careerRoles: [],
};

function normalizeProfileState(profile?: StudioAboutProfileRecord | null): StudioAboutProfileRecord {
  if (!profile) return EMPTY_PROFILE;
  return {
    storyEyebrow: profile.storyEyebrow ?? '',
    storyTitle: profile.storyTitle ?? '',
    storyLead: profile.storyLead ?? '',
    storyBody: profile.storyBody ?? '',
    milestones: Array.isArray(profile.milestones)
      ? profile.milestones.map((m) => ({
          label: m.label ?? '',
          target: Number.isFinite(Number(m.target)) ? Number(m.target) : 0,
          suffix: m.suffix ?? '',
          startFrom: Number.isFinite(Number(m.startFrom)) ? Number(m.startFrom) : 0,
        }))
      : [],
    careerRoles: Array.isArray(profile.careerRoles)
      ? profile.careerRoles.map((r) => ({
          title: r.title ?? '',
          type: r.type ?? '',
          summary: r.summary ?? '',
        }))
      : [],
    servicesSectionEnabled: profile.servicesSectionEnabled,
    updatedAt: profile.updatedAt,
  };
}

function mapResponseToProfile(data: AdminAboutTeamResponse | null): StudioAboutProfileRecord {
  return normalizeProfileState(data?.profile ?? null);
}

function mapResponseToMembers(data: AdminAboutTeamResponse | null): EditableTeamMember[] {
  return (data?.members || []).map((m) => ({
    localKey: m.id,
    id: m.id,
    name: m.name,
    subtitle: m.subtitle ?? '',
    role: m.role,
    specialty: m.specialty,
    bio: m.bio,
    quote: m.quote ?? '',
    phone: m.phone ?? '',
    instagram: m.instagram ?? '',
    location: m.location ?? '',
    isFeatured: m.isFeatured,
    imageUrl: m.imageUrl,
    imageAssetId: m.imageAssetId,
    imagePublicId: m.imagePublicId,
    imageFormat: m.imageFormat,
    imageBytes: m.imageBytes,
    imageWidth: m.imageWidth,
    imageHeight: m.imageHeight,
    imageVersion: null,
    imageResponseSignature: null,
    isActive: m.isActive,
  }));
}

function toSaveMembersPayload(members: EditableTeamMember[]): SaveTeamMemberPayload[] {
  return members.map((m) => ({
    id: m.id,
    name: m.name.trim(),
    subtitle: m.subtitle.trim() || null,
    role: m.role.trim(),
    specialty: m.specialty.trim(),
    bio: m.bio.trim(),
    quote: m.quote.trim() || null,
    phone: m.phone.trim() || null,
    instagram: m.instagram.trim().replace(/^@+/, '') || null,
    location: m.location.trim() || null,
    isFeatured: m.isFeatured,
    imageUrl: m.imageUrl,
    imageAssetId: m.imageAssetId,
    imagePublicId: m.imagePublicId,
    imageFormat: m.imageFormat,
    imageBytes: m.imageBytes,
    imageWidth: m.imageWidth,
    imageHeight: m.imageHeight,
    imageVersion: m.imageVersion,
    imageResponseSignature: m.imageResponseSignature,
    isActive: m.isActive,
  }));
}

export function AboutTeamSetup({
  initialAboutTeamData,
  galleryPool,
  onGalleryPoolUpdate,
  studioName,
  onNotify,
  onAboutTeamDataChange,
}: AboutTeamSetupProps) {
  const [savedData, setSavedData] = useState<AdminAboutTeamResponse | null>(initialAboutTeamData);
  const [profile, setProfile] = useState<StudioAboutProfileRecord>(() =>
    mapResponseToProfile(initialAboutTeamData),
  );
  const [members, setMembers] = useState<EditableTeamMember[]>(() =>
    mapResponseToMembers(initialAboutTeamData),
  );
  const [uploads, setUploads] = useState<Record<string, MemberUploadState>>({});
  const [pickerMemberKey, setPickerMemberKey] = useState<string | null>(null);
  const [gallerySearch, setGallerySearch] = useState('');
  const [landscapeOnly, setLandscapeOnly] = useState(false);
  const [isPending, startTransition] = useTransition();

  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const applyServerSnapshot = (nextData: AdminAboutTeamResponse) => {
    setSavedData(nextData);
    setProfile(mapResponseToProfile(nextData));
    setMembers(mapResponseToMembers(nextData));
    onAboutTeamDataChange?.(nextData);
  };

  const hasUnsavedChanges = useMemo(() => {
    if (!savedData) return false;
    const savedProfile = mapResponseToProfile(savedData);
    const savedMembers = mapResponseToMembers(savedData);
    const profileChanged =
      profile.storyEyebrow.trim() !== savedProfile.storyEyebrow.trim() ||
      profile.storyTitle.trim() !== savedProfile.storyTitle.trim() ||
      profile.storyLead.trim() !== savedProfile.storyLead.trim() ||
      profile.storyBody.trim() !== savedProfile.storyBody.trim() ||
      JSON.stringify(profile.milestones ?? []) !== JSON.stringify(savedProfile.milestones ?? []) ||
      JSON.stringify(profile.careerRoles ?? []) !== JSON.stringify(savedProfile.careerRoles ?? []);
    if (profileChanged) return true;

    return (
      JSON.stringify(toSaveMembersPayload(members)) !==
      JSON.stringify(toSaveMembersPayload(savedMembers))
    );
  }, [members, profile, savedData]);

  const persistAll = async (
    nextProfile: StudioAboutProfileRecord,
    nextMembers: EditableTeamMember[],
    successMessage: string,
  ): Promise<boolean> => {
    if (!nextProfile.storyTitle.trim()) {
      onNotify('err', 'Please provide an About Studio story headline.');
      return false;
    }
    if (nextMembers.length === 0) {
      onNotify('err', 'Add at least one team member card before saving.');
      return false;
    }
    if (nextMembers.some((m) => !m.name.trim())) {
      onNotify('err', 'Please enter a full name for every team member card before saving.');
      return false;
    }

    const milestonesPayload: StudioMilestoneItem[] = (nextProfile.milestones || [])
      .map((m) => ({
        label: m.label.trim(),
        target: Math.max(0, Math.round(Number(m.target) || 0)),
        suffix: m.suffix.trim(),
        startFrom: Math.max(0, Math.round(Number(m.startFrom) || 0)),
      }))
      .filter((m) => m.label.length > 0);

    const careerRolesPayload: StudioCareerRoleItem[] = (nextProfile.careerRoles || [])
      .map((r) => ({
        title: r.title.trim(),
        type: r.type.trim() || 'Full-Time',
        summary: r.summary.trim() || `Role at ${studioName}`,
      }))
      .filter((r) => r.title.length > 0);

    const res = await saveAboutTeamBulk({
      profile: {
        storyEyebrow: nextProfile.storyEyebrow.trim(),
        storyTitle: nextProfile.storyTitle.trim(),
        storyLead: nextProfile.storyLead.trim(),
        storyBody: nextProfile.storyBody.trim(),
        milestones: milestonesPayload,
        careerRoles: careerRolesPayload,
      },
      members: toSaveMembersPayload(nextMembers),
    });

    if (!res.ok || !res.data) {
      onNotify('err', res.message || 'Could not save About & Team details.');
      return false;
    }
    applyServerSnapshot(res.data);
    onNotify('ok', successMessage);
    return true;
  };

  const handleSaveAll = () => {
    startTransition(async () => {
      await persistAll(profile, members, 'About story, stats, careers & team saved to database!');
    });
  };

  const handleAddMember = () => {
    const newMember: EditableTeamMember = {
      localKey: `new-team-${Date.now().toString(36)}`,
      name: '',
      subtitle: '',
      role: '',
      specialty: '',
      bio: '',
      quote: '',
      phone: '',
      instagram: '',
      location: '',
      isFeatured: members.length === 0,
      imageUrl: null,
      imageAssetId: null,
      imagePublicId: null,
      imageFormat: null,
      imageBytes: null,
      imageWidth: null,
      imageHeight: null,
      imageVersion: null,
      imageResponseSignature: null,
      isActive: true,
    };
    setMembers((prev) => [...prev, newMember]);
  };

  const updateMemberField = <K extends keyof EditableTeamMember>(
    localKey: string,
    field: K,
    value: EditableTeamMember[K],
  ) => {
    setMembers((prev) =>
      prev.map((m) => (m.localKey === localKey ? { ...m, [field]: value } : m)),
    );
  };

  const moveMember = (idx: number, delta: -1 | 1) => {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= members.length) return;
    setMembers((prev) => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      if (moved) next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const removeMember = (localKey: string) => {
    const target = members.find((m) => m.localKey === localKey);
    if (!target) return;
    if (!target.id) {
      setMembers((prev) => prev.filter((m) => m.localKey !== localKey));
      return;
    }
    if (members.length <= 1) {
      onNotify('err', 'Keep at least 1 team profile card.');
      return;
    }
    const nextMembers = members.filter((m) => m.localKey !== localKey);
    setMembers(nextMembers);
    startTransition(async () => {
      await persistAll(profile, nextMembers, 'Team member removed from database.');
    });
  };

  const handleUploadPortrait = (localKey: string, file: File) => {
    const { valid, format } = detectImageFormat(file);
    if (!valid) {
      onNotify('err', 'Please select a valid image file (JPG, PNG, WebP, AVIF, or HEIC).');
      return;
    }

    const memberMeta = members.find((m) => m.localKey === localKey);

    void (async () => {
      setUploads((prev) => ({
        ...prev,
        [localKey]: { progress: 12, statusText: 'Signing upload...' },
      }));

      try {
        const [dims, signRes] = await Promise.all([
          measureImageDimensions(file),
          signTeamUpload({ format, bytes: file.size }),
        ]);

        if (!signRes.ok || !signRes.data) {
          onNotify('err', signRes.message || 'Could not authorize portrait upload.');
          return;
        }

        const cld = await uploadImageToCloudinary(file, signRes.data, (pct) => {
          setUploads((prev) => ({
            ...prev,
            [localKey]: { progress: pct, statusText: `${pct}%` },
          }));
        });

        setUploads((prev) => ({
          ...prev,
          [localKey]: { progress: 96, statusText: 'Saving...' },
        }));

        const nextMembers = members.map((m) =>
          m.localKey === localKey
            ? {
                ...m,
                imageUrl: cld.secure_url,
                imageAssetId: cld.asset_id,
                imagePublicId: cld.public_id,
                imageFormat: cld.format || format,
                imageBytes: cld.bytes || file.size,
                imageWidth: cld.width ?? dims.width ?? null,
                imageHeight: cld.height ?? dims.height ?? null,
                imageVersion: cld.version ?? null,
                imageResponseSignature: cld.signature ?? null,
              }
            : m,
        );
        setMembers(nextMembers);
        await persistAll(
          profile,
          nextMembers,
          `Uploaded isolated team portrait for "${memberMeta?.name || 'Team Member'}".`,
        );
      } catch (err) {
        onNotify('err', err instanceof Error ? err.message : 'Portrait upload failed.');
      } finally {
        setUploads((prev) => {
          const next = { ...prev };
          delete next[localKey];
          return next;
        });
      }
    })();
  };

  const handleOpenPicker = (localKey: string) => {
    setPickerMemberKey(localKey);
    startTransition(async () => {
      const res = await listGalleryMedia('IMAGE');
      if (res.ok && res.data) {
        onGalleryPoolUpdate(res.data.data);
      }
    });
  };

  const handlePickFromGallery = (img: PortfolioMediaItem) => {
    if (!pickerMemberKey) return;
    const targetKey = pickerMemberKey;
    const target = members.find((m) => m.localKey === targetKey);
    const nextMembers = members.map((m) =>
      m.localKey === targetKey
        ? {
            ...m,
            imageUrl: img.secureUrl,
            imageAssetId: img.assetId,
            imagePublicId: img.publicId,
            imageFormat: img.format,
            imageBytes: img.bytes,
            imageWidth: img.width ?? null,
            imageHeight: img.height ?? null,
            imageVersion: null,
            imageResponseSignature: null,
          }
        : m,
    );
    setMembers(nextMembers);
    setPickerMemberKey(null);
    startTransition(async () => {
      await persistAll(
        profile,
        nextMembers,
        `Updated portrait for "${target?.name || 'Team Member'}".`,
      );
    });
  };

  const handleClearPortrait = (localKey: string) => {
    const member = members.find((m) => m.localKey === localKey);
    if (!member?.imageUrl) return;
    const nextMembers = members.map((m) =>
      m.localKey === localKey
        ? {
            ...m,
            imageUrl: null,
            imageAssetId: null,
            imagePublicId: null,
            imageFormat: null,
            imageBytes: null,
            imageWidth: null,
            imageHeight: null,
            imageVersion: null,
            imageResponseSignature: null,
          }
        : m,
    );
    setMembers(nextMembers);
    startTransition(async () => {
      await persistAll(
        profile,
        nextMembers,
        `Cleared custom portrait for "${member.name}".`,
      );
    });
  };

  const handleRestoreDefaults = () => {
    startTransition(async () => {
      const res = await resetAboutTeamDefaults();
      if (!res.ok || !res.data) {
        onNotify('err', res.message || 'Could not reset studio story and team defaults.');
        return;
      }
      applyServerSnapshot(res.data);
      onNotify('ok', 'Restored default studio story and team profiles in database.');
    });
  };

  const [mobileSection, setMobileSection] = useState<'team' | 'story'>('team');

  const pickerPublicIds = useMemo(() => {
    const set = new Set<string>();
    const current = members.find((m) => m.localKey === pickerMemberKey);
    if (current?.imagePublicId) set.add(current.imagePublicId);
    return set;
  }, [members, pickerMemberKey]);

  if (!savedData) {
    return (
      <div className="admin-card p-6 sm:p-8 text-center space-y-3">
        <p className="text-sm font-semibold text-rose-600 dark:text-rose-400">
          Could not load About Story &amp; Team records from the database
        </p>
        <p className="text-xs text-[var(--admin-muted)] max-w-md mx-auto">
          To protect your saved studio records, frontend fallback data is disabled. Check that the backend server is reachable and reload.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-xs font-semibold text-[var(--admin-accent-fg)] cursor-pointer"
        >
          Retry Loading from DB
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Clean Action Bar */}
      <div className="admin-card p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-0.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="admin-section-title text-[15px] sm:text-base">
              About Page &amp; Team
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
              <UsersIcon className="w-3 h-3" />
              {members.filter((m) => m.isActive).length} Active
            </span>
            {hasUnsavedChanges && (
              <span className="inline-flex items-center rounded-full bg-amber-500/15 px-2 py-0.5 text-[10.5px] font-semibold text-amber-700 dark:text-amber-300">
                Unsaved edits
              </span>
            )}
          </div>
          <p className="admin-meta">
            Manage your studio story and team member cards shown on <span className="font-mono-code">/about</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 sm:py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors"
          >
            <span>Preview /about</span>
            <ExternalLinkIcon className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={() => {
              setMobileSection('team');
              handleAddMember();
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-accent)]/45 bg-[var(--admin-accent-soft)] px-3 py-1.5 sm:py-2 text-xs font-semibold text-[var(--admin-accent)] hover:opacity-90 transition-opacity cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Member</span>
          </button>

          <button
            type="button"
            disabled={isPending || !hasUnsavedChanges}
            onClick={handleSaveAll}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 sm:py-2 text-xs font-semibold transition-all',
              hasUnsavedChanges
                ? 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)] shadow-xs hover:opacity-95 cursor-pointer'
                : 'border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] text-[var(--admin-muted)] cursor-default',
            )}
          >
            {isPending ? 'Saving...' : hasUnsavedChanges ? 'Save Changes' : 'Saved ✓'}
          </button>
        </div>
      </div>

      {/* Mobile Sub-Tabs so Team Cards & Story don't stack excessively */}
      <div className="lg:hidden grid grid-cols-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-1 gap-1">
        <button
          type="button"
          onClick={() => setMobileSection('team')}
          className={cn(
            'rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer',
            mobileSection === 'team'
              ? 'bg-[var(--admin-surface)] text-[var(--admin-text)] border border-[var(--admin-border)]'
              : 'text-[var(--admin-muted)]',
          )}
        >
          Team Roster ({members.length})
        </button>
        <button
          type="button"
          onClick={() => setMobileSection('story')}
          className={cn(
            'rounded-lg py-1.5 text-xs font-semibold transition-colors cursor-pointer',
            mobileSection === 'story'
              ? 'bg-[var(--admin-surface)] text-[var(--admin-text)] border border-[var(--admin-border)]'
              : 'text-[var(--admin-muted)]',
          )}
        >
          Studio Story
        </button>
      </div>

      {/* Main 12-Col Master Workspace: Left Sticky Story + Right Wide Horizontal Team Cards */}
      <div className="grid gap-4 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Studio Heritage & Story */}
        <aside
          className={cn(
            'lg:col-span-4 lg:sticky lg:top-20 space-y-3',
            mobileSection !== 'story' && 'hidden lg:block',
          )}
        >
          <div className="admin-card p-4 space-y-3.5">
            <div className="flex items-center justify-between border-b border-[var(--admin-border-subtle)] pb-2.5">
              <div>
                <h3 className="admin-section-title">Studio Heritage &amp; Story</h3>
                <p className="text-[11px] text-[var(--admin-muted)]">
                  Shown at the top of /about
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                  Eyebrow Badge
                </label>
                <input
                  type="text"
                  value={profile.storyEyebrow}
                  maxLength={120}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, storyEyebrow: e.target.value }))
                  }
                  placeholder="Studio location & heritage badge"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-2 text-xs sm:text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                  Heritage Headline
                </label>
                <input
                  type="text"
                  value={profile.storyTitle}
                  maxLength={180}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, storyTitle: e.target.value }))
                  }
                  placeholder="Headline for your /about story"
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-2 text-xs sm:text-sm font-semibold text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                  Hero Lead Summary
                </label>
                <textarea
                  rows={3}
                  value={profile.storyLead}
                  maxLength={400}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, storyLead: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-2 text-xs text-[var(--admin-text)] leading-relaxed focus:outline-none focus:border-[var(--admin-accent)]"
                />
              </div>

              <div>
                <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                  Studio Story Paragraph
                </label>
                <textarea
                  rows={5}
                  value={profile.storyBody}
                  maxLength={1500}
                  onChange={(e) =>
                    setProfile((prev) => ({ ...prev, storyBody: e.target.value }))
                  }
                  className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-2 text-xs text-[var(--admin-text)] leading-relaxed focus:outline-none focus:border-[var(--admin-accent)]"
                />
              </div>
            </div>

            {/* DB-backed Studio Counter Milestones */}
            <div className="pt-3 border-t border-[var(--admin-border-subtle)] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--admin-text)]">
                    Counter Milestones
                  </h4>
                  <p className="text-[10.5px] text-[var(--admin-muted)]">
                    Shown on Homepage &amp; /about
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      milestones: [
                        ...(prev.milestones || []),
                        { label: 'Awards', target: 10, suffix: '+', startFrom: 0 },
                      ],
                    }))
                  }
                  className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-1 text-[10.5px] font-semibold text-[var(--admin-accent)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                >
                  + Stat
                </button>
              </div>
              <div className="space-y-1.5">
                {(profile.milestones || []).map((stat, sIdx) => (
                  <div
                    key={sIdx}
                    className="grid grid-cols-[1fr_72px_52px_auto] gap-1.5 items-center"
                  >
                    <input
                      type="text"
                      value={stat.label}
                      maxLength={40}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          milestones: (prev.milestones || []).map((item, i) =>
                            i === sIdx ? { ...item, label: e.target.value } : item,
                          ),
                        }))
                      }
                      placeholder="Label"
                      className="min-w-0 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-2 py-1 text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                    />
                    <input
                      type="number"
                      min={0}
                      value={stat.target}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          milestones: (prev.milestones || []).map((item, i) =>
                            i === sIdx ? { ...item, target: Number(e.target.value) || 0 } : item,
                          ),
                        }))
                      }
                      placeholder="1500"
                      className="min-w-0 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-2 py-1 text-xs font-mono-code text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                    />
                    <input
                      type="text"
                      value={stat.suffix}
                      maxLength={16}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          milestones: (prev.milestones || []).map((item, i) =>
                            i === sIdx ? { ...item, suffix: e.target.value } : item,
                          ),
                        }))
                      }
                      placeholder="+"
                      className="min-w-0 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-2 py-1 text-xs text-center text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setProfile((prev) => ({
                          ...prev,
                          milestones: (prev.milestones || []).filter((_, i) => i !== sIdx),
                        }))
                      }
                      aria-label="Remove stat"
                      className="rounded-lg px-1.5 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* DB-backed Open Career Roles */}
            <div className="pt-3 border-t border-[var(--admin-border-subtle)] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <h4 className="text-xs font-semibold text-[var(--admin-text)]">
                    Career Openings
                  </h4>
                  <p className="text-[10.5px] text-[var(--admin-muted)]">
                    Listed on <span className="font-mono-code">/career</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setProfile((prev) => ({
                      ...prev,
                      careerRoles: [
                        ...(prev.careerRoles || []),
                        { title: '', type: 'Full-Time / Event Crew', summary: '' },
                      ],
                    }))
                  }
                  className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2 py-1 text-[10.5px] font-semibold text-[var(--admin-accent)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                >
                  + Role
                </button>
              </div>
              <div className="space-y-2">
                {(profile.careerRoles || []).map((role, rIdx) => (
                  <div
                    key={rIdx}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-2.5 space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={role.title}
                        maxLength={120}
                        onChange={(e) =>
                          setProfile((prev) => ({
                            ...prev,
                            careerRoles: (prev.careerRoles || []).map((item, i) =>
                              i === rIdx ? { ...item, title: e.target.value } : item,
                            ),
                          }))
                        }
                        placeholder="Role title"
                        className="flex-1 min-w-0 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-2 py-1 text-xs font-semibold text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setProfile((prev) => ({
                            ...prev,
                            careerRoles: (prev.careerRoles || []).filter((_, i) => i !== rIdx),
                          }))
                        }
                        aria-label="Remove career opening"
                        className="rounded-lg px-1.5 py-1 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      value={role.type}
                      maxLength={120}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          careerRoles: (prev.careerRoles || []).map((item, i) =>
                            i === rIdx ? { ...item, type: e.target.value } : item,
                          ),
                        }))
                      }
                      placeholder="Full-Time / Location"
                      className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-2 py-1 text-[11px] text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                    />
                    <textarea
                      rows={2}
                      value={role.summary}
                      maxLength={500}
                      onChange={(e) =>
                        setProfile((prev) => ({
                          ...prev,
                          careerRoles: (prev.careerRoles || []).map((item, i) =>
                            i === rIdx ? { ...item, summary: e.target.value } : item,
                          ),
                        }))
                      }
                      placeholder="Short role responsibilities..."
                      className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-2 py-1 text-[11px] text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-2 border-t border-[var(--admin-border-subtle)] flex items-center justify-between gap-2 text-[11px]">
              <button
                type="button"
                disabled={isPending}
                onClick={handleRestoreDefaults}
                className="text-[var(--admin-muted)] underline hover:text-[var(--admin-text)] cursor-pointer"
              >
                Restore Defaults
              </button>
              <span className="text-[var(--admin-muted)]">
                {hasUnsavedChanges ? 'Click Save Changes above' : 'Up to date'}
              </span>
            </div>
          </div>
        </aside>

        {/* RIGHT COLUMN: Horizontal Team Member Cards */}
        <div
          className={cn(
            'lg:col-span-8 space-y-3',
            mobileSection !== 'team' && 'hidden lg:block',
          )}
        >
          {members.length === 0 ? (
            <div className="admin-card p-8 text-center space-y-3">
              <p className="text-sm font-semibold text-[var(--admin-text)]">
                No team members added yet
              </p>
              <p className="text-xs text-[var(--admin-muted)]">
                Add photographers, cinematographers, or studio leads to showcase on /about.
              </p>
              <button
                type="button"
                onClick={handleAddMember}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-xs font-semibold text-[var(--admin-accent-fg)] cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Add First Member</span>
              </button>
            </div>
          ) : (
            members.map((member, idx) => {
              const thumbUrl = member.imageUrl
                ? member.imageUrl.startsWith('/')
                  ? member.imageUrl
                  : buildCloudinaryImageUrl(member.imageUrl, {
                      width: 480,
                      height: 600,
                      crop: 'fill',
                      quality: 'auto',
                    })
                : null;
              const uploadState = uploads[member.localKey];

              return (
                <div
                  key={member.localKey}
                  className={cn(
                    'admin-card p-3.5 sm:p-4 transition-opacity',
                    !member.isActive && 'opacity-65',
                    member.isFeatured && 'border-[var(--admin-accent)]/55',
                  )}
                >
                  <div className="flex flex-col sm:flex-row gap-3.5 sm:gap-4 items-start">
                    {/* Portrait Rail */}
                    <div className="flex sm:flex-col items-center sm:items-stretch gap-3 sm:gap-2 w-full sm:w-32 shrink-0">
                      <div className="relative h-24 w-20 sm:h-auto sm:w-full sm:aspect-[3/4] shrink-0 rounded-xl overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)]">
                        <input
                          ref={(el) => {
                            fileInputsRef.current[member.localKey] = el;
                          }}
                          type="file"
                          accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadPortrait(member.localKey, f);
                            e.target.value = '';
                          }}
                        />

                        {thumbUrl ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={thumbUrl}
                            alt={member.name || `Team member ${idx + 1}`}
                            className="h-full w-full object-cover object-top"
                          />
                        ) : (
                          <button
                            type="button"
                            onClick={() => fileInputsRef.current[member.localKey]?.click()}
                            className="flex h-full w-full flex-col items-center justify-center p-2 text-center hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
                          >
                            <CameraIcon className="w-5 h-5 text-[var(--admin-muted)] mb-1" />
                            <span className="text-[10.5px] font-medium text-[var(--admin-muted)] leading-tight">
                              Add Photo
                            </span>
                          </button>
                        )}

                        <span className="absolute top-1.5 left-1.5 rounded-full bg-black/75 px-2 py-0.5 text-[10px] font-semibold text-white">
                          #{idx + 1}
                        </span>

                        {uploadState && (
                          <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center text-white text-[11px] gap-1 px-2 text-center">
                            <span className="font-semibold">{uploadState.statusText}</span>
                            <div className="w-full h-1 rounded-full bg-white/20 overflow-hidden">
                              <div
                                className="h-full bg-[#CAA650]"
                                style={{ width: `${uploadState.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="flex flex-wrap sm:grid sm:grid-cols-2 gap-1.5 flex-1 sm:flex-initial">
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => fileInputsRef.current[member.localKey]?.click()}
                          className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] cursor-pointer text-center"
                        >
                          {thumbUrl ? 'Replace' : 'Upload'}
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => handleOpenPicker(member.localKey)}
                          className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--admin-accent)] hover:bg-[var(--admin-surface-hover)] cursor-pointer text-center"
                        >
                          Gallery
                        </button>
                        {member.imageUrl && (
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleClearPortrait(member.localKey)}
                            className="sm:col-span-2 rounded-lg px-2 py-1 text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer text-center"
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Profile Details Column */}
                    <div className="flex-1 min-w-0 w-full space-y-2.5">
                      {/* Card Header Controls */}
                      <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[var(--admin-border-subtle)]">
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setMembers((prev) =>
                                prev.map((m) => ({
                                  ...m,
                                  isFeatured: m.localKey === member.localKey,
                                })),
                              )
                            }
                            className={cn(
                              'rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer',
                              member.isFeatured
                                ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]'
                                : 'border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                            )}
                          >
                            {member.isFeatured ? '★ Highlighted Lead' : 'Set as Lead Profile'}
                          </button>

                          <label className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-2.5 py-1 text-[11px] font-medium text-[var(--admin-text)] cursor-pointer">
                            <input
                              type="checkbox"
                              checked={member.isActive}
                              onChange={(e) =>
                                updateMemberField(member.localKey, 'isActive', e.target.checked)
                              }
                              className="h-3.5 w-3.5 accent-[var(--admin-accent)]"
                            />
                            <span>Visible</span>
                          </label>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => moveMember(idx, -1)}
                            disabled={idx === 0}
                            aria-label="Move member earlier"
                            className="rounded-lg border border-[var(--admin-border)] p-1.5 text-[var(--admin-muted)] hover:text-[var(--admin-text)] disabled:opacity-35 cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="18 15 12 9 6 15" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={() => moveMember(idx, 1)}
                            disabled={idx === members.length - 1}
                            aria-label="Move member later"
                            className="rounded-lg border border-[var(--admin-border)] p-1.5 text-[var(--admin-muted)] hover:text-[var(--admin-text)] disabled:opacity-35 cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <polyline points="6 9 12 15 18 9" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => removeMember(member.localKey)}
                            className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Balanced 2-Col Input Grid */}
                      <div className="grid gap-2.5 sm:grid-cols-2">
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                            Full Name
                          </label>
                          <input
                            type="text"
                            value={member.name}
                            maxLength={120}
                            onChange={(e) =>
                              updateMemberField(member.localKey, 'name', e.target.value)
                            }
                            placeholder="Full Name"
                            className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                            Role / Title
                          </label>
                          <input
                            type="text"
                            value={member.role}
                            maxLength={120}
                            onChange={(e) =>
                              updateMemberField(member.localKey, 'role', e.target.value)
                            }
                            placeholder="e.g. Lead Photographer"
                            className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-1.5 text-xs sm:text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                            Specialty / Focus
                          </label>
                          <input
                            type="text"
                            value={member.specialty}
                            maxLength={180}
                            onChange={(e) =>
                              updateMemberField(member.localKey, 'specialty', e.target.value)
                            }
                            placeholder="Candid Storytelling & Color"
                            className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-1.5 text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                            Native Subtitle (Optional)
                          </label>
                          <input
                            type="text"
                            value={member.subtitle}
                            maxLength={120}
                            onChange={(e) =>
                              updateMemberField(member.localKey, 'subtitle', e.target.value)
                            }
                            placeholder="Optional tagline"
                            className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-1.5 text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                          Short Bio
                        </label>
                        <textarea
                          rows={2}
                          value={member.bio}
                          maxLength={600}
                          onChange={(e) =>
                            updateMemberField(member.localKey, 'bio', e.target.value)
                          }
                          placeholder="Short team bio & experience..."
                          className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-1.5 text-xs text-[var(--admin-text)] leading-relaxed focus:outline-none focus:border-[var(--admin-accent)]"
                        />
                      </div>

                      {member.isFeatured && (
                        <div className="rounded-xl border border-[var(--admin-accent)]/35 bg-[var(--admin-accent-soft)]/50 p-3 space-y-2.5">
                          <p className="text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-accent)]">
                            Lead Card Contact &amp; Quote
                          </p>
                          <div className="grid gap-2 sm:grid-cols-3">
                            <input
                              type="text"
                              value={member.phone}
                              maxLength={40}
                              onChange={(e) =>
                                updateMemberField(member.localKey, 'phone', e.target.value)
                              }
                              placeholder="Phone (+880...)"
                              className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-2.5 py-1.5 text-xs font-mono-code text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                            />
                            <input
                              type="text"
                              value={member.instagram}
                              maxLength={80}
                              onChange={(e) =>
                                updateMemberField(member.localKey, 'instagram', e.target.value)
                              }
                              placeholder="Instagram handle"
                              className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-2.5 py-1.5 text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                            />
                            <input
                              type="text"
                              value={member.location}
                              maxLength={100}
                              onChange={(e) =>
                                updateMemberField(member.localKey, 'location', e.target.value)
                              }
                              placeholder="City / Location"
                              className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-2.5 py-1.5 text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                            />
                          </div>
                          <textarea
                            rows={2}
                            value={member.quote}
                            maxLength={320}
                            onChange={(e) =>
                              updateMemberField(member.localKey, 'quote', e.target.value)
                            }
                            placeholder="Signature quote shown on highlighted Lead card..."
                            className="w-full rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-1.5 text-xs italic text-[var(--admin-text)] leading-relaxed focus:outline-none focus:border-[var(--admin-accent)]"
                          />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <StudioGalleryPickerModal
        open={pickerMemberKey !== null}
        onClose={() => setPickerMemberKey(null)}
        title="Pick Existing Gallery Photo"
        subtitle="Optionally select an existing gallery image (prefer Upload Portrait above for isolated team portraits)."
        actionLabel="Use Portrait"
        activeLabel="Current"
        galleryImages={galleryPool}
        activePublicIds={pickerPublicIds}
        searchQuery={gallerySearch}
        onSearchChange={setGallerySearch}
        landscapeOnly={landscapeOnly}
        onLandscapeOnlyChange={setLandscapeOnly}
        isBusy={isPending}
        onPickImage={handlePickFromGallery}
      />
    </div>
  );
}
