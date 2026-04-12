"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Clapperboard,
  Flame,
  Loader2,
  Megaphone,
  Sparkles,
} from "lucide-react";
import { PosterImage } from "@/components/poster-image";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { tmdbPosterUrl } from "@/lib/tmdb-image";
import { movieToDetailPageHref } from "@/lib/movie-detail-nav";
import { prefetchMovieEnrich } from "@/lib/movie-enrich-prefetch";
import { formatScheduleHype } from "@/lib/releases-schedule-display";
import { scheduleItemToMovie } from "@/lib/releases-schedule-mappers";
import type {
  ScheduleItem,
  ScheduleMedia,
  ScheduleResponse,
  ScheduleWindow,
} from "@/lib/releases-schedule-types";

function dateBadgeParts(iso: string): { dow: string; dom: string; mon: string } {
  const t = Date.parse(`${iso}T12:00:00Z`);
  if (!Number.isFinite(t)) {
    return { dow: "—", dom: "—", mon: "" };
  }
  const d = new Date(t);
  const dow = new Intl.DateTimeFormat("en-GB", { weekday: "short" })
    .format(d)
    .toUpperCase();
  const dom = new Intl.DateTimeFormat("en-GB", { day: "numeric" }).format(d);
  const mon = new Intl.DateTimeFormat("en-GB", { month: "short" })
    .format(d)
    .toUpperCase();
  return { dow, dom, mon };
}

function groupByDate(items: ScheduleItem[]): Map<string, ScheduleItem[]> {
  const m = new Map<string, ScheduleItem[]>();
  for (const it of items) {
    const k = it.releaseDate;
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(it);
  }
  return m;
}

export function ReleasesPage() {
  const router = useRouter();
  const [windowKey, setWindowKey] = useState<ScheduleWindow>("upcoming");
  const [typeFilter, setTypeFilter] = useState<"all" | ScheduleMedia>("all");
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    let cancelled = false;
    setLoading(true);
    const q = new URLSearchParams();
    q.set("window", windowKey);
    q.set("type", typeFilter);
    void fetch(`/api/releases/schedule?${q.toString()}`)
      .then((r) => r.json() as Promise<ScheduleResponse>)
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
  }, [windowKey, typeFilter]);

  useEffect(() => {
    return load();
  }, [load]);

  const grouped = useMemo(() => {
    if (!data?.items.length) return new Map<string, ScheduleItem[]>();
    return groupByDate(data.items);
  }, [data?.items]);

  const sortedDates = useMemo(
    () => [...grouped.keys()].sort((a, b) => a.localeCompare(b)),
    [grouped],
  );

  async function openItem(item: ScheduleItem) {
    const movie = scheduleItemToMovie(item);
    const href = movieToDetailPageHref(
      movie,
      "releases",
      item.mediaType === "tv" ? "tv" : "movie",
    );
    if (!href) return;
    await prefetchMovieEnrich(movie, item.mediaType === "tv" ? "tv" : "movie");
    router.push(href);
  }

  return (
    <div className="min-h-dvh text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/45 backdrop-blur-xl supports-[backdrop-filter]:bg-card/35">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3 sm:px-5">
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="flex items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground/90 transition hover:bg-muted/50"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Your theatre</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-violet-500/20 text-violet-300">
                <CalendarDays className="size-4" />
              </div>
              <div>
                <p className="font-heading text-sm font-semibold text-foreground">
                  Release radar
                </p>
                <p className="text-[10px] text-muted-foreground">
                  What lands next — by day, format, and buzz
                </p>
              </div>
            </div>
          </div>
          <Link
            href="/app/explore"
            className="hidden items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground sm:inline-flex"
          >
            <Clapperboard className="size-4" />
            Explore
          </Link>
        </div>
      </header>

      <main className="mx-auto flex max-w-[1500px] flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:flex-row lg:items-start lg:gap-10">
        <aside className="shrink-0 lg:w-52">
          <div className="app-panel flex flex-col gap-1 p-2 sm:p-3">
            {(
              [
                {
                  key: "today" as const,
                  label: "Today",
                  icon: CalendarDays,
                  hint: "Releases dated today",
                },
                {
                  key: "upcoming" as const,
                  label: "Upcoming",
                  icon: Sparkles,
                  hint: "Next ~8 weeks",
                },
                {
                  key: "announced" as const,
                  label: "Announced",
                  icon: Megaphone,
                  hint: "Further out",
                },
              ] as const
            ).map(({ key, label, icon: Icon, hint }) => (
              <button
                key={key}
                type="button"
                title={hint}
                onClick={() => setWindowKey(key)}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition",
                  windowKey === key
                    ? "bg-primary/20 text-foreground ring-1 ring-primary/40"
                    : "text-muted-foreground hover:bg-muted/40 hover:text-foreground",
                )}
              >
                <Icon className="size-4 shrink-0 opacity-90" aria-hidden />
                {label}
              </button>
            ))}
          </div>
          <p className="mt-3 px-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            Dates from TMDB (US theatrical window for films).
          </p>
        </aside>

        <div className="min-w-0 flex-1 space-y-6">
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "movie", "tv"] as const).map((f) => (
              <Button
                key={f}
                type="button"
                size="sm"
                variant={typeFilter === f ? "secondary" : "outline"}
                className={cn(
                  "rounded-full border-border/70",
                  typeFilter === f && "border-transparent",
                )}
                onClick={() => setTypeFilter(f)}
              >
                {f === "all" ? "All" : f === "movie" ? "Movies" : "Shows"}
              </Button>
            ))}
          </div>

          {loading ? (
            <div className="flex items-center gap-2 py-16 text-sm text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
              Loading release calendar…
            </div>
          ) : !data?.configured ? (
            <p className="rounded-2xl border border-border/60 bg-card/80 px-4 py-10 text-center text-sm text-muted-foreground">
              {data?.warning ?? "Add TMDB_API_KEY to load releases."}
            </p>
          ) : data.warning && !data.items.length ? (
            <p className="text-sm text-muted-foreground">{data.warning}</p>
          ) : sortedDates.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing in this window for this filter. Try another tab or widen
              the type filter.
            </p>
          ) : (
            <div className="space-y-10">
              {sortedDates.map((date) => {
                const items = grouped.get(date) ?? [];
                const { dow, dom, mon } = dateBadgeParts(date);
                return (
                  <section key={date} className="flex gap-4 sm:gap-6">
                    <div className="flex w-11 shrink-0 flex-col items-center border-r border-border/50 pr-3 text-center sm:w-14 sm:pr-4">
                      <span className="text-[10px] font-semibold tracking-wide text-muted-foreground">
                        {dow}
                      </span>
                      <span className="font-heading text-2xl font-bold leading-none text-foreground sm:text-3xl">
                        {dom}
                      </span>
                      <span className="text-[10px] font-medium text-muted-foreground">
                        {mon}
                      </span>
                    </div>
                    <div className="grid min-w-0 flex-1 grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                      {items.map((item) => (
                        <button
                          key={`${item.mediaType}-${item.tmdbId}`}
                          type="button"
                          onClick={() => void openItem(item)}
                          className="group w-full text-left"
                        >
                          <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-border/60 transition group-hover:ring-primary/40">
                            <PosterImage
                              src={
                                item.posterPath
                                  ? tmdbPosterUrl(item.posterPath, "w342")
                                  : ""
                              }
                              alt=""
                              fill
                              placeholderGradient="from-zinc-700 to-zinc-900"
                              className="object-cover transition duration-300 group-hover:scale-[1.03]"
                              sizes="(max-width:640px) 42vw, 160px"
                            />
                            <div className="pointer-events-none absolute right-1.5 top-1.5 flex items-center gap-0.5 rounded-full bg-orange-950/85 px-1.5 py-0.5 text-[10px] font-semibold text-orange-100 ring-1 ring-orange-400/35 backdrop-blur-sm">
                              <Flame className="size-3 shrink-0 text-orange-400" />
                              {formatScheduleHype(item)}
                            </div>
                            <div className="pointer-events-none absolute bottom-1.5 left-1.5 rounded bg-black/70 px-1 py-0.5 text-[9px] font-medium uppercase tracking-wide text-white/90">
                              {item.mediaType === "tv" ? "Show" : "Film"}
                            </div>
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs font-semibold leading-snug text-foreground">
                            {item.title}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {item.kindLabel} · ★ {item.voteAverage.toFixed(1)}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground/90">
                            {item.releaseVenueLabel}
                          </p>
                        </button>
                      ))}
                    </div>
                  </section>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
