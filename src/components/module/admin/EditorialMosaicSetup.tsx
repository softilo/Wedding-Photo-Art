'use client';

import React, { useMemo, useRef, useState, useTransition } from 'react';
import {
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
} from '@/types/event-management';
import {
  activateEditorialGridMedia,
  ensureEditorialGridEvent,
  getAdminPortfolioEvent,
  listGalleryMedia,
  publishPortfolioEvent,
  registerPortfolioMedia,
  removeEditorialGridMedia,
  signPortfolioUpload,
  updatePortfolioEvent,
} from '@/service/catalog/catalog.service';
import {
  detectImageFormat,
  formatBytes,
  measureImageDimensions,
  uploadImageToCloudinary,
} from '@/lib/cloudinaryClientUpload';
import {
  classifyPhotoFraming,
  EDITORIAL_GRID_SLOTS,
  EditorialGridSettings,
  EditorialGridSlotKey,
  getHeroSlideThumbUrl,
  parseEditorialGridSettings,
  serializeEditorialGridDescription,
} from '@/lib/heroSlider';
import { cn } from '@/lib/utils';
import { CameraIcon, PlusIcon } from '@/components/shared/Icons';
import { StudioGalleryPickerModal } from './StudioGalleryPickerModal';

interface EditorialMosaicSetupProps {
  initialEditorialEvent: PortfolioShowcaseEvent | null;
  galleryPool: PortfolioMediaItem[];
  onGalleryPoolUpdate: (nextPool: PortfolioMediaItem[]) => void;
  studioName: string;
  onNotify: (type: 'ok' | 'err', text: string) => void;
  onEditorialEventChange?: (ev: PortfolioShowcaseEvent | null) => void;
}

interface SlotUploadState {
  fileName: string;
  progress: number;
  statusText: string;
  error?: string;
}

const PREVIEW_SPAN_CLASS: Record<EditorialGridSlotKey, string> = {
  row1WideLeft: 'col-span-8 h-24 sm:h-28',
  row1SquareRight: 'col-span-4 h-24 sm:h-28',
  row2SquareLeft: 'col-span-4 h-24 sm:h-28',
  row2WideRight: 'col-span-8 h-24 sm:h-28',
};

export function EditorialMosaicSetup({
  initialEditorialEvent,
  galleryPool,
  onGalleryPoolUpdate,
  studioName,
  onNotify,
  onEditorialEventChange,
}: EditorialMosaicSetupProps) {
  const [editorialEvent, setEditorialEvent] = useState<PortfolioShowcaseEvent | null>(
    initialEditorialEvent,
  );
  const [slotUploads, setSlotUploads] = useState<
    Partial<Record<EditorialGridSlotKey, SlotUploadState>>
  >({});
  const [dragOverSlot, setDragOverSlot] = useState<EditorialGridSlotKey | null>(null);
  const [pickerSlotKey, setPickerSlotKey] = useState<EditorialGridSlotKey | null>(null);
  const [gallerySearch, setGallerySearch] = useState('');
  const [landscapeOnly, setLandscapeOnly] = useState(false);
  const [isPending, startTransition] = useTransition();

  const editorialEventRef = useRef<PortfolioShowcaseEvent | null>(initialEditorialEvent);
  const ensurePromiseRef = useRef<Promise<PortfolioShowcaseEvent | null> | null>(null);
  const settingsMutexRef = useRef<Promise<void>>(Promise.resolve());
  const fileInputsRef = useRef<Partial<Record<EditorialGridSlotKey, HTMLInputElement | null>>>({});

  const syncEvent = (nextEvent: PortfolioShowcaseEvent | null) => {
    editorialEventRef.current = nextEvent;
    setEditorialEvent(nextEvent);
    onEditorialEventChange?.(nextEvent);
  };

  const settings = useMemo(
    () => parseEditorialGridSettings(editorialEvent?.description),
    [editorialEvent?.description],
  );

  const mediaById = useMemo(() => {
    const map = new Map<string, PortfolioMediaItem>();
    for (const m of editorialEvent?.media || []) {
      if (m.resourceType === 'IMAGE' && m.status === 'READY') {
        map.set(m.id, m);
      }
    }
    return map;
  }, [editorialEvent?.media]);

  const getOrCreateEditorialEvent = async (): Promise<PortfolioShowcaseEvent | null> => {
    if (editorialEventRef.current) return editorialEventRef.current;
    if (ensurePromiseRef.current) return ensurePromiseRef.current;

    const promise = (async () => {
      const ensured = await ensureEditorialGridEvent();
      if (!ensured.ok || !ensured.data) {
        onNotify('err', ensured.message || 'Could not initialize Showcase Bento Grid container.');
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

  const refreshEditorialEvent = async (eventId: string) => {
    const res = await getAdminPortfolioEvent(eventId);
    if (res.ok && res.data) {
      syncEvent(res.data);
      return res.data;
    }
    return editorialEventRef.current;
  };

  /**
   * Serializes settings JSON writes so simultaneous slot uploads never clobber one another.
   */
  const runWithSettingsLock = (fn: () => Promise<void>) => {
    const next = settingsMutexRef.current.then(fn, fn);
    settingsMutexRef.current = next;
    return next;
  };

  const assignMediaToSlot = async (
    eventId: string,
    slotKey: EditorialGridSlotKey,
    newMedia: PortfolioMediaItem,
  ) => {
    await runWithSettingsLock(async () => {
      const latestEvent =
        editorialEventRef.current && editorialEventRef.current.id === eventId
          ? editorialEventRef.current
          : await refreshEditorialEvent(eventId);

      const currentSettings = parseEditorialGridSettings(latestEvent?.description);
      const previousMediaId = currentSettings.slots[slotKey];

      const nextSettings: EditorialGridSettings = {
        ...currentSettings,
        slots: {
          ...currentSettings.slots,
          [slotKey]: newMedia.id,
        },
      };

      const updateRes = await updatePortfolioEvent(eventId, {
        description: serializeEditorialGridDescription(nextSettings),
      });
      if (!updateRes.ok || !updateRes.data) {
        onNotify('err', updateRes.message || 'Could not bind photo to grid frame.');
        return;
      }
      syncEvent(updateRes.data);

      // Ensure event is published cleanly before pruning any replaced custom photo
      if (updateRes.data.status !== 'PUBLISHED' || !updateRes.data.coverMediaId) {
        const pubRes = await activateEditorialGridMedia(eventId, newMedia.id, true);
        if (pubRes.ok && pubRes.data) {
          syncEvent(pubRes.data);
        }
      }

      if (previousMediaId && previousMediaId !== newMedia.id) {
        const stillUsedElsewhere = Object.entries(nextSettings.slots).some(
          ([k, id]) => k !== slotKey && id === previousMediaId,
        );
        if (!stillUsedElsewhere) {
          const cleanupRes = await removeEditorialGridMedia(eventId, previousMediaId);
          if (cleanupRes.ok && cleanupRes.data) {
            // Preserve updated settings description if cleanup returned refreshed event
            syncEvent(cleanupRes.data);
          }
        }
      }
    });
  };

  const uploadPhotoForSlot = (slotKey: EditorialGridSlotKey, file: File) => {
    const slotMeta = EDITORIAL_GRID_SLOTS.find((s) => s.key === slotKey);
    const { valid, format } = detectImageFormat(file);
    if (!valid) {
      onNotify('err', 'Please select a valid image file (JPG, PNG, WebP, AVIF, or HEIC).');
      return;
    }

    void (async () => {
      setSlotUploads((prev) => ({
        ...prev,
        [slotKey]: { fileName: file.name, progress: 5, statusText: 'Signing upload...' },
      }));

      const targetEvent = await getOrCreateEditorialEvent();
      if (!targetEvent) {
        setSlotUploads((prev) => ({
          ...prev,
          [slotKey]: {
            fileName: file.name,
            progress: 0,
            statusText: 'Failed',
            error: 'Could not initialize showcase grid.',
          },
        }));
        return;
      }

      const dims = await measureImageDimensions(file);
      const signRes = await signPortfolioUpload(targetEvent.id, {
        resourceType: 'IMAGE',
        format,
        bytes: file.size,
      });

      if (!signRes.ok || !signRes.data) {
        const msg = signRes.message || 'Could not authorize Cloudinary upload.';
        setSlotUploads((prev) => ({
          ...prev,
          [slotKey]: { fileName: file.name, progress: 0, statusText: 'Failed', error: msg },
        }));
        onNotify('err', msg);
        return;
      }

      try {
        setSlotUploads((prev) => ({
          ...prev,
          [slotKey]: { fileName: file.name, progress: 12, statusText: 'Uploading HD master...' },
        }));

        const cld = await uploadImageToCloudinary(file, signRes.data, (pct) => {
          setSlotUploads((prev) => ({
            ...prev,
            [slotKey]: { fileName: file.name, progress: pct, statusText: `${pct}%` },
          }));
        });

        setSlotUploads((prev) => ({
          ...prev,
          [slotKey]: { fileName: file.name, progress: 96, statusText: 'Applying to frame...' },
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
          caption: `${slotMeta?.aspectSummary || 'Showcase'} — ${cleanName}`,
          altText: `${studioName} — ${cleanName}`,
        });

        if (!regRes.ok || !regRes.data) {
          throw new Error(regRes.message || 'Failed to save uploaded photo.');
        }

        await assignMediaToSlot(targetEvent.id, slotKey, regRes.data.media);

        setSlotUploads((prev) => {
          const next = { ...prev };
          delete next[slotKey];
          return next;
        });
        onNotify('ok', `Updated "${slotMeta?.rowLabel}" (${slotMeta?.aspectSummary}) on homepage!`);
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Upload failed';
        setSlotUploads((prev) => ({
          ...prev,
          [slotKey]: { fileName: file.name, progress: 0, statusText: 'Failed', error: msg },
        }));
        onNotify('err', msg);
      }
    })();
  };

  const handleOpenGalleryPicker = (slotKey: EditorialGridSlotKey) => {
    const slotMeta = EDITORIAL_GRID_SLOTS.find((s) => s.key === slotKey);
    setPickerSlotKey(slotKey);
    setLandscapeOnly(slotMeta?.recommendedShape === 'wide');
    startTransition(async () => {
      const res = await listGalleryMedia('IMAGE');
      if (res.ok && res.data) {
        onGalleryPoolUpdate(res.data.data);
      }
    });
  };

  const handlePickFromGallery = (img: PortfolioMediaItem) => {
    if (!pickerSlotKey) return;
    const targetSlotKey = pickerSlotKey;
    const slotMeta = EDITORIAL_GRID_SLOTS.find((s) => s.key === targetSlotKey);

    startTransition(async () => {
      const targetEvent = await getOrCreateEditorialEvent();
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
        onNotify('err', regRes.message || 'Could not assign gallery photo to grid frame.');
        return;
      }

      await assignMediaToSlot(targetEvent.id, targetSlotKey, regRes.data.media);
      setPickerSlotKey(null);
      onNotify(
        'ok',
        `Updated "${slotMeta?.rowLabel}" (${slotMeta?.aspectSummary}) from Studio Gallery.`,
      );
    });
  };

  const handleClearSlot = (slotKey: EditorialGridSlotKey) => {
    if (!editorialEvent) return;
    const slotMeta = EDITORIAL_GRID_SLOTS.find((s) => s.key === slotKey);

    startTransition(async () => {
      await runWithSettingsLock(async () => {
        const latest = editorialEventRef.current || editorialEvent;
        const currentSettings = parseEditorialGridSettings(latest.description);
        const removedId = currentSettings.slots[slotKey];
        if (!removedId) return;

        const nextSlots = { ...currentSettings.slots };
        delete nextSlots[slotKey];
        const nextSettings: EditorialGridSettings = {
          ...currentSettings,
          slots: nextSlots,
        };

        const updateRes = await updatePortfolioEvent(latest.id, {
          description: serializeEditorialGridDescription(nextSettings),
        });
        if (!updateRes.ok || !updateRes.data) {
          onNotify('err', updateRes.message || 'Could not clear slot.');
          return;
        }
        syncEvent(updateRes.data);

        const stillUsed = Object.values(nextSlots).includes(removedId);
        if (!stillUsed) {
          const rmRes = await removeEditorialGridMedia(latest.id, removedId);
          if (rmRes.ok && rmRes.data) {
            syncEvent(rmRes.data);
          }
        }
        onNotify(
          'ok',
          `Cleared custom photo for "${slotMeta?.rowLabel}". Auto-fallback will fill the frame.`,
        );
      });
    });
  };

  const handleToggleSectionEnabled = () => {
    startTransition(async () => {
      const targetEvent = await getOrCreateEditorialEvent();
      if (!targetEvent) return;

      await runWithSettingsLock(async () => {
        const latest = editorialEventRef.current || targetEvent;
        const currentSettings = parseEditorialGridSettings(latest.description);
        const nextSettings: EditorialGridSettings = {
          ...currentSettings,
          enabled: !currentSettings.enabled,
        };
        const res = await updatePortfolioEvent(latest.id, {
          description: serializeEditorialGridDescription(nextSettings),
        });
        if (!res.ok || !res.data) {
          onNotify('err', res.message || 'Failed to update section visibility.');
          return;
        }
        let nextEvent = res.data;
        if (nextEvent.status !== 'PUBLISHED') {
          const pubRes = await publishPortfolioEvent(nextEvent.id);
          if (pubRes.ok && pubRes.data) {
            nextEvent = pubRes.data;
          } else {
            // Revert draft toggle if backend requires at least 1 photo before publishing visibility state
            const reverted: EditorialGridSettings = {
              ...nextSettings,
              enabled: currentSettings.enabled,
            };
            await updatePortfolioEvent(latest.id, {
              description: serializeEditorialGridDescription(reverted),
            });
            await refreshEditorialEvent(latest.id);
            onNotify(
              'err',
              pubRes.message ||
                'Add or keep at least 1 photo in any frame before hiding this section on homepage.',
            );
            return;
          }
        }
        syncEvent(nextEvent);
        onNotify(
          'ok',
          nextSettings.enabled
            ? 'Showcase Bento Grid is now visible on homepage.'
            : 'Showcase Bento Grid hidden from public homepage.',
        );
      });
    });
  };

  const activePickerMeta = EDITORIAL_GRID_SLOTS.find((s) => s.key === pickerSlotKey) || null;
  const pickerExistingPublicIds = useMemo(() => {
    const id = pickerSlotKey ? settings.slots[pickerSlotKey] : undefined;
    const media = id ? mediaById.get(id) : undefined;
    return media ? new Set([media.publicId]) : new Set<string>();
  }, [pickerSlotKey, settings.slots, mediaById]);

  const customSlotCount = EDITORIAL_GRID_SLOTS.filter((slot) => {
    const mid = settings.slots[slot.key];
    return Boolean(mid && mediaById.has(mid));
  }).length;

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: 4 Categorized Photo Slots */}
        <div className="lg:col-span-7 grid gap-4 sm:grid-cols-2 min-w-0">
          {EDITORIAL_GRID_SLOTS.map((slot) => {
            const mediaId = settings.slots[slot.key];
            const media = mediaId ? mediaById.get(mediaId) : undefined;
            const uploadState = slotUploads[slot.key];
            const framing = media ? classifyPhotoFraming(media.width, media.height) : null;

            return (
              <div
                key={slot.key}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragOverSlot(slot.key);
                }}
                onDragLeave={() => setDragOverSlot(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragOverSlot(null);
                  const dropped = e.dataTransfer.files?.[0];
                  if (dropped) {
                    uploadPhotoForSlot(slot.key, dropped);
                  }
                }}
                className={cn(
                  'admin-card p-4 flex flex-col justify-between gap-3 transition-all',
                  dragOverSlot === slot.key &&
                    'ring-2 ring-[var(--admin-accent)] bg-[var(--admin-accent-soft)]',
                )}
              >
                <input
                  ref={(el) => {
                    fileInputsRef.current[slot.key] = el;
                  }}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
                  onChange={(e) => {
                    const selected = e.target.files?.[0];
                    if (selected) {
                      uploadPhotoForSlot(slot.key, selected);
                      e.target.value = '';
                    }
                  }}
                  className="hidden"
                />

                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--admin-accent-soft)] border border-[var(--admin-accent)]/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[var(--admin-accent)]">
                        #{slot.order} • {slot.rowLabel}
                      </span>
                      <h3 className="admin-section-title mt-1.5">{slot.title}</h3>
                      <p className="text-[11px] text-[var(--admin-muted)]">{slot.orientationHint}</p>
                    </div>
                    {media && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleClearSlot(slot.key)}
                        className="rounded-lg border border-rose-200 bg-rose-50/70 px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-100 cursor-pointer shrink-0"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  {/* Frame Image Preview */}
                  <div
                    onClick={() => fileInputsRef.current[slot.key]?.click()}
                    className={cn(
                      'relative overflow-hidden rounded-xl border border-[var(--admin-border)] bg-[#14120E] cursor-pointer group',
                      slot.recommendedShape === 'wide' ? 'aspect-[16/9]' : 'aspect-[4/3]',
                    )}
                  >
                    {media ? (
                      <>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getHeroSlideThumbUrl(media)}
                          alt={media.altText || slot.aspectSummary}
                          className="w-full h-full object-cover object-center transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent p-2.5 flex items-center justify-between text-[10px] text-white">
                          <span className="font-mono-code">
                            {media.width && media.height
                              ? `${media.width}×${media.height}`
                              : media.format.toUpperCase()}{' '}
                            • {formatBytes(media.bytes)}
                          </span>
                          {framing && (
                            <span className="font-semibold text-[#E7D1AA]">
                              {framing.isLandscape ? 'Landscape' : 'Portrait'}
                            </span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center p-4 text-center bg-[var(--admin-surface-subtle)] border-dashed">
                        <PlusIcon className="w-5 h-5 text-[var(--admin-accent)] mb-1" />
                        <p className="text-xs font-semibold text-[var(--admin-text)]">
                          Drop image or browse
                        </p>
                        <p className="text-[10.5px] text-[var(--admin-muted)] mt-0.5">
                          Currently showing auto-fallback photo on public page
                        </p>
                      </div>
                    )}
                  </div>

                  {uploadState && (
                    <div className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-2 space-y-1 text-[11px]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium text-[var(--admin-text)]">
                          {uploadState.fileName}
                        </span>
                        <span
                          className={cn(
                            'font-semibold shrink-0',
                            uploadState.error ? 'text-rose-500' : 'text-[var(--admin-accent)]',
                          )}
                        >
                          {uploadState.statusText}
                        </span>
                      </div>
                      <div className="h-1.5 w-full rounded-full bg-[var(--admin-border)] overflow-hidden">
                        <div
                          className={cn(
                            'h-full transition-all duration-200',
                            uploadState.error ? 'bg-rose-500' : 'bg-[var(--admin-accent)]',
                          )}
                          style={{ width: `${uploadState.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => fileInputsRef.current[slot.key]?.click()}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-3 py-2 text-xs font-semibold text-[var(--admin-accent-fg)] hover:opacity-95 transition-opacity cursor-pointer"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>{media ? 'Replace Photo' : 'Upload Photo'}</span>
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleOpenGalleryPicker(slot.key)}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
                  >
                    <CameraIcon className="w-3.5 h-3.5 text-[var(--admin-accent)]" />
                    <span>From Gallery</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* RIGHT COLUMN: Interactive Bento Layout Blueprint + Section Visibility */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20 min-w-0">
          <div className="admin-card p-4 sm:p-5 space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="admin-section-title">Live Section Blueprint Preview</h2>
                <p className="text-[11px] text-[var(--admin-muted)] mt-0.5">
                  Mirrors your exact homepage 2-row asymmetric layout. Tap any frame to change its
                  photo.
                </p>
              </div>
              <span className="rounded-full bg-[var(--admin-accent-soft)] px-2.5 py-0.5 font-mono-code text-[11px] font-semibold text-[var(--admin-accent)] shrink-0">
                {customSlotCount}/4 Custom
              </span>
            </div>

            <div className="rounded-xl border border-[var(--admin-border)] bg-[#F9F8F5] p-3">
              <div className="grid grid-cols-12 gap-2">
                {EDITORIAL_GRID_SLOTS.map((slot) => {
                  const mediaId = settings.slots[slot.key];
                  const media = mediaId ? mediaById.get(mediaId) : undefined;
                  return (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => handleOpenGalleryPicker(slot.key)}
                      title={`Pick photo for ${slot.rowLabel}`}
                      className={cn(
                        PREVIEW_SPAN_CLASS[slot.key],
                        'relative overflow-hidden rounded-lg border transition-all group cursor-pointer',
                        media
                          ? 'border-black/10 bg-[#14120E]'
                          : 'border-dashed border-[#CAA650]/65 bg-[#F3EFE6] hover:border-[#8B6A21]',
                      )}
                    >
                      {media ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={getHeroSlideThumbUrl(media)}
                          alt={slot.aspectSummary}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="h-full w-full flex flex-col items-center justify-center p-1 text-center">
                          <span className="font-mono-code text-[10px] font-bold text-[#7A5E21]">
                            #{slot.order} Auto
                          </span>
                          <span className="text-[9.5px] text-[#4A4438]">
                            {slot.recommendedShape === 'wide' ? 'Wide' : 'Square'}
                          </span>
                        </div>
                      )}
                      <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 font-mono-code text-[9.5px] font-bold text-[#E7D1AA]">
                        #{slot.order}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-surface-subtle)] p-3.5 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-semibold text-[var(--admin-text)]">
                  Show Showcase Bento Section on Homepage
                </p>
                <p className="text-[11px] text-[var(--admin-muted)] mt-0.5">
                  {settings.enabled
                    ? 'Active directly below the Studio Intro band.'
                    : 'Currently hidden from public visitors.'}
                </p>
              </div>
              <button
                type="button"
                disabled={isPending}
                onClick={handleToggleSectionEnabled}
                className={cn(
                  'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer shrink-0',
                  settings.enabled
                    ? 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    : 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100',
                )}
              >
                {settings.enabled ? 'Visible ✓' : 'Hidden'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <StudioGalleryPickerModal
        open={Boolean(pickerSlotKey)}
        onClose={() => setPickerSlotKey(null)}
        title={
          activePickerMeta
            ? `Choose Photo for #${activePickerMeta.order} (${activePickerMeta.rowLabel})`
            : 'Choose Gallery Photo'
        }
        subtitle={
          activePickerMeta
            ? `${activePickerMeta.aspectSummary} • ${activePickerMeta.orientationHint}`
            : 'Click any photo below to place it directly into this layout frame.'
        }
        actionLabel="Use in Frame"
        activeLabel="Selected"
        galleryImages={galleryPool}
        activePublicIds={pickerExistingPublicIds}
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
