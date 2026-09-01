"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

import {
  type BarcodeAlias,
  type CatalogItem,
  CATALOG_TTL_MS,
  decrementCatalog,
  enqueueSale,
  readCatalog,
  readQueue,
  refreshCatalog,
  searchCatalog,
  syncQueue,
} from "../lib/offline";

interface CartLine {
  variantId: string;
  sku: string | null;
  nameEn: string;
  size: string;
  colorEn: string;
  unitUsdCents: number;
  quantity: number;
  available: number;
  lineDiscountPct?: number;
}

interface Receipt {
  number: number | null;
  offlineRef?: string;
  lines: CartLine[];
  subtotal: number;
  discount: number;
  tva: number;
  total: number;
  paidUsdCents: number;
  paidLbp: number;
  changeLbp: number;
  rate: number;
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}
function lbp(amount: number): string {
  return `${Math.round(amount).toLocaleString("en-US")} ل.ل`;
}

export function Cashier({
  branchId,
  branchName,
  role,
  currentUser,
  rate,
  tva,
}: {
  branchId: string;
  branchName: string;
  role: string;
  currentUser: { id: string; name: string };
  rate: number;
  tva: { enabled: boolean; rateBasisPoints: number; pricesIncludeTva: boolean };
}) {
  const isManager = role === "super_admin" || role === "store_manager";
  const supabase = supabaseBrowser();
  const searchRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CatalogItem[]>([]);
  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [aliases, setAliases] = useState<BarcodeAlias[]>([]);
  const [online, setOnline] = useState(true);
  const [queueCount, setQueueCount] = useState(0);
  const [syncMsg, setSyncMsg] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountPct, setDiscountPct] = useState("");
  const [paidUsd, setPaidUsd] = useState("");
  const [paidLbpStr, setPaidLbpStr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<Array<{ id: string; full_name: string | null; phone: string | null }>>([]);
  const [customer, setCustomer] = useState<{ id: string; name: string; phone: string | null } | null>(null);
  const [bday, setBday] = useState<{ eligible: boolean; percent: number } | null>(null);
  const [bdayApplied, setBdayApplied] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [parked, setParked] = useState<Array<{ id: string; label: string; cart: CartLine[]; customer_id: string | null; created_at: string }>>([]);
  const [acting, setActing] = useState<{ id: string; name: string }>(currentUser);
  const [switching, setSwitching] = useState(false);
  const [cashiers, setCashiers] = useState<Array<{ profile_id: string; full_name: string; role: string; has_pin: boolean }>>([]);
  const [pinFor, setPinFor] = useState<{ id: string; name: string } | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");

  const loadParked = useCallback(async () => {
    const { data } = await supabase
      .from("parked_sales")
      .select("id, label, cart, customer_id, created_at")
      .eq("branch_id", branchId)
      .order("created_at", { ascending: false })
      .limit(10);
    setParked((data ?? []) as never);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => {
    void loadParked();
  }, [loadParked]);

  async function parkSale() {
    if (!cart.length) return;
    const label = customer?.name ?? `بيع ${new Date().toLocaleTimeString("ar-LB", { hour: "2-digit", minute: "2-digit" })}`;
    const { error: err } = await supabase.from("parked_sales").insert({
      branch_id: branchId,
      label,
      cart: cart as never,
      customer_id: customer?.id ?? null,
      parked_by: currentUser.id,
    });
    if (err) {
      setError("ما قدرنا نركن البيع.");
      return;
    }
    setCart([]);
    setDiscountPct("");
    detachCustomer();
    void loadParked();
  }

  async function resumeSale(p: { id: string; cart: CartLine[]; customer_id: string | null }) {
    if (cart.length) return;
    setCart(p.cart);
    if (p.customer_id) {
      const { data } = await supabase.from("customers").select("id, full_name, phone").eq("id", p.customer_id).maybeSingle();
      if (data) void attachCustomer(data);
    }
    await supabase.from("parked_sales").delete().eq("id", p.id);
    void loadParked();
  }

  async function openSwitcher() {
    setSwitching(true);
    const { data } = await supabase.rpc("pos_cashiers");
    setCashiers((data ?? []) as never);
  }

  async function confirmPin() {
    if (!pinFor || pin.length < 4) return;
    const { data } = await supabase.rpc("verify_pos_pin", { p_profile_id: pinFor.id, p_pin: pin });
    if (data === true) {
      setActing(pinFor);
      setPinFor(null);
      setPin("");
      setPinError("");
      setSwitching(false);
    } else {
      setPinError("رمز غلط — جرّب مرة تانية.");
      setPin("");
    }
  }

  useEffect(() => searchRef.current?.focus(), [receipt]);

  const doSync = useCallback(async () => {
    if (readQueue().filter((q) => q.status === "pending").length === 0) {
      setQueueCount(readQueue().length);
      return;
    }
    const res = await syncQueue(supabase);
    setQueueCount(res.remaining);
    if (res.synced > 0) {
      setSyncMsg(`تزامنت ${res.synced} مبيعات ✓`);
      void refreshCatalog(supabase, branchId).then((b) => { if (b) { setCatalog(b.items); setAliases(b.aliases ?? []); } });
      setTimeout(() => setSyncMsg(""), 5000);
    }
    if (res.failed > 0) {
      setSyncMsg(`${res.failed} مبيعات ما قبلها السيرفر — راجع المدير.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId]);

  useEffect(() => {
    setOnline(navigator.onLine);
    setQueueCount(readQueue().length);
    const cached = readCatalog(branchId);
    if (cached) {
      setCatalog(cached.items);
      setAliases(cached.aliases ?? []);
    }
    if (!cached || Date.now() - cached.at > CATALOG_TTL_MS) {
      void refreshCatalog(supabase, branchId).then((b) => { if (b) { setCatalog(b.items); setAliases(b.aliases ?? []); } });
    }
    const timer = setInterval(() => {
      if (navigator.onLine) void refreshCatalog(supabase, branchId).then((b) => { if (b) { setCatalog(b.items); setAliases(b.aliases ?? []); } });
    }, CATALOG_TTL_MS);
    const goOnline = () => {
      setOnline(true);
      void doSync();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    if (navigator.onLine) void doSync();
    return () => {
      clearInterval(timer);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, doSync]);

  const addVariant = useCallback((v: CatalogItem) => {
    const available = v.available;
    setCart((prev) => {
      const existing = prev.find((l) => l.variantId === v.id);
      if (existing) {
        if (existing.quantity >= available) return prev;
        return prev.map((l) => (l.variantId === v.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      if (available <= 0) {
        setError(`ما في مخزون كافي: ${v.sku ?? v.name_en}`);
        return prev;
      }
      return [
        ...prev,
        {
          variantId: v.id,
          sku: v.sku,
          nameEn: v.name_en,
          size: v.size,
          colorEn: v.color_en,
          unitUsdCents:
            v.price_usd_cents_override ?? Math.min(v.sale_price_usd_cents ?? v.price_usd_cents, v.price_usd_cents),
          quantity: 1,
          available,
        },
      ];
    });
    setQuery("");
    setResults([]);
    searchRef.current?.focus();
  }, []);

  // Local-first: the cached catalog answers every keystroke, online or not.
  async function runSearch(text: string, exact: boolean) {
    const q = text.trim();
    if (!q) return;
    setError("");
    let items = catalog;
    let aliasList = aliases;
    if (!items.length) {
      const blob = (await refreshCatalog(supabase, branchId)) ?? readCatalog(branchId);
      items = blob?.items ?? [];
      aliasList = blob?.aliases ?? [];
      if (blob) {
        setCatalog(blob.items);
        setAliases(blob.aliases ?? []);
      }
    }
    if (!items.length) {
      setError("الكتالوج مش محمّل — تأكد من الاتصال أول مرة.");
      return;
    }
    const hits = searchCatalog(items, q, exact, aliasList);
    if (exact && hits.length === 1) {
      addVariant(hits[0]!);
      return;
    }
    setResults(hits);
    if (exact && !hits.length) setError("ما لقينا شي بهالرقم أو الاسم.");
  }

  async function searchCustomers(q: string) {
    const t = q.trim();
    if (t.length < 3) {
      setCustResults([]);
      return;
    }
    const digits = t.replace(/[^0-9+]/g, "");
    const { data } = await supabase
      .from("customers")
      .select("id, full_name, phone")
      .or(digits.length >= 3 ? `phone.ilike.%${digits}%,full_name.ilike.%${t}%` : `full_name.ilike.%${t}%`)
      .limit(5);
    setCustResults(data ?? []);
  }

  async function attachCustomer(c: { id: string; full_name: string | null; phone: string | null }) {
    setCustomer({ id: c.id, name: c.full_name ?? c.phone ?? "زبون", phone: c.phone });
    setCustQuery("");
    setCustResults([]);
    setBday(null);
    setBdayApplied(false);
    const { data } = await supabase.rpc("pos_birthday_eligibility", { p_customer_id: c.id });
    const e = data?.[0];
    if (e?.eligible) setBday({ eligible: true, percent: e.percent });
  }

  async function quickCreateCustomer() {
    const phone = custQuery.replace(/[^0-9+]/g, "");
    if (phone.length < 7 || !newCustName.trim()) return;
    const { data, error: err } = await supabase
      .from("customers")
      .insert({ full_name: newCustName.trim(), phone })
      .select("id, full_name, phone")
      .single();
    if (err) {
      setError(err.message.includes("duplicate") ? "هالرقم مسجّل من قبل — فتّش عليه." : `ما مشي الإنشاء: ${err.message}`);
      return;
    }
    setNewCustName("");
    void attachCustomer(data);
  }

  function detachCustomer() {
    setCustomer(null);
    setBday(null);
    setBdayApplied(false);
  }

  const setQty = (variantId: string, qty: number) =>
    setCart((prev) =>
      qty <= 0
        ? prev.filter((l) => l.variantId !== variantId)
        : prev.map((l) => (l.variantId === variantId ? { ...l, quantity: Math.min(qty, l.available) } : l)),
    );

  const subtotal = cart.reduce((s, l) => s + l.unitUsdCents * l.quantity, 0);
  const lineDiscounts = cart.reduce(
    (s, l) => s + Math.round((l.unitUsdCents * l.quantity * Math.round((l.lineDiscountPct ?? 0) * 100)) / 10_000),
    0,
  );
  const manualBp = Math.round(Math.min(Math.max(parseFloat(discountPct) || 0, 0), 100) * 100);
  const discountBp = bdayApplied && bday ? Math.max(manualBp, bday.percent * 100) : manualBp;
  const discount = lineDiscounts + Math.round(((subtotal - lineDiscounts) * discountBp) / 10_000);
  let total = subtotal - discount;
  let tvaCents = 0;
  if (tva.enabled) {
    if (tva.pricesIncludeTva) {
      tvaCents = total - Math.round((total * 10_000) / (10_000 + tva.rateBasisPoints));
    } else {
      tvaCents = Math.round((total * tva.rateBasisPoints) / 10_000);
      total += tvaCents;
    }
  }

  const paidUsdCents = Math.round((parseFloat(paidUsd) || 0) * 100);
  const paidLbp = Math.round(parseFloat(paidLbpStr.replace(/,/g, "")) || 0);
  const paidEquivCents = paidUsdCents + Math.round((paidLbp / rate) * 100);
  const remainingCents = total - paidEquivCents;
  const changeLbp = remainingCents < 0 ? Math.round((-remainingCents / 100) * rate) : 0;
  const canCheckout = cart.length > 0 && paidEquivCents >= total - 5 && !busy;

  function finishSale(number: number | null, offlineRef?: string) {
    setReceipt({
      number,
      offlineRef,
      lines: cart,
      subtotal,
      discount,
      tva: tvaCents,
      total,
      paidUsdCents,
      paidLbp,
      changeLbp,
      rate,
    });
    setCart([]);
    setDiscountPct("");
    setPaidUsd("");
    setPaidLbpStr("");
    detachCustomer();
  }

  async function checkout() {
    if (!canCheckout) return;
    setBusy(true);
    setError("");
    const payments: Array<{ currency: string; amount_minor: number }> = [];
    if (paidUsdCents > 0) payments.push({ currency: "USD", amount_minor: paidUsdCents });
    if (paidLbp > 0) payments.push({ currency: "LBP", amount_minor: paidLbp });
    const items = cart.map((l) => ({
      variant_id: l.variantId,
      quantity: l.quantity,
      line_discount_bp: Math.round((l.lineDiscountPct ?? 0) * 100),
    }));
    const clientRef = crypto.randomUUID();
    const actingCashier = acting.id !== currentUser.id ? acting.id : null;

    const queueOffline = () => {
      // Customer/birthday need the server — offline sales are anonymous.
      enqueueSale({
        clientRef,
        at: new Date().toISOString(),
        branchId,
        items,
        payments,
        discountBp: manualBp,
        actingCashier,
        totalUsdCents: total,
        status: "pending",
      });
      decrementCatalog(branchId, cart.map((l) => ({ variantId: l.variantId, quantity: l.quantity })));
      const cached = readCatalog(branchId);
      if (cached) setCatalog(cached.items);
      setQueueCount(readQueue().length);
      setOnline(false);
      finishSale(null, clientRef.slice(0, 8).toUpperCase());
    };

    if (!navigator.onLine) {
      setBusy(false);
      if (customer || bdayApplied) {
        setError("النت مقطوع — شيل الزبون/خصم عيد الميلاد وسجّل البيع أوفلاين.");
        return;
      }
      queueOffline();
      return;
    }

    let data, err;
    try {
      ({ data, error: err } = await supabase.rpc("pos_checkout", {
        p_branch_id: branchId,
        p_items: items,
        p_payments: payments,
        p_discount_basis_points: manualBp,
        p_customer_id: customer?.id ?? null,
        p_apply_birthday: bdayApplied,
        p_acting_cashier: actingCashier,
        p_client_ref: clientRef,
      }));
    } catch {
      err = { message: "Failed to fetch" } as { message: string };
    }
    setBusy(false);
    if (err) {
      const isNetwork = /fetch|network|load failed/i.test(err.message ?? "");
      if (isNetwork) {
        if (customer || bdayApplied) {
          setError("النت مقطوع — شيل الزبون/خصم عيد الميلاد وسجّل البيع أوفلاين.");
          return;
        }
        queueOffline();
        return;
      }
      setError(
        err.message.includes("insufficient stock")
          ? "المخزون ما بيكفي — حدّث الكمية."
          : `ما مشي الحال: ${err.message}`,
      );
      return;
    }
    void refreshCatalog(supabase, branchId).then((b) => { if (b) { setCatalog(b.items); setAliases(b.aliases ?? []); } });
    finishSale(data![0].order_number);
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 print:p-0">
        <div className="rounded-lg border p-6 print:border-0" dir="ltr">
          <div className="text-center">
            <h2 className="text-xl font-bold tracking-widest">BACH WEARS</h2>
            <p className="text-sm text-muted-foreground">{branchName}</p>
            {receipt.number != null ? (
              <p className="mt-2 font-mono text-lg">Invoice #{receipt.number}</p>
            ) : (
              <p className="mt-2 font-mono text-lg">OFFLINE-{receipt.offlineRef}</p>
            )}
            <p className="text-xs text-muted-foreground">{new Date().toLocaleString("en-GB")}</p>
          </div>
          <div className="my-4 border-t border-dashed" />
          {receipt.lines.map((l) => (
            <div key={l.variantId} className="flex justify-between py-1 text-sm">
              <span>
                {l.nameEn} — {l.size} {l.colorEn} × {l.quantity}
              </span>
              <span className="font-mono">{usd(l.unitUsdCents * l.quantity)}</span>
            </div>
          ))}
          <div className="my-4 border-t border-dashed" />
          <div className="space-y-1 text-sm">
            <Row label="Subtotal" value={usd(receipt.subtotal)} />
            {receipt.discount > 0 && <Row label="Discount" value={`- ${usd(receipt.discount)}`} />}
            {receipt.tva > 0 && <Row label="TVA" value={usd(receipt.tva)} />}
            <div className="flex justify-between text-base font-bold">
              <span>Total</span>
              <span className="font-mono">
                {usd(receipt.total)} / LBP {((receipt.total / 100) * receipt.rate).toLocaleString("en-US")}
              </span>
            </div>
            {receipt.paidUsdCents > 0 && <Row label="Paid USD" value={usd(receipt.paidUsdCents)} />}
            {receipt.paidLbp > 0 && <Row label="Paid LBP" value={`LBP ${receipt.paidLbp.toLocaleString("en-US")}`} />}
            {receipt.changeLbp > 0 && (
              <Row label="Change (LBP)" value={`LBP ${receipt.changeLbp.toLocaleString("en-US")}`} />
            )}
            <p className="pt-2 text-center text-xs text-muted-foreground">
              Exchange rate: LBP {receipt.rate.toLocaleString("en-US")} / $
            </p>
          </div>
          {receipt.number == null && (
            <p className="mt-3 text-center text-xs text-muted-foreground" dir="rtl">
              رقم مؤقت — الفاتورة الرسمية بتنسجّل تلقائيًا لما يرجع النت.
            </p>
          )}
          <p className="mt-4 text-center text-xs text-muted-foreground">Thank you for shopping with us 🖤</p>
        </div>
        <div className="flex gap-3 print:hidden">
          <Button className="flex-1" onClick={() => window.print()}>
            طباعة
          </Button>
          <Button className="flex-1" variant="outline" onClick={() => setReceipt(null)}>
            بيع جديد
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!online && (
        <p className="rounded-md border border-amber-500/50 bg-amber-500/10 px-4 py-2 text-sm">
          📡 النت مقطوع — البيع شغّال، والمبيعات بتتسجّل محليًا وبتتزامن لحالها لما يرجع الاتصال.
        </p>
      )}
      {queueCount > 0 && (
        <p className="flex items-center justify-between rounded-md border px-4 py-2 text-sm">
          <span>🕐 {queueCount} مبيعات بانتظار المزامنة</span>
          <Button size="sm" variant="outline" onClick={() => void doSync()}>
            زامن الآن
          </Button>
        </p>
      )}
      {syncMsg && <p className="rounded-md border px-4 py-2 text-sm text-green-600 dark:text-green-400">{syncMsg}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Search + cart */}
      <section className="space-y-4">
        <div className="relative">
          <Input
            ref={searchRef}
            value={query}
            placeholder="امسح الباركود أو فتّش بالاسم / SKU…"
            className="h-12 text-lg"
            onChange={(e) => {
              setQuery(e.target.value);
              if (e.target.value.trim().length >= 2) void runSearch(e.target.value, false);
              else setResults([]);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void runSearch(query, true);
              }
            }}
          />
          {results.length > 0 && (
            <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
              {results.map((v) => {
                const avail = v.available;
                const unit =
                  v.price_usd_cents_override ??
                  Math.min(v.sale_price_usd_cents ?? v.price_usd_cents, v.price_usd_cents);
                return (
                  <button
                    key={v.id}
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2 text-right hover:bg-muted disabled:opacity-40"
                    disabled={avail <= 0}
                    onClick={() => addVariant(v)}
                  >
                    <span>
                      {v.name_en} — {v.size} {v.color_en}
                      <span className="block text-xs text-muted-foreground" dir="ltr">
                        {v.sku}
                      </span>
                    </span>
                    <span className="text-sm">
                      <span className="font-mono">{usd(unit)}</span>
                      <span className={`block text-xs ${avail > 0 ? "text-muted-foreground" : "text-destructive"}`}>
                        {avail > 0 ? `متوفر: ${avail}` : "خالص"}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {error && <p className="rounded-md bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>}

        {parked.length > 0 && cart.length === 0 && (
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">مبيعات مركونة:</span>
            {parked.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => void resumeSale(p)}
                className="rounded-full border px-3 py-1 hover:border-foreground"
              >
                {p.label} · {p.cart.length} قطعة
              </button>
            ))}
          </div>
        )}

        <div className="rounded-lg border">
          {cart.length === 0 ? (
            <p className="p-8 text-center text-muted-foreground">السلة فاضية — امسح أول قطعة.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-right text-muted-foreground">
                  <th className="p-3 font-normal">القطعة</th>
                  <th className="p-3 font-normal">الكمية</th>
                  <th className="p-3 font-normal">السعر</th>
                  {isManager && <th className="p-3 font-normal">خصم %</th>}
                  <th className="p-3 font-normal">المجموع</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {cart.map((l) => (
                  <tr key={l.variantId} className="border-b last:border-0">
                    <td className="p-3">
                      {l.nameEn}
                      <span className="block text-xs text-muted-foreground">
                        {l.size} {l.colorEn} <span dir="ltr">{l.sku}</span>
                      </span>
                    </td>
                    <td className="p-3">
                      <div className="flex items-center gap-2" dir="ltr">
                        <Button size="sm" variant="outline" onClick={() => setQty(l.variantId, l.quantity - 1)}>
                          −
                        </Button>
                        <span className="w-6 text-center font-mono">{l.quantity}</span>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={l.quantity >= l.available}
                          onClick={() => setQty(l.variantId, l.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                    </td>
                    <td className="p-3 font-mono">{usd(l.unitUsdCents)}</td>
                    {isManager && (
                      <td className="p-3">
                        <Input
                          value={l.lineDiscountPct ? String(l.lineDiscountPct) : ""}
                          onChange={(e) => {
                            const pct = Math.min(Math.max(parseFloat(e.target.value) || 0, 0), 100);
                            setCart((prev) =>
                              prev.map((x) => (x.variantId === l.variantId ? { ...x, lineDiscountPct: pct } : x)),
                            );
                          }}
                          className="h-8 w-16 text-left font-mono"
                          inputMode="decimal"
                          placeholder="0"
                        />
                      </td>
                    )}
                    <td className="p-3 font-mono">
                      {usd(
                        l.unitUsdCents * l.quantity -
                          Math.round((l.unitUsdCents * l.quantity * Math.round((l.lineDiscountPct ?? 0) * 100)) / 10_000),
                      )}
                    </td>
                    <td className="p-3">
                      <Button size="sm" variant="ghost" onClick={() => setQty(l.variantId, 0)}>
                        ✕
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {cart.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => void parkSale()}>
            ⏸ اركن البيع لبعدين
          </Button>
        )}
      </section>

      {/* Totals + payment */}
      <aside className="space-y-4 rounded-lg border p-4 lg:sticky lg:top-4 lg:self-start">
        <div className="flex items-center justify-between border-b pb-2 text-sm">
          <span className="text-muted-foreground">الكاشير: <span className="text-foreground">{acting.name}</span></span>
          <Button size="sm" variant="ghost" onClick={() => void openSwitcher()}>
            تبديل
          </Button>
        </div>
        {switching && (
          <div className="space-y-2 rounded-md border p-3 text-sm">
            {pinFor ? (
              <div className="space-y-2">
                <p>رمز {pinFor.name}:</p>
                <Input
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/[^0-9]/g, "").slice(0, 6))}
                  type="password"
                  inputMode="numeric"
                  className="text-center font-mono tracking-[0.5em]"
                  autoFocus
                  onKeyDown={(e) => e.key === "Enter" && void confirmPin()}
                />
                {pinError && <p className="text-xs text-destructive">{pinError}</p>}
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1" disabled={pin.length < 4} onClick={() => void confirmPin()}>
                    تأكيد
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => { setPinFor(null); setPin(""); setPinError(""); }}>
                    رجوع
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {cashiers.map((c) => (
                  <button
                    key={c.profile_id}
                    type="button"
                    disabled={!c.has_pin}
                    onClick={() => setPinFor({ id: c.profile_id, name: c.full_name })}
                    className="flex w-full items-center justify-between rounded-md px-2 py-1.5 hover:bg-muted disabled:opacity-40"
                  >
                    <span>{c.full_name}</span>
                    <span className="text-xs text-muted-foreground">{c.has_pin ? "" : "ما عندو رمز"}</span>
                  </button>
                ))}
                <Button size="sm" variant="ghost" className="w-full" onClick={() => setSwitching(false)}>
                  إغلاق
                </Button>
              </>
            )}
          </div>
        )}
        <div className="space-y-2 border-b pb-3 text-sm">
          {customer ? (
            <div className="flex items-center justify-between gap-2">
              <span>
                👤 {customer.name}
                {customer.phone && (
                  <span className="block text-xs text-muted-foreground" dir="ltr">{customer.phone}</span>
                )}
              </span>
              <Button size="sm" variant="ghost" onClick={detachCustomer}>✕</Button>
            </div>
          ) : (
            <div className="relative">
              <Input
                value={custQuery}
                onChange={(e) => {
                  setCustQuery(e.target.value);
                  void searchCustomers(e.target.value);
                }}
                placeholder="زبون؟ رقم التلفون أو الاسم…"
                className="h-9"
              />
              {custResults.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-background shadow-lg">
                  {custResults.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-right text-sm hover:bg-muted"
                      onClick={() => void attachCustomer(c)}
                    >
                      <span>{c.full_name ?? "—"}</span>
                      <span className="font-mono text-xs text-muted-foreground" dir="ltr">{c.phone}</span>
                    </button>
                  ))}
                </div>
              )}
              {custQuery.replace(/[^0-9+]/g, "").length >= 7 && custResults.length === 0 && (
                <div className="mt-2 flex gap-2">
                  <Input
                    value={newCustName}
                    onChange={(e) => setNewCustName(e.target.value)}
                    placeholder="اسم الزبون الجديد"
                    className="h-9"
                  />
                  <Button size="sm" disabled={!newCustName.trim()} onClick={() => void quickCreateCustomer()}>
                    ضيفه
                  </Button>
                </div>
              )}
            </div>
          )}
          {customer && bday?.eligible && !bdayApplied && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setBdayApplied(true)}
            >
              🎂 عيد ميلادو — طبّق خصم {bday.percent}%
            </Button>
          )}
          {bdayApplied && bday && (
            <p className="flex items-center justify-between text-xs text-green-600 dark:text-green-400">
              🎂 خصم عيد الميلاد {bday.percent}% مُطبّق
              <Button size="sm" variant="ghost" onClick={() => setBdayApplied(false)}>تراجع</Button>
            </p>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <Row label="المجموع" value={usd(subtotal)} />
          <div className="flex items-center justify-between gap-2">
            <label className="text-muted-foreground" htmlFor="disc">
              خصم %
            </label>
            <Input
              id="disc"
              value={discountPct}
              onChange={(e) => setDiscountPct(e.target.value)}
              className="h-8 w-20 text-left font-mono"
              inputMode="decimal"
              placeholder="0"
            />
          </div>
          {discount > 0 && <Row label="قيمة الخصم" value={`- ${usd(discount)}`} />}
          {tva.enabled && <Row label={tva.pricesIncludeTva ? "منها TVA" : "TVA"} value={usd(tvaCents)} />}
          <div className="flex justify-between border-t pt-2 text-lg font-bold">
            <span>الإجمالي</span>
            <span className="font-mono">{usd(total)}</span>
          </div>
          <p className="text-left font-mono text-sm text-muted-foreground">{lbp((total / 100) * rate)}</p>
          <p className="text-xs text-muted-foreground">سعر الصرف: {rate.toLocaleString("en-US")} ل.ل / $</p>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="space-y-1">
            <label className="text-sm" htmlFor="paid-usd">
              المدفوع دولار ($)
            </label>
            <Input
              id="paid-usd"
              value={paidUsd}
              onChange={(e) => setPaidUsd(e.target.value)}
              className="text-left font-mono"
              inputMode="decimal"
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1">
            <label className="text-sm" htmlFor="paid-lbp">
              المدفوع ليرة (ل.ل)
            </label>
            <Input
              id="paid-lbp"
              value={paidLbpStr}
              onChange={(e) => setPaidLbpStr(e.target.value)}
              className="text-left font-mono"
              inputMode="numeric"
              placeholder="0"
            />
          </div>
          {cart.length > 0 && remainingCents > 5 && (
            <p className="text-sm text-destructive">
              ناقص {usd(remainingCents)} ({lbp((remainingCents / 100) * rate)})
            </p>
          )}
          {changeLbp > 0 && (
            <p className="text-sm font-medium text-green-600 dark:text-green-400">الباقي للزبون: {lbp(changeLbp)}</p>
          )}
          <Button className="h-12 w-full text-lg" disabled={!canCheckout} onClick={() => void checkout()}>
            {busy ? "عم نسجّل…" : "تسجيل البيع"}
          </Button>
        </div>
      </aside>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
