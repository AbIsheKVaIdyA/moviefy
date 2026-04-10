import Image from "next/image";

import { cn } from "@/lib/utils";

type PosterImageProps = {
  src: string;
  alt: string;
  /** Tailwind gradient classes when `src` is empty (e.g. `from-zinc-800 to-zinc-950`). */
  placeholderGradient?: string;
  className?: string;
  sizes?: string;
  priority?: boolean;
} & (
  | { fill: true; width?: never; height?: never }
  | { fill?: false; width: number; height: number }
);

function isRemote(src: string) {
  return src.startsWith("https://") || src.startsWith("http://");
}

function isSvgSrc(src: string) {
  return src.endsWith(".svg") || src.includes(".svg?");
}

/**
 * Remote `https` poster URLs use `<img>`. Local paths use `next/image`.
 * Empty `src` renders a gradient placeholder when `placeholderGradient` is set.
 */
export function PosterImage({
  src,
  alt,
  placeholderGradient,
  className,
  sizes,
  priority,
  fill,
  width,
  height,
}: PosterImageProps) {
  const trimmed = src?.trim() ?? "";
  if (!trimmed) {
    const grad = placeholderGradient ?? "from-zinc-800 to-zinc-950";
    if (fill) {
      return (
        <div
          role="img"
          aria-label={alt}
          className={cn(
            "absolute inset-0 h-full w-full bg-gradient-to-br",
            grad,
            className,
          )}
        />
      );
    }
    return (
      <div
        role="img"
        aria-label={alt}
        style={{ width, height }}
        className={cn("bg-gradient-to-br", grad, className)}
      />
    );
  }

  if (isRemote(trimmed) || isSvgSrc(trimmed)) {
    if (fill) {
      return (
        <img
          src={trimmed}
          alt={alt}
          decoding="async"
          loading={priority ? "eager" : "lazy"}
          referrerPolicy="no-referrer"
          className={cn("absolute inset-0 h-full w-full object-cover", className)}
        />
      );
    }
    return (
      <img
        src={trimmed}
        alt={alt}
        width={width}
        height={height}
        decoding="async"
        loading={priority ? "eager" : "lazy"}
        referrerPolicy="no-referrer"
        className={cn(className)}
      />
    );
  }

  return (
    <Image
      src={trimmed}
      alt={alt}
      fill={fill}
      width={fill ? undefined : width}
      height={fill ? undefined : height}
      className={cn(fill && "absolute inset-0 h-full w-full", className)}
      sizes={sizes}
      priority={priority}
    />
  );
}
