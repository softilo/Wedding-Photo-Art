'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  PortfolioItem,
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
  PublicBranding,
} from '@/types/event-management';
import {
  getPublicGalleryMedia,
  getPublicPortfolioEvents,
} from '@/service/catalog/catalog.service';
import {
  buildCloudinaryImageUrl,
  buildCloudinarySrcSet,
  buildCloudinaryVideoPosterUrl,
  parseShowcaseMedia,
} from '@/lib/showcaseMedia';
import { parseAlbumDescriptionAndTheme } from '@/lib/albumTheme';
import { isSystemPortfolioEventSlug } from '@/lib/heroSlider';
import { useModalHistoryBack } from '@/lib/useModalHistoryBack';
import { cn, formatLocalDate } from '@/lib/utils';
import {
  ArrowRightIcon,
  CalendarIcon,
  CameraIcon,
  GalleryHorizontalIcon,
  LayoutGridIcon,
  SearchIcon,
} from '@/components/shared/Icons';
import { AdaptiveVideoPlayer } from './AdaptiveVideoPlayer';
import { LazyViewportImage } from './LazyViewportImage';
import { PortfolioEventDetailModal } from './PortfolioEventDetailModal';
import { ShowcaseLightboxModal } from './ShowcaseLightboxModal';

interface PublicPortfolioShowcaseProps {
  branding: PublicBranding;
  portfolio: PortfolioItem[];
  portfolioEvents?: PortfolioShowcaseEvent[];
  initialGalleryMedia?: PortfolioMediaItem[];
}

const INITIAL_PHOTO_BATCH = 12;

function formatFilmDuration(seconds?: number | null): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

function resolveNaturalAspectRatio(width?: number | null, height?: number | null): string {
  if (!width || !height || width <= 0 || height <= 0) {
    return '4 / 3';
  }
  const ratio = width / height;
  const clamped = Math.min(Math.max(ratio, 0.62), 1.75);
  return clamped.toFixed(4);
}

export function PublicPortfolioShowcase({
  branding,
  portfolio,
  portfolioEvents: initialEvents = [],
  initialGalleryMedia = [],
}: PublicPortfolioShowcaseProps) {
  const sectionRef = useRef<HTMLElement | null>(null);
  const mobileRailRef = useRef<HTMLDivElement | null>(null);
  const lightboxTouchStartX = useRef<number | null>(null);

  // Strict section-level gate: DO NOT fetch or mount any gallery media until user scrolls to #portfolio
  const [hasEnteredSection, setHasEnteredSection] = useState(false);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  const [galleryMedia, setGalleryMedia] = useState<PortfolioMediaItem[]>(initialGalleryMedia);
  const [showcaseEvents, setShowcaseEvents] = useState<PortfolioShowcaseEvent[]>(initialEvents);

  const [mediaFilter, setMediaFilter] = useState<'all' | 'photo' | 'video' | 'stories'>('all');
  const [mobilePhotoMode, setMobilePhotoMode] = useState<'swipe' | 'grid'>('swipe');
  const [mobileSlideIndex, setMobileSlideIndex] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [visiblePhotoCount, setVisiblePhotoCount] = useState(INITIAL_PHOTO_BATCH);

  // Interactive modals & cinema theater state
  const [selectedGalleryPhoto, setSelectedGalleryPhoto] = useState<PortfolioMediaItem | null>(
    null,
  );
  const [selectedFilmId, setSelectedFilmId] = useState<string | null>(null);
  const [playingVideoIds, setPlayingVideoIds] = useState<Record<string, boolean>>({});
  const [activeShowcaseEvent, setActiveShowcaseEvent] = useState<PortfolioShowcaseEvent | null>(
    null,
  );
  const [activeShowcaseItem, setActiveShowcaseItem] = useState<PortfolioItem | null>(null);

  useModalHistoryBack(Boolean(selectedGalleryPhoto), () => setSelectedGalleryPhoto(null));

  // 1. Observe when the user scrolls near #portfolio
  useEffect(() => {
    const el = sectionRef.current;
    if (!el || hasEnteredSection || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setHasEnteredSection(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        rootMargin: '20px 0px',
        threshold: 0.05,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [hasEnteredSection]);

  // 2. Fetch gallery media on demand ONLY after the user scrolls into #portfolio
  useEffect(() => {
    if (!hasEnteredSection) return;
    let cancelled = false;

    async function loadGalleryOnScroll() {
      setIsLoadingMedia(true);
      try {
        const [galRes, evRes] = await Promise.all([
          getPublicGalleryMedia(),
          showcaseEvents.length === 0 ? getPublicPortfolioEvents() : Promise.resolve(null),
        ]);
        if (cancelled) return;
        if (galRes.ok && galRes.data) {
          setGalleryMedia(galRes.data.data);
        }
        if (evRes && evRes.ok && evRes.data) {
          setShowcaseEvents(evRes.data.data);
        }
      } finally {
        if (!cancelled) {
          setIsLoadingMedia(false);
        }
      }
    }

    void loadGalleryOnScroll();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasEnteredSection]);

  const q = searchQuery.trim().toLowerCase();

  // Separate Videos and Photos cleanly so neither cramps the other's aspect ratio or UX
  const filteredVideos = useMemo(() => {
    if (mediaFilter !== 'all' && mediaFilter !== 'video') return [];
    return galleryMedia.filter((m) => {
      if (m.resourceType !== 'VIDEO') return false;
      if (
        q &&
        !(m.caption || '').toLowerCase().includes(q) &&
        !(m.altText || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [galleryMedia, mediaFilter, q]);

  const filteredPhotos = useMemo(() => {
    if (mediaFilter !== 'all' && mediaFilter !== 'photo') return [];
    return galleryMedia.filter((m) => {
      if (m.resourceType !== 'IMAGE') return false;
      if (
        q &&
        !(m.caption || '').toLowerCase().includes(q) &&
        !(m.altText || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [galleryMedia, mediaFilter, q]);

  const filteredEvents = useMemo(() => {
    if (mediaFilter !== 'stories' && !q) {
      // Event Stories have their own dedicated section ("Signature Digital Albums");
      // show them here in full detail inside the Event Stories tab or when searching.
      return [];
    }
    return showcaseEvents.filter((ev) => {
      if (isSystemPortfolioEventSlug(ev.slug)) return false;
      if (mediaFilter === 'video' && (ev.counts?.videos ?? 0) === 0) return false;
      if (mediaFilter === 'photo' && (ev.counts?.photos ?? 0) === 0) return false;
      if (
        q &&
        !ev.title.toLowerCase().includes(q) &&
        !(ev.description || '').toLowerCase().includes(q) &&
        !(ev.location || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [showcaseEvents, mediaFilter, q]);

  const filteredLegacyItems = useMemo(() => {
    if (mediaFilter === 'stories') return [];
    return portfolio.filter((item) => {
      const parsed = parseShowcaseMedia(item.mediaUrl);
      if (mediaFilter === 'photo' && parsed.kind !== 'photo') return false;
      if (mediaFilter === 'video' && parsed.kind !== 'video') return false;
      if (
        q &&
        !item.title.toLowerCase().includes(q) &&
        !(item.description || '').toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [portfolio, mediaFilter, q]);

  const activeFilm =
    filteredVideos.find((v) => v.id === selectedFilmId) ?? filteredVideos[0] ?? null;

  const selectedPhotoIndex = selectedGalleryPhoto
    ? filteredPhotos.findIndex((p) => p.id === selectedGalleryPhoto.id)
    : -1;

  const goPrevGalleryPhoto = () => {
    if (filteredPhotos.length <= 1 || selectedPhotoIndex === -1) return;
    setSelectedGalleryPhoto(
      filteredPhotos[(selectedPhotoIndex - 1 + filteredPhotos.length) % filteredPhotos.length],
    );
  };

  const goNextGalleryPhoto = () => {
    if (filteredPhotos.length <= 1 || selectedPhotoIndex === -1) return;
    setSelectedGalleryPhoto(filteredPhotos[(selectedPhotoIndex + 1) % filteredPhotos.length]);
  };

  useEffect(() => {
    if (!selectedGalleryPhoto) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedGalleryPhoto(null);
      } else if (e.key === 'ArrowRight') {
        goNextGalleryPhoto();
      } else if (e.key === 'ArrowLeft') {
        goPrevGalleryPhoto();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedGalleryPhoto, selectedPhotoIndex, filteredPhotos.length]);

  const photoTotalCount =
    galleryMedia.filter((m) => m.resourceType === 'IMAGE').length +
    portfolio.filter((i) => parseShowcaseMedia(i.mediaUrl).kind === 'photo').length;
  const videoTotalCount =
    galleryMedia.filter((m) => m.resourceType === 'VIDEO').length +
    portfolio.filter((i) => parseShowcaseMedia(i.mediaUrl).kind === 'video').length;

  const visiblePhotos = filteredPhotos.slice(0, visiblePhotoCount);
  const hasMorePhotos = visiblePhotoCount < filteredPhotos.length;

  const totalMatching =
    filteredVideos.length +
    filteredPhotos.length +
    filteredEvents.length +
    filteredLegacyItems.length;

  const accent = branding.themeTokens.accentColor || '#8B6A21';

  return (
    <section
      id="portfolio"
      ref={sectionRef}
      className="border-y border-[#E5DFD0] bg-white scroll-mt-16 overflow-x-clip"
    >
      <div className="mx-auto max-w-6xl min-w-0 px-4 py-14 sm:py-20 sm:px-6 space-y-8 sm:space-y-10">
        {/* Section Header & Medium Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-5 min-w-0">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#DFCEAA] bg-[#F8F3E6] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6F5319] max-w-full">
              <CameraIcon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">Step 02B • Visual Exhibition &amp; Cinema</span>
            </div>
            <h2 className="font-editorial text-2xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#181611] mt-2 leading-tight">
              Captured Moments &amp; Highlight Films
            </h2>
            <p className="text-sm text-[#4A4438] mt-1.5 max-w-xl">
              Stream real wedding highlight reels and browse uncropped photographs to judge our
              framing, color grading, and storytelling before you book.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 min-w-0 max-w-full">
            <div className="flex flex-wrap rounded-xl border border-[#DFCEAA] bg-[#F8F3E6] p-1 gap-1 max-w-full">
              {[
                { id: 'all' as const, label: 'All Showcase' },
                {
                  id: 'photo' as const,
                  label: photoTotalCount > 0 ? `Photography (${photoTotalCount})` : 'Photography',
                },
                {
                  id: 'video' as const,
                  label: videoTotalCount > 0 ? `Cinema Films (${videoTotalCount})` : 'Cinema Films',
                },
                ...(showcaseEvents.length > 0
                  ? [
                      {
                        id: 'stories' as const,
                        label: `Event Stories (${showcaseEvents.length})`,
                      },
                    ]
                  : []),
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setMediaFilter(tab.id);
                    setVisiblePhotoCount(INITIAL_PHOTO_BATCH);
                  }}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer',
                    mediaFilter === tab.id
                      ? 'bg-[#181611] text-white shadow-2xs'
                      : 'text-[#4A4438] hover:text-[#181611]',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="relative w-full sm:w-52">
              <SearchIcon className="w-3.5 h-3.5 text-[#8A7F69] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setVisiblePhotoCount(INITIAL_PHOTO_BATCH);
                }}
                placeholder="Search moments or films..."
                className="w-full rounded-xl border border-[#D8CCB2] bg-[#F9F8F5] pl-8 pr-3 py-1.5 text-xs text-[#181611] placeholder:text-[#8A7F69] outline-none focus:border-[#8B6A21] focus:bg-white"
              />
            </div>
          </div>
        </div>

        {/* Strict Viewport Gate: Nothing loads until the user scrolls to #portfolio! */}
        {!hasEnteredSection || isLoadingMedia ? (
          <div
            role="status"
            aria-busy="true"
            aria-label="Loading gallery media"
            className="space-y-10"
          >
            <span className="sr-only">Loading photography and highlight films...</span>
            {/* Cinema Theater Skeleton */}
            <div className="rounded-2xl sm:rounded-3xl border border-[#2E291F] bg-[#14120E] p-3.5 sm:p-7 space-y-5 min-w-0 overflow-hidden">
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="h-3.5 w-48 max-w-full rounded-full skeleton-bone-dark" />
                <div className="hidden sm:block h-3 w-56 rounded-full skeleton-bone-dark" />
              </div>
              <div className="grid lg:grid-cols-12 gap-5 sm:gap-6 items-start min-w-0">
                <div className="lg:col-span-8 min-w-0 w-full space-y-3">
                  <div className="aspect-video w-full rounded-xl sm:rounded-2xl skeleton-bone-dark border border-white/10" />
                  <div className="flex items-center justify-between px-1">
                    <div className="h-3.5 w-24 rounded-md skeleton-bone-dark" />
                    <div className="h-6 w-20 rounded-full skeleton-bone-dark" />
                  </div>
                </div>
                <div className="lg:col-span-4 min-w-0 w-full space-y-2.5">
                  <div className="h-3 w-24 rounded-md skeleton-bone-dark mb-1" />
                  {[1, 2, 3].map((idx) => (
                    <div
                      key={idx}
                      className="rounded-2xl border border-white/10 bg-white/[0.02] p-2.5 flex items-center gap-3"
                    >
                      <div className="h-16 w-24 shrink-0 rounded-xl skeleton-bone-dark" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-16 rounded-md skeleton-bone-dark" />
                        <div className="h-3.5 w-28 rounded-md skeleton-bone-dark" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Photography Masonry Skeleton */}
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-[#ECE6D8] pb-3">
                <div className="h-7 w-44 rounded-lg skeleton-bone" />
                <div className="hidden sm:block h-3.5 w-52 rounded-md skeleton-bone" />
              </div>
              <div className="columns-1 sm:columns-2 lg:columns-3 gap-5">
                {['3/4', '4/3', '4/5', '3/2', '3/4', '4/3'].map((ratio, idx) => (
                  <div
                    key={idx}
                    style={{ aspectRatio: ratio }}
                    className="mb-5 break-inside-avoid rounded-2xl border border-[#E5DFD0] skeleton-bone"
                  />
                ))}
              </div>
            </div>
          </div>
        ) : totalMatching === 0 ? (
          <div className="atelier-card p-12 text-center text-sm text-[#6B6352] bg-[#F8F3E6]">
            {galleryMedia.length === 0 && showcaseEvents.length === 0 && portfolio.length === 0
              ? 'Photos and highlight films uploaded in Admin → Gallery will appear here automatically.'
              : 'No gallery items match your selected filter or search.'}
          </div>
        ) : (
          <div className="space-y-10 sm:space-y-12 min-w-0">
            {/* SUB-STAGE A: DEDICATED CINEMA THEATER (Separated from Photos!) */}
            {activeFilm && (
              <div className="rounded-2xl sm:rounded-3xl border border-[#2E291F] bg-[#14120E] p-3.5 sm:p-7 text-[#F4EFE4] space-y-4 sm:space-y-5 shadow-[0_28px_64px_-24px_rgba(20,18,14,0.55)] min-w-0 w-full overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3 border-b border-white/10 pb-3.5 sm:pb-4 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="inline-flex h-2.5 w-2.5 shrink-0 rounded-full bg-[#CAA650]" />
                    <span className="text-[11px] font-bold uppercase tracking-[0.16em] sm:tracking-[0.2em] text-[#E7D1AA] truncate">
                      Signature Highlight Films ({filteredVideos.length})
                    </span>
                  </div>
                  <p className="text-xs text-[#9C937E] leading-relaxed">
                    Dedicated widescreen theater — click any reel to stream on demand
                  </p>
                </div>

                <div
                  className={cn(
                    'grid gap-5 sm:gap-6 items-start min-w-0',
                    filteredVideos.length > 1 ? 'lg:grid-cols-12' : 'grid-cols-1',
                  )}
                >
                  {/* Lead Theater Stage */}
                  <div
                    className={
                      filteredVideos.length > 1
                        ? 'lg:col-span-8 min-w-0 w-full space-y-3'
                        : 'min-w-0 w-full space-y-3'
                    }
                  >
                    <div className="rounded-xl sm:rounded-2xl overflow-hidden border border-white/10 bg-black w-full">
                      <AdaptiveVideoPlayer
                        key={activeFilm.id}
                        src={activeFilm.deliveryUrls?.fullUrl || activeFilm.secureUrl}
                        posterUrl={
                          activeFilm.deliveryUrls?.posterUrl ||
                          buildCloudinaryVideoPosterUrl(activeFilm.secureUrl, 1280)
                        }
                        title={activeFilm.caption || activeFilm.altText || branding.displayName}
                        durationSeconds={activeFilm.durationSeconds}
                        width={activeFilm.width}
                        height={activeFilm.height}
                        variant="featured"
                        isPlaying={Boolean(playingVideoIds[activeFilm.id])}
                        onPlay={() =>
                          setPlayingVideoIds((prev) => ({ ...prev, [activeFilm.id]: true }))
                        }
                        playLabel="Play Highlight Film"
                      />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                      <span className="text-xs font-medium text-[#C7BFA9]">
                        Highlight Film
                      </span>
                      <span className="rounded-full border border-white/15 bg-white/5 px-3 py-1 text-[11px] font-mono-code text-[#E7D1AA] uppercase">
                        {activeFilm.format}
                        {formatFilmDuration(activeFilm.durationSeconds)
                          ? ` • ${formatFilmDuration(activeFilm.durationSeconds)}`
                          : ''}
                      </span>
                    </div>
                  </div>

                  {/* Interactive Reel Switcher Playlist — Horizontal Snap Rail on Mobile, Playlist Column on Desktop */}
                  {filteredVideos.length > 1 && (
                    <div className="lg:col-span-4 min-w-0 w-full space-y-2.5">
                      <div className="flex items-center justify-between px-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#9C937E]">
                          Film Reels ({filteredVideos.length})
                        </p>
                        <span className="lg:hidden text-[11px] text-[#E7D1AA]/80">
                          Swipe reels →
                        </span>
                      </div>
                      <div className="flex lg:flex-col gap-2.5 w-full min-w-0 overflow-x-auto lg:overflow-x-visible lg:overflow-y-auto snap-x snap-mandatory lg:max-h-[420px] pb-1 lg:pb-0 lg:pr-1 no-scrollbar">
                        {filteredVideos.map((reel, idx) => {
                          const isCurrent = reel.id === activeFilm.id;
                          const poster =
                            reel.deliveryUrls?.posterUrl ||
                            buildCloudinaryVideoPosterUrl(reel.secureUrl, 480);
                          const duration = formatFilmDuration(reel.durationSeconds);

                          return (
                            <button
                              key={reel.id}
                              type="button"
                              onClick={() => {
                                setSelectedFilmId(reel.id);
                                setPlayingVideoIds((prev) => ({ ...prev, [reel.id]: true }));
                              }}
                              className={cn(
                                'w-[74%] min-w-[205px] max-w-[260px] lg:min-w-0 lg:w-full lg:max-w-none shrink-0 snap-start text-left rounded-2xl border p-2.5 flex items-center gap-3 transition-all cursor-pointer',
                                isCurrent
                                  ? 'border-[#E7D1AA]/75 bg-white/10 shadow-sm'
                                  : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/25',
                              )}
                            >
                              <div className="relative h-14 w-20 lg:h-16 lg:w-24 shrink-0 rounded-xl overflow-hidden bg-black">
                                {poster && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={poster}
                                    alt={`Highlight Reel ${idx + 1}`}
                                    loading="lazy"
                                    decoding="async"
                                    className="h-full w-full object-cover opacity-90"
                                  />
                                )}
                                <span className="absolute inset-0 flex items-center justify-center bg-black/30 text-white text-xs">
                                  ▶
                                </span>
                              </div>
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center justify-between gap-2">
                                  <span
                                    className={cn(
                                      'text-[10px] font-bold uppercase tracking-wider',
                                      isCurrent ? 'text-[#E7D1AA]' : 'text-[#9C937E]',
                                    )}
                                  >
                                    {isCurrent ? 'Now Playing' : `Reel ${String(idx + 1).padStart(2, '0')}`}
                                  </span>
                                  {duration && (
                                    <span className="text-[10px] font-mono-code text-[#9C937E]">
                                      {duration}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs font-semibold text-white leading-snug truncate">
                                  Highlight Film {String(idx + 1).padStart(2, '0')}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* SUB-STAGE B: EDITORIAL PHOTOGRAPHY GALLERY (Distinct Mobile Experience + Desktop Masonry) */}
            {visiblePhotos.length > 0 && (() => {
              const clampedMobileSlide = Math.min(mobileSlideIndex, visiblePhotos.length - 1);
              const progressPct = Math.max(
                8,
                Math.round(((clampedMobileSlide + 1) / visiblePhotos.length) * 100),
              );

              const jumpToMobileCard = (targetIdx: number) => {
                const rail = mobileRailRef.current;
                if (!rail) return;
                const clamped = Math.max(0, Math.min(targetIdx, visiblePhotos.length - 1));
                const card = rail.children.item(clamped) as HTMLElement | null;
                if (card) {
                  card.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
                setMobileSlideIndex(clamped);
              };

              return (
                <div className="space-y-4 sm:space-y-5 min-w-0">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#ECE6D8] pb-3 min-w-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="inline-flex h-2 w-2 shrink-0 rounded-full bg-[#CAA650]" />
                      <h3 className="font-editorial text-xl sm:text-2xl font-semibold text-[#181611] truncate">
                        Photography Wall
                      </h3>
                      <span className="rounded-full bg-[#F8F3E6] border border-[#DFCEAA] px-2.5 py-0.5 text-[11px] font-mono-code text-[#6B6352] tabular-nums shrink-0">
                        {filteredPhotos.length} frames
                      </span>
                    </div>

                    {/* Desktop caption helper */}
                    <p className="hidden sm:block text-xs text-[#6B6352]">
                      Original portrait &amp; landscape framing — click any frame for full resolution
                    </p>

                    {/* Distinct Mobile Mode Toggle: Story Swipe vs 2-Col Lookbook Grid */}
                    <div className="sm:hidden inline-flex rounded-xl border border-[#DFCEAA] bg-[#F8F3E6] p-1 gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => setMobilePhotoMode('swipe')}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer',
                          mobilePhotoMode === 'swipe'
                            ? 'bg-[#181611] text-white shadow-2xs'
                            : 'text-[#4A4438]',
                        )}
                      >
                        <GalleryHorizontalIcon className="w-3.5 h-3.5" />
                        <span>Story Swipe</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setMobilePhotoMode('grid')}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-all cursor-pointer',
                          mobilePhotoMode === 'grid'
                            ? 'bg-[#181611] text-white shadow-2xs'
                            : 'text-[#4A4438]',
                        )}
                      >
                        <LayoutGridIcon className="w-3.5 h-3.5" />
                        <span>2-Col Grid</span>
                      </button>
                    </div>
                  </div>

                  {/* MOBILE VIEW A: Thumb-Friendly Horizontal Snap-Scroll Lookbook Deck */}
                  {mobilePhotoMode === 'swipe' && (
                    <div className="sm:hidden space-y-3 min-w-0 w-full">
                      <div className="flex items-center justify-between gap-2 text-[11.5px] text-[#6B6352]">
                        <span className="font-medium tabular-nums truncate">
                          Frame <strong className="text-[#181611]">{clampedMobileSlide + 1}</strong> of{' '}
                          {visiblePhotos.length} • Tap photo to zoom
                        </span>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => jumpToMobileCard(clampedMobileSlide - 1)}
                            disabled={clampedMobileSlide === 0}
                            aria-label="Previous gallery frame"
                            className="h-7 w-7 rounded-full border border-[#DFCEAA] bg-[#F8F3E6] text-xs font-bold text-[#181611] disabled:opacity-40 cursor-pointer"
                          >
                            ‹
                          </button>
                          <button
                            type="button"
                            onClick={() => jumpToMobileCard(clampedMobileSlide + 1)}
                            disabled={clampedMobileSlide >= visiblePhotos.length - 1}
                            aria-label="Next gallery frame"
                            className="h-7 w-7 rounded-full border border-[#DFCEAA] bg-[#F8F3E6] text-xs font-bold text-[#181611] disabled:opacity-40 cursor-pointer"
                          >
                            ›
                          </button>
                        </div>
                      </div>

                      <div
                        ref={mobileRailRef}
                        onScroll={(e) => {
                          const rail = e.currentTarget;
                          const firstCard = rail.firstElementChild as HTMLElement | null;
                          if (!firstCard) return;
                          const step = firstCard.offsetWidth + 12;
                          if (step <= 0) return;
                          const next = Math.max(
                            0,
                            Math.min(Math.round(rail.scrollLeft / step), visiblePhotos.length - 1),
                          );
                          if (next !== mobileSlideIndex) {
                            setMobileSlideIndex(next);
                          }
                        }}
                        className="flex w-full min-w-0 overflow-x-auto snap-x snap-mandatory gap-3 pb-1 no-scrollbar"
                      >
                        {visiblePhotos.map((media, idx) => {
                          const thumbUrl =
                            buildCloudinaryImageUrl(media.secureUrl, {
                              width: 900,
                              crop: 'limit',
                            }) ||
                            media.deliveryUrls?.thumbnailUrl ||
                            media.secureUrl;

                          return (
                            <button
                              key={media.id}
                              type="button"
                              onClick={() => setSelectedGalleryPhoto(media)}
                              className="relative w-[84%] max-w-[320px] shrink-0 snap-center aspect-[4/5] rounded-2xl overflow-hidden border border-[#DFCEAA] bg-[#EFECE3] text-left shadow-sm active:scale-[0.99] transition-transform cursor-pointer"
                            >
                              <LazyViewportImage
                                src={thumbUrl}
                                srcSet={buildCloudinarySrcSet(media.secureUrl, [480, 800, 1000])}
                                sizes="82vw"
                                alt={media.altText || media.caption || branding.displayName}
                                containerClassName="h-full w-full"
                                className="h-full w-full object-cover"
                              />

                              <span className="absolute top-3 left-3 rounded-full bg-[#14120E]/75 backdrop-blur-xs border border-[#CAA650]/40 px-2.5 py-0.5 text-[10.5px] font-semibold text-[#E7D1AA] tabular-nums">
                                {String(idx + 1).padStart(2, '0')} /{' '}
                                {String(visiblePhotos.length).padStart(2, '0')}
                              </span>

                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#14120E]/90 via-[#14120E]/45 to-transparent p-3.5 pt-10 flex items-end justify-between gap-2">
                                <p className="text-xs font-semibold text-white truncate">
                                  {media.caption || media.altText || 'Full-Resolution Frame'}
                                </p>
                                <span className="shrink-0 rounded-full bg-[#CAA650] px-2.5 py-1 text-[10px] font-bold text-[#181611] shadow-xs">
                                  ⤢ View
                                </span>
                              </div>
                            </button>
                          );
                        })}

                        {hasMorePhotos && (
                          <button
                            type="button"
                            onClick={() =>
                              setVisiblePhotoCount((prev) => prev + INITIAL_PHOTO_BATCH)
                            }
                            className="w-[68%] max-w-[260px] shrink-0 snap-center aspect-[4/5] rounded-2xl border border-dashed border-[#CAA650] bg-[#F8F3E6] p-5 flex flex-col items-center justify-center text-center gap-2 text-[#181611] cursor-pointer"
                          >
                            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#181611] text-[#E7D1AA] text-sm font-bold">
                              +
                            </span>
                            <span className="text-xs font-semibold">
                              Load {Math.min(INITIAL_PHOTO_BATCH, filteredPhotos.length - visiblePhotos.length)} More Photos
                            </span>
                            <span className="text-[11px] text-[#6B6352] tabular-nums">
                              {filteredPhotos.length - visiblePhotos.length} more frames available
                            </span>
                          </button>
                        )}
                      </div>

                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#EFECE3]">
                        <div
                          className="h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${progressPct}%`,
                            background: 'linear-gradient(90deg, #8B6A21 0%, #CAA650 100%)',
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* MOBILE VIEW B: Compact 2-Column Lookbook Thumbnail Grid */}
                  {mobilePhotoMode === 'grid' && (
                    <div className="sm:hidden space-y-4">
                      <div className="grid grid-cols-2 gap-2.5">
                        {visiblePhotos.map((media) => {
                          const thumbUrl =
                            buildCloudinaryImageUrl(media.secureUrl, {
                              width: 640,
                              crop: 'limit',
                            }) ||
                            media.deliveryUrls?.thumbnailUrl ||
                            media.secureUrl;

                          return (
                            <button
                              key={media.id}
                              type="button"
                              onClick={() => setSelectedGalleryPhoto(media)}
                              className="group relative aspect-[3/4] rounded-xl overflow-hidden border border-[#E5DFD0] bg-[#EFECE3] text-left cursor-pointer active:scale-[0.98] transition-transform"
                            >
                              <LazyViewportImage
                                src={thumbUrl}
                                srcSet={buildCloudinarySrcSet(media.secureUrl, [400, 720])}
                                sizes="46vw"
                                alt={media.altText || media.caption || branding.displayName}
                                containerClassName="h-full w-full"
                                className="h-full w-full object-cover"
                              />
                              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#14120E]/85 via-transparent to-transparent p-2 pt-6 flex items-end justify-between gap-1">
                                <span className="text-[10.5px] font-medium text-white truncate">
                                  {media.caption || 'Frame'}
                                </span>
                                <span className="shrink-0 rounded-full bg-white/90 px-1.5 py-0.5 text-[9.5px] font-bold text-[#181611]">
                                  ⤢
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>

                      {hasMorePhotos && (
                        <div className="flex justify-center pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              setVisiblePhotoCount((prev) => prev + INITIAL_PHOTO_BATCH)
                            }
                            className="inline-flex items-center gap-2 rounded-xl border bg-[#F8F3E6] px-5 py-2.5 text-xs font-semibold text-[#181611] shadow-2xs"
                            style={{ borderColor: accent }}
                          >
                            Load More ({filteredPhotos.length - visiblePhotos.length} remaining)
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* TABLET & DESKTOP VIEW: Editorial True-Aspect Masonry Wall */}
                  <div className="hidden sm:block space-y-5">
                    <div className="sm:columns-2 lg:columns-3 gap-5">
                      {visiblePhotos.map((media) => {
                        const thumbUrl =
                          buildCloudinaryImageUrl(media.secureUrl, {
                            width: 960,
                            crop: 'limit',
                          }) ||
                          media.deliveryUrls?.thumbnailUrl ||
                          media.secureUrl;
                        const aspectRatio = resolveNaturalAspectRatio(media.width, media.height);

                        return (
                          <button
                            key={media.id}
                            type="button"
                            onClick={() => setSelectedGalleryPhoto(media)}
                            className="group relative mb-5 break-inside-avoid block w-full text-left rounded-2xl overflow-hidden border border-[#E5DFD0] bg-[#EFECE3] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CAA650] shadow-2xs hover:shadow-[0_18px_40px_-18px_rgba(24,22,17,0.28)] transition-all duration-300"
                          >
                            <LazyViewportImage
                              src={thumbUrl}
                              srcSet={buildCloudinarySrcSet(media.secureUrl, [480, 800, 1200])}
                              sizes="(max-width: 1024px) 50vw, 380px"
                              alt={media.altText || media.caption || branding.displayName}
                              containerStyle={{ aspectRatio }}
                              containerClassName="w-full"
                              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                            />

                            {/* Clean Floating Exhibition Scrim Overlay */}
                            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[#14120E]/85 via-[#14120E]/30 to-transparent p-4 pt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-xs sm:text-sm font-semibold text-white truncate">
                                  {media.caption || media.altText || 'Full-Resolution Frame'}
                                </p>
                              </div>
                              <span className="shrink-0 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-bold text-[#181611]">
                                ⤢ View
                              </span>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {hasMorePhotos && (
                      <div className="flex justify-center pt-2">
                        <button
                          type="button"
                          onClick={() => setVisiblePhotoCount((prev) => prev + INITIAL_PHOTO_BATCH)}
                          className="inline-flex items-center gap-2 rounded-xl border bg-[#F8F3E6] px-6 py-3 text-xs sm:text-sm font-semibold text-[#181611] shadow-2xs hover:bg-white transition-all cursor-pointer"
                          style={{ borderColor: accent }}
                        >
                          <span>
                            Load More Photography ({filteredPhotos.length - visiblePhotos.length}{' '}
                            remaining)
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SUB-STAGE C: EVENT STORIES GRID (When Event Stories tab or search matches) */}
            {filteredEvents.length > 0 && (
              <div className="space-y-5">
                <div className="flex items-center justify-between border-b border-[#ECE6D8] pb-3">
                  <h3 className="font-editorial text-2xl font-semibold text-[#181611]">
                    Event Stories ({filteredEvents.length})
                  </h3>
                  <Link
                    href="/portfolio"
                    className="text-xs font-semibold hover:underline"
                    style={{ color: accent }}
                  >
                    Open Full Portfolio Directory →
                  </Link>
                </div>
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredEvents.map((ev) => {
                    const rawCoverUrl = ev.coverMedia?.secureUrl || '';
                    const coverUrl =
                      ev.coverMedia?.deliveryUrls?.coverUrl ||
                      buildCloudinaryImageUrl(rawCoverUrl, { width: 800, crop: 'limit' });
                    const photoCount = ev.counts?.photos ?? 0;
                    const videoCount = ev.counts?.videos ?? 0;

                    return (
                      <div
                        key={ev.id}
                        className="group atelier-card atelier-card-hover overflow-hidden flex flex-col justify-between bg-white"
                      >
                        <button
                          type="button"
                          onClick={() => setActiveShowcaseEvent(ev)}
                          className="text-left flex-1 flex flex-col cursor-pointer focus-visible:outline-none"
                        >
                          <div className="aspect-[4/3] w-full bg-[#EFECE3] relative overflow-hidden">
                            {coverUrl ? (
                              <LazyViewportImage
                                src={coverUrl}
                                srcSet={rawCoverUrl ? buildCloudinarySrcSet(rawCoverUrl) : undefined}
                                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                                alt={ev.coverMedia?.altText || ev.title}
                                containerClassName="h-full w-full"
                                className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center bg-[#181611] text-[#C7BFA9] text-xs font-medium">
                                Showcase Event
                              </div>
                            )}

                            <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2 pointer-events-none">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-[#14120E]/80 backdrop-blur-xs px-3 py-1 text-[11px] font-semibold text-white">
                                {photoCount > 0 ? `${photoCount} Photos` : 'Story'}
                                {videoCount > 0 ? ` • ${videoCount} Film` : ''}
                              </span>
                              {ev.eventType && (
                                <span className="rounded-full bg-white/95 backdrop-blur-xs px-2.5 py-0.5 text-[11px] font-bold text-[#181611]">
                                  {ev.eventType.name}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="p-5 flex-1">
                            {ev.eventDate && (
                              <div className="flex items-center gap-1.5 text-xs text-[#6B6352] mb-1 font-mono-code">
                                <CalendarIcon className="w-3.5 h-3.5 text-[#CAA650]" />
                                <span>{formatLocalDate(ev.eventDate)}</span>
                              </div>
                            )}
                            <h3 className="font-editorial text-xl font-semibold text-[#181611] group-hover:text-[#8B6A21] transition-colors">
                              {ev.title}
                            </h3>
                            {parseAlbumDescriptionAndTheme(ev.description).cleanDescription && (
                              <p className="mt-1 text-xs sm:text-sm text-[#4A4438] line-clamp-2">
                                {parseAlbumDescriptionAndTheme(ev.description).cleanDescription}
                              </p>
                            )}
                          </div>
                        </button>

                        <div className="px-5 py-3 border-t border-[#ECE6D8] bg-[#F8F3E6]/60 flex items-center justify-between gap-2">
                          <button
                            type="button"
                            onClick={() => setActiveShowcaseEvent(ev)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#181611] hover:text-[#8B6A21] cursor-pointer"
                          >
                            <span>Explore Story</span>
                            <ArrowRightIcon className="w-3.5 h-3.5" />
                          </button>
                          <Link
                            href={`/album/${ev.slug}`}
                            className="text-xs font-semibold text-[#6B6352] hover:text-[#181611]"
                          >
                            Full Page ↗
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Legacy Portfolio Fallback Items if any exist */}
            {filteredLegacyItems.length > 0 && (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filteredLegacyItems.map((item) => {
                  const parsed = parseShowcaseMedia(item.mediaUrl);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setActiveShowcaseItem(item)}
                      className="group text-left atelier-card atelier-card-hover overflow-hidden flex flex-col cursor-pointer bg-white"
                    >
                      <div className="aspect-[4/3] w-full bg-[#EFECE3] relative overflow-hidden">
                        {parsed.coverUrl ? (
                          <LazyViewportImage
                            src={buildCloudinaryImageUrl(parsed.coverUrl, {
                              width: 800,
                              crop: 'limit',
                            })}
                            srcSet={buildCloudinarySrcSet(parsed.coverUrl)}
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 380px"
                            alt={item.title}
                            containerClassName="h-full w-full"
                            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center bg-[#181611] text-[#C7BFA9] text-xs font-medium">
                            Video Film
                          </div>
                        )}
                        <span className="absolute top-3 left-3 inline-flex items-center gap-1.5 rounded-full bg-[#14120E]/80 backdrop-blur-xs px-3 py-1 text-xs font-medium text-white pointer-events-none">
                          {parsed.kind === 'video' ? '▶ Video Film' : 'Photo Gallery'}
                        </span>
                      </div>
                      <div className="p-5 flex-1">
                        <h3 className="font-editorial text-xl font-semibold text-[#181611] group-hover:text-[#8B6A21]">
                          {item.title}
                        </h3>
                        {item.description && (
                          <p className="mt-1 text-xs text-[#4A4438] line-clamp-2">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Full-Screen Cinema Lightbox for Direct Studio Gallery Photos */}
      {selectedGalleryPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onTouchStart={(e) => {
            lightboxTouchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (lightboxTouchStartX.current === null || filteredPhotos.length <= 1) return;
            const endX = e.changedTouches[0]?.clientX ?? lightboxTouchStartX.current;
            const diff = lightboxTouchStartX.current - endX;
            lightboxTouchStartX.current = null;
            if (Math.abs(diff) > 45) {
              if (diff > 0) goNextGalleryPhoto();
              else goPrevGalleryPhoto();
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelectedGalleryPhoto(null);
          }}
          className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#14120E]/95 p-3 sm:p-4 backdrop-blur-xs touch-pan-y select-none"
        >
          <div className="w-full max-w-5xl flex items-center justify-between text-white pb-2 gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#CAA650]/20 border border-[#CAA650]/40 px-2.5 py-0.5 text-xs font-mono-code text-[#E7D1AA] shrink-0 tabular-nums">
                  {selectedPhotoIndex + 1} / {filteredPhotos.length}
                </span>
                <p className="text-sm font-semibold truncate">
                  {selectedGalleryPhoto.caption || branding.displayName}
                </p>
              </div>
              {selectedGalleryPhoto.altText && (
                <p className="text-xs text-[#C7BFA9] mt-0.5 truncate">
                  {selectedGalleryPhoto.altText}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedGalleryPhoto(null)}
              className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer"
            >
              ← Back to Gallery
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center w-full max-w-5xl overflow-hidden py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                selectedGalleryPhoto.deliveryUrls?.fullUrl ||
                buildCloudinaryImageUrl(selectedGalleryPhoto.secureUrl, {
                  width: 1920,
                  crop: 'limit',
                })
              }
              srcSet={buildCloudinarySrcSet(
                selectedGalleryPhoto.secureUrl,
                [800, 1200, 1600, 1920],
              )}
              sizes="95vw"
              alt={
                selectedGalleryPhoto.altText ||
                selectedGalleryPhoto.caption ||
                branding.displayName
              }
              className="max-h-[74vh] w-auto rounded-xl object-contain shadow-2xl"
            />

            {filteredPhotos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrevGalleryPhoto();
                  }}
                  aria-label="Previous photo"
                  className="absolute left-2 sm:left-4 rounded-full bg-[#181611]/85 border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-[#8B6A21] transition-colors cursor-pointer"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNextGalleryPhoto();
                  }}
                  aria-label="Next photo"
                  className="absolute right-2 sm:right-4 rounded-full bg-[#181611]/85 border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-[#8B6A21] transition-colors cursor-pointer"
                >
                  →
                </button>
              </>
            )}
          </div>

          {/* Bottom Thumbnail Filmstrip */}
          {filteredPhotos.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto max-w-4xl py-2">
              {filteredPhotos.map((p, idx) => {
                const stripThumb =
                  p.deliveryUrls?.thumbnailUrl ||
                  buildCloudinaryImageUrl(p.secureUrl, {
                    width: 200,
                    height: 140,
                    crop: 'fill',
                  });
                const isActive = p.id === selectedGalleryPhoto.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedGalleryPhoto(p);
                    }}
                    className={cn(
                      'h-12 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer',
                      isActive
                        ? 'border-[#E7D1AA] opacity-100 scale-105'
                        : 'border-transparent opacity-50 hover:opacity-85',
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={stripThumb}
                      alt={p.altText || `Photo ${idx + 1}`}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {activeShowcaseEvent && (
        <PortfolioEventDetailModal
          event={activeShowcaseEvent}
          onClose={() => setActiveShowcaseEvent(null)}
        />
      )}

      {activeShowcaseItem && (
        <ShowcaseLightboxModal
          item={activeShowcaseItem}
          onClose={() => setActiveShowcaseItem(null)}
        />
      )}
    </section>
  );
}
