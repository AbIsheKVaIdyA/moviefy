import type { TmdbDiscoverItem } from "@/lib/movie-enrich-types";

/**
 * Short label for TMDB `vote_count` on a title (real API field — not a custom score).
 * Falls back to popularity when vote count is missing/zero on some responses.
 */
export function formatTmdbVotesShort(item: TmdbDiscoverItem): string {
  const v = item.vote_count ?? 0;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M votes`;
  if (v >= 10_000) return `${Math.round(v / 1000)}K votes`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K votes`;
  if (v > 0) return `${v.toLocaleString()} votes`;
  const pop = item.popularity ?? 0;
  if (pop >= 1) return `Pop. ${pop.toFixed(0)}`;
  return "TMDB";
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
