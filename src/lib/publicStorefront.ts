import { getPublicBranding } from '@/service/agency/agency.service';
import {
  getPublicEventTypes,
  getPublicGalleryMedia,
  getPublicPackages,
  getPublicPortfolio,
  getPublicPortfolioEventBySlug,
  getPublicPortfolioEvents,
} from '@/service/catalog/catalog.service';
import { HERO_SLIDER_SLUG } from '@/lib/heroSlider';
import {
  EventType,
  PortfolioItem,
  PortfolioMediaItem,
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
  guarantees: [
    {
      title: 'Date-Locked Crew Guarantee',
      summary:
        'Once your deposit is verified, our photographers, cinematographers, and gear are locked exclusively for your event date—zero double-booking.',
    },
    {
      title: 'Clear Itemized BDT Quotes',
      summary:
        'Review every deliverable, crew count, and shoot day in a written quote before confirming—no surprise charges after your ceremony.',
    },
    {
      title: 'Custom Digital Albums & 4K Reels',
      summary:
        'Relive your memories in a shareable online Digital Album with lossless full-resolution photos and on-demand highlight cinema.',
    },
    {
      title: 'Physical Studio in Feni',
      summary:
        'Visit us face-to-face at Grand Haque Tower (5th Floor), Mizan Rd, Feni to review prints, discuss schedules, and meet the team.',
    },
  ],
  bookingSteps: [
    {
      step: '01',
      title: 'Check Date & Get Custom Quote',
      desc: 'Choose a collection or tell us your Wedding, Holud & Reception schedule to receive an itemized proposal.',
    },
    {
      step: '02',
      title: 'Confirm Advance & Lock Crew',
      desc: 'Verify your booking deposit to exclusively reserve your dedicated photography & cinematography team.',
    },
    {
      step: '03',
      title: 'Shoot Day & Digital Album Delivery',
      desc: 'Enjoy your celebration stress-free while we capture every ritual, then receive your digital album & highlight film.',
    },
  ],
  comboPresets: [
    {
      id: 'combo-3day',
      label: 'Holud + Wedding + Reception',
      title: 'Full 3-Day Wedding, Holud & Reception Coverage',
      notes:
        'Interested in a complete 3-day combo covering Holud, Wedding Ceremony, and Reception (photography + cinematography). Please share custom pricing and crew plan.',
    },
    {
      id: 'combo-2day',
      label: 'Wedding + Reception',
      title: '2-Day Wedding & Reception Photography + Cinema',
      notes:
        'Looking for 2-day coverage for Wedding and Reception including couple portraits, stage lighting, and highlight film.',
    },
    {
      id: 'combo-prewedding',
      label: 'Pre-Wedding + Couple Shoot',
      title: 'Pre-Wedding & Couple Editorial Session',
      notes:
        'Interested in an outdoor/indoor Pre-Wedding & Couple photography and teaser reel session in or around Feni.',
    },
  ],
  faqs: [
    {
      question: 'How far in advance should we reserve our Wedding or Holud date?',
      answer:
        'Peak wedding dates in Feni fill quickly. We recommend reaching out 3 to 8 weeks before your event so we can check crew availability and lock your preferred dates.',
    },
    {
      question: 'Do you shoot both indoor and outdoor, and travel outside Feni?',
      answer:
        'Yes. Our studio is based at Grand Haque Tower, Mizan Rd, Feni, and our team regularly covers indoor banquet halls, home ceremonies, and outdoor destination shoots across Feni, Chattogram, Dhaka, and nearby districts.',
    },
    {
      question: 'Can we customize packages for multi-day Holud, Wedding & Reception events?',
      answer:
        'Every collection is a transparent starting point. You can select any package—or choose a multi-day combo—and our coordinator will adjust hours, photographers, cinematographers, and albums in an itemized quote.',
    },
    {
      question: 'How do we receive our finished photos and wedding highlight films?',
      answer:
        'Every completed celebration can be delivered as a custom-themed Digital Album on our platform where you and your family can view full-resolution stills, stream highlight films, mark favorites, and download.',
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
  heroEvent: PortfolioShowcaseEvent | null;
  galleryImages: PortfolioMediaItem[];
  isBackendConnected: boolean;
}> {
  const [brandRes, etRes, pkgRes, portRes, portEventsRes, heroRes, galleryRes] = await Promise.all([
    getPublicBranding(),
    getPublicEventTypes(),
    getPublicPackages(),
    getPublicPortfolio(),
    getPublicPortfolioEvents(),
    getPublicPortfolioEventBySlug(HERO_SLIDER_SLUG),
    getPublicGalleryMedia('IMAGE'),
  ]);

  if (!brandRes.ok || !brandRes.data) {
    return {
      branding: NEUTRAL_PREVIEW_BRANDING,
      eventTypes: [],
      packages: [],
      portfolio: [],
      portfolioEvents: [],
      heroEvent: null,
      galleryImages: [],
      isBackendConnected: false,
    };
  }

  return {
    branding: resolvePublicBranding(brandRes.data),
    eventTypes: etRes.ok && Array.isArray(etRes.data) ? etRes.data : [],
    packages: pkgRes.ok && Array.isArray(pkgRes.data?.data) ? pkgRes.data.data : [],
    portfolio: portRes.ok && Array.isArray(portRes.data?.data) ? portRes.data.data : [],
    portfolioEvents:
      portEventsRes.ok && Array.isArray(portEventsRes.data?.data) ? portEventsRes.data.data : [],
    heroEvent: heroRes.ok && heroRes.data ? heroRes.data : null,
    galleryImages:
      galleryRes.ok && Array.isArray(galleryRes.data?.data)
        ? galleryRes.data.data
            .filter((m) => m.resourceType === 'IMAGE' && m.status === 'READY')
            .slice(0, 12)
        : [],
    isBackendConnected: true,
  };
}
