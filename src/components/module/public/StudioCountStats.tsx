'use client';

import React, { useEffect, useRef, useState } from 'react';

interface StatConfig {
  label: string;
  target: number;
  suffix: string;
  startFrom?: number;
}

const STUDIO_STATS: StatConfig[] = [
  { label: 'Since', target: 2015, suffix: '', startFrom: 1995 },
  { label: 'Events', target: 1500, suffix: '+', startFrom: 0 },
  { label: 'Photos', target: 80, suffix: 'k+', startFrom: 0 },
  { label: 'Clients', target: 40, suffix: 'k+', startFrom: 0 },
];

interface StudioCountStatsProps {
  accentColor: string;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function StudioCountStats({ accentColor }: StudioCountStatsProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hasAnimatedRef = useRef(false);
  const [values, setValues] = useState<number[]>(() => STUDIO_STATS.map((s) => s.target));

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    let rafId = 0;

    const startAnimation = () => {
      if (hasAnimatedRef.current) return;
      hasAnimatedRef.current = true;

      if (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        setValues(STUDIO_STATS.map((s) => s.target));
        return;
      }

      const durationMs = 1600;
      let startTime: number | null = null;

      const step = (timestamp: number) => {
        if (startTime === null) {
          startTime = timestamp;
        }
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / durationMs, 1);
        const eased = easeOutCubic(progress);

        setValues(
          STUDIO_STATS.map((stat) => {
            const origin = stat.startFrom ?? 0;
            return Math.round(origin + (stat.target - origin) * eased);
          }),
        );

        if (progress < 1) {
          rafId = window.requestAnimationFrame(step);
        }
      };

      rafId = window.requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          startAnimation();
        }
      },
      { threshold: 0.2 },
    );

    observer.observe(el);

    return () => {
      observer.disconnect();
      if (rafId) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, []);

  const renderStat = (stat: StatConfig, idx: number) => (
    <div key={stat.label} className="text-center space-y-1.5 sm:space-y-2">
      <p
        className="font-editorial text-sm sm:text-base font-medium tracking-wide"
        style={{ color: accentColor }}
      >
        {stat.label}
      </p>
      <p className="text-[2rem] sm:text-[2.45rem] lg:text-[2.65rem] font-normal tracking-tight text-[#181611] leading-none tabular-nums">
        {values[idx]}
        {stat.suffix}
      </p>
    </div>
  );

  return (
    <div
      ref={containerRef}
      className="mx-auto max-w-5xl pt-10 sm:pt-14 grid grid-cols-2 md:grid-cols-[1fr_1fr_auto_1fr_1fr] items-center gap-y-8 gap-x-6 md:gap-x-4"
    >
      {renderStat(STUDIO_STATS[0], 0)}
      {renderStat(STUDIO_STATS[1], 1)}

      <div
        aria-hidden="true"
        className="hidden md:block h-14 w-[1.5px] bg-[#C8C2B8] mx-auto"
      />

      {renderStat(STUDIO_STATS[2], 2)}
      {renderStat(STUDIO_STATS[3], 3)}
    </div>
  );
}
