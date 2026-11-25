'use client';

import React, { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
} from '@/types/event-management';
import {
  activateServicesShowcaseMedia,
  ensureServicesShowcaseEvent,
  getAdminPortfolioEvent,
  listGalleryMedia,
  publishPortfolioEvent,
  registerPortfolioMedia,
  removeServicesShowcaseMedia,
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
  buildDefaultStudioServices,
  parseStudioServicesSettings,
  serializeStudioServicesDescription,
  StudioServiceItem,
  StudioServicesSettings,
} from '@/lib/studioServices';
import { cn } from '@/lib/utils';
import {
  CameraIcon,
  ExternalLinkIcon,
  PlusIcon,
} from '@/components/shared/Icons';
import { StudioGalleryPickerModal } from './StudioGalleryPickerModal';

interface ServicesShowcaseSetupProps {
  initialServicesEvent: PortfolioShowcaseEvent | null;
  galleryPool: PortfolioMediaItem[];
  onGalleryPoolUpdate: (nextPool: PortfolioMediaItem[]) => void;
  studioName: string;
  onNotify: (type: 'ok' | 'err', text: string) => void;
  onServicesEventChange?: (ev: PortfolioShowcaseEvent | null) => void;
}

interface ItemUploadState {
  progress: number;
  statusText: string;
}

export function ServicesShowcaseSetup({
  initialServicesEvent,
  galleryPool,
  onGalleryPoolUpdate,
  studioName,
  onNotify,
  onServicesEventChange,
}: ServicesShowcaseSetupProps) {
  const [servicesEvent, setServicesEvent] = useState<PortfolioShowcaseEvent | null>(
    initialServicesEvent,
  );
  const [draft, setDraft] = useState<StudioServicesSettings>(() =>
    parseStudioServicesSettings(initialServicesEvent?.description, studioName),
  );
  const [itemUploads, setItemUploads] = useState<Record<string, ItemUploadState>>({});
  const [pickerItemId, setPickerItemId] = useState<string | null>(null);
  const [gallerySearch, setGallerySearch] = useState('');
  const [landscapeOnly, setLandscapeOnly] = useState(true);
  const [isPending, startTransition] = useTransition();

  const eventRef = useRef<PortfolioShowcaseEvent | null>(initialServicesEvent);
  const ensurePromiseRef = useRef<Promise<PortfolioShowcaseEvent | null> | null>(null);
  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const syncEvent = (nextEvent: PortfolioShowcaseEvent | null) => {
    eventRef.current = nextEvent;
    setServicesEvent(nextEvent);
    onServicesEventChange?.(nextEvent);
  };

  const savedSettings = useMemo(
    () => parseStudioServicesSettings(servicesEvent?.description, studioName),
    [servicesEvent?.description, studioName],
  );

  const hasUnsavedChanges = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(savedSettings),
    [draft, savedSettings],
  );

  const mediaById = useMemo(() => {
    const map = new Map<string, PortfolioMediaItem>();
    for (const m of servicesEvent?.media || []) {
      if (m.resourceType === 'IMAGE' && m.status === 'READY') {
        map.set(m.id, m);
      }
    }
    return map;
  }, [servicesEvent?.media]);

  const getOrCreateEvent = async (): Promise<PortfolioShowcaseEvent | null> => {
    if (eventRef.current) return eventRef.current;
    if (ensurePromiseRef.current) return ensurePromiseRef.current;

    const promise = (async () => {
      const ensured = await ensureServicesShowcaseEvent();
      if (!ensured.ok || !ensured.data) {
        onNotify('err', ensured.message || 'Could not initialize Services Showcase container.');
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
      const actRes = await activateServicesShowcaseMedia(targetEvent.id, leadId, true);
      if (actRes.ok && actRes.data) {
        return actRes.data;
      }
      const pubRes = await publishPortfolioEvent(targetEvent.id);
      return pubRes.ok && pubRes.data ? pubRes.data : targetEvent;
    }

    // Attach silent anchor photo from Studio Gallery if empty so backend publishes clean text edits too
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
      caption: 'Studio Services Anchor Cover',
      altText: `${studioName} services showcase`,
      status: 'READY',
    });

    if (!regRes.ok || !regRes.data) return targetEvent;

    const actRes = await activateServicesShowcaseMedia(targetEvent.id, regRes.data.media.id, true);
    return actRes.ok && actRes.data ? actRes.data : targetEvent;
  };

  const persistSettings = async (
    nextSettings: StudioServicesSettings,
    successMessage: string,
    preferredMediaId?: string,
  ): Promise<boolean> => {
    const targetEvent = await getOrCreateEvent();
    if (!targetEvent) return false;

    const updateRes = await updatePortfolioEvent(targetEvent.id, {
      description: serializeStudioServicesDescription(nextSettings),
    });
    if (!updateRes.ok || !updateRes.data) {
      onNotify('err', updateRes.message || 'Could not save services configuration.');
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
    const validCount = draft.items.filter((it) => it.title.trim().length > 0).length;
    if (validCount === 0) {
      onNotify('err', 'Keep at least one service with a title before saving.');
      return;
    }
    startTransition(async () => {
      await persistSettings(draft, 'Services showcase updated and published!');
    });
  };

  const handleToggleSectionEnabled = () => {
    const nextDraft: StudioServicesSettings = {
      ...draft,
      enabled: !draft.enabled,
    };
    setDraft(nextDraft);
    startTransition(async () => {
      await persistSettings(
        nextDraft,
        nextDraft.enabled
          ? 'Services Showcase section is now visible on homepage.'
          : 'Services Showcase section hidden from homepage.',
      );
    });
  };

  const handleAddService = () => {
    const newId = `srv-${Date.now().toString(36)}`;
    const newItem: StudioServiceItem = {
      id: newId,
      title: 'New Photography Service',
      description: `Bespoke photography and storytelling tailored to your celebration by ${studioName}.`,
      showOnHome: draft.items.filter((i) => i.showOnHome && i.isActive).length < 3,
      isActive: true,
    };
    setDraft((prev) => ({
      ...prev,
      items: [newItem, ...prev.items],
    }));
  };

  const updateItemField = <K extends keyof StudioServiceItem>(
    itemId: string,
    field: K,
    value: StudioServiceItem[K],
  ) => {
    setDraft((prev) => ({
      ...prev,
      items: prev.items.map((item) => (item.id === itemId ? { ...item, [field]: value } : item)),
    }));
  };

  const moveItem = (idx: number, delta: -1 | 1) => {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= draft.items.length) return;
    setDraft((prev) => {
      const next = [...prev.items];
      const [moved] = next.splice(idx, 1);
      next.splice(targetIdx, 0, moved);
      return { ...prev, items: next };
    });
  };

  const removeServiceItem = (itemId: string) => {
    if (draft.items.length <= 1) {
      onNotify('err', 'Keep at least 1 service card or hide the section instead.');
      return;
    }
    const removed = draft.items.find((i) => i.id === itemId);
    const nextItems = draft.items.filter((i) => i.id !== itemId);
    const nextSettings: StudioServicesSettings = { ...draft, items: nextItems };
    setDraft(nextSettings);

    if (servicesEvent) {
      startTransition(async () => {
        const ok = await persistSettings(nextSettings, 'Service removed from showcase.');
        if (ok && removed?.mediaId) {
          const stillUsed = nextItems.some((i) => i.mediaId === removed.mediaId);
          if (!stillUsed && servicesEvent) {
            const rmRes = await removeServicesShowcaseMedia(servicesEvent.id, removed.mediaId);
            if (rmRes.ok && rmRes.data) {
              syncEvent(rmRes.data);
            }
          }
        }
      });
    }
  };

  const assignMediaToService = async (itemId: string, newMedia: PortfolioMediaItem) => {
    const targetEvent = eventRef.current;
    if (!targetEvent) return;

    const existingItem = draft.items.find((i) => i.id === itemId);
    const prevMediaId = existingItem?.mediaId;

    const nextSettings: StudioServicesSettings = {
      ...draft,
      items: draft.items.map((i) => (i.id === itemId ? { ...i, mediaId: newMedia.id } : i)),
    };
    setDraft(nextSettings);

    const saved = await persistSettings(
      nextSettings,
      `Updated photo for "${existingItem?.title || 'Service'}".`,
      newMedia.id,
    );

    if (saved && prevMediaId && prevMediaId !== newMedia.id) {
      const usedElsewhere = nextSettings.items.some(
        (i) => i.id !== itemId && i.mediaId === prevMediaId,
      );
      if (!usedElsewhere) {
        const cleanupRes = await removeServicesShowcaseMedia(targetEvent.id, prevMediaId);
        if (cleanupRes.ok && cleanupRes.data) {
          syncEvent(cleanupRes.data);
        }
      }
    }
  };

  const handleUploadPhoto = (itemId: string, file: File) => {
    const { valid, format } = detectImageFormat(file);
    if (!valid) {
      onNotify('err', 'Please select a valid image file (JPG, PNG, WebP, AVIF, or HEIC).');
      return;
    }

    const itemMeta = draft.items.find((i) => i.id === itemId);

    void (async () => {
      setItemUploads((prev) => ({
        ...prev,
        [itemId]: { progress: 10, statusText: 'Signing upload...' },
      }));

      const targetEvent = await getOrCreateEvent();
      if (!targetEvent) {
        setItemUploads((prev) => {
          const next = { ...prev };
          delete next[itemId];
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
        onNotify('err', signRes.message || 'Could not authorize Cloudinary upload.');
        setItemUploads((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
        return;
      }

      try {
        const cld = await uploadImageToCloudinary(file, signRes.data, (pct) => {
          setItemUploads((prev) => ({
            ...prev,
            [itemId]: { progress: pct, statusText: `${pct}%` },
          }));
        });

        setItemUploads((prev) => ({
          ...prev,
          [itemId]: { progress: 96, statusText: 'Saving...' },
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
          caption: `${itemMeta?.title || 'Service'} — ${cleanName}`,
          altText: `${itemMeta?.title || 'Service'} — ${studioName}`,
        });

        if (!regRes.ok || !regRes.data) {
          throw new Error(regRes.message || 'Failed to register uploaded service photo.');
        }

        await assignMediaToService(itemId, regRes.data.media);
      } catch (err) {
        onNotify('err', err instanceof Error ? err.message : 'Service photo upload failed.');
      } finally {
        setItemUploads((prev) => {
          const next = { ...prev };
          delete next[itemId];
          return next;
        });
      }
    })();
  };

  const handleOpenPicker = (itemId: string) => {
    setPickerItemId(itemId);
    startTransition(async () => {
      const res = await listGalleryMedia('IMAGE');
      if (res.ok && res.data) {
        onGalleryPoolUpdate(res.data.data);
      }
    });
  };

  const handlePickFromGallery = (img: PortfolioMediaItem) => {
    if (!pickerItemId) return;
    const targetId = pickerItemId;

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
        onNotify('err', regRes.message || 'Could not assign gallery photo.');
        return;
      }

      await assignMediaToService(targetId, regRes.data.media);
      setPickerItemId(null);
    });
  };

  const handleClearPhoto = (itemId: string) => {
    const item = draft.items.find((i) => i.id === itemId);
    if (!item?.mediaId || !servicesEvent) return;

    const removedId = item.mediaId;
    const nextSettings: StudioServicesSettings = {
      ...draft,
      items: draft.items.map((i) => (i.id === itemId ? { ...i, mediaId: undefined } : i)),
    };
    setDraft(nextSettings);

    startTransition(async () => {
      const ok = await persistSettings(
        nextSettings,
        `Reset photo for "${item.title}" to studio fallback.`,
      );
      if (ok && servicesEvent) {
        const stillUsed = nextSettings.items.some((i) => i.mediaId === removedId);
        if (!stillUsed) {
          const rmRes = await removeServicesShowcaseMedia(servicesEvent.id, removedId);
          if (rmRes.ok && rmRes.data) {
            syncEvent(rmRes.data);
          }
        }
      }
    });
  };

  const handleRestoreDefaults = () => {
    const nextSettings: StudioServicesSettings = {
      enabled: true,
      items: buildDefaultStudioServices(studioName),
    };
    setDraft(nextSettings);
    startTransition(async () => {
      await persistSettings(nextSettings, 'Restored default 6 studio services.');
    });
  };

  const homeFeaturedIds = useMemo(() => {
    const active = draft.items.filter((i) => i.isActive);
    const chosen = active.filter((i) => i.showOnHome);
    return new Set((chosen.length > 0 ? chosen : active).slice(0, 3).map((i) => i.id));
  }, [draft.items]);

  const pickerPublicIds = useMemo(() => {
    const set = new Set<string>();
    const currentItem = draft.items.find((i) => i.id === pickerItemId);
    const media = currentItem?.mediaId ? mediaById.get(currentItem.mediaId) : undefined;
    if (media?.publicId) set.add(media.publicId);
    return set;
  }, [draft.items, pickerItemId, mediaById]);

  return (
    <div className="space-y-5">
      {/* Section Header & Top Controls */}
      <div className="admin-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base sm:text-lg font-semibold text-[var(--admin-text)]">
              Studio Services Cards (3 on Homepage • Full Grid on All Services)
            </h2>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                draft.enabled
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                  : 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
              )}
            >
              {draft.enabled ? `${homeFeaturedIds.size} on Homepage` : 'Hidden'}
            </span>
          </div>
          <p className="text-xs text-[var(--admin-muted)]">
            Customize photos, titles, descriptions, order, and homepage selection. Clicking{' '}
            <span className="font-semibold text-[var(--admin-text)]">See All Services</span> on
            the homepage opens{' '}
            <Link
              href="/all-services"
              target="_blank"
              className="font-mono-code underline text-[var(--admin-accent)]"
            >
              /all-services
            </Link>
            .
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/all-services"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors"
          >
            <span>View /all-services</span>
            <ExternalLinkIcon className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            disabled={isPending}
            onClick={handleToggleSectionEnabled}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
          >
            {draft.enabled ? 'Hide Section' : 'Show Section'}
          </button>

          <button
            type="button"
            onClick={handleAddService}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-accent)]/45 bg-[var(--admin-accent-soft)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-accent)] hover:opacity-90 transition-opacity cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Service</span>
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
            {isPending ? 'Saving...' : hasUnsavedChanges ? 'Save Services Changes' : 'Saved ✓'}
          </button>
        </div>
      </div>

      {/* Editable Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {draft.items.map((item, idx) => {
          const media = item.mediaId ? mediaById.get(item.mediaId) : undefined;
          const thumbUrl = media ? getHeroSlideThumbUrl(media) : null;
          const uploadState = itemUploads[item.id];
          const isFeaturedHome = homeFeaturedIds.has(item.id);

          return (
            <div
              key={item.id}
              className={cn(
                'admin-card p-4 flex flex-col justify-between gap-3.5',
                !item.isActive && 'opacity-65',
              )}
            >
              <div className="space-y-3">
                {/* Image Slot Preview & Direct Upload */}
                <div className="relative aspect-[3/2] w-full rounded-xl overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)]">
                  <input
                    ref={(el) => {
                      fileInputsRef.current[item.id] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadPhoto(item.id, f);
                      e.target.value = '';
                    }}
                  />

                  {thumbUrl ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={thumbUrl}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center p-3 text-center">
                      <CameraIcon className="w-6 h-6 text-[var(--admin-muted)] mb-1" />
                      <span className="text-[11px] font-medium text-[var(--admin-muted)]">
                        Auto-fallback photo (or pick/upload)
                      </span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1.5">
                    <span className="rounded-full bg-black/75 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                      #{idx + 1}
                    </span>
                    {isFeaturedHome && (
                      <span className="rounded-full bg-emerald-600/90 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                        Homepage Top 3
                      </span>
                    )}
                  </div>

                  {uploadState && (
                    <div className="absolute inset-0 bg-black/65 flex flex-col items-center justify-center text-white text-xs gap-1.5">
                      <span className="font-semibold">{uploadState.statusText}</span>
                      <div className="w-28 h-1.5 rounded-full bg-white/20 overflow-hidden">
                        <div
                          className="h-full bg-[#CAA650]"
                          style={{ width: `${uploadState.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Image Action Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => fileInputsRef.current[item.id]?.click()}
                    className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                  >
                    {thumbUrl ? 'Replace Photo' : 'Upload Photo'}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleOpenPicker(item.id)}
                    className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--admin-accent)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                  >
                    Pick Gallery
                  </button>
                  {item.mediaId && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleClearPhoto(item.id)}
                      className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                {/* Title & Description Inputs */}
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                      Service Title
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      maxLength={90}
                      onChange={(e) => updateItemField(item.id, 'title', e.target.value)}
                      placeholder="e.g. Wedding Photography"
                      className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-xs sm:text-sm font-semibold text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={item.description}
                      maxLength={420}
                      onChange={(e) => updateItemField(item.id, 'description', e.target.value)}
                      placeholder="Describe what families & couples receive with this service..."
                      className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-2 text-xs text-[var(--admin-text)] leading-relaxed focus:outline-none focus:border-[var(--admin-accent)] resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Card Bottom Controls */}
              <div className="pt-2.5 border-t border-[var(--admin-border-subtle)] flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--admin-text)] font-medium">
                    <input
                      type="checkbox"
                      checked={item.showOnHome}
                      onChange={(e) => updateItemField(item.id, 'showOnHome', e.target.checked)}
                      className="h-3.5 w-3.5 accent-[var(--admin-accent)]"
                    />
                    <span>Show on Home</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--admin-muted)] font-medium">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(e) => updateItemField(item.id, 'isActive', e.target.checked)}
                      className="h-3.5 w-3.5 accent-[var(--admin-accent)]"
                    />
                    <span>Active</span>
                  </label>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveItem(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Move service earlier"
                    className="rounded-lg border border-[var(--admin-border)] p-1 text-[var(--admin-muted)] hover:text-[var(--admin-text)] disabled:opacity-35 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    onClick={() => moveItem(idx, 1)}
                    disabled={idx === draft.items.length - 1}
                    aria-label="Move service later"
                    className="rounded-lg border border-[var(--admin-border)] p-1 text-[var(--admin-muted)] hover:text-[var(--admin-text)] disabled:opacity-35 cursor-pointer"
                  >
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => removeServiceItem(item.id)}
                    className="rounded-lg px-2 py-1 font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Utility Row */}
      <div className="flex items-center justify-between gap-4 pt-1 text-xs text-[var(--admin-muted)]">
        <button
          type="button"
          disabled={isPending}
          onClick={handleRestoreDefaults}
          className="underline hover:text-[var(--admin-text)] cursor-pointer"
        >
          Restore Default 6 Wedding Services
        </button>
        {hasUnsavedChanges && (
          <span className="font-semibold text-amber-600 dark:text-amber-300">
            You have unsaved edits — click &ldquo;Save Services Changes&rdquo; to publish.
          </span>
        )}
      </div>

      <StudioGalleryPickerModal
        open={pickerItemId !== null}
        onClose={() => setPickerItemId(null)}
        title="Pick Service Cover Photo"
        subtitle="Select a landscape wedding, ceremony, or portrait photograph from the Studio Gallery."
        actionLabel="Use Photo"
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
