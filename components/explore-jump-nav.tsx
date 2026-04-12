"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Hash } from "lucide-react";
import { cn } from "@/lib/utils";

export type ExploreJumpLink = {
  id: string;
  label: string;
};

type Props = {
  links: ExploreJumpLink[];
};

const ALIGN_GAP_PX = 10;

export function ExploreJumpNav({ links }: Props) {
  const [active, setActive] = useState<string | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const idSet = useMemo(() => new Set(links.map((l) => l.id)), [links]);

  useEffect(() => {
    const els = links
      .map((l) => document.getElementById(l.id))
      .filter((e): e is HTMLElement => e != null);
    if (!els.length) return;

    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => (b.intersectionRatio ?? 0) - (a.intersectionRatio ?? 0));
        const first = visible[0]?.target.id;
        if (first && idSet.has(first)) setActive(first);
      },
      { root: null, rootMargin: "-18% 0px -55% 0px", threshold: [0.08, 0.2, 0.35] },
    );

    for (const el of els) obs.observe(el);
    return () => obs.disconnect();
  }, [links, idSet]);

  const scrollTo = useCallback((id: string) => {
    const el = document.getElementById(id);
    if (!el) return;
    const nav = wrapRef.current;
    const navBottom = nav?.getBoundingClientRect().bottom ?? 0;
    if (!navBottom) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    const elTop = el.getBoundingClientRect().top;
    const nextY = window.scrollY + elTop - navBottom - ALIGN_GAP_PX;
    window.scrollTo({ top: Math.max(0, nextY), behavior: "smooth" });
  }, []);

  return (
    <div
      ref={wrapRef}
      className="sticky top-[calc(3.25rem+env(safe-area-inset-top,0px))] z-20 -mx-3 border-b border-border/40 bg-gradient-to-b from-background/95 via-background/90 to-background/70 px-3 py-2.5 backdrop-blur-xl sm:-mx-6 sm:px-6"
    >
      <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
        <Hash className="size-3 opacity-70" aria-hidden />
        Jump
      </div>
      <div className="flex touch-pan-x gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map((l) => (
          <button
            key={l.id}
            type="button"
            onClick={() => scrollTo(l.id)}
            className={cn(
              "min-h-11 shrink-0 rounded-full border px-3.5 py-2 text-xs font-medium transition",
              active === l.id
                ? "border-primary/50 bg-primary/15 text-foreground shadow-[0_0_20px_-8px_var(--color-primary)]"
                : "border-border/60 bg-muted/25 text-muted-foreground hover:border-border hover:bg-muted/45 hover:text-foreground",
            )}
          >
            {l.label}
          </button>
        ))}
      </div>
    </div>
  );
}
