"use client";

import { Clapperboard, Sparkles, User, Users } from "lucide-react";
import { PosterImage } from "@/components/poster-image";
import type { SearchSuggestMovieRow, SearchSuggestResponse } from "@/lib/search-suggest-types";
import type { Genre } from "@/lib/types";
import { tmdbPosterUrl, tmdbProfileUrl } from "@/lib/tmdb-image";
import { cn } from "@/lib/utils";

export type SearchPlaylistHit = {
  id: string;
  name: string;
  hint: string;
  onPick: () => void;
};

export type SearchLibraryMovieHit = {
  key: string;
  title: string;
  subtitle: string;
  posterImage: string;
  posterClass: string;
  onPick: () => void;
};

type Props = {
  open: boolean;
  variant: "explore" | "library";
  query: string;
  loading: boolean;
  data: SearchSuggestResponse | null;
  playlistHits: SearchPlaylistHit[];
  libraryMovieHits?: SearchLibraryMovieHit[];
  onPickMovie: (row: SearchSuggestMovieRow) => void;
  onPickPerson: (id: number, name: string) => void;
  onPickGenre: (g: Genre) => void;
  onPickPlaylist: (hit: SearchPlaylistHit) => void;
};

function SectionLabel({
  children,
  variant,
}: {
  children: React.ReactNode;
  variant: "explore" | "library";
}) {
  return (
    <p
      className={cn(
        "mb-2 text-[10px] font-semibold uppercase tracking-wider",
        variant === "explore" ? "text-white/40" : "text-muted-foreground",
      )}
    >
      {children}
    </p>
  );
}

export function SearchSuggestDropdown({
  open,
  variant,
  query,
  loading,
  data,
  playlistHits,
  libraryMovieHits = [],
  onPickMovie,
  onPickPerson,
  onPickGenre,
  onPickPlaylist,
}: Props) {
  if (!open || !query.trim()) return null;

  const isExplore = variant === "explore";
  const panel = cn(
    "absolute left-0 right-0 top-full mt-2 max-h-[min(72vh,26rem,calc(100dvh_-_10rem_-_env(safe-area-inset-top)_-_env(safe-area-inset-bottom)))] overflow-y-auto overscroll-y-contain rounded-2xl border pb-[max(0.5rem,env(safe-area-inset-bottom))] shadow-xl",
    isExplore
      ? "z-[100] border-white/15 bg-[#12121a]/98 backdrop-blur-xl ring-1 ring-white/10"
      : "z-50 border-white/10 bg-[#1a1a1a] backdrop-blur-xl",
  );
  const rowBtn = cn(
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
    isExplore ? "hover:bg-white/[0.06]" : "hover:bg-white/5",
  );

  const top = data?.top ?? null;
  const others = data?.others ?? { movies: [], people: [], genres: [] };
  const hasOthers =
    others.movies.length > 0 ||
    others.people.length > 0 ||
    others.genres.length > 0 ||
    playlistHits.length > 0 ||
    libraryMovieHits.length > 0;

  return (
    <div
      className={panel}
      role="listbox"
      aria-label="Search suggestions"
      onMouseDown={(e) => e.preventDefault()}
    >
      <div className="p-3 sm:p-4">
        {loading && !data ? (
          <div className="space-y-3 py-6">
            <div className="h-16 animate-pulse rounded-xl bg-white/[0.06]" />
            <div className="h-10 animate-pulse rounded-lg bg-white/[0.05]" />
            <div className="h-10 animate-pulse rounded-lg bg-white/[0.05]" />
          </div>
        ) : null}

        {top ? (
          <div className="mb-4">
            <SectionLabel variant={variant}>
              <span className="inline-flex items-center gap-1.5">
                <Sparkles className="size-3" />
                Top result
              </span>
            </SectionLabel>
            {top.kind === "movie" ? (
              <button
                type="button"
                className={cn(
                  rowBtn,
                  isExplore ? "ring-1 ring-primary/35 bg-primary/10" : "ring-1 ring-primary/30",
                )}
                onClick={() => onPickMovie(top.movie)}
              >
                <div className="relative h-16 w-11 shrink-0 overflow-hidden rounded-lg bg-zinc-800">
                  {top.movie.posterPath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tmdbPosterUrl(top.movie.posterPath, "w185")}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-semibold",
                      isExplore ? "text-white" : "text-foreground",
                    )}
                  >
                    {top.movie.title}
                  </p>
                  <p className={cn("text-xs", isExplore ? "text-white/50" : "text-muted-foreground")}>
                    Movie · {top.movie.year || "—"} · ★ {top.movie.voteAverage.toFixed(1)}
                  </p>
                </div>
              </button>
            ) : null}
            {top.kind === "person" ? (
              <button
                type="button"
                className={cn(
                  rowBtn,
                  isExplore ? "ring-1 ring-sky-400/30 bg-sky-500/10" : "ring-1 ring-sky-500/25",
                )}
                onClick={() => onPickPerson(top.person.id, top.person.name)}
              >
                <div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-white/10">
                  {top.person.profilePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={tmdbProfileUrl(top.person.profilePath, "w185") ?? ""}
                      alt=""
                      className="size-full object-cover"
                    />
                  ) : (
                    <User className="m-auto size-6 text-white/30" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-semibold",
                      isExplore ? "text-white" : "text-foreground",
                    )}
                  >
                    {top.person.name}
                  </p>
                  <p className={cn("text-xs", isExplore ? "text-white/50" : "text-muted-foreground")}>
                    {top.person.knownForDepartment === "Acting"
                      ? "Actor / performer"
                      : top.person.knownForDepartment ?? "Person"}{" "}
                    · TMDB
                  </p>
                </div>
              </button>
            ) : null}
            {top.kind === "genre" ? (
              <button
                type="button"
                className={cn(
                  rowBtn,
                  isExplore ? "ring-1 ring-emerald-400/30 bg-emerald-500/10" : "ring-1 ring-emerald-500/25",
                )}
                onClick={() => onPickGenre(top.genre)}
              >
                <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-200">
                  <Clapperboard className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p
                    className={cn(
                      "truncate font-semibold",
                      isExplore ? "text-white" : "text-foreground",
                    )}
                  >
                    {top.genre}
                  </p>
                  <p className={cn("text-xs", isExplore ? "text-white/50" : "text-muted-foreground")}>
                    Genre · jump to Browse by genre
                  </p>
                </div>
              </button>
            ) : null}
          </div>
        ) : !loading && query.trim().length >= 1 && !hasOthers ? (
          <p className={cn("py-8 text-center text-sm", isExplore ? "text-white/45" : "text-muted-foreground")}>
            No matches yet — try another spelling or a shorter word.
          </p>
        ) : null}

        {hasOthers || loading ? (
          <div className={cn(top ? "border-t pt-4" : "", isExplore ? "border-white/10" : "border-white/10")}>
            <SectionLabel variant={variant}>Others</SectionLabel>

            {libraryMovieHits.length > 0 ? (
              <div className="mb-4">
                <p className={cn("mb-1.5 text-xs font-medium", isExplore ? "text-white/55" : "text-muted-foreground")}>
                  Your library
                </p>
                <ul className="space-y-1">
                  {libraryMovieHits.map((h) => (
                    <li key={h.key}>
                      <button type="button" className={rowBtn} onClick={h.onPick}>
                        <div className="relative h-11 w-8 shrink-0 overflow-hidden rounded bg-zinc-800">
                          <PosterImage
                            src={h.posterImage}
                            alt=""
                            fill
                            placeholderGradient={h.posterClass}
                            className="object-cover"
                            sizes="32px"
                          />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              isExplore ? "text-white" : "text-foreground",
                            )}
                          >
                            {h.title}
                          </p>
                          <p className={cn("truncate text-xs", isExplore ? "text-white/45" : "text-muted-foreground")}>
                            {h.subtitle}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {playlistHits.length > 0 ? (
              <div className="mb-4">
                <p className={cn("mb-1.5 text-xs font-medium", isExplore ? "text-white/55" : "text-muted-foreground")}>
                  {isExplore ? "Public playlists" : "Playlists"}
                </p>
                <ul className="space-y-1">
                  {playlistHits.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={rowBtn}
                        onClick={() => onPickPlaylist(p)}
                      >
                        <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10 text-white/80">
                          <Users className="size-4" />
                        </div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              isExplore ? "text-white" : "text-foreground",
                            )}
                          >
                            {p.name}
                          </p>
                          <p className={cn("truncate text-xs", isExplore ? "text-white/45" : "text-muted-foreground")}>
                            {p.hint}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {others.movies.length > 0 ? (
              <div className="mb-4">
                <p className={cn("mb-1.5 text-xs font-medium", isExplore ? "text-white/55" : "text-muted-foreground")}>
                  Movies
                </p>
                <ul className="space-y-1">
                  {others.movies.map((m) => (
                    <li key={m.tmdbId}>
                      <button type="button" className={rowBtn} onClick={() => onPickMovie(m)}>
                        <div className="relative h-11 w-8 shrink-0 overflow-hidden rounded bg-zinc-800">
                          {m.posterPath ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={tmdbPosterUrl(m.posterPath, "w185")}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : null}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              isExplore ? "text-white" : "text-foreground",
                            )}
                          >
                            {m.title}
                          </p>
                          <p className={cn("text-xs", isExplore ? "text-white/45" : "text-muted-foreground")}>
                            {m.year || "—"} · ★ {m.voteAverage.toFixed(1)}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {others.people.length > 0 ? (
              <div className="mb-4">
                <p className={cn("mb-1.5 text-xs font-medium", isExplore ? "text-white/55" : "text-muted-foreground")}>
                  Actors & creators
                </p>
                <ul className="space-y-1">
                  {others.people.map((p) => (
                    <li key={p.id}>
                      <button
                        type="button"
                        className={rowBtn}
                        onClick={() => onPickPerson(p.id, p.name)}
                      >
                        <div className="relative size-10 shrink-0 overflow-hidden rounded-full bg-zinc-800">
                          {p.profilePath ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={tmdbProfileUrl(p.profilePath, "w185") ?? ""}
                              alt=""
                              className="size-full object-cover"
                            />
                          ) : (
                            <User className="m-auto size-4 text-white/35" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "truncate text-sm font-medium",
                              isExplore ? "text-white" : "text-foreground",
                            )}
                          >
                            {p.name}
                          </p>
                          <p className={cn("text-xs", isExplore ? "text-white/45" : "text-muted-foreground")}>
                            {p.knownForDepartment ?? "Person"}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {others.genres.length > 0 ? (
              <div>
                <p className={cn("mb-1.5 text-xs font-medium", isExplore ? "text-white/55" : "text-muted-foreground")}>
                  Genres
                </p>
                <ul className="flex flex-wrap gap-2 pb-1">
                  {others.genres.map((g) => (
                    <li key={g.genre}>
                      <button
                        type="button"
                        className={cn(
                          "rounded-full border px-3 py-1.5 text-xs font-medium transition",
                          isExplore
                            ? "border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
                            : "border-white/10 bg-white/5 hover:bg-white/10",
                        )}
                        onClick={() => onPickGenre(g.genre)}
                      >
                        {g.genre}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : null}

        {!data?.configured && query.trim().length >= 2 ? (
          <p className={cn("mt-3 text-center text-xs", isExplore ? "text-amber-200/70" : "text-amber-200/80")}>
            Add TMDB_API_KEY for live movies & people. Genres and playlists still work.
          </p>
        ) : null}
      </div>
    </div>
  );
}
