"use client";

import {
  MOVIE_TAKE_TIERS,
  type MovieTakeMeter,
  type MovieTakeTier,
} from "@/lib/supabase/movie-takes-service";
import { cn } from "@/lib/utils";

const TIER_COLOR: Record<MovieTakeTier, string> = {
  skip: "#f87171",
  okay: "#fbbf24",
  recommend: "#60a5fa",
  love: "#4ade80",
};

function polar(cx: number, cy: number, r: number, angle: number) {
  return {
    x: cx + r * Math.cos(angle),
    y: cy - r * Math.sin(angle),
  };
}

function dominantFromMeter(
  m: MovieTakeMeter,
): { tier: MovieTakeTier; pct: number } | null {
  if (m.total <= 0) return null;
  let best: MovieTakeTier = "skip";
  let max = -1;
  for (const { id } of MOVIE_TAKE_TIERS) {
    const c = m[id];
    if (c > max) {
      max = c;
      best = id;
    }
  }
  return { tier: best, pct: Math.round((max / m.total) * 100) };
}

type GaugeSize = "md" | "lg";

const SIZE: Record<
  GaugeSize,
  { r: number; cx: number; cy: number; vw: number; vh: number; maxW: string }
> = {
  md: {
    r: 78,
    cx: 120,
    cy: 112,
    vw: 240,
    vh: 132,
    maxW: "max-w-[min(100%,260px)]",
  },
  lg: {
    r: 102,
    cx: 150,
    cy: 138,
    vw: 300,
    vh: 162,
    maxW: "max-w-[min(100%,340px)]",
  },
};

/** Semicircle community meter: colored segments + dominant % (streaming-app style). */
export function MovieMeterGauge({
  meter,
  className,
  size = "md",
}: {
  meter: MovieTakeMeter;
  className?: string;
  size?: GaugeSize;
}) {
  const total = meter.total;
  const dom = dominantFromMeter(meter);
  const { r, cx, cy, vw, vh, maxW } = SIZE[size];

  if (total <= 0 || !dom) {
    return (
      <div className={cn("text-center text-sm text-white/45", className)}>
        No votes yet
      </div>
    );
  }

  const { tier, pct } = dom;
  const strokeW = size === "lg" ? 14 : 11;
  const label = MOVIE_TAKE_TIERS.find((t) => t.id === tier)?.label ?? tier;
  const stroke = TIER_COLOR[tier];

  const trackD = (() => {
    const left = polar(cx, cy, r, Math.PI);
    const right = polar(cx, cy, r, 0);
    return `M ${left.x} ${left.y} A ${r} ${r} 0 0 1 ${right.x} ${right.y}`;
  })();

  let angle = Math.PI;
  const arcs: { d: string; color: string; key: string }[] = [];
  for (const { id } of MOVIE_TAKE_TIERS) {
    const n = meter[id];
    if (n <= 0) continue;
    const sweep = (n / total) * Math.PI;
    if (sweep < 0.002) continue;
    const a0 = angle;
    const a1 = angle - sweep;
    const p0 = polar(cx, cy, r, a0);
    const p1 = polar(cx, cy, r, a1);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const d = `M ${p0.x} ${p0.y} A ${r} ${r} 0 ${largeArc} 1 ${p1.x} ${p1.y}`;
    arcs.push({ d, color: TIER_COLOR[id], key: id });
    angle = a1;
  }

  return (
    <div className={cn("flex w-full flex-col items-stretch", className)}>
      <div className="flex flex-col items-center">
        <svg
          viewBox={`0 0 ${vw} ${vh}`}
          className={cn("w-full", maxW)}
          aria-hidden
        >
          <path
            d={trackD}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth={strokeW}
            strokeLinecap="round"
          />
          {arcs.map(({ d, color, key }) => (
            <path
              key={key}
              d={d}
              fill="none"
              stroke={color}
              strokeWidth={strokeW}
              strokeLinecap="butt"
            />
          ))}
        </svg>
        <div className="-mt-2 text-center sm:-mt-3">
          <p
            className={cn(
              "font-heading font-bold tabular-nums tracking-tight",
              size === "lg" ? "text-4xl sm:text-5xl" : "text-3xl",
            )}
            style={{ color: stroke }}
          >
            {pct}%
          </p>
          <p className="mt-0.5 text-xs text-white/55 sm:text-sm">
            <span className="text-white/80">{label}</span> leads ·{" "}
            {total.toLocaleString()} vote{total === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      <div
        className={cn(
          "mt-5 flex flex-wrap justify-center gap-x-5 gap-y-2.5 border-t border-white/10 pt-4",
          size === "lg" && "sm:gap-x-6",
        )}
      >
        {MOVIE_TAKE_TIERS.map(({ id, label: lab }) => {
          const n = meter[id];
          const p = Math.round((n / total) * 100);
          return (
            <span
              key={id}
              className="inline-flex max-w-[11.5rem] items-start gap-2 text-[11px] leading-snug text-white/70 sm:max-w-[13rem] sm:text-xs"
            >
              <span
                className="mt-1 size-2 shrink-0 rounded-full sm:size-2.5"
                style={{ background: TIER_COLOR[id] }}
              />
              <span className="min-w-0 font-medium text-white/85">{lab}</span>
              <span className="shrink-0 tabular-nums text-white/45">{p}%</span>
            </span>
          );
        })}
      </div>
    </div>
  );
}
