"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";

import { SiteHeader } from "../../components/site-header";

const STATUS_EN: Record<string, string> = {
  pending: "Placed",
  confirmed: "Confirmed",
  picking: "Being prepared",
  packed: "Ready",
  shipped: "On its way",
  delivered: "Delivered",
  completed: "Completed",
  cancelled: "Cancelled",
  returned: "Returned",
  exchanged: "Exchanged",
};

interface MyOrder {
  id: string;
  number: number;
  status: string;
  total_usd_cents: number;
  created_at: string;
  channel: string;
  order_items: Array<{ name_en: string; size: string; color_en: string; quantity: number }>;
}

function usd(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function tenure(sinceIso: string): string {
  const since = new Date(sinceIso);
  const now = new Date();
  let years = now.getFullYear() - since.getFullYear();
  let months = now.getMonth() - since.getMonth();
  let days = now.getDate() - since.getDate();
  if (days < 0) {
    months -= 1;
    days += new Date(now.getFullYear(), now.getMonth(), 0).getDate();
  }
  if (months < 0) {
    years -= 1;
    months += 12;
  }
  const parts: string[] = [];
  if (years > 0) parts.push(`${years} year${years > 1 ? "s" : ""}`);
  if (months > 0) parts.push(`${months} month${months > 1 ? "s" : ""}`);
  if (years === 0 && days > 0) parts.push(`${days} day${days > 1 ? "s" : ""}`);
  return parts.length ? parts.join(", ") : "your first day";
}

export default function AccountPage() {
  const router = useRouter();
  const [customer, setCustomer] = useState<{
    id?: string;
    full_name: string | null;
    created_at: string;
    birthday?: string | null;
    marketing_consent?: boolean;
  } | null>(null);
  const [bdayInput, setBdayInput] = useState("");
  const [bdayMsg, setBdayMsg] = useState("");
  const [orders, setOrders] = useState<MyOrder[]>([]);
  const [wishlist, setWishlist] = useState<Array<{ product_id: string; products: { slug: string; name_en: string; price_usd_cents: number; sale_price_usd_cents: number | null } }>>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const supabase = supabaseBrowser();
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.replace("/account/login");
        return;
      }
      const { data: cust } = await supabase
        .from("customers")
        .select("id, full_name, created_at, birthday, marketing_consent")
        .eq("auth_user_id", user.id)
        .maybeSingle();
      setCustomer(cust ?? { full_name: user.email ?? null, created_at: user.created_at });
      if (cust) {
        const [{ data }, { data: wl }] = await Promise.all([
          supabase
            .from("orders")
            .select("id, number, status, total_usd_cents, created_at, channel, order_items(name_en, size, color_en, quantity)")
            .eq("customer_id", cust.id)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("wishlists")
            .select("product_id, products(slug, name_en, price_usd_cents, sale_price_usd_cents)")
            .eq("customer_id", cust.id)
            .order("created_at", { ascending: false }),
        ]);
        setOrders((data ?? []) as unknown as MyOrder[]);
        setWishlist((wl ?? []) as unknown as typeof wishlist extends Array<infer T> ? T[] : never);
      }
      setLoaded(true);
    }
    void load();
  }, [router]);

  async function signOut() {
    await supabaseBrowser().auth.signOut();
    router.replace("/");
  }

  if (!loaded) {
    return (
      <div className="min-h-dvh bg-background">
        <SiteHeader />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">My account</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">
              {customer?.full_name ?? "Welcome"}
            </h1>
            {customer && (
              <p className="mt-1 text-sm text-muted-foreground">
                Customer since{" "}
                {new Date(customer.created_at).toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}{" "}
                — {tenure(customer.created_at)} with us
              </p>
            )}
          </div>
          <Button variant="outline" size="sm" onClick={() => void signOut()}>
            Sign out
          </Button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <div className="rounded-md border p-4 text-sm">
            <p className="font-medium">Birthday</p>
            {customer?.birthday ? (
              <p className="mt-1 text-muted-foreground">
                {new Date(customer.birthday).toLocaleDateString("en-GB", { day: "numeric", month: "long" })} — your
                birthday treat arrives every year. 🎂
              </p>
            ) : customer?.id ? (
              <div className="mt-2 space-y-2">
                <p className="text-muted-foreground">
                  Tell us once and get a gift code every year. (Set once — contact care to correct.)
                </p>
                <div className="flex gap-2">
                  <Input type="date" value={bdayInput} onChange={(e) => setBdayInput(e.target.value)} dir="ltr" />
                  <Button
                    size="sm"
                    disabled={!bdayInput}
                    onClick={async () => {
                      const { error } = await supabaseBrowser()
                        .from("customers")
                        .update({ birthday: bdayInput })
                        .eq("id", customer!.id!);
                      if (error) setBdayMsg("Could not save — try again.");
                      else {
                        setCustomer({ ...customer!, birthday: bdayInput });
                        setBdayMsg("");
                      }
                    }}
                  >
                    Save
                  </Button>
                </div>
                {bdayMsg && <p className="text-destructive">{bdayMsg}</p>}
              </div>
            ) : (
              <p className="mt-1 text-muted-foreground">Place your first order to unlock birthday treats.</p>
            )}
          </div>
          <div className="rounded-md border p-4 text-sm">
            <p className="font-medium">Offers &amp; updates</p>
            <label className="mt-2 flex cursor-pointer items-center gap-2 text-muted-foreground">
              <input
                type="checkbox"
                checked={customer?.marketing_consent ?? false}
                disabled={!customer?.id}
                onChange={async (e) => {
                  const next = e.target.checked;
                  setCustomer({ ...customer!, marketing_consent: next });
                  await supabaseBrowser().from("customers").update({ marketing_consent: next }).eq("id", customer!.id!);
                }}
              />
              Send me birthday gifts and member offers (WhatsApp / email)
            </label>
          </div>
        </div>

        {wishlist.length > 0 && (
          <>
            <h2 className="mt-10 text-lg font-medium">Wishlist</h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {wishlist.map((w) => (
                <li key={w.product_id} className="flex items-center justify-between gap-3 rounded-md border px-4 py-3 text-sm">
                  <Link href={`/products/${w.products.slug}`} className="hover:underline">
                    {w.products.name_en}
                  </Link>
                  <span className="flex items-center gap-3">
                    <span className="font-mono">
                      ${((w.products.sale_price_usd_cents ?? w.products.price_usd_cents) / 100).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground"
                      onClick={async () => {
                        setWishlist(wishlist.filter((x) => x.product_id !== w.product_id));
                        if (customer?.id) {
                          await supabaseBrowser().from("wishlists").delete().eq("customer_id", customer.id).eq("product_id", w.product_id);
                        }
                      }}
                    >
                      ✕
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        <h2 className="mt-10 text-lg font-medium">Orders</h2>
        {orders.length === 0 ? (
          <div className="mt-4 rounded-md border p-8 text-center text-muted-foreground">
            <p>No orders on this account yet.</p>
            <Link href="/shop" className="mt-2 inline-block text-sm underline underline-offset-4">
              Browse the collection
            </Link>
          </div>
        ) : (
          <ul className="mt-4 space-y-4">
            {orders.map((o) => (
              <li key={o.id} className="rounded-md border p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium">#{o.number}</span>
                    <Badge variant={["cancelled", "returned"].includes(o.status) ? "secondary" : "default"}>
                      {STATUS_EN[o.status] ?? o.status}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {new Date(o.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                      {o.channel === "pos" ? " · in store" : ""}
                    </span>
                  </div>
                  <span className="font-mono">{usd(o.total_usd_cents)}</span>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                  {o.order_items.map((i, idx) => (
                    <li key={idx}>
                      {i.name_en} — {i.size} {i.color_en} × {i.quantity}
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
