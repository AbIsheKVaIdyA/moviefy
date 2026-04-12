import type { Genre } from "@/lib/types";

export type SearchSuggestMovieRow = {
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string | null;
  voteAverage: number;
  popularity: number;
  genreIds: number[];
};

export type SearchSuggestPersonRow = {
  id: number;
  name: string;
  profilePath: string | null;
  popularity: number;
  knownForDepartment: string | null;
};

export type SearchSuggestGenreRow = {
  genre: Genre;
};

export type SearchSuggestTop =
  | { kind: "movie"; movie: SearchSuggestMovieRow }
  | { kind: "person"; person: SearchSuggestPersonRow }
  | { kind: "genre"; genre: Genre };

export type SearchSuggestResponse = {
  configured: boolean;
  query: string;
  top: SearchSuggestTop | null;
  others: {
    movies: SearchSuggestMovieRow[];
    people: SearchSuggestPersonRow[];
    genres: SearchSuggestGenreRow[];
  };
};
