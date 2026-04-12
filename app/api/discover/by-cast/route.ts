import { NextRequest, NextResponse } from "next/server";
import type { TmdbDiscoverResponse } from "@/lib/movie-enrich-types";

export const runtime = "nodejs";

const TMDB_KEY = process.env.TMDB_API_KEY;

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("personId");
  const personId = raw ? Number(raw) : NaN;
  if (!Number.isFinite(personId) || personId < 1) {
    return NextResponse.json({ error: "personId required" }, { status: 400 });
  }

  if (!TMDB_KEY) {
    const empty: TmdbDiscoverResponse = {
      configured: false,
      sort: "with_cast",
      results: [],
      page: 1,
      warning: "Add TMDB_API_KEY.",
    };
    return NextResponse.json(empty);
  }

  try {
    const u = new URL("https://api.themoviedb.org/3/discover/movie");
    u.searchParams.set("api_key", TMDB_KEY);
    u.searchParams.set("with_cast", String(Math.floor(personId)));
    u.searchParams.set("sort_by", "popularity.desc");
    u.searchParams.set("vote_count.gte", "40");
    u.searchParams.set("page", "1");
    u.searchParams.set("include_adult", "false");

    const res = await fetch(u.toString());
    if (!res.ok) {
      return NextResponse.json(
        { configured: true, sort: "with_cast", results: [], page: 1, warning: "TMDB error" },
        { status: 502 },
      );
    }
    const data = (await res.json()) as { results?: TmdbDiscoverResponse["results"] };
    return NextResponse.json({
      configured: true,
      sort: "with_cast",
      results: data.results ?? [],
      page: 1,
    } satisfies TmdbDiscoverResponse);
  } catch {
    return NextResponse.json(
      {
        configured: true,
        sort: "with_cast",
        results: [],
        page: 1,
        warning: "Network error",
      } satisfies TmdbDiscoverResponse,
      { status: 502 },
    );
  }
}
