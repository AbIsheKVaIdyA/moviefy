import type { Genre } from "@/lib/types";
import { GENRES } from "@/lib/types";
import type { TmdbDiscoverItem } from "@/lib/movie-enrich-types";

export const PICK_FOR_ME_ERAS = [
  "any",
  "2020s",
  "2010s",
  "2000s",
  "1990s",
  "classics",
] as const;

export type PickForMeEra = (typeof PICK_FOR_ME_ERAS)[number];

export const PICK_FOR_ME_VIBES = ["crowd", "critics", "wild"] as const;
export type PickForMeVibe = (typeof PICK_FOR_ME_VIBES)[number];

export const PICK_FOR_ME_VIBE_LABEL: Record<PickForMeVibe, string> = {
  crowd: "Crowd favorites",
  critics: "Critics' darlings",
  wild: "Wild card mix",
};

export const PICK_FOR_ME_ERA_LABEL: Record<PickForMeEra, string> = {
  any: "Any era",
  "2020s": "2020s",
  "2010s": "2010s",
  "2000s": "2000s",
  "1990s": "1990s",
  classics: "Classics (1950–1989)",
};

/** ISO 639-1 — TMDB `with_original_language`. */
export const PICK_FOR_ME_LANGUAGES: { code: string; label: string }[] = [
  { code: "", label: "Any language" },
  { code: "en", label: "English" },
  { code: "hi", label: "Hindi" },
  { code: "ta", label: "Tamil" },
  { code: "te", label: "Telugu" },
  { code: "ml", label: "Malayalam" },
  { code: "kn", label: "Kannada" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "ja", label: "Japanese" },
  { code: "ko", label: "Korean" },
  { code: "zh", label: "Chinese" },
  { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" },
];

export type PickForMeRequest = {
  genres: Genre[];
  language: string;
  era: PickForMeEra;
  vibe: PickForMeVibe;
  /** Optional; interpreted on the server when `GEMINI_API_KEY` is set. */
  prompt?: string;
};

export function isGenre(s: string): s is Genre {
  return (GENRES as readonly string[]).includes(s);
}

export function eraToReleaseRange(era: PickForMeEra): {
  gte?: string;
  lte?: string;
} {
  switch (era) {
    case "2020s":
      return { gte: "2020-01-01", lte: "2029-12-31" };
    case "2010s":
      return { gte: "2010-01-01", lte: "2019-12-31" };
    case "2000s":
      return { gte: "2000-01-01", lte: "2009-12-31" };
    case "1990s":
      return { gte: "1990-01-01", lte: "1999-12-31" };
    case "classics":
      return { gte: "1950-01-01", lte: "1989-12-31" };
    default:
      return {};
  }
}

function jaccardGenreIds(a: number[], b: number[]): number {
  const sa = new Set(a);
  let inter = 0;
  for (const x of b) {
    if (sa.has(x)) inter++;
  }
  const uni = new Set([...a, ...b]).size;
  return uni ? inter / uni : 0;
}

function scoreItem(item: TmdbDiscoverItem, vibe: PickForMeVibe): number {
  const pop = item.popularity ?? 0;
  const v = item.vote_average ?? 0;
  const vc = item.vote_count ?? 0;
  if (vibe === "critics") {
    return v * Math.log1p(vc) * (vc >= 200 ? 1 : 0.5);
  }
  if (vibe === "wild") {
    const salt = ((item.id % 1000) + 1) / 1000;
    return salt * v * Math.sqrt(pop + 1);
  }
  return pop * (v / 10) * Math.log1p(vc + 1);
}

/** Rank then greedily diversify by genre overlap; fill to 5. */
export function pickFiveDiverse(
  items: TmdbDiscoverItem[],
  vibe: PickForMeVibe,
): TmdbDiscoverItem[] {
  const pool = items.filter(
    (m) =>
      m.poster_path &&
      (m.vote_count ?? 0) >= (vibe === "critics" ? 400 : 120) &&
      (m.vote_average ?? 0) >= 5.4,
  );
  if (!pool.length) return [];

  const ranked = [...pool].sort((a, b) => scoreItem(b, vibe) - scoreItem(a, vibe));

  const picked: TmdbDiscoverItem[] = [];
  const used = new Set<number>();

  for (const item of ranked) {
    if (picked.length >= 5) break;
    if (used.has(item.id)) continue;
    const overlap = picked.some(
      (p) => jaccardGenreIds(p.genre_ids ?? [], item.genre_ids ?? []) > 0.62,
    );
    if (!overlap || picked.length < 2) {
      picked.push(item);
      used.add(item.id);
    }
  }

  for (const item of ranked) {
    if (picked.length >= 5) break;
    if (!used.has(item.id)) {
      picked.push(item);
      used.add(item.id);
    }
  }

  return picked.slice(0, 5);
}
