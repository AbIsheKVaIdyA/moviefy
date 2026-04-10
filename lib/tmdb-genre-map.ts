import type { TmdbDiscoverItem } from "@/lib/movie-enrich-types";
import type { Genre, Movie } from "@/lib/types";
import { tmdbPosterUrl } from "@/lib/tmdb-image";

/** Map first TMDB genre id to our catalog genre (best-effort). */
const TMDB_TO_GENRE: Record<number, Genre> = {
  28: "Action",
  12: "Action",
  16: "Animation",
  35: "Comedy",
  80: "Thriller",
  18: "Drama",
  10751: "Romance",
  14: "Sci-Fi",
  36: "Drama",
  27: "Horror",
  10402: "Romance",
  9648: "Thriller",
  53: "Thriller",
  10752: "Drama",
  37: "Action",
  99: "Drama",
};

export function genreFromTmdbIds(ids: number[] | undefined): Genre {
  if (!ids?.length) return "Drama";
  for (const id of ids) {
    const g = TMDB_TO_GENRE[id];
    if (g) return g;
  }
  return "Drama";
}

export function movieFromTmdbDiscoverItem(item: TmdbDiscoverItem): Movie {
  const year = item.release_date
    ? Number(item.release_date.slice(0, 4)) || 0
    : 0;
  return {
    id: `tmdb-${item.id}`,
    title: item.title,
    year,
    genre: genreFromTmdbIds(item.genre_ids),
    posterClass: "from-zinc-700 to-zinc-900",
    posterImage: item.poster_path
      ? tmdbPosterUrl(item.poster_path, "w342")
      : "",
    director: "—",
    tmdbId: item.id,
  };
}
