import type { Metadata } from 'next';
import {
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
  PublicBranding,
  StudioPackage,
} from '@/types/event-management';
import { isSystemPortfolioEventSlug } from '@/lib/heroSlider';
import { parseAlbumDescriptionAndTheme } from '@/lib/albumTheme';
import { STUDIO_PROFILE } from '@/lib/publicStorefront';

export const DEFAULT_SITE_URL = 'https://weddingphotoart.com';

export function getSiteUrl(): string {
  const candidate =
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    process.env.SITE_URL?.trim() ||
    DEFAULT_SITE_URL;
  return candidate.replace(/\/+$/, '');
}

export function toAbsoluteUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return getSiteUrl();
  if (/^https?:\/\//i.test(pathOrUrl)) return pathOrUrl;
  const normalizedPath = pathOrUrl.startsWith('/') ? pathOrUrl : `/${pathOrUrl}`;
  return `${getSiteUrl()}${normalizedPath}`;
}

export const STUDIO_SEO_KEYWORDS = [
  'Wedding PhotoArt',
  'wedding photography Bangladesh',
  'Wedding Photo Art',
  'wedding photography Feni',
  'wedding photographer in Feni Bangladesh',
  'wedding cinematography Feni',
  'Holud photography Feni',
  'bridal photography Bangladesh',
  'pre wedding photoshoot Feni',
  'reception photography Chattogram',
  'couple photoshoot Feni',
  'digital wedding album Bangladesh',
  'Grand Haque Tower Feni photography studio',
];

export function buildCloudinaryOgImageUrl(rawUrl?: string | null): string | undefined {
  if (!rawUrl || !rawUrl.startsWith('http')) return undefined;
  if (!rawUrl.includes('res.cloudinary.com') || !rawUrl.includes('/upload/')) {
    return rawUrl;
  }
  const cleanUrl = rawUrl.replace(/\/upload\/[^/]*(?:f_auto|w_\d+|c_\w+|q_[^/]+)[^/]*\//, '/upload/');
  return cleanUrl.replace(
    '/upload/',
    '/upload/c_fill,g_auto,w_1200,h_630,f_jpg,q_auto:good/',
  );
}

export function buildRootMetadata(): Metadata {
  const siteUrl = getSiteUrl();
  const defaultTitle =
    'Wedding PhotoArt — Wedding Photography & Cinematography | Feni, Bangladesh';
  const defaultDesc =
    'Wedding PhotoArt is a premier Wedding Photography & Cinematography studio based in Feni, Bangladesh. Capturing Weddings, Holud, Receptions, Engagement, Couple & Pre-Wedding stories across Feni, Chattogram, and Dhaka.';

  return {
    metadataBase: new URL(siteUrl),
    title: {
      default: defaultTitle,
      template: '%s | Wedding PhotoArt',
    },
    description: defaultDesc,
    applicationName: STUDIO_PROFILE.name,
    keywords: STUDIO_SEO_KEYWORDS,
    authors: [{ name: STUDIO_PROFILE.name, url: siteUrl }],
    creator: STUDIO_PROFILE.name,
    publisher: STUDIO_PROFILE.name,
    category: 'Photography & Cinematography',
    alternates: {
      canonical: '/',
    },
    openGraph: {
      type: 'website',
      locale: 'en_US',
      url: '/',
      siteName: STUDIO_PROFILE.name,
      title: defaultTitle,
      description: defaultDesc,
    },
    twitter: {
      card: 'summary_large_image',
      title: defaultTitle,
      description: defaultDesc,
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    icons: {
      icon: [
        { url: '/brand/wedding-photoart-logo.png', type: 'image/png' },
        { url: '/favicon.ico', sizes: 'any' },
      ],
      apple: '/brand/wedding-photoart-logo.png',
    },
  };
}

export function buildStudioJsonLdGraph(params: {
  branding: PublicBranding;
  packages: StudioPackage[];
  portfolioEvents: PortfolioShowcaseEvent[];
  galleryImages: PortfolioMediaItem[];
}): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const { branding, packages, portfolioEvents, galleryImages } = params;

  const displayName = branding.displayName || STUDIO_PROFILE.name;
  const phone = branding.contactDetails?.phone || STUDIO_PROFILE.phoneIntl;
  const email = branding.contactDetails?.email || STUDIO_PROFILE.email;
  const sameAsUrl = branding.contactDetails?.website || STUDIO_PROFILE.facebookUrl;

  const heroOrGalleryImages: string[] = [
    toAbsoluteUrl('/opengraph-image'),
    toAbsoluteUrl('/brand/wedding-photoart-logo.png'),
  ];

  for (const img of galleryImages.slice(0, 4)) {
    if (img.secureUrl && !heroOrGalleryImages.includes(img.secureUrl)) {
      heroOrGalleryImages.push(img.secureUrl);
    }
  }
  for (const ev of portfolioEvents) {
    if (isSystemPortfolioEventSlug(ev.slug)) continue;
    if (ev.coverMedia?.secureUrl && !heroOrGalleryImages.includes(ev.coverMedia.secureUrl)) {
      heroOrGalleryImages.push(ev.coverMedia.secureUrl);
    }
    if (heroOrGalleryImages.length >= 8) break;
  }

  const publishedPackages = packages.filter((p) => p.isPublished && p.isActive);
  const offers = publishedPackages.slice(0, 12).map((pkg) => ({
    '@type': 'Offer',
    name: pkg.name,
    description: pkg.description || `${pkg.name} by ${displayName}`,
    priceCurrency: branding.currency || 'BDT',
    price: Math.round((pkg.basePricePoisha || 0) / 100),
    availability: 'https://schema.org/InStock',
    url: `${siteUrl}/#packages`,
  }));

  const orgId = `${siteUrl}/#organization`;
  const websiteId = `${siteUrl}/#website`;

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'WebSite',
        '@id': websiteId,
        url: siteUrl,
        name: displayName,
        description: STUDIO_PROFILE.description,
        inLanguage: 'en',
        publisher: { '@id': orgId },
      },
      {
        '@type': ['LocalBusiness', 'ProfessionalService'],
        '@id': orgId,
        additionalType: 'https://schema.org/PhotographAction',
        name: displayName,
        alternateName: 'Wedding Photo Art Feni',
        description: STUDIO_PROFILE.description,
        url: siteUrl,
        telephone: phone,
        email,
        priceRange: 'BDT',
        logo: {
          '@type': 'ImageObject',
          url: toAbsoluteUrl('/brand/wedding-photoart-logo.png'),
        },
        image: heroOrGalleryImages,
        address: {
          '@type': 'PostalAddress',
          streetAddress: 'Grand Haque Tower (5th Floor), Shop No: 4068, Mizan Rd',
          addressLocality: 'Feni',
          addressRegion: 'Chattogram',
          postalCode: '3900',
          addressCountry: 'BD',
        },
        hasMap: STUDIO_PROFILE.mapsUrl,
        areaServed: [
          { '@type': 'City', name: 'Feni' },
          { '@type': 'City', name: 'Chattogram' },
          { '@type': 'City', name: 'Dhaka' },
          { '@type': 'Country', name: 'Bangladesh' },
        ],
        sameAs: sameAsUrl ? [sameAsUrl] : undefined,
        ...(offers.length > 0
          ? {
              hasOfferCatalog: {
                '@type': 'OfferCatalog',
                name: 'Wedding Photography & Cinematography Packages',
                itemListElement: offers,
              },
            }
          : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: siteUrl,
          },
        ],
      },
    ],
  };
}

export function buildPortfolioDirectoryJsonLd(params: {
  branding: PublicBranding;
  events: PortfolioShowcaseEvent[];
}): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const { branding, events } = params;
  const visibleEvents = events.filter(
    (ev) => !isSystemPortfolioEventSlug(ev.slug) && ev.status === 'PUBLISHED',
  );

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'CollectionPage',
        '@id': `${siteUrl}/portfolio#webpage`,
        url: `${siteUrl}/portfolio`,
        name: `Client Wedding Albums & Cinema Portfolios | ${branding.displayName}`,
        description: `Explore curated Wedding, Holud, Reception, Engagement, Couple & Pre-Wedding digital galleries captured by ${branding.displayName} in Feni and across Bangladesh.`,
        isPartOf: { '@id': `${siteUrl}/#website` },
        about: { '@id': `${siteUrl}/#organization` },
      },
      {
        '@type': 'ItemList',
        itemListElement: visibleEvents.slice(0, 50).map((ev, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          url: `${siteUrl}/album/${ev.slug}`,
          name: ev.title,
          ...(ev.coverMedia?.secureUrl ? { image: ev.coverMedia.secureUrl } : {}),
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: siteUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Client Albums',
            item: `${siteUrl}/portfolio`,
          },
        ],
      },
    ],
  };
}

export function buildAlbumJsonLd(params: {
  branding: PublicBranding;
  event: PortfolioShowcaseEvent;
}): Record<string, unknown> {
  const siteUrl = getSiteUrl();
  const { branding, event } = params;
  const { cleanDescription } = parseAlbumDescriptionAndTheme(event.description);
  const albumUrl = `${siteUrl}/album/${event.slug}`;
  const readyImages = (event.media || [])
    .filter((m) => m.resourceType === 'IMAGE' && m.status === 'READY' && m.secureUrl)
    .slice(0, 12)
    .map((m) => m.secureUrl);

  if (event.coverMedia?.secureUrl && !readyImages.includes(event.coverMedia.secureUrl)) {
    readyImages.unshift(event.coverMedia.secureUrl);
  }

  return {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'ImageGallery',
        '@id': `${albumUrl}#gallery`,
        url: albumUrl,
        name: event.title,
        description:
          cleanDescription ||
          `${event.title} digital photography & highlight film gallery captured by ${branding.displayName}.`,
        ...(event.eventDate || event.publishedAt
          ? { datePublished: event.eventDate || event.publishedAt }
          : {}),
        ...(event.updatedAt ? { dateModified: event.updatedAt } : {}),
        ...(event.location
          ? {
            contentLocation: {
              '@type': 'Place',
              name: event.location,
            },
          }
          : {}),
        creator: {
          '@type': 'ProfessionalService',
          '@id': `${siteUrl}/#organization`,
          name: branding.displayName,
        },
        ...(readyImages.length > 0 ? { image: readyImages } : {}),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          {
            '@type': 'ListItem',
            position: 1,
            name: 'Home',
            item: siteUrl,
          },
          {
            '@type': 'ListItem',
            position: 2,
            name: 'Client Albums',
            item: `${siteUrl}/portfolio`,
          },
          {
            '@type': 'ListItem',
            position: 3,
            name: event.title,
            item: albumUrl,
          },
        ],
      },
    ],
  };
}
