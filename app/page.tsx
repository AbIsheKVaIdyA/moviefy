import { PosterImage } from "@/components/poster-image";
import { LandingAuthModal } from "@/components/landing-auth-modal";
import Link from "next/link";
import { Suspense } from "react";
import {
  ArrowRight,
  Clapperboard,
  Compass,
  Heart,
  ListMusic,
  Play,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  buildLandingPosterWall,
  getLandingMovies,
  landingDecorMovies,
  landingHeroFocus,
} from "@/lib/landing-movies";
import type { Movie } from "@/lib/types";
import { cn } from "@/lib/utils";

function PosterTile({
  movie,
  className,
  sizes,
  priority,
}: {
  movie: Movie;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-white/10 transition duration-500 hover:z-10 hover:ring-primary/40 hover:shadow-[0_0_32px_-4px_rgba(0,0,0,0.8)]",
        className,
      )}
    >
      <PosterImage
        src={movie.posterImage}
        alt={movie.title || ""}
        fill
        priority={priority}
        placeholderGradient={movie.posterClass}
        className="object-cover transition duration-700 group-hover:scale-110"
        sizes={sizes}
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 transition duration-300 group-hover:opacity-100" />
      {movie.title.trim() ? (
        <p className="pointer-events-none absolute bottom-1.5 left-2 right-2 translate-y-2 text-[10px] font-medium leading-tight text-white opacity-0 transition duration-300 group-hover:translate-y-0 group-hover:opacity-100 sm:text-xs">
          {movie.title}
        </p>
      ) : null}
    </div>
  );
}

export default async function Home() {
  const popular = await getLandingMovies();
  const posterWall = popular.length
    ? buildLandingPosterWall(popular)
    : landingDecorMovies(28);
  const heroFocus =
    popular.length >= 6
      ? landingHeroFocus(popular)
      : popular.length > 0
        ? [...popular, ...landingDecorMovies(6 - popular.length)]
        : landingDecorMovies(6);
  const marqueeSource = popular.length ? popular : landingDecorMovies(12);
  const marqueeMovies = [...marqueeSource, ...marqueeSource, ...marqueeSource];
  const bentoTop =
    popular.length >= 5
      ? popular.slice(0, 5)
      : [...popular, ...landingDecorMovies(5 - popular.length)];
  const bentoBottom =
    popular.length >= 10
      ? popular.slice(5, 10)
      : popular.length > 5
        ? [...popular.slice(5), ...landingDecorMovies(10 - popular.length)]
        : landingDecorMovies(5);
  const shelfMovies = popular.length ? popular : landingDecorMovies(10);
  const mobileStrip = popular.length ? popular : landingDecorMovies(8);

  return (
    <main className="relative min-h-dvh overflow-x-hidden text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,oklch(0.76_0.17_151_/_0.18),transparent)]" />
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_60%_40%_at_100%_50%,oklch(0.55_0.2_300_/_0.08),transparent)]" />

      <div className="relative mx-auto max-w-[1400px] px-4 pb-24 pt-5 sm:px-6 lg:px-10">
        <header className="sticky top-4 z-50 mb-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/[0.08] bg-zinc-950/70 px-4 py-3 shadow-[0_8px_40px_rgba(0,0,0,0.45)] backdrop-blur-2xl sm:px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/30 to-primary/5 text-primary ring-1 ring-primary/25">
              <Clapperboard className="size-5" />
            </div>
            <div>
              <span className="font-heading text-lg font-semibold tracking-tight">Moviefy</span>
              <p className="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Films · Playlists · Vibe</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Link
              href="/?auth=sign-in&next=%2Fapp%2Fexplore"
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "hidden gap-1.5 text-zinc-300 sm:inline-flex",
              )}
            >
              <Compass className="size-4" />
              Explore
            </Link>
            <Link
              href="/?auth=sign-in&next=%2Fapp%2Fexplore"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
            >
              Sign in
            </Link>
            <Link href="/?auth=sign-up&next=%2Fapp%2Fexplore" className={cn(buttonVariants({ size: "sm" }))}>
              Sign up
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </header>

        {/* Hero */}
        <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-zinc-950/40 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset]">
          <div className="pointer-events-none absolute inset-0 overflow-hidden">
            <div
              className="absolute -left-[8%] -top-[10%] grid w-[116%] grid-cols-6 gap-1.5 opacity-[0.35] sm:grid-cols-8 sm:gap-2 md:opacity-45"
              style={{ transform: "rotate(-3deg) scale(1.05)" }}
            >
              {posterWall.map((m, i) => (
                <div key={`wall-${m.id}-${i}`} className="relative aspect-[2/3] min-h-0">
                  <PosterImage
                    src={m.posterImage}
                    alt=""
                    fill
                    placeholderGradient={m.posterClass}
                    className="object-cover saturate-[0.85]"
                    sizes="80px"
                  />
                </div>
              ))}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-[#060607] via-[#060607]/88 to-[#060607]" />
            <div className="absolute inset-0 bg-gradient-to-r from-[#060607] via-transparent to-[#060607]/90" />
          </div>

          <div className="relative grid gap-12 px-6 py-14 sm:px-10 sm:py-16 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-8 lg:py-20">
            <div className="max-w-xl lg:max-w-none">
              <h1 className="font-heading text-[2.35rem] font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-[3.25rem] xl:text-[3.5rem]">
                Your taste,{" "}
                <span className="landing-text-shimmer">one endless shelf</span>
                <br />
                of films.
              </h1>
              <p className="mt-5 max-w-lg text-base leading-relaxed text-zinc-400 sm:text-lg">
                Rank what you watch, build mood playlists like Spotify, binge discovery on Explore, and
                flex public lists — all in a UI that feels fast, dark, and a little addictive.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/?auth=sign-in&next=%2Fapp%2Fexplore"
                  className={cn(
                    buttonVariants({ size: "lg" }),
                    "h-12 gap-2 px-7 shadow-[0_0_40px_-8px_var(--color-primary)]",
                  )}
                >
                  <Play className="size-4 fill-current" />
                  Open Moviefy
                </Link>
                <Link
                  href="/?auth=sign-in&next=%2Fapp%2Fexplore"
                  className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 border-white/15 bg-white/5")}
                >
                  <Compass className="size-4" />
                  Browse Explore
                </Link>
              </div>
            </div>

            {/* Floating poster cluster */}
            <div className="relative mx-auto hidden w-full max-w-[420px] lg:mx-0 lg:block">
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-primary/10 via-transparent to-fuchsia-500/10 blur-2xl" />
              <div className="relative flex flex-col gap-3 p-2">
                <div className="flex items-end justify-center gap-3">
                  <PosterTile
                    movie={heroFocus[0]!}
                    className="aspect-[2/3] w-[46%] max-w-[200px] rounded-2xl"
                    sizes="200px"
                    priority
                  />
                  <PosterTile
                    movie={heroFocus[1]!}
                    className="aspect-[2/3] w-[34%] max-w-[150px] -translate-y-5 rounded-xl"
                    sizes="160px"
                    priority
                  />
                </div>
                <div className="flex justify-center gap-2 pr-6">
                  <PosterTile
                    movie={heroFocus[2]!}
                    className="aspect-[2/3] w-[28%] max-w-[110px] rounded-lg"
                    sizes="120px"
                    priority
                  />
                  <PosterTile
                    movie={heroFocus[3]!}
                    className="aspect-[2/3] w-[40%] max-w-[170px] rounded-xl"
                    sizes="180px"
                  />
                  <PosterTile
                    movie={heroFocus[4]!}
                    className="aspect-[2/3] w-[26%] max-w-[105px] -translate-y-2 rounded-lg"
                    sizes="110px"
                  />
                </div>
                <div className="flex justify-center">
                  <PosterTile
                    movie={heroFocus[5]!}
                    className="aspect-[2/3] w-[36%] max-w-[150px] rounded-xl"
                    sizes="140px"
                  />
                </div>
              </div>
            </div>

            {/* Mobile poster strip */}
            <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
              {mobileStrip.map((m) => (
                <div
                  key={`mob-${m.id}`}
                  className="relative aspect-[2/3] w-[100px] shrink-0 overflow-hidden rounded-xl ring-1 ring-white/10"
                >
                  <PosterImage
                    src={m.posterImage}
                    alt={m.title || ""}
                    fill
                    placeholderGradient={m.posterClass}
                    className="object-cover"
                    sizes="100px"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Marquee */}
        <section className="relative mt-10 -mx-4 overflow-hidden border-y border-white/[0.06] bg-zinc-950/50 py-5 sm:-mx-6 lg:-mx-10">
          <p className="mb-3 px-6 text-center text-[10px] font-semibold uppercase tracking-[0.35em] text-zinc-500">
            {popular.length ? "Now trending on shelves" : "Poster moodboard"}
          </p>
          <div className="overflow-hidden">
            <div className="landing-marquee-track gap-3 pr-3">
              {marqueeMovies.map((m, i) => (
                <div
                  key={`mq-${m.id}-${i}`}
                  className="relative aspect-[2/3] w-[72px] shrink-0 overflow-hidden rounded-lg ring-1 ring-white/10 sm:w-[88px]"
                >
                  <PosterImage
                    src={m.posterImage}
                    alt=""
                    fill
                    placeholderGradient={m.posterClass}
                    className="object-cover"
                    sizes="90px"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Bento */}
        <section className="mt-16">
          <div className="mb-8 text-center sm:text-left">
            <h2 className="font-heading text-3xl font-semibold sm:text-4xl">Built for obsession</h2>
            <p className="mt-2 max-w-2xl text-zinc-400">
              Every screen is dense with posters and momentum — the opposite of a boring watchlist app.
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
            <article className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-6 lg:col-span-2 lg:row-span-2 lg:p-8">
              <div className="absolute -right-8 -top-8 flex gap-2 opacity-40 transition group-hover:opacity-60">
                {bentoTop.map((m) => (
                  <div
                    key={m.id}
                    className="relative h-32 w-20 rotate-6 overflow-hidden rounded-lg shadow-xl ring-1 ring-white/10"
                  >
                    <PosterImage
                      src={m.posterImage}
                      alt=""
                      fill
                      placeholderGradient={m.posterClass}
                      className="object-cover"
                      sizes="80px"
                    />
                  </div>
                ))}
              </div>
              <ListMusic className="relative z-10 size-10 rounded-xl bg-primary/15 p-2 text-primary" />
              <h3 className="relative z-10 mt-5 font-heading text-2xl font-semibold">
                Playlist culture, not spreadsheets
              </h3>
              <p className="relative z-10 mt-3 max-w-md text-sm leading-relaxed text-zinc-400">
                Late-night comfort, rainy Sunday noir, letterboxd-core ranked lists — curate like you mean
                it. Public or private per list.
              </p>
              <Link
                href="/?auth=sign-up&next=%2Fapp%2Fexplore"
                className={cn(
                  buttonVariants({ variant: "secondary", size: "sm" }),
                  "relative z-10 mt-6 border-0 bg-white/10 text-white hover:bg-white/15",
                )}
              >
                Start a list
                <ArrowRight className="size-4" />
              </Link>
            </article>

            <article className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 p-6">
              <Compass className="size-9 rounded-lg bg-sky-500/15 p-2 text-sky-400" />
              <h3 className="mt-4 font-heading text-xl font-semibold">Explore & genres</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Live TMDB rails, public creator playlists, follow and save to your library.
              </p>
              <Link
                href="/?auth=sign-in&next=%2Fapp%2Fexplore"
                className="mt-4 inline-flex text-sm font-medium text-primary hover:underline"
              >
                Open Explore →
              </Link>
            </article>

            <article className="rounded-3xl border border-white/[0.08] bg-zinc-900/50 p-6">
              <Zap className="size-9 rounded-lg bg-amber-500/15 p-2 text-amber-400" />
              <h3 className="mt-4 font-heading text-xl font-semibold">Instant detail</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Tap any poster: scores, streaming, YouTube reviews — without leaving the flow.
              </p>
            </article>

            <article className="rounded-3xl border border-white/[0.08] bg-gradient-to-br from-fuchsia-950/40 to-zinc-950 p-6 md:col-span-2 lg:col-span-2">
              <div className="flex flex-wrap gap-3">
                {bentoBottom.map((m) => (
                  <div
                    key={m.id}
                    className="relative aspect-[2/3] w-[56px] overflow-hidden rounded-md ring-1 ring-white/10 sm:w-[64px]"
                  >
                    <PosterImage
                      src={m.posterImage}
                      alt={m.title || ""}
                      fill
                      placeholderGradient={m.posterClass}
                      className="object-cover"
                      sizes="64px"
                    />
                  </div>
                ))}
              </div>
              <Heart className="mt-4 size-9 rounded-lg bg-rose-500/15 p-2 text-rose-400" />
              <h3 className="mt-3 font-heading text-xl font-semibold">Save everything</h3>
              <p className="mt-2 text-sm text-zinc-400">
                Heart films, duplicate community playlists into your library, share with a link.
              </p>
            </article>
          </div>
        </section>

        {/* Horizontal shelf */}
        <section className="mt-16">
          <div className="mb-5 flex items-end justify-between gap-4">
            <div>
              <h2 className="font-heading text-2xl font-semibold sm:text-3xl">Shelf preview</h2>
              <p className="mt-1 text-sm text-zinc-500">
                {popular.length
                  ? "Every title is a real TMDB poster — hover for names."
                  : "Gradient placeholders until TMDB_API_KEY is set — then real posters load here."}
              </p>
            </div>
            <Link
              href="/?auth=sign-in&next=%2Fapp%2Fexplore"
              className="hidden shrink-0 text-sm font-medium text-primary hover:underline sm:inline"
            >
              See all in app →
            </Link>
          </div>
          <div className="flex gap-4 overflow-x-auto pb-4 pt-1 [-ms-overflow-style:none] [scrollbar-width:none] snap-x snap-mandatory [&::-webkit-scrollbar]:hidden">
            {shelfMovies.map((m) => (
              <div key={`shelf-${m.id}`} className="snap-start">
                <PosterTile
                  movie={m}
                  className="aspect-[2/3] w-[140px] shrink-0 rounded-2xl sm:w-[168px]"
                  sizes="168px"
                />
                {m.title.trim() ? (
                  <>
                    <p className="mt-2 max-w-[168px] text-xs font-medium text-zinc-300 line-clamp-1">{m.title}</p>
                    <p className="text-[11px] text-zinc-500">
                      {m.year} · {m.genre}
                    </p>
                  </>
                ) : null}
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="relative mt-20 overflow-hidden rounded-[2rem] border border-primary/25 bg-gradient-to-br from-primary/15 via-zinc-950 to-zinc-950 px-6 py-14 text-center sm:px-12 sm:py-16">
          <div className="pointer-events-none absolute -left-20 top-1/2 h-64 w-64 -translate-y-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -right-20 bottom-0 h-48 w-48 rounded-full bg-fuchsia-500/15 blur-3xl" />
          <h2 className="relative font-heading text-3xl font-semibold sm:text-4xl md:text-5xl">
            Stop doom-scrolling.
            <br />
            <span className="text-primary">Start shelf-scrolling.</span>
          </h2>
          <p className="relative mx-auto mt-4 max-w-lg text-zinc-400">
            Free to use. Your lists stay yours. Jump in and add your first ranked row tonight.
          </p>
          <div className="relative mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/?auth=sign-in&next=%2Fapp%2Fexplore"
              className={cn(buttonVariants({ size: "lg" }), "h-12 px-8")}
            >
              Launch Moviefy
              <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/?auth=sign-in&next=%2Fapp%2Fexplore"
              className={cn(buttonVariants({ size: "lg", variant: "outline" }), "h-12 border-white/20 bg-black/20")}
            >
              Explore first
            </Link>
          </div>
        </section>
      </div>

      <Suspense fallback={null}>
        <LandingAuthModal />
      </Suspense>
    </main>
  );
}
