'use client';

import React, { useMemo, useState } from 'react';
import { cn, formatPoisha } from '@/lib/utils';

export function formatCompactPoisha(poisha: number, currency = 'BDT'): string {
  const numeric = Number.isFinite(poisha) ? poisha : 0;
  const sign = numeric < 0 ? '-' : '';
  const absTk = Math.abs(numeric) / 100;
  const prefix = currency === 'BDT' ? '৳' : `${currency} `;

  if (currency === 'BDT') {
    if (absTk >= 10_000_000) return `${sign}${prefix}${(absTk / 10_000_000).toFixed(1)}Cr`;
    if (absTk >= 100_000) return `${sign}${prefix}${(absTk / 100_000).toFixed(1)}L`;
    if (absTk >= 1_000) return `${sign}${prefix}${Math.round(absTk / 1_000)}k`;
    return `${sign}${prefix}${Math.round(absTk)}`;
  }

  if (absTk >= 1_000_000) return `${sign}${prefix}${(absTk / 1_000_000).toFixed(1)}M`;
  if (absTk >= 1_000) return `${sign}${prefix}${Math.round(absTk / 1_000)}k`;
  return `${sign}${prefix}${Math.round(absTk)}`;
}

export function formatMonthShort(monthKey: string): string {
  const parts = monthKey.split('-');
  if (parts.length !== 2) return monthKey;
  const year = Number(parts[0]);
  const monthIdx = Number(parts[1]) - 1;
  if (!Number.isFinite(year) || monthIdx < 0 || monthIdx > 11) return monthKey;
  const d = new Date(Date.UTC(year, monthIdx, 1));
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  }).format(d);
}

export interface BarSeriesConfig {
  key: string;
  label: string;
  color: string;
}

export interface BarDataPoint {
  label: string;
  sublabel?: string;
  values: number[];
}

interface GroupedBarChartProps {
  data: BarDataPoint[];
  series: BarSeriesConfig[];
  formatValue?: (value: number) => string;
  formatAxis?: (value: number) => string;
  emptyMessage?: string;
  height?: number;
  maxVisibleXLabels?: number;
}

export function GroupedBarChart({
  data,
  series,
  formatValue = (v) => String(v),
  formatAxis = (v) => String(v),
  emptyMessage = 'No data available for this chart.',
  height = 216,
  maxVisibleXLabels = 8,
}: GroupedBarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const { minVal, maxVal, ticks } = useMemo(() => {
    const flatValues = data.flatMap((d) => d.values);
    if (flatValues.length === 0) {
      return { minVal: 0, maxVal: 10, ticks: [0, 5, 10] };
    }
    const rawMin = Math.min(0, ...flatValues);
    const rawMax = Math.max(0, ...flatValues);

    if (rawMin === 0 && rawMax === 0) {
      return { minVal: 0, maxVal: 4, ticks: [0, 1, 2, 3, 4] };
    }

    const paddedMax = rawMax > 0 ? rawMax * 1.12 : 0;
    const paddedMin = rawMin < 0 ? rawMin * 1.12 : 0;
    const span = Math.max(1, paddedMax - paddedMin);

    const stepCount = 4;
    const step = span / stepCount;
    const computedTicks: number[] = [];
    for (let i = 0; i <= stepCount; i++) {
      computedTicks.push(paddedMin + step * i);
    }

    return {
      minVal: paddedMin,
      maxVal: paddedMax === 0 ? 1 : paddedMax,
      ticks: computedTicks,
    };
  }, [data]);

  if (data.length === 0 || series.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-4 text-center text-[12.5px] text-[var(--admin-muted)]">
        {emptyMessage}
      </div>
    );
  }

  const svgWidth = 560;
  const svgHeight = height;
  const padLeft = 56;
  const padRight = 14;
  const padTop = 12;
  const padBottom = 28;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;
  const valueSpan = Math.max(1, maxVal - minVal);

  const yForValue = (val: number) =>
    padTop + ((maxVal - val) / valueSpan) * plotH;

  const zeroY = yForValue(0);
  const groupW = plotW / data.length;
  const labelStride = Math.max(1, Math.ceil(data.length / maxVisibleXLabels));

  const activePoint =
    hoveredIdx !== null && data[hoveredIdx]
      ? data[hoveredIdx]
      : data[data.length - 1];
  const activePointLabel =
    hoveredIdx !== null ? 'Selected' : 'Latest';

  return (
    <div className="space-y-3">
      {/* Legend + Compact Readout Strip */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-3 py-2">
        <div className="flex flex-wrap items-center gap-3">
          {series.map((s) => (
            <span
              key={s.key}
              className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[var(--admin-muted)]"
            >
              <span
                className="h-2 w-2 rounded-full shrink-0"
                style={{ backgroundColor: s.color }}
              />
              <span>{s.label}</span>
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-[12px] tabular-nums">
          <span className="inline-flex items-center gap-1.5 font-medium text-[var(--admin-text)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--admin-accent)]" />
            {activePointLabel}: {activePoint.sublabel || activePoint.label}
          </span>
          {series.map((s, idx) => (
            <span
              key={s.key}
              className="inline-flex items-center gap-1 font-medium text-[var(--admin-text)]"
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              {formatValue(activePoint.values[idx] ?? 0)}
            </span>
          ))}
        </div>
      </div>

      {/* Responsive SVG Chart */}
      <div
        className="w-full overflow-hidden"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto select-none"
          role="img"
          aria-label="Bar trend chart"
        >
          {/* Horizontal gridlines + Y ticks */}
          {ticks.map((tickVal, idx) => {
            const y = yForValue(tickVal);
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="var(--admin-border)"
                  strokeWidth="1"
                  strokeDasharray={tickVal === 0 ? undefined : '3 3'}
                />
                <text
                  x={padLeft - 8}
                  y={y + 3.5}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--admin-muted)"
                  className="font-mono-code"
                >
                  {formatAxis(tickVal)}
                </text>
              </g>
            );
          })}

          {/* Explicit zero baseline if dataset has negative values */}
          {minVal < 0 && (
            <line
              x1={padLeft}
              y1={zeroY}
              x2={svgWidth - padRight}
              y2={zeroY}
              stroke="var(--admin-muted)"
              strokeOpacity="0.45"
              strokeWidth="1"
            />
          )}

          {/* Column Groups */}
          {data.map((point, gIdx) => {
            const groupX = padLeft + gIdx * groupW;
            const innerPad = Math.min(10, groupW * 0.16);
            const usableW = Math.max(8, groupW - innerPad * 2);
            const barGap = series.length > 1 ? Math.min(4, usableW * 0.08) : 0;
            const barW = Math.max(
              4,
              Math.min(26, (usableW - barGap * (series.length - 1)) / series.length),
            );
            const clusterW =
              barW * series.length + barGap * Math.max(0, series.length - 1);
            const startX = groupX + (groupW - clusterW) / 2;
            const isHovered = hoveredIdx === gIdx;
            const showXLabel = gIdx % labelStride === 0 || gIdx === data.length - 1;

            return (
              <g
                key={`${point.label}-${gIdx}`}
                onMouseEnter={() => setHoveredIdx(gIdx)}
                onClick={() => setHoveredIdx(gIdx)}
                className="cursor-pointer"
              >
                {/* Hover column highlight */}
                <rect
                  x={groupX + 2}
                  y={padTop}
                  width={Math.max(4, groupW - 4)}
                  height={plotH}
                  rx="6"
                  fill="var(--admin-accent)"
                  fillOpacity={isHovered ? 0.08 : 0}
                />

                {series.map((s, sIdx) => {
                  const val = point.values[sIdx] ?? 0;
                  const valY = yForValue(val);
                  const barTop = val >= 0 ? valY : zeroY;
                  const rawBarH = Math.abs(valY - zeroY);
                  const barH = val === 0 ? 0 : Math.max(2.5, rawBarH);
                  const x = startX + sIdx * (barW + barGap);

                  return (
                    <rect
                      key={s.key}
                      x={x}
                      y={barTop}
                      width={barW}
                      height={barH}
                      rx="4"
                      fill={s.color}
                      fillOpacity={hoveredIdx === null || isHovered ? 0.92 : 0.45}
                      className="transition-opacity duration-150"
                    />
                  );
                })}

                {showXLabel && (
                  <text
                    x={groupX + groupW / 2}
                    y={svgHeight - 8}
                    textAnchor="middle"
                    fontSize="10"
                    fontWeight={isHovered ? '600' : '400'}
                    fill={isHovered ? 'var(--admin-text)' : 'var(--admin-muted)'}
                  >
                    {point.label}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export interface DonutSegment {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  color: string;
  hint?: string;
}

interface BreakdownDonutChartProps {
  segments: DonutSegment[];
  centerLabel: string;
  centerValue: string;
  emptyMessage?: string;
}

export function BreakdownDonutChart({
  segments,
  centerLabel,
  centerValue,
  emptyMessage = 'No records to display yet.',
}: BreakdownDonutChartProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const total = useMemo(
    () => segments.reduce((acc, seg) => acc + Math.max(0, seg.value), 0),
    [segments],
  );

  const radius = 42;
  const circumference = 2 * Math.PI * radius;

  const arcs = useMemo(() => {
    if (total <= 0) return [];
    let accumulated = 0;
    return segments
      .filter((s) => s.value > 0)
      .map((s) => {
        const fraction = s.value / total;
        const dashLength = fraction * circumference;
        const dashOffset = -accumulated;
        accumulated += dashLength;
        return {
          ...s,
          percent: fraction * 100,
          dashLength,
          dashOffset,
        };
      });
  }, [segments, total, circumference]);

  const hoveredSeg = useMemo(
    () => arcs.find((a) => a.id === hoveredId) ?? null,
    [arcs, hoveredId],
  );

  if (segments.length === 0 || total <= 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-4 text-center text-[12.5px] text-[var(--admin-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col sm:flex-row items-center gap-5"
      onMouseLeave={() => setHoveredId(null)}
    >
      {/* Donut Ring */}
      <div className="relative h-36 w-36 shrink-0">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={centerLabel}>
          <circle
            cx="60"
            cy="60"
            r={radius}
            fill="none"
            stroke="var(--admin-surface-subtle)"
            strokeWidth="13"
          />
          {arcs.map((arc) => {
            const isHovered = hoveredId === arc.id;
            const gap = arcs.length > 1 ? 1.5 : 0;
            return (
              <circle
                key={arc.id}
                cx="60"
                cy="60"
                r={radius}
                fill="none"
                stroke={arc.color}
                strokeWidth={isHovered ? '15' : '13'}
                strokeDasharray={`${Math.max(0, arc.dashLength - gap)} ${circumference}`}
                strokeDashoffset={arc.dashOffset}
                strokeLinecap="butt"
                onMouseEnter={() => setHoveredId(arc.id)}
                onClick={() => setHoveredId(hoveredId === arc.id ? null : arc.id)}
                className="cursor-pointer transition-all duration-150"
                style={{
                  opacity: hoveredId && !isHovered ? 0.42 : 1,
                }}
              />
            );
          })}
        </svg>

        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center px-3">
          <span className="text-[11px] font-medium text-[var(--admin-muted)] line-clamp-1">
            {hoveredSeg ? hoveredSeg.label : centerLabel}
          </span>
          <span className="font-mono-code text-[15px] font-semibold text-[var(--admin-text)] tabular-nums mt-0.5">
            {hoveredSeg ? hoveredSeg.displayValue : centerValue}
          </span>
          {hoveredSeg && (
            <span className="text-[10.5px] font-mono-code text-[var(--admin-muted)] tabular-nums">
              {hoveredSeg.percent.toFixed(0)}%
            </span>
          )}
        </div>
      </div>

      {/* Interactive Legend */}
      <div className="w-full min-w-0 flex-1 space-y-2">
        {segments.map((seg) => {
          const pct = total > 0 ? (Math.max(0, seg.value) / total) * 100 : 0;
          const isHovered = hoveredId === seg.id;
          return (
            <button
              key={seg.id}
              type="button"
              onMouseEnter={() => setHoveredId(seg.id)}
              onClick={() => setHoveredId(hoveredId === seg.id ? null : seg.id)}
              className={cn(
                'w-full flex items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left transition-colors cursor-pointer',
                isHovered
                  ? 'bg-[var(--admin-surface-subtle)]'
                  : 'hover:bg-[var(--admin-surface-subtle)]/70',
              )}
            >
              <div className="min-w-0 flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: seg.color }}
                />
                <div className="min-w-0">
                  <p className="text-[13px] font-medium text-[var(--admin-text)] truncate">
                    {seg.label}
                  </p>
                  {seg.hint && (
                    <p className="text-[11.5px] text-[var(--admin-muted)] truncate tabular-nums">
                      {seg.hint}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-right shrink-0 tabular-nums">
                <p className="font-mono-code text-[12.5px] font-semibold text-[var(--admin-text)]">
                  {seg.displayValue}
                </p>
                <p className="font-mono-code text-[11px] text-[var(--admin-muted)]">
                  {pct.toFixed(0)}%
                </p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export interface RankBarItem {
  id: string;
  label: string;
  value: number;
  displayValue: string;
  percent: number;
  subtext?: string;
  color: string;
  onClick?: () => void;
}

export function HorizontalRankBars({
  items,
  emptyMessage = 'No records to display yet.',
}: {
  items: RankBarItem[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-[var(--admin-border)] bg-[var(--admin-surface-subtle)] px-4 text-center text-[12.5px] text-[var(--admin-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const clampedPct = Math.max(0, Math.min(100, item.percent));
        const inner = (
          <>
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0 flex items-center gap-2">
                <span
                  className="h-2 w-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-[13px] font-medium text-[var(--admin-text)] truncate">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0 tabular-nums">
                <span className="font-mono-code text-[12.5px] font-semibold text-[var(--admin-text)]">
                  {item.displayValue}
                </span>
                <span className="font-mono-code text-[11px] text-[var(--admin-muted)] w-9 text-right">
                  {clampedPct.toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="h-1.5 w-full rounded-full bg-[var(--admin-surface-subtle)] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${item.value > 0 ? Math.max(3, clampedPct) : 0}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>

            {item.subtext && (
              <p className="text-[11.5px] text-[var(--admin-muted)] tabular-nums truncate">
                {item.subtext}
              </p>
            )}
          </>
        );

        if (item.onClick) {
          return (
            <button
              key={item.id}
              type="button"
              onClick={item.onClick}
              className="w-full text-left space-y-1.5 rounded-lg p-2 -mx-2 hover:bg-[var(--admin-surface-subtle)] transition-colors cursor-pointer"
            >
              {inner}
            </button>
          );
        }

        return (
          <div key={item.id} className="w-full text-left space-y-1.5">
            {inner}
          </div>
        );
      })}
    </div>
  );
}

export { formatPoisha };
