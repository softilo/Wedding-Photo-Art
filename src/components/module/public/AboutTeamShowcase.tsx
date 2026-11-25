'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import {
  PortfolioItem,
  PortfolioMediaItem,
  PortfolioShowcaseEvent,
  PublicBranding,
} from '@/types/event-management';
import { BrandMark } from '@/components/common/BrandMark';
import { buildWhatsAppUrl } from '@/components/common/FloatingWhatsAppButton';
import { STUDIO_PROFILE } from '@/lib/publicStorefront';
import { ResolvedTeamMember, resolveAboutTeam } from '@/lib/studioAboutTeam';
import { StudioCountStats } from './StudioCountStats';
import {
  ArrowRightIcon,
  CameraIcon,
  ExternalLinkIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
  UsersIcon,
  WhatsAppIcon,
} from '@/components/shared/Icons';

interface AboutTeamShowcaseProps {
  branding: PublicBranding;
  aboutTeamEvent?: PortfolioShowcaseEvent | null;
  portfolioEvents: PortfolioShowcaseEvent[];
  galleryImages: PortfolioMediaItem[];
  legacyPortfolio: PortfolioItem[];
}

function FeaturedFounderSpotlight({
  member,
  branding,
  accent,
}: {
  member: ResolvedTeamMember;
  branding: PublicBranding;
  accent: string;
}) {
  const specialtyTags = member.specialty
    ? member.specialty
        .split(/[•|,]/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];

  return (
    <article className="rounded-3xl border-2 border-[#DFCEAA] bg-white text-[#181611] overflow-hidden shadow-[0_20px_50px_-20px_rgba(24,22,17,0.16)] grid lg:grid-cols-12 items-stretch">
      {/* Left: Portrait Photo */}
      <div className="lg:col-span-5 relative min-h-[360px] sm:min-h-[440px] lg:min-h-[520px] bg-[#14120E] border-b-2 lg:border-b-0 lg:border-r-2 border-[#DFCEAA] overflow-hidden">
        {member.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={member.imageUrl}
            srcSet={member.srcSet}
            sizes="(max-width: 1023px) 100vw, 560px"
            alt={member.imageAlt}
            loading="eager"
            decoding="sync"
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        ) : (
          <div className="flex h-full min-h-[340px] w-full flex-col items-center justify-center p-8 text-[#E7D1AA]">
            <BrandMark
              logoUrl={branding.logoUrl}
              alt={branding.displayName}
              size={84}
              variant="dark"
              className="rounded-2xl opacity-80 mb-3"
            />
            <span className="text-xs font-semibold uppercase tracking-[0.2em] text-[#CAA650]">
              {branding.displayName}
            </span>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[#14120E]/75 to-transparent lg:hidden" />

        <div className="absolute top-4 left-4">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#CAA650]/70 bg-[#14120E]/90 backdrop-blur-sm px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-[#F3DFB8] shadow-md">
            <CameraIcon className="w-3.5 h-3.5" />
            <span>Founder &amp; Lead</span>
          </span>
        </div>
      </div>

      {/* Right: Detailed Bio & Creative Vision */}
      <div className="lg:col-span-7 bg-gradient-to-br from-white via-[#FCF9F2] to-[#F7F1E2] p-7 sm:p-10 lg:p-12 flex flex-col justify-center space-y-6">
        <div className="space-y-3">
          {member.role && (
            <span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#181611] px-4 py-1.5 text-[11px] sm:text-xs font-bold uppercase tracking-[0.18em] text-[#E7D1AA] shadow-xs">
              <span className="h-1.5 w-1.5 rounded-full bg-[#CAA650]" />
              <span>{member.role}</span>
            </span>
          )}
          <div className="flex flex-wrap items-center gap-x-3.5 gap-y-2 pt-1">
            <h3 className="font-editorial text-3xl sm:text-4xl lg:text-[3.1rem] font-semibold text-[#181611] leading-[1.06] tracking-[-0.015em]">
              {member.name}
            </h3>
            {member.subtitle && (
              <span className="inline-flex items-center rounded-full border border-[#DFCEAA] bg-[#F8F3E6] px-3.5 py-1 text-xs sm:text-sm font-semibold text-[#7A5E21]">
                {member.subtitle}
              </span>
            )}
          </div>
          {specialtyTags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              {specialtyTags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center rounded-lg border border-[#E5D7B8] bg-white/95 px-3 py-1 text-xs sm:text-[13px] font-semibold text-[#4A4131]"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="h-[2px] w-20 bg-gradient-to-r from-[#8B6A21] to-[#DFCEAA] rounded-full" />

        {member.bio && (
          <p className="text-[15.5px] sm:text-[17px] text-[#2E291F] leading-[1.78] font-normal max-w-2xl">
            {member.bio}
          </p>
        )}

        {member.quote && (
          <blockquote className="rounded-2xl border border-[#DFCEAA] border-l-4 border-l-[#8B6A21] bg-[#F8F3E6]/85 px-5 py-3.5 font-editorial italic text-lg sm:text-[1.32rem] font-medium text-[#181611] leading-snug">
            &ldquo;{member.quote}&rdquo;
          </blockquote>
        )}

        {/* Personal Contact & Social Links */}
        {(member.phone || member.instagram || member.location) && (
          <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs sm:text-[13px]">
            {member.phone && (
              <>
                <a
                  href={`tel:${member.phone.replace(/[^\d+]/g, '')}`}
                  className="inline-flex items-center gap-2 rounded-full border border-[#D4C094] bg-white px-4 py-2 font-mono-code font-bold text-[#181611] shadow-xs hover:border-[#8B6A21] hover:bg-[#F8F3E6] transition-colors"
                >
                  <PhoneIcon className="w-3.5 h-3.5 text-[#8B6A21]" />
                  <span>{member.phone}</span>
                </a>
                <a
                  href={buildWhatsAppUrl(member.phone, member.name)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-full bg-[#16A34A] px-4 py-2 font-bold text-white shadow-sm hover:bg-[#15803D] transition-colors"
                >
                  <WhatsAppIcon className="w-4 h-4" />
                  <span>WhatsApp</span>
                </a>
              </>
            )}

            {member.instagram && (
              <a
                href={`https://www.instagram.com/${member.instagram.replace(/^@+/, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#D4C094] bg-white px-4 py-2 font-semibold text-[#181611] shadow-xs hover:border-[#8B6A21] hover:bg-[#F8F3E6] transition-colors"
              >
                <svg className="w-3.5 h-3.5 text-[#8B6A21]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                <span>@{member.instagram.replace(/^@+/, '')}</span>
              </a>
            )}

            {member.location && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#E5D7B8] bg-[#FAF6EC] px-4 py-2 font-semibold text-[#3D3528]">
                <MapPinIcon className="w-3.5 h-3.5 text-[#8B6A21]" />
                <span>{member.location}</span>
              </span>
            )}
          </div>
        )}

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <Link
            href="/#inquire"
            className="inline-flex items-center gap-2 rounded-full px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md hover:opacity-95 transition-opacity"
            style={{ backgroundColor: accent }}
          >
            <span>Book With Our Lead Crew</span>
            <ArrowRightIcon className="w-4 h-4" />
          </Link>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 rounded-full border-2 border-[#181611]/20 bg-white px-6 py-3 text-xs sm:text-sm font-bold text-[#181611] hover:border-[#8B6A21] hover:bg-[#F8F3E6] transition-colors"
          >
            <span>View Signature Albums</span>
          </Link>
        </div>
      </div>
    </article>
  );
}

function TeamMemberCard({
  member,
  branding,
  accent,
}: {
  member: ResolvedTeamMember;
  branding: PublicBranding;
  accent: string;
}) {
  return (
    <article className="group flex flex-col rounded-2xl border border-[#E5DFD0] bg-white overflow-hidden shadow-2xs transition-all duration-300 hover:border-[#CAA650] hover:shadow-md hover:-translate-y-0.5">
      <div className="relative aspect-[4/4.2] w-full overflow-hidden bg-[#EFECE3]">
        {member.imageUrl ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={member.imageUrl}
            srcSet={member.srcSet}
            sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 420px"
            alt={member.imageAlt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center bg-[#1C1913] text-[#E7D1AA] p-6">
            <BrandMark
              logoUrl={branding.logoUrl}
              alt={branding.displayName}
              size={64}
              variant="dark"
              className="rounded-2xl opacity-75 mb-2.5"
            />
            <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#CAA650]">
              {branding.displayName}
            </span>
          </div>
        )}
      </div>

      <div className="p-6 sm:p-7 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          {member.role && (
            <span
              className="inline-block rounded-full border border-[#DFCEAA] bg-[#F8F3E6] px-3 py-0.5 text-[10px] font-bold uppercase tracking-[0.14em]"
              style={{ color: accent }}
            >
              {member.role}
            </span>
          )}
          <h4 className="font-editorial text-2xl sm:text-[1.75rem] font-semibold text-[#181611] leading-snug pt-0.5">
            {member.name}
          </h4>
          {member.specialty && (
            <p className="text-xs sm:text-[13px] font-medium italic text-[#6B6352]">
              {member.specialty}
            </p>
          )}
          {member.bio && (
            <p className="pt-2 border-t border-[#ECE6D8] text-xs sm:text-sm text-[#4A4438] leading-[1.72]">
              {member.bio}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}

export function AboutTeamShowcase({
  branding,
  aboutTeamEvent = null,
  portfolioEvents,
  galleryImages,
  legacyPortfolio,
}: AboutTeamShowcaseProps) {
  const accent = branding.themeTokens.accentColor || '#8B6A21';
  const contactPhone = branding.contactDetails?.phone || STUDIO_PROFILE.phoneIntl;
  const contactEmail = branding.contactDetails?.email || STUDIO_PROFILE.email;
  const contactAddress = branding.contactDetails?.address || STUDIO_PROFILE.address;

  const resolved = useMemo(
    () =>
      resolveAboutTeam({
        aboutEvent: aboutTeamEvent,
        brandingName: branding.displayName,
        portfolioEvents,
        galleryImages,
        legacyPortfolio,
      }),
    [aboutTeamEvent, branding.displayName, portfolioEvents, galleryImages, legacyPortfolio],
  );

  const { settings, featuredMember, otherMembers } = resolved;

  return (
    <main className="flex-1 bg-[#F9F8F5] text-[#181611]">
      {/* Dark Obsidian Editorial Hero Banner */}
      <section className="border-b border-[#2E291F] bg-[#14120E] text-[#F4EFE4]">
        <div className="mx-auto max-w-[1380px] px-4 py-16 sm:py-20 sm:px-6 lg:px-10 grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8 space-y-4">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#CAA650]/40 bg-[#CAA650]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E7D1AA]">
              <CameraIcon className="w-3.5 h-3.5" />
              <span>{settings.storyEyebrow}</span>
            </span>
            <h1 className="font-editorial text-4xl sm:text-5xl lg:text-[3.45rem] font-semibold text-white leading-[1.08]">
              About {branding.displayName}
            </h1>
            <p className="text-sm sm:text-base text-[#C7BFA9] max-w-2xl leading-relaxed">
              {settings.storyLead}
            </p>
          </div>

          <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-3">
            <Link
              href="/all-services"
              className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/5 px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#F4EFE4] hover:border-[#CAA650] transition-colors"
            >
              <span>Our Services</span>
            </Link>
            <Link
              href="/#inquire"
              className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
              style={{ backgroundColor: accent }}
            >
              <span>Book Your Date</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Studio Story + Animated Milestones */}
      <section className="border-b border-[#E5DFD0] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 text-center space-y-6">
          <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7A5E21]">
            Our Heritage &amp; Craft
          </p>
          <h2
            className="font-editorial text-[2rem] sm:text-[2.65rem] lg:text-[3rem] font-normal leading-[1.15] tracking-tight"
            style={{ color: accent }}
          >
            {settings.storyTitle}
          </h2>
          <p className="mx-auto max-w-2xl text-sm sm:text-base text-[#4A4438] leading-[1.85]">
            {settings.storyBody}
          </p>

          <StudioCountStats accentColor={accent} />
        </div>
      </section>

      {/* Meet Our Creative Team */}
      <section id="team" className="border-b border-[#E5DFD0] bg-[#F9F8F5] scroll-mt-16">
        <div className="mx-auto max-w-[1380px] px-4 py-16 sm:px-6 sm:py-20 lg:px-10 space-y-10 sm:space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#DFCEAA] bg-white px-3.5 py-1 text-[10.5px] font-bold uppercase tracking-[0.18em] text-[#7A5E21]">
                <UsersIcon className="w-3.5 h-3.5" />
                <span>Meet The Crew</span>
              </div>
              <h2 className="font-editorial text-3xl sm:text-4xl lg:text-[2.85rem] font-semibold text-[#181611] leading-tight">
                The Team Behind Every Frame
              </h2>
              <p className="text-sm text-[#4A4438] leading-relaxed">
                Every wedding, Holud, and family celebration is covered by coordinated in-house
                photographers, cinematographers, and colorists.
              </p>
            </div>

            <Link
              href="/career"
              className="inline-flex items-center gap-2 rounded-full border border-[#D8CCB2] bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#181611] hover:border-[#8B6A21] transition-colors shrink-0"
            >
              <span>Join Our Team</span>
              <ArrowRightIcon className="w-4 h-4" />
            </Link>
          </div>

          {featuredMember ? (
            <div className="space-y-14">
              {/* Highlighted Founder / Owner / Lead Photographer Card */}
              <FeaturedFounderSpotlight
                member={featuredMember}
                branding={branding}
                accent={accent}
              />

              {/* Remaining Creative Team Members Below */}
              {otherMembers.length > 0 && (
                <div className="space-y-7">
                  <div className="flex items-center gap-4">
                    <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#7A5E21] shrink-0">
                      Creative Crew &amp; Specialists ({otherMembers.length})
                    </span>
                    <div className="h-[1px] flex-1 bg-[#DFCEAA]" />
                  </div>

                  <div
                    className={
                      otherMembers.length === 2
                        ? 'grid gap-7 sm:grid-cols-2 max-w-5xl mx-auto'
                        : otherMembers.length === 1
                          ? 'max-w-md mx-auto'
                          : 'grid gap-7 sm:grid-cols-2 lg:grid-cols-3'
                    }
                  >
                    {otherMembers.map((member) => (
                      <TeamMemberCard
                        key={member.id}
                        member={member}
                        branding={branding}
                        accent={accent}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="atelier-card p-10 text-center bg-white text-sm text-[#5A5448]">
              Team details can be added and published anytime from Dashboard → Public Page Setup.
            </div>
          )}
        </div>
      </section>

      {/* Studio Lounge & Direct Contact */}
      <section className="bg-[#F3EFE6]/70">
        <div className="mx-auto max-w-[1380px] px-4 py-14 sm:px-6 sm:py-16 lg:px-10">
          <div className="rounded-3xl border border-[#DFCEAA] bg-white p-6 sm:p-10 grid gap-8 lg:grid-cols-12 items-center shadow-2xs">
            <div className="lg:col-span-7 space-y-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#7A5E21]">
                Studio Lounge • {STUDIO_PROFILE.city}
              </p>
              <h2 className="font-editorial text-3xl sm:text-4xl font-semibold text-[#181611]">
                Visit Our Feni Studio in Person
              </h2>
              <p className="text-sm text-[#4A4438] max-w-xl leading-relaxed">
                Drop by Grand Haque Tower on Mizan Rd to review sample photo-books, meet our leads,
                and plan photography and cinema coverage tailored to your wedding timeline.
              </p>
            </div>

            <div className="lg:col-span-5 space-y-3 text-sm text-[#2E291F] lg:border-l lg:border-[#ECE6D8] lg:pl-8">
              <div className="flex items-start gap-2.5">
                <MapPinIcon className="w-4 h-4 text-[#8B6A21] shrink-0 mt-1" />
                <div>
                  <p className="text-xs sm:text-sm font-medium">{contactAddress}</p>
                  <div className="flex flex-wrap items-center gap-4 mt-1.5">
                    <a
                      href={STUDIO_PROFILE.mapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-semibold hover:underline underline-offset-4"
                      style={{ color: accent }}
                    >
                      <span>Open Google Map</span>
                      <ExternalLinkIcon className="w-3 h-3" />
                    </a>
                    <Link
                      href="/contact"
                      className="inline-flex items-center gap-1 text-xs font-semibold text-[#181611] hover:underline underline-offset-4"
                    >
                      <span>Contact Page &amp; Live Map</span>
                      <ArrowRightIcon className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2.5">
                <PhoneIcon className="w-4 h-4 text-[#8B6A21] shrink-0" />
                <a
                  href={`tel:${contactPhone.replace(/\s+/g, '')}`}
                  className="font-mono-code font-semibold text-xs sm:text-sm hover:underline"
                >
                  {contactPhone} ({STUDIO_PROFILE.phoneDisplay})
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <MailIcon className="w-4 h-4 text-[#8B6A21] shrink-0" />
                <a href={`mailto:${contactEmail}`} className="text-xs sm:text-sm hover:underline">
                  {contactEmail}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
