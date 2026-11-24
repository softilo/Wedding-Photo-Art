import React from 'react';
import { PublicBranding } from '@/types/event-management';
import { resolvePublicBranding, STUDIO_PROFILE } from '@/lib/publicStorefront';
import { buildWhatsAppUrl } from './FloatingWhatsAppButton';
import { EditorialNavbarClient } from './EditorialNavbarClient';

interface NavbarProps {
  branding?: PublicBranding | null;
}

export function Navbar({ branding }: NavbarProps) {
  const resolved = resolvePublicBranding(branding);
  const displayName = resolved.displayName;
  const contact = resolved.contactDetails;
  const accent = resolved.themeTokens.accentColor || '#8B6A21';
  const secondary = resolved.themeTokens.secondaryColor || '#CAA650';

  const phoneRaw = contact?.phone || STUDIO_PROFILE.phoneIntl;
  const phoneDisplay = contact?.phone?.trim() || STUDIO_PROFILE.phoneDisplay;
  const phoneHref = `tel:${phoneRaw.replace(/\s+/g, '')}`;
  const address = contact?.address || STUDIO_PROFILE.address;
  const facebookUrl = contact?.website || STUDIO_PROFILE.facebookUrl;
  const whatsappHref = buildWhatsAppUrl(phoneRaw, displayName);
  const subtitleText = displayName.toLowerCase().includes('wedding photoart')
    ? 'Feni • Photo & Cinema'
    : 'Photography & Cinema';

  return (
    <EditorialNavbarClient
      displayName={displayName}
      subtitleText={subtitleText}
      logoUrl={resolved.logoUrl}
      accent={accent}
      secondary={secondary}
      phoneDisplay={phoneDisplay}
      phoneHref={phoneHref}
      address={address}
      mapsUrl={STUDIO_PROFILE.mapsUrl}
      facebookUrl={facebookUrl}
      whatsappHref={whatsappHref}
    />
  );
}
