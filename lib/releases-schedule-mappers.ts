import type { ScheduleItem } from "@/lib/releases-schedule-types";
import { tmdbPosterUrl } from "@/lib/tmdb-image";
import type { Genre, Movie } from "@/lib/types";

/** Minimal `Movie` for detail route + enrich prefetch from a schedule row. */
export function scheduleItemToMovie(item: ScheduleItem): Movie {
  const year = Number(item.releaseDate.slice(0, 4)) || 0;
  const posterImage = item.posterPath
    ? tmdbPosterUrl(item.posterPath, "w342")
    : "";
  return {
    id: `tmdb-${item.tmdbId}`,
    title: item.title,
    year,
    genre: "Drama" as Genre,
    posterClass: "from-zinc-700 to-zinc-900",
    posterImage,
    director: "—",
    tmdbId: item.tmdbId,
  };
}
