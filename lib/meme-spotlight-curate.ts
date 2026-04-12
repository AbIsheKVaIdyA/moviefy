/**
 * Editor-curated “famous moment / meme lineage” picks.
 * There is no reliable global “trending movie memes” API with TMDB links — this list
 * is the practical source of truth; rotate titles here as you like.
 */
export type MemeSpotlightCurated = {
  tmdbId: number;
  /** Short label on the card (not the film title). */
  memeTag: string;
};

export const MEME_SPOTLIGHT_CURATED: MemeSpotlightCurated[] = [
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
