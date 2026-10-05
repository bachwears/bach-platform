"use client";

import { AlertTriangle, Cake, Clock, Pause, User, WifiOff } from "lucide-react";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Thumb } from "@bach/ui/components/thumb";
import { HintDot } from "@bach/ui/components/hint-dot";

import { CameraScanner } from "./camera-scanner";
import { CustomerPoints } from "./customer-points";
import { type ReceiptData, ReceiptView } from "./receipt";

import {
  type BarcodeAlias,
  type CatalogItem,
  CATALOG_TTL_MS,
  decrementCatalog,
  enqueueSale,
  readCatalog,
  type QueuedSale,
  readQueue,
  refreshCatalog,
  removeFromQueue,
  retryQueued,
  searchCatalog,
  syncQueue,
} from "../lib/offline";
import { fetchLatestRate, RATE_CHANGED_MSG } from "../lib/rate";

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
  photo?: string | null;
}


/** Invoice discount a cashier may give alone (basis points = 10%). */
const MAX_CASHIER_DISCOUNT_BP = 1000;
/** LBP change is rounded down to this step. */
const CHANGE_STEP_LBP = 5_000;
const DISCOUNT_NEEDS_MANAGER_MSG = "الخصم فوق 10% بدّو موافقة مدير — بدّل عالمدير بالـPIN وكمّل.";

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
  rate: initialRate,
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
  const [rate, setRate] = useState(initialRate);
  const [queueCount, setQueueCount] = useState(0);
  const [failedSales, setFailedSales] = useState<QueuedSale[]>([]);
  const [syncMsg, setSyncMsg] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [discountPct, setDiscountPct] = useState("");
  const [paidUsd, setPaidUsd] = useState("");
  const [paidLbpStr, setPaidLbpStr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [custQuery, setCustQuery] = useState("");
  const [custResults, setCustResults] = useState<Array<{ id: string; full_name: string | null; phone: string | null }>>([]);
  const [customer, setCustomer] = useState<{ id: string; name: string; phone: string | null } | null>(null);
  const [bday, setBday] = useState<{ eligible: boolean; percent: number } | null>(null);
  const [bdayApplied, setBdayApplied] = useState(false);
  const [newCustName, setNewCustName] = useState("");
  const [parked, setParked] = useState<Array<{ id: string; label: string; cart: CartLine[]; customer_id: string | null; created_at: string }>>([]);
  const [acting, setActing] = useState<{ id: string; name: string; role: string }>({ ...currentUser, role });
  const [switching, setSwitching] = useState(false);
  const [cashiers, setCashiers] = useState<Array<{ profile_id: string; full_name: string; role: string; has_pin: boolean }>>([]);
  const [pinFor, setPinFor] = useState<{ id: string; name: string; role: string } | null>(null);
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
    // Claim it first: only the device whose delete actually removed the row gets the cart,
    // so two tills can't both resume the same parked sale.
    const { data: claimed, error: claimErr } = await supabase.from("parked_sales").delete().eq("id", p.id).select("id");
    void loadParked();
    if (claimErr || !claimed?.length) {
      setError("ما قدرنا نفتح هالبيع المركون — يمكن انفتح من جهاز تاني أو انمحى.");
      return;
    }
    setError("");
    setCart(p.cart);
    if (p.customer_id) {
      const { data } = await supabase.from("customers").select("id, full_name, phone").eq("id", p.customer_id).maybeSingle();
      if (data) void attachCustomer(data);
    }
  }

  async function openSwitcher() {
    setSwitching(true);
    const { data } = await supabase.rpc("pos_cashiers");
    setCashiers((data ?? []) as never);
  }

  async function confirmPin() {
    if (!pinFor || pin.length < 4) return;
    const { data, error: err } = await supabase.rpc("verify_pos_pin", { p_profile_id: pinFor.id, p_pin: pin });
    if (err?.message.includes("too many PIN attempts")) {
      setPinError("كتير محاولات غلط — استنّى ربع ساعة وجرّب مرة تانية.");
      setPin("");
      return;
    }
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

  const refreshQueueState = useCallback(() => {
    const q = readQueue();
    setQueueCount(q.length);
    setFailedSales(q.filter((s) => s.status === "failed"));
  }, []);

  const doSync = useCallback(async () => {
    if (readQueue().filter((q) => q.status === "pending").length === 0) {
      refreshQueueState();
      return;
    }
    const res = await syncQueue(supabase);
    refreshQueueState();
    if (res.synced > 0) {
      setSyncMsg(`تزامنت ${res.synced} مبيعات ✓`);
      void refreshCatalog(supabase, branchId).then((b) => { if (b) { setCatalog(b.items); setAliases(b.aliases ?? []); } });
      setTimeout(() => setSyncMsg(""), 5000);
    }
    if (res.failed > 0) {
      setSyncMsg(`${res.failed} مبيعات ما قبلها السيرفر — راجع المدير.`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, refreshQueueState]);

  function retryFailed(clientRef: string) {
    retryQueued(clientRef);
    refreshQueueState();
    void doSync();
  }

  function discardFailed(sale: QueuedSale) {
    const ok = window.confirm(
      `أكيد بدك تشيل البيع OFFLINE-${sale.clientRef.slice(0, 8).toUpperCase()} (${usd(sale.totalUsdCents)}) من الطابور؟ ما رح يتسجّل بالسيستم وما فيك ترجّعه.`,
    );
    if (!ok) return;
    removeFromQueue(sale.clientRef);
    refreshQueueState();
  }

  useEffect(() => {
    setOnline(navigator.onLine);
    refreshQueueState();
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
          photo: v.photo ?? null,
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
    // PostgREST filter syntax: commas, brackets and wildcards would break or widen the .or() query
    const t = q.trim().replace(/[,()%*\\]/g, " ").trim();
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
  // Invoice discount above 10% needs a manager (signed in, or switched in with their PIN).
  const actingIsManager = acting.role === "super_admin" || acting.role === "store_manager";
  const discountNeedsManager = manualBp > MAX_CASHIER_DISCOUNT_BP && !actingIsManager;
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

  const paidUsdCents = Math.max(Math.round((parseFloat(paidUsd) || 0) * 100), 0);
  const paidLbp = Math.max(Math.round(parseFloat(paidLbpStr.replace(/,/g, "")) || 0), 0);
  const paidEquivCents = paidUsdCents + Math.round((paidLbp / rate) * 100);
  const remainingCents = total - paidEquivCents;
  // Change is given in LBP, rounded DOWN to 5,000 LBP. Integer math in LBP × 10,000
  // (rate has 2 decimals) — the same formula the server uses for older tills.
  const rateCenti = Math.round(rate * 100);
  const overLbpX = paidLbp * 10_000 + (paidUsdCents - total) * rateCenti;
  const changeLbp = overLbpX >= CHANGE_STEP_LBP * 10_000 ? Math.floor(overLbpX / (CHANGE_STEP_LBP * 10_000)) * CHANGE_STEP_LBP : 0;
  const changeKeptLbp = overLbpX > 0 ? Math.floor((overLbpX - changeLbp * 10_000) / 10_000) : 0;
  const canCheckout = cart.length > 0 && paidEquivCents >= total - 5 && !busy && !discountNeedsManager;

  function finishSale(number: number | null, offlineRef?: string) {
    setReceipt({
      number,
      offlineRef,
      lines: cart.map((l) => ({
        key: l.variantId,
        nameEn: l.nameEn,
        size: l.size,
        colorEn: l.colorEn,
        quantity: l.quantity,
        unitUsdCents: l.unitUsdCents,
      })),
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
    // Net lines = what stays in the drawer: the LBP change comes off the LBP line,
    // which goes negative when a USD payment gets its change in LBP.
    const payments: Array<{ currency: string; amount_minor: number; net: boolean }> = [];
    if (paidUsdCents > 0) payments.push({ currency: "USD", amount_minor: paidUsdCents, net: true });
    const netLbp = paidLbp - changeLbp;
    if (netLbp !== 0) payments.push({ currency: "LBP", amount_minor: netLbp, net: true });
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
      refreshQueueState();
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

    // The rate may have changed in MGMT since this page loaded — coverage, change and
    // the receipt must use the rate the server will record.
    const latestRate = await fetchLatestRate(supabase);
    if (latestRate != null && latestRate !== rate) {
      setRate(latestRate);
      setBusy(false);
      setError(RATE_CHANGED_MSG);
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
          : err.message.includes("needs a manager")
            ? DISCOUNT_NEEDS_MANAGER_MSG
            : err.message.includes("less than 30 days")
              ? "هدية عيد الميلاد بتتفعّل بعد 30 يوم من تسجيل تاريخ الميلاد."
              : `ما مشي الحال: ${err.message}`,
      );
      return;
    }
    void refreshCatalog(supabase, branchId).then((b) => { if (b) { setCatalog(b.items); setAliases(b.aliases ?? []); } });
    finishSale(data![0].order_number);
  }

  if (receipt) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-6 print:m-0 print:max-w-none print:p-0">
        {/* C200I thermal receipt: 80mm roll, ~72mm printable. */}
        <ReceiptView receipt={receipt} branchName={branchName} />
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
          <WifiOff className="me-2 inline h-4 w-4 align-[-2px]" aria-hidden />
          النت مقطوع — البيع شغّال، والمبيعات بتتسجّل محليًا وبتتزامن لحالها لما يرجع الاتصال.
        </p>
      )}
      {queueCount > 0 && (
        <p className="flex items-center justify-between rounded-md border px-4 py-2 text-sm">
          <span><Clock className="me-2 inline h-4 w-4 align-[-2px]" aria-hidden />{queueCount} مبيعات بانتظار المزامنة</span>
          <Button size="sm" variant="outline" onClick={() => void doSync()}>
            زامن الآن
          </Button>
        </p>
      )}
      {failedSales.length > 0 && (
        <div className="space-y-2 rounded-md border border-destructive/50 px-4 py-3 text-sm">
          <p className="font-medium text-destructive">
            <AlertTriangle className="me-2 inline h-4 w-4 align-[-2px]" aria-hidden />
            {failedSales.length} مبيعات أوفلاين رفضها السيرفر — راجعها مع المدير.
          </p>
          <ul className="divide-y">
            {failedSales.map((s) => (
              <li key={s.clientRef} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span className="min-w-0">
                  <span className="font-mono">OFFLINE-{s.clientRef.slice(0, 8).toUpperCase()}</span>
                  {" · "}
                  <span className="font-mono">{usd(s.totalUsdCents)}</span>
                  {" · "}
                  <span className="text-muted-foreground">{new Date(s.at).toLocaleString("en-GB")}</span>
                  <span className="block break-words text-xs text-muted-foreground" dir="ltr">
                    {s.failReason ?? ""}
                  </span>
                </span>
                <span className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => retryFailed(s.clientRef)}>
                    جرّب مرة تانية
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive" onClick={() => discardFailed(s)}>
                    شيل
                  </Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {syncMsg && <p className="rounded-md border px-4 py-2 text-sm text-green-600 dark:text-green-400">{syncMsg}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Search + cart */}
      <section className="space-y-4">
        <div className="relative flex gap-2">
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
          <CameraScanner onDetect={(code) => void runSearch(code, true)} />
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
                    <span className="flex items-center gap-3">
                      <Thumb src={v.photo} />
                      <span>
                        {v.name_en} — {v.size} {v.color_en}
                        <span className="block text-xs text-muted-foreground" dir="ltr">
                          {v.sku}
                        </span>
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
                      <div className="flex items-center gap-3">
                        <Thumb src={l.photo ?? catalog.find((c) => c.id === l.variantId)?.photo} />
                        <div>
                          {l.nameEn}
                          <span className="block text-xs text-muted-foreground">
                            {l.size} {l.colorEn} <span dir="ltr">{l.sku}</span>
                          </span>
                        </div>
                      </div>
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
            <Pause className="me-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden /> اركن البيع لبعدين
          </Button>
        )}
      </section>

      {/* Totals + payment */}
      <aside className="space-y-4 rounded-lg border p-4 lg:sticky lg:top-4 lg:self-start">
        <div className="flex items-center justify-between border-b pb-2 text-sm">
          <span className="flex items-center gap-1.5 text-muted-foreground">الكاشير: <span className="text-foreground">{acting.name}</span>
            <HintDot
              hint={{
                title: "تبديل الكاشير",
                what: "كل بيع بينسجّل باسم الكاشير الظاهر هون — التبديل بيسمح لكذا موظف يشتغلوا على نفس الجهاز.",
                source: "الأسماء من حسابات الموظفين، والتبديل محمي بـPIN.",
                edit: "زر تبديل ← اختار الاسم ← دخّل الـPIN. الـPIN بينحدد من الإدارة.",
              }}
            />
          </span>
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
                    onClick={() => setPinFor({ id: c.profile_id, name: c.full_name, role: c.role })}
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
                <User className="me-1 inline h-4 w-4 align-[-2px]" aria-hidden />{customer.name}
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
          {customer && <CustomerPoints key={customer.id} customerId={customer.id} />}
          {customer && bday?.eligible && !bdayApplied && (
            <Button
              size="sm"
              variant="outline"
              className="w-full"
              onClick={() => setBdayApplied(true)}
            >
              <Cake className="me-1 inline h-4 w-4 align-[-2px]" aria-hidden /> عيد ميلادو — طبّق خصم {bday.percent}%
            </Button>
          )}
          {bdayApplied && bday && (
            <p className="flex items-center justify-between text-xs text-green-600 dark:text-green-400">
              <span><Cake className="me-1 inline h-3.5 w-3.5 align-[-2px]" aria-hidden />خصم عيد الميلاد {bday.percent}% مُطبّق</span>
              <Button size="sm" variant="ghost" onClick={() => setBdayApplied(false)}>تراجع</Button>
            </p>
          )}
        </div>
        <div className="space-y-2 text-sm">
          <Row label="المجموع" value={usd(subtotal)} />
          <div className="flex items-center justify-between gap-2">
            <label className="flex items-center gap-1.5 text-muted-foreground" htmlFor="disc">
              خصم %
              <HintDot
                hint={{
                  title: "خصم عالفاتورة",
                  what: "نسبة خصم على مجموع الفاتورة كلها — غير خصم القطعة الواحدة بالجدول.",
                  source: "بينحسب من المجموع قبل الضريبة وبينسجّل مع الطلب.",
                  edit: "الكاشير بيقدر يحطّ لحد 10% خصم عالفاتورة كلها هون؛ أكتر من هيك بدّو مدير (يبدّل عحالو بالـPIN). خصم القطعة الواحدة (عمود «خصم %» بالجدول) بس لحساب مدير.",
                }}
              />
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
          {discountNeedsManager && <p className="text-xs text-destructive">{DISCOUNT_NEEDS_MANAGER_MSG}</p>}
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
            <label className="flex items-center gap-1.5 text-sm" htmlFor="paid-lbp">
              المدفوع ليرة (ل.ل)
              <HintDot
                hint={{
                  title: "الدفع بالليرة",
                  what: "الزبون فيه يدفع دولار وليرة سوا — البرنامج بيجمعن عالسعر المعتمد.",
                  source: "سعر الصرف من شاشة سعر الصرف بالإدارة، وبينحفظ مع كل فاتورة.",
                  edit: "لتغيير السعر: الإدارة ← المالية ← سعر الصرف.",
                }}
              />
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
          {changeKeptLbp > 0 && (
            <p className="text-xs text-muted-foreground">
              الباقي مدوّر لتحت لأقرب {lbp(CHANGE_STEP_LBP)} — {lbp(changeKeptLbp)} بيضلّوا بالصندوق.
            </p>
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
