"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Textarea } from "@bach/ui/components/textarea";

import { SiteHeader } from "../../components/site-header";
import { clearCart, readCart } from "../../lib/cart";

interface SummaryLine {
  name: string;
  size: string;
  color: string;
  quantity: number;
  lineTotal: number;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function CheckoutPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<SummaryLine[]>([]);
  const [rate, setRate] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = supabaseBrowser();
    async function load() {
      const cart = readCart();
      if (cart.length === 0) {
        router.replace("/cart");
        return;
      }
      const [{ data }, { data: rateRow }] = await Promise.all([
        supabase
          .from("product_variants")
          .select("id, size, color_en, products!inner(name_en, price_usd_cents, sale_price_usd_cents)")
          .in("id", cart.map((l) => l.variantId)),
        supabase.from("exchange_rates").select("lbp_per_usd").order("effective_at", { ascending: false }).limit(1).maybeSingle(),
      ]);
      setSummary(
        cart.flatMap((l) => {
          const v = (data ?? []).find((x) => x.id === l.variantId) as Record<string, unknown> | undefined;
          if (!v) return [];
          const p = v.products as { name_en: string; price_usd_cents: number; sale_price_usd_cents: number | null };
          const price = Math.min(p.sale_price_usd_cents ?? p.price_usd_cents, p.price_usd_cents);
          return [{ name: p.name_en, size: v.size as string, color: v.color_en as string, quantity: l.quantity, lineTotal: price * l.quantity }];
        }),
      );
      setRate(rateRow ? Number(rateRow.lbp_per_usd) : null);
    }
    void load();
  }, [router]);

  const total = summary.reduce((s, l) => s + l.lineTotal, 0);
  const phoneOk = phone.replace(/[^0-9+]/g, "").length >= 7;
  const canPlace = !busy && summary.length > 0 && name.trim() && phoneOk && city.trim() && address.trim();

  async function placeOrder() {
    if (!canPlace) return;
    setBusy(true);
    setError("");
    const { data, error: err } = await supabaseBrowser().rpc("storefront_checkout", {
      p_items: readCart().map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
      p_name: name.trim(),
      p_phone: phone,
      p_city: city.trim(),
      p_address: address.trim(),
      p_note: note.trim() || null,
    });
    setBusy(false);
    if (err) {
      setError(
        err.message.includes("insufficient stock")
          ? "One of your items just sold out — please review your bag."
          : "Something went wrong placing your order. Please try again.",
      );
      return;
    }
    clearCart();
    router.replace(`/confirmed?n=${data![0].order_number}`);
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-4xl px-4 py-12">
        <h1 className="text-2xl font-semibold tracking-tight">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cash on delivery. We&apos;ll call to confirm before dispatch.
        </p>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_320px]">
          <div className="space-y-4">
            <Field label="Full name">
              <Input value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
            </Field>
            <Field label="Phone (we confirm by phone)">
              <Input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+961 71 000 000"
                inputMode="tel"
                autoComplete="tel"
                dir="ltr"
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="City">
                <Input value={city} onChange={(e) => setCity(e.target.value)} autoComplete="address-level2" />
              </Field>
              <Field label="Address">
                <Input value={address} onChange={(e) => setAddress(e.target.value)} autoComplete="street-address" />
              </Field>
            </div>
            <Field label="Delivery notes (optional)">
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
            </Field>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button className="h-12 w-full text-base" disabled={!canPlace} onClick={() => void placeOrder()}>
              {busy ? "Placing order…" : `Place order — ${usd(total)}`}
            </Button>
            <p className="text-center text-xs text-muted-foreground">
              By placing an order you agree to be contacted for delivery coordination.
            </p>
          </div>

          <aside className="h-fit space-y-3 border p-5 text-sm lg:sticky lg:top-8">
            {summary.map((l, i) => (
              <div key={i} className="flex justify-between gap-3">
                <span>
                  {l.name} <span className="text-muted-foreground">· {l.size} {l.color} × {l.quantity}</span>
                </span>
                <span className="font-mono">{usd(l.lineTotal)}</span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-3 font-medium">
              <span>Total</span>
              <span className="font-mono">{usd(total)}</span>
            </div>
            {rate && (
              <p className="text-left font-mono text-xs text-muted-foreground" dir="ltr">
                ≈ {Math.round((total / 100) * rate).toLocaleString("en-US")} LBP
              </p>
            )}
            <p className="text-xs text-muted-foreground">Paid in cash when your order arrives.</p>
            <Link href="/cart" className="block text-xs underline underline-offset-4">
              Edit bag
            </Link>
          </aside>
        </div>
      </main>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium">{label}</span>
      {children}
    </label>
  );
}
