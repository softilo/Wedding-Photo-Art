import React from 'react';
import { PublicBranding } from '@/types/event-management';
import { resolvePublicBranding, STUDIO_PROFILE } from '@/lib/publicStorefront';
import { WhatsAppIcon } from '@/components/shared/Icons';

interface FloatingWhatsAppButtonProps {
  branding?: PublicBranding | null;
}

export function buildWhatsAppUrl(
  phone?: string | null,
  studioName: string = STUDIO_PROFILE.name,
): string {
  const rawDigits = (phone || STUDIO_PROFILE.phoneIntl).replace(/\D+/g, '');
  const e164Digits =
    rawDigits.startsWith('01') && rawDigits.length === 11
      ? `88${rawDigits}`
      : rawDigits || '8801855585601';
  const greeting = encodeURIComponent(
    `Hello ${studioName}! I would like to inquire about wedding photography & cinematography.`,
  );
  return `https://wa.me/${e164Digits}?text=${greeting}`;
}

export function FloatingWhatsAppButton({ branding }: FloatingWhatsAppButtonProps) {
  const resolved = resolvePublicBranding(branding);
  const phone = resolved.contactDetails?.phone || STUDIO_PROFILE.phoneIntl;
  const href = buildWhatsAppUrl(phone, resolved.displayName);

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with ${resolved.displayName} on WhatsApp`}
      title={`WhatsApp ${resolved.displayName}`}
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-30 group flex h-13 w-13 sm:h-14 sm:w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_12px_28px_-6px_rgba(37,211,102,0.55),0_2px_8px_rgba(0,0,0,0.18)] ring-2 ring-white/90 transition-all duration-200 hover:bg-[#1EBE5D] hover:scale-105 active:scale-95 focus:outline-none focus-visible:ring-4 focus-visible:ring-[#25D366]/45"
    >
      <span
        aria-hidden="true"
        className="pointer-events-none hidden sm:block absolute right-full mr-3 whitespace-nowrap rounded-full bg-[#181611] px-3.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-all duration-200 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
      >
        WhatsApp Us
      </span>
      <WhatsAppIcon className="w-7 h-7 sm:w-8 sm:h-8 block shrink-0" />
    </a>
  );
}
