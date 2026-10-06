"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Icon } from "@bach/ui/components/icon";

type Blockers = Record<"orders" | "returns" | "purchases" | "stock_moves" | "stock_counts" | "in_stock", number>;

const REASON: Record<keyof Blockers, string> = {
  orders: "انباع بطلبيّات",
  returns: "إلو مرتجعات",
  purchases: "بطلبيّات شراء من المورّد",
  stock_moves: "إلو حركات ستوك",
  stock_counts: "انعدّ بجرد",
  in_stock: "في منو ستوك",
};

/**
 * Delete a product for good — only one with no history (never sold, returned,
 * bought in, counted or stocked). Anything with history is archived instead,
 * so its orders and stock records keep pointing at it. The check runs on the
 * server (delete_product); this box only shows its answer. Super admin and
 * store manager only — for other roles the box stays hidden.
 */
export function DeleteProduct({ productId, name }: { productId: string; name: string }) {
  const router = useRouter();
  const [state, setState] = useState<{ ok: boolean; blockers: Blockers } | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    void supabaseBrowser()
      .rpc("delete_product", { p_id: productId, p_check_only: true })
      .then(({ data, error }) => {
        if (!error && data) setState(data as { ok: boolean; blockers: Blockers });
      });
  }, [productId]);

  if (!state) return null; // still checking, or this role can't delete

  async function remove() {
    if (!window.confirm(`أكيد بدّك تمحي «${name}» لـ نهائي؟ ما في رجعة.`)) return;
    setBusy(true);
    setErr("");
    const { data, error } = await supabaseBrowser().rpc("delete_product", { p_id: productId, p_check_only: false });
    if (error) {
      setErr(error.message);
      setBusy(false);
      return;
    }
    if ((data as { deleted?: boolean })?.deleted) router.push("/products");
    else {
      setState(data as { ok: boolean; blockers: Blockers });
      setBusy(false);
    }
  }

  const reasons = (Object.keys(REASON) as Array<keyof Blockers>).filter((k) => state.blockers[k] > 0);

  return (
    <section className="space-y-3 border border-destructive/30 p-5 print:hidden">
      <h2 className="flex items-center gap-2 font-medium">
        <Icon name="remove" size={18} className="text-destructive" />
        محي المنتج
      </h2>
      {state.ok ? (
        <>
          <p className="text-sm text-muted-foreground">
            هالمنتج ما إلو أي تاريخ (ما انباع، ما إلو ستوك ولا حركات) — فيك تمحيه نهائيًا. الصور بتضل محفوظة بالستورج.
          </p>
          <Button variant="destructive" onClick={() => void remove()} disabled={busy}>
            <Icon name="remove" size={16} />
            {busy ? "عم نمحي…" : "امحي المنتج نهائيًا"}
          </Button>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          ما فيك تمحيه لأنو {reasons.map((k) => REASON[k]).join("، ")} — هالسجلّات بتضل مربوطة فيه. لتخبّيه عن الموقع لـ دايمًا، غيّر
          «الحالة» بالأساسيات لـ «مؤرشف».
        </p>
      )}
      {err && <p className="text-sm text-destructive">{err}</p>}
    </section>
  );
}
