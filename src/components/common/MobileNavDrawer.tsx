'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { CloseIcon, MapPinIcon, MenuIcon, PhoneIcon } from '@/components/shared/Icons';

interface MobileNavDrawerProps {
  accent: string;
  phoneDisplay: string;
  phoneHref: string;
  address: string;
  mapsUrl: string;
}

const NAV_LINKS = [
  { href: '/#featured-portfolios', label: 'Signature Work', hint: 'Featured Client Albums' },
  { href: '/portfolio', label: 'Client Albums', hint: 'All Published Portfolios' },
  { href: '/#packages', label: 'Packages', hint: 'Collections & Pricing' },
  { href: '/#portfolio', label: 'Gallery', hint: 'Photography & Cinema Wall' },
  { href: '/#studio-concierge', label: 'Feni Studio', hint: 'Location, Reviews & Booking' },
];

export function MobileNavDrawer({
  accent,
  phoneDisplay,
  phoneHref,
  address,
  mapsUrl,
}: MobileNavDrawerProps) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        className="lg:hidden inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[#D8CCB2] bg-white text-[#181611] hover:bg-[#F3EFE6] transition-colors cursor-pointer"
      >
        {open ? <CloseIcon className="w-4 h-4" /> : <MenuIcon className="w-4 h-4" />}
      </button>

      {open && (
        <div className="lg:hidden absolute left-0 right-0 top-full z-50 border-b border-[#D8CCB2] bg-[#F9F8F5] shadow-[0_24px_48px_-16px_rgba(24,22,17,0.22)]">
          <div className="mx-auto max-w-6xl px-4 py-4 space-y-4">
            <nav aria-label="Mobile navigation" className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {NAV_LINKS.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between rounded-xl border border-[#E5DFD0] bg-white px-3.5 py-2.5 text-sm font-semibold text-[#181611] hover:border-[#CAA650] hover:bg-[#F8F3E6] transition-colors"
                >
                  <span>{item.label}</span>
                  <span className="text-[11px] font-normal text-[#6B6352]">{item.hint}</span>
                </Link>
              ))}
            </nav>

            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#E5DFD0]">
              <a
                href={phoneHref}
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#DFCEAA] bg-[#F8F3E6] px-3 py-2.5 text-xs font-semibold text-[#181611]"
              >
                <PhoneIcon className="w-3.5 h-3.5 text-[#8B6A21]" />
                <span className="font-mono-code">{phoneDisplay}</span>
              </a>
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="inline-flex items-center justify-center rounded-xl border border-[#D8CCB2] bg-white px-3 py-2.5 text-xs font-semibold text-[#3C362B]"
              >
                Team Portal
              </Link>
            </div>

            <Link
              href="/#inquire"
              onClick={() => setOpen(false)}
              style={{ backgroundColor: accent }}
              className="flex w-full items-center justify-center rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              Reserve Your Date →
            </Link>

            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setOpen(false)}
              className="flex items-start gap-2 text-[11px] text-[#6B6352] hover:text-[#181611] px-1"
            >
              <MapPinIcon className="w-3.5 h-3.5 text-[#8B6A21] shrink-0 mt-0.5" />
              <span className="leading-snug">{address}</span>
            </a>
          </div>
        </div>
      )}
    </>
  );
}
