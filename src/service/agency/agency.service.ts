'use server';

import { revalidatePath, updateTag } from 'next/cache';
import { serverFetch } from '@/lib/serverFetch';
import {
  PublicBranding,
  StudioMember,
  StudioSettings,
  UserRole,
} from '@/types/event-management';
import { ActionResult, parseApiResponse } from '../shared/apiResult';

export async function getPublicBranding(): Promise<ActionResult<PublicBranding>> {
  const res = await serverFetch.get('/public/branding', {
    next: { revalidate: 30, tags: ['public-storefront'] },
  });
  return parseApiResponse<PublicBranding>(res);
}

export async function getAgencySettings(): Promise<ActionResult<StudioSettings>> {
  const res = await serverFetch.get('/studio/settings');
  return parseApiResponse<StudioSettings>(res);
}

export async function updateAgencyBranding(payload: {
  name?: string;
  logoUrl?: string | null;
  themeTokens?: Record<string, string>;
  contactDetails?: Record<string, string>;
  timezone?: string;
  currency?: string;
  advancePolicyType?: 'NONE' | 'PERCENTAGE' | 'FIXED';
  advancePolicyValue?: number;
}): Promise<ActionResult<StudioSettings>> {
  const res = await serverFetch.patch('/studio/branding', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<StudioSettings>(res);
  if (result.ok) {
    updateTag('public-storefront');
    revalidatePath('/admin/catalog');
    revalidatePath('/admin');
    revalidatePath('/');
  }
  return result;
}

export async function listAgencyMembers(): Promise<ActionResult<StudioMember[]>> {
  const res = await serverFetch.get('/studio/members');
  return parseApiResponse<StudioMember[]>(res);
}

export async function addAgencyMember(payload: {
  email: string;
  name: string;
  password?: string;
  role: UserRole;
  isBookableCrew?: boolean;
  crewTitle?: string;
}): Promise<ActionResult<StudioMember>> {
  const res = await serverFetch.post('/studio/members', {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<StudioMember>(res);
  if (result.ok) {
    revalidatePath('/admin/team');
    revalidatePath('/admin/calendar');
    revalidatePath('/admin/catalog');
    revalidatePath('/staff');
  }
  return result;
}

export async function updateAgencyMember(
  memberId: string,
  payload: {
    name?: string;
    role?: UserRole;
    isActive?: boolean;
    isBookableCrew?: boolean;
    crewTitle?: string;
  },
): Promise<ActionResult<StudioMember>> {
  const res = await serverFetch.patch(`/studio/members/${encodeURIComponent(memberId)}`, {
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const result = await parseApiResponse<StudioMember>(res);
  if (result.ok) {
    revalidatePath('/admin/team');
    revalidatePath('/admin/calendar');
    revalidatePath('/admin/bookings');
    revalidatePath('/staff');
  }
  return result;
}
