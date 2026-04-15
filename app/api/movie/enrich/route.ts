import { NextRequest, NextResponse } from "next/server";
import type {
  MovieEnrichOmdbInfo,
  MovieEnrichResponse,
  StreamingEntry,
  TmdbCastMember,
  YoutubeReview,
} from "@/lib/movie-enrich-types";
import {
  tmdbBackdropUrl as buildTmdbBackdropUrl,
  tmdbProfileUrl,
} from "@/lib/tmdb-image";
import {
  resolveYoutubeDataApiKey,
  youtubeServerKeyHint,
} from "@/lib/resolve-youtube-data-api-key";

/** Server-side secrets (OMDB_API_KEY, TMDB_API_KEY, …) — set in Vercel env, not NEXT_PUBLIC_. */
export const runtime = "nodejs";

/** YouTube error messages sometimes include HTML links; UI renders plain text only. */
function stripApiHtmlMessage(message: string): string {
  return message
    .replace(/<[^>]*>/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Drop trailers, Shorts, “full movie” uploads, clip dumps — keep review-style videos. */
function isYoutubeNonReviewNoise(videoTitle: string): boolean {
  const t = videoTitle.toLowerCase();
  if (/#shorts?\b/.test(t)) return true;
  if (/\btrailer\b/.test(t) || /\bteasers?\b/.test(t)) return true;
  if (/\btw\s*spots?\b/.test(t)) return true;
  if (/\b(full|complete|entire)\s*(movie|film)\b/.test(t)) return true;
  if (/\bwatch\s+(the\s+)?(full|entire)\b/.test(t)) return true;
  if (/\b(behind\s+the\s+scenes|making\s+of)\b/.test(t) && !/\breview\b/.test(t))
    return true;
  if (
    /\b(all|best|top\s+\d+|every)\s+(scenes?|moments?|fights?|kills?|lines?)\b/.test(t) &&
    !/\breview\b/.test(t)
  )
    return true;
  if (/\bclip\s*(compilation|edit|showcase|montage)\b/.test(t) && !/\breview\b/.test(t))
    return true;
  if (/\bfan\s*edit\b/.test(t) && !/\breview\b/.test(t)) return true;
  if (/\bmusic\s*video\b|\bsoundtrack\s*(video|mix)\b/.test(t)) return true;
  if (/\bcompilation\b/.test(t) && !/\breview\b/.test(t) && !/\breact\b/.test(t))
    return true;
  if (/\breel(s)?\b/.test(t) && !/\breview\b/.test(t)) return true;
  return false;
}

/** Prefer titles that read like reviews / reactions (API order is viewCount). */
function youtubeReviewTitleBias(videoTitle: string): number {
  const t = videoTitle.toLowerCase();
  let n = 0;
  if (/\breviews?\b/.test(t)) n += 5;
  if (/\b(no\s*)?spoilers?\b/.test(t)) n += 2;
  if (/\breact(ion|ing)?s?\b/.test(t)) n += 2;
  if (/\bbreakdown\b/.test(t)) n += 2;
  if (/\bafter\s+watching\b/.test(t)) n += 2;
  if (/\bcritic(al)?\b/.test(t)) n += 1;
  if (/\bexplained\b/.test(t)) n += 1;
  if (/\bthoughts?\b/.test(t)) n += 1;
  if (/\bworth\s+(it|watching)\b/.test(t)) n += 1;
  return n;
}

/** Normalize OMDb source strings to the site name users recognize. */
function canonicalRatingSource(name: string): string {
  const n = name.trim().toLowerCase();
  if (n.includes("internet movie database") || n === "imdb") return "IMDb";
  if (n.includes("rotten tomatoes")) return "Rotten Tomatoes";
  if (n.includes("metacritic")) return "Metacritic";
  return name.trim();
}

/**
 * Provider-first outbound links (prefer direct provider search pages over TMDB/JustWatch).
 * These are best-effort patterns; exact title deep-links usually require partner APIs.
 */
function providerDirectWatchUrl(
  providerName: string,
  title: string,
  year: string,
): string | null {
  const q = `${title} ${year}`.trim();
  const query = encodeURIComponent(q);
  const n = providerName.trim().toLowerCase();

  if (n.includes("prime")) {
    return `https://www.primevideo.com/search/ref=atv_nb_sr?phrase=${query}`;
  }
  if (n.includes("netflix")) {
    return `https://www.netflix.com/search?q=${query}`;
  }
  if (n.includes("disney")) {
    return `https://www.disneyplus.com/search/${query}`;
  }
  if (n === "hulu" || n.includes("hulu")) {
    return `https://www.hulu.com/search?q=${query}`;
  }
  if (n === "max" || n.includes("hbo max") || n.includes("max amazon channel")) {
    return `https://play.max.com/search?q=${query}`;
  }
  if (n.includes("apple tv")) {
    return `https://tv.apple.com/search?term=${query}`;
  }
  if (n.includes("youtube")) {
    return `https://www.youtube.com/results?search_query=${query}`;
  }
  if (n.includes("google play")) {
    return `https://play.google.com/store/search?q=${query}&c=movies`;
  }
  if (n.includes("jiohotstar") || n.includes("hotstar")) {
    return `https://www.hotstar.com/in/search?q=${query}`;
  }
  if (n.includes("zee5")) {
    return `https://www.zee5.com/search?query=${query}`;
  }
  if (n.includes("sony liv") || n.includes("sonyliv")) {
    return `https://www.sonyliv.com/search/${query}`;
  }
  if (n.includes("mx player")) {
    return `https://www.mxplayer.in/search?query=${query}`;
  }
  return null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region") || "US";
  const title = searchParams.get("title")?.trim() || "";
  const year = searchParams.get("year")?.trim() || "";
  let tmdbId = searchParams.get("tmdbId")?.trim() || null;
  const tmdbMedia = searchParams.get("media") === "tv" ? "tv" : "movie";

  const tmdbKey = process.env.TMDB_API_KEY?.trim() || "";
  const omdbKey = process.env.OMDB_API_KEY?.trim() || "";
  const ytKey = resolveYoutubeDataApiKey();

  const warnings: string[] = [];

  const configured = {
    tmdb: Boolean(tmdbKey),
    omdb: Boolean(omdbKey),
    youtube: Boolean(ytKey),
  };

  if (!title && !tmdbId) {
    return NextResponse.json(
      { error: "Provide title or tmdbId" },
      { status: 400 },
    );
  }

  if (!tmdbKey && !tmdbId) {
    warnings.push("Set TMDB_API_KEY to resolve streaming and metadata.");
  }

  if (!tmdbKey && tmdbId) {
    warnings.push("TMDB_API_KEY missing — cannot verify watch providers.");
  }

  let resolvedTitle = title;
  let resolvedYear = year;
  let overview: string | null = null;
  let tmdbVoteAverage: number | null = null;
  let tmdbVoteCount: number | null = null;
  let tmdbGenres: { id: number; name: string }[] = [];
  let runtimeMinutes: number | null = null;
  let tmdbBackdropUrl: string | null = null;
  let trailerYoutubeKey: string | null = null;
  let tmdbCast: TmdbCastMember[] = [];
  const streaming: StreamingEntry[] = [];

  async function resolveTmdbIdFromSearch(): Promise<string | null> {
    if (!tmdbKey || !title) return null;
    const u = new URL("https://api.themoviedb.org/3/search/movie");
    u.searchParams.set("api_key", tmdbKey);
    u.searchParams.set("query", title);
    if (year) u.searchParams.set("year", year);
    const res = await fetch(u.toString());
    if (!res.ok) return null;
    const data = (await res.json()) as { results?: { id: number }[] };
    const first = data.results?.[0];
    return first ? String(first.id) : null;
  }

  if (!tmdbId && tmdbKey) {
    const found = await resolveTmdbIdFromSearch();
    if (found) tmdbId = found;
  }

  if (tmdbId && tmdbKey) {
    try {
      const pathBase =
        tmdbMedia === "tv" ? `tv/${tmdbId}` : `movie/${tmdbId}`;
      const [detailRes, provRes, videosRes, creditsRes] = await Promise.all([
        fetch(
          `https://api.themoviedb.org/3/${pathBase}?api_key=${tmdbKey}`,
        ),
        fetch(
          `https://api.themoviedb.org/3/${pathBase}/watch/providers?api_key=${tmdbKey}`,
        ),
        fetch(
          `https://api.themoviedb.org/3/${pathBase}/videos?api_key=${tmdbKey}`,
        ),
        fetch(
          `https://api.themoviedb.org/3/${pathBase}/credits?api_key=${tmdbKey}`,
        ),
      ]);
      const detail = (await detailRes.json()) as {
        title?: string;
        name?: string;
        release_date?: string;
        first_air_date?: string;
        overview?: string;
        vote_average?: number;
        vote_count?: number;
        genres?: { id?: number; name?: string }[];
        runtime?: number;
        episode_run_time?: number[];
        backdrop_path?: string | null;
      };
      const prov = (await provRes.json()) as {
        results?: Record<
          string,
          {
            link?: string;
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

      if (creditsRes.ok) {
        const credits = (await creditsRes.json()) as {
          cast?: {
            name?: string;
            character?: string;
            profile_path?: string | null;
            order?: number;
          }[];
        };
        const raw = credits.cast ?? [];
        const sorted = [...raw].sort(
          (a, b) => (a.order ?? 999) - (b.order ?? 999),
        );
        tmdbCast = sorted
          .filter((c) => c?.name && String(c.name).trim().length > 0)
          .slice(0, 18)
          .map((c) => ({
            name: String(c.name).trim(),
            character:
              typeof c.character === "string" && c.character.trim()
                ? c.character.trim()
                : null,
            profileUrl: tmdbProfileUrl(c.profile_path ?? null, "w185"),
          }));
      }

      if (detail.title) resolvedTitle = detail.title;
      else if (detail.name) resolvedTitle = detail.name;
      const primaryDate = detail.release_date ?? detail.first_air_date;
      if (primaryDate)
        resolvedYear = primaryDate.slice(0, 4) || resolvedYear;
      overview = detail.overview ?? null;
      if (typeof detail.vote_average === "number") tmdbVoteAverage = detail.vote_average;
      if (typeof detail.vote_count === "number") tmdbVoteCount = detail.vote_count;
      if (Array.isArray(detail.genres)) {
        tmdbGenres = detail.genres
          .filter(
            (g): g is { id: number; name: string } =>
              g != null &&
              typeof g.id === "number" &&
              typeof g.name === "string" &&
              g.name.length > 0,
          )
          .map((g) => ({ id: g.id, name: g.name }));
      }
      if (typeof detail.runtime === "number" && detail.runtime > 0) {
        runtimeMinutes = detail.runtime;
      } else if (
        tmdbMedia === "tv" &&
        Array.isArray(detail.episode_run_time) &&
        detail.episode_run_time.length
      ) {
        const nums = detail.episode_run_time.filter(
          (n) => typeof n === "number" && n > 0,
        );
        if (nums.length) {
          runtimeMinutes = Math.round(
            nums.reduce((a, b) => a + b, 0) / nums.length,
          );
        }
      }
      tmdbBackdropUrl = buildTmdbBackdropUrl(detail.backdrop_path ?? null, "w1280");

      const us = prov.results?.[region];
      if (us) {
        const tmdbWatchFallback = typeof us.link === "string" && us.link.trim().length > 0
          ? us.link.trim()
          : null;
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
              watchUrl:
                providerDirectWatchUrl(p.provider_name, resolvedTitle, resolvedYear) ??
                tmdbWatchFallback,
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
  let omdb: MovieEnrichOmdbInfo | null = null;

  if (omdbKey && resolvedTitle) {
    type OmdbJson = {
      Response?: string;
      Error?: string;
      Ratings?: { Source: string; Value: string }[];
      imdbRating?: string;
      imdbID?: string;
      Metascore?: string;
      tomatoMeter?: string;
      tomatoUserMeter?: string;
    };

    const fetchOmdb = async (withYear: boolean): Promise<OmdbJson> => {
      const u = new URL("https://www.omdbapi.com/");
      u.searchParams.set("apikey", omdbKey);
      u.searchParams.set("t", resolvedTitle);
      u.searchParams.set("tomatoes", "true");
      if (tmdbMedia === "tv") u.searchParams.set("type", "series");
      if (withYear && resolvedYear) u.searchParams.set("y", resolvedYear);
      const ores = await fetch(u.toString());
      return (await ores.json()) as OmdbJson;
    };

    try {
      let odata = await fetchOmdb(true);
      if (odata.Response !== "True" && resolvedYear) {
        odata = await fetchOmdb(false);
      }

      if (odata.Response === "True") {
        omdb = { matched: true, notice: null };
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
          seen.add("imdb");
        }
        if (odata.Metascore && odata.Metascore !== "N/A" && !seen.has("metacritic")) {
          ratings.push({
            source: "Metacritic",
            value: `${odata.Metascore}/100`,
          });
          seen.add("metacritic");
        }
        if (odata.tomatoMeter && odata.tomatoMeter !== "N/A" && !seen.has("rotten tomatoes")) {
          ratings.push({
            source: "Rotten Tomatoes",
            value: `${odata.tomatoMeter}%`,
          });
          seen.add("rotten tomatoes");
        }
        if (
          odata.tomatoUserMeter &&
          odata.tomatoUserMeter !== "N/A" &&
          !seen.has("rotten tomatoes (audience)")
        ) {
          ratings.push({
            source: "Rotten Tomatoes (audience)",
            value: `${odata.tomatoUserMeter}%`,
          });
          seen.add("rotten tomatoes (audience)");
        }
        if (ratings.length === 0) {
          omdb.notice =
            "Matched on OMDb—no score rows yet (normal for new/indie). TMDB audience below.";
        }
      } else {
        const err =
          typeof odata.Error === "string" && odata.Error.trim()
            ? odata.Error.trim()
            : "Movie not found!";
        omdb = { matched: false, notice: err };
      }
    } catch {
      warnings.push("OMDb request failed.");
      omdb = {
        matched: false,
        notice: "OMDb request failed. Check the key and try again.",
      };
    }
  } else if (!omdbKey) {
    warnings.push(
      "Add OMDB_API_KEY to show each site’s score (IMDb, Rotten Tomatoes, Metacritic) when available.",
    );
  }

  const youtubeReviews: YoutubeReview[] = [];

  if (ytKey && resolvedTitle) {
    type YtSearchItem = {
      id: { videoId?: string };
      snippet: {
        title: string;
        channelTitle: string;
        thumbnails?: {
          medium?: { url: string };
          default?: { url: string };
        };
      };
    };

    const runSearch = async (
      q: string,
    ): Promise<{ items: YtSearchItem[]; apiError?: string }> => {
      const u = new URL("https://www.googleapis.com/youtube/v3/search");
      u.searchParams.set("part", "snippet");
      u.searchParams.set("type", "video");
      /** Pull extra rows; we filter to real reviews and take 3 (same quota as smaller max). */
      u.searchParams.set("maxResults", "15");
      u.searchParams.set("order", "viewCount");
      u.searchParams.set("videoEmbeddable", "true");
      u.searchParams.set("q", q);
      u.searchParams.set("key", ytKey);
      const res = await fetch(u.toString());
      const data = (await res.json()) as {
        error?: { message?: string };
        items?: YtSearchItem[];
      };
      if (!res.ok || data.error) {
        const msg =
          data.error?.message ??
          (!res.ok ? `HTTP ${res.status}` : "YouTube API error");
        return { items: [], apiError: msg };
      }
      return { items: data.items ?? [] };
    };

    try {
      let loggedYtApiError = false;
      let stopYoutubeSearches = false;
      const noteYtError = (msg: string | undefined) => {
        if (!msg || loggedYtApiError) return;
        const plain = stripApiHtmlMessage(msg);
        const quota = plain.toLowerCase().includes("quota");
        let line = `YouTube: ${plain}`;
        if (quota) {
          line +=
            " Each search.list call uses about 100 quota units. Default is 10,000 units/day per Google project (separate from GCP billing credits). Check usage under Google Cloud → APIs & Services → YouTube Data API v3 → Quotas; you can request a higher limit there.";
        }
        const restrictionHint = youtubeServerKeyHint(plain);
        if (restrictionHint) line += restrictionHint;
        warnings.push(line);
        loggedYtApiError = true;
        stopYoutubeSearches = true;
      };

      /**
       * Single search.list call (~100 quota). Query discourages trailers/Shorts; we also
       * drop TMDB’s trailer id, title noise, and rank toward “review” phrasing.
       */
      const safeTitle = resolvedTitle.replace(/"/g, "'").trim();
      const quoted = safeTitle ? `"${safeTitle}"` : resolvedTitle.trim();
      const reviewQuery =
        tmdbMedia === "tv"
          ? `${quoted} ${resolvedYear} review -trailer -teaser -shorts`
          : `${quoted} ${resolvedYear} review -trailer -teaser -shorts`;
      const seenReviews = new Set<string>();
      if (!stopYoutubeSearches) {
        const { items, apiError } = await runSearch(reviewQuery);
        if (apiError) {
          noteYtError(apiError);
        } else {
          const trailerKey = trailerYoutubeKey?.trim() || null;
          const candidates = items
            .map((item, idx) => ({ item, idx }))
            .filter(({ item }) => {
              const vid = item.id.videoId;
              if (!vid) return false;
              if (trailerKey && vid === trailerKey) return false;
              if (isYoutubeNonReviewNoise(item.snippet.title)) return false;
              return true;
            })
            .sort(
              (a, b) =>
                youtubeReviewTitleBias(b.item.snippet.title) -
                  youtubeReviewTitleBias(a.item.snippet.title) ||
                a.idx - b.idx,
            );
          for (const { item } of candidates) {
            const vid = item.id.videoId;
            if (!vid || seenReviews.has(vid)) continue;
            seenReviews.add(vid);
            youtubeReviews.push({
              videoId: vid,
              title: item.snippet.title,
              channelTitle: item.snippet.channelTitle,
              thumbnail:
                item.snippet.thumbnails?.medium?.url ??
                item.snippet.thumbnails?.default?.url ??
                null,
            });
            if (youtubeReviews.length >= 3) break;
          }
        }
      }

    } catch {
      warnings.push("YouTube API request failed.");
    }
  } else if (!ytKey) {
    warnings.push(
      "Set YOUTUBE_API_KEY (server env) for embedded YouTube picks. You can also use YOUTUBE_DATA_API_KEY or GOOGLE_API_KEY.",
    );
  }

  const fallbackYoutubeSearchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(
    tmdbMedia === "tv"
      ? `"${resolvedTitle}" ${resolvedYear} review -trailer -shorts`
      : `"${resolvedTitle}" ${resolvedYear} review -trailer -shorts`,
  )}`;
  const body: MovieEnrichResponse = {
    configured,
    tmdbId: tmdbId ? Number(tmdbId) : null,
    title: resolvedTitle,
    year: resolvedYear,
    overview,
    tmdbVoteAverage,
    tmdbVoteCount,
    tmdbGenres,
    runtimeMinutes,
    ratings,
    imdbId,
    streaming,
    youtubeReviews,
    fallbackYoutubeSearchUrl,
    trailerYoutubeKey,
    tmdbBackdropUrl,
    tmdbCast,
    warnings,
    omdb,
  };

  return NextResponse.json(body);
}
