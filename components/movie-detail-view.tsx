"use client";

import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import type { SupabaseClient } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PosterImage } from "@/components/poster-image";
import {
  ArrowLeft,
  Eye,
  ExternalLink,
  Heart,
  ListVideo,
  Loader2,
  MessageSquare,
  Play,
  Plus,
  X,
} from "lucide-react";
import { MovieDetailReviewsSection } from "@/components/movie-detail-reviews-section";
import { MovieVibeDonut } from "@/components/movie-vibe-donut";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MovieEnrichResponse } from "@/lib/movie-enrich-types";
import {
  readEnrichCache,
  writeEnrichCache,
} from "@/lib/movie-enrich-prefetch";
import type { Movie } from "@/lib/types";
import { cn } from "@/lib/utils";
import { scoreDisplayParts, sortRatingsBySite } from "@/lib/movie-rating-display";
import {
  type MovieTakeMeter,
  type MovieTakeReviewRow,
  type MovieTakeTier,
  fetchMovieTakeMeter,
  fetchMovieTakeReviews,
  fetchOwnMovieTake,
  upsertMovieUserTakeReviewOnly,
  upsertMovieUserTakeTierOnly,
} from "@/lib/supabase/movie-takes-service";
import {
  fetchReviewEngagement,
  insertReviewReply as insertReviewReplyDb,
  toggleReviewLike as toggleReviewLikeDb,
  type ReviewEngagement,
} from "@/lib/supabase/movie-review-social-service";
import { vibeSlicesFromTmdbGenres } from "@/lib/movie-vibe-chart";

export type MovieDetailViewProps = {
  movie: Movie | null;
  /** Load / reset detail state (e.g. dialog open or page mounted). */
  active: boolean;
  variant: "dialog" | "page";
  /** Close control (dialog ✕); optional on page. */
  onRequestClose?: () => void;
  /** Used with variant="page" for the sticky back control */
  backHref?: string;
  inActiveList: boolean;
  saved: boolean;
  onToggleSave: () => void;
  onAddToList: () => void;
  /** In the user’s primary Watched log playlist. */
  watched?: boolean;
  /** Add/remove from Watched log (creates list if needed). */
  onToggleWatched?: () => void | Promise<void>;
  watchedBusy?: boolean;
  supabase: SupabaseClient | null;
  userId: string | null;
  /** Shown on the review composer (first name, @handle, etc.). */
  viewerDisplayName?: string | null;
  /** TMDB catalogue: movie (default) or tv — must match `media` on `/app/movie/[id]`. */
  tmdbMedia?: "movie" | "tv";
};

/** Page: document flow (window scroll — avoids nested scroll traps). Dialog: Radix scroll area. */
function MovieDetailScrollShell({
  isPage,
  children,
}: {
  isPage: boolean;
  children: ReactNode;
}) {
  if (isPage) {
    return <div className="w-full min-w-0">{children}</div>;
  }
  return (
    <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-hidden">
      {children}
    </ScrollArea>
  );
}

function MovieDetailPageLoadingGate({
  movie,
  backHref,
}: {
  movie: Movie;
  backHref: string;
}) {
  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-card text-white">
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-start bg-gradient-to-b from-black/30 via-transparent to-transparent px-3 pb-10 pt-[max(0.35rem,env(safe-area-inset-top))] sm:px-5 sm:pb-12">
        <Link
          href={backHref}
          aria-label="Back"
          className="pointer-events-auto inline-flex size-11 items-center justify-center rounded-full border border-white/[0.22] bg-white/[0.08] text-white shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:border-white/30 hover:bg-white/[0.14] active:scale-[0.97]"
        >
          <ArrowLeft className="size-[1.35rem] shrink-0" strokeWidth={2.25} />
        </Link>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 pb-24">
        <Loader2 className="size-10 animate-spin text-primary/90" aria-hidden />
        <div className="max-w-sm text-center">
          <p className="font-heading text-lg font-semibold text-white">{movie.title}</p>
          <p className="mt-2 text-sm text-white/50">Loading details…</p>
        </div>
      </div>
    </div>
  );
}

export function MovieDetailView({
  movie,
  active,
  variant,
  onRequestClose,
  backHref = "/app",
  inActiveList,
  saved,
  onToggleSave,
  onAddToList,
  watched = false,
  onToggleWatched,
  watchedBusy = false,
  supabase,
  userId,
  viewerDisplayName = null,
  tmdbMedia = "movie",
}: MovieDetailViewProps) {
  const [data, setData] = useState<MovieEnrichResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);
  const [reviewEmbedId, setReviewEmbedId] = useState<string | null>(null);
  const [reviewEmbedTitle, setReviewEmbedTitle] = useState("");
  const [takeMeter, setTakeMeter] = useState<MovieTakeMeter>({
    skip: 0,
    okay: 0,
    recommend: 0,
    love: 0,
    total: 0,
  });
  const [takeTierDraft, setTakeTierDraft] = useState<MovieTakeTier | null>(null);
  const [takeReviewDraft, setTakeReviewDraft] = useState("");
  /** Last tier + review loaded from or confirmed by the server (for Posted / dirty UI). */
  const [baselineTake, setBaselineTake] = useState<{
    tier: MovieTakeTier;
    review: string;
  } | null>(null);
  const [takesLoading, setTakesLoading] = useState(false);
  const [tierPostSaving, setTierPostSaving] = useState(false);
  const [reviewPostSaving, setReviewPostSaving] = useState(false);
  const [takesError, setTakesError] = useState<string | null>(null);
  const [reviewFeed, setReviewFeed] = useState<MovieTakeReviewRow[]>([]);
  const [reviewEngagement, setReviewEngagement] = useState<ReviewEngagement | null>(
    null,
  );
  const [reviewSort, setReviewSort] = useState<"recent" | "longest">("recent");
  const [showAllDiscussion, setShowAllDiscussion] = useState(false);

  useLayoutEffect(() => {
    if (!active || !movie?.tmdbId) return;
    const cached = readEnrichCache(movie.tmdbId, tmdbMedia);
    if (cached) {
      setData(cached);
      setLoading(false);
    }
  }, [active, movie?.tmdbId, tmdbMedia]);

  useEffect(() => {
    if (!active) {
      setTrailerOpen(false);
      setReviewEmbedId(null);
      setReviewEmbedTitle("");
      setTakeMeter({ skip: 0, okay: 0, recommend: 0, love: 0, total: 0 });
      setTakeTierDraft(null);
      setTakeReviewDraft("");
      setTakesError(null);
      setReviewFeed([]);
      setReviewEngagement(null);
      setReviewSort("recent");
    }
  }, [active]);

  useEffect(() => {
    if (!active || !movie) {
      setData(null);
      setError(null);
      setLoading(true);
      return;
    }

    const ctrl = new AbortController();
    setError(null);

    const cached =
      movie.tmdbId != null ? readEnrichCache(movie.tmdbId, tmdbMedia) : null;
    if (cached) {
      setData(cached);
      setLoading(false);
    } else {
      setLoading(true);
      setData(null);
    }

    const params = new URLSearchParams();
    params.set("title", movie.title);
    params.set("year", String(movie.year));
    if (movie.tmdbId != null) params.set("tmdbId", String(movie.tmdbId));
    if (tmdbMedia === "tv") params.set("media", "tv");

    fetch(`/api/movie/enrich?${params.toString()}`, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load details");
        return res.json() as Promise<MovieEnrichResponse>;
      })
      .then((json) => {
        if (ctrl.signal.aborted) return;
        if (movie.tmdbId != null) writeEnrichCache(movie.tmdbId, json, tmdbMedia);
        if (cached) {
          startTransition(() => setData(json));
        } else {
          setData(json);
        }
        setError(null);
      })
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") return;
        setError("Could not load live scores and streaming.");
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setLoading(false);
      });

    return () => ctrl.abort();
  }, [active, movie?.id, movie?.title, movie?.year, movie?.tmdbId, tmdbMedia]);

  const movieHasTmdb = Boolean(
    movie &&
      (movie.tmdbId != null ||
        (typeof movie.id === "string" && movie.id.startsWith("tmdb-"))),
  );

  useEffect(() => {
    if (!active || !movie || !supabase || !movieHasTmdb) {
      if (!active || !movie) {
        setTakeMeter({ skip: 0, okay: 0, recommend: 0, love: 0, total: 0 });
        setTakeTierDraft(null);
        setTakeReviewDraft("");
        setBaselineTake(null);
      }
      return;
    }
    let cancelled = false;
    setTakesLoading(true);
    setTakesError(null);
    void (async () => {
      try {
        const meter = await fetchMovieTakeMeter(supabase, movie);
        if (cancelled) return;
        setTakeMeter(meter);
        if (userId) {
          const own = await fetchOwnMovieTake(supabase, userId, movie);
          if (cancelled) return;
          setTakeTierDraft(own?.tier ?? null);
          setTakeReviewDraft(own?.review ?? "");
          setBaselineTake(
            own ? { tier: own.tier, review: own.review } : null,
          );
        } else {
          setTakeTierDraft(null);
          setTakeReviewDraft("");
          setBaselineTake(null);
        }
      } catch {
        if (!cancelled) {
          setTakesError("Could not load community takes (check Supabase migration).");
        }
      } finally {
        if (!cancelled) setTakesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [active, supabase, userId, movie?.id, movie?.tmdbId, movieHasTmdb]);

  useEffect(() => {
    if (!active || !movie || !supabase || !movieHasTmdb) {
      setReviewFeed([]);
      setReviewEngagement(null);
      return;
    }
    let cancelled = false;
    void fetchMovieTakeReviews(supabase, movie).then((rows) => {
      if (!cancelled) setReviewFeed(rows);
    });
    void fetchReviewEngagement(supabase, movie, userId).then((eng) => {
      if (!cancelled) setReviewEngagement(eng);
    });
    return () => {
      cancelled = true;
    };
  }, [active, supabase, movie?.id, movieHasTmdb, userId]);

  const sortedDiscussion = useMemo(() => {
    const list = [...reviewFeed];
    if (reviewSort === "longest") {
      list.sort((a, b) => b.review.length - a.review.length);
    } else {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
    }
    return list;
  }, [reviewFeed, reviewSort]);

  const discussionRowsShown = useMemo(() => {
    if (showAllDiscussion) return sortedDiscussion;
    return sortedDiscussion.slice(0, 5);
  }, [sortedDiscussion, showAllDiscussion]);

  useEffect(() => {
    setShowAllDiscussion(false);
  }, [movie?.id]);

  useLayoutEffect(() => {
    if (variant !== "page" || !active || !movie?.id) return;
    const scrollTop = () => {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    scrollTop();
    const id = requestAnimationFrame(() => {
      scrollTop();
      requestAnimationFrame(scrollTop);
    });
    return () => cancelAnimationFrame(id);
  }, [variant, active, movie?.id]);

  const m = movie;

  const refreshTakeAfterSave = useCallback(async () => {
    if (!supabase || !userId || !movie) return;
    const [meter, own, reviews] = await Promise.all([
      fetchMovieTakeMeter(supabase, movie),
      fetchOwnMovieTake(supabase, userId, movie),
      fetchMovieTakeReviews(supabase, movie),
    ]);
    setTakeMeter(meter);
    if (own) {
      setTakeTierDraft(own.tier);
      setTakeReviewDraft(own.review);
      setBaselineTake({ tier: own.tier, review: own.review });
    } else {
      setBaselineTake(null);
    }
    setReviewFeed(reviews);
    setReviewEngagement(await fetchReviewEngagement(supabase, movie, userId));
  }, [supabase, userId, movie]);

  const handleToggleReviewLike = useCallback(
    async (reviewAuthorId: string): Promise<boolean> => {
      if (!supabase || !userId || !movie) return false;
      const ok = await toggleReviewLikeDb(
        supabase,
        movie,
        reviewAuthorId,
        userId,
      );
      if (ok) {
        setReviewEngagement(
          await fetchReviewEngagement(supabase, movie, userId),
        );
      }
      return ok;
    },
    [supabase, userId, movie],
  );

  const handlePostReviewReply = useCallback(
    async (reviewAuthorId: string, body: string): Promise<boolean> => {
      if (!supabase || !userId || !movie) return false;
      const ok = await insertReviewReplyDb(
        supabase,
        movie,
        reviewAuthorId,
        userId,
        body,
      );
      if (ok) {
        setReviewEngagement(
          await fetchReviewEngagement(supabase, movie, userId),
        );
      }
      return ok;
    },
    [supabase, userId, movie],
  );

  const saveTierPost = useCallback(async () => {
    if (!supabase || !userId || !movie) return;
    if (!takeTierDraft) {
      setTakesError("Pick a tier (Skip → Love) before posting your meter.");
      return;
    }
    setTierPostSaving(true);
    setTakesError(null);
    const ok = await upsertMovieUserTakeTierOnly(
      supabase,
      userId,
      movie,
      takeTierDraft,
    );
    if (!ok) {
      setTakesError(
        "Could not save your meter. Run supabase/migrate-movie-user-takes.sql if the table is missing.",
      );
      setTierPostSaving(false);
      return;
    }
    await refreshTakeAfterSave();
    setTierPostSaving(false);
  }, [supabase, userId, movie, takeTierDraft, refreshTakeAfterSave]);

  const saveReviewPost = useCallback(async () => {
    if (!supabase || !userId || !movie) return;
    if (!baselineTake) {
      setTakesError("Post your vibe meter first, then you can add a written review.");
      return;
    }
    setReviewPostSaving(true);
    setTakesError(null);
    const ok = await upsertMovieUserTakeReviewOnly(
      supabase,
      userId,
      movie,
      takeReviewDraft,
      baselineTake.tier,
    );
    if (!ok) {
      setTakesError(
        "Could not save your review. Run supabase/migrate-movie-user-takes.sql if the table is missing.",
      );
      setReviewPostSaving(false);
      return;
    }
    await refreshTakeAfterSave();
    setReviewPostSaving(false);
  }, [supabase, userId, movie, takeReviewDraft, baselineTake, refreshTakeAfterSave]);

  function openTrailer() {
    if (!m || loading) return;
    const key = data?.trailerYoutubeKey;
    setActiveTrailerKey(key ?? null);
    setTrailerOpen(true);
  }

  function handleTrailerClick() {
    openTrailer();
  }

  const heroImageUrl =
    (data?.tmdbBackdropUrl && data.tmdbBackdropUrl.length > 8
      ? data.tmdbBackdropUrl
      : null) ||
    (m?.posterImage && m.posterImage.length > 4 ? m.posterImage : null);

  const isPage = variant === "page";
  const heroMin =
    "relative isolate w-full shrink-0 overflow-hidden bg-card " +
    (isPage
      ? "min-h-[min(92vh,28rem)] sm:min-h-[min(90vh,32rem)] md:min-h-[min(86vh,38rem)] lg:min-h-[min(82vh,44rem)] xl:min-h-[min(78vh,52rem)]"
      : "min-h-[min(44vw,11rem)] sm:min-h-[12.5rem] md:min-h-[15rem]");

  const mainColumn = m ? (
    <>
      {isPage ? (
        <h1 className="sr-only">{m.title}</h1>
      ) : (
        <DialogTitle className="sr-only">{m.title}</DialogTitle>
      )}
      <div
        className={cn(
          "flex flex-1 flex-col",
          isPage ? "min-h-dvh overflow-x-hidden" : "min-h-0 overflow-hidden",
        )}
      >
        <div
          className={cn(
            "flex w-full min-w-0 flex-1 flex-col",
            isPage ? "overflow-x-hidden" : "min-h-0 overflow-hidden",
          )}
        >
                <div className={heroMin}>
                  <>
                      {heroImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={heroImageUrl}
                          alt=""
                          className="absolute inset-0 z-0 size-full object-cover object-[center_22%]"
                        />
                      ) : (
                        <div
                          className="absolute inset-0 z-0 bg-gradient-to-br from-zinc-800 to-zinc-950"
                          aria-hidden
                        />
                      )}
                      <div
                        className="absolute inset-0 z-[1] bg-gradient-to-t from-[#121212] via-[#121212]/65 via-50% to-black/20"
                        aria-hidden
                      />
                      <div
                        className="absolute inset-0 z-[1] bg-gradient-to-b from-black/45 via-transparent to-transparent"
                        aria-hidden
                      />
                      {isPage ? (
                        <div
                          className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] h-[min(58%,22rem)] bg-gradient-to-t from-[#121212] from-10% via-[#121212]/88 to-transparent sm:h-[min(54%,26rem)] lg:h-[min(50%,28rem)]"
                          aria-hidden
                        />
                      ) : null}
                      {isPage ? (
                        <div
                          className="pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-44 bg-[radial-gradient(120%_100%_at_50%_100%,#121212_0%,rgba(18,18,18,0.55)_45%,transparent_78%)] opacity-90 sm:h-52"
                          aria-hidden
                        />
                      ) : null}
                      {isPage ? (
                        <button
                          type="button"
                          disabled={loading}
                          onClick={() => openTrailer()}
                          className="group absolute inset-0 z-[5] flex flex-col items-center justify-center gap-3 bg-black/0 transition hover:bg-black/25 disabled:pointer-events-none disabled:opacity-40"
                          aria-label={
                            data?.trailerYoutubeKey
                              ? "Play trailer"
                              : "Trailer unavailable from TMDB"
                          }
                        >
                          <span className="flex size-[4.5rem] items-center justify-center rounded-full bg-white/95 text-black shadow-[0_12px_40px_rgba(0,0,0,0.55)] ring-4 ring-black/30 transition group-hover:scale-105 group-active:scale-95 sm:size-24 sm:ring-8">
                            <Play className="ml-1 size-9 fill-current sm:size-11" />
                          </span>
                          <span className="rounded-full bg-black/55 px-4 py-1.5 text-xs font-medium text-white/95 backdrop-blur-sm sm:text-sm">
                            {loading
                              ? "Loading…"
                              : data?.trailerYoutubeKey
                                ? "Watch trailer"
                                : "Trailer"}
                          </span>
                        </button>
                      ) : null}
                  </>
                  {isPage ? (
                    <div className="pointer-events-none absolute inset-x-0 top-0 z-[12] flex items-start justify-between gap-2 bg-gradient-to-b from-black/25 via-transparent to-transparent px-3 pb-10 pt-[max(0.35rem,env(safe-area-inset-top))] sm:px-4 sm:pb-12">
                      <Link
                        href={backHref}
                        aria-label="Back"
                        className="pointer-events-auto inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-white/[0.22] bg-white/[0.08] text-white shadow-[0_4px_24px_rgba(0,0,0,0.35)] backdrop-blur-xl transition hover:border-white/30 hover:bg-white/[0.14] active:scale-[0.97]"
                      >
                        <ArrowLeft className="size-[1.35rem] shrink-0" strokeWidth={2.25} />
                      </Link>
                    </div>
                  ) : null}
                  {!isPage ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute right-2 top-2 z-20 rounded-full border border-white/10 bg-black/40 text-white hover:bg-black/60"
                      aria-label="Close"
                      onClick={() => onRequestClose?.()}
                    >
                      <X className="size-4" />
                    </Button>
                  ) : null}
                </div>

                <div
                  className={cn(
                    "relative z-10 flex flex-1 flex-col bg-card",
                    isPage
                      ? "-mt-[5.5rem] overflow-x-hidden overflow-y-visible sm:-mt-32 md:-mt-[8.5rem] lg:-mt-[10rem] xl:-mt-[11rem]"
                      : "min-h-0 overflow-hidden -mt-14 sm:-mt-16 md:-mt-[4.25rem]",
                  )}
                >
                  <MovieDetailScrollShell isPage={isPage}>
                    <div
                      className={cn(
                        "min-w-0 pb-4",
                        isPage
                          ? "mx-auto w-full max-w-[min(100%,92rem)] space-y-6 px-4 pb-[calc(6rem+env(safe-area-inset-bottom,0px))] pt-4 sm:space-y-8 sm:px-6 sm:pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] sm:pt-6 md:px-10 md:pt-8 lg:px-12 xl:px-14"
                          : "space-y-5 px-5 pt-1 md:px-6 md:pb-4 md:pt-2",
                      )}
                    >
                      <header
                        className={cn(
                          "flex gap-5 pr-1 md:gap-7 md:pr-2",
                          isPage && "flex-col sm:flex-row sm:items-end sm:justify-between",
                        )}
                      >
                        <div className="flex min-w-0 gap-5 md:gap-7">
                          <div
                            className={cn(
                              "relative -mt-1 shrink-0 overflow-hidden rounded-xl shadow-[0_22px_60px_-12px_rgba(0,0,0,0.95)] ring-2 ring-white/12",
                              isPage
                                ? "h-40 w-[6.75rem] sm:h-48 sm:w-32 md:h-52 md:w-[8.5rem] lg:h-56 lg:w-36"
                                : "h-[7.75rem] w-[5.125rem] rounded-lg sm:h-[8.75rem] sm:w-[5.875rem] md:h-36 md:w-24",
                            )}
                          >
                            <PosterImage
                              src={m.posterImage}
                              alt=""
                              fill
                              placeholderGradient={m.posterClass}
                              className="object-cover"
                              sizes={isPage ? "(max-width:768px) 120px, 144px" : "96px"}
                              priority
                            />
                          </div>
                          <div className="min-w-0 flex-1 space-y-3 pt-0.5 md:pt-1">
                            <h2
                              className={cn(
                                "font-heading font-semibold leading-[1.1] tracking-tight text-white line-clamp-3",
                                isPage
                                  ? "text-3xl sm:text-4xl lg:text-5xl xl:text-[3.25rem]"
                                  : "text-xl md:text-2xl",
                              )}
                            >
                              {m.title}
                            </h2>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge
                                variant="secondary"
                                className="border-0 bg-white/10 px-2.5 py-0.5 text-sm text-white"
                              >
                                {m.year}
                              </Badge>
                              <Badge
                                variant="outline"
                                className="border-white/20 px-2.5 py-0.5 text-sm text-white/90"
                              >
                                {m.genre}
                              </Badge>
                              {data?.runtimeMinutes ? (
                                <Badge
                                  variant="outline"
                                  className="border-white/20 px-2.5 py-0.5 text-sm text-white/80"
                                >
                                  {data.runtimeMinutes} min
                                </Badge>
                              ) : null}
                            </div>
                          </div>
                        </div>
                        {isPage ? (
                          <div className="flex w-full flex-col gap-2.5 sm:max-w-2xl sm:flex-row sm:flex-wrap sm:justify-end">
                            {onToggleWatched ? (
                              <Button
                                type="button"
                                size="lg"
                                variant={watched ? "secondary" : "outline"}
                                className={cn(
                                  "h-12 flex-1 rounded-xl border-white/20 bg-white/[0.06] text-base font-semibold text-white hover:bg-white/10 sm:flex-none sm:min-w-[8.5rem] sm:px-5",
                                  watched && "border-sky-400/40 bg-sky-500/15 text-sky-100",
                                )}
                                disabled={watchedBusy || !userId}
                                onClick={() => void onToggleWatched()}
                              >
                                {watchedBusy ? (
                                  <Loader2 className="mr-2 size-5 shrink-0 animate-spin" />
                                ) : (
                                  <Eye
                                    className={cn(
                                      "mr-2 size-5 shrink-0",
                                      watched && "text-sky-200",
                                    )}
                                  />
                                )}
                                {watched ? "Watched" : "Mark watched"}
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              size="lg"
                              variant={saved ? "secondary" : "default"}
                              className={cn(
                                "h-12 flex-1 rounded-xl text-base font-semibold sm:flex-none sm:px-8",
                                saved && "border-primary/30",
                              )}
                              disabled={!userId}
                              onClick={() => void onToggleSave()}
                            >
                              <Heart
                                className={cn(
                                  "mr-2 size-5",
                                  saved && "fill-current text-primary",
                                )}
                              />
                              {saved ? "Saved" : "Save"}
                            </Button>
                            <Button
                              type="button"
                              size="lg"
                              variant="secondary"
                              className="h-12 flex-1 rounded-xl border-white/15 bg-white/10 text-base font-semibold text-white hover:bg-white/15 sm:flex-none sm:px-6"
                              disabled={loading}
                              onClick={() => openTrailer()}
                            >
                              <ListVideo className="mr-2 size-5" />
                              {loading ? "Trailer…" : "Trailer"}
                            </Button>
                            <Button
                              type="button"
                              size="lg"
                              variant="outline"
                              className="h-12 flex-1 rounded-xl border-white/20 bg-transparent text-base font-semibold sm:flex-none sm:px-6"
                              disabled={inActiveList}
                              onClick={() => onAddToList()}
                            >
                              <Plus className="mr-2 size-5" />
                              {inActiveList ? "In a list" : "Add to list"}
                            </Button>
                          </div>
                        ) : null}
                      </header>

                      {loading ? (
                        <div className="flex items-center gap-2 py-2 text-sm text-white/50">
                          <Loader2 className="size-4 animate-spin shrink-0" />
                          Loading synopsis, scores, streaming, and reviews…
                        </div>
                      ) : error ? (
                        <p className="text-sm text-amber-200/90">{error}</p>
                      ) : null}

                      {data?.warnings?.length ? (
                        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
                          {data.warnings.map((w) => (
                            <p key={w}>{w}</p>
                          ))}
                        </div>
                      ) : null}

                      <section>
                        <h3
                          className={cn(
                            "mb-2 font-semibold uppercase tracking-wider text-white/45",
                            isPage
                              ? "text-xs sm:text-sm"
                              : "text-[11px]",
                          )}
                        >
                          Overview
                        </h3>
                        {!loading &&
                          (data?.overview?.trim() ? (
                            <p
                              className={cn(
                                "max-w-4xl leading-relaxed text-white/80",
                                isPage
                                  ? "text-base sm:text-lg"
                                  : "max-w-3xl text-[15px]",
                              )}
                            >
                              {data.overview.trim()}
                            </p>
                          ) : (
                            <p className="max-w-3xl text-sm text-white/50 sm:text-base">
                              No synopsis returned. TMDB match helps fill this in.
                            </p>
                          ))}
                      </section>

                      {!loading &&
                      isPage &&
                      data?.tmdbGenres &&
                      data.tmdbGenres.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {data.tmdbGenres.map((g) => (
                            <Badge
                              key={g.id}
                              variant="outline"
                              className="rounded-full border-white/15 bg-white/[0.06] px-3 py-1 text-sm font-normal text-white/85"
                            >
                              {g.name}
                            </Badge>
                          ))}
                        </div>
                      ) : null}

                      {!loading && data?.tmdbCast && data.tmdbCast.length > 0 ? (
                        <section className="min-w-0">
                          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                            Cast
                          </h3>
                          <p className="mb-3 max-w-3xl text-xs leading-snug text-white/50">
                            Top billed from The Movie Database.
                          </p>
                          <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-1 pt-0.5 [scrollbar-color:rgba(255,255,255,0.28)_transparent] [scrollbar-width:thin]">
                            {data.tmdbCast.map((c, idx) => (
                              <div
                                key={`${c.name}-${idx}`}
                                className="flex w-[4.75rem] shrink-0 flex-col items-center text-center sm:w-[5.25rem]"
                              >
                                <div className="relative size-16 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-white/12 sm:size-[4.5rem]">
                                  {c.profileUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={c.profileUrl}
                                      alt=""
                                      className="size-full object-cover object-top"
                                    />
                                  ) : (
                                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-zinc-700 to-zinc-900 text-[11px] font-semibold uppercase tracking-wide text-white/50">
                                      {c.name
                                        .split(/\s+/)
                                        .map((p) => p[0])
                                        .join("")
                                        .slice(0, 2)}
                                    </div>
                                  )}
                                </div>
                                <p className="mt-2 line-clamp-2 text-[11px] font-medium leading-snug text-white">
                                  {c.name}
                                </p>
                                {c.character ? (
                                  <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-white/45">
                                    {c.character}
                                  </p>
                                ) : null}
                              </div>
                            ))}
                          </div>
                        </section>
                      ) : null}

                      {!loading && data?.tmdbGenres && data.tmdbGenres.length > 0 ? (
                        <section className="rounded-xl border border-white/10 bg-[#161616] p-4">
                          <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                            Style mix
                          </h3>
                          <p className="mb-3 max-w-3xl text-xs leading-snug text-white/50">
                            Rough genre blend from TMDB (split for a quick read — not a
                            prediction model).
                          </p>
                          <MovieVibeDonut
                            slices={vibeSlicesFromTmdbGenres(data.tmdbGenres)}
                            centerLine={data.tmdbGenres[0]?.name ?? "Mix"}
                            subLine={
                              data.runtimeMinutes
                                ? `${data.runtimeMinutes} min · TMDB`
                                : "TMDB"
                            }
                          />
                        </section>
                      ) : null}

                      {data ? (
                        <>
                          <section>
                            <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                              Scores by site
                            </h3>
                            <p className="mb-3 max-w-3xl text-xs leading-snug text-white/50">
                              Each number is from that site’s own listing — not averaged
                              together.
                            </p>
                            {data.ratings.length === 0 ? (
                              <p className="text-sm text-white/50">
                                {data.omdb == null
                                  ? "Add OMDB_API_KEY on the server to load IMDb, Rotten Tomatoes, and Metacritic when OMDb lists them."
                                  : data.omdb.matched
                                    ? (data.omdb.notice ??
                                      "Matched—no OMDb score rows yet. TMDB audience below.")
                                    : (data.omdb.notice ??
                                      "No OMDb match—try another spelling or year.")}
                              </p>
                            ) : (
                              <div className="flex flex-wrap gap-2.5">
                                {sortRatingsBySite(data.ratings).map((r, i) => {
                                  const { main, suffix } = scoreDisplayParts(r.value);
                                  return (
                                    <div
                                      key={`${r.source}-${r.value}-${i}`}
                                      className="min-w-[100px] flex-1 rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-3 sm:max-w-[160px] sm:flex-none"
                                    >
                                      <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                                        {r.source}
                                      </p>
                                      <div className="mt-1.5 flex items-baseline gap-0.5">
                                        <span className="font-heading text-2xl font-bold tabular-nums text-white sm:text-3xl">
                                          {main}
                                        </span>
                                        {suffix ? (
                                          <span className="text-sm font-medium text-white/45">
                                            {suffix}
                                          </span>
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            {data.imdbId ? (
                              <a
                                href={`https://www.imdb.com/title/${data.imdbId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                              >
                                View on IMDb
                                <ExternalLink className="size-3" />
                              </a>
                            ) : null}
                            {data.tmdbVoteAverage != null ? (
                              <div className="mt-3 rounded-xl border border-white/10 bg-[#1c1c1c] px-4 py-3">
                                <p className="text-[10px] font-medium uppercase tracking-wider text-white/45">
                                  TMDB audience
                                </p>
                                <div className="mt-1 flex flex-wrap items-baseline gap-2">
                                  <span className="font-heading text-2xl font-bold tabular-nums text-white sm:text-3xl">
                                    {data.tmdbVoteAverage.toFixed(1)}
                                  </span>
                                  <span className="text-sm font-medium text-white/45">
                                    /10
                                  </span>
                                  {data.tmdbVoteCount != null && data.tmdbVoteCount > 0 ? (
                                    <span className="text-xs text-white/40">
                                      · {data.tmdbVoteCount.toLocaleString()} votes
                                    </span>
                                  ) : null}
                                </div>
                                <p className="mt-1 text-[11px] text-white/35">
                                  Public average from The Movie Database — complements
                                  critic/IMDb scores above.
                                </p>
                              </div>
                            ) : null}
                          </section>

                          <section>
                            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                              Where to watch (US)
                            </h3>
                            {data.streaming.length === 0 ? (
                              <p className="text-sm text-white/50">
                                No streaming providers listed for this title in this
                                region.
                              </p>
                            ) : (
                              <ul className="flex flex-wrap gap-2">
                                {data.streaming.map((s) => (
                                  <li
                                    key={`${s.name}-${s.type}`}
                                    className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1 pl-1 pr-3 text-xs"
                                  >
                                    {s.logoUrl ? (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img
                                        src={s.logoUrl}
                                        alt=""
                                        width={22}
                                        height={22}
                                        className="rounded-full"
                                      />
                                    ) : (
                                      <span className="flex size-[22px] items-center justify-center rounded-full bg-white/10 text-[10px]">
                                        {s.name.slice(0, 1)}
                                      </span>
                                    )}
                                    <span className="font-medium text-white/90">
                                      {s.name}
                                    </span>
                                    <Badge
                                      variant="secondary"
                                      className="h-5 border-0 bg-white/10 text-[10px] capitalize text-white/80"
                                    >
                                      {s.type === "flatrate" ? "Sub" : s.type}
                                    </Badge>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </section>

                          <section className="min-w-0">
                            <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                              YouTube reviews
                            </h3>
                            {data.youtubeReviews.length === 0 ? (
                              <div className="flex flex-wrap items-center gap-3">
                                <p className="text-sm text-white/50">
                                  {data.configured.youtube
                                    ? "No review videos matched these searches, or the API returned no results. Check warnings above the scores, or search manually."
                                    : "Add YOUTUBE_API_KEY (server-side) for embedded picks, or search manually."}
                                </p>
                                <a
                                  href={data.fallbackYoutubeSearchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={buttonVariants({
                                    variant: "secondary",
                                    size: "sm",
                                  })}
                                >
                                  Search YouTube
                                  <ExternalLink className="size-3.5" />
                                </a>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div
                                  className={cn(
                                    isPage
                                      ? "-mx-4 px-4 sm:-mx-6 sm:px-6 md:-mx-8 md:px-8"
                                      : "-mx-5 px-5 md:-ml-6 md:-mr-5 md:pl-6 md:pr-5",
                                  )}
                                >
                                  <div
                                    className="flex touch-pan-x gap-3 overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-color:rgba(255,255,255,0.28)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25 [&::-webkit-scrollbar-track]:bg-transparent"
                                  >
                                  {data.youtubeReviews.map((v) => (
                                    <button
                                      key={v.videoId}
                                      type="button"
                                      onClick={() => {
                                        setReviewEmbedId(v.videoId);
                                        setReviewEmbedTitle(v.title);
                                      }}
                                      className="w-[min(200px,42vw)] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] text-left transition hover:border-primary/40"
                                    >
                                      <div className="relative aspect-video bg-black">
                                        <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition hover:opacity-100">
                                          <span className="flex size-11 items-center justify-center rounded-full bg-white/90 text-black shadow-lg">
                                            <Play className="size-5 fill-current" />
                                          </span>
                                        </div>
                                        {v.thumbnail ? (
                                          // eslint-disable-next-line @next/next/no-img-element
                                          <img
                                            src={v.thumbnail}
                                            alt=""
                                            className="h-full w-full object-cover"
                                          />
                                        ) : null}
                                      </div>
                                      <div className="p-2.5">
                                        <p className="line-clamp-2 text-xs font-medium leading-snug text-white/95">
                                          {v.title}
                                        </p>
                                        <p className="mt-1 line-clamp-1 text-[10px] text-white/45">
                                          {v.channelTitle}
                                        </p>
                                      </div>
                                    </button>
                                  ))}
                                  </div>
                                </div>
                                <a
                                  href={data.fallbackYoutubeSearchUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className={buttonVariants({
                                    variant: "ghost",
                                    size: "sm",
                                    className: "h-8 gap-1 text-xs text-white/70",
                                  })}
                                >
                                  More on YouTube
                                  <ExternalLink className="size-3" />
                                </a>
                              </div>
                            )}
                          </section>

                        </>
                      ) : null}

                      {m ? (
                        <MovieDetailReviewsSection
                          movieHasTmdb={movieHasTmdb}
                          supabase={supabase}
                          userId={userId}
                          viewerDisplayName={viewerDisplayName}
                          takesLoading={takesLoading}
                          takeMeter={takeMeter}
                          takesError={takesError}
                          reviewSort={reviewSort}
                          onReviewSort={setReviewSort}
                          sortedDiscussion={sortedDiscussion}
                          discussionRowsShown={discussionRowsShown}
                          showAllDiscussion={showAllDiscussion}
                          onShowAllDiscussion={setShowAllDiscussion}
                          reviewEngagement={reviewEngagement}
                          onToggleReviewLike={handleToggleReviewLike}
                          onPostReviewReply={handlePostReviewReply}
                          takeTierDraft={takeTierDraft}
                          onTakeTierDraft={setTakeTierDraft}
                          takeReviewDraft={takeReviewDraft}
                          onTakeReviewDraft={setTakeReviewDraft}
                          baselineTake={baselineTake}
                          tierPostSaving={tierPostSaving}
                          reviewPostSaving={reviewPostSaving}
                          onSaveTierPost={() => void saveTierPost()}
                          onSaveReviewPost={() => void saveReviewPost()}
                        />
                      ) : null}
                    </div>
                  </MovieDetailScrollShell>

                  <div
                    className={cn(
                      "flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 px-4 py-3 backdrop-blur-md md:px-5",
                      isPage
                        ? "fixed bottom-0 left-0 right-0 z-40 border-white/10 bg-[#0c0c0c]/95 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 supports-[backdrop-filter]:bg-[#0c0c0c]/88"
                        : "border-white/10 bg-[#0c0c0c]/95 supports-[backdrop-filter]:bg-[#0c0c0c]/88",
                    )}
                  >
                    {onToggleWatched ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className={cn(watched && "text-sky-300")}
                        disabled={watchedBusy || !userId}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void onToggleWatched();
                        }}
                      >
                        {watchedBusy ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Eye className={cn("size-4", watched && "fill-current")} />
                        )}
                        <span className="ml-1.5">{watched ? "Watched" : "Watch"}</span>
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={cn(saved && "text-primary")}
                      disabled={!userId}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        void onToggleSave();
                      }}
                    >
                      <Heart
                        className={cn("size-4", saved && "fill-current")}
                      />
                      {saved ? "Saved" : "Save"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={loading}
                      onClick={handleTrailerClick}
                      title={
                        loading
                          ? "Loading…"
                          : data?.trailerYoutubeKey
                            ? "Play trailer"
                            : "Trailer not listed on TMDB"
                      }
                    >
                      <ListVideo className="size-4" />
                      {loading ? "Trailer…" : "Trailer"}
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="default"
                      disabled={inActiveList}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onAddToList();
                      }}
                      className="ml-auto"
                    >
                      <Plus className="size-4" />
                      {inActiveList ? "In your list" : "Add to list"}
                    </Button>
                  </div>
                </div>
              </div>
              </div>
            </>
          ) : null;

  const showPageLoadingGate = Boolean(
    isPage && m && loading && !data && !error,
  );

  return (
    <>
      {showPageLoadingGate && m ? (
        <MovieDetailPageLoadingGate movie={m} backHref={backHref} />
      ) : null}

      {!showPageLoadingGate && isPage ? (
        <div
          key={m?.id ?? "movie"}
          className="flex min-h-dvh flex-col overflow-x-hidden bg-card text-white"
        >
          {mainColumn}
        </div>
      ) : null}
      {!showPageLoadingGate && !isPage ? mainColumn : null}

      <Dialog
        open={reviewEmbedId != null}
        onOpenChange={(o) => {
          if (!o) {
            setReviewEmbedId(null);
            setReviewEmbedTitle("");
          }
        }}
      >
        <DialogContent
          showCloseButton
          backdropClassName="z-[120] bg-black/80 backdrop-blur-sm"
          className={cn(
            "z-[130] w-[min(100vw-1rem,960px)] max-w-none sm:max-w-none md:max-w-none gap-0 overflow-hidden border border-white/10 bg-background p-0 text-white sm:rounded-2xl",
          )}
        >
          <div className="flex max-h-[90dvh] flex-col">
            <div className="flex items-start justify-between gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
              <DialogTitle className="line-clamp-2 pr-8 text-left text-base font-semibold text-white sm:text-lg">
                {reviewEmbedTitle || "Review"}
              </DialogTitle>
            </div>
            {reviewEmbedId ? (
              <div className="relative aspect-video w-full bg-black">
                <iframe
                  className="absolute inset-0 h-full w-full border-0"
                  src={`https://www.youtube-nocookie.com/embed/${reviewEmbedId}?rel=0&autoplay=1`}
                  title={reviewEmbedTitle}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  referrerPolicy="strict-origin-when-cross-origin"
                />
              </div>
            ) : null}
            <p className="border-t border-white/10 px-4 py-2 text-center text-xs text-white/45">
              Close to return to the movie details you had open.
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={trailerOpen}
        onOpenChange={(o) => {
          setTrailerOpen(o);
          if (!o) setActiveTrailerKey(null);
        }}
      >
        <DialogContent
          showCloseButton
          backdropClassName="z-[190] bg-black/80 backdrop-blur-md data-closed:animate-out data-closed:fade-out-0"
          className={cn(
            "z-[200] max-h-[min(92dvh,85vh)] w-[min(calc(100vw-1.5rem),95vw,85rem)] max-w-none sm:max-w-none md:max-w-none lg:max-w-none gap-0 overflow-hidden rounded-2xl border border-white/[0.12] bg-[#050505] p-0 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_25px_80px_-20px_rgba(0,0,0,0.9)] ring-0 sm:rounded-2xl",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98]",
            "[&_[data-slot=dialog-close]]:top-3 [&_[data-slot=dialog-close]]:right-3 [&_[data-slot=dialog-close]]:size-9 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:bg-white/10 [&_[data-slot=dialog-close]]:hover:bg-white/20",
          )}
        >
          <div className="flex max-h-[92dvh] flex-col">
            <div className="flex shrink-0 items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 px-4 py-3 sm:px-5 sm:py-4">
              <div className="min-w-0 pr-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary/90">
                  Trailer
                </p>
                <DialogTitle className="mt-0.5 text-left font-heading text-lg font-semibold leading-snug text-white sm:text-xl">
                  {m?.title ?? "Video"}
                </DialogTitle>
                {m ? (
                  <p className="mt-1 text-xs text-white/50">
                    {m.year} · Plays here · Close with ✕ or outside click
                  </p>
                ) : null}
              </div>
            </div>

            {activeTrailerKey ? (
              <div className="relative min-h-0 w-full flex-1 bg-black">
                <div className="relative aspect-video w-full shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]">
                  <iframe
                    className="absolute inset-0 h-full w-full border-0"
                    src={`https://www.youtube-nocookie.com/embed/${activeTrailerKey}?rel=0&autoplay=1`}
                    title="Trailer"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 py-10 text-center">
                <ListVideo className="size-10 text-white/25" aria-hidden />
                <p className="max-w-sm text-sm text-white/60">
                  TMDB doesn&apos;t have an official trailer ID for this title yet, so
                  nothing can be embedded here. Try again after metadata updates.
                </p>
              </div>
            )}

            <div className="shrink-0 border-t border-white/10 bg-zinc-950/90 px-4 py-2.5 sm:px-5">
              <p className="text-center text-[11px] text-white/40">
                Embedded player · stays in Moviefy
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
