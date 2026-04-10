"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { buttonVariants } from "@/components/ui/button";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { PosterImage } from "@/components/poster-image";
import { ExternalLink, Heart, ListVideo, Loader2, Plus } from "lucide-react";
import type { MovieEnrichResponse } from "@/lib/movie-enrich-types";
import type { Movie } from "@/lib/types";
import { cn } from "@/lib/utils";
import { scoreDisplayParts, sortRatingsBySite } from "@/lib/movie-rating-display";

type Props = {
  movie: Movie | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  inActiveList: boolean;
  saved: boolean;
  onToggleSave: () => void;
  onAddToList: () => void;
};

export function MovieDetailDialog({
  movie,
  open,
  onOpenChange,
  inActiveList,
  saved,
  onToggleSave,
  onAddToList,
}: Props) {
  const [data, setData] = useState<MovieEnrichResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [trailerOpen, setTrailerOpen] = useState(false);
  const [activeTrailerKey, setActiveTrailerKey] = useState<string | null>(null);

  useEffect(() => {
    if (!open) setTrailerOpen(false);
  }, [open]);

  useEffect(() => {
    if (!trailerOpen) setActiveTrailerKey(null);
  }, [trailerOpen]);

  useEffect(() => {
    if (!open || !movie) {
      setData(null);
      setError(null);
      return;
    }

    const ctrl = new AbortController();
    setLoading(true);
    setError(null);
    setData(null);

    const params = new URLSearchParams();
    params.set("title", movie.title);
    params.set("year", String(movie.year));
    if (movie.tmdbId != null) params.set("tmdbId", String(movie.tmdbId));

    fetch(`/api/movie/enrich?${params.toString()}`, { signal: ctrl.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Could not load details");
        return res.json() as Promise<MovieEnrichResponse>;
      })
      .then(setData)
      .catch((e: unknown) => {
        if ((e as Error).name === "AbortError") return;
        setError("Could not load live scores and streaming.");
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
  }, [open, movie?.id, movie?.title, movie?.year, movie?.tmdbId]);

  const m = movie;

  function trailerSearchUrl() {
    if (!m) return "";
    return `https://www.youtube.com/results?search_query=${encodeURIComponent(
      `${m.title} ${m.year} official trailer`,
    )}`;
  }

  function handleTrailerClick() {
    if (!m || loading) return;
    const key = data?.trailerYoutubeKey;
    if (key) {
      setActiveTrailerKey(key);
      setTrailerOpen(true);
      return;
    }
    window.open(trailerSearchUrl(), "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          showCloseButton
          className={cn(
            "max-h-[92dvh] w-[min(100vw-1.25rem,56rem)] max-w-none gap-0 overflow-hidden border border-white/10 bg-[#121212] p-0 text-white shadow-2xl ring-white/10 sm:max-w-[min(100vw-2rem,56rem)]",
          )}
        >
          {m ? (
            <>
              <DialogTitle className="sr-only">{m.title}</DialogTitle>
              <div className="flex max-h-[92dvh] min-h-0 flex-col overflow-hidden md:flex-row md:items-stretch">
                <div className="relative aspect-[2/3] w-full max-w-[220px] shrink-0 overflow-hidden rounded-t-xl bg-zinc-900 sm:max-w-[260px] md:max-h-none md:w-[min(32%,280px)] md:max-w-[280px] md:rounded-l-xl md:rounded-tr-none md:self-stretch">
                  <PosterImage
                    src={m.posterImage}
                    alt={m.title}
                    fill
                    placeholderGradient={m.posterClass}
                    className="object-cover"
                    sizes="(max-width: 768px) 220px, 280px"
                    priority
                  />
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent md:bg-gradient-to-r" />
                </div>

                <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
                  <ScrollArea className="min-h-0 min-w-0 flex-1 overflow-hidden md:max-h-[min(92dvh,720px)]">
                    <div className="min-w-0 space-y-5 p-5 pb-4 md:pl-6 md:pr-5 md:pt-6">
                      <header className="space-y-2 pr-8">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge
                            variant="secondary"
                            className="border-0 bg-white/10 text-white"
                          >
                            {m.year}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="border-white/20 text-white/90"
                          >
                            {m.genre}
                          </Badge>
                        </div>
                        <h2 className="font-heading text-2xl font-semibold leading-tight tracking-tight text-white sm:text-3xl">
                          {m.title}
                        </h2>
                        <p className="text-sm text-white/65">
                          Directed by {m.director}
                        </p>
                      </header>

                      {loading ? (
                        <div className="flex items-center gap-2 py-2 text-sm text-white/50">
                          <Loader2 className="size-4 animate-spin shrink-0" />
                          Loading synopsis, scores, streaming, and reviews…
                        </div>
                      ) : error ? (
                        <p className="text-sm text-amber-200/90">{error}</p>
                      ) : null}

                      {data?.warnings.length ? (
                        <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-xs text-amber-100/90">
                          {data.warnings.map((w) => (
                            <p key={w}>{w}</p>
                          ))}
                        </div>
                      ) : null}

                      <section>
                        <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-white/45">
                          Overview
                        </h3>
                        {!loading &&
                          (data?.overview?.trim() ? (
                            <p className="max-w-3xl text-[15px] leading-relaxed text-white/80">
                              {data.overview.trim()}
                            </p>
                          ) : (
                            <p className="max-w-3xl text-sm text-white/50">
                              No synopsis returned. TMDB match helps fill this in.
                            </p>
                          ))}
                      </section>

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
                                No scores returned. Check OMDB_API_KEY and title match.
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
                                  Add YOUTUBE_API_KEY for picks, or search manually.
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
                                <div className="-mx-5 px-5 md:-ml-6 md:-mr-5 md:pl-6 md:pr-5">
                                  <div
                                    className="flex touch-pan-x gap-3 overflow-x-auto overscroll-x-contain pb-2 [-webkit-overflow-scrolling:touch] [scrollbar-color:rgba(255,255,255,0.28)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/25 [&::-webkit-scrollbar-track]:bg-transparent"
                                  >
                                  {data.youtubeReviews.map((v) => (
                                    <a
                                      key={v.videoId}
                                      href={`https://www.youtube.com/watch?v=${v.videoId}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="w-[min(200px,42vw)] shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#1a1a1a] transition hover:border-primary/40"
                                    >
                                      <div className="relative aspect-video bg-black">
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
                                    </a>
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
                    </div>
                  </ScrollArea>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-white/10 bg-[#0c0c0c] px-4 py-3 md:px-5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className={cn(saved && "text-primary")}
                      onClick={onToggleSave}
                    >
                      <Heart
                        className={cn("size-4", saved && "fill-current")}
                      />
                      {saved ? "Saved" : "Save"}
                    </Button>
                    <Button
                      size="sm"
                      variant="secondary"
                      disabled={loading}
                      onClick={handleTrailerClick}
                      title={
                        loading
                          ? "Loading…"
                          : data?.trailerYoutubeKey
                            ? "Play trailer here"
                            : "Find trailer on YouTube"
                      }
                    >
                      <ListVideo className="size-4" />
                      {loading ? "Trailer…" : "Trailer"}
                    </Button>
                    <Button
                      size="sm"
                      variant="default"
                      disabled={inActiveList}
                      onClick={onAddToList}
                      className="ml-auto"
                    >
                      <Plus className="size-4" />
                      {inActiveList ? "In your list" : "Add to list"}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={trailerOpen} onOpenChange={setTrailerOpen}>
        <DialogContent
          showCloseButton
          backdropClassName="z-[90] bg-black/85 backdrop-blur-md data-closed:animate-out data-closed:fade-out-0"
          className={cn(
            "z-[100] max-h-[92dvh] w-[calc(100vw-0.75rem)] max-w-none gap-0 overflow-hidden rounded-2xl border border-white/[0.12] bg-[#050505] p-0 text-white shadow-[0_0_0_1px_rgba(255,255,255,0.06)_inset,0_25px_80px_-20px_rgba(0,0,0,0.9)] ring-0 sm:max-w-none sm:w-[min(96vw,1280px)] sm:rounded-3xl",
            "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-[0.98] data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-[0.98]",
            "[&_[data-slot=dialog-close]]:top-4 [&_[data-slot=dialog-close]]:right-4 [&_[data-slot=dialog-close]]:size-10 [&_[data-slot=dialog-close]]:rounded-full [&_[data-slot=dialog-close]]:bg-white/10 [&_[data-slot=dialog-close]]:hover:bg-white/20",
          )}
        >
          <div className="flex max-h-[92dvh] flex-col">
            <div className="flex items-start justify-between gap-4 border-b border-white/10 bg-gradient-to-b from-zinc-900/90 to-zinc-950/95 px-4 py-4 sm:px-6 sm:py-5">
              <div className="min-w-0 pr-10">
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-primary/90">
                  Trailer
                </p>
                <DialogTitle className="mt-1 text-left font-heading text-xl font-semibold leading-snug text-white sm:text-2xl">
                  {m?.title ?? "Video"}
                </DialogTitle>
                {m ? (
                  <p className="mt-1 text-sm text-white/50">
                    {m.year} · Tap outside or ✕ to close
                  </p>
                ) : null}
              </div>
            </div>

            {activeTrailerKey ? (
              <div className="relative w-full bg-black">
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
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-zinc-950/90 px-4 py-3 sm:px-6">
              <p className="text-xs text-white/45">
                Playback via YouTube · HD when available
              </p>
              {activeTrailerKey ? (
                <a
                  href={`https://www.youtube.com/watch?v=${activeTrailerKey}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "sm",
                    className: "h-9 gap-1.5 text-white/80 hover:text-white",
                  })}
                >
                  Open in YouTube
                  <ExternalLink className="size-3.5" />
                </a>
              ) : (
                <a
                  href={trailerSearchUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "sm",
                    className: "h-9 gap-1.5 text-white/80 hover:text-white",
                  })}
                >
                  Search on YouTube
                  <ExternalLink className="size-3.5" />
                </a>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
