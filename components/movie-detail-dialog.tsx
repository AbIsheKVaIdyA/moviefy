"use client";

import { Dialog, DialogContent } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { MovieDetailView, type MovieDetailViewProps } from "@/components/movie-detail-view";

export type { MovieDetailViewProps } from "@/components/movie-detail-view";

type DialogProps = Omit<
  MovieDetailViewProps,
  "active" | "variant" | "onRequestClose" | "backHref"
> & {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function MovieDetailDialog({ open, onOpenChange, ...rest }: DialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className={cn(
          "flex max-h-[95dvh] min-h-0 w-[min(100vw-1rem,min(64rem,96vw))] max-w-none flex-col gap-0 overflow-hidden border border-white/10 bg-[#121212] p-0 text-white shadow-2xl ring-white/10",
        )}
      >
        <MovieDetailView
          {...rest}
          active={open}
          variant="dialog"
          onRequestClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
