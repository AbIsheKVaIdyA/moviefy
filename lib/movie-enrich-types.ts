export type StreamingEntry = {
  name: string;
  type: "flatrate" | "rent" | "buy";
  logoUrl: string | null;
  /** TMDB/JustWatch deep link for this title in the selected region. */
  watchUrl: string | null;
};

export type YoutubeReview = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string | null;
};

/** Present when OMDB_API_KEY is set; explains empty `ratings` without blaming the key. */
export type MovieEnrichOmdbInfo = {
  matched: boolean;
  notice: string | null;
};

export type TmdbCastMember = {
  name: string;
  character: string | null;
  profileUrl: string | null;
};

export type MovieEnrichResponse = {
  configured: { tmdb: boolean; omdb: boolean; youtube: boolean };
  tmdbId: number | null;
  title: string;
  year: string;
  overview: string | null;
  /** TMDB public vote average (0–10) when detail fetch succeeded */
  tmdbVoteAverage: number | null;
  tmdbVoteCount: number | null;
  /** TMDB genre list for “style mix” donut */
  tmdbGenres: { id: number; name: string }[];
  /** Runtime in minutes when TMDB provides it */
  runtimeMinutes: number | null;
  ratings: { source: string; value: string }[];
  imdbId: string | null;
  streaming: StreamingEntry[];
  youtubeReviews: YoutubeReview[];
  fallbackYoutubeSearchUrl: string;
  /** TMDB-linked YouTube video id for official trailer/teaser embed */
  trailerYoutubeKey: string | null;
  /** Wide backdrop image URL when TMDB provides `backdrop_path` */
  tmdbBackdropUrl: string | null;
  /** Billing-order cast with profile images when TMDB credits succeed */
  tmdbCast: TmdbCastMember[];
  warnings: string[];
  /** OMDb lookup outcome when `OMDB_API_KEY` is configured; `null` if key missing */
  omdb: MovieEnrichOmdbInfo | null;
};

export type TmdbDiscoverItem = {
  id: number;
  title: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  /** TMDB popularity; present on trending responses — used for Explore “interest” hints. */
  popularity?: number;
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
