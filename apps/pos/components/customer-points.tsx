"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { HintDot } from "@bach/ui/components/hint-dot";

const usd = (c: number) => `$${(c / 100).toFixed(c % 100 === 0 ? 0 : 2)}`;

interface Rules {
  rewardPoints: number;
  rewardUsdCents: number;
}

/**
 * The selected customer's loyalty points ("النقاط: 240 (= $10)") with a button
 * that turns whole rewards into wallet credit (redeem_points). Hidden while the
 * programme is paused or not in the database yet — never blocks the sale.
 */
export function CustomerPoints({
  customerId,
  onRedeemed,
  className = "",
}: {
  customerId: string;
  onRedeemed?: (creditUsdCents: number) => void;
  className?: string;
}) {
  const supabase = supabaseBrowser();
  const [rules, setRules] = useState<Rules | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ text: string; bad?: boolean } | null>(null);

  useEffect(() => {
    let live = true;
    setBalance(null);
    setMsg(null);
    void (async () => {
      const [{ data: s, error: sErr }, { data: c, error: cErr }] = await Promise.all([
        supabase.rpc("loyalty_settings"),
        supabase.from("customers").select("points_balance").eq("id", customerId).maybeSingle(),
      ]);
      if (!live) return;
      const row = (Array.isArray(s) ? s[0] : s) as { enabled: boolean; reward_points: number; reward_usd_cents: number } | null;
      if (sErr || cErr || !row?.enabled || !row.reward_points || typeof c?.points_balance !== "number") {
        setRules(null);
        return;
      }
      setRules({ rewardPoints: row.reward_points, rewardUsdCents: row.reward_usd_cents });
      setBalance(c.points_balance);
    })();
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId]);

  if (!rules || balance === null) return null;
  const rewards = Math.floor(balance / rules.rewardPoints);
  const worth = rewards * rules.rewardUsdCents;

  async function redeem() {
    if (!rules || !rewards) return;
    if (!window.confirm(`نحوّل ${rewards * rules.rewardPoints} نقطة لـ${usd(worth)} رصيد بمحفظة الزبون؟`)) return;
    setBusy(true);
    setMsg(null);
    const { data, error } = await supabase.rpc("redeem_points", { p_customer_id: customerId });
    if (error) {
      setBusy(false);
      setMsg({
        bad: true,
        text: error.message.includes("not enough")
          ? "النقاط ما بتكفي للتحويل."
          : error.message.includes("paused")
            ? "برنامج النقاط موقّف من الإدارة هلّق."
            : error.message.includes("customer not found")
              ? "ما مشي التحويل — دورك ما بيسمح، احكي المدير."
              : `ما مشي التحويل: ${error.message}`,
      });
      return;
    }
    const r = (Array.isArray(data) ? data[0] : data) as { points_used: number; credit_usd_cents: number } | null;
    const { data: c } = await supabase.from("customers").select("points_balance").eq("id", customerId).maybeSingle();
    setBalance(typeof c?.points_balance === "number" ? c.points_balance : balance! - (r?.points_used ?? 0));
    setBusy(false);
    setMsg({ text: `تمّ — انضاف ${usd(r?.credit_usd_cents ?? 0)} لمحفظة الزبون.` });
    onRedeemed?.(r?.credit_usd_cents ?? 0);
  }

  return (
    <div className={`space-y-1 ${className}`}>
      <div className="flex items-center justify-between gap-2 text-xs">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          النقاط: <span className="font-mono text-foreground" dir="ltr">{balance}</span>
          <span dir="ltr">(= {usd(worth)})</span>
          <HintDot
            hint={{
              title: "نقاط الولاء",
              what: `الزبون بيجمع نقاط عن كل دولار بيدفعو، وكل ${rules.rewardPoints} نقطة بتتحوّل لـ${usd(rules.rewardUsdCents)} رصيد بمحفظتو.`,
              source: "النقاط بتنزل لحالها لما يكمل البيع أو يوصل الطلب أونلاين، وبتنسحب إذا رجّع.",
              edit: "القواعد (كم نقطة، قديش بتسوى، ومتى بتنتهي) من MGMT ← التسويق ← برنامج النقاط. تعديل رصيد زبون: MGMT ← العملاء.",
            }}
          />
        </span>
        {rewards > 0 && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void redeem()}>
            {busy ? "عم نحوّل…" : "حوّل لرصيد بالمحفظة"}
          </Button>
        )}
      </div>
      {msg && (
        <p className={`text-xs ${msg.bad ? "text-destructive" : "text-green-600 dark:text-green-400"}`}>{msg.text}</p>
      )}
    </div>
  );
}
