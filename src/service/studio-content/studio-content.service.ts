'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { serverFetch } from '@/lib/serverFetch';
import {
  AdminAboutTeamResponse,
  AdminServicesResponse,
  PublicAboutTeamResponse,
  PublicServicesResponse,
  SignedCloudinaryUploadPayload,
} from '@/types/event-management';
import { ActionResult, parseApiResponse } from '../shared/apiResult';

function revalidateStudioContentPaths(): void {
  updateTag('public-storefront');
  revalidatePath('/');
  revalidatePath('/all-services');
  revalidatePath('/about');
  revalidatePath('/admin/hero');
}

export async function getPublicServicesShowcase(): Promise<
  ActionResult<PublicServicesResponse>
> {
  const res = await serverFetch.get('/public/services', {
    next: { revalidate: 30, tags: ['public-storefront'] },
  });
  return parseApiResponse<PublicServicesResponse>(res);
}

export async function getAdminServicesShowcase(): Promise<
  ActionResult<AdminServicesResponse>
> {
  const res = await serverFetch.get('/studio-content/services');
  return parseApiResponse<AdminServicesResponse>(res);
}

export async function signServiceUpload(payload: {
  format: string;
  bytes: number;
}): Promise<ActionResult<SignedCloudinaryUploadPayload>> {
  const res = await serverFetch.post('/studio-content/services/sign-upload', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseApiResponse<SignedCloudinaryUploadPayload>(res);
}

export interface SaveServiceItemPayload {
  id?: string;
  title: string;
  description?: string;
  imageUrl?: string | null;
  imageAssetId?: string | null;
  imagePublicId?: string | null;
  imageFormat?: string | null;
  imageBytes?: number | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  imageVersion?: number | null;
  imageResponseSignature?: string | null;
  showOnHome?: boolean;
  isActive?: boolean;
}

export async function saveServicesShowcaseBulk(payload: {
  enabled: boolean;
  items: SaveServiceItemPayload[];
}): Promise<ActionResult<AdminServicesResponse>> {
  const res = await serverFetch.put('/studio-content/services', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<AdminServicesResponse>(res);
  if (result.ok) {
    revalidateStudioContentPaths();
  }
  return result;
}

export async function resetServicesDefaults(): Promise<
  ActionResult<AdminServicesResponse>
> {
  const res = await serverFetch.post('/studio-content/services/reset-defaults', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const result = await parseApiResponse<AdminServicesResponse>(res);
  if (result.ok) {
    revalidateStudioContentPaths();
  }
  return result;
}

export async function getPublicAboutTeamShowcase(): Promise<
  ActionResult<PublicAboutTeamResponse>
> {
  const res = await serverFetch.get('/public/about-team', {
    next: { revalidate: 30, tags: ['public-storefront'] },
  });
  return parseApiResponse<PublicAboutTeamResponse>(res);
}

export async function getAdminAboutTeamShowcase(): Promise<
  ActionResult<AdminAboutTeamResponse>
> {
  const res = await serverFetch.get('/studio-content/about-team');
  return parseApiResponse<AdminAboutTeamResponse>(res);
}

export async function signTeamUpload(payload: {
  format: string;
  bytes: number;
}): Promise<ActionResult<SignedCloudinaryUploadPayload>> {
  const res = await serverFetch.post('/studio-content/team/sign-upload', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return parseApiResponse<SignedCloudinaryUploadPayload>(res);
}

export interface SaveTeamMemberPayload {
  id?: string;
  name: string;
  subtitle?: string | null;
  role?: string;
  specialty?: string;
  bio?: string;
  quote?: string | null;
  phone?: string | null;
  instagram?: string | null;
  location?: string | null;
  isFeatured?: boolean;
  imageUrl?: string | null;
  imageAssetId?: string | null;
  imagePublicId?: string | null;
  imageFormat?: string | null;
  imageBytes?: number | null;
  imageWidth?: number | null;
  imageHeight?: number | null;
  imageVersion?: number | null;
  imageResponseSignature?: string | null;
  isActive?: boolean;
}

export async function saveAboutTeamBulk(payload: {
  profile: {
    storyEyebrow: string;
    storyTitle: string;
    storyLead: string;
    storyBody: string;
  };
  members: SaveTeamMemberPayload[];
}): Promise<ActionResult<AdminAboutTeamResponse>> {
  const res = await serverFetch.put('/studio-content/about-team', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<AdminAboutTeamResponse>(res);
  if (result.ok) {
    revalidateStudioContentPaths();
  }
  return result;
}

export async function resetAboutTeamDefaults(): Promise<
  ActionResult<AdminAboutTeamResponse>
> {
  const res = await serverFetch.post('/studio-content/about-team/reset-defaults', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  const result = await parseApiResponse<AdminAboutTeamResponse>(res);
  if (result.ok) {
    revalidateStudioContentPaths();
  }
  return result;
}
