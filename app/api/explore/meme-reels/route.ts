import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import type { TmdbDiscoverItem } from "@/lib/movie-enrich-types";
import { MEME_REEL_SEEDS } from "@/lib/meme-reels-seed";
import { movieFromTmdbDiscoverItem } from "@/lib/tmdb-genre-map";
import type { MemeReelApiItem, MemeReelsApiResponse } from "@/lib/meme-reels-types";

export const runtime = "nodejs";

/** Response is built inside unstable_cache (12h revalidate). */
export const revalidate = 0;

const TMDB_KEY = process.env.TMDB_API_KEY?.trim();

function resolveYoutubeDataApiKey(): string {
  const candidates = [
    process.env.YOUTUBE_API_KEY,
    process.env.YOUTUBE_DATA_API_KEY,
    process.env.GOOGLE_API_KEY,
  ];
  for (const c of candidates) {
    const t = c?.trim();
    if (t) return t;
  }
  return "";
}

const YT_KEY = resolveYoutubeDataApiKey();

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
  const overview = typeof raw.overview === "string" ? raw.overview : "";
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

type YtClip = {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string | null;
};

async function searchYoutubeClip(
  query: string,
  videoDuration?: "short" | "medium" | "long",
): Promise<{ clip: YtClip | null; error?: string }> {
  if (!YT_KEY) return { clip: null, error: "No YouTube API key" };
  const u = new URL("https://www.googleapis.com/youtube/v3/search");
  u.searchParams.set("part", "snippet");
  u.searchParams.set("type", "video");
  u.searchParams.set("maxResults", "8");
  u.searchParams.set("q", query);
  if (videoDuration) u.searchParams.set("videoDuration", videoDuration);
  u.searchParams.set("key", YT_KEY);
  const res = await fetch(u.toString());
  const data = (await res.json()) as {
    error?: { message?: string };
    items?: YtSearchItem[];
  };
  if (data.error?.message) {
    return { clip: null, error: data.error.message };
  }
  if (!res.ok) {
    return { clip: null, error: `YouTube HTTP ${res.status}` };
  }
  if (!data.items?.length) {
    return { clip: null, error: "No videos for this query" };
  }
  for (const item of data.items) {
    const vid = item.id.videoId;
    if (!vid) continue;
    return {
      clip: {
        videoId: vid,
        title: item.snippet.title,
        channelTitle: item.snippet.channelTitle,
        thumbnail:
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ??
          null,
      },
    };
  }
  return { clip: null, error: "No videoId in results" };
}

async function searchYoutubeClipForMeme(
  title: string,
  year: string,
  memeTag: string,
): Promise<{ clip: YtClip | null; lastError?: string }> {
  const y = year.trim();
  const titled = `${title}${y ? ` ${y}` : ""}`.replace(/\s+/g, " ").trim();
  /** Up to 5 search.list calls per seed; stops at first hit (cache is 12h). */
  const tries: [string, "short" | "medium" | "long" | undefined][] = [
    [`${titled} ${memeTag}`, "short"],
    [`${title} ${memeTag} movie`, "medium"],
    [`${title} ${memeTag} scene`, undefined],
    [`${memeTag} ${title}`, "short"],
    [`${title} ${memeTag}`, undefined],
  ];
  let lastError: string | undefined;
  for (const [q, d] of tries) {
    if (!q.trim()) continue;
    const { clip, error } = await searchYoutubeClip(q, d);
    if (clip) return { clip };
    if (error) lastError = error;
  }
  return { clip: null, lastError };
}

async function buildMemeReels(): Promise<MemeReelsApiResponse> {
  const configured = {
    tmdb: Boolean(TMDB_KEY),
    youtube: Boolean(YT_KEY),
  };

  if (!TMDB_KEY) {
    return {
      configured,
      items: [],
      warning: "Set TMDB_API_KEY to resolve films for meme reels.",
    };
  }

  if (!YT_KEY) {
    return {
      configured,
      items: [],
      warning:
        "Set YOUTUBE_API_KEY (or YOUTUBE_DATA_API_KEY / GOOGLE_API_KEY) to load YouTube Short-style clips via the Data API.",
    };
  }

  let lastYoutubeError: string | undefined;

  const rows = await Promise.all(
    MEME_REEL_SEEDS.map(async ({ tmdbId, memeTag }) => {
      try {
        const res = await fetch(
          `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${TMDB_KEY}`,
        );
        if (!res.ok) return null;
        const raw = (await res.json()) as Record<string, unknown>;
        const disc = detailToDiscoverItem(raw, tmdbId);
        if (!disc) return null;
        const movie = movieFromTmdbDiscoverItem(disc);
        const year =
          movie.year != null && Number.isFinite(movie.year)
            ? String(movie.year)
            : "";
        const { clip, lastError } = await searchYoutubeClipForMeme(
          movie.title,
          year,
          memeTag,
        );
        if (lastError) lastYoutubeError = lastError;
        if (!clip) return null;
        return {
          videoId: clip.videoId,
          videoTitle: clip.title,
          channelTitle: clip.channelTitle,
          thumbnail: clip.thumbnail,
          memeTag,
          movie,
        } satisfies MemeReelApiItem;
      } catch {
        return null;
      }
    }),
  );

  const items = rows.filter((r): r is MemeReelApiItem => r != null);
  let warning: string | undefined;
  let emptyHint: string | undefined;
  if (items.length === 0) {
    if (lastYoutubeError) {
      emptyHint = lastYoutubeError;
      warning =
        "TMDB and YouTube keys are set, but no reels loaded. Usually: YouTube Data API quota, Search not enabled for the key, or searches returned no videos. Details below.";
    } else {
      warning =
        "No reels loaded: TMDB titles resolved but every YouTube search returned no clips. Try simpler memeTag lines in lib/meme-reels-seed.ts.";
    }
  } else if (items.length < MEME_REEL_SEEDS.length) {
    warning = `Loaded ${items.length} of ${MEME_REEL_SEEDS.length} reels — you can add more specific memeTag lines for the misses.`;
  }

  return { configured, items, warning, emptyHint };
}

const getCachedMemeReels = unstable_cache(
  async () => buildMemeReels(),
  ["explore-meme-reels-v5"],
  { revalidate: 43200 },
);

export async function GET() {
  const body = await getCachedMemeReels();
  return NextResponse.json(body);
}
