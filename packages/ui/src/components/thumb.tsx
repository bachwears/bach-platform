/* eslint-disable @next/next/no-img-element */
import { cn } from "../lib/utils";

/**
 * A small 2:3 product photo for lists on staff screens. Without a photo it
 * keeps its place as a quiet empty frame, so rows stay aligned.
 */
export function Thumb({ src, className, size = "md" }: { src: string | null | undefined; className?: string; size?: "sm" | "md" | "lg" }) {
  const dims = size === "sm" ? "h-9 w-6" : size === "lg" ? "h-16 w-11" : "h-12 w-8";
  return src ? (
    <img src={src} alt="" loading="lazy" decoding="async" className={cn(dims, "shrink-0 bg-muted object-cover", className)} />
  ) : (
    <span aria-hidden className={cn(dims, "shrink-0 bg-muted", className)} />
  );
}
