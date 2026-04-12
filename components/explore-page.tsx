"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clapperboard,
  Compass,
  Globe,
  Heart,
  Laugh,
  Loader2,
  LogOut,
  Megaphone,
  Plus,
  Search,
  UserPlus,
} from "lucide-react";
import { PosterImage } from "@/components/poster-image";
import { ExploreStreamingRails } from "@/components/explore-streaming-rails";
import { ExploreTop10Sidebar } from "@/components/explore-top-10-sidebar";
import { TmdbDiscoverSection } from "@/components/tmdb-discover-section";
import { prefetchMovieEnrich } from "@/lib/movie-enrich-prefetch";
import { movieToDetailPageHref } from "@/lib/movie-detail-nav";
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
  fetchLikedPlaylistIds,
  fetchPublicCommunityPlaylists,
  setPlaylistFollowedDb,
  setPlaylistLikedDb,
} from "@/lib/supabase/playlist-service";
import {
  GENRES,
  type CommunityPlaylist,
  type Genre,
  type Movie,
} from "@/lib/types";

type BrowseGenre = "all" | Genre;
import type {
  TmdbDiscoverItem,
  TmdbDiscoverResponse,
} from "@/lib/movie-enrich-types";
import { movieFromTmdbDiscoverItem } from "@/lib/tmdb-genre-map";
import { cn } from "@/lib/utils";

function talkOfTownLabel(item: TmdbDiscoverItem): string {
  const rd = item.release_date;
  if (rd) {
    const t0 = Date.parse(`${rd}T12:00:00Z`);
    if (Number.isFinite(t0)) {
      const days = (t0 - Date.now()) / 86400000;
      if (days > 0 && days < 120) return "Coming soon";
      if (days <= 0 && days > -28) return "Just dropped";
    }
  }
  if (item.vote_count >= 5000) return "Hot";
  if (item.vote_average >= 8) return "Buzzing";
  return "This week";
}

const GENRE_PAGE_SORT_LABEL: Record<
  "popularity.desc" | "vote_average.desc" | "primary_release_date.desc",
  string
> = {
  "popularity.desc": "Popular",
  "vote_average.desc": "Top rated",
  "primary_release_date.desc": "Newest",
};

function CommunityPlaylistCard({
  item,
  following,
  liked,
  onToggleFollow,
  onToggleLike,
  onSaveToLibrary,
}: {
  item: CommunityPlaylist;
  following: boolean;
  liked: boolean;
  onToggleFollow: () => void;
  onToggleLike: () => void;
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
            {item.likeCount.toLocaleString()} likes ·{" "}
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
            variant={liked ? "secondary" : "outline"}
            className={cn(
              "h-8 shrink-0 border-white/15 px-3 text-xs",
              liked && "border-transparent text-rose-200",
            )}
            title={liked ? "Unlike" : "Like"}
            onClick={() => {
              void onToggleLike();
            }}
          >
            <Heart
              className={cn("size-3.5", liked && "fill-current")}
            />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={following ? "secondary" : "outline"}
            className={cn(
              "h-8 min-w-0 flex-1 border-white/15 text-xs",
              following && "border-transparent",
            )}
            onClick={() => {
              void onToggleFollow();
            }}
          >
            <UserPlus className="size-3.5 shrink-0" />
            {following ? "Following" : "Follow"}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="default"
            className="h-8 min-w-0 flex-1 text-xs"
            onClick={() => {
              void onSaveToLibrary();
            }}
          >
            <Plus className="size-3.5 shrink-0" />
            Save
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ExplorePage() {
  const router = useRouter();
  const { client, session, ready } = useSupabaseApp();
  const [communityPlaylists, setCommunityPlaylists] = useState<
    CommunityPlaylist[]
  >([]);
  const [communityLoading, setCommunityLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [genre, setGenre] = useState<BrowseGenre>("all");
  const [genreSort, setGenreSort] = useState<
    "popularity.desc" | "vote_average.desc" | "primary_release_date.desc"
  >("popularity.desc");
  const [genreLoading, setGenreLoading] = useState(false);
  const [genreResults, setGenreResults] = useState<TmdbDiscoverResponse["results"]>(
    [],
  );
  const [genreConfigured, setGenreConfigured] = useState(true);
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set());
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [townItems, setTownItems] = useState<TmdbDiscoverItem[]>([]);
  const [townLoading, setTownLoading] = useState(true);
  const [topChartWindow, setTopChartWindow] = useState<"week" | "day">("week");
  const [dayTrending, setDayTrending] = useState<TmdbDiscoverItem[]>([]);
  const [dayTrendingLoading, setDayTrendingLoading] = useState(false);
  const [memeItems, setMemeItems] = useState<
    { memeTag: string; movie: Movie }[]
  >([]);
  const [memeLoading, setMemeLoading] = useState(true);

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
    void fetchLikedPlaylistIds(client, session.user.id).then(setLikedIds);
  }, [ready, client, session?.user?.id]);

  useEffect(() => {
    let cancelled = false;
    setTownLoading(true);
    void fetch("/api/trending/week")
      .then((r) => r.json() as Promise<TmdbDiscoverResponse>)
      .then((d) => {
        if (!cancelled) setTownItems(d.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setTownItems([]);
      })
      .finally(() => {
        if (!cancelled) setTownLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (topChartWindow !== "day") return;
    let cancelled = false;
    setDayTrendingLoading(true);
    void fetch("/api/trending/day")
      .then((r) => r.json() as Promise<TmdbDiscoverResponse>)
      .then((d) => {
        if (!cancelled) setDayTrending(d.results ?? []);
      })
      .catch(() => {
        if (!cancelled) setDayTrending([]);
      })
      .finally(() => {
        if (!cancelled) setDayTrendingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topChartWindow]);

  const topChartItems =
    topChartWindow === "week" ? townItems : dayTrending;
  const topChartLoading =
    topChartWindow === "week" ? townLoading : dayTrendingLoading;

  useEffect(() => {
    let cancelled = false;
    setMemeLoading(true);
    void fetch("/api/explore/meme-spotlight")
      .then((r) => r.json() as Promise<{ configured?: boolean; items?: { memeTag: string; movie: Movie }[] }>)
      .then((d) => {
        if (!cancelled) setMemeItems(d.items ?? []);
      })
      .catch(() => {
        if (!cancelled) setMemeItems([]);
      })
      .finally(() => {
        if (!cancelled) setMemeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const ctrl = new AbortController();
    setGenreLoading(true);
    const url =
      genre === "all"
        ? `/api/discover/top?sort=${encodeURIComponent(genreSort)}`
        : `/api/discover/genre?genre=${encodeURIComponent(genre)}&sort=${encodeURIComponent(genreSort)}`;
    fetch(url, { signal: ctrl.signal })
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
    const href = movieToDetailPageHref(movie, "explore");
    if (!href) {
      toast("Could not open this title — missing TMDB id.");
      return;
    }
    void (async () => {
      await prefetchMovieEnrich(movie);
      router.push(href);
    })();
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

  async function toggleLike(id: string) {
    if (!client || !session?.user) return;
    const was = likedIds.has(id);
    const next = !was;
    const delta = next ? 1 : -1;
    setLikedIds((prev) => {
      const s = new Set(prev);
      if (next) s.add(id);
      else s.delete(id);
      return s;
    });
    setCommunityPlaylists((prev) =>
      prev.map((p) =>
        p.id === id
          ? { ...p, likeCount: Math.max(0, p.likeCount + delta) }
          : p,
      ),
    );
    const ok = await setPlaylistLikedDb(client, session.user.id, id, next);
    if (!ok) {
      setLikedIds((prev) => {
        const s = new Set(prev);
        if (was) s.add(id);
        else s.delete(id);
        return s;
      });
      setCommunityPlaylists((prev) =>
        prev.map((p) =>
          p.id === id
            ? { ...p, likeCount: Math.max(0, p.likeCount - delta) }
            : p,
        ),
      );
      toast("Could not update like");
      return;
    }
    toast(was ? "Removed like" : "Liked playlist");
  }

  return (
    <div className="min-h-dvh text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[oklch(0.12_0.04_250/0.55)] backdrop-blur-xl supports-[backdrop-filter]:bg-[oklch(0.12_0.04_250/0.4)]">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-4 py-3">
          <div className="flex items-center gap-3">
            <Link
              href="/app"
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 transition hover:bg-white/10"
            >
              <ArrowLeft className="size-4" />
              <span className="hidden sm:inline">Your theatre</span>
            </Link>
            <div className="flex items-center gap-2">
              <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
                <Compass className="size-4" />
              </div>
              <div>
                <p className="font-heading text-sm font-semibold">Explore</p>
                <p className="text-[10px] text-white/45">Discovery hub</p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label="Sign out"
              className="gap-1.5 text-white/70 hover:bg-white/10 hover:text-white"
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
            <Link
              href="/app"
              className="hidden items-center gap-2 text-sm text-white/60 transition hover:text-white sm:inline-flex"
            >
              <Clapperboard className="size-4" />
              Your theatre
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] px-4 py-8">
        <section className="relative overflow-hidden rounded-3xl border border-sky-500/15 bg-gradient-to-br from-sky-950/50 via-emerald-950/25 to-red-950/35 p-6 sm:p-10">
          <div className="pointer-events-none absolute -right-24 top-0 h-72 w-72 rounded-full bg-primary/15 blur-3xl" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-56 w-56 rounded-full bg-emerald-500/10 blur-3xl" />
          <div className="relative max-w-2xl">
            <h1 className="font-heading text-3xl font-semibold tracking-tight sm:text-4xl">
              Find your next obsession
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-white/60 sm:text-base">
              Search creators’ public lists, like and follow playlists you love, save them
              to your library — same energy as Spotify, built for film. Your own lists and
              saved titles stay on{" "}
              <Link
                href="/app"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Your theatre
              </Link>{" "}
              (Home).
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

        <div className="mt-10 lg:grid lg:grid-cols-[minmax(0,1fr)_min(100%,320px)] lg:items-start lg:gap-8 xl:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0 space-y-10">
        <section>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Megaphone className="size-5 shrink-0 text-sky-400" aria-hidden />
            <div>
              <h2 className="font-heading text-xl font-semibold">What’s buzzing</h2>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl border border-sky-500/20 bg-gradient-to-b from-sky-950/30 via-card to-background p-4 sm:p-5">
            {townLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/45">
                <Loader2 className="size-5 animate-spin" />
                Loading what’s hot…
              </div>
            ) : townItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/45">
                Add TMDB_API_KEY to show the trending rail.
              </p>
            ) : (
              <div className="relative">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-[0.07]"
                  style={{
                    backgroundImage:
                      "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.9) 1px, transparent 0)",
                    backgroundSize: "14px 14px",
                  }}
                />
                <div className="relative flex gap-3 overflow-x-auto pb-2 pt-1 [-ms-overflow-style:none] [scrollbar-width:thin] [scrollbar-color:rgba(56,189,248,0.4)_transparent] snap-x snap-mandatory sm:gap-4 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-sky-500/40">
                  {townItems.slice(0, 14).map((item, idx) => {
                    const movie = movieFromTmdbDiscoverItem(item);
                    const tag = talkOfTownLabel(item);
                    const rank = idx + 1;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => selectMovie(movie)}
                        className="group w-[104px] shrink-0 snap-start text-left sm:w-[118px]"
                      >
                        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900 shadow-lg shadow-black/40 ring-1 ring-white/10 transition group-hover:ring-sky-400/50 group-hover:shadow-sky-950/25">
                          <PosterImage
                            src={movie.posterImage}
                            alt={movie.title}
                            fill
                            placeholderGradient={movie.posterClass}
                            className="object-cover transition duration-300 group-hover:scale-[1.04]"
                            sizes="118px"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-2 pb-2 pt-8">
                            <p className="line-clamp-2 text-[10px] font-semibold leading-tight text-white drop-shadow-md sm:text-[11px]">
                              {movie.title}
                            </p>
                            <p className="mt-0.5 text-[9px] text-white/55">
                              ★ {item.vote_average.toFixed(1)}
                            </p>
                          </div>
                          <span className="absolute left-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/75 text-[11px] font-bold tabular-nums text-white ring-1 ring-sky-400/45 backdrop-blur-sm">
                            {rank}
                          </span>
                          <div className="absolute right-2 top-2 max-w-[calc(100%-3rem)]">
                            <Badge className="border-0 bg-black/60 px-1 py-0 text-[8px] font-medium uppercase leading-tight tracking-wide text-white/90 backdrop-blur">
                              {tag}
                            </Badge>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4">
            <h2 className="font-heading text-xl font-semibold text-white">
              What&apos;s trending where you watch
            </h2>
          </div>
          <ExploreStreamingRails onSelectMovie={selectMovie} />
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Laugh className="size-5 shrink-0 text-amber-400" aria-hidden />
            <div>
              <h2 className="font-heading text-xl font-semibold">Meme hall of fame</h2>
            </div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-card p-3 sm:p-4">
            {memeLoading ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-white/45">
                <Loader2 className="size-5 animate-spin" />
                Loading meme picks…
              </div>
            ) : memeItems.length === 0 ? (
              <p className="py-8 text-center text-sm text-white/45">
                Add TMDB_API_KEY to load curated meme-lineage titles, or check the
                meme-spotlight API.
              </p>
            ) : (
              <div className="columns-2 gap-x-4 gap-y-5 sm:columns-3 md:columns-4">
                {memeItems.map(({ memeTag, movie }, i) => (
                  <button
                    key={movie.id}
                    type="button"
                    onClick={() => selectMovie(movie)}
                    className={cn(
                      "group mb-5 break-inside-avoid rounded-2xl border border-white/10 bg-black/20 p-2.5 text-left transition hover:border-amber-400/35",
                      i % 5 === 0 && "sm:ring-1 sm:ring-amber-500/20",
                    )}
                  >
                    <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900">
                      <PosterImage
                        src={movie.posterImage}
                        alt={movie.title}
                        fill
                        placeholderGradient={movie.posterClass}
                        className="object-cover transition group-hover:scale-[1.02]"
                        sizes="(max-width:640px) 42vw, 160px"
                      />
                      <div className="absolute left-1.5 top-1.5 right-1.5">
                        <Badge className="border-0 bg-black/70 px-1.5 py-0 text-[8px] font-medium uppercase leading-tight tracking-wide text-amber-100 backdrop-blur line-clamp-2 sm:text-[9px]">
                          {memeTag}
                        </Badge>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs font-medium leading-snug text-white/90">
                      {movie.title}
                    </p>
                    <p className="text-[10px] text-white/40">
                      {movie.year} · Open film page
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="font-heading text-xl font-semibold">Browse by genre</h2>
            </div>
            <Select
              value={genreSort}
              onValueChange={(v) => {
                if (
                  v === "popularity.desc" ||
                  v === "vote_average.desc" ||
                  v === "primary_release_date.desc"
                ) {
                  setGenreSort(v);
                }
              }}
            >
              <SelectTrigger className="h-9 w-full border-white/10 bg-[#1a1a1a] text-xs sm:w-[200px]">
                <SelectValue>
                  {GENRE_PAGE_SORT_LABEL[genreSort] ?? "Sort"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="popularity.desc">Popular</SelectItem>
                <SelectItem value="vote_average.desc">Top rated</SelectItem>
                <SelectItem value="primary_release_date.desc">Newest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={genre === "all" ? "secondary" : "outline"}
              className={cn(
                "rounded-full border-white/15",
                genre === "all" && "border-transparent",
              )}
              onClick={() => setGenre("all")}
            >
              All
            </Button>
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
                onClick={() => setGenre((prev) => (prev === g ? "all" : g))}
              >
                {g}
              </Button>
            ))}
          </div>

          <div className="mt-6 min-h-[120px] rounded-2xl border border-white/10 bg-card/80 p-4 sm:p-6">
            {genreLoading ? (
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

        <section className="rounded-2xl border border-white/10 bg-card p-4 sm:p-6">
          <TmdbDiscoverSection selectedMovieId={null} onSelectMovie={selectMovie} />
        </section>

        {followedPlaylists.length > 0 ? (
          <section>
            <h2 className="font-heading text-xl font-semibold">Creators you follow</h2>
            <div className="mt-4 flex gap-4 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {followedPlaylists.map((p) => (
                <CommunityPlaylistCard
                  key={p.id}
                  item={p}
                  following={followedIds.has(p.id)}
                  liked={likedIds.has(p.id)}
                  onToggleFollow={() => void toggleFollow(p.id)}
                  onToggleLike={() => void toggleLike(p.id)}
                  onSaveToLibrary={async () => {
                    if (!client || !session?.user) return;
                    const pl = await clonePublicPlaylistForUser(
                      client,
                      session.user.id,
                      p.id,
                    );
                    toast(
                      pl
                        ? "Saved to your library — open Your theatre to see it"
                        : "Could not copy playlist",
                    );
                  }}
                />
              ))}
            </div>
          </section>
        ) : null}

        <section>
          <h2 className="font-heading text-xl font-semibold">Public playlists</h2>
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
                    liked={likedIds.has(p.id)}
                    onToggleFollow={() => void toggleFollow(p.id)}
                    onToggleLike={() => void toggleLike(p.id)}
                    onSaveToLibrary={async () => {
                      if (!client || !session?.user) return;
                      const pl = await clonePublicPlaylistForUser(
                        client,
                        session.user.id,
                        p.id,
                      );
                      toast(
                        pl
                          ? "Saved to your library — open Your theatre to see it"
                          : "Could not copy playlist",
                      );
                    }}
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </section>
          </div>
          <div className="mt-10 w-full shrink-0 lg:mt-0 lg:sticky lg:top-[5.25rem] lg:self-start">
            <ExploreTop10Sidebar
              loading={topChartLoading}
              items={topChartItems}
              chartWindow={topChartWindow}
              onChartWindowChange={setTopChartWindow}
              onSelectMovie={selectMovie}
            />
          </div>
        </div>
      </main>

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
