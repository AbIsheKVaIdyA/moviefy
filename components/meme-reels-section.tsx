"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Clapperboard, Film, Loader2, Sparkles } from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { movieToDetailPageHref } from "@/lib/movie-detail-nav";
import type { Movie } from "@/lib/types";
import type { MemeReelApiItem, MemeReelsApiResponse } from "@/lib/meme-reels-types";

export type MemeReelsSectionProps = {
  onOpenMovie: (movie: Movie) => void;
  /** Anchor id for jump links (standalone page uses `reels-page-root`). */
  sectionId?: string;
};

export function MemeReelsSection({
  onOpenMovie,
  sectionId = "reels-page-root",
}: MemeReelsSectionProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<MemeReelsApiResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetch("/api/explore/meme-reels")
      .then((r) => r.json() as Promise<MemeReelsApiResponse>)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openMovie = useCallback(
    (movie: Movie) => {
      onOpenMovie(movie);
    },
    [onOpenMovie],
  );

  const items = data?.items ?? [];

  return (
    <section id={sectionId} className="scroll-mt-28">
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/25 to-amber-500/20 text-amber-200 ring-1 ring-white/10">
            <Film className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="type-section-title">Meme reels</h2>
            <p className="type-section-sub mt-0 max-w-2xl">
              Clips from YouTube&apos;s Data API (short + medium fallbacks). Server
              cache limits API quota. Open the matching film below each reel.
            </p>
          </div>
        </div>
        {data?.configured.youtube && data.configured.tmdb ? (
          <Badge className="shrink-0 border-0 bg-amber-500/15 text-amber-100">
            <Sparkles className="mr-1 size-3" aria-hidden />
            YouTube + TMDB
          </Badge>
        ) : null}
      </div>

      <div className="app-panel overflow-hidden p-0 sm:p-0">
        {loading ? (
          <div className="flex min-h-[12rem] items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-5 animate-spin shrink-0" aria-hidden />
            Loading reels…
          </div>
        ) : !data ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            Could not load meme reels.
          </p>
        ) : items.length === 0 ? (
          <div className="space-y-2 px-4 py-10 text-center text-sm text-muted-foreground">
            {!data.configured.tmdb ? (
              <p>Add TMDB_API_KEY.</p>
            ) : !data.configured.youtube ? (
              <p>Add YOUTUBE_API_KEY (or YOUTUBE_DATA_API_KEY / GOOGLE_API_KEY) on the server.</p>
            ) : data.warning ? (
              <p className="text-xs text-amber-200/90">{data.warning}</p>
            ) : (
              <p>No reels returned — check seeds in lib/meme-reels-seed.ts.</p>
            )}
          </div>
        ) : (
          <>
            {data.warning ? (
              <p className="border-b border-border/50 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-100/90">
                {data.warning}
              </p>
            ) : null}
            <div
              className={cn(
                "max-h-[min(88dvh,720px)] snap-y snap-mandatory overflow-y-auto overscroll-y-contain [-ms-overflow-style:none] [scrollbar-width:thin]",
                "sm:max-h-[min(82dvh,680px)]",
              )}
            >
              {items.map((row) => (
                <MemeReelSlide
                  key={`${row.videoId}-${row.movie.id}`}
                  row={row}
                  onOpenMovie={openMovie}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function MemeReelSlide({
  row,
  onOpenMovie,
}: {
  row: MemeReelApiItem;
  onOpenMovie: (movie: Movie) => void;
}) {
  const href = movieToDetailPageHref(row.movie, "reels");
  const embedSrc = `https://www.youtube.com/embed/${row.videoId}?rel=0&modestbranding=1&playsinline=1`;

  return (
    <article className="snap-start border-b border-border/40 last:border-b-0">
      <div className="mx-auto flex max-w-lg flex-col gap-3 px-3 py-5 sm:px-5 sm:py-6">
        <div className="relative mx-auto w-full max-w-[min(100%,22rem)] overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_50px_-20px_rgba(0,0,0,0.85)] ring-1 ring-white/5">
          <div className="relative aspect-[9/16] w-full bg-zinc-950">
            <iframe
              title={row.videoTitle}
              src={embedSrc}
              className="absolute inset-0 size-full border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Badge className="mb-1.5 border-0 bg-amber-500/20 text-[10px] font-medium uppercase tracking-wide text-amber-100">
              {row.memeTag}
            </Badge>
            <p className="line-clamp-2 text-sm font-medium text-foreground">
              {row.videoTitle}
            </p>
            <p className="text-xs text-muted-foreground">{row.channelTitle}</p>
          </div>
          {href ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button
                type="button"
                className="gap-2 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-md hover:from-violet-500 hover:to-fuchsia-500"
                onClick={() => onOpenMovie(row.movie)}
              >
                <Clapperboard className="size-4 shrink-0" />
                Open movie
              </Button>
              <Link
                href={href}
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "border-border/60",
                )}
              >
                Open in new tab
              </Link>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Missing TMDB link for this title.</p>
          )}
        </div>
      </div>
    </article>
  );
}
