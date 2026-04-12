import { NextResponse } from "next/server";
import type { TmdbDiscoverItem } from "@/lib/movie-enrich-types";
import { MEME_SPOTLIGHT_CURATED } from "@/lib/meme-spotlight-curate";
import { movieFromTmdbDiscoverItem } from "@/lib/tmdb-genre-map";
import type { Movie } from "@/lib/types";

export const runtime = "nodejs";

/** Cache TMDB lookups for this editorial rail (seconds). */
export const revalidate = 3600;

const TMDB_KEY = process.env.TMDB_API_KEY;

export type MemeSpotlightApiItem = {
  memeTag: string;
  movie: Movie;
};

export type MemeSpotlightApiResponse = {
  configured: boolean;
  items: MemeSpotlightApiItem[];
  warning?: string;
};

function detailToDiscoverItem(
  raw: Record<string, unknown>,
  tmdbId: number,
): TmdbDiscoverItem | null {
  const title = typeof raw.title === "string" ? raw.title : "";
  if (!title) return null;
  const genres = raw.genres as { id?: number }[] | undefined;
  const genre_ids =
    Array.isArray(genres) && genres.length > 0
      ? genres.map((g) => Number(g.id)).filter(Number.isFinite)
      : [];
  const poster_path =
    typeof raw.poster_path === "string" && raw.poster_path
      ? raw.poster_path
      : null;
  const release_date =
    typeof raw.release_date === "string" ? raw.release_date : "";
  const vote_average =
    typeof raw.vote_average === "number" && Number.isFinite(raw.vote_average)
      ? raw.vote_average
      : 0;
  const vote_count =
    typeof raw.vote_count === "number" && Number.isFinite(raw.vote_count)
      ? raw.vote_count
      : 0;
  const overview =
    typeof raw.overview === "string" ? raw.overview : "";
  return {
    id: tmdbId,
    title,
    release_date,
    vote_average,
    vote_count,
    poster_path,
    overview,
    genre_ids,
  };
}

export async function GET() {
  if (!TMDB_KEY) {
    const body: MemeSpotlightApiResponse = {
      configured: false,
      items: [],
      warning: "Set TMDB_API_KEY to load meme-spotlight films.",
    };
    return NextResponse.json(body);
  }

  const rows = await Promise.all(
    MEME_SPOTLIGHT_CURATED.map(async ({ tmdbId, memeTag }) => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}`,
          { next: { revalidate: 3600 } },
        );
        if (!res.ok) return null;
        const raw = (await res.json()) as Record<string, unknown>;
        const disc = detailToDiscoverItem(raw, tmdbId);
        if (!disc) return null;
        return { memeTag, movie: movieFromTmdbDiscoverItem(disc) };
      } catch {
        return null;
      }
    }),
  );

  const items = rows.filter((r): r is MemeSpotlightApiItem => r != null);
  const body: MemeSpotlightApiResponse = {
    configured: true,
    items,
    warning:
      items.length < MEME_SPOTLIGHT_CURATED.length
        ? "Some curated picks could not be loaded from TMDB."
        : undefined,
  };
  return NextResponse.json(body);
}
