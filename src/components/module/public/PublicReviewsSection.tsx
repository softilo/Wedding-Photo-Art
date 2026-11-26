'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ClientReview } from '@/types/event-management';
import { STUDIO_PROFILE } from '@/lib/publicStorefront';
import { buildCloudinaryImageUrl } from '@/lib/showcaseMedia';
import { cn } from '@/lib/utils';

interface PublicReviewsSectionProps {
  reviews?: ClientReview[];
  fallbackImageUrls?: string[];
  studioName: string;
}

interface DisplayReviewSlide {
  id: string;
  clientName: string;
  quote: string;
  rating: number;
  eventTitle: string | null;
  sourceLabel: string | null;
  imageUrl: string | null;
}

function ReviewStar({ filled }: { filled: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className={cn(
        'h-4 w-4 sm:h-5 sm:w-5 transition-colors',
        filled ? 'text-[#F5C518]' : 'text-white/25',
      )}
      fill="currentColor"
    >
      <path d="M12 2.25l2.92 5.92 6.53.95-4.72 4.6 1.11 6.5L12 17.15l-5.84 3.07 1.11-6.5-4.72-4.6 6.53-.95L12 2.25z" />
    </svg>
  );
}

export function PublicReviewsSection({
  reviews = [],
  fallbackImageUrls = [],
  studioName,
}: PublicReviewsSectionProps) {
  const slides = useMemo<DisplayReviewSlide[]>(() => {
    if (reviews.length > 0) {
      return reviews.map((review) => ({
        id: review.id,
        clientName: review.clientName,
        quote: review.quote,
        rating: Math.min(5, Math.max(1, Math.round(review.rating || 5))),
        eventTitle: review.eventTitle,
        sourceLabel: review.sourceLabel,
        imageUrl: buildCloudinaryImageUrl(
          review.deliveryUrls?.fullUrl || review.imageUrl,
          {
            width: 1920,
            crop: 'limit',
            quality: 'auto:good',
          },
        ),
      }));
    }

    return STUDIO_PROFILE.reviews.map((fallback, index) => {
      const candidateBackdrop = fallbackImageUrls[index] ?? fallbackImageUrls[0] ?? null;
      return {
        id: `studio-default-review-${index}`,
        clientName: fallback.author,
        quote: fallback.quote,
        rating: 5,
        eventTitle: null,
        sourceLabel: fallback.source,
        imageUrl: candidateBackdrop
          ? buildCloudinaryImageUrl(candidateBackdrop, {
              width: 1920,
              crop: 'limit',
              quality: 'auto:good',
            })
          : null,
      };
    });
  }, [reviews, fallbackImageUrls]);

  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);

  const count = slides.length;
  const safeIndex = count > 0 ? activeIndex % count : 0;
  const current = slides[safeIndex];

  useEffect(() => {
    if (count <= 1 || isPaused) return;
    if (
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % count);
    }, 6500);

    return () => window.clearInterval(timer);
  }, [count, isPaused]);

  if (!current) {
    return null;
  }

  const goPrev = () => {
    if (count <= 1) return;
    setActiveIndex((prev) => (prev - 1 + count) % count);
  };

  const goNext = () => {
    if (count <= 1) return;
    setActiveIndex((prev) => (prev + 1) % count);
  };

  const subtitleParts = [current.eventTitle, current.sourceLabel].filter(Boolean);

  return (
    <section
      id="reviews"
      aria-label={`${studioName} client reviews`}
      aria-roledescription={count > 1 ? 'carousel' : undefined}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocusCapture={() => setIsPaused(true)}
      onBlurCapture={() => setIsPaused(false)}
      onTouchStart={(e) => {
        touchStartX.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        if (touchStartX.current === null) return;
        const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
        const diff = touchStartX.current - endX;
        touchStartX.current = null;
        if (Math.abs(diff) > 40) {
          if (diff > 0) goNext();
          else goPrev();
        }
      }}
      className="group relative w-full overflow-hidden bg-[#14110C] text-white min-h-[320px] sm:min-h-[380px] lg:min-h-[430px] flex items-center justify-center scroll-mt-16"
    >
      {/* Background photos stacked with smooth opacity fade */}
      <div className="absolute inset-0 pointer-events-none select-none" aria-hidden="true">
        {slides.map((slide, index) => {
          const isActive = index === safeIndex;
          if (!slide.imageUrl) {
            return (
              <div
                key={slide.id}
                className={cn(
                  'absolute inset-0 bg-gradient-to-br from-[#231D14] via-[#15120D] to-[#0D0B08] transition-opacity duration-700',
                  isActive ? 'opacity-100' : 'opacity-0',
                )}
              />
            );
          }

          return (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={slide.id}
              src={slide.imageUrl}
              alt=""
              loading={index === 0 ? 'eager' : 'lazy'}
              decoding="async"
              className={cn(
                'absolute inset-0 h-full w-full object-cover object-center transition-all duration-700 ease-out',
                isActive ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.03]',
              )}
            />
          );
        })}

        {/* Atmospheric dark overlay matching editorial contrast */}
        <div
          className="absolute inset-0 bg-[#120F0A]/62"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(16,13,9,0.72) 0%, rgba(16,13,9,0.52) 50%, rgba(16,13,9,0.78) 100%)',
          }}
        />
      </div>

      {/* Subtle desktop prev / next chevrons on hover */}
      {count > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            aria-label="Previous client review"
            className="hidden sm:inline-flex absolute left-4 lg:left-8 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white/85 backdrop-blur-xs opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/60 hover:text-white transition-all cursor-pointer"
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
            aria-label="Next client review"
            className="hidden sm:inline-flex absolute right-4 lg:right-8 top-1/2 -translate-y-1/2 z-20 h-10 w-10 items-center justify-center rounded-full border border-white/25 bg-black/35 text-white/85 backdrop-blur-xs opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:bg-black/60 hover:text-white transition-all cursor-pointer"
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

      {/* Centered Review Content Stack */}
      <div className="relative z-10 mx-auto max-w-4xl px-6 py-12 sm:py-16 text-center">
        <h2 className="font-editorial uppercase tracking-[0.07em] text-2xl sm:text-3xl lg:text-[2.25rem] font-semibold text-white drop-shadow-sm">
          Client Reviews
        </h2>

        <blockquote className="mt-5 sm:mt-6 max-w-2xl mx-auto">
          <p className="text-sm sm:text-base lg:text-[17px] leading-relaxed text-[#F7F3EA] font-normal drop-shadow-xs">
            &ldquo; {current.quote} &rdquo;
          </p>
        </blockquote>

        <div
          className="mt-4 sm:mt-5 flex items-center justify-center gap-1.5"
          role="img"
          aria-label={`Rated ${current.rating} out of 5 stars`}
        >
          {[1, 2, 3, 4, 5].map((star) => (
            <ReviewStar key={star} filled={star <= current.rating} />
          ))}
        </div>

        <p className="mt-3 text-xs sm:text-sm font-medium tracking-wide text-[#EFEAE0]">
          -{current.clientName}
        </p>

        {subtitleParts.length > 0 && (
          <p className="mt-1 text-[11px] uppercase tracking-[0.14em] text-white/65">
            {subtitleParts.join(' • ')}
          </p>
        )}
      </div>

      {/* Bottom-right Dot Pagination (matching screenshot placement) */}
      {count > 1 && (
        <div
          role="tablist"
          aria-label="Client review slides"
          className="absolute bottom-5 right-5 sm:bottom-6 sm:right-8 z-20 flex items-center gap-2.5"
        >
          {slides.map((slide, index) => {
            const isSelected = index === safeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`View review by ${slide.clientName} (${index + 1} of ${count})`}
                onClick={() => setActiveIndex(index)}
                className={cn(
                  'rounded-full transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white',
                  isSelected
                    ? 'h-2.5 w-2.5 bg-white shadow-xs'
                    : 'h-2 w-2 bg-white/40 hover:bg-white/75',
                )}
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
