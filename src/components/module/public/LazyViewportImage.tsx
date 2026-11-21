'use client';

import React, { useEffect, useRef, useState } from 'react';
import { cn } from '@/lib/utils';

interface LazyViewportImageProps {
  src: string;
  srcSet?: string;
  sizes?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  containerStyle?: React.CSSProperties;
  rootMargin?: string;
}

/**
 * Strict viewport-gated lazy image component.
 * Unlike native `loading="lazy"` (which Chrome pre-fetches 1500-2500px early),
 * this component does NOT mount the `<img>` element or start any network request
 * until the container actually approaches/enters the viewport via IntersectionObserver.
 */
export function LazyViewportImage({
  src,
  srcSet,
  sizes,
  alt,
  className,
  containerClassName,
  containerStyle,
  rootMargin = '80px 0px',
}: LazyViewportImageProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isInViewport, setIsInViewport] = useState(
    () => typeof window !== 'undefined' && typeof IntersectionObserver === 'undefined',
  );
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || isInViewport || typeof IntersectionObserver === 'undefined') return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setIsInViewport(true);
            observer.disconnect();
            break;
          }
        }
      },
      {
        rootMargin,
        threshold: 0.01,
      },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [isInViewport, rootMargin]);

  return (
    <div
      ref={containerRef}
      style={containerStyle}
      className={cn('relative overflow-hidden bg-[#EFECE3]', containerClassName)}
    >
      {/* Shimmer skeleton shown before entering viewport and while image bytes load */}
      {!isLoaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-gradient-to-br from-[#E5DFD0] via-[#F9F8F5] to-[#E5DFD0]"
        />
      )}

      {isInViewport && src && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          loading="lazy"
          decoding="async"
          onLoad={() => setIsLoaded(true)}
          onError={() => setIsLoaded(true)}
          className={cn(
            'transition-all duration-500',
            isLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-[1.02]',
            className,
          )}
        />
      )}
    </div>
  );
}
