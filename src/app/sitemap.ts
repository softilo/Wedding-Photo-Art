import type { MetadataRoute } from 'next';
import { getPublicPortfolioEvents } from '@/service/catalog/catalog.service';
import { isSystemPortfolioEventSlug } from '@/lib/heroSlider';
import { getSiteUrl } from '@/lib/seo';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const eventsRes = await getPublicPortfolioEvents();
  const events =
    eventsRes.ok && eventsRes.data && Array.isArray(eventsRes.data.data)
      ? eventsRes.data.data
      : [];

  const publishedAlbums = events.filter(
    (ev) => !isSystemPortfolioEventSlug(ev.slug) && ev.status === 'PUBLISHED' && Boolean(ev.slug),
  );

  // Determine the freshest known event timestamp without calling uncached `new Date()`
  const latestTimestamp = publishedAlbums
    .map((ev) => ev.updatedAt || ev.publishedAt)
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
    .sort()
    .pop();

  const routes: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      ...(latestTimestamp ? { lastModified: latestTimestamp } : {}),
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${siteUrl}/portfolio`,
      ...(latestTimestamp ? { lastModified: latestTimestamp } : {}),
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${siteUrl}/about`,
      ...(latestTimestamp ? { lastModified: latestTimestamp } : {}),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${siteUrl}/contact`,
      ...(latestTimestamp ? { lastModified: latestTimestamp } : {}),
      changeFrequency: 'monthly',
      priority: 0.85,
    },
    {
      url: `${siteUrl}/all-services`,
      ...(latestTimestamp ? { lastModified: latestTimestamp } : {}),
      changeFrequency: 'weekly',
      priority: 0.85,
    },
    {
      url: `${siteUrl}/career`,
      ...(latestTimestamp ? { lastModified: latestTimestamp } : {}),
      changeFrequency: 'monthly',
      priority: 0.6,
    },
  ];

  for (const ev of publishedAlbums) {
    const albumImages: string[] = [];
    if (ev.coverMedia?.secureUrl) {
      albumImages.push(ev.coverMedia.secureUrl);
    }
    for (const m of ev.media || []) {
      if (
        m.resourceType === 'IMAGE' &&
        m.status === 'READY' &&
        m.secureUrl &&
        !albumImages.includes(m.secureUrl)
      ) {
        albumImages.push(m.secureUrl);
      }
      if (albumImages.length >= 6) break;
    }

    const albumUpdatedAt =
      typeof (ev.updatedAt || ev.publishedAt) === 'string'
        ? (ev.updatedAt || ev.publishedAt) || undefined
        : undefined;

    routes.push({
      url: `${siteUrl}/album/${encodeURIComponent(ev.slug)}`,
      ...(albumUpdatedAt ? { lastModified: albumUpdatedAt } : {}),
      changeFrequency: 'monthly',
      priority: 0.8,
      ...(albumImages.length > 0 ? { images: albumImages } : {}),
    });
  }

  return routes;
}
