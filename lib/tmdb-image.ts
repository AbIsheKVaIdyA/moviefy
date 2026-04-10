/** TMDB image CDN — see https://developer.themoviedb.org/docs/image-basics */
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function tmdbPosterUrl(
  posterPath: string,
  size: "w185" | "w342" | "w500" | "w780" = "w500",
): string {
  const path = posterPath.startsWith("/") ? posterPath : `/${posterPath}`;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/** Extract TMDB `poster_path` (e.g. `/abc.jpg`) from a full image CDN URL, if possible. */
export function posterPathFromTmdbPosterUrl(url: string): string | null {
  if (!url?.trim()) return null;
  const t = url.trim();
  if (t.startsWith("/") && !t.startsWith("//")) return t;
  try {
    const pathname = new URL(t).pathname;
    const m = pathname.match(/\/t\/p\/[^/]+(\/.+)$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}
