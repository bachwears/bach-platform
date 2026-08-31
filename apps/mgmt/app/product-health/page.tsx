import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { Badge } from "@bach/ui/components/badge";

import { HintDot } from "@bach/ui/components/hint-dot";

import { Nav } from "../../components/nav";
import { ISSUES, analyze, type HealthRow } from "../../lib/product-health";

const PAGE_SIZE = 1000;
const SHOW_LIMIT = 150;

export default async function ProductHealthPage({
  searchParams,
}: {
  searchParams: Promise<{ issue?: string }>;
}) {
  const { issue } = await searchParams;
  const supabase = await supabaseServer();

  const { data: hint } = await supabase.from("hint_registry").select("*").eq("key", "health-score").maybeSingle();
  const { data } = await supabase
    .from("products")
    .select(
      "id, name_en, name_ar, status, description_en, description_ar, material_en, care_en, fit, meta_title_en, meta_description_en, meta_title_ar, meta_description_ar, categories(code), product_variants(size, barcode), product_seasons(season), media_assets(id)",
    )
    .order("created_at", { ascending: true })
    .limit(PAGE_SIZE);

  const products = (data ?? []) as unknown as HealthRow[];
  const { perProduct, counts, critical, clean } = analyze(products);
  const score = products.length ? Math.round((clean / products.length) * 100) : 100;

  const activeIssue = ISSUES.find((d) => d.key === issue);
  const filtered = activeIssue
    ? perProduct.filter((r) => r.issues.some((i) => i.key === activeIssue.key))
    : perProduct.filter((r) => r.issues.length > 0);
  const sorted = [...filtered].sort((a, b) => {
    const ac = a.issues.filter((i) => i.severity === "critical").length;
    const bc = b.issues.filter((i) => i.severity === "critical").length;
    return bc - ac || b.issues.length - a.issues.length;
  });

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">صحة بيانات المنتجات</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            شو ناقص بكل منتج قبل ما يكون جاهز للنشر — كمّل البيانات من صفحة المنتج نفسها.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-lg border p-4">
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              نسبة الجهوزية
              {hint && (
                <HintDot hint={{ title: hint.title_ar, what: hint.what_ar, source: hint.source_ar, edit: hint.edit_ar, articleHref: hint.article_slug ? `/help#${hint.article_slug}` : null }} />
              )}
            </p>
            <p className="mt-1 font-mono text-2xl font-semibold">{score}%</p>
            <p className="text-xs text-muted-foreground">{clean} منتج مكتمل من {products.length}</p>
          </div>
          <Stat label="فيها نواقص أساسية" value={String(critical)} sub="صور، مقاسات، وصف عربي، فئة" tone="bad" />
          <Stat
            label="فيها نواقص ثانوية بس"
            value={String(perProduct.filter((r) => r.issues.length > 0).length - critical)}
            sub="SEO، مواسم، خامة…"
          />
          <Stat label="بلا أي نقص" value={String(clean)} tone="good" />
        </div>

        <div className="flex flex-wrap gap-2 text-sm">
          <Link
            href="/product-health"
            className={`rounded-full border px-3 py-1 ${!issue ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
          >
            كل النواقص
          </Link>
          {ISSUES.map((d) => (
            <Link
              key={d.key}
              href={`/product-health?issue=${d.key}`}
              className={`rounded-full border px-3 py-1 ${issue === d.key ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
            >
              <bdi>{d.label}</bdi>
              <bdi className="mr-1.5 font-mono text-xs">{counts[d.key] ?? 0}</bdi>
            </Link>
          ))}
        </div>

        <div className="rounded-lg border">
          {sorted.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">ما في نواقص هون — عال العال. 🖤</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  <th className="p-3 font-normal">المنتج</th>
                  <th className="p-3 font-normal">الحالة</th>
                  <th className="p-3 font-normal">النواقص</th>
                </tr>
              </thead>
              <tbody>
                {sorted.slice(0, SHOW_LIMIT).map(({ product: p, issues }) => (
                  <tr key={p.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="p-3">
                      <Link href={`/products/${p.id}`} className="underline-offset-2 hover:underline">
                        {p.name_en}
                      </Link>
                      <span className="block text-xs text-muted-foreground">{p.name_ar}</span>
                    </td>
                    <td className="p-3">
                      <Badge variant={p.status === "published" ? "default" : "secondary"}>
                        {p.status === "published" ? "منشور" : p.status === "draft" ? "مسودّة" : "مؤرشف"}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {issues.map((i) => (
                          <span
                            key={i.key}
                            className={`rounded-full px-2 py-0.5 text-xs ${
                              i.severity === "critical"
                                ? "bg-destructive/10 text-destructive"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {i.label}
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {sorted.length > SHOW_LIMIT && (
          <p className="text-sm text-muted-foreground">
            معروض أول {SHOW_LIMIT} من {sorted.length} — فلتر حسب نوع النقص لتشوف الباقي.
          </p>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "good" | "bad";
}) {
  return (
    <div className="rounded-lg border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p
        className={`mt-1 font-mono text-2xl font-semibold ${
          tone === "bad" ? "text-destructive" : tone === "good" ? "text-green-600 dark:text-green-400" : ""
        }`}
      >
        {value}
      </p>
      {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}
