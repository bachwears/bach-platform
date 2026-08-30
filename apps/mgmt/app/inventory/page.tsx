import { supabaseServer } from "@bach/supabase/server";
import { Badge } from "@bach/ui/components/badge";

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

export default async function InventoryPage() {
  const supabase = await supabaseServer();

  const [{ data: variants }, { data: branches }, { data: movements }] = await Promise.all([
    supabase
      .from("product_variants")
      .select(
        "id, sku, size, color_ar, is_active, products(name_ar), inventory_levels(branch_id, quantity, reserved, reorder_threshold)",
      )
      .order("sku"),
    supabase.from("branches").select("id, name").eq("is_active", true).order("created_at"),
    supabase
      .from("inventory_movements")
      .select("id, delta, reason, created_at, product_variants(sku), branches(name)")
      .order("created_at", { ascending: false })
      .limit(15),
  ]);

  const branchList = branches ?? [];

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-6xl space-y-8 p-4 py-8">
        <h1 className="text-2xl font-semibold tracking-tight">المخزون</h1>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">تسجيل حركة</h2>
          <MovementForm
            variants={(variants ?? []).map((v) => ({
              id: v.id,
              label: `${(v.products as unknown as { name_ar: string })?.name_ar ?? ""} — ${v.size} ${v.color_ar} (${v.sku})`,
            }))}
            branches={branchList}
          />
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">المستويات الحالية</h2>
          {!variants?.length ? (
            <p className="rounded-md border p-6 text-sm text-muted-foreground">ما في فاريانتس بعد.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="p-3 text-start font-medium">المنتج</th>
                    <th className="p-3 text-start font-medium">SKU</th>
                    {branchList.map((b) => (
                      <th key={b.id} className="p-3 text-start font-medium">
                        {b.name}
                      </th>
                    ))}
                    <th className="p-3 text-start font-medium">محجوز</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v) => {
                    const levels = (v.inventory_levels as unknown as LevelRow[]) ?? [];
                    const reservedTotal = levels.reduce((s, l) => s + l.reserved, 0);
                    const low = levels.some((l) => l.quantity <= l.reorder_threshold && l.reorder_threshold > 0);
                    return (
                      <tr key={v.id} className="border-b last:border-0">
                        <td className="p-3">
                          {(v.products as unknown as { name_ar: string })?.name_ar}
                          <span className="ms-2 text-xs text-muted-foreground">
                            {v.size} {v.color_ar}
                          </span>
                          {low ? <Badge variant="destructive" className="ms-2">منخفض</Badge> : null}
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
            </div>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-semibold">آخر الحركات</h2>
          {!movements?.length ? (
            <p className="rounded-md border p-6 text-sm text-muted-foreground">ما في حركات بعد.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <table className="w-full text-sm">
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
                      <td className="p-3 font-mono text-xs" dir="ltr">
                        {(m.product_variants as unknown as { sku: string })?.sku}
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
