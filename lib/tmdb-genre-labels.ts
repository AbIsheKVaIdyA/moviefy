/** TMDB movie genre id → label (for hover / previews). */
const TMDB_GENRE_LABEL: Record<number, string> = {
  28: "Action",
  12: "Adventure",
  16: "Animation",
  35: "Comedy",
  80: "Crime",
  99: "Documentary",
  18: "Drama",
  10751: "Family",
  14: "Fantasy",
  36: "History",
  27: "Horror",
  10402: "Music",
  9648: "Mystery",
  10749: "Romance",
  878: "Sci-Fi",
  10770: "TV Movie",
  53: "Thriller",
  10752: "War",
  37: "Western",
};

export function tmdbGenreLabels(ids: number[] | undefined, max = 4): string {
  if (!ids?.length) return "";
  const out: string[] = [];
  for (const id of ids) {
    const lab = TMDB_GENRE_LABEL[id];
    if (lab && !out.includes(lab)) out.push(lab);
    if (out.length >= max) break;
  }
  return out.join(" · ");
}
