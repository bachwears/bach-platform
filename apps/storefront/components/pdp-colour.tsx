"use client";

import { createContext, useContext, useState } from "react";

import { PdpGallery, type GalleryImage } from "./pdp-gallery";

/**
 * The colour picked in the buy box, shared with the gallery so the photos
 * follow the colour chip. Holds color_en; null = the hero photos.
 */
const PdpColourContext = createContext<{ color: string | null; setColor: (c: string | null) => void }>({
  color: null,
  setColor: () => {},
});

export function PdpColourProvider({ initial, children }: { initial: string | null; children: React.ReactNode }) {
  const [color, setColor] = useState(initial);
  return <PdpColourContext.Provider value={{ color, setColor }}>{children}</PdpColourContext.Provider>;
}

export function usePdpColour() {
  return useContext(PdpColourContext);
}

/** The gallery of the picked colour; colours without their own photos fall back to the hero set. */
export function PdpColourGallery({
  hero,
  galleries,
  name,
  layout = "grid",
  start,
  end,
  focus,
}: {
  hero: GalleryImage[];
  /** color_en → that colour's photos (hero colour excluded) */
  galleries: Record<string, GalleryImage[]>;
  name: string;
  layout?: "grid" | "lead" | "stack";
  start?: number;
  end?: number;
  focus?: "top" | "bottom";
}) {
  const { color } = usePdpColour();
  const own = color ? galleries[color] : undefined;
  return (
    <PdpGallery
      key={own ? color : "hero"}
      images={own ?? hero}
      name={color && own ? `${name} — ${color}` : name}
      layout={layout}
      start={start}
      end={end}
      focus={focus}
    />
  );
}
