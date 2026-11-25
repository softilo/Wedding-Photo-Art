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
  YouTubeIcon,
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
  youtubeUrl: string;
  whatsappHref: string;
}

const EDITORIAL_MENU_ITEMS = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: '/#packages', label: 'Packages' },
  { href: '/#portfolio', label: 'Sample Works' },
  { href: '/#inquire', label: 'Book Us' },
  { href: '/#studio-concierge', label: 'Why Us' },
  { href: '/career', label: 'Career' },
  { href: '/contact', label: 'Contact' },
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
  youtubeUrl,
  whatsappHref,
}: EditorialNavbarClientProps) {
  const [open, setOpen] = useState(false);
  const [activeHash, setActiveHash] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    const syncHash = () => {
      setActiveHash(window.location.hash || '');
    };
    const rafId = window.requestAnimationFrame(syncHash);
    window.addEventListener('hashchange', syncHash);
    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('hashchange', syncHash);
    };
  }, [pathname]);

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

  const isNavItemActive = (href: string) => {
    if (href === '/') {
      return pathname === '/' && !activeHash;
    }
    if (href === '/about') {
      return pathname.startsWith('/about');
    }
    if (href === '/career') {
      return pathname.startsWith('/career');
    }
    if (href === '/contact') {
      return pathname.startsWith('/contact');
    }
    if (href === '/#portfolio') {
      return (
        pathname.startsWith('/portfolio') ||
        pathname.startsWith('/album') ||
        (pathname === '/' && activeHash === '#portfolio')
      );
    }
    if (href.startsWith('/#')) {
      return pathname === '/' && activeHash === href.slice(1);
    }
    return pathname === href;
  };

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
          <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
            <button
              type="button"
              onClick={() => setOpen((prev) => !prev)}
              aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={open}
              className="inline-flex h-10 shrink-0 items-center gap-2.5 rounded-full border border-[#D8CCB2] bg-white px-3.5 sm:px-4 text-xs sm:text-sm font-semibold text-[#181611] shadow-2xs hover:border-[#8B6A21] hover:bg-[#F8F3E6] transition-all cursor-pointer"
            >
              <span aria-hidden="true" className="flex flex-col justify-center gap-[5px] w-4">
                <span className="block h-[1.5px] w-full bg-[#181611] rounded-full" />
                <span className="block h-[1.5px] w-3 bg-[#8B6A21] rounded-full self-start" />
              </span>
              <span className="hidden sm:inline tracking-wide">Menu</span>
            </button>

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
          </div>

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
              href={youtubeUrl}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${displayName} YouTube`}
              title="YouTube Channel"
              className="hidden md:inline-flex h-9 w-9 items-center justify-center rounded-full border border-[#E5DFD0] bg-white text-[#4A4438] hover:border-[#FF0000]/60 hover:text-[#DC2626] transition-colors"
            >
              <YouTubeIcon className="w-4 h-4" />
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
              className="inline-flex items-center rounded-full px-3.5 sm:px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.98] whitespace-nowrap"
              style={{ backgroundColor: accent }}
            >
              Book Date
            </Link>
          </div>
        </div>
      </header>

      {/* Lightweight Left Slide-Over Drawer (Zero scroll-lock trap, leaves page layout untouched) */}
      <div
        aria-hidden="true"
        onClick={closeDrawer}
        className={cn(
          'fixed inset-0 z-50 bg-black/45 backdrop-blur-[2px] transition-all duration-300 ease-out',
          open ? 'opacity-100 pointer-events-auto visible' : 'opacity-0 pointer-events-none invisible',
        )}
      />

      <aside
        role="dialog"
        aria-modal={open || undefined}
        aria-hidden={!open}
        aria-label="Site Navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-full max-w-[430px] sm:max-w-[470px] bg-[#14120E]/[0.97] text-[#F4EFE4] border-r border-[#CAA650]/30 shadow-[0_24px_80px_rgba(0,0,0,0.65)] flex flex-col justify-between p-5 sm:p-7 overflow-y-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden transition-all duration-300 ease-out will-change-transform',
          open
            ? 'translate-x-0 opacity-100 pointer-events-auto visible'
            : '-translate-x-full opacity-0 pointer-events-none invisible',
        )}
      >
            {/* Drawer Top Controls */}
            <div className="flex items-center justify-between gap-3 pb-3.5 border-b border-white/10 shrink-0">
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
                  href={youtubeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${displayName} YouTube`}
                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/5 text-[#F4EFE4] hover:border-[#EF4444] hover:text-[#F87171] transition-colors"
                >
                  <YouTubeIcon className="w-4 h-4" />
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
              className="relative my-auto py-3 flex flex-col space-y-0.5 sm:space-y-1"
            >
              <div
                aria-hidden="true"
                className="pointer-events-none absolute right-2 top-3 opacity-[0.06] select-none"
              >
                <BrandMark logoUrl={logoUrl} alt="" size={84} variant="dark" className="rounded-2xl" />
              </div>

              {EDITORIAL_MENU_ITEMS.map((item) => {
                const isActive = isNavItemActive(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => {
                      if (item.href === '/') {
                        setActiveHash('');
                      } else if (item.href.startsWith('/#')) {
                        setActiveHash(item.href.slice(1));
                      }
                      closeDrawer();
                    }}
                    className="group relative flex items-center gap-4 py-1 focus:outline-none"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-[1.5px] shrink-0 rounded-full transition-all duration-300 ease-out',
                        isActive
                          ? 'w-7 opacity-100 bg-[#E7D1AA]'
                          : 'w-0 opacity-0 bg-[#CAA650] group-hover:w-7 group-hover:opacity-100',
                      )}
                    />
                    <span
                      className={cn(
                        'font-editorial text-[1.8rem] sm:text-[2.15rem] font-medium leading-[1.12] whitespace-nowrap transition-colors duration-200',
                        isActive
                          ? 'text-[#E7D1AA]'
                          : 'text-[#F4EFE4] group-hover:text-[#E7D1AA]',
                      )}
                    >
                      {item.label}
                    </span>
                    <span
                      aria-hidden="true"
                      className={cn(
                        'h-[1px] transition-all duration-300 ease-out bg-gradient-to-r from-[#E7D1AA]/85 via-[#CAA650]/40 to-transparent',
                        isActive
                          ? 'flex-1 opacity-100'
                          : 'w-0 opacity-0 group-hover:flex-1 group-hover:opacity-75',
                      )}
                    />
                  </Link>
                );
              })}
            </nav>

            {/* Drawer Bottom Info */}
            <div className="pt-4 border-t border-white/10 space-y-2.5 shrink-0">
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
  );
}
