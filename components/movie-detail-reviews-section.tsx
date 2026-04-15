"use client";

import { useEffect, useMemo, useState } from "react";
import type { ReviewEngagement } from "@/lib/supabase/movie-review-social-service";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { MovieMeterGauge } from "@/components/movie-meter-gauge";
import {
  CheckCircle2,
  Heart,
  Loader2,
  MessageCircle,
  MessageSquare,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MOVIE_TAKE_TIERS,
  type MovieTakeMeter,
  type MovieTakeReviewRow,
  type MovieTakeTier,
} from "@/lib/supabase/movie-takes-service";

const TAKE_BAR: Record<
  MovieTakeTier,
  { bar: string; ring: string }
> = {
  skip: { bar: "bg-red-500/85", ring: "ring-red-400/70" },
  okay: { bar: "bg-amber-400/90", ring: "ring-amber-300/70" },
  recommend: { bar: "bg-sky-500/85", ring: "ring-sky-400/70" },
  love: { bar: "bg-emerald-400/90", ring: "ring-emerald-300/70" },
};

const TIER_BADGE: Record<MovieTakeTier, string> = {
  skip: "bg-red-500/20 text-red-100",
  okay: "bg-amber-500/25 text-amber-50",
  recommend: "bg-sky-500/20 text-sky-100",
  love: "bg-emerald-500/20 text-emerald-100",
};

function formatDiscussionTime(iso: string): string {
  if (!iso) return "";
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return "";
  const diff = Date.now() - t;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 48) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 14) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export type MovieDetailReviewsSectionProps = {
  movieHasTmdb: boolean;
  supabase: SupabaseClient | null;
  userId: string | null;
  /** Shown on the composer card (e.g. first name or email local-part). */
  viewerDisplayName?: string | null;
  takesLoading: boolean;
  takeMeter: MovieTakeMeter;
  takesError: string | null;
  reviewSort: "recent" | "longest";
  onReviewSort: (v: "recent" | "longest") => void;
  sortedDiscussion: MovieTakeReviewRow[];
  discussionRowsShown: MovieTakeReviewRow[];
  showAllDiscussion: boolean;
  onShowAllDiscussion: (v: boolean) => void;
  reviewEngagement: ReviewEngagement | null;
  onToggleReviewLike: (reviewAuthorId: string) => Promise<boolean>;
  onPostReviewReply: (reviewAuthorId: string, body: string) => Promise<boolean>;
  takeTierDraft: MovieTakeTier | null;
  onTakeTierDraft: (t: MovieTakeTier) => void;
  takeReviewDraft: string;
  onTakeReviewDraft: (s: string) => void;
  /** Server-confirmed take; used for Posted / dirty states. */
  baselineTake: { tier: MovieTakeTier; review: string } | null;
  tierPostSaving: boolean;
  reviewPostSaving: boolean;
  onSaveTierPost: () => void;
  onSaveReviewPost: () => void;
};

export function MovieDetailReviewsSection({
  movieHasTmdb,
  supabase,
  userId,
  viewerDisplayName,
  takesLoading,
  takeMeter,
  takesError,
  reviewSort,
  onReviewSort,
  sortedDiscussion,
  discussionRowsShown,
  showAllDiscussion,
  onShowAllDiscussion,
  reviewEngagement,
  onToggleReviewLike,
  onPostReviewReply,
  takeTierDraft,
  onTakeTierDraft,
  takeReviewDraft,
  onTakeReviewDraft,
  baselineTake,
  tierPostSaving,
  reviewPostSaving,
  onSaveTierPost,
  onSaveReviewPost,
}: MovieDetailReviewsSectionProps) {
  const [showSpoilers, setShowSpoilers] = useState(true);
  const [likingAuthorId, setLikingAuthorId] = useState<string | null>(null);
  const [replyOpenFor, setReplyOpenFor] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [replying, setReplying] = useState(false);
  const [socialNotice, setSocialNotice] = useState<string | null>(null);

  useEffect(() => {
    if (!socialNotice) return;
    const t = window.setTimeout(() => setSocialNotice(null), 4000);
    return () => window.clearTimeout(t);
  }, [socialNotice]);
  const composerHandle = useMemo(() => {
    const raw = viewerDisplayName?.trim();
    if (raw) return `@${raw.replace(/^@+/, "")}`;
    return null;
  }, [viewerDisplayName]);
  const composerInitials = useMemo(() => {
    const raw = viewerDisplayName?.trim() || "You";
    return raw
      .split(/\s+/)
      .map((p) => p[0])
      .join("")
      .slice(0, 2)
      .toUpperCase();
  }, [viewerDisplayName]);

  const meterPosted = baselineTake != null;
  const meterDirty =
    meterPosted &&
    takeTierDraft != null &&
    takeTierDraft !== baselineTake.tier;
  const canSaveMeter = Boolean(takeTierDraft) && (!meterPosted || meterDirty);

  const savedReviewText = baselineTake?.review ?? "";
  const reviewDirty = takeReviewDraft !== savedReviewText;
  const reviewPosted = savedReviewText.trim().length > 0;
  const canSaveReview =
    meterPosted &&
    reviewDirty &&
    !reviewPostSaving;

  if (!movieHasTmdb) return null;

  return (
    <section className="rounded-3xl border border-white/[0.12] bg-gradient-to-b from-[#181818] to-[#121212] p-5 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] sm:p-7 md:p-8">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <MessageSquare className="size-5" />
          </div>
          <div>
            <h3 className="font-heading text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Reviews
            </h3>
            <p className="mt-0.5 max-w-xl text-sm text-white/50">
              Community vibe meter, then written takes — like and reply to others, sort, and
              post yours.
            </p>
          </div>
        </div>
      </div>

      {!supabase ? (
        <p className="text-sm text-white/55">
          Connecting to your account… open this film from the app while signed in to post a
          review.
        </p>
      ) : takesLoading ? (
        <div className="flex items-center gap-2 py-8 text-sm text-white/50">
          <Loader2 className="size-4 shrink-0 animate-spin" />
          Loading reviews…
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 bg-black/25 px-4 py-6 sm:px-6 sm:py-8">
            <MovieMeterGauge meter={takeMeter} size="lg" className="mx-auto max-w-md" />
          </div>

          {takeMeter.total > 0 ? (
            <div className="mt-4 flex h-2 w-full overflow-hidden rounded-full bg-white/10">
              {MOVIE_TAKE_TIERS.map(({ id }) => {
                const n = takeMeter[id];
                return (
                  <div
                    key={id}
                    className={cn("min-w-0 transition-[flex-grow]", TAKE_BAR[id].bar)}
                    style={{
                      flexGrow: takeMeter.total ? n : 0,
                      flexBasis: 0,
                    }}
                    title={`${id}: ${n}`}
                  />
                );
              })}
            </div>
          ) : null}

          {takesError ? (
            <p className="mt-4 text-sm text-amber-200/90">{takesError}</p>
          ) : null}

          {socialNotice ? (
            <p className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-100/90">
              {socialNotice}
            </p>
          ) : null}

          <div className="mt-8 flex flex-col gap-4 border-t border-white/10 pt-6 lg:flex-row lg:items-center lg:justify-between">
            <h4 className="text-base font-semibold text-white/95">Discussion</h4>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
              <Select
                value={reviewSort}
                onValueChange={(v) => onReviewSort((v as "recent" | "longest") ?? "recent")}
              >
                <SelectTrigger className="h-10 w-full border-white/15 bg-black/40 text-sm sm:w-[200px]">
                  <SelectValue placeholder="Sort" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="recent">Newest first</SelectItem>
                  <SelectItem value="longest">Longest write-up</SelectItem>
                </SelectContent>
              </Select>
              <label className="flex cursor-pointer items-center gap-2 text-xs text-white/60">
                <Switch
                  size="sm"
                  checked={showSpoilers}
                  onCheckedChange={setShowSpoilers}
                />
                Show spoilers in feed
              </label>
              <label
                className="flex cursor-not-allowed items-center gap-2 text-xs text-white/35"
                title="Following filter is coming soon."
              >
                <Switch size="sm" checked={false} disabled />
                Following only
              </label>
            </div>
          </div>

          <div className="mt-5 space-y-4">
            {sortedDiscussion.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-4 py-10 text-center text-sm text-white/45">
                No written reviews yet — add the first one below.
              </p>
            ) : (
              <>
                <ul className="space-y-4">
                  {discussionRowsShown.map((row) => {
                    const tierLabel =
                      MOVIE_TAKE_TIERS.find((t) => t.id === row.tier)?.label ?? row.tier;
                    const who =
                      row.handle?.trim() ||
                      row.displayName?.trim() ||
                      "Moviefy member";
                    const initials = who
                      .split(/\s+/)
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)
                      .toUpperCase();
                    const likeCount =
                      reviewEngagement?.likeCountByAuthor[row.userId] ?? 0;
                    const likedByMe = Boolean(
                      reviewEngagement?.myLikedAuthorIds.includes(row.userId),
                    );
                    const threadReplies =
                      reviewEngagement?.repliesByAuthor[row.userId] ?? [];
                    const isOwnReview = userId != null && row.userId === userId;
                    const likeDisabled =
                      !userId ||
                      isOwnReview ||
                      likingAuthorId === row.userId ||
                      !supabase;
                    return (
                      <li
                        key={row.userId}
                        className="rounded-2xl border border-white/10 bg-[#141414] px-4 py-4 sm:px-5 sm:py-5"
                      >
                        <div className="flex gap-4">
                          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-zinc-600 to-zinc-900 text-sm font-semibold text-white/90 ring-2 ring-white/10">
                            {initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="truncate text-base font-medium text-white">{who}</p>
                              <Badge
                                variant="secondary"
                                className={cn(
                                  "max-w-[min(100%,14rem)] border-0 text-[11px] font-medium leading-snug [overflow-wrap:anywhere]",
                                  TIER_BADGE[row.tier],
                                )}
                              >
                                {tierLabel}
                              </Badge>
                              <span className="text-xs text-white/35">
                                {formatDiscussionTime(row.createdAt)}
                              </span>
                            </div>
                            <p
                              className={cn(
                                "mt-3 whitespace-pre-wrap text-[15px] leading-relaxed text-white/88",
                                !showSpoilers && "select-none blur-[2.5px]",
                              )}
                            >
                              {row.review}
                            </p>
                            <div className="mt-4 flex flex-wrap items-center gap-3">
                              <button
                                type="button"
                                disabled={likeDisabled}
                                title={
                                  isOwnReview
                                    ? "You can’t like your own review"
                                    : !userId
                                      ? "Sign in to like reviews"
                                      : likedByMe
                                        ? "Unlike"
                                        : "Like this review"
                                }
                                onClick={() => {
                                  if (likeDisabled) return;
                                  setSocialNotice(null);
                                  setLikingAuthorId(row.userId);
                                  void (async () => {
                                    try {
                                      const ok = await onToggleReviewLike(row.userId);
                                      if (!ok) {
                                        setSocialNotice(
                                          "Could not update like. Ensure review social tables and policies are migrated for your auth mode.",
                                        );
                                      }
                                    } catch {
                                      setSocialNotice("Could not update like.");
                                    } finally {
                                      setLikingAuthorId(null);
                                    }
                                  })();
                                }}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                                  likedByMe
                                    ? "border-rose-400/50 bg-rose-500/15 text-rose-100"
                                    : "border-white/15 bg-black/30 text-white/70 hover:border-white/30 hover:text-white",
                                  likeDisabled && "cursor-not-allowed opacity-40",
                                )}
                              >
                                <Heart
                                  className={cn(
                                    "size-4 shrink-0",
                                    likedByMe && "fill-current text-rose-300",
                                  )}
                                />
                                {likeCount}
                              </button>
                              <button
                                type="button"
                                disabled={!userId}
                                title={
                                  !userId
                                    ? "Sign in to reply"
                                    : replyOpenFor === row.userId
                                      ? "Close reply"
                                      : "Reply"
                                }
                                onClick={() => {
                                  if (!userId) return;
                                  if (replyOpenFor === row.userId) {
                                    setReplyOpenFor(null);
                                    setReplyDraft("");
                                  } else {
                                    setReplyOpenFor(row.userId);
                                    setReplyDraft("");
                                  }
                                }}
                                className={cn(
                                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
                                  replyOpenFor === row.userId
                                    ? "border-sky-400/50 bg-sky-500/15 text-sky-100"
                                    : "border-white/15 bg-black/30 text-white/70 hover:border-white/30 hover:text-white",
                                  !userId && "cursor-not-allowed opacity-40",
                                )}
                              >
                                <MessageCircle className="size-4 shrink-0" />
                                Reply
                                {threadReplies.length > 0 ? (
                                  <span className="tabular-nums text-white/50">
                                    ({threadReplies.length})
                                  </span>
                                ) : null}
                              </button>
                            </div>

                            {replyOpenFor === row.userId && userId ? (
                              <div className="mt-4 space-y-2 rounded-xl border border-white/10 bg-black/35 p-3">
                                <textarea
                                  value={replyDraft}
                                  onChange={(e) =>
                                    setReplyDraft(e.target.value.slice(0, 1000))
                                  }
                                  rows={3}
                                  placeholder="Write a reply…"
                                  className="w-full resize-y rounded-lg border border-white/10 bg-black/50 px-3 py-2 text-sm text-white placeholder:text-white/35 focus-visible:border-primary/50 focus-visible:outline-none"
                                />
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[10px] text-white/35">
                                    {replyDraft.length}/1000
                                  </span>
                                  <Button
                                    type="button"
                                    size="sm"
                                    disabled={
                                      replying || replyDraft.trim().length === 0
                                    }
                                    onClick={() => {
                                      setSocialNotice(null);
                                      setReplying(true);
                                      void (async () => {
                                        try {
                                          const ok = await onPostReviewReply(
                                            row.userId,
                                            replyDraft,
                                          );
                                          if (ok) {
                                            setReplyDraft("");
                                            setReplyOpenFor(null);
                                          } else {
                                            setSocialNotice(
                                              "Could not post reply. Ensure review social tables and policies are migrated for your auth mode.",
                                            );
                                          }
                                        } catch {
                                          setSocialNotice("Could not post reply.");
                                        } finally {
                                          setReplying(false);
                                        }
                                      })();
                                    }}
                                  >
                                    {replying ? (
                                      <Loader2 className="size-4 animate-spin" />
                                    ) : (
                                      "Post reply"
                                    )}
                                  </Button>
                                </div>
                              </div>
                            ) : null}

                            {threadReplies.length > 0 ? (
                              <ul className="mt-4 space-y-3 border-l-2 border-white/10 pl-4">
                                {threadReplies.map((rep) => {
                                  const rw =
                                    rep.handle?.trim() ||
                                    rep.displayName?.trim() ||
                                    "Member";
                                  return (
                                    <li key={rep.id} className="text-sm">
                                      <p className="text-[11px] text-white/45">
                                        <span className="font-medium text-white/70">
                                          {rw}
                                        </span>
                                        <span className="mx-1.5 text-white/25">·</span>
                                        {formatDiscussionTime(rep.createdAt)}
                                      </p>
                                      <p className="mt-1 whitespace-pre-wrap leading-relaxed text-white/82">
                                        {rep.body}
                                      </p>
                                    </li>
                                  );
                                })}
                              </ul>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
                {sortedDiscussion.length > 5 && !showAllDiscussion ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="w-full border-white/15 bg-black/30 py-5 text-white/85 hover:bg-white/10"
                    onClick={() => onShowAllDiscussion(true)}
                  >
                    Show all {sortedDiscussion.length} reviews
                  </Button>
                ) : null}
                {showAllDiscussion && sortedDiscussion.length > 5 ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="w-full text-white/55 hover:text-white"
                    onClick={() => onShowAllDiscussion(false)}
                  >
                    Show fewer
                  </Button>
                ) : null}
              </>
            )}
          </div>

          <div className="mt-10 border-t border-white/10 pt-8">
            <h4 className="mb-4 font-heading text-lg font-semibold text-white">
              Your vibe &amp; review
            </h4>
            {userId ? (
              <div className="space-y-6">
                <div className="rounded-2xl border border-white/10 bg-[#101010] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                    <div className="flex gap-3">
                      <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10 text-sm font-semibold text-white">
                        {composerInitials}
                      </div>
                      <div className="min-w-0 pt-0.5">
                        <p className="text-sm font-medium text-white">
                          {composerHandle ?? "Signed in"}
                        </p>
                        <p className="text-xs text-white/40">
                          Meter is public to signed-in members
                        </p>
                      </div>
                    </div>
                    {meterPosted && !meterDirty ? (
                      <Badge
                        variant="secondary"
                        className="gap-1 border-0 bg-emerald-500/20 text-[11px] font-medium text-emerald-100"
                      >
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        Posted
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mb-3 mt-5 text-[11px] font-medium uppercase tracking-wider text-white/40">
                    Vibe meter
                  </p>
                  <p className="mb-4 text-xs leading-relaxed text-white/45">
                    Pick how you felt and post — no write-up needed. Change your meter anytime.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {MOVIE_TAKE_TIERS.map(({ id, label, hint }) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => onTakeTierDraft(id)}
                        className={cn(
                          "min-h-[3.75rem] min-w-[6.25rem] flex-1 rounded-2xl border px-2.5 py-2 text-center text-xs font-semibold leading-tight transition sm:min-w-[7.25rem] sm:max-w-[10.5rem] sm:px-3 sm:text-[13px]",
                          takeTierDraft === id
                            ? cn(
                                "border-white/30 bg-white/10 text-white ring-2",
                                TAKE_BAR[id].ring,
                              )
                            : "border-white/10 bg-black/40 text-white/75 hover:border-white/25 hover:text-white",
                        )}
                      >
                        <span className="line-clamp-3 [overflow-wrap:anywhere]">{label}</span>
                        <span className="mt-1 block text-[9px] font-normal leading-snug text-white/40 sm:text-[10px]">
                          {hint}
                        </span>
                      </button>
                    ))}
                  </div>
                  <div className="mt-5 flex justify-end">
                    <Button
                      type="button"
                      size="lg"
                      disabled={tierPostSaving || !canSaveMeter}
                      onClick={() => void onSaveTierPost()}
                      className="min-w-[8.5rem] rounded-full bg-white px-8 text-base font-semibold text-black hover:bg-white/90"
                    >
                      {tierPostSaving ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          Saving…
                        </span>
                      ) : meterPosted && meterDirty ? (
                        "Update meter"
                      ) : meterPosted ? (
                        "Posted"
                      ) : (
                        "Post meter"
                      )}
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#101010] p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-white/10 pb-4">
                    <div>
                      <p className="text-sm font-medium text-white">Written review</p>
                      <p className="mt-1 text-xs text-white/45">
                        Optional — shows in community reviews below. Post your meter first.
                      </p>
                    </div>
                    {reviewPosted && !reviewDirty ? (
                      <Badge
                        variant="secondary"
                        className="gap-1 border-0 bg-emerald-500/20 text-[11px] font-medium text-emerald-100"
                      >
                        <CheckCircle2 className="size-3.5 shrink-0" />
                        Posted
                      </Badge>
                    ) : null}
                  </div>
                  <label className="mt-5 block space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm text-white/55">Write-up</span>
                      <span className="text-xs tabular-nums text-white/35">
                        {takeReviewDraft.length}/2000
                      </span>
                    </div>
                    <textarea
                      value={takeReviewDraft}
                      onChange={(e) =>
                        onTakeReviewDraft(e.target.value.slice(0, 2000))
                      }
                      rows={5}
                      disabled={!meterPosted}
                      placeholder={
                        meterPosted
                          ? "What worked, what didn’t — keep it kind."
                          : "Post your meter above to unlock the write-up."
                      }
                      className="w-full resize-y rounded-xl border border-white/10 bg-black/50 px-4 py-3 text-[15px] leading-relaxed text-white placeholder:text-white/30 focus-visible:border-primary/50 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-45"
                    />
                  </label>
                  <div className="mt-5 flex justify-end">
                    <Button
                      type="button"
                      size="lg"
                      variant={reviewPosted ? "secondary" : "default"}
                      disabled={!canSaveReview}
                      onClick={() => void onSaveReviewPost()}
                      className={cn(
                        "min-w-[8.5rem] rounded-full px-8 text-base font-semibold",
                        reviewPosted
                          ? "border-white/15 bg-white/10 text-white hover:bg-white/15"
                          : "bg-white text-black hover:bg-white/90",
                      )}
                    >
                      {reviewPostSaving ? (
                        <span className="inline-flex items-center gap-2">
                          <Loader2 className="size-4 animate-spin" />
                          Saving…
                        </span>
                      ) : reviewPosted ? (
                        "Update review"
                      ) : (
                        "Post review"
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="rounded-2xl border border-white/10 bg-black/25 px-4 py-6 text-sm text-white/50">
                Sign in from the home screen to post your meter and an optional review here.
              </p>
            )}
          </div>
        </>
      )}
    </section>
  );
}
