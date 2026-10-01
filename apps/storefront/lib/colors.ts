// Swatch hexes for the color names used in the catalogue.
// "Standard" is the imported placeholder and gets no chip.
const COLOR_HEX: Record<string, string> = {
  black: "#141414",
  white: "#f7f7f5",
  offwhite: "#efece4",
  "off-white": "#efece4",
  grey: "#8c8c8c",
  gray: "#8c8c8c",
  "light grey": "#c4c4c1",
  "dark grey": "#4a4a4a",
  dark: "#2b2b2b",
  navy: "#1f2a44",
  blue: "#3b5b8c",
  "light blue": "#a9c1dc",
  "dark blue": "#1e3150",
  denim: "#3f5878",
  green: "#3f5c47",
  "dark green": "#2c3f30",
  mint: "#a8d5c2",
  olive: "#6b6b45",
  khaki: "#8a8360",
  beige: "#d8c9a9",
  "dark beige": "#b9a582",
  camel: "#b5885a",
  cream: "#f0e7d3",
  brown: "#6b4a32",
  bordo: "#5d2230",
  pordo: "#5d2230",
  burgundy: "#5d2230",
  red: "#a33131",
  brick: "#9a4a35",
  purple: "#5d4a75",
  mauve: "#a88a96",
  pink: "#d6a5b1",
  orange: "#c97b3d",
  yellow: "#d9b64a",
};

export function colorHex(name: string): string | null {
  if (!name || name === "Standard") return null;
  return COLOR_HEX[name.trim().toLowerCase()] ?? null;
}

/**
 * CSS background for a swatch. Two-tone names ("Beige/Blue") get a hard
 * half-and-half split; null when any part is unknown.
 */
export function colorFill(name: string): string | null {
  if (!name || name === "Standard") return null;
  const parts = name.split("/").map((p) => colorHex(p));
  if (parts.some((p) => !p)) return null;
  if (parts.length === 1) return parts[0]!;
  return `linear-gradient(135deg, ${parts[0]} 50%, ${parts[1]} 50%)`;
}
