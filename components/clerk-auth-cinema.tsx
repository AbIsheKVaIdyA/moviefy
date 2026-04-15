"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { TmdbDiscoverResponse } from "@/lib/movie-enrich-types";
import { tmdbPosterUrl } from "@/lib/tmdb-image";
import { cn } from "@/lib/utils";

export type ClerkAuthCinemaMovie = {
  id: number;
  title: string;
  poster_path: string;
  vote_average: number;
};

const FALLBACK_POSTER_PATHS = [
  "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  "/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg",
  "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg",
  "/vkcQQfHrjacEUBLVrV3ZCD9Wmf0.jpg",
  "/or06FN3Dka5tukK1e9sl16pB3iy.jpg",
  "/6oom5QYQ2yQTMJIbnvbwBL8eeyk.jpg",
  "/63N8BifxqU9DUFvYKV8kp3uxvG7.jpg",
  "/8UlWHLMpg9il8BzCDCfhRwqadtl.jpg",
  "/1pdfLvkbYqolLxC4uY4eC3r2mvh.jpg",
  "/q719jXXzOoYnss6P4u10vOaqY5j.jpg",
  "/fSRu7Fu8UTmAJOnsWvC1yrIkFJ2.jpg",
];

const FALLBACK_TITLES = [
  "Opening-night energy",
  "Encore pick",
  "Late-show vibes",
  "Front-row buzz",
  "Marquee heat",
  "Crowd favourite",
];

function fallbackMovies(): ClerkAuthCinemaMovie[] {
  return FALLBACK_POSTER_PATHS.map((poster_path, i) => ({
    id: 900_000 + i,
    title: FALLBACK_TITLES[i % FALLBACK_TITLES.length]!,
    poster_path,
    vote_average: 7.2 + (i % 5) * 0.2,
  }));
}

function toCinemaMovies(data: TmdbDiscoverResponse): ClerkAuthCinemaMovie[] {
  const rows = data.results ?? [];
  const out = rows
    .filter((m) => m.poster_path?.trim())
    .map((m) => ({
      id: m.id,
      title: m.title,
      poster_path: m.poster_path!,
      vote_average: m.vote_average,
    }));
  return out.length >= 6 ? out : fallbackMovies();
}

const CinemaMoviesContext = createContext<ClerkAuthCinemaMovie[]>(fallbackMovies());

export function useClerkAuthCinemaMovies(): ClerkAuthCinemaMovie[] {
  return useContext(CinemaMoviesContext);
}

function VerticalRail({
  movies,
  direction,
  side,
}: {
  movies: ClerkAuthCinemaMovie[];
  direction: "up" | "down";
  side: "left" | "right";
}) {
  const paths = useMemo(
    () => movies.map((m) => m.poster_path).filter(Boolean),
    [movies],
  );
  const loop = useMemo(() => [...paths, ...paths], [paths]);
  if (!loop.length) return null;

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-0 top-[4.25rem] z-[1] hidden overflow-hidden md:block",
        side === "left" ? "left-0" : "right-0",
        "w-[clamp(4rem,18vw,11rem)] lg:w-[clamp(4.5rem,22vw,13.5rem)] xl:w-[clamp(5rem,24vw,15rem)]",
      )}
      aria-hidden
    >
      <div
        className="relative h-full min-h-[520px] w-full opacity-[0.55]"
        style={{
          maskImage:
            "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to bottom, transparent, black 10%, black 90%, transparent)",
        }}
      >
        <div
          className={cn(
            "flex w-full flex-col gap-2.5 px-1 lg:gap-3",
            direction === "up"
              ? "animate-auth-poster-rail-up"
              : "animate-auth-poster-rail-down",
          )}
        >
          {loop.map((path, i) => (
            <div
              key={`${path}-${i}`}
              className="relative aspect-[2/3] w-full shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10 shadow-lg"
            >
              <img
                src={tmdbPosterUrl(path, "w342")}
                alt=""
                className="h-full w-full object-cover saturate-[0.9]"
                loading="lazy"
                decoding="async"
              />
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/20" />
            </div>
          ))}
        </div>
      </div>
      <div
        className={cn(
          "pointer-events-none absolute inset-0",
          side === "left"
            ? "bg-gradient-to-r from-[#040406] via-[#040406]/35 to-transparent"
            : "bg-gradient-to-l from-[#040406] via-[#040406]/35 to-transparent",
        )}
      />
    </div>
  );
}

function CenterScreenMist({ movies }: { movies: ClerkAuthCinemaMovie[] }) {
  const hero = useMemo(() => movies.slice(0, 5), [movies]);
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-[28%] z-[0] hidden w-[min(1100px,92vw)] -translate-x-1/2 md:block"
      aria-hidden
    >
      <div className="flex items-center justify-center gap-3 opacity-[0.14] blur-2xl lg:gap-5">
        {hero.map((m) => (
          <div
            key={m.id}
            className="aspect-[2/3] w-[min(22vw,200px)] overflow-hidden rounded-2xl ring-1 ring-white/10"
          >
            <img
              src={tmdbPosterUrl(m.poster_path, "w500")}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Full-screen ambient posters on small viewports only (rails are `md+`).
 * Heavy scrim keeps Clerk readable; `pointer-events-none` never blocks taps.
 */
function MobilePosterMarqueeRow({
  loop,
  animationClass,
  positionClass,
  sizeClass,
  blurClass,
}: {
  loop: string[];
  animationClass: string;
  positionClass: string;
  sizeClass: string;
  blurClass?: string;
}) {
  return (
    <div
      className={cn(
        "absolute left-0 right-0 overflow-hidden",
        positionClass,
        blurClass,
      )}
      style={{
        maskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        WebkitMaskImage:
          "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
      }}
    >
      <div className={cn("flex w-max gap-3 px-2", animationClass)}>
        {loop.map((path, i) => (
          <div
            key={`${animationClass}-${path}-${i}`}
            className={cn(
              "relative aspect-[2/3] shrink-0 overflow-hidden rounded-lg ring-1 ring-white/20 shadow-lg shadow-black/40",
              sizeClass,
            )}
          >
            <img
              src={tmdbPosterUrl(path, "w342")}
              alt=""
              className="h-full w-full object-cover saturate-[0.92]"
              loading="lazy"
              decoding="async"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function ClerkAuthMobileBackdrop() {
  const movies = useClerkAuthCinemaMovies();
  const paths = useMemo(
    () => movies.map((m) => m.poster_path),
    [movies],
  );
  const loop = useMemo(() => [...paths, ...paths], [paths]);
  if (!loop.length) return null;

  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden md:hidden"
      aria-hidden
    >
      {/* Posters: visible strength; scrims below stay translucent so motion reads on phones */}
      <div className="absolute inset-0">
        <MobilePosterMarqueeRow
          loop={loop}
          animationClass="animate-auth-mobile-poster-x"
          positionClass="top-[6%] h-[6.5rem]"
          sizeClass="w-[4.75rem] sm:w-20"
        />
        <MobilePosterMarqueeRow
          loop={loop}
          animationClass="animate-auth-mobile-poster-x-reverse"
          positionClass="top-[38%] h-[7rem] opacity-90"
          sizeClass="w-[5.25rem] sm:w-[5.5rem]"
          blurClass="blur-[1.5px]"
        />
        <MobilePosterMarqueeRow
          loop={loop}
          animationClass="animate-auth-mobile-poster-x"
          positionClass="bottom-[8%] h-[6.5rem]"
          sizeClass="w-[4.75rem] sm:w-20"
        />
      </div>
      {/* Readability: was ~82–92% solid — drowned posters; keep Clerk legible with lighter wash */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#040406]/72 via-[#040406]/58 to-[#040406]/76" />
      <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/10 to-black/28" />
    </div>
  );
}

function BokehLayer() {
  return (
    <div className="pointer-events-none absolute inset-0 z-[0] overflow-hidden" aria-hidden>
      <div className="absolute -left-[10%] top-[20%] h-72 w-72 rounded-full bg-violet-600/20 blur-[100px] animate-pulse" />
      <div
        className="absolute right-0 top-[40%] h-80 w-80 rounded-full bg-fuchsia-600/15 blur-[110px] animate-pulse"
        style={{ animationDelay: "1.2s" }}
      />
      <div
        className="absolute bottom-[15%] left-[30%] h-64 w-64 rounded-full bg-amber-500/10 blur-[90px] animate-pulse"
        style={{ animationDelay: "2.4s" }}
      />
    </div>
  );
}

export function ClerkAuthCinemaProvider({ children }: { children: ReactNode }) {
  const [movies, setMovies] = useState<ClerkAuthCinemaMovie[]>(fallbackMovies);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/trending/week")
      .then((r) => r.json() as Promise<TmdbDiscoverResponse>)
      .then((data) => {
        if (cancelled) return;
        setMovies(toCinemaMovies(data));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const leftRail = useMemo(
    () => movies.filter((_, i) => i % 2 === 0),
    [movies],
  );
  const rightRail = useMemo(
    () => movies.filter((_, i) => i % 2 === 1),
    [movies],
  );

  return (
    <CinemaMoviesContext.Provider value={movies}>
      <BokehLayer />
      <CenterScreenMist movies={movies} />
      <VerticalRail movies={leftRail.length ? leftRail : movies} direction="up" side="left" />
      <VerticalRail
        movies={rightRail.length ? rightRail : movies}
        direction="down"
        side="right"
      />
      {children}
    </CinemaMoviesContext.Provider>
  );
}
