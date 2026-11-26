'use client';

import React, { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AdminAboutTeamResponse,
  PortfolioMediaItem,
  StudioAboutProfileRecord,
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

function mapResponseToProfile(
  data: AdminAboutTeamResponse | null,
  studioName: string,
): StudioAboutProfileRecord {
  return (
    data?.profile ?? {
      storyEyebrow: 'Est. 2015 • Feni, Bangladesh',
      storyTitle: 'Crafting Heirloom Wedding Stories Across Bangladesh',
      storyLead: `${studioName} is a collective of dedicated photographers, cinematographers, and visual editors.`,
      storyBody:
        'Share your studio story, craft philosophy, and creative vision for couples exploring your About page.',
    }
  );
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
    mapResponseToProfile(initialAboutTeamData, studioName),
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
    setProfile(mapResponseToProfile(nextData, studioName));
    setMembers(mapResponseToMembers(nextData));
    onAboutTeamDataChange?.(nextData);
  };

  const hasUnsavedChanges = useMemo(() => {
    const savedProfile = mapResponseToProfile(savedData, studioName);
    const savedMembers = mapResponseToMembers(savedData);
    const profileChanged =
      profile.storyEyebrow.trim() !== savedProfile.storyEyebrow.trim() ||
      profile.storyTitle.trim() !== savedProfile.storyTitle.trim() ||
      profile.storyLead.trim() !== savedProfile.storyLead.trim() ||
      profile.storyBody.trim() !== savedProfile.storyBody.trim();
    if (profileChanged) return true;

    return (
      JSON.stringify(toSaveMembersPayload(members)) !==
      JSON.stringify(toSaveMembersPayload(savedMembers))
    );
  }, [members, profile, savedData, studioName]);

  const persistAll = async (
    nextProfile: StudioAboutProfileRecord,
    nextMembers: EditableTeamMember[],
    successMessage: string,
  ): Promise<boolean> => {
    if (!nextProfile.storyTitle.trim()) {
      onNotify('err', 'Please provide an About Studio story headline.');
      return false;
    }
    const valid = nextMembers.filter((m) => m.name.trim().length > 0);
    if (valid.length === 0) {
      onNotify('err', 'Add at least one team member name before saving.');
      return false;
    }

    const res = await saveAboutTeamBulk({
      profile: {
        storyEyebrow: nextProfile.storyEyebrow.trim(),
        storyTitle: nextProfile.storyTitle.trim(),
        storyLead: nextProfile.storyLead.trim(),
        storyBody: nextProfile.storyBody.trim(),
      },
      members: toSaveMembersPayload(valid),
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
      await persistAll(profile, members, 'About story & team details saved to database!');
    });
  };

  const handleAddMember = () => {
    const newMember: EditableTeamMember = {
      localKey: `new-team-${Date.now().toString(36)}`,
      name: 'New Team Member',
      subtitle: '',
      role: 'Photographer / Cinematographer',
      specialty: 'Wedding & Event Storytelling',
      bio: `Part of the in-house ${studioName} crew crafting natural-light frames and expressive wedding stories.`,
      quote: '',
      phone: '',
      instagram: '',
      location: '',
      isFeatured: false,
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

  const pickerPublicIds = useMemo(() => {
    const set = new Set<string>();
    const current = members.find((m) => m.localKey === pickerMemberKey);
    if (current?.imagePublicId) set.add(current.imagePublicId);
    return set;
  }, [members, pickerMemberKey]);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="admin-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-[var(--admin-text)]">
              About Page Story &amp; Team (Stored in DB • Isolated from Portfolio)
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
              <UsersIcon className="w-3 h-3" />
              {members.filter((m) => m.isActive).length} Active Members
            </span>
          </div>
          <p className="text-xs text-[var(--admin-muted)]">
            Team portraits upload directly into your isolated{' '}
            <span className="font-mono-code text-[var(--admin-text)]">/team</span> folder and
            never showcase in Client Portfolios or Gallery.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/about"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors"
          >
            <span>View /about Page</span>
            <ExternalLinkIcon className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            onClick={handleAddMember}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-accent)]/45 bg-[var(--admin-accent-soft)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-accent)] hover:opacity-90 transition-opacity cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Team Member</span>
          </button>

          <button
            type="button"
            disabled={isPending}
            onClick={handleSaveAll}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-semibold transition-opacity cursor-pointer',
              hasUnsavedChanges
                ? 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)] shadow-xs hover:opacity-95'
                : 'border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] text-[var(--admin-muted)]',
            )}
          >
            {isPending ? 'Saving...' : hasUnsavedChanges ? 'Save About & Team' : 'Saved ✓'}
          </button>
        </div>
      </div>

      {/* Studio Story Form */}
      <div className="admin-card p-5 space-y-4">
        <h3 className="text-sm font-semibold text-[var(--admin-text)]">
          Studio Heritage &amp; Story
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
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
              className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-2 text-xs text-[var(--admin-text)] leading-relaxed focus:outline-none focus:border-[var(--admin-accent)] resize-none"
            />
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
              Studio Story Paragraph
            </label>
            <textarea
              rows={3}
              value={profile.storyBody}
              maxLength={1500}
              onChange={(e) =>
                setProfile((prev) => ({ ...prev, storyBody: e.target.value }))
              }
              className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-2 text-xs text-[var(--admin-text)] leading-relaxed focus:outline-none focus:border-[var(--admin-accent)] resize-none"
            />
          </div>
        </div>
      </div>

      {/* Team Member Profile Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {members.map((member, idx) => {
          const thumbUrl = member.imageUrl
            ? member.imageUrl.startsWith('/')
              ? member.imageUrl
              : buildCloudinaryImageUrl(member.imageUrl, {
                  width: 560,
                  height: 700,
                  crop: 'fill',
                  quality: 'auto',
                })
            : null;
          const uploadState = uploads[member.localKey];

          return (
            <div
              key={member.localKey}
              className={cn(
                'admin-card p-4 flex flex-col justify-between gap-3',
                !member.isActive && 'opacity-60',
              )}
            >
              <div className="space-y-3">
                <div className="relative aspect-[4/5] w-full rounded-xl overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)]">
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
                      alt={member.name}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
                      <CameraIcon className="w-6 h-6 text-[var(--admin-muted)] mb-1" />
                      <span className="text-[11px] font-medium text-[var(--admin-muted)]">
                        Upload Portrait Photo
                      </span>
                    </div>
                  )}

                  <span className="absolute top-2 left-2 rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                    #{idx + 1}
                  </span>

                  {uploadState && (
                    <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center text-white text-xs gap-1.5">
                      <span className="font-semibold">{uploadState.statusText}</span>
                      <div className="w-24 h-1.5 rounded-full bg-white/20 overflow-hidden">
                        <div
                          className="h-full bg-[#CAA650]"
                          style={{ width: `${uploadState.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => fileInputsRef.current[member.localKey]?.click()}
                    className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                  >
                    {thumbUrl ? 'Replace' : 'Upload Portrait'}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleOpenPicker(member.localKey)}
                    className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--admin-accent)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                  >
                    Gallery
                  </button>
                  {member.imageUrl && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleClearPortrait(member.localKey)}
                      className="rounded-lg px-2 py-1 text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-2">
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
                  <input
                    type="text"
                    value={member.subtitle}
                    maxLength={120}
                    onChange={(e) =>
                      updateMemberField(member.localKey, 'subtitle', e.target.value)
                    }
                    placeholder="Subtitle / Native Title (optional)"
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-1.5 text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                  />
                  <input
                    type="text"
                    value={member.role}
                    maxLength={120}
                    onChange={(e) =>
                      updateMemberField(member.localKey, 'role', e.target.value)
                    }
                    placeholder="Role / Title (e.g. Lead Photographer)"
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-1.5 text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                  />
                  <input
                    type="text"
                    value={member.specialty}
                    maxLength={180}
                    onChange={(e) =>
                      updateMemberField(member.localKey, 'specialty', e.target.value)
                    }
                    placeholder="Specialty / Craft Focus"
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-1.5 text-xs text-[var(--admin-muted)] focus:outline-none focus:border-[var(--admin-accent)]"
                  />
                  <textarea
                    rows={3}
                    value={member.bio}
                    maxLength={600}
                    onChange={(e) =>
                      updateMemberField(member.localKey, 'bio', e.target.value)
                    }
                    placeholder="Short team bio & experience..."
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-1.5 text-xs text-[var(--admin-text)] leading-relaxed focus:outline-none focus:border-[var(--admin-accent)] resize-none"
                  />
                  {member.isFeatured && (
                    <div className="space-y-2 pt-0.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={member.phone}
                          maxLength={40}
                          onChange={(e) =>
                            updateMemberField(member.localKey, 'phone', e.target.value)
                          }
                          placeholder="Phone (+880...)"
                          className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-2.5 py-1.5 text-[11px] font-mono-code text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                        />
                        <input
                          type="text"
                          value={member.instagram}
                          maxLength={80}
                          onChange={(e) =>
                            updateMemberField(member.localKey, 'instagram', e.target.value)
                          }
                          placeholder="Instagram handle"
                          className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-2.5 py-1.5 text-[11px] text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                        />
                      </div>
                      <input
                        type="text"
                        value={member.location}
                        maxLength={100}
                        onChange={(e) =>
                          updateMemberField(member.localKey, 'location', e.target.value)
                        }
                        placeholder="City / Location"
                        className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-1.5 text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                      />
                      <textarea
                        rows={2}
                        value={member.quote}
                        maxLength={320}
                        onChange={(e) =>
                          updateMemberField(member.localKey, 'quote', e.target.value)
                        }
                        placeholder="Signature quote shown on highlighted Founder/Lead card..."
                        className="w-full rounded-xl border border-[var(--admin-accent)]/40 bg-[var(--admin-accent-soft)] px-3 py-1.5 text-xs italic text-[var(--admin-text)] leading-relaxed focus:outline-none focus:border-[var(--admin-accent)] resize-none"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--admin-border-subtle)] space-y-2 text-[11px]">
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
                    'w-full rounded-lg border px-2.5 py-1 font-semibold text-center transition-colors cursor-pointer',
                    member.isFeatured
                      ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]'
                      : 'border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                  )}
                >
                  {member.isFeatured
                    ? '★ Highlighted Lead (Left Pic + Right Bio)'
                    : 'Set as Highlighted Founder / Lead'}
                </button>

                <div className="flex items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--admin-text)] font-medium">
                    <input
                      type="checkbox"
                      checked={member.isActive}
                      onChange={(e) =>
                        updateMemberField(member.localKey, 'isActive', e.target.checked)
                      }
                      className="h-3.5 w-3.5 accent-[var(--admin-accent)]"
                    />
                    <span>Active</span>
                  </label>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => moveMember(idx, -1)}
                      disabled={idx === 0}
                      aria-label="Move member earlier"
                      className="rounded-lg border border-[var(--admin-border)] p-1 text-[var(--admin-muted)] hover:text-[var(--admin-text)] disabled:opacity-35 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      onClick={() => moveMember(idx, 1)}
                      disabled={idx === members.length - 1}
                      aria-label="Move member later"
                      className="rounded-lg border border-[var(--admin-border)] p-1 text-[var(--admin-muted)] hover:text-[var(--admin-text)] disabled:opacity-35 cursor-pointer"
                    >
                      <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="9 18 15 12 9 6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => removeMember(member.localKey)}
                      className="rounded-lg px-2 py-1 font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between gap-4 pt-1 text-xs text-[var(--admin-muted)]">
        <button
          type="button"
          disabled={isPending}
          onClick={handleRestoreDefaults}
          className="underline hover:text-[var(--admin-text)] cursor-pointer"
        >
          Restore Default Story &amp; 4 Team Profiles
        </button>
        {hasUnsavedChanges && (
          <span className="font-semibold text-amber-600 dark:text-amber-300">
            You have unsaved edits — click &ldquo;Save About &amp; Team&rdquo; to publish.
          </span>
        )}
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
