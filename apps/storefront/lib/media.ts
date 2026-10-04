/**
 * Product photos are uploaded as {name}-1600.webp with -800 and -400 siblings.
 * For those, return a srcSet so phones fetch the smaller file; other URLs pass through.
 */
export function photoSrc(url: string, sizes: string): { src: string; srcSet?: string; sizes?: string } {
  if (!url.endsWith("-1600.webp")) return { src: url };
  const base = url.slice(0, -"1600.webp".length);
  return { src: url, srcSet: `${base}400.webp 400w, ${base}800.webp 800w, ${url} 1600w`, sizes };
}
