import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import type { MemeReelsApiResponse } from "@/lib/meme-reels-types";

export const runtime = "nodejs";
export const revalidate = 0;

const getComingSoon = unstable_cache(
  async (): Promise<MemeReelsApiResponse> => ({
    configured: {
      tmdb: Boolean(process.env.TMDB_API_KEY?.trim()),
      youtube: Boolean(
        process.env.YOUTUBE_API_KEY?.trim() ||
          process.env.YOUTUBE_DATA_API_KEY?.trim() ||
          process.env.GOOGLE_API_KEY?.trim(),
      ),
    },
    items: [],
    warning:
      "Meme reels is coming soon — we're polishing the cut. Movie pages already have trailers and video picks.",
  }),
  ["explore-meme-reels-coming-soon-v2"],
  { revalidate: 86400 },
);

export async function GET() {
  const body = await getComingSoon();
  return NextResponse.json(body);
}
