import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { Navbar } from '@/components/common/Navbar';
import { Footer } from '@/components/common/Footer';
import { buildWhatsAppUrl } from '@/components/common/FloatingWhatsAppButton';
import { PageSkeleton } from '@/components/shared/PageSkeleton';
import { loadPublicStorefront, STUDIO_PROFILE } from '@/lib/publicStorefront';
import {
  ArrowRightIcon,
  CameraIcon,
  FilmIcon,
  MailIcon,
  WhatsAppIcon,
} from '@/components/shared/Icons';

export async function generateMetadata(): Promise<Metadata> {
  const { branding } = await loadPublicStorefront();
  const description = `Join the ${branding.displayName} creative team. Explore roles in photography, cinematography, film editing, and client coordination.`;
  return {
    title: `Career — Join ${branding.displayName}`,
    description,
    alternates: {
      canonical: '/career',
    },
    openGraph: {
      type: 'website',
      url: '/career',
      title: `Career — Join ${branding.displayName}`,
      description,
    },
  };
}

async function CareerContent() {
  const { branding, aboutTeamShowcase } = await loadPublicStorefront();
  const openRoles = aboutTeamShowcase?.profile?.careerRoles || [];
  const accent = branding.themeTokens.accentColor || '#8B6A21';
  const phone = branding.contactDetails?.phone || STUDIO_PROFILE.phoneIntl;
  const email = branding.contactDetails?.email || STUDIO_PROFILE.email;
  const whatsappUrl = buildWhatsAppUrl(phone, branding.displayName);

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F8F5] text-[#181611]">
      <Navbar branding={branding} />

      <main className="flex-1">
        <section className="border-b border-[#E5DFD0] bg-[#14120E] text-[#F4EFE4]">
          <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20 sm:px-6 space-y-5">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#CAA650]/40 bg-[#CAA650]/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#E7D1AA]">
              <CameraIcon className="w-3.5 h-3.5" />
              <span>Studio Careers • {branding.displayName}</span>
            </span>
            <h1 className="font-editorial text-4xl sm:text-5xl font-semibold text-white leading-[1.08]">
              Craft Timeless Wedding Stories{' '}
              <span className="italic text-[#E7D1AA]">With Us.</span>
            </h1>
            <p className="text-sm sm:text-base text-[#C7BFA9] max-w-2xl leading-relaxed">
              We collaborate with thoughtful photographers, cinematographers, and editors who care
              deeply about true-to-life color, quiet dignity, and heartfelt storytelling.
            </p>
          </div>
        </section>

        <section className="mx-auto max-w-5xl px-4 py-14 sm:px-6 space-y-10">
          {openRoles.length > 0 ? (
            <div className="grid gap-5 md:grid-cols-3">
              {openRoles.map((role, idx) => (
                <article
                  key={`${role.title}-${idx}`}
                  className="rounded-2xl border border-[#E5DFD0] bg-white p-6 flex flex-col justify-between gap-5 shadow-2xs"
                >
                  <div className="space-y-2.5">
                    <p className="text-[10.5px] font-bold uppercase tracking-[0.15em] text-[#8B6A21]">
                      {role.type}
                    </p>
                    <h2 className="font-editorial text-2xl font-semibold text-[#181611] leading-snug">
                      {role.title}
                    </h2>
                    <p className="text-xs sm:text-sm text-[#4A4438] leading-relaxed">
                      {role.summary}
                    </p>
                  </div>

                  <a
                    href={`mailto:${email}?subject=${encodeURIComponent(`Career Application — ${role.title}`)}`}
                    className="inline-flex items-center gap-2 text-xs font-semibold hover:underline underline-offset-4"
                    style={{ color: accent }}
                  >
                    <span>Send Portfolio via Email</span>
                    <ArrowRightIcon className="w-3.5 h-3.5" />
                  </a>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-[#E5DFD0] bg-white p-8 text-center text-sm text-[#5A5448]">
              Openings are updated from Dashboard → Public Page Setup. Reach out below to introduce your portfolio anytime.
            </div>
          )}

          <div className="rounded-2xl border border-[#DFCEAA] bg-[#F8F3E6] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-1.5 max-w-xl">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#7A5E21]">
                <FilmIcon className="w-3.5 h-3.5" />
                <span>Share Your Reel or Gallery</span>
              </div>
              <h2 className="font-editorial text-2xl sm:text-3xl font-semibold text-[#181611]">
                Ready to introduce your work?
              </h2>
              <p className="text-xs sm:text-sm text-[#4A4438]">
                Send your Behance, Drive gallery, or YouTube highlight links directly to our studio
                coordinator.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <a
                href={`mailto:${email}?subject=${encodeURIComponent('Portfolio Submission — Wedding PhotoArt Career')}`}
                className="inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:opacity-95 transition-opacity"
                style={{ backgroundColor: accent }}
              >
                <MailIcon className="w-4 h-4" />
                <span>Email Portfolio</span>
              </a>
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full border border-[#D8CCB2] bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-[#181611] hover:border-[#25D366] transition-colors"
              >
                <WhatsAppIcon className="w-4 h-4 text-[#25D366]" />
                <span>WhatsApp Studio</span>
              </a>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 px-2 py-2 text-xs font-semibold text-[#4A4438] hover:text-[#181611]"
              >
                <span>Back Home</span>
                <ArrowRightIcon className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer branding={branding} />
    </div>
  );
}

export default function CareerPage() {
  return (
    <Suspense fallback={<PageSkeleton variant="career" label="Loading studio careers..." />}>
      <CareerContent />
    </Suspense>
  );
}
