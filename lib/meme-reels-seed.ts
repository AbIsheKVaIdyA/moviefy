/**
 * Editorial seeds: TMDB film + meme hook. The server resolves each row to a
 * YouTube **Data API** search (`videoDuration=short`) — no HTML scraping.
 * Tune queries here; cache TTL is long to save quota.
 */
export type MemeReelSeed = {
  tmdbId: number;
  /** Shown on the reel card; also used in the YouTube search query. */
  memeTag: string;
};

export const MEME_REEL_SEEDS: MemeReelSeed[] = [
  { tmdbId: 694, memeTag: "Here's Johnny" },
  { tmdbId: 597, memeTag: "King of the world" },
  { tmdbId: 1891, memeTag: "I am your father" },
  { tmdbId: 603, memeTag: "Bullet time" },
  { tmdbId: 218, memeTag: "I'll be back" },
  { tmdbId: 27205, memeTag: "Dream heist" },
  { tmdbId: 155, memeTag: "Why so serious?" },
  { tmdbId: 807, memeTag: "What's in the box?" },
  { tmdbId: 680, memeTag: "Royale w/ cheese" },
  { tmdbId: 78, memeTag: "Tears in rain" },
];
