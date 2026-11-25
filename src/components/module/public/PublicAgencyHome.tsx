'use client';

import React, { useMemo, useState } from 'react';
import {
  EventType,
  PortfolioItem,
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
  PublicBranding,
  StudioPackage,
} from '@/types/event-management';
import { isSystemPortfolioEventSlug } from '@/lib/heroSlider';
import { STUDIO_PROFILE } from '@/lib/publicStorefront';
import { formatPoisha, cn } from '@/lib/utils';
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ExternalLinkIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
} from '@/components/shared/Icons';
import { EditorialBentoShowcase } from './EditorialBentoShowcase';
import { HeroPhotoSlider } from './HeroPhotoSlider';
import { InquiryForm } from './InquiryForm';
import { PublicPortfolioShowcase } from './PublicPortfolioShowcase';
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
  servicesEvent?: PortfolioShowcaseEvent | null;
  galleryImages?: PortfolioMediaItem[];
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
  editorialGridEvent = null,
  servicesEvent = null,
  galleryImages = [],
  isBackendConnected,
  initialPackageId = '',
}: PublicAgencyHomeProps) {
  const [selectedPackageId, setSelectedPackageId] = useState<string>(initialPackageId);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('ALL');
  const [inquiryTitle, setInquiryTitle] = useState<string>('');
  const [inquiryNotes, setInquiryNotes] = useState<string>('');

  const primary = branding.themeTokens.primaryColor || '#181611';
  const accent = branding.themeTokens.accentColor || '#8B6A21';

  const contactPhone = branding.contactDetails?.phone || STUDIO_PROFILE.phoneIntl;
  const contactEmail = branding.contactDetails?.email || STUDIO_PROFILE.email;
  const contactAddress = branding.contactDetails?.address || STUDIO_PROFILE.address;
  const facebookUrl = branding.contactDetails?.website || STUDIO_PROFILE.facebookUrl;

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

  const filteredPackages = useMemo(() => {
    if (selectedCategoryId === 'ALL') return packages;
    return packages.filter((p) => p.eventTypeId === selectedCategoryId);
  }, [packages, selectedCategoryId]);

  const handleSelectPackage = (id: string) => {
    setSelectedPackageId(id);
    document.getElementById('inquire')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSelectComboPreset = (preset: (typeof STUDIO_PROFILE.comboPresets)[number]) => {
    setSelectedPackageId('');
    setInquiryTitle(preset.title);
    setInquiryNotes(preset.notes);
    document.getElementById('inquire')?.scrollIntoView({ behavior: 'smooth' });
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

          <StudioCountStats accentColor={accent} />
        </div>
      </section>

      {/* =====================================================================
          STUDIO SERVICES SHOWCASE: Dashboard-Controlled 3-Card Row + See All CTA
      ===================================================================== */}
      <PublicServicesSection
        branding={branding}
        servicesEvent={servicesEvent}
        portfolioEvents={allClientPortfolios}
        galleryImages={galleryImages}
        legacyPortfolio={portfolio}
        variant="home"
      />

      {/* =====================================================================
          EDITORIAL MOSAIC: 4-Frame Asymmetric Quality Photo Showcase
      ===================================================================== */}
      <EditorialBentoShowcase
        branding={branding}
        editorialEvent={editorialGridEvent}
        portfolioEvents={allClientPortfolios}
        galleryImages={galleryImages}
        legacyPortfolio={portfolio}
      />

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
                Compare Transparent Pricing
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
    </main>
  );
}
