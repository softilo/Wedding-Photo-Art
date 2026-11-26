'use client';

import React, { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/service/auth';
import { PublicBranding } from '@/types/event-management';
import { resolvePublicBranding, STUDIO_PROFILE } from '@/lib/publicStorefront';
import { BrandMark } from '@/components/common/BrandMark';
import {
  ArrowRightIcon,
  ExternalLinkIcon,
  MapPinIcon,
  ShieldCheckIcon,
} from '@/components/shared/Icons';

export function LoginForm({
  callbackUrl,
  branding,
}: {
  callbackUrl?: string;
  branding?: PublicBranding | null;
}) {
  const router = useRouter();
  const [showPassword, setShowPassword] = useState(false);
  const [state, formAction, isPending] = useActionState(login, {
    success: false,
    message: '',
  });

  const resolvedBrand = resolvePublicBranding(branding);
  const accent = resolvedBrand.themeTokens.accentColor || '#8B6A21';
  const secondary = resolvedBrand.themeTokens.secondaryColor || '#CAA650';

  useEffect(() => {
    if (state.success && state.redirectTo) {
      router.push(state.redirectTo);
      router.refresh();
    }
  }, [state, router]);

  return (
    <div className="min-h-dvh w-full flex flex-col bg-[#14120E] lg:bg-[#F9F8F5] lg:items-center lg:justify-center lg:px-4 lg:py-12 overflow-x-hidden">
      <div className="w-full flex-1 flex flex-col lg:flex-none lg:max-w-4xl lg:grid lg:grid-cols-12 lg:rounded-[1.125rem] lg:border lg:border-[#e5dfd0] lg:overflow-hidden lg:shadow-[0_28px_64px_-24px_rgba(24,22,17,0.16)] lg:bg-white">
        <div className="lg:col-span-5 bg-[#14120E] text-[#F4EFE4] px-4 pt-[calc(0.875rem+env(safe-area-inset-top))] pb-7 sm:px-8 lg:p-9 flex flex-col justify-between relative overflow-hidden shrink-0">
          <div
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 12% 15%, ${secondary}, transparent 55%), radial-gradient(circle at 88% 85%, ${accent}, transparent 50%)`,
            }}
          />
          <div className="relative lg:space-y-6">
            <div className="flex items-center justify-between gap-3">
              <div className="inline-flex items-center gap-2.5 sm:gap-3 text-white min-w-0">
                <BrandMark
                  logoUrl={resolvedBrand.logoUrl}
                  alt={resolvedBrand.displayName}
                  size={40}
                  variant="dark"
                  className="rounded-xl shadow-md shrink-0"
                />
                <div className="min-w-0 leading-none">
                  <span className="font-editorial text-lg sm:text-2xl font-semibold block truncate">
                    {resolvedBrand.displayName}
                  </span>
                  <span className="text-[9.5px] sm:text-[10px] uppercase tracking-[0.2em] text-[#E7D1AA] block mt-0.5 sm:mt-1">
                    {STUDIO_PROFILE.city}
                  </span>
                </div>
              </div>

              <span className="lg:hidden shrink-0 rounded-full border border-[#E7D1AA]/35 bg-[#E7D1AA]/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[#E7D1AA]">
                Team Portal
              </span>
            </div>

            <div className="hidden lg:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[#E7D1AA]">
                {STUDIO_PROFILE.tagline}
              </p>
              <h1 className="font-editorial text-3xl sm:text-4xl font-semibold tracking-tight leading-tight text-white mt-1.5">
                Team Portal
              </h1>
              <p className="mt-3 text-sm text-[#C7BFA9] leading-relaxed">
                Sign in to manage Wedding, Holud &amp; Reception inquiries, craft itemized quotes,
                verify advance deposits, dispatch cinematography crew, and curate client digital
                albums.
              </p>
            </div>
          </div>

          <div className="hidden lg:block relative pt-7 mt-8 border-t border-white/10 space-y-3 text-xs text-[#C7BFA9]">
            <div className="flex items-center gap-2 text-white font-semibold">
              <ShieldCheckIcon className="w-4 h-4 text-[#E7D1AA]" />
              <span>Role-Scoped Studio Access</span>
            </div>
            <p>Coordinators, Accountants, and Production Crew see only their dedicated tools.</p>
            <div className="flex items-start gap-2 pt-1 text-[11px] text-[#9C937E]">
              <MapPinIcon className="w-3.5 h-3.5 text-[#E7D1AA] shrink-0 mt-0.5" />
              <span>{STUDIO_PROFILE.address}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 bg-white flex-1 flex flex-col justify-between rounded-t-[24px] -mt-3.5 relative z-10 px-4 pt-4 pb-[calc(0.875rem+env(safe-area-inset-bottom))] sm:px-8 lg:mt-0 lg:rounded-none lg:p-10">
          <div>
            <h2 className="font-editorial text-[22px] sm:text-3xl font-semibold text-[#181611] leading-tight">
              Sign In
            </h2>
            <p className="text-xs sm:text-sm text-[#6B6352] mt-0.5 line-clamp-1 sm:line-clamp-none">
              Enter your studio credentials to open the {resolvedBrand.displayName} workspace.
            </p>

            <form action={formAction} className="mt-3.5 sm:mt-6 space-y-3 sm:space-y-4">
              {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
              {state.message && !state.success && (
                <div className="rounded-xl border border-[#B8933C] bg-[#F8F3E6] px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#5C4414]">
                  {state.message}
                </div>
              )}

              <div>
                <label className="block text-[10.5px] sm:text-xs font-semibold uppercase tracking-wider text-[#4A4438] mb-1">
                  Email Address
                </label>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  placeholder="studio@weddingphotoart.com"
                  className="w-full h-11 lg:h-auto rounded-xl border border-[#D8CCB2] bg-[#F9F8F5] px-3.5 lg:py-2.5 text-base sm:text-sm text-[#181611] placeholder:text-[#8A7F69] outline-none focus:border-[#8B6A21] focus:bg-white focus:ring-2 focus:ring-[#CAA650]/25 transition-all"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[10.5px] sm:text-xs font-semibold uppercase tracking-wider text-[#4A4438]">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="px-2 py-0.5 -mr-2 text-xs font-semibold hover:underline cursor-pointer"
                    style={{ color: accent }}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
                <input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="••••••••"
                  className="w-full h-11 lg:h-auto rounded-xl border border-[#D8CCB2] bg-[#F9F8F5] px-3.5 lg:py-2.5 text-base sm:text-sm text-[#181611] placeholder:text-[#8A7F69] outline-none focus:border-[#8B6A21] focus:bg-white focus:ring-2 focus:ring-[#CAA650]/25 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                style={{ backgroundColor: accent }}
                className="mt-1 sm:mt-2 inline-flex w-full h-11 lg:h-auto items-center justify-center gap-2 rounded-xl px-5 lg:py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 active:scale-[0.98] transition-all disabled:opacity-60 cursor-pointer"
              >
                <span>{isPending ? 'Signing In...' : 'Enter Workspace'}</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="mt-3 sm:mt-6 pt-2.5 sm:pt-5 border-t border-[#ECE6D8] flex flex-wrap items-center justify-between gap-2 text-xs text-[#6B6352]">
            <span>Looking for the public storefront?</span>
            <a
              href="/?external=1"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline underline-offset-4 inline-flex items-center gap-1"
              style={{ color: accent }}
            >
              <span>Open Website</span>
              <ExternalLinkIcon className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
