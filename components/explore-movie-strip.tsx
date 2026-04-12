"use client";

import { PosterImage } from "@/components/poster-image";
import type { Movie } from "@/lib/types";
import { cn } from "@/lib/utils";

function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "aspect-[2/3] w-[104px] shrink-0 animate-pulse rounded-xl bg-white/[0.06] sm:w-[118px]",
        className,
      )}
    />
  );
}

type ExploreMovieStripProps = {
  title: string;
  subtitle?: string;
  movies: Movie[];
  loading?: boolean;
  skeletonCount?: number;
  onSelectMovie: (movie: Movie) => void;
  emptyHint?: string;
  className?: string;
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
}: ExploreMovieStripProps) {
  const showSkeleton = loading && movies.length === 0;

  return (
    <section
      className={cn(
        "animate-in fade-in duration-300 fill-mode-both motion-reduce:animate-none",
        className,
      )}
    >
      <div className="mb-3.5">
        <h2 className="type-section-title">{title}</h2>
        {subtitle ? <p className="type-section-sub">{subtitle}</p> : null}
      </div>
      <div className="app-panel overflow-hidden p-3 sm:p-4">
        {showSkeleton ? (
          <div className="flex gap-3 overflow-x-auto pb-1 sm:gap-4">
            {Array.from({ length: skeletonCount }).map((_, i) => (
              <Skeleton key={i} />
            ))}
          </div>
        ) : movies.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{emptyHint}</p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 sm:gap-4">
            {movies.map((movie) => (
              <button
                key={movie.id}
                type="button"
                onClick={() => onSelectMovie(movie)}
                className="group w-[104px] shrink-0 text-left motion-safe:transition motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 sm:w-[118px]"
              >
                <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-border/60 transition duration-200 group-hover:ring-primary/45">
                  <PosterImage
                    src={movie.posterImage}
                    alt={movie.title}
                    fill
                    placeholderGradient={movie.posterClass}
                    className="object-cover transition duration-300 group-hover:scale-[1.05]"
                    sizes="118px"
                  />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/90 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    <p className="text-[10px] font-medium text-white/90">{movie.genre}</p>
                    {movie.year ? (
                      <p className="text-[9px] text-white/55">{movie.year}</p>
                    ) : null}
                  </div>
                </div>
                <p className="mt-2 line-clamp-2 text-[10px] font-medium leading-tight text-foreground/95 sm:text-[11px]">
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
