/** TMDB image CDN — see https://developer.themoviedb.org/docs/image-basics */
export const TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p";

export function tmdbPosterUrl(
  posterPath: string,
  size: "w185" | "w342" | "w500" | "w780" = "w500",
): string {
  const path = posterPath.startsWith("/") ? posterPath : `/${posterPath}`;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/** TMDB backdrop (wide still). Returns null if path missing. */
export function tmdbBackdropUrl(
  backdropPath: string | null | undefined,
  size: "w780" | "w1280" = "w1280",
): string | null {
  if (!backdropPath?.trim()) return null;
  const path = backdropPath.startsWith("/") ? backdropPath : `/${backdropPath}`;
  return `${TMDB_IMAGE_BASE}/${size}${path}`;
}

/** Actor headshot for cast rails (TMDB `profile_path`). */
export function tmdbProfileUrl(
  profilePath: string | null | undefined,
  size: "w45" | "w185" = "w185",
): string | null {
  if (!profilePath?.trim()) return null;
  const path = profilePath.startsWith("/") ? profilePath : `/${profilePath}`;
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
