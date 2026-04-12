import type { Genre, Movie } from "@/lib/types";

const STORAGE_KEY = "moviefy_explore_recent_v1";
const MAX = 24;

type Stored = Pick<
  Movie,
  "id" | "title" | "year" | "genre" | "posterClass" | "posterImage"
> & {
  tmdbId?: number;
  openedAt: number;
};

function parseStored(raw: unknown): Stored[] {
  if (!Array.isArray(raw)) return [];
  const out: Stored[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    if (typeof o.id !== "string" || typeof o.title !== "string") continue;
    out.push({
      id: o.id,
      title: o.title,
      year: typeof o.year === "number" ? o.year : 0,
      genre: (typeof o.genre === "string" ? o.genre : "Drama") as Genre,
      posterClass:
        typeof o.posterClass === "string" ? o.posterClass : "from-zinc-700 to-zinc-900",
      posterImage: typeof o.posterImage === "string" ? o.posterImage : "",
      tmdbId: typeof o.tmdbId === "number" ? o.tmdbId : undefined,
      openedAt: typeof o.openedAt === "number" ? o.openedAt : 0,
    });
  }
  return out;
}

function toMovie(s: Stored): Movie {
  return {
    id: s.id,
    title: s.title,
    year: s.year,
    genre: s.genre,
    posterClass: s.posterClass,
    posterImage: s.posterImage,
    director: "—",
    tmdbId: s.tmdbId,
  };
}

export function pushExploreRecent(movie: Movie): void {
  if (typeof window === "undefined") return;
  try {
    const prev = parseStored(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"));
    const tid =
      movie.tmdbId ??
      (movie.id.startsWith("tmdb-") ? Number(movie.id.slice(5)) : NaN);
    const entry: Stored = {
      id: movie.id,
      title: movie.title,
      year: movie.year,
      genre: movie.genre,
      posterClass: movie.posterClass,
      posterImage: movie.posterImage,
      tmdbId: Number.isFinite(tid) ? tid : undefined,
      openedAt: Date.now(),
    };
    const next = [
      entry,
      ...prev.filter((p) => p.id !== entry.id && p.tmdbId !== entry.tmdbId),
    ].slice(0, MAX);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
}

export function readExploreRecentMovies(): Movie[] {
  if (typeof window === "undefined") return [];
  try {
    const prev = parseStored(JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null"));
    return prev.sort((a, b) => b.openedAt - a.openedAt).map(toMovie);
  } catch {
    return [];
  }
}
