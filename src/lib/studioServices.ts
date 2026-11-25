import {
  PortfolioItem,
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
} from '@/types/event-management';
import {
  getHeroSlideImageUrl,
  getHeroSlideSrcSet,
  HERO_SLIDER_SLUG,
  EDITORIAL_GRID_SLUG,
} from '@/lib/heroSlider';
import {
  buildCloudinaryImageUrl,
  buildCloudinarySrcSet,
  parseShowcaseMedia,
} from '@/lib/showcaseMedia';

export const SERVICES_SHOWCASE_SLUG = 'studio-services-showcase';

const SERVICES_SYSTEM_SLUGS = new Set([
  'studio-media-gallery',
  HERO_SLIDER_SLUG,
  EDITORIAL_GRID_SLUG,
  SERVICES_SHOWCASE_SLUG,
]);

export interface StudioServiceItem {
  id: string;
  title: string;
  description: string;
  mediaId?: string;
  showOnHome: boolean;
  isActive: boolean;
}

export interface StudioServicesSettings {
  enabled: boolean;
  items: StudioServiceItem[];
}

export interface ResolvedStudioService {
  id: string;
  title: string;
  description: string;
  showOnHome: boolean;
  isActive: boolean;
  mediaId?: string;
  mediaItem?: PortfolioMediaItem;
  imageUrl: string | null;
  srcSet?: string;
  imageAlt: string;
  isCustomImage: boolean;
}

const SERVICES_CONFIG_OPEN = '<!-- WPA_SERVICES_CONFIG:';
const SERVICES_CONFIG_CLOSE = ' -->';

export function buildDefaultStudioServices(studioName = 'Wedding PhotoArt'): StudioServiceItem[] {
  return [
    {
      id: 'srv-wedding-photography',
      title: 'Wedding Photography',
      description: `Make your special day last a lifetime with ${studioName}'s signature wedding photography. Our dedicated team captures timeless emotions, sacred rituals, and luminous bridal portraits.`,
      showOnHome: true,
      isActive: true,
    },
    {
      id: 'srv-wedding-cinematography',
      title: 'Wedding Cinematography',
      description: `Elevate your wedding memories with cinematic multi-camera storytelling by ${studioName}. We weave heartfelt speeches, movement, and celebration into vivid highlight films.`,
      showOnHome: true,
      isActive: true,
    },
    {
      id: 'srv-birthday-photography',
      title: 'Birthday Photography',
      description: `Celebrate meaningful family milestones with ${studioName}'s vibrant birthday photography services crafted around joy, candid laughter, and unforgettable warmth.`,
      showOnHome: true,
      isActive: true,
    },
    {
      id: 'srv-holud-mehendi',
      title: 'Holud & Mehendi Coverage',
      description:
        'Vivid marigold color palettes, choreographed performances, and joyful family moments framed with crisp natural-light stills and energetic highlight reels.',
      showOnHome: false,
      isActive: true,
    },
    {
      id: 'srv-reception-photography',
      title: 'Reception Photography',
      description:
        'Editorial couple portraits, dramatic banquet lighting coverage, and multi-generation family legacy photographs tailored to evening venues.',
      showOnHome: false,
      isActive: true,
    },
    {
      id: 'srv-pre-wedding-shoot',
      title: 'Pre-Wedding & Couple Shoot',
      description:
        'Bespoke golden-hour outdoor sessions and curated architectural storytelling across scenic destinations for timeless save-the-date collections.',
      showOnHome: false,
      isActive: true,
    },
  ];
}

export const DEFAULT_STUDIO_SERVICES_SETTINGS: StudioServicesSettings = {
  enabled: true,
  items: buildDefaultStudioServices('Wedding PhotoArt'),
};

function sanitizeServiceItem(raw: unknown, idx: number): StudioServiceItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const title = typeof obj.title === 'string' ? obj.title.trim().slice(0, 90) : '';
  if (!title) return null;

  const idRaw = typeof obj.id === 'string' ? obj.id.trim() : '';
  const id = idRaw || `srv-${idx + 1}`;
  const description = typeof obj.description === 'string' ? obj.description.trim().slice(0, 420) : '';
  const mediaId =
    typeof obj.mediaId === 'string' && obj.mediaId.trim().length > 0
      ? obj.mediaId.trim()
      : undefined;
  const showOnHome = typeof obj.showOnHome === 'boolean' ? obj.showOnHome : true;
  const isActive = typeof obj.isActive === 'boolean' ? obj.isActive : true;

  return {
    id,
    title,
    description,
    mediaId,
    showOnHome,
    isActive,
  };
}

export function parseStudioServicesSettings(
  description?: string | null,
  studioName = 'Wedding PhotoArt',
): StudioServicesSettings {
  const defaults = {
    enabled: true,
    items: buildDefaultStudioServices(studioName),
  };

  if (!description) return defaults;
  const start = description.indexOf(SERVICES_CONFIG_OPEN);
  if (start === -1) return defaults;
  const jsonStart = start + SERVICES_CONFIG_OPEN.length;
  const end = description.indexOf(SERVICES_CONFIG_CLOSE, jsonStart);
  if (end === -1) return defaults;

  try {
    const parsed = JSON.parse(description.slice(jsonStart, end)) as Record<string, unknown>;
    const enabled = typeof parsed.enabled === 'boolean' ? parsed.enabled : true;
    const rawItems = Array.isArray(parsed.items) ? parsed.items : [];
    const items = rawItems
      .map((item, idx) => sanitizeServiceItem(item, idx))
      .filter((item): item is StudioServiceItem => item !== null);

    return {
      enabled,
      items: items.length > 0 ? items : defaults.items,
    };
  } catch {
    return defaults;
  }
}

export function serializeStudioServicesDescription(settings: StudioServicesSettings): string {
  const cleanItems: StudioServiceItem[] = settings.items
    .map((item, idx) => sanitizeServiceItem(item, idx))
    .filter((item): item is StudioServiceItem => item !== null);

  const normalized: StudioServicesSettings = {
    enabled: typeof settings.enabled === 'boolean' ? settings.enabled : true,
    items: cleanItems,
  };

  return `Managed Studio Services Showcase\n${SERVICES_CONFIG_OPEN}${JSON.stringify(normalized)}${SERVICES_CONFIG_CLOSE}`;
}

export function resolveStudioServices(params: {
  servicesEvent?: PortfolioShowcaseEvent | null;
  brandingName: string;
  portfolioEvents: PortfolioShowcaseEvent[];
  galleryImages: PortfolioMediaItem[];
  legacyPortfolio: PortfolioItem[];
}): {
  enabled: boolean;
  homepageServices: ResolvedStudioService[];
  allActiveServices: ResolvedStudioService[];
  hasCustomConfig: boolean;
} {
  const { servicesEvent, brandingName, portfolioEvents, galleryImages, legacyPortfolio } = params;
  const hasCustomConfig = Boolean(servicesEvent?.description?.includes(SERVICES_CONFIG_OPEN));
  const settings = parseStudioServicesSettings(servicesEvent?.description, brandingName);

  if (!settings.enabled) {
    return {
      enabled: false,
      homepageServices: [],
      allActiveServices: [],
      hasCustomConfig,
    };
  }

  const readyMediaById = new Map<string, PortfolioMediaItem>();
  if (servicesEvent && servicesEvent.status === 'PUBLISHED') {
    for (const m of servicesEvent.media || []) {
      if (m.resourceType === 'IMAGE' && m.status === 'READY' && m.secureUrl) {
        readyMediaById.set(m.id, m);
      }
    }
  }

  // Build ordered landscape-first fallback image pool from public albums & gallery
  const fallbackPool: Array<{
    imageUrl: string;
    srcSet?: string;
    mediaItem?: PortfolioMediaItem;
    isLandscape: boolean;
  }> = [];
  const seenUrls = new Set<string>();

  for (const item of settings.items) {
    const custom = item.mediaId ? readyMediaById.get(item.mediaId) : undefined;
    if (custom) {
      seenUrls.add(getHeroSlideImageUrl(custom));
    }
  }

  const pushFallback = (img: PortfolioMediaItem) => {
    if (img.resourceType !== 'IMAGE' || img.status !== 'READY' || !img.secureUrl) return;
    const url = getHeroSlideImageUrl(img);
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);
    const isLandscape = img.width && img.height ? img.width > img.height : true;
    fallbackPool.push({
      imageUrl: url,
      srcSet: getHeroSlideSrcSet(img),
      mediaItem: img,
      isLandscape,
    });
  };

  for (const ev of portfolioEvents) {
    if (SERVICES_SYSTEM_SLUGS.has((ev.slug || '').trim().toLowerCase())) continue;
    if (ev.coverMedia) pushFallback(ev.coverMedia);
    for (const m of ev.media || []) {
      pushFallback(m);
    }
  }

  for (const img of galleryImages) {
    pushFallback(img);
  }

  for (const item of legacyPortfolio) {
    const parsed = parseShowcaseMedia(item.mediaUrl);
    if (parsed.kind !== 'photo' || !parsed.coverUrl) continue;
    const url = buildCloudinaryImageUrl(parsed.coverUrl, {
      width: 1920,
      crop: 'limit',
      quality: '100',
    });
    if (!url || seenUrls.has(url)) continue;
    seenUrls.add(url);
    fallbackPool.push({
      imageUrl: url,
      srcSet: buildCloudinarySrcSet(parsed.coverUrl, [1200, 1920], '100'),
      isLandscape: true,
    });
  }

  const landscapePool = [
    ...fallbackPool.filter((f) => f.isLandscape),
    ...fallbackPool.filter((f) => !f.isLandscape),
  ];

  let fallbackCursor = 0;

  const activeItems = settings.items.filter((item) => item.isActive);
  const allActiveServices: ResolvedStudioService[] = activeItems.map((item) => {
    const customMedia = item.mediaId ? readyMediaById.get(item.mediaId) : undefined;
    if (customMedia) {
      return {
        ...item,
        mediaItem: customMedia,
        imageUrl: getHeroSlideImageUrl(customMedia),
        srcSet: getHeroSlideSrcSet(customMedia),
        imageAlt: customMedia.altText || customMedia.caption || `${item.title} — ${brandingName}`,
        isCustomImage: true,
      };
    }

    const fb =
      landscapePool.length > 0 ? landscapePool[fallbackCursor++ % landscapePool.length] : null;
    return {
      ...item,
      mediaItem: fb?.mediaItem,
      imageUrl: fb?.imageUrl ?? null,
      srcSet: fb?.srcSet,
      imageAlt: `${item.title} — ${brandingName}`,
      isCustomImage: false,
    };
  });

  const featuredOnHome = allActiveServices.filter((s) => s.showOnHome);
  const secondaryOnHome = allActiveServices.filter((s) => !s.showOnHome);
  const homepageServices = [...featuredOnHome, ...secondaryOnHome];

  return {
    enabled: true,
    homepageServices,
    allActiveServices,
    hasCustomConfig,
  };
}
