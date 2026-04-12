import { NextRequest, NextResponse } from "next/server";
import type { Genre } from "@/lib/types";
import { GENRES } from "@/lib/types";
import type {
  SearchSuggestGenreRow,
  SearchSuggestMovieRow,
  SearchSuggestPersonRow,
  SearchSuggestResponse,
  SearchSuggestTop,
} from "@/lib/search-suggest-types";

export const runtime = "nodejs";

const TMDB_KEY = process.env.TMDB_API_KEY;

/** Extra tokens → catalog genre (substring match on query). */
const GENRE_ALIASES: { tokens: string[]; genre: Genre }[] = [
  { tokens: ["sci fi", "scifi", "science fiction"], genre: "Sci-Fi" },
  { tokens: ["romantic", "romance"], genre: "Romance" },
  { tokens: ["funny", "comedy"], genre: "Comedy" },
  { tokens: ["scary", "horror"], genre: "Horror" },
  { tokens: ["thrill"], genre: "Thriller" },
  { tokens: ["drama"], genre: "Drama" },
  { tokens: ["action"], genre: "Action" },
  { tokens: ["animate", "cartoon"], genre: "Animation" },
];

function matchedGenres(qRaw: string): SearchSuggestGenreRow[] {
  const q = qRaw.trim().toLowerCase();
  if (!q) return [];
  const seen = new Set<Genre>();
  const out: SearchSuggestGenreRow[] = [];

  for (const g of GENRES) {
    const gl = g.toLowerCase();
    if (gl.includes(q) || q.includes(gl)) {
      if (!seen.has(g)) {
        seen.add(g);
        out.push({ genre: g });
      }
    }
  }
  for (const { tokens, genre } of GENRE_ALIASES) {
    if (seen.has(genre)) continue;
    if (tokens.some((t) => q.includes(t))) {
      seen.add(genre);
      out.push({ genre });
    }
  }
  return out;
}

function exactGenreTop(qRaw: string): Genre | null {
  const q = qRaw.trim().toLowerCase();
  if (!q) return null;
  for (const g of GENRES) {
    if (g.toLowerCase() === q) return g;
  }
  return null;
}

type TmdbMovieSearch = {
  id: number;
  title?: string;
  release_date?: string;
  vote_average?: number;
  popularity?: number;
  poster_path?: string | null;
  genre_ids?: number[];
};

type TmdbPersonSearch = {
  id: number;
  name?: string;
  popularity?: number;
  profile_path?: string | null;
  known_for_department?: string | null;
};

function mapMovie(m: TmdbMovieSearch): SearchSuggestMovieRow {
  const y = m.release_date?.slice(0, 4);
  return {
    tmdbId: m.id,
    title: m.title ?? "Untitled",
    year: y ? Number(y) || 0 : 0,
    posterPath: m.poster_path ?? null,
    voteAverage: typeof m.vote_average === "number" ? m.vote_average : 0,
    popularity: typeof m.popularity === "number" ? m.popularity : 0,
    genreIds: Array.isArray(m.genre_ids) ? m.genre_ids : [],
  };
}

function mapPerson(p: TmdbPersonSearch): SearchSuggestPersonRow {
  return {
    id: p.id,
    name: p.name ?? "Unknown",
    profilePath: p.profile_path ?? null,
    popularity: typeof p.popularity === "number" ? p.popularity : 0,
    knownForDepartment: p.known_for_department ?? null,
  };
}

function pickTop(
  q: string,
  movies: SearchSuggestMovieRow[],
  people: SearchSuggestPersonRow[],
  genres: SearchSuggestGenreRow[],
): SearchSuggestTop | null {
  const exact = exactGenreTop(q);
  if (exact) return { kind: "genre", genre: exact };

  const m0 = movies[0];
  const p0 = people[0];
  const g0 = genres[0];

  if (!m0 && !p0 && !g0) return null;

  const scoreM = m0 ? m0.popularity * 1.1 + m0.voteAverage * 2 : -1;
  const scoreP = p0 ? p0.popularity * 0.95 + (p0.knownForDepartment === "Acting" ? 15 : 0) : -1;
  const scoreG = g0 ? 180 : -1;

  const best = Math.max(scoreM, scoreP, scoreG);
  if (best < 0) return null;
  if (best === scoreG && g0) return { kind: "genre", genre: g0.genre };
  if (best === scoreM && m0) return { kind: "movie", movie: m0 };
  if (best === scoreP && p0) return { kind: "person", person: p0 };
  if (m0) return { kind: "movie", movie: m0 };
  if (p0) return { kind: "person", person: p0 };
  if (g0) return { kind: "genre", genre: g0.genre };
  return null;
}

function stripTopFromOthers(
  top: SearchSuggestTop | null,
  movies: SearchSuggestMovieRow[],
  people: SearchSuggestPersonRow[],
  genres: SearchSuggestGenreRow[],
): SearchSuggestResponse["others"] {
  let mo = movies;
  let pe = people;
  let ge = genres;
  if (!top) return { movies: mo, people: pe, genres: ge };
  if (top.kind === "movie") {
    mo = mo.filter((x) => x.tmdbId !== top.movie.tmdbId);
  } else if (top.kind === "person") {
    pe = pe.filter((x) => x.id !== top.person.id);
  } else {
    ge = ge.filter((x) => x.genre !== top.genre);
  }
  return { movies: mo, people: pe, genres: ge };
}

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const empty: SearchSuggestResponse = {
    configured: Boolean(TMDB_KEY),
    query: q,
    top: null,
    others: { movies: [], people: [], genres: matchedGenres(q) },
  };

  if (!q) {
    return NextResponse.json(empty);
  }

  const genres = matchedGenres(q);

  if (!TMDB_KEY || q.length < 2) {
    const topGenreOnly =
      genres.length === 1 && q.length >= 1
        ? ({ kind: "genre" as const, genre: genres[0]!.genre })
        : exactGenreTop(q)
          ? { kind: "genre" as const, genre: exactGenreTop(q)! }
          : null;
    return NextResponse.json({
      configured: false,
      query: q,
      top: topGenreOnly,
      others: stripTopFromOthers(topGenreOnly, [], [], genres),
    } satisfies SearchSuggestResponse);
  }

  try {
    const enc = encodeURIComponent(q);
    const [movieRes, personRes] = await Promise.all([
      fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_KEY}&query=${enc}&page=1&include_adult=false`,
      ),
      fetch(
        `https://api.themoviedb.org/3/search/person?api_key=${TMDB_KEY}&query=${enc}&page=1&include_adult=false`,
      ),
    ]);

    const moviesRaw = movieRes.ok
      ? ((await movieRes.json()) as { results?: TmdbMovieSearch[] }).results ?? []
      : [];
    const peopleRaw = personRes.ok
      ? ((await personRes.json()) as { results?: TmdbPersonSearch[] }).results ?? []
      : [];

    const movies = moviesRaw.slice(0, 12).map(mapMovie);
    const people = peopleRaw.slice(0, 8).map(mapPerson);

    const top = pickTop(q, movies, people, genres);
    const others = stripTopFromOthers(top, movies, people, genres);

    return NextResponse.json({
      configured: true,
      query: q,
      top,
      others,
    } satisfies SearchSuggestResponse);
  } catch {
    return NextResponse.json({
      configured: true,
      query: q,
      top: null,
      others: stripTopFromOthers(null, [], [], genres),
    } satisfies SearchSuggestResponse);
  }
}
