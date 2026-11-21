'use client';

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Image from 'next/image';
import {
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
  PublicBranding,
} from '@/types/event-management';
import { buildCloudinaryVideoPosterUrl } from '@/lib/showcaseMedia';
import { parseAlbumDescriptionAndTheme } from '@/lib/albumTheme';
import { cn } from '@/lib/utils';
import { BrandMark } from '@/components/common/BrandMark';
import { AdaptiveVideoPlayer } from './AdaptiveVideoPlayer';
import { isNextOptimizableUrl, LazyAlbumImage } from './LazyAlbumImage';

interface PortfolioEventPageClientProps {
  event: PortfolioShowcaseEvent;
  branding: PublicBranding;
}

type MediaFilter = 'all' | 'photos' | 'videos' | 'favorites';

const INITIAL_PHOTO_BATCH = 9;
const PHOTO_BATCH_STEP = 9;
const SHIMMER_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTdlMmRhIi8+PC9zdmc+';

export function PortfolioEventPageClient({
  event,
  branding,
}: PortfolioEventPageClientProps) {
  const readyMedia = useMemo(
    () => (event.media || []).filter((m) => m.status === 'READY'),
    [event.media],
  );
  const photos = useMemo(
    () => readyMedia.filter((m) => m.resourceType === 'IMAGE'),
    [readyMedia],
  );
  const videos = useMemo(
    () => readyMedia.filter((m) => m.resourceType === 'VIDEO'),
    [readyMedia],
  );

  const { theme: savedTheme } = useMemo(
    () => parseAlbumDescriptionAndTheme(event.description),
    [event.description],
  );

  // Respects the per-album saved Theme Settings while allowing the client to toggle Daylight/Cinema
  const [invertViewerTheme, setInvertViewerTheme] = useState(false);
  const darkGallery = invertViewerTheme ? !savedTheme.isDark : savedTheme.isDark;
  const activeBg = !invertViewerTheme
    ? savedTheme.bg
    : darkGallery
      ? '#0B0C10'
      : '#FAF8F5';
  const activeSurface = !invertViewerTheme
    ? savedTheme.surface
    : darkGallery
      ? '#14151C'
      : '#FFFFFF';
  const activeText = !invertViewerTheme
    ? savedTheme.text
    : darkGallery
      ? '#F5F5F4'
      : '#1C1917';
  const activeAccent = savedTheme.accent;
  const [mediaFilter, setMediaFilter] = useState<MediaFilter>('all');
  const [visiblePhotoLimit, setVisiblePhotoLimit] = useState(INITIAL_PHOTO_BATCH);

  // Lightbox Gallery Slider state (opened when clicking any grid photo)
  const [selectedPhoto, setSelectedPhoto] = useState<PortfolioMediaItem | null>(null);
  const [isSlideshowPlaying, setIsSlideshowPlaying] = useState(false);

  // Video Play gate: NO video file is downloaded until the viewer clicks Play
  const [playingVideoIds, setPlayingVideoIds] = useState<Record<string, boolean>>({});
  const [copiedAlbumUrl, setCopiedAlbumUrl] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  // SSR-safe localStorage Favorites shortlist per album
  const favStorageKey = `album_favorites_${event.id}`;
  const favRaw = useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === 'undefined') return () => {};
      const handler = () => onStoreChange();
      window.addEventListener('storage', handler);
      window.addEventListener('album-favorites-change', handler);
      return () => {
        window.removeEventListener('storage', handler);
        window.removeEventListener('album-favorites-change', handler);
      };
    },
    () => {
      try {
        return window.localStorage.getItem(favStorageKey) || '[]';
      } catch {
        return '[]';
      }
    },
    () => '[]',
  );

  const favoriteIds = useMemo<string[]>(() => {
    try {
      const parsed = JSON.parse(favRaw);
      return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
    } catch {
      return [];
    }
  }, [favRaw]);

  const toggleFavorite = (photoId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      const next = favoriteIds.includes(photoId)
        ? favoriteIds.filter((id) => id !== photoId)
        : [...favoriteIds, photoId];
      window.localStorage.setItem(favStorageKey, JSON.stringify(next));
      window.dispatchEvent(new Event('album-favorites-change'));
    } catch {
      // ignore storage quota errors
    }
  };

  const displayedPhotos = useMemo(() => {
    if (mediaFilter === 'favorites') {
      return photos.filter((p) => favoriteIds.includes(p.id));
    }
    return photos;
  }, [photos, favoriteIds, mediaFilter]);

  const visiblePhotos = useMemo(
    () => displayedPhotos.slice(0, visiblePhotoLimit),
    [displayedPhotos, visiblePhotoLimit],
  );
  const hasMorePhotos = visiblePhotoLimit < displayedPhotos.length;

  // Automatic infinite scroll batching for photo grid
  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;
    if (!sentinel || !hasMorePhotos || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisiblePhotoLimit((prev) =>
              Math.min(prev + PHOTO_BATCH_STEP, displayedPhotos.length),
            );
            break;
          }
        }
      },
      { rootMargin: '220px 0px', threshold: 0.01 },
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMorePhotos, displayedPhotos.length, mediaFilter]);

  const selectedPhotoIndex = selectedPhoto
    ? displayedPhotos.findIndex((p) => p.id === selectedPhoto.id)
    : -1;

  // Windowed bottom filmstrip (only ±6 neighbors around active photo so large albums stay fast)
  const filmstripWindow = useMemo(() => {
    if (displayedPhotos.length <= 1) return [];
    const idx = selectedPhotoIndex >= 0 ? selectedPhotoIndex : 0;
    const start = Math.max(0, idx - 6);
    const end = Math.min(displayedPhotos.length, idx + 7);
    return displayedPhotos.slice(start, end);
  }, [displayedPhotos, selectedPhotoIndex]);

  const goPrevLightbox = () => {
    if (displayedPhotos.length <= 1 || selectedPhotoIndex === -1) return;
    setSelectedPhoto(
      displayedPhotos[(selectedPhotoIndex - 1 + displayedPhotos.length) % displayedPhotos.length],
    );
  };

  const goNextLightbox = () => {
    if (displayedPhotos.length <= 1 || selectedPhotoIndex === -1) return;
    setSelectedPhoto(displayedPhotos[(selectedPhotoIndex + 1) % displayedPhotos.length]);
  };

  // Optional autoplay inside the Lightbox Gallery Slider only
  useEffect(() => {
    if (!isSlideshowPlaying || !selectedPhoto || displayedPhotos.length <= 1) return undefined;
    const id = window.setInterval(() => {
      setSelectedPhoto((curr) => {
        if (!curr) return displayedPhotos[0];
        const idx = displayedPhotos.findIndex((p) => p.id === curr.id);
        return displayedPhotos[(idx + 1) % displayedPhotos.length];
      });
    }, 3800);
    return () => window.clearInterval(id);
  }, [isSlideshowPlaying, selectedPhoto, displayedPhotos]);

  // Keyboard navigation in Lightbox Gallery Slider
  useEffect(() => {
    if (!selectedPhoto) return undefined;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedPhoto(null);
        setIsSlideshowPlaying(false);
      } else if (e.key === 'ArrowRight' && displayedPhotos.length > 1 && selectedPhotoIndex !== -1) {
        setSelectedPhoto(displayedPhotos[(selectedPhotoIndex + 1) % displayedPhotos.length]);
      } else if (e.key === 'ArrowLeft' && displayedPhotos.length > 1 && selectedPhotoIndex !== -1) {
        setSelectedPhoto(
          displayedPhotos[
            (selectedPhotoIndex - 1 + displayedPhotos.length) % displayedPhotos.length
          ],
        );
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPhoto, selectedPhotoIndex, displayedPhotos]);

  const handleCopyAlbumLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedAlbumUrl(true);
      setTimeout(() => setCopiedAlbumUrl(false), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  const featuredFilm = videos[0] ?? null;
  const secondaryFilms = videos.slice(1);

  const coverItem = event.coverMedia || photos[0] || null;
  const coverMasterUrl = coverItem?.secureUrl || '';
  const coverAltText = coverItem?.altText || event.title;
  const coverWidth = coverItem?.width && coverItem.width > 0 ? coverItem.width : 1600;
  const coverHeight = coverItem?.height && coverItem.height > 0 ? coverItem.height : 1200;

  const albumHeadingStyle = {
    fontFamily: 'var(--font-sans), system-ui, sans-serif',
  };

  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleWatchFeaturedFilm = () => {
    if (!featuredFilm) return;
    setMediaFilter('all');
    setPlayingVideoIds((prev) => ({ ...prev, [featuredFilm.id]: true }));
    scrollToSection('cinematic-film-showcase');
  };

  const showVideos =
    (mediaFilter === 'all' || mediaFilter === 'videos') && videos.length > 0;
  const showPhotos =
    (mediaFilter === 'all' || mediaFilter === 'photos' || mediaFilter === 'favorites') &&
    photos.length > 0;

  return (
    <div
      style={{ backgroundColor: activeBg, color: activeText }}
      className="min-h-screen flex flex-col transition-colors duration-300"
    >
      {/* Clean Single-Row Album Top Bar */}
      <header
        style={{ backgroundColor: `${activeBg}E6` }}
        className={cn(
          'sticky top-0 z-30 border-b backdrop-blur-md transition-colors',
          darkGallery ? 'border-white/10' : 'border-stone-200/80',
        )}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <BrandMark
              logoUrl={branding.logoUrl}
              alt={branding.displayName}
              size={34}
              variant={darkGallery ? 'dark' : 'light'}
              className="rounded-full"
            />
            <div className="min-w-0">
              <p
                className={cn(
                  'text-[10px] uppercase tracking-[0.24em]',
                  darkGallery ? 'text-stone-400' : 'text-stone-500',
                )}
              >
                {branding.displayName} • Digital Album
              </p>
              <p className="text-xs sm:text-sm font-semibold truncate">{event.title}</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setInvertViewerTheme((v) => !v)}
              title={darkGallery ? 'Switch to Daylight Gallery' : 'Switch to Cinema Dark'}
              className={cn(
                'rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors cursor-pointer',
                darkGallery
                  ? 'border-white/15 bg-white/5 text-stone-200 hover:bg-white/10'
                  : 'border-stone-200 bg-white text-stone-700 hover:bg-stone-100',
              )}
            >
              {darkGallery ? '☀ Daylight' : '☾ Cinema'}
            </button>

            <button
              type="button"
              onClick={() => void handleCopyAlbumLink()}
              style={{ backgroundColor: activeAccent, color: '#FFFFFF' }}
              className="rounded-full px-4 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-90 cursor-pointer"
            >
              {copiedAlbumUrl ? 'Link Copied ✓' : 'Share Album'}
            </button>
          </div>
        </div>
      </header>

      {/* Editorial Album Cover Hero (Single preloaded LCP cover image) */}
      <section
        style={{ backgroundColor: activeSurface }}
        className={cn(
          'border-b transition-colors',
          darkGallery ? 'border-white/10' : 'border-stone-200/70',
        )}
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12">
          <div className="grid gap-8 lg:grid-cols-12 items-center">
            {coverMasterUrl && (
              <div className="lg:col-span-7 flex justify-center">
                <div
                  style={{ backgroundColor: activeBg }}
                  className={cn(
                    'inline-flex max-w-full rounded-2xl p-2.5 sm:p-3.5 transition-all overflow-hidden',
                    darkGallery
                      ? 'border border-white/10 shadow-2xl'
                      : 'border border-stone-200/90 shadow-[0_24px_60px_-20px_rgba(24,24,27,0.18)]',
                  )}
                >
                  <Image
                    src={coverMasterUrl}
                    alt={coverAltText}
                    width={coverWidth}
                    height={coverHeight}
                    preload
                    quality={92}
                    placeholder="blur"
                    blurDataURL={SHIMMER_BLUR_DATA_URL}
                    unoptimized={!isNextOptimizableUrl(coverMasterUrl)}
                    sizes="(max-width: 1024px) 100vw, 680px"
                    className="w-auto h-auto max-w-full max-h-[460px] sm:max-h-[540px] object-contain rounded-xl block"
                  />
                </div>
              </div>
            )}

            <div
              className={cn(
                'space-y-5',
                coverMasterUrl
                  ? 'lg:col-span-5 text-center lg:text-left'
                  : 'lg:col-span-12 text-center max-w-2xl mx-auto py-6',
              )}
            >
              <div className="space-y-2.5">
                <p
                  className={cn(
                    'text-[11px] uppercase tracking-[0.32em] font-medium',
                    darkGallery ? 'text-amber-200/90' : 'text-stone-500',
                  )}
                >
                  Digital Photo &amp; Film Album
                </p>
                <h1
                  style={albumHeadingStyle}
                  className="text-3xl sm:text-4xl lg:text-[44px] font-semibold tracking-tight leading-[1.08]"
                >
                  {event.title}
                </h1>
              </div>

              <div
                className={cn(
                  'h-px w-16',
                  coverMasterUrl ? 'mx-auto lg:mx-0' : 'mx-auto',
                  darkGallery ? 'bg-white/20' : 'bg-stone-300',
                )}
              />

              <div
                className={cn(
                  'flex flex-wrap items-center gap-2.5 text-xs tracking-wide',
                  coverMasterUrl ? 'justify-center lg:justify-start' : 'justify-center',
                  darkGallery ? 'text-stone-300' : 'text-stone-600',
                )}
              >
                {videos.length > 0 && (
                  <span
                    className={cn(
                      'rounded-full border px-3 py-1 font-medium',
                      darkGallery
                        ? 'border-amber-300/30 bg-amber-200/10 text-amber-100'
                        : 'border-stone-300 bg-white text-stone-800',
                    )}
                  >
                    {videos.length} Cinematic {videos.length === 1 ? 'Film' : 'Films'}
                  </span>
                )}
                {photos.length > 0 && (
                  <span
                    className={cn(
                      'rounded-full border px-3 py-1 font-medium',
                      darkGallery
                        ? 'border-white/15 bg-white/5'
                        : 'border-stone-200 bg-white',
                    )}
                  >
                    {photos.length} Photographs
                  </span>
                )}
              </div>

              <div
                className={cn(
                  'flex flex-wrap items-center gap-3 pt-1',
                  coverMasterUrl ? 'justify-center lg:justify-start' : 'justify-center',
                )}
              >
                {featuredFilm && (
                  <button
                    type="button"
                    onClick={handleWatchFeaturedFilm}
                    style={{ backgroundColor: activeAccent, color: '#FFFFFF' }}
                    className="rounded-full px-6 py-2.5 text-xs font-semibold tracking-wide transition-opacity hover:opacity-90 cursor-pointer shadow-sm"
                  >
                    ▶ Watch Cinematic Film
                  </button>
                )}
                {photos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => scrollToSection('photo-grid-gallery')}
                    style={
                      !featuredFilm
                        ? { backgroundColor: activeAccent, color: '#FFFFFF' }
                        : undefined
                    }
                    className={cn(
                      'rounded-full border px-6 py-2.5 text-xs font-semibold tracking-wide transition-all cursor-pointer',
                      featuredFilm
                        ? darkGallery
                          ? 'border-white/20 bg-white/5 text-stone-100 hover:bg-white/10'
                          : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-50'
                        : 'border-transparent hover:opacity-90',
                    )}
                  >
                    Browse Photo Grid ↓
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 sm:py-12 space-y-14">
        {/* Clean Media Filter Strip */}
        {(photos.length > 0 || videos.length > 0) && (
          <div
            className={cn(
              'flex flex-wrap items-center justify-between gap-3 border-b pb-4',
              darkGallery ? 'border-white/10' : 'border-stone-200/80',
            )}
          >
            <div
              className={cn(
                'inline-flex flex-wrap rounded-full border p-1 gap-1',
                darkGallery
                  ? 'border-white/10 bg-white/[0.04]'
                  : 'border-stone-200 bg-white shadow-2xs',
              )}
            >
              {[
                { id: 'all' as const, label: `All (${readyMedia.length})`, show: true },
                {
                  id: 'videos' as const,
                  label: `Cinematic Film (${videos.length})`,
                  show: videos.length > 0,
                },
                {
                  id: 'photos' as const,
                  label: `Photo Gallery (${photos.length})`,
                  show: photos.length > 0,
                },
                {
                  id: 'favorites' as const,
                  label: `♥ Favorites (${favoriteIds.length})`,
                  show: favoriteIds.length > 0,
                },
              ]
                .filter((item) => item.show)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setMediaFilter(item.id);
                      setVisiblePhotoLimit(INITIAL_PHOTO_BATCH);
                    }}
                    style={
                      mediaFilter === item.id
                        ? { backgroundColor: activeAccent, color: '#FFFFFF' }
                        : undefined
                    }
                    className={cn(
                      'rounded-full px-4 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                      mediaFilter === item.id
                        ? 'shadow-2xs'
                        : darkGallery
                          ? 'text-stone-300 hover:text-white'
                          : 'text-stone-600 hover:text-stone-900',
                    )}
                  >
                    {item.label}
                  </button>
                ))}
            </div>

            {photos.length > 0 && (
              <p className={cn('text-xs', darkGallery ? 'text-stone-400' : 'text-stone-500')}>
                Click any photo to open full-screen gallery slider
              </p>
            )}
          </div>
        )}

        {/* Section 1: Highlighted Full-Width Cinematic Video Showcase (Poster & Stream Strict On-Demand) */}
        {showVideos && featuredFilm && (
          <section id="cinematic-film-showcase" className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p
                  className={cn(
                    'text-[10px] uppercase tracking-[0.28em] font-semibold',
                    darkGallery ? 'text-amber-200/90' : 'text-stone-500',
                  )}
                >
                  Featured Cinema Showcase
                </p>
                <h2
                  style={albumHeadingStyle}
                  className="text-3xl sm:text-4xl font-semibold tracking-tight mt-0.5"
                >
                  {featuredFilm.caption || 'Cinematic Highlight Film'}
                </h2>
              </div>

              <a
                href={featuredFilm.deliveryUrls?.fullUrl || featuredFilm.secureUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className={cn(
                  'rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors',
                  darkGallery
                    ? 'border-white/15 bg-white/5 text-stone-200 hover:bg-white/10'
                    : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100',
                )}
              >
                Download Film ↓
              </a>
            </div>

            {(() => {
              const isPlaying = Boolean(playingVideoIds[featuredFilm.id]);
              const posterUrl =
                buildCloudinaryVideoPosterUrl(featuredFilm.secureUrl, 1920) ||
                featuredFilm.deliveryUrls?.posterUrl ||
                coverMasterUrl;
              const streamUrl = featuredFilm.deliveryUrls?.fullUrl || featuredFilm.secureUrl;

              return (
                <div
                  className={cn(
                    'rounded-2xl p-2 sm:p-3 transition-all',
                    darkGallery
                      ? 'bg-[#14151c] border border-white/15 shadow-[0_30px_90px_-20px_rgba(0,0,0,0.9)]'
                      : 'bg-stone-950 border border-stone-800 shadow-[0_30px_80px_-20px_rgba(24,24,27,0.35)]',
                  )}
                >
                  <AdaptiveVideoPlayer
                    src={streamUrl}
                    posterUrl={posterUrl}
                    title={featuredFilm.caption || event.title}
                    durationSeconds={featuredFilm.durationSeconds}
                    width={featuredFilm.width}
                    height={featuredFilm.height}
                    variant="featured"
                    isPlaying={isPlaying}
                    onPlay={() =>
                      setPlayingVideoIds((prev) => ({ ...prev, [featuredFilm.id]: true }))
                    }
                    playLabel="Play Full Cinematic Film"
                    className="rounded-xl"
                  />
                </div>
              );
            })()}

            {secondaryFilms.length > 0 && (
              <div className="grid gap-6 sm:grid-cols-2 pt-2">
                {secondaryFilms.map((video, idx) => {
                  const isPlaying = Boolean(playingVideoIds[video.id]);
                  const posterUrl =
                    buildCloudinaryVideoPosterUrl(video.secureUrl, 1280) ||
                    video.deliveryUrls?.posterUrl ||
                    coverMasterUrl;
                  const streamUrl = video.deliveryUrls?.fullUrl || video.secureUrl;

                  return (
                    <div
                      key={video.id}
                      className={cn(
                        'rounded-2xl border overflow-hidden flex flex-col',
                        darkGallery
                          ? 'border-white/12 bg-[#14151b]'
                          : 'border-stone-200 bg-white shadow-sm',
                      )}
                    >
                      <AdaptiveVideoPlayer
                        src={streamUrl}
                        posterUrl={posterUrl}
                        title={video.caption || `${event.title} reel`}
                        durationSeconds={video.durationSeconds}
                        width={video.width}
                        height={video.height}
                        variant="card"
                        isPlaying={isPlaying}
                        onPlay={() =>
                          setPlayingVideoIds((prev) => ({ ...prev, [video.id]: true }))
                        }
                      />
                      <div
                        className={cn(
                          'px-4 py-3 flex items-center justify-between gap-3 text-xs border-t',
                          darkGallery
                            ? 'border-white/10 text-stone-300'
                            : 'border-stone-100 text-stone-700',
                        )}
                      >
                        <span className="truncate font-medium">
                          {video.caption || `Motion Film ${String(idx + 2).padStart(2, '0')}`}
                        </span>
                        <a
                          href={streamUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          className="shrink-0 text-[11px] font-semibold hover:underline"
                        >
                          Download ↓
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* Section 2: Strict Viewport-Gated & Progressive-Batched Photo Grid */}
        {showPhotos && (
          <section id="photo-grid-gallery" className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p
                  className={cn(
                    'text-[10px] uppercase tracking-[0.28em] font-medium',
                    darkGallery ? 'text-amber-200/80' : 'text-stone-500',
                  )}
                >
                  Photographic Collection
                </p>
                <h2
                  style={albumHeadingStyle}
                  className="text-3xl font-semibold tracking-tight mt-0.5"
                >
                  {mediaFilter === 'favorites' ? 'Favorite Photographs' : 'Photo Grid'}
                </h2>
              </div>
              {displayedPhotos.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedPhoto(displayedPhotos[0])}
                  className={cn(
                    'rounded-full border px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                    darkGallery
                      ? 'border-white/15 bg-white/5 text-stone-200 hover:bg-white/10'
                      : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100',
                  )}
                >
                  Open Slide Viewer ⤢
                </button>
              )}
            </div>

            {displayedPhotos.length === 0 ? (
              <div
                className={cn(
                  'rounded-2xl border p-10 text-center space-y-2',
                  darkGallery
                    ? 'border-white/10 bg-[#14151b]'
                    : 'border-stone-200 bg-white',
                )}
              >
                <p style={albumHeadingStyle} className="text-2xl font-medium">
                  No Favorite Photographs Selected Yet
                </p>
                <p
                  className={cn(
                    'text-xs',
                    darkGallery ? 'text-stone-400' : 'text-stone-500',
                  )}
                >
                  Tap the heart icon on any photograph in the grid to add it here.
                </p>
              </div>
            ) : (
              <>
                <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
                  {visiblePhotos.map((photo, idx) => {
                    const isFav = favoriteIds.includes(photo.id);
                    const intrinsicWidth = photo.width && photo.width > 0 ? photo.width : 1600;
                    const intrinsicHeight = photo.height && photo.height > 0 ? photo.height : 1200;

                    return (
                      <div
                        key={photo.id}
                        onClick={() => setSelectedPhoto(photo)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedPhoto(photo);
                          }
                        }}
                        className={cn(
                          'break-inside-avoid group relative rounded-xl overflow-hidden border cursor-zoom-in transition-all',
                          darkGallery
                            ? 'border-white/10 bg-[#14151b] hover:border-white/25'
                            : 'border-stone-200/80 bg-white shadow-xs hover:shadow-md',
                        )}
                      >
                        <LazyAlbumImage
                          src={photo.secureUrl}
                          alt={photo.altText || photo.caption || event.title}
                          aspectRatio={`${intrinsicWidth} / ${intrinsicHeight}`}
                          quality={92}
                          darkSurface={darkGallery}
                          rootMargin="120px 0px"
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 384px"
                          className="object-cover group-hover:scale-[1.03]"
                        />

                        {/* Hover Controls */}
                        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-between p-3">
                          <div className="flex justify-end pointer-events-auto">
                            <button
                              type="button"
                              onClick={(e) => toggleFavorite(photo.id, e)}
                              aria-label={isFav ? 'Remove favorite' : 'Favorite photo'}
                              className={cn(
                                'h-8 w-8 rounded-full backdrop-blur-md flex items-center justify-center text-xs transition-colors cursor-pointer',
                                isFav
                                  ? 'bg-[#8B6A21] text-white'
                                  : 'bg-black/45 text-white hover:bg-black/70',
                              )}
                            >
                              {isFav ? '♥' : '♡'}
                            </button>
                          </div>
                          <div className="flex items-center justify-between gap-2 text-white text-[11px] pointer-events-auto">
                            <span className="truncate font-medium">
                              {photo.caption || `Photo ${String(idx + 1).padStart(2, '0')}`}
                            </span>
                            <a
                              href={photo.secureUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="shrink-0 rounded-full bg-white/20 backdrop-blur-md px-2.5 py-1 text-[10px] font-semibold hover:bg-white/30"
                            >
                              Save ↓
                            </a>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Infinite Scroll Batch Sentinel + Manual Fallback */}
                {hasMorePhotos && (
                  <div ref={loadMoreSentinelRef} className="pt-4 flex flex-col items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setVisiblePhotoLimit((prev) =>
                          Math.min(prev + PHOTO_BATCH_STEP, displayedPhotos.length),
                        )
                      }
                      className={cn(
                        'rounded-full border px-5 py-2 text-xs font-semibold transition-colors cursor-pointer',
                        darkGallery
                          ? 'border-white/15 bg-white/5 text-stone-200 hover:bg-white/10'
                          : 'border-stone-300 bg-white text-stone-800 hover:bg-stone-100',
                      )}
                    >
                      Load More Photos ({displayedPhotos.length - visiblePhotoLimit} remaining)
                    </button>
                  </div>
                )}
              </>
            )}
          </section>
        )}

        {photos.length === 0 && videos.length === 0 && (
          <div
            className={cn(
              'rounded-2xl border p-12 text-center space-y-2',
              darkGallery ? 'border-white/10 bg-[#14151b]' : 'border-stone-200 bg-white',
            )}
          >
            <p style={albumHeadingStyle} className="text-2xl font-medium">
              Album Media Being Curated
            </p>
            <p className={cn('text-xs', darkGallery ? 'text-stone-400' : 'text-stone-500')}>
              Cinematic films and photographs will appear here shortly.
            </p>
          </div>
        )}
      </main>

      {/* Full-Screen Gallery Slider Lightbox (Lossless Quality=100, Windowed Filmstrip) */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
            const diff = touchStartX.current - endX;
            touchStartX.current = null;
            if (Math.abs(diff) > 45) {
              if (diff > 0) goNextLightbox();
              else goPrevLightbox();
            }
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedPhoto(null);
              setIsSlideshowPlaying(false);
            }
          }}
          className="fixed inset-0 z-50 flex flex-col justify-between bg-black/95 p-4 backdrop-blur-sm select-none"
        >
          {/* Lightbox Header */}
          <div className="mx-auto w-full max-w-6xl flex items-center justify-between text-stone-100 gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium truncate">
                {selectedPhoto.caption || event.title}
                {displayedPhotos.length > 1 && selectedPhotoIndex !== -1
                  ? `  •  ${selectedPhotoIndex + 1} / ${displayedPhotos.length}`
                  : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={(e) => toggleFavorite(selectedPhoto.id, e)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-medium cursor-pointer',
                  favoriteIds.includes(selectedPhoto.id)
                    ? 'border-[#CAA650]/70 bg-[#CAA650]/25 text-[#E7D1AA]'
                    : 'border-white/20 bg-white/10 text-white hover:bg-white/20',
                )}
              >
                {favoriteIds.includes(selectedPhoto.id) ? '♥ Saved' : '♡ Favorite'}
              </button>
              {displayedPhotos.length > 1 && (
                <button
                  type="button"
                  onClick={() => setIsSlideshowPlaying((v) => !v)}
                  className={cn(
                    'rounded-full border px-3.5 py-1.5 text-xs font-medium cursor-pointer',
                    isSlideshowPlaying
                      ? 'border-amber-300/60 bg-amber-200/15 text-amber-100'
                      : 'border-white/20 bg-white/10 text-white hover:bg-white/20',
                  )}
                >
                  {isSlideshowPlaying ? '❚❚ Pause' : '▶ Slideshow'}
                </button>
              )}
              <a
                href={selectedPhoto.secureUrl}
                target="_blank"
                rel="noopener noreferrer"
                download
                className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/20"
              >
                Download Original
              </a>
              <button
                type="button"
                onClick={() => {
                  setSelectedPhoto(null);
                  setIsSlideshowPlaying(false);
                }}
                className="rounded-full border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-medium text-white hover:bg-white/20 cursor-pointer"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Center Slide Image + Edge Slide Arrows */}
          <div className="relative flex-1 flex items-center justify-center w-full max-w-6xl mx-auto my-3 overflow-hidden">
            {displayedPhotos.length > 1 && selectedPhotoIndex !== -1 && (
              <button
                type="button"
                aria-label="Previous photo"
                onClick={goPrevLightbox}
                className="absolute left-2 sm:left-4 z-10 h-11 w-11 rounded-full border border-white/20 bg-black/60 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
              >
                ←
              </button>
            )}

            <div className="relative w-full h-[74vh]">
              <Image
                key={selectedPhoto.id}
                src={selectedPhoto.secureUrl}
                alt={selectedPhoto.altText || selectedPhoto.caption || event.title}
                fill
                quality={100}
                placeholder="blur"
                blurDataURL={SHIMMER_BLUR_DATA_URL}
                unoptimized={!isNextOptimizableUrl(selectedPhoto.secureUrl)}
                sizes="95vw"
                className="object-contain"
              />
            </div>

            {displayedPhotos.length > 1 && selectedPhotoIndex !== -1 && (
              <button
                type="button"
                aria-label="Next photo"
                onClick={goNextLightbox}
                className="absolute right-2 sm:right-4 z-10 h-11 w-11 rounded-full border border-white/20 bg-black/60 text-white hover:bg-white hover:text-black transition-colors cursor-pointer"
              >
                →
              </button>
            )}
          </div>

          {/* Windowed Bottom Slide Filmstrip (renders nearby thumbnails only) */}
          {filmstripWindow.length > 1 && (
            <div className="mx-auto max-w-5xl w-full flex items-center justify-center gap-1.5 overflow-x-auto pb-1">
              {filmstripWindow.map((p) => {
                const active = p.id === selectedPhoto.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPhoto(p)}
                    className={cn(
                      'relative h-11 w-14 shrink-0 rounded-md overflow-hidden border-2 transition-all cursor-pointer',
                      active
                        ? 'border-white scale-105 opacity-100'
                        : 'border-transparent opacity-45 hover:opacity-85',
                    )}
                  >
                    <Image
                      src={p.secureUrl}
                      alt=""
                      fill
                      quality={75}
                      unoptimized={!isNextOptimizableUrl(p.secureUrl)}
                      sizes="64px"
                      className="object-cover"
                    />
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Minimal Archival Colophon */}
      <footer
        className={cn(
          'border-t py-8 px-4 text-center space-y-1.5 text-xs',
          darkGallery
            ? 'border-white/10 text-stone-500'
            : 'border-stone-200/80 text-stone-500',
        )}
      >
        <p
          style={albumHeadingStyle}
          className={cn('text-lg font-medium', darkGallery ? 'text-stone-200' : 'text-stone-800')}
        >
          {event.title}
        </p>
        <p className="text-[11px] uppercase tracking-[0.2em]">
          Digital Album •{' '}
          <span className={darkGallery ? 'text-stone-300' : 'text-stone-700'}>
            {branding.displayName}
          </span>
        </p>
      </footer>
    </div>
  );
}
