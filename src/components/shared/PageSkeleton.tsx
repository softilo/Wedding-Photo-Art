import React from 'react';

export type PageSkeletonVariant =
  | 'storefront'
  | 'about'
  | 'contact'
  | 'services'
  | 'career'
  | 'portfolios'
  | 'album'
  | 'auth'
  | 'dashboard-shell'
  | 'admin-overview'
  | 'admin-table'
  | 'admin-detail'
  | 'admin-calendar'
  | 'admin-gallery'
  | 'admin-finance'
  | 'admin-settings';

interface PageSkeletonProps {
  label?: string;
  variant?: PageSkeletonVariant;
}

function PublicNavbarSkeleton() {
  return (
    <div className="border-b border-[#E5DFD0]/90 bg-[#F9F8F5]">
      <div className="h-[2px] w-full bg-[#CAA650]/45" />
      <div className="mx-auto flex h-16 sm:h-[68px] max-w-6xl items-center justify-between gap-3 px-3 sm:px-6">
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <div className="h-10 w-10 sm:w-24 rounded-full skeleton-bone shrink-0" />
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="h-10 w-10 rounded-xl skeleton-bone border border-[#DFCEAA]" />
            <div className="space-y-1.5">
              <div className="h-4 w-32 sm:w-40 rounded-md skeleton-bone" />
              <div className="h-2.5 w-24 sm:w-32 rounded-md skeleton-bone" />
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="hidden md:block h-9 w-9 rounded-full skeleton-bone" />
          <div className="hidden md:block h-9 w-9 rounded-full skeleton-bone" />
          <div className="hidden lg:block h-9 w-36 rounded-full skeleton-bone" />
          <div className="h-9 w-24 rounded-full skeleton-bone" />
        </div>
      </div>
    </div>
  );
}

function PublicFooterSkeleton() {
  return (
    <div className="mt-auto bg-[#14120E] border-t border-[#2E291F]">
      <div className="h-[2px] w-full bg-[#CAA650]/35" />
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6">
        <div className="grid gap-10 md:grid-cols-12">
          <div className="md:col-span-5 space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="h-14 w-14 rounded-2xl skeleton-bone-dark border border-[#CAA650]/30" />
              <div className="space-y-2">
                <div className="h-5 w-40 rounded-md skeleton-bone-dark" />
                <div className="h-3 w-48 rounded-md skeleton-bone-dark" />
              </div>
            </div>
            <div className="space-y-2 max-w-md">
              <div className="h-3.5 w-full rounded-md skeleton-bone-dark" />
              <div className="h-3.5 w-4/5 rounded-md skeleton-bone-dark" />
            </div>
            <div className="flex flex-wrap gap-2 pt-1">
              <div className="h-8 w-44 rounded-xl skeleton-bone-dark" />
              <div className="h-8 w-24 rounded-xl skeleton-bone-dark" />
              <div className="h-8 w-24 rounded-xl skeleton-bone-dark" />
            </div>
          </div>
          <div className="md:col-span-2 space-y-2.5">
            <div className="h-3.5 w-16 rounded-md skeleton-bone-dark" />
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-3 w-28 rounded-md skeleton-bone-dark" />
            ))}
          </div>
          <div className="md:col-span-3 space-y-3">
            <div className="h-3.5 w-36 rounded-md skeleton-bone-dark" />
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-3.5 w-full rounded-md skeleton-bone-dark" />
            ))}
          </div>
          <div className="md:col-span-2 space-y-2.5 md:flex md:flex-col md:items-end">
            <div className="h-3.5 w-24 rounded-md skeleton-bone-dark" />
            <div className="h-3 w-28 rounded-md skeleton-bone-dark" />
            <div className="h-8 w-28 rounded-lg skeleton-bone-dark" />
          </div>
        </div>
        <div className="mt-12 flex flex-col md:flex-row items-center justify-between gap-3 border-t border-white/10 pt-6">
          <div className="h-3 w-52 rounded-md skeleton-bone-dark" />
          <div className="h-3 w-44 rounded-md skeleton-bone-dark" />
          <div className="h-3 w-36 rounded-md skeleton-bone-dark" />
        </div>
      </div>
    </div>
  );
}

function StudioCountStatsSkeleton() {
  return (
    <div className="mx-auto grid max-w-3xl grid-cols-2 sm:grid-cols-4 gap-6 pt-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="flex flex-col items-center space-y-2">
          <div className="h-8 sm:h-10 w-20 rounded-lg skeleton-bone" />
          <div className="h-3 w-16 rounded-md skeleton-bone" />
        </div>
      ))}
    </div>
  );
}

function StorefrontSkeletonBody() {
  return (
    <>
      {/* Full-Bleed Natural Hero Slider Skeleton */}
      <div className="w-full relative bg-[#14120E]">
        <div className="w-full aspect-[16/10] sm:aspect-[16/9] max-h-[680px] skeleton-bone-dark" />
        <div className="py-2 bg-[#F9F8F5] flex justify-center">
          <div className="h-2.5 w-20 rounded-full skeleton-bone" />
        </div>
      </div>

      {/* Centered Editorial Intro + Milestones Skeleton */}
      <section className="border-b border-[#E5DFD0] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 lg:py-24 text-center space-y-6 sm:space-y-8">
          <div className="h-6 w-44 mx-auto rounded-md skeleton-bone" />
          <div className="space-y-2.5 max-w-2xl mx-auto">
            <div className="h-9 sm:h-12 w-full rounded-xl skeleton-bone" />
            <div className="h-9 sm:h-12 w-3/4 mx-auto rounded-xl skeleton-bone" />
          </div>
          <div className="space-y-2 max-w-xl mx-auto">
            <div className="h-3.5 w-full rounded-md skeleton-bone" />
            <div className="h-3.5 w-4/5 mx-auto rounded-md skeleton-bone" />
          </div>
          <StudioCountStatsSkeleton />
        </div>
      </section>

      {/* Our Services 3-Card Carousel Skeleton */}
      <section className="border-b border-[#E5DFD0] bg-white">
        <div className="mx-auto max-w-[1380px] px-4 py-14 sm:px-6 sm:py-20 lg:px-10 space-y-12">
          <div className="text-center space-y-2.5">
            <div className="h-11 sm:h-13 w-64 mx-auto rounded-xl skeleton-bone" />
            <div className="h-4 w-72 max-w-full mx-auto rounded-md skeleton-bone" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={i === 2 ? 'hidden sm:block' : i === 3 ? 'hidden lg:block' : ''}
              >
                <div className="aspect-[4/3] w-full skeleton-bone" />
                <div className="pt-6 px-2 flex flex-col items-center space-y-3">
                  <div className="h-7 w-48 rounded-lg skeleton-bone" />
                  <div className="h-3.5 w-64 max-w-full rounded-md skeleton-bone" />
                  <div className="h-3.5 w-52 max-w-full rounded-md skeleton-bone" />
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center">
            <div className="h-12 w-48 rounded-full skeleton-bone" />
          </div>
        </div>
      </section>

      {/* Our Recent Works (Cinema Theater + Gallery Stills) Skeleton */}
      <section className="border-b border-[#E5DFD0] bg-white">
        <div className="mx-auto max-w-[1380px] px-4 py-12 sm:px-6 sm:py-16 lg:px-10 space-y-8">
          <div className="flex flex-col items-center space-y-2.5">
            <div className="h-11 sm:h-13 w-72 max-w-full rounded-xl skeleton-bone" />
            <div className="h-4 w-60 rounded-md skeleton-bone" />
          </div>
          <div className="rounded-2xl sm:rounded-3xl border border-[#2E291F] bg-[#14120E] p-3.5 sm:p-7 space-y-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div className="h-3.5 w-44 rounded-full skeleton-bone-dark" />
              <div className="hidden sm:block h-3 w-48 rounded-full skeleton-bone-dark" />
            </div>
            <div className="grid lg:grid-cols-12 gap-5 sm:gap-6 items-start">
              <div className="lg:col-span-8 aspect-video w-full rounded-xl sm:rounded-2xl skeleton-bone-dark" />
              <div className="lg:col-span-4 space-y-2.5">
                {[1, 2, 3].map((idx) => (
                  <div
                    key={idx}
                    className="rounded-2xl border border-white/10 bg-white/[0.02] p-2.5 flex items-center gap-3"
                  >
                    <div className="h-16 w-24 shrink-0 rounded-xl skeleton-bone-dark" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-16 rounded-md skeleton-bone-dark" />
                      <div className="h-3.5 w-28 rounded-md skeleton-bone-dark" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Studio Concierge & Visit Card Skeleton */}
      <section className="bg-[#F3EFE6]">
        <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 space-y-8">
          <div className="flex flex-col items-center space-y-3">
            <div className="h-6 w-48 rounded-full skeleton-bone" />
            <div className="h-10 w-80 max-w-full rounded-xl skeleton-bone" />
          </div>
          <div className="grid gap-8 lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-7 atelier-card p-6 sm:p-8 bg-white space-y-5">
              <div className="h-7 w-56 rounded-lg skeleton-bone" />
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2 h-14 rounded-xl skeleton-bone" />
                <div className="h-12 rounded-xl skeleton-bone" />
                <div className="h-12 rounded-xl skeleton-bone" />
              </div>
              <div className="h-12 w-full rounded-xl skeleton-bone" />
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 rounded-xl skeleton-bone" />
                ))}
              </div>
            </div>
            <div className="lg:col-span-5 rounded-2xl border border-[#2E291F] bg-[#14120E] p-6 sm:p-8 space-y-5">
              <div className="h-7 w-48 rounded-lg skeleton-bone-dark" />
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 rounded-lg skeleton-bone-dark" />
              ))}
              <div className="h-11 w-full rounded-xl skeleton-bone-dark" />
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function AboutSkeletonBody() {
  return (
    <>
      {/* Obsidian Editorial Hero */}
      <section className="border-b border-[#2E291F] bg-[#14120E]">
        <div className="mx-auto max-w-[1380px] px-4 py-16 sm:py-20 sm:px-6 lg:px-10 grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8 space-y-4">
            <div className="h-6 w-48 rounded-full skeleton-bone-dark" />
            <div className="h-12 sm:h-14 w-96 max-w-full rounded-xl skeleton-bone-dark" />
            <div className="space-y-2 max-w-2xl">
              <div className="h-4 w-full rounded-md skeleton-bone-dark" />
              <div className="h-4 w-4/5 rounded-md skeleton-bone-dark" />
            </div>
          </div>
          <div className="lg:col-span-4 flex flex-wrap lg:justify-end gap-3">
            <div className="h-10 w-32 rounded-full skeleton-bone-dark" />
            <div className="h-10 w-36 rounded-full skeleton-bone-dark" />
          </div>
        </div>
      </section>

      {/* Studio Story + Stats */}
      <section className="border-b border-[#E5DFD0] bg-white">
        <div className="mx-auto max-w-5xl px-4 py-14 sm:px-6 sm:py-20 text-center space-y-6">
          <div className="h-3.5 w-36 mx-auto rounded-md skeleton-bone" />
          <div className="h-11 w-96 max-w-full mx-auto rounded-xl skeleton-bone" />
          <div className="space-y-2 max-w-2xl mx-auto">
            <div className="h-4 w-full rounded-md skeleton-bone" />
            <div className="h-4 w-5/6 mx-auto rounded-md skeleton-bone" />
          </div>
          <StudioCountStatsSkeleton />
        </div>
      </section>

      {/* Founder Spotlight & Creative Team */}
      <section className="border-b border-[#E5DFD0] bg-[#F9F8F5]">
        <div className="mx-auto max-w-[1380px] px-4 py-16 sm:px-6 sm:py-20 lg:px-10 space-y-12">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div className="space-y-2.5 max-w-2xl">
              <div className="h-6 w-36 rounded-full skeleton-bone" />
              <div className="h-10 w-80 max-w-full rounded-xl skeleton-bone" />
              <div className="h-4 w-96 max-w-full rounded-md skeleton-bone" />
            </div>
            <div className="h-10 w-36 rounded-full skeleton-bone shrink-0" />
          </div>

          {/* Highlighted High-Contrast Founder Spotlight Card */}
          <div className="rounded-3xl border-2 border-[#DFCEAA] bg-white overflow-hidden shadow-sm grid lg:grid-cols-12 items-stretch">
            <div className="lg:col-span-5 min-h-[360px] sm:min-h-[440px] lg:min-h-[520px] bg-[#14120E] border-b-2 lg:border-b-0 lg:border-r-2 border-[#DFCEAA] p-4">
              <div className="h-7 w-36 rounded-full skeleton-bone-dark" />
            </div>
            <div className="lg:col-span-7 bg-[#FCF9F2] p-7 sm:p-10 lg:p-12 flex flex-col justify-center space-y-6">
              <div className="space-y-3">
                <div className="h-7 w-64 max-w-full rounded-full skeleton-bone" />
                <div className="flex flex-wrap items-center gap-3">
                  <div className="h-12 w-72 max-w-full rounded-xl skeleton-bone" />
                  <div className="h-7 w-40 rounded-full skeleton-bone" />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-7 w-24 rounded-lg skeleton-bone" />
                  ))}
                </div>
              </div>
              <div className="h-[2px] w-20 rounded-full skeleton-bone" />
              <div className="space-y-2 max-w-2xl">
                <div className="h-4 w-full rounded-md skeleton-bone" />
                <div className="h-4 w-11/12 rounded-md skeleton-bone" />
                <div className="h-4 w-3/4 rounded-md skeleton-bone" />
              </div>
              <div className="h-16 w-full rounded-2xl border border-[#DFCEAA] skeleton-bone" />
              <div className="flex flex-wrap gap-2.5">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-9 w-36 rounded-full skeleton-bone" />
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <div className="h-11 w-52 rounded-full skeleton-bone" />
                <div className="h-11 w-48 rounded-full skeleton-bone" />
              </div>
            </div>
          </div>

          {/* Remaining Team Grid */}
          <div className="grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="atelier-card overflow-hidden bg-white">
                <div className="aspect-[4/3] w-full skeleton-bone" />
                <div className="p-6 space-y-2.5">
                  <div className="h-5 w-28 rounded-full skeleton-bone" />
                  <div className="h-7 w-48 rounded-lg skeleton-bone" />
                  <div className="h-3.5 w-40 rounded-md skeleton-bone" />
                  <div className="pt-2 space-y-1.5">
                    <div className="h-3 w-full rounded-md skeleton-bone" />
                    <div className="h-3 w-5/6 rounded-md skeleton-bone" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function ContactSkeletonBody() {
  return (
    <>
      {/* Obsidian Editorial Hero */}
      <section className="border-b border-[#2E291F] bg-[#14120E]">
        <div className="mx-auto max-w-[1380px] px-4 py-14 sm:py-18 sm:px-6 lg:px-10 grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7 space-y-3.5">
            <div className="h-6 w-52 rounded-full skeleton-bone-dark" />
            <div className="h-12 sm:h-14 w-96 max-w-full rounded-xl skeleton-bone-dark" />
            <div className="space-y-2 max-w-2xl">
              <div className="h-4 w-full rounded-md skeleton-bone-dark" />
              <div className="h-4 w-4/5 rounded-md skeleton-bone-dark" />
            </div>
          </div>
          <div className="lg:col-span-5 flex flex-wrap lg:justify-end gap-2.5">
            <div className="h-10 w-36 rounded-full skeleton-bone-dark" />
            <div className="h-10 w-36 rounded-full skeleton-bone-dark" />
            <div className="h-10 w-40 rounded-full skeleton-bone-dark" />
          </div>
        </div>
      </section>

      {/* Split Concierge + Google Maps Skeleton */}
      <section className="mx-auto max-w-[1380px] w-full px-4 py-14 sm:px-6 sm:py-16 lg:px-10">
        <div className="grid gap-8 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
            <div className="atelier-card p-6 sm:p-7 space-y-5 bg-white flex-1">
              <div className="border-b border-[#ECE6D8] pb-4 space-y-2">
                <div className="h-3 w-36 rounded-md skeleton-bone" />
                <div className="h-8 w-56 rounded-lg skeleton-bone" />
              </div>
              <div className="space-y-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-start gap-3.5">
                    <div className="h-10 w-10 rounded-xl skeleton-bone shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-28 rounded-md skeleton-bone" />
                      <div className="h-4 w-full rounded-md skeleton-bone" />
                    </div>
                  </div>
                ))}
              </div>
              <div className="space-y-3 pt-4 border-t border-[#ECE6D8]">
                <div className="h-12 w-full rounded-xl skeleton-bone" />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 rounded-xl skeleton-bone" />
                  ))}
                </div>
              </div>
            </div>
            <div className="rounded-2xl border border-[#2E291F] bg-[#14120E] p-6 space-y-3">
              <div className="h-5 w-44 rounded-md skeleton-bone-dark" />
              <div className="h-4 w-full rounded-md skeleton-bone-dark" />
              <div className="h-4 w-3/4 rounded-md skeleton-bone-dark" />
            </div>
          </div>

          <div className="lg:col-span-7 rounded-3xl border border-[#DFCEAA] bg-white overflow-hidden flex flex-col">
            <div className="p-5 sm:p-6 border-b border-[#ECE6D8] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="h-3 w-48 rounded-md skeleton-bone" />
                <div className="h-7 w-72 max-w-full rounded-lg skeleton-bone" />
              </div>
              <div className="flex gap-2">
                <div className="h-9 w-32 rounded-full skeleton-bone" />
                <div className="h-9 w-36 rounded-full skeleton-bone" />
              </div>
            </div>
            <div className="min-h-[400px] sm:min-h-[480px] lg:min-h-[540px] w-full skeleton-bone" />
          </div>
        </div>
      </section>
    </>
  );
}

function ServicesSkeletonBody() {
  return (
    <>
      <section className="border-b border-[#2E291F] bg-[#14120E]">
        <div className="mx-auto max-w-6xl px-4 py-14 sm:py-18 sm:px-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-3 max-w-2xl flex-1">
            <div className="h-6 w-52 rounded-full skeleton-bone-dark" />
            <div className="h-12 w-96 max-w-full rounded-xl skeleton-bone-dark" />
            <div className="h-4 w-full max-w-xl rounded-md skeleton-bone-dark" />
          </div>
          <div className="flex gap-3 shrink-0">
            <div className="h-10 w-32 rounded-full skeleton-bone-dark" />
            <div className="h-10 w-36 rounded-full skeleton-bone-dark" />
          </div>
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto max-w-[1380px] px-4 py-14 sm:px-6 sm:py-20 lg:px-10 space-y-12">
          <div className="text-center space-y-2.5">
            <div className="h-11 w-64 mx-auto rounded-xl skeleton-bone" />
            <div className="h-4 w-80 max-w-full mx-auto rounded-md skeleton-bone" />
          </div>
          <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i}>
                <div className="aspect-[4/3] w-full skeleton-bone" />
                <div className="pt-6 px-2 flex flex-col items-center space-y-3">
                  <div className="h-7 w-48 rounded-lg skeleton-bone" />
                  <div className="h-3.5 w-64 max-w-full rounded-md skeleton-bone" />
                  <div className="h-4 w-28 rounded-md skeleton-bone" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

function CareerSkeletonBody() {
  return (
    <>
      <section className="border-b border-[#E5DFD0] bg-[#14120E]">
        <div className="mx-auto max-w-5xl px-4 py-16 sm:py-20 sm:px-6 space-y-5">
          <div className="h-6 w-48 rounded-full skeleton-bone-dark" />
          <div className="h-12 w-96 max-w-full rounded-xl skeleton-bone-dark" />
          <div className="space-y-2 max-w-2xl">
            <div className="h-4 w-full rounded-md skeleton-bone-dark" />
            <div className="h-4 w-4/5 rounded-md skeleton-bone-dark" />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-5xl w-full px-4 py-14 sm:px-6 space-y-10">
        <div className="grid gap-5 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="rounded-2xl border border-[#E5DFD0] bg-white p-6 space-y-4"
            >
              <div className="h-3 w-40 rounded-md skeleton-bone" />
              <div className="h-7 w-56 max-w-full rounded-lg skeleton-bone" />
              <div className="space-y-2">
                <div className="h-3.5 w-full rounded-md skeleton-bone" />
                <div className="h-3.5 w-5/6 rounded-md skeleton-bone" />
              </div>
              <div className="h-4 w-36 rounded-md skeleton-bone" />
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-[#DFCEAA] bg-[#F8F3E6] p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2 flex-1 max-w-xl">
            <div className="h-3.5 w-44 rounded-md skeleton-bone" />
            <div className="h-8 w-72 max-w-full rounded-lg skeleton-bone" />
            <div className="h-4 w-full rounded-md skeleton-bone" />
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <div className="h-10 w-36 rounded-full skeleton-bone" />
            <div className="h-10 w-40 rounded-full skeleton-bone" />
          </div>
        </div>
      </section>
    </>
  );
}

function AdminOverviewSkeletonBody() {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="admin-card px-3.5 py-3 flex items-center justify-between gap-2.5">
            <div className="space-y-2 flex-1">
              <div className="h-3 w-20 rounded-md skeleton-bone" />
              <div className="h-6 w-24 rounded-md skeleton-bone" />
            </div>
            <div className="h-8 w-8 rounded-lg skeleton-bone shrink-0" />
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-7 admin-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-4 w-40 rounded-md skeleton-bone" />
            <div className="h-7 w-44 rounded-lg skeleton-bone" />
          </div>
          <div className="h-56 w-full rounded-xl skeleton-bone" />
        </div>
        <div className="lg:col-span-5 admin-card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div className="h-4 w-36 rounded-md skeleton-bone" />
            <div className="h-4 w-24 rounded-md skeleton-bone" />
          </div>
          {[1, 2, 3].map((row) => (
            <div key={row} className="h-16 w-full rounded-lg skeleton-bone" />
          ))}
        </div>
      </div>

      <div className="admin-card p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-40 rounded-md skeleton-bone" />
          <div className="h-4 w-20 rounded-md skeleton-bone" />
        </div>
        <div className="grid gap-2.5 md:grid-cols-2">
          {[1, 2, 3, 4].map((row) => (
            <div key={row} className="h-16 w-full rounded-lg skeleton-bone" />
          ))}
        </div>
      </div>
    </div>
  );
}

export function PageSkeleton({
  label = 'Loading workspace...',
  variant = 'admin-overview',
}: PageSkeletonProps) {
  if (variant === 'storefront') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        className="min-h-screen flex flex-col bg-[#F9F8F5]"
      >
        <span className="sr-only">{label}</span>
        <PublicNavbarSkeleton />
        <StorefrontSkeletonBody />
        <PublicFooterSkeleton />
      </div>
    );
  }

  if (variant === 'about') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        className="min-h-screen flex flex-col bg-[#F9F8F5]"
      >
        <span className="sr-only">{label}</span>
        <PublicNavbarSkeleton />
        <AboutSkeletonBody />
        <PublicFooterSkeleton />
      </div>
    );
  }

  if (variant === 'contact') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        className="min-h-screen flex flex-col bg-[#F9F8F5]"
      >
        <span className="sr-only">{label}</span>
        <PublicNavbarSkeleton />
        <ContactSkeletonBody />
        <PublicFooterSkeleton />
      </div>
    );
  }

  if (variant === 'services') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        className="min-h-screen flex flex-col bg-[#F9F8F5]"
      >
        <span className="sr-only">{label}</span>
        <PublicNavbarSkeleton />
        <ServicesSkeletonBody />
        <PublicFooterSkeleton />
      </div>
    );
  }

  if (variant === 'career') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        className="min-h-screen flex flex-col bg-[#F9F8F5]"
      >
        <span className="sr-only">{label}</span>
        <PublicNavbarSkeleton />
        <CareerSkeletonBody />
        <PublicFooterSkeleton />
      </div>
    );
  }

  if (variant === 'portfolios') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        className="min-h-screen flex flex-col bg-[#F9F8F5]"
      >
        <span className="sr-only">{label}</span>
        <PublicNavbarSkeleton />

        <div className="border-b border-[#E5DFD0] bg-[#F9F8F5]">
          <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-16 space-y-6">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-3 max-w-2xl flex-1">
                <div className="h-6 w-48 rounded-full skeleton-bone" />
                <div className="h-11 w-80 max-w-full rounded-xl skeleton-bone" />
                <div className="h-4 w-96 max-w-full rounded-md skeleton-bone" />
              </div>
              <div className="h-9 w-28 rounded-xl skeleton-bone shrink-0" />
            </div>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2">
              <div className="flex flex-wrap gap-2">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-8 w-28 rounded-full skeleton-bone" />
                ))}
              </div>
              <div className="h-9 w-full md:w-64 rounded-xl skeleton-bone" />
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-6xl px-4 py-12 sm:px-6">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="atelier-card overflow-hidden bg-white">
                <div className="aspect-[4/3] w-full skeleton-bone" />
                <div className="p-5 space-y-2.5">
                  <div className="h-5 w-20 rounded-full skeleton-bone" />
                  <div className="h-6 w-4/5 rounded-lg skeleton-bone" />
                </div>
                <div className="px-5 py-3 border-t border-[#ECE6D8] bg-[#F8F3E6]/50">
                  <div className="h-4 w-32 rounded-md skeleton-bone" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <PublicFooterSkeleton />
      </div>
    );
  }

  if (variant === 'album') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        className="min-h-screen flex flex-col bg-[#F9F8F5]"
      >
        <span className="sr-only">{label}</span>

        {/* Sticky Album Bar Skeleton */}
        <div className="border-b border-stone-200/80 bg-[#F9F8F5]">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-full skeleton-bone" />
              <div className="space-y-1.5">
                <div className="h-2.5 w-28 rounded-md skeleton-bone" />
                <div className="h-3.5 w-44 rounded-md skeleton-bone" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-8 w-20 rounded-full skeleton-bone" />
              <div className="h-8 w-24 rounded-full skeleton-bone" />
            </div>
          </div>
        </div>

        {/* Cover Hero Skeleton */}
        <div className="border-b border-stone-200/70 bg-white">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 py-10 sm:py-12">
            <div className="grid gap-8 lg:grid-cols-12 items-center">
              <div className="lg:col-span-7 flex justify-center">
                <div className="w-full max-w-[560px] aspect-[4/3] rounded-2xl p-3 border border-stone-200 bg-[#F9F8F5]">
                  <div className="h-full w-full rounded-xl skeleton-bone" />
                </div>
              </div>
              <div className="lg:col-span-5 space-y-5 flex flex-col items-center lg:items-start">
                <div className="h-3 w-40 rounded-md skeleton-bone" />
                <div className="h-10 w-72 max-w-full rounded-xl skeleton-bone" />
                <div className="h-px w-16 bg-stone-300" />
                <div className="flex gap-2">
                  <div className="h-7 w-28 rounded-full skeleton-bone" />
                  <div className="h-7 w-28 rounded-full skeleton-bone" />
                </div>
                <div className="flex gap-3 pt-1">
                  <div className="h-10 w-40 rounded-full skeleton-bone" />
                  <div className="h-10 w-36 rounded-full skeleton-bone" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar + Staggered Masonry Grid */}
        <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 space-y-8">
          <div className="flex items-center justify-between border-b border-stone-200/80 pb-4">
            <div className="h-9 w-72 rounded-full skeleton-bone" />
            <div className="hidden sm:block h-4 w-56 rounded-md skeleton-bone" />
          </div>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {['3/4', '4/3', '4/5', '3/2', '3/4', '4/3'].map((ratio, idx) => (
              <div
                key={idx}
                style={{ aspectRatio: ratio }}
                className="break-inside-avoid rounded-xl skeleton-bone border border-stone-200/70"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'auth') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        className="min-h-dvh w-full flex flex-col bg-[#14120E] lg:bg-[#F9F8F5] lg:items-center lg:justify-center lg:px-4 lg:py-12"
      >
        <span className="sr-only">{label}</span>
        <div className="w-full flex-1 flex flex-col lg:flex-none lg:max-w-4xl lg:grid lg:grid-cols-12 lg:rounded-[1.125rem] lg:border lg:border-[#e5dfd0] lg:overflow-hidden lg:bg-white lg:shadow-[0_28px_64px_-24px_rgba(24,22,17,0.16)]">
          <div className="lg:col-span-5 bg-[#14120E] px-5 pt-[calc(1.75rem+env(safe-area-inset-top))] pb-10 sm:px-8 lg:p-9 flex flex-col justify-between lg:space-y-8">
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="h-11 w-11 rounded-xl skeleton-bone-dark border border-[#CAA650]/40" />
                  <div className="space-y-1.5">
                    <div className="h-5 w-32 rounded-md skeleton-bone-dark" />
                    <div className="h-2.5 w-20 rounded-md skeleton-bone-dark" />
                  </div>
                </div>
                <div className="lg:hidden h-6 w-20 rounded-full skeleton-bone-dark" />
              </div>
              <div className="hidden lg:block space-y-3">
                <div className="h-3 w-28 rounded-md skeleton-bone-dark" />
                <div className="h-9 w-40 rounded-lg skeleton-bone-dark" />
                <div className="h-3.5 w-full rounded-md skeleton-bone-dark" />
                <div className="h-3.5 w-5/6 rounded-md skeleton-bone-dark" />
              </div>
            </div>
            <div className="hidden lg:block pt-6 border-t border-white/10 space-y-2">
              <div className="h-3.5 w-36 rounded-md skeleton-bone-dark" />
              <div className="h-3 w-full rounded-md skeleton-bone-dark" />
            </div>
          </div>

          <div className="lg:col-span-7 bg-white flex-1 rounded-t-[26px] -mt-5 px-5 pt-6 pb-6 sm:px-8 lg:mt-0 lg:rounded-none lg:p-10 space-y-5">
            <div className="space-y-2">
              <div className="h-8 w-28 rounded-lg skeleton-bone" />
              <div className="h-4 w-72 max-w-full rounded-md skeleton-bone" />
            </div>
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <div className="h-3 w-24 rounded-md skeleton-bone" />
                <div className="h-11 w-full rounded-xl skeleton-bone" />
              </div>
              <div className="space-y-1.5">
                <div className="h-3 w-20 rounded-md skeleton-bone" />
                <div className="h-11 w-full rounded-xl skeleton-bone" />
              </div>
              <div className="h-11 w-full rounded-xl skeleton-bone" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'dashboard-shell') {
    return (
      <div
        role="status"
        aria-busy="true"
        aria-label={label}
        className="admin-shell min-h-screen flex bg-[var(--admin-canvas)] text-[var(--admin-text)]"
      >
        <span className="sr-only">{label}</span>

        <aside className="hidden lg:flex lg:fixed lg:inset-y-0 lg:left-0 w-56 flex-col border-r border-[var(--admin-border)] bg-[var(--admin-sidebar)]">
          <div className="h-12 px-4 flex items-center gap-2.5 border-b border-[var(--admin-border)]">
            <div className="h-7 w-7 rounded-lg skeleton-bone" />
            <div className="h-4 w-28 rounded-md skeleton-bone" />
          </div>
          <div className="flex-1 px-3 py-3 space-y-2">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="h-8 w-full rounded-lg skeleton-bone" />
            ))}
            <div className="pt-3 border-t border-[var(--admin-border)] space-y-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-8 w-full rounded-lg skeleton-bone" />
              ))}
            </div>
          </div>
          <div className="p-3 border-t border-[var(--admin-border)] flex items-center gap-2">
            <div className="h-7 w-7 rounded-full skeleton-bone" />
            <div className="flex-1 space-y-1">
              <div className="h-3 w-20 rounded-md skeleton-bone" />
              <div className="h-2.5 w-14 rounded-md skeleton-bone" />
            </div>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0 lg:pl-56">
          <div className="h-14 border-b border-[var(--admin-border)] bg-[var(--admin-header)] px-4 sm:px-6 flex items-center justify-between">
            <div className="h-4 w-32 rounded-md skeleton-bone" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full sm:rounded-lg skeleton-bone" />
              <div className="h-8 w-8 sm:w-24 rounded-full sm:rounded-lg skeleton-bone" />
              <div className="hidden sm:block h-8 w-24 rounded-lg skeleton-bone" />
            </div>
          </div>
          <div className="flex-1 p-3.5 sm:p-6 pb-24 lg:pb-6 max-w-7xl w-full mx-auto">
            <AdminOverviewSkeletonBody />
          </div>
          <div className="lg:hidden fixed bottom-0 inset-x-0 h-16 border-t border-[var(--admin-border)] bg-[var(--admin-header)] px-3 grid grid-cols-5 items-center gap-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className="h-6 w-10 rounded-full skeleton-bone" />
                <div className="h-2.5 w-10 rounded skeleton-bone" />
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'admin-table') {
    return (
      <div role="status" aria-busy="true" aria-label={label} className="space-y-5">
        <span className="sr-only">{label}</span>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-lg skeleton-bone" />
            <div className="h-3.5 w-72 max-w-full rounded-md skeleton-bone" />
          </div>
          <div className="h-9 w-36 rounded-lg skeleton-bone" />
        </div>

        <div className="admin-card p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-8 w-24 rounded-lg skeleton-bone" />
            ))}
          </div>
          <div className="h-9 w-full sm:w-64 rounded-lg skeleton-bone" />
        </div>

        <div className="admin-card divide-y divide-[var(--admin-border)] overflow-hidden">
          {[1, 2, 3, 4, 5, 6].map((row) => (
            <div key={row} className="p-4 flex flex-wrap items-center justify-between gap-4">
              <div className="space-y-2 flex-1 min-w-[200px]">
                <div className="flex items-center gap-2">
                  <div className="h-5 w-24 rounded-md skeleton-bone" />
                  <div className="h-5 w-20 rounded-full skeleton-bone" />
                </div>
                <div className="h-4 w-64 max-w-full rounded-md skeleton-bone" />
                <div className="h-3 w-48 max-w-full rounded-md skeleton-bone" />
              </div>
              <div className="flex items-center gap-2.5 shrink-0">
                <div className="h-6 w-24 rounded-md skeleton-bone" />
                <div className="h-8 w-24 rounded-lg skeleton-bone" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'admin-detail') {
    return (
      <div role="status" aria-busy="true" aria-label={label} className="space-y-5">
        <span className="sr-only">{label}</span>
        <div className="h-8 w-36 rounded-lg skeleton-bone" />

        <div className="admin-card p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex gap-2">
                <div className="h-5 w-28 rounded-md skeleton-bone" />
                <div className="h-5 w-24 rounded-full skeleton-bone" />
              </div>
              <div className="h-7 w-72 max-w-full rounded-lg skeleton-bone" />
              <div className="h-3.5 w-56 rounded-md skeleton-bone" />
            </div>
            <div className="flex gap-2">
              <div className="h-9 w-28 rounded-lg skeleton-bone" />
              <div className="h-9 w-32 rounded-lg skeleton-bone" />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="rounded-lg border border-[var(--admin-border)] p-3 space-y-2">
                <div className="h-3 w-20 rounded-md skeleton-bone" />
                <div className="h-6 w-24 rounded-md skeleton-bone" />
              </div>
            ))}
          </div>
        </div>

        <div className="flex gap-2 border-b border-[var(--admin-border)] pb-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-28 rounded-lg skeleton-bone" />
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7 admin-card p-5 space-y-3">
            <div className="h-5 w-44 rounded-md skeleton-bone" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-14 w-full rounded-lg skeleton-bone" />
            ))}
          </div>
          <div className="lg:col-span-5 admin-card p-5 space-y-3">
            <div className="h-5 w-36 rounded-md skeleton-bone" />
            <div className="h-44 w-full rounded-lg skeleton-bone" />
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'admin-calendar') {
    return (
      <div role="status" aria-busy="true" aria-label={label} className="space-y-5">
        <span className="sr-only">{label}</span>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-48 rounded-lg skeleton-bone" />
            <div className="h-3.5 w-72 max-w-full rounded-md skeleton-bone" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-32 rounded-lg skeleton-bone" />
            <div className="h-9 w-28 rounded-lg skeleton-bone" />
          </div>
        </div>

        <div className="grid gap-5 lg:grid-cols-12">
          <div className="lg:col-span-8 admin-card p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="h-6 w-36 rounded-md skeleton-bone" />
              <div className="flex gap-2">
                <div className="h-8 w-8 rounded-lg skeleton-bone" />
                <div className="h-8 w-8 rounded-lg skeleton-bone" />
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: 35 }).map((_, idx) => (
                <div key={idx} className="h-16 sm:h-20 rounded-lg skeleton-bone" />
              ))}
            </div>
          </div>

          <div className="lg:col-span-4 admin-card p-5 space-y-4">
            <div className="h-5 w-40 rounded-md skeleton-bone" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 w-full rounded-lg skeleton-bone" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'admin-gallery') {
    return (
      <div role="status" aria-busy="true" aria-label={label} className="space-y-5">
        <span className="sr-only">{label}</span>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-52 rounded-lg skeleton-bone" />
            <div className="h-3.5 w-80 max-w-full rounded-md skeleton-bone" />
          </div>
          <div className="h-9 w-36 rounded-lg skeleton-bone" />
        </div>

        <div className="admin-card p-5 flex flex-wrap items-center justify-between gap-4">
          <div className="h-12 flex-1 min-w-[220px] rounded-lg skeleton-bone" />
          <div className="h-10 w-36 rounded-lg skeleton-bone" />
        </div>

        <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div key={i} className="admin-card overflow-hidden">
              <div className="aspect-[4/3] w-full skeleton-bone" />
              <div className="p-3 space-y-2">
                <div className="h-3.5 w-3/4 rounded-md skeleton-bone" />
                <div className="h-3 w-1/2 rounded-md skeleton-bone" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'admin-finance') {
    return (
      <div role="status" aria-busy="true" aria-label={label} className="space-y-6">
        <span className="sr-only">{label}</span>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="h-6 w-56 rounded-lg skeleton-bone" />
            <div className="h-3.5 w-80 max-w-full rounded-md skeleton-bone" />
          </div>
          <div className="flex gap-2">
            <div className="h-9 w-36 rounded-lg skeleton-bone" />
            <div className="h-9 w-28 rounded-lg skeleton-bone" />
          </div>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="admin-card p-4 space-y-2.5">
              <div className="h-3 w-28 rounded-md skeleton-bone" />
              <div className="h-7 w-32 rounded-lg skeleton-bone" />
              <div className="h-2.5 w-24 rounded-md skeleton-bone" />
            </div>
          ))}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <div className="admin-card p-5 h-64 skeleton-bone" />
          <div className="admin-card p-5 h-64 skeleton-bone" />
        </div>

        <div className="admin-card p-5 space-y-3">
          <div className="h-5 w-44 rounded-md skeleton-bone" />
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-12 w-full rounded-lg skeleton-bone" />
          ))}
        </div>
      </div>
    );
  }

  if (variant === 'admin-settings') {
    return (
      <div role="status" aria-busy="true" aria-label={label} className="space-y-6">
        <span className="sr-only">{label}</span>
        <div className="space-y-2">
          <div className="h-6 w-52 rounded-lg skeleton-bone" />
          <div className="h-3.5 w-96 max-w-full rounded-md skeleton-bone" />
        </div>

        <div className="grid gap-6 lg:grid-cols-12 items-start">
          <div className="lg:col-span-7 admin-card p-6 space-y-5">
            <div className="h-5 w-56 rounded-md skeleton-bone" />
            <div className="grid sm:grid-cols-2 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div key={i} className="space-y-2">
                  <div className="h-3 w-28 rounded-md skeleton-bone" />
                  <div className="h-10 w-full rounded-lg skeleton-bone" />
                </div>
              ))}
            </div>
            <div className="h-10 w-44 rounded-lg skeleton-bone" />
          </div>
          <div className="lg:col-span-5 admin-card p-6 space-y-4">
            <div className="h-3.5 w-36 rounded-md skeleton-bone" />
            <div className="h-44 w-full rounded-2xl skeleton-bone" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div role="status" aria-busy="true" aria-label={label}>
      <span className="sr-only">{label}</span>
      <AdminOverviewSkeletonBody />
    </div>
  );
}
