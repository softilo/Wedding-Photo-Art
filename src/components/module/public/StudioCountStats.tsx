'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { StudioMilestoneItem } from '@/types/event-management';

interface StudioCountStatsProps {
  accentColor: string;
  stats?: StudioMilestoneItem[] | null;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function StudioCountStats({ accentColor, stats }: StudioCountStatsProps) {
  const activeStats = useMemo(
    () => (stats || []).filter((s) => s.label.trim().length > 0),
    [stats],
  );
  const statsKey = useMemo(
    () => activeStats.map((s) => `${s.label}:${s.target}:${s.startFrom}`).join('|'),
    [activeStats],
  );
  const containerRef = useRef<HTMLDivElement | null>(null);
  const animatedKeyRef = useRef<string>('');
  const [animState, setAnimState] = useState<{ key: string; values: number[] } | null>(null);

  useEffect(() => {
    if (activeStats.length === 0) return undefined;
    const el = containerRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return undefined;

    let rafId = 0;

    const startAnimation = () => {
      if (animatedKeyRef.current === statsKey) return;
      animatedKeyRef.current = statsKey;

      if (
        typeof window !== 'undefined' &&
        typeof window.matchMedia === 'function' &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ) {
        setAnimState({ key: statsKey, values: activeStats.map((s) => s.target) });
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

        setAnimState({
          key: statsKey,
          values: activeStats.map((stat) => {
            const origin = stat.startFrom ?? 0;
            return Math.round(origin + (stat.target - origin) * eased);
          }),
        });

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
  }, [activeStats, statsKey]);

  if (activeStats.length === 0) {
    return null;
  }

  const displayedValues = animState?.key === statsKey ? animState.values : null;

  const renderStat = (stat: StudioMilestoneItem, idx: number) => (
    <div key={`${stat.label}-${idx}`} className="text-center space-y-1.5 sm:space-y-2">
      <p
        className="font-editorial text-sm sm:text-base font-medium tracking-wide"
        style={{ color: accentColor }}
      >
        {stat.label}
      </p>
      <p className="text-[2rem] sm:text-[2.45rem] lg:text-[2.65rem] font-normal tracking-tight text-[#181611] leading-none tabular-nums">
        {displayedValues?.[idx] ?? stat.target}
        {stat.suffix}
      </p>
    </div>
  );

  if (activeStats.length === 4) {
    return (
      <div
        ref={containerRef}
        className="mx-auto max-w-5xl pt-10 sm:pt-14 grid grid-cols-2 md:grid-cols-[1fr_1fr_auto_1fr_1fr] items-center gap-y-8 gap-x-6 md:gap-x-4"
      >
        {renderStat(activeStats[0], 0)}
        {renderStat(activeStats[1], 1)}

        <div
          aria-hidden="true"
          className="hidden md:block h-14 w-[1.5px] bg-[#C8C2B8] mx-auto"
        />

        {renderStat(activeStats[2], 2)}
        {renderStat(activeStats[3], 3)}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="mx-auto max-w-5xl pt-10 sm:pt-14 grid grid-cols-2 md:grid-cols-4 items-center gap-y-8 gap-x-6"
    >
      {activeStats.map((stat, idx) => renderStat(stat, idx))}
    </div>
  );
}
