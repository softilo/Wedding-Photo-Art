import { getPublicBranding } from '@/service/agency/agency.service';
import {
  getPublicEventTypes,
  getPublicPackages,
  getPublicPortfolio,
  getPublicPortfolioEvents,
} from '@/service/catalog/catalog.service';
import {
  EventType,
  PortfolioItem,
  PortfolioShowcaseEvent,
  PublicBranding,
  StudioPackage,
} from '@/types/event-management';

export const STUDIO_BRAND_NAME = 'Wedding PhotoArt';

export const STUDIO_PROFILE = {
  name: 'Wedding PhotoArt',
  shortName: 'WPA',
  tagline: 'Capture The Moments',
  subtitle: 'Wedding Photography & Cinematography',
  headlineLead: 'Capture the moments',
  headlineAccent: 'crafted in timeless cinema & stills.',
  description:
    'Wedding PhotoArt is a professional Wedding Photography & Cinematography team based in Feni, Bangladesh. We specialize in Wedding, Holud, Reception, Engagement, Couple, and Pre-Wedding Photography.',
  productionTagline: 'Premium Outdoor & Indoor Wedding Photography & Cinematography',
  city: 'Feni, Bangladesh',
  address: 'Grand Haque Tower (5th Floor), Shop No: 4068, Mizan Rd, Feni, Bangladesh 3900',
  phoneDisplay: '01855-585601',
  phoneIntl: '+880 1855-585601',
  phoneHref: 'tel:+8801855585601',
  email: 'weddingphotoart868@gmail.com',
  emailHref: 'mailto:weddingphotoart868@gmail.com',
  facebookUrl: 'https://www.facebook.com/weddingphotoArt.01',
  messengerUrl: 'https://m.me/weddingphotoArt.01',
  mapsUrl:
    'https://www.bing.com/maps/default.aspx?v=2&pc=FACEBK&mid=8100&where1=Grand%20Haque%20Tower%20(5th%20Floor)%20Shop%20no%20%3A4068%2C%20Mizan%20Rd%2C%20Feni%2C%20Feni%2C%20Bangladesh%2C%203900',
  logoMarkUrl: '/brand/wedding-photoart-mark.png',
  logoCardUrl: '/brand/wedding-photoart-logo.png',
  followersCount: '2.7K+',
  priceTier: '££££',
  specialties: [
    {
      code: '01',
      title: 'Wedding',
      tag: 'Full-Day Documentary',
      summary:
        'Bridal editorial portraits, sacred rituals, and multi-camera ceremony cinema crafted with timeless warmth.',
    },
    {
      code: '02',
      title: 'Holud & Mehendi',
      tag: 'Color & Candid Joy',
      summary:
        'Vibrant marigold palettes, spontaneous laughter, stage performances, and energetic highlight reels.',
    },
    {
      code: '03',
      title: 'Reception',
      tag: 'Evening Cinema',
      summary:
        'Editorial couple portraiture, dramatic stage lighting coverage, and family legacy frames.',
    },
    {
      code: '04',
      title: 'Engagement',
      tag: 'Intimate Stories',
      summary:
        'Ring-exchange storytelling, candid guest moments, and refined indoor & venue portraits.',
    },
    {
      code: '05',
      title: 'Couple Portraits',
      tag: 'Outdoor & Indoor',
      summary:
        'Golden-hour outdoor sessions and curated studio lighting portraits tailored to your chemistry.',
    },
    {
      code: '06',
      title: 'Pre-Wedding',
      tag: 'Bespoke Visuals',
      summary:
        'Narrative location cinematography and styled photography across Feni and scenic destinations.',
    },
  ],
  reviews: [
    {
      quote: 'The video turned out really well!',
      author: 'Momo Banik',
      source: 'Facebook Review • Wedding PhotoArt',
    },
    {
      quote: 'Joss hoice — stunning color, framing, and highlight storytelling.',
      author: 'Momo Banik',
      source: 'Client Album Showcase • Feni',
    },
  ],
} as const;

export const STUDIO_DEFAULT_THEME = {
  primaryColor: '#181611',
  secondaryColor: '#CAA650',
  accentColor: '#8B6A21',
  backgroundColor: '#F9F8F5',
  textColor: '#181611',
  fontFamily: 'Inter, system-ui, sans-serif',
};

export const STUDIO_DEFAULT_CONTACT = {
  phone: STUDIO_PROFILE.phoneIntl,
  email: STUDIO_PROFILE.email,
  address: STUDIO_PROFILE.address,
  website: STUDIO_PROFILE.facebookUrl,
};

// Backwards-compatible aliases if any internal module references legacy export names
export const RONGILO_BRAND_NAME = STUDIO_BRAND_NAME;
export const RONGILO_DEFAULT_THEME = STUDIO_DEFAULT_THEME;

const LEGACY_PLACEHOLDER_NAMES = new Set([
  '',
  'softilo event management',
  'softilo events',
  'softilo studio',
  'rongilo event management',
  'rongilo',
  'event studio',
]);

const LEGACY_DEFAULT_ACCENTS = new Set(['#4F46E5', '#0F766E', '#B91C47']);

export const NEUTRAL_PREVIEW_BRANDING: PublicBranding = {
  displayName: STUDIO_BRAND_NAME,
  logoUrl: null,
  themeTokens: { ...STUDIO_DEFAULT_THEME },
  contactDetails: { ...STUDIO_DEFAULT_CONTACT },
  timezone: 'Asia/Dhaka',
  currency: 'BDT',
};

/**
 * Normalizes default/legacy studio branding into Wedding PhotoArt's warm ivory,
 * obsidian, metallic gold, and crimson atelier aesthetic while preserving real
 * custom contact details, uploaded logos, currencies, and explicit custom themes.
 */
export function resolvePublicBranding(raw?: PublicBranding | null): PublicBranding {
  if (!raw) {
    return NEUTRAL_PREVIEW_BRANDING;
  }

  const trimmedName = (raw.displayName || '').trim();
  const displayName = LEGACY_PLACEHOLDER_NAMES.has(trimmedName.toLowerCase())
    ? STUDIO_BRAND_NAME
    : trimmedName;

  const rawAccent = (raw.themeTokens?.accentColor || '').trim().toUpperCase();
  const usesLegacyDefaultTheme = !rawAccent || LEGACY_DEFAULT_ACCENTS.has(rawAccent);

  const mergedContact = {
    phone: raw.contactDetails?.phone?.trim() || STUDIO_DEFAULT_CONTACT.phone,
    email: raw.contactDetails?.email?.trim() || STUDIO_DEFAULT_CONTACT.email,
    address: raw.contactDetails?.address?.trim() || STUDIO_DEFAULT_CONTACT.address,
    website: raw.contactDetails?.website?.trim() || STUDIO_DEFAULT_CONTACT.website,
  };

  return {
    ...raw,
    displayName,
    contactDetails: mergedContact,
    themeTokens: usesLegacyDefaultTheme
      ? { ...STUDIO_DEFAULT_THEME }
      : {
          primaryColor: raw.themeTokens?.primaryColor || STUDIO_DEFAULT_THEME.primaryColor,
          secondaryColor: raw.themeTokens?.secondaryColor || STUDIO_DEFAULT_THEME.secondaryColor,
          accentColor: raw.themeTokens?.accentColor || STUDIO_DEFAULT_THEME.accentColor,
          backgroundColor:
            raw.themeTokens?.backgroundColor || STUDIO_DEFAULT_THEME.backgroundColor,
          textColor: raw.themeTokens?.textColor || STUDIO_DEFAULT_THEME.textColor,
          fontFamily: raw.themeTokens?.fontFamily || STUDIO_DEFAULT_THEME.fontFamily,
        },
  };
}

export async function loadPublicStorefront(): Promise<{
  branding: PublicBranding;
  eventTypes: EventType[];
  packages: StudioPackage[];
  portfolio: PortfolioItem[];
  portfolioEvents: PortfolioShowcaseEvent[];
  isBackendConnected: boolean;
}> {
  const [brandRes, etRes, pkgRes, portRes, portEventsRes] = await Promise.all([
    getPublicBranding(),
    getPublicEventTypes(),
    getPublicPackages(),
    getPublicPortfolio(),
    getPublicPortfolioEvents(),
  ]);

  if (!brandRes.ok || !brandRes.data) {
    return {
      branding: NEUTRAL_PREVIEW_BRANDING,
      eventTypes: [],
      packages: [],
      portfolio: [],
      portfolioEvents: [],
      isBackendConnected: false,
    };
  }

  return {
    branding: resolvePublicBranding(brandRes.data),
    eventTypes: etRes.ok && etRes.data ? etRes.data : [],
    packages: pkgRes.ok && pkgRes.data ? pkgRes.data.data : [],
    portfolio: portRes.ok && portRes.data ? portRes.data.data : [],
    portfolioEvents: portEventsRes.ok && portEventsRes.data ? portEventsRes.data.data : [],
    isBackendConnected: true,
  };
}
