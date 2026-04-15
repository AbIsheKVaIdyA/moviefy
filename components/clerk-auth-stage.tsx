"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { Clapperboard, Film, Sparkles } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import {
  ClerkAuthCinemaProvider,
  ClerkAuthMobileBackdrop,
  useClerkAuthCinemaMovies,
  type ClerkAuthCinemaMovie,
} from "@/components/clerk-auth-cinema";
import { clerkMoviefyAuthAppearance } from "@/lib/clerk/movie-auth-appearance";
import { tmdbPosterUrl } from "@/lib/tmdb-image";
import { cn } from "@/lib/utils";

type ClerkAuthStageProps = {
  mode: "sign-in" | "sign-up";
};

function PosterSilhouette({
  className,
  hue,
}: {
  className?: string;
  hue: "violet" | "rose" | "amber" | "sky" | "emerald";
}) {
  const gradients: Record<string, string> = {
    violet:
      "from-violet-950/90 via-fuchsia-900/40 to-zinc-950/80",
    rose: "from-rose-950/90 via-red-900/35 to-zinc-950/80",
    amber:
      "from-amber-950/85 via-orange-900/30 to-zinc-950/80",
    sky: "from-sky-950/85 via-cyan-900/25 to-zinc-950/80",
    emerald:
      "from-emerald-950/85 via-teal-900/28 to-zinc-950/80",
  };
  return (
    <div
      className={cn(
        "aspect-[2/3] rounded-lg bg-gradient-to-br shadow-lg ring-1 ring-white/5",
        gradients[hue],
        className,
      )}
    />
  );
}

function SpotlightCard({ movie, featured }: { movie: ClerkAuthCinemaMovie; featured?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex gap-3 overflow-hidden rounded-xl border border-white/[0.08] bg-black/45 p-2.5 shadow-[0_10px_40px_-14px_rgba(0,0,0,0.85)] backdrop-blur-md transition duration-300 hover:border-violet-400/30 hover:bg-black/55",
        featured && "ring-1 ring-violet-500/20",
      )}
    >
      <div className="relative h-[4.5rem] w-12 shrink-0 overflow-hidden rounded-md ring-1 ring-white/10">
        <img
          src={tmdbPosterUrl(movie.poster_path, "w185")}
          alt=""
          className="h-full w-full object-cover saturate-[0.92]"
          loading="lazy"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[13px] font-medium leading-snug text-white">
          {movie.title}
        </p>
        <p className="mt-1.5 text-[11px] font-medium tabular-nums text-amber-200/95">
          ★ {movie.vote_average.toFixed(1)} TMDB
        </p>
      </div>
    </div>
  );
}

function ClerkAuthSpotlightColumn({
  title,
  pickEven,
}: {
  title: string;
  pickEven: boolean;
}) {
  const movies = useClerkAuthCinemaMovies();
  const slice = useMemo(() => {
    const rows = movies.filter((_, i) => (pickEven ? i % 2 === 0 : i % 2 === 1));
    const src = rows.length >= 3 ? rows : movies;
    return src.slice(0, 5);
  }, [movies, pickEven]);

  return (
    <aside className="hidden min-h-[320px] w-full max-w-[15rem] flex-col gap-3 pt-1 lg:max-w-[16rem] xl:flex">
      <p className="pl-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-zinc-500">
        {title}
      </p>
      <div className="flex flex-col gap-3">
        {slice.map((m, i) => (
          <SpotlightCard key={`${m.id}-${i}`} movie={m} featured={i === 0} />
        ))}
      </div>
    </aside>
  );
}

export function ClerkAuthStage({ mode }: ClerkAuthStageProps) {
  return (
    <ClerkAuthCinemaProvider>
      <div className="clerk-auth-page relative flex min-h-dvh flex-col overflow-hidden bg-[#040406] text-zinc-100">
        <ClerkAuthMobileBackdrop />
        {/* Theatre wash + spotlights */}
        <div
          className="pointer-events-none absolute inset-0 z-[1] max-md:opacity-[0.42] md:opacity-100"
          aria-hidden
        >
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_-8%,oklch(0.42_0.2_300/0.35),transparent_58%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_0%_100%,oklch(0.38_0.14_25/0.22),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_40%_at_100%_85%,oklch(0.4_0.12_165/0.18),transparent_48%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#040406]/40 to-[#020203]" />
          <div
            className="absolute inset-0 opacity-[0.35]"
            style={{
              backgroundImage: `repeating-linear-gradient(
              90deg,
              transparent,
              transparent 10px,
              oklch(1 0 0 / 0.03) 10px,
              oklch(1 0 0 / 0.03) 11px
            )`,
            }}
          />
        </div>

        {/* Soft gradient tiles */}
        <div
          className="pointer-events-none absolute -left-[12%] top-[8%] z-[1] w-[124%] opacity-[0.08] blur-[2px] sm:blur-md"
          aria-hidden
        >
          <div
            className="grid grid-cols-7 gap-2 sm:gap-3"
            style={{ transform: "rotate(-4deg) scale(1.02)" }}
          >
            <PosterSilhouette hue="violet" className="translate-y-4" />
            <PosterSilhouette hue="rose" className="-translate-y-2" />
            <PosterSilhouette hue="amber" className="translate-y-6" />
            <PosterSilhouette hue="sky" className="translate-y-1" />
            <PosterSilhouette hue="emerald" className="translate-y-5" />
            <PosterSilhouette hue="violet" className="-translate-y-3" />
            <PosterSilhouette hue="rose" className="translate-y-3" />
          </div>
        </div>

        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-90"
          aria-hidden
        >
          <div className="absolute inset-0 shadow-[inset_0_0_120px_oklch(0.02_0.04_280/0.85)]" />
        </div>

        <header className="relative z-20 flex items-center justify-between gap-4 px-4 pb-2 pt-[max(0.75rem,env(safe-area-inset-top))] sm:px-8">
          <Link
            href="/"
            className="group inline-flex items-center gap-2.5 rounded-xl border border-white/[0.07] bg-black/25 px-3 py-2 text-sm text-white/90 shadow-sm backdrop-blur-md transition hover:border-violet-400/25 hover:bg-black/40"
          >
            <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500/25 to-fuchsia-600/15 text-violet-200 ring-1 ring-white/10">
              <Clapperboard className="size-5" aria-hidden />
            </span>
            <span className="font-heading text-base tracking-tight">Moviefy</span>
          </Link>
          <div className="hidden items-center gap-2 text-xs text-zinc-500 sm:flex">
            <Film className="size-4 shrink-0 text-zinc-600" aria-hidden />
            <span className="tracking-wide">Films · Playlists · Vibe</span>
          </div>
        </header>

        <div className="relative z-10 flex flex-1 flex-col px-4 pb-[max(2rem,env(safe-area-inset-bottom))] pt-3 sm:px-6 lg:pt-5">
          <div className="mx-auto grid w-full max-w-6xl flex-1 grid-cols-1 content-center items-start gap-y-8 xl:grid-cols-[minmax(0,1fr)_minmax(280px,440px)_minmax(0,1fr)] xl:gap-x-8 xl:gap-y-0 2xl:max-w-[1400px] 2xl:gap-x-12">
            <ClerkAuthSpotlightColumn title="On fire this week" pickEven />
            <div className="mx-auto flex w-full max-w-[440px] flex-col items-center xl:mx-0 xl:max-w-[440px]">
              <div className="mb-6 max-w-md text-center sm:mb-8">
                <p className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/10 px-3 py-1 text-[11px] font-medium uppercase tracking-[0.22em] text-violet-200/90">
                  <Sparkles className="size-3" aria-hidden />
                  {mode === "sign-in" ? "Welcome back" : "Join the crowd"}
                </p>
                <h1 className="mt-3 font-heading text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                  {mode === "sign-in"
                    ? "Dim the lights. Pick up where you left off."
                    : "Your next obsession starts here."}
                </h1>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-[0.9375rem]">
                  Rank films, build mood playlists, and explore like Spotify —
                  built for the big screen energy.
                </p>
              </div>

              <div className="relative z-[15] w-full">
                <div
                  className="pointer-events-none absolute -inset-6 rounded-[2rem] bg-gradient-to-b from-violet-600/25 via-transparent to-fuchsia-600/12 blur-2xl"
                  aria-hidden
                />
                <div className="relative rounded-[inherit]">
                  {mode === "sign-in" ? (
                    <SignIn
                      routing="path"
                      path="/sign-in"
                      signUpUrl="/sign-up"
                      appearance={clerkMoviefyAuthAppearance}
                    />
                  ) : (
                    <SignUp
                      routing="path"
                      path="/sign-up"
                      signInUrl="/sign-in"
                      appearance={clerkMoviefyAuthAppearance}
                    />
                  )}
                </div>
              </div>

              <p className="mt-8 max-w-sm text-center text-[11px] leading-relaxed text-zinc-600 sm:text-xs">
                By continuing you agree to our flow — same dark, fast Moviefy
                experience inside the app.
              </p>
            </div>
            <ClerkAuthSpotlightColumn title="Rising fast" pickEven={false} />
          </div>
        </div>
      </div>
    </ClerkAuthCinemaProvider>
  );
}
