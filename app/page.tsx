import { PosterImage } from "@/components/poster-image";
import Link from "next/link";
import { ArrowRight, Clapperboard, Sparkles, Star, Users } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LANDING_POSTER_URLS } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export default function Home() {
  return (
    <main className="min-h-dvh bg-[#0e0e0f] text-white">
      <div className="mx-auto max-w-7xl px-4 pb-20 pt-6 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 mb-10 flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-4 py-3 backdrop-blur-xl">
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Clapperboard className="size-4" />
            </div>
            <span className="font-heading text-lg font-semibold">CineShelf</span>
          </div>
          <div className="flex items-center gap-2">
            <Link href="/app" className={cn(buttonVariants({ variant: "ghost" }))}>
              Preview App
            </Link>
            <Link href="/app" className={cn(buttonVariants({ variant: "default" }))}>
              Start free
              <ArrowRight className="size-4" />
            </Link>
          </div>
        </header>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900 to-zinc-950 p-8 sm:p-12">
          <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/25 blur-3xl" />
          <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl" />
          <div className="relative grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <Badge className="mb-4 bg-white/10 text-white hover:bg-white/10">
                The movie app that feels like Spotify
              </Badge>
              <h1 className="font-heading text-4xl font-semibold leading-tight sm:text-6xl">
                One place for{" "}
                <span className="text-primary">movie playlists</span>, rankings, and discovery.
              </h1>
              <p className="mt-5 max-w-xl text-base text-zinc-300 sm:text-lg">
                Build your vibe-based movie lists, track what you watched, discover what to watch next,
                and share your taste with friends.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/app"
                  className={cn(buttonVariants({ size: "lg", variant: "default" }))}
                >
                  Enter CineShelf
                  <ArrowRight className="size-4" />
                </Link>
                <Link
                  href="/app"
                  className={cn(buttonVariants({ size: "lg", variant: "outline" }))}
                >
                  See demo
                </Link>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-5 text-sm text-zinc-400">
                <span className="flex items-center gap-1.5">
                  <Users className="size-4" /> 12k+ early users
                </span>
                <span className="flex items-center gap-1.5">
                  <Star className="size-4" /> 4.9 average vibe rating
                </span>
                <span className="flex items-center gap-1.5">
                  <Sparkles className="size-4" /> Gen-Z clean UI
                </span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              {LANDING_POSTER_URLS.map((poster, idx) => (
                <div
                  key={poster}
                  className="group relative aspect-[2/3] overflow-hidden rounded-xl border border-white/10 bg-zinc-900"
                  style={{ transform: `translateY(${idx % 2 === 0 ? "0px" : "16px"})` }}
                >
                  <PosterImage
                    src={poster}
                    alt="AI-style movie poster showcase"
                    fill
                    priority={idx < 3}
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 1024px) 30vw, 16vw"
                  />
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-10 grid gap-4 md:grid-cols-3">
          {[
            {
              title: "Playlist culture for movies",
              desc: "Create mood-based lists like late-night thrillers, rainy Sunday comfort, or top 10 rewatches.",
            },
            {
              title: "Discover while you organize",
              desc: "Not just private diary mode. Explore sections and trending picks live inside the same home feed.",
            },
            {
              title: "Rank, track, share",
              desc: "Reorder films, keep watch history, and switch each list between public and private instantly.",
            },
          ].map((item) => (
            <article key={item.title} className="rounded-2xl border border-white/10 bg-zinc-900/60 p-5">
              <h3 className="font-heading text-xl">{item.title}</h3>
              <p className="mt-2 text-sm text-zinc-300">{item.desc}</p>
            </article>
          ))}
        </section>

        <section className="mt-10 rounded-3xl border border-white/10 bg-zinc-900/50 p-8 text-center sm:p-12">
          <h2 className="font-heading text-3xl sm:text-4xl">
            Your next movie night starts here.
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-zinc-300">
            CineShelf gives you the cleanest way to collect taste, discover films, and build iconic lists.
          </p>
          <Link
            href="/app"
            className={cn(buttonVariants({ size: "lg", variant: "default", className: "mt-6" }))}
          >
            Launch app
            <ArrowRight className="size-4" />
          </Link>
        </section>
      </div>
    </main>
  );
}
