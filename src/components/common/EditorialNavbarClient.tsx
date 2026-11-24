'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { BrandMark } from './BrandMark';
import {
  ArrowRightIcon,
  CloseIcon,
  FacebookIcon,
  MapPinIcon,
  PhoneIcon,
  WhatsAppIcon,
} from '@/components/shared/Icons';

interface EditorialNavbarClientProps {
  displayName: string;
  subtitleText: string;
  logoUrl?: string | null;
  accent: string;
  secondary: string;
  phoneDisplay: string;
  phoneHref: string;
  address: string;
  mapsUrl: string;
  facebookUrl: string;
  whatsappHref: string;
}

const EDITORIAL_MENU_ITEMS = [
  { code: '01', href: '/', label: 'Home' },
  { code: '02', href: '/#featured-portfolios', label: 'Signature Work' },
  { code: '03', href: '/portfolio', label: 'Client Albums' },
  { code: '04', href: '/#portfolio', label: 'Highlight Films & Stills' },
  { code: '05', href: '/#packages', label: 'Packages' },
  { code: '06', href: '/#studio-concierge', label: 'Book Your Date' },
];

export function EditorialNavbarClient({
  displayName,
  subtitleText,
  logoUrl,
  accent,
  secondary,
  phoneDisplay,
  phoneHref,
  address,
  mapsUrl,
  facebookUrl,
  whatsappHref,
}: EditorialNavbarClientProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    if (!open) return undefined;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  const closeDrawer = () => setOpen(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-[#E5DFD0]/90 bg-[#F9F8F5]/95 backdrop-blur-xl">
        <div
          className="h-[2px] w-full"
          style={{
            background: `linear-gradient(90deg, ${accent} 0%, ${secondary} 50%, ${accent} 100%)`,
          }}
        />

        <div className="mx-auto flex h-16 sm:h-[68px] max-w-6xl items-center justify-between gap-3 px-3 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 group min-w-0">
            <BrandMark
              logoUrl={logoUrl}
              alt={displayName}
              size={40}
              variant="light"
              className="rounded-xl shadow-2xs transition-transform duration-200 group-hover:scale-105"
            />
            <div className="leading-none min-w-0">
              <span className="font-editorial text-[1.28rem] sm:text-[1.58rem] font-semibold text-[#181611] leading-none block truncate">
                {displayName}
              </span>
              <span className="text-[9px] sm:text-[10px] font-semibold uppercase tracking-[0.12em] sm:tracking-[0.2em] text-[#7A5E21] block mt-0.5 sm:mt-1 truncate">
                {subtitleText}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <a
              href={facebookUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${displayName} Facebook`}
              title="Facebook Page"
              className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E5DFD0] bg-white text-[#4A4438] hover:border-[#CAA650] hover:text-[#181611] transition-colors"
            >
              <FacebookIcon className="w-4 h-4" />
            </a>

            <a
              href={phoneHref}
              className="hidden lg:inline-flex items-center gap-1.5 rounded-full border border-[#DFCEAA] bg-[#F8F3E6] px-3.5 py-2 text-xs font-semibold text-[#4A4438] hover:border-[#CAA650] hover:text-[#181611] transition-colors whitespace-nowrap"
              title={`Call ${displayName}`}
            >
              <PhoneIcon className="w-3.5 h-3.5 text-[#8B6A21]" />
              <span className="font-mono-code tabular-nums">{phoneDisplay}</span>
            </a>

            <Link
              href="/#inquire"
              className="hidden sm:inline-flex items-center rounded-full px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.98] whitespace-nowrap"
              style={{ backgroundColor: accent }}
            >
              Book Date
            </Link>

            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={open}
              className="inline-flex h-10 items-center gap-2.5 rounded-full border border-[#D8CCB2] bg-white px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-[#181611] shadow-2xs hover:border-[#8B6A21] hover:bg-[#F8F3E6] transition-all cursor-pointer"
            >
              <span className="hidden sm:inline tracking-wide">Menu</span>
              <span aria-hidden="true" className="flex flex-col justify-center gap-[5px] w-4">
                <span className="block h-[1.5px] w-full bg-[#181611] rounded-full" />
                <span className="block h-[1.5px] w-3 bg-[#8B6A21] rounded-full self-end" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Lightweight Slide-Over Drawer (Zero scroll-lock trap, leaves page layout untouched) */}
      {open && (
        <>
          <div
            aria-hidden="true"
            onClick={closeDrawer}
            className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px]"
          />

          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Site Navigation"
            className="fixed inset-y-0 right-0 z-50 w-full max-w-[430px] sm:max-w-[470px] bg-[#14120E]/[0.97] text-[#F4EFE4] border-l border-[#CAA650]/30 shadow-[0_24px_80px_rgba(0,0,0,0.65)] flex flex-col justify-between p-6 sm:p-8 overflow-y-auto"
          >
            {/* Drawer Top Controls */}
            <div className="flex items-center justify-between gap-3 pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-2">
                <a
                  href={facebookUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${displayName} Facebook`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#F4EFE4] hover:border-[#CAA650] hover:text-[#E7D1AA] transition-colors"
                >
                  <FacebookIcon className="w-4 h-4" />
                </a>
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`Chat with ${displayName} on WhatsApp`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#F4EFE4] hover:border-[#25D366] hover:text-[#25D366] transition-colors"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                </a>
                <a
                  href={phoneHref}
                  aria-label={`Call ${displayName}`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#F4EFE4] hover:border-[#CAA650] hover:text-[#E7D1AA] transition-colors"
                >
                  <PhoneIcon className="w-4 h-4" />
                </a>
              </div>

              <button
                type="button"
                onClick={closeDrawer}
                aria-label="Close navigation menu"
                className="group inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#CAA650]/45 bg-white/5 text-white hover:border-[#E7D1AA] hover:bg-[#CAA650]/20 transition-all cursor-pointer"
              >
                <CloseIcon className="w-5 h-5 transition-transform duration-300 group-hover:rotate-90" />
              </button>
            </div>

            {/* Large Editorial Menu Links */}
            <nav
              aria-label="Drawer navigation"
              className="my-auto py-8 flex flex-col space-y-2.5 sm:space-y-3"
            >
              {EDITORIAL_MENU_ITEMS.map((item) => {
                const isActive =
                  item.href === '/'
                    ? pathname === '/'
                    : item.href === '/portfolio' && pathname.startsWith('/portfolio');

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={closeDrawer}
                    className="group flex items-baseline gap-4 py-1.5 focus:outline-none"
                  >
                    <span
                      className={cn(
                        'font-mono-code text-xs font-semibold tracking-wider w-6 shrink-0 transition-colors',
                        isActive
                          ? 'text-[#E7D1AA]'
                          : 'text-[#CAA650]/65 group-hover:text-[#E7D1AA]',
                      )}
                    >
                      {item.code}
                    </span>
                    <span
                      className={cn(
                        'font-editorial text-[2.05rem] sm:text-[2.65rem] font-medium leading-[1.16] transition-all duration-200 group-hover:translate-x-2',
                        isActive
                          ? 'text-[#E7D1AA] italic'
                          : 'text-white/95 group-hover:text-[#E7D1AA]',
                      )}
                    >
                      {item.label}
                    </span>
                    <ArrowRightIcon className="w-5 h-5 text-[#CAA650] opacity-0 -translate-x-2 transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-0 shrink-0 self-center" />
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Bottom Info */}
            <div className="pt-5 border-t border-white/10 space-y-3 shrink-0">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <a
                  href={phoneHref}
                  onClick={closeDrawer}
                  className="inline-flex items-center gap-1.5 font-mono-code font-semibold text-[#E7D1AA] hover:underline"
                >
                  <PhoneIcon className="w-3.5 h-3.5" />
                  <span>{phoneDisplay}</span>
                </a>
                <Link
                  href="/login"
                  onClick={closeDrawer}
                  className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-white/5 px-3.5 py-1.5 font-semibold text-[#D5CDB8] hover:text-white hover:border-[#CAA650]/50 transition-colors"
                >
                  <span>Team Portal</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>

              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={closeDrawer}
                className="flex items-start gap-2 text-[11px] text-[#9C937E] hover:text-white transition-colors"
              >
                <MapPinIcon className="w-3.5 h-3.5 text-[#E7D1AA] shrink-0 mt-0.5" />
                <span className="leading-snug">{address}</span>
              </a>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
