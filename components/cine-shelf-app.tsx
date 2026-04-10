"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { PosterImage } from "@/components/poster-image";
import {
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Compass,
  Globe,
  Heart,
  Home,
  Keyboard,
  Link2,
  ListOrdered,
  Loader2,
  SquareStack,
  Lock,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { useSupabaseApp } from "@/components/supabase-app-provider";
import { movieFromTmdbDiscoverItem } from "@/lib/tmdb-genre-map";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  addMovieToPlaylistDb,
  createPlaylist as createPlaylistDb,
  duplicatePlaylistDb,
  fetchProfileDisplayName,
  fetchSavedMovieKeys,
  fetchUserPlaylists,
  reorderPlaylistMoviesDb,
  setMovieSavedDb,
  updatePlaylistMeta,
} from "@/lib/supabase/playlist-service";
import type { TmdbDiscoverResponse } from "@/lib/movie-enrich-types";
import type { Genre, Movie, Playlist, PlaylistMovie } from "@/lib/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { MovieDetailDialog } from "@/components/movie-detail-dialog";
import { TmdbDiscoverSection } from "@/components/tmdb-discover-section";

type ListSort = "rank" | "year" | "title" | "genre";

type LibraryKindFilter = "all" | "collection" | "watched";

function renumber(movies: PlaylistMovie[]): PlaylistMovie[] {
  return movies.map((m, i) => ({ ...m, rank: i + 1 }));
}

function GenrePill({
  genre,
  active,
  onClick,
}: {
  genre: Genre | "all";
  active: boolean;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "secondary" : "ghost"}
      onClick={onClick}
      className={cn(
        "rounded-full border border-border/70",
        active ? "bg-secondary text-secondary-foreground" : "text-muted-foreground",
      )}
    >
      {genre === "all" ? "All" : genre}
    </Button>
  );
}

export function MoviefyApp() {
  const pathname = usePathname();
  const { client, session, ready, authError } = useSupabaseApp();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [activeId, setActiveId] = useState("");
  const [genreFilter, setGenreFilter] = useState<Genre | "all">("all");
  const [listSort, setListSort] = useState<ListSort>("rank");
  const [libraryQuery, setLibraryQuery] = useState("");
  const [newPlaylistOpen, setNewPlaylistOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newKind, setNewKind] = useState<Playlist["kind"]>("collection");
  const [addMovieOpen, setAddMovieOpen] = useState(false);
  const [movieToAdd, setMovieToAdd] = useState("");
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(() => new Set());
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const [toast, setToast] = useState<string | null>(null);
  const [libraryKindFilter, setLibraryKindFilter] =
    useState<LibraryKindFilter>("all");
  const [recentMovieIds, setRecentMovieIds] = useState<string[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pickPool, setPickPool] = useState<Movie[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);

  const loadLibrary = useCallback(async () => {
    if (!client || !session?.user) return;
    setLibraryLoading(true);
    try {
      const uid = session.user.id;
      const [pl, saved, name] = await Promise.all([
        fetchUserPlaylists(client, uid),
        fetchSavedMovieKeys(client, uid),
        fetchProfileDisplayName(client, uid),
      ]);
      setPlaylists(pl);
      setSavedIds(saved);
      setDisplayName(name);
      setActiveId((prev) => {
        if (typeof window !== "undefined") {
          const fromUrl = new URLSearchParams(window.location.search).get(
            "list",
          );
          if (fromUrl && pl.some((p) => p.id === fromUrl)) return fromUrl;
        }
        if (prev && pl.some((p) => p.id === prev)) return prev;
        return pl[0]?.id ?? "";
      });
    } finally {
      setLibraryLoading(false);
    }
  }, [client, session?.user]);

  useEffect(() => {
    if (!ready || !client || !session?.user) return;
    void loadLibrary();
  }, [ready, client, session?.user?.id, loadLibrary]);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch("/api/discover/top?sort=popularity.desc", { signal: ctrl.signal })
      .then((r) => r.json())
      .then((d: TmdbDiscoverResponse) => {
        const rows = d.results ?? [];
        setPickPool(rows.slice(0, 40).map(movieFromTmdbDiscoverItem));
      })
      .catch(() => setPickPool([]));
    return () => ctrl.abort();
  }, []);

  const active = useMemo(
    () => playlists.find((p) => p.id === activeId) ?? null,
    [playlists, activeId],
  );

  function selectMovie(movie: Movie) {
    setSelectedMovie(movie);
    setDetailOpen(true);
    setRecentMovieIds((prev) => {
      const next = [movie.id, ...prev.filter((id) => id !== movie.id)];
      return next.slice(0, 10);
    });
  }

  useEffect(() => {
    if (typeof window === "undefined" || !activeId) return;
    const url = new URL(window.location.href);
    if (url.searchParams.get("list") === activeId) return;
    url.searchParams.set("list", activeId);
    window.history.replaceState({}, "", url.toString());
  }, [activeId]);

  const filteredMovies = useMemo(() => {
    if (!active) return [];
    const base =
      genreFilter === "all"
        ? [...active.movies]
        : active.movies.filter((m) => m.genre === genreFilter);
    const list = [...base];
    switch (listSort) {
      case "rank":
        list.sort((a, b) => a.rank - b.rank);
        break;
      case "year":
        list.sort((a, b) => b.year - a.year || a.title.localeCompare(b.title));
        break;
      case "title":
        list.sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "genre":
        list.sort(
          (a, b) =>
            a.genre.localeCompare(b.genre) || a.title.localeCompare(b.title),
        );
        break;
      default:
        break;
    }
    return list;
  }, [active, genreFilter, listSort]);

  const sidebarPlaylists = useMemo(() => {
    let list = playlists;
    if (libraryKindFilter === "collection") {
      list = list.filter((p) => p.kind === "collection");
    } else if (libraryKindFilter === "watched") {
      list = list.filter((p) => p.kind === "watched");
    }
    const q = libraryQuery.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q),
    );
  }, [playlists, libraryQuery, libraryKindFilter]);

  const allKnownMovies = useMemo(() => {
    const m = new Map<string, Movie>();
    for (const p of playlists) {
      for (const mv of p.movies) m.set(mv.id, mv);
    }
    for (const mv of pickPool) m.set(mv.id, mv);
    return m;
  }, [playlists, pickPool]);

  const recentMovies = useMemo(() => {
    return recentMovieIds
      .map((id) => allKnownMovies.get(id))
      .filter((m): m is Movie => m != null);
  }, [recentMovieIds, allKnownMovies]);

  const activeGenreCount = useMemo(() => {
    if (!active) return 0;
    return new Set(active.movies.map((m) => m.genre)).size;
  }, [active]);

  const playlistGenres = useMemo(() => {
    if (!active) return [];
    return Array.from(new Set(active.movies.map((m) => m.genre))).sort();
  }, [active]);

  const catalogForAdd = useMemo(() => {
    if (!active) return pickPool;
    const inList = new Set(active.movies.map((m) => m.id));
    return pickPool.filter((m) => !inList.has(m.id));
  }, [active, pickPool]);

  const exploreRows = useMemo(() => pickPool.slice(0, 6), [pickPool]);
  const recommendations = useMemo(() => pickPool.slice(2, 10), [pickPool]);
  const browseRail = useMemo(() => [...pickPool].reverse(), [pickPool]);

  const searchResults = useMemo(() => {
    const q = searchQ.trim().toLowerCase();
    const pool = [...allKnownMovies.values()];
    if (!q) {
      return {
        movies: pool.slice(0, 8),
        lists: playlists.slice(0, 6),
      };
    }
    return {
      movies: pool
        .filter(
          (m) =>
            m.title.toLowerCase().includes(q) ||
            m.director.toLowerCase().includes(q) ||
            m.genre.toLowerCase().includes(q),
        )
        .slice(0, 12),
      lists: playlists.filter((p) => p.name.toLowerCase().includes(q)).slice(0, 8),
    };
  }, [searchQ, playlists, allKnownMovies]);

  const inActiveList = useMemo(() => {
    if (!active || !selectedMovie) return false;
    return active.movies.some(
      (m) =>
        m.id === selectedMovie.id ||
        (m.tmdbId != null &&
          m.tmdbId === selectedMovie.tmdbId &&
          selectedMovie.tmdbId != null),
    );
  }, [active, selectedMovie]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2800);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function pushToast(message: string) {
    setToast(message);
  }

  async function createPlaylist() {
    if (!client || !session?.user) return;
    const pl = await createPlaylistDb(client, session.user.id, {
      name: newName.trim() || "Untitled playlist",
      description: newDesc.trim() || "No description yet.",
      kind: newKind,
    });
    if (!pl) {
      pushToast("Could not create playlist");
      return;
    }
    setNewName("");
    setNewDesc("");
    setNewPlaylistOpen(false);
    await loadLibrary();
    setActiveId(pl.id);
    pushToast("Playlist created");
  }

  async function addMovieFromCatalog() {
    if (!client || !active || !movieToAdd) return;
    const movie = pickPool.find((m) => m.id === movieToAdd);
    if (!movie) return;
    const ok = await addMovieToPlaylistDb(client, active.id, movie);
    if (!ok) {
      pushToast("Could not add movie");
      return;
    }
    setMovieToAdd("");
    setAddMovieOpen(false);
    await loadLibrary();
    pushToast(`Added “${movie.title}” to ${active.name}`);
  }

  async function addMovieToActive(movie: Movie) {
    if (!client || !active) return;
    if (
      active.movies.some(
        (m) =>
          m.id === movie.id ||
          (m.tmdbId != null &&
            m.tmdbId === movie.tmdbId &&
            movie.tmdbId != null),
      )
    ) {
      pushToast("Already in this list");
      return;
    }
    const ok = await addMovieToPlaylistDb(client, active.id, movie);
    if (!ok) {
      pushToast("Could not add movie");
      return;
    }
    await loadLibrary();
    pushToast(`Added “${movie.title}” to ${active.name}`);
  }

  async function moveMovie(index: number, direction: -1 | 1) {
    if (!client || !active) return;
    const next = [...active.movies];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const orderedIds = renumber(next).map((m) => m.id);
    await reorderPlaylistMoviesDb(client, active.id, orderedIds);
    await loadLibrary();
  }

  function copyShareLink() {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.searchParams.set("list", activeId);
    void navigator.clipboard.writeText(url.toString());
    pushToast("Share link copied");
  }

  async function duplicateActivePlaylist() {
    if (!client || !session?.user || !active) return;
    const copy = await duplicatePlaylistDb(client, session.user.id, active);
    if (!copy) {
      pushToast("Could not duplicate list");
      return;
    }
    await loadLibrary();
    setActiveId(copy.id);
    pushToast("Duplicated list");
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#0f0f0f] px-6 text-center text-white">
        <p className="max-w-md text-sm text-white/80">
          Add{" "}
          <code className="rounded bg-white/10 px-1">NEXT_PUBLIC_SUPABASE_URL</code>{" "}
          and{" "}
          <code className="rounded bg-white/10 px-1">
            NEXT_PUBLIC_SUPABASE_ANON_KEY
          </code>{" "}
          or{" "}
          <code className="rounded bg-white/10 px-1">
            NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
          </code>{" "}
          to <code className="rounded bg-white/10 px-1">.env.local</code>, then
          restart the dev server.
        </p>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-[#0f0f0f] px-6 text-center text-white">
        <p className="max-w-md text-sm text-amber-200/90">{authError}</p>
        <p className="max-w-md text-xs text-white/50">
          In Supabase: Authentication → Providers → enable Anonymous sign-ins,
          then refresh.
        </p>
      </div>
    );
  }

  if (!ready || !session || libraryLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#0f0f0f] text-white">
        <Loader2 className="size-9 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#0f0f0f] pb-6 text-white">
      <div className="mx-auto flex max-w-[1600px] gap-2 p-2">
        <aside className="hidden w-[300px] shrink-0 rounded-xl bg-[#161616] p-3 lg:block">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Clapperboard className="size-4" />
              </div>
              <div>
                <p className="font-heading text-base font-semibold">Moviefy</p>
                <p className="text-xs text-muted-foreground">Your library</p>
              </div>
            </div>
            <Button size="icon-sm" variant="ghost" onClick={() => setNewPlaylistOpen(true)}>
              <Plus className="size-4" />
            </Button>
          </div>

          <div className="mt-3 grid gap-1 px-2">
            <Link
              href="/app"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "justify-start gap-2 text-sm",
                pathname === "/app" && "bg-white/10 text-white",
              )}
            >
              <Home className="size-4" />
              Home
            </Link>
            <Link
              href="/app/explore"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "justify-start gap-2 text-sm",
                pathname?.startsWith("/app/explore") && "bg-white/10 text-white",
              )}
            >
              <Compass className="size-4" />
              Explore
            </Link>
          </div>

          <div className="mt-3 flex flex-wrap gap-1 px-2">
            {(
              [
                { id: "all" as const, label: "All" },
                { id: "collection" as const, label: "Lists" },
                { id: "watched" as const, label: "Watched" },
              ] as const
            ).map((tab) => (
              <Button
                key={tab.id}
                type="button"
                size="xs"
                variant={libraryKindFilter === tab.id ? "secondary" : "ghost"}
                className="h-7 rounded-full px-2.5 text-xs"
                onClick={() => setLibraryKindFilter(tab.id)}
              >
                {tab.id === "watched" ? (
                  <ListOrdered className="mr-1 size-3" />
                ) : null}
                {tab.label}
              </Button>
            ))}
          </div>

          <div className="mt-4 px-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={libraryQuery}
                onChange={(e) => setLibraryQuery(e.target.value)}
                placeholder="Search in your playlists"
                className="border-0 bg-[#212121] pl-8"
              />
            </div>
          </div>

          <ScrollArea className="mt-3 h-[calc(100dvh-240px)] px-1">
            <div className="space-y-1">
              {sidebarPlaylists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setActiveId(p.id);
                    setGenreFilter("all");
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors",
                    p.id === activeId ? "bg-[#2a2a2a]" : "hover:bg-[#212121]",
                  )}
                >
                  <div className="relative h-11 w-11 overflow-hidden rounded-md bg-zinc-800">
                    <PosterImage
                      src={p.movies[0]?.posterImage ?? ""}
                      alt={p.movies[0]?.title ?? "Playlist"}
                      fill
                      placeholderGradient={
                        p.movies[0]?.posterClass ?? "from-zinc-700 to-zinc-900"
                      }
                      className="object-cover"
                      sizes="44px"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.isPublic ? "Public" : "Private"} · {p.movies.length} movies
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </ScrollArea>
        </aside>

        <main className="min-w-0 flex-1 rounded-xl bg-[#151515]">
          <header className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-xl border-b border-white/5 bg-[#151515]/95 px-4 py-3 backdrop-blur">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="relative flex w-full max-w-xl items-center gap-2 rounded-lg border border-white/5 bg-[#222] py-2 pl-9 pr-3 text-left text-sm text-muted-foreground transition hover:border-white/10 hover:bg-[#2a2a2a]"
            >
              <Search className="absolute left-2.5 size-4 text-muted-foreground" />
              <span className="truncate">Search movies, directors, playlists…</span>
              <span className="ml-auto hidden items-center gap-0.5 rounded border border-white/10 bg-black/30 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                <Keyboard className="size-3" />
                K
              </span>
            </button>
            <Link
              href="/app/explore"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "shrink-0 gap-1.5 border-0 bg-white/10 text-white hover:bg-white/15 lg:hidden",
              )}
            >
              <Compass className="size-4" />
              Explore
            </Link>
            <Avatar size="sm">
              <AvatarFallback>
                {(displayName ?? "You").slice(0, 1).toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </header>

          <ScrollArea className="h-[calc(100dvh-66px)]">
            <div className="space-y-8 p-4 pb-10">
              <section className="rounded-xl bg-gradient-to-b from-[#252525] to-[#151515] p-5">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Good evening</p>
                <h1 className="mt-1 font-heading text-3xl font-semibold">
                  {displayName ?? "there"}
                </h1>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="bg-white/10 text-white">
                    {playlists.length} playlists
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 text-white">
                    {pickPool.length} TMDB picks (add-movie pool)
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 text-white">
                    {savedIds.size} saved keys
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 text-white">
                    {active
                      ? `${active.movies.length} in “${active.name}”`
                      : "No list open"}
                  </Badge>
                  <Badge variant="secondary" className="bg-white/10 text-white">
                    {active ? `${activeGenreCount} genres this list` : "—"}
                  </Badge>
                </div>
              </section>

              {recentMovies.length > 0 ? (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="font-heading text-xl">Recently viewed</h2>
                    <span className="text-xs text-muted-foreground">This session</span>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                    {recentMovies.map((movie) => (
                      <button
                        key={movie.id}
                        type="button"
                        onClick={() => selectMovie(movie)}
                        className={cn(
                          "w-[100px] shrink-0 text-left",
                          selectedMovie?.id === movie.id && "opacity-100",
                        )}
                      >
                        <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800 ring-1 ring-white/10">
                          <PosterImage
                            src={movie.posterImage}
                            alt={movie.title}
                            fill
                            placeholderGradient={movie.posterClass}
                            className="object-cover"
                            sizes="100px"
                          />
                        </div>
                        <p className="mt-1.5 line-clamp-2 text-[11px] font-medium leading-tight">
                          {movie.title}
                        </p>
                      </button>
                    ))}
                  </div>
                </section>
              ) : null}

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-xl">Your Playlists</h2>
                  <Button variant="ghost" size="sm" onClick={() => setNewPlaylistOpen(true)}>
                    <Plus className="size-4" />
                    Create
                  </Button>
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {playlists.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setActiveId(p.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg bg-[#1f1f1f] p-2 text-left transition hover:bg-[#292929] hover:shadow-lg hover:shadow-black/20",
                        p.id === activeId && "ring-1 ring-primary/40",
                      )}
                    >
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                        <PosterImage
                          src={p.movies[0]?.posterImage ?? ""}
                          alt={p.movies[0]?.title ?? "Playlist"}
                          fill
                          placeholderGradient={
                            p.movies[0]?.posterClass ?? "from-zinc-700 to-zinc-900"
                          }
                          className="object-cover"
                          sizes="56px"
                        />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{p.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {p.kind === "watched" ? "Watched log" : "Playlist"} · {p.movies.length} titles
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-xl">Discover strip</h2>
                  <span className="text-xs text-muted-foreground">Scroll sideways · snap</span>
                </div>
                <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {browseRail.map((movie) => (
                    <button
                      key={movie.id}
                      type="button"
                      onClick={() => selectMovie(movie)}
                      className={cn(
                        "w-[140px] shrink-0 snap-start text-left transition hover:opacity-95",
                        selectedMovie?.id === movie.id && "ring-2 ring-primary/50 ring-offset-2 ring-offset-[#151515]",
                      )}
                    >
                      <div className="relative aspect-[2/3] overflow-hidden rounded-lg bg-zinc-800">
                        <PosterImage
                          src={movie.posterImage}
                          alt={movie.title}
                          fill
                          placeholderGradient={movie.posterClass}
                          className="object-cover"
                          sizes="140px"
                        />
                      </div>
                      <p className="mt-2 line-clamp-2 text-xs font-medium leading-tight">{movie.title}</p>
                    </button>
                  ))}
                </div>
              </section>

              <TmdbDiscoverSection
                selectedMovieId={selectedMovie?.id ?? null}
                onSelectMovie={selectMovie}
              />

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-xl">Explore by genre</h2>
                  <Sparkles className="size-4 text-primary" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {exploreRows.map((movie) => (
                    <button
                      key={movie.id}
                      type="button"
                      onClick={() => selectMovie(movie)}
                      className={cn(
                        "group relative min-h-[220px] overflow-hidden rounded-lg text-left outline-none transition hover:ring-2 hover:ring-primary/30 focus-visible:ring-2 focus-visible:ring-primary",
                        selectedMovie?.id === movie.id && "ring-2 ring-primary/50",
                      )}
                    >
                      <PosterImage
                        src={movie.posterImage}
                        alt={movie.title}
                        fill
                        placeholderGradient={movie.posterClass}
                        className="object-cover object-center transition duration-500 group-hover:scale-[1.03]"
                        sizes="(max-width: 1280px) 50vw, 33vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-black/10" />
                      <div className="relative z-10 flex h-full min-h-[220px] flex-col justify-end p-4">
                        <p className="text-sm font-semibold text-white/90">{movie.genre}</p>
                        <p className="mt-1 text-lg font-semibold leading-snug">{movie.title}</p>
                        <p className="text-xs text-white/70">{movie.director}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>

              <section>
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="font-heading text-xl">Trending right now</h2>
                  <TrendingUp className="size-4 text-primary" />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {recommendations.map((movie) => (
                    <button
                      key={movie.id}
                      type="button"
                      onClick={() => selectMovie(movie)}
                      className={cn(
                        "rounded-lg bg-[#1f1f1f] p-3 text-left transition hover:bg-[#262626] hover:shadow-md hover:shadow-black/30",
                        selectedMovie?.id === movie.id && "ring-1 ring-primary/40",
                      )}
                    >
                      <div className="relative h-32 overflow-hidden rounded-md bg-zinc-800">
                        <PosterImage
                          src={movie.posterImage}
                          alt={movie.title}
                          fill
                          placeholderGradient={movie.posterClass}
                          className="object-cover transition duration-300 hover:scale-105"
                          sizes="(max-width: 1024px) 50vw, 25vw"
                        />
                      </div>
                      <p className="mt-2 truncate text-sm font-medium">{movie.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {movie.year} · {movie.genre}
                      </p>
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-xl bg-[#1a1a1a] p-4">
                {!active ? (
                  <div className="py-8 text-center">
                    <p className="text-sm text-muted-foreground">
                      Create a playlist to start ranking films. Everything syncs to Supabase.
                    </p>
                    <Button
                      className="mt-4"
                      onClick={() => setNewPlaylistOpen(true)}
                    >
                      <Plus className="size-4" />
                      New playlist
                    </Button>
                  </div>
                ) : null}
                {active ? (
                <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="font-heading text-xl">{active.name}</h2>
                      <Badge variant="secondary" className="bg-white/10 text-white">
                        {active.kind === "watched" ? "Watched log" : "Playlist"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{active.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-md bg-[#252525] px-2 py-1.5">
                      <Switch
                        id="public"
                        checked={active.isPublic}
                        onCheckedChange={async (checked) => {
                          if (!client) return;
                          await updatePlaylistMeta(client, active.id, {
                            is_public: checked,
                          });
                          await loadLibrary();
                        }}
                      />
                      <Label htmlFor="public" className="text-xs">
                        {active.isPublic ? (
                          <span className="flex items-center gap-1">
                            <Globe className="size-3.5" />
                            Public
                          </span>
                        ) : (
                          <span className="flex items-center gap-1">
                            <Lock className="size-3.5" />
                            Private
                          </span>
                        )}
                      </Label>
                    </div>
                    <Select
                      value={listSort}
                      onValueChange={(v) => setListSort((v ?? "rank") as ListSort)}
                    >
                      <SelectTrigger className="h-8 w-[140px] border-white/10 bg-[#252525] text-xs">
                        <SelectValue placeholder="Sort" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="rank">Your order</SelectItem>
                        <SelectItem value="year">Year (newest)</SelectItem>
                        <SelectItem value="title">Title A–Z</SelectItem>
                        <SelectItem value="genre">Genre</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hidden gap-1 text-white/80 sm:inline-flex"
                      onClick={copyShareLink}
                    >
                      <Link2 className="size-4" />
                      Share
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hidden gap-1 text-white/80 sm:inline-flex"
                      onClick={duplicateActivePlaylist}
                    >
                      <SquareStack className="size-4" />
                      Duplicate
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setAddMovieOpen(true)}>
                      <Plus className="size-4" />
                      Add movie
                    </Button>
                  </div>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  <GenrePill
                    genre="all"
                    active={genreFilter === "all"}
                    onClick={() => setGenreFilter("all")}
                  />
                  {playlistGenres.map((g) => (
                    <GenrePill
                      key={g}
                      genre={g}
                      active={genreFilter === g}
                      onClick={() => setGenreFilter(g)}
                    />
                  ))}
                </div>

                <div className="space-y-2">
                  {filteredMovies.map((movie) => {
                    const index = active.movies.findIndex((m) => m.id === movie.id);
                    return (
                      <div
                        key={movie.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectMovie(movie)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            selectMovie(movie);
                          }
                        }}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 rounded-md bg-[#242424] p-2.5 transition hover:bg-[#2c2c2c]",
                          selectedMovie?.id === movie.id && "ring-1 ring-primary/50",
                        )}
                      >
                        <div className="w-5 text-right text-sm tabular-nums text-muted-foreground">
                          {movie.rank}
                        </div>
                        <div className="relative h-12 w-10 shrink-0 overflow-hidden rounded-sm bg-zinc-800">
                          <PosterImage
                            src={movie.posterImage}
                            alt={movie.title}
                            fill
                            placeholderGradient={movie.posterClass}
                            className="object-cover"
                            sizes="40px"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{movie.title}</p>
                          <p className="truncate text-xs text-muted-foreground">
                            {movie.year} · {movie.director}
                          </p>
                        </div>
                        <Badge variant="outline" className="hidden border-white/15 sm:inline-flex">
                          {movie.genre}
                        </Badge>
                        <div className="flex shrink-0 gap-0.5" onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={index <= 0}
                            onClick={() => moveMovie(index, -1)}
                            aria-label="Move up"
                          >
                            <ChevronUp className="size-4" />
                          </Button>
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            disabled={index >= active.movies.length - 1}
                            onClick={() => moveMovie(index, 1)}
                            aria-label="Move down"
                          >
                            <ChevronDown className="size-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
                ) : null}
              </section>
            </div>
          </ScrollArea>
        </main>
      </div>

      <MovieDetailDialog
        movie={selectedMovie}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        inActiveList={inActiveList}
        saved={
          selectedMovie
            ? savedIds.has(selectedMovie.id) ||
              (selectedMovie.tmdbId != null &&
                savedIds.has(`tmdb-${selectedMovie.tmdbId}`))
            : false
        }
        onToggleSave={async () => {
          if (!client || !session?.user || !selectedMovie) return;
          const was =
            savedIds.has(selectedMovie.id) ||
            (selectedMovie.tmdbId != null &&
              savedIds.has(`tmdb-${selectedMovie.tmdbId}`));
          const ok = await setMovieSavedDb(
            client,
            session.user.id,
            selectedMovie,
            !was,
          );
          if (!ok) {
            pushToast("Could not update saved");
            return;
          }
          await loadLibrary();
          pushToast(was ? "Removed from saved" : "Saved for later");
        }}
        onAddToList={() => {
          if (!selectedMovie) return;
          addMovieToActive(selectedMovie);
        }}
      />

      {toast && (
        <div
          className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900 px-4 py-2 text-sm text-white shadow-lg"
          role="status"
        >
          {toast}
        </div>
      )}

      <Dialog
        open={searchOpen}
        onOpenChange={(o) => {
          setSearchOpen(o);
          if (!o) setSearchQ("");
        }}
      >
        <DialogContent className="border-white/10 bg-[#1a1a1a] text-white sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Search</DialogTitle>
            <DialogDescription>
              Find a title or jump to a playlist. Shortcut: ⌘K / Ctrl+K
            </DialogDescription>
          </DialogHeader>
          <Input
            autoFocus
            value={searchQ}
            onChange={(e) => setSearchQ(e.target.value)}
            placeholder="Type to filter…"
            className="border-white/10 bg-[#252525]"
          />
          <ScrollArea className="max-h-72">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Movies
            </p>
            <ul className="space-y-1">
              {searchResults.movies.map((m) => (
                <li key={m.id}>
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-md px-2 py-2 text-left hover:bg-white/5"
                    onClick={() => {
                      selectMovie(m);
                      setSearchOpen(false);
                      setSearchQ("");
                    }}
                  >
                    <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded bg-zinc-800">
                      <PosterImage
                        src={m.posterImage}
                        alt={m.title}
                        fill
                        placeholderGradient={m.posterClass}
                        className="object-cover"
                        sizes="28px"
                      />
                    </div>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{m.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {m.year} · {m.genre}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mb-2 mt-4 text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Playlists
            </p>
            <ul className="space-y-1 pb-2">
              {searchResults.lists.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    className="w-full rounded-md px-2 py-2 text-left text-sm hover:bg-white/5"
                    onClick={() => {
                      setActiveId(p.id);
                      setGenreFilter("all");
                      setSearchOpen(false);
                      setSearchQ("");
                      pushToast(`Opened “${p.name}”`);
                    }}
                  >
                    {p.name}
                    <span className="ml-2 text-xs text-muted-foreground">
                      {p.movies.length} titles
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      <Dialog open={newPlaylistOpen} onOpenChange={setNewPlaylistOpen}>
        <DialogContent className="border-border/80 bg-[#1e1e1e] text-white">
          <DialogHeader>
            <DialogTitle>Create playlist</DialogTitle>
            <DialogDescription>Start a list for moods, genres, or yearly logs.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div className="grid gap-1.5">
              <Label htmlFor="new-name">Name</Label>
              <Input
                id="new-name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="Weekend classics"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="new-desc">Description</Label>
              <Input
                id="new-desc"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="A short line about this list"
              />
            </div>
            <div className="grid gap-1.5">
              <Label>Type</Label>
              <Select
                value={newKind}
                onValueChange={(v) => setNewKind((v ?? "collection") as Playlist["kind"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collection">Playlist</SelectItem>
                  <SelectItem value="watched">Watched log</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewPlaylistOpen(false)}>
              Cancel
            </Button>
            <Button onClick={createPlaylist}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={addMovieOpen} onOpenChange={setAddMovieOpen}>
        <DialogContent className="border-border/80 bg-[#1e1e1e] text-white">
          <DialogHeader>
            <DialogTitle>Add movie</DialogTitle>
            <DialogDescription>
              Pick from the current TMDB discover pool (same source as the home rails).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2 py-2">
            <Label>Movie</Label>
            <Select value={movieToAdd} onValueChange={(v) => setMovieToAdd(v ?? "")}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a movie..." />
              </SelectTrigger>
              <SelectContent>
                {catalogForAdd.map((movie) => (
                  <SelectItem key={movie.id} value={movie.id}>
                    {movie.title} ({movie.year})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button onClick={addMovieFromCatalog} disabled={!movieToAdd}>
              Add to list
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
