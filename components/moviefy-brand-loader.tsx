"use client";

import { Clapperboard } from "lucide-react";
import { cn } from "@/lib/utils";

type Size = "sm" | "md" | "lg";

const wrap: Record<Size, string> = {
  sm: "size-11 min-h-[2.75rem] min-w-[2.75rem]",
  md: "size-14 min-h-14 min-w-14",
  lg: "size-[4.5rem] min-h-[4.5rem] min-w-[4.5rem] sm:size-20 sm:min-h-20 sm:min-w-20",
};

const icon: Record<Size, string> = {
  sm: "size-5",
  md: "size-6",
  lg: "size-8 sm:size-9",
};

/** Spinning ring + clapper mark — use inside loaders and buttons. */
export function MoviefyBrandMark({
  size = "md",
  className,
}: {
  size?: Size;
  className?: string;
}) {
  return (
    <div
      className={cn("relative shrink-0", wrap[size], className)}
      aria-hidden
    >
      <div
        className={cn(
          "absolute inset-0 rounded-2xl border-2 border-white/12 border-t-primary border-l-primary/50 motion-safe:animate-spin motion-safe:[animation-duration:1.15s] motion-reduce:border-primary/40 motion-reduce:animate-none",
        )}
      />
      <div className="absolute inset-[3px] flex items-center justify-center rounded-[11px] bg-zinc-950/95 ring-1 ring-white/10">
        <Clapperboard className={cn(icon[size], "text-primary")} />
      </div>
    </div>
  );
}

/** Soft glow + clapper — “in the works” teases (no data loading spin). */
export function MoviefyTeaseMark({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative mx-auto flex size-28 items-center justify-center sm:size-32",
        className,
      )}
      aria-hidden
    >
      <div className="absolute inset-3 rounded-[1.35rem] bg-gradient-to-br from-primary/25 via-rose-500/20 to-amber-400/25 blur-lg motion-safe:animate-pulse motion-reduce:animate-none" />
      <div className="relative flex size-[5.25rem] items-center justify-center rounded-2xl border border-amber-400/25 bg-gradient-to-br from-card via-card to-zinc-950/90 shadow-[0_24px_60px_-28px_rgba(0,0,0,0.75)] ring-2 ring-amber-500/15 sm:size-[5.75rem]">
        <Clapperboard
          className="size-11 text-amber-100 sm:size-12"
          strokeWidth={1.65}
        />
      </div>
    </div>
  );
}

/** Centered mark + friendly line (full-screen gates, panels). */
export function MoviefyBrandLoader({
  label = "Loading…",
  size = "lg",
  className,
}: {
  label?: string | null;
  size?: Size;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 text-center",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <MoviefyBrandMark size={size} />
      {label ? (
        <p className="max-w-[18rem] text-sm leading-relaxed text-white/55 sm:max-w-[20rem] sm:text-base sm:text-white/50">
          {label}
        </p>
      ) : null}
    </div>
  );
}

/** Horizontal strip — detail pages, rails, calendars. */
export function MoviefyBrandLoaderRow({
  label = "Loading…",
  size = "sm",
  className,
  labelClassName,
}: {
  label?: string;
  size?: Size;
  className?: string;
  /** e.g. `text-muted-foreground` on light card surfaces */
  labelClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-3 sm:gap-4 sm:px-4",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <MoviefyBrandMark size={size} />
      <p
        className={cn(
          "min-w-0 flex-1 text-left text-sm leading-snug text-white/60 sm:text-white/55",
          labelClassName,
        )}
      >
        {label}
      </p>
    </div>
  );
}
