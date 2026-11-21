'use server';

import { serverFetch } from '@/lib/serverFetch';
import { getDefaultDashboard } from '@/lib/auth-utils';
import { AuthUserSession, UserRole } from '@/types/event-management';
import { getDefaultCookieOptions } from './cookieOptions';
import { setCookie } from './tokenHandler';

interface LoginApiResponse {
  accessToken: string;
  user: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    isActive: boolean;
  };
  studio: {
    name: string;
    timezone: string;
    currency: string;
  };
  message?: string;
}

export async function login(
  _prevState: unknown,
  formData: FormData,
): Promise<{
  success: boolean;
  message: string;
  redirectTo?: string;
}> {
  try {
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const callbackUrl = String(formData.get('callbackUrl') || '').trim();

    if (!email || !password) {
      return { success: false, message: 'Email and password are required.' };
    }

    const res = await serverFetch.post('/auth/login', {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const result = (await res.json()) as LoginApiResponse;
    if (!res.ok || !result.accessToken || !result.user) {
      return {
        success: false,
        message: result?.message || 'Invalid credentials or unable to sign in.',
      };
    }

    const session: AuthUserSession = {
      id: result.user.id,
      email: result.user.email,
      name: result.user.name,
      role: result.user.role,
      studioName: result.studio?.name || 'Wedding PhotoArt',
      timezone: result.studio?.timezone || 'Asia/Dhaka',
      currency: result.studio?.currency || 'BDT',
    };

    await setCookie('accessToken', result.accessToken, {
      ...getDefaultCookieOptions(),
      maxAge: 60 * 60 * 24,
    });
    await setCookie('userSession', JSON.stringify(session), {
      ...getDefaultCookieOptions(),
      maxAge: 60 * 60 * 24,
    });

    const isSafeCallback =
      callbackUrl.startsWith('/') &&
      !callbackUrl.startsWith('//') &&
      !callbackUrl.includes('\\') &&
      !callbackUrl.includes('://');
    const isPermittedCallback =
      isSafeCallback &&
      !(session.role === 'STAFF' && (callbackUrl === '/admin' || callbackUrl.startsWith('/admin/')));

    return {
      success: true,
      message: 'Signed in successfully.',
      redirectTo: isPermittedCallback ? callbackUrl : getDefaultDashboard(session.role),
    };
  } catch (err) {
    console.error('Login error:', err);
    return { success: false, message: 'Unable to reach the authentication server.' };
  }
}
