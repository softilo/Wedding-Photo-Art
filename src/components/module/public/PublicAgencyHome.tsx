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
  ApertureIcon,
  ArrowRightIcon,
  CameraIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ExternalLinkIcon,
  FilmIcon,
  LayersIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  ShieldCheckIcon,
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

const DECISION_STEPS = [
  { step: '01', label: 'Services & Genres', href: '#specialties' },
  { step: '02', label: 'Real Albums & Films', href: '#featured-portfolios' },
  { step: '03', label: 'Packages & Pricing', href: '#packages' },
  { step: '04', label: 'Guarantees & FAQ', href: '#why-choose-us' },
  { step: '05', label: 'Book & Visit Feni', href: '#studio-concierge' },
];

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
  const [inquiryTitle, setInquiryTitle] = useState<string>('');
  const [inquiryNotes, setInquiryNotes] = useState<string>('');
  const [openFaqIdx, setOpenFaqIdx] = useState<number>(0);

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
    document.getElementById('inquire')?.scrollIntoView({ behavior: 'smooth' });
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
    if (!packages.length) {
      setInquiryTitle(`${specialtyTitle} Photography & Cinema`);
    }
    const targetId = packages.length > 0 ? 'packages' : 'inquire';
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectComboPreset = (preset: (typeof STUDIO_PROFILE.comboPresets)[number]) => {
    setSelectedPackageId('');
    setInquiryTitle(preset.title);
    setInquiryNotes(preset.notes);
    document.getElementById('inquire')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="flex-1 bg-[#F9F8F5] text-[#181611]">
      {!isBackendConnected && (
        <div className="bg-[#F8F3E6] border-b border-[#DFCEAA] px-4 py-2 text-center text-xs font-medium text-[#6F5319]">
          Preview Mode: Connect the backend server to load live {branding.displayName} packages,
          client albums, and submit inquiries.
        </div>
      )}

      {/* =====================================================================
          HERO: Immediate Studio Identity & Trust Verification
      ===================================================================== */}
      <section className="relative overflow-hidden border-b border-[#E5DFD0] bg-[#F9F8F5]">
        <div
          className="absolute inset-0 opacity-[0.14] pointer-events-none"
          style={{
            background: `radial-gradient(circle at 10% 16%, ${secondary} 0%, transparent 45%), radial-gradient(circle at 88% 72%, #E7D1AA 0%, transparent 48%)`,
          }}
        />
        <div className="relative mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-16 lg:py-20">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex flex-wrap items-center gap-2 rounded-full border border-[#DFCEAA] bg-white/95 px-4 py-1.5 text-xs font-semibold text-[#4A4438] shadow-2xs">
                <ApertureIcon className="w-3.5 h-3.5" style={{ color: accent }} />
                <span>{branding.displayName}</span>
                <span className="text-[#C9B996]">•</span>
                <span className="text-[#7A5E21]">{STUDIO_PROFILE.city}</span>
                <span className="text-[#C9B996]">•</span>
                <span className="text-[#6B6352]">{STUDIO_PROFILE.followersCount} Followers</span>
              </div>

              <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[3.75rem] font-semibold text-[#181611] leading-[1.06]">
                {STUDIO_PROFILE.headlineLead}{' '}
                <span className="italic" style={{ color: accent }}>
                  {STUDIO_PROFILE.headlineAccent}
                </span>
              </h1>

              <p className="text-base sm:text-lg text-[#4A4438] max-w-xl leading-relaxed">
                {STUDIO_PROFILE.description}
              </p>

              {/* Guided First Actions: Inspect Work First or Book Directly */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <a
                  href="#featured-portfolios"
                  className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-all hover:opacity-95 active:scale-[0.98]"
                  style={{ backgroundColor: accent }}
                >
                  <span>See Real Client Work</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </a>
                <a
                  href="#packages"
                  className="inline-flex items-center gap-2 rounded-xl border border-[#D8CCB2] bg-white px-5 py-3.5 text-sm font-semibold text-[#2E291F] hover:bg-[#F3EFE6] hover:border-[#CAA650] transition-colors"
                >
                  Compare Packages
                </a>
                <a
                  href="#inquire"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-transparent px-3.5 py-3.5 text-sm font-semibold text-[#6F5319] hover:text-[#181611] transition-colors"
                >
                  Check Availability →
                </a>
              </div>

              {/* Studio Verification Strip */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-5 border-t border-[#E5DFD0] max-w-2xl">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5E21]">
                    Physical Studio
                  </p>
                  <p className="text-xs text-[#4A4438] mt-0.5 leading-snug">
                    Grand Haque Tower (5th Fl), Mizan Rd, Feni
                  </p>
                </div>
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-wider text-[#7A5E21]">
                    Direct Studio Line
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
                    Coverage Scope
                  </p>
                  <p className="text-xs text-[#4A4438] mt-0.5">
                    Outdoor • Indoor • Digital Albums
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column: Studio Emblem & Instant Trust Checklist */}
            <div className="lg:col-span-5">
              <div className="atelier-card overflow-hidden bg-white shadow-[0_24px_60px_-24px_rgba(24,22,17,0.14)] border-[#D8CCB2]">
                <div className="relative bg-[#14120E] px-6 py-6 text-center text-[#F4EFE4] overflow-hidden border-b border-[#CAA650]/35">
                  <div
                    className="absolute inset-0 opacity-25 pointer-events-none"
                    style={{
                      background: `radial-gradient(circle at 50% 35%, ${secondary} 0%, transparent 65%)`,
                    }}
                  />
                  <div className="relative flex flex-col items-center gap-2.5">
                    <BrandMark
                      logoUrl={branding.logoUrl}
                      alt={branding.displayName}
                      size={92}
                      variant="dark"
                      className="rounded-2xl border-[#CAA650]/50 shadow-xl"
                    />
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#E7D1AA]">
                        {STUDIO_PROFILE.tagline}
                      </p>
                      <p className="text-xs text-[#C7BFA9]">
                        {STUDIO_PROFILE.productionTagline}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-5 sm:p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-[#ECE6D8] pb-3">
                    <div>
                      <p
                        className="text-[10.5px] font-bold uppercase tracking-[0.18em]"
                        style={{ color: accent }}
                      >
                        Quick Studio Facts
                      </p>
                      <p className="font-editorial text-2xl font-semibold text-[#181611] mt-0.5">
                        Why Couples Book With Us
                      </p>
                    </div>
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F8F3E6] text-[#7A5E21] border border-[#DFCEAA]">
                      <ShieldCheckIcon className="w-4 h-4" />
                    </span>
                  </div>

                  <ul className="space-y-3 text-xs sm:text-sm text-[#3C362B]">
                    {[
                      {
                        title: 'Meet Us Face-to-Face in Feni',
                        desc: 'Visit Grand Haque Tower (5th Floor), Mizan Rd before booking.',
                      },
                      {
                        title: 'Zero Crew Double-Booking',
                        desc: 'Your shoot date, lead photographers & gear are date-locked.',
                      },
                      {
                        title: 'Transparent Written Quotes',
                        desc: 'Itemized BDT pricing with clear deliverables—no hidden fees.',
                      },
                      {
                        title: 'Online Digital Photo & Film Albums',
                        desc: 'Preview real client albums below before making your decision.',
                      },
                    ].map((fact) => (
                      <li key={fact.title} className="flex items-start gap-2.5">
                        <CheckCircleIcon
                          className="w-4 h-4 shrink-0 mt-0.5"
                          style={{ color: accent }}
                        />
                        <div>
                          <p className="font-semibold text-[#181611] leading-snug">{fact.title}</p>
                          <p className="text-xs text-[#6B6352] mt-0.5">{fact.desc}</p>
                        </div>
                      </li>
                    ))}
                  </ul>

                  <div className="pt-3 border-t border-[#ECE6D8] flex items-center justify-between text-xs text-[#6B6352]">
                    <span>Follow the 5 steps below</span>
                    <a
                      href="#specialties"
                      className="font-semibold hover:underline underline-offset-4"
                      style={{ color: accent }}
                    >
                      Start Step 01 →
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          DECISION GUIDE BAR: Let visitors jump through the 5 evaluation steps
      ===================================================================== */}
      <section
        aria-label="Step-by-step decision guide"
        className="border-b border-[#E5DFD0] bg-white"
      >
        <div className="mx-auto max-w-6xl px-4 py-3.5 sm:px-6">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <span className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7A5E21] whitespace-nowrap shrink-0 mr-1">
              Your Decision Path:
            </span>
            {DECISION_STEPS.map((item) => (
              <a
                key={item.step}
                href={item.href}
                className="inline-flex items-center gap-2 rounded-full border border-[#DFCEAA] bg-[#F8F3E6] px-3 py-1.5 text-xs font-semibold text-[#181611] hover:border-[#8B6A21] hover:bg-white transition-colors whitespace-nowrap shrink-0"
              >
                <span className="font-mono-code text-[11px] font-bold text-[#8B6A21]">
                  {item.step}
                </span>
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* =====================================================================
          STEP 01: SERVICES & CEREMONIES WE COVER
      ===================================================================== */}
      <section
        id="specialties"
        className="border-b border-[#E5DFD0] bg-[#F3EFE6]/75 scroll-mt-16"
      >
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-16 sm:px-6 space-y-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DFCEAA] bg-white px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7A5E21]">
                Step 01 • Services &amp; Coverage
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#181611]">
                Do We Cover Your Celebration?
              </h2>
            </div>
            <p className="text-sm text-[#4A4438] max-w-md">
              Tap your ceremony below to jump directly to matching packages or plan a custom
              indoor &amp; outdoor shoot.
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
                  <span>See {spec.title} Packages</span>
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

      {/* =====================================================================
          STEP 02A: PROOF OF WORK — FEATURED CLIENT ALBUMS
      ===================================================================== */}
      <section
        id="featured-portfolios"
        className="border-b border-[#2E291F] bg-[#14120E] text-[#F4EFE4] scroll-mt-16"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 sm:px-6 space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-5">
            <div className="space-y-2.5">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#CAA650]/40 bg-[#CAA650]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E7D1AA]">
                <CameraIcon className="w-3.5 h-3.5" />
                <span>Step 02 • Inspect Real Client Work</span>
              </div>
              <h2 className="font-editorial text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-white leading-tight">
                Signature Digital Albums &amp; Cinema
              </h2>
              <p className="text-sm text-[#C7BFA9] max-w-xl leading-relaxed">
                Don&apos;t take our word for it—open real Wedding, Holud &amp; Reception albums
                delivered by {branding.displayName} and evaluate our framing and color yourself.
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
                  icon: LayersIcon,
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

      {/* =====================================================================
          STEP 02B: GALLERY WALL & CINEMA THEATER (Strict Viewport-Lazy)
      ===================================================================== */}
      <PublicPortfolioShowcase
        branding={branding}
        portfolio={portfolio}
        portfolioEvents={portfolioEvents}
      />

      {/* =====================================================================
          STEP 03: TRANSPARENT PACKAGES & MULTI-DAY COMBO SELECTOR
      ===================================================================== */}
      <section
        id="packages"
        className="border-b border-[#E5DFD0] bg-[#F3EFE6]/65 scroll-mt-16"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 sm:px-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DFCEAA] bg-white px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7A5E21]">
                Step 03 • Compare Transparent Pricing
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#181611]">
                Wedding &amp; Event Packages
              </h2>
            </div>
            <p className="text-sm text-[#4A4438] max-w-md">
              Select any collection below to attach it to your free quote request—every line item
              can be tailored to your guest count and schedule.
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
                Packages are tailored by ceremony and shoot hours. Pick a combo below or share your
                Wedding, Holud, Reception, or Pre-Wedding dates to receive an itemized quote.
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
                              <span className="flex items-center gap-1.5 min-w-0">
                                <CheckCircleIcon className="w-3.5 h-3.5 text-[#8B6A21] shrink-0" />
                                <span className="truncate">
                                  {item.quantity}× {item.description}
                                </span>
                              </span>
                              <span className="font-mono-code text-[#6B6352] tabular-nums shrink-0">
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
                          <span>Choose This Collection</span>
                          <ArrowRightIcon className="w-3.5 h-3.5" />
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Quick Multi-Day Combo Builder Helper */}
          <div className="atelier-card p-6 sm:p-7 bg-white border-[#DFCEAA] flex flex-col lg:flex-row lg:items-center justify-between gap-5">
            <div className="space-y-1 max-w-xl">
              <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7A5E21]">
                Planning Multiple Ceremonies?
              </p>
              <h3 className="font-editorial text-2xl font-semibold text-[#181611]">
                Need a Custom Multi-Day Wedding Combo?
              </h3>
              <p className="text-xs sm:text-sm text-[#4A4438]">
                Pick a quick preset below to pre-fill your inquiry for an itemized combo quote:
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {STUDIO_PROFILE.comboPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleSelectComboPreset(preset)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-[#DFCEAA] bg-[#F8F3E6] px-3.5 py-2 text-xs font-semibold text-[#181611] hover:border-[#8B6A21] hover:bg-[#181611] hover:text-white transition-colors cursor-pointer"
                >
                  <span>{preset.label}</span>
                  <ArrowRightIcon className="w-3 h-3" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          STEP 04: WHY CHOOSE US — GUARANTEES, WORKFLOW, REVIEWS & FAQ
      ===================================================================== */}
      <section
        id="why-choose-us"
        className="border-b border-[#E5DFD0] bg-white scroll-mt-16"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 sm:px-6 space-y-12">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DFCEAA] bg-[#F8F3E6] px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#6F5319]">
                Step 04 • Peace of Mind &amp; Process
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#181611]">
                How We Guarantee a Stress-Free Experience
              </h2>
            </div>
            <p className="text-sm text-[#4A4438] max-w-md">
              Everything families check before finalizing a wedding photography team—clear
              process, locked dates, and verified client feedback.
            </p>
          </div>

          {/* 4 Studio Guarantees */}
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STUDIO_PROFILE.guarantees.map((g, idx) => (
              <div
                key={g.title}
                className="atelier-card p-5 bg-[#F9F8F5] border-[#DFCEAA] space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#181611] text-[#E7D1AA] font-mono-code text-xs font-bold">
                    0{idx + 1}
                  </span>
                  <ShieldCheckIcon className="w-4 h-4 text-[#8B6A21]" />
                </div>
                <h3 className="font-editorial text-xl font-semibold text-[#181611] leading-snug">
                  {g.title}
                </h3>
                <p className="text-xs text-[#4A4438] leading-relaxed">{g.summary}</p>
              </div>
            ))}
          </div>

          {/* Booking Timeline + FAQ Accordion */}
          <div className="grid gap-8 lg:grid-cols-12 items-start">
            {/* Left: 3-Step Booking & Delivery Process */}
            <div className="lg:col-span-5 atelier-card p-6 bg-[#14120E] text-[#F4EFE4] border-[#2E291F] space-y-5">
              <div className="border-b border-white/10 pb-3.5">
                <p className="text-[10.5px] font-bold uppercase tracking-[0.2em] text-[#E7D1AA]">
                  From Inquiry to Album
                </p>
                <h3 className="font-editorial text-2xl font-semibold text-white mt-0.5">
                  3 Clear Steps to Book
                </h3>
              </div>

              <ul className="space-y-4">
                {STUDIO_PROFILE.bookingSteps.map((item) => (
                  <li key={item.step} className="flex items-start gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#CAA650] text-[#181611] text-xs font-mono-code font-bold mt-0.5">
                      {item.step}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.title}</p>
                      <p className="text-xs text-[#C7BFA9] mt-0.5 leading-relaxed">{item.desc}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="pt-3 border-t border-white/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[#E7D1AA]">
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <StarIcon key={idx} className="w-3.5 h-3.5" />
                    ))}
                  </div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E7D1AA]">
                    {STUDIO_PROFILE.followersCount} Facebook Community
                  </span>
                </div>
                {STUDIO_PROFILE.reviews.map((rev, i) => (
                  <blockquote
                    key={i}
                    className={cn('space-y-1', i > 0 ? 'pt-2.5 border-t border-white/10' : '')}
                  >
                    <p className="font-editorial text-lg italic text-white leading-snug">
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

            {/* Right: Client Questions Answered (Interactive FAQ Accordion) */}
            <div className="lg:col-span-7 space-y-3">
              <div className="pb-1">
                <p
                  className="text-[10.5px] font-bold uppercase tracking-[0.2em]"
                  style={{ color: accent }}
                >
                  Common Questions
                </p>
                <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#181611] mt-0.5">
                  Answers Before You Decide
                </h3>
              </div>

              {STUDIO_PROFILE.faqs.map((faq, idx) => {
                const isOpen = openFaqIdx === idx;
                return (
                  <div
                    key={faq.question}
                    className={cn(
                      'atelier-card overflow-hidden transition-colors',
                      isOpen ? 'border-[#CAA650] bg-[#F9F8F5]' : 'bg-white',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setOpenFaqIdx(isOpen ? -1 : idx)}
                      aria-expanded={isOpen}
                      className="w-full px-5 py-4 flex items-center justify-between gap-4 text-left cursor-pointer"
                    >
                      <span className="text-sm sm:text-base font-semibold text-[#181611]">
                        {faq.question}
                      </span>
                      <ChevronDownIcon
                        className={cn(
                          'w-4 h-4 shrink-0 text-[#8B6A21] transition-transform duration-200',
                          isOpen ? 'rotate-180' : '',
                        )}
                      />
                    </button>
                    {isOpen && (
                      <div className="px-5 pb-4 pt-0 text-xs sm:text-sm text-[#4A4438] leading-relaxed border-t border-[#ECE6D8]/70">
                        <p className="pt-3">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          STEP 05: VISIT FENI STUDIO OR SEND FREE BOOKING INQUIRY
      ===================================================================== */}
      <section
        id="studio-concierge"
        className="bg-[#F3EFE6]/70 scroll-mt-16"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 sm:px-6 space-y-10">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DFCEAA] bg-white px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7A5E21]">
              Step 05 • Meet Us or Reserve Your Date
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#181611]">
              Ready to Book {branding.displayName}?
            </h2>
            <p className="text-sm text-[#4A4438] leading-relaxed">
              Visit us at Grand Haque Tower on Mizan Rd, Feni, message us directly on Facebook
              Messenger, or submit your event details for a free, zero-obligation itemized quote.
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

              {/* What Happens Next Card */}
              <div className="rounded-2xl border border-[#2E291F] bg-[#14120E] p-6 text-[#F4EFE4] space-y-4">
                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
                  <div>
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#E7D1AA]">
                      After You Submit
                    </p>
                    <h3 className="font-editorial text-xl font-semibold text-white mt-0.5">
                      What Happens Next?
                    </h3>
                  </div>
                  <span className="rounded-full border border-[#CAA650]/40 bg-[#CAA650]/15 px-2.5 py-0.5 text-[10.5px] font-semibold text-[#E7D1AA]">
                    Free Quote
                  </span>
                </div>

                <ul className="space-y-2.5 text-xs text-[#C7BFA9]">
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono-code font-bold text-[#E7D1AA]">01.</span>
                    <span>Our coordinator checks photographer &amp; cinema crew availability for your dates.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono-code font-bold text-[#E7D1AA]">02.</span>
                    <span>You receive a clear, itemized BDT quote via phone, WhatsApp, or email.</span>
                  </li>
                  <li className="flex items-start gap-2.5">
                    <span className="font-mono-code font-bold text-[#E7D1AA]">03.</span>
                    <span>Visit our Mizan Rd studio or confirm your deposit to lock your date.</span>
                  </li>
                </ul>
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
                eventTitle={inquiryTitle}
                onEventTitleChange={setInquiryTitle}
                notes={inquiryNotes}
                onNotesChange={setInquiryNotes}
              />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
