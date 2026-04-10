import type { MovieEnrichResponse } from "@/lib/movie-enrich-types";

const RATING_SITE_ORDER = ["imdb", "rotten tomatoes", "metacritic"];

export function sortRatingsBySite(ratings: MovieEnrichResponse["ratings"]) {
  return [...ratings].sort((a, b) => {
    const ia = RATING_SITE_ORDER.indexOf(a.source.toLowerCase());
    const ib = RATING_SITE_ORDER.indexOf(b.source.toLowerCase());
    const va = ia === -1 ? 999 : ia;
    const vb = ib === -1 ? 999 : ib;
    if (va !== vb) return va - vb;
    return a.source.localeCompare(b.source);
  });
}

/** Split API strings like 8.4/10, 94%, 72/100 for a big number + suffix. */
export function scoreDisplayParts(value: string): { main: string; suffix: string } {
  const v = value.trim();
  if (v.endsWith("%")) {
    return { main: v.slice(0, -1).trim(), suffix: "%" };
  }
  const slash = v.indexOf("/");
  if (slash > 0) {
    return {
      main: v.slice(0, slash).trim(),
      suffix: v.slice(slash).trim(),
    };
  }
  return { main: v, suffix: "" };
}
