"use client";

import { useEffect, useState } from "react";
import { PosterImage } from "@/components/poster-image";
import type { TmdbDiscoverResponse } from "@/lib/movie-enrich-types";
import { movieFromTmdbDiscoverItem } from "@/lib/tmdb-genre-map";
import { tmdbGenreLabels } from "@/lib/tmdb-genre-labels";
import type { Movie } from "@/lib/types";
import { cn } from "@/lib/utils";

export function ExplorePosterSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "aspect-[2/3] w-[104px] shrink-0 animate-pulse rounded-xl bg-white/[0.06] sm:w-[118px]",
        className,
      )}
    />
  );
}

type ExploreMovieRailProps = {
  title: string;
  subtitle?: string;
  /** Full path including query, e.g. `/api/discover/preset?key=hidden_gems` */
  endpoint: string | null;
  onSelectMovie: (movie: Movie) => void;
  limit?: number;
  className?: string;
};

export function ExploreMovieRail({
  title,
  subtitle,
  endpoint,
  onSelectMovie,
  limit = 14,
  className,
}: ExploreMovieRailProps) {
  const [loading, setLoading] = useState(Boolean(endpoint));
  const [items, setItems] = useState<TmdbDiscoverResponse["results"]>([]);
  const [configured, setConfigured] = useState(true);

  useEffect(() => {
    if (!endpoint) {
      setLoading(false);
      setItems([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    void fetch(endpoint, { signal: ctrl.signal })
      .then((r) => r.json() as Promise<TmdbDiscoverResponse>)
      .then((d) => {
        setConfigured(d.configured !== false);
        setItems(d.results ?? []);
      })
      .catch(() => {
        setItems([]);
        setConfigured(false);
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, [endpoint]);

  if (!endpoint) return null;

  const slice = items.slice(0, limit);
  const showSkeleton = loading && slice.length === 0;

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
            {Array.from({ length: 8 }).map((_, i) => (
              <ExplorePosterSkeleton key={i} />
            ))}
          </div>
        ) : !configured ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Add TMDB_API_KEY to load this rail.
          </p>
        ) : slice.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing here yet — check back later.
          </p>
        ) : (
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:thin] [scrollbar-color:rgba(255,255,255,0.15)_transparent] sm:gap-4 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/20">
            {slice.map((item) => {
              const movie = movieFromTmdbDiscoverItem(item);
              const genres = tmdbGenreLabels(item.genre_ids);
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelectMovie(movie)}
                  className="group relative w-[104px] shrink-0 text-left motion-safe:transition motion-safe:duration-200 motion-safe:ease-out motion-safe:hover:-translate-y-0.5 sm:w-[118px]"
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
                    <div
                      className="pointer-events-none absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/40 to-transparent p-2 opacity-0 transition-opacity duration-200 group-hover:opacity-100"
                      aria-hidden
                    >
                      <p className="text-[10px] font-semibold text-amber-100/95">
                        ★ {item.vote_average.toFixed(1)}
                      </p>
                      {genres ? (
                        <p className="mt-0.5 line-clamp-3 text-[9px] leading-snug text-white/85">
                          {genres}
                        </p>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-2 line-clamp-2 text-[10px] font-medium leading-tight text-foreground/95 sm:text-[11px]">
                    {movie.title}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
