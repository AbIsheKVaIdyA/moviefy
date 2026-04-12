import type { MovieEnrichResponse } from "@/lib/movie-enrich-types";
import type { Movie } from "@/lib/types";

const CACHE_PREFIX = "moviefy:enrich:v2:";
const TTL_MS = 6 * 60 * 1000;

type Cached = { at: number; body: MovieEnrichResponse };

function tmdbIdFromMovie(movie: Movie): number | null {
  if (movie.tmdbId != null && Number.isFinite(movie.tmdbId)) return movie.tmdbId;
  if (movie.id.startsWith("tmdb-")) {
    const n = Number(movie.id.slice(5));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function cacheKey(tmdbId: number): string {
  return `${CACHE_PREFIX}${tmdbId}`;
}

export function readEnrichCache(tmdbId: number): MovieEnrichResponse | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(cacheKey(tmdbId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    if (
      !parsed ||
      typeof parsed.at !== "number" ||
      !parsed.body ||
      Date.now() - parsed.at > TTL_MS
    ) {
      sessionStorage.removeItem(cacheKey(tmdbId));
      return null;
    }
    return parsed.body;
  } catch {
    return null;
  }
}

export function writeEnrichCache(tmdbId: number, body: MovieEnrichResponse): void {
  if (typeof window === "undefined") return;
  try {
    const payload: Cached = { at: Date.now(), body };
    sessionStorage.setItem(cacheKey(tmdbId), JSON.stringify(payload));
  } catch {
    /* quota / private mode */
  }
}

/** Fetches enrich JSON and stores it for the movie detail page (call before `router.push`). */
export async function prefetchMovieEnrich(movie: Movie): Promise<boolean> {
  const tid = tmdbIdFromMovie(movie);
  if (tid == null || tid <= 0) return false;
  try {
    const params = new URLSearchParams();
    params.set("title", movie.title);
    params.set("year", String(movie.year));
    params.set("tmdbId", String(tid));
    const res = await fetch(`/api/movie/enrich?${params.toString()}`);
    if (!res.ok) return false;
    const body = (await res.json()) as MovieEnrichResponse;
    writeEnrichCache(tid, body);
    return true;
  } catch {
    return false;
  }
}
