export type StreamingEntry = {
  name: string;
  type: "flatrate" | "rent" | "buy";
  logoUrl: string | null;
};

export type YoutubeReview = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string | null;
};

export type MovieEnrichResponse = {
  configured: { tmdb: boolean; omdb: boolean; youtube: boolean };
  tmdbId: number | null;
  title: string;
  year: string;
  overview: string | null;
  ratings: { source: string; value: string }[];
  imdbId: string | null;
  streaming: StreamingEntry[];
  youtubeReviews: YoutubeReview[];
  fallbackYoutubeSearchUrl: string;
  /** TMDB-linked YouTube video id for official trailer/teaser embed */
  trailerYoutubeKey: string | null;
  warnings: string[];
};

export type TmdbDiscoverItem = {
  id: number;
  title: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  poster_path: string | null;
  overview: string;
  genre_ids: number[];
};

export type TmdbDiscoverResponse = {
  configured: boolean;
  sort: string;
  results: TmdbDiscoverItem[];
  page: number;
  warning?: string;
};
