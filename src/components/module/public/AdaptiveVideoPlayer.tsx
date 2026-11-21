'use client';

import React, { useState } from 'react';
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
 * dead-center overlay controls (`absolute inset-0`), and full-width bottom native controls
 * across landscape, square, ultrawide, and vertical/portrait (9:16) videos.
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
  const [internalPlaying, setInternalPlaying] = useState(false);
  const [detectedDims, setDetectedDims] = useState<{ w: number; h: number } | null>(null);

  const isPlaying = controlledPlaying ?? internalPlaying;
  const effectiveWidth = detectedDims?.w ?? width ?? null;
  const effectiveHeight = detectedDims?.h ?? height ?? null;
  const isPortrait = Boolean(
    effectiveWidth && effectiveHeight && effectiveHeight > effectiveWidth,
  );

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
      : isPortrait
        ? 'w-full aspect-[4/3] sm:aspect-video min-h-[260px]'
        : 'w-full aspect-video';

  return (
    <div
      className={cn(
        'relative overflow-hidden bg-black',
        stageClassName,
        className,
      )}
    >
      {isPlaying ? (
        <video
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
          className="w-full h-full object-contain bg-black"
        />
      ) : (
        <button
          type="button"
          onClick={handleStartPlay}
          aria-label={`Play video: ${title}`}
          className="group relative block w-full h-full cursor-pointer overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CAA650]"
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

          {/* Centered Play Button Overlay */}
          <span className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2.5 p-4">
            <span
              className={cn(
                'flex items-center justify-center rounded-full border border-white/50 bg-black/55 backdrop-blur-md text-white shadow-2xl transition-all duration-200 group-hover:scale-110 group-hover:bg-white group-hover:text-stone-950',
                variant === 'featured' ? 'h-16 w-16 sm:h-20 sm:w-20' : 'h-12 w-12 sm:h-14 sm:w-14',
              )}
            >
              <span className={cn('ml-0.5', variant === 'featured' ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg')}>
                ▶
              </span>
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
