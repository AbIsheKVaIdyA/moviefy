import { NextResponse } from "next/server";
import type { TmdbDiscoverResponse } from "@/lib/movie-enrich-types";

export const runtime = "nodejs";

const TMDB_KEY = process.env.TMDB_API_KEY;

/** TMDB trending movies today — for Explore “Top 10” day scope. */
export async function GET() {
  if (!TMDB_KEY) {
    const empty: TmdbDiscoverResponse = {
      configured: false,
      sort: "trending.day",
      results: [],
      page: 1,
      warning: "Set TMDB_API_KEY for trending titles.",
    };
    return NextResponse.json(empty);
  }

  try {
    const res = await fetch(
      `https://api.themoviedb.org/3/trending/movie/day?api_key=${TMDB_KEY}`,
    );
    if (!res.ok) {
      return NextResponse.json({
        configured: true,
        sort: "trending.day",
        results: [],
        page: 1,
        warning: "TMDB trending request failed.",
      } satisfies TmdbDiscoverResponse);
    }
    const json = (await res.json()) as {
      results?: TmdbDiscoverResponse["results"];
    };
    return NextResponse.json({
      configured: true,
      sort: "trending.day",
      results: json.results ?? [],
      page: 1,
    } satisfies TmdbDiscoverResponse);
  } catch {
    return NextResponse.json({
      configured: true,
      sort: "trending.day",
      results: [],
      page: 1,
      warning: "Network error loading trending.",
    } satisfies TmdbDiscoverResponse);
  }
}
