// Swatch hexes for the color names used in the catalogue.
// "Standard" is the imported placeholder and gets no chip.
const COLOR_HEX: Record<string, string> = {
  black: "#141414",
  white: "#f7f7f5",
  offwhite: "#efece4",
  grey: "#8c8c8c",
  gray: "#8c8c8c",
  dark: "#2b2b2b",
  navy: "#1f2a44",
  blue: "#3b5b8c",
  denim: "#3f5878",
  green: "#3f5c47",
  olive: "#6b6b45",
  khaki: "#8a8360",
  beige: "#d8c9a9",
  camel: "#b5885a",
  cream: "#f0e7d3",
  brown: "#6b4a32",
  bordo: "#5d2230",
  pordo: "#5d2230",
  burgundy: "#5d2230",
  red: "#a33131",
  purple: "#5d4a75",
  pink: "#d6a5b1",
  orange: "#c97b3d",
  yellow: "#d9b64a",
};

export function colorHex(name: string): string | null {
  if (!name || name === "Standard") return null;
  return COLOR_HEX[name.trim().toLowerCase()] ?? null;
}
