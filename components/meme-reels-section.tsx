"use client";

import { Film, Sparkles } from "lucide-react";
import { MoviefyTeaseMark } from "@/components/moviefy-brand-loader";
import { Badge } from "@/components/ui/badge";
import type { Movie } from "@/lib/types";

export type MemeReelsSectionProps = {
  onOpenMovie: (_movie: Movie) => void;
  /** Anchor id for jump links (standalone page uses `reels-page-root`). */
  sectionId?: string;
};

export function MemeReelsSection({
  sectionId = "reels-page-root",
}: MemeReelsSectionProps) {
  return (
    <section id={sectionId} className="scroll-mt-28">
      <div className="mb-3.5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-rose-500/25 to-amber-500/20 text-amber-200 ring-1 ring-white/10">
            <Film className="size-5" aria-hidden />
          </div>
          <div>
            <h2 className="type-section-title">Meme reels</h2>
            <p className="type-section-sub mt-0 max-w-2xl">
              A reel of iconic movie moments — we&apos;re still on set, lining up the next
              laugh-out-loud cut.
            </p>
          </div>
        </div>
        <Badge className="shrink-0 border-0 bg-amber-500/15 text-amber-100">
          <Sparkles className="mr-1 size-3" aria-hidden />
          Coming soon
        </Badge>
      </div>

      <div className="app-panel overflow-hidden border-amber-500/15 bg-gradient-to-b from-amber-500/[0.07] via-card to-card p-0 sm:p-0">
        <div className="relative px-4 py-12 sm:px-8 sm:py-14">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.35]"
            aria-hidden
          >
            <div className="absolute -left-20 top-1/2 h-48 w-48 -translate-y-1/2 rounded-full bg-rose-500/20 blur-3xl" />
            <div className="absolute -right-16 bottom-0 h-40 w-40 rounded-full bg-amber-500/15 blur-3xl" />
          </div>

          <div className="relative mx-auto flex max-w-lg flex-col items-center text-center">
            <MoviefyTeaseMark className="mb-8" />

            <p className="font-heading text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
              Something good is in the edit bay
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Picture this reel like a scene still shooting: lights, cameras, and a few
              perfect memes almost ready for their close-up. When we yell &quot;That&apos;s a
              wrap!&quot;, you&apos;ll get the first seat.
            </p>

            <div className="mt-8 w-full max-w-md rounded-2xl border border-border/60 bg-muted/25 px-4 py-3.5 sm:px-5">
              <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                Meanwhile
              </p>
              <p className="mt-1.5 text-sm leading-snug text-foreground/90">
                Explore any film on{" "}
                <span className="font-medium text-primary">Explore</span> or{" "}
                <span className="font-medium text-primary">Your theatre</span> — trailers,
                takes, and video picks are already rolling there.
              </p>
            </div>

            <p className="mt-6 text-xs italic text-muted-foreground/90">
              Popcorn optional. Excitement included.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
