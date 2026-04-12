import type { TmdbDiscoverItem } from "@/lib/movie-enrich-types";
import type { SearchSuggestMovieRow } from "@/lib/search-suggest-types";

export function discoverItemFromSuggestMovie(
  row: SearchSuggestMovieRow,
): TmdbDiscoverItem {
  return {
    id: row.tmdbId,
    title: row.title,
    release_date: row.year ? `${row.year}-01-01` : "",
    vote_average: row.voteAverage,
    vote_count: 0,
    popularity: row.popularity,
    poster_path: row.posterPath,
    overview: "",
    genre_ids: row.genreIds,
  };
}
