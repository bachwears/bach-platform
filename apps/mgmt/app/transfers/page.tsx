import { supabaseServer } from "@bach/supabase/server";
import { PageHeader } from "@bach/ui/components/page-header";
import { Thumb } from "@bach/ui/components/thumb";
import { loadFrontPhotos, photoFor } from "@bach/ui/lib/photos";

import { AddBranch, BranchTransfer } from "../../components/branch-transfer";
import { Nav } from "../../components/nav";
import { fmt } from "../../lib/time";

// transfer_stock checks the same roles server-side
const ALLOWED = new Set(["super_admin", "store_manager", "inventory_manager"]);

interface MovementRow {
  id: string;
  delta: number;
  reason: "transfer_in" | "transfer_out";
  note: string | null;
  reference_id: string;
  created_at: string;
  branch_id: string;
  branches: { name: string; name_ar: string | null } | null;
  profiles: { full_name: string | null } | null;
  product_variants: {
    sku: string | null;
    size: string;
    color_en: string;
    product_id: string;
    products: { name_en: string } | null;
  } | null;
}

interface Transfer {
  id: string;
  at: string;
  from: string;
  to: string;
  by: string;
  note: string | null;
  pieces: number;
  lines: Array<{ label: string; sku: string | null; qty: number; photo: string | null }>;
}

export default async function TransfersPage() {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user?.id ?? "").maybeSingle();
  const role = profile?.role ?? "";
  const allowed = ALLOWED.has(role);

  const [{ data: branches }, { data: moves }, photos] = allowed
    ? await Promise.all([
        supabase.from("branches").select("id, name, name_ar").eq("is_active", true).order("created_at"),
        supabase
          .from("inventory_movements")
          .select(
            "id, delta, reason, note, reference_id, created_at, branch_id, branches(name, name_ar), profiles(full_name), product_variants(sku, size, color_en, product_id, products(name_en))",
          )
          .in("reason", ["transfer_out", "transfer_in"])
          .not("reference_id", "is", null)
          .order("created_at", { ascending: false })
          .limit(500),
        // same query API as the browser client; the helper is typed for that one
        loadFrontPhotos(supabase as unknown as Parameters<typeof loadFrontPhotos>[0]),
      ])
    : [{ data: null }, { data: null }, null];

  // one transfer = the movements sharing a reference_id
  const byRef = new Map<string, Transfer>();
  for (const m of (moves ?? []) as unknown as MovementRow[]) {
    const t =
      byRef.get(m.reference_id) ??
      ({
        id: m.reference_id,
        at: m.created_at,
        from: "—",
        to: "—",
        by: m.profiles?.full_name ?? "—",
        note: m.note,
        pieces: 0,
        lines: [],
      } satisfies Transfer);
    const branch = m.branches?.name_ar || m.branches?.name || "—";
    if (m.reason === "transfer_out") {
      t.from = branch;
      const v = m.product_variants;
      t.lines.push({
        label: `${v?.products?.name_en ?? ""} — ${v?.size ?? ""} ${v?.color_en ?? ""}`,
        sku: v?.sku ?? null,
        qty: -m.delta,
        photo: photoFor(photos, v?.product_id, v?.color_en),
      });
      t.pieces += -m.delta;
    } else {
      t.to = branch;
    }
    byRef.set(m.reference_id, t);
  }
  const transfers = [...byRef.values()].slice(0, 30);
  const branchList = branches ?? [];

  return (
    <div className="min-h-dvh bg-background">
      <Nav />
      <main className="mx-auto max-w-5xl space-y-6 p-4 py-8">
        <PageHeader
          icon="transfers"
          title="التحويل بين الفروع"
          description="انقل قطع من فرع لفرع — الفرع المرسِل بينقص والمستلِم بيزيد بنفس اللحظة."
          hint={{
            title: "تحويل بضاعة بين الفروع",
            what: "بتنقل قطع من فرع لفرع: الفرع المرسِل بينقص والمستلِم بيزيد بنفس اللحظة، وكل تحويل بيتسجّل كحركتين (صادر ووارد) برقم مرجع واحد.",
            source: "المتوفّر = الكمية بالفرع ناقص المحجوز لطلبات الأونلاين. الحركات بتظهر كمان بشاشة المخزون.",
            edit: "اختار الفرعين، زيد القطع بالـSKU أو الباركود أو الاسم، حط الكمية واكبس «حوّل».",
          }}
          back={{ href: "/inventory", label: "المخزون" }}
        />

        {!allowed ? (
          <p className="border p-8 text-center text-sm text-muted-foreground">
            التحويل بين الفروع للمدير أو مسؤول المخزون بس — اطلب من حدا منهن يعمل التحويل.
          </p>
        ) : (
          <>
            {branchList.length < 2 ? (
              <div className="space-y-2 border p-5 text-sm">
                <p className="font-medium">
                  عندك فرع واحد حالياً{branchList[0] ? ` (${branchList[0].name_ar || branchList[0].name})` : ""}.
                </p>
                <p className="text-muted-foreground">
                  التحويل بيشتغل لما يكون في فرعين أو أكتر. الفروع بتنضاف من إعدادات السوبر أدمن
                  {role === "super_admin" ? " — فيك تزيد فرع من تحت مباشرة." : "، احكي السوبر أدمن إذا بدكن فرع جديد."}
                </p>
              </div>
            ) : (
              <BranchTransfer branches={branchList} />
            )}

            {role === "super_admin" ? <AddBranch /> : null}

            <section className="space-y-3">
              <h2 className="text-lg font-medium">آخر التحويلات</h2>
              {transfers.length === 0 ? (
                <p className="border p-6 text-sm text-muted-foreground">ما في تحويلات بعد — أول تحويل بتعملو من فوق بيطلع هون.</p>
              ) : (
                <div className="space-y-3">
                  {transfers.map((t) => (
                    <details key={t.id} className="border">
                      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2 p-4 text-sm">
                        <span className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{t.from}</span>
                          <span className="text-muted-foreground">←</span>
                          <span className="font-medium">{t.to}</span>
                          <span className="text-muted-foreground">· {t.pieces} قطعة</span>
                        </span>
                        <span className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span>{t.by}</span>
                          <span dir="ltr">{fmt(t.at, { dateStyle: "short", timeStyle: "short" })}</span>
                          <span className="font-mono" dir="ltr">
                            {t.id.slice(0, 8)}
                          </span>
                        </span>
                      </summary>
                      <div className="space-y-2 border-t p-4 text-sm">
                        {t.note ? <p className="text-muted-foreground">ملاحظة: {t.note}</p> : null}
                        <ul className="space-y-1">
                          {t.lines.map((l, i) => (
                            <li key={i} className="flex items-center justify-between gap-3">
                              <span className="flex min-w-0 items-center gap-3">
                                <Thumb src={l.photo} size="sm" />
                                <span dir="ltr" className="min-w-0">
                                  {l.label}
                                  {l.sku ? <span className="ms-2 font-mono text-xs text-muted-foreground">{l.sku}</span> : null}
                                </span>
                              </span>
                              <span className="font-mono">× {l.qty}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </details>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
