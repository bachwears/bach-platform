import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";
import { Thumb } from "@bach/ui/components/thumb";
import { loadFrontPhotos, photoFor } from "@bach/ui/lib/photos";

import { Nav } from "../../components/nav";
import { PrintButton } from "../../components/print-button";

/**
 * Storefront analytics: first-party, cookie-free events (storefront lib/track.ts →
 * site_events), aggregated in SQL by site_analytics(). Answers whether the
 * merchandising features earn their place: the funnel, the recommendation rows,
 * the free-delivery bar, and average order value.
 */
interface ProductRow {
  name: string;
  slug: string;
  views: number;
  adds: number;
}
interface Analytics {
  days: number;
  free_over_cents: number;
  totals: {
    visitors: number;
    page_views: number;
    product_views: number;
    adds: number;
    bag_views: number;
    checkouts: number;
    orders: number;
    searches: number;
    revenue_cents: number;
    aov_cents: number;
    orders_free_delivery: number;
    orders_with_goods: number;
  };
  funnel: { visitors: number; viewed: number; added: number; checkout: number; ordered: number };
  daily: Array<{ day: string; visitors: number; product_views: number; adds: number; orders: number }>;
  top_viewed: ProductRow[];
  top_added: ProductRow[];
  sources: Array<{ source: string; clicks: number; quick_adds: number; pdp_adds: number }>;
  delivery_bar: Array<{ place: string; seen: number; below: number; avg_gap_cents: number }>;
  searches: Array<{ len: string; hits: string; n: number }>;
}

const RANGES = [7, 30, 90];

const SOURCE_LABELS: Record<string, string> = {
  similar: "قطع مشابهة (Similar items)",
  wear_with: "البسها مع (Wear with)",
  complete_look: "كمّل اللوك (Complete the look)",
  finishing: "لمسات أخيرة بالسلة (Finishing touches)",
  close_gap: "قطعة كمان للتوصيل المجاني",
  shop_featured: "المتجر — الترتيب المميّز",
  shop: "المتجر — ترتيب تاني",
  search: "البحث",
  recent: "شفتها مؤخرًا",
  bag_empty: "اقتراحات السلة الفاضية",
  favourites: "المفضلة",
};

const PLACE_LABELS: Record<string, string> = {
  bag: "السلة",
  pdp: "صفحة المنتج (بعد الإضافة)",
  checkout: "صفحة الدفع",
  other: "مكان تاني",
};

function usd(cents: number) {
  return `$${(cents / 100).toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function pct(part: number, whole: number) {
  return whole > 0 ? `${((part / whole) * 100).toFixed(1)}%` : "—";
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const { days: raw } = await searchParams;
  const days = RANGES.includes(Number(raw)) ? Number(raw) : 30;
  const supabase = await supabaseServer();
  const { data, error } = await supabase.rpc("site_analytics", { p_days: days });
  const a = (error ? null : data) as Analytics | null;

  // the top lists carry slugs only: look up their ids for the photos
  const slugs = [...new Set([...(a?.top_viewed ?? []), ...(a?.top_added ?? [])].map((r) => r.slug))];
  const [{ data: slugRows }, photoMap] = await Promise.all([
    slugs.length ? supabase.from("products").select("id, slug").in("slug", slugs) : Promise.resolve({ data: [] }),
    // same query API as the browser client; the helper is typed for that one
    slugs.length ? loadFrontPhotos(supabase as unknown as Parameters<typeof loadFrontPhotos>[0]) : null,
  ]);
  const photos: Record<string, string | null> = Object.fromEntries(
    ((slugRows ?? []) as Array<{ id: string; slug: string }>).map((p) => [p.slug, photoFor(photoMap, p.id)]),
  );

  return (
    <div className="min-h-dvh bg-background">
      <div className="print:hidden">
        <Nav />
      </div>
      <main className="mx-auto max-w-6xl space-y-6 p-4 py-8">
        {/* the printed copy keeps its own branded title (PageHeader is screen-only) */}
        <div className="hidden print:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-bach.png" alt="BACH" className="mb-2 h-5 w-auto" />
          <h1 className="text-2xl font-normal tracking-tight">تحليلات الموقع</h1>
          <p className="mt-1 text-sm">آخر {days} يوم (بتوقيت UTC)</p>
        </div>
        <PageHeader
          icon="analytics"
          title="تحليلات الموقع"
          description={`آخر ${days} يوم (بتوقيت UTC) — هل الاقتراحات وشريط التوصيل المجاني عم يبيعوا؟`}
          hint={{
            title: "تحليلات الموقع",
            what: "شو عم يعملوا الزوار عالموقع: مين شاف قطعة، مين حط بالسلة، مين بلّش الدفع ومين طلب — وقديش عم تشتغل الاقتراحات وشريط التوصيل المجاني.",
            source:
              "أحداث مجهولة الهوية بيبعتها الموقع نفسه — بلا كوكيز وبلا أي معلومة شخصية. الزائر بينحسب ببصمة يومية بتتغيّر كل يوم، فما فينا نلحقه من يوم ليوم. اللي مفعّل «Do Not Track» ما بينحسب. الأرقام تقريبية وأقل شوي من الحقيقة.",
            edit: "ما في شي ينعدّل هون — بدّل الفترة من فوق. البيانات الأقدم من 400 يوم بتنمحى.",
          }}
          actions={
            <>
              {RANGES.map((d) => (
                <Link
                  key={d}
                  href={`/analytics?days=${d}`}
                  aria-current={days === d ? "page" : undefined}
                  className={`inline-flex h-9 items-center border px-3 text-sm ${days === d ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  {d} يوم
                </Link>
              ))}
              <PrintButton label="اطبع التقرير" />
            </>
          }
        />

        {!a ? (
          <div className="space-y-2 border p-8 text-center text-sm text-muted-foreground">
            <p>ما قدرنا نجيب التحليلات{error ? ` (${error.message})` : ""}.</p>
            <Link href={`/analytics?days=${days}`} className="inline-block text-foreground underline underline-offset-4">
              جرّب مرة تانية
            </Link>
          </div>
        ) : (
          <Report a={a} photos={photos} />
        )}
      </main>
    </div>
  );
}

function Report({ a, photos }: { a: Analytics; photos: Record<string, string | null> }) {
  const t = a.totals;
  const f = a.funnel;
  const steps: Array<[string, number]> = [
    ["زوار", f.visitors],
    ["شافوا قطعة", f.viewed],
    ["حطّوا بالسلة", f.added],
    ["بلّشوا الدفع", f.checkout],
    ["طلبوا", f.ordered],
  ];
  const maxDaily = Math.max(1, ...a.daily.map((d) => d.visitors));

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 print:grid-cols-4">
        <Stat label="زوار" value={t.visitors.toLocaleString("en-US")} sub={`${t.page_views.toLocaleString("en-US")} صفحة`} />
        <Stat label="مشاهدات القطع" value={t.product_views.toLocaleString("en-US")} sub={`${t.adds} إضافة للسلة`} />
        <Stat label="طلبات أونلاين" value={String(t.orders)} sub={`${t.checkouts} بلّشوا الدفع`} />
        <Stat label="متوسط الطلب" value={usd(t.aov_cents)} sub={`مجموع ${usd(t.revenue_cents)}`} />
      </div>

      <Section title="مسار الشراء" note="كل زائر بيوم واحد بينحسب مرة؛ النسبة الأولى من كل الزوار، التانية من الخطوة اللي قبلها.">
        <table className="w-full text-sm">
          <tbody>
            {steps.map(([label, n], i) => (
              <tr key={label} className="border-b last:border-0">
                <td className="w-32 py-2">{label}</td>
                <td className="w-20 py-2 font-mono">{n.toLocaleString("en-US")}</td>
                <td className="py-2">
                  <Bar value={n} max={f.visitors} />
                </td>
                <td className="w-20 py-2 text-left font-mono text-muted-foreground">{pct(n, f.visitors)}</td>
                <td className="w-20 py-2 text-left font-mono text-muted-foreground">{i ? pct(n, steps[i - 1]![1]) : ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-muted-foreground">
          بالأحداث: {t.product_views} مشاهدة · {t.adds} إضافة ({pct(t.adds, t.product_views)} من المشاهدات) · {t.checkouts} بدء دفع · {t.orders} طلب ({pct(t.orders, t.checkouts)} من اللي بلّشوا الدفع)
        </p>
      </Section>

      <Section
        title="أداء الاقتراحات والترتيب"
        note="كبسات = فتحوا القطعة من هالمكان. إضافة سريعة = من الـ + عالكرت نفسه. إضافة من صفحة المنتج = فاتوا من هالمكان وبعدين ضافوا من صفحة القطعة."
      >
        {a.sources.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-start text-muted-foreground">
                <th className="py-2 font-normal">المكان</th>
                <th className="py-2 font-normal">كبسات</th>
                <th className="py-2 font-normal">إضافة سريعة</th>
                <th className="py-2 font-normal">إضافة من صفحة المنتج</th>
                <th className="py-2 font-normal">إضافة بعد الكبس</th>
              </tr>
            </thead>
            <tbody>
              {a.sources.map((s) => (
                <tr key={s.source} className="border-b last:border-0">
                  <td className="py-2">{SOURCE_LABELS[s.source] ?? s.source}</td>
                  <td className="py-2 font-mono">{s.clicks}</td>
                  <td className="py-2 font-mono">{s.quick_adds}</td>
                  <td className="py-2 font-mono">{s.pdp_adds}</td>
                  <td className="py-2 font-mono text-muted-foreground">{pct(s.pdp_adds, s.clicks)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
        <Section
          title="شريط التوصيل المجاني"
          note={`التوصيل مجاني من ${usd(a.free_over_cents)}. «تحت الحد» = الشريط كان عم يقول قديش ناقص.`}
        >
          {a.delivery_bar.length === 0 ? (
            <Empty />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-start text-muted-foreground">
                  <th className="py-2 font-normal">وين</th>
                  <th className="py-2 font-normal">انعرض</th>
                  <th className="py-2 font-normal">تحت الحد</th>
                  <th className="py-2 font-normal">متوسط الناقص</th>
                </tr>
              </thead>
              <tbody>
                {a.delivery_bar.map((b) => (
                  <tr key={b.place} className="border-b last:border-0">
                    <td className="py-2">{PLACE_LABELS[b.place] ?? b.place}</td>
                    <td className="py-2 font-mono">{b.seen}</td>
                    <td className="py-2 font-mono">
                      {b.below} <span className="text-muted-foreground">({pct(b.below, b.seen)})</span>
                    </td>
                    <td className="py-2 font-mono">{b.below ? usd(b.avg_gap_cents) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="mt-3 text-xs text-muted-foreground">
            طلبات وصلت للتوصيل المجاني: {t.orders_free_delivery} من {t.orders_with_goods} ({pct(t.orders_free_delivery, t.orders_with_goods)})
          </p>
        </Section>

        <Section title="البحث" note="منسجّل طول الكلمة وعدد النتايج بس — مش شو كتب الزبون.">
          {a.searches.length === 0 ? (
            <Empty />
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-start text-muted-foreground">
                  <th className="py-2 font-normal">طول البحث (حروف)</th>
                  <th className="py-2 font-normal">النتايج</th>
                  <th className="py-2 font-normal">مرات</th>
                </tr>
              </thead>
              <tbody>
                {a.searches.map((s) => (
                  <tr key={`${s.len}-${s.hits}`} className={`border-b last:border-0 ${s.hits === "0" ? "text-destructive" : ""}`}>
                    <td className="py-2 font-mono" dir="ltr">{s.len}</td>
                    <td className="py-2 font-mono" dir="ltr">{s.hits === "0" ? "0 — ما لقى شي" : s.hits}</td>
                    <td className="py-2 font-mono">{s.n}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2 print:grid-cols-2">
        <ProductTable title="الأكثر مشاهدة" rows={a.top_viewed} photos={photos} />
        <ProductTable title="الأكثر إضافة للسلة" rows={a.top_added} photos={photos} />
      </div>

      <Section title="يوم بيوم">
        {a.daily.length === 0 ? (
          <Empty />
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-start text-muted-foreground">
                <th className="py-2 font-normal">اليوم</th>
                <th className="py-2 font-normal">زوار</th>
                <th className="py-2 font-normal" />
                <th className="py-2 font-normal">مشاهدات</th>
                <th className="py-2 font-normal">إضافات</th>
                <th className="py-2 font-normal">طلبات</th>
              </tr>
            </thead>
            <tbody>
              {[...a.daily].reverse().map((d) => (
                <tr key={d.day} className="border-b last:border-0">
                  <td className="py-1.5 font-mono text-xs" dir="ltr">{d.day}</td>
                  <td className="py-1.5 font-mono">{d.visitors}</td>
                  <td className="w-1/3 py-1.5">
                    <Bar value={d.visitors} max={maxDaily} />
                  </td>
                  <td className="py-1.5 font-mono">{d.product_views}</td>
                  <td className="py-1.5 font-mono">{d.adds}</td>
                  <td className="py-1.5 font-mono">{d.orders}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>
    </>
  );
}

function ProductTable({ title, rows, photos }: { title: string; rows: ProductRow[]; photos: Record<string, string | null> }) {
  return (
    <Section title={title}>
      {rows.length === 0 ? (
        <Empty />
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-start text-muted-foreground">
              <th className="py-2 font-normal">القطعة</th>
              <th className="py-2 font-normal">مشاهدات</th>
              <th className="py-2 font-normal">إضافات</th>
              <th className="py-2 font-normal">نسبة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.slug} className="border-b last:border-0">
                <td className="py-2">
                  <span className="flex items-center gap-3">
                    <Thumb src={photos[r.slug]} size="sm" />
                    <span className="min-w-0">{r.name}</span>
                  </span>
                </td>
                <td className="py-2 font-mono">{r.views}</td>
                <td className="py-2 font-mono">{r.adds}</td>
                <td className="py-2 font-mono text-muted-foreground">{pct(r.adds, r.views)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </Section>
  );
}

function Section({ title, note, children }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="break-inside-avoid border p-4">
      <h2 className="text-sm font-medium uppercase tracking-wider text-muted-foreground">{title}</h2>
      {note ? <p className="mt-1 text-xs text-muted-foreground">{note}</p> : null}
      <div className="mt-3 overflow-x-auto">{children}</div>
    </section>
  );
}

function Bar({ value, max }: { value: number; max: number }) {
  return (
    <div className="h-2 w-full bg-muted print:border print:border-black/20">
      <div
        className="h-2 bg-foreground/80 print:bg-black"
        style={{ width: `${max > 0 ? Math.max((value / max) * 100, value > 0 ? 2 : 0) : 0}%` }}
      />
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-mono text-2xl font-semibold">{value}</p>
      {sub ? <p className="text-xs text-muted-foreground">{sub}</p> : null}
    </div>
  );
}

function Empty() {
  return <p className="text-sm text-muted-foreground">ما في بيانات بهالفترة بعد — جرّب فترة أطول من فوق.</p>;
}
