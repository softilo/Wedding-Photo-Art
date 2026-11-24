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

const SYSTEM_PORTFOLIO_EVENT_SLUGS = new Set([
  STUDIO_GALLERY_SLUG,
  HERO_SLIDER_SLUG,
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
