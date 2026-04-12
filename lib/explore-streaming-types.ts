import type { TmdbDiscoverItem } from "@/lib/movie-enrich-types";

export type StreamingHighlightRail = {
  id: string;
  label: string;
  accent: "netflix" | "prime" | "hulu" | "disney";
  providerId: number;
  results: TmdbDiscoverItem[];
};
