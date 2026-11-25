'use client';

import React, { useMemo, useRef, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  PortfolioItem,
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
  PublicBranding,
} from '@/types/event-management';
import { BrandMark } from '@/components/common/BrandMark';
import { ResolvedStudioService, resolveStudioServices } from '@/lib/studioServices';
import { ArrowRightIcon } from '@/components/shared/Icons';

interface PublicServicesSectionProps {
  branding: PublicBranding;
  servicesEvent?: PortfolioShowcaseEvent | null;
  portfolioEvents: PortfolioShowcaseEvent[];
  galleryImages: PortfolioMediaItem[];
  legacyPortfolio: PortfolioItem[];
  variant?: 'home' | 'all';
}

type ServiceSlideCount = 1 | 2 | 3;

function subscribeVisibleCount(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return () => {};
  }
  const mqLg = window.matchMedia('(min-width: 1024px)');
  const mqSm = window.matchMedia('(min-width: 640px)');
  const handler = () => onStoreChange();
  mqLg.addEventListener('change', handler);
  mqSm.addEventListener('change', handler);
  return () => {
    mqLg.removeEventListener('change', handler);
    mqSm.removeEventListener('change', handler);
  };
}

function getVisibleCountSnapshot(): ServiceSlideCount {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return 3;
  }
  if (window.matchMedia('(min-width: 1024px)').matches) return 3;
  if (window.matchMedia('(min-width: 640px)').matches) return 2;
  return 1;
}

function ServiceShowcaseCard({
  service,
  branding,
  accent,
  showActionLink = false,
}: {
  service: ResolvedStudioService;
  branding: PublicBranding;
  accent: string;
  showActionLink?: boolean;
}) {
  return (
    <article className="group flex flex-col">
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-[#F3EFE6]">
        {service.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={service.imageUrl}
            srcSet={service.srcSet}
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 460px"
            alt={service.imageAlt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <BrandMark
              logoUrl={branding.logoUrl}
              alt={branding.displayName}
              size={64}
              variant="light"
              className="rounded-xl opacity-55"
            />
          </div>
        )}
      </div>

      <div className="pt-6 px-2 text-center flex-1 flex flex-col justify-between space-y-3.5">
        <div className="space-y-2.5">
          <h3 className="text-[1.35rem] sm:text-[1.5rem] lg:text-[1.7rem] font-bold tracking-tight text-[#181611] leading-snug">
            {service.title}
          </h3>
          <p className="mx-auto max-w-md text-sm sm:text-[15.5px] lg:text-[17px] text-[#5A5448] leading-[1.68]">
            {service.description}
          </p>
        </div>

        {showActionLink && (
          <div className="pt-1.5">
            <Link
              href="/#inquire"
              className="inline-flex items-center gap-1.5 text-sm font-semibold hover:underline underline-offset-4"
              style={{ color: accent }}
            >
              <span>Book / Inquire</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </article>
  );
}

export function PublicServicesSection({
  branding,
  servicesEvent = null,
  portfolioEvents,
  galleryImages,
  legacyPortfolio,
  variant = 'home',
}: PublicServicesSectionProps) {
  const accent = branding.themeTokens.accentColor || '#8B6A21';

  const resolved = useMemo(
    () =>
      resolveStudioServices({
        servicesEvent,
        brandingName: branding.displayName,
        portfolioEvents,
        galleryImages,
        legacyPortfolio,
      }),
    [servicesEvent, branding.displayName, portfolioEvents, galleryImages, legacyPortfolio],
  );

  const visibleCount = useSyncExternalStore<ServiceSlideCount>(
    subscribeVisibleCount,
    getVisibleCountSnapshot,
    () => 3,
  );

  const [slideIndex, setSlideIndex] = useState(0);
  const touchStartX = useRef<number | null>(null);

  const items = variant === 'all' ? resolved.allActiveServices : resolved.homepageServices;
  const maxIndex = Math.max(0, items.length - visibleCount);
  const safeIndex = Math.min(slideIndex, maxIndex);
  const canSlide = variant === 'home' && maxIndex > 0;

  const goPrev = () => {
    if (!canSlide) return;
    setSlideIndex((prev) => (prev <= 0 ? maxIndex : prev - 1));
  };

  const goNext = () => {
    if (!canSlide) return;
    setSlideIndex((prev) => (prev >= maxIndex ? 0 : prev + 1));
  };

  if (variant === 'home' && (!resolved.enabled || items.length === 0)) {
    return null;
  }

  return (
    <section
      id="services"
      aria-label={`${branding.displayName} photography and cinematography services`}
      className="border-b border-[#E5DFD0] bg-white scroll-mt-16"
    >
      <div className="mx-auto max-w-[1380px] px-4 py-14 sm:px-6 sm:py-16 lg:px-10 lg:py-20">
        {variant === 'home' && (
          <div className="mb-10 sm:mb-14 text-center">
            <h2
              className="font-editorial text-[2.35rem] sm:text-[3.05rem] lg:text-[3.45rem] font-normal tracking-tight leading-tight"
              style={{ color: accent }}
            >
              Our Services
            </h2>
          </div>
        )}

        {variant === 'all' ? (
          items.length > 0 ? (
            <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((service) => (
                <ServiceShowcaseCard
                  key={service.id}
                  service={service}
                  branding={branding}
                  accent={accent}
                  showActionLink
                />
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-base text-[#5A5448]">
              Services catalog will appear here once published from the studio dashboard.
            </div>
          )
        ) : (
          <div
            className="relative"
            onTouchStart={(e) => {
              touchStartX.current = e.touches[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              if (touchStartX.current === null || !canSlide) return;
              const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
              const diff = touchStartX.current - endX;
              touchStartX.current = null;
              if (Math.abs(diff) > 40) {
                if (diff > 0) goNext();
                else goPrev();
              }
            }}
          >
            {canSlide && (
              <>
                <button
                  type="button"
                  onClick={goPrev}
                  aria-label="Previous services"
                  className="absolute left-2 sm:-left-3 lg:-left-5 top-[125px] sm:top-[140px] lg:top-[160px] -translate-y-1/2 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#DFCEAA] bg-white/95 text-[#181611] shadow-md backdrop-blur-xs hover:border-[#8B6A21] hover:bg-[#8B6A21] hover:text-white transition-all cursor-pointer"
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
                  aria-label="Next services"
                  className="absolute right-2 sm:-right-3 lg:-right-5 top-[125px] sm:top-[140px] lg:top-[160px] -translate-y-1/2 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-[#DFCEAA] bg-white/95 text-[#181611] shadow-md backdrop-blur-xs hover:border-[#8B6A21] hover:bg-[#8B6A21] hover:text-white transition-all cursor-pointer"
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

            <div className="overflow-hidden">
              <div
                style={{
                  transform: `translate3d(-${(safeIndex * 100) / visibleCount}%, 0, 0)`,
                }}
                className="flex -mx-3 md:-mx-4 transition-transform duration-500 ease-out will-change-transform"
              >
                {items.map((service) => (
                  <div
                    key={service.id}
                    className="w-full sm:w-1/2 lg:w-1/3 flex-none px-3 md:px-4"
                  >
                    <ServiceShowcaseCard
                      service={service}
                      branding={branding}
                      accent={accent}
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {variant === 'home' && (
          <div className="mt-12 sm:mt-14 text-center">
            <Link
              href="/all-services"
              className="inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-sm sm:text-base font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
              style={{ backgroundColor: accent }}
            >
              <span>See All Services</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
