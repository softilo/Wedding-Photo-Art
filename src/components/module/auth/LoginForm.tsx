'use client';

import React, { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { login } from '@/service/auth';
import { PublicBranding } from '@/types/event-management';
import { resolvePublicBranding, STUDIO_PROFILE } from '@/lib/publicStorefront';
import { BrandMark } from '@/components/common/BrandMark';
import { ArrowRightIcon, MapPinIcon, ShieldCheckIcon } from '@/components/shared/Icons';

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
    <div className="min-h-screen flex items-center justify-center bg-[#F9F8F5] px-4 py-12">
      <div className="w-full max-w-4xl grid lg:grid-cols-12 atelier-card overflow-hidden shadow-[0_28px_64px_-24px_rgba(24,22,17,0.16)] bg-white">
        <div className="lg:col-span-5 bg-[#14120E] text-[#F4EFE4] p-8 sm:p-9 flex flex-col justify-between relative overflow-hidden">
          <div
            className="absolute inset-0 opacity-25 pointer-events-none"
            style={{
              background: `radial-gradient(circle at 12% 15%, ${secondary}, transparent 55%), radial-gradient(circle at 88% 85%, ${accent}, transparent 50%)`,
            }}
          />
          <div className="relative space-y-6">
            <Link
              href="/"
              className="inline-flex items-center gap-3.5 text-white hover:opacity-95 transition-opacity"
            >
              <BrandMark
                logoUrl={resolvedBrand.logoUrl}
                alt={resolvedBrand.displayName}
                size={56}
                variant="dark"
                className="rounded-2xl shadow-md"
              />
              <div className="leading-none">
                <span className="font-editorial text-2xl font-semibold block">
                  {resolvedBrand.displayName}
                </span>
                <span className="text-[10px] uppercase tracking-[0.2em] text-[#E7D1AA] block mt-1">
                  {STUDIO_PROFILE.city}
                </span>
              </div>
            </Link>

            <div>
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

          <div className="relative pt-7 mt-8 border-t border-white/10 space-y-3 text-xs text-[#C7BFA9]">
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

        <div className="lg:col-span-7 p-8 sm:p-10 bg-white">
          <h2 className="font-editorial text-3xl font-semibold text-[#181611]">Sign In</h2>
          <p className="text-sm text-[#6B6352] mt-1">
            Enter your studio credentials to open the {resolvedBrand.displayName} workspace.
          </p>

          <form action={formAction} className="mt-6 space-y-4">
            {callbackUrl && <input type="hidden" name="callbackUrl" value={callbackUrl} />}
            {state.message && !state.success && (
              <div className="rounded-xl border border-[#B8933C] bg-[#F8F3E6] px-4 py-3 text-sm font-medium text-[#5C4414]">
                {state.message}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4438] mb-1.5">
                Email Address
              </label>
              <input
                name="email"
                type="email"
                required
                placeholder="studio@weddingphotoart.com"
                className="w-full rounded-xl border border-[#D8CCB2] bg-[#F9F8F5] px-3.5 py-2.5 text-sm text-[#181611] placeholder:text-[#8A7F69] outline-none focus:border-[#8B6A21] focus:bg-white focus:ring-2 focus:ring-[#CAA650]/25 transition-all"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#4A4438]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="text-xs font-semibold hover:underline cursor-pointer"
                  style={{ color: accent }}
                >
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
              <input
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="••••••••"
                className="w-full rounded-xl border border-[#D8CCB2] bg-[#F9F8F5] px-3.5 py-2.5 text-sm text-[#181611] placeholder:text-[#8A7F69] outline-none focus:border-[#8B6A21] focus:bg-white focus:ring-2 focus:ring-[#CAA650]/25 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              style={{ backgroundColor: accent }}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold text-white shadow-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-60 cursor-pointer"
            >
              <span>{isPending ? 'Signing In...' : 'Enter Workspace'}</span>
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-5 border-t border-[#ECE6D8] flex items-center justify-between text-xs text-[#6B6352]">
            <span>Looking for the public storefront?</span>
            <Link
              href="/"
              className="font-semibold underline underline-offset-4"
              style={{ color: accent }}
            >
              Return Home
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
