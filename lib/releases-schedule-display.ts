import type { ScheduleItem } from "@/lib/releases-schedule-types";

/** Compact “hype” number for badges (TMDB popularity, then votes). */
export function formatScheduleHype(item: ScheduleItem): string {
  const v = item.voteCount ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 10_000) return `${Math.round(v / 1000)}K`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`;
  if (v > 0) return v.toLocaleString();
  const p = item.popularity ?? 0;
  if (p >= 100) return `${Math.round(p)}`;
  if (p >= 10) return p.toFixed(0);
  if (p >= 1) return p.toFixed(1);
  return "—";
}
