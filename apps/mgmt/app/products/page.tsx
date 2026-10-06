import Link from "next/link";
import { Printer } from "lucide-react";
import { supabaseServer } from "@bach/supabase/server";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { PageHeader } from "@bach/ui/components/page-header";

import { MissingPhotosAlert } from "../../components/missing-photos-alert";
import { Nav } from "../../components/nav";

const STATUS_LABELS: Record<string, { label: string; variant: "success" | "secondary" | "outline" }> = {
  published: { label: "منشور", variant: "success" },
  draft: { label: "مسودة", variant: "secondary" },
  archived: { label: "مؤرشف", variant: "outline" },
};

const FILTERS: Array<{ key: string; label: string }> = [
  { key: "all", label: "الكل" },
  { key: "no-photos", label: "بلا صور" },
  { key: "branded", label: "شعار ماركة" },
  { key: "draft", label: "مسودات" },
  { key: "published", label: "منشور" },
];

type Row = {
  id: string;
  name_en: string;
  name_ar: string | null;
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
  status: string;
  tags: string[] | null;
  categories: { name_ar: string } | null;
  product_variants: Array<{ sku: string | null; inventory_levels: Array<{ quantity: number; reserved: number }> }>;
  media_assets: Array<{ kind: string; storage_path: string }>;
};

export default async function ProductsPage({ searchParams }: { searchParams: Promise<{ f?: string; q?: string }> }) {
  const { f, q: rawQ = "" } = await searchParams;
  const filter = FILTERS.some((x) => x.key === f) ? f! : "all";
  const q = rawQ.trim();
  const supabase = await supabaseServer();
  const { data: all } = await supabase
    .from("products")
    .select(
      "id, name_en, name_ar, price_usd_cents, sale_price_usd_cents, status, tags, categories(name_ar), product_variants(sku, inventory_levels(quantity, reserved)), media_assets(kind, storage_path)",
    )
    .order("created_at", { ascending: false });

  const rows = ((all ?? []) as unknown as Row[]).map((p) => ({
    ...p,
    front: p.media_assets.find((m) => m.kind === "front")?.storage_path ?? null,
    photoCount: p.media_assets.length,
    variantCount: p.product_variants.length,
    // sellable units across every branch
    stock: p.product_variants.reduce(
      (n, v) => n + (v.inventory_levels ?? []).reduce((m, l) => m + l.quantity - l.reserved, 0),
      0,
    ),
    // Internal flag: the supplier piece carries a third-party brand logo.
    // MGMT-only — the storefront never renders product tags.
    branded: (p.tags ?? []).includes("branded-logo"),
  }));

  // Search matches the English/Arabic name or any variant SKU.
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  const searched = words.length
    ? rows.filter((p) => {
        const hay = [p.name_en, p.name_ar ?? "", ...p.product_variants.map((v) => v.sku ?? "")].join(" ").toLowerCase();
        return words.every((w) => hay.includes(w));
      })
    : rows;
  const products =
    filter === "no-photos"
      ? searched.filter((p) => !p.front)
      : filter === "branded"
        ? searched.filter((p) => p.branded)
        : filter === "all"
          ? searched
          : searched.filter((p) => p.status === filter);
  const noPhotoCount = rows.filter((p) => !p.front).length;
  const brandedCount = rows.filter((p) => p.branded).length;
  const href = (key: string) => {
    const params = new URLSearchParams();
    if (key !== "all") params.set("f", key);
    if (q) params.set("q", q);
    const s = params.toString();
    return s ? `/products?${s}` : "/products";
  };

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <PageHeader
          title="المنتجات"
          description="كل قطع الكاتالوغ — دوّر بالاسم أو الـ SKU، وافتح أي قطعة لتعدّل صورها وأسعارها ومقاساتها."
          hint={{
            title: "المنتجات",
            what: "لائحة كل القطع: الصورة الأمامية، الفئة، السعر، المخزون المتوفّر بكل الفروع، وحالة النشر.",
            source: "جدول المنتجات والفاريانتس، والمخزون من كل الفروع (الكمية ناقص المحجوز).",
            edit: "اكبس على اسم القطعة لتفتح صفحتها، أو «+ منتج جديد» لتزيد قطعة.",
          }}
          actions={
            <Button asChild>
              <Link href="/products/new">+ منتج جديد</Link>
            </Button>
          }
        />

        <MissingPhotosAlert />

        <form action="/products" className="flex flex-wrap items-center gap-2">
          {filter !== "all" ? <input type="hidden" name="f" value={filter} /> : null}
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="دوّر بالاسم أو الـ SKU…"
            aria-label="دوّر بالاسم أو الـ SKU"
            className="h-10 min-w-0 flex-1 border bg-background px-3 text-sm sm:max-w-sm"
          />
          <Button type="submit" variant="outline">
            دوّر
          </Button>
          {q ? (
            <Link href={href(filter)} className="text-sm text-muted-foreground underline underline-offset-4">
              امسح البحث
            </Link>
          ) : null}
        </form>

        <div className="flex flex-wrap gap-2">
          {FILTERS.map((x) => (
            <Link
              key={x.key}
              href={href(x.key)}
              className={
                (filter === x.key
                  ? "bg-foreground text-background "
                  : "text-muted-foreground hover:text-foreground ") +
                "border px-4 py-1.5 text-sm transition-colors"
              }
            >
              {x.label}
              {x.key === "no-photos" ? ` (${noPhotoCount})` : x.key === "branded" ? ` (${brandedCount})` : ""}
            </Link>
          ))}
        </div>

        {q ? (
          <p className="text-sm text-muted-foreground">
            {products.length} نتيجة لـ «{q}»
          </p>
        ) : null}

        {!products.length ? (
          <div className="space-y-2 border p-8 text-center text-sm text-muted-foreground">
            <p>
              {q
                ? "ما في قطعة بهالاسم أو الـ SKU — جرّب كلمة أقصر أو امسح البحث."
                : filter !== "all"
                  ? "ما في قطع بهالفلتر."
                  : "ما في منتجات بعد — ابدأ بإضافة أول قطعة."}
            </p>
            <Link
              href={q || filter !== "all" ? "/products" : "/products/new"}
              className="inline-block text-foreground underline underline-offset-4"
            >
              {q || filter !== "all" ? "اعرض كل المنتجات" : "+ منتج جديد"}
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto border">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-start">
                  <th className="w-14 p-3" aria-label="صورة" />
                  <th className="p-3 text-start font-medium">المنتج</th>
                  <th className="p-3 text-start font-medium">الفئة</th>
                  <th className="p-3 text-start font-medium">السعر</th>
                  <th className="p-3 text-start font-medium">المخزون</th>
                  <th className="p-3 text-start font-medium">الفاريانتس</th>
                  <th className="p-3 text-start font-medium">الحالة</th>
                  <th className="w-10 p-3" aria-label="ليبل" />
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const status = STATUS_LABELS[p.status] ?? STATUS_LABELS.draft!;
                  const onSale = p.sale_price_usd_cents != null && p.sale_price_usd_cents < p.price_usd_cents;
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-muted/30">
                      <td className="p-2">
                        <Link href={`/products/${p.id}`} tabIndex={-1} aria-hidden className="block">
                          {p.front ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={p.front}
                              alt=""
                              loading="lazy"
                              className="h-14 w-11 bg-muted object-cover"
                            />
                          ) : (
                            <span className="grid h-14 w-11 place-items-center border border-dashed border-red-500/50 text-[10px] text-red-600 dark:text-red-400">
                              بلا صورة
                            </span>
                          )}
                        </Link>
                      </td>
                      <td className="p-3">
                        <span className="inline-flex flex-wrap items-center gap-2">
                          <Link href={`/products/${p.id}`} className="font-medium hover:underline" dir="ltr">
                            {p.name_en}
                          </Link>
                          {!p.front && p.status === "published" && (
                            <Badge variant="outline" className="border-red-500/50 text-red-600 dark:text-red-400">
                              مخفي عن الموقع — بلا صور
                            </Badge>
                          )}
                          {p.branded && (
                            <Badge variant="outline" className="border-amber-500/50 text-amber-600 dark:text-amber-400">
                              شعار ماركة
                            </Badge>
                          )}
                        </span>
                      </td>
                      <td className="p-3">{p.categories?.name_ar ?? "—"}</td>
                      <td className="whitespace-nowrap p-3" dir="ltr">
                        {onSale ? (
                          <>
                            ${(p.sale_price_usd_cents! / 100).toFixed(2)}
                            <span className="ms-2 text-xs text-muted-foreground line-through">
                              ${(p.price_usd_cents / 100).toFixed(2)}
                            </span>
                          </>
                        ) : (
                          <>${(p.price_usd_cents / 100).toFixed(2)}</>
                        )}
                      </td>
                      <td className="p-3">
                        {p.stock <= 0 ? (
                          <span className="font-medium text-red-600 dark:text-red-400">خالص</span>
                        ) : (
                          <span className={p.stock <= 3 ? "font-medium text-amber-600 dark:text-amber-400" : undefined}>
                            {p.stock}
                          </span>
                        )}
                      </td>
                      <td className="p-3">{p.variantCount}</td>
                      <td className="p-3">
                        <Badge variant={status.variant}>{status.label}</Badge>
                      </td>
                      <td className="p-2">
                        <Link
                          href={`/labels?product=${p.id}`}
                          title="اطبع ليبلات هالمنتج"
                          aria-label={`اطبع ليبلات ${p.name_en}`}
                          className="grid h-9 w-9 place-items-center text-muted-foreground hover:bg-muted hover:text-foreground"
                        >
                          <Printer className="h-4 w-4" aria-hidden />
                        </Link>
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
