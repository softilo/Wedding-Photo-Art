'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  PortfolioItem,
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
  PublicBranding,
} from '@/types/event-management';
import { BrandMark } from '@/components/common/BrandMark';
import {
  EditorialGridSlotKey,
  HeroSlide,
  resolveEditorialGridSlots,
} from '@/lib/heroSlider';
import { useModalHistoryBack } from '@/lib/useModalHistoryBack';
import { cn } from '@/lib/utils';

interface EditorialBentoShowcaseProps {
  branding: PublicBranding;
  editorialEvent?: PortfolioShowcaseEvent | null;
  portfolioEvents: PortfolioShowcaseEvent[];
  galleryImages: PortfolioMediaItem[];
  legacyPortfolio: PortfolioItem[];
}

const SLOT_LAYOUT_CLASSES: Record<EditorialGridSlotKey, string> = {
  row1WideLeft:
    'col-span-2 sm:col-span-8 aspect-[16/10] sm:aspect-auto sm:h-[245px] md:h-[295px] lg:h-[360px]',
  row1SquareRight:
    'col-span-1 sm:col-span-4 aspect-square sm:aspect-auto sm:h-[245px] md:h-[295px] lg:h-[360px]',
  row2SquareLeft:
    'col-span-1 sm:col-span-4 aspect-square sm:aspect-auto sm:h-[245px] md:h-[295px] lg:h-[360px]',
  row2WideRight:
    'col-span-2 sm:col-span-8 aspect-[16/10] sm:aspect-auto sm:h-[245px] md:h-[295px] lg:h-[360px]',
};

const SLOT_SIZES_ATTR: Record<EditorialGridSlotKey, string> = {
  row1WideLeft: '(max-width: 639px) 100vw, (max-width: 1152px) 66vw, 760px',
  row1SquareRight: '(max-width: 639px) 50vw, (max-width: 1152px) 34vw, 390px',
  row2SquareLeft: '(max-width: 639px) 50vw, (max-width: 1152px) 34vw, 390px',
  row2WideRight: '(max-width: 639px) 100vw, (max-width: 1152px) 66vw, 760px',
};

export function EditorialBentoShowcase({
  branding,
  editorialEvent,
  portfolioEvents,
  galleryImages,
  legacyPortfolio,
}: EditorialBentoShowcaseProps) {
  const resolved = useMemo(
    () =>
      resolveEditorialGridSlots({
        editorialEvent,
        brandingName: branding.displayName,
        portfolioEvents,
        galleryImages,
        legacyPortfolio,
      }),
    [editorialEvent, branding.displayName, portfolioEvents, galleryImages, legacyPortfolio],
  );

  const lightboxSlides = useMemo<HeroSlide[]>(
    () =>
      resolved.slots
        .map((s) => s.slide)
        .filter((s): s is HeroSlide => Boolean(s)),
    [resolved.slots],
  );

  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const activeSlide =
    lightboxIdx !== null && lightboxSlides[lightboxIdx] ? lightboxSlides[lightboxIdx] : null;

  useModalHistoryBack(lightboxIdx !== null, () => setLightboxIdx(null));

  useEffect(() => {
    if (lightboxIdx === null || lightboxSlides.length === 0) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLightboxIdx(null);
      } else if (e.key === 'ArrowRight' && lightboxSlides.length > 1) {
        setLightboxIdx((prev) => (prev === null ? 0 : (prev + 1) % lightboxSlides.length));
      } else if (e.key === 'ArrowLeft' && lightboxSlides.length > 1) {
        setLightboxIdx((prev) =>
          prev === null
            ? 0
            : (prev - 1 + lightboxSlides.length) % lightboxSlides.length,
        );
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [lightboxIdx, lightboxSlides.length]);

  if (!resolved.enabled || !resolved.hasAnyImage) {
    return null;
  }

  return (
    <section
      aria-label={`${branding.displayName} Signature Frames`}
      className="border-b border-[#E5DFD0] bg-[#F9F8F5]"
    >
      <div className="mx-auto max-w-6xl px-3 py-5 sm:px-6 sm:py-8">
        <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 sm:gap-3.5">
          {resolved.slots.map((slot) => {
            const layoutCls = SLOT_LAYOUT_CLASSES[slot.meta.key];
            const isSquarePortrait = slot.meta.recommendedShape === 'square';
            const slideIdx = slot.slide
              ? lightboxSlides.findIndex((s) => s.id === slot.slide?.id)
              : -1;

            if (!slot.slide) {
              return (
                <div
                  key={slot.meta.key}
                  aria-hidden="true"
                  className={cn(
                    layoutCls,
                    'rounded-xl sm:rounded-2xl bg-[#F3EFE6] flex items-center justify-center overflow-hidden',
                  )}
                >
                  <BrandMark
                    logoUrl={branding.logoUrl}
                    alt={branding.displayName}
                    size={44}
                    variant="light"
                    className="opacity-25 rounded-full"
                  />
                </div>
              );
            }

            return (
              <button
                key={slot.meta.key}
                type="button"
                onClick={() => setLightboxIdx(slideIdx >= 0 ? slideIdx : 0)}
                aria-label={`View ${slot.slide.alt} full screen`}
                className={cn(
                  layoutCls,
                  'group relative overflow-hidden rounded-xl sm:rounded-2xl bg-[#ECE6D8] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#8B6A21] cursor-pointer',
                )}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={slot.slide.imageUrl}
                  srcSet={slot.slide.srcSet}
                  sizes={SLOT_SIZES_ATTR[slot.meta.key]}
                  alt={slot.slide.alt}
                  loading="eager"
                  decoding="async"
                  className={cn(
                    'w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]',
                    isSquarePortrait ? 'object-[center_22%]' : 'object-center',
                  )}
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute right-2.5 bottom-2.5 flex h-8 w-8 items-center justify-center rounded-full bg-black/45 text-white opacity-0 backdrop-blur-xs transition-opacity duration-200 group-hover:opacity-100"
                >
                  <svg
                    className="w-4 h-4"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polyline points="15 3 21 3 21 9" />
                    <polyline points="9 21 3 21 3 15" />
                    <line x1="21" y1="3" x2="14" y2="10" />
                    <line x1="3" y1="21" x2="10" y2="14" />
                  </svg>
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Fullscreen Lightbox for Editorial Showcase Photos */}
      {activeSlide && lightboxIdx !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeSlide.alt}
          onClick={() => setLightboxIdx(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 p-3 sm:p-6 backdrop-blur-sm"
        >
          <button
            type="button"
            onClick={() => setLightboxIdx(null)}
            aria-label="Close full-screen photo"
            className="absolute right-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
          >
            ✕
          </button>

          {lightboxSlides.length > 1 && (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx(
                    (lightboxIdx - 1 + lightboxSlides.length) % lightboxSlides.length,
                  );
                }}
                aria-label="Previous showcase photo"
                className="absolute left-3 sm:left-6 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightboxIdx((lightboxIdx + 1) % lightboxSlides.length);
                }}
                aria-label="Next showcase photo"
                className="absolute right-3 sm:right-6 top-1/2 -translate-y-1/2 z-20 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors cursor-pointer"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </>
          )}

          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-h-[88vh] max-w-[92vw] flex flex-col items-center gap-3"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={activeSlide.imageUrl}
              srcSet={activeSlide.srcSet}
              sizes="95vw"
              alt={activeSlide.alt}
              className="max-h-[82vh] max-w-full w-auto h-auto object-contain rounded-lg shadow-2xl"
            />
            {lightboxSlides.length > 1 && (
              <div className="rounded-full bg-white/10 px-3.5 py-1 text-xs font-mono-code text-white/85">
                {lightboxIdx + 1} / {lightboxSlides.length}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
