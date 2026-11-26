'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { LazyAlbumImage } from './LazyAlbumImage';

export interface AdaptiveVideoPlayerProps {
  src: string;
  posterUrl?: string;
  title?: string;
  durationSeconds?: number | null;
  width?: number | null;
  height?: number | null;
  /** 'featured' = full-width theater; 'card' = responsive grid card */
  variant?: 'featured' | 'card';
  /** Controlled playback state (optional, useful when external CTA triggers Play) */
  isPlaying?: boolean;
  onPlay?: () => void;
  playLabel?: string;
  eagerPoster?: boolean;
  className?: string;
}

function formatDuration(seconds?: number | null): string | null {
  if (!seconds || !Number.isFinite(seconds) || seconds <= 0) return null;
  const total = Math.round(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}

/**
 * Responsive video player with strict play-gated streaming (zero video download before Play),
 * auto-pause when scrolled out of the viewport, dead-center overlay controls (`absolute inset-0`),
 * and full-width bottom native controls across landscape, square, and portrait (9:16) videos.
 */
export function AdaptiveVideoPlayer({
  src,
  posterUrl = '',
  title = 'Highlight Film',
  durationSeconds,
  width,
  height,
  variant = 'card',
  isPlaying: controlledPlaying,
  onPlay,
  playLabel,
  eagerPoster = false,
  className,
}: AdaptiveVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [internalPlaying, setInternalPlaying] = useState(false);
  const [detectedDims, setDetectedDims] = useState<{ w: number; h: number } | null>(null);

  const isPlaying = controlledPlaying ?? internalPlaying;
  const effectiveWidth = detectedDims?.w ?? width ?? null;
  const effectiveHeight = detectedDims?.h ?? height ?? null;
  const isPortrait = Boolean(
    effectiveWidth && effectiveHeight && effectiveHeight > effectiveWidth,
  );

  // Auto-pause whenever the user scrolls a playing video out of view or hides the tab
  useEffect(() => {
    if (!isPlaying) return;
    const container = containerRef.current;
    let hasBeenVisible = false;

    const pauseIfPlaying = () => {
      const vid = videoRef.current;
      if (vid && !vid.paused) {
        vid.pause();
      }
    };

    const handleVisibilityChange = () => {
      if (document.hidden) {
        pauseIfPlaying();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    if (!container || typeof IntersectionObserver === 'undefined') {
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && entry.intersectionRatio >= 0.2) {
            hasBeenVisible = true;
          } else if (hasBeenVisible && (!entry.isIntersecting || entry.intersectionRatio < 0.2)) {
            pauseIfPlaying();
          }
        }
      },
      { threshold: [0, 0.2] },
    );

    observer.observe(container);
    return () => {
      observer.disconnect();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isPlaying]);

  const formattedDuration = formatDuration(durationSeconds);
  const handleStartPlay = () => {
    setInternalPlaying(true);
    onPlay?.();
  };

  // Compute responsive stage height/ratio so controls bar ALWAYS has full comfortable width
  const stageClassName =
    variant === 'featured'
      ? isPortrait
        ? 'w-full h-[65vh] min-h-[360px] max-h-[680px]'
        : 'w-full aspect-video max-h-[75vh]'
      : 'w-full aspect-video';

  return (
    <div
      ref={containerRef}
      className={cn(
        'relative overflow-hidden bg-black',
        stageClassName,
        className,
      )}
    >
      {isPlaying ? (
        <video
          ref={videoRef}
          src={src}
          poster={posterUrl || undefined}
          controls
          autoPlay
          playsInline
          preload="metadata"
          onLoadedMetadata={(e) => {
            const vid = e.currentTarget;
            if (vid.videoWidth > 0 && vid.videoHeight > 0) {
              setDetectedDims({ w: vid.videoWidth, h: vid.videoHeight });
            }
          }}
          className="absolute inset-0 w-full h-full object-contain bg-black"
        />
      ) : (
        <button
          type="button"
          onClick={handleStartPlay}
          aria-label={`Play video: ${title}`}
          className="group absolute inset-0 block w-full h-full cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CAA650]"
        >
          {/* Poster fills container cleanly with absolute positioning so play button never pushes sideways */}
          {posterUrl ? (
            <LazyAlbumImage
              src={posterUrl}
              alt={`${title} poster`}
              isHero={eagerPoster}
              quality={variant === 'featured' ? 92 : 85}
              darkSurface
              sizes={
                variant === 'featured'
                  ? '(max-width: 1200px) 100vw, 1152px'
                  : '(max-width: 640px) 100vw, 560px'
              }
              containerClassName="!absolute inset-0 w-full h-full"
              className="object-cover opacity-90 transition-transform duration-500 group-hover:scale-[1.03]"
            />
          ) : (
            <div className="absolute inset-0 bg-stone-900" />
          )}

          {/* Scrim */}
          <span
            aria-hidden="true"
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/25 transition-opacity group-hover:opacity-90"
          />

          {/* Centered Minimal Frosted Play Button Overlay */}
          <span className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 p-4">
            <span
              className={cn(
                'flex items-center justify-center rounded-full border border-white/65 bg-black/40 backdrop-blur-md text-white shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:bg-[#8B6A21] group-hover:border-[#DFCEAA]',
                variant === 'featured' ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-14 w-14 sm:h-16 sm:w-16',
              )}
            >
              <svg
                viewBox="0 0 24 24"
                fill="currentColor"
                aria-hidden="true"
                className={cn(
                  'translate-x-0.5',
                  variant === 'featured' ? 'w-7 h-7 sm:w-8 sm:h-8' : 'w-6 h-6',
                )}
              >
                <path d="M8 5.14v14l11-7-11-7z" />
              </svg>
            </span>

            {playLabel && (
              <span className="rounded-full bg-black/65 backdrop-blur-md border border-white/20 px-3.5 py-1 text-[11px] sm:text-xs font-semibold tracking-wide text-white shadow-md">
                {playLabel}
                {formattedDuration ? ` • ${formattedDuration}` : ''}
              </span>
            )}
          </span>

          {/* Corner Duration Pill (when not embedded in playLabel) */}
          {!playLabel && formattedDuration && (
            <span className="absolute bottom-3 right-3 z-10 rounded-full bg-black/75 backdrop-blur-xs px-2.5 py-0.5 font-mono-code text-[11px] font-medium text-white">
              {formattedDuration}
            </span>
          )}
        </button>
      )}
    </div>
  );
}
