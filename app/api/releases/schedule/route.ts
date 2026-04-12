import { NextRequest, NextResponse } from "next/server";
import type {
  ScheduleItem,
  ScheduleMedia,
  ScheduleResponse,
  ScheduleWindow,
} from "@/lib/releases-schedule-types";
import { GENRES, type Genre } from "@/lib/types";
import { tmdbGenreIdFor } from "@/lib/tmdb-genre-ids";

export const runtime = "nodejs";

const TMDB_KEY = process.env.TMDB_API_KEY;

function utcDayStart(d = new Date()): Date {
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()),
  );
}

function addUtcDays(base: Date, days: number): Date {
  const x = new Date(base);
  x.setUTCDate(x.getUTCDate() + days);
  return x;
}

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseWindow(w: string | null): ScheduleWindow {
  if (w === "today" || w === "announced") return w;
  return "upcoming";
}

function parseFilter(f: string | null): "all" | ScheduleMedia {
  if (f === "movie" || f === "tv") return f;
  return "all";
}

function parseGenreParam(s: string | null): number | undefined {
  const t = s?.trim();
  if (!t || t === "all") return undefined;
  if (!(GENRES as readonly string[]).includes(t)) return undefined;
  return tmdbGenreIdFor(t as Genre);
}

function parseLangParam(s: string | null): string | undefined {
  const t = s?.trim().toLowerCase();
  if (!t || t === "all" || t.length !== 2) return undefined;
  return t;
}

type DiscoverExtra = {
  withGenres?: number;
  originalLanguage?: string;
};

type TmdbMovieRow = {
  id: number;
  title: string;
  poster_path: string | null;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity?: number;
  video?: boolean;
};

type TmdbTvRow = {
  id: number;
  name: string;
  poster_path: string | null;
  first_air_date: string;
  vote_average: number;
  vote_count: number;
  popularity?: number;
  number_of_seasons?: number;
};

async function discoverMovies(
  gte: string,
  lte: string,
  maxPages: number,
  extra?: DiscoverExtra,
): Promise<TmdbMovieRow[]> {
  if (!TMDB_KEY) return [];
  const out: TmdbMovieRow[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const u = new URL("https://api.themoviedb.org/3/discover/movie");
    u.searchParams.set("api_key", TMDB_KEY);
    u.searchParams.set("language", "en-US");
    u.searchParams.set("sort_by", "primary_release_date.asc");
    u.searchParams.set("include_adult", "false");
    u.searchParams.set("include_video", "false");
    u.searchParams.set("page", String(page));
    u.searchParams.set("primary_release_date.gte", gte);
    u.searchParams.set("primary_release_date.lte", lte);
    u.searchParams.set("region", "US");
    if (extra?.withGenres != null) {
      u.searchParams.set("with_genres", String(extra.withGenres));
    }
    if (extra?.originalLanguage) {
      u.searchParams.set("with_original_language", extra.originalLanguage);
    }
    const res = await fetch(u.toString());
    if (!res.ok) break;
    const json = (await res.json()) as { results?: TmdbMovieRow[] };
    const batch = json.results ?? [];
    if (!batch.length) break;
    out.push(...batch);
  }
  return out;
}

async function discoverTv(
  gte: string,
  lte: string,
  maxPages: number,
  extra?: DiscoverExtra,
): Promise<TmdbTvRow[]> {
  if (!TMDB_KEY) return [];
  const out: TmdbTvRow[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const u = new URL("https://api.themoviedb.org/3/discover/tv");
    u.searchParams.set("api_key", TMDB_KEY);
    u.searchParams.set("language", "en-US");
    u.searchParams.set("sort_by", "first_air_date.asc");
    u.searchParams.set("include_adult", "false");
    u.searchParams.set("page", String(page));
    u.searchParams.set("first_air_date.gte", gte);
    u.searchParams.set("first_air_date.lte", lte);
    if (extra?.withGenres != null) {
      u.searchParams.set("with_genres", String(extra.withGenres));
    }
    if (extra?.originalLanguage) {
      u.searchParams.set("with_original_language", extra.originalLanguage);
    }
    const res = await fetch(u.toString());
    if (!res.ok) break;
    const json = (await res.json()) as { results?: TmdbTvRow[] };
    const batch = json.results ?? [];
    if (!batch.length) break;
    out.push(...batch);
  }
  return out;
}

function movieToScheduleItem(r: TmdbMovieRow): ScheduleItem | null {
  const d = r.release_date?.trim();
  if (!d || !Number.isFinite(r.id)) return null;
  const year = d.slice(0, 4);
  const venue = r.video ? "Digital / home premiere" : "Theatrical & streaming";
  return {
    mediaType: "movie",
    tmdbId: r.id,
    title: r.title,
    posterPath: r.poster_path,
    releaseDate: d,
    voteAverage: r.vote_average ?? 0,
    voteCount: r.vote_count ?? 0,
    popularity: r.popularity ?? 0,
    kindLabel: "Film",
    releaseVenueLabel: `${venue} · ${year}`,
  };
}

function tvToScheduleItem(r: TmdbTvRow): ScheduleItem | null {
  const d = r.first_air_date?.trim();
  if (!d || !Number.isFinite(r.id)) return null;
  const year = d.slice(0, 4);
  const seasons = r.number_of_seasons ?? 1;
  const kind =
    seasons > 1 ? "New season" : "New series";
  return {
    mediaType: "tv",
    tmdbId: r.id,
    title: r.name,
    posterPath: r.poster_path,
    releaseDate: d,
    voteAverage: r.vote_average ?? 0,
    voteCount: r.vote_count ?? 0,
    popularity: r.popularity ?? 0,
    kindLabel: kind,
    releaseVenueLabel: `TV premiere · ${year}`,
  };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const window = parseWindow(searchParams.get("window"));
  const filter = parseFilter(searchParams.get("type"));
  const genreId = parseGenreParam(searchParams.get("genre"));
  const originalLanguage = parseLangParam(searchParams.get("lang"));
  const discoverExtra: DiscoverExtra | undefined =
    genreId != null || originalLanguage
      ? {
          ...(genreId != null ? { withGenres: genreId } : {}),
          ...(originalLanguage ? { originalLanguage } : {}),
        }
      : undefined;

  if (!TMDB_KEY) {
    const empty: ScheduleResponse = {
      configured: false,
      window,
      filter,
      items: [],
      warning: "Set TMDB_API_KEY to load the release calendar.",
    };
    return NextResponse.json(empty);
  }

  const today0 = utcDayStart();
  const tomorrow = addUtcDays(today0, 1);
  const upcomingEnd = addUtcDays(today0, 56);
  const announcedEnd = addUtcDays(today0, 540);

  let gte: string;
  let lte: string;
  if (window === "today") {
    gte = ymd(today0);
    lte = ymd(today0);
  } else if (window === "upcoming") {
    gte = ymd(tomorrow);
    lte = ymd(upcomingEnd);
  } else {
    gte = ymd(addUtcDays(upcomingEnd, 1));
    lte = ymd(announcedEnd);
  }

  try {
    const wantMovies = filter === "all" || filter === "movie";
    const wantTv = filter === "all" || filter === "tv";
    const pages = window === "announced" ? 4 : 3;

    const [moviesRaw, tvRaw] = await Promise.all([
      wantMovies
        ? discoverMovies(gte, lte, pages, discoverExtra)
        : Promise.resolve([]),
      wantTv ? discoverTv(gte, lte, pages, discoverExtra) : Promise.resolve([]),
    ]);

    const items: ScheduleItem[] = [];
    for (const r of moviesRaw) {
      const it = movieToScheduleItem(r);
      if (it) items.push(it);
    }
    for (const r of tvRaw) {
      const it = tvToScheduleItem(r);
      if (it) items.push(it);
    }

    items.sort((a, b) => {
      const c = a.releaseDate.localeCompare(b.releaseDate);
      if (c !== 0) return c;
      return (b.popularity ?? 0) - (a.popularity ?? 0);
    });

    const seen = new Set<string>();
    const deduped: ScheduleItem[] = [];
    for (const it of items) {
      const k = `${it.mediaType}:${it.tmdbId}:${it.releaseDate}`;
      if (seen.has(k)) continue;
      seen.add(k);
      deduped.push(it);
    }

    const body: ScheduleResponse = {
      configured: true,
      window,
      filter,
      items: deduped,
    };
    return NextResponse.json(body);
  } catch {
    const err: ScheduleResponse = {
      configured: true,
      window,
      filter,
      items: [],
      warning: "Could not load releases from TMDB.",
    };
    return NextResponse.json(err);
  }
}
