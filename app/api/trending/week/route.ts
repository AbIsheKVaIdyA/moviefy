import { NextResponse } from "next/server";
import type { TmdbDiscoverResponse } from "@/lib/movie-enrich-types";

export const runtime = "nodejs";

const TMDB_KEY = process.env.TMDB_API_KEY;

/** TMDB trending movies this week — for Explore “What’s buzzing” rail. */
export async function GET() {
  if (!TMDB_KEY) {
    const empty: TmdbDiscoverResponse = {
      configured: false,
      sort: "trending.week",
      results: [],
      page: 1,
      warning: "Set TMDB_API_KEY for trending titles.",
    };
    return NextResponse.json(empty);
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/movie/week?api_key=${TMDB_KEY}`,
    );
    if (!res.ok) {
      const warn: TmdbDiscoverResponse = {
        configured: true,
        sort: "trending.week",
        results: [],
        page: 1,
        warning: "TMDB trending request failed.",
      };
      return NextResponse.json(warn);
    }
    const json = (await res.json()) as {
      results?: TmdbDiscoverResponse["results"];
    };
    return NextResponse.json({
      configured: true,
      sort: "trending.week",
      results: json.results ?? [],
      page: 1,
    } satisfies TmdbDiscoverResponse);
  } catch {
    const err: TmdbDiscoverResponse = {
      configured: true,
      sort: "trending.week",
      results: [],
      page: 1,
      warning: "Network error loading trending.",
    };
    return NextResponse.json(err);
  }
}
