export interface HealthRow {
  id: string;
  name_en: string;
  name_ar: string;
  status: string;
  description_en: string | null;
  description_ar: string | null;
  material_en: string | null;
  care_en: string | null;
  fit: string | null;
  meta_title_en: string | null;
  meta_description_en: string | null;
  meta_title_ar: string | null;
  meta_description_ar: string | null;
  categories: { code: string } | null;
  product_variants: Array<{ size: string; barcode: string | null }>;
  product_seasons: Array<{ season: string }>;
  media_assets: Array<{ id: string }>;
}

export interface IssueDef {
  key: string;
  label: string;
  /** critical issues block publishing quality; info issues are nice-to-fix */
  severity: "critical" | "info";
  test: (p: HealthRow) => boolean;
}

const GARMENT_WORDS = ["تيشيرت", "قميص", "كنزة", "بنطلون", "هودي", "جاكيت", "بولو", "جينز", "حذاء", "بوط"];

export const ISSUES: IssueDef[] = [
  {
    key: "no-photos",
    label: "بلا صور",
    severity: "critical",
    test: (p) => p.media_assets.length === 0,
  },
  {
    key: "no-sizes",
    label: "بلا مقاسات",
    severity: "critical",
    test: (p) => p.product_variants.length > 0 && p.product_variants.every((v) => v.size === "OS"),
  },
  {
    key: "no-variants",
    label: "بلا فاريانت",
    severity: "critical",
    test: (p) => p.product_variants.length === 0,
  },
  {
    key: "no-desc-ar",
    label: "بلا وصف عربي",
    severity: "critical",
    test: (p) => !p.description_ar?.trim(),
  },
  {
    key: "weak-name-ar",
    label: "اسم عربي للمراجعة",
    severity: "info",
    test: (p) =>
      p.name_ar === p.name_en || GARMENT_WORDS.filter((w) => p.name_ar.includes(w)).length > 1,
  },
  {
    key: "misc-category",
    label: "فئة متنوّع",
    severity: "critical",
    test: (p) => p.categories?.code === "MSC",
  },
  {
    key: "no-desc-en",
    label: "بلا وصف إنكليزي",
    severity: "info",
    test: (p) => !p.description_en?.trim(),
  },
  {
    key: "no-material",
    label: "بلا خامة/عناية",
    severity: "info",
    test: (p) => !p.material_en?.trim() || !p.care_en?.trim(),
  },
  {
    key: "no-fit",
    label: "بلا Fit",
    severity: "info",
    test: (p) => !p.fit?.trim(),
  },
  {
    key: "no-seasons",
    label: "بلا مواسم",
    severity: "info",
    test: (p) => p.product_seasons.length === 0,
  },
  {
    key: "no-barcode",
    label: "فاريانت بلا باركود",
    severity: "info",
    test: (p) => p.product_variants.some((v) => !v.barcode),
  },
  {
    key: "no-seo",
    label: "بلا SEO",
    severity: "info",
    test: (p) =>
      !p.meta_title_en?.trim() ||
      !p.meta_description_en?.trim() ||
      !p.meta_title_ar?.trim() ||
      !p.meta_description_ar?.trim(),
  },
];

export function analyze(products: HealthRow[]) {
  const counts: Record<string, number> = {};
  const perProduct = products.map((p) => {
    const issues = ISSUES.filter((d) => d.test(p));
    for (const i of issues) counts[i.key] = (counts[i.key] ?? 0) + 1;
    return { product: p, issues };
  });
  const critical = perProduct.filter((r) => r.issues.some((i) => i.severity === "critical")).length;
  const clean = perProduct.filter((r) => r.issues.length === 0).length;
  return { perProduct, counts, critical, clean };
}
