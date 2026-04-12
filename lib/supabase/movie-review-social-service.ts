import type { SupabaseClient } from "@supabase/supabase-js";
import type { Movie } from "@/lib/types";
import { ensureMovieRow } from "@/lib/supabase/playlist-service";

const MAX_REPLY_LEN = 1000;

export type ReviewReplyRow = {
  id: string;
  userId: string;
  body: string;
  createdAt: string;
  displayName: string | null;
  handle: string | null;
};

export type ReviewEngagement = {
  likeCountByAuthor: Record<string, number>;
  /** Review author ids the current user has liked (cannot include self; DB enforces). */
  myLikedAuthorIds: string[];
  repliesByAuthor: Record<string, ReviewReplyRow[]>;
};

function emptyEngagement(): ReviewEngagement {
  return { likeCountByAuthor: {}, myLikedAuthorIds: [], repliesByAuthor: {} };
}

export async function fetchReviewEngagement(
  client: SupabaseClient,
  movie: Movie,
  currentUserId: string | null,
): Promise<ReviewEngagement> {
  const movieId = await ensureMovieRow(client, movie);
  if (!movieId) return emptyEngagement();

  const [likesRes, repliesRes] = await Promise.all([
    client
      .from("movie_take_review_likes")
      .select("review_author_id, liked_by_user_id")
      .eq("movie_id", movieId),
    client
      .from("movie_take_review_replies")
      .select("id, review_author_id, user_id, body, created_at")
      .eq("movie_id", movieId)
      .order("created_at", { ascending: true }),
  ]);

  const likes = likesRes.error ? [] : (likesRes.data ?? []);
  const replies = repliesRes.error ? [] : (repliesRes.data ?? []);

  const likeCountByAuthor: Record<string, number> = {};
  const myLikedAuthorIds: string[] = [];
  for (const row of likes) {
    const aid = row.review_author_id as string;
    const by = row.liked_by_user_id as string;
    likeCountByAuthor[aid] = (likeCountByAuthor[aid] ?? 0) + 1;
    if (currentUserId && by === currentUserId) myLikedAuthorIds.push(aid);
  }

  const replyRows = replies as {
    id: string;
    review_author_id: string;
    user_id: string;
    body: string;
    created_at: string;
  }[];
  const uids = [...new Set(replyRows.map((r) => r.user_id))];
  let pmap = new Map<
    string,
    { display_name: string | null; handle: string | null }
  >();
  if (uids.length) {
    const { data: profiles } = await client
      .from("profiles")
      .select("id, display_name, handle")
      .in("id", uids);
    pmap = new Map(
      (profiles ?? []).map((p) => [
        p.id as string,
        p as { display_name: string | null; handle: string | null },
      ]),
    );
  }

  const repliesByAuthor: Record<string, ReviewReplyRow[]> = {};
  for (const r of replyRows) {
    const aid = r.review_author_id;
    const p = pmap.get(r.user_id);
    const rr: ReviewReplyRow = {
      id: r.id,
      userId: r.user_id,
      body: String(r.body).trim(),
      createdAt: r.created_at,
      displayName: p?.display_name ?? null,
      handle: p?.handle ?? null,
    };
    if (!repliesByAuthor[aid]) repliesByAuthor[aid] = [];
    repliesByAuthor[aid]!.push(rr);
  }

  return { likeCountByAuthor, myLikedAuthorIds, repliesByAuthor };
}

export async function toggleReviewLike(
  client: SupabaseClient,
  movie: Movie,
  reviewAuthorId: string,
  currentUserId: string,
): Promise<boolean> {
  if (reviewAuthorId === currentUserId) return false;
  const movieId = await ensureMovieRow(client, movie);
  if (!movieId) return false;

  const { data: existing } = await client
    .from("movie_take_review_likes")
    .select("review_author_id")
    .eq("movie_id", movieId)
    .eq("review_author_id", reviewAuthorId)
    .eq("liked_by_user_id", currentUserId)
    .maybeSingle();

  if (existing) {
    const { error } = await client
      .from("movie_take_review_likes")
      .delete()
      .eq("movie_id", movieId)
      .eq("review_author_id", reviewAuthorId)
      .eq("liked_by_user_id", currentUserId);
    return !error;
  }

  const { error } = await client.from("movie_take_review_likes").insert({
    movie_id: movieId,
    review_author_id: reviewAuthorId,
    liked_by_user_id: currentUserId,
  });
  return !error;
}

export async function insertReviewReply(
  client: SupabaseClient,
  movie: Movie,
  reviewAuthorId: string,
  currentUserId: string,
  body: string,
): Promise<boolean> {
  const text = body.trim().slice(0, MAX_REPLY_LEN);
  if (!text) return false;
  const movieId = await ensureMovieRow(client, movie);
  if (!movieId) return false;
  const { error } = await client.from("movie_take_review_replies").insert({
    movie_id: movieId,
    review_author_id: reviewAuthorId,
    user_id: currentUserId,
    body: text,
  });
  return !error;
}
