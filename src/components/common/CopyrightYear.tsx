'use client';

import { useSyncExternalStore } from 'react';

const subscribe = () => () => {};

/**
 * Renders the live calendar year strictly on the client after SSR prerendering
 * (`getServerSnapshot` returns a deterministic baseline for Next.js Cache Components).
 */
export function CopyrightYear() {
  const year = useSyncExternalStore(
    subscribe,
    () => new Date().getFullYear(),
    () => 2026,
  );
  return <>{year}</>;
}
