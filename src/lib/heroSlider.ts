import {
  PortfolioItem,
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
} from '@/types/event-management';
import {
  buildCloudinaryImageUrl,
  buildCloudinarySrcSet,
  parseShowcaseMedia,
} from '@/lib/showcaseMedia';

export const STUDIO_GALLERY_SLUG = 'studio-media-gallery';
export const HERO_SLIDER_SLUG = 'studio-hero-slider';
export const EDITORIAL_GRID_SLUG = 'studio-editorial-grid';

const SYSTEM_PORTFOLIO_EVENT_SLUGS = new Set([
  STUDIO_GALLERY_SLUG,
  HERO_SLIDER_SLUG,
  EDITORIAL_GRID_SLUG,
]);

export function isSystemPortfolioEventSlug(slug?: string | null): boolean {
  if (!slug) return false;
  return SYSTEM_PORTFOLIO_EVENT_SLUGS.has(slug.trim().toLowerCase());
}

export type HeroSlideSpeed = 3000 | 4500 | 6000 | 8000;
export type HeroColumnCount = 1 | 2 | 3;

export interface HeroSliderSettings {
  autoPlayMs: HeroSlideSpeed;
  showDots: boolean;
  showArrows: boolean;
  fallbackEnabled: boolean;
  mobileColumns: HeroColumnCount;
  tabletColumns: HeroColumnCount;
  desktopColumns: HeroColumnCount;
  hiddenMediaIds: string[];
}

export const DEFAULT_HERO_SLIDER_SETTINGS: HeroSliderSettings = {
  autoPlayMs: 4500,
  showDots: true,
  showArrows: true,
  fallbackEnabled: true,
  mobileColumns: 1,
  tabletColumns: 2,
  desktopColumns: 3,
  hiddenMediaIds: [],
};

const HERO_CONFIG_OPEN = '<!-- WPA_HERO_CONFIG:';
const HERO_CONFIG_CLOSE = ' -->';
const VALID_SPEEDS = new Set<number>([3000, 4500, 6000, 8000]);
const HERO_SRCSET_WIDTHS = [1920, 2560, 3840];
const WEB_NATIVE_IMAGE_FORMATS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif']);
const RAW_PASSTHROUGH_MAX_BYTES = 4_500_000;

function normalizeColumnCount(
  raw: unknown,
  fallback: HeroColumnCount,
): HeroColumnCount {
  if (raw === 1 || raw === 2 || raw === 3) return raw;
  return fallback;
}

function stripCloudinaryTransforms(url: string): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  return url.replace(/\/upload\/[^/]*f_auto,q_(?:auto|100)[^/]*\//, '/upload/');
}

function normalizeHeroSliderSettings(raw: unknown): HeroSliderSettings {
  if (!raw || typeof raw !== 'object') {
    return { ...DEFAULT_HERO_SLIDER_SETTINGS };
  }
  const obj = raw as Record<string, unknown>;
  const speedNum = typeof obj.autoPlayMs === 'number' ? obj.autoPlayMs : 4500;
  const autoPlayMs = (VALID_SPEEDS.has(speedNum) ? speedNum : 4500) as HeroSlideSpeed;
  const showDots = typeof obj.showDots === 'boolean' ? obj.showDots : true;
  const showArrows = typeof obj.showArrows === 'boolean' ? obj.showArrows : true;
  const fallbackEnabled =
    typeof obj.fallbackEnabled === 'boolean' ? obj.fallbackEnabled : true;
  const mobileColumns = normalizeColumnCount(obj.mobileColumns, 1);
  const tabletColumns = normalizeColumnCount(obj.tabletColumns, 2);
  const desktopColumns = normalizeColumnCount(obj.desktopColumns, 3);
  const hiddenMediaIds = Array.isArray(obj.hiddenMediaIds)
    ? obj.hiddenMediaIds.filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    : [];

  return {
    autoPlayMs,
    showDots,
    showArrows,
    fallbackEnabled,
    mobileColumns,
    tabletColumns,
    desktopColumns,
    hiddenMediaIds,
  };
}

export function parseHeroSliderSettings(description?: string | null): HeroSliderSettings {
  if (!description) return { ...DEFAULT_HERO_SLIDER_SETTINGS };
  const start = description.indexOf(HERO_CONFIG_OPEN);
  if (start === -1) return { ...DEFAULT_HERO_SLIDER_SETTINGS };
  const jsonStart = start + HERO_CONFIG_OPEN.length;
  const end = description.indexOf(HERO_CONFIG_CLOSE, jsonStart);
  if (end === -1) return { ...DEFAULT_HERO_SLIDER_SETTINGS };

  try {
    const parsed = JSON.parse(description.slice(jsonStart, end));
    return normalizeHeroSliderSettings(parsed);
  } catch {
    return { ...DEFAULT_HERO_SLIDER_SETTINGS };
  }
}

export function serializeHeroSliderDescription(settings: HeroSliderSettings): string {
  const normalized = normalizeHeroSliderSettings(settings);
  return `Managed Homepage Hero Slideshow\n${HERO_CONFIG_OPEN}${JSON.stringify(normalized)}${HERO_CONFIG_CLOSE}`;
}

export interface HeroSlide {
  id: string;
  imageUrl: string;
  srcSet?: string;
  ambientUrl: string;
  alt: string;
  width?: number | null;
  height?: number | null;
}

const MAX_FALLBACK_HERO_SLIDES = 7;

/**
 * Prioritizes 100% original photo quality:
 * - Native web formats (<= 4.5 MB) serve the raw master file untouched (`media.secureUrl`).
 * - Large raw exports (> 4.5 MB) or HEIC files deliver Cloudinary 4K `w_3840` at `q_100`.
 */
export function getHeroSlideImageUrl(media: PortfolioMediaItem): string {
  const cleanOriginal = stripCloudinaryTransforms(media.secureUrl);
  const fmt = (media.format || '').trim().toLowerCase();
  const isNativeWebFormat = WEB_NATIVE_IMAGE_FORMATS.has(fmt);
  const withinPassthroughSize =
    typeof media.bytes === 'number' && media.bytes > 0 && media.bytes <= RAW_PASSTHROUGH_MAX_BYTES;

  if (isNativeWebFormat && withinPassthroughSize) {
    return cleanOriginal;
  }

  return buildCloudinaryImageUrl(cleanOriginal, {
    width: 3840,
    crop: 'limit',
    quality: '100',
  });
}

export function getHeroSlideSrcSet(media: PortfolioMediaItem): string | undefined {
  const fmt = (media.format || '').trim().toLowerCase();
  const isNativeWebFormat = WEB_NATIVE_IMAGE_FORMATS.has(fmt);
  const withinPassthroughSize =
    typeof media.bytes === 'number' && media.bytes > 0 && media.bytes <= RAW_PASSTHROUGH_MAX_BYTES;

  if (isNativeWebFormat && withinPassthroughSize) {
    return undefined;
  }

  return buildCloudinarySrcSet(media.secureUrl, HERO_SRCSET_WIDTHS, '100');
}

export function getHeroSlideAmbientUrl(url: string): string {
  return buildCloudinaryImageUrl(stripCloudinaryTransforms(url), {
    width: 480,
    crop: 'limit',
    quality: 'auto',
  });
}

export function getHeroSlideThumbUrl(media: PortfolioMediaItem): string {
  return buildCloudinaryImageUrl(stripCloudinaryTransforms(media.secureUrl), {
    width: 640,
    crop: 'limit',
    quality: 'auto:good',
  });
}

export function classifyPhotoFraming(
  width?: number | null,
  height?: number | null,
): {
  isLandscape: boolean;
  isHighRes: boolean;
  badge: string;
  tone: 'emerald' | 'amber' | 'neutral';
} {
  if (!width || !height || width <= 0 || height <= 0) {
    return {
      isLandscape: true,
      isHighRes: true,
      badge: 'Ready',
      tone: 'neutral',
    };
  }

  const isLandscape = width > height;
  const isHighRes = width >= 1200;

  if (isLandscape && width >= 1920) {
    return {
      isLandscape: true,
      isHighRes: true,
      badge: 'Landscape • FHD/4K',
      tone: 'emerald',
    };
  }
  if (isLandscape && width >= 1200) {
    return {
      isLandscape: true,
      isHighRes: true,
      badge: 'Landscape • HD',
      tone: 'emerald',
    };
  }
  if (isLandscape) {
    return {
      isLandscape: true,
      isHighRes: false,
      badge: 'Landscape • <1200px',
      tone: 'amber',
    };
  }
  return {
    isLandscape: false,
    isHighRes,
    badge: 'Portrait / Square',
    tone: 'amber',
  };
}

export function resolveHeroSlides(params: {
  heroEvent?: PortfolioShowcaseEvent | null;
  brandingName: string;
  portfolioEvents: PortfolioShowcaseEvent[];
  galleryImages: PortfolioMediaItem[];
  legacyPortfolio: PortfolioItem[];
}): {
  slides: HeroSlide[];
  settings: HeroSliderSettings;
  usingFallback: boolean;
} {
  const { heroEvent, brandingName, portfolioEvents, galleryImages, legacyPortfolio } = params;
  const settings = parseHeroSliderSettings(heroEvent?.description);
  const hiddenSet = new Set(settings.hiddenMediaIds);

  // 1. Prefer curated Hero photos managed in Dashboard -> Hero Slider when published
  if (heroEvent && heroEvent.status === 'PUBLISHED') {
    const orderedHeroPhotos = [...(heroEvent.media || [])]
      .filter(
        (m) =>
          m.resourceType === 'IMAGE' &&
          m.status === 'READY' &&
          Boolean(m.secureUrl) &&
          !hiddenSet.has(m.id),
      )
      .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));

    if (orderedHeroPhotos.length > 0) {
      return {
        slides: orderedHeroPhotos.map((img, index) => ({
          id: `hero-${img.id}`,
          imageUrl: getHeroSlideImageUrl(img),
          srcSet: getHeroSlideSrcSet(img),
          ambientUrl: getHeroSlideAmbientUrl(img.secureUrl),
          alt: img.altText || img.caption || `${brandingName} hero showcase ${index + 1}`,
          width: img.width,
          height: img.height,
        })),
        settings,
        usingFallback: false,
      };
    }
  }

  if (!settings.fallbackEnabled) {
    return {
      slides: [],
      settings,
      usingFallback: false,
    };
  }

  // 2. Fallback to featured client albums, gallery photos, and legacy portfolio (preferring landscape shots first)
  const collected: HeroSlide[] = [];
  const seenUrls = new Set<string>();

  const addSlide = (slide: HeroSlide) => {
    if (!slide.imageUrl || seenUrls.has(slide.imageUrl)) return;
    seenUrls.add(slide.imageUrl);
    collected.push(slide);
  };

  for (const ev of portfolioEvents) {
    if (isSystemPortfolioEventSlug(ev.slug)) continue;
    const readyImages = (ev.media || []).filter(
      (m) => m.resourceType === 'IMAGE' && m.status === 'READY' && Boolean(m.secureUrl),
    );
    const landscapeInAlbum = readyImages.find(
      (m) => m.width && m.height && m.width > m.height,
    );
    const cover =
      ev.coverMedia && ev.coverMedia.width && ev.coverMedia.height && ev.coverMedia.width > ev.coverMedia.height
        ? ev.coverMedia
        : landscapeInAlbum || ev.coverMedia || readyImages[0];
    if (!cover?.secureUrl) continue;

    addSlide({
      id: `ev-${ev.id}`,
      imageUrl: getHeroSlideImageUrl(cover),
      srcSet: getHeroSlideSrcSet(cover),
      ambientUrl: getHeroSlideAmbientUrl(cover.secureUrl),
      alt: ev.title || `${brandingName} wedding showcase`,
      width: cover.width,
      height: cover.height,
    });
    if (collected.length >= MAX_FALLBACK_HERO_SLIDES) {
      return { slides: collected, settings, usingFallback: true };
    }
  }

  // Prefer landscape gallery photos before portrait ones in fallback mode
  const sortedGallery = [...galleryImages].sort((a, b) => {
    const aLand = a.width && a.height && a.width > a.height ? 1 : 0;
    const bLand = b.width && b.height && b.width > b.height ? 1 : 0;
    return bLand - aLand;
  });

  for (const img of sortedGallery) {
    if (img.resourceType !== 'IMAGE' || img.status !== 'READY' || !img.secureUrl) continue;
    addSlide({
      id: `gal-${img.id}`,
      imageUrl: getHeroSlideImageUrl(img),
      srcSet: getHeroSlideSrcSet(img),
      ambientUrl: getHeroSlideAmbientUrl(img.secureUrl),
      alt: img.altText || img.caption || `${brandingName} photography`,
      width: img.width,
      height: img.height,
    });
    if (collected.length >= MAX_FALLBACK_HERO_SLIDES) {
      return { slides: collected, settings, usingFallback: true };
    }
  }

  for (const item of legacyPortfolio) {
    const parsed = parseShowcaseMedia(item.mediaUrl);
    if (parsed.kind !== 'photo' || !parsed.coverUrl) continue;
    addSlide({
      id: `leg-${item.id}`,
      imageUrl: buildCloudinaryImageUrl(parsed.coverUrl, {
        width: 3840,
        crop: 'limit',
        quality: '100',
      }),
      srcSet: buildCloudinarySrcSet(parsed.coverUrl, HERO_SRCSET_WIDTHS, '100'),
      ambientUrl: getHeroSlideAmbientUrl(parsed.coverUrl),
      alt: item.title || `${brandingName} portfolio`,
    });
    if (collected.length >= MAX_FALLBACK_HERO_SLIDES) {
      return { slides: collected, settings, usingFallback: true };
    }
  }

  return {
    slides: collected,
    settings,
    usingFallback: true,
  };
}

// ============================================================================
// EDITORIAL BENTO SHOWCASE (4-SLOT ASYMMETRIC MOSAIC BELOW INTRO)
// ============================================================================

export type EditorialGridSlotKey =
  | 'row1WideLeft'
  | 'row1SquareRight'
  | 'row2SquareLeft'
  | 'row2WideRight';

export interface EditorialGridSlotMeta {
  key: EditorialGridSlotKey;
  order: number;
  rowLabel: string;
  title: string;
  recommendedShape: 'wide' | 'square';
  orientationHint: string;
  aspectSummary: string;
}

export const EDITORIAL_GRID_SLOTS: EditorialGridSlotMeta[] = [
  {
    key: 'row1WideLeft',
    order: 1,
    rowLabel: 'Row 1 • Left',
    title: 'Wide Landscape Feature',
    recommendedShape: 'wide',
    orientationHint: 'Landscape 16:9 / 3:2 (1920px+ recommended)',
    aspectSummary: 'Top Wide Frame',
  },
  {
    key: 'row1SquareRight',
    order: 2,
    rowLabel: 'Row 1 • Right',
    title: 'Square Portrait Frame',
    recommendedShape: 'square',
    orientationHint: 'Portrait 4:5 or Square 1:1 (1200px+ recommended)',
    aspectSummary: 'Top Square Frame',
  },
  {
    key: 'row2SquareLeft',
    order: 3,
    rowLabel: 'Row 2 • Left',
    title: 'Square Portrait Frame',
    recommendedShape: 'square',
    orientationHint: 'Portrait 4:5 or Square 1:1 (1200px+ recommended)',
    aspectSummary: 'Bottom Square Frame',
  },
  {
    key: 'row2WideRight',
    order: 4,
    rowLabel: 'Row 2 • Right',
    title: 'Wide Landscape Feature',
    recommendedShape: 'wide',
    orientationHint: 'Landscape 16:9 / 3:2 (1920px+ recommended)',
    aspectSummary: 'Bottom Wide Frame',
  },
];

export interface EditorialGridSettings {
  enabled: boolean;
  slots: Partial<Record<EditorialGridSlotKey, string>>;
}

export const DEFAULT_EDITORIAL_GRID_SETTINGS: EditorialGridSettings = {
  enabled: true,
  slots: {},
};

const EDITORIAL_CONFIG_OPEN = '<!-- WPA_EDITORIAL_CONFIG:';
const EDITORIAL_CONFIG_CLOSE = ' -->';
const VALID_EDITORIAL_SLOT_KEYS = new Set<EditorialGridSlotKey>([
  'row1WideLeft',
  'row1SquareRight',
  'row2SquareLeft',
  'row2WideRight',
]);

function normalizeEditorialGridSettings(raw: unknown): EditorialGridSettings {
  if (!raw || typeof raw !== 'object') {
    return { enabled: true, slots: {} };
  }
  const obj = raw as Record<string, unknown>;
  const enabled = typeof obj.enabled === 'boolean' ? obj.enabled : true;
  const slots: Partial<Record<EditorialGridSlotKey, string>> = {};

  if (obj.slots && typeof obj.slots === 'object') {
    const rawSlots = obj.slots as Record<string, unknown>;
    for (const key of VALID_EDITORIAL_SLOT_KEYS) {
      const val = rawSlots[key];
      if (typeof val === 'string' && val.trim().length > 0) {
        slots[key] = val.trim();
      }
    }
  }

  return { enabled, slots };
}

export function parseEditorialGridSettings(description?: string | null): EditorialGridSettings {
  if (!description) return { enabled: true, slots: {} };
  const start = description.indexOf(EDITORIAL_CONFIG_OPEN);
  if (start === -1) return { enabled: true, slots: {} };
  const jsonStart = start + EDITORIAL_CONFIG_OPEN.length;
  const end = description.indexOf(EDITORIAL_CONFIG_CLOSE, jsonStart);
  if (end === -1) return { enabled: true, slots: {} };

  try {
    return normalizeEditorialGridSettings(JSON.parse(description.slice(jsonStart, end)));
  } catch {
    return { enabled: true, slots: {} };
  }
}

export function serializeEditorialGridDescription(settings: EditorialGridSettings): string {
  const normalized = normalizeEditorialGridSettings(settings);
  return `Managed Homepage Editorial Mosaic Grid\n${EDITORIAL_CONFIG_OPEN}${JSON.stringify(normalized)}${EDITORIAL_CONFIG_CLOSE}`;
}

export interface ResolvedEditorialSlot {
  meta: EditorialGridSlotMeta;
  slide: HeroSlide | null;
  mediaItem?: PortfolioMediaItem;
  isCustom: boolean;
}

export function resolveEditorialGridSlots(params: {
  editorialEvent?: PortfolioShowcaseEvent | null;
  brandingName: string;
  portfolioEvents: PortfolioShowcaseEvent[];
  galleryImages: PortfolioMediaItem[];
  legacyPortfolio: PortfolioItem[];
}): {
  enabled: boolean;
  slots: ResolvedEditorialSlot[];
  hasAnyImage: boolean;
  usingFallback: boolean;
} {
  const { editorialEvent, brandingName, portfolioEvents, galleryImages, legacyPortfolio } = params;
  const settings = parseEditorialGridSettings(editorialEvent?.description);

  if (!settings.enabled) {
    return {
      enabled: false,
      slots: EDITORIAL_GRID_SLOTS.map((meta) => ({ meta, slide: null, isCustom: false })),
      hasAnyImage: false,
      usingFallback: false,
    };
  }

  const readyMediaById = new Map<string, PortfolioMediaItem>();
  if (editorialEvent && editorialEvent.status === 'PUBLISHED') {
    for (const m of editorialEvent.media || []) {
      if (m.resourceType === 'IMAGE' && m.status === 'READY' && m.secureUrl) {
        readyMediaById.set(m.id, m);
      }
    }
  }

  // Collect fallback pool separating landscape vs portrait/square shots cleanly
  const landscapeFallbacks: Array<{ slide: HeroSlide; media?: PortfolioMediaItem }> = [];
  const portraitOrSquareFallbacks: Array<{ slide: HeroSlide; media?: PortfolioMediaItem }> = [];
  const seenUrls = new Set<string>();

  const pushFallbackMedia = (img: PortfolioMediaItem, fallbackLabel: string) => {
    if (img.resourceType !== 'IMAGE' || img.status !== 'READY' || !img.secureUrl) return;
    const url = getHeroSlideImageUrl(img);
    if (!url || seenUrls.has(url)) return;
    seenUrls.add(url);

    const entry = {
      slide: {
        id: `ed-fb-${img.id}`,
        imageUrl: url,
        srcSet: getHeroSlideSrcSet(img),
        ambientUrl: getHeroSlideAmbientUrl(img.secureUrl),
        alt: img.altText || img.caption || fallbackLabel,
        width: img.width,
        height: img.height,
      },
      media: img,
    };
    const isLandscape = img.width && img.height ? img.width > img.height : true;
    if (isLandscape) {
      landscapeFallbacks.push(entry);
    } else {
      portraitOrSquareFallbacks.push(entry);
    }
  };

  for (const img of galleryImages) {
    pushFallbackMedia(img, `${brandingName} photography`);
  }

  for (const ev of portfolioEvents) {
    if (isSystemPortfolioEventSlug(ev.slug)) continue;
    for (const img of ev.media || []) {
      pushFallbackMedia(img, ev.title || `${brandingName} album`);
    }
    if (ev.coverMedia) {
      pushFallbackMedia(ev.coverMedia, ev.title || `${brandingName} cover`);
    }
  }

  for (const item of legacyPortfolio) {
    const parsed = parseShowcaseMedia(item.mediaUrl);
    if (parsed.kind !== 'photo' || !parsed.coverUrl) continue;
    const url = buildCloudinaryImageUrl(parsed.coverUrl, {
      width: 3840,
      crop: 'limit',
      quality: '100',
    });
    if (!url || seenUrls.has(url)) continue;
    seenUrls.add(url);
    landscapeFallbacks.push({
      slide: {
        id: `ed-leg-${item.id}`,
        imageUrl: url,
        srcSet: buildCloudinarySrcSet(parsed.coverUrl, HERO_SRCSET_WIDTHS, '100'),
        ambientUrl: getHeroSlideAmbientUrl(parsed.coverUrl),
        alt: item.title || `${brandingName} portfolio`,
      },
    });
  }

  // Track custom URLs already chosen so fallback avoids repeating an assigned shot
  for (const key of VALID_EDITORIAL_SLOT_KEYS) {
    const mid = settings.slots[key];
    const media = mid ? readyMediaById.get(mid) : undefined;
    if (media) {
      seenUrls.add(getHeroSlideImageUrl(media));
    }
  }

  const usedFallbackIds = new Set<string>();
  const takeFallback = (shape: 'wide' | 'square'): { slide: HeroSlide; media?: PortfolioMediaItem } | null => {
    const preferredPool = shape === 'wide' ? landscapeFallbacks : portraitOrSquareFallbacks;
    const secondaryPool = shape === 'wide' ? portraitOrSquareFallbacks : landscapeFallbacks;

    for (const candidate of [...preferredPool, ...secondaryPool]) {
      if (!usedFallbackIds.has(candidate.slide.id)) {
        usedFallbackIds.add(candidate.slide.id);
        return candidate;
      }
    }
    return null;
  };

  let customCount = 0;
  let fallbackCount = 0;

  const resolvedSlots: ResolvedEditorialSlot[] = EDITORIAL_GRID_SLOTS.map((meta) => {
    const assignedId = settings.slots[meta.key];
    const customMedia = assignedId ? readyMediaById.get(assignedId) : undefined;

    if (customMedia) {
      customCount += 1;
      return {
        meta,
        slide: {
          id: `ed-${meta.key}-${customMedia.id}`,
          imageUrl: getHeroSlideImageUrl(customMedia),
          srcSet: getHeroSlideSrcSet(customMedia),
          ambientUrl: getHeroSlideAmbientUrl(customMedia.secureUrl),
          alt: customMedia.altText || customMedia.caption || `${brandingName} ${meta.aspectSummary}`,
          width: customMedia.width,
          height: customMedia.height,
        },
        mediaItem: customMedia,
        isCustom: true,
      };
    }

    const fb = takeFallback(meta.recommendedShape);
    if (fb) {
      fallbackCount += 1;
      return {
        meta,
        slide: fb.slide,
        mediaItem: fb.media,
        isCustom: false,
      };
    }

    return {
      meta,
      slide: null,
      isCustom: false,
    };
  });

  return {
    enabled: true,
    slots: resolvedSlots,
    hasAnyImage: resolvedSlots.some((s) => Boolean(s.slide)),
    usingFallback: customCount === 0 && fallbackCount > 0,
  };
}
