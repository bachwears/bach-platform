"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

import { photoSrc } from "../lib/media";

export interface GalleryImage {
  kind: string;
  url: string;
}

/**
 * PDP photos: a full-bleed sideways swipe with a 1 / n counter on phones (the
 * buy box follows the first photo), a two-up grid on desktop.
 * Tapping a photo opens it full screen (arrow keys / on-screen arrows move,
 * Esc or backdrop closes). No hover zoom.
 */
export function PdpGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [shown, setShown] = useState(0);
  const track = useRef<HTMLDivElement>(null);

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

  return (
    <>
      <div className="relative">
      <div
        ref={track}
        onScroll={() => {
          const el = track.current;
          if (el && el.clientWidth) setShown(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] lg:grid lg:snap-none lg:grid-cols-2 lg:gap-2 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
      >
        {images.map((m, i) => (
          <button
            key={m.url}
            type="button"
            onClick={() => setOpen(i)}
            className="block w-full shrink-0 snap-center cursor-zoom-in bg-secondary"
            aria-label={`${name} — ${m.kind}`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              {...photoSrc(m.url, "(min-width: 1024px) 33vw, 100vw")}
              alt={`${name} — ${m.kind}`}
              loading={i < 2 ? "eager" : "lazy"}
              draggable={false}
              decoding="async"
              className="aspect-[3/4] w-full object-cover"
            />
          </button>
        ))}
      </div>
      {images.length > 1 && (
        <p
          aria-hidden
          className="type-meta pointer-events-none absolute bottom-3 start-4 tabular-nums text-white mix-blend-difference lg:hidden"
        >
          {shown + 1} / {images.length}
        </p>
      )}
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
