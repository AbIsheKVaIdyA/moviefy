import { NextRequest, NextResponse } from "next/server";
import type { TmdbDiscoverResponse } from "@/lib/movie-enrich-types";

export const runtime = "nodejs";

const TMDB_KEY = process.env.TMDB_API_KEY;

/** Preset keys → TMDB discover query (same-origin only). */
const PRESETS: Record<
  string,
  (p: URLSearchParams) => void
> = {
  best_late_night: (p) => {
    p.set("with_genres", "27");
    p.set("sort_by", "popularity.desc");
    p.set("vote_count.gte", "180");
    p.set("vote_average.gte", "5.8");
  },
  best_date: (p) => {
    p.set("with_genres", "10749");
    p.set("sort_by", "vote_average.desc");
    p.set("vote_count.gte", "200");
    p.set("vote_average.gte", "6.8");
  },
  best_mind_bending: (p) => {
    p.set("with_genres", "878");
    p.set("sort_by", "vote_average.desc");
    p.set("vote_count.gte", "400");
    p.set("vote_average.gte", "7");
  },
  best_action: (p) => {
    p.set("with_genres", "28");
    p.set("sort_by", "popularity.desc");
    p.set("vote_count.gte", "300");
    p.set("vote_average.gte", "6.2");
  },
  time_easy: (p) => {
    p.set("with_runtime.lte", "105");
    p.set("sort_by", "popularity.desc");
    p.set("vote_count.gte", "150");
    p.set("vote_average.gte", "6");
  },
  time_heavy: (p) => {
    p.set("with_runtime.gte", "125");
    p.set("with_genres", "18");
    p.set("sort_by", "vote_average.desc");
    p.set("vote_count.gte", "250");
    p.set("vote_average.gte", "6.8");
  },
  hidden_gems: (p) => {
    p.set("vote_count.lte", "10000");
    p.set("vote_count.gte", "40");
    p.set("vote_average.gte", "7.4");
    p.set("sort_by", "vote_average.desc");
  },
  underrated_high: (p) => {
    p.set("vote_average.gte", "7.9");
    p.set("vote_count.gte", "120");
    p.set("vote_count.lte", "6000");
    p.set("sort_by", "vote_average.desc");
  },
  vibe_brain: (p) => {
    p.set("with_genres", "878,53");
    p.set("sort_by", "vote_average.desc");
    p.set("vote_count.gte", "200");
    p.set("vote_average.gte", "6.9");
  },
  vibe_alone: (p) => {
    p.set("with_genres", "27");
    p.set("sort_by", "vote_average.desc");
    p.set("vote_count.gte", "300");
    p.set("vote_average.gte", "6.5");
  },
  vibe_worth: (p) => {
    p.set("vote_average.gte", "8.1");
    p.set("vote_count.gte", "800");
    p.set("sort_by", "vote_average.desc");
  },
  mood_feelgood: (p) => {
    p.set("with_genres", "35");
    p.set("sort_by", "popularity.desc");
    p.set("vote_count.gte", "200");
    p.set("vote_average.gte", "6.5");
  },
  mood_mindblown: (p) => {
    p.set("with_genres", "878");
    p.set("sort_by", "vote_average.desc");
    p.set("vote_count.gte", "350");
    p.set("vote_average.gte", "7.2");
  },
  mood_thriller: (p) => {
    p.set("with_genres", "27|53");
    p.set("sort_by", "popularity.desc");
    p.set("vote_count.gte", "250");
    p.set("vote_average.gte", "6.4");
  },
  mood_deep: (p) => {
    p.set("with_genres", "18");
    p.set("with_runtime.gte", "115");
    p.set("sort_by", "vote_average.desc");
    p.set("vote_count.gte", "200");
    p.set("vote_average.gte", "7");
  },
};

const ALLOWED = new Set(Object.keys(PRESETS));

export async function GET(request: NextRequest) {
  const key = request.nextUrl.searchParams.get("key")?.trim() ?? "";
  if (!ALLOWED.has(key)) {
    return NextResponse.json(
      { error: "Unknown preset key", allowed: [...ALLOWED].sort() },
      { status: 400 },
    );
  }

  if (!TMDB_KEY) {
    const empty: TmdbDiscoverResponse = {
      configured: false,
      sort: key,
      results: [],
      page: 1,
      warning: "Add TMDB_API_KEY to load curated rails.",
    };
    return NextResponse.json(empty);
  }

  try {
    const u = new URL("https://api.themoviedb.org/3/discover/movie");
    u.searchParams.set("api_key", TMDB_KEY);
    u.searchParams.set("page", "1");
    u.searchParams.set("include_adult", "false");
    u.searchParams.set("language", "en-US");
    const apply = PRESETS[key];
    if (apply) apply(u.searchParams);

    const res = await fetch(u.toString());
    if (!res.ok) {
      return NextResponse.json(
        { configured: true, sort: key, results: [], page: 1, warning: "TMDB error" },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      results?: TmdbDiscoverResponse["results"];
    };
    return NextResponse.json({
      configured: true,
      sort: key,
      results: data.results ?? [],
      page: 1,
    } satisfies TmdbDiscoverResponse);
  } catch {
    return NextResponse.json(
      {
        configured: true,
        sort: key,
        results: [],
        page: 1,
        warning: "Network error",
      } satisfies TmdbDiscoverResponse,
      { status: 502 },
    );
  }
}
