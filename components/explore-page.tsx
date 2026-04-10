"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clapperboard,
  Compass,
  Globe,
  Loader2,
  Plus,
  Search,
  UserPlus,
  Users,
} from "lucide-react";
import { PosterImage } from "@/components/poster-image";
import { MovieDetailDialog } from "@/components/movie-detail-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSupabaseApp } from "@/components/supabase-app-provider";
import {
  clonePublicPlaylistForUser,
  fetchFollowedPlaylistIds,
  fetchPublicCommunityPlaylists,
  fetchSavedMovieKeys,
  setMovieSavedDb,
  setPlaylistFollowedDb,
} from "@/lib/supabase/playlist-service";
import {
  GENRES,
  type CommunityPlaylist,
  type Genre,
  type Movie,
} from "@/lib/types";
import type { TmdbDiscoverResponse } from "@/lib/movie-enrich-types";
import { movieFromTmdbDiscoverItem } from "@/lib/tmdb-genre-map";
import { cn } from "@/lib/utils";

function CommunityPlaylistCard({
  item,
  following,
  onToggleFollow,
  onSaveToLibrary,
}: {
  item: CommunityPlaylist;
  following: boolean;
  onToggleFollow: () => void;
  onSaveToLibrary: () => Promise<void>;
}) {
  const cover = item.movies[0];
  return (
    <div className="group flex w-[280px] shrink-0 flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a1a] transition hover:border-white/20 hover:shadow-lg hover:shadow-black/40 sm:w-[300px]">
      <div className="relative aspect-[16/10] overflow-hidden bg-zinc-900">
        {cover ? (
          <PosterImage
            src={cover.posterImage}
            alt={cover.title}
            fill
            placeholderGradient={cover.posterClass}
            className="object-cover transition duration-500 group-hover:scale-[1.03]"
            sizes="300px"
          />
        ) : null}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
          <Badge className="border-0 bg-white/15 text-[10px] text-white backdrop-blur">
            <Globe className="mr-1 size-3" />
            Public
          </Badge>
          <span className="text-[10px] text-white/80">
            {item.followerCount.toLocaleString()} followers
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <h3 className="font-heading text-base font-semibold leading-snug text-white line-clamp-2">
            {item.name}
          </h3>
          <p className="mt-1 text-xs text-white/50 line-clamp-2">{item.description}</p>
        </div>
        <p className="text-xs text-white/45">
          By <span className="text-white/70">{item.ownerName}</span>{" "}
          <span className="text-primary/90">{item.ownerHandle}</span>
        </p>
        <p className="text-[11px] text-white/40">{item.movies.length} films</p>
        <div className="mt-auto flex flex-wrap gap-2 pt-1">
          <Button
            type="button"
            size="sm"
            variant={following ? "secondary" : "outline"}
            className={cn(
              "h-8 flex-1 border-white/15 text-xs",
              following && "border-transparent",
            )}
            onClick={() => {
              void onToggleFollow();
            }}
          >
            <UserPlus className="size-3.5" />
            {following ? "Following" : "Follow"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-8 flex-1 text-xs"
            onClick={() => {
              void onSaveToLibrary();
            }}
          >
            <Plus className="size-3.5" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ExplorePage() {
  const { client, session, ready } = useSupabaseApp();
  const [communityPlaylists, setCommunityPlaylists] = useState<
    CommunityPlaylist[]
  >([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genre, setGenre] = useState<Genre | null>(null);
  const [genreSort, setGenreSort] = useState<
    "popularity.desc" | "vote_average.desc" | "primary_release_date.desc"
  >("popularity.desc");
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreResults, setGenreResults] = useState<TmdbDiscoverResponse["results"]>(
    [],
  );
  const [genreConfigured, setGenreConfigured] = useState(true);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [savedMovieIds, setSavedMovieIds] = useState<Set<string>>(() => new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const toast = useCallback((m: string) => setToastMsg(m), []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = window.setTimeout(() => setToastMsg(null), 2600);
    return () => window.clearTimeout(t);
  }, [toastMsg]);

  useEffect(() => {
    if (!ready || !client || !session?.user) return;
    let cancelled = false;
    setCommunityLoading(true);
    void fetchPublicCommunityPlaylists(client)
      .then((rows) => {
        if (cancelled) return;
        const uid = session.user.id;
        setCommunityPlaylists(rows.filter((p) => p.ownerUserId !== uid));
      })
      .finally(() => {
        if (!cancelled) setCommunityLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, client, session?.user?.id]);

  useEffect(() => {
    if (!ready || !client || !session?.user) return;
    void fetchFollowedPlaylistIds(client, session.user.id).then(setFollowedIds);
  }, [ready, client, session?.user?.id]);

  useEffect(() => {
    if (!ready || !client || !session?.user) return;
    void fetchSavedMovieKeys(client, session.user.id).then(setSavedMovieIds);
  }, [ready, client, session?.user?.id]);

  useEffect(() => {
    if (!genre) {
      setGenreResults([]);
      return;
    }
    const ctrl = new AbortController();
    setGenreLoading(true);
    fetch(
      `/api/discover/genre?genre=${encodeURIComponent(genre)}&sort=${encodeURIComponent(genreSort)}`,
      { signal: ctrl.signal },
    )
      .then((r) => r.json() as Promise<TmdbDiscoverResponse>)
      .then((data) => {
        setGenreConfigured(data.configured);
        setGenreResults(data.results ?? []);
      })
      .catch(() => {
        setGenreResults([]);
        setGenreConfigured(false);
      })
      .finally(() => setGenreLoading(false));
    return () => ctrl.abort();
  }, [genre, genreSort]);

  const filteredPlaylists = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return communityPlaylists;
    return communityPlaylists.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.ownerHandle.toLowerCase().includes(q) ||
        p.ownerName.toLowerCase().includes(q),
    );
  }, [searchQuery, communityPlaylists]);

  const followedPlaylists = useMemo(
    () => communityPlaylists.filter((p) => followedIds.has(p.id)),
    [communityPlaylists, followedIds],
  );

  function selectMovie(movie: Movie) {
    setSelectedMovie(movie);
    setDetailOpen(true);
  }

  async function toggleFollow(id: string) {
    if (!client || !session?.user) return;
    const was = followedIds.has(id);
    const next = !was;
    const ok = await setPlaylistFollowedDb(
      client,
      session.user.id,
      id,
      next,
    );
    if (!ok) {
      toast("Could not update follow");
      return;
    }
    const fresh = await fetchFollowedPlaylistIds(client, session.user.id);
    setFollowedIds(fresh);
    toast(was ? "Unfollowed playlist" : "Following this playlist");
  }

  return (
    <div className="min-h-dvh bg-[#0a0a0a] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0a0a]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 transition hover:bg-white/10"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Library</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Compass className="size-4" />
              </div>
              <div>
                <p className="font-heading text-sm font-semibold">Explore</p>
                <p className="text-[10px] text-white/45">Playlists & genres</p>
              </div>
            </div>
          </div>
          <Link
            href="/app"
            className="hidden items-center gap-2 text-sm text-white/60 transition hover:text-white sm:flex"
          >
            <Clapperboard className="size-4" />
            Moviefy
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 py-8">
        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-br from-[#1f1f2e] via-[#14141a] to-[#0a0a0f] p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <Badge className="mb-4 border-0 bg-white/10 text-white hover:bg-white/10">
              <Users className="mr-1 size-3" />
              Public playlists · TMDB genres
            </Badge>
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Find your next obsession
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
              Search creators’ public lists, follow playlists you love, save them to your
              library — same energy as Spotify, built for film.
            </p>
            <div className="relative mt-6 max-w-xl">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/35" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search playlists, moods, or @creators…"
                className="h-11 border-white/10 bg-black/30 pl-10 text-white placeholder:text-white/35"
              />
            </div>
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold">Browse by genre</h2>
              <p className="mt-1 text-sm text-white/50">
                Pulls live titles from TMDB for that genre. Tap a film for details.
              </p>
            </div>
            {genre ? (
              <Select
                value={genreSort}
                onValueChange={(v) =>
                  setGenreSort(
                    (v ?? genreSort) as typeof genreSort,
                  )
                }
              >
                <SelectTrigger className="h-9 w-full border-white/10 bg-[#1a1a1a] text-xs sm:w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="popularity.desc">Popular</SelectItem>
                  <SelectItem value="vote_average.desc">Top rated</SelectItem>
                  <SelectItem value="primary_release_date.desc">Newest</SelectItem>
                </SelectContent>
              </Select>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {GENRES.map((g) => (
              <Button
                key={g}
                type="button"
                size="sm"
                variant={genre === g ? "secondary" : "outline"}
                className={cn(
                  "rounded-full border-white/15",
                  genre === g && "border-transparent",
                )}
                onClick={() => setGenre((prev) => (prev === g ? null : g))}
              >
                {g}
              </Button>
            ))}
          </div>

          <div className="mt-6 min-h-[120px] rounded-2xl border border-white/10 bg-[#121212] p-4 sm:p-6">
            {!genre ? (
              <p className="text-center text-sm text-white/45">
                Choose a genre above — try Horror, Sci-Fi, or Romance.
              </p>
            ) : genreLoading ? (
              <div className="flex items-center justify-center gap-2 py-16 text-white/50">
                <Loader2 className="size-5 animate-spin" />
                Loading {genre} picks…
              </div>
            ) : !genreConfigured ? (
              <p className="text-center text-sm text-amber-200/80">
                Add TMDB_API_KEY to load genre results.
              </p>
            ) : genreResults.length === 0 ? (
              <p className="text-center text-sm text-white/45">
                No titles matched. Try another genre or sort.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {genreResults.slice(0, 15).map((item) => {
                  const movie = movieFromTmdbDiscoverItem(item);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => selectMovie(movie)}
                      className="group text-left"
                    >
                      <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/10 transition group-hover:ring-primary/40">
                        <PosterImage
                          src={movie.posterImage}
                          alt={movie.title}
                          fill
                          placeholderGradient={movie.posterClass}
                          className="object-cover transition group-hover:scale-[1.02]"
                          sizes="(max-width: 640px) 45vw, 180px"
                        />
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs font-medium text-white/90">
                        {movie.title}
                      </p>
                      <p className="text-[10px] text-white/45">
                        ★ {item.vote_average.toFixed(1)}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        {followedPlaylists.length > 0 ? (
          <section className="mt-12">
            <h2 className="font-heading text-xl font-semibold">Creators you follow</h2>
            <p className="mt-1 text-sm text-white/50">
              Playlists you follow — synced with your Moviefy account.
            </p>
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {followedPlaylists.map((p) => (
                <CommunityPlaylistCard
                  key={p.id}
                  item={p}
                  following={followedIds.has(p.id)}
                  onToggleFollow={() => void toggleFollow(p.id)}
                  onSaveToLibrary={async () => {
                    if (!client || !session?.user) return;
                    const pl = await clonePublicPlaylistForUser(
                      client,
                      session.user.id,
                      p.id,
                    );
                    toast(
                      pl
                        ? "Saved to your library — open Home to see it"
                        : "Could not copy playlist",
                    );
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section className="mt-12">
          <h2 className="font-heading text-xl font-semibold">Public playlists</h2>
          <p className="mt-1 text-sm text-white/50">
            Discover lists from the community — follow for updates or save to your
            library.
          </p>
          <ScrollArea className="mt-4 w-full">
            <div className="flex w-max gap-4 pb-2">
              {communityLoading ? (
                <div className="flex items-center gap-2 py-8 text-sm text-white/45">
                  <Loader2 className="size-4 animate-spin" />
                  Loading public playlists…
                </div>
              ) : filteredPlaylists.length === 0 ? (
                <p className="py-8 text-sm text-white/45">
                  {communityPlaylists.length === 0
                    ? "No public playlists yet. Mark a list as Public in your Library to share it here."
                    : "No playlists match your search."}
                </p>
              ) : (
                filteredPlaylists.map((p) => (
                  <CommunityPlaylistCard
                    key={p.id}
                    item={p}
                    following={followedIds.has(p.id)}
                    onToggleFollow={() => void toggleFollow(p.id)}
                    onSaveToLibrary={async () => {
                      if (!client || !session?.user) return;
                      const pl = await clonePublicPlaylistForUser(
                        client,
                        session.user.id,
                        p.id,
                      );
                      toast(
                        pl
                          ? "Saved to your library — open Home to see it"
                          : "Could not copy playlist",
                      );
                    }}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </section>
      </main>

      <MovieDetailDialog
        movie={selectedMovie}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        inActiveList={false}
        saved={
          selectedMovie
            ? savedMovieIds.has(selectedMovie.id) ||
              (selectedMovie.tmdbId != null &&
                savedMovieIds.has(`tmdb-${selectedMovie.tmdbId}`))
            : false
        }
        onToggleSave={async () => {
          if (!client || !session?.user || !selectedMovie) return;
          const was =
            savedMovieIds.has(selectedMovie.id) ||
            (selectedMovie.tmdbId != null &&
              savedMovieIds.has(`tmdb-${selectedMovie.tmdbId}`));
          const ok = await setMovieSavedDb(
            client,
            session.user.id,
            selectedMovie,
            !was,
          );
          if (!ok) {
            toast("Could not update saved");
            return;
          }
          const keys = await fetchSavedMovieKeys(client, session.user.id);
          setSavedMovieIds(keys);
          toast(was ? "Removed from saved" : "Saved for later");
        }}
        onAddToList={() =>
          toast("Open Library to add this title to one of your playlists.")
        }
      />

      {toastMsg ? (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg"
          role="status"
        >
          {toastMsg}
        </div>
      ) : null}
    </div>
  );
}
