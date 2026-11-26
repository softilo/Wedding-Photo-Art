'use client';

import React, { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import {
  AdminAboutTeamResponse,
  AdminServicesResponse,
  CloudinaryStatusSummary,
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
} from '@/types/event-management';
import {
  activateHeroSliderMedia,
  ensureHeroSliderEvent,
  getAdminPortfolioEvent,
  listGalleryMedia,
  registerPortfolioMedia,
  removeHeroSliderMedia,
  reorderPortfolioMedia,
  signPortfolioUpload,
  unpublishPortfolioEvent,
  updatePortfolioEvent,
  updatePortfolioMedia,
} from '@/service/catalog/catalog.service';
import {
  classifyPhotoFraming,
  getHeroSlideImageUrl,
  getHeroSlideSrcSet,
  getHeroSlideThumbUrl,
  HeroColumnCount,
  HeroSlideSpeed,
  HeroSliderSettings,
  parseHeroSliderSettings,
  serializeHeroSliderDescription,
} from '@/lib/heroSlider';
import {
  detectImageFormat,
  formatBytes,
  measureImageDimensions,
  uploadImageToCloudinary,
} from '@/lib/cloudinaryClientUpload';
import { cn, formatLocalDate } from '@/lib/utils';
import {
  CameraIcon,
  ExternalLinkIcon,
  GalleryHorizontalIcon,
  LayersIcon,
  PlusIcon,
} from '@/components/shared/Icons';
import { AboutTeamSetup } from './AboutTeamSetup';
import { ServicesShowcaseSetup } from './ServicesShowcaseSetup';
import { StudioGalleryPickerModal } from './StudioGalleryPickerModal';

type SetupSectionTab = 'hero' | 'services' | 'about';

interface HeroSliderManagerProps {
  initialHeroEvent: PortfolioShowcaseEvent | null;
  initialServicesData?: AdminServicesResponse | null;
  initialAboutTeamData?: AdminAboutTeamResponse | null;
  galleryImages: PortfolioMediaItem[];
  cloudinaryStatus: CloudinaryStatusSummary | null;
  studioName: string;
}

interface UploadQueueItem {
  localId: string;
  file: File;
  format: string;
  measuredWidth?: number;
  measuredHeight?: number;
  progress: number;
  state: 'SIGNING' | 'UPLOADING' | 'REGISTERING' | 'DONE' | 'FAILED';
  errorMessage?: string;
  cloudinaryResult?: {
    asset_id: string;
    public_id: string;
    secure_url: string;
    format: string;
    bytes: number;
    width?: number;
    height?: number;
    version?: number;
    signature?: string;
  };
}

const SPEED_OPTIONS: Array<{ value: HeroSlideSpeed; label: string; hint: string }> = [
  { value: 3000, label: '3.0s', hint: 'Fast' },
  { value: 4500, label: '4.5s', hint: 'Classic' },
  { value: 6000, label: '6.0s', hint: 'Cinema' },
  { value: 8000, label: '8.0s', hint: 'Gentle' },
];

export function HeroSliderManager({
  initialHeroEvent,
  initialServicesData = null,
  initialAboutTeamData = null,
  galleryImages,
  cloudinaryStatus,
  studioName,
}: HeroSliderManagerProps) {
  const [activeTab, setActiveTab] = useState<SetupSectionTab>('hero');
  const [heroEvent, setHeroEvent] = useState<PortfolioShowcaseEvent | null>(initialHeroEvent);
  const [servicesDataState, setServicesDataState] = useState<AdminServicesResponse | null>(
    initialServicesData,
  );
  const [aboutTeamDataState, setAboutTeamDataState] = useState<AdminAboutTeamResponse | null>(
    initialAboutTeamData,
  );
  const [galleryPool, setGalleryPool] = useState<PortfolioMediaItem[]>(galleryImages);
  const [settingsDraft, setSettingsDraft] = useState<HeroSliderSettings>(() =>
    parseHeroSliderSettings(initialHeroEvent?.description),
  );
  const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [showGalleryPicker, setShowGalleryPicker] = useState(false);
  const [gallerySearch, setGallerySearch] = useState('');
  const [landscapeOnlyFilter, setLandscapeOnlyFilter] = useState(false);
  const [altDrafts, setAltDrafts] = useState<Record<string, string>>({});
  const [previewViewport, setPreviewViewport] = useState<'desktop' | 'tablet' | 'mobile'>('desktop');
  const [previewIndex, setPreviewIndex] = useState(0);
  const [previewPaused, setPreviewPaused] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const heroEventRef = useRef<PortfolioShowcaseEvent | null>(initialHeroEvent);
  const ensureHeroPromiseRef = useRef<Promise<PortfolioShowcaseEvent | null> | null>(null);

  const syncHeroEventState = (nextEvent: PortfolioShowcaseEvent | null) => {
    heroEventRef.current = nextEvent;
    setHeroEvent(nextEvent);
    if (nextEvent) {
      setSettingsDraft(parseHeroSliderSettings(nextEvent.description));
    }
  };

  const notify = (type: 'ok' | 'err', text: string) => setFeedback({ type, text });

  const orderedSlides = useMemo(() => {
    return [...(heroEvent?.media || [])]
      .filter((m) => m.resourceType === 'IMAGE')
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
  }, [heroEvent]);

  const hiddenSet = useMemo(
    () => new Set(settingsDraft.hiddenMediaIds),
    [settingsDraft.hiddenMediaIds],
  );

  const visibleReadySlides = useMemo(
    () =>
      orderedSlides.filter(
        (m) => m.status === 'READY' && Boolean(m.secureUrl) && !hiddenSet.has(m.id),
      ),
    [orderedSlides, hiddenSet],
  );

  const existingHeroPublicIds = useMemo(
    () => new Set(orderedSlides.map((m) => m.publicId)),
    [orderedSlides],
  );

  const previewSlots =
    previewViewport === 'desktop'
      ? settingsDraft.desktopColumns
      : previewViewport === 'tablet'
        ? settingsDraft.tabletColumns
        : settingsDraft.mobileColumns;
  const totalPreviewPages =
    visibleReadySlides.length <= previewSlots
      ? visibleReadySlides.length > 0
        ? 1
        : 0
      : Math.ceil(visibleReadySlides.length / previewSlots);
  const safePreviewPage =
    totalPreviewPages > 0 ? previewIndex % totalPreviewPages : 0;
  const previewSlides =
    visibleReadySlides.length === 0
      ? []
      : visibleReadySlides.length <= previewSlots
        ? visibleReadySlides
        : Array.from(
            { length: previewSlots },
            (_, k) =>
              visibleReadySlides[
                (safePreviewPage * previewSlots + k) % visibleReadySlides.length
              ],
          );

  useEffect(() => {
    if (totalPreviewPages <= 1 || previewPaused) return undefined;
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setPreviewIndex((prev) => (prev + 1) % totalPreviewPages);
    }, settingsDraft.autoPlayMs);

    return () => window.clearInterval(timer);
  }, [totalPreviewPages, previewPaused, settingsDraft.autoPlayMs]);

  const refreshHeroEvent = async (eventId: string) => {
    const res = await getAdminPortfolioEvent(eventId);
    if (res.ok && res.data) {
      syncHeroEventState(res.data);
      return res.data;
    }
    return heroEventRef.current;
  };

  const getOrCreateHeroEvent = async (): Promise<PortfolioShowcaseEvent | null> => {
    if (heroEventRef.current) return heroEventRef.current;
    if (ensureHeroPromiseRef.current) return ensureHeroPromiseRef.current;

    const promise = (async () => {
      const ensured = await ensureHeroSliderEvent();
      if (!ensured.ok || !ensured.data) {
        notify('err', ensured.message || 'Could not initialize hero slideshow container.');
        return null;
      }
      syncHeroEventState(ensured.data);
      return ensured.data;
    })();

    ensureHeroPromiseRef.current = promise;
    try {
      return await promise;
    } finally {
      ensureHeroPromiseRef.current = null;
    }
  };

  const updateQueueItem = (localId: string, patch: Partial<UploadQueueItem>) => {
    setUploadQueue((prev) =>
      prev.map((q) => (q.localId === localId ? { ...q, ...patch } : q)),
    );
  };

  const processSingleUpload = async (item: UploadQueueItem) => {
    const targetEvent = await getOrCreateHeroEvent();
    if (!targetEvent) {
      updateQueueItem(item.localId, {
        state: 'FAILED',
        errorMessage: 'Failed to initialize hero slideshow record.',
      });
      return;
    }

    let cld = item.cloudinaryResult;
    if (!cld) {
      updateQueueItem(item.localId, { state: 'SIGNING', progress: 5, errorMessage: undefined });
      const signRes = await signPortfolioUpload(targetEvent.id, {
        resourceType: 'IMAGE',
        format: item.format,
        bytes: item.file.size,
      });

      if (!signRes.ok || !signRes.data) {
        updateQueueItem(item.localId, {
          state: 'FAILED',
          errorMessage:
            signRes.message ||
            'Could not authorize Cloudinary upload. Check backend Cloudinary environment variables.',
        });
        return;
      }

      updateQueueItem(item.localId, { state: 'UPLOADING', progress: 12 });

      try {
        cld = await uploadImageToCloudinary(item.file, signRes.data, (pct) => {
          updateQueueItem(item.localId, { progress: pct });
        });

        updateQueueItem(item.localId, {
          cloudinaryResult: cld,
          state: 'REGISTERING',
          progress: 96,
        });
      } catch (err) {
        updateQueueItem(item.localId, {
          state: 'FAILED',
          errorMessage: err instanceof Error ? err.message : 'Upload failed',
        });
        return;
      }
    } else {
      updateQueueItem(item.localId, {
        state: 'REGISTERING',
        progress: 96,
        errorMessage: undefined,
      });
    }

    const cleanName = item.file.name.replace(/\.[^/.]+$/, '');
    const regRes = await registerPortfolioMedia(targetEvent.id, {
      assetId: cld.asset_id,
      publicId: cld.public_id,
      resourceType: 'IMAGE',
      format: cld.format || item.format,
      secureUrl: cld.secure_url,
      bytes: cld.bytes || item.file.size,
      width: cld.width ?? item.measuredWidth,
      height: cld.height ?? item.measuredHeight,
      status: 'READY',
      version: cld.version,
      responseSignature: cld.signature,
      caption: cleanName,
      altText: `${studioName} — ${cleanName}`,
    });

    if (!regRes.ok || !regRes.data) {
      updateQueueItem(item.localId, {
        state: 'FAILED',
        errorMessage: regRes.message || 'Failed to save uploaded photo.',
      });
      return;
    }

    const currentLatest = heroEventRef.current ?? targetEvent;
    if (currentLatest.status !== 'PUBLISHED' || !currentLatest.coverMediaId) {
      const pubRes = await activateHeroSliderMedia(targetEvent.id, regRes.data.media.id, true);
      if (pubRes.ok && pubRes.data) {
        syncHeroEventState(pubRes.data);
      } else {
        await refreshHeroEvent(targetEvent.id);
      }
    } else {
      await refreshHeroEvent(targetEvent.id);
    }

    updateQueueItem(item.localId, { state: 'DONE', progress: 100 });
  };

  const enqueueFilesForUpload = (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (fileArray.length === 0) return;

    void (async () => {
      const validItems: UploadQueueItem[] = [];
      let rejectedCount = 0;

      for (let idx = 0; idx < fileArray.length; idx += 1) {
        const file = fileArray[idx];
        const { valid, format } = detectImageFormat(file);
        if (!valid) {
          rejectedCount += 1;
          continue;
        }
        const dims = await measureImageDimensions(file);
        validItems.push({
          localId: `${Date.now()}-${idx}-${file.name}`,
          file,
          format,
          measuredWidth: dims.width,
          measuredHeight: dims.height,
          progress: 0,
          state: 'SIGNING',
        });
      }

      if (rejectedCount > 0) {
        notify(
          'err',
          `${rejectedCount} non-image file(s) skipped. Hero slideshow supports photos only (JPG, PNG, WebP, AVIF, HEIC).`,
        );
      }

      if (validItems.length === 0) return;
      setUploadQueue((prev) => [...validItems, ...prev]);

      await getOrCreateHeroEvent();
      for (const item of validItems) {
        void processSingleUpload(item);
      }
    })();
  };

  const handleAttachGalleryImage = (img: PortfolioMediaItem) => {
    startTransition(async () => {
      const targetEvent = await getOrCreateHeroEvent();
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
        notify('err', regRes.message || 'Could not add gallery photo to Hero slider.');
        return;
      }

      if (targetEvent.status !== 'PUBLISHED' || !targetEvent.coverMediaId) {
        const pubRes = await activateHeroSliderMedia(targetEvent.id, regRes.data.media.id, true);
        if (pubRes.ok && pubRes.data) {
          syncHeroEventState(pubRes.data);
        } else {
          await refreshHeroEvent(targetEvent.id);
        }
      } else {
        await refreshHeroEvent(targetEvent.id);
      }

      notify('ok', 'Added photo from Studio Gallery to Homepage Hero.');
    });
  };

  const handleOpenGalleryPicker = () => {
    setShowGalleryPicker(true);
    startTransition(async () => {
      const res = await listGalleryMedia('IMAGE');
      if (res.ok && res.data) {
        setGalleryPool(res.data.data);
      }
    });
  };

  const persistSettings = (nextSettings: HeroSliderSettings, successText: string) => {
    startTransition(async () => {
      const targetEvent = await getOrCreateHeroEvent();
      if (!targetEvent) return;

      const res = await updatePortfolioEvent(targetEvent.id, {
        description: serializeHeroSliderDescription(nextSettings),
      });
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to save hero slideshow settings.');
        return;
      }
      syncHeroEventState(res.data);
      notify('ok', successText);
    });
  };

  const handleMoveSlide = (mediaId: string, direction: -1 | 1) => {
    if (!heroEvent) return;
    const idx = orderedSlides.findIndex((m) => m.id === mediaId);
    const targetIdx = idx + direction;
    if (idx === -1 || targetIdx < 0 || targetIdx >= orderedSlides.length) return;

    const nextList = [...orderedSlides];
    const [moved] = nextList.splice(idx, 1);
    nextList.splice(targetIdx, 0, moved);

    startTransition(async () => {
      const res = await reorderPortfolioMedia(
        heroEvent.id,
        nextList.map((m) => m.id),
      );
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to reorder slides.');
        return;
      }
      syncHeroEventState(res.data);
    });
  };

  const handleMakeFirstSlide = (mediaId: string) => {
    if (!heroEvent) return;
    const rest = orderedSlides.filter((m) => m.id !== mediaId);
    const target = orderedSlides.find((m) => m.id === mediaId);
    if (!target) return;

    const nextList = [target, ...rest];
    startTransition(async () => {
      const res = await reorderPortfolioMedia(
        heroEvent.id,
        nextList.map((m) => m.id),
      );
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to set lead slide.');
        return;
      }
      await updatePortfolioMedia(heroEvent.id, mediaId, { isCover: true });
      await refreshHeroEvent(heroEvent.id);
      notify('ok', 'Moved photo to #1 Lead Hero Slide.');
    });
  };

  const handleToggleSlideVisibility = (mediaId: string) => {
    if (!heroEvent) return;
    const nextHidden = hiddenSet.has(mediaId)
      ? settingsDraft.hiddenMediaIds.filter((id) => id !== mediaId)
      : [...settingsDraft.hiddenMediaIds, mediaId];
    const nextSettings: HeroSliderSettings = {
      ...settingsDraft,
      hiddenMediaIds: nextHidden,
    };
    setSettingsDraft(nextSettings);
    persistSettings(
      nextSettings,
      hiddenSet.has(mediaId) ? 'Slide is now visible on Homepage Hero.' : 'Slide hidden from Homepage Hero.',
    );
  };

  const handleSaveAltLabel = (item: PortfolioMediaItem) => {
    if (!heroEvent) return;
    const nextLabel = (altDrafts[item.id] ?? item.altText ?? item.caption ?? '').trim();
    startTransition(async () => {
      const res = await updatePortfolioMedia(heroEvent.id, item.id, {
        altText: nextLabel,
        caption: nextLabel,
      });
      if (!res.ok) {
        notify('err', res.message || 'Failed to save slide label.');
        return;
      }
      await refreshHeroEvent(heroEvent.id);
      notify('ok', 'Slide accessibility label saved.');
    });
  };

  const handleRemoveSlide = (mediaId: string) => {
    if (!heroEvent) return;
    startTransition(async () => {
      const res = await removeHeroSliderMedia(heroEvent.id, mediaId);
      if (!res.ok) {
        notify('err', res.message || 'Failed to remove hero slide.');
        return;
      }
      if (res.data) {
        if (hiddenSet.has(mediaId)) {
          const cleaned: HeroSliderSettings = {
            ...settingsDraft,
            hiddenMediaIds: settingsDraft.hiddenMediaIds.filter((id) => id !== mediaId),
          };
          await updatePortfolioEvent(heroEvent.id, {
            description: serializeHeroSliderDescription(cleaned),
          });
          await refreshHeroEvent(heroEvent.id);
        } else {
          syncHeroEventState(res.data);
        }
      } else {
        await refreshHeroEvent(heroEvent.id);
      }
      notify('ok', 'Photo removed from Hero slideshow.');
    });
  };

  const handleToggleLiveStatus = () => {
    if (!heroEvent) return;
    startTransition(async () => {
      if (heroEvent.status === 'PUBLISHED') {
        const res = await unpublishPortfolioEvent(heroEvent.id);
        if (!res.ok || !res.data) {
          notify('err', res.message || 'Failed to pause custom hero slideshow.');
          return;
        }
        syncHeroEventState(res.data);
        notify('ok', 'Custom Hero Slideshow paused. Homepage uses fallback policy.');
        return;
      }

      const firstReady = orderedSlides.find((m) => m.status === 'READY');
      if (!firstReady) {
        notify('err', 'Upload or select at least 1 photo before publishing the Hero slideshow.');
        return;
      }
      const res = await activateHeroSliderMedia(heroEvent.id, firstReady.id, true);
      if (!res.ok || !res.data) {
        notify('err', res.message || 'Failed to publish Hero slideshow.');
        return;
      }
      syncHeroEventState(res.data);
      notify('ok', 'Hero Slideshow is now LIVE on the public homepage!');
    });
  };

  const isCloudinaryReady = cloudinaryStatus?.configured !== false;
  const isHeroPublished = heroEvent?.status === 'PUBLISHED';
  const savedSettings = parseHeroSliderSettings(heroEvent?.description);
  const hasUnsavedControls =
    savedSettings.autoPlayMs !== settingsDraft.autoPlayMs ||
    savedSettings.showDots !== settingsDraft.showDots ||
    savedSettings.showArrows !== settingsDraft.showArrows ||
    savedSettings.fallbackEnabled !== settingsDraft.fallbackEnabled ||
    savedSettings.mobileColumns !== settingsDraft.mobileColumns ||
    savedSettings.tabletColumns !== settingsDraft.tabletColumns ||
    savedSettings.desktopColumns !== settingsDraft.desktopColumns;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="admin-page-title">Public Page Setup</h1>
            {activeTab === 'hero' ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                  isHeroPublished && visibleReadySlides.length > 0
                    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                    : 'border-[var(--admin-accent)]/35 bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    isHeroPublished && visibleReadySlides.length > 0
                      ? 'bg-emerald-500'
                      : 'bg-[var(--admin-accent)]',
                  )}
                />
                {isHeroPublished && visibleReadySlides.length > 0
                  ? `Hero Live • ${visibleReadySlides.length} Slide${visibleReadySlides.length === 1 ? '' : 's'}`
                  : heroEvent?.status === 'DRAFT' && orderedSlides.length > 0
                    ? 'Hero Paused (Draft)'
                    : 'Hero Auto-Fallback'}
              </span>
            ) : activeTab === 'services' ? (
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                  (servicesDataState?.enabled ?? true)
                    ? 'border-emerald-500/35 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                    : 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300',
                )}
              >
                <span
                  className={cn(
                    'h-1.5 w-1.5 rounded-full',
                    (servicesDataState?.enabled ?? true) ? 'bg-emerald-500' : 'bg-amber-500',
                  )}
                />
                {(servicesDataState?.enabled ?? true)
                  ? `${(servicesDataState?.items || []).filter((i) => i.isActive).length} Active Services`
                  : 'Services Hidden'}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/35 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {(aboutTeamDataState?.members || []).filter((m) => m.isActive).length} Team Profiles
              </span>
            )}
          </div>
          <p className="admin-meta">
            Manage your public homepage photography section-by-section in original / 4K{' '}
            <span className="font-mono-code">q_100</span> quality.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <a
            href="/?external=1"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors"
          >
            <span>View Live Homepage</span>
            <ExternalLinkIcon className="w-3.5 h-3.5" />
          </a>
          {activeTab === 'hero' && (
            <>
              <button
                type="button"
                onClick={handleOpenGalleryPicker}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface)] px-3.5 py-2 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer"
              >
                <CameraIcon className="w-3.5 h-3.5 text-[var(--admin-accent)]" />
                <span>Pick From Gallery</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-xs font-semibold text-[var(--admin-accent-fg)] shadow-xs hover:opacity-95 transition-opacity cursor-pointer"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                <span>Upload Landscape Photos</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Section Categories Bar (Hero, Services, About & Team) */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <button
          type="button"
          onClick={() => setActiveTab('hero')}
          className={cn(
            'text-left rounded-2xl border p-4 transition-all flex items-center justify-between gap-3 cursor-pointer',
            activeTab === 'hero'
              ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] shadow-2xs'
              : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-subtle)]',
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                activeTab === 'hero'
                  ? 'border-[var(--admin-accent)]/40 bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]'
                  : 'border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] text-[var(--admin-accent)]',
              )}
            >
              <GalleryHorizontalIcon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-accent)]">
                Section 01
              </p>
              <p className="text-sm font-semibold text-[var(--admin-text)] truncate">
                Hero Slideshow Carousel
              </p>
              <p className="text-[11px] text-[var(--admin-muted)] truncate">
                Full-width top slider • {settingsDraft.desktopColumns}/{settingsDraft.tabletColumns}/
                {settingsDraft.mobileColumns} view mode
              </p>
            </div>
          </div>
          <span className="font-mono-code text-xs font-bold text-[var(--admin-muted)] shrink-0">
            {orderedSlides.length} slides
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('services')}
          className={cn(
            'text-left rounded-2xl border p-4 transition-all flex items-center justify-between gap-3 cursor-pointer',
            activeTab === 'services'
              ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] shadow-2xs'
              : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-subtle)]',
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                activeTab === 'services'
                  ? 'border-[var(--admin-accent)]/40 bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]'
                  : 'border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] text-[var(--admin-accent)]',
              )}
            >
              <CameraIcon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-accent)]">
                Section 02
              </p>
              <p className="text-sm font-semibold text-[var(--admin-text)] truncate">
                Studio Services Cards
              </p>
              <p className="text-[11px] text-[var(--admin-muted)] truncate">
                Top 3 on Homepage + Full Grid at /all-services
              </p>
            </div>
          </div>
          <span className="font-mono-code text-xs font-bold text-[var(--admin-muted)] shrink-0">
            {(servicesDataState?.items || []).filter((i) => i.isActive).length} items
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('about')}
          className={cn(
            'text-left rounded-2xl border p-4 transition-all flex items-center justify-between gap-3 cursor-pointer',
            activeTab === 'about'
              ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] shadow-2xs'
              : 'border-[var(--admin-border)] bg-[var(--admin-surface)] hover:bg-[var(--admin-surface-subtle)]',
          )}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border',
                activeTab === 'about'
                  ? 'border-[var(--admin-accent)]/40 bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]'
                  : 'border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] text-[var(--admin-accent)]',
              )}
            >
              <LayersIcon className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[10.5px] font-bold uppercase tracking-wider text-[var(--admin-accent)]">
                Section 03
              </p>
              <p className="text-sm font-semibold text-[var(--admin-text)] truncate">
                About &amp; Team Details
              </p>
              <p className="text-[11px] text-[var(--admin-muted)] truncate">
                Studio story &amp; team roster for /about
              </p>
            </div>
          </div>
          <span className="font-mono-code text-xs font-bold text-[var(--admin-muted)] shrink-0">
            {(aboutTeamDataState?.members || []).filter((m) => m.isActive).length} team
          </span>
        </button>
      </div>

      {!isCloudinaryReady && cloudinaryStatus && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-5 py-4 text-xs text-amber-900 space-y-1">
          <p className="font-semibold text-sm">Cloudinary Setup Required in Backend</p>
          <p>
            Missing environment variables:{' '}
            <span className="font-mono-code font-semibold">
              {cloudinaryStatus.missingVariables.join(', ')}
            </span>
          </p>
        </div>
      )}

      {feedback && (
        <div
          className={cn(
            'rounded-xl border px-4 py-3 text-xs sm:text-sm font-medium flex items-center justify-between gap-3',
            feedback.type === 'ok'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
              : 'border-rose-200 bg-rose-50 text-rose-900',
          )}
        >
          <span>{feedback.text}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs underline shrink-0 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {activeTab === 'services' ? (
        <ServicesShowcaseSetup
          initialServicesData={servicesDataState}
          galleryPool={galleryPool}
          onGalleryPoolUpdate={setGalleryPool}
          studioName={studioName}
          onNotify={notify}
          onServicesDataChange={setServicesDataState}
        />
      ) : activeTab === 'about' ? (
        <AboutTeamSetup
          initialAboutTeamData={aboutTeamDataState}
          galleryPool={galleryPool}
          onGalleryPoolUpdate={setGalleryPool}
          studioName={studioName}
          onNotify={notify}
          onAboutTeamDataChange={setAboutTeamDataState}
        />
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-12 items-start">
        {/* LEFT COLUMN: Upload Zone + Curated Slides Queue */}
        <div className="lg:col-span-7 space-y-5 min-w-0">
          {/* Drag & Drop Direct Upload Zone */}
          <div className="admin-card p-5 space-y-4">
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setIsDraggingOver(true);
              }}
              onDragLeave={() => setIsDraggingOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDraggingOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  enqueueFilesForUpload(e.dataTransfer.files);
                }
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'rounded-xl border-2 border-dashed px-5 py-7 text-center cursor-pointer transition-all duration-200',
                isDraggingOver
                  ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)]'
                  : 'border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] hover:border-[var(--admin-accent)]/70',
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp,image/avif,image/heic"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    enqueueFilesForUpload(e.target.files);
                    e.target.value = '';
                  }
                }}
                className="hidden"
              />
              <div className="mx-auto mb-2.5 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--admin-accent-soft)] text-[var(--admin-accent)]">
                <GalleryHorizontalIcon className="w-5 h-5" />
              </div>
              <p className="text-sm font-semibold text-[var(--admin-text)]">
                Drag &amp; drop landscape wedding photos here, or{' '}
                <span className="text-[var(--admin-accent)] underline underline-offset-4">
                  browse files
                </span>
              </p>
              <p className="text-xs text-[var(--admin-muted)] mt-1">
                Best in 16:9 / 3:2 landscape (1920px+ wide recommended) • Uploaded at original
                resolution &amp; served in HD/4K quality
              </p>
            </div>

            {/* Active Upload Queue */}
            {uploadQueue.length > 0 && (
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-[var(--admin-muted)]">
                    Hero Upload Queue ({uploadQueue.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setUploadQueue((prev) => prev.filter((q) => q.state !== 'DONE'))}
                    className="text-xs text-[var(--admin-muted)] hover:text-[var(--admin-text)] underline cursor-pointer"
                  >
                    Clear completed
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {uploadQueue.map((item) => {
                    const framing = classifyPhotoFraming(item.measuredWidth, item.measuredHeight);
                    return (
                      <div
                        key={item.localId}
                        className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-3 space-y-1.5 text-xs"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-medium text-[var(--admin-text)] truncate">
                            {item.file.name}
                          </span>
                          <span
                            className={cn(
                              'font-semibold shrink-0',
                              item.state === 'DONE'
                                ? 'text-emerald-600 dark:text-emerald-300'
                                : item.state === 'FAILED'
                                  ? 'text-rose-500'
                                  : 'text-[var(--admin-accent)]',
                            )}
                          >
                            {item.state === 'DONE'
                              ? 'Added ✓'
                              : item.state === 'FAILED'
                                ? 'Failed'
                                : `${item.progress}%`}
                          </span>
                        </div>
                        {item.measuredWidth && item.measuredHeight && (
                          <div className="flex items-center justify-between gap-2 text-[11px] text-[var(--admin-muted)]">
                            <span className="font-mono-code">
                              {item.measuredWidth} × {item.measuredHeight}
                            </span>
                            <span
                              className={cn(
                                'font-semibold',
                                framing.tone === 'emerald'
                                  ? 'text-emerald-600 dark:text-emerald-300'
                                  : framing.tone === 'amber'
                                    ? 'text-amber-600 dark:text-amber-300'
                                    : 'text-[var(--admin-muted)]',
                              )}
                            >
                              {framing.badge}
                            </span>
                          </div>
                        )}
                        <div className="h-1.5 w-full rounded-full bg-[var(--admin-border)] overflow-hidden">
                          <div
                            className={cn(
                              'h-full transition-all duration-200',
                              item.state === 'FAILED'
                                ? 'bg-rose-500'
                                : item.state === 'DONE'
                                  ? 'bg-emerald-500'
                                  : 'bg-[var(--admin-accent)]',
                            )}
                            style={{ width: `${item.progress}%` }}
                          />
                        </div>
                        {item.errorMessage && (
                          <div className="flex items-center justify-between gap-2 text-rose-500">
                            <span className="truncate">{item.errorMessage}</span>
                            <button
                              type="button"
                              onClick={() => void processSingleUpload(item)}
                              className="underline font-semibold shrink-0 cursor-pointer"
                            >
                              Retry
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Managed Hero Slides Ordered Stack */}
          <div className="admin-card overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="admin-section-title">
                  Hero Slide Sequence ({orderedSlides.length})
                </h2>
                <p className="admin-meta mt-0.5">
                  Slides display in exact #1 → #{Math.max(orderedSlides.length, 1)} order across the
                  widescreen landscape Hero stage.
                </p>
              </div>
            </div>

            {orderedSlides.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-sm font-semibold text-[var(--admin-text)]">
                  No dedicated Hero slides uploaded yet
                </p>
                <p className="text-xs text-[var(--admin-muted)] max-w-md mx-auto">
                  {settingsDraft.fallbackEnabled
                    ? 'Right now your homepage Hero automatically displays cover photos from your published client albums & studio gallery (preferring landscape shots). Upload or pick your curated photos here to take full manual control.'
                    : 'Fallback is disabled. Upload or pick landscape photos from Gallery to display in the Hero section.'}
                </p>
                <div className="flex flex-wrap justify-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-[var(--admin-accent)] px-4 py-2 text-xs font-semibold text-[var(--admin-accent-fg)] cursor-pointer"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                    <span>Upload First Landscape Photo</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenGalleryPicker}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-4 py-2 text-xs font-semibold text-[var(--admin-text)] cursor-pointer"
                  >
                    <span>Pick From Studio Gallery</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="divide-y divide-[var(--admin-border-subtle)]">
                {orderedSlides.map((slide, idx) => {
                  const isHidden = hiddenSet.has(slide.id);
                  const isLead = idx === 0 && !isHidden;
                  const framing = classifyPhotoFraming(slide.width, slide.height);
                  const altValue =
                    altDrafts[slide.id] ?? slide.altText ?? slide.caption ?? '';

                  return (
                    <div
                      key={slide.id}
                      className={cn(
                        'p-4 flex flex-col sm:flex-row gap-4 transition-colors',
                        isHidden && 'opacity-65 bg-[var(--admin-surface-subtle)]/50',
                      )}
                    >
                      {/* True Landscape 16:9 Thumbnail + Order Badge */}
                      <div className="relative w-full sm:w-52 aspect-video shrink-0 rounded-xl overflow-hidden border border-[var(--admin-border)] bg-[#14120E]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getHeroSlideThumbUrl(slide)}
                          alt={slide.altText || slide.caption || `Hero slide ${idx + 1}`}
                          className="w-full h-full object-contain"
                        />
                        <div className="absolute top-2 left-2 flex items-center gap-1">
                          <span className="rounded-md bg-[#14120E]/85 backdrop-blur-sm border border-[#CAA650]/45 px-2 py-0.5 font-mono-code text-[11px] font-bold text-[#E7D1AA]">
                            #{String(idx + 1).padStart(2, '0')}
                          </span>
                          {isLead && (
                            <span className="rounded-md bg-[#CAA650] px-1.5 py-0.5 text-[10px] font-bold text-[#14120E]">
                              Lead
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Metadata, Alt Input & Slide Controls */}
                      <div className="flex-1 min-w-0 space-y-3">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs text-[var(--admin-muted)]">
                              <span className="font-mono-code uppercase font-semibold text-[var(--admin-text)]">
                                {slide.format}
                              </span>
                              <span>•</span>
                              <span>{formatBytes(slide.bytes)}</span>
                              {slide.width && slide.height && (
                                <>
                                  <span>•</span>
                                  <span className="font-mono-code">
                                    {slide.width} × {slide.height}
                                  </span>
                                </>
                              )}
                              <span>•</span>
                              <span>{formatLocalDate(slide.createdAt)}</span>
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={cn(
                                  'inline-flex items-center rounded-md border px-2 py-0.5 text-[10.5px] font-semibold',
                                  framing.tone === 'emerald'
                                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                                    : framing.tone === 'amber'
                                      ? 'border-amber-500/35 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                                      : 'border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] text-[var(--admin-muted)]',
                                )}
                              >
                                {framing.badge}
                              </span>
                              {!framing.isLandscape && (
                                <span className="text-[11px] text-amber-600 dark:text-amber-300">
                                  Tip: Use a wide landscape shot for sharpest full-width fit.
                                </span>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleToggleSlideVisibility(slide.id)}
                            className={cn(
                              'rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors cursor-pointer shrink-0',
                              isHidden
                                ? 'border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]'
                                : 'border-emerald-500/35 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
                            )}
                          >
                            {isHidden ? 'Hidden' : 'Visible'}
                          </button>
                        </div>

                        {/* Accessibility Alt Label (Never displayed over image) */}
                        <div className="flex gap-2">
                          <input
                            value={altValue}
                            onChange={(e) =>
                              setAltDrafts((prev) => ({ ...prev, [slide.id]: e.target.value }))
                            }
                            placeholder="Accessibility alt label (hidden from homepage image)..."
                            className="flex-1 min-w-0 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-input)] px-3 py-1.5 text-xs text-[var(--admin-text)] outline-none focus:border-[var(--admin-accent)]"
                          />
                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleSaveAltLabel(slide)}
                            className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] transition-colors cursor-pointer shrink-0"
                          >
                            Save Label
                          </button>
                        </div>

                        {/* Order & Remove Action Bar */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <button
                              type="button"
                              disabled={isPending || idx === 0}
                              onClick={() => handleMoveSlide(slide.id, -1)}
                              className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] disabled:opacity-40 cursor-pointer"
                            >
                              ↑ Earlier
                            </button>
                            <button
                              type="button"
                              disabled={isPending || idx === orderedSlides.length - 1}
                              onClick={() => handleMoveSlide(slide.id, 1)}
                              className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] px-2.5 py-1 text-xs font-medium text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] disabled:opacity-40 cursor-pointer"
                            >
                              ↓ Later
                            </button>
                            {idx > 0 && (
                              <button
                                type="button"
                                disabled={isPending}
                                onClick={() => handleMakeFirstSlide(slide.id)}
                                className="rounded-lg border border-[var(--admin-accent)]/35 bg-[var(--admin-accent-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--admin-accent)] hover:opacity-90 cursor-pointer"
                              >
                                Make #1 First
                              </button>
                            )}
                          </div>

                          <button
                            type="button"
                            disabled={isPending}
                            onClick={() => handleRemoveSlide(slide.id)}
                            className="rounded-lg border border-rose-200 bg-rose-50/70 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100 transition-colors cursor-pointer"
                          >
                            Remove Slide
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: Live Image-Only Preview Simulator + Slideshow Settings */}
        <div className="lg:col-span-5 space-y-5 lg:sticky lg:top-20 min-w-0">
          {/* Live Hero Preview Simulator (Desktop 3 / Tablet 2 / Mobile 1) */}
          <div className="admin-card p-4 sm:p-5 space-y-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h2 className="admin-section-title">Live Full-View Preview</h2>
                <p className="text-[11px] text-[var(--admin-muted)]">
                  {totalPreviewPages > 0
                    ? `Slide ${safePreviewPage + 1} of ${totalPreviewPages} (${previewSlides.length} photo${previewSlides.length === 1 ? '' : 's'}) • ${settingsDraft.autoPlayMs / 1000}s`
                    : 'Add visible slides to preview exact sequence'}
                </p>
              </div>

              <div className="inline-flex rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] p-0.5 gap-0.5 text-[11px] font-semibold">
                {(
                  [
                    { id: 'desktop' as const, label: `Desktop (${settingsDraft.desktopColumns})` },
                    { id: 'tablet' as const, label: `Tablet (${settingsDraft.tabletColumns})` },
                    { id: 'mobile' as const, label: `Mobile (${settingsDraft.mobileColumns})` },
                  ] as const
                ).map((vp) => (
                  <button
                    key={vp.id}
                    type="button"
                    onClick={() => setPreviewViewport(vp.id)}
                    className={cn(
                      'rounded-md px-2 py-1 transition-colors cursor-pointer',
                      previewViewport === vp.id
                        ? 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)]'
                        : 'text-[var(--admin-muted)]',
                    )}
                  >
                    {vp.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-center">
              <div
                className={cn(
                  'relative overflow-hidden transition-all duration-300 w-full',
                  previewViewport === 'mobile'
                    ? 'max-w-[260px]'
                    : previewViewport === 'tablet' && previewSlots > 1
                      ? 'max-w-[380px]'
                      : 'w-full',
                )}
              >
                {previewSlides.length > 0 ? (
                  <>
                    <div
                      className={cn(
                        'grid items-center',
                        previewSlots === 1 ? 'gap-0 grid-cols-1' : 'gap-0.5',
                        previewSlots === 3
                          ? 'grid-cols-3'
                          : previewSlots === 2
                            ? 'grid-cols-2'
                            : 'grid-cols-1',
                      )}
                    >
                      {previewSlides.map((slideItem) => (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          key={slideItem.id}
                          src={getHeroSlideImageUrl(slideItem)}
                          srcSet={getHeroSlideSrcSet(slideItem)}
                          sizes="(max-width: 1024px) 100vw, 320px"
                          alt={slideItem.altText || 'Hero preview'}
                          className={cn(
                            'block w-full mx-auto',
                            previewSlots === 1 && previewViewport !== 'mobile'
                              ? 'aspect-[16/9] object-cover object-center'
                              : previewSlots === 1
                                ? 'h-auto max-h-48 object-cover object-center'
                                : 'h-auto max-h-36 object-contain',
                          )}
                        />
                      ))}
                    </div>

                    {settingsDraft.showArrows && totalPreviewPages > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewIndex(
                              (prev) => (prev - 1 + totalPreviewPages) % totalPreviewPages,
                            )
                          }
                          aria-label="Preview previous slide"
                          className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 h-6 w-6 rounded-full bg-white/85 text-[#181611] shadow-sm flex items-center justify-center cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="15 18 9 12 15 6" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setPreviewIndex((prev) => (prev + 1) % totalPreviewPages)
                          }
                          aria-label="Preview next slide"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 h-6 w-6 rounded-full bg-white/85 text-[#181611] shadow-sm flex items-center justify-center cursor-pointer"
                        >
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="9 18 15 12 9 6" />
                          </svg>
                        </button>
                      </>
                    )}
                    {settingsDraft.showDots && totalPreviewPages > 1 && (
                      <div className="mt-2 flex justify-center">
                        <div className="flex items-center gap-1 px-2 py-0.5">
                          {Array.from({ length: totalPreviewPages }).map((_, idx) => (
                            <button
                              key={`preview-dot-${idx}`}
                              type="button"
                              onClick={() => setPreviewIndex(idx)}
                              aria-label={`Preview slide ${idx + 1}`}
                              className={cn(
                                'h-1.5 rounded-full transition-all cursor-pointer',
                                idx === safePreviewPage
                                  ? 'w-4 bg-[#8B6A21]'
                                  : 'w-1.5 bg-[var(--admin-border)]',
                              )}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="h-36 flex items-center justify-center p-4 text-center text-xs text-[var(--admin-muted)]">
                    No active Hero slides selected. Upload or enable at least one photo.
                  </div>
                )}
              </div>
            </div>

            {totalPreviewPages > 1 && (
              <div className="flex items-center justify-between text-xs pt-0.5">
                <button
                  type="button"
                  onClick={() => setPreviewPaused((p) => !p)}
                  className="text-[var(--admin-accent)] font-semibold hover:underline cursor-pointer"
                >
                  {previewPaused ? '▶ Resume Preview Autoplay' : '❚❚ Pause Preview Autoplay'}
                </button>
                <span className="text-[var(--admin-muted)]">100% Full View • Original Quality</span>
              </div>
            )}
          </div>

          {/* Slideshow Behaviour & Publication Settings */}
          <div className="admin-card p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-[var(--admin-border-subtle)] pb-3">
              <div>
                <h2 className="admin-section-title">Slideshow Controls</h2>
                <p className="text-[11px] text-[var(--admin-muted)]">
                  Control slide speed, indicators, and homepage live state.
                </p>
              </div>
              {heroEvent && (
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleToggleLiveStatus}
                  className={cn(
                    'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer shrink-0',
                    isHeroPublished
                      ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                      : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:bg-emerald-100',
                  )}
                >
                  {isHeroPublished ? 'Pause Custom Hero' : 'Publish Custom Hero'}
                </button>
              )}
            </div>

            {/* Photos Per View per Device (1 / 2 / 3) */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <label className="block text-xs font-semibold text-[var(--admin-text)]">
                  Photos Per View (1 / 2 / 3)
                </label>
                {hasUnsavedControls && (
                  <span className="text-[10.5px] font-semibold text-[var(--admin-accent)]">
                    Unsaved changes
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {(
                  [
                    {
                      key: 'desktopColumns' as const,
                      label: 'Desktop (1024px+)',
                      hint: 'Recommended: 3',
                    },
                    {
                      key: 'tabletColumns' as const,
                      label: 'Tablet (768px+)',
                      hint: 'Recommended: 2',
                    },
                    {
                      key: 'mobileColumns' as const,
                      label: 'Mobile (< 768px)',
                      hint: 'Recommended: 1',
                    },
                  ] as const
                ).map((device) => (
                  <div
                    key={device.key}
                    className="flex items-center justify-between gap-2 rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-surface-subtle)] px-3 py-2"
                  >
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold text-[var(--admin-text)]">
                        {device.label}
                      </span>
                      <span className="block text-[10px] text-[var(--admin-muted)]">
                        {device.hint}
                      </span>
                    </div>
                    <div className="inline-flex rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface)] p-0.5 gap-0.5 shrink-0">
                      {([1, 2, 3] as HeroColumnCount[]).map((cnt) => {
                        const selected = settingsDraft[device.key] === cnt;
                        return (
                          <button
                            key={cnt}
                            type="button"
                            onClick={() =>
                              setSettingsDraft((prev) => ({ ...prev, [device.key]: cnt }))
                            }
                            aria-label={`${device.label}: ${cnt} photo${cnt === 1 ? '' : 's'}`}
                            className={cn(
                              'min-w-[2.1rem] rounded-md px-2 py-1 font-mono-code text-xs font-bold transition-colors cursor-pointer',
                              selected
                                ? 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)] shadow-2xs'
                                : 'text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                            )}
                          >
                            {cnt}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Transition Speed */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[var(--admin-text)]">
                Auto-Slide Speed
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {SPEED_OPTIONS.map((opt) => {
                  const selected = settingsDraft.autoPlayMs === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        setSettingsDraft((prev) => ({ ...prev, autoPlayMs: opt.value }))
                      }
                      className={cn(
                        'rounded-xl border px-2 py-2 text-center transition-all cursor-pointer',
                        selected
                          ? 'border-[var(--admin-accent)] bg-[var(--admin-accent-soft)] text-[var(--admin-text)]'
                          : 'border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] text-[var(--admin-muted)] hover:text-[var(--admin-text)]',
                      )}
                    >
                      <span className="block font-mono-code text-xs font-bold">{opt.label}</span>
                      <span className="block text-[10px]">{opt.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Clean Toggle Switches */}
            <div className="space-y-2.5 text-xs">
              {[
                {
                  key: 'showDots' as const,
                  title: 'Show Minimal Bottom Dots',
                  desc: 'Displays subtle pill indicators at the bottom edge (zero text).',
                },
                {
                  key: 'showArrows' as const,
                  title: 'Show Hover Prev / Next Arrows',
                  desc: 'Icon-only navigation arrows appear on desktop hover.',
                },
                {
                  key: 'fallbackEnabled' as const,
                  title: 'Auto-Fallback When Empty',
                  desc: 'Show album & gallery photos automatically if zero Hero slides are active.',
                },
              ].map((toggle) => (
                <label
                  key={toggle.key}
                  className="flex items-start justify-between gap-3 rounded-xl border border-[var(--admin-border-subtle)] bg-[var(--admin-surface-subtle)] p-3 cursor-pointer"
                >
                  <div className="min-w-0">
                    <span className="font-semibold text-[var(--admin-text)] block">
                      {toggle.title}
                    </span>
                    <span className="text-[11px] text-[var(--admin-muted)] block mt-0.5">
                      {toggle.desc}
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={settingsDraft[toggle.key]}
                    onChange={(e) =>
                      setSettingsDraft((prev) => ({
                        ...prev,
                        [toggle.key]: e.target.checked,
                      }))
                    }
                    className="mt-1 h-4 w-4 accent-[var(--admin-accent)] cursor-pointer shrink-0"
                  />
                </label>
              ))}
            </div>

            <button
              type="button"
              disabled={isPending}
              onClick={() => persistSettings(settingsDraft, 'Slideshow & 1/2/3 layout controls saved.')}
              className="w-full rounded-xl bg-[var(--admin-accent)] px-4 py-2.5 text-xs sm:text-sm font-semibold text-[var(--admin-accent-fg)] hover:opacity-95 transition-opacity cursor-pointer"
            >
              {isPending
                ? 'Saving...'
                : hasUnsavedControls
                  ? 'Save Changes to Homepage'
                  : 'Save Slideshow Controls'}
            </button>
          </div>
        </div>
      </div>

      <StudioGalleryPickerModal
        open={showGalleryPicker}
        onClose={() => setShowGalleryPicker(false)}
        title="Add Existing Photos from Studio Gallery"
        subtitle="Landscape photos are listed first. Click any photo below to add it to the Hero slideshow at full quality."
        actionLabel="Add to Hero"
        activeLabel="In Hero"
        galleryImages={galleryPool}
        activePublicIds={existingHeroPublicIds}
        searchQuery={gallerySearch}
        onSearchChange={setGallerySearch}
        landscapeOnly={landscapeOnlyFilter}
        onLandscapeOnlyChange={setLandscapeOnlyFilter}
        isBusy={isPending}
        onPickImage={handleAttachGalleryImage}
      />
        </>
      )}
    </div>
  );
}
