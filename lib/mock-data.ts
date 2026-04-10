import type { Movie, Playlist } from "@/lib/types";
import { aiMoviePosterUrl } from "@/lib/poster-urls";

export const CATALOG: Movie[] = [
  {
    id: "m1",
    title: "Arrival",
    year: 2016,
    genre: "Sci-Fi",
    posterClass: "from-violet-950 via-indigo-900 to-slate-950",
    posterImage: aiMoviePosterUrl(
      9101,
      "cinematic movie poster sci-fi alien oval ship over field fog teal sky dramatic lighting no text",
    ),
    director: "Denis Villeneuve",
  },
  {
    id: "m2",
    title: "Parasite",
    year: 2019,
    genre: "Thriller",
    posterClass: "from-emerald-950 via-zinc-900 to-black",
    posterImage: aiMoviePosterUrl(
      9102,
      "cinematic movie poster thriller modern mansion stairs garden rain moody shadows no text",
    ),
    director: "Bong Joon-ho",
  },
  {
    id: "m3",
    title: "The Grand Budapest Hotel",
    year: 2014,
    genre: "Comedy",
    posterClass: "from-rose-900 via-pink-950 to-violet-950",
    posterImage: aiMoviePosterUrl(
      9103,
      "cinematic movie poster pastel symmetry grand hotel lobby vintage comedy aesthetic no text",
    ),
    director: "Wes Anderson",
  },
  {
    id: "m4",
    title: "Blade Runner 2049",
    year: 2017,
    genre: "Sci-Fi",
    posterClass: "from-orange-950 via-amber-950 to-neutral-950",
    posterImage: aiMoviePosterUrl(
      9104,
      "cinematic movie poster sci-fi neon dystopia orange haze futuristic city silhouette no text",
    ),
    director: "Denis Villeneuve",
  },
  {
    id: "m5",
    title: "Spirited Away",
    year: 2001,
    genre: "Animation",
    posterClass: "from-teal-950 via-cyan-950 to-slate-950",
    posterImage: aiMoviePosterUrl(
      9105,
      "cinematic movie poster anime magical bathhouse night lanterns spirit world dreamy no text",
    ),
    director: "Hayao Miyazaki",
  },
  {
    id: "m6",
    title: "Heat",
    year: 1995,
    genre: "Action",
    posterClass: "from-slate-800 via-blue-950 to-black",
    posterImage: aiMoviePosterUrl(
      9106,
      "cinematic movie poster LA skyline night heat action noir blue orange streetlights no text",
    ),
    director: "Michael Mann",
  },
  {
    id: "m7",
    title: "Portrait of a Lady on Fire",
    year: 2019,
    genre: "Romance",
    posterClass: "from-red-950 via-orange-950 to-stone-950",
    posterImage: aiMoviePosterUrl(
      9107,
      "cinematic movie poster painterly cliff ocean wind historical romance flames silhouette no text",
    ),
    director: "Céline Sciamma",
  },
  {
    id: "m8",
    title: "Hereditary",
    year: 2018,
    genre: "Horror",
    posterClass: "from-stone-900 via-neutral-950 to-black",
    posterImage: aiMoviePosterUrl(
      9108,
      "cinematic movie poster horror miniature house dark trees uncanny dread no text",
    ),
    director: "Ari Aster",
  },
  {
    id: "m9",
    title: "Mad Max: Fury Road",
    year: 2015,
    genre: "Action",
    posterClass: "from-yellow-950 via-amber-900 to-orange-950",
    posterImage: aiMoviePosterUrl(
      9109,
      "cinematic movie poster desert apocalypse orange dust war rigs storm action no text",
    ),
    director: "George Miller",
  },
  {
    id: "m10",
    title: "Past Lives",
    year: 2023,
    genre: "Drama",
    posterClass: "from-sky-950 via-indigo-950 to-zinc-950",
    posterImage: aiMoviePosterUrl(
      9110,
      "cinematic movie poster tender drama two people city bridge dusk melancholy soft light no text",
    ),
    director: "Celine Song",
  },
];

/** First six posters for the marketing landing hero grid */
export const LANDING_POSTER_URLS = CATALOG.slice(0, 6).map((m) => m.posterImage);

function toPlaylistMovies(
  ids: string[],
  startRank = 1,
): Playlist["movies"] {
  return ids.map((id, i) => {
    const m = CATALOG.find((x) => x.id === id)!;
    return { ...m, rank: startRank + i };
  });
}

export const INITIAL_PLAYLISTS: Playlist[] = [
  {
    id: "p1",
    name: "Late night comfort",
    description: "Slow burns and soft endings — perfect after midnight.",
    isPublic: true,
    kind: "collection",
    movies: toPlaylistMovies(["m1", "m10", "m7", "m3"]),
  },
  {
    id: "p2",
    name: "Rainy Sunday",
    description: "Moody frames, heavy atmosphere, zero guilt.",
    isPublic: false,
    kind: "collection",
    movies: toPlaylistMovies(["m4", "m8", "m2"]),
  },
  {
    id: "w1",
    name: "Watched — 2025",
    description: "Everything I finished this year, in order.",
    isPublic: false,
    kind: "watched",
    movies: toPlaylistMovies(["m5", "m6", "m9", "m2", "m1"]),
  },
];
