import { NextRequest, NextResponse } from "next/server";
import type { TmdbDiscoverItem } from "@/lib/movie-enrich-types";
import type { StreamingHighlightRail } from "@/lib/explore-streaming-types";

export const runtime = "nodejs";

const TMDB_KEY = process.env.TMDB_API_KEY;

const RAILS: Omit<StreamingHighlightRail, "results">[] = [
  {
    id: "netflix",
    label: "Trending on Netflix",
    accent: "netflix",
    providerId: 8,
  },
  {
    id: "prime",
    label: "Trending on Prime Video",
    accent: "prime",
    providerId: 9,
  },
  {
    id: "hulu",
    label: "Trending on Hulu",
    accent: "hulu",
    providerId: 15,
  },
  {
    id: "disney",
    label: "Trending on Disney+",
    accent: "disney",
    providerId: 337,
  },
];

async function discoverForProvider(
  providerId: number,
  watchRegion: string,
): Promise<TmdbDiscoverItem[]> {
  if (!TMDB_KEY) return [];
  const u = new URL("https://api.themoviedb.org/3/discover/movie");
  u.searchParams.set("api_key", TMDB_KEY);
  u.searchParams.set("with_watch_providers", String(providerId));
  u.searchParams.set("watch_region", watchRegion);
  u.searchParams.set("sort_by", "popularity.desc");
  u.searchParams.set("vote_count.gte", "40");
  u.searchParams.set("page", "1");
  u.searchParams.set("include_adult", "false");
  const res = await fetch(u.toString());
  if (!res.ok) return [];
  const json = (await res.json()) as { results?: TmdbDiscoverItem[] };
  return (json.results ?? []).slice(0, 14);
}

/** Batched TMDB discover-by-provider calls for Explore streaming rows. */
export async function GET(request: NextRequest) {
  if (!TMDB_KEY) {
    return NextResponse.json({
      configured: false,
      rails: RAILS.map((r) => ({ ...r, results: [] as TmdbDiscoverItem[] })),
      warning: "Add TMDB_API_KEY to load streaming highlights.",
    });
  }

  const region =
    request.nextUrl.searchParams.get("region")?.trim().toUpperCase() || "US";

  try {
    const rails: StreamingHighlightRail[] = await Promise.all(
      RAILS.map(async (meta) => ({
        ...meta,
        results: await discoverForProvider(meta.providerId, region),
      })),
    );
    return NextResponse.json({ configured: true, rails, watchRegion: region });
  } catch {
    return NextResponse.json({
      configured: true,
      rails: RAILS.map((r) => ({ ...r, results: [] as TmdbDiscoverItem[] })),
      warning: "Network error loading streaming highlights.",
    });
  }
}
