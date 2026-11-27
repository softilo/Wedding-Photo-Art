import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { buildWhatsAppUrl } from '@/components/common/FloatingWhatsAppButton';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { JsonLd } from '@/components/shared/JsonLd';
import { loadPublicStorefront, STUDIO_PROFILE } from '@/lib/publicStorefront';
import { buildStudioJsonLdGraph } from '@/lib/seo';
import { resolveAboutTeamFromDb } from '@/lib/studioAboutTeam';
import {
  ArrowRightIcon,
  ClockIcon,
  ExternalLinkIcon,
  FacebookIcon,
  MailIcon,
  MapPinIcon,
  MessageCircleIcon,
  PhoneIcon,
  WhatsAppIcon,
  YouTubeIcon,
} from '@/components/shared/Icons';

export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await loadPublicStorefront();
  const address = branding.contactDetails?.address || STUDIO_PROFILE.address;
  return {
    title: 'Contact & Studio Location',
    description: `Visit ${branding.displayName} at ${address}. Get directions, call, chat on WhatsApp, or request a quote.`,
    alternates: {
      canonical: '/contact',
    },
    openGraph: {
      type: 'website',
      url: '/contact',
      title: `Contact & Studio Location | ${branding.displayName}`,
      description: `Find ${branding.displayName} at ${address}. Call, WhatsApp, or book your event date online.`,
    },
  };
}

async function ContactPageContent() {
  const { branding, packages, portfolioEvents, aboutTeamShowcase, galleryImages } =
    await loadPublicStorefront();

  const { featuredMember } = resolveAboutTeamFromDb({
    aboutTeamShowcase,
    brandingName: branding.displayName,
  });

  const accent = branding.themeTokens.accentColor || '#8B6A21';
  const contactPhone = branding.contactDetails?.phone || STUDIO_PROFILE.phoneIntl;
  const telHref = `tel:${contactPhone.replace(/[^\d+]/g, '')}`;
  const contactEmail = branding.contactDetails?.email || STUDIO_PROFILE.email;
  const contactAddress = branding.contactDetails?.address || STUDIO_PROFILE.address;
  const facebookUrl = branding.contactDetails?.website || STUDIO_PROFILE.facebookUrl;
  const whatsappUrl = buildWhatsAppUrl(contactPhone, branding.displayName);

  const jsonLd = buildStudioJsonLdGraph({
    branding,
    packages,
    portfolioEvents,
    galleryImages,
  });

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F5] text-[#181611]">
      <JsonLd data={jsonLd} />
      <Navbar branding={branding} />

      <main className="flex-1">
        {/* Obsidian Editorial Hero */}
        <section className="border-b border-[#2E291F] bg-[#14120E] text-[#F4EFE4]">
          <div className="mx-auto max-w-[1380px] px-4 py-14 sm:py-18 sm:px-6 lg:px-10 grid gap-8 lg:grid-cols-12 lg:items-end">
            <div className="lg:col-span-7 space-y-3.5">
              <span className="inline-flex items-center gap-2 rounded-full border border-[#CAA650]/40 bg-[#CAA650]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E7D1AA]">
                <MapPinIcon className="w-3.5 h-3.5" />
                <span>{STUDIO_PROFILE.city} • Grand Haque Tower</span>
              </span>
              <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[3.35rem] font-semibold text-white leading-[1.08]">
                Contact <span className="italic text-[#E7D1AA]">{branding.displayName}</span>
              </h1>
              <p className="text-sm sm:text-base text-[#C7BFA9] max-w-2xl leading-relaxed">
                Visit our Feni studio at Grand Haque Tower (5th Floor) on Mizan Rd to review
                sample albums, meet our creative crew, or reserve your Wedding, Holud &amp; Reception
                dates.
              </p>
            </div>

            <div className="lg:col-span-5 flex flex-wrap lg:justify-end gap-2.5">
              <a
                href={telHref}
                className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-4 py-2.5 text-xs sm:text-sm font-mono-code font-semibold text-[#F4EFE4] hover:border-[#CAA650] transition-colors"
              >
                <PhoneIcon className="w-4 h-4 text-[#E7D1AA]" />
                <span>{STUDIO_PROFILE.phoneDisplay}</span>
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#25D366]/45 bg-[#25D366]/15 px-4 py-2.5 text-xs sm:text-sm font-semibold text-[#86EFAC] hover:bg-[#25D366]/25 transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4" />
                <span>WhatsApp Studio</span>
              </a>
              <a
                href={STUDIO_PROFILE.mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
                style={{ backgroundColor: accent }}
              >
                <span>Google Directions</span>
                <ExternalLinkIcon className="w-4 h-4" />
              </a>
            </div>
          </div>
        </section>

        {/* Studio Details + Side-by-Side Google Maps */}
        <section className="mx-auto max-w-[1380px] px-4 py-14 sm:px-6 sm:py-16 lg:px-10">
          <div className="grid gap-8 lg:grid-cols-12 items-stretch">
            {/* Left: Studio Contact, Book Now (WhatsApp) & Socials */}
            <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
              <div className="atelier-card p-6 sm:p-7 space-y-5 bg-white flex-1 flex flex-col justify-between">
                <div className="space-y-5">
                  <div className="border-b border-[#ECE6D8] pb-4 space-y-1">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7A5E21]">
                      Direct Studio Concierge
                    </p>
                    <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#181611]">
                      {branding.displayName} Lounge
                    </h2>
                  </div>

                  <div className="space-y-4 text-sm text-[#3C362B]">
                    <div className="flex items-start gap-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8F3E6] border border-[#DFCEAA] text-[#7A5E21]">
                        <MapPinIcon className="w-4 h-4" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#6B6352]">
                          Studio Address
                        </p>
                        <p className="text-sm text-[#181611] leading-relaxed">{contactAddress}</p>
                        <p className="text-[11px] font-mono-code text-[#6B6352]">
                          Grand Haque Tower • Mizan Rd, Feni, Chattogram
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8F3E6] border border-[#DFCEAA] text-[#7A5E21]">
                        <PhoneIcon className="w-4 h-4" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#6B6352]">
                          Phone &amp; WhatsApp
                        </p>
                        <a
                          href={telHref}
                          className="text-sm font-mono-code font-semibold text-[#181611] hover:underline inline-block"
                        >
                          {contactPhone} ({STUDIO_PROFILE.phoneDisplay})
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8F3E6] border border-[#DFCEAA] text-[#7A5E21]">
                        <MailIcon className="w-4 h-4" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#6B6352]">
                          Studio Email
                        </p>
                        <a
                          href={`mailto:${contactEmail}`}
                          className="text-sm text-[#181611] hover:underline inline-block break-all"
                        >
                          {contactEmail}
                        </a>
                      </div>
                    </div>

                    <div className="flex items-start gap-3.5">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F8F3E6] border border-[#DFCEAA] text-[#7A5E21]">
                        <ClockIcon className="w-4 h-4" />
                      </span>
                      <div className="space-y-1">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#6B6352]">
                          Studio Hours
                        </p>
                        <p className="text-sm text-[#181611]">{STUDIO_PROFILE.studioHours}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4 border-t border-[#ECE6D8]">
                  <a
                    href={whatsappUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] px-5 py-3.5 text-sm sm:text-base font-bold text-white shadow-md shadow-[#16A34A]/25 ring-2 ring-[#25D366]/35 transition-all active:scale-[0.99]"
                  >
                    <WhatsAppIcon className="w-5 h-5" />
                    <span>Book Now</span>
                    <ArrowRightIcon className="w-4 h-4" />
                  </a>

                  <div className="grid grid-cols-2 gap-2">
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

              <div className="rounded-2xl border border-[#DFCEAA] bg-[#F8F3E6] p-5 flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-[#7A5E21]">
                    Meet Our Team Lead
                  </p>
                  <p className="font-editorial text-xl font-semibold text-[#181611]">
                    {featuredMember
                      ? `${featuredMember.name} & Team`
                      : `${branding.displayName} Team`}
                  </p>
                </div>
                <Link
                  href="/about"
                  className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#D8CCB2] px-4 py-2 text-xs font-semibold text-[#181611] hover:border-[#8B6A21] transition-colors shrink-0"
                >
                  <span>About Studio</span>
                  <ArrowRightIcon className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right: Interactive Google Maps Integration */}
            <div
              id="studio-map"
              className="lg:col-span-7 rounded-3xl border border-[#DFCEAA] bg-white overflow-hidden shadow-sm scroll-mt-20 flex flex-col"
            >
              <div className="p-5 sm:p-6 border-b border-[#ECE6D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
                <div className="space-y-1">
                  <p className="text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7A5E21]">
                    Google Maps Location • {STUDIO_PROFILE.studioGeo.lat.toFixed(4)}° N,{' '}
                    {STUDIO_PROFILE.studioGeo.lng.toFixed(4)}° E
                  </p>
                  <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#181611]">
                    Grand Haque Tower, Mizan Rd, Feni
                  </h2>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <a
                    href={STUDIO_PROFILE.bingMapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#D8CCB2] bg-[#F8F3E6] px-3.5 py-2 text-xs font-semibold text-[#181611] hover:bg-white transition-colors"
                  >
                    <span>Bing Directions</span>
                    <ExternalLinkIcon className="w-3.5 h-3.5 text-[#7A5E21]" />
                  </a>
                  <a
                    href={STUDIO_PROFILE.mapsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
                    style={{ backgroundColor: accent }}
                  >
                    <MapPinIcon className="w-3.5 h-3.5" />
                    <span>Open Google Maps</span>
                  </a>
                </div>
              </div>

              <div className="relative flex-1 min-h-[400px] sm:min-h-[480px] lg:min-h-[540px] w-full bg-[#EFECE3]">
                <iframe
                  title={`${branding.displayName} — Grand Haque Tower, Mizan Rd, Feni Google Map`}
                  src={STUDIO_PROFILE.googleMapsEmbedUrl}
                  className="absolute inset-0 h-full w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                  allowFullScreen
                />
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer branding={branding} />
    </div>
  );
}

export default function ContactPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="contact" label="Loading studio contact map..." />}>
      <ContactPageContent />
    </Suspense>
  );
}
