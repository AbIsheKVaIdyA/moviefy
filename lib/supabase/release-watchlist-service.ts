import type { SupabaseClient } from "@supabase/supabase-js";
import type { ScheduleItem } from "@/lib/releases-schedule-types";

/** Dispatch after mutating the list so Your theatre can refetch. */
export const RELEASE_WATCHLIST_CHANGED_EVENT =
  "moviefy-release-watchlist-changed";

export type ReleaseWatchlistRow = {
  tmdbId: number;
  mediaType: "movie" | "tv";
  releaseDate: string;
  title: string;
  posterPath: string | null;
};

export async function fetchUserReleaseWatchlist(
  client: SupabaseClient,
  userId: string,
): Promise<ReleaseWatchlistRow[]> {
  const { data, error } = await client
    .from("user_release_watchlist")
    .select("tmdb_id, media_type, release_date, title, poster_path")
    .eq("user_id", userId)
    .order("release_date", { ascending: true });
  if (error || !data) return [];
  return data.map((r) => ({
    tmdbId: Number(r.tmdb_id),
    mediaType: r.media_type === "tv" ? "tv" : "movie",
    releaseDate: String(r.release_date ?? ""),
    title: String(r.title ?? ""),
    posterPath: (r.poster_path as string | null) ?? null,
  }));
}

export async function addUserReleaseWatchlist(
  client: SupabaseClient,
  userId: string,
  item: ScheduleItem,
): Promise<boolean> {
  const { error } = await client.from("user_release_watchlist").upsert(
    {
      user_id: userId,
      tmdb_id: item.tmdbId,
      media_type: item.mediaType,
      release_date: item.releaseDate,
      title: item.title,
      poster_path: item.posterPath,
    },
    { onConflict: "user_id,tmdb_id,media_type" },
  );
  return !error;
}

export function dispatchReleaseWatchlistChanged(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(RELEASE_WATCHLIST_CHANGED_EVENT));
  }
}

export async function removeUserReleaseWatchlist(
  client: SupabaseClient,
  userId: string,
  tmdbId: number,
  mediaType: "movie" | "tv",
): Promise<boolean> {
  const { error } = await client
    .from("user_release_watchlist")
    .delete()
    .eq("user_id", userId)
    .eq("tmdb_id", tmdbId)
    .eq("media_type", mediaType);
  return !error;
}
