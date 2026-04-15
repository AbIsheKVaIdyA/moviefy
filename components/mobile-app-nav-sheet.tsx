"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bookmark,
  CalendarDays,
  Clapperboard,
  Compass,
  Film,
  Heart,
  Home,
  Menu,
  X,
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TheatreLibraryNav = "playlists" | "saved" | "coming";

export type MobileAppNavSheetProps = {
  /** When set, shows Home / Saved / Coming rows (Your theatre screen only). */
  theatreLibrary?: {
    active: TheatreLibraryNav;
    onSelect: (nav: TheatreLibraryNav) => void;
  };
};

function chipClass(active: boolean) {
  return cn(
    buttonVariants({ variant: "secondary", size: "sm" }),
    "h-auto min-h-11 w-full justify-start gap-2.5 rounded-xl border-0 bg-muted/50 px-3 py-2.5 text-left text-sm font-medium text-foreground hover:bg-muted/70",
    active && "bg-muted/70 ring-1 ring-violet-400/45",
  );
}

export function MobileAppNavSheet({ theatreLibrary }: MobileAppNavSheetProps) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname() ?? "";

  const close = () => setOpen(false);

  const onTheatreNav = (nav: TheatreLibraryNav) => {
    theatreLibrary?.onSelect(nav);
    close();
  };

  const theatrePath = pathname === "/app" || pathname === "/app/";
  const explorePath = pathname.startsWith("/app/explore");
  const releasesPath = pathname.startsWith("/app/releases");
  const reelsPath = pathname.startsWith("/app/reels");

  return (
    <div className="lg:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger
          type="button"
          aria-label="Open menu"
          className={cn(
            buttonVariants({ variant: "outline", size: "icon" }),
            "shrink-0 border-border/60 bg-muted/35 text-foreground shadow-sm hover:bg-muted/55",
          )}
        >
          <Menu className="size-5" aria-hidden />
        </SheetTrigger>
        <SheetContent
          side="left"
          showCloseButton={false}
          className="flex w-[min(100vw-1rem,20rem)] max-w-[min(100vw-1rem,20rem)] flex-col gap-0 border-border/60 bg-card/98 p-0 shadow-xl supports-[backdrop-filter]:backdrop-blur-xl sm:max-w-xs"
        >
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-muted/30 px-3 py-2.5 pl-[max(0.75rem,env(safe-area-inset-left,0px))] pr-[max(0.5rem,env(safe-area-inset-right,0px))] pt-[max(0.5rem,env(safe-area-inset-top,0px))]">
            <SheetTitle className="font-heading text-base font-semibold tracking-tight text-foreground">
              Menu
            </SheetTitle>
            <SheetClose
              render={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  className="shrink-0 rounded-full text-muted-foreground hover:bg-muted/80 hover:text-foreground"
                  aria-label="Close menu"
                />
              }
            >
              <X className="size-4" aria-hidden />
            </SheetClose>
          </div>

          <nav
            className="flex min-h-0 min-w-0 flex-1 flex-col gap-1.5 overflow-y-auto overscroll-contain px-3 py-3 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
            aria-label="App sections"
          >
            {theatreLibrary ? (
              <>
                <Link
                  href="/app"
                  className={chipClass(
                    theatrePath && theatreLibrary.active === "playlists",
                  )}
                  onClick={() => {
                    theatreLibrary.onSelect("playlists");
                    close();
                  }}
                >
                  <Home className="size-4 shrink-0 opacity-90" aria-hidden />
                  Theatre
                </Link>
                <button
                  type="button"
                  className={chipClass(
                    theatrePath && theatreLibrary.active === "saved",
                  )}
                  onClick={() => onTheatreNav("saved")}
                >
                  <Heart className="size-4 shrink-0 opacity-90" aria-hidden />
                  Saved
                </button>
                <button
                  type="button"
                  className={chipClass(
                    theatrePath && theatreLibrary.active === "coming",
                  )}
                  onClick={() => onTheatreNav("coming")}
                >
                  <Bookmark className="size-4 shrink-0 opacity-90" aria-hidden />
                  Coming
                </button>
                <Separator className="my-1.5 bg-border/50" />
              </>
            ) : (
              <Link
                href="/app"
                className={chipClass(theatrePath)}
                onClick={close}
              >
                <Clapperboard className="size-4 shrink-0 opacity-90" aria-hidden />
                Theatre
              </Link>
            )}

            <Link
              href="/app/explore"
              className={chipClass(explorePath)}
              onClick={close}
            >
              <Compass className="size-4 shrink-0 opacity-90" aria-hidden />
              Explore
            </Link>
            <Link
              href="/app/releases"
              className={chipClass(releasesPath)}
              onClick={close}
            >
              <CalendarDays className="size-4 shrink-0 opacity-90" aria-hidden />
              Radar
            </Link>
            <Link
              href="/app/reels"
              className={chipClass(reelsPath)}
              onClick={close}
            >
              <Film className="size-4 shrink-0 opacity-90" aria-hidden />
              Reels
            </Link>
          </nav>
        </SheetContent>
      </Sheet>
    </div>
  );
}
