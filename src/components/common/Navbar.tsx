import React from 'react';
import Link from 'next/link';
import { PublicBranding } from '@/types/event-management';
import { resolvePublicBranding, STUDIO_PROFILE } from '@/lib/publicStorefront';
import { BrandMark } from './BrandMark';
import { MobileNavDrawer } from './MobileNavDrawer';
import { PhoneIcon } from '@/components/shared/Icons';

interface NavbarProps {
  branding?: PublicBranding | null;
}

export function Navbar({ branding }: NavbarProps) {
  const resolved = resolvePublicBranding(branding);
  const displayName = resolved.displayName;
  const contact = resolved.contactDetails;
  const accent = resolved.themeTokens.accentColor || '#8B6A21';
  const secondary = resolved.themeTokens.secondaryColor || '#CAA650';

  const phoneText = contact?.phone || STUDIO_PROFILE.phoneDisplay;
  const phoneHref = `tel:${phoneText.replace(/\s+/g, '')}`;
  const address = contact?.address || STUDIO_PROFILE.address;
  const isWeddingPhotoArt = displayName.toLowerCase().includes('wedding photoart');

  return (
    <header className="sticky top-0 z-40 border-b border-[#E5DFD0]/90 bg-[#F9F8F5]/95 backdrop-blur-xl">
      <div
        className="h-[2px] w-full"
        style={{
          background: `linear-gradient(90deg, ${accent} 0%, ${secondary} 50%, ${accent} 100%)`,
        }}
      />

      <div className="mx-auto flex h-16 sm:h-[68px] max-w-6xl items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0 flex-1 lg:flex-none">
          <BrandMark
            logoUrl={resolved.logoUrl}
            alt={displayName}
            size={40}
            variant="light"
            className="rounded-xl shadow-2xs transition-transform duration-200 group-hover:scale-105"
          />
          <div className="leading-none min-w-0">
            <span className="font-editorial text-lg sm:text-[1.35rem] font-semibold tracking-tight text-[#181611] block truncate">
              {displayName}
            </span>
            <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em] text-[#7A5E21] block mt-0.5 sm:mt-1 truncate">
              {isWeddingPhotoArt
                ? 'Feni • Photo & Cinema'
                : 'Photography & Cinema'}
            </span>
          </div>
        </Link>

        <nav
          aria-label="Primary navigation"
          className="hidden lg:flex items-center gap-0.5 xl:gap-1 rounded-full border border-[#E5DFD0] bg-[#F3EFE6]/95 p-1 text-xs font-semibold text-[#4A4438] shrink-0"
        >
          <Link
            href="/#specialties"
            className="rounded-full px-2.5 xl:px-3.5 py-1.5 hover:bg-white hover:text-[#181611] hover:shadow-2xs transition-all whitespace-nowrap"
          >
            Specialties
          </Link>
          <Link
            href="/#featured-portfolios"
            className="hidden xl:inline-flex rounded-full px-3.5 py-1.5 hover:bg-white hover:text-[#181611] hover:shadow-2xs transition-all whitespace-nowrap"
          >
            Signature Work
          </Link>
          <Link
            href="/portfolio"
            className="rounded-full px-2.5 xl:px-3.5 py-1.5 hover:bg-white hover:text-[#181611] hover:shadow-2xs transition-all whitespace-nowrap"
          >
            Client Albums
          </Link>
          <Link
            href="/#packages"
            className="rounded-full px-2.5 xl:px-3.5 py-1.5 hover:bg-white hover:text-[#181611] hover:shadow-2xs transition-all whitespace-nowrap"
          >
            Packages
          </Link>
          <Link
            href="/#portfolio"
            className="rounded-full px-2.5 xl:px-3.5 py-1.5 hover:bg-white hover:text-[#181611] hover:shadow-2xs transition-all whitespace-nowrap"
          >
            Gallery
          </Link>
          <Link
            href="/#studio-concierge"
            className="rounded-full px-2.5 xl:px-3.5 py-1.5 hover:bg-white hover:text-[#181611] hover:shadow-2xs transition-all whitespace-nowrap"
          >
            Feni Studio
          </Link>
        </nav>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <a
            href={phoneHref}
            className="hidden xl:inline-flex items-center gap-1.5 rounded-xl border border-[#DFCEAA] bg-[#F8F3E6] px-3 py-2 text-xs font-semibold text-[#4A4438] hover:border-[#CAA650] hover:text-[#181611] transition-colors whitespace-nowrap"
            title="Call Wedding PhotoArt Studio"
          >
            <PhoneIcon className="w-3.5 h-3.5 text-[#8B6A21]" />
            <span className="font-mono-code tabular-nums">{STUDIO_PROFILE.phoneDisplay}</span>
          </a>
          <Link
            href="/#inquire"
            className="inline-flex items-center rounded-xl px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.98] whitespace-nowrap"
            style={{ backgroundColor: accent }}
          >
            <span className="sm:hidden">Book</span>
            <span className="hidden sm:inline">Book Date</span>
          </Link>
          <Link
            href="/login"
            className="hidden md:inline-flex items-center rounded-xl border border-[#D8CCB2] bg-white px-3 py-2 text-xs sm:text-sm font-semibold text-[#3C362B] hover:bg-[#F3EFE6] hover:text-[#181611] transition-colors whitespace-nowrap"
          >
            Team Portal
          </Link>
          <MobileNavDrawer
            accent={accent}
            phoneDisplay={STUDIO_PROFILE.phoneDisplay}
            phoneHref={phoneHref}
            address={address}
            mapsUrl={STUDIO_PROFILE.mapsUrl}
          />
        </div>
      </div>
    </header>
  );
}
