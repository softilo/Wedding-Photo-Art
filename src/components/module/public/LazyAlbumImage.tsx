'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { isNextOptimizableUrl } from '@/lib/showcaseMedia';
import { cn } from '@/lib/utils';

export { isNextOptimizableUrl };

const SHIMMER_BLUR_DATA_URL =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTYiIGhlaWdodD0iMTAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjEwIiBmaWxsPSIjZTdlMmRhIi8+PC9zdmc+';

interface LazyAlbumImageProps {
  src: string;
  alt: string;
  sizes: string;
  quality?: number;
  aspectRatio?: string;
  darkSurface?: boolean;
  className?: string;
  containerClassName?: string;
  rootMargin?: string;
  /** Only set true for the single above-the-fold LCP hero image */
  isHero?: boolean;
}

/**
 * Viewport-gated Next.js <Image> component.
 * Reserves exact aspect-ratio space (zero CLS) with a shimmer placeholder,
 * and does NOT request image bytes until the tile nears the viewport.
 */
export function LazyAlbumImage({
  src,
  alt,
  sizes,
  quality = 92,
  aspectRatio,
  darkSurface = false,
  className,
  containerClassName,
  rootMargin = '140px 0px',
  isHero = false,
}: LazyAlbumImageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(
    () => isHero || (typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined'),
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (isHero || !el || isVisible || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin, threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isHero, isVisible, rootMargin]);

  return (
    <div
      ref={containerRef}
      style={aspectRatio ? { aspectRatio } : undefined}
      className={cn(
        'relative w-full overflow-hidden',
        darkSurface ? 'bg-stone-900' : 'bg-stone-200/70',
        containerClassName,
      )}
    >
      {!isLoaded && (
        <div
          aria-hidden="true"
          className={cn(
            'absolute inset-0 animate-pulse',
            darkSurface
              ? 'bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900'
              : 'bg-gradient-to-br from-stone-200 via-stone-100 to-stone-200',
          )}
        />
      )}

      {isVisible && src && (
        <Image
          src={src}
          alt={alt}
          fill
          preload={isHero}
          quality={quality}
          placeholder="blur"
          blurDataURL={SHIMMER_BLUR_DATA_URL}
          unoptimized={!isNextOptimizableUrl(src)}
          sizes={sizes}
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
          className={cn(
            'transition-all duration-500',
            isLoaded ? 'opacity-100' : 'opacity-0',
            className,
          )}
        />
      )}
    </div>
  );
}
