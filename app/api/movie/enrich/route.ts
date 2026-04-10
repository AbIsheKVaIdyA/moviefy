import { NextRequest, NextResponse } from "next/server";
import type {
  MovieEnrichResponse,
  StreamingEntry,
  YoutubeReview,
} from "@/lib/movie-enrich-types";

const TMDB_KEY = process.env.TMDB_API_KEY;
const OMDB_KEY = process.env.OMDB_API_KEY;
const YT_KEY = process.env.YOUTUBE_API_KEY;

/** Normalize OMDb source strings to the site name users recognize. */
function canonicalRatingSource(name: string): string {
  const n = name.trim().toLowerCase();
  if (n.includes("internet movie database") || n === "imdb") return "IMDb";
  if (n.includes("rotten tomatoes")) return "Rotten Tomatoes";
  if (n.includes("metacritic")) return "Metacritic";
  return name.trim();
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") || "US";
  const title = searchParams.get("title")?.trim() || "";
  const year = searchParams.get("year")?.trim() || "";
  let tmdbId = searchParams.get("tmdbId")?.trim() || null;

  const warnings: string[] = [];

  const configured = {
    tmdb: Boolean(TMDB_KEY),
    omdb: Boolean(OMDB_KEY),
    youtube: Boolean(YT_KEY),
  };

  if (!title && !tmdbId) {
    return NextResponse.json(
      { error: "Provide title or tmdbId" },
      { status: 400 },
    );
  }

  if (!TMDB_KEY && !tmdbId) {
    warnings.push("Set TMDB_API_KEY to resolve streaming and metadata.");
  }

  if (!TMDB_KEY && tmdbId) {
    warnings.push("TMDB_API_KEY missing — cannot verify watch providers.");
  }

  let resolvedTitle = title;
  let resolvedYear = year;
  let overview: string | null = null;
  let trailerYoutubeKey: string | null = null;
  const streaming: StreamingEntry[] = [];

  async function resolveTmdbIdFromSearch(): Promise<string | null> {
    if (!TMDB_KEY || !title) return null;
    const u = new URL("https://api.themoviedb.org/3/search/movie");
    u.searchParams.set("api_key", TMDB_KEY);
    u.searchParams.set("query", title);
    if (year) u.searchParams.set("year", year);
    const res = await fetch(u.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { id: number }[] };
    const first = data.results?.[0];
    return first ? String(first.id) : null;
  }

  if (!tmdbId && TMDB_KEY) {
    const found = await resolveTmdbIdFromSearch();
    if (found) tmdbId = found;
  }

  if (tmdbId && TMDB_KEY) {
    try {
      const [detailRes, provRes, videosRes] = await Promise.all([
        fetch(
          `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}`,
        ),
        fetch(
          `https://api.themoviedb.org/3/movie/${tmdbId}/watch/providers?api_key=${TMDB_KEY}`,
        ),
        fetch(
          `https://api.themoviedb.org/3/movie/${tmdbId}/videos?api_key=${TMDB_KEY}`,
        ),
      ]);
      const detail = (await detailRes.json()) as {
        title?: string;
        release_date?: string;
        overview?: string;
      };
      const prov = (await provRes.json()) as {
        results?: Record<
          string,
          {
            flatrate?: { provider_name: string; logo_path: string | null }[];
            rent?: { provider_name: string; logo_path: string | null }[];
            buy?: { provider_name: string; logo_path: string | null }[];
          }
        >;
      };
      const videosJson = (await videosRes.json()) as {
        results?: {
          key: string;
          type: string;
          site: string;
          official?: boolean;
        }[];
      };

      if (detail.title) resolvedTitle = detail.title;
      if (detail.release_date)
        resolvedYear = detail.release_date.slice(0, 4) || resolvedYear;
      overview = detail.overview ?? null;

      const us = prov.results?.[region];
      if (us) {
        const seen = new Set<string>();
        for (const cat of ["flatrate", "rent", "buy"] as const) {
          const arr = us[cat] ?? [];
          for (const p of arr) {
            if (seen.has(p.provider_name)) continue;
            seen.add(p.provider_name);
            streaming.push({
              name: p.provider_name,
              type: cat,
              logoUrl: p.logo_path
                ? `https://image.tmdb.org/t/p/w45${p.logo_path}`
                : null,
            });
          }
        }
      }

      const yt = videosJson.results?.filter(
        (v) =>
          v.site === "YouTube" &&
          (v.type === "Trailer" || v.type === "Teaser"),
      ) ?? [];
      const officialTrailer = yt.find((v) => v.type === "Trailer" && v.official);
      const pick =
        officialTrailer ??
        yt.find((v) => v.type === "Trailer") ??
        yt[0];
      trailerYoutubeKey = pick?.key ?? null;
    } catch {
      warnings.push("TMDB request failed.");
    }
  }

  const ratings: { source: string; value: string }[] = [];
  let imdbId: string | null = null;

  if (OMDB_KEY && resolvedTitle) {
    try {
      const u = new URL("https://www.omdbapi.com/");
      u.searchParams.set("apikey", OMDB_KEY);
      u.searchParams.set("t", resolvedTitle);
      if (resolvedYear) u.searchParams.set("y", resolvedYear);
      const ores = await fetch(u.toString());
      const odata = (await ores.json()) as {
        Response?: string;
        Ratings?: { Source: string; Value: string }[];
        imdbRating?: string;
        imdbID?: string;
      };
      if (odata.Response === "True") {
        imdbId = odata.imdbID ?? null;
        const fromApi = odata.Ratings ?? [];
        const seen = new Set<string>();
        for (const r of fromApi) {
          const label = canonicalRatingSource(r.Source);
          const key = label.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          ratings.push({ source: label, value: r.Value });
        }
        if (
          odata.imdbRating &&
          odata.imdbRating !== "N/A" &&
          !seen.has("imdb")
        ) {
          ratings.unshift({
            source: "IMDb",
            value: `${odata.imdbRating}/10`,
          });
        }
      }
    } catch {
      warnings.push("OMDb request failed.");
    }
  } else if (!OMDB_KEY) {
    warnings.push(
      "Add OMDB_API_KEY to show each site’s score (IMDb, Rotten Tomatoes, Metacritic) when available.",
    );
  }

  const youtubeReviews: YoutubeReview[] = [];

  if (YT_KEY && resolvedTitle) {
    const runSearch = async (q: string) => {
      const u = new URL("https://www.googleapis.com/youtube/v3/search");
      u.searchParams.set("part", "snippet");
      u.searchParams.set("type", "video");
      u.searchParams.set("maxResults", "6");
      u.searchParams.set("q", q);
      u.searchParams.set("key", YT_KEY);
      const res = await fetch(u.toString());
      return (await res.json()) as {
        items?: {
          id: { videoId?: string };
          snippet: {
            title: string;
            channelTitle: string;
            thumbnails?: {
              medium?: { url: string };
              default?: { url: string };
            };
          };
        }[];
      };
    };

    try {
      const queries = [
        `${resolvedTitle} ${resolvedYear} movie review`,
        `${resolvedTitle} review no spoilers`,
        `Jeremy Jahns ${resolvedTitle}`,
      ];
      const seen = new Set<string>();
      for (const q of queries) {
        const data = await runSearch(q);
        for (const item of data.items ?? []) {
          const vid = item.id.videoId;
          if (!vid || seen.has(vid)) continue;
          seen.add(vid);
          youtubeReviews.push({
            videoId: vid,
            title: item.snippet.title,
            channelTitle: item.snippet.channelTitle,
            thumbnail:
              item.snippet.thumbnails?.medium?.url ??
              item.snippet.thumbnails?.default?.url ??
              null,
          });
          if (youtubeReviews.length >= 12) break;
        }
        if (youtubeReviews.length >= 12) break;
      }
    } catch {
      warnings.push("YouTube API request failed.");
    }
  } else {
    warnings.push("Set YOUTUBE_API_KEY for embedded review suggestions.");
  }

  const fallbackYoutubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    `${resolvedTitle} ${resolvedYear} movie review`,
  )}`;

  const body: MovieEnrichResponse = {
    configured,
    tmdbId: tmdbId ? Number(tmdbId) : null,
    title: resolvedTitle,
    year: resolvedYear,
    overview,
    ratings,
    imdbId,
    streaming,
    youtubeReviews,
    fallbackYoutubeSearchUrl,
    trailerYoutubeKey,
    warnings,
  };

  return NextResponse.json(body);
}
