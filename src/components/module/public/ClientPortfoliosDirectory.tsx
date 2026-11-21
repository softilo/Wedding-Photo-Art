'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { EventType, PortfolioShowcaseEvent, PublicBranding } from '@/types/event-management';
import { parseAlbumDescriptionAndTheme } from '@/lib/albumTheme';
import { isNextOptimizableUrl } from '@/lib/showcaseMedia';
import { ArrowRightIcon, CameraIcon, SearchIcon } from '@/components/shared/Icons';
import { cn } from '@/lib/utils';

interface ClientPortfoliosDirectoryProps {
  branding: PublicBranding;
  events: PortfolioShowcaseEvent[];
  eventTypes: EventType[];
}

export function ClientPortfoliosDirectory({
  branding,
  events,
  eventTypes,
}: ClientPortfoliosDirectoryProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedEventTypeId, setSelectedEventTypeId] = useState<string>('ALL');
  const [filmOnly, setFilmOnly] = useState(false);

  const clientAlbums = useMemo(
    () => events.filter((ev) => ev.slug !== 'studio-media-gallery'),
    [events],
  );

  const usedEventTypes = useMemo(() => {
    const ids = new Set(clientAlbums.map((ev) => ev.eventTypeId).filter(Boolean));
    return eventTypes.filter((et) => ids.has(et.id));
  }, [clientAlbums, eventTypes]);

  const filteredAlbums = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return clientAlbums.filter((ev) => {
      if (selectedEventTypeId !== 'ALL' && ev.eventTypeId !== selectedEventTypeId) {
        return false;
      }
      if (filmOnly && (ev.counts?.videos ?? 0) === 0) {
        return false;
      }
      if (q) {
        const cleanDesc = parseAlbumDescriptionAndTheme(ev.description).cleanDescription;
        const matches =
          ev.title.toLowerCase().includes(q) ||
          (ev.eventType?.name || '').toLowerCase().includes(q) ||
          cleanDesc.toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [clientAlbums, selectedEventTypeId, filmOnly, searchQuery]);

  const accent = branding.themeTokens.accentColor || '#8B6A21';
  const secondary = branding.themeTokens.secondaryColor || '#CAA650';

  return (
    <main className="flex-1 bg-[#F9F8F5] text-[#181611]">
      {/* Editorial Directory Header */}
      <section className="relative overflow-hidden border-b border-[#E5DFD0] bg-[#F9F8F5]">
        <div
          className="absolute inset-0 opacity-[0.12] pointer-events-none"
          style={{
            background: `radial-gradient(circle at 12% 20%, ${secondary}, transparent 45%), radial-gradient(circle at 90% 70%, #E7D1AA, transparent 45%)`,
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 space-y-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2.5 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#DFCEAA] bg-[#F8F3E6] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#6F5319]">
                <CameraIcon className="w-3.5 h-3.5" />
                <span>Client Digital Portfolios</span>
              </div>
              <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-[#181611]">
                Wedding &amp; Event Client Albums
              </h1>
              <p className="text-sm sm:text-base text-[#4A4438] leading-relaxed">
                Explore bespoke Wedding, Holud, Reception, Engagement, Couple &amp; Pre-Wedding
                digital galleries curated by{' '}
                <span className="font-semibold text-[#181611]">{branding.displayName}</span>.
              </p>
            </div>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 rounded-xl border border-[#D8CCB2] bg-white px-4 py-2 text-xs font-semibold text-[#3C362B] hover:bg-[#F3EFE6] transition-colors"
            >
              ← Back to Home
            </Link>
          </div>

          {/* Search & Category Filters */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
            <div className="flex items-center sm:flex-wrap gap-1.5 overflow-x-auto no-scrollbar pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedEventTypeId('ALL')}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer shrink-0',
                  selectedEventTypeId === 'ALL'
                    ? 'bg-[#181611] text-white'
                    : 'bg-white border border-[#DFCEAA] text-[#4A4438] hover:border-[#8B6A21]',
                )}
              >
                All Albums ({clientAlbums.length})
              </button>
              {usedEventTypes.map((et) => (
                <button
                  key={et.id}
                  type="button"
                  onClick={() => setSelectedEventTypeId(et.id)}
                  className={cn(
                    'rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer shrink-0',
                    selectedEventTypeId === et.id
                      ? 'bg-[#181611] text-white'
                      : 'bg-white border border-[#DFCEAA] text-[#4A4438] hover:border-[#8B6A21]',
                  )}
                >
                  {et.name}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setFilmOnly((v) => !v)}
                className={cn(
                  'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-colors cursor-pointer shrink-0',
                  filmOnly
                    ? 'border-[#8B6A21] bg-[#F8F3E6] text-[#8B6A21]'
                    : 'border-[#DFCEAA] bg-white text-[#4A4438] hover:bg-[#F8F3E6]',
                )}
              >
                ▶ With Cinematic Film
              </button>
            </div>

            <div className="relative w-full md:w-64">
              <SearchIcon className="w-3.5 h-3.5 text-[#8A7F69] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search client albums..."
                className="w-full rounded-xl border border-[#D8CCB2] bg-white pl-8 pr-3 py-2 text-xs text-[#181611] placeholder:text-[#8A7F69] outline-none focus:border-[#8B6A21]"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Albums Grid */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 space-y-10">
        {filteredAlbums.length === 0 ? (
          <div className="atelier-card p-12 text-center bg-white space-y-2">
            <p className="font-editorial text-2xl font-semibold text-[#181611]">
              No matching client albums found
            </p>
            <p className="text-xs text-[#6B6352]">
              Try clearing your search filter or check back soon for newly published albums.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {filteredAlbums.map((ev) => {
              const coverItem =
                ev.coverMedia ||
                (ev.media || []).find((m) => m.resourceType === 'IMAGE' && m.status === 'READY') ||
                null;
              const coverSrc = coverItem?.secureUrl || '';
              const photoCount = ev.counts?.photos ?? 0;
              const videoCount = ev.counts?.videos ?? 0;
              const { theme } = parseAlbumDescriptionAndTheme(ev.description);

              return (
                <Link
                  key={ev.id}
                  href={`/album/${ev.slug}`}
                  className="group atelier-card atelier-card-hover overflow-hidden flex flex-col justify-between bg-white"
                >
                  <div>
                    <div className="relative aspect-[4/3] w-full bg-[#EFECE3] overflow-hidden">
                      {coverSrc ? (
                        <Image
                          src={coverSrc}
                          alt={coverItem?.altText || ev.title}
                          fill
                          quality={92}
                          unoptimized={!isNextOptimizableUrl(coverSrc)}
                          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 384px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-[#181611] text-[#C7BFA9] text-xs font-medium">
                          Digital Album
                        </div>
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-[#14120E]/65 via-transparent to-transparent" />

                      <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#14120E]/80 backdrop-blur-xs px-3 py-1 text-[11px] font-semibold text-white">
                          {photoCount} Photos{videoCount > 0 ? ` • ${videoCount} Film` : ''}
                        </span>
                        <span
                          style={{ backgroundColor: theme.accent }}
                          title="Album custom accent theme"
                          className="h-3.5 w-3.5 rounded-full border-2 border-white shadow-sm"
                        />
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      {ev.eventType && (
                        <span className="inline-block rounded-full bg-[#F8F3E6] border border-[#DFCEAA] px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#6F5319]">
                          {ev.eventType.name}
                        </span>
                      )}
                      <h2 className="font-editorial text-2xl font-semibold text-[#181611] group-hover:text-[#8B6A21] transition-colors line-clamp-2 leading-snug">
                        {ev.title}
                      </h2>
                    </div>
                  </div>

                  <div className="px-5 py-3 border-t border-[#ECE6D8] bg-[#F8F3E6]/70 flex items-center justify-between text-xs font-semibold text-[#4A4438] group-hover:text-[#8B6A21]">
                    <span>Open Digital Album</span>
                    <ArrowRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Bottom Concierge CTA */}
        <div className="rounded-2xl border border-[#2E291F] bg-[#14120E] p-8 sm:p-10 text-center space-y-3 text-white">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E7D1AA]">
            {branding.displayName}
          </p>
          <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-white">
            Want a custom Digital Album for your celebration?
          </h2>
          <p className="text-sm text-[#C7BFA9] max-w-lg mx-auto leading-relaxed">
            Every completed celebration includes an optional bespoke, high-resolution Digital Photo
            &amp; Cinematic Film Album tailored to your event theme.
          </p>
          <div className="pt-2">
            <Link
              href="/#inquire"
              style={{ backgroundColor: accent }}
              className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
            >
              <span>Request a Date &amp; Quote</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
