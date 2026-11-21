'use client';

import { useEffect, useRef } from 'react';

let modalHistorySequence = 0;

/**
 * Integrates modal/lightbox overlays with browser history (`pushState` + `popstate`)
 * so pressing the mobile hardware Back button or browser Back closes only the active
 * photo/modal instead of navigating away from the website.
 *
 * Uses unique per-overlay tokens so nested overlays (e.g. album modal -> single photo)
 * unwind one layer per Back press, and skips `history.back()` cleanly if the user
 * already navigated forward via a link inside the modal.
 */
export function useModalHistoryBack(isOpen: boolean, onClose: () => void): void {
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen || typeof window === 'undefined') return undefined;

    const token = `wpa-modal-${++modalHistorySequence}`;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const currentState =
      window.history.state && typeof window.history.state === 'object'
        ? (window.history.state as Record<string, unknown>)
        : {};

    window.history.pushState(
      { ...currentState, __wpaModal: token },
      '',
      window.location.href,
    );

    let closedViaPopState = false;

    const handlePopState = () => {
      const state = window.history.state as { __wpaModal?: string } | null;
      if (state?.__wpaModal === token) return;
      closedViaPopState = true;
      onCloseRef.current();
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      document.body.style.overflow = prevOverflow;

      const latestState = window.history.state as { __wpaModal?: string } | null;
      if (!closedViaPopState && latestState?.__wpaModal === token) {
        window.history.back();
      }
    };
  }, [isOpen]);
}
