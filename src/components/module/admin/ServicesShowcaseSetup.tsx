'use client';

import React, { useMemo, useRef, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  AdminServicesResponse,
  PortfolioMediaItem,
} from '@/types/event-management';
import { listGalleryMedia } from '@/service/catalog/catalog.service';
import {
  resetServicesDefaults,
  SaveServiceItemPayload,
  saveServicesShowcaseBulk,
  signServiceUpload,
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
} from '@/components/shared/Icons';
import { StudioGalleryPickerModal } from './StudioGalleryPickerModal';

interface ServicesShowcaseSetupProps {
  initialServicesData: AdminServicesResponse | null;
  galleryPool: PortfolioMediaItem[];
  onGalleryPoolUpdate: (nextPool: PortfolioMediaItem[]) => void;
  studioName: string;
  onNotify: (type: 'ok' | 'err', text: string) => void;
  onServicesDataChange?: (data: AdminServicesResponse) => void;
}

interface EditableServiceItem {
  localKey: string;
  id?: string;
  title: string;
  description: string;
  imageUrl: string | null;
  imageAssetId: string | null;
  imagePublicId: string | null;
  imageFormat: string | null;
  imageBytes: number | null;
  imageWidth: number | null;
  imageHeight: number | null;
  imageVersion: number | null;
  imageResponseSignature: string | null;
  showOnHome: boolean;
  isActive: boolean;
}

interface ItemUploadState {
  progress: number;
  statusText: string;
}

function mapResponseToItems(data: AdminServicesResponse | null): EditableServiceItem[] {
  return (data?.items || []).map((item) => ({
    localKey: item.id,
    id: item.id,
    title: item.title,
    description: item.description,
    imageUrl: item.imageUrl,
    imageAssetId: item.imageAssetId,
    imagePublicId: item.imagePublicId,
    imageFormat: item.imageFormat,
    imageBytes: item.imageBytes,
    imageWidth: item.imageWidth,
    imageHeight: item.imageHeight,
    imageVersion: null,
    imageResponseSignature: null,
    showOnHome: item.showOnHome,
    isActive: item.isActive,
  }));
}

function toSavePayload(items: EditableServiceItem[]): SaveServiceItemPayload[] {
  return items.map((item) => ({
    id: item.id,
    title: item.title.trim(),
    description: item.description.trim(),
    imageUrl: item.imageUrl,
    imageAssetId: item.imageAssetId,
    imagePublicId: item.imagePublicId,
    imageFormat: item.imageFormat,
    imageBytes: item.imageBytes,
    imageWidth: item.imageWidth,
    imageHeight: item.imageHeight,
    imageVersion: item.imageVersion,
    imageResponseSignature: item.imageResponseSignature,
    showOnHome: item.showOnHome,
    isActive: item.isActive,
  }));
}

export function ServicesShowcaseSetup({
  initialServicesData,
  galleryPool,
  onGalleryPoolUpdate,
  studioName,
  onNotify,
  onServicesDataChange,
}: ServicesShowcaseSetupProps) {
  const [savedData, setSavedData] = useState<AdminServicesResponse | null>(initialServicesData);
  const [enabled, setEnabled] = useState<boolean>(initialServicesData?.enabled ?? true);
  const [items, setItems] = useState<EditableServiceItem[]>(() =>
    mapResponseToItems(initialServicesData),
  );
  const [itemUploads, setItemUploads] = useState<Record<string, ItemUploadState>>({});
  const [pickerItemKey, setPickerItemKey] = useState<string | null>(null);
  const [gallerySearch, setGallerySearch] = useState('');
  const [landscapeOnly, setLandscapeOnly] = useState(true);
  const [isPending, startTransition] = useTransition();

  const fileInputsRef = useRef<Record<string, HTMLInputElement | null>>({});

  const applyServerSnapshot = (nextData: AdminServicesResponse) => {
    setSavedData(nextData);
    setEnabled(nextData.enabled);
    setItems(mapResponseToItems(nextData));
    onServicesDataChange?.(nextData);
  };

  const hasUnsavedChanges = useMemo(() => {
    const savedEnabled = savedData?.enabled ?? true;
    if (enabled !== savedEnabled) return true;
    const savedMapped = mapResponseToItems(savedData);
    return JSON.stringify(toSavePayload(items)) !== JSON.stringify(toSavePayload(savedMapped));
  }, [enabled, items, savedData]);

  const persistAll = async (
    nextEnabled: boolean,
    nextItems: EditableServiceItem[],
    successMessage: string,
  ): Promise<boolean> => {
    const valid = nextItems.filter((it) => it.title.trim().length > 0);
    if (valid.length === 0) {
      onNotify('err', 'Keep at least one service with a title before saving.');
      return false;
    }

    const res = await saveServicesShowcaseBulk({
      enabled: nextEnabled,
      items: toSavePayload(valid),
    });
    if (!res.ok || !res.data) {
      onNotify('err', res.message || 'Could not save services to database.');
      return false;
    }
    applyServerSnapshot(res.data);
    onNotify('ok', successMessage);
    return true;
  };

  const handleSaveAll = () => {
    startTransition(async () => {
      await persistAll(enabled, items, 'Services showcase saved to database and published!');
    });
  };

  const handleToggleSectionEnabled = () => {
    const nextEnabled = !enabled;
    setEnabled(nextEnabled);
    startTransition(async () => {
      await persistAll(
        nextEnabled,
        items,
        nextEnabled
          ? 'Services Showcase section is now visible on homepage.'
          : 'Services Showcase section hidden from homepage.',
      );
    });
  };

  const handleAddService = () => {
    const newItem: EditableServiceItem = {
      localKey: `new-srv-${Date.now().toString(36)}`,
      title: 'New Photography Service',
      description: `Bespoke photography and storytelling tailored to your celebration by ${studioName}.`,
      imageUrl: null,
      imageAssetId: null,
      imagePublicId: null,
      imageFormat: null,
      imageBytes: null,
      imageWidth: null,
      imageHeight: null,
      imageVersion: null,
      imageResponseSignature: null,
      showOnHome: items.filter((i) => i.showOnHome && i.isActive).length < 3,
      isActive: true,
    };
    setItems((prev) => [newItem, ...prev]);
  };

  const updateItemField = <K extends keyof EditableServiceItem>(
    localKey: string,
    field: K,
    value: EditableServiceItem[K],
  ) => {
    setItems((prev) =>
      prev.map((item) => (item.localKey === localKey ? { ...item, [field]: value } : item)),
    );
  };

  const moveItem = (idx: number, delta: -1 | 1) => {
    const targetIdx = idx + delta;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    setItems((prev) => {
      const next = [...prev];
      const [moved] = next.splice(idx, 1);
      if (moved) next.splice(targetIdx, 0, moved);
      return next;
    });
  };

  const removeServiceItem = (localKey: string) => {
    if (items.length <= 1) {
      onNotify('err', 'Keep at least 1 service card or hide the section instead.');
      return;
    }
    const nextItems = items.filter((i) => i.localKey !== localKey);
    setItems(nextItems);
    startTransition(async () => {
      await persistAll(enabled, nextItems, 'Service removed from database.');
    });
  };

  const handleUploadPhoto = (localKey: string, file: File) => {
    const { valid, format } = detectImageFormat(file);
    if (!valid) {
      onNotify('err', 'Please select a valid image file (JPG, PNG, WebP, AVIF, or HEIC).');
      return;
    }

    const itemMeta = items.find((i) => i.localKey === localKey);

    void (async () => {
      setItemUploads((prev) => ({
        ...prev,
        [localKey]: { progress: 12, statusText: 'Signing upload...' },
      }));

      try {
        const [dims, signRes] = await Promise.all([
          measureImageDimensions(file),
          signServiceUpload({ format, bytes: file.size }),
        ]);

        if (!signRes.ok || !signRes.data) {
          onNotify('err', signRes.message || 'Could not authorize Cloudinary upload.');
          return;
        }

        const cld = await uploadImageToCloudinary(file, signRes.data, (pct) => {
          setItemUploads((prev) => ({
            ...prev,
            [localKey]: { progress: pct, statusText: `${pct}%` },
          }));
        });

        setItemUploads((prev) => ({
          ...prev,
          [localKey]: { progress: 96, statusText: 'Saving...' },
        }));

        const nextItems = items.map((item) =>
          item.localKey === localKey
            ? {
                ...item,
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
            : item,
        );
        setItems(nextItems);
        await persistAll(
          enabled,
          nextItems,
          `Uploaded isolated service photo for "${itemMeta?.title || 'Service'}".`,
        );
      } catch (err) {
        onNotify('err', err instanceof Error ? err.message : 'Service photo upload failed.');
      } finally {
        setItemUploads((prev) => {
          const next = { ...prev };
          delete next[localKey];
          return next;
        });
      }
    })();
  };

  const handleOpenPicker = (localKey: string) => {
    setPickerItemKey(localKey);
    startTransition(async () => {
      const res = await listGalleryMedia('IMAGE');
      if (res.ok && res.data) {
        onGalleryPoolUpdate(res.data.data);
      }
    });
  };

  const handlePickFromGallery = (img: PortfolioMediaItem) => {
    if (!pickerItemKey) return;
    const targetKey = pickerItemKey;
    const targetItem = items.find((i) => i.localKey === targetKey);
    const nextItems = items.map((item) =>
      item.localKey === targetKey
        ? {
            ...item,
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
        : item,
    );
    setItems(nextItems);
    setPickerItemKey(null);
    startTransition(async () => {
      await persistAll(
        enabled,
        nextItems,
        `Updated cover photo for "${targetItem?.title || 'Service'}".`,
      );
    });
  };

  const handleClearPhoto = (localKey: string) => {
    const target = items.find((i) => i.localKey === localKey);
    if (!target?.imageUrl) return;
    const nextItems = items.map((item) =>
      item.localKey === localKey
        ? {
            ...item,
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
        : item,
    );
    setItems(nextItems);
    startTransition(async () => {
      await persistAll(
        enabled,
        nextItems,
        `Cleared cover photo for "${target.title}".`,
      );
    });
  };

  const handleRestoreDefaults = () => {
    startTransition(async () => {
      const res = await resetServicesDefaults();
      if (!res.ok || !res.data) {
        onNotify('err', res.message || 'Unable to reset default services.');
        return;
      }
      applyServerSnapshot(res.data);
      onNotify('ok', 'Restored default 6 wedding services in database.');
    });
  };

  const homeFeaturedKeys = useMemo(() => {
    const active = items.filter((i) => i.isActive);
    const chosen = active.filter((i) => i.showOnHome);
    return new Set((chosen.length > 0 ? chosen : active).slice(0, 3).map((i) => i.localKey));
  }, [items]);

  const pickerPublicIds = useMemo(() => {
    const set = new Set<string>();
    const currentItem = items.find((i) => i.localKey === pickerItemKey);
    if (currentItem?.imagePublicId) set.add(currentItem.imagePublicId);
    return set;
  }, [items, pickerItemKey]);

  return (
    <div className="space-y-5">
      {/* Section Header & Top Controls */}
      <div className="admin-card p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="admin-section-title text-[15px] sm:text-base">
              Studio Services Cards
            </h2>
            <span
              className={cn(
                'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
                enabled
                  ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                  : 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
              )}
            >
              {enabled ? `${homeFeaturedKeys.size} on Homepage` : 'Hidden'}
            </span>
          </div>
          <p className="admin-meta">
            Top 3 featured services appear on your homepage, with the full catalog at{' '}
            <span className="font-mono-code">/all-services</span>.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Link
            href="/all-services"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 sm:py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors"
          >
            <span>Preview /all-services</span>
            <ExternalLinkIcon className="w-3.5 h-3.5" />
          </Link>

          <button
            type="button"
            disabled={isPending}
            onClick={handleToggleSectionEnabled}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3 py-1.5 sm:py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
          >
            {enabled ? 'Hide Section' : 'Show Section'}
          </button>

          <button
            type="button"
            onClick={handleAddService}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-accent)]/45 bg-[var(--admin-accent-soft)] px-3 py-1.5 sm:py-2 text-xs font-semibold text-[var(--admin-accent)] hover:opacity-90 transition-opacity cursor-pointer"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            <span>Add Service</span>
          </button>

          <button
            type="button"
            disabled={isPending || !hasUnsavedChanges}
            onClick={handleSaveAll}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-xl px-4 py-1.5 sm:py-2 text-xs font-semibold transition-opacity',
              hasUnsavedChanges
                ? 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)] shadow-xs hover:opacity-95 cursor-pointer'
                : 'border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] text-[var(--admin-muted)] cursor-default',
            )}
          >
            {isPending ? 'Saving...' : hasUnsavedChanges ? 'Save Services' : 'Saved ✓'}
          </button>
        </div>
      </div>

      {/* Editable Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item, idx) => {
          const thumbUrl = item.imageUrl
            ? buildCloudinaryImageUrl(item.imageUrl, {
                width: 640,
                height: 440,
                crop: 'fill',
                quality: 'auto',
              })
            : null;
          const uploadState = itemUploads[item.localKey];
          const isFeaturedHome = homeFeaturedKeys.has(item.localKey);

          return (
            <div
              key={item.localKey}
              className={cn(
                'admin-card p-4 flex flex-col justify-between gap-3.5',
                !item.isActive && 'opacity-65',
              )}
            >
              <div className="space-y-3">
                <div className="relative aspect-[3/2] w-full rounded-xl overflow-hidden border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)]">
                  <input
                    ref={(el) => {
                      fileInputsRef.current[item.localKey] = el;
                    }}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleUploadPhoto(item.localKey, f);
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
                        Upload Service Photo
                      </span>
                    </div>
                  )}

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

                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => fileInputsRef.current[item.localKey]?.click()}
                    className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                  >
                    {thumbUrl ? 'Replace Photo' : 'Upload Photo'}
                  </button>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => handleOpenPicker(item.localKey)}
                    className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1.5 text-[11px] font-semibold text-[var(--admin-accent)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
                  >
                    Pick Gallery
                  </button>
                  {item.imageUrl && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleClearPhoto(item.localKey)}
                      className="rounded-lg px-2 py-1.5 text-[11px] font-medium text-rose-500 hover:bg-rose-500/10 cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                      Service Title
                    </label>
                    <input
                      type="text"
                      value={item.title}
                      maxLength={120}
                      onChange={(e) => updateItemField(item.localKey, 'title', e.target.value)}
                      placeholder="e.g. Wedding Photography"
                      className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-2 text-xs sm:text-sm font-semibold text-[var(--admin-text)] focus:outline-none focus:border-[var(--admin-accent)]"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold uppercase tracking-wider text-[var(--admin-muted)] mb-1">
                      Description
                    </label>
                    <textarea
                      rows={3}
                      value={item.description}
                      maxLength={600}
                      onChange={(e) =>
                        updateItemField(item.localKey, 'description', e.target.value)
                      }
                      placeholder="Describe what families & couples receive with this service..."
                      className="w-full rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-2 text-xs text-[var(--admin-text)] leading-relaxed focus:outline-none focus:border-[var(--admin-accent)] resize-none"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-2.5 border-t border-[var(--admin-border-subtle)] flex items-center justify-between gap-2 text-[11px]">
                <div className="flex items-center gap-3">
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--admin-text)] font-medium">
                    <input
                      type="checkbox"
                      checked={item.showOnHome}
                      onChange={(e) =>
                        updateItemField(item.localKey, 'showOnHome', e.target.checked)
                      }
                      className="h-3.5 w-3.5 accent-[var(--admin-accent)]"
                    />
                    <span>Show on Home</span>
                  </label>
                  <label className="inline-flex items-center gap-1.5 cursor-pointer text-[var(--admin-muted)] font-medium">
                    <input
                      type="checkbox"
                      checked={item.isActive}
                      onChange={(e) =>
                        updateItemField(item.localKey, 'isActive', e.target.checked)
                      }
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
                    disabled={idx === items.length - 1}
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
                    onClick={() => removeServiceItem(item.localKey)}
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
        open={pickerItemKey !== null}
        onClose={() => setPickerItemKey(null)}
        title="Pick Existing Gallery Photo"
        subtitle="Optionally reuse an existing Studio Gallery image (prefer Upload Photo above for isolated service covers)."
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
