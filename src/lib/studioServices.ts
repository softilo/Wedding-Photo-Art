import { PublicServicesResponse, StudioServiceRecord } from '@/types/event-management';
import { buildCloudinaryImageUrl, buildCloudinarySrcSet } from '@/lib/showcaseMedia';

export interface ResolvedStudioService {
  id: string;
  title: string;
  description: string;
  showOnHome: boolean;
  isActive: boolean;
  imageUrl: string | null;
  srcSet?: string;
  imageAlt: string;
  isCustomImage: boolean;
}

function resolveServiceRecord(
  record: StudioServiceRecord,
  brandingName: string,
): ResolvedStudioService {
  const rawUrl = record.imageUrl?.trim() || null;
  const resolvedUrl = rawUrl
    ? record.deliveryUrls?.coverUrl ||
      buildCloudinaryImageUrl(rawUrl, {
        width: 1400,
        crop: 'limit',
        quality: 'auto:good',
      })
    : null;

  return {
    id: record.id,
    title: record.title,
    description: record.description,
    showOnHome: record.showOnHome,
    isActive: record.isActive,
    imageUrl: resolvedUrl,
    srcSet: rawUrl ? buildCloudinarySrcSet(rawUrl, [800, 1400], 'auto:good') : undefined,
    imageAlt: `${record.title} — ${brandingName}`,
    isCustomImage: Boolean(resolvedUrl),
  };
}

/**
 * Resolves Services strictly from the database response (`/public/services`).
 * Keeps Service photography isolated from Client Portfolio & Studio Gallery pools.
 */
export function resolveStudioServicesFromDb(params: {
  servicesShowcase?: PublicServicesResponse | null;
  brandingName: string;
}): {
  enabled: boolean;
  homepageServices: ResolvedStudioService[];
  allActiveServices: ResolvedStudioService[];
} {
  const { servicesShowcase, brandingName } = params;
  if (!servicesShowcase || !servicesShowcase.enabled) {
    return {
      enabled: servicesShowcase ? servicesShowcase.enabled : false,
      homepageServices: [],
      allActiveServices: [],
    };
  }

  const allActiveServices = (servicesShowcase.items || [])
    .filter((item) => item.isActive)
    .map((item) => resolveServiceRecord(item, brandingName));

  const featuredOnHome = allActiveServices.filter((s) => s.showOnHome);
  const secondaryOnHome = allActiveServices.filter((s) => !s.showOnHome);

  return {
    enabled: true,
    homepageServices: [...featuredOnHome, ...secondaryOnHome],
    allActiveServices,
  };
}
