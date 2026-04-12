export type ScheduleMedia = "movie" | "tv";

export type ScheduleWindow = "today" | "upcoming" | "announced";

export type ScheduleItem = {
  mediaType: ScheduleMedia;
  tmdbId: number;
  title: string;
  posterPath: string | null;
  /** YYYY-MM-DD (theatrical / first air) */
  releaseDate: string;
  voteAverage: number;
  voteCount: number;
  popularity: number;
  /** e.g. Film, Series, New season */
  kindLabel: string;
  /** e.g. Theatrical & streaming, TV premiere */
  releaseVenueLabel: string;
};

export type ScheduleResponse = {
  configured: boolean;
  window: ScheduleWindow;
  filter: "all" | ScheduleMedia;
  items: ScheduleItem[];
  warning?: string;
};
