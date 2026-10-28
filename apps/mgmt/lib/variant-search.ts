// The POS-style piece search shared by MGMT's stock screens (المخزون → تسجيل حركة,
// التحويل بين الفروع): searched in the browser over the whole variant list.

export interface SearchableVariant {
  name: string;
  sku: string | null;
  barcode?: string | null;
  size: string;
  color: string;
  /** more words to match (the colour's other language) */
  alt?: string | null;
}

/** Arabic-Indic digits (٠-٩ / ۰-۹) as Latin, so a typed SKU or barcode still matches. */
const latin = (s: string) => s.replace(/[٠-٩۰-۹]/g, (d) => String(((d.charCodeAt(0) - 0x0660) % 0x90) % 10));
const norm = (s: string) => latin(s).trim().toLowerCase();

/**
 * A scanned / typed barcode or SKU (exact) picks its piece at once; words
 * (name, colour, size, SKU, in any order) list up to `limit` matches.
 */
export function findVariants<T extends SearchableVariant>(variants: T[], query: string, exact: boolean, limit = 8): T[] {
  const q = norm(query);
  if (!q) return [];
  if (exact) {
    const hit = variants.find((v) => v.barcode?.toLowerCase() === q || v.sku?.toLowerCase() === q);
    if (hit) return [hit];
  }
  const words = q.split(/\s+/);
  return variants
    .filter((v) => {
      const text = `${v.name} ${v.sku ?? ""} ${v.barcode ?? ""} ${v.color} ${v.alt ?? ""} ${v.size}`.toLowerCase();
      return words.every((w) => text.includes(w));
    })
    .slice(0, limit);
}
