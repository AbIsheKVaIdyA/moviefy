"use client";

import { useMemo } from "react";
import { ExploreMovieRail } from "@/components/explore-movie-rail";
import { ExploreMovieStrip } from "@/components/explore-movie-strip";
import type { Genre, Movie } from "@/lib/types";
import { GENRES } from "@/lib/types";

function isGenre(g: string): g is Genre {
  return (GENRES as readonly string[]).includes(g);
}

function tmdbIdFromMovie(m: Movie | undefined): number | null {
  if (!m) return null;
  if (m.tmdbId != null && Number.isFinite(m.tmdbId)) return m.tmdbId;
  if (m.id.startsWith("tmdb-")) {
    const n = Number(m.id.slice(5));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

type Props = {
  watchlistMovies: Movie[];
  watchlistLoading: boolean;
  recentMovies: Movie[];
  recentLoading: boolean;
  onSelectMovie: (movie: Movie) => void;
};

export function ExplorePersonalRails({
  watchlistMovies,
  watchlistLoading,
  recentMovies,
  recentLoading,
  onSelectMovie,
}: Props) {
  const recent = recentMovies;

  const continueEndpoint = useMemo(() => {
    const last = recent[0];
    if (!last || !isGenre(last.genre)) return null;
    return `/api/discover/genre?genre=${encodeURIComponent(last.genre)}&sort=${encodeURIComponent("popularity.desc")}`;
  }, [recent]);

  const becauseSeed = recent[0];
  const becauseTid = tmdbIdFromMovie(becauseSeed);
  const becauseEndpoint =
    becauseTid != null
      ? `/api/discover/recommendations?tmdbId=${becauseTid}`
      : null;

  const tidSaved = tmdbIdFromMovie(watchlistMovies[0]);
  const tidRecent = tmdbIdFromMovie(recent[0]);
  const youTid = tidSaved ?? tidRecent ?? null;

  const youEndpoint =
    youTid != null ? `/api/discover/similar?tmdbId=${youTid}` : null;

  return (
    <div className="space-y-8">
      <ExploreMovieStrip
        title="Watchlist"
        subtitle="Titles you saved for later — same list as in Your theatre."
        movies={watchlistMovies.slice(0, 16)}
        loading={watchlistLoading}
        onSelectMovie={onSelectMovie}
        emptyHint="Save films from a movie page to fill your watchlist."
      />

      <ExploreMovieStrip
        title="Recently viewed"
        subtitle="Saved to your account when signed in, and on this device for quick access."
        movies={recent.slice(0, 16)}
        loading={recentLoading}
        onSelectMovie={onSelectMovie}
        emptyHint="Open any poster here — we will remember it for you."
      />

      {continueEndpoint ? (
        <ExploreMovieRail
          title="Continue browsing"
          subtitle={`More in the “${recent[0]?.genre ?? "same"}” lane you were just browsing on TMDB.`}
          endpoint={continueEndpoint}
          onSelectMovie={onSelectMovie}
        />
      ) : null}

      {becauseEndpoint && becauseSeed ? (
        <ExploreMovieRail
          title={`Because you watched “${becauseSeed.title}”`}
          subtitle="TMDB picks people often pair with that title."
          endpoint={becauseEndpoint}
          onSelectMovie={onSelectMovie}
        />
      ) : null}

      {youEndpoint ? (
        <ExploreMovieRail
          title="You might like"
          subtitle="Similar vibes and follow-ups — not the same list as above."
          endpoint={youEndpoint}
          onSelectMovie={onSelectMovie}
        />
      ) : null}
    </div>
  );
}
