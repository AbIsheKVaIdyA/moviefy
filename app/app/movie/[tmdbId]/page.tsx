"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { MovieDetailView } from "@/components/movie-detail-view";
import { useSupabaseApp } from "@/components/supabase-app-provider";
import {
  addMovieToPlaylistDb,
  fetchSavedMovieKeys,
  fetchUserPlaylists,
  getOrCreatePrimaryWatchedPlaylist,
  movieMatchesInPlaylistRow,
  removeMovieFromPlaylistDb,
  setMovieSavedDb,
} from "@/lib/supabase/playlist-service";
import { movieFromDetailPageParams } from "@/lib/movie-detail-nav";
import type { Playlist } from "@/lib/types";

export default function TmdbMoviePage() {
  const params = useParams();
  const sp = useSearchParams();
  const { client, session } = useSupabaseApp();

  const viewerDisplayName =
    (session?.user?.user_metadata as { full_name?: string; name?: string } | undefined)
      ?.full_name ??
    (session?.user?.user_metadata as { name?: string } | undefined)?.name ??
    session?.user?.email?.split("@")[0] ??
    null;
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [libraryPlaylists, setLibraryPlaylists] = useState<Playlist[]>([]);
  const [watchedBusy, setWatchedBusy] = useState(false);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toast = useCallback((m: string) => setToastMsg(m), []);

  const movie = useMemo(() => {
    const raw = params?.tmdbId;
    const idStr = Array.isArray(raw) ? raw[0] : raw;
    const n = typeof idStr === "string" ? Number(idStr) : Number.NaN;
    return movieFromDetailPageParams(n, sp);
  }, [params, sp]);

  const backHref =
    sp.get("from") === "explore"
      ? "/app/explore"
      : sp.get("from") === "releases"
        ? "/app/releases"
        : "/app";
  const tmdbMedia = sp.get("media") === "tv" ? "tv" : "movie";

  const watchedPlaylist = useMemo(
    () => libraryPlaylists.find((p) => p.kind === "watched"),
    [libraryPlaylists],
  );

  const inWatched = useMemo(() => {
    if (!movie || !watchedPlaylist) return false;
    return watchedPlaylist.movies.some((row) =>
      movieMatchesInPlaylistRow(row, movie),
    );
  }, [movie, watchedPlaylist]);

  useLayoutEffect(() => {
    if (!movie) return;
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [movie?.id]);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2600);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    if (!client || !session?.user) return;
    void fetchSavedMovieKeys(client, session.user.id).then(setSavedIds);
  }, [client, session?.user?.id]);

  useEffect(() => {
    if (!client || !session?.user || !movie) return;
    void fetchUserPlaylists(client, session.user.id).then(setLibraryPlaylists);
  }, [client, session?.user?.id, movie?.id]);

  if (!movie) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center bg-[#121212] px-4 text-center text-white">
        <p className="text-sm text-white/65">This movie link is invalid or incomplete.</p>
      </div>
    );
  }

  const saved =
    savedIds.has(movie.id) ||
    (movie.tmdbId != null && savedIds.has(`tmdb-${movie.tmdbId}`));

  async function refreshLibrary() {
    if (!client || !session?.user) return;
    const pl = await fetchUserPlaylists(client, session.user.id);
    setLibraryPlaylists(pl);
  }

  async function onToggleWatched() {
    if (!client || !session?.user || !movie) return;
    setWatchedBusy(true);
    try {
      const pl = await getOrCreatePrimaryWatchedPlaylist(client, session.user.id);
      if (!pl) {
        toast("Could not open your Watched list");
        return;
      }
      if (inWatched) {
        const ok = await removeMovieFromPlaylistDb(client, pl.id, movie);
        if (!ok) toast("Could not remove from Watched");
        else toast("Removed from Watched");
      } else {
        const ok = await addMovieToPlaylistDb(client, pl.id, movie);
        if (!ok) toast("Already in Watched or could not add");
        else toast("Added to Watched");
      }
      await refreshLibrary();
    } finally {
      setWatchedBusy(false);
    }
  }

  return (
    <>
      <MovieDetailView
        key={movie.id}
        movie={movie}
        active
        variant="page"
        backHref={backHref}
        inActiveList={false}
        saved={saved}
        onToggleSave={async () => {
          if (!client || !session?.user) return;
          const was = saved;
          const ok = await setMovieSavedDb(client, session.user.id, movie, !was);
          if (!ok) {
            toast("Could not update saved");
            return;
          }
          const keys = await fetchSavedMovieKeys(client, session.user.id);
          setSavedIds(keys);
          toast(was ? "Removed from saved" : "Saved for later");
        }}
        onAddToList={() =>
          toast("Open Your theatre to add this title to one of your playlists.")
        }
        watched={inWatched}
        onToggleWatched={session?.user ? onToggleWatched : undefined}
        watchedBusy={watchedBusy}
        supabase={client}
        userId={session?.user?.id ?? null}
        viewerDisplayName={viewerDisplayName}
        tmdbMedia={tmdbMedia}
      />
      {toastMsg ? (
        <div
          className="fixed left-1/2 z-[200] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900 px-4 py-2.5 text-center text-sm text-white shadow-lg [bottom:max(1.25rem,calc(0.75rem+env(safe-area-inset-bottom)))]"
          role="status"
        >
          {toastMsg}
        </div>
      ) : null}
    </>
  );
}
