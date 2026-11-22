import { getCookies } from '@/service/auth/tokenHandler';

export function parseCookieString(cookieStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieStr) return result;

  cookieStr.split(';').forEach((part, index) => {
    const [rawKey, ...rawVal] = part.trim().split('=');
    if (rawKey) {
      const key = rawKey.trim();
      const val = rawVal.join('=').trim();
      result[key] = val ? decodeURIComponent(val) : '';
      if (index === 0) {
        result.name = key;
        result.value = result[key];
      }
    }
  });
  return result;
}

const BackendURL =
  process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3000';

const buildRequestUrl = (endpoint: string): string | null => {
  if (!BackendURL) return null;
  try {
    const normalizedBase = BackendURL.endsWith('/') ? BackendURL : `${BackendURL}/`;
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
    return new URL(normalizedEndpoint, normalizedBase).toString();
  } catch {
    return null;
  }
};

type NextFetchRequestInit = RequestInit & {
  next?: {
    revalidate?: number | false;
    tags?: string[];
  };
};

const serverFetchHelper = async (
  endpoint: string,
  options: NextFetchRequestInit,
): Promise<Response> => {
  const { headers, cache, next, ...restOptions } = options;
  const requestUrl = buildRequestUrl(endpoint);

  if (!requestUrl) {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Backend URL is missing or invalid',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const requestHeaders = new Headers(headers);
  const isPublicEndpoint = endpoint.startsWith('/public/') || endpoint.startsWith('public/');

  if (!isPublicEndpoint) {
    try {
      const accessToken = await getCookies('accessToken');
      if (accessToken && !requestHeaders.has('Authorization')) {
        requestHeaders.set('Authorization', `Bearer ${accessToken}`);
      }
    } catch {
      // Public static/edge contexts without cookie access
    }
  }

  try {
    return await fetch(requestUrl, {
      headers: requestHeaders,
      ...(next ? { next } : { cache: cache ?? 'no-store' }),
      ...restOptions,
    } as RequestInit);
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        message: 'Failed to connect to backend service',
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } },
    );
  }
};

export const serverFetch = {
  get: async (endpoint: string, options: NextFetchRequestInit = {}): Promise<Response> =>
    serverFetchHelper(endpoint, { ...options, method: 'GET' }),
  post: async (endpoint: string, options: NextFetchRequestInit = {}): Promise<Response> =>
    serverFetchHelper(endpoint, { ...options, method: 'POST' }),
  put: async (endpoint: string, options: NextFetchRequestInit = {}): Promise<Response> =>
    serverFetchHelper(endpoint, { ...options, method: 'PUT' }),
  patch: async (endpoint: string, options: NextFetchRequestInit = {}): Promise<Response> =>
    serverFetchHelper(endpoint, { ...options, method: 'PATCH' }),
  delete: async (endpoint: string, options: NextFetchRequestInit = {}): Promise<Response> =>
    serverFetchHelper(endpoint, { ...options, method: 'DELETE' }),
};
