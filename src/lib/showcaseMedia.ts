export type ShowcaseMediaKind = 'photo' | 'video';

export interface ParsedShowcaseMedia {
  kind: ShowcaseMediaKind;
  coverUrl: string;
  /** For photo galleries: 1 or more image URLs */
  photos: string[];
  /** For video films: original video URL */
  videoUrl?: string;
  /** For YouTube / Vimeo embeds */
  embedUrl?: string;
  /** True when videoUrl is a direct video file (.mp4 / .webm) */
  isDirectVideo?: boolean;
}

const YOUTUBE_REGEX =
  /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
const VIMEO_REGEX = /vimeo\.com\/(?:video\/)?(\d+)/;
const DIRECT_VIDEO_REGEX = /\.(mp4|webm|mov|m4v)(\?.*)?$/i;

export function extractYouTubeId(url: string): string | null {
  const match = url.match(YOUTUBE_REGEX);
  return match?.[1] ?? null;
}

export function extractVimeoId(url: string): string | null {
  const match = url.match(VIMEO_REGEX);
  return match?.[1] ?? null;
}

export function isVideoUrl(url: string): boolean {
  return Boolean(extractYouTubeId(url) || extractVimeoId(url) || DIRECT_VIDEO_REGEX.test(url));
}

/**
 * Parses `PortfolioItem.mediaUrl` into either a photo gallery or a video film.
 * Supports:
 * - Single image URL: "https://.../photo.jpg"
 * - Multi-photo gallery (pipe or newline separated): "https://.../1.jpg|https://.../2.jpg"
 * - Video URL (YouTube, Vimeo, or MP4/WebM): "https://youtu.be/..."
 * - Video with custom cover: "cover=https://.../thumb.jpg|video=https://youtu.be/..."
 */
export function parseShowcaseMedia(rawMediaUrl: string): ParsedShowcaseMedia {
  const raw = (rawMediaUrl || '').trim();

  // Check explicit cover=...|video=... format
  if (raw.includes('video=')) {
    const parts = raw
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean);
    const coverPart = parts.find((p) => p.startsWith('cover='))?.slice(6).trim() || '';
    const videoPart = parts.find((p) => p.startsWith('video='))?.slice(6).trim() || '';
    if (videoPart) {
      return buildVideoMedia(videoPart, coverPart || undefined);
    }
  }

  // Single video URL
  if (!raw.includes('|') && !raw.includes('\n') && isVideoUrl(raw)) {
    return buildVideoMedia(raw);
  }

  // Photo or multi-photo gallery
  const photos = raw
    .split(/[|\n]+/)
    .map((u) => u.trim())
    .filter(Boolean);

  return {
    kind: 'photo',
    coverUrl: photos[0] || '',
    photos,
  };
}

function buildVideoMedia(videoUrl: string, customCover?: string): ParsedShowcaseMedia {
  const ytId = extractYouTubeId(videoUrl);
  if (ytId) {
    return {
      kind: 'video',
      coverUrl: customCover || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
      photos: [],
      videoUrl,
      embedUrl: `https://www.youtube.com/embed/${ytId}?autoplay=1&rel=0`,
    };
  }

  const vimeoId = extractVimeoId(videoUrl);
  if (vimeoId) {
    return {
      kind: 'video',
      coverUrl: customCover || '',
      photos: [],
      videoUrl,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
    };
  }

  return {
    kind: 'video',
    coverUrl: customCover || '',
    photos: [],
    videoUrl,
    isDirectVideo: true,
  };
}

/**
 * Injects Cloudinary automatic format, quality, and responsive width transformations.
 */
export function buildCloudinaryImageUrl(
  url: string,
  options: {
    width: number;
    height?: number;
    crop?: 'limit' | 'fill';
    quality?: 'auto' | 'auto:good' | 'auto:best' | '100';
  } = { width: 1200 },
): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  // Avoid double-transforming URLs that already contain f_auto,q_auto or q_100
  const cleanUrl = url.replace(/\/upload\/[^/]*f_auto,q_(?:auto|100)[^/]*\//, '/upload/');
  const cropMode = options.crop ?? 'limit';
  const qualityMode = options.quality ?? 'auto';
  const heightSegment = options.height ? `,h_${options.height}` : '';
  const gravitySegment = cropMode === 'fill' ? ',g_auto' : '';
  return cleanUrl.replace(
    '/upload/',
    `/upload/f_auto,q_${qualityMode},c_${cropMode}${gravitySegment},w_${options.width}${heightSegment}/`,
  );
}

export function buildCloudinarySrcSet(
  url: string,
  widths: number[] = [480, 800, 1200, 1600],
  quality: 'auto' | 'auto:good' | 'auto:best' | '100' = 'auto',
): string | undefined {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return undefined;
  }
  return widths
    .map((w) => `${buildCloudinaryImageUrl(url, { width: w, crop: 'limit', quality })} ${w}w`)
    .join(', ');
}

/**
 * Returns true when an image URL is safe to pass through Next.js Image Optimization
 * (local assets or hosts configured in next.config.ts remotePatterns).
 */
export function isNextOptimizableUrl(url?: string | null): boolean {
  if (!url) return false;
  if (url.startsWith('/')) return true;
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      (parsed.hostname === 'res.cloudinary.com' || parsed.hostname === 'img.youtube.com')
    );
  } catch {
    return false;
  }
}

/**
 * Generates a lightweight JPEG poster frame from a Cloudinary video URL without downloading the video.
 */
export function buildCloudinaryVideoPosterUrl(videoUrl: string, width = 960): string {
  if (!videoUrl || !videoUrl.includes('res.cloudinary.com') || !videoUrl.includes('/upload/')) {
    return '';
  }
  const cleanUrl = videoUrl.replace(/\/upload\/[^/]*f_auto,q_auto[^/]*\//, '/upload/');
  return cleanUrl
    .replace('/upload/', `/upload/so_auto,f_jpg,q_auto:best,c_limit,w_${width}/`)
    .replace(/\.[a-z0-9]+(\?.*)?$/i, '.jpg');
}

