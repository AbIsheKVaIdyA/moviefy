import type { TmdbDiscoverItem } from "@/lib/movie-enrich-types";
import type { Movie } from "@/lib/types";
import { movieFromTmdbDiscoverItem } from "@/lib/tmdb-genre-map";

const PLACEHOLDER_GRADIENTS = [
  "from-violet-950 via-indigo-900 to-slate-950",
  "from-emerald-950 via-zinc-900 to-black",
  "from-rose-900 via-pink-950 to-violet-950",
  "from-orange-950 via-amber-950 to-neutral-950",
  "from-teal-950 via-cyan-950 to-slate-950",
  "from-slate-800 via-blue-950 to-black",
  "from-red-950 via-orange-950 to-stone-950",
  "from-stone-900 via-neutral-950 to-black",
] as const;

/** When TMDB is unavailable, still render the landing visuals. */
export function placeholderLandingMovies(count = 12): Movie[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `landing-ph-${i}`,
    title: "Add TMDB_API_KEY for live posters",
    year: 2024,
    genre: "Drama",
    posterClass: PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length]!,
    posterImage: "",
    director: "",
  }));
}

export async function getLandingMovies(): Promise<Movie[]> {
  const key = process.env.TMDB_API_KEY;
  if (!key) return placeholderLandingMovies();
  try {
    const u = new URL("https://api.themoviedb.org/3/movie/popular");
    u.searchParams.set("api_key", key);
    u.searchParams.set("page", "1");
    const res = await fetch(u.toString(), { next: { revalidate: 3600 } });
    if (!res.ok) return placeholderLandingMovies();
    const data = (await res.json()) as { results?: TmdbDiscoverItem[] };
    const results = data.results ?? [];
    const mapped = results.slice(0, 12).map(movieFromTmdbDiscoverItem);
    return mapped.length ? mapped : placeholderLandingMovies();
  } catch {
    return placeholderLandingMovies();
  }
}

export function buildLandingPosterWall(movies: Movie[]): Movie[] {
  if (!movies.length) return [];
  const out: Movie[] = [];
  while (out.length < 28) {
    out.push(...movies);
  }
  return out.slice(0, 28);
}

export function landingHeroFocus(movies: Movie[], n = 6): Movie[] {
  if (!movies.length) return [];
  const idx = [7, 3, 0, 4, 9, 2].map((i) => i % movies.length);
  return idx.map((i) => movies[i]!);
}
