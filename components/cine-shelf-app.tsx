"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PosterImage } from "@/components/poster-image";
import {
  CalendarDays,
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
  LogOut,
  Settings,
  SquareStack,
  Lock,
  Plus,
  Search,
  Trash2,
  MoreVertical,
  X,
} from "lucide-react";
import { useSupabaseApp } from "@/components/supabase-app-provider";
import { movieFromTmdbDiscoverItem } from "@/lib/tmdb-genre-map";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  addMovieToPlaylistDb,
  createPlaylist as createPlaylistDb,
  deletePlaylistDb,
  duplicatePlaylistDb,
  fetchProfileDisplayName,
  fetchSavedMovieKeys,
  fetchSavedMoviesForUser,
  fetchUserPlaylists,
  getOrCreatePrimaryWatchedPlaylist,
  movieMatchesInPlaylistRow,
  removeMovieFromPlaylistDb,
  reorderPlaylistMoviesDb,
  setMovieSavedDb,
  updatePlaylistMeta,
} from "@/lib/supabase/playlist-service";
import { avatarLetter, greetingFirstName } from "@/lib/display-name";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { prefetchMovieEnrich } from "@/lib/movie-enrich-prefetch";
import { movieToDetailPageHref } from "@/lib/movie-detail-nav";
import { discoverItemFromSuggestMovie } from "@/lib/search-suggest-mappers";
import type {
  SearchSuggestMovieRow,
  SearchSuggestResponse,
} from "@/lib/search-suggest-types";
import { useDebouncedValue } from "@/lib/use-debounced-value";
import { MovieDetailDialog } from "@/components/movie-detail-dialog";
import { SearchSuggestDropdown } from "@/components/search-suggest-dropdown";

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
  const router = useRouter();
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
  const [savedMovies, setSavedMovies] = useState<Movie[]>([]);
  const [libraryNav, setLibraryNav] = useState<"playlists" | "saved">(
    "playlists",
  );
  const [pickListOpen, setPickListOpen] = useState(false);
  const [pickListMovie, setPickListMovie] = useState<Movie | null>(null);
  const [moviePendingForNewList, setMoviePendingForNewList] =
    useState<Movie | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQ, setSearchQ] = useState("");
  const debouncedSearchQ = useDebouncedValue(searchQ, 300);
  const [suggestData, setSuggestData] = useState<SearchSuggestResponse | null>(
    null,
  );
  const [suggestLoading, setSuggestLoading] = useState(false);
  const searchDialogWrapRef = useRef<HTMLDivElement>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [libraryKindFilter, setLibraryKindFilter] =
    useState<LibraryKindFilter>("all");
  const [recentMovieIds, setRecentMovieIds] = useState<string[]>([]);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pickPool, setPickPool] = useState<Movie[]>([]);
  const [libraryLoading, setLibraryLoading] = useState(true);
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [watchedDialogBusy, setWatchedDialogBusy] = useState(false);
  const [deletePlaylistOpen, setDeletePlaylistOpen] = useState(false);

  const loadLibrary = useCallback(async () => {
    if (!client || !session?.user) return;
    setLibraryLoading(true);
    try {
      const uid = session.user.id;
      const [pl, saved, name, savedList] = await Promise.all([
        fetchUserPlaylists(client, uid),
        fetchSavedMovieKeys(client, uid),
        fetchProfileDisplayName(client, uid),
        fetchSavedMoviesForUser(client, uid),
      ]);
      setPlaylists(pl);
      setSavedIds(saved);
      setDisplayName(name);
      setSavedMovies(savedList);
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

  const primaryWatchedPlaylist = useMemo(
    () => playlists.find((p) => p.kind === "watched"),
    [playlists],
  );

  const selectedInWatched = useMemo(() => {
    if (!selectedMovie || !primaryWatchedPlaylist) return false;
    return primaryWatchedPlaylist.movies.some((m) =>
      movieMatchesInPlaylistRow(m, selectedMovie),
    );
  }, [selectedMovie, primaryWatchedPlaylist]);

  const toggleDetailWatched = useCallback(async () => {
    if (!client || !session?.user || !selectedMovie) return;
    setWatchedDialogBusy(true);
    try {
      const pl = await getOrCreatePrimaryWatchedPlaylist(client, session.user.id);
      if (!pl) {
        pushToast("Could not open Watched list");
        return;
      }
      if (selectedInWatched) {
        const ok = await removeMovieFromPlaylistDb(client, pl.id, selectedMovie);
        if (!ok) pushToast("Could not remove from Watched");
        else pushToast("Removed from Watched");
      } else {
        const ok = await addMovieToPlaylistDb(client, pl.id, selectedMovie);
        if (!ok) pushToast("Could not add to Watched");
        else pushToast("Added to Watched");
      }
      await loadLibrary();
    } finally {
      setWatchedDialogBusy(false);
    }
  }, [client, session?.user, selectedMovie, selectedInWatched, loadLibrary]);

  function selectMovie(movie: Movie) {
    setSelectedMovie(movie);
    const href = movieToDetailPageHref(movie);
    if (href) {
      setDetailOpen(false);
      void (async () => {
        await prefetchMovieEnrich(movie);
        router.push(href);
      })();
    } else {
      setDetailOpen(true);
    }
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

  /** Titles in your lists + saved — Home search stays in your library only (no TMDB pool). */
  const allKnownMovies = useMemo(() => {
    const m = new Map<string, Movie>();
    for (const p of playlists) {
      for (const mv of p.movies) m.set(mv.id, mv);
    }
    for (const mv of savedMovies) m.set(mv.id, mv);
    return m;
  }, [playlists, savedMovies]);

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

  useEffect(() => {
    if (!searchOpen) {
      setSuggestData(null);
      setSuggestLoading(false);
      return;
    }
    const q = debouncedSearchQ.trim();
    if (!q) {
      setSuggestData(null);
      setSuggestLoading(false);
      return;
    }
    const ctrl = new AbortController();
    setSuggestLoading(true);
    setSuggestData(null);
    void fetch(`/api/search/suggest?q=${encodeURIComponent(q)}`, {
      signal: ctrl.signal,
    })
      .then((r) => r.json() as Promise<SearchSuggestResponse>)
      .then((d) => {
        if (!ctrl.signal.aborted) setSuggestData(d);
      })
      .catch(() => {
        if (!ctrl.signal.aborted) setSuggestData(null);
      })
      .finally(() => {
        if (!ctrl.signal.aborted) setSuggestLoading(false);
      });
    return () => ctrl.abort();
  }, [debouncedSearchQ, searchOpen]);

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
    const pending = moviePendingForNewList;
    if (pending) {
      const added = await addMovieToPlaylistDb(client, pl.id, pending);
      pushToast(
        added
          ? `Playlist created — added “${pending.title}”`
          : "Playlist created — we couldn’t add that title automatically.",
      );
      setMoviePendingForNewList(null);
    } else {
      pushToast("Playlist created");
    }
    setNewName("");
    setNewDesc("");
    setNewPlaylistOpen(false);
    await loadLibrary();
    setActiveId(pl.id);
    setLibraryNav("playlists");
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

  async function deleteActivePlaylist() {
    if (!client || !session?.user || !active) return;
    const ok = await deletePlaylistDb(client, session.user.id, active.id);
    if (!ok) {
      pushToast("Could not delete playlist");
      return;
    }
    setDeletePlaylistOpen(false);
    await loadLibrary();
    pushToast("Playlist deleted");
  }

  async function removeMovieFromActiveList(movie: Movie) {
    if (!client || !active) return;
    const ok = await removeMovieFromPlaylistDb(client, active.id, movie);
    if (!ok) {
      pushToast("Could not remove from list");
      return;
    }
    await loadLibrary();
    pushToast(`Removed “${movie.title}”`);
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-black/35 px-6 text-center text-white backdrop-blur-md">
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
      <div className="flex min-h-dvh flex-col items-center justify-center gap-3 bg-black/35 px-6 text-center text-white backdrop-blur-md">
        <p className="max-w-md text-sm text-amber-200/90">{authError}</p>
        <p className="max-w-md text-xs text-white/50">
          Check your Supabase URL and anon key, then refresh.
        </p>
      </div>
    );
  }

  if (!ready || !session || libraryLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-black/35 text-white backdrop-blur-md">
        <Loader2 className="size-9 animate-spin text-primary" aria-hidden />
      </div>
    );
  }

  return (
    <div className="min-h-dvh pb-[max(1.5rem,env(safe-area-inset-bottom))] text-foreground">
      <div className="mx-auto flex max-w-[1600px] gap-2 p-2 pt-[max(0.25rem,env(safe-area-inset-top,0px))]">
        <aside className="hidden w-[300px] shrink-0 rounded-xl bg-card p-3 lg:block">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Clapperboard className="size-4" />
              </div>
              <div>
                <p className="font-heading text-base font-semibold">Moviefy</p>
                <p className="text-xs text-muted-foreground">Home &amp; lists</p>
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
                pathname === "/app" &&
                  libraryNav === "playlists" &&
                  "bg-muted/70 text-foreground",
              )}
              onClick={() => setLibraryNav("playlists")}
            >
              <Home className="size-4" />
              Your theatre
            </Link>
            <Link
              href="/app/explore"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "justify-start gap-2 text-sm",
                pathname?.startsWith("/app/explore") && "bg-muted/70 text-foreground",
              )}
            >
              <Compass className="size-4" />
              Explore
            </Link>
            <Link
              href="/app/releases"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "justify-start gap-2 text-sm",
                pathname?.startsWith("/app/releases") && "bg-muted/70 text-foreground",
              )}
            >
              <CalendarDays className="size-4" />
              Release radar
            </Link>
            <button
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "w-full justify-start gap-2 text-sm",
                libraryNav === "saved" && "bg-muted/70 text-foreground",
              )}
              onClick={() => {
                setLibraryNav("saved");
                void loadLibrary();
              }}
            >
              <Heart className="size-4" />
              Saved
            </button>
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
                placeholder="Search library & open ⌘K for everything…"
                className="border-0 bg-[#212121] pl-8"
              />
            </div>
          </div>

          <ScrollArea className="mt-3 h-[calc(100dvh_-_240px_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] min-h-[12rem] px-1">
            <div className="space-y-1">
              {sidebarPlaylists.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setLibraryNav("playlists");
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

        <main className="min-w-0 flex-1 rounded-xl bg-card">
          <header className="sticky top-0 z-10 flex flex-nowrap items-center gap-2 overflow-x-auto overscroll-x-contain rounded-t-xl border-b border-border/50 bg-card/95 px-2 py-2.5 backdrop-blur [-ms-overflow-style:none] [scrollbar-width:none] sm:flex-wrap sm:overflow-visible sm:gap-3 sm:px-4 sm:py-3 [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="relative order-1 flex min-h-11 min-w-0 flex-1 basis-[min(100%,18rem)] items-center gap-2 rounded-lg border border-border/50 bg-muted/40 py-2 pl-9 pr-3 text-left text-sm text-muted-foreground transition hover:border-border hover:bg-muted/55 sm:max-w-xl"
            >
              <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <span className="truncate">Search movies, people, genres & library…</span>
              <span className="ml-auto hidden shrink-0 items-center gap-0.5 rounded border border-border/60 bg-background/40 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
                <Keyboard className="size-3" />
                K
              </span>
            </button>
            <div className="order-2 flex shrink-0 items-center gap-1 sm:order-3 sm:gap-2">
              <Link
                href="/app"
                aria-label="Your theatre"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "gap-1.5 border-0 bg-muted/50 text-foreground hover:bg-muted/70 lg:hidden",
                  libraryNav === "playlists" && "ring-1 ring-border/80",
                )}
                onClick={() => setLibraryNav("playlists")}
              >
                <Home className="size-4" />
                <span className="hidden sm:inline">Your theatre</span>
              </Link>
              <button
                type="button"
                aria-label="Saved movies"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "gap-1.5 border-0 bg-muted/50 text-foreground hover:bg-muted/70 lg:hidden",
                  libraryNav === "saved" && "ring-1 ring-primary/50",
                )}
                onClick={() => {
                  setLibraryNav("saved");
                  void loadLibrary();
                }}
              >
                <Heart className="size-4" />
                <span className="hidden sm:inline">Saved</span>
              </button>
              <Link
                href="/app/explore"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "gap-1.5 border-0 bg-muted/50 text-foreground hover:bg-muted/70 lg:hidden",
                )}
              >
                <Compass className="size-4" />
                Explore
              </Link>
              <Link
                href="/app/releases"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "gap-1.5 border-0 bg-muted/50 text-foreground hover:bg-muted/70 lg:hidden",
                )}
              >
                <CalendarDays className="size-4" />
                <span className="hidden sm:inline">Radar</span>
              </Link>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Sign out"
                className="gap-1.5 text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                onClick={() => {
                  void client?.auth.signOut().then(() => {
                    router.push("/?auth=sign-in");
                    router.refresh();
                  });
                }}
              >
                <LogOut className="size-4 shrink-0" />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger
                  aria-label="Account menu"
                  className={cn(
                    buttonVariants({ variant: "ghost", size: "icon-sm" }),
                    "rounded-full text-foreground hover:bg-muted/50",
                  )}
                >
                  <Avatar size="sm">
                    <AvatarFallback>
                      {avatarLetter(displayName, session)}
                    </AvatarFallback>
                  </Avatar>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  sideOffset={8}
                  className="min-w-48 border-border/60 bg-popover text-popover-foreground"
                >
                  <DropdownMenuLabel className="text-muted-foreground">
                    Account
                  </DropdownMenuLabel>
                  <DropdownMenuItem
                    disabled
                    className="text-muted-foreground focus:bg-muted/50 focus:text-foreground"
                  >
                    <Settings className="size-4 opacity-60" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border/60" />
                  <DropdownMenuItem
                    variant="destructive"
                    className="focus:bg-red-950/50"
                    onClick={() => {
                      void client?.auth.signOut().then(() => {
                        router.push("/?auth=sign-in");
                        router.refresh();
                      });
                    }}
                  >
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <ScrollArea
            key={libraryNav}
            className="h-[calc(100dvh_-_4.125rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom))] min-h-[50dvh]"
          >
            <div className="space-y-10 p-3 pb-[max(2.5rem,calc(1.5rem+env(safe-area-inset-bottom)))] sm:p-5 sm:pb-10">
              {libraryNav === "saved" ? (
                <section className="rounded-xl border border-border/60 bg-card/90 p-5 shadow-[var(--app-shadow-card)]">
                  <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="type-section-title">Saved for later</h2>
                      <p className="text-sm text-muted-foreground">
                        Titles you saved from movie details.
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setLibraryNav("playlists")}
                    >
                      Playlists
                    </Button>
                  </div>
                  {savedMovies.length === 0 ? (
                    <div className="py-8 text-center text-sm text-muted-foreground">
                      Nothing saved yet. Open a film and tap{" "}
                      <Heart className="mx-0.5 inline size-3.5 align-text-bottom text-primary" />{" "}
                      Save.
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                      {savedMovies.map((movie) => (
                        <button
                          key={movie.id}
                          type="button"
                          onClick={() => selectMovie(movie)}
                          className={cn(
                            "rounded-lg border border-transparent bg-muted/35 p-2 text-left transition hover:border-border/50 hover:bg-muted/50",
                            selectedMovie?.id === movie.id && "ring-1 ring-primary/50",
                          )}
                        >
                          <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-zinc-800">
                            <PosterImage
                              src={movie.posterImage}
                              alt={movie.title}
                              fill
                              placeholderGradient={movie.posterClass}
                              className="object-cover"
                              sizes="160px"
                            />
                          </div>
                          <p className="mt-2 line-clamp-2 text-xs font-medium">{movie.title}</p>
                          <p className="text-[11px] text-muted-foreground">
                            {movie.year} · {movie.genre}
                          </p>
                        </button>
                      ))}
                    </div>
                  )}
                </section>
              ) : (
              <>
              <section className="rounded-xl border border-border/60 bg-gradient-to-b from-card via-card/95 to-muted/25 p-5 shadow-[var(--app-shadow-card)] sm:p-6">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Welcome back
                </p>
                <h1 className="type-hero mt-1">
                  {greetingFirstName(displayName, session)}
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
                  This space is only your playlists and saved films. Trending, genres, meme
                  picks, and community lists live on{" "}
                  <Link
                    href="/app/explore"
                    className="font-medium text-primary underline-offset-4 hover:underline"
                  >
                    Explore
                  </Link>
                  .
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="border-border/50 bg-muted/50 text-foreground">
                    {playlists.length} playlists
                  </Badge>
                  <Badge variant="secondary" className="border-border/50 bg-muted/50 text-foreground">
                    {savedIds.size} saved
                  </Badge>
                  <Badge variant="secondary" className="border-border/50 bg-muted/50 text-foreground">
                    {active
                      ? `${active.movies.length} in “${active.name}”`
                      : "No list open"}
                  </Badge>
                  <Badge variant="secondary" className="border-border/50 bg-muted/50 text-foreground">
                    {active ? `${activeGenreCount} genres this list` : "—"}
                  </Badge>
                </div>
              </section>

              {recentMovies.length > 0 ? (
                <section>
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="type-section-title">Recently viewed</h2>
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
                  <h2 className="type-section-title">Your Playlists</h2>
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
                      onClick={() => {
                        setLibraryNav("playlists");
                        setActiveId(p.id);
                      }}
                      className={cn(
                        "flex items-center gap-3 rounded-lg border border-transparent bg-muted/35 p-2 text-left transition hover:border-border/50 hover:bg-muted/50 hover:shadow-[var(--app-shadow-card)]",
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

              <section className="rounded-xl border border-border/60 bg-card/90 p-5 shadow-[var(--app-shadow-card)]">
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
                      <h2 className="type-section-title">{active.name}</h2>
                      <Badge variant="secondary" className="border-border/50 bg-muted/50 text-foreground">
                        {active.kind === "watched" ? "Watched log" : "Playlist"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{active.description}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2 rounded-md border border-border/50 bg-muted/40 px-2 py-1.5">
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
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        className={cn(
                          buttonVariants({ size: "sm", variant: "ghost" }),
                          "gap-1 text-white/80",
                        )}
                        aria-label="Playlist menu"
                      >
                        <MoreVertical className="size-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setDeletePlaylistOpen(true)}
                        >
                          <Trash2 className="size-4" />
                          Delete playlist…
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
                          <Button
                            size="icon-sm"
                            variant="ghost"
                            className="text-rose-300/90 hover:text-rose-200"
                            aria-label={`Remove ${movie.title} from list`}
                            onClick={() => void removeMovieFromActiveList(movie)}
                          >
                            <Trash2 className="size-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </>
                ) : null}
              </section>
              </>
              )}
            </div>
          </ScrollArea>
        </main>
      </div>

      <Dialog open={deletePlaylistOpen} onOpenChange={setDeletePlaylistOpen}>
        <DialogContent className="border-border/80 bg-card text-foreground sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete this playlist?</DialogTitle>
            <DialogDescription>
              {active
                ? `“${active.name}” and its order will be removed. This cannot be undone.`
                : "This list will be removed. This cannot be undone."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeletePlaylistOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void deleteActivePlaylist()}
            >
              Delete playlist
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MovieDetailDialog
        movie={selectedMovie}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        supabase={client}
        userId={session?.user?.id ?? null}
        viewerDisplayName={
          displayName?.trim() ||
          session?.user?.email?.split("@")[0] ||
          null
        }
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
          const [keys, list] = await Promise.all([
            fetchSavedMovieKeys(client, session.user.id),
            fetchSavedMoviesForUser(client, session.user.id),
          ]);
          setSavedIds(keys);
          setSavedMovies(list);
          pushToast(was ? "Removed from saved" : "Saved for later");
        }}
        onAddToList={() => {
          if (!selectedMovie) return;
          setPickListMovie(selectedMovie);
          setPickListOpen(true);
        }}
        watched={selectedInWatched}
        onToggleWatched={session?.user ? toggleDetailWatched : undefined}
        watchedBusy={watchedDialogBusy}
      />

      <Dialog
        open={pickListOpen}
        onOpenChange={(o) => {
          setPickListOpen(o);
          if (!o) setPickListMovie(null);
        }}
      >
        <DialogContent className="border-border/80 bg-[#1e1e1e] text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add to playlist</DialogTitle>
            <DialogDescription>
              {pickListMovie
                ? `Choose a list for “${pickListMovie.title}”, or create a new one.`
                : "Choose a list for this title."}
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-72">
            {playlists.length === 0 ? (
              <div className="space-y-3 py-2">
                <p className="text-sm text-muted-foreground">
                  You do not have a playlist yet. Create one, then we will add this title.
                </p>
                <Button
                  className="w-full"
                  onClick={() => {
                    setMoviePendingForNewList(pickListMovie);
                    setPickListOpen(false);
                    setPickListMovie(null);
                    setNewPlaylistOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Create playlist
                </Button>
              </div>
            ) : (
              <ul className="space-y-1 py-1">
                {playlists.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      className="flex w-full items-center gap-3 rounded-md px-2 py-2.5 text-left text-sm hover:bg-white/5"
                      onClick={() => {
                        if (!client || !pickListMovie) return;
                        void (async () => {
                          const ok = await addMovieToPlaylistDb(
                            client,
                            p.id,
                            pickListMovie,
                          );
                          if (!ok) {
                            pushToast("Could not add to that list");
                            return;
                          }
                          setPickListOpen(false);
                          setPickListMovie(null);
                          await loadLibrary();
                          setLibraryNav("playlists");
                          setActiveId(p.id);
                          pushToast(`Added to “${p.name}”`);
                        })();
                      }}
                    >
                      <div className="relative h-10 w-7 shrink-0 overflow-hidden rounded bg-zinc-800">
                        <PosterImage
                          src={p.movies[0]?.posterImage ?? ""}
                          alt=""
                          fill
                          placeholderGradient={
                            p.movies[0]?.posterClass ?? "from-zinc-700 to-zinc-900"
                          }
                          className="object-cover"
                          sizes="28px"
                        />
                      </div>
                      <span className="min-w-0 flex-1 truncate font-medium">{p.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {p.movies.length} titles
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </ScrollArea>
          {playlists.length > 0 ? (
            <DialogFooter className="flex-col gap-2 sm:flex-col">
              <Button
                variant="outline"
                className="w-full border-white/15"
                onClick={() => {
                  setMoviePendingForNewList(pickListMovie);
                  setPickListOpen(false);
                  setPickListMovie(null);
                  setNewPlaylistOpen(true);
                }}
              >
                <Plus className="size-4" />
                Create new playlist
              </Button>
            </DialogFooter>
          ) : null}
        </DialogContent>
      </Dialog>

      {toast && (
        <div
          className="fixed left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border border-white/10 bg-zinc-900 px-4 py-2.5 text-center text-sm text-white shadow-lg [bottom:max(1.25rem,calc(0.75rem+env(safe-area-inset-bottom)))]"
          role="status"
        >
          {toast}
        </div>
      )}

      <Dialog
        open={searchOpen}
        onOpenChange={(o) => {
          setSearchOpen(o);
          if (!o) {
            setSearchQ("");
            setSuggestData(null);
          }
        }}
      >
        <DialogContent className="overflow-visible border-white/10 bg-[#1a1a1a] text-white sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Search everything</DialogTitle>
            <DialogDescription>
              Movies and actors from TMDB, genre shortcuts, your saved titles and
              playlists — then Explore for full discovery. Shortcut: ⌘K / Ctrl+K
            </DialogDescription>
          </DialogHeader>
          <div ref={searchDialogWrapRef} className="relative z-10 overflow-visible">
            <Input
              autoFocus
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="Try a title, actor, genre, or playlist…"
              className="border-white/10 bg-[#252525] pr-10"
              aria-autocomplete="list"
              aria-expanded={Boolean(searchQ.trim())}
            />
            {searchQ.trim() ? (
              <button
                type="button"
                aria-label="Clear search"
                className="absolute right-2 top-1/2 z-[1] -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-white/10 hover:text-white"
                onClick={() => {
                  setSearchQ("");
                  setSuggestData(null);
                }}
              >
                <X className="size-4" />
              </button>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              Suggestions update as you type. Top pick first, then your library, TMDB
              matches, and genres.
            </p>
            <div className="relative mt-2 min-h-[11rem] overflow-visible pb-1">
              <SearchSuggestDropdown
                open={Boolean(searchQ.trim())}
                variant="library"
                query={searchQ}
                loading={suggestLoading}
                data={suggestData}
                libraryMovieHits={searchResults.movies.map((m) => ({
                  key: m.id,
                  title: m.title,
                  subtitle: `${m.year} · ${m.genre} · Your library`,
                  posterImage: m.posterImage,
                  posterClass: m.posterClass,
                  onPick: () => {
                    selectMovie(m);
                    setSearchOpen(false);
                    setSearchQ("");
                    setSuggestData(null);
                  },
                }))}
                playlistHits={searchResults.lists.map((p) => ({
                  id: p.id,
                  name: p.name,
                  hint: `${p.movies.length} titles`,
                  onPick: () => {
                    setLibraryNav("playlists");
                    setActiveId(p.id);
                    setGenreFilter("all");
                    setSearchOpen(false);
                    setSearchQ("");
                    setSuggestData(null);
                    pushToast(`Opened “${p.name}”`);
                  },
                }))}
                onPickMovie={(row: SearchSuggestMovieRow) => {
                  const item = discoverItemFromSuggestMovie(row);
                  selectMovie(movieFromTmdbDiscoverItem(item));
                  setSearchOpen(false);
                  setSearchQ("");
                  setSuggestData(null);
                }}
                onPickPerson={(id, name) => {
                  setSearchOpen(false);
                  setSearchQ("");
                  setSuggestData(null);
                  router.push(
                    `/app/explore?personId=${id}&personName=${encodeURIComponent(name)}`,
                  );
                }}
                onPickGenre={(g) => {
                  setSearchOpen(false);
                  setSearchQ("");
                  setSuggestData(null);
                  router.push(`/app/explore?genre=${encodeURIComponent(g)}`);
                }}
                onPickPlaylist={(hit) => hit.onPick()}
              />
            </div>
          </div>
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
              Quick picks from a TMDB pool (for adding to your list). Browse the full
              catalog on Explore.
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
