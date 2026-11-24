import React from 'react';
import Link from 'next/link';
import { PublicBranding } from '@/types/event-management';
import { resolvePublicBranding, STUDIO_PROFILE } from '@/lib/publicStorefront';
import { BrandMark } from './BrandMark';
import { CopyrightYear } from './CopyrightYear';
import {
  ExternalLinkIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
} from '@/components/shared/Icons';

export function Footer({ branding }: { branding?: PublicBranding | null }) {
  const resolved = resolvePublicBranding(branding);
  const displayName = resolved.displayName;
  const contact = resolved.contactDetails;
  const accent = resolved.themeTokens.accentColor || '#8B6A21';
  const secondary = resolved.themeTokens.secondaryColor || '#CAA650';

  const phone = contact?.phone || STUDIO_PROFILE.phoneIntl;
  const email = contact?.email || STUDIO_PROFILE.email;
  const address = contact?.address || STUDIO_PROFILE.address;
  const facebookUrl = contact?.website || STUDIO_PROFILE.facebookUrl;

  return (
    <footer className="mt-auto bg-[#14120E] text-[#F4EFE4] border-t border-[#2E291F]">
      <div
        className="h-[2px] w-full opacity-90"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${accent} 30%, ${secondary} 50%, ${accent} 70%, transparent 100%)`,
        }}
      />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3.5">
              <BrandMark
                logoUrl={resolved.logoUrl}
                alt={displayName}
                size={56}
                variant="dark"
                className="rounded-2xl shadow-md"
              />
              <div>
                <p className="font-editorial text-[1.75rem] leading-tight font-semibold text-white">
                  {displayName}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#E7D1AA] mt-0.5">
                  {STUDIO_PROFILE.tagline} • {STUDIO_PROFILE.city}
                </p>
              </div>
            </div>

            <p className="text-sm text-[#C7BFA9] max-w-md leading-relaxed">
              {STUDIO_PROFILE.description}
            </p>

            <div className="flex flex-wrap items-center gap-2.5 pt-1">
              <a
                href={facebookUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3.5 py-2 text-xs font-semibold text-[#F4EFE4] hover:border-[#CAA650]/65 hover:bg-white/10 transition-colors"
              >
                <span>Facebook ({STUDIO_PROFILE.followersCount} Followers)</span>
                <ExternalLinkIcon className="w-3.5 h-3.5 text-[#E7D1AA]" />
              </a>
              <a
                href={STUDIO_PROFILE.messengerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#CAA650]/40 bg-[#CAA650]/15 px-3.5 py-2 text-xs font-semibold text-[#E7D1AA] hover:bg-[#CAA650]/25 transition-colors"
              >
                <MessageCircleIcon className="w-3.5 h-3.5" />
                <span>Inbox Us</span>
              </a>
            </div>
          </div>

          <div className="md:col-span-2 text-sm space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E7D1AA]">
              Explore
            </p>
            <ul className="space-y-2 text-[#D5CDB8]">
              <li>
                <Link href="/#featured-portfolios" className="hover:text-white transition-colors">
                  Signature Work
                </Link>
              </li>
              <li>
                <Link href="/portfolio" className="hover:text-white transition-colors">
                  Client Portfolios
                </Link>
              </li>
              <li>
                <Link href="/#packages" className="hover:text-white transition-colors">
                  Wedding Packages
                </Link>
              </li>
              <li>
                <Link href="/#portfolio" className="hover:text-white transition-colors">
                  Photo &amp; Cinema
                </Link>
              </li>
              <li>
                <Link href="/#inquire" className="hover:text-white transition-colors">
                  Book Your Date
                </Link>
              </li>
            </ul>
          </div>

          <div className="md:col-span-3 text-sm space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E7D1AA]">
              Feni Studio Concierge
            </p>
            <div className="space-y-2.5 text-[#D5CDB8]">
              <p className="flex items-center gap-2">
                <PhoneIcon className="w-3.5 h-3.5 text-[#E7D1AA] shrink-0" />
                <a
                  href={`tel:${phone.replace(/\s+/g, '')}`}
                  className="hover:text-white transition-colors font-mono-code text-xs"
                >
                  {phone}
                </a>
              </p>
              <p className="flex items-center gap-2">
                <MailIcon className="w-3.5 h-3.5 text-[#E7D1AA] shrink-0" />
                <a
                  href={`mailto:${email}`}
                  className="hover:text-white transition-colors text-xs break-all"
                >
                  {email}
                </a>
              </p>
              <div className="flex items-start gap-2">
                <MapPinIcon className="w-3.5 h-3.5 text-[#E7D1AA] shrink-0 mt-0.5" />
                <a
                  href={STUDIO_PROFILE.mapsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-[#C7BFA9] hover:text-white leading-relaxed transition-colors"
                >
                  {address}
                </a>
              </div>
            </div>
          </div>

          <div className="md:col-span-2 text-sm md:text-right space-y-2.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E7D1AA]">
              Studio Portal
            </p>
            <p className="text-xs text-[#9C937E] font-mono-code">
              {resolved.timezone || 'Asia/Dhaka'} • {resolved.currency || 'BDT'}
            </p>
            <p className="text-[11px] text-[#C7BFA9]">
              Outdoor &amp; Indoor Productions • {STUDIO_PROFILE.priceTier}
            </p>
            <div className="pt-1">
              <Link
                href="/login"
                className="inline-flex items-center rounded-lg border border-white/15 bg-white/5 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-white/15 transition-colors"
              >
                Team Sign In →
              </Link>
            </div>
          </div>
        </div>

        <div className="mt-12 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/10 pt-6 text-xs text-[#9C937E]">
          <span>
            © <CopyrightYear /> {displayName}. All rights reserved.
          </span>
          <span className="tracking-wide">
            {STUDIO_PROFILE.subtitle} • {STUDIO_PROFILE.city}
          </span>
        </div>
      </div>
    </footer>
  );
}
