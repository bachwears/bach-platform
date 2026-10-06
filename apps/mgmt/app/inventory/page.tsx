import Link from "next/link";
import { supabaseServer } from "@bach/supabase/server";
import { Badge } from "@bach/ui/components/badge";
import { HintDot } from "@bach/ui/components/hint-dot";
import { PageHeader } from "@bach/ui/components/page-header";
import { Thumb } from "@bach/ui/components/thumb";
import { loadFrontPhotos, photoFor } from "@bach/ui/lib/photos";

import { Nav } from "../../components/nav";
import { MovementForm } from "../../components/movement-form";

const REASON_LABELS: Record<string, string> = {
  purchase: "استلام بضاعة",
  sale: "بيع",
  return: "مرتجع",
  exchange: "تبديل",
  transfer_in: "تحويل وارد",
  transfer_out: "تحويل صادر",
  adjustment: "تصحيح",
  count: "جرد",
};

interface LevelRow {
  branch_id: string;
  quantity: number;
  reserved: number;
  reorder_threshold: number;
}

export default async function InventoryPage({ searchParams }: { searchParams: Promise<{ q?: string; f?: string }> }) {
  const { q: rawQ = "", f = "" } = await searchParams;
  const q = rawQ.trim().toLowerCase();
  const supabase = await supabaseServer();

  // Paged: the API caps a request at 1000 rows and there are more variants than that.
  const variantPage = (from: number) =>
    supabase
      .from("product_variants")
      .select(
        "id, sku, size, color_ar, color_en, product_id, is_active, products(name_en), inventory_levels(branch_id, quantity, reserved, reorder_threshold)",
      )
      .order("sku")
      .range(from, from + 999);
  type VariantRow = NonNullable<Awaited<ReturnType<typeof variantPage>>["data"]>[number];
  const loadVariants = async () => {
    const all: VariantRow[] = [];
    for (let from = 0; ; from += 1000) {
      const { data } = await variantPage(from);
      all.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    return { data: all };
  };
  const [{ data: variants }, { data: branches }, { data: movements }, photos] = await Promise.all([
    loadVariants(),
    supabase.from("branches").select("id, name").eq("is_active", true).order("created_at"),
    supabase
      .from("inventory_movements")
      .select("id, delta, reason, created_at, product_variants(sku, product_id, color_en), branches(name)")
      .order("created_at", { ascending: false })
      .limit(15),
    // same query API as the browser client; the helper is typed for that one
    loadFrontPhotos(supabase as unknown as Parameters<typeof loadFrontPhotos>[0]),
  ]);

  const branchList = branches ?? [];

  // search (name, SKU, colour) and quick filters: low stock / sold out / switched off
  type Lvl = { quantity: number; reserved: number; reorder_threshold: number };
  const lv = (v: VariantRow) => ((v.inventory_levels as unknown as Lvl[]) ?? []);
  const onHand = (v: VariantRow) => lv(v).reduce((s, l) => s + l.quantity - l.reserved, 0);
  const all = variants ?? [];
  const shown = all.filter((v) => {
    const name = ((v.products as unknown as { name_en: string } | null)?.name_en ?? "").toLowerCase();
    if (q && !name.includes(q) && !(v.sku ?? "").toLowerCase().includes(q) && !(v.color_en ?? "").toLowerCase().includes(q)) return false;
    if (f === "low") return v.is_active && lv(v).some((l) => l.reorder_threshold > 0 && l.quantity - l.reserved <= l.reorder_threshold);
    if (f === "out") return v.is_active && onHand(v) <= 0;
    if (f === "off") return !v.is_active;
    return true;
  });
  const FILTERS: Array<[string, string]> = [["", "الكل"], ["low", "قرّب يخلص"], ["out", "خالص"], ["off", "موقّف"]];

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-8 p-4 py-8">
        <PageHeader
          icon="inventory"
          title="المخزون"
          description="كم قطعة عنّا من كل مقاس ولون بكل فرع — سجّل استلام، جرد أو تصحيح من «تسجيل حركة»."
          hint={{
            title: "المخزون",
            what: "الكمية الموجودة بكل فرع لكل فاريانت (مقاس × لون)، والمحجوز للطلبات الأونلاين. «منخفض» يعني وصل لحد إعادة الطلب.",
            source: "جدول inventory_levels؛ كل تغيير بينسجّل بـ inventory_movements (بيع، مرتجع، استلام، تحويل، جرد).",
            edit: "من «تسجيل حركة» هون. البيع والمرتجع بيتسجّلوا لحالهن من الكاشير والطلبات، والتحويل من «التحويل بين الفروع».",
          }}
          actions={
            <Link href="/transfers" className="inline-flex h-9 items-center border px-4 text-sm hover:bg-muted">
              التحويل بين الفروع
            </Link>
          }
        />

        <section className="space-y-3">
          <h2 className="text-lg font-medium">تسجيل حركة</h2>
          <MovementForm
            variants={(variants ?? []).map((v) => ({
              id: v.id,
              label: `${(v.products as unknown as { name_en: string })?.name_en ?? ""} — ${v.size} ${v.color_ar} (${v.sku})`,
              photo: photoFor(photos, v.product_id, v.color_en),
            }))}
            branches={branchList}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">المستويات الحالية</h2>
          <form method="get" className="flex flex-wrap items-center gap-3 print:hidden">
            <input
              name="q"
              defaultValue={rawQ}
              placeholder="دوّر: اسم القطعة، SKU أو لون…"
              className="h-10 w-full max-w-sm border-0 border-b bg-transparent text-sm outline-none focus:border-foreground"
            />
            {f ? <input type="hidden" name="f" value={f} /> : null}
            <nav className="flex flex-wrap gap-3 text-sm" aria-label="فلتر">
              {FILTERS.map(([k, label]) => (
                <Link
                  key={k || "all"}
                  href={`/inventory?${new URLSearchParams({ ...(rawQ ? { q: rawQ } : {}), ...(k ? { f: k } : {}) })}`}
                  aria-current={f === k ? "page" : undefined}
                  className="border-b border-transparent pb-0.5 text-muted-foreground aria-[current=page]:border-foreground aria-[current=page]:text-foreground"
                >
                  {label}
                </Link>
              ))}
            </nav>
            <span className="text-xs text-muted-foreground">
              {shown.length} من {all.length}
            </span>
          </form>
          {all.length > 0 && shown.length === 0 ? (
            <p className="border p-6 text-sm text-muted-foreground">
              ما في شي بهالبحث.{" "}
              <Link href="/inventory" className="text-foreground underline underline-offset-4">
                اعرض الكل
              </Link>
            </p>
          ) : !all.length ? (
            <p className="border p-6 text-sm text-muted-foreground">
              ما في فاريانتس بعد — زيد مقاسات وألوان للقطع من{" "}
              <Link href="/products" className="text-foreground underline underline-offset-4">
                المنتجات
              </Link>
              .
            </p>
          ) : (
            <div className="overflow-x-auto border">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">المنتج</th>
                    <th className="p-3 text-start font-medium">SKU</th>
                    {branchList.map((b) => (
                      <th key={b.id} className="p-3 text-start font-medium">
                        {b.name}
                      </th>
                    ))}
                    <th className="p-3 text-start font-medium"><span className="flex items-center gap-1.5">محجوز
                      <HintDot
                        hint={{
                          title: "الكمية المحجوزة",
                          what: "قطع مطلوبة أونلاين وبعدها ما طلعت من الرف — محسوبة برّا الكمية المتاحة للبيع.",
                          source: "بتنحجز لحظة الطلب من الموقع، وبتتحرر إذا انلغى الطلب أو بتنخصم لما يوصل لـ«جاهز».",
                          edit: "ما بتتعدل يدويًا — بتلحق حالة الطلب بطابور الـPOS.",
                        }}
                      /></span></th>
                  </tr>
                </thead>
                <tbody>
                  {shown.slice(0, 400).map((v) => {
                    const levels = (v.inventory_levels as unknown as LevelRow[]) ?? [];
                    const reservedTotal = levels.reduce((s, l) => s + l.reserved, 0);
                    const low = levels.some((l) => l.quantity <= l.reorder_threshold && l.reorder_threshold > 0);
                    return (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="p-3">
                          <span className="flex items-center gap-3">
                            <Thumb src={photoFor(photos, v.product_id, v.color_en)} size="sm" />
                            <span>
                              <span dir="ltr">{(v.products as unknown as { name_en: string })?.name_en}</span>
                              <span className="ms-2 text-xs text-muted-foreground">
                                {v.size} {v.color_ar}
                              </span>
                              {low ? <Badge variant="destructive" className="ms-2">منخفض</Badge> : null}
                            </span>
                          </span>
                        </td>
                        <td className="p-3 font-mono text-xs" dir="ltr">{v.sku}</td>
                        {branchList.map((b) => {
                          const level = levels.find((l) => l.branch_id === b.id);
                          return (
                            <td key={b.id} className="p-3" dir="ltr">
                              {level?.quantity ?? 0}
                            </td>
                          );
                        })}
                        <td className="p-3" dir="ltr">{reservedTotal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {shown.length > 400 ? <p className="border-t p-3 text-xs text-muted-foreground">عم نفرجي أوّل 400 — دوّر أو فلتر لتلاقي الباقي.</p> : null}
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">آخر الحركات</h2>
          {!movements?.length ? (
            <p className="border p-6 text-sm text-muted-foreground">
              ما في حركات بعد — أول بيع أو استلام بضاعة بيطلع هون.
            </p>
          ) : (
            <div className="overflow-x-auto border">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">SKU</th>
                    <th className="p-3 text-start font-medium">الفرع</th>
                    <th className="p-3 text-start font-medium">الكمية</th>
                    <th className="p-3 text-start font-medium">السبب</th>
                    <th className="p-3 text-start font-medium">الوقت</th>
                  </tr>
                </thead>
                <tbody>
                  {movements.map((m) => (
                    <tr key={m.id} className="border-b last:border-0">
                      <td className="p-3">
                        {(() => {
                          const pv = m.product_variants as unknown as { sku: string; product_id: string; color_en: string | null } | null;
                          return (
                            <span className="flex items-center gap-3">
                              <Thumb src={photoFor(photos, pv?.product_id, pv?.color_en)} size="sm" />
                              <span className="font-mono text-xs" dir="ltr">{pv?.sku}</span>
                            </span>
                          );
                        })()}
                      </td>
                      <td className="p-3">{(m.branches as unknown as { name: string })?.name}</td>
                      <td className="p-3" dir="ltr">
                        <span className={m.delta > 0 ? "text-brand-brass" : "text-destructive"}>
                          {m.delta > 0 ? `+${m.delta}` : m.delta}
                        </span>
                      </td>
                      <td className="p-3">{REASON_LABELS[m.reason] ?? m.reason}</td>
                      <td className="p-3 text-xs text-muted-foreground" dir="ltr">
                        {new Date(m.created_at).toLocaleString("en-GB", { timeZone: "Asia/Beirut" })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
