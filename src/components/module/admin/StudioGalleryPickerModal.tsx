'use client';

import React from 'react';
import { PortfolioMediaItem } from '@/types/event-management';
import { classifyPhotoFraming, getHeroSlideThumbUrl } from '@/lib/heroSlider';
import { useModalHistoryBack } from '@/lib/useModalHistoryBack';
import { cn } from '@/lib/utils';
import { CheckCircleIcon, PlusIcon, SearchIcon } from '@/components/shared/Icons';

interface StudioGalleryPickerModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  actionLabel: string;
  activeLabel: string;
  galleryImages: PortfolioMediaItem[];
  activePublicIds: Set<string>;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  landscapeOnly: boolean;
  onLandscapeOnlyChange: (val: boolean) => void;
  isBusy: boolean;
  onPickImage: (img: PortfolioMediaItem) => void;
}

export function StudioGalleryPickerModal({
  open,
  onClose,
  title,
  subtitle,
  actionLabel,
  activeLabel,
  galleryImages,
  activePublicIds,
  searchQuery,
  onSearchChange,
  landscapeOnly,
  onLandscapeOnlyChange,
  isBusy,
  onPickImage,
}: StudioGalleryPickerModalProps) {
  useModalHistoryBack(open, onClose);

  if (!open) return null;

  const q = searchQuery.trim().toLowerCase();
  const filteredPool = galleryImages
    .filter((item) => {
      if (item.resourceType !== 'IMAGE' || item.status !== 'READY') return false;
      if (landscapeOnly && item.width && item.height && item.height >= item.width) {
        return false;
      }
      if (!q) return true;
      const label = (item.caption || item.altText || item.publicId || '').toLowerCase();
      return label.includes(q) || item.format.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const aLand = a.width && a.height && a.width > a.height ? 1 : 0;
      const bLand = b.width && b.height && b.width > b.height ? 1 : 0;
      return bLand - aLand;
    });

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 sm:backdrop-blur-sm p-0 sm:p-6"
      onClick={onClose}
    >
      <div
        className="admin-card w-full h-dvh sm:h-auto sm:max-w-4xl sm:max-h-[88vh] rounded-none sm:rounded-xl border-0 sm:border pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)] sm:pt-0 sm:pb-0 flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 sm:p-5 border-b border-[var(--admin-border)] flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="admin-section-title">{title}</h2>
            <p className="text-xs text-[var(--admin-muted)]">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 py-1.5 text-xs font-semibold text-[var(--admin-text)] hover:bg-[var(--admin-surface-hover)] cursor-pointer"
          >
            Close ✕
          </button>
        </div>

        <div className="p-3 sm:p-4 border-b border-[var(--admin-border-subtle)] flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3">
          <div className="relative w-full sm:flex-1 sm:min-w-[200px]">
            <SearchIcon className="w-4 h-4 text-[var(--admin-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Search studio gallery photos..."
              className="w-full h-9 sm:h-auto rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-input)] pl-9 pr-3 py-2 text-xs text-[var(--admin-text)] outline-none focus:border-[var(--admin-accent)]"
            />
          </div>

          <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
            <label className="inline-flex items-center gap-2 rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 py-2 text-xs font-semibold text-[var(--admin-text)] cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={landscapeOnly}
                onChange={(e) => onLandscapeOnlyChange(e.target.checked)}
                className="h-3.5 w-3.5 accent-[var(--admin-accent)] cursor-pointer"
              />
              <span>Landscape Only</span>
            </label>

            <span className="text-xs font-mono-code text-[var(--admin-muted)] shrink-0 tabular-nums">
              {filteredPool.length} photos
            </span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {filteredPool.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <p className="text-sm font-medium text-[var(--admin-text)]">
                No matching gallery photos found
              </p>
              <p className="text-xs text-[var(--admin-muted)]">
                {landscapeOnly
                  ? 'Uncheck "Landscape Only" to see vertical photos, or upload new photos directly.'
                  : 'Upload photos directly on this page or in Studio Craft → Gallery first.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {filteredPool.map((img) => {
                const alreadyAssigned = activePublicIds.has(img.publicId);
                const framing = classifyPhotoFraming(img.width, img.height);
                return (
                  <div
                    key={img.id}
                    className="rounded-xl border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] overflow-hidden flex flex-col justify-between"
                  >
                    <div className="relative aspect-[16/10] bg-[#14120E]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getHeroSlideThumbUrl(img)}
                        alt={img.caption || img.altText || 'Gallery photo'}
                        className="w-full h-full object-contain"
                        loading="lazy"
                      />
                      {img.width && img.height && (
                        <span className="absolute bottom-1.5 right-1.5 rounded-md bg-[#14120E]/80 px-1.5 py-0.5 font-mono-code text-[10px] font-semibold text-[#E7D1AA]">
                          {img.width}×{img.height}
                        </span>
                      )}
                    </div>
                    <div className="p-2.5 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[11px] font-medium text-[var(--admin-text)] truncate">
                          {img.caption || img.altText || 'Studio Photo'}
                        </p>
                        <span
                          className={cn(
                            'shrink-0 text-[10px] font-semibold',
                            framing.tone === 'emerald'
                              ? 'text-emerald-600 dark:text-emerald-300'
                              : framing.tone === 'amber'
                                ? 'text-amber-600 dark:text-amber-300'
                                : 'text-[var(--admin-muted)]',
                          )}
                        >
                          {framing.isLandscape ? 'Landscape' : 'Portrait'}
                        </span>
                      </div>
                      <button
                        type="button"
                        disabled={isBusy || alreadyAssigned}
                        onClick={() => onPickImage(img)}
                        className={cn(
                          'w-full inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-colors cursor-pointer',
                          alreadyAssigned
                            ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 cursor-default'
                            : 'bg-[var(--admin-accent)] text-[var(--admin-accent-fg)] hover:opacity-95',
                        )}
                      >
                        {alreadyAssigned ? (
                          <>
                            <CheckCircleIcon className="w-3.5 h-3.5" />
                            <span>{activeLabel}</span>
                          </>
                        ) : (
                          <>
                            <PlusIcon className="w-3.5 h-3.5" />
                            <span>{actionLabel}</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
