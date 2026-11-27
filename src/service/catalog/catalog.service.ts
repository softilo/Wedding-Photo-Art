'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { serverFetch } from '@/lib/serverFetch';
import {
  DEFAULT_EDITORIAL_GRID_SETTINGS,
  DEFAULT_HERO_SLIDER_SETTINGS,
  EDITORIAL_GRID_SLUG,
  HERO_SLIDER_SLUG,
  serializeEditorialGridDescription,
  serializeHeroSliderDescription,
} from '@/lib/heroSlider';
import {
  CloudinaryStatusSummary,
  DeliverableLabelTemplate,
  EventType,
  GalleryMediaListResponse,
  PaginatedResponse,
  PortfolioEventStatus,
  PortfolioItem,
  PortfolioMediaItem,
  PortfolioMediaType,
  PortfolioShowcaseEvent,
  ServiceItem,
  SignedCloudinaryUploadPayload,
  StudioPackage,
  TaskTemplate,
} from '@/types/event-management';
import { ActionResult, parseApiResponse } from '../shared/apiResult';

export async function getPublicEventTypes(): Promise<ActionResult<EventType[]>> {
  const res = await serverFetch.get('/public/event-types', {
    next: { revalidate: 60, tags: ['public-storefront'] },
  });
  return parseApiResponse<EventType[]>(res);
}

export async function getPublicPackages(): Promise<
  ActionResult<PaginatedResponse<StudioPackage>>
> {
  const res = await serverFetch.get('/public/packages', {
    next: { revalidate: 30, tags: ['public-storefront'] },
  });
  return parseApiResponse<PaginatedResponse<StudioPackage>>(res);
}

export async function getPublicPortfolio(): Promise<
  ActionResult<PaginatedResponse<PortfolioItem>>
> {
  const res = await serverFetch.get('/public/portfolio', {
    next: { revalidate: 30, tags: ['public-storefront'] },
  });
  return parseApiResponse<PaginatedResponse<PortfolioItem>>(res);
}

export async function listEventTypes(): Promise<ActionResult<EventType[]>> {
  const res = await serverFetch.get('/catalog/event-types');
  return parseApiResponse<EventType[]>(res);
}

export async function createEventType(payload: {
  name: string;
  slug?: string;
  description?: string;
}): Promise<ActionResult<EventType>> {
  const res = await serverFetch.post('/catalog/event-types', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<EventType>(res);
  if (result.ok) {
    updateTag('public-storefront');
    revalidatePath('/admin/catalog');
  }
  return result;
}

export async function listServiceItems(): Promise<ActionResult<ServiceItem[]>> {
  const res = await serverFetch.get('/catalog/services');
  return parseApiResponse<ServiceItem[]>(res);
}

export async function createServiceItem(payload: {
  name: string;
  unitLabel?: string;
  defaultUnitPricePoisha: number;
  description?: string;
}): Promise<ActionResult<ServiceItem>> {
  const res = await serverFetch.post('/catalog/services', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<ServiceItem>(res);
  if (result.ok) revalidatePath('/admin/catalog');
  return result;
}

export interface PackageItemWritePayload {
  serviceItemId?: string;
  description: string;
  quantity: number;
  unitPricePoisha: number;
}

export interface SavePackagePayload {
  eventTypeId?: string | null;
  name?: string;
  slug?: string;
  description?: string | null;
  basePricePoisha?: number;
  isPublished?: boolean;
  isActive?: boolean;
  coverImageUrl?: string | null;
  coverImageAssetId?: string | null;
  coverImagePublicId?: string | null;
  coverImageFormat?: string | null;
  coverImageBytes?: number | null;
  coverImageWidth?: number | null;
  coverImageHeight?: number | null;
  coverImageVersion?: number | null;
  coverImageResponseSignature?: string | null;
  items?: PackageItemWritePayload[];
}

export async function listPackages(): Promise<ActionResult<PaginatedResponse<StudioPackage>>> {
  const res = await serverFetch.get('/catalog/packages?limit=50');
  return parseApiResponse<PaginatedResponse<StudioPackage>>(res);
}

export async function getAdminPackage(packageId: string): Promise<ActionResult<StudioPackage>> {
  const res = await serverFetch.get(`/catalog/packages/${encodeURIComponent(packageId)}`);
  return parseApiResponse<StudioPackage>(res);
}

export async function signPackageCoverUpload(payload: {
  format: string;
  bytes: number;
}): Promise<ActionResult<SignedCloudinaryUploadPayload>> {
  const res = await serverFetch.post('/catalog/packages/sign-upload', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseApiResponse<SignedCloudinaryUploadPayload>(res);
}

export async function createPackage(
  payload: SavePackagePayload & { name: string; basePricePoisha: number },
): Promise<ActionResult<StudioPackage>> {
  const res = await serverFetch.post('/catalog/packages', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<StudioPackage>(res);
  if (result.ok) {
    updateTag('public-storefront');
    revalidatePath('/');
    revalidatePath('/admin/catalog');
  }
  return result;
}

export async function updatePackage(
  packageId: string,
  payload: SavePackagePayload,
): Promise<ActionResult<StudioPackage>> {
  const res = await serverFetch.patch(`/catalog/packages/${encodeURIComponent(packageId)}`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<StudioPackage>(res);
  if (result.ok) {
    updateTag('public-storefront');
    revalidatePath('/');
    revalidatePath('/admin/catalog');
    revalidatePath(`/admin/catalog/${packageId}`);
  }
  return result;
}

export async function createPortfolioItem(payload: {
  eventTypeId?: string;
  title: string;
  description?: string;
  mediaUrl: string;
  isApproved?: boolean;
  isPublished?: boolean;
}): Promise<ActionResult<PortfolioItem>> {
  const res = await serverFetch.post('/catalog/portfolio', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<PortfolioItem>(res);
  if (result.ok) {
    updateTag('public-storefront');
    revalidatePath('/admin/catalog');
  }
  return result;
}

export async function listDeliverableLabels(): Promise<
  ActionResult<DeliverableLabelTemplate[]>
> {
  const res = await serverFetch.get('/catalog/deliverable-labels');
  return parseApiResponse<DeliverableLabelTemplate[]>(res);
}

export async function createDeliverableLabel(payload: {
  eventTypeId?: string;
  label: string;
  defaultDueDays?: number;
}): Promise<ActionResult<DeliverableLabelTemplate>> {
  const res = await serverFetch.post('/catalog/deliverable-labels', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<DeliverableLabelTemplate>(res);
  if (result.ok) revalidatePath('/admin/catalog');
  return result;
}

export async function updateDeliverableLabel(
  id: string,
  payload: { label?: string; defaultDueDays?: number; isActive?: boolean },
): Promise<ActionResult<DeliverableLabelTemplate>> {
  const res = await serverFetch.patch(`/catalog/deliverable-labels/${encodeURIComponent(id)}`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<DeliverableLabelTemplate>(res);
  if (result.ok) revalidatePath('/admin/catalog');
  return result;
}

export async function listTaskTemplates(): Promise<ActionResult<TaskTemplate[]>> {
  const res = await serverFetch.get('/catalog/task-templates');
  return parseApiResponse<TaskTemplate[]>(res);
}

export async function createTaskTemplate(payload: {
  eventTypeId?: string;
  title: string;
  roleLabel: string;
  defaultOffsetDays?: number;
}): Promise<ActionResult<TaskTemplate>> {
  const res = await serverFetch.post('/catalog/task-templates', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<TaskTemplate>(res);
  if (result.ok) revalidatePath('/admin/catalog');
  return result;
}

export async function updateTaskTemplate(
  id: string,
  payload: { title?: string; roleLabel?: string; defaultOffsetDays?: number; isActive?: boolean },
): Promise<ActionResult<TaskTemplate>> {
  const res = await serverFetch.patch(`/catalog/task-templates/${encodeURIComponent(id)}`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<TaskTemplate>(res);
  if (result.ok) revalidatePath('/admin/catalog');
  return result;
}

function revalidatePortfolioPaths(slug?: string) {
  updateTag('public-storefront');
  revalidatePath('/', 'layout');
  revalidatePath('/about');
  revalidatePath('/portfolio');
  revalidatePath('/all-services');
  revalidatePath('/all-server');
  revalidatePath('/showcase');
  if (slug) {
    revalidatePath(`/album/${slug}`);
    revalidatePath(`/a/${slug}`);
    revalidatePath(`/portfolio/${slug}`);
  }
  revalidatePath('/admin/portfolio');
  revalidatePath('/admin/hero');
  revalidatePath('/admin/gallery');
  revalidatePath('/admin/catalog');
}

export async function getPublicPortfolioEvents(): Promise<
  ActionResult<PaginatedResponse<PortfolioShowcaseEvent>>
> {
  const res = await serverFetch.get('/public/portfolio/events?limit=50', {
    next: { revalidate: 30, tags: ['public-storefront'] },
  });
  return parseApiResponse<PaginatedResponse<PortfolioShowcaseEvent>>(res);
}

export async function getPublicGalleryMedia(
  resourceType?: PortfolioMediaType,
): Promise<ActionResult<GalleryMediaListResponse>> {
  const qs = resourceType ? `?resourceType=${encodeURIComponent(resourceType)}` : '';
  const res = await serverFetch.get(`/public/gallery${qs}`, {
    next: { revalidate: 30, tags: ['public-storefront'] },
  });
  return parseApiResponse<GalleryMediaListResponse>(res);
}

export async function getPublicPortfolioEventBySlug(
  slug: string,
): Promise<ActionResult<PortfolioShowcaseEvent>> {
  const res = await serverFetch.get(`/public/portfolio/events/${encodeURIComponent(slug)}`, {
    next: { revalidate: 30, tags: ['public-storefront'] },
  });
  return parseApiResponse<PortfolioShowcaseEvent>(res);
}

export async function listAdminPortfolioEvents(
  status?: PortfolioEventStatus,
): Promise<ActionResult<PaginatedResponse<PortfolioShowcaseEvent>>> {
  const qs = status ? `?status=${encodeURIComponent(status)}&limit=100` : '?limit=100';
  const res = await serverFetch.get(`/catalog/portfolio-events${qs}`);
  return parseApiResponse<PaginatedResponse<PortfolioShowcaseEvent>>(res);
}

export async function getAdminPortfolioEvent(
  eventId: string,
): Promise<ActionResult<PortfolioShowcaseEvent>> {
  const res = await serverFetch.get(`/catalog/portfolio-events/${encodeURIComponent(eventId)}`);
  return parseApiResponse<PortfolioShowcaseEvent>(res);
}

export async function createPortfolioEvent(payload: {
  title: string;
  slug?: string;
  eventDate?: string;
  description?: string;
  location?: string;
  eventTypeId?: string;
}): Promise<ActionResult<PortfolioShowcaseEvent>> {
  const res = await serverFetch.post('/catalog/portfolio-events', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<PortfolioShowcaseEvent>(res);
  if (result.ok) {
    revalidatePortfolioPaths(result.data?.slug);
  }
  return result;
}

export async function updatePortfolioEvent(
  eventId: string,
  payload: {
    title?: string;
    slug?: string;
    eventDate?: string;
    description?: string;
    location?: string;
    eventTypeId?: string;
    coverMediaId?: string;
    sortOrder?: number;
  },
): Promise<ActionResult<PortfolioShowcaseEvent>> {
  const res = await serverFetch.patch(`/catalog/portfolio-events/${encodeURIComponent(eventId)}`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<PortfolioShowcaseEvent>(res);
  if (result.ok) {
    revalidatePortfolioPaths(result.data?.slug);
  }
  return result;
}

export async function signPortfolioUpload(
  eventId: string,
  payload: {
    resourceType: 'IMAGE' | 'VIDEO';
    format: string;
    bytes: number;
  },
): Promise<ActionResult<SignedCloudinaryUploadPayload>> {
  const res = await serverFetch.post(
    `/catalog/portfolio-events/${encodeURIComponent(eventId)}/upload-signature`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  return parseApiResponse<SignedCloudinaryUploadPayload>(res);
}

export async function registerPortfolioMedia(
  eventId: string,
  payload: {
    assetId: string;
    publicId: string;
    resourceType: 'IMAGE' | 'VIDEO';
    format: string;
    secureUrl: string;
    bytes: number;
    width?: number;
    height?: number;
    durationSeconds?: number;
    caption?: string;
    altText?: string;
    status?: 'PROCESSING' | 'READY' | 'FAILED';
    errorMessage?: string;
    version?: number;
    responseSignature?: string;
  },
): Promise<ActionResult<{ media: PortfolioMediaItem; idempotentReplay: boolean }>> {
  const res = await serverFetch.post(
    `/catalog/portfolio-events/${encodeURIComponent(eventId)}/media`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const result = await parseApiResponse<{ media: PortfolioMediaItem; idempotentReplay: boolean }>(
    res,
  );
  if (result.ok) {
    revalidatePortfolioPaths();
  }
  return result;
}

export async function updatePortfolioMedia(
  eventId: string,
  mediaId: string,
  payload: {
    caption?: string;
    altText?: string;
    status?: 'PROCESSING' | 'READY' | 'FAILED';
    errorMessage?: string;
    isCover?: boolean;
  },
): Promise<ActionResult<PortfolioMediaItem>> {
  const res = await serverFetch.patch(
    `/catalog/portfolio-events/${encodeURIComponent(eventId)}/media/${encodeURIComponent(mediaId)}`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    },
  );
  const result = await parseApiResponse<PortfolioMediaItem>(res);
  if (result.ok) {
    revalidatePortfolioPaths();
  }
  return result;
}

export async function reorderPortfolioMedia(
  eventId: string,
  mediaIds: string[],
): Promise<ActionResult<PortfolioShowcaseEvent>> {
  const res = await serverFetch.put(
    `/catalog/portfolio-events/${encodeURIComponent(eventId)}/media/reorder`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mediaIds }),
    },
  );
  const result = await parseApiResponse<PortfolioShowcaseEvent>(res);
  if (result.ok) {
    revalidatePortfolioPaths(result.data?.slug);
  }
  return result;
}

export async function removePortfolioMedia(
  eventId: string,
  mediaId: string,
): Promise<ActionResult<{ deletedMediaId: string }>> {
  const res = await serverFetch.delete(
    `/catalog/portfolio-events/${encodeURIComponent(eventId)}/media/${encodeURIComponent(mediaId)}`,
  );
  const result = await parseApiResponse<{ deletedMediaId: string }>(res);
  if (result.ok) {
    revalidatePortfolioPaths();
  }
  return result;
}

export async function publishPortfolioEvent(
  eventId: string,
): Promise<ActionResult<PortfolioShowcaseEvent>> {
  const res = await serverFetch.post(
    `/catalog/portfolio-events/${encodeURIComponent(eventId)}/publish`,
  );
  const result = await parseApiResponse<PortfolioShowcaseEvent>(res);
  if (result.ok) {
    revalidatePortfolioPaths(result.data?.slug);
  }
  return result;
}

export async function unpublishPortfolioEvent(
  eventId: string,
): Promise<ActionResult<PortfolioShowcaseEvent>> {
  const res = await serverFetch.post(
    `/catalog/portfolio-events/${encodeURIComponent(eventId)}/unpublish`,
  );
  const result = await parseApiResponse<PortfolioShowcaseEvent>(res);
  if (result.ok) {
    revalidatePortfolioPaths(result.data?.slug);
  }
  return result;
}

export async function archivePortfolioEvent(
  eventId: string,
): Promise<ActionResult<PortfolioShowcaseEvent>> {
  const res = await serverFetch.post(
    `/catalog/portfolio-events/${encodeURIComponent(eventId)}/archive`,
  );
  const result = await parseApiResponse<PortfolioShowcaseEvent>(res);
  if (result.ok) {
    revalidatePortfolioPaths(result.data?.slug);
  }
  return result;
}

export async function getGalleryStatus(): Promise<ActionResult<CloudinaryStatusSummary>> {
  const res = await serverFetch.get('/catalog/gallery/status');
  return parseApiResponse<CloudinaryStatusSummary>(res);
}

export async function listGalleryMedia(
  resourceType?: PortfolioMediaType,
): Promise<ActionResult<GalleryMediaListResponse>> {
  const qs = resourceType ? `?resourceType=${encodeURIComponent(resourceType)}` : '';
  const res = await serverFetch.get(`/catalog/gallery${qs}`);
  return parseApiResponse<GalleryMediaListResponse>(res);
}

export async function signGalleryUpload(payload: {
  resourceType: PortfolioMediaType;
  format: string;
  bytes: number;
}): Promise<ActionResult<SignedCloudinaryUploadPayload>> {
  const res = await serverFetch.post('/catalog/gallery/sign-upload', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseApiResponse<SignedCloudinaryUploadPayload>(res);
}

export async function registerGalleryMedia(payload: {
  assetId: string;
  publicId: string;
  resourceType: PortfolioMediaType;
  format: string;
  secureUrl: string;
  bytes: number;
  width?: number;
  height?: number;
  durationSeconds?: number;
  version?: number;
  responseSignature?: string;
  caption?: string;
  altText?: string;
}): Promise<ActionResult<{ media: PortfolioMediaItem; idempotentReplay: boolean }>> {
  const res = await serverFetch.post('/catalog/gallery/register', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<{ media: PortfolioMediaItem; idempotentReplay: boolean }>(
    res,
  );
  if (result.ok) {
    revalidatePortfolioPaths();
  }
  return result;
}

export async function updateGalleryMedia(
  mediaId: string,
  payload: { caption?: string; altText?: string },
): Promise<ActionResult<PortfolioMediaItem>> {
  const res = await serverFetch.patch(`/catalog/gallery/${encodeURIComponent(mediaId)}`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<PortfolioMediaItem>(res);
  if (result.ok) {
    revalidatePortfolioPaths();
  }
  return result;
}

export async function deleteGalleryMedia(
  mediaId: string,
): Promise<ActionResult<{ deletedMediaId: string }>> {
  const res = await serverFetch.delete(`/catalog/gallery/${encodeURIComponent(mediaId)}`);
  const result = await parseApiResponse<{ deletedMediaId: string }>(res);
  if (result.ok) {
    revalidatePortfolioPaths();
  }
  return result;
}

export async function getPortfolioEventByBooking(
  bookingId: string,
): Promise<ActionResult<{ event: PortfolioShowcaseEvent | null }>> {
  const res = await serverFetch.get(
    `/catalog/portfolio-events/by-booking/${encodeURIComponent(bookingId)}`,
  );
  return parseApiResponse<{ event: PortfolioShowcaseEvent | null }>(res);
}

export async function createPortfolioEventFromBooking(
  bookingId: string,
): Promise<ActionResult<{ event: PortfolioShowcaseEvent; created: boolean }>> {
  const res = await serverFetch.post(
    `/catalog/portfolio-events/from-booking/${encodeURIComponent(bookingId)}`,
    {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    },
  );
  const result = await parseApiResponse<{ event: PortfolioShowcaseEvent; created: boolean }>(res);
  if (result.ok) {
    revalidatePortfolioPaths(result.data?.event?.slug);
    revalidatePath(`/admin/bookings/${bookingId}`);
    revalidatePath('/admin/bookings');
  }
  return result;
}

async function getAdminSystemPortfolioEvent(
  slug: string,
): Promise<ActionResult<PortfolioShowcaseEvent | null>> {
  const eventsRes = await listAdminPortfolioEvents();
  if (!eventsRes.ok || !eventsRes.data) {
    return { ok: false, message: eventsRes.message || 'Failed to load portfolio events' };
  }
  const match = eventsRes.data.data.find((ev) => ev.slug === slug);
  if (!match) {
    return { ok: true, data: null };
  }
  const detailRes = await getAdminPortfolioEvent(match.id);
  if (detailRes.ok && detailRes.data) {
    return { ok: true, data: detailRes.data };
  }
  return { ok: true, data: match };
}

async function ensureSystemPortfolioEvent(params: {
  slug: string;
  title: string;
  description: string;
  fallbackMessage: string;
}): Promise<ActionResult<PortfolioShowcaseEvent>> {
  const existing = await getAdminSystemPortfolioEvent(params.slug);
  if (existing.ok && existing.data) {
    return { ok: true, data: existing.data };
  }

  const created = await createPortfolioEvent({
    title: params.title,
    slug: params.slug,
    description: params.description,
  });
  if (created.ok && created.data) {
    revalidatePortfolioPaths(params.slug);
    return created;
  }

  // Recover cleanly if a concurrent upload already initialized the slug
  const retry = await getAdminSystemPortfolioEvent(params.slug);
  if (retry.ok && retry.data) {
    return { ok: true, data: retry.data };
  }
  return {
    ok: false,
    message: created.message || params.fallbackMessage,
  };
}

async function activateSystemPortfolioMedia(
  slug: string,
  eventId: string,
  leadMediaId: string,
  publishNow = true,
): Promise<ActionResult<PortfolioShowcaseEvent>> {
  const coverRes = await updatePortfolioMedia(eventId, leadMediaId, { isCover: true });
  if (!coverRes.ok) {
    return { ok: false, message: coverRes.message || 'Could not set section lead photo' };
  }

  if (publishNow) {
    const pubRes = await publishPortfolioEvent(eventId);
    if (!pubRes.ok || !pubRes.data) {
      return { ok: false, message: pubRes.message || 'Could not publish public section' };
    }
    revalidatePortfolioPaths(pubRes.data.slug);
    return pubRes;
  }

  revalidatePortfolioPaths(slug);
  return getAdminPortfolioEvent(eventId);
}

async function removeSystemPortfolioMedia(
  slug: string,
  eventId: string,
  mediaId: string,
): Promise<ActionResult<PortfolioShowcaseEvent | null>> {
  const detailRes = await getAdminPortfolioEvent(eventId);
  const currentEvent = detailRes.ok ? detailRes.data : null;

  if (currentEvent && currentEvent.status === 'PUBLISHED') {
    const remainingReady = (currentEvent.media || []).filter(
      (m) => m.id !== mediaId && m.resourceType === 'IMAGE' && m.status === 'READY',
    );
    if (remainingReady.length === 0) {
      await unpublishPortfolioEvent(eventId);
    } else if (currentEvent.coverMediaId === mediaId) {
      await updatePortfolioMedia(eventId, remainingReady[0].id, { isCover: true });
    }
  }

  const removeRes = await removePortfolioMedia(eventId, mediaId);
  if (!removeRes.ok) {
    return { ok: false, message: removeRes.message || 'Failed to remove photo' };
  }

  revalidatePortfolioPaths(slug);
  const refreshed = await getAdminPortfolioEvent(eventId);
  return { ok: true, data: refreshed.ok && refreshed.data ? refreshed.data : null };
}

export async function getAdminHeroSliderEvent(): Promise<
  ActionResult<PortfolioShowcaseEvent | null>
> {
  return getAdminSystemPortfolioEvent(HERO_SLIDER_SLUG);
}

export async function ensureHeroSliderEvent(): Promise<ActionResult<PortfolioShowcaseEvent>> {
  return ensureSystemPortfolioEvent({
    slug: HERO_SLIDER_SLUG,
    title: 'Homepage Hero Slideshow',
    description: serializeHeroSliderDescription(DEFAULT_HERO_SLIDER_SETTINGS),
    fallbackMessage: 'Could not initialize hero slideshow record',
  });
}

export async function activateHeroSliderMedia(
  eventId: string,
  leadMediaId: string,
  publishNow = true,
): Promise<ActionResult<PortfolioShowcaseEvent>> {
  return activateSystemPortfolioMedia(HERO_SLIDER_SLUG, eventId, leadMediaId, publishNow);
}

export async function removeHeroSliderMedia(
  eventId: string,
  mediaId: string,
): Promise<ActionResult<PortfolioShowcaseEvent | null>> {
  return removeSystemPortfolioMedia(HERO_SLIDER_SLUG, eventId, mediaId);
}

export async function getAdminEditorialGridEvent(): Promise<
  ActionResult<PortfolioShowcaseEvent | null>
> {
  return getAdminSystemPortfolioEvent(EDITORIAL_GRID_SLUG);
}

export async function ensureEditorialGridEvent(): Promise<ActionResult<PortfolioShowcaseEvent>> {
  return ensureSystemPortfolioEvent({
    slug: EDITORIAL_GRID_SLUG,
    title: 'Homepage Editorial Photo Mosaic',
    description: serializeEditorialGridDescription(DEFAULT_EDITORIAL_GRID_SETTINGS),
    fallbackMessage: 'Could not initialize editorial mosaic section record',
  });
}

export async function activateEditorialGridMedia(
  eventId: string,
  leadMediaId: string,
  publishNow = true,
): Promise<ActionResult<PortfolioShowcaseEvent>> {
  return activateSystemPortfolioMedia(EDITORIAL_GRID_SLUG, eventId, leadMediaId, publishNow);
}

export async function removeEditorialGridMedia(
  eventId: string,
  mediaId: string,
): Promise<ActionResult<PortfolioShowcaseEvent | null>> {
  return removeSystemPortfolioMedia(EDITORIAL_GRID_SLUG, eventId, mediaId);
}
