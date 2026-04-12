import type { SupabaseClient } from "@supabase/supabase-js";
import type { Movie } from "@/lib/types";
import { ensureMovieRow } from "@/lib/supabase/playlist-service";

export const MOVIE_TAKE_TIERS = [
  { id: "skip" as const, label: "Skip", hint: "Skip" },
  { id: "okay" as const, label: "Ehhh! Okaayyy", hint: "Fine, I guess" },
  { id: "recommend" as const, label: "Now that's a movie", hint: "Theatre worthy" },
  {
    id: "love" as const,
    label: "This is what is moooviieeeeee!!",
    hint: "Peak cinema",
  },
] as const;

export type MovieTakeTier = (typeof MOVIE_TAKE_TIERS)[number]["id"];

export type MovieTakeMeter = {
  skip: number;
  okay: number;
  recommend: number;
  love: number;
  total: number;
};

const MAX_REVIEW_LEN = 2000;

function tmdbNumericId(movie: Movie): number | null {
  if (movie.tmdbId != null && Number.isFinite(movie.tmdbId)) return movie.tmdbId;
  if (movie.id.startsWith("tmdb-")) {
    const n = Number(movie.id.slice(5));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export async function fetchMovieTakeMeter(
  client: SupabaseClient,
  movie: Movie,
): Promise<MovieTakeMeter> {
  const tmdb = tmdbNumericId(movie);
  if (tmdb == null) {
    return { skip: 0, okay: 0, recommend: 0, love: 0, total: 0 };
  }
  const { data, error } = await client.rpc("get_movie_take_meter_by_tmdb", {
    p_tmdb_id: tmdb,
  });
  if (error || data == null || typeof data !== "object") {
    return { skip: 0, okay: 0, recommend: 0, love: 0, total: 0 };
  }
  const d = data as Record<string, unknown>;
  const n = (k: string) => {
    const v = d[k];
    return typeof v === "number" && Number.isFinite(v) ? v : Number(v) || 0;
  };
  const skip = n("skip");
  const okay = n("okay");
  const recommend = n("recommend");
  const love = n("love");
  const total = skip + okay + recommend + love;
  return { skip, okay, recommend, love, total };
}

export async function fetchOwnMovieTake(
  client: SupabaseClient,
  userId: string,
  movie: Movie,
): Promise<{ tier: MovieTakeTier; review: string } | null> {
  const movieId = await ensureMovieRow(client, movie);
  if (!movieId) return null;
  const { data, error } = await client
    .from("movie_user_takes")
    .select("tier, review")
    .eq("user_id", userId)
    .eq("movie_id", movieId)
    .maybeSingle();
  if (error || !data?.tier) return null;
  const tier = data.tier as string;
  if (!MOVIE_TAKE_TIERS.some((t) => t.id === tier)) return null;
  return {
    tier: tier as MovieTakeTier,
    review: typeof data.review === "string" ? data.review : "",
  };
}

export async function upsertMovieUserTake(
  client: SupabaseClient,
  userId: string,
  movie: Movie,
  tier: MovieTakeTier,
  review: string,
): Promise<boolean> {
  const movieId = await ensureMovieRow(client, movie);
  if (!movieId) return false;
  const body = review.trim().slice(0, MAX_REVIEW_LEN);
  const { error } = await client.from("movie_user_takes").upsert(
    {
      user_id: userId,
      movie_id: movieId,
      tier,
      review: body,
    },
    { onConflict: "user_id,movie_id" },
  );
  return !error;
}

/** Saves tier only; keeps existing written review if any. */
export async function upsertMovieUserTakeTierOnly(
  client: SupabaseClient,
  userId: string,
  movie: Movie,
  tier: MovieTakeTier,
): Promise<boolean> {
  const own = await fetchOwnMovieTake(client, userId, movie);
  const review = own?.review ?? "";
  return upsertMovieUserTake(client, userId, movie, tier, review);
}

/** Saves review text; tier comes from DB or `tierFallback` (e.g. draft tier) for first insert. */
export async function upsertMovieUserTakeReviewOnly(
  client: SupabaseClient,
  userId: string,
  movie: Movie,
  reviewText: string,
  tierFallback: MovieTakeTier | null,
): Promise<boolean> {
  const own = await fetchOwnMovieTake(client, userId, movie);
  const tier = own?.tier ?? tierFallback;
  if (!tier) return false;
  return upsertMovieUserTake(client, userId, movie, tier, reviewText);
}

export type MovieTakeReviewRow = {
  userId: string;
  tier: MovieTakeTier;
  review: string;
  createdAt: string;
  displayName: string | null;
  handle: string | null;
};

/** Public written reviews for the discussion feed (requires RLS + created_at migration). */
export async function fetchMovieTakeReviews(
  client: SupabaseClient,
  movie: Movie,
  limit = 40,
): Promise<MovieTakeReviewRow[]> {
  const tmdb = tmdbNumericId(movie);
  if (tmdb == null) return [];
  const { data: mrow, error: e1 } = await client
    .from("movies")
    .select("id")
    .eq("tmdb_id", tmdb)
    .maybeSingle();
  if (e1 || !mrow?.id) return [];
  const mid = mrow.id as string;
  const { data: rows, error } = await client
    .from("movie_user_takes")
    .select("user_id, tier, review, created_at, updated_at")
    .eq("movie_id", mid)
    .order("created_at", { ascending: false })
    .limit(Math.min(limit * 2, 80));
  if (error) return [];
  if (!rows?.length) return [];
  const withText = rows
    .filter((r) => typeof r.review === "string" && r.review.trim().length > 0)
    .slice(0, limit);
  if (!withText.length) return [];
  const uids = [...new Set(withText.map((r) => r.user_id as string))];
  const { data: profiles } = await client
    .from("profiles")
    .select("id, display_name, handle")
    .in("id", uids);
  const pmap = new Map(
    (profiles ?? []).map((p) => [
      p.id as string,
      p as { display_name: string | null; handle: string | null },
    ]),
  );
  return withText.map((r) => {
    const p = pmap.get(r.user_id as string);
    const tierRaw = r.tier as string;
    const tier = MOVIE_TAKE_TIERS.some((t) => t.id === tierRaw)
      ? (tierRaw as MovieTakeTier)
      : "okay";
    const row = r as { created_at?: string | null; updated_at?: string | null };
    const createdAt = row.created_at ?? row.updated_at ?? "";
    return {
      userId: r.user_id as string,
      tier,
      review: String(r.review).trim(),
      createdAt,
      displayName: p?.display_name ?? null,
      handle: p?.handle ?? null,
    };
  });
}
