'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { serverFetch } from '@/lib/serverFetch';
import {
  AdminReviewsListResponse,
  ClientReview,
  CloudinaryStatusSummary,
  SignedCloudinaryUploadPayload,
} from '@/types/event-management';
import { ActionResult, parseApiResponse } from '../shared/apiResult';

function revalidateReviewPaths(): void {
  updateTag('public-storefront');
  revalidatePath('/');
  revalidatePath('/admin/reviews');
}

export async function getPublicReviews(): Promise<ActionResult<ClientReview[]>> {
  const res = await serverFetch.get('/public/reviews', {
    next: { revalidate: 30, tags: ['public-storefront'] },
  });
  return parseApiResponse<ClientReview[]>(res);
}

export async function getReviewUploadStatus(): Promise<
  ActionResult<CloudinaryStatusSummary>
> {
  const res = await serverFetch.get('/reviews/upload-status');
  return parseApiResponse<CloudinaryStatusSummary>(res);
}

export async function signReviewUpload(payload: {
  format: string;
  bytes: number;
}): Promise<ActionResult<SignedCloudinaryUploadPayload>> {
  const res = await serverFetch.post('/reviews/sign-upload', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseApiResponse<SignedCloudinaryUploadPayload>(res);
}

export async function listAdminReviews(
  status?: 'all' | 'published' | 'draft',
): Promise<ActionResult<AdminReviewsListResponse>> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const res = await serverFetch.get(`/reviews${qs}`);
  return parseApiResponse<AdminReviewsListResponse>(res);
}

export async function createClientReview(payload: {
  clientName: string;
  quote: string;
  rating: number;
  eventTitle?: string;
  sourceLabel?: string;
  imageUrl: string;
  imageAssetId?: string;
  imagePublicId?: string;
  imageFormat?: string;
  imageBytes?: number;
  imageWidth?: number;
  imageHeight?: number;
  imageVersion?: number;
  imageResponseSignature?: string;
  isPublished?: boolean;
  sortOrder?: number;
}): Promise<ActionResult<ClientReview>> {
  const res = await serverFetch.post('/reviews', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<ClientReview>(res);
  if (result.ok) {
    revalidateReviewPaths();
  }
  return result;
}

export async function updateClientReview(
  reviewId: string,
  payload: {
    clientName?: string;
    quote?: string;
    rating?: number;
    eventTitle?: string;
    sourceLabel?: string;
    imageUrl?: string;
    imageAssetId?: string;
    imagePublicId?: string;
    imageFormat?: string;
    imageBytes?: number;
    imageWidth?: number;
    imageHeight?: number;
    imageVersion?: number;
    imageResponseSignature?: string;
    isPublished?: boolean;
    sortOrder?: number;
  },
): Promise<ActionResult<ClientReview>> {
  const res = await serverFetch.patch(`/reviews/${encodeURIComponent(reviewId)}`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<ClientReview>(res);
  if (result.ok) {
    revalidateReviewPaths();
  }
  return result;
}

export async function reorderClientReviews(
  reviewIds: string[],
): Promise<ActionResult<AdminReviewsListResponse>> {
  const res = await serverFetch.put('/reviews/reorder', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ reviewIds }),
  });
  const result = await parseApiResponse<AdminReviewsListResponse>(res);
  if (result.ok) {
    revalidateReviewPaths();
  }
  return result;
}

export async function deleteClientReview(
  reviewId: string,
): Promise<ActionResult<{ deletedReviewId: string }>> {
  const res = await serverFetch.delete(`/reviews/${encodeURIComponent(reviewId)}`);
  const result = await parseApiResponse<{ deletedReviewId: string }>(res);
  if (result.ok) {
    revalidateReviewPaths();
  }
  return result;
}
