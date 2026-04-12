"use client";

import { useMemo } from "react";
import { ExploreMovieRail } from "@/components/explore-movie-rail";
import { ExploreMovieStrip } from "@/components/explore-movie-strip";
import { Button } from "@/components/ui/button";
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
  onClearRecent?: () => void | Promise<void>;
  canClearRecent?: boolean;
};

export function ExplorePersonalRails({
  watchlistMovies,
  watchlistLoading,
  recentMovies,
  recentLoading,
  onSelectMovie,
  onClearRecent,
  canClearRecent,
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
    <div id="explore-section-personal" className="space-y-8">
      <ExploreMovieStrip
        sectionId="explore-section-watchlist"
        variant="ribbon"
        title="Watchlist"
        subtitle="Titles you saved for later — same list as in Your theatre."
        movies={watchlistMovies.slice(0, 16)}
        loading={watchlistLoading}
        onSelectMovie={onSelectMovie}
        emptyHint="Save films from a movie page to fill your watchlist."
      />

      <ExploreMovieStrip
        sectionId="explore-section-recent"
        variant="filmstrip"
        title="Recently viewed"
        subtitle="Saved to your account when signed in, and on this device for quick access."
        movies={recent.slice(0, 16)}
        loading={recentLoading}
        onSelectMovie={onSelectMovie}
        emptyHint="Open any poster here — we will remember it for you."
        headerEnd={
          onClearRecent && canClearRecent ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 border-border/70 text-xs"
              onClick={() => void onClearRecent()}
            >
              Clear
            </Button>
          ) : null
        }
      />

      {continueEndpoint ? (
        <ExploreMovieRail
          sectionId="explore-section-continue"
          accent="orbit"
          title="Continue browsing"
          subtitle={`More in the “${recent[0]?.genre ?? "same"}” lane you were just browsing on TMDB.`}
          endpoint={continueEndpoint}
          onSelectMovie={onSelectMovie}
        />
      ) : null}

      {becauseEndpoint && becauseSeed ? (
        <ExploreMovieRail
          sectionId="explore-section-because"
          accent="signal"
          title={`Because you watched “${becauseSeed.title}”`}
          subtitle="TMDB picks people often pair with that title."
          endpoint={becauseEndpoint}
          onSelectMovie={onSelectMovie}
        />
      ) : null}

      {youEndpoint ? (
        <ExploreMovieRail
          sectionId="explore-section-you"
          accent="pulse"
          title="You might like"
          subtitle="Similar vibes and follow-ups — not the same list as above."
          endpoint={youEndpoint}
          onSelectMovie={onSelectMovie}
        />
      ) : null}
    </div>
  );
}
