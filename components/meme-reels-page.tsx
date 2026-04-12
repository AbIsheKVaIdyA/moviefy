"use client";

import { useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Clapperboard,
  Compass,
  Film,
  LogOut,
  Settings,
} from "lucide-react";
import { MemeReelsSection } from "@/components/meme-reels-section";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSupabaseApp } from "@/components/supabase-app-provider";
import { prefetchMovieEnrich } from "@/lib/movie-enrich-prefetch";
import { movieToDetailPageHref } from "@/lib/movie-detail-nav";
import { pushExploreRecent } from "@/lib/explore-recent-storage";
import { upsertExploreRecentOpen } from "@/lib/supabase/explore-recent-service";
import type { Movie } from "@/lib/types";
import { cn } from "@/lib/utils";
import { avatarLetter } from "@/lib/display-name";

export function MemeReelsPage() {
  const router = useRouter();
  const { client, session } = useSupabaseApp();

  const openMovie = useCallback(
    (movie: Movie) => {
      pushExploreRecent(movie);
      if (client && session?.user) {
        void upsertExploreRecentOpen(client, session.user.id, movie);
      }
      const href = movieToDetailPageHref(movie, "reels");
      if (!href) return;
      void (async () => {
        await prefetchMovieEnrich(movie);
        router.push(href);
      })();
    },
    [client, router, session?.user],
  );

  return (
    <div className="min-h-dvh text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/45 pt-[env(safe-area-inset-top,0px)] backdrop-blur-xl supports-[backdrop-filter]:bg-card/35">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between gap-3 px-3 py-3 sm:px-5">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/app/explore"
              className="flex min-h-10 shrink-0 items-center gap-2 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-sm text-foreground/90 transition hover:bg-muted/50"
            >
              <ArrowLeft className="size-4 shrink-0" />
              <span className="hidden sm:inline">Explore</span>
            </Link>
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-rose-500/15 text-rose-200">
                <Film className="size-4" aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="type-kicker">Meme reels</p>
                <p className="type-micro truncate">YouTube clips → open the film</p>
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/app"
              className="hidden items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground sm:inline-flex"
            >
              <Clapperboard className="size-4 shrink-0" />
              Your theatre
            </Link>
            <Link
              href="/app/explore"
              className="inline-flex min-h-10 items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition hover:bg-muted/40 hover:text-foreground"
            >
              <Compass className="size-4 shrink-0" />
              <span className="hidden sm:inline">Explore</span>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Account menu"
                className={cn(
                  buttonVariants({ variant: "ghost", size: "icon-sm" }),
                  "rounded-full text-foreground hover:bg-muted/50",
                )}
              >
                <Avatar size="sm">
                  <AvatarFallback>
                    {avatarLetter(null, session)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                sideOffset={8}
                className="min-w-48 border-border/60 bg-popover text-popover-foreground"
              >
                <DropdownMenuLabel className="text-muted-foreground">
                  Account
                </DropdownMenuLabel>
                <DropdownMenuItem
                  disabled
                  className="text-muted-foreground focus:bg-muted/50 focus:text-foreground"
                >
                  <Settings className="size-4 opacity-60" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border/60" />
                <DropdownMenuItem
                  variant="destructive"
                  className="focus:bg-red-950/50"
                  onClick={() => {
                    void client?.auth.signOut().then(() => {
                      router.push("/?auth=sign-in");
                      router.refresh();
                    });
                  }}
                >
                  <LogOut className="size-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[720px] px-3 py-6 pb-[max(2rem,calc(1.25rem+env(safe-area-inset-bottom)))] sm:px-5 sm:py-10">
        <MemeReelsSection sectionId="reels-page-root" onOpenMovie={openMovie} />
      </main>
    </div>
  );
}
