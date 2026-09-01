"use client";

import { useCallback, useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Textarea } from "@bach/ui/components/textarea";

const STATUS_AR: Record<string, string> = {
  requested: "قيد المراجعة",
  approved: "مقبول",
  rejected: "مرفوض",
  completed: "مكتمل",
  cancelled: "ملغى",
};

const KIND_AR: Record<string, string> = { return: "إرجاع", exchange: "تبديل" };

interface RequestRow {
  id: string;
  kind: string;
  status: string;
  items: Array<{ order_item_id: string; quantity: number }>;
  reason: string;
  phone: string;
  exchange_note: string | null;
  staff_notes: string | null;
  created_at: string;
  orders: { id: string; number: number; ship_name: string | null };
}

interface ItemInfo {
  id: string;
  name_en: string;
  size: string;
  color_en: string;
}

export function ReturnsRequestsQueue() {
  const [rows, setRows] = useState<RequestRow[]>([]);
  const [itemMap, setItemMap] = useState<Record<string, ItemInfo>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const supabase = supabaseBrowser();
    const { data, error: err } = await supabase
      .from("return_requests")
      .select("id, kind, status, items, reason, phone, exchange_note, staff_notes, created_at, orders(id, number, ship_name)")
      .order("created_at", { ascending: false })
      .limit(100);
    if (err) {
      setError("ما قدرنا نحمّل الطلبات.");
      setLoaded(true);
      return;
    }
    const list = (data ?? []) as unknown as RequestRow[];
    setRows(list);
    const itemIds = [...new Set(list.flatMap((r) => r.items.map((i) => i.order_item_id)))];
    if (itemIds.length) {
      const { data: items } = await supabase
        .from("order_items")
        .select("id, name_en, size, color_en")
        .in("id", itemIds);
      setItemMap(Object.fromEntries(((items ?? []) as ItemInfo[]).map((i) => [i.id, i])));
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(r: RequestRow, status: string) {
    const patch: Record<string, unknown> = { status, staff_notes: notes[r.id] ?? r.staff_notes };
    if (status === "approved" || status === "rejected") patch.decided_at = new Date().toISOString();
    const { error: err } = await supabaseBrowser().from("return_requests").update(patch).eq("id", r.id);
    if (err) setError("ما انحفظ التغيير — جرّب مرة تانية.");
    else void load();
  }

  const open = rows.filter((r) => ["requested", "approved"].includes(r.status));
  const closed = rows.filter((r) => !["requested", "approved"].includes(r.status));

  if (!loaded) return <p className="p-8 text-center text-muted-foreground">عم يحمّل…</p>;

  return (
    <div className="space-y-8">
      {error && <p className="text-sm text-destructive">{error}</p>}
      {rows.length === 0 && <p className="p-8 text-center text-muted-foreground">ما في طلبات إرجاع لسا.</p>}

      {[
        ["المفتوحة", open] as const,
        ["المسكّرة", closed] as const,
      ].map(([title, list]) =>
        list.length ? (
          <section key={title}>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">{title}</h2>
            <ul className="mt-3 space-y-4">
              {list.map((r) => (
                <li key={r.id} className="rounded-md border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="font-mono font-medium" dir="ltr">#{r.orders.number}</span>
                      <Badge variant={["requested", "approved"].includes(r.status) ? "default" : "secondary"}>
                        {STATUS_AR[r.status] ?? r.status}
                      </Badge>
                      <Badge variant="outline">{KIND_AR[r.kind] ?? r.kind}</Badge>
                      <span className="text-sm text-muted-foreground">{r.orders.ship_name}</span>
                      <span className="text-sm text-muted-foreground" dir="ltr">{r.phone}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {new Date(r.created_at).toLocaleString("ar-LB", { dateStyle: "medium", timeStyle: "short" })}
                    </span>
                  </div>

                  <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {r.items.map((i, idx) => {
                      const info = itemMap[i.order_item_id];
                      return (
                        <li key={idx} dir="ltr" className="text-end">
                          {info ? `${info.name_en} — ${info.size} ${info.color_en}` : i.order_item_id} × {i.quantity}
                        </li>
                      );
                    })}
                  </ul>
                  <p className="mt-2 text-sm">
                    <span className="text-muted-foreground">السبب:</span> {r.reason}
                  </p>
                  {r.exchange_note && (
                    <p className="mt-1 text-sm">
                      <span className="text-muted-foreground">التبديل المطلوب:</span> {r.exchange_note}
                    </p>
                  )}

                  {["requested", "approved"].includes(r.status) && (
                    <div className="mt-4 space-y-2 border-t pt-3">
                      <Textarea
                        value={notes[r.id] ?? r.staff_notes ?? ""}
                        onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                        rows={2}
                        placeholder="ملاحظات داخلية…"
                      />
                      <div className="flex flex-wrap gap-2">
                        {r.status === "requested" && (
                          <>
                            <Button size="sm" onClick={() => void setStatus(r, "approved")}>
                              قبول
                            </Button>
                            <Button size="sm" variant="outline" onClick={() => void setStatus(r, "rejected")}>
                              رفض
                            </Button>
                          </>
                        )}
                        {r.status === "approved" && (
                          <Button size="sm" onClick={() => void setStatus(r, "completed")}>
                            اكتمل
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => void setStatus(r, "cancelled")}>
                          إلغاء
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        بعد القبول: الاسترداد أو التبديل الفعلي بيتسجّل من شاشة المرتجعات بنقطة البيع لما توصل القطع.
                      </p>
                    </div>
                  )}
                  {r.staff_notes && !["requested", "approved"].includes(r.status) && (
                    <p className="mt-2 text-xs text-muted-foreground">ملاحظات: {r.staff_notes}</p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ) : null,
      )}
    </div>
  );
}
