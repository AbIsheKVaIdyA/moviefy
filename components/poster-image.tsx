import Image from "next/image";

import { cn } from "@/lib/utils";

type PosterImageProps = {
  src: string;
  alt: string;
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
 * Remote URLs (e.g. AI poster CDNs) use <img> so the browser loads them directly — no optimizer quirks.
 * Local paths still go through next/image where helpful.
 */
export function PosterImage({
  src,
  alt,
  className,
  sizes,
  priority,
  fill,
  width,
  height,
}: PosterImageProps) {
  if (isRemote(src) || isSvgSrc(src)) {
    if (fill) {
      return (
        <img
          src={src}
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
        src={src}
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
      src={src}
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
