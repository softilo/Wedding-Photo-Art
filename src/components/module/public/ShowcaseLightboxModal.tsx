'use client';

import React, { useEffect, useRef, useState } from 'react';
import { PortfolioItem } from '@/types/event-management';
import {
  buildCloudinaryImageUrl,
  buildCloudinaryVideoPosterUrl,
  parseShowcaseMedia,
} from '@/lib/showcaseMedia';
import { useModalHistoryBack } from '@/lib/useModalHistoryBack';

interface ShowcaseLightboxModalProps {
  item: PortfolioItem;
  onClose: () => void;
}

export function ShowcaseLightboxModal({ item, onClose }: ShowcaseLightboxModalProps) {
  const media = parseShowcaseMedia(item.mediaUrl);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [isPlayingVideo, setIsPlayingVideo] = useState(false);
  const touchStartX = useRef<number | null>(null);

  useModalHistoryBack(true, onClose);

  const totalPhotos = media.photos.length;
  const activePhoto = media.photos[photoIndex] || media.coverUrl;
  const posterUrl =
    media.coverUrl ||
    (media.videoUrl ? buildCloudinaryVideoPosterUrl(media.videoUrl) : '');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (media.kind === 'photo' && totalPhotos > 1) {
        if (e.key === 'ArrowRight') {
          setPhotoIndex((prev) => (prev + 1) % totalPhotos);
        } else if (e.key === 'ArrowLeft') {
          setPhotoIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [media.kind, totalPhotos, onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#14120E]/92 p-3 sm:p-4 backdrop-blur-xs"
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl bg-[#181611] text-white border border-white/10 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between gap-4 px-4 sm:px-5 py-3.5 sm:py-4 border-b border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[#CAA650]/20 border border-[#CAA650]/35 px-2.5 py-0.5 text-xs font-medium text-[#E7D1AA]">
                {media.kind === 'video'
                  ? 'Video Film'
                  : totalPhotos > 1
                    ? `${photoIndex + 1} / ${totalPhotos}`
                    : 'Photo'}
              </span>
              <h3 className="text-sm sm:text-base font-semibold tracking-tight truncate">
                {item.title}
              </h3>
            </div>
            {item.description && (
              <p className="text-xs text-[#C7BFA9] mt-0.5 truncate">{item.description}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-xl border border-white/15 bg-white/10 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            ← Back
          </button>
        </div>

        {/* Media Stage */}
        <div
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (media.kind !== 'photo' || totalPhotos <= 1 || touchStartX.current === null) {
              return;
            }
            const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
            const diff = touchStartX.current - endX;
            touchStartX.current = null;
            if (Math.abs(diff) > 45) {
              if (diff > 0) {
                setPhotoIndex((prev) => (prev + 1) % totalPhotos);
              } else {
                setPhotoIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos);
              }
            }
          }}
          className="flex-1 overflow-y-auto p-3 sm:p-6 flex flex-col items-center justify-center gap-4 touch-pan-y"
        >
          {media.kind === 'video' ? (
            <div className="w-full aspect-video rounded-xl overflow-hidden bg-black relative">
              {!isPlayingVideo ? (
                <button
                  type="button"
                  onClick={() => setIsPlayingVideo(true)}
                  aria-label={`Play video: ${item.title}`}
                  className="group relative block w-full h-full cursor-pointer overflow-hidden"
                >
                  {posterUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={posterUrl}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                      className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="absolute inset-0 bg-slate-900" />
                  )}
                  <span className="absolute inset-0 bg-slate-950/35 group-hover:bg-slate-950/20 transition-colors" />
                  <span className="absolute inset-0 z-10 flex items-center justify-center p-4">
                    <span className="flex items-center gap-2 rounded-full bg-white/95 px-5 py-3 text-sm font-bold text-slate-900 shadow-2xl transition-transform duration-200 group-hover:scale-105">
                      <span>▶ Play Video Film</span>
                    </span>
                  </span>
                </button>
              ) : media.embedUrl ? (
                <iframe
                  src={media.embedUrl}
                  title={item.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  className="w-full h-full border-0"
                />
              ) : (
                <video
                  src={media.videoUrl}
                  poster={posterUrl || undefined}
                  controls
                  autoPlay
                  playsInline
                  preload="metadata"
                  className="w-full h-full object-contain"
                />
              )}
            </div>
          ) : (
            <>
              <div className="relative w-full flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={buildCloudinaryImageUrl(activePhoto, { width: 1600, crop: 'limit' })}
                  alt={`${item.title} — photo ${photoIndex + 1}`}
                  className="max-h-[62vh] w-auto rounded-xl object-contain"
                />

                {totalPhotos > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setPhotoIndex((prev) => (prev - 1 + totalPhotos) % totalPhotos)
                      }
                      aria-label="Previous photo"
                      className="absolute left-2 sm:left-4 rounded-full bg-slate-900/80 border border-white/20 px-3.5 py-2 text-sm font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      ←
                    </button>
                    <button
                      type="button"
                      onClick={() => setPhotoIndex((prev) => (prev + 1) % totalPhotos)}
                      aria-label="Next photo"
                      className="absolute right-2 sm:right-4 rounded-full bg-slate-900/80 border border-white/20 px-3.5 py-2 text-sm font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      →
                    </button>
                  </>
                )}
              </div>

              {totalPhotos > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto max-w-full py-1">
                  {media.photos.map((url, idx) => (
                    <button
                      key={`${url}-${idx}`}
                      type="button"
                      onClick={() => setPhotoIndex(idx)}
                      className={`h-14 w-20 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        idx === photoIndex
                          ? 'border-[#CAA650] opacity-100 scale-105'
                          : 'border-transparent opacity-55 hover:opacity-90'
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={buildCloudinaryImageUrl(url, { width: 320, height: 240, crop: 'fill' })}
                        alt=""
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
