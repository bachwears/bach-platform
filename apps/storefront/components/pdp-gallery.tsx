"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export interface GalleryImage {
  kind: string;
  url: string;
}

/**
 * PDP gallery: below lg a full-bleed swipe carousel so name, price and the bag
 * button stay near the fold; from lg a stacked column with cursor-tracked hover
 * zoom. Click opens a lightbox (arrow keys / on-screen arrows, Esc or backdrop).
 */
export function PdpGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const [open, setOpen] = useState<number | null>(null);
  const [slide, setSlide] = useState(0);
  const track = useRef<HTMLDivElement>(null);

  const onScroll = useCallback(() => {
    const el = track.current;
    if (!el || !el.clientWidth) return;
    setSlide(Math.round(Math.abs(el.scrollLeft) / el.clientWidth));
  }, []);

  const goTo = (i: number) => {
    const el = track.current;
    if (!el) return;
    const dir = getComputedStyle(el).direction === "rtl" ? -1 : 1;
    el.scrollTo({ left: dir * i * el.clientWidth, behavior: "smooth" });
  };

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
      <div className="relative -mx-4 lg:mx-0">
        <div
          ref={track}
          onScroll={onScroll}
          className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] lg:block lg:space-y-4 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
        >
          {images.map((m, i) => (
            <button
              key={m.kind}
              type="button"
              onClick={() => setOpen(i)}
              className="group/zoom block w-full shrink-0 snap-center cursor-zoom-in overflow-hidden bg-secondary"
              aria-label={`${name} — ${m.kind}`}
              onMouseMove={(e) => {
                const img = e.currentTarget.querySelector("img");
                if (!img) return;
                const r = e.currentTarget.getBoundingClientRect();
                img.style.transformOrigin = `${(((e.clientX - r.left) / r.width) * 100).toFixed(1)}% ${(((e.clientY - r.top) / r.height) * 100).toFixed(1)}%`;
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={m.url}
                alt={`${name} — ${m.kind}`}
                className="aspect-[3/4] w-full object-cover transition-transform duration-200 group-hover/zoom:scale-150 motion-reduce:transition-none motion-reduce:group-hover/zoom:scale-100"
              />
            </button>
          ))}
        </div>
        {images.length > 1 && (
          <div className="pointer-events-none absolute inset-x-0 bottom-3 flex items-center justify-center gap-1.5 lg:hidden">
            {images.map((m, i) => (
              <button
                key={m.kind}
                type="button"
                aria-label={`${i + 1} / ${images.length}`}
                aria-current={i === slide}
                onClick={() => goTo(i)}
                className={`pointer-events-auto h-1.5 rounded-full bg-neutral-900/70 transition-all duration-200 motion-reduce:transition-none ${
                  i === slide ? "w-5" : "w-1.5 opacity-40"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      {open != null && images[open] && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-black/80 p-4"
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
            className="absolute end-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
          >
            ✕
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
                className="absolute start-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
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
                className="absolute end-4 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full bg-white/10 text-white hover:bg-white/20"
              >
                ›
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}
