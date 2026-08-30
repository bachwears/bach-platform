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

export default async function ProductsPage() {
  const supabase = await supabaseServer();
  const { data: products } = await supabase
    .from("products")
    .select("id, name_ar, name_en, price_usd_cents, sale_price_usd_cents, status, categories(name_ar), product_variants(count)")
    .order("created_at", { ascending: false });

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
                        <Link href={`/products/${p.id}`} className="font-medium hover:underline">
                          {p.name_ar}
                        </Link>
                        <div className="text-xs text-muted-foreground" dir="ltr">
                          {p.name_en}
                        </div>
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
