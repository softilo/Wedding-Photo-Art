'use client';

import Link from 'next/link';
import React, { useMemo, useState } from 'react';
import {
  ClientReview,
  EventType,
  PortfolioItem,
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
  PublicBranding,
  PublicServicesResponse,
  StudioMilestoneItem,
  StudioPackage,
} from '@/types/event-management';
import { isSystemPortfolioEventSlug } from '@/lib/heroSlider';
import { STUDIO_PROFILE } from '@/lib/publicStorefront';
import { formatPoisha, cn } from '@/lib/utils';
import { buildWhatsAppUrl } from '@/components/common/FloatingWhatsAppButton';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  FacebookIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from '@/components/shared/Icons';
import { HeroPhotoSlider } from './HeroPhotoSlider';
import { PublicPortfolioShowcase } from './PublicPortfolioShowcase';
import { PublicReviewsSection } from './PublicReviewsSection';
import { PublicServicesSection } from './PublicServicesSection';
import { StudioCountStats } from './StudioCountStats';

interface PublicAgencyHomeProps {
  branding: PublicBranding;
  eventTypes: EventType[];
  packages: StudioPackage[];
  portfolio: PortfolioItem[];
  portfolioEvents?: PortfolioShowcaseEvent[];
  heroEvent?: PortfolioShowcaseEvent | null;
  editorialGridEvent?: PortfolioShowcaseEvent | null;
  servicesShowcase?: PublicServicesResponse | null;
  milestones?: StudioMilestoneItem[] | null;
  galleryImages?: PortfolioMediaItem[];
  reviews?: ClientReview[];
  isBackendConnected: boolean;
  initialPackageId?: string;
}

export function PublicAgencyHome({
  branding,
  eventTypes,
  packages,
  portfolio,
  portfolioEvents = [],
  heroEvent = null,
  servicesShowcase = null,
  milestones = null,
  galleryImages = [],
  reviews = [],
  isBackendConnected,
  initialPackageId = '',
}: PublicAgencyHomeProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>(initialPackageId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [selectedInquiryLabel, setSelectedInquiryLabel] = useState<string>('');

  const primary = branding.themeTokens.primaryColor || '#181611';
  const accent = branding.themeTokens.accentColor || '#8B6A21';

  const contactPhone = branding.contactDetails?.phone || STUDIO_PROFILE.phoneIntl;
  const contactEmail = branding.contactDetails?.email || STUDIO_PROFILE.email;
  const contactAddress = branding.contactDetails?.address || STUDIO_PROFILE.address;
  const facebookUrl = branding.contactDetails?.website || STUDIO_PROFILE.facebookUrl;
  const whatsappMessage = selectedInquiryLabel
    ? `Hello ${branding.displayName}! I would like to book / inquire about: ${selectedInquiryLabel}.`
    : undefined;
  const whatsappBookUrl = buildWhatsAppUrl(contactPhone, branding.displayName, whatsappMessage);

  const allClientPortfolios = useMemo(() => {
    return [...portfolioEvents]
      .filter((ev) => !isSystemPortfolioEventSlug(ev.slug))
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

  const packageCategories = useMemo(() => {
    const ids = new Set(packages.map((p) => p.eventTypeId).filter(Boolean));
    return eventTypes.filter((et) => ids.has(et.id));
  }, [packages, eventTypes]);

  const fallbackReviewImageUrls = useMemo(() => {
    const urls: string[] = [];
    for (const img of galleryImages) {
      if (img.secureUrl && !urls.includes(img.secureUrl)) {
        urls.push(img.secureUrl);
      }
    }
    if (heroEvent?.coverMedia?.secureUrl && !urls.includes(heroEvent.coverMedia.secureUrl)) {
      urls.push(heroEvent.coverMedia.secureUrl);
    }
    for (const ev of allClientPortfolios) {
      const cover = ev.coverMedia?.secureUrl;
      if (cover && !urls.includes(cover)) {
        urls.push(cover);
      }
    }
    return urls.slice(0, 6);
  }, [galleryImages, heroEvent, allClientPortfolios]);

  const filteredPackages = useMemo(() => {
    if (selectedCategoryId === 'ALL') return packages;
    return packages.filter((p) => p.eventTypeId === selectedCategoryId);
  }, [packages, selectedCategoryId]);

  const buildPackageWhatsAppHref = (pkg: StudioPackage) => {
    const lines: string[] = [
      `Hello ${branding.displayName}! I would like to book / inquire about this package:`,
      '',
      `Package: ${pkg.name}`,
    ];
    if (pkg.eventType?.name) {
      lines.push(`Category: ${pkg.eventType.name}`);
    }
    lines.push(`Base Price: ${formatPoisha(pkg.basePricePoisha, branding.currency)}`);
    if (pkg.description?.trim()) {
      lines.push(`Summary: ${pkg.description.trim()}`);
    }
    if (pkg.items && pkg.items.length > 0) {
      lines.push('', 'Included Items:');
      for (const item of pkg.items) {
        const lineTotal =
          item.unitPricePoisha > 0
            ? ` (${formatPoisha(item.unitPricePoisha * item.quantity, branding.currency)})`
            : '';
        lines.push(`- ${item.quantity}x ${item.description}${lineTotal}`);
      }
    }
    lines.push('', 'Please share date availability and booking details.');
    return buildWhatsAppUrl(contactPhone, branding.displayName, lines.join('\n'));
  };

  const buildComboWhatsAppHref = (preset: (typeof STUDIO_PROFILE.comboPresets)[number]) => {
    const msg = [
      `Hello ${branding.displayName}! I would like to inquire about a custom multi-day package:`,
      '',
      `Combo: ${preset.title}`,
      `Details: ${preset.notes}`,
    ].join('\n');
    return buildWhatsAppUrl(contactPhone, branding.displayName, msg);
  };

  return (
    <main className="flex-1 bg-[#F9F8F5] text-[#181611] overflow-x-clip">
      {!isBackendConnected && (
        <div className="bg-[#F8F3E6] border-b border-[#DFCEAA] px-4 py-2 text-center text-xs font-medium text-[#6F5319]">
          Preview Mode: Connect the backend server to load live {branding.displayName} packages,
          client albums, and submit inquiries.
        </div>
      )}

      {/* =====================================================================
          HERO: Clean Full-Background Sliding Photography Showcase (Image Only)
      ===================================================================== */}
      <HeroPhotoSlider
        branding={branding}
        heroEvent={heroEvent}
        portfolioEvents={allClientPortfolios}
        galleryImages={galleryImages}
        legacyPortfolio={portfolio}
      />

      {/* =====================================================================
          STUDIO INTRO: Clean Centered Editorial Brand Statement Below Hero
      ===================================================================== */}
      <section id="about" className="border-b border-[#E5DFD0] bg-white scroll-mt-16">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:py-24 text-center space-y-6 sm:space-y-8">
          <p className="text-xs sm:text-xl font-extrabold tracking-[0.06em] text-[#181611]">
            {branding.displayName}
          </p>

          <h1
            className="font-editorial text-[1.9rem] sm:text-[2.6rem] lg:text-[3rem] font-medium leading-[1.15] tracking-tight"
            style={{ color: accent }}
          >
            Premium Class Photography &amp; Cinematography Services
          </h1>

          <p className="mx-auto max-w-xl text-xs sm:text-[13.5px] text-[#4A4438] leading-[1.85]">
            {branding.displayName} is a team of experienced professional photographers,
            cinematographers and photo-book experts who are dedicated to creating stunning,
            authentic stories of people&apos;s lives.
          </p>

          <StudioCountStats accentColor={accent} stats={milestones} />
        </div>
      </section>

      {/* =====================================================================
          STUDIO SERVICES SHOWCASE: Dashboard-Controlled 3-Card Row + See All CTA
      ===================================================================== */}
      <PublicServicesSection
        branding={branding}
        servicesShowcase={servicesShowcase}
        variant="home"
      />

      {/* =====================================================================
          CLIENT REVIEWS BANNER: Full-Bleed Photo + Quote + 5 Stars + Name
      ===================================================================== */}
      <PublicReviewsSection
        reviews={reviews}
        fallbackImageUrls={fallbackReviewImageUrls}
        studioName={branding.displayName}
      />

      {/* =====================================================================
          EDITORIAL MOSAIC: 4-Frame Asymmetric Quality Photo Showcase
      ===================================================================== */}
      {/* <EditorialBentoShowcase
        branding={branding}
        editorialEvent={editorialGridEvent}
        portfolioEvents={allClientPortfolios}
        galleryImages={galleryImages}
        legacyPortfolio={portfolio}
      /> */}

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
        <div className="mx-auto max-w-[1380px] px-4 py-16 sm:px-6 sm:py-20 lg:px-10 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DFCEAA] bg-white px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7A5E21]">
                Compare Transparent Pricing
              </span>
              <h2 className="font-editorial text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#181611]">
                Wedding &amp; Event Packages
              </h2>
            </div>
            <p className="text-sm text-[#4A4438] max-w-md">
              Tap any package below to send its full details directly to our studio on WhatsApp—every
              line item can be tailored to your guest count and schedule.
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
                const coverUrl = pkg.coverDeliveryUrls?.coverUrl || pkg.coverImageUrl || null;
                return (
                  <div
                    key={pkg.id}
                    className={cn(
                      'atelier-card atelier-card-hover flex flex-col justify-between overflow-hidden bg-white',
                      isSelected ? 'ring-2 ring-[#CAA650]/45 border-[#8B6A21]' : '',
                    )}
                  >
                    <div>
                      {coverUrl && (
                        <div className="relative aspect-[16/10] w-full overflow-hidden bg-[#F3EFE6] border-b border-[#ECE6D8]">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={coverUrl}
                            alt={pkg.name}
                            loading="lazy"
                            decoding="async"
                            className="h-full w-full object-cover object-center transition-transform duration-500 hover:scale-[1.03]"
                          />
                        </div>
                      )}

                      <div className="p-6 pb-0">
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
                                {item.unitPricePoisha > 0 && (
                                  <span className="font-mono-code text-[#6B6352] tabular-nums shrink-0">
                                    {formatPoisha(
                                      item.unitPricePoisha * item.quantity,
                                      branding.currency,
                                    )}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>

                    <div className="p-6 pt-5">
                      <a
                        href={buildPackageWhatsAppHref(pkg)}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => {
                          setSelectedPackageId(pkg.id);
                          setSelectedInquiryLabel(pkg.name);
                        }}
                        className={cn(
                          'inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#16A34A] bg-[#16A34A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-[#16A34A]/20 hover:bg-[#15803D] hover:border-[#15803D] transition-all active:scale-[0.99] cursor-pointer',
                          isSelected ? 'ring-2 ring-[#25D366]/45' : '',
                        )}
                      >
                        <WhatsAppIcon className="w-4 h-4 shrink-0" />
                        <span>Book on WhatsApp</span>
                        <ArrowRightIcon className="w-3.5 h-3.5 shrink-0" />
                      </a>
                    </div>
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
                Pick a quick preset below to message us on WhatsApp for an itemized combo quote:
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {STUDIO_PROFILE.comboPresets.map((preset) => (
                <a
                  key={preset.id}
                  href={buildComboWhatsAppHref(preset)}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => {
                    setSelectedPackageId('');
                    setSelectedInquiryLabel(preset.title);
                  }}
                  className="group inline-flex items-center gap-1.5 rounded-xl border border-[#181611] bg-[#181611] px-3.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-[#16A34A] hover:border-[#16A34A] transition-colors cursor-pointer"
                >
                  <WhatsAppIcon className="w-3.5 h-3.5 text-[#25D366] group-hover:text-white transition-colors shrink-0" />
                  <span>{preset.label}</span>
                  <ArrowRightIcon className="w-3 h-3 shrink-0" />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          VISIT FENI STUDIO OR SEND FREE BOOKING INQUIRY
      ===================================================================== */}
      <section
        id="studio-concierge"
        className="bg-[#F3EFE6]/70 scroll-mt-16"
      >
        <div className="mx-auto max-w-6xl px-4 py-16 sm:py-20 sm:px-6 space-y-10">
          <div className="text-center space-y-2.5 max-w-2xl mx-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#DFCEAA] bg-white px-3 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7A5E21]">
              Meet Us or Reserve Your Date
            </span>
            <h2 className="font-editorial text-3xl sm:text-4xl lg:text-[2.75rem] font-semibold text-[#181611]">
              Ready to Book {branding.displayName}?
            </h2>
            <p className="text-sm text-[#4A4438] leading-relaxed">
              Visit us at Grand Haque Tower on Mizan Rd, Feni, message us directly on Facebook
              Messenger, or submit your event details for a free, zero-obligation itemized quote.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-12 items-stretch">
            {/* Left Studio Info + Highlighted WhatsApp Book Now & Social Channels */}
            <div id="inquire" className="lg:col-span-7 scroll-mt-20">
              <div className="atelier-card p-6 sm:p-8 space-y-5 bg-white h-full flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="flex items-start justify-between gap-3 border-b border-[#ECE6D8] pb-4">
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7A5E21]">
                        Studio Lounge • {STUDIO_PROFILE.city}
                      </p>
                      <h3 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#181611] mt-0.5">
                        Visit {branding.displayName}
                      </h3>
                    </div>
                    <span className="rounded-full bg-[#F8F3E6] border border-[#DFCEAA] px-2.5 py-0.5 text-[11px] font-semibold text-[#6F5319]">
                      {STUDIO_PROFILE.priceTier} Studio
                    </span>
                  </div>

                  {selectedInquiryLabel && (
                    <div className="rounded-xl border border-[#CAA650]/50 bg-[#F8F3E6] px-4 py-2.5 flex items-center justify-between gap-2 text-xs">
                      <span className="font-medium text-[#181611] truncate">
                        Selected: <strong>{selectedInquiryLabel}</strong>
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedPackageId('');
                          setSelectedInquiryLabel('');
                        }}
                        className="text-[11px] font-semibold text-[#7A5E21] underline shrink-0 cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>
                  )}

                  <div className="grid gap-4 sm:grid-cols-2 text-sm text-[#3C362B]">
                    <div className="sm:col-span-2 flex items-start gap-3">
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
                          href={`tel:${contactPhone.replace(/[^\d+]/g, '')}`}
                          className="text-sm font-mono-code font-semibold text-[#181611] hover:underline mt-0.5 inline-block"
                        >
                          {contactPhone}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F8F3E6] border border-[#DFCEAA] text-[#7A5E21]">
                        <MailIcon className="w-4 h-4" />
                      </span>
                      <div className="min-w-0">
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
                </div>

                <div className="space-y-3 pt-4 border-t border-[#ECE6D8]">
                  <a
                    href={whatsappBookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] px-5 py-3.5 text-sm sm:text-base font-bold text-white shadow-md shadow-[#16A34A]/25 ring-2 ring-[#25D366]/35 transition-all active:scale-[0.99]"
                  >
                    <WhatsAppIcon className="w-5 h-5" />
                    <span>Book Now</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </a>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <a
                      href={STUDIO_PROFILE.messengerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#181611] px-3 py-2.5 text-xs font-semibold text-white hover:opacity-90 transition-opacity"
                    >
                      <MessageCircleIcon className="w-3.5 h-3.5 text-[#E7D1AA]" />
                      <span>Messenger</span>
                    </a>
                    <a
                      href={facebookUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D8CCB2] bg-[#F8F3E6] px-3 py-2.5 text-xs font-semibold text-[#181611] hover:bg-white transition-colors"
                    >
                      <FacebookIcon className="w-3.5 h-3.5 text-[#7A5E21]" />
                      <span>Facebook</span>
                    </a>
                    <a
                      href={STUDIO_PROFILE.youtubeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D8CCB2] bg-white px-3 py-2.5 text-xs font-semibold text-[#181611] hover:border-[#DC2626] hover:text-[#DC2626] transition-colors"
                    >
                      <YouTubeIcon className="w-3.5 h-3.5 text-[#DC2626]" />
                      <span>YouTube</span>
                    </a>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#D8CCB2] bg-white px-3 py-2.5 text-xs font-semibold text-[#181611] hover:border-[#8B6A21] hover:text-[#8B6A21] transition-colors"
                    >
                      <MailIcon className="w-3.5 h-3.5 text-[#7A5E21]" />
                      <span>Email Us</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Simple Concierge Process & Direct Studio Map Link */}
            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-[#2E291F] bg-[#14120E] p-6 sm:p-8 text-[#F4EFE4] space-y-5 h-full flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-4">
                    <div>
                      <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#E7D1AA]">
                        Simple Booking Flow
                      </p>
                      <h3 className="font-editorial text-2xl font-semibold text-white mt-0.5">
                        What Happens Next?
                      </h3>
                    </div>
                    <span className="rounded-full border border-[#CAA650]/40 bg-[#CAA650]/15 px-3 py-0.5 text-[10.5px] font-semibold text-[#E7D1AA]">
                      Instant Reply
                    </span>
                  </div>

                  <ul className="space-y-4 text-xs sm:text-sm text-[#C7BFA9]">
                    <li className="flex items-start gap-3">
                      <span className="font-mono-code font-bold text-[#E7D1AA]">01.</span>
                      <span>
                        Message us directly on WhatsApp or Messenger with your Wedding, Holud, or
                        Reception dates.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-mono-code font-bold text-[#E7D1AA]">02.</span>
                      <span>
                        Our coordinator confirms crew availability and shares a clear, itemized BDT
                        quote.
                      </span>
                    </li>
                    <li className="flex items-start gap-3">
                      <span className="font-mono-code font-bold text-[#E7D1AA]">03.</span>
                      <span>
                        Visit our Grand Haque Tower studio on Mizan Rd, Feni or confirm advance to
                        lock your date.
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <Link
                    href="/contact"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#CAA650]/45 bg-white/5 px-4 py-3 text-xs sm:text-sm font-semibold text-[#E7D1AA] hover:bg-[#CAA650]/15 transition-colors"
                  >
                    <MapPinIcon className="w-4 h-4" />
                    <span>View Interactive Google Map &amp; Hours</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
