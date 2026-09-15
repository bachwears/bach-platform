import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";

import { Nav } from "../../components/nav";

const STATUS_LABELS: Record<string, { label: string; variant: "success" | "secondary" | "outline" }> = {
  published: { label: "منشور", variant: "success" },
  draft: { label: "مسودة", variant: "secondary" },
  archived: { label: "مؤرشف", variant: "outline" },
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "no-photos", label: "بلا صور" },
  { key: "draft", label: "مسودات" },
  { key: "published", label: "منشور" },
];

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ f?: string }> }) {
  const { f } = await searchParams;
  const filter = FILTERS.some((x) => x.key === f) ? f! : "all";
  const supabase = await supabaseServer();
  const { data: all } = await supabase
    .from("products")
    .select("id, name_en, price_usd_cents, sale_price_usd_cents, status, categories(name_ar), product_variants(count), media_assets(count)")
    .order("created_at", { ascending: false });

  const withMedia = (all ?? []).map((p) => ({
    ...p,
    photoCount: (p.media_assets as unknown as Array<{ count: number }>)?.[0]?.count ?? 0,
  }));
  const products =
    filter === "no-photos"
      ? withMedia.filter((p) => p.photoCount === 0)
      : filter === "all"
        ? withMedia
        : withMedia.filter((p) => p.status === filter);
  const noPhotoCount = withMedia.filter((p) => p.photoCount === 0).length;

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold tracking-tight">المنتجات</h1>
          <Button asChild>
            <Link href="/products/new">+ منتج جديد</Link>
          </Button>
        </div>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((x) => (
            <Link
              key={x.key}
              href={x.key === "all" ? "/products" : `/products?f=${x.key}`}
              className={
                (filter === x.key
                  ? "bg-foreground text-background "
                  : "text-muted-foreground hover:text-foreground ") +
                "rounded-full border px-4 py-1.5 text-sm transition-colors"
              }
            >
              {x.label}
              {x.key === "no-photos" ? ` (${noPhotoCount})` : ""}
            </Link>
          ))}
        </div>

        {!products?.length ? (
          <p className="rounded-md border p-8 text-center text-muted-foreground">
            ما في منتجات بعد — ابدأ بإضافة أول منتج.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-start">
                  <th className="p-3 text-start font-medium">المنتج</th>
                  <th className="p-3 text-start font-medium">الفئة</th>
                  <th className="p-3 text-start font-medium">السعر</th>
                  <th className="p-3 text-start font-medium">الفاريانتس</th>
                  <th className="p-3 text-start font-medium">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const status = STATUS_LABELS[p.status] ?? STATUS_LABELS.draft!;
                  const category = p.categories as unknown as { name_ar: string } | null;
                  const variantCount =
                    (p.product_variants as unknown as Array<{ count: number }>)?.[0]?.count ?? 0;
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-3">
                        <Link href={`/products/${p.id}`} className="font-medium hover:underline" dir="ltr">
                          {p.name_en}
                        </Link>
                      </td>
                      <td className="p-3">{category?.name_ar ?? "—"}</td>
                      <td className="p-3" dir="ltr">
                        ${(p.price_usd_cents / 100).toFixed(2)}
                        {p.sale_price_usd_cents != null && (
                          <span className="ms-2 text-xs text-muted-foreground line-through">
                            ${(p.sale_price_usd_cents / 100).toFixed(2)}
                          </span>
                        )}
                      </td>
                      <td className="p-3">{variantCount}</td>
                      <td className="p-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
