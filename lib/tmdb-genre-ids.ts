import type { Genre } from "@/lib/types";

/** TMDB movie genre ids — https://developer.themoviedb.org/reference/genre-movie-list */
export const TMDB_GENRE_ID: Record<Genre, number> = {
  Action: 28,
  Animation: 16,
  Comedy: 35,
  Drama: 18,
  Horror: 27,
  Romance: 10749,
  "Sci-Fi": 878,
  Thriller: 53,
};

export function tmdbGenreIdFor(genre: Genre): number {
  return TMDB_GENRE_ID[genre];
}
