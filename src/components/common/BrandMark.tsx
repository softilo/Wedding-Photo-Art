import React from 'react';
import Image from 'next/image';
import { STUDIO_PROFILE } from '@/lib/publicStorefront';
import { isNextOptimizableUrl } from '@/lib/showcaseMedia';
import { cn } from '@/lib/utils';

interface BrandMarkProps {
  logoUrl?: string | null;
  alt?: string;
  size?: number;
  variant?: 'light' | 'dark';
  className?: string;
}

/**
 * Renders the Wedding PhotoArt metallic-gold emblem (or custom uploaded studio logo)
 * on either warm ivory or deep obsidian surfaces with crisp sizing and zero CLS.
 */
export function BrandMark({
  logoUrl,
  alt = STUDIO_PROFILE.name,
  size = 44,
  variant = 'light',
  className,
}: BrandMarkProps) {
  const src = (logoUrl || '').trim() || STUDIO_PROFILE.logoMarkUrl;

  return (
    <span
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden',
        variant === 'dark'
          ? 'bg-[#14120E] border border-[#CAA650]/45'
          : 'bg-[#F7F5EE] border border-[#D8C59B]',
        className,
      )}
      style={{ width: size, height: size }}
    >
      <Image
        src={src}
        alt={alt}
        width={size}
        height={size}
        quality={95}
        unoptimized={!isNextOptimizableUrl(src)}
        className="h-full w-full object-contain p-0.5"
      />
    </span>
  );
}
