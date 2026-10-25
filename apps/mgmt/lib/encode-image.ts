/**
 * A canvas as a small web photo. WebP where the browser can write it; Safari
 * can't (canvas.toBlob("image/webp") silently returns a PNG — ~15x the bytes,
 * which is what blew the storage CDN quota in October 2026), so it falls back
 * to JPEG there. Files keep their .webp names either way (the site's paths
 * expect them); the upload is tagged with the real type.
 */
export async function encodePhoto(canvas: HTMLCanvasElement, quality = 0.82): Promise<Blob> {
  const as = (type: string, q: number) => new Promise<Blob | null>((r) => canvas.toBlob(r, type, q));
  const webp = await as("image/webp", quality);
  if (webp && webp.type === "image/webp") return webp;
  const jpeg = await as("image/jpeg", quality);
  if (jpeg && jpeg.type === "image/jpeg") return jpeg;
  throw new Error("photo encode failed");
}
