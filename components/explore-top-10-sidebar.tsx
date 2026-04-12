"use client";

import { Flame } from "lucide-react";
import { PosterImage } from "@/components/poster-image";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TmdbDiscoverItem } from "@/lib/movie-enrich-types";
import {
  exploreReleaseContextLine,
  formatInterestCount,
  syntheticInterestCount,
} from "@/lib/explore-display";
import { movieFromTmdbDiscoverItem } from "@/lib/tmdb-genre-map";
import type { Movie } from "@/lib/types";
import { cn } from "@/lib/utils";

type WindowKey = "week" | "day";

type Props = {
  loading: boolean;
  items: TmdbDiscoverItem[];
  chartWindow: WindowKey;
  onChartWindowChange: (w: WindowKey) => void;
  onSelectMovie: (movie: Movie) => void;
};

export function ExploreTop10Sidebar({
  loading,
  items,
  chartWindow,
  onChartWindowChange,
  onSelectMovie,
}: Props) {
  const top = items.slice(0, 10);
  const chartValue: WindowKey = chartWindow === "day" ? "day" : "week";

  return (
    <aside className="rounded-3xl border border-white/[0.12] bg-gradient-to-b from-[#161616] to-[#0d0d0d] p-4 shadow-[0_0_0_1px_rgba(255,255,255,0.04)_inset] sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
            <Flame className="size-4" aria-hidden />
          </div>
          <h2 className="font-heading text-base font-semibold tracking-tight text-white sm:text-lg">
            Most interested
          </h2>
        </div>
        <Select
          value={chartValue}
          onValueChange={(v) => {
            if (v === "week" || v === "day") onChartWindowChange(v);
          }}
        >
          <SelectTrigger className="h-8 w-[118px] border-white/10 bg-black/40 text-[11px] text-white/90">
            <SelectValue>
              {chartValue === "day" ? "Today" : "This week"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">This week</SelectItem>
            <SelectItem value="day">Today</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-3 py-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-[4.5rem] animate-pulse rounded-2xl bg-white/[0.06]"
            />
          ))}
        </div>
      ) : top.length === 0 ? (
        <p className="py-8 text-center text-xs text-white/45">
          Add TMDB_API_KEY to load the chart.
        </p>
      ) : (
        <ol className="max-h-[min(70vh,52rem)] space-y-2.5 overflow-y-auto pr-1 [-ms-overflow-style:none] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-white/15">
          {top.map((item, idx) => {
            const rank = idx + 1;
            const movie = movieFromTmdbDiscoverItem(item);
            const interest = formatInterestCount(syntheticInterestCount(item));
            const sub = exploreReleaseContextLine(item);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => onSelectMovie(movie)}
                  className={cn(
                    "group relative flex w-full min-w-0 gap-3 overflow-hidden rounded-2xl border border-white/10 bg-black/35 py-2.5 pl-2 pr-3 text-left transition",
                    "hover:border-orange-500/35 hover:bg-black/50",
                  )}
                >
                  <span
                    className="pointer-events-none absolute -left-1 bottom-0 top-0 select-none font-heading text-[3.25rem] font-bold leading-none text-white/[0.07] transition group-hover:text-orange-500/[0.12]"
                    aria-hidden
                  >
                    {rank}
                  </span>
                  <div className="relative z-[1] flex min-w-0 flex-1 gap-3">
                    <div className="relative h-[4.5rem] w-[3rem] shrink-0 overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/10">
                      <PosterImage
                        src={movie.posterImage}
                        alt=""
                        fill
                        placeholderGradient={movie.posterClass}
                        className="object-cover"
                        sizes="48px"
                      />
                    </div>
                    <div className="min-w-0 flex-1 py-0.5">
                      <p className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                        {movie.title}
                      </p>
                      <p className="mt-1 line-clamp-1 text-[11px] text-white/45">
                        {sub}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] font-medium text-orange-400">
                        <Flame className="size-3 shrink-0" aria-hidden />
                        {interest}
                      </p>
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </aside>
  );
}
