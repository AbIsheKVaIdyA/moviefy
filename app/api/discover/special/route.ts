import { NextRequest, NextResponse } from "next/server";
import type {
  TmdbDiscoverItem,
  TmdbDiscoverResponse,
} from "@/lib/movie-enrich-types";

export const runtime = "nodejs";

const TMDB_KEY = process.env.TMDB_API_KEY;

/** Pipe = OR on TMDB discover — Oscar / Emmy / general “award winner” style tags. */
const AWARD_KEYWORDS = "353496|10647|12527";

async function fetchDiscover(
  init: (u: URL) => void,
): Promise<TmdbDiscoverItem[]> {
  if (!TMDB_KEY) return [];
  const u = new URL("https://api.themoviedb.org/3/discover/movie");
  u.searchParams.set("api_key", TMDB_KEY);
  u.searchParams.set("language", "en-US");
  u.searchParams.set("include_adult", "false");
  u.searchParams.set("page", "1");
  init(u);
  const res = await fetch(u.toString());
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: TmdbDiscoverItem[] };
  return json.results ?? [];
}

export async function GET(request: NextRequest) {
  const kind = request.nextUrl.searchParams.get("kind");
  if (kind !== "awards" && kind !== "under_90") {
    return NextResponse.json(
      { error: "Use ?kind=awards or ?kind=under_90" },
      { status: 400 },
    );
  }

  if (!TMDB_KEY) {
    const empty: TmdbDiscoverResponse = {
      configured: false,
      sort: kind,
      results: [],
      page: 1,
      warning: "Set TMDB_API_KEY to load this rail.",
    };
    return NextResponse.json(empty);
  }

  try {
    let results: TmdbDiscoverItem[] = [];
    if (kind === "awards") {
      results = await fetchDiscover((u) => {
        u.searchParams.set("sort_by", "vote_average.desc");
        u.searchParams.set("vote_count.gte", "200");
        u.searchParams.set("with_keywords", AWARD_KEYWORDS);
      });
      if (results.length < 6) {
        results = await fetchDiscover((u) => {
          u.searchParams.set("sort_by", "vote_average.desc");
          u.searchParams.set("vote_count.gte", "2500");
          u.searchParams.set("vote_average.gte", "7.6");
        });
      }
    } else {
      results = await fetchDiscover((u) => {
        u.searchParams.set("sort_by", "popularity.desc");
        u.searchParams.set("vote_count.gte", "120");
        u.searchParams.set("with_runtime.lte", "90");
        u.searchParams.set("with_runtime.gte", "40");
      });
    }

    const body: TmdbDiscoverResponse = {
      configured: true,
      sort: kind,
      results: results.slice(0, 18),
      page: 1,
    };
    return NextResponse.json(body);
  } catch {
    return NextResponse.json({
      configured: true,
      sort: kind,
      results: [],
      page: 1,
      warning: "Network error",
    } satisfies TmdbDiscoverResponse);
  }
}
