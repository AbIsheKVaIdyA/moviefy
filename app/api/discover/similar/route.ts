import { NextRequest, NextResponse } from "next/server";
import type { TmdbDiscoverItem, TmdbDiscoverResponse } from "@/lib/movie-enrich-types";

export const runtime = "nodejs";

const TMDB_KEY = process.env.TMDB_API_KEY;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("tmdbId");
  const tmdbId = raw ? Number(raw) : NaN;
  if (!Number.isFinite(tmdbId) || tmdbId < 1) {
    return NextResponse.json({ error: "tmdbId required" }, { status: 400 });
  }

  if (!TMDB_KEY) {
    const empty: TmdbDiscoverResponse = {
      configured: false,
      sort: "similar",
      results: [],
      page: 1,
      warning: "Add TMDB_API_KEY for similar titles.",
    };
    return NextResponse.json(empty);
  }

  try {
    const u = new URL(
      `https://api.themoviedb.org/3/movie/${Math.floor(tmdbId)}/similar`,
    );
    u.searchParams.set("api_key", TMDB_KEY);
    u.searchParams.set("page", "1");
    u.searchParams.set("language", "en-US");

    const res = await fetch(u.toString());
    if (!res.ok) {
      return NextResponse.json(
        {
          configured: true,
          sort: "similar",
          results: [],
          page: 1,
          warning: "TMDB error",
        } satisfies TmdbDiscoverResponse,
        { status: 502 },
      );
    }
    const data = (await res.json()) as { results?: TmdbDiscoverItem[] };
    return NextResponse.json({
      configured: true,
      sort: "similar",
      results: data.results ?? [],
      page: 1,
    } satisfies TmdbDiscoverResponse);
  } catch {
    return NextResponse.json(
      {
        configured: true,
        sort: "similar",
        results: [],
        page: 1,
        warning: "Network error",
      } satisfies TmdbDiscoverResponse,
      { status: 502 },
    );
  }
}
