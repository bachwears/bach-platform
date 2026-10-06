"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";


/** Words for what a photo shows, for alt text. */
function viewLabel(m: { kind: string; url: string }) {
  return (
    ({
      front: "front view",
      back: "back view",
      model: "worn",
      "model-front": "worn, front",
      "model-back": "worn, back",
      "model-zoom": "worn, close-up",
      detail: "detail",
    } as Record<string, string>)[photoView(m).view] ?? "photo"
  );
}
import { photoSrc, photoView } from "../lib/media";
import { RetryImg } from "./retry-img";

export interface GalleryImage {
  kind: string;
  url: string;
}

/**
 * PDP photos. "grid": two-up (desktop). "lead": the first photo alone, under the
 * header, with the buy box right after it (phones). "stack": the remaining photos
 * one under another further down the page (phones). start/end pick the slice;
 * the full-screen viewer (tap a photo; arrows / Esc) always walks every photo.
 */
export function PdpGallery({
  images,
  name,
  layout = "grid",
  start = 0,
  end,
  focus = "top",
}: {
  images: GalleryImage[];
  name: string;
  layout?: "grid" | "lead" | "stack";
  start?: number;
  end?: number;
  /** where the cropped phone lead photo keeps its subject: worn shots of shoes keep the bottom */
  focus?: "top" | "bottom";
}) {
  const [open, setOpen] = useState<number | null>(null);

  const step = useCallback(
    (delta: number) => {
      setOpen((cur) => (cur == null ? cur : (cur + delta + images.length) % images.length));
    },
    [images.length],
  );

  useEffect(() => {
    if (open == null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") step(1);
      if (e.key === "ArrowLeft") step(-1);
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, step]);

  const slice = images.slice(start, end);
  if (!slice.length) return null;

  return (
    <>
      <div className={layout === "grid" ? "grid grid-cols-2 gap-2" : "grid gap-0.5"}>
        {slice.map((m, k) => {
          const i = start + k;
          return (
            <button
              key={m.url}
              type="button"
              onClick={() => setOpen(i)}
              className={layout === "lead" ? "block w-full cursor-zoom-in px-4 pt-2" : "block w-full cursor-zoom-in bg-secondary"}
              aria-label={`${name} — ${viewLabel(m)}`}
            >
              <RetryImg
                {...photoSrc(
                  m.url,
                  // the phone layouts are hidden on desktop: same sizes as the grid there, so the
                  // first photo resolves to one file and isn't downloaded twice
                  layout === "grid" || i === 0 ? "(min-width: 1024px) 33vw, 100vw" : "100vw",
                )}
                alt={`${name} — ${viewLabel(m)}`}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                draggable={false}
                decoding="async"
                className={
                  layout === "lead"
                    ? // the whole photo, never cropped (Zara-style): as wide as the screen allows,
                      // short enough that name, price and ADD still fit on the first screen
                      "mx-auto h-auto max-h-[calc(100dvh-20rem)] w-auto max-w-full object-contain"
                    : "aspect-[3/4] w-full object-cover"
                }
              />
            </button>
          );
        })}
      </div>

      {open != null && images[open] && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-background"
          role="dialog"
          aria-modal="true"
          aria-label={name}
          onClick={() => setOpen(null)}
        >
          <RetryImg
            src={images[open].url}
            alt={`${name} — ${viewLabel(images[open])}`}
            className="max-h-full max-w-full object-contain"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(null)}
            className="absolute end-2 top-2 grid h-11 w-11 place-items-center"
          >
            <X className="h-6 w-6" strokeWidth={1} aria-hidden />
          </button>
          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous"
                onClick={(e) => {
                  e.stopPropagation();
                  step(-1);
                }}
                className="type-label absolute start-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center"
              >
                ‹
              </button>
              <button
                type="button"
                aria-label="Next"
                onClick={(e) => {
                  e.stopPropagation();
                  step(1);
                }}
                className="type-label absolute end-2 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center"
              >
                ›
              </button>
              <p className="type-meta absolute bottom-4 start-1/2 -translate-x-1/2 tabular-nums">
                {open + 1} / {images.length}
              </p>
            </>
          )}
        </div>
      )}
    </>
  );
}
