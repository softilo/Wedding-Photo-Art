'use server';

import { connection } from 'next/server';
import { serverFetch } from '@/lib/serverFetch';
import { verifyAccessToken } from '@/lib/jwtHandler';
import { AuthUserSession } from '@/types/event-management';
import { getCookies } from './tokenHandler';

export async function getMe(): Promise<AuthUserSession | null> {
  await connection();
  const token = await getCookies('accessToken');
  if (!token) return null;

  const verifiedToken = verifyAccessToken(token);
  if (!verifiedToken) return null;

  const sessionStr = await getCookies('userSession');
  if (sessionStr) {
    try {
      const parsed = JSON.parse(sessionStr) as AuthUserSession;
      if (
        parsed?.id &&
        parsed?.role &&
        parsed?.studioName &&
        parsed.id === verifiedToken.sub &&
        parsed.role === verifiedToken.role
      ) {
        return parsed;
      }
    } catch {
      // ignore invalid cookie JSON
    }
  }

  try {
    const res = await serverFetch.get('/auth/me');
    if (!res.ok) return null;
    const data = (await res.json()) as {
      id: string;
      email: string;
      name: string;
      role: AuthUserSession['role'];
      isActive: boolean;
      studio?: { name: string; timezone: string; currency: string };
    };
    if (!data?.id || !data?.role) return null;

    return {
      id: data.id,
      email: data.email,
      name: data.name,
      role: data.role,
      studioName: data.studio?.name || 'Wedding PhotoArt',
      timezone: data.studio?.timezone || 'Asia/Dhaka',
      currency: data.studio?.currency || 'BDT',
    };
  } catch {
    return null;
  }
}
