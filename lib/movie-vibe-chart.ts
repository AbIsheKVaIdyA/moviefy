/** Build a simple “style mix” donut from TMDB genre names (equal split; not predictive). */
export type VibeSlice = { name: string; pct: number; color: string };

const VIBE_COLORS = [
  "#a855f7",
  "#6366f1",
  "#14b8a6",
  "#f97316",
  "#ec4899",
  "#eab308",
  "#22c55e",
  "#38bdf8",
];

export function vibeSlicesFromTmdbGenres(
  genres: { id: number; name: string }[],
  max = 8,
): VibeSlice[] {
  const list = genres.slice(0, max);
  const n = list.length;
  if (n === 0) return [];
  const base = Math.floor(100 / n);
  const rem = 100 - base * n;
  return list.map((g, i) => ({
    name: g.name,
    pct: base + (i < rem ? 1 : 0),
    color: VIBE_COLORS[i % VIBE_COLORS.length],
  }));
}
