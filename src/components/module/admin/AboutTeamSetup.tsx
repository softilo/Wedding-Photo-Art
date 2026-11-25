'use client';

import React, { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
} from '@/types/event-management';
import {
  activateAboutTeamMedia,
  ensureAboutTeamEvent,
  getAdminPortfolioEvent,
  listGalleryMedia,
  publishPortfolioEvent,
  registerPortfolioMedia,
  removeAboutTeamMedia,
  signPortfolioUpload,
  updatePortfolioEvent,
} from '@/service/catalog/catalog.service';
import {
  detectImageFormat,
  measureImageDimensions,
  uploadImageToCloudinary,
} from '@/lib/cloudinaryClientUpload';
import { getHeroSlideThumbUrl } from '@/lib/heroSlider';
import {
  AboutTeamSettings,
  buildDefaultAboutTeamSettings,
  parseAboutTeamSettings,
  serializeAboutTeamDescription,
  StudioTeamMemberItem,
} from '@/lib/studioAboutTeam';
import { cn } from '@/lib/utils';
import { CameraIcon, ExternalLinkIcon, PlusIcon, UsersIcon } from '@/components/shared/Icons';
import { StudioGalleryPickerModal } from './StudioGalleryPickerModal';

interface AboutTeamSetupProps {
  initialAboutTeamEvent: PortfolioShowcaseEvent | null;
  galleryPool: PortfolioMediaItem[];
  onGalleryPoolUpdate: (nextPool: PortfolioMediaItem[]) => void;
  studioName: string;
  onNotify: (type: 'ok' | 'err', text: string) => void;
  onAboutTeamEventChange?: (ev: PortfolioShowcaseEvent | null) => void;
}

interface MemberUploadState {
  progress: number;
  statusText: string;
}

export function AboutTeamSetup({
  initialAboutTeamEvent,
  galleryPool,
  onGalleryPoolUpdate,
  studioName,
  onNotify,
  onAboutTeamEventChange,
}: AboutTeamSetupProps) {
  const [aboutEvent, setAboutEvent] = useState<PortfolioShowcaseEvent | null>(
    initialAboutTeamEvent,
  );
  const [draft, setDraft] = useState<AboutTeamSettings>(() =>
    parseAboutTeamSettings(initialAboutTeamEvent?.description, studioName),
  );
  const [uploads, setUploads] = useState<Record<string, MemberUploadState>>({});
  const [pickerMemberId, setPickerMemberId] = useState<string | null>(null);
  const [gallerySearch, setGallerySearch] = useState('');
  const [landscapeOnly, setLandscapeOnly] = useState(false);
  const [isPending, startTransition] = useTransition();

  const eventRef = useRef<PortfolioShowcaseEvent | null>(initialAboutTeamEvent);
  const ensurePromiseRef = useRef<Promise<PortfolioShowcaseEvent | null> | null>(null);
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const syncEvent = (nextEvent: PortfolioShowcaseEvent | null) => {
    eventRef.current = nextEvent;
    setAboutEvent(nextEvent);
    onAboutTeamEventChange?.(nextEvent);
  };

  const savedSettings = useMemo(
    () => parseAboutTeamSettings(aboutEvent?.description, studioName),
    [aboutEvent?.description, studioName],
  );

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedSettings),
    [draft, savedSettings],
  );

  const mediaById = useMemo(() => {
    const map = new Map<string, PortfolioMediaItem>();
    for (const m of aboutEvent?.media || []) {
      if (m.resourceType === 'IMAGE' && m.status === 'READY') {
        map.set(m.id, m);
      }
    }
    return map;
  }, [aboutEvent?.media]);

  const getOrCreateEvent = async (): Promise<PortfolioShowcaseEvent | null> => {
    if (eventRef.current) return eventRef.current;
    if (ensurePromiseRef.current) return ensurePromiseRef.current;

    const promise = (async () => {
      const ensured = await ensureAboutTeamEvent();
      if (!ensured.ok || !ensured.data) {
        onNotify('err', ensured.message || 'Could not initialize About & Team showcase container.');
        return null;
      }
      syncEvent(ensured.data);
      return ensured.data;
    })();

    ensurePromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      ensurePromiseRef.current = null;
    }
  };

  const ensurePublishedWithMedia = async (
    targetEvent: PortfolioShowcaseEvent,
    preferredMediaId?: string,
  ): Promise<PortfolioShowcaseEvent> => {
    const readyList = (targetEvent.media || []).filter(
      (m) => m.resourceType === 'IMAGE' && m.status === 'READY',
    );
    if (readyList.length > 0) {
      if (targetEvent.status === 'PUBLISHED' && targetEvent.coverMediaId) {
        return targetEvent;
      }
      const leadId = preferredMediaId || readyList[0].id;
      const actRes = await activateAboutTeamMedia(targetEvent.id, leadId, true);
      if (actRes.ok && actRes.data) {
        return actRes.data;
      }
      const pubRes = await publishPortfolioEvent(targetEvent.id);
      return pubRes.ok && pubRes.data ? pubRes.data : targetEvent;
    }

    const anchor = galleryPool.find(
      (m) => m.resourceType === 'IMAGE' && m.status === 'READY' && Boolean(m.secureUrl),
    );
    if (!anchor) return targetEvent;

    const regRes = await registerPortfolioMedia(targetEvent.id, {
      assetId: anchor.assetId,
      publicId: anchor.publicId,
      resourceType: 'IMAGE',
      format: anchor.format,
      secureUrl: anchor.secureUrl,
      bytes: anchor.bytes,
      width: anchor.width ?? undefined,
      height: anchor.height ?? undefined,
      caption: 'About & Team Anchor Cover',
      altText: `${studioName} creative team`,
      status: 'READY',
    });

    if (!regRes.ok || !regRes.data) return targetEvent;

    const actRes = await activateAboutTeamMedia(targetEvent.id, regRes.data.media.id, true);
    return actRes.ok && actRes.data ? actRes.data : targetEvent;
  };

  const persistSettings = async (
    nextSettings: AboutTeamSettings,
    successMessage: string,
    preferredMediaId?: string,
  ): Promise<boolean> => {
    const targetEvent = await getOrCreateEvent();
    if (!targetEvent) return false;

    const updateRes = await updatePortfolioEvent(targetEvent.id, {
      description: serializeAboutTeamDescription(nextSettings),
    });
    if (!updateRes.ok || !updateRes.data) {
      onNotify('err', updateRes.message || 'Could not save About & Team details.');
      return false;
    }

    const published = await ensurePublishedWithMedia(updateRes.data, preferredMediaId);
    const refreshed = await getAdminPortfolioEvent(published.id);
    const finalEvent = refreshed.ok && refreshed.data ? refreshed.data : published;
    syncEvent(finalEvent);
    onNotify('ok', successMessage);
    return true;
  };

  const handleSaveAll = () => {
    if (!draft.storyTitle.trim()) {
      onNotify('err', 'Please provide an About Studio story headline.');
      return;
    }
    const validMembers = draft.members.filter((m) => m.name.trim().length > 0);
    if (validMembers.length === 0) {
      onNotify('err', 'Add at least one team member name before saving.');
      return;
    }
    startTransition(async () => {
      await persistSettings(draft, 'About story & team details saved and published!');
    });
  };

  const handleAddMember = () => {
    const newMember: StudioTeamMemberItem = {
      id: `team-${Date.now().toString(36)}`,
      name: 'New Team Member',
      role: 'Photographer / Cinematographer',
      specialty: 'Wedding & Event Storytelling',
      bio: `Part of the in-house ${studioName} crew crafting natural-light frames and expressive wedding stories.`,
      isActive: true,
    };
    setDraft((prev) => ({
      ...prev,
      members: [...prev.members, newMember],
    }));
  };

  const updateMemberField = <K extends keyof StudioTeamMemberItem>(
    memberId: string,
    field: K,
    value: StudioTeamMemberItem[K],
  ) => {
    setDraft((prev) => ({
      ...prev,
      members: prev.members.map((m) => (m.id === memberId ? { ...m, [field]: value } : m)),
    }));
  };

  const moveMember = (idx: number, delta: -1 | 1) => {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= draft.members.length) return;
    setDraft((prev) => {
      const next = [...prev.members];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return { ...prev, members: next };
    });
  };

  const removeMember = (memberId: string) => {
    if (draft.members.length <= 1) {
      onNotify('err', 'Keep at least 1 team profile card.');
      return;
    }
    const removed = draft.members.find((m) => m.id === memberId);
    const nextMembers = draft.members.filter((m) => m.id !== memberId);
    const nextSettings: AboutTeamSettings = { ...draft, members: nextMembers };
    setDraft(nextSettings);

    if (aboutEvent) {
      startTransition(async () => {
        const ok = await persistSettings(nextSettings, 'Team member removed from About page.');
        if (ok && removed?.mediaId) {
          const stillUsed = nextMembers.some((m) => m.mediaId === removed.mediaId);
          if (!stillUsed) {
            const rmRes = await removeAboutTeamMedia(aboutEvent.id, removed.mediaId);
            if (rmRes.ok && rmRes.data) {
              syncEvent(rmRes.data);
            }
          }
        }
      });
    }
  };

  const assignPortraitToMember = async (memberId: string, newMedia: PortfolioMediaItem) => {
    const targetEvent = eventRef.current;
    if (!targetEvent) return;

    const existing = draft.members.find((m) => m.id === memberId);
    const prevMediaId = existing?.mediaId;

    const nextSettings: AboutTeamSettings = {
      ...draft,
      members: draft.members.map((m) => (m.id === memberId ? { ...m, mediaId: newMedia.id } : m)),
    };
    setDraft(nextSettings);

    const saved = await persistSettings(
      nextSettings,
      `Updated portrait for "${existing?.name || 'Team Member'}".`,
      newMedia.id,
    );

    if (saved && prevMediaId && prevMediaId !== newMedia.id) {
      const usedElsewhere = nextSettings.members.some(
        (m) => m.id !== memberId && m.mediaId === prevMediaId,
      );
      if (!usedElsewhere) {
        const cleanupRes = await removeAboutTeamMedia(targetEvent.id, prevMediaId);
        if (cleanupRes.ok && cleanupRes.data) {
          syncEvent(cleanupRes.data);
        }
      }
    }
  };

  const handleUploadPortrait = (memberId: string, file: File) => {
    const { valid, format } = detectImageFormat(file);
    if (!valid) {
      onNotify('err', 'Please select a valid image file (JPG, PNG, WebP, AVIF, or HEIC).');
      return;
    }

    const memberMeta = draft.members.find((m) => m.id === memberId);

    void (async () => {
      setUploads((prev) => ({
        ...prev,
        [memberId]: { progress: 10, statusText: 'Signing upload...' },
      }));

      const targetEvent = await getOrCreateEvent();
      if (!targetEvent) {
        setUploads((prev) => {
          const next = { ...prev };
          delete next[memberId];
          return next;
        });
        return;
      }

      const dims = await measureImageDimensions(file);
      const signRes = await signPortfolioUpload(targetEvent.id, {
        resourceType: 'IMAGE',
        format,
        bytes: file.size,
      });

      if (!signRes.ok || !signRes.data) {
        onNotify('err', signRes.message || 'Could not authorize portrait upload.');
        setUploads((prev) => {
          const next = { ...prev };
          delete next[memberId];
          return next;
        });
        return;
      }

      try {
        const cld = await uploadImageToCloudinary(file, signRes.data, (pct) => {
          setUploads((prev) => ({
            ...prev,
            [memberId]: { progress: pct, statusText: `${pct}%` },
          }));
        });

        setUploads((prev) => ({
          ...prev,
          [memberId]: { progress: 96, statusText: 'Saving...' },
        }));

        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const regRes = await registerPortfolioMedia(targetEvent.id, {
          assetId: cld.asset_id,
          publicId: cld.public_id,
          resourceType: 'IMAGE',
          format: cld.format || format,
          secureUrl: cld.secure_url,
          bytes: cld.bytes || file.size,
          width: cld.width ?? dims.width,
          height: cld.height ?? dims.height,
          status: 'READY',
          version: cld.version,
          responseSignature: cld.signature,
          caption: `${memberMeta?.name || 'Team Member'} — ${cleanName}`,
          altText: `${memberMeta?.name || 'Team Member'} — ${studioName}`,
        });

        if (!regRes.ok || !regRes.data) {
          throw new Error(regRes.message || 'Failed to save uploaded portrait.');
        }

        await assignPortraitToMember(memberId, regRes.data.media);
      } catch (err) {
        onNotify('err', err instanceof Error ? err.message : 'Portrait upload failed.');
      } finally {
        setUploads((prev) => {
          const next = { ...prev };
          delete next[memberId];
          return next;
        });
      }
    })();
  };

  const handleOpenPicker = (memberId: string) => {
    setPickerMemberId(memberId);
    startTransition(async () => {
      const res = await listGalleryMedia('IMAGE');
      if (res.ok && res.data) {
        onGalleryPoolUpdate(res.data.data);
      }
    });
  };

  const handlePickFromGallery = (img: PortfolioMediaItem) => {
    if (!pickerMemberId) return;
    const targetId = pickerMemberId;

    startTransition(async () => {
      const targetEvent = await getOrCreateEvent();
      if (!targetEvent) return;

      const regRes = await registerPortfolioMedia(targetEvent.id, {
        assetId: img.assetId,
        publicId: img.publicId,
        resourceType: 'IMAGE',
        format: img.format,
        secureUrl: img.secureUrl,
        bytes: img.bytes,
        width: img.width ?? undefined,
        height: img.height ?? undefined,
        caption: img.caption ?? undefined,
        altText: img.altText ?? img.caption ?? undefined,
        status: 'READY',
      });

      if (!regRes.ok || !regRes.data) {
        onNotify('err', regRes.message || 'Could not assign portrait from gallery.');
        return;
      }

      await assignPortraitToMember(targetId, regRes.data.media);
      setPickerMemberId(null);
    });
  };

  const handleClearPortrait = (memberId: string) => {
    const member = draft.members.find((m) => m.id === memberId);
    if (!member?.mediaId || !aboutEvent) return;

    const removedId = member.mediaId;
    const nextSettings: AboutTeamSettings = {
      ...draft,
      members: draft.members.map((m) => (m.id === memberId ? { ...m, mediaId: undefined } : m)),
    };
    setDraft(nextSettings);

    startTransition(async () => {
      const ok = await persistSettings(
        nextSettings,
        `Cleared custom portrait for "${member.name}".`,
      );
      if (ok && aboutEvent) {
        const stillUsed = nextSettings.members.some((m) => m.mediaId === removedId);
        if (!stillUsed) {
          const rmRes = await removeAboutTeamMedia(aboutEvent.id, removedId);
          if (rmRes.ok && rmRes.data) {
            syncEvent(rmRes.data);
          }
        }
      }
    });
  };

  const handleRestoreDefaults = () => {
    const defaults = buildDefaultAboutTeamSettings(studioName);
    setDraft(defaults);
    startTransition(async () => {
      await persistSettings(defaults, 'Restored default studio story and team profiles.');
    });
  };

  const pickerPublicIds = useMemo(() => {
    const set = new Set<string>();
    const current = draft.members.find((m) => m.id === pickerMemberId);
    const media = current?.mediaId ? mediaById.get(current.mediaId) : undefined;
    if (media?.publicId) set.add(media.publicId);
    return set;
  }, [draft.members, pickerMemberId, mediaById]);

  return (
    <div className="space-y-5">
      {/* Header Bar */}
      <div className="admin-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-[var(--admin-text)]">
              About Page Story &amp; Team Details
            </h2>
            <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
              <UsersIcon className="w-3 h-3" />
              {draft.members.filter((m) => m.isActive).length} Active Members
            </span>
          </div>
          <p className="text-xs text-[var(--admin-muted)]">
            Customize the studio story and team profiles rendered on{' '}
            <Link
              href="/about"
              target="_blank"
              className="font-mono-code underline text-[var(--admin-accent)]"
            >
              /about
            </Link>
            .
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
        <h3 className="text-sm font-semibold text-[var(--admin-text)]">Studio Heritage &amp; Story</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
              Eyebrow Badge
            </label>
            <input
              type="text"
              value={draft.storyEyebrow}
              maxLength={90}
              onChange={(e) => setDraft((prev) => ({ ...prev, storyEyebrow: e.target.value }))}
              className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-xs sm:text-sm text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
            />
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
              Heritage Headline
            </label>
            <input
              type="text"
              value={draft.storyTitle}
              maxLength={140}
              onChange={(e) => setDraft((prev) => ({ ...prev, storyTitle: e.target.value }))}
              className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-xs sm:text-sm font-semibold text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
            />
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
              Hero Lead Summary
            </label>
            <textarea
              rows={3}
              value={draft.storyLead}
              maxLength={280}
              onChange={(e) => setDraft((prev) => ({ ...prev, storyLead: e.target.value }))}
              className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-xs text-[var(--admin-text)] leading-relaxed focus:outline-none focus:border-[var(--admin-accent)] resize-none"
            />
          </div>
          <div>
            <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
              Studio Story Paragraph
            </label>
            <textarea
              rows={3}
              value={draft.storyBody}
              maxLength={900}
              onChange={(e) => setDraft((prev) => ({ ...prev, storyBody: e.target.value }))}
              className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-xs text-[var(--admin-text)] leading-relaxed focus:outline-none focus:border-[var(--admin-accent)] resize-none"
            />
          </div>
        </div>
      </div>

      {/* Team Member Profile Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {draft.members.map((member, idx) => {
          const media = member.mediaId ? mediaById.get(member.mediaId) : undefined;
          const thumbUrl = media ? getHeroSlideThumbUrl(media) : (member.defaultImageUrl ?? null);
          const uploadState = uploads[member.id];

          return (
            <div
              key={member.id}
              className={cn(
                'admin-card p-4 flex flex-col justify-between gap-3',
                !member.isActive && 'opacity-60',
              )}
            >
              <div className="space-y-3">
                <div className="relative aspect-[4/5] w-full rounded-xl overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)]">
                  <input
                    ref={(el) => {
                      fileInputsRef.current[member.id] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadPortrait(member.id, f);
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
                        Upload Portrait Photo (or fallback)
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
                    onClick={() => fileInputsRef.current[member.id]?.click()}
                    className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                  >
                    {thumbUrl ? 'Replace' : 'Upload Portrait'}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleOpenPicker(member.id)}
                    className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1 text-[11px] font-semibold text-[var(--admin-accent)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                  >
                    Gallery
                  </button>
                  {member.mediaId && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleClearPortrait(member.id)}
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
                    maxLength={80}
                    onChange={(e) => updateMemberField(member.id, 'name', e.target.value)}
                    placeholder="Full Name"
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs sm:text-sm font-semibold text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                  />
                  <input
                    type="text"
                    value={member.subtitle ?? ''}
                    maxLength={90}
                    onChange={(e) => updateMemberField(member.id, 'subtitle', e.target.value)}
                    placeholder="Subtitle / Native Title (optional)"
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                  />
                  <input
                    type="text"
                    value={member.role}
                    maxLength={90}
                    onChange={(e) => updateMemberField(member.id, 'role', e.target.value)}
                    placeholder="Role / Title (e.g. Lead Photographer)"
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                  />
                  <input
                    type="text"
                    value={member.specialty}
                    maxLength={120}
                    onChange={(e) => updateMemberField(member.id, 'specialty', e.target.value)}
                    placeholder="Specialty / Craft Focus"
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs text-[var(--admin-muted)] focus:outline-none focus:border-[var(--admin-accent)]"
                  />
                  <textarea
                    rows={3}
                    value={member.bio}
                    maxLength={420}
                    onChange={(e) => updateMemberField(member.id, 'bio', e.target.value)}
                    placeholder="Short team bio & experience..."
                    className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs text-[var(--admin-text)] leading-relaxed focus:outline-none focus:border-[var(--admin-accent)] resize-none"
                  />
                  {member.isFeatured && (
                    <div className="space-y-2 pt-0.5">
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          value={member.phone ?? ''}
                          maxLength={40}
                          onChange={(e) => updateMemberField(member.id, 'phone', e.target.value)}
                          placeholder="Phone (+880...)"
                          className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-[11px] font-mono-code text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                        />
                        <input
                          type="text"
                          value={member.instagram ?? ''}
                          maxLength={80}
                          onChange={(e) => updateMemberField(member.id, 'instagram', e.target.value)}
                          placeholder="Instagram handle"
                          className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-[11px] text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                        />
                      </div>
                      <input
                        type="text"
                        value={member.location ?? ''}
                        maxLength={80}
                        onChange={(e) => updateMemberField(member.id, 'location', e.target.value)}
                        placeholder="City / Location"
                        className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 text-xs text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                      />
                      <textarea
                        rows={2}
                        value={member.quote ?? ''}
                        maxLength={220}
                        onChange={(e) => updateMemberField(member.id, 'quote', e.target.value)}
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
                    setDraft((prev) => ({
                      ...prev,
                      members: prev.members.map((m) => ({
                        ...m,
                        isFeatured: m.id === member.id,
                      })),
                    }))
                  }
                  className={cn(
                    'w-full rounded-lg border px-2.5 py-1 font-semibold text-center transition-colors cursor-pointer',
                    member.isFeatured
                      ? 'border-[var(--admin-accent)] bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]'
                      : 'border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                  )}
                >
                  {member.isFeatured ? '★ Highlighted Lead (Left Pic + Right Bio)' : 'Set as Highlighted Founder / Lead'}
                </button>

                <div className="flex items-center justify-between gap-2">
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--admin-text)] font-medium">
                  <input
                    type="checkbox"
                    checked={member.isActive}
                    onChange={(e) => updateMemberField(member.id, 'isActive', e.target.checked)}
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
                    disabled={idx === draft.members.length - 1}
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
                    onClick={() => removeMember(member.id)}
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
        open={pickerMemberId !== null}
        onClose={() => setPickerMemberId(null)}
        title="Pick Team Portrait Photo"
        subtitle="Select a portrait or behind-the-scenes team photograph from the Studio Gallery."
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
