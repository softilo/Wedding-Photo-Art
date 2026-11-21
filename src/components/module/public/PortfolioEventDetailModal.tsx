'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { PortfolioMediaItem, PortfolioShowcaseEvent } from '@/types/event-management';
import {
  buildCloudinaryImageUrl,
  buildCloudinarySrcSet,
  buildCloudinaryVideoPosterUrl,
} from '@/lib/showcaseMedia';
import { parseAlbumDescriptionAndTheme } from '@/lib/albumTheme';
import { useModalHistoryBack } from '@/lib/useModalHistoryBack';
import { cn, formatLocalDate } from '@/lib/utils';
import { AdaptiveVideoPlayer } from './AdaptiveVideoPlayer';
import { LazyViewportImage } from './LazyViewportImage';

interface PortfolioEventDetailModalProps {
  event: PortfolioShowcaseEvent;
  onClose: () => void;
  isPreview?: boolean;
}

export function PortfolioEventDetailModal({
  event,
  onClose,
  isPreview = false,
}: PortfolioEventDetailModalProps) {
  const readyMedia = (event.media || []).filter((m) => m.status === 'READY');
  const photos = readyMedia.filter((m) => m.resourceType === 'IMAGE');
  const videos = readyMedia.filter((m) => m.resourceType === 'VIDEO');

  const [activeTab, setActiveTab] = useState<'all' | 'photos' | 'videos'>('all');
  // High-res photo lightbox state (only fetched when a thumbnail is clicked!)
  const [selectedPhoto, setSelectedPhoto] = useState<PortfolioMediaItem | null>(null);
  // Video Play gate: NO <video> element or video file is downloaded until the user clicks Play
  const [playingVideoIds, setPlayingVideoIds] = useState<Record<string, boolean>>({});
  const touchStartX = useRef<number | null>(null);

  useModalHistoryBack(true, onClose);
  useModalHistoryBack(Boolean(selectedPhoto), () => setSelectedPhoto(null));

  const selectedPhotoIndex = selectedPhoto
    ? photos.findIndex((p) => p.id === selectedPhoto.id)
    : -1;

  const goPrevPhoto = () => {
    if (photos.length <= 1 || selectedPhotoIndex === -1) return;
    setSelectedPhoto(photos[(selectedPhotoIndex - 1 + photos.length) % photos.length]);
  };

  const goNextPhoto = () => {
    if (photos.length <= 1 || selectedPhotoIndex === -1) return;
    setSelectedPhoto(photos[(selectedPhotoIndex + 1) % photos.length]);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (selectedPhoto) {
          setSelectedPhoto(null);
        } else {
          onClose();
        }
      } else if (selectedPhoto && photos.length > 1) {
        if (e.key === 'ArrowRight') {
          goNextPhoto();
        } else if (e.key === 'ArrowLeft') {
          goPrevPhoto();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPhoto, selectedPhotoIndex, photos.length]);

  const cleanDescription = parseAlbumDescriptionAndTheme(event.description).cleanDescription;

  const coverUrl =
    event.coverMedia?.deliveryUrls?.coverUrl ||
    (event.coverMedia?.secureUrl
      ? buildCloudinaryImageUrl(event.coverMedia.secureUrl, { width: 1200, crop: 'limit' })
      : photos[0]?.secureUrl
        ? buildCloudinaryImageUrl(photos[0].secureUrl, { width: 1200, crop: 'limit' })
        : '');

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-3 sm:p-6 backdrop-blur-xs overflow-y-auto"
    >
      <div className="w-full max-w-5xl max-h-[92vh] flex flex-col rounded-2xl bg-white text-slate-900 border border-slate-200 shadow-2xl overflow-hidden">
        {/* Top Header */}
        <div className="shrink-0 flex flex-wrap items-center justify-between gap-4 px-5 py-4 border-b border-slate-100 bg-white">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              {isPreview && (
                <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
                  Admin Preview ({event.status})
                </span>
              )}
              {event.eventType && (
                <span className="rounded-full bg-[#F8F3E6] border border-[#DFCEAA] px-2.5 py-0.5 text-xs font-semibold text-[#6F5319]">
                  {event.eventType.name}
                </span>
              )}
              {event.eventDate && (
                <span className="text-xs font-mono-code text-[#6B6352]">
                  {formatLocalDate(event.eventDate)}
                </span>
              )}
              {event.location && (
                <span className="text-xs text-[#6B6352]">• {event.location}</span>
              )}
            </div>
            <h2 className="font-editorial text-xl sm:text-2xl font-semibold text-[#181611] mt-1 truncate">
              {event.title}
            </h2>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!isPreview && event.status === 'PUBLISHED' && (
              <Link
                href={`/album/${event.slug}`}
                className="rounded-xl border border-[#8B6A21]/35 bg-[#F8F3E6] px-3.5 py-1.5 text-xs font-semibold text-[#8B6A21] hover:bg-[#8B6A21] hover:text-white transition-colors"
              >
                Open Full Page ↗
              </Link>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            >
              ← Back
            </button>
          </div>
        </div>

        {/* Scrollable Showcase Content */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-7">
          {/* Hero Cover Banner */}
          {coverUrl && (
            <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[16/9] max-h-[400px] w-full">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                srcSet={
                  event.coverMedia?.secureUrl
                    ? buildCloudinarySrcSet(event.coverMedia.secureUrl)
                    : undefined
                }
                sizes="(max-width: 1024px) 100vw, 960px"
                alt={event.coverMedia?.altText || event.title}
                loading="eager"
                fetchPriority="high"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/20 to-transparent flex flex-col justify-end p-5 sm:p-6 text-white">
                <h3 className="text-xl sm:text-2xl font-bold">{event.title}</h3>
                {cleanDescription && (
                  <p className="text-xs sm:text-sm text-white/85 mt-1 max-w-2xl leading-relaxed">
                    {cleanDescription}
                  </p>
                )}
              </div>
            </div>
          )}

          {!coverUrl && cleanDescription && (
            <p className="text-sm text-slate-600 leading-relaxed">{cleanDescription}</p>
          )}

          {/* Media Filter Bar inside Modal */}
          {photos.length > 0 && videos.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1 gap-1">
                {[
                  { id: 'all' as const, label: `All Media (${readyMedia.length})` },
                  { id: 'photos' as const, label: `Photo Gallery (${photos.length})` },
                  { id: 'videos' as const, label: `Video Highlights (${videos.length})` },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id)}
                    className={cn(
                      'rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                      activeTab === tab.id
                        ? 'bg-slate-900 text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900',
                    )}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
              <span className="text-xs text-slate-500">
                Click any photo for full-screen view • Videos stream on Play
              </span>
            </div>
          )}

          {/* Video Highlights Section (Poster + Play Button First — Zero Preload Before Play!) */}
          {(activeTab === 'all' || activeTab === 'videos') && videos.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-900">
                  Video Highlights ({videos.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Lightweight poster loaded • Click Play to stream film
                </span>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                {videos.map((video) => {
                  const isPlaying = Boolean(playingVideoIds[video.id]);
                  const posterUrl =
                    video.deliveryUrls?.posterUrl ||
                    buildCloudinaryVideoPosterUrl(video.secureUrl) ||
                    coverUrl;
                  const streamUrl = video.deliveryUrls?.fullUrl || video.secureUrl;

                  return (
                    <div
                      key={video.id}
                      className="rounded-2xl border border-slate-200 bg-slate-950 overflow-hidden flex flex-col shadow-xs"
                    >
                      <AdaptiveVideoPlayer
                        src={streamUrl}
                        posterUrl={posterUrl}
                        title={video.caption || event.title}
                        durationSeconds={video.durationSeconds}
                        width={video.width}
                        height={video.height}
                        variant="card"
                        isPlaying={isPlaying}
                        onPlay={() =>
                          setPlayingVideoIds((prev) => ({ ...prev, [video.id]: true }))
                        }
                        playLabel="Play Highlight"
                      />
                      {video.caption && (
                        <div className="px-4 py-2.5 bg-white text-xs text-slate-700 font-medium">
                          {video.caption}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Photo Gallery Section (Strict Viewport Lazy-Loaded Thumbnails; High-Res Fetched Only on Click!) */}
          {(activeTab === 'all' || activeTab === 'photos') && photos.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h3 className="text-base font-bold text-slate-900">
                  Event Photo Gallery ({photos.length})
                </h3>
                <span className="text-xs text-slate-500">
                  Click any thumbnail to open high-resolution cinema viewer
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5">
                {photos.map((photo) => {
                  const thumbUrl =
                    photo.deliveryUrls?.thumbnailUrl ||
                    buildCloudinaryImageUrl(photo.secureUrl, {
                      width: 480,
                      height: 360,
                      crop: 'fill',
                    });

                  return (
                    <button
                      key={photo.id}
                      type="button"
                      onClick={() => setSelectedPhoto(photo)}
                      className="group text-left rounded-xl overflow-hidden border border-stone-200 bg-stone-50 flex flex-col cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CAA650]"
                    >
                      <LazyViewportImage
                        src={thumbUrl}
                        alt={photo.altText || photo.caption || event.title}
                        containerClassName="aspect-[4/3] w-full"
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      {photo.caption && (
                        <p className="px-2.5 py-1.5 text-[11px] text-slate-600 truncate w-full bg-white">
                          {photo.caption}
                        </p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* High-Resolution Cinema Lightbox Modal (Only mounts & fetches large image when a thumbnail is clicked!) */}
      {selectedPhoto && (
        <div
          role="dialog"
          aria-modal="true"
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null || photos.length <= 1) return;
            const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
            const diff = touchStartX.current - endX;
            touchStartX.current = null;
            if (Math.abs(diff) > 45) {
              if (diff > 0) goNextPhoto();
              else goPrevPhoto();
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) setSelectedPhoto(null);
          }}
          className="fixed inset-0 z-60 flex flex-col items-center justify-between bg-[#14120E]/95 p-3 sm:p-4 touch-pan-y select-none"
        >
          <div className="w-full max-w-5xl flex items-center justify-between text-white pb-2 gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-[#CAA650]/25 border border-[#CAA650]/40 px-2.5 py-0.5 text-xs font-medium text-[#E7D1AA] shrink-0 tabular-nums">
                  {selectedPhotoIndex + 1} / {photos.length}
                </span>
                <p className="text-sm font-semibold truncate">
                  {selectedPhoto.caption || event.title}
                </p>
              </div>
              {selectedPhoto.altText && (
                <p className="text-xs text-[#C7BFA9] mt-0.5 truncate">{selectedPhoto.altText}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setSelectedPhoto(null)}
              className="shrink-0 rounded-xl border border-white/20 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 cursor-pointer"
            >
              ← Back to Album
            </button>
          </div>

          <div className="relative flex-1 flex items-center justify-center w-full max-w-5xl overflow-hidden py-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={
                selectedPhoto.deliveryUrls?.fullUrl ||
                buildCloudinaryImageUrl(selectedPhoto.secureUrl, { width: 1920, crop: 'limit' })
              }
              srcSet={buildCloudinarySrcSet(selectedPhoto.secureUrl, [800, 1200, 1600, 1920])}
              sizes="95vw"
              alt={selectedPhoto.altText || selectedPhoto.caption || event.title}
              className="max-h-[72vh] w-auto rounded-xl object-contain shadow-2xl"
            />

            {photos.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goPrevPhoto();
                  }}
                  aria-label="Previous photo"
                  className="absolute left-2 sm:left-4 rounded-full bg-slate-900/80 border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  ←
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    goNextPhoto();
                  }}
                  aria-label="Next photo"
                  className="absolute right-2 sm:right-4 rounded-full bg-slate-900/80 border border-white/20 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  →
                </button>
              </>
            )}
          </div>

          {/* Bottom Filmstrip */}
          {photos.length > 1 && (
            <div className="flex items-center gap-2 overflow-x-auto max-w-4xl py-2">
              {photos.map((p, idx) => {
                const stripThumb =
                  p.deliveryUrls?.thumbnailUrl ||
                  buildCloudinaryImageUrl(p.secureUrl, {
                    width: 240,
                    height: 160,
                    crop: 'fill',
                  });
                const isActive = p.id === selectedPhoto.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedPhoto(p);
                    }}
                    className={cn(
                      'h-12 w-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer',
                      isActive
                        ? 'border-[#CAA650] opacity-100 scale-105'
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
    </div>
  );
}
