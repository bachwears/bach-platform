"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Icon, type IconName } from "@bach/ui/components/icon";
import { Input } from "@bach/ui/components/input";
import { Thumb } from "@bach/ui/components/thumb";
import { invoiceNo } from "@bach/ui/lib/invoice-number";

import { latinDigits, variantPhotos } from "../lib/offline";

/**
 * An order taken for a customer over Instagram, WhatsApp or the phone. It is a
 * website order in every way (staff_customer_order runs the website checkout):
 * pieces the website sells, its prices, promo codes and delivery fee, stock
 * held from the online stock, cash on delivery or paid at pickup, the
 * customer's notifications, and the online queue for fulfilment.
 */

type Source = "instagram" | "whatsapp" | "phone" | "other";
const SOURCES: Array<{ key: Source; label: string; icon: IconName }> = [
  { key: "instagram", label: "إنستغرام", icon: "web" },
  { key: "whatsapp", label: "واتساب", icon: "whatsapp" },
  { key: "phone", label: "تلفون", icon: "phone" },
  { key: "other", label: "غير شي", icon: "note" },
];

interface Piece {
  id: string;
  sku: string | null;
  size: string;
  color_en: string;
  name_en: string;
  unit: number;
  available: number;
}
interface Line extends Piece {
  quantity: number;
}

const usd = (c: number) => `$${(c / 100).toFixed(2)}`;
const normPhone = (p: string) => latinDigits(p).replace(/[^0-9+]/g, "");

export function CustomerOrder() {
  const supabase = supabaseBrowser();
  const [source, setSource] = useState<Source | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [fulfilment, setFulfilment] = useState<"delivery" | "pickup">("delivery");
  const [pickupOk, setPickupOk] = useState(false);
  const [rule, setRule] = useState({ fee: 500, freeOver: 10000 });
  const [webBranch, setWebBranch] = useState<string | null>(null);
  const [known, setKnown] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [results, setResults] = useState<Piece[]>([]);
  const [searching, setSearching] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);

  const [promo, setPromo] = useState("");
  const [promoState, setPromoState] = useState<{ kind: "percent" | "fixed"; value: number; code: string } | null>(null);
  const [promoMsg, setPromoMsg] = useState("");

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ number: number; invoice: number | null; total: number; text: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [photoOf, setPhotoOf] = useState<ReturnType<typeof variantPhotos>>(() => () => null);

  useEffect(() => {
    setPhotoOf(() => variantPhotos());
    void supabase
      .from("site_content")
      .select("key, value")
      .in("key", ["delivery", "pickup"])
      .then(({ data }) => {
        for (const r of data ?? []) {
          const v = r.value as Record<string, unknown>;
          if (r.key === "delivery")
            setRule({ fee: Number(v.fee_usd_cents ?? 500), freeOver: Number(v.free_over_usd_cents ?? 10000) });
          if (r.key === "pickup") setPickupOk(v.enabled === true && String(v.address ?? "").trim() !== "");
        }
      });
    // online orders hold stock at the first branch (as the website checkout does)
    void supabase
      .from("branches")
      .select("id")
      .eq("is_active", true)
      .order("created_at")
      .limit(1)
      .maybeSingle()
      .then(({ data }) => setWebBranch(data?.id ?? null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // a known customer: fill the name and their last delivery address
  async function lookUpPhone() {
    const p = normPhone(phone);
    if (p.length < 7) return;
    const { data: c } = await supabase.from("customers").select("id, full_name, email").eq("phone", p).maybeSingle();
    if (!c) {
      setKnown(null);
      return;
    }
    setKnown(c.full_name ?? "زبون مسجّل");
    if (!name.trim() && c.full_name) setName(c.full_name);
    if (!email.trim() && c.email) setEmail(c.email);
    const { data: last } = await supabase
      .from("orders")
      .select("ship_city, ship_address")
      .eq("customer_id", c.id)
      .eq("fulfilment", "delivery")
      .not("ship_address", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) {
      if (!city.trim() && last.ship_city) setCity(last.ship_city);
      if (!address.trim() && last.ship_address) setAddress(last.ship_address);
    }
  }

  // pieces the website sells, with the online stock
  async function search(text: string) {
    setQ(text);
    const t = latinDigits(text).trim().replace(/[,()%*\\]/g, " ").trim();
    if (t.length < 2 || !webBranch) {
      setResults([]);
      return;
    }
    setSearching(true);
    const sel =
      "id, sku, size, color_en, price_usd_cents_override, products!inner(name_en, price_usd_cents, sale_price_usd_cents, status), inventory_levels(branch_id, quantity, reserved)";
    const [byName, byCode] = await Promise.all([
      supabase.from("product_variants").select(sel).eq("is_active", true).eq("products.status", "published").ilike("products.name_en", `%${t}%`).limit(80),
      supabase.from("product_variants").select(sel).eq("is_active", true).eq("products.status", "published").or(`sku.ilike.%${t}%,barcode.eq.${t}`).limit(40),
    ]);
    setSearching(false);
    type Row = {
      id: string;
      sku: string | null;
      size: string;
      color_en: string;
      price_usd_cents_override: number | null;
      products: { name_en: string; price_usd_cents: number; sale_price_usd_cents: number | null };
      inventory_levels: Array<{ branch_id: string; quantity: number; reserved: number }>;
    };
    const seen = new Set<string>();
    const out: Piece[] = [];
    for (const r of [...((byCode.data ?? []) as unknown as Row[]), ...((byName.data ?? []) as unknown as Row[])]) {
      if (seen.has(r.id)) continue;
      seen.add(r.id);
      const p = r.products;
      const lvl = r.inventory_levels.find((l) => l.branch_id === webBranch);
      out.push({
        id: r.id,
        sku: r.sku,
        size: r.size,
        color_en: r.color_en,
        name_en: p.name_en,
        unit: r.price_usd_cents_override ?? Math.min(p.sale_price_usd_cents ?? p.price_usd_cents, p.price_usd_cents),
        available: Math.max((lvl?.quantity ?? 0) - (lvl?.reserved ?? 0), 0),
      });
    }
    out.sort((a, b) => a.name_en.localeCompare(b.name_en) || a.color_en.localeCompare(b.color_en) || a.size.localeCompare(b.size));
    setResults(out);
  }

  function add(p: Piece) {
    setLines((prev) => {
      const ex = prev.find((l) => l.id === p.id);
      if (ex) return prev.map((l) => (l.id === p.id ? { ...l, quantity: Math.min(l.quantity + 1, p.available, 10) } : l));
      if (prev.length >= 20) return prev;
      return [...prev, { ...p, quantity: 1 }];
    });
  }
  const setQty = (id: string, qty: number) =>
    setLines((prev) => (qty <= 0 ? prev.filter((l) => l.id !== id) : prev.map((l) => (l.id === id ? { ...l, quantity: Math.min(qty, l.available, 10) } : l))));

  async function checkPromo() {
    setPromoMsg("");
    setPromoState(null);
    const code = promo.trim();
    if (!code) return;
    const { data } = await supabase.rpc("validate_promocode", { p_code: code });
    const r = (data as Array<{ valid: boolean; kind: string; value: number; message: string }> | null)?.[0];
    if (!r?.valid) {
      setPromoMsg(r?.message ? `الكود ما بيمشي: ${r.message}` : "الكود ما بيمشي.");
      return;
    }
    setPromoState({ kind: r.kind === "percent" ? "percent" : "fixed", value: r.value, code });
    setPromoMsg(r.kind === "percent" ? `خصم ${r.value}%` : `خصم ${usd(r.value)}`);
  }

  // the website's pricing (loose pieces): pieces, the code, then delivery
  const subtotal = lines.reduce((s, l) => s + l.unit * l.quantity, 0);
  const promoOff = promoState
    ? promoState.kind === "percent"
      ? Math.round((subtotal * promoState.value) / 100)
      : Math.min(promoState.value, subtotal)
    : 0;
  const delivery = fulfilment === "pickup" || !lines.length ? 0 : subtotal - promoOff < rule.freeOver ? rule.fee : 0;
  const total = subtotal - promoOff + delivery;

  const phoneOk = normPhone(phone).length >= 7 && normPhone(phone).length <= 15;
  const emailOk = !email.trim() || /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim());
  const missing = useMemo(() => {
    const m: string[] = [];
    if (!source) m.push("من وين الطلب");
    if (!name.trim()) m.push("الاسم");
    if (!phoneOk) m.push("التلفون");
    if (!emailOk) m.push("إيميل صحيح");
    if (fulfilment === "delivery" && (!city.trim() || !address.trim())) m.push("المنطقة والعنوان");
    if (!lines.length) m.push("قطعة وحدة عالأقل");
    return m;
  }, [source, name, phoneOk, emailOk, fulfilment, city, address, lines.length]);

  async function place() {
    if (missing.length || busy) return;
    setBusy(true);
    setError("");
    const { data, error: err } = await supabase.rpc("staff_customer_order", {
      p_items: lines.map((l) => ({ variant_id: l.id, quantity: l.quantity })),
      p_name: name.trim(),
      p_phone: normPhone(phone),
      p_city: fulfilment === "pickup" ? "" : city.trim(),
      p_address: fulfilment === "pickup" ? "" : address.trim(),
      p_source: source,
      p_note: note.trim() || null,
      p_email: email.trim() || null,
      p_promocode: promoState?.code ?? null,
      p_fulfilment: fulfilment,
    });
    if (err || !data?.[0]) {
      setBusy(false);
      const m = err?.message ?? "";
      setError(
        m.includes("insufficient stock")
          ? "في قطعة ما عاد في منها كفاية أونلاين — شيلها أو خفّف الكمية."
          : m.includes("no longer available")
            ? "في قطعة ما عادت معروضة عالموقع."
            : m.startsWith("promocode")
              ? `كود الخصم: ${m.replace(/^promocode:\s*/, "")}`
              : m.includes("pickup not available")
                ? "الاستلام من المحل مش مفعّل هلّق."
                : `ما مشي الطلب: ${m}`,
      );
      return;
    }
    const row = data[0] as { order_id: string; order_number: number };
    const { data: o } = await supabase.from("orders").select("total_usd_cents, invoice_number").eq("id", row.order_id).maybeSingle();
    setBusy(false);
    const finalTotal = o?.total_usd_cents ?? total;
    const text = [
      `BACH Wears — Order #${row.order_number}`,
      ...lines.map((l) => `${l.quantity} × ${l.name_en} (${l.color_en}, ${l.size}) — ${usd(l.unit * l.quantity)}`),
      ...(promoOff ? [`Discount: -${usd(promoOff)}`] : []),
      fulfilment === "pickup" ? "Pickup at the shop" : `Delivery: ${delivery ? usd(delivery) : "free"} — ${city.trim()}, ${address.trim()}`,
      `Total: ${usd(finalTotal)} — ${fulfilment === "pickup" ? "pay at the shop" : "cash on delivery"}`,
      "Track it at bachwears.com/track",
    ].join("\n");
    setDone({ number: row.order_number, invoice: o?.invoice_number ?? null, total: finalTotal, text });
  }

  function reset() {
    setSource(null);
    setName("");
    setPhone("");
    setEmail("");
    setCity("");
    setAddress("");
    setNote("");
    setFulfilment("delivery");
    setKnown(null);
    setQ("");
    setResults([]);
    setLines([]);
    setPromo("");
    setPromoState(null);
    setPromoMsg("");
    setError("");
    setDone(null);
    setCopied(false);
  }

  if (done) {
    return (
      <div className="space-y-5 border p-6">
        <p className="flex items-center gap-2 text-lg font-medium">
          <Icon name="statusConfirmed" size={20} />
          انسجّل الطلب{" "}
          <span className="font-mono" dir="ltr">
            #{done.number}
          </span>
        </p>
        <p className="text-sm text-muted-foreground">
          فاتورة{" "}
          <span className="font-mono" dir="ltr">
            {invoiceNo(done.invoice)}
          </span>{" "}
          · الإجمالي <span className="font-mono">{usd(done.total)}</span> — بيطلع هلّق بشاشة «أونلاين» متل أي طلب من الموقع، وبيوصل للزبون إشعار إذا عندو إيميل.
        </p>
        <pre className="whitespace-pre-wrap border bg-muted/40 p-4 text-sm" dir="ltr">
          {done.text}
        </pre>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => {
              void navigator.clipboard.writeText(done.text).then(() => setCopied(true));
            }}
          >
            <Icon name="note" size={16} />
            {copied ? "انتسخت" : "انسخ ملخّص للزبون"}
          </Button>
          <Button asChild variant="outline">
            <Link href="/queue">
              <Icon name="online" size={16} />
              روح عالطلبات الأونلاين
            </Link>
          </Button>
          <Button onClick={reset}>
            <Icon name="add" size={16} />
            طلب جديد
          </Button>
        </div>
      </div>
    );
  }

  const field = "h-11";
  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="font-medium">١. من وين إجا الطلب؟</h2>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="مصدر الطلب">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={source === s.key}
              onClick={() => setSource(s.key)}
              className={`flex h-12 items-center justify-center gap-2 border text-sm ${source === s.key ? "border-foreground bg-foreground text-background" : "hover:bg-muted"}`}
            >
              <Icon name={s.icon} size={16} />
              {s.label}
            </button>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">٢. الزبون</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">التلفون *</span>
            <Input className={field} value={phone} onChange={(e) => setPhone(e.target.value)} onBlur={lookUpPhone} inputMode="tel" dir="ltr" placeholder="+961 …" />
          </label>
          <label className="space-y-1">
            <span className="text-xs text-muted-foreground">الاسم *</span>
            <Input className={field} value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-xs text-muted-foreground">الإيميل (اختياري — ليوصلو تأكيد الطلب والتتبّع)</span>
            <Input className={field} value={email} onChange={(e) => setEmail(e.target.value)} inputMode="email" dir="ltr" />
          </label>
        </div>
        {known ? (
          <p className="flex items-center gap-2 text-xs text-muted-foreground">
            <Icon name="user" size={14} />
            زبون معروف: {known} — عبّينا الاسم وآخر عنوان، تأكّد منن.
          </p>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">٣. التوصيل</h2>
        {pickupOk ? (
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="طريقة الاستلام">
            {(["delivery", "pickup"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="radio"
                aria-checked={fulfilment === f}
                onClick={() => setFulfilment(f)}
                className={`flex h-11 items-center justify-center gap-2 border text-sm ${fulfilment === f ? "border-foreground bg-foreground text-background" : "hover:bg-muted"}`}
              >
                <Icon name={f === "delivery" ? "courier" : "branch"} size={16} />
                {f === "delivery" ? "توصيل — دفع عند الاستلام" : "استلام من المحل — دفع بالمحل"}
              </button>
            ))}
          </div>
        ) : null}
        {fulfilment === "delivery" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">المنطقة / المدينة *</span>
              <Input className={field} value={city} onChange={(e) => setCity(e.target.value)} />
            </label>
            <label className="space-y-1">
              <span className="text-xs text-muted-foreground">العنوان *</span>
              <Input className={field} value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
          </div>
        ) : null}
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">ملاحظة (بتطلع عالطلب وعالـpacking slip)</span>
          <Input className={field} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">٤. القطع</h2>
        <div className="relative">
          <Icon name="search" size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input className={`${field} ps-9`} value={q} onChange={(e) => void search(e.target.value)} placeholder="دوّر باسم القطعة أو الـSKU أو الباركود…" />
        </div>
        {q.trim().length >= 2 ? (
          <div className="max-h-80 overflow-y-auto border">
            {searching && !results.length ? (
              <p className="p-4 text-sm text-muted-foreground">عم دوّر…</p>
            ) : results.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">ما في قطعة معروضة عالموقع بهالاسم.</p>
            ) : (
              results.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={p.available <= 0}
                  onClick={() => add(p)}
                  className="flex w-full items-center gap-3 border-b p-2 text-start text-sm last:border-0 hover:bg-muted disabled:opacity-40"
                >
                  <Thumb src={photoOf(p.id)} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{p.name_en}</span>
                    <span className="block text-xs text-muted-foreground" dir="ltr">
                      {p.color_en} · {p.size}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{p.available > 0 ? `${p.available} أونلاين` : "خلصت"}</span>
                  <span className="font-mono">{usd(p.unit)}</span>
                </button>
              ))
            )}
          </div>
        ) : null}

        {lines.length ? (
          <ul className="divide-y border">
            {lines.map((l) => (
              <li key={l.id} className="flex items-center gap-3 p-2 text-sm">
                <Thumb src={photoOf(l.id)} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{l.name_en}</span>
                  <span className="block text-xs text-muted-foreground" dir="ltr">
                    {l.color_en} · {l.size}
                  </span>
                </span>
                <span className="flex items-center gap-1">
                  <Button size="sm" variant="outline" aria-label="نقّص" onClick={() => setQty(l.id, l.quantity - 1)}>
                    −
                  </Button>
                  <span className="w-6 text-center font-mono">{l.quantity}</span>
                  <Button size="sm" variant="outline" aria-label="زيد" disabled={l.quantity >= Math.min(l.available, 10)} onClick={() => setQty(l.id, l.quantity + 1)}>
                    +
                  </Button>
                </span>
                <span className="w-20 text-end font-mono">{usd(l.unit * l.quantity)}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <section className="space-y-3">
        <h2 className="font-medium">٥. الحساب</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input className="h-10 w-48" value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="كود خصم (اختياري)" dir="ltr" />
          <Button variant="outline" onClick={checkPromo} disabled={!promo.trim()}>
            طبّق
          </Button>
          {promoMsg ? <span className="text-xs text-muted-foreground">{promoMsg}</span> : null}
        </div>
        <div className="space-y-1 border p-4 text-sm">
          <div className="flex justify-between">
            <span>القطع</span>
            <span className="font-mono">{usd(subtotal)}</span>
          </div>
          {promoOff ? (
            <div className="flex justify-between">
              <span>الخصم</span>
              <span className="font-mono">- {usd(promoOff)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span>التوصيل</span>
            <span className="font-mono">{fulfilment === "pickup" ? "استلام" : delivery ? usd(delivery) : "مجاني"}</span>
          </div>
          <div className="flex justify-between border-t pt-2 text-lg font-medium">
            <span>الإجمالي</span>
            <span className="font-mono">{usd(total)}</span>
          </div>
          <p className="text-xs text-muted-foreground">
            {fulfilment === "pickup" ? "الزبون بيدفع بالمحل وقت الاستلام." : "الزبون بيدفع للدليفري عند الاستلام — متل طلبات الموقع."}
          </p>
        </div>
      </section>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {missing.length && (name || phone || lines.length) ? (
        <p className="text-xs text-muted-foreground">ناقص: {missing.join("، ")}</p>
      ) : null}
      <Button className="h-14 w-full text-base" disabled={missing.length > 0 || busy} onClick={place}>
        <Icon name="save" size={18} />
        {busy ? "عم نسجّل…" : `سجّل الطلب — ${usd(total)}`}
      </Button>
    </div>
  );
}
