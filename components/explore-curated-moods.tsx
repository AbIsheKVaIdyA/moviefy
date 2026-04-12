"use client";

import { useState } from "react";
import { ExploreMovieRail } from "@/components/explore-movie-rail";
import type { Movie } from "@/lib/types";
import { cn } from "@/lib/utils";

const MOODS = [
  { key: "mood_feelgood", emoji: "😄", label: "Feel good" },
  { key: "mood_mindblown", emoji: "🤯", label: "Mind blown" },
  { key: "mood_thriller", emoji: "😱", label: "Thriller" },
  { key: "mood_deep", emoji: "🧠", label: "Deep story" },
] as const;

const BEST = [
  { key: "best_late_night", label: "Late night" },
  { key: "best_date", label: "Date" },
  { key: "best_mind_bending", label: "Mind-bending" },
  { key: "best_action", label: "Action" },
] as const;

const TIME = [
  { key: "time_easy", label: "Easy watch" },
  { key: "time_heavy", label: "Heavy story" },
] as const;

type Props = {
  onSelectMovie: (movie: Movie) => void;
};

export function ExploreCuratedMoods({ onSelectMovie }: Props) {
  const [mood, setMood] = useState<(typeof MOODS)[number]["key"]>("mood_feelgood");
  const [best, setBest] = useState<(typeof BEST)[number]["key"]>("best_action");
  const [time, setTime] = useState<(typeof TIME)[number]["key"]>("time_easy");

  return (
    <div className="space-y-10">
      <section className="rounded-2xl border border-white/10 bg-card/40 p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold text-white sm:text-xl">
          Choose a mood
        </h2>
        <p className="mt-1 text-xs text-white/50 sm:text-sm">
          One tap reshapes the row below — same catalogue, different energy.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMood(m.key)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium transition duration-200 sm:text-sm",
                mood === m.key
                  ? "border-primary/50 bg-primary/20 text-white"
                  : "border-white/10 bg-black/20 text-white/75 hover:border-white/20 hover:bg-white/5",
              )}
            >
              <span className="text-base" aria-hidden>
                {m.emoji}
              </span>
              {m.label}
            </button>
          ))}
        </div>
        <div className="mt-5">
          <ExploreMovieRail
            title="Curated for that mood"
            endpoint={`/api/discover/preset?key=${mood}`}
            onSelectMovie={onSelectMovie}
            limit={16}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-card/40 p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold text-white sm:text-xl">
          Best for: late night · date · mind-bending · action
        </h2>
        <p className="mt-1 text-xs text-white/50 sm:text-sm">
          Quick situational picks — flip the chip to reload the strip.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {BEST.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setBest(b.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition duration-200 sm:text-sm",
                best === b.key
                  ? "border-sky-400/50 bg-sky-500/15 text-white"
                  : "border-white/10 bg-black/20 text-white/75 hover:border-white/20",
              )}
            >
              {b.label}
            </button>
          ))}
        </div>
        <div className="mt-5">
          <ExploreMovieRail
            title="Best for this moment"
            endpoint={`/api/discover/preset?key=${best}`}
            onSelectMovie={onSelectMovie}
            limit={14}
          />
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-card/40 p-4 sm:p-6">
        <h2 className="font-heading text-lg font-semibold text-white sm:text-xl">
          Time commitment: easy watch vs heavy story
        </h2>
        <p className="mt-1 text-xs text-white/50 sm:text-sm">
          Rough runtime + pacing hints from TMDB — not a science, but a useful nudge.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {TIME.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTime(t.key)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition duration-200 sm:text-sm",
                time === t.key
                  ? "border-emerald-400/50 bg-emerald-500/15 text-white"
                  : "border-white/10 bg-black/20 text-white/75 hover:border-white/20",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="mt-5">
          <ExploreMovieRail
            title="Fits your evening"
            endpoint={`/api/discover/preset?key=${time}`}
            onSelectMovie={onSelectMovie}
            limit={14}
          />
        </div>
      </section>

      <div className="space-y-8">
        <ExploreMovieRail
          title="Movies that mess with your brain"
          subtitle="Sci-fi meets thriller — twists, rules broken, timelines optional."
          endpoint="/api/discover/preset?key=vibe_brain"
          onSelectMovie={onSelectMovie}
        />
        <ExploreMovieRail
          title="Don’t watch alone 😬"
          subtitle="Horror-forward picks with enough love on TMDB to trust the scare."
          endpoint="/api/discover/preset?key=vibe_alone"
          onSelectMovie={onSelectMovie}
        />
        <ExploreMovieRail
          title="Actually worth your time"
          subtitle="High bar on rating and vote count — fewer random duds."
          endpoint="/api/discover/preset?key=vibe_worth"
          onSelectMovie={onSelectMovie}
        />
        <ExploreMovieRail
          title="Hidden gems (under 10k votes)"
          subtitle="Strong scores without being household names yet."
          endpoint="/api/discover/preset?key=hidden_gems"
          onSelectMovie={onSelectMovie}
        />
        <ExploreMovieRail
          title="Underrated but highly rated"
          subtitle="Serious average, not yet a billion-vote blockbuster."
          endpoint="/api/discover/preset?key=underrated_high"
          onSelectMovie={onSelectMovie}
        />
      </div>
    </div>
  );
}
