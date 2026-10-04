"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";

import { photoSrc } from "../lib/media";

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
}: {
  images: GalleryImage[];
  name: string;
  layout?: "grid" | "lead" | "stack";
  start?: number;
  end?: number;
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
              className="block w-full cursor-zoom-in bg-secondary"
              aria-label={`${name} — ${m.kind}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                {...photoSrc(m.url, layout === "grid" ? "(min-width: 1024px) 33vw, 100vw" : "100vw")}
                alt={`${name} — ${m.kind}`}
                loading={i === 0 ? "eager" : "lazy"}
                fetchPriority={i === 0 ? "high" : undefined}
                draggable={false}
                decoding="async"
                className={
                  layout === "lead"
                    ? "aspect-[3/4] max-h-[60dvh] w-full object-cover object-[center_20%]"
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
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={images[open].url}
            alt={`${name} — ${images[open].kind}`}
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
