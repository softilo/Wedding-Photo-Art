'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  EventType,
  PortfolioItem,
  PortfolioShowcaseEvent,
  PublicBranding,
  StudioPackage,
} from '@/types/event-management';
import { parseAlbumDescriptionAndTheme } from '@/lib/albumTheme';
import { STUDIO_PROFILE } from '@/lib/publicStorefront';
import { isNextOptimizableUrl } from '@/lib/showcaseMedia';
import { BrandMark } from '@/components/common/BrandMark';
import { formatPoisha, cn } from '@/lib/utils';
import {
  ArrowRightIcon,
  CalendarIcon,
  CameraIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  FilmIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  SparklesIcon,
  StarIcon,
} from '@/components/shared/Icons';
import { InquiryForm } from './InquiryForm';
import { PublicPortfolioShowcase } from './PublicPortfolioShowcase';

interface PublicAgencyHomeProps {
  branding: PublicBranding;
  eventTypes: EventType[];
  packages: StudioPackage[];
  portfolio: PortfolioItem[];
  portfolioEvents?: PortfolioShowcaseEvent[];
  isBackendConnected: boolean;
  initialPackageId?: string;
}

export function PublicAgencyHome({
  branding,
  eventTypes,
  packages,
  portfolio,
  portfolioEvents = [],
  isBackendConnected,
  initialPackageId = '',
}: PublicAgencyHomeProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>(initialPackageId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');

  const primary = branding.themeTokens.primaryColor || '#181611';
  const secondary = branding.themeTokens.secondaryColor || '#CAA650';
  const accent = branding.themeTokens.accentColor || '#8B6A21';

  const contactPhone = branding.contactDetails?.phone || STUDIO_PROFILE.phoneIntl;
  const contactEmail = branding.contactDetails?.email || STUDIO_PROFILE.email;
  const contactAddress = branding.contactDetails?.address || STUDIO_PROFILE.address;
  const facebookUrl = branding.contactDetails?.website || STUDIO_PROFILE.facebookUrl;

  const allClientPortfolios = useMemo(() => {
    return [...portfolioEvents]
      .filter((ev) => ev.slug !== 'studio-media-gallery')
      .sort((a, b) => {
        const scoreA =
          (a.coverMedia ? 1000 : 0) +
          (a.counts?.videos ?? 0) * 15 +
          (a.counts?.photos ?? 0) * 2;
        const scoreB =
          (b.coverMedia ? 1000 : 0) +
          (b.counts?.videos ?? 0) * 15 +
          (b.counts?.photos ?? 0) * 2;
        if (scoreB !== scoreA) return scoreB - scoreA;
        return (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
      });
  }, [portfolioEvents]);

  const bestThreePortfolios = useMemo(
    () => allClientPortfolios.slice(0, 3),
    [allClientPortfolios],
  );

  const packageCategories = useMemo(() => {
    const ids = new Set(packages.map((p) => p.eventTypeId).filter(Boolean));
    return eventTypes.filter((et) => ids.has(et.id));
  }, [packages, eventTypes]);

  const filteredPackages = useMemo(() => {
    if (selectedCategoryId === 'ALL') return packages;
    return packages.filter((p) => p.eventTypeId === selectedCategoryId);
  }, [packages, selectedCategoryId]);

  const handleSelectPackage = (id: string) => {
    setSelectedPackageId(id);
    const el = document.getElementById('inquire');
    el?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSpecialtyClick = (specialtyTitle: string) => {
    const token = specialtyTitle.toLowerCase().split('&')[0].trim();
    const matchedCategory = packageCategories.find(
      (cat) =>
        cat.name.toLowerCase().includes(token) || cat.slug.toLowerCase().includes(token),
    );
    if (matchedCategory) {
      setSelectedCategoryId(matchedCategory.id);
    }
    const targetId = packages.length > 0 ? 'packages' : 'inquire';
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex-1 bg-[#F9F8F5] text-[#181611]">
      {!isBackendConnected && (
        <div className="bg-[#F8F3E6] border-b border-[#DFCEAA] px-4 py-2 text-center text-xs font-medium text-[#6F5319]">
          Preview Mode: Connect the backend server to load live {branding.displayName} packages,
          client albums, and submit inquiries.
        </div>
      )}

      {/* Editorial Asymmetric Hero */}
      <section className="relative overflow-hidden border-b border-[#E5DFD0] bg-[#F9F8F5]">
        <div
          className="absolute inset-0 opacity-[0.14] pointer-events-none"
          style={{
            background: `radial-gradient(circle at 10% 16%, ${secondary} 0%, transparent 45%), radial-gradient(circle at 88% 72%, #E7D1AA 0%, transparent 48%)`,
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-20">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#DFCEAA] bg-white/95 px-4 py-1.5 text-xs font-semibold text-[#4A4438] shadow-2xs">
                <SparklesIcon className="w-3.5 h-3.5" style={{ color: accent }} />
                <span>{branding.displayName}</span>
                <span className="text-[#C9B996]">•</span>
                <span className="text-[#7A5E21]">{STUDIO_PROFILE.city}</span>
                <span className="text-[#C9B996]">•</span>
                <span className="text-[#6B6352]">{STUDIO_PROFILE.followersCount} Followers</span>
              </div>

              <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[3.85rem] font-semibold text-[#181611] leading-[1.06]">
                {STUDIO_PROFILE.headlineLead}{' '}
                <span className="italic" style={{ color: accent }}>
                  {STUDIO_PROFILE.headlineAccent}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#4A4438] max-w-xl leading-relaxed">
                {STUDIO_PROFILE.description}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href="#inquire"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
                  style={{ backgroundColor: accent }}
                >
                  <span>Reserve Your Date</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </a>
                <a
                  href="#packages"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D8CCB2] bg-white px-5 py-3.5 text-sm font-semibold text-[#2E291F] hover:bg-[#F3EFE6] hover:border-[#CAA650] transition-colors"
                >
                  Explore Packages
                </a>
                <Link
                  href={bestThreePortfolios.length > 0 ? '/#featured-portfolios' : '/portfolio'}
                  className="inline-flex items-center gap-2 rounded-xl border border-transparent px-4 py-3.5 text-sm font-semibold text-[#6B6352] hover:text-[#181611] transition-colors"
                >
                  Client Albums →
                </Link>
              </div>

              {/* Architectural Feni Studio Credentials Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-[#E5DFD0] max-w-2xl">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5E21]">
                    Feni Studio
                  </p>
                  <p className="text-xs text-[#4A4438] mt-0.5 leading-snug">
                    Grand Haque Tower (5th Fl), Mizan Rd
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5E21]">
                    Direct Concierge
                  </p>
                  <a
                    href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                    className="text-xs font-mono-code font-semibold text-[#181611] hover:underline mt-0.5 inline-block"
                  >
                    {STUDIO_PROFILE.phoneDisplay}
                  </a>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5E21]">
                    Production Scope
                  </p>
                  <p className="text-xs text-[#4A4438] mt-0.5">
                    Outdoor • Indoor • Digital Albums
                  </p>
                </div>
              </div>
            </div>

            {/* Bespoke Alabaster & Gold Brand Crest + Journey Card */}
            <div className="lg:col-span-5">
              <div className="atelier-card overflow-hidden bg-white shadow-[0_24px_60px_-24px_rgba(24,22,17,0.14)] border-[#D8CCB2]">
                {/* Brand Emblem Crest Header */}
                <div className="relative bg-[#14120E] px-6 py-7 text-center text-[#F4EFE4] overflow-hidden border-b border-[#CAA650]/35">
                  <div
                    className="absolute inset-0 opacity-25 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 35%, ${secondary} 0%, transparent 65%)`,
                    }}
                  />
                  <div className="relative flex flex-col items-center gap-3">
                    <BrandMark
                      logoUrl={branding.logoUrl}
                      alt={branding.displayName}
                      size={104}
                      variant="dark"
                      className="rounded-2xl border-[#CAA650]/50 shadow-xl"
                    />
                    <div className="space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#E7D1AA]">
                        {STUDIO_PROFILE.tagline}
                      </p>
                      <p className="text-xs text-[#C7BFA9]">
                        {STUDIO_PROFILE.productionTagline}
                      </p>
                    </div>
                  </div>
                </div>

                {/* 3 Effortless Steps Body */}
                <div className="p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-[#ECE6D8] pb-3.5">
                    <div>
                      <p
                        className="text-[10.5px] font-bold uppercase tracking-[0.18em]"
                        style={{ color: accent }}
                      >
                        Booking Workflow
                      </p>
                      <p className="font-editorial text-2xl font-semibold text-[#181611] mt-0.5">
                        3 Effortless Steps to Book
                      </p>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F8F3E6] text-[#7A5E21] border border-[#DFCEAA]">
                      <CalendarIcon className="w-5 h-5" />
                    </span>
                  </div>

                  <ul className="space-y-3.5 text-sm text-[#3C362B]">
                    {[
                      {
                        step: '01',
                        title: 'Request Date & Custom Quote',
                        desc: 'Share your Wedding, Holud, or Pre-Wedding date and receive an itemized BDT proposal.',
                      },
                      {
                        step: '02',
                        title: 'Confirm Advance & Lock Crew',
                        desc: 'Verify your booking deposit to exclusively reserve our photography & cinema team.',
                      },
                      {
                        step: '03',
                        title: 'Relive Through Digital Albums',
                        desc: 'Receive high-resolution stills and cinematic highlight films in your bespoke online album.',
                      },
                    ].map((item) => (
                      <li key={item.step} className="flex items-start gap-3">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-mono-code font-bold text-white mt-0.5 shadow-2xs"
                          style={{ backgroundColor: accent }}
                        >
                          {item.step}
                        </span>
                        <div>
                          <p className="font-semibold text-[#181611] leading-snug">{item.title}</p>
                          <p className="text-xs text-[#6B6352] mt-0.5 leading-relaxed">
                            {item.desc}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-3 border-t border-[#ECE6D8] flex items-center justify-between text-xs text-[#6B6352]">
                    <span>Consultations in {branding.timezone}</span>
                    <a
                      href="#inquire"
                      className="font-semibold hover:underline underline-offset-4"
                      style={{ color: accent }}
                    >
                      Ask Availability →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Signature Photography & Cinematography Specialties */}
      <section
        id="specialties"
        className="border-b border-[#E5DFD0] bg-[#F3EFE6]/75 scroll-mt-16"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: accent }}
              >
                Signature Specializations
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#181611] mt-1">
                Every Chapter of Your Celebration
              </h2>
            </div>
            <p className="text-sm text-[#4A4438] max-w-md">
              Select a genre below to explore tailored collections or request a custom indoor &amp;
              outdoor shoot plan in Feni or nationwide.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {STUDIO_PROFILE.specialties.map((spec) => (
              <button
                key={spec.code}
                type="button"
                onClick={() => handleSpecialtyClick(spec.title)}
                className="group text-left atelier-card atelier-card-hover p-5 bg-white flex flex-col justify-between gap-3 cursor-pointer"
              >
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-[#F8F3E6] border border-[#DFCEAA] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wider text-[#6F5319]">
                      {spec.tag}
                    </span>
                    <span className="font-mono-code text-xs font-bold text-[#A89A7C] group-hover:text-[#8B6A21] transition-colors">
                      {spec.code}
                    </span>
                  </div>
                  <h3 className="font-editorial text-2xl font-semibold text-[#181611] group-hover:text-[#8B6A21] transition-colors">
                    {spec.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#4A4438] leading-relaxed">
                    {spec.summary}
                  </p>
                </div>
                <div className="pt-2 border-t border-[#F0EAE0] flex items-center justify-between text-xs font-semibold text-[#6B6352] group-hover:text-[#181611]">
                  <span>View Related Packages</span>
                  <ArrowRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                </div>
              </button>
            ))}
          </div>

          {eventTypes.length > 0 && (
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#6B6352] mr-1">
                Active Studio Categories:
              </span>
              {eventTypes.map((et) => (
                <a
                  key={et.id}
                  href="#packages"
                  onClick={() => {
                    if (packageCategories.some((c) => c.id === et.id)) {
                      setSelectedCategoryId(et.id);
                    }
                  }}
                  className="rounded-full border border-[#DFCEAA] bg-white px-3.5 py-1 text-xs font-medium text-[#3C362B] hover:border-[#CAA650] hover:text-[#8B6A21] transition-colors"
                >
                  {et.name}
                </a>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Highlighted Client Portfolios Stage (Obsidian & Gold Cinema Theater) */}
      <section
        id="featured-portfolios"
        className="border-b border-[#2E291F] bg-[#14120E] text-[#F4EFE4] scroll-mt-16"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 sm:px-6 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#CAA650]/40 bg-[#CAA650]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E7D1AA]">
                <CameraIcon className="w-3.5 h-3.5" />
                <span>Featured Client Portfolios</span>
              </div>
              <h2 className="font-editorial text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-white leading-tight">
                Signature Digital Albums &amp; Cinema
              </h2>
              <p className="text-sm text-[#C7BFA9] max-w-xl leading-relaxed">
                Handpicked Wedding, Holud, Reception &amp; Pre-Wedding stories crafted by{' '}
                {branding.displayName} as custom-themed Digital Albums and highlight films.
              </p>
            </div>

            <Link
              href="/portfolio"
              className="inline-flex items-center gap-2 rounded-xl bg-[#F4EFE4] px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#181611] hover:bg-white transition-colors shrink-0 shadow-sm"
            >
              <span>
                {allClientPortfolios.length > 0
                  ? `See All Portfolios (${allClientPortfolios.length})`
                  : 'Browse Portfolio Directory'}
              </span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

          {bestThreePortfolios.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {bestThreePortfolios.map((ev, index) => {
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
                    className="group rounded-2xl border border-white/12 bg-[#1C1913] overflow-hidden flex flex-col justify-between transition-all duration-300 hover:border-[#CAA650]/65 hover:-translate-y-1 hover:shadow-2xl"
                  >
                    <div>
                      <div className="relative aspect-[4/3] w-full bg-[#252118] overflow-hidden">
                        {coverSrc ? (
                          <Image
                            src={coverSrc}
                            alt={coverItem?.altText || ev.title}
                            fill
                            quality={92}
                            unoptimized={!isNextOptimizableUrl(coverSrc)}
                            sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 384px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : (
                          <div className="h-full w-full flex items-center justify-center text-xs text-[#9C937E]">
                            Digital Album
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-[#14120E]/85 via-transparent to-transparent" />

                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-xs px-3 py-1 text-[11px] font-semibold text-white">
                            {photoCount} Photos{videoCount > 0 ? ` • ${videoCount} Film` : ''}
                          </span>
                          <span className="rounded-full bg-[#E7D1AA] px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#181611]">
                            #{index + 1} Featured
                          </span>
                        </div>
                      </div>

                      <div className="p-5 space-y-2">
                        <div className="flex items-center justify-between gap-2">
                          {ev.eventType ? (
                            <span className="inline-block rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#E7D1AA]">
                              {ev.eventType.name}
                            </span>
                          ) : (
                            <span />
                          )}
                          <span
                            style={{ backgroundColor: theme.accent }}
                            title="Custom album accent color"
                            className="h-3 w-3 rounded-full border border-white/60 shrink-0"
                          />
                        </div>
                        <h3 className="font-editorial text-2xl font-semibold text-white group-hover:text-[#E7D1AA] transition-colors line-clamp-2 leading-snug">
                          {ev.title}
                        </h3>
                      </div>
                    </div>

                    <div className="px-5 py-3.5 border-t border-white/10 bg-white/[0.02] flex items-center justify-between text-xs font-semibold text-[#D5CDB8] group-hover:text-[#E7D1AA]">
                      <span>Open Digital Album</span>
                      <ArrowRightIcon className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="grid gap-5 md:grid-cols-3">
              {[
                {
                  icon: FilmIcon,
                  label: 'Outdoor & Venue Cinema',
                  title: '4K Narrative Highlight Films',
                  body: 'Stabilized cinema rigs, natural audio capture, and color-graded wedding storytelling from Feni to destination venues.',
                },
                {
                  icon: CameraIcon,
                  label: 'Indoor & Studio Craft',
                  title: 'Editorial Couple Portraiture',
                  body: 'Sculpted lighting for Engagement, Bridal, and Couple portraits inside our Grand Haque Tower studio or your banquet hall.',
                },
                {
                  icon: SparklesIcon,
                  label: 'Online Delivery',
                  title: 'Custom-Themed Digital Albums',
                  body: 'Every couple receives a shareable, custom-themed digital gallery with lossless viewing and film streaming.',
                },
              ].map((pillar) => {
                const Icon = pillar.icon;
                return (
                  <div
                    key={pillar.title}
                    className="rounded-2xl border border-white/12 bg-[#1C1913] p-6 space-y-3"
                  >
                    <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-[#CAA650]/40 bg-[#CAA650]/15 text-[#E7D1AA]">
                      <Icon className="w-5 h-5" />
                    </div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#E7D1AA]">
                      {pillar.label}
                    </p>
                    <h3 className="font-editorial text-2xl font-semibold text-white">
                      {pillar.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#C7BFA9] leading-relaxed">
                      {pillar.body}
                    </p>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Curated Packages & Collections */}
      <section
        id="packages"
        className="border-b border-[#E5DFD0] bg-[#F3EFE6]/60 scroll-mt-16"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <p
                className="text-[11px] font-bold uppercase tracking-[0.2em]"
                style={{ color: accent }}
              >
                Tailored Collections
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#181611] mt-1">
                Wedding &amp; Event Packages
              </h2>
            </div>
            <p className="text-sm text-[#4A4438] max-w-md">
              Transparent starting collections—every line item can be customized for multi-day
              Holud, Wedding, Reception &amp; Pre-Wedding shoots.
            </p>
          </div>

          {packageCategories.length > 1 && (
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategoryId('ALL')}
                className={cn(
                  'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                  selectedCategoryId === 'ALL'
                    ? 'bg-[#181611] text-white'
                    : 'bg-white border border-[#DFCEAA] text-[#4A4438] hover:border-[#8B6A21]',
                )}
              >
                All Collections ({packages.length})
              </button>
              {packageCategories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(cat.id)}
                  className={cn(
                    'rounded-full px-4 py-1.5 text-xs font-semibold transition-colors cursor-pointer',
                    selectedCategoryId === cat.id
                      ? 'bg-[#181611] text-white'
                      : 'bg-white border border-[#DFCEAA] text-[#4A4438] hover:border-[#8B6A21]',
                  )}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}

          {filteredPackages.length === 0 ? (
            <div className="atelier-card p-10 text-center space-y-4 bg-white">
              <p className="font-editorial text-2xl font-semibold text-[#181611]">
                Bespoke Quotes Crafted to Your Celebration
              </p>
              <p className="text-sm text-[#6B6352] max-w-lg mx-auto">
                Packages are being updated or tailored by event. Send us your Wedding, Holud,
                Reception, or Pre-Wedding details below—or call our Feni studio directly.
              </p>
              <div className="flex flex-wrap justify-center gap-3 pt-1">
                <a
                  href="#inquire"
                  className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold text-white"
                  style={{ backgroundColor: accent }}
                >
                  <span>Request Custom Quote</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </a>
                <a
                  href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D8CCB2] bg-[#F8F3E6] px-4 py-2.5 text-xs font-semibold text-[#181611]"
                >
                  <PhoneIcon className="w-3.5 h-3.5 text-[#7A5E21]" />
                  <span>Call {STUDIO_PROFILE.phoneDisplay}</span>
                </a>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {filteredPackages.map((pkg) => {
                const isSelected = selectedPackageId === pkg.id;
                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      'atelier-card atelier-card-hover flex flex-col justify-between p-6 bg-white',
                      isSelected ? 'ring-2 ring-[#CAA650]/45 border-[#8B6A21]' : '',
                    )}
                  >
                    <div>
                      {pkg.eventType && (
                        <span className="inline-block mb-2.5 rounded-full bg-[#F8F3E6] border border-[#DFCEAA] px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-[#6F5319]">
                          {pkg.eventType.name}
                        </span>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-editorial text-2xl font-semibold text-[#181611] leading-snug">
                          {pkg.name}
                        </h3>
                        <span
                          className="rounded-lg px-2.5 py-1 text-xs font-mono-code font-semibold text-white shrink-0 tabular-nums"
                          style={{ backgroundColor: primary }}
                        >
                          {formatPoisha(pkg.basePricePoisha, branding.currency)}
                        </span>
                      </div>
                      {pkg.description && (
                        <p className="mt-2.5 text-sm text-[#4A4438] leading-relaxed">
                          {pkg.description}
                        </p>
                      )}

                      {pkg.items && pkg.items.length > 0 && (
                        <ul className="mt-5 space-y-2 border-t border-[#ECE6D8] pt-4 text-xs text-[#4A4438]">
                          {pkg.items.map((item) => (
                            <li key={item.id} className="flex items-center justify-between gap-2">
                              <span>
                                {item.quantity}× {item.description}
                              </span>
                              <span className="font-mono-code text-[#6B6352] tabular-nums">
                                {formatPoisha(
                                  item.unitPricePoisha * item.quantity,
                                  branding.currency,
                                )}
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => handleSelectPackage(pkg.id)}
                      className={cn(
                        'mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition-all cursor-pointer',
                        isSelected
                          ? 'text-white shadow-sm'
                          : 'border-[#DFCEAA] bg-[#F8F3E6] text-[#181611] hover:bg-[#181611] hover:text-white hover:border-[#181611]',
                      )}
                      style={
                        isSelected
                          ? { backgroundColor: accent, borderColor: accent }
                          : undefined
                      }
                    >
                      {isSelected ? (
                        <>
                          <CheckCircleIcon className="w-3.5 h-3.5" />
                          <span>Selected for Quote</span>
                        </>
                      ) : (
                        <>
                          <span>Select for Quote Inquiry</span>
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Strict Viewport-Lazy Visual Showcase & Gallery */}
      <PublicPortfolioShowcase
        branding={branding}
        portfolio={portfolio}
        portfolioEvents={portfolioEvents}
      />

      {/* Feni Studio Concierge, Reviews & Booking Inquiry */}
      <section
        id="studio-concierge"
        className="bg-[#F3EFE6]/65 scroll-mt-16"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 sm:px-6 space-y-10">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.2em]"
              style={{ color: accent }}
            >
              Visit Feni Studio &amp; Reserve Dates
            </p>
            <h2 className="font-editorial text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#181611]">
              Begin Your Story with {branding.displayName}
            </h2>
            <p className="text-sm text-[#4A4438] leading-relaxed">
              Visit us at Grand Haque Tower on Mizan Rd, Feni, message us directly on Facebook, or
              submit your shoot details for an itemized quote.
            </p>
          </div>

          <div className="grid gap-8 lg:grid-cols-12 items-start">
            {/* Left Studio Info + Community Reviews */}
            <div className="lg:col-span-5 space-y-5">
              {/* Visit Our Feni Studio Card */}
              <div className="atelier-card p-6 space-y-5 bg-white">
                <div className="flex items-start justify-between gap-3 border-b border-[#ECE6D8] pb-4">
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7A5E21]">
                      Studio Lounge • {STUDIO_PROFILE.city}
                    </p>
                    <h3 className="font-editorial text-2xl font-semibold text-[#181611] mt-0.5">
                      Visit {branding.displayName}
                    </h3>
                  </div>
                  <span className="rounded-full bg-[#F8F3E6] border border-[#DFCEAA] px-2.5 py-0.5 text-[11px] font-semibold text-[#6F5319]">
                    {STUDIO_PROFILE.priceTier} Studio
                  </span>
                </div>

                <div className="space-y-4 text-sm text-[#3C362B]">
                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F8F3E6] border border-[#DFCEAA] text-[#7A5E21]">
                      <MapPinIcon className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B6352]">
                        Studio Address
                      </p>
                      <p className="text-sm text-[#181611] mt-0.5 leading-relaxed">
                        {contactAddress}
                      </p>
                      <a
                        href={STUDIO_PROFILE.mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-semibold mt-1.5 hover:underline underline-offset-4"
                        style={{ color: accent }}
                      >
                        <span>Open Studio Map</span>
                        <ExternalLinkIcon className="w-3 h-3" />
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F8F3E6] border border-[#DFCEAA] text-[#7A5E21]">
                      <PhoneIcon className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B6352]">
                        Phone &amp; WhatsApp
                      </p>
                      <a
                        href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                        className="text-sm font-mono-code font-semibold text-[#181611] hover:underline mt-0.5 inline-block"
                      >
                        {contactPhone} ({STUDIO_PROFILE.phoneDisplay})
                      </a>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F8F3E6] border border-[#DFCEAA] text-[#7A5E21]">
                      <MailIcon className="w-4 h-4" />
                    </span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-[#6B6352]">
                        Studio Email
                      </p>
                      <a
                        href={`mailto:${contactEmail}`}
                        className="text-sm text-[#181611] hover:underline mt-0.5 inline-block break-all"
                      >
                        {contactEmail}
                      </a>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-[#ECE6D8]">
                  <a
                    href={STUDIO_PROFILE.messengerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#181611] px-3.5 py-2.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                  >
                    <MessageCircleIcon className="w-3.5 h-3.5 text-[#E7D1AA]" />
                    <span>Inbox Messenger</span>
                  </a>
                  <a
                    href={facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D8CCB2] bg-[#F8F3E6] px-3.5 py-2.5 text-xs font-semibold text-[#181611] hover:bg-white transition-colors"
                  >
                    <span>Facebook Page</span>
                    <ExternalLinkIcon className="w-3.5 h-3.5 text-[#7A5E21]" />
                  </a>
                </div>
              </div>

              {/* Client Voices & Community Card */}
              <div className="rounded-2xl border border-[#2E291F] bg-[#14120E] p-6 text-[#F4EFE4] space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1 text-[#E7D1AA]">
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <StarIcon key={idx} className="w-3.5 h-3.5" />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E7D1AA]">
                    {STUDIO_PROFILE.followersCount} Community
                  </span>
                </div>

                <div className="space-y-3">
                  {STUDIO_PROFILE.reviews.map((rev, i) => (
                    <blockquote
                      key={i}
                      className={cn(
                        'space-y-1',
                        i > 0 ? 'pt-3 border-t border-white/10' : '',
                      )}
                    >
                      <p className="font-editorial text-xl italic text-white leading-snug">
                        &ldquo;{rev.quote}&rdquo;
                      </p>
                      <footer className="text-xs text-[#C7BFA9]">
                        — <span className="font-semibold text-[#E7D1AA]">{rev.author}</span> •{' '}
                        {rev.source}
                      </footer>
                    </blockquote>
                  ))}
                </div>
              </div>
            </div>

            {/* Right Interactive Booking & Quote Form */}
            <div id="inquire" className="lg:col-span-7 scroll-mt-20">
              <InquiryForm
                branding={branding}
                eventTypes={eventTypes}
                packages={packages}
                selectedPackageId={selectedPackageId}
                onPackageChange={setSelectedPackageId}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
