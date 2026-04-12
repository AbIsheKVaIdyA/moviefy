import { NextRequest, NextResponse } from "next/server";
import type { TmdbDiscoverResponse } from "@/lib/movie-enrich-types";
import { GENRES, type Genre } from "@/lib/types";
import { tmdbGenreIdFor } from "@/lib/tmdb-genre-ids";

export const runtime = "nodejs";

const TMDB_KEY = process.env.TMDB_API_KEY;

const ALLOWED_SORT = new Set([
  "vote_average.desc",
  "popularity.desc",
  "primary_release_date.desc",
]);

function isGenre(s: string): s is Genre {
  return (GENRES as readonly string[]).includes(s);
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const genreParam = searchParams.get("genre")?.trim() ?? "";
  const sort =
    searchParams.get("sort") && ALLOWED_SORT.has(searchParams.get("sort")!)
      ? searchParams.get("sort")!
      : "popularity.desc";
  const page = Math.min(
    50,
    Math.max(1, Number(searchParams.get("page")) || 1),
  );
  const minVotes = Math.max(
    50,
    Math.min(5000, Number(searchParams.get("minVotes")) || 200),
  );

  if (!genreParam || !isGenre(genreParam)) {
    return NextResponse.json(
      { error: "Provide a valid genre query param" },
      { status: 400 },
    );
  }

  const genreId = tmdbGenreIdFor(genreParam);

  if (!TMDB_KEY) {
    const empty: TmdbDiscoverResponse = {
      configured: false,
      sort,
      results: [],
      page: 1,
      warning: "Add TMDB_API_KEY to browse by genre.",
    };
    return NextResponse.json(empty);
  }

  try {
    const u = new URL("https://api.themoviedb.org/3/discover/movie");
    u.searchParams.set("api_key", TMDB_KEY);
    u.searchParams.set("with_genres", String(genreId));
    u.searchParams.set("sort_by", sort);
    u.searchParams.set("vote_count.gte", String(minVotes));
    u.searchParams.set("vote_average.gte", "5.5");
    u.searchParams.set("page", String(page));
    u.searchParams.set("include_adult", "false");

    const res = await fetch(u.toString());
    if (!res.ok) {
      return NextResponse.json(
        { configured: true, sort, results: [], page, warning: "TMDB error" },
        { status: 502 },
      );
    }
    const data = (await res.json()) as {
      results?: TmdbDiscoverResponse["results"];
    };

    return NextResponse.json({
      configured: true,
      sort,
      results: data.results ?? [],
      page,
    } satisfies TmdbDiscoverResponse);
  } catch {
    return NextResponse.json(
      {
        configured: true,
        sort,
        results: [],
        page,
        warning: "Network error",
      } satisfies TmdbDiscoverResponse,
      { status: 502 },
    );
  }
}
