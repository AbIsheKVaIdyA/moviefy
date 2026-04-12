import type { TmdbDiscoverItem } from "@/lib/movie-enrich-types";

/** Blend TMDB popularity + votes into a single “interest” number for UI (not persisted). */
export function syntheticInterestCount(item: TmdbDiscoverItem): number {
  const pop = item.popularity ?? 0;
  const base = pop * 95 + item.vote_count * 0.85 + item.vote_average * 120;
  return Math.max(48, Math.round(base));
}

export function formatInterestCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M interested`;
  if (n >= 10_000) return `${Math.round(n / 1000)}K interested`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K interested`;
  return `${n} interested`;
}

export function exploreReleaseContextLine(item: TmdbDiscoverItem): string {
  const d = item.release_date?.trim();
  if (!d) return "Release TBA";
  const t = Date.parse(`${d}T12:00:00Z`);
  if (!Number.isFinite(t)) return "Release TBA";
  const fmt = new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(t);
  const days = (t - Date.now()) / 86400000;
  if (days > 0) return `${fmt} · Coming soon`;
  if (days > -10) return `${fmt} · New this week`;
  if (days > -90) return `${fmt} · Now streaming`;
  return `${fmt} · Catalogue pick`;
}
