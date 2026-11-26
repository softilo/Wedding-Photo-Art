'use client';

import { useEffect } from 'react';

function isStandalonePwaWindow(): boolean {
  if (typeof window === 'undefined') return false;
  const standaloneMedia =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone =
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
  return standaloneMedia || iosStandalone;
}

/**
 * Keeps the installed PWA scoped to the Studio Login / Dashboard experience.
 * If the PWA window ever opens a public storefront page (e.g. from `/` at launch
 * or an in-app route), immediately redirect into `/login` (which server proxy
 * forwards straight to `/admin` or `/staff` when already signed in).
 *
 * Explicit "Open Public Website" links pass `?external=1` with `target="_blank"`,
 * allowing the browser window to open the storefront and stripping the flag cleanly.
 */
export function PwaStandaloneGuard() {
  useEffect(() => {
    const url = new URL(window.location.href);
    const hasExternalFlag = url.searchParams.has('external');

    if (hasExternalFlag) {
      url.searchParams.delete('external');
      const cleaned = `${url.pathname}${url.search}${url.hash}` || '/';
      window.history.replaceState(window.history.state, '', cleaned);
      return;
    }

    if (isStandalonePwaWindow()) {
      window.location.replace('/login');
    }
  }, []);

  return null;
}
