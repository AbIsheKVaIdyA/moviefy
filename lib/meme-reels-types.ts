import type { Movie } from "@/lib/types";

export type MemeReelApiItem = {
  videoId: string;
  videoTitle: string;
  channelTitle: string;
  thumbnail: string | null;
  memeTag: string;
  movie: Movie;
};

export type MemeReelsApiResponse = {
  configured: { tmdb: boolean; youtube: boolean };
  items: MemeReelApiItem[];
  warning?: string;
};
