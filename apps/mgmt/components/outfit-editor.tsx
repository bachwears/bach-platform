"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { HintDot } from "@bach/ui/components/hint-dot";
import { Icon } from "@bach/ui/components/icon";
import { Input } from "@bach/ui/components/input";
import { Label } from "@bach/ui/components/label";
import { Textarea } from "@bach/ui/components/textarea";
import { Thumb } from "@bach/ui/components/thumb";

import { NOT_SAVED } from "../lib/access";
import { code128Svg } from "../lib/code128";
import { outfitHealth, outfitPrice, slugify, usd, type OutfitPriceKind } from "../lib/outfit-price";
import { CropUpload } from "./crop-upload";
import { OUTFIT_STATUS, SELL_MODE_LABEL } from "./outfits-list";

type Level = { quantity: number; reserved: number };
interface ProductLite {
  id: string;
  slug: string;
  name_en: string;
  status: string;
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
  media_assets: Array<{ kind: string; storage_path: string; color_en: string | null }> | null;
  product_variants: Array<{ color_code: string; color_en: string; is_active: boolean; inventory_levels: Level[] | null }> | null;
}
interface Item {
  product_id: string;
  default_color_code: string | null;
  sort: number;
  products: ProductLite | null;
}
interface Media {
  id: string;
  storage_path: string;
  sort: number;
  is_main: boolean;
}
interface Outfit {
  id: string;
  slug: string;
  name_en: string;
  name_ar: string;
  description_en: string | null;
  description_ar: string | null;
  status: string;
  price_kind: OutfitPriceKind;
  percent_off: number | null;
  fixed_usd_cents: number | null;
  promo_mode: "exclude" | "stack" | "best";
  sell_mode: "flexible" | "whole" | "exclusive";
  barcode: string | null;
  meta_title_en: string | null;
  meta_description_en: string | null;
}

const PRODUCT_COLS =
  "id, slug, name_en, status, price_usd_cents, sale_price_usd_cents, media_assets(kind, storage_path, color_en), product_variants(color_code, color_en, is_active, inventory_levels(quantity, reserved))";

const front = (p: ProductLite | null) => (p?.media_assets ?? []).find((m) => m.kind === "front")?.storage_path?.replace(/-1600\.webp$/, "-400.webp") ?? null;
const stock = (p: ProductLite | null) =>
  (p?.product_variants ?? [])
    .filter((v) => v.is_active)
    .reduce((n, v) => n + (v.inventory_levels ?? []).reduce((m, l) => m + l.quantity - l.reserved, 0), 0);
const colours = (p: ProductLite | null) => [
  ...new Map((p?.product_variants ?? []).filter((v) => v.is_active).map((v) => [v.color_code, v.color_en])).entries(),
];

// the database's refusals, in staff Arabic
function arabicError(message: string): string {
  if (message.includes("piece already sold only inside another outfit"))
    return "قطعة من هالطقم صارت «ما بتنباع إلا مع بعض» بطقم تاني — القطعة ما فيها تكون بطقمين من هالنوع.";
  if (message.includes("duplicate key") && message.includes("slug")) return "هالرابط مستعمل لطقم تاني — غيّرو.";
  if (message.includes("duplicate key")) return "هالقطعة موجودة بالطقم.";
  return message;
}

/** MGMT → الأطقم → one outfit: everything about it, each section saved on its own. */
export function OutfitEditor({ id }: { id: string }) {
  const supabase = supabaseBrowser();
  const router = useRouter();
  const [o, setO] = useState<Outfit | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [media, setMedia] = useState<Media[]>([]);
  const [catalogue, setCatalogue] = useState<ProductLite[]>([]);
  const [search, setSearch] = useState("");
  const [slugTouched, setSlugTouched] = useState(true);
  const [busy, setBusy] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(async () => {
    const [{ data: outfit }, { data: its }, { data: med }] = await Promise.all([
      supabase.from("outfits").select("*").eq("id", id).single(),
      supabase.from("outfit_items").select(`product_id, default_color_code, sort, products(${PRODUCT_COLS})`).eq("outfit_id", id).order("sort"),
      supabase.from("outfit_media").select("id, storage_path, sort, is_main").eq("outfit_id", id).order("sort"),
    ]);
    setO(outfit as Outfit | null);
    setItems((its ?? []) as unknown as Item[]);
    setMedia((med ?? []) as Media[]);
    if (outfit && (outfit as Outfit).slug.startsWith("look-")) setSlugTouched(false);
  }, [id, supabase]);

  useEffect(() => {
    void load();
    void supabase
      .from("products")
      .select(PRODUCT_COLS)
      .neq("status", "archived")
      .order("name_en")
      .then(({ data }) => setCatalogue((data ?? []) as unknown as ProductLite[]));
  }, [load, supabase]);

  const set = <K extends keyof Outfit>(k: K, v: Outfit[K]) => setO((cur) => (cur ? { ...cur, [k]: v } : cur));
  const report = (ok: boolean, text: string) => setMsg({ ok, text });

  async function save(fields: Partial<Outfit>, label: string) {
    if (!o) return;
    setBusy(label);
    setMsg(null);
    const { data, error } = await supabase.from("outfits").update(fields).eq("id", o.id).select("id");
    setBusy("");
    if (error) return report(false, arabicError(error.message));
    if (!data?.length) return report(false, NOT_SAVED);
    report(true, "انحفظ.");
  }

  async function saveBasics() {
    if (!o) return;
    if (!o.name_en.trim() || !o.slug.trim()) return report(false, "الاسم والرابط لازمين.");
    if (o.status === "published") {
      if (items.length < 2) return report(false, "ما فيك تنشر طقم بأقل من قطعتين.");
      if (!media.length) return report(false, "زيد صورة للطقم قبل ما تنشرو.");
    }
    await save(
      {
        name_en: o.name_en.trim(),
        name_ar: o.name_ar.trim() || o.name_en.trim(),
        slug: o.slug.trim(),
        description_en: o.description_en?.trim() || null,
        description_ar: o.description_ar?.trim() || null,
        status: o.status,
      },
      "basics",
    );
  }

  // ---- pieces ----
  async function addPiece(p: ProductLite) {
    if (!o || items.some((i) => i.product_id === p.id)) return;
    setBusy("pieces");
    setMsg(null);
    const first = colours(p)[0]?.[0] ?? null;
    const { error } = await supabase.from("outfit_items").insert({
      outfit_id: o.id,
      product_id: p.id,
      default_color_code: first,
      sort: items.length ? Math.max(...items.map((i) => i.sort)) + 1 : 0,
    });
    setBusy("");
    if (error) return report(false, arabicError(error.message));
    setSearch("");
    await load();
  }
  async function setColour(productId: string, code: string) {
    const { error } = await supabase.from("outfit_items").update({ default_color_code: code || null }).eq("outfit_id", id).eq("product_id", productId);
    if (error) return report(false, arabicError(error.message));
    setItems((cur) => cur.map((i) => (i.product_id === productId ? { ...i, default_color_code: code || null } : i)));
  }
  async function move(productId: string, dir: -1 | 1) {
    const idx = items.findIndex((i) => i.product_id === productId);
    const other = items[idx + dir];
    if (!other) return;
    const me = items[idx]!;
    setBusy("pieces");
    await Promise.all([
      supabase.from("outfit_items").update({ sort: other.sort }).eq("outfit_id", id).eq("product_id", me.product_id),
      supabase.from("outfit_items").update({ sort: me.sort }).eq("outfit_id", id).eq("product_id", other.product_id),
    ]);
    setBusy("");
    await load();
  }
  async function removePiece(productId: string) {
    if (!window.confirm("نشيل هالقطعة من الطقم؟")) return;
    const { error } = await supabase.from("outfit_items").delete().eq("outfit_id", id).eq("product_id", productId);
    if (error) return report(false, arabicError(error.message));
    await load();
  }

  // ---- photos ----
  async function addPhoto(url: string): Promise<string | null> {
    const { error } = await supabase.from("outfit_media").insert({
      outfit_id: id,
      storage_path: url,
      sort: media.length ? Math.max(...media.map((m) => m.sort)) + 1 : 0,
      is_main: media.length === 0,
    });
    if (error) return `ما انحفظت: ${error.message}`;
    await load();
    return null;
  }
  async function makeMain(mid: string) {
    await supabase.from("outfit_media").update({ is_main: false }).eq("outfit_id", id);
    await supabase.from("outfit_media").update({ is_main: true }).eq("id", mid);
    await load();
  }
  async function movePhoto(mid: string, dir: -1 | 1) {
    const idx = media.findIndex((m) => m.id === mid);
    const other = media[idx + dir];
    if (!other) return;
    const me = media[idx]!;
    await Promise.all([
      supabase.from("outfit_media").update({ sort: other.sort }).eq("id", me.id),
      supabase.from("outfit_media").update({ sort: me.sort }).eq("id", other.id),
    ]);
    await load();
  }
  async function removePhoto(mid: string) {
    if (!window.confirm("نشيل هالصورة من الطقم؟ (الملف بيضل بالستورج)")) return;
    const wasMain = media.find((m) => m.id === mid)?.is_main;
    await supabase.from("outfit_media").delete().eq("id", mid);
    const next = media.filter((m) => m.id !== mid);
    if (wasMain && next[0]) await supabase.from("outfit_media").update({ is_main: true }).eq("id", next[0].id);
    await load();
  }

  // ---- barcode card ----
  function printCard() {
    if (!o?.barcode) return;
    const svg = code128Svg(o.barcode, 14) ?? "";
    const pieces = items.map((i) => `<li>${i.products?.name_en ?? ""}</li>`).join("");
    const w = window.open("", "_blank", "width=420,height=600");
    if (!w) return;
    w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${o.name_en}</title>
      <style>@page{size:105mm 148mm;margin:8mm}body{font-family:system-ui,sans-serif;color:#000;text-align:center}
      img{height:7mm}h1{font-size:15pt;font-weight:500;letter-spacing:.06em;text-transform:uppercase;margin:6mm 0 2mm}
      ul{list-style:none;padding:0;font-size:9pt;line-height:1.5;margin:0 0 4mm}.p{font-size:13pt;margin:2mm 0 5mm}
      .p s{color:#777;margin-inline-end:2mm}.b svg{width:100%;height:auto}.n{font:10pt monospace;letter-spacing:.1em}</style></head>
      <body><img src="${location.origin}/logo-bach.png" alt="BACH"><h1>${o.name_en}</h1><ul>${pieces}</ul>
      <p class="p">${price.saving > 0 ? `<s>${usd(price.sum)}</s>` : ""}${usd(price.pay)}</p>
      <div class="b">${svg}</div><p class="n">${o.barcode}</p>
      <script>window.onload=()=>{window.print();}</script></body></html>`);
    w.document.close();
  }

  const price = useMemo(
    () =>
      outfitPrice(
        items
          .filter((i) => i.products)
          .map((i) => ({
            current: Math.min(i.products!.sale_price_usd_cents ?? i.products!.price_usd_cents, i.products!.price_usd_cents),
            full: i.products!.price_usd_cents,
          })),
        o?.price_kind ?? "sum",
        o?.percent_off ?? null,
        o?.fixed_usd_cents ?? null,
      ),
    [items, o],
  );
  const health = outfitHealth(
    items
      .filter((i) => i.products)
      .map((i) => ({
        name: i.products!.name_en,
        status: i.products!.status,
        hasFront: Boolean(front(i.products)),
        stock: stock(i.products),
      })),
  );
  const results = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (s.length < 2) return [];
    return catalogue.filter((p) => !items.some((i) => i.product_id === p.id) && (p.name_en.toLowerCase().includes(s) || p.slug.includes(s))).slice(0, 12);
  }, [catalogue, items, search]);

  if (!o) return <p className="text-sm text-muted-foreground">عم نحمّل…</p>;
  const st = OUTFIT_STATUS[o.status] ?? OUTFIT_STATUS.draft!;

  const section = (title: string, icon: Parameters<typeof Icon>[0]["name"], body: React.ReactNode, hint?: { what: string; source: string; edit: string }) => (
    <section className="space-y-4 border p-5">
      <h2 className="flex items-center gap-2 font-medium">
        <Icon name={icon} size={18} className="text-muted-foreground" />
        {title}
        {hint ? <HintDot hint={{ title, ...hint }} /> : null}
      </h2>
      {body}
    </section>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link href="/outfits" className="text-xs text-muted-foreground hover:text-foreground">
          → كل الأطقم
        </Link>
        <div className="flex items-center gap-2">
          <Badge variant={st.variant}>{st.label}</Badge>
          {o.status === "published" ? (
            <a href={`https://bachwears.com/outfits/${o.slug}`} target="_blank" rel="noreferrer" className="text-xs underline underline-offset-2">
              شوف عالموقع
            </a>
          ) : null}
        </div>
      </div>

      {health.length ? (
        <div className="border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <p className="font-medium">شو بيوقّف الطقم عن البيع:</p>
          <ul className="mt-1 list-disc ps-5">
            {health.map((h) => (
              <li key={h}>{h}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="border border-green-600/30 bg-green-600/5 p-3 text-sm text-green-700 dark:text-green-400">كل القطع موجودة وفيها ستوك — الطقم قابل للبيع.</p>
      )}
      {msg ? <p className={`text-sm ${msg.ok ? "text-green-600 dark:text-green-400" : "text-destructive"}`}>{msg.text}</p> : null}

      {section(
        "الأساسيات",
        "details",
        <>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="o-name">الاسم (بالإنكليزي)</Label>
              <Input
                id="o-name"
                dir="ltr"
                value={o.name_en}
                onChange={(e) => {
                  set("name_en", e.target.value);
                  if (!slugTouched) set("slug", slugify(e.target.value));
                }}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="o-name-ar">الاسم بالعربي</Label>
              <Input id="o-name-ar" value={o.name_ar} onChange={(e) => set("name_ar", e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="o-slug">الرابط</Label>
              <Input
                id="o-slug"
                dir="ltr"
                value={o.slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  set("slug", slugify(e.target.value));
                }}
              />
              <p className="text-xs text-muted-foreground" dir="ltr">bachwears.com/outfits/{o.slug}</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="o-status">الحالة</Label>
              <select id="o-status" value={o.status} onChange={(e) => set("status", e.target.value)} className="h-10 w-full border bg-background px-2 text-sm">
                <option value="draft">مسودة</option>
                <option value="published">منشور</option>
                <option value="archived">مؤرشف</option>
              </select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-desc">الوصف (بالإنكليزي)</Label>
            <Textarea id="o-desc" dir="ltr" rows={3} value={o.description_en ?? ""} onChange={(e) => set("description_en", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-desc-ar">الوصف بالعربي (للمساعد)</Label>
            <Textarea id="o-desc-ar" rows={2} value={o.description_ar ?? ""} onChange={(e) => set("description_ar", e.target.value)} />
          </div>
          <Button onClick={() => void saveBasics()} disabled={busy === "basics"}>
            <Icon name="save" size={16} />
            احفظ الأساسيات
          </Button>
        </>,
      )}

      {section(
        `القطع (${items.length})`,
        "products",
        <>
          {items.length ? (
            <ul className="divide-y border">
              {items.map((i, k) => (
                <li key={i.product_id} className="flex flex-wrap items-center gap-3 p-2">
                  <Thumb src={front(i.products)} size="lg" />
                  <div className="min-w-0 flex-1">
                    <Link href={`/products/${i.product_id}`} dir="ltr" className="block truncate text-end text-sm hover:underline">
                      {i.products?.name_en}
                    </Link>
                    <p className="text-xs text-muted-foreground">
                      <span dir="ltr">{usd(Math.min(i.products?.sale_price_usd_cents ?? i.products?.price_usd_cents ?? 0, i.products?.price_usd_cents ?? 0))}</span> ·
                      ستوك {stock(i.products)}
                      {i.products?.status !== "published" ? " · مش منشورة" : ""}
                    </p>
                  </div>
                  <label className="flex items-center gap-1.5 text-xs">
                    لون الصورة
                    <select
                      value={i.default_color_code ?? ""}
                      onChange={(e) => void setColour(i.product_id, e.target.value)}
                      className="h-8 border bg-background px-1 text-xs"
                      dir="ltr"
                    >
                      {colours(i.products).map(([code, name]) => (
                        <option key={code} value={code}>
                          {name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex gap-1">
                    <Button size="sm" variant="ghost" disabled={k === 0 || busy === "pieces"} onClick={() => void move(i.product_id, -1)} aria-label="لفوق">
                      ↑
                    </Button>
                    <Button size="sm" variant="ghost" disabled={k === items.length - 1 || busy === "pieces"} onClick={() => void move(i.product_id, 1)} aria-label="لتحت">
                      ↓
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => void removePiece(i.product_id)} aria-label="شيل">
                      <Icon name="remove" size={16} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">بعدو فاضي — زيد قطعتين أو أكتر من تحت.</p>
          )}
          <div className="space-y-2">
            <Input placeholder="زيد قطعة: اكتب اسمها…" value={search} onChange={(e) => setSearch(e.target.value)} dir="ltr" />
            {results.length ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => void addPiece(p)}
                    disabled={busy === "pieces"}
                    className="flex items-center gap-3 border p-2 text-start hover:border-foreground"
                  >
                    <Thumb src={front(p)} size="md" />
                    <span className="min-w-0 flex-1">
                      <span dir="ltr" className="block truncate text-end text-sm">{p.name_en}</span>
                      <span className="block text-xs text-muted-foreground">
                        ستوك {stock(p)}
                        {p.status !== "published" ? " · مسودة" : ""}
                      </span>
                    </span>
                    <Icon name="add" size={16} />
                  </button>
                ))}
              </div>
            ) : search.trim().length >= 2 ? (
              <p className="text-xs text-muted-foreground">ما في قطعة بهالاسم.</p>
            ) : null}
          </div>
        </>,
        {
          what: "القطع من المنتجات الموجودة. «لون الصورة» هو اللون يلّي لابسو الموديل بصور الطقم — الزبون فيه يغيّرو.",
          source: "جدول outfit_items.",
          edit: "من هون: زيد، رتّب بالأسهم، أو شيل.",
        },
      )}

      {section(
        `الصور (${media.length})`,
        "photosUpload",
        <>
          {media.length ? (
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {media.map((m, k) => (
                <div key={m.id} className="space-y-1">
                  <div className="relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.storage_path} alt="" className="aspect-[3/4] w-full bg-muted object-cover" />
                    {m.is_main ? <Badge className="absolute start-1 top-1">رئيسية</Badge> : null}
                  </div>
                  <div className="flex flex-wrap gap-1 text-xs">
                    {!m.is_main ? (
                      <button type="button" className="underline" onClick={() => void makeMain(m.id)}>
                        رئيسية
                      </button>
                    ) : null}
                    <button type="button" disabled={k === 0} onClick={() => void movePhoto(m.id, -1)} aria-label="قبل">
                      →
                    </button>
                    <button type="button" disabled={k === media.length - 1} onClick={() => void movePhoto(m.id, 1)} aria-label="بعد">
                      ←
                    </button>
                    <button type="button" className="text-destructive" onClick={() => void removePhoto(m.id)}>
                      شيل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
          <div className="max-w-xs">
            <CropUpload label="زيد صورة للطقم" ratio="3:4" width={1200} height={1600} current={null} prefix={`outfit-${o.id}`} onSaved={addPhoto} />
          </div>
        </>,
        {
          what: "صور الموديل لابس الطقم كامل. «الرئيسية» بتطلع عالكرت بالشوب. صفحة الطقم بتفرجي كمان صور القطع (قدّام وضهر) لحالها.",
          source: "جدول outfit_media؛ الملفات بـ product-media/site.",
          edit: "من هون: زيد، رتّب، اختار الرئيسية، أو شيل.",
        },
      )}

      {section(
        "السعر وطريقة البيع",
        "price",
        <>
          <div className="flex flex-wrap gap-2">
            {(
              [
                ["sum", "مجموع القطع"],
                ["percent", "نسبة خصم"],
                ["fixed", "سعر ثابت"],
              ] as const
            ).map(([k, label]) => (
              <button
                key={k}
                type="button"
                onClick={() => set("price_kind", k)}
                className={`border px-3 py-1.5 text-sm ${o.price_kind === k ? "border-foreground bg-foreground text-background" : "hover:bg-muted"}`}
              >
                {label}
              </button>
            ))}
          </div>
          {o.price_kind === "percent" ? (
            <label className="flex items-center gap-2 text-sm">
              الخصم
              <Input
                type="number"
                min={1}
                max={90}
                className="w-24"
                dir="ltr"
                value={o.percent_off ?? ""}
                onChange={(e) => set("percent_off", e.target.value ? Math.min(90, Math.max(1, Number(e.target.value))) : null)}
              />
              % من الأسعار الكاملة
            </label>
          ) : null}
          {o.price_kind === "fixed" ? (
            <label className="flex items-center gap-2 text-sm">
              السعر
              <Input
                type="number"
                min={1}
                step="0.01"
                className="w-32"
                dir="ltr"
                value={o.fixed_usd_cents != null ? o.fixed_usd_cents / 100 : ""}
                onChange={(e) => set("fixed_usd_cents", e.target.value ? Math.round(Number(e.target.value) * 100) : null)}
              />
              $
            </label>
          ) : null}
          <p className="text-sm">
            الطقم كامل:{" "}
            <span dir="ltr" className="font-medium tabular-nums">
              {price.saving > 0 ? (
                <>
                  <s className="text-muted-foreground">{usd(price.sum)}</s> {usd(price.pay)} · Save {usd(price.saving)}
                </>
              ) : (
                usd(price.pay)
              )}
            </span>
          </p>
          {o.price_kind === "fixed" && o.fixed_usd_cents != null && o.fixed_usd_cents >= price.sum ? (
            <p className="text-xs text-amber-700 dark:text-amber-400">السعر الثابت أعلى من مجموع القطع — الزبون بيدفع المجموع.</p>
          ) : null}
          <p className="text-xs text-muted-foreground">
            إذا قطعة عليها تخفيض، الزبون بياخد الأرخص بين سعر الطقم ومجموع الأسعار الحالية — ما في خصمين عنفس القطعة.
          </p>

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">طريقة البيع</p>
            {(["flexible", "whole", "exclusive"] as const).map((k) => (
              <label key={k} className="flex items-start gap-2 text-sm">
                <input type="radio" name="sell" className="mt-1 accent-foreground" checked={o.sell_mode === k} onChange={() => set("sell_mode", k)} />
                <span>
                  {SELL_MODE_LABEL[k]}
                  <span className="block text-xs text-muted-foreground">
                    {k === "flexible"
                      ? "الزبون فيه يشيل قطعة؛ سعر الطقم بس للطقم الكامل."
                      : k === "whole"
                        ? "الطقم كامل أو ولا شي. القطع بتضل تنباع لحالها بصفحاتها وبالكاشير."
                        : "القطع بتختفي من الشوب كقطع لحالها وبتنباع بس ضمن هالطقم، وبترجع كاملة بس."}
                  </span>
                </span>
              </label>
            ))}
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="text-sm font-medium">أكواد الخصم على هالطقم</p>
            {(
              [
                ["exclude", "ما بتنطبق على طقم مخصوم (الأصل)"],
                ["stack", "بتنطبق كمان (خصمين)"],
                ["best", "الأفضل للزبون: الأكبر بين خصم الطقم والكود"],
              ] as const
            ).map(([k, label]) => (
              <label key={k} className="flex items-center gap-2 text-sm">
                <input type="radio" name="promo" className="accent-foreground" checked={o.promo_mode === k} onChange={() => set("promo_mode", k)} />
                {label}
              </label>
            ))}
          </div>

          <Button
            onClick={() =>
              void save(
                {
                  price_kind: o.price_kind,
                  percent_off: o.percent_off,
                  fixed_usd_cents: o.fixed_usd_cents,
                  sell_mode: o.sell_mode,
                  promo_mode: o.promo_mode,
                },
                "price",
              )
            }
            disabled={busy === "price" || (o.price_kind === "percent" && !o.percent_off) || (o.price_kind === "fixed" && !o.fixed_usd_cents)}
          >
            <Icon name="save" size={16} />
            احفظ السعر وطريقة البيع
          </Button>
        </>,
        {
          what: "سعر الطقم الكامل: مجموع القطع، أو نسبة من أسعارها الكاملة، أو سعر ثابت. الخصم بيتوزّع عالقطع عالفاتورة حسب أسعارها.",
          source: "أعمدة price_kind و percent_off و fixed_usd_cents و sell_mode و promo_mode بجدول outfits. السعر بينحسب بالسيرفر (price_cart).",
          edit: "من هون.",
        },
      )}

      {section(
        "Google (SEO)",
        "web",
        <>
          <div className="space-y-1.5">
            <Label htmlFor="o-mt">العنوان</Label>
            <Input id="o-mt" dir="ltr" placeholder={`${o.name_en} — BACH Wears`} value={o.meta_title_en ?? ""} onChange={(e) => set("meta_title_en", e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="o-md">الوصف</Label>
            <Textarea id="o-md" dir="ltr" rows={2} placeholder="تلقائي من وصف الطقم" value={o.meta_description_en ?? ""} onChange={(e) => set("meta_description_en", e.target.value)} />
          </div>
          <Button
            variant="outline"
            onClick={() => void save({ meta_title_en: o.meta_title_en?.trim() || null, meta_description_en: o.meta_description_en?.trim() || null }, "seo")}
            disabled={busy === "seo"}
          >
            احفظ
          </Button>
        </>,
      )}

      {section(
        "الباركود",
        "scan",
        <div className="flex flex-wrap items-center gap-4">
          <span className="font-mono text-lg" dir="ltr">
            {o.barcode}
          </span>
          <Button variant="outline" onClick={printCard} disabled={!items.length}>
            <Icon name="print" size={16} />
            اطبع بطاقة
          </Button>
          <p className="w-full text-xs text-muted-foreground">
            بطاقة عرض للمحل (A6): اسم الطقم، القطع، السعر والباركود. سكان البطاقة بالكاشير بيفتح الطقم لتختار المقاسات.
          </p>
        </div>,
      )}

      <div>
        <Button
          variant="ghost"
          className="text-destructive"
          onClick={async () => {
            // a look that sold stays (its sales point at it): archive it instead
            const { count } = await supabase.from("order_items").select("id", { count: "exact", head: true }).eq("outfit_id", o.id);
            if (count) return report(false, "هالطقم انباع قبل — ما بينمحى. غيّر الحالة لـ «مؤرشف» ليختفي.");
            if (!window.confirm("نمحي هالطقم؟ القطع ما بتنمحى.")) return;
            const { error } = await supabase.from("outfits").delete().eq("id", o.id);
            if (error) return report(false, "ما انمحى — إذا انباع قبل، خلّيه «مؤرشف».");
            router.push("/outfits");
          }}
        >
          <Icon name="remove" size={16} />
          امحي الطقم
        </Button>
      </div>
    </div>
  );
}
