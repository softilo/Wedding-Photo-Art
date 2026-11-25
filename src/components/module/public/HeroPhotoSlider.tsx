'use client';

import React, { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import {
  PortfolioItem,
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
  PublicBranding,
} from '@/types/event-management';
import { BrandMark } from '@/components/common/BrandMark';
import { HeroColumnCount, HeroSlide, resolveHeroSlides } from '@/lib/heroSlider';
import { cn } from '@/lib/utils';

interface HeroPhotoSliderProps {
  branding: PublicBranding;
  heroEvent?: PortfolioShowcaseEvent | null;
  portfolioEvents: PortfolioShowcaseEvent[];
  galleryImages: PortfolioMediaItem[];
  legacyPortfolio: PortfolioItem[];
}

type ViewportTier = 'mobile' | 'tablet' | 'desktop';

function subscribeViewportTier(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mqLg = window.matchMedia('(min-width: 1024px)');
  const mqMd = window.matchMedia('(min-width: 768px)');
  const handler = () => onStoreChange();
  mqLg.addEventListener('change', handler);
  mqMd.addEventListener('change', handler);
  return () => {
    mqLg.removeEventListener('change', handler);
    mqMd.removeEventListener('change', handler);
  };
}

function getViewportTierSnapshot(): ViewportTier {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 'desktop';
  }
  if (window.matchMedia('(min-width: 1024px)').matches) return 'desktop';
  if (window.matchMedia('(min-width: 768px)').matches) return 'tablet';
  return 'mobile';
}

const MOBILE_COL_CLASS: Record<HeroColumnCount, string> = {
  1: 'w-full',
  2: 'w-1/2',
  3: 'w-1/3',
};

const TABLET_COL_CLASS: Record<HeroColumnCount, string> = {
  1: 'md:w-full',
  2: 'md:w-1/2',
  3: 'md:w-1/3',
};

const DESKTOP_COL_CLASS: Record<HeroColumnCount, string> = {
  1: 'lg:w-full',
  2: 'lg:w-1/2',
  3: 'lg:w-1/3',
};

const MOBILE_PAD_CLASS: Record<HeroColumnCount, string> = {
  1: 'px-0',
  2: 'px-[1px]',
  3: 'px-[1px]',
};

const TABLET_PAD_CLASS: Record<HeroColumnCount, string> = {
  1: 'md:px-0',
  2: 'md:px-[2px]',
  3: 'md:px-[2px]',
};

const DESKTOP_PAD_CLASS: Record<HeroColumnCount, string> = {
  1: 'lg:px-0',
  2: 'lg:px-[2px]',
  3: 'lg:px-[2px]',
};

const IMAGE_FRAME_CLASS = 'block w-full h-auto';

function buildImageSizesAttr(
  mobile: HeroColumnCount,
  tablet: HeroColumnCount,
  desktop: HeroColumnCount,
): string {
  const m = mobile === 1 ? '100vw' : mobile === 2 ? '50vw' : '34vw';
  const t = tablet === 1 ? '100vw' : tablet === 2 ? '50vw' : '34vw';
  const d = desktop === 1 ? '100vw' : desktop === 2 ? '50vw' : '34vw';
  return `(max-width: 767px) ${m}, (max-width: 1023px) ${t}, ${d}`;
}

function getSlotVisibilityClass(
  slotIdx: number,
  mobile: HeroColumnCount,
  tablet: HeroColumnCount,
  desktop: HeroColumnCount,
): string {
  return cn(
    slotIdx < mobile ? 'block' : 'hidden',
    slotIdx < tablet ? 'md:block' : 'md:hidden',
    slotIdx < desktop ? 'lg:block' : 'lg:hidden',
  );
}

function buildGroupedPages(slides: HeroSlide[], cols: HeroColumnCount): HeroSlide[][] {
  if (slides.length === 0) return [];
  if (slides.length <= cols) return [slides];

  const pages: HeroSlide[][] = [];
  for (let start = 0; start < slides.length; start += cols) {
    pages.push(
      Array.from({ length: cols }, (_, offset) => slides[(start + offset) % slides.length]),
    );
  }
  return pages;
}

function HeroSlideImage({
  slide,
  sizes,
  eager = false,
  priority = false,
}: {
  slide: HeroSlide;
  sizes: string;
  eager?: boolean;
  priority?: boolean;
}) {
  const hasDimensions =
    typeof slide.width === 'number' &&
    slide.width > 0 &&
    typeof slide.height === 'number' &&
    slide.height > 0;

  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={slide.imageUrl}
      srcSet={slide.srcSet}
      sizes={sizes}
      width={hasDimensions ? (slide.width ?? undefined) : undefined}
      height={hasDimensions ? (slide.height ?? undefined) : undefined}
      alt={slide.alt}
      loading={eager ? 'eager' : 'lazy'}
      decoding={priority ? 'sync' : 'async'}
      fetchPriority={priority ? 'high' : 'auto'}
      className={IMAGE_FRAME_CLASS}
    />
  );
}

export function HeroPhotoSlider({
  branding,
  heroEvent,
  portfolioEvents,
  galleryImages,
  legacyPortfolio,
}: HeroPhotoSliderProps) {
  const { slides, settings } = useMemo(
    () =>
      resolveHeroSlides({
        heroEvent,
        brandingName: branding.displayName,
        portfolioEvents,
        galleryImages,
        legacyPortfolio,
      }),
    [heroEvent, branding.displayName, portfolioEvents, galleryImages, legacyPortfolio],
  );

  const viewportTier = useSyncExternalStore<ViewportTier>(
    subscribeViewportTier,
    getViewportTierSnapshot,
    () => 'desktop',
  );

  const mobileCols = settings.mobileColumns;
  const tabletCols = settings.tabletColumns;
  const desktopCols = settings.desktopColumns;

  const activeCols: HeroColumnCount =
    viewportTier === 'mobile'
      ? mobileCols
      : viewportTier === 'tablet'
        ? tabletCols
        : desktopCols;

  const pages = useMemo(() => buildGroupedPages(slides, activeCols), [slides, activeCols]);
  const totalPages = pages.length;

  // Append Page 0 clone for continuous full-page forward loop
  const trackPages = useMemo(
    () => (totalPages > 1 ? [...pages, pages[0]] : pages),
    [pages, totalPages],
  );

  const [pageIndex, setPageIndex] = useState(0);
  const [skipTransition, setSkipTransition] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [activePageHeight, setActivePageHeight] = useState<number | null>(null);
  const pageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const touchStartX = useRef<number | null>(null);

  const safeTrackIndex =
    totalPages > 1 ? Math.min(pageIndex, totalPages) : 0;
  const activeLogicalPage = totalPages > 0 ? safeTrackIndex % totalPages : 0;

  useEffect(() => {
    const activeEl = pageRefs.current[safeTrackIndex];
    if (!activeEl) return undefined;

    const measure = () => {
      const nextHeight = Math.round(activeEl.getBoundingClientRect().height);
      if (nextHeight > 0) {
        setActivePageHeight((prev) => (prev === nextHeight ? prev : nextHeight));
      }
    };

    const rafId = window.requestAnimationFrame(measure);
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', measure);
      return () => {
        window.cancelAnimationFrame(rafId);
        window.removeEventListener('resize', measure);
      };
    }

    const observer = new ResizeObserver(measure);
    observer.observe(activeEl);
    return () => {
      window.cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [safeTrackIndex, activeCols, totalPages]);

  useEffect(() => {
    if (totalPages <= 1 || isPaused) return undefined;
    if (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setSkipTransition(false);
      setPageIndex((prev) => {
        if (prev >= totalPages) return 1;
        return prev + 1;
      });
    }, settings.autoPlayMs);

    return () => window.clearInterval(timer);
  }, [totalPages, isPaused, settings.autoPlayMs]);

  useEffect(() => {
    if (totalPages <= 1 || pageIndex < totalPages) return undefined;
    const snapTimer = window.setTimeout(() => {
      setSkipTransition(true);
      setPageIndex(pageIndex % totalPages);
    }, 760);
    return () => window.clearTimeout(snapTimer);
  }, [pageIndex, totalPages]);

  useEffect(() => {
    if (!skipTransition) return undefined;
    const rafTimer = window.setTimeout(() => {
      setSkipTransition(false);
    }, 30);
    return () => window.clearTimeout(rafTimer);
  }, [skipTransition]);

  const handleTrackTransitionEnd = () => {
    if (totalPages > 1 && pageIndex >= totalPages) {
      setSkipTransition(true);
      setPageIndex(pageIndex % totalPages);
    }
  };

  const goPrev = () => {
    if (totalPages <= 1) return;
    setSkipTransition(false);
    setPageIndex((prev) => (prev <= 0 ? totalPages - 1 : prev - 1));
  };

  const goNext = () => {
    if (totalPages <= 1) return;
    setSkipTransition(false);
    setPageIndex((prev) => (prev >= totalPages ? 1 : prev + 1));
  };

  const outerPadClass = cn(
    'w-full',
    MOBILE_PAD_CLASS[mobileCols],
    TABLET_PAD_CLASS[tabletCols],
    DESKTOP_PAD_CLASS[desktopCols],
  );

  const colItemBaseClass = cn(
    'flex-none',
    MOBILE_COL_CLASS[mobileCols],
    TABLET_COL_CLASS[tabletCols],
    DESKTOP_COL_CLASS[desktopCols],
    MOBILE_PAD_CLASS[mobileCols],
    TABLET_PAD_CLASS[tabletCols],
    DESKTOP_PAD_CLASS[desktopCols],
  );

  const sizesAttr = buildImageSizesAttr(mobileCols, tabletCols, desktopCols);

  return (
    <section
      aria-label="Wedding photography hero slideshow"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null || totalPages <= 1) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
        const diff = touchStartX.current - endX;
        touchStartX.current = null;
        if (Math.abs(diff) > 40) {
          if (diff > 0) goNext();
          else goPrev();
        }
      }}
      className="group relative w-full overflow-hidden select-none touch-pan-y"
    >
      {slides.length === 0 ? (
        <div className="py-10 flex items-center justify-center">
          <BrandMark
            logoUrl={branding.logoUrl}
            alt={branding.displayName}
            size={84}
            variant="light"
            className="rounded-2xl"
          />
        </div>
      ) : slides.length === 1 ? (
        <div className="w-full">
          <HeroSlideImage slide={slides[0]} sizes="100vw" eager priority />
        </div>
      ) : (
        <div className={outerPadClass}>
          <div
            style={activePageHeight ? { height: `${activePageHeight}px` } : undefined}
            className="overflow-hidden transition-[height] duration-500 ease-out"
          >
            <div
              onTransitionEnd={handleTrackTransitionEnd}
              style={{ transform: `translate3d(-${safeTrackIndex * 100}%, 0, 0)` }}
              className={cn(
                'flex w-full items-start will-change-transform',
                skipTransition
                  ? 'transition-none'
                  : 'transition-transform duration-700 ease-out',
              )}
            >
              {trackPages.map((group, pIdx) => (
                <div
                  key={`page-${pIdx}`}
                  ref={(el) => {
                    pageRefs.current[pIdx] = el;
                  }}
                  className="w-full flex-none flex items-center"
                >
                  {group.map((slide, sIdx) => (
                    <div
                      key={`${slide.id}-${pIdx}-${sIdx}`}
                      className={cn(
                        colItemBaseClass,
                        pIdx === 0 &&
                          getSlotVisibilityClass(sIdx, mobileCols, tabletCols, desktopCols),
                      )}
                    >
                      <HeroSlideImage
                        slide={slide}
                        sizes={sizesAttr}
                        eager={pIdx <= 1}
                        priority={pIdx === 0}
                      />
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subtle Icon-Only Prev/Next Arrows & Minimal Dot Indicators */}
      {totalPages > 1 && settings.showArrows && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous slide"
            className="hidden sm:flex absolute left-3 lg:left-5 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-white/85 backdrop-blur-sm text-[#181611] shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-[#CAA650] hover:text-white transition-all cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={goNext}
            aria-label="Next slide"
            className="hidden sm:flex absolute right-3 lg:right-5 top-1/2 -translate-y-1/2 z-20 h-9 w-9 items-center justify-center rounded-full bg-white/85 backdrop-blur-sm text-[#181611] shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-[#CAA650] hover:text-white transition-all cursor-pointer"
          >
            <svg
              className="w-5 h-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>
        </>
      )}

      {totalPages > 1 && settings.showDots && (
        <div className="pointer-events-none mt-1.5 flex justify-center">
          <div className="pointer-events-auto flex items-center gap-1.5 px-2 py-0.5">
            {pages.map((_, pIdx) => {
              const isActive = pIdx === activeLogicalPage;
              return (
                <button
                  key={`dot-${pIdx}`}
                  type="button"
                  onClick={() => {
                    setSkipTransition(false);
                    setPageIndex(pIdx);
                  }}
                  aria-label={`Slide ${pIdx + 1}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all cursor-pointer',
                    isActive ? 'w-6 bg-[#8B6A21]' : 'w-1.5 bg-[#D5CCB8] hover:bg-[#8B6A21]/60',
                  )}
                />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
