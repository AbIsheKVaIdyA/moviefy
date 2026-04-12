"use client";

import type { ReactNode } from "react";
import { PosterImage } from "@/components/poster-image";
import type { Movie } from "@/lib/types";
import { cn } from "@/lib/utils";

function Skeleton({
  className,
  cardClass,
}: {
  className?: string;
  cardClass?: string;
}) {
  return (
    <div
      className={cn(
        "aspect-[2/3] w-[104px] shrink-0 animate-pulse rounded-xl bg-white/[0.06] sm:w-[118px]",
        cardClass,
        className,
      )}
    />
  );
}

export type ExploreMovieStripVariant = "panel" | "ribbon" | "filmstrip";

type ExploreMovieStripProps = {
  title: string;
  subtitle?: string;
  movies: Movie[];
  loading?: boolean;
  skeletonCount?: number;
  onSelectMovie: (movie: Movie) => void;
  emptyHint?: string;
  className?: string;
  sectionId?: string;
  /** e.g. clear button aligned with title */
  headerEnd?: ReactNode;
  /** Visual treatment — ribbon = warm “saved” shelf, filmstrip = recent / timeline */
  variant?: ExploreMovieStripVariant;
};

export function ExploreMovieStrip({
  title,
  subtitle,
  movies,
  loading,
  skeletonCount = 6,
  onSelectMovie,
  emptyHint = "Nothing here yet.",
  className,
  sectionId,
  headerEnd,
  variant = "panel",
}: ExploreMovieStripProps) {
  const showSkeleton = loading && movies.length === 0;

  const shell =
    variant === "ribbon"
      ? "overflow-hidden rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-950/40 via-card/95 to-zinc-950/90 p-3 shadow-[0_20px_50px_-28px_rgba(244,63,94,0.35)] ring-1 ring-rose-500/10 sm:p-4"
      : variant === "filmstrip"
        ? "relative overflow-hidden rounded-2xl border border-zinc-600/35 bg-zinc-950/90 p-3 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-2.5 before:bg-[repeating-linear-gradient(90deg,transparent_0px,transparent_5px,rgba(255,255,255,0.12)_5px,rgba(255,255,255,0.12)_7px)] before:content-[''] sm:p-4"
        : "app-panel overflow-hidden p-3 sm:p-4";

  const cardRing =
    variant === "ribbon"
      ? "ring-2 ring-rose-500/20 group-hover:ring-rose-400/45"
      : variant === "filmstrip"
        ? "ring-1 ring-cyan-500/25 shadow-[0_12px_40px_-20px_rgba(6,182,212,0.25)] group-hover:ring-cyan-400/40"
        : "ring-1 ring-border/60 group-hover:ring-primary/45";

  const posterW =
    variant === "ribbon"
      ? "w-[112px] sm:w-[126px]"
      : variant === "filmstrip"
        ? "w-[100px] sm:w-[114px]"
        : "w-[104px] sm:w-[118px]";

  return (
    <section
      id={sectionId}
      className={cn(
        "scroll-mt-28 animate-in fade-in duration-300 fill-mode-both motion-reduce:animate-none",
        className,
      )}
    >
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="type-section-title">{title}</h2>
          {subtitle ? <p className="type-section-sub">{subtitle}</p> : null}
        </div>
        {headerEnd ? <div className="shrink-0">{headerEnd}</div> : null}
      </div>
      <div className={shell}>
        {showSkeleton ? (
          <div className="flex gap-3 overflow-x-auto pb-1 pt-1 sm:gap-4">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <Skeleton key={i} cardClass={posterW} />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          <div
            className={cn(
              "flex overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
              variant === "filmstrip" ? "gap-1 px-1 sm:gap-2" : "gap-3 sm:gap-4",
            )}
          >
            {movies.map((movie, idx) => (
              <button
                key={movie.id}
                type="button"
                onClick={() => onSelectMovie(movie)}
                className={cn(
                  "group shrink-0 text-left motion-safe:transition motion-safe:duration-200 motion-safe:ease-out",
                  posterW,
                  variant === "filmstrip" &&
                    "motion-safe:hover:-translate-y-1 motion-safe:hover:z-10",
                  variant === "ribbon" &&
                    "motion-safe:hover:-translate-y-0.5",
                  variant === "panel" &&
                    "motion-safe:hover:-translate-y-0.5",
                  variant === "filmstrip" &&
                    idx > 0 &&
                    "max-sm:-ml-3 sm:-ml-5 pl-0 drop-shadow-[0_8px_24px_rgba(0,0,0,0.55)]",
                  variant === "filmstrip" && "odd:-rotate-[2deg] even:rotate-[2deg]",
                )}
              >
                <div
                  className={cn(
                    "relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900 transition duration-200",
                    variant === "filmstrip" ? "rounded-md" : null,
                    cardRing,
                  )}
                >
                  <PosterImage
                    src={movie.posterImage}
                    alt={movie.title}
                    fill
                    placeholderGradient={movie.posterClass}
                    className="object-cover transition duration-300 group-hover:scale-[1.05]"
                    sizes="126px"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <p className="text-[10px] font-medium text-white/90">{movie.genre}</p>
                    {movie.year ? (
                      <p className="text-[9px] text-white/55">{movie.year}</p>
                    ) : null}
                  </div>
                </div>
                <p
                  className={cn(
                    "mt-2 line-clamp-2 text-[10px] font-medium leading-tight sm:text-[11px]",
                    variant === "ribbon" && "text-rose-50/95",
                    variant === "filmstrip" && "text-zinc-200",
                    variant === "panel" && "text-foreground/95",
                  )}
                >
                  {movie.title}
                </p>
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
