import type { ExploreRecentOpen } from "@/lib/explore-recent-storage";
import { movieRowToMovie } from "@/lib/supabase/mappers";
import { ensureMovieRow } from "@/lib/supabase/playlist-service";
import type { Movie } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

type MovieRow = Parameters<typeof movieRowToMovie>[0];

export type { ExploreRecentOpen };

export async function fetchExploreRecentOpens(
  client: SupabaseClient,
  userId: string,
): Promise<ExploreRecentOpen[]> {
  const { data, error } = await client
    .from("explore_recent_opens")
    .select("opened_at, movies(*)")
    .eq("user_id", userId)
    .order("opened_at", { ascending: false })
    .limit(24);

  if (error || !data?.length) return [];

  const out: ExploreRecentOpen[] = [];
  for (const row of data) {
    const m = row.movies as unknown as MovieRow | null;
    if (!m?.id) continue;
    const opened = row.opened_at as string | null;
    const openedAtMs = opened ? Date.parse(opened) : 0;
    out.push({
      movie: movieRowToMovie(m),
      openedAtMs: Number.isFinite(openedAtMs) ? openedAtMs : 0,
    });
  }
  return out;
}

export async function upsertExploreRecentOpen(
  client: SupabaseClient,
  userId: string,
  movie: Movie,
): Promise<void> {
  const movieId = await ensureMovieRow(client, movie);
  if (!movieId) return;
  await client.from("explore_recent_opens").upsert(
    {
      user_id: userId,
      movie_id: movieId,
      opened_at: new Date().toISOString(),
    },
    { onConflict: "user_id,movie_id" },
  );
}
