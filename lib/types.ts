export const GENRES = [
  "Sci-Fi",
  "Drama",
  "Thriller",
  "Comedy",
  "Horror",
  "Animation",
  "Action",
  "Romance",
] as const;

export type Genre = (typeof GENRES)[number];

export interface Movie {
  id: string;
  title: string;
  year: number;
  genre: Genre;
  /** Tailwind gradient classes for a poster placeholder */
  posterClass: string;
  /** Poster image URL (remote AI-style or CDN) */
  posterImage: string;
  director: string;
}

export interface PlaylistMovie extends Movie {
  rank: number;
}

export type PlaylistKind = "collection" | "watched";

export interface Playlist {
  id: string;
  name: string;
  description: string;
  isPublic: boolean;
  kind: PlaylistKind;
  movies: PlaylistMovie[];
}
