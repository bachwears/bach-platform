"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { HintDot } from "@bach/ui/components/hint-dot";
import { Icon } from "@bach/ui/components/icon";
import { Thumb } from "@bach/ui/components/thumb";
import { loadFrontPhotos, photoFor, type PhotoMap } from "@bach/ui/lib/photos";
import { NOT_SAVED } from "../lib/access";
import { fetchAllPages } from "../lib/fetch-all";

const BUCKET = "product-media";
const KINDS: Array<{ value: string; label: string }> = [
  { value: "front", label: "واجهة" },
  { value: "back", label: "ضهر" },
  { value: "closeup", label: "قريبة" },
  { value: "side", label: "جانب/موديل" },
  { value: "other", label: "إضافية" },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label]));
// extra photos only show on the website inside this sort window (same rule as the storefront)
const EXTRA_MIN = 100;
const EXTRA_MAX = 499;

/** A photo waiting in storage `unmatched/`, read from its file name: `{code}_{colour}_{view}.webp`. */
interface Pending {
  name: string;
  url: string;
  /** model code (BW-SWT-094) or a descriptive name (corduroy-shirt) */
  code: string;
  colour: string;
  view: string;
}
interface Product {
  id: string;
  name_en: string;
  name_ar: string | null;
  slug: string;
  status: string;
  category_id: string | null;
  /** model codes from the variant SKUs (BW-SWT-094-BEI-L → BW-SWT-094) */
  codes: string[];
  colours: string[];
}
interface MediaRow {
  id: string;
  product_id: string;
  kind: string;
  storage_path: string;
  sort: number;
  color_en: string | null;
}
interface Category {
  id: string;
  code: string;
  name_ar: string | null;
  name_en: string;
  parent_id: string | null;
}
/** One photo about to be linked: its slot and colour, prefilled from the file name. */
interface Plan {
  kind: string;
  colour: string;
}

function parse(name: string, url: string): Pending {
  const [code = "", colour = "", ...rest] = name.replace(/\.webp$/, "").split("_");
  return { name, url, code, colour, view: rest.join("_") };
}

const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .split(" ")
    .filter((w) => w.length > 2 && !["the", "and", "with", "bw"].includes(w));

/** The product's colour that a file's colour (white-blue, dark-burgundy…) names. */
function colourFor(p: Product, fileColour: string): string {
  const f = fileColour.toLowerCase().replace(/-/g, " ").trim();
  if (!f) return p.colours.length === 1 ? p.colours[0]! : "";
  const exact = p.colours.find((c) => c.toLowerCase() === f || c.toLowerCase().replace(/\//g, " ") === f);
  if (exact) return exact;
  const loose = p.colours.find((c) => {
    const cw = words(c);
    return cw.length > 0 && cw.every((w) => f.includes(w));
  });
  return loose ?? (p.colours.length === 1 ? p.colours[0]! : "");
}

/** Products a group of photos probably belongs to: by model code first, then by name words. */
function suggest(code: string, products: Product[]): Array<{ p: Product; sure: boolean }> {
  if (/^BW-[A-Z]+-\d+$/i.test(code)) {
    const hit = products.find((p) => p.codes.includes(code.toUpperCase()));
    if (hit) return [{ p: hit, sure: true }];
  }
  const want = words(code);
  if (!want.length) return [];
  return products
    .map((p) => {
      const have = new Set([...words(p.name_en), ...words(p.slug)]);
      return { p, score: want.filter((w) => have.has(w)).length / want.length };
    })
    .filter((x) => x.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(({ p, score }) => ({ p, sure: score === 1 }));
}

/**
 * مطابقة الصور: الصور غير المرتبطة (storage: unmatched/) مجمّعة حسب القطعة من اسم الملف،
 * مع اقتراح القطعة الصح (بكود الموديل أو بكلمات الاسم). بكبسة بتفتح القطعة، بتنعلّم صور
 * المجموعة، وكل صورة بتاخد خانتها ولونها تلقائيًا — الخانات المحجوزة ما بتتبدّل إلا إذا
 * اخترت هيك (والقديمة بتنزل «إضافية» بدل ما تنحذف).
 */
export function MediaMatch() {
  const supabase = supabaseBrowser();
  const [files, setFiles] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allMedia, setAllMedia] = useState<MediaRow[]>([]);
  const [photos, setPhotos] = useState<PhotoMap | null>(null);

  // left: photo groups
  const [filter, setFilter] = useState("");
  const [show, setShow] = useState<"all" | "new" | "dup" | "none">("all");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);

  // right: product finder + linking
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [noPhotosOnly, setNoPhotosOnly] = useState(false);
  const [product, setProduct] = useState<Product | null>(null);
  const [plans, setPlans] = useState<Record<string, Plan>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const pub = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  async function loadMedia() {
    const { data } = await fetchAllPages<MediaRow>((from, to) =>
      supabase.from("media_assets").select("id, product_id, kind, storage_path, sort, color_en").order("id").range(from, to),
    );
    setAllMedia(data ?? []);
    return data ?? [];
  }

  async function loadFiles(linked: MediaRow[]) {
    const all: Pending[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list("unmatched", { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
      if (error) {
        setErr(error.message);
        break;
      }
      for (const f of data ?? []) if (f.name.endsWith(".webp")) all.push(parse(f.name, pub(`unmatched/${f.name}`)));
      if (!data || data.length < 100) break;
    }
    // Self-heal: anything already linked to a product (an earlier link whose
    // clean-up didn't go through) leaves the list and the folder.
    const linkedNames = new Set(linked.filter((r) => r.storage_path.includes("/products/")).map((r) => r.storage_path.split("/").pop()));
    const stale = all.filter((f) => linkedNames.has(f.name));
    if (stale.length) void supabase.storage.from(BUCKET).remove(stale.map((f) => `unmatched/${f.name}`));
    setFiles(all.filter((f) => !linkedNames.has(f.name)));
  }

  useEffect(() => {
    void (async () => {
      const [{ data: prods }, { data: cats }, media] = await Promise.all([
        supabase
          .from("products")
          .select("id, name_en, name_ar, slug, status, category_id, product_variants(sku, color_en, is_active)")
          .neq("status", "archived")
          .order("name_en"),
        supabase.from("categories").select("id, code, name_ar, name_en, parent_id"),
        loadMedia(),
      ]);
      type Row = Omit<Product, "codes" | "colours"> & {
        product_variants: Array<{ sku: string | null; color_en: string; is_active: boolean }> | null;
      };
      setProducts(
        ((prods ?? []) as Row[]).map(({ product_variants, ...p }) => {
          const vs = (product_variants ?? []).filter((v) => v.is_active);
          return {
            ...p,
            codes: [...new Set(vs.map((v) => (v.sku ?? "").split("-").slice(0, 3).join("-").toUpperCase()).filter(Boolean))],
            colours: [...new Set(vs.map((v) => v.color_en).filter(Boolean))],
          };
        }),
      );
      setCategories((cats ?? []) as Category[]);
      await loadFiles(media);
      setLoading(false);
    })();
    void loadFrontPhotos(supabaseBrowser()).then(setPhotos);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const mediaOf = useMemo(() => {
    const m = new Map<string, MediaRow[]>();
    for (const r of allMedia) (m.get(r.product_id) ?? m.set(r.product_id, []).get(r.product_id)!).push(r);
    for (const list of m.values()) list.sort((a, b) => a.sort - b.sort);
    return m;
  }, [allMedia]);
  const photoCount = (id: string) => mediaOf.get(id)?.length ?? 0;

  // ---- photo groups (one per piece in the file names) ----
  const groups = useMemo(() => {
    const byCode = new Map<string, Pending[]>();
    for (const f of files) (byCode.get(f.code) ?? byCode.set(f.code, []).get(f.code)!).push(f);
    return [...byCode.entries()].map(([code, list]) => {
      const hits = suggest(code, products);
      const top = hits[0]?.p;
      const state: "new" | "dup" | "none" = !top ? "none" : photoCount(top.id) ? "dup" : "new";
      return { code, files: list, hits, state, colours: [...new Set(list.map((f) => f.colour).filter(Boolean))] };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, products, mediaOf]);

  const counts = useMemo(
    () => ({
      all: groups.length,
      new: groups.filter((g) => g.state === "new").length,
      dup: groups.filter((g) => g.state === "dup").length,
      none: groups.filter((g) => g.state === "none").length,
    }),
    [groups],
  );

  const shownGroups = useMemo(() => {
    const f = filter.trim().toLowerCase();
    const rank = { new: 0, none: 1, dup: 2 } as const;
    return groups
      .filter((g) => show === "all" || g.state === show)
      .filter(
        (g) =>
          !f ||
          g.code.toLowerCase().includes(f) ||
          g.colours.some((c) => c.includes(f)) ||
          g.hits.some((h) => h.p.name_en.toLowerCase().includes(f)),
      )
      .sort((a, b) => rank[a.state] - rank[b.state] || a.code.localeCompare(b.code));
  }, [groups, filter, show]);

  // ---- product finder ----
  const topCats = useMemo(() => {
    const used = new Set(products.map((p) => p.category_id));
    const parentOf = new Map(categories.map((c) => [c.id, c.parent_id]));
    const rootOf = (id: string | null) => {
      let cur = id;
      for (let i = 0; cur && parentOf.get(cur) && i < 5; i++) cur = parentOf.get(cur)!;
      return cur;
    };
    const roots = new Set([...used].map((id) => rootOf(id)));
    return { list: categories.filter((c) => roots.has(c.id)).sort((a, b) => a.name_en.localeCompare(b.name_en)), rootOf };
  }, [categories, products]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => !cat || topCats.rootOf(p.category_id) === cat || p.category_id === cat)
      .filter((p) => !noPhotosOnly || photoCount(p.id) === 0)
      .filter(
        (p) =>
          !q ||
          p.name_en.toLowerCase().includes(q) ||
          (p.name_ar ?? "").includes(query.trim()) ||
          p.slug.includes(q) ||
          p.codes.some((c) => c.toLowerCase().includes(q)) ||
          p.colours.some((c) => c.toLowerCase().includes(q)),
      )
      .slice(0, 30);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, query, cat, noPhotosOnly, topCats, mediaOf]);

  /** Slot and colour for each photo: a piece without photos gets its first front/back
   *  in the empty slots; anything else goes in as an extra, so nothing on the site is
   *  replaced without a deliberate choice. */
  function planFor(p: Product, list: Pending[]): Record<string, Plan> {
    const empty = photoCount(p.id) === 0;
    const taken = new Set<string>();
    const firstColour = colourFor(p, list[0]?.colour ?? "");
    const out: Record<string, Plan> = {};
    for (const f of list) {
      const colour = colourFor(p, f.colour);
      let kind = "other";
      const slot = f.view === "front" ? "front" : f.view === "back" ? "back" : null;
      if (empty && slot && !taken.has(slot) && colour === firstColour) {
        kind = slot;
        taken.add(slot);
      }
      out[f.name] = { kind, colour };
    }
    return out;
  }

  function pickProduct(p: Product, list?: Pending[]) {
    setProduct(p);
    setMsg("");
    setErr("");
    const chosen = list ?? files.filter((f) => selected.includes(f.name));
    setPlans(planFor(p, chosen));
  }

  function openGroupWith(g: (typeof groups)[number], p?: Product) {
    setOpenGroup(g.code);
    const names = g.files.map((f) => f.name);
    setSelected(names);
    if (p) pickProduct(p, g.files);
    else if (product) setPlans(planFor(product, g.files));
  }

  function toggle(name: string) {
    const next = selected.includes(name) ? selected.filter((n) => n !== name) : [...selected, name];
    setSelected(next);
    if (product) setPlans(planFor(product, files.filter((f) => next.includes(f.name))));
  }

  function setPlan(name: string, patch: Partial<Plan>) {
    setPlans((cur) => {
      const next = { ...cur, [name]: { ...cur[name]!, ...patch } };
      // one photo per unique slot: another photo already planned there goes back to extra
      if (patch.kind && patch.kind !== "other")
        for (const k of Object.keys(next)) if (k !== name && next[k]!.kind === patch.kind) next[k] = { ...next[k]!, kind: "other" };
      return next;
    });
  }

  async function demote(productId: string, slot: string) {
    if (slot === "other") return;
    const occupied = (mediaOf.get(productId) ?? []).find((m) => m.kind === slot);
    if (occupied) {
      const { error } = await supabase.from("media_assets").update({ kind: "other" }).eq("id", occupied.id);
      if (error) throw new Error(error.message);
    }
  }

  async function linkSelected() {
    if (!product || !selected.length) return;
    setBusy(true);
    setErr("");
    setMsg("");
    const done: string[] = [];
    try {
      const current = mediaOf.get(product.id) ?? [];
      let extraSort = Math.max(EXTRA_MIN - 1, ...current.filter((m) => m.kind === "other").map((m) => m.sort)) + 1;
      let slotSort = Math.max(-1, ...current.filter((m) => m.kind !== "other" && m.sort < EXTRA_MIN).map((m) => m.sort)) + 1;
      for (const name of selected) {
        const plan = plans[name] ?? { kind: "other", colour: "" };
        await demote(product.id, plan.kind);
        const from = `unmatched/${name}`;
        const to = `products/${name}`;
        const { error: cpErr } = await supabase.storage.from(BUCKET).copy(from, to);
        if (cpErr && !cpErr.message.includes("already exists")) throw new Error(cpErr.message);
        const sort = plan.kind === "other" ? Math.min(extraSort++, EXTRA_MAX) : slotSort++;
        const { error: insErr } = await supabase.from("media_assets").insert({
          product_id: product.id,
          kind: plan.kind,
          storage_path: pub(to),
          sort,
          color_en: plan.colour || null,
        });
        if (insErr) throw new Error(insErr.message);
        await supabase.storage.from(BUCKET).remove([from]);
        done.push(name);
      }
      setMsg(`انربطت ${done.length} صورة بـ ${product.name_en} — بتبيّن عالموقع خلال دقيقة.`);
    } catch (e) {
      setErr(`${done.length ? `انربطت ${done.length} وبعدين وقفنا: ` : ""}${e instanceof Error ? e.message : "صار خطأ — جرّب مرة تانية"}`);
    } finally {
      setFiles((fs) => fs.filter((f) => !done.includes(f.name)));
      setSelected((s) => s.filter((n) => !done.includes(n)));
      await loadMedia();
      setBusy(false);
    }
  }

  /** Duplicates and rejects leave the list but stay in storage (folder ignored/). */
  async function hideSelected() {
    if (!selected.length || !confirm(`نخبّي ${selected.length} صورة من القائمة؟ (بتضل محفوظة بمجلد ignored بالستورج)`)) return;
    setBusy(true);
    setErr("");
    const done: string[] = [];
    for (const name of selected) {
      const { error } = await supabase.storage.from(BUCKET).copy(`unmatched/${name}`, `ignored/${name}`);
      if (error && !error.message.includes("already exists")) {
        setErr(`ما زبطت لـ ${name}: ${error.message}`);
        break;
      }
      await supabase.storage.from(BUCKET).remove([`unmatched/${name}`]);
      done.push(name);
    }
    setFiles((fs) => fs.filter((f) => !done.includes(f.name)));
    setSelected((s) => s.filter((n) => !done.includes(n)));
    if (done.length) setMsg(`انخبّت ${done.length} صورة.`);
    setBusy(false);
  }

  async function setRow(row: MediaRow, patch: { kind?: string; color_en?: string | null }) {
    if (!product) return;
    setBusy(true);
    setErr("");
    try {
      if (patch.kind) await demote(product.id, patch.kind);
      const update: Record<string, unknown> = { ...patch };
      // an extra outside the website window would be hidden: bring it in
      if (patch.kind === "other" && (row.sort < EXTRA_MIN || row.sort > EXTRA_MAX)) {
        update.sort = Math.max(EXTRA_MIN - 1, ...(mediaOf.get(product.id) ?? []).filter((m) => m.kind === "other" && m.sort <= EXTRA_MAX).map((m) => m.sort)) + 1;
      }
      const { error } = await supabase.from("media_assets").update(update).eq("id", row.id);
      if (error) throw new Error(error.message);
      await loadMedia();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ما زبطت");
    } finally {
      setBusy(false);
    }
  }

  async function removeRow(row: MediaRow) {
    if (!product || !confirm("نشيل هالصورة من المنتج؟ (الملف بيضل بالستورج)")) return;
    setBusy(true);
    setErr("");
    const { data: gone, error } = await supabase.from("media_assets").delete().eq("id", row.id).select("id");
    if (error) setErr(`ما انشالت الصورة: ${error.message}`);
    else if (!gone?.length) setErr(NOT_SAVED);
    await loadMedia();
    setBusy(false);
  }

  const chosenFiles = files.filter((f) => selected.includes(f.name));
  const productMedia = product ? mediaOf.get(product.id) ?? [] : [];
  const STATE_LABEL = { new: "قطعة بلا صور", dup: "القطعة إلها صور", none: "بلا اقتراح" } as const;

  const chip = (on: boolean) =>
    `shrink-0 border px-3 py-1.5 text-xs transition-colors ${on ? "border-foreground bg-foreground text-background" : "hover:bg-muted"}`;

  if (loading) return <p className="text-sm text-muted-foreground">عم نحمّل الصور والقطع…</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      {/* ================= photos, grouped by piece ================= */}
      <section className="min-w-0 space-y-3">
        <div className="flex items-center gap-2">
          <Icon name="photosMatch" size={18} className="text-muted-foreground" />
          <h2 className="font-medium">
            صور بلا منتج <span className="text-muted-foreground tabular-nums">({files.length} صورة · {groups.length} مجموعة)</span>
          </h2>
          <HintDot
            hint={{
              title: "كيف مجمّعة؟",
              what: "كل مجموعة = قطعة وحدة حسب أول جزء من اسم الملف (كود الموديل متل BW-SWT-094 أو اسم متل corduroy-shirt)، مع اقتراح القطعة الصح من الكتالوج.",
              source: "مجلد unmatched بالستورج (product-media). الاقتراح من أكواد الـ SKU وأسماء القطع.",
              edit: "«قطعة بلا صور» = الأهم تربطها. «القطعة إلها صور» = غالبًا نسخ قديمة مكرّرة — فيك تخبّيها.",
            }}
          />
        </div>

        <Input
          placeholder="فلترة: كود، لون أو اسم قطعة (بالإنجليزي)"
          aria-label="فلترة الصور"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          dir="ltr"
        />
        <div className="flex gap-2 overflow-x-auto pb-1">
          {(["all", "new", "none", "dup"] as const).map((k) => (
            <button key={k} type="button" className={chip(show === k)} onClick={() => setShow(k)}>
              {k === "all" ? "الكل" : STATE_LABEL[k]} <span className="tabular-nums opacity-70">{counts[k]}</span>
            </button>
          ))}
        </div>

        {!shownGroups.length ? (
          <p className="border p-6 text-center text-sm text-muted-foreground">
            {files.length ? "ما في مجموعات بهالفلتر." : "ما في صور غير مرتبطة — كل شي بمحلّو."}
          </p>
        ) : (
          <ul className="max-h-[75vh] space-y-2 overflow-y-auto pe-1">
            {shownGroups.map((g) => {
              const open = openGroup === g.code;
              const top = g.hits[0];
              return (
                <li key={g.code} className={`border ${open ? "border-foreground" : ""}`}>
                  <button
                    type="button"
                    onClick={() => (open ? setOpenGroup(null) : openGroupWith(g))}
                    className="flex w-full items-start gap-3 p-3 text-start hover:bg-muted/40"
                  >
                    <div className="flex shrink-0 gap-1">
                      {g.files.slice(0, 4).map((f) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={f.name} src={f.url} alt="" loading="lazy" className="h-14 w-10 bg-muted object-cover" />
                      ))}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="flex flex-wrap items-center gap-2 text-sm">
                        <span dir="ltr" className="font-medium">{g.code}</span>
                        <span className="text-xs text-muted-foreground tabular-nums">{g.files.length} صورة</span>
                        <Badge variant={g.state === "new" ? "success" : g.state === "dup" ? "secondary" : "outline"}>
                          {STATE_LABEL[g.state]}
                        </Badge>
                      </p>
                      {g.colours.length ? (
                        <p dir="ltr" className="truncate text-end text-xs text-muted-foreground">{g.colours.join(" · ")}</p>
                      ) : null}
                    </div>
                    <Icon name={open ? "back" : "next"} size={16} className="mt-1 shrink-0 text-muted-foreground" />
                  </button>

                  {/* suggested piece(s): one tap opens it with the whole group ticked */}
                  {g.hits.length ? (
                    <div className="space-y-1 border-t px-3 py-2">
                      {g.hits.map(({ p, sure }) => (
                        <div key={p.id} className="flex items-center gap-3">
                          <Thumb src={photoFor(photos, p.id)} size="md" />
                          <div className="min-w-0 flex-1">
                            <p dir="ltr" className="truncate text-end text-sm">{p.name_en}</p>
                            <p className="text-xs text-muted-foreground">
                              {sure ? "تطابق أكيد" : "اقتراح"} · {photoCount(p.id) ? `إلها ${photoCount(p.id)} صورة` : "بلا صور"}
                              {p.status !== "published" ? " · مسودة" : ""}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            variant={top?.p.id === p.id && g.state === "new" ? "default" : "outline"}
                            onClick={() => openGroupWith(g, p)}
                          >
                            افتحها
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {open && (
                    <div className="border-t p-2">
                      <div className="mb-2 flex items-center justify-between gap-2 px-1 text-xs text-muted-foreground">
                        <span>كبسة عالصورة بتعلّمها أو بتشيل العلامة</span>
                        <span className="flex gap-3">
                          <button type="button" className="underline" onClick={() => openGroupWith(g, product ?? undefined)}>
                            علّم الكل
                          </button>
                          <button type="button" className="underline" onClick={() => setSelected([])}>
                            ولا وحدة
                          </button>
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                        {g.files.map((f) => {
                          const on = selected.includes(f.name);
                          return (
                            <button
                              key={f.name}
                              type="button"
                              onClick={() => toggle(f.name)}
                              aria-pressed={on}
                              title={f.name}
                              className={`relative overflow-hidden border bg-muted ${on ? "ring-2 ring-foreground" : "opacity-60"}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={f.url} alt={f.name} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                              {on ? (
                                <span className="absolute end-1 top-1 grid h-5 w-5 place-items-center bg-foreground text-background">
                                  ✓
                                </span>
                              ) : null}
                              <span dir="ltr" className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[10px] text-white">
                                {[f.colour, f.view].filter(Boolean).join(" · ")}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* ================= the piece + linking ================= */}
      <section className="min-w-0 space-y-3 lg:sticky lg:top-4 lg:self-start">
        <div className="flex items-center gap-2">
          <Icon name="products" size={18} className="text-muted-foreground" />
          <h2 className="font-medium">القطعة</h2>
          <HintDot
            hint={{
              title: "الخانات والألوان",
              what: "واجهة = صورة الكرت، ضهر = القلبة، قريبة وجانب = غاليري صفحة القطعة، إضافية = صور زيادة (وبلون تاني بتطلع لما الزبون يختار هاللون).",
              source: "جدول media_assets — نفس الصور يلّي بيقراها الموقع.",
              edit: "الخانة واللون بيتعبّوا تلقائيًا من اسم الملف؛ فيك تغيّرهم قبل الربط أو بعدو. ربط على خانة محجوزة بينزّل القديمة «إضافية» — ما بينحذف شي.",
            }}
          />
        </div>

        {product ? (
          <div className="flex items-center gap-3 border p-3">
            <Thumb src={photoFor(photos, product.id)} size="lg" />
            <div className="min-w-0 flex-1">
              <p dir="ltr" className="truncate text-end font-medium">{product.name_en}</p>
              <p dir="ltr" className="truncate text-end text-xs text-muted-foreground">
                {[product.codes.join(", "), product.colours.join(" · ")].filter(Boolean).join(" — ")}
              </p>
              <p className="text-xs text-muted-foreground">
                {productMedia.length ? `إلها ${productMedia.length} صورة` : "بعدها بلا صور"}
                {product.status !== "published" ? " · مسودة" : ""}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setProduct(null)}>
              غيّر
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Input
              placeholder="دوّر: اسم (EN/AR)، كود موديل، أو لون"
              aria-label="دوّر عالقطعة"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button type="button" className={chip(!cat)} onClick={() => setCat("")}>
                كل الفئات
              </button>
              {topCats.list.map((c) => (
                <button key={c.id} type="button" className={chip(cat === c.id)} onClick={() => setCat(cat === c.id ? "" : c.id)}>
                  {c.name_ar || c.name_en}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 accent-foreground" checked={noPhotosOnly} onChange={(e) => setNoPhotosOnly(e.target.checked)} />
              بس القطع يلّي بلا صور
            </label>
            {!results.length ? (
              <p className="border p-4 text-center text-sm text-muted-foreground">ما في قطع بهالبحث.</p>
            ) : (
              <div className="grid max-h-[50vh] grid-cols-2 gap-2 overflow-y-auto border p-2 sm:grid-cols-3">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => pickProduct(p)}
                    className="flex flex-col gap-1 border p-1.5 text-start hover:border-foreground"
                  >
                    {photoFor(photos, p.id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoFor(photos, p.id)!} alt="" loading="lazy" className="aspect-[3/4] w-full bg-muted object-cover" />
                    ) : (
                      <span className="grid aspect-[3/4] w-full place-items-center bg-muted text-[11px] text-muted-foreground">بلا صورة</span>
                    )}
                    <span dir="ltr" className="line-clamp-2 text-end text-xs">{p.name_en}</span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {p.codes[0] ? <span dir="ltr">{p.codes[0]}</span> : null} · {photoCount(p.id)} صورة
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ---- link panel ---- */}
        {!product || !chosenFiles.length ? (
          <p className="text-sm text-muted-foreground">
            {!product && !chosenFiles.length
              ? "كبسة «افتحها» حد أي مجموعة بتفتح القطعة المقترحة وبتعلّم صورها — أو اختار مجموعة ودوّر عالقطعة هون."
              : !chosenFiles.length
                ? "هلّق علّم صور من المجموعات عاليمين (أو كبسة «افتحها»)."
                : "هلّق اختار القطعة يلّي بدّك تربط فيها الصور المعلّمة."}
          </p>
        ) : (
          <div className="space-y-2 border bg-muted/30 p-3">
            <p className="text-sm font-medium">ربط {chosenFiles.length} صورة</p>
            <ul className="max-h-[40vh] space-y-2 overflow-y-auto">
              {chosenFiles.map((f) => {
                const plan = plans[f.name] ?? { kind: "other", colour: "" };
                return (
                  <li key={f.name} className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={f.url} alt="" className="h-14 w-10 shrink-0 bg-muted object-cover" />
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      {KINDS.map((k) => (
                        <button
                          key={k.value}
                          type="button"
                          onClick={() => setPlan(f.name, { kind: k.value })}
                          className={`border px-2 py-0.5 text-[11px] ${plan.kind === k.value ? "bg-foreground text-background" : "hover:bg-muted"}`}
                        >
                          {k.label}
                        </button>
                      ))}
                      <select
                        aria-label="لون الصورة"
                        value={plan.colour}
                        onChange={(e) => setPlan(f.name, { colour: e.target.value })}
                        className="h-7 max-w-36 border bg-background px-1 text-[11px]"
                        dir="ltr"
                      >
                        <option value="">— colour —</option>
                        {product.colours.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => void linkSelected()} disabled={busy}>
                <Icon name="photosMatch" size={16} />
                {busy ? "عم نربط…" : `اربط ${chosenFiles.length} صورة`}
              </Button>
              <Button variant="outline" onClick={() => void hideSelected()} disabled={busy}>
                <Icon name="hidden" size={16} />
                خبّي المعلّمة (مكرّرة)
              </Button>
            </div>
          </div>
        )}
        {!product && chosenFiles.length ? (
          <Button variant="outline" size="sm" onClick={() => void hideSelected()} disabled={busy}>
            <Icon name="hidden" size={16} />
            خبّي {chosenFiles.length} صورة معلّمة (مكرّرة)
          </Button>
        ) : null}
        {msg && <p className="text-sm text-green-600 dark:text-green-400">{msg}</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}

        {/* ---- the piece's current photos ---- */}
        {product && productMedia.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">صورها الحالية ({productMedia.length})</p>
            <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto border p-2 sm:grid-cols-4">
              {productMedia.map((m) => (
                <div key={m.id} className="space-y-1">
                  <div className="relative overflow-hidden border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.storage_path.replace(/-1600\.webp$/, "-400.webp")} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover" />
                    <Badge className="absolute start-1 top-1" variant={m.kind === "other" ? "secondary" : "default"}>
                      {KIND_LABEL[m.kind] ?? m.kind}
                    </Badge>
                    {m.kind === "other" && (m.sort < EXTRA_MIN || m.sort > EXTRA_MAX) ? (
                      <span className="absolute inset-x-0 bottom-0 bg-amber-500/90 px-1 text-[10px] text-black">مخفية عن الموقع</span>
                    ) : null}
                  </div>
                  <select
                    aria-label="لون الصورة"
                    value={m.color_en ?? ""}
                    disabled={busy}
                    onChange={(e) => void setRow(m, { color_en: e.target.value || null })}
                    className="h-7 w-full border bg-background px-1 text-[11px]"
                    dir="ltr"
                  >
                    <option value="">— colour —</option>
                    {[...new Set([...product.colours, ...(m.color_en ? [m.color_en] : [])])].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                  <div className="flex flex-wrap gap-1">
                    {KINDS.filter((k) => k.value !== m.kind).map((k) => (
                      <button
                        key={k.value}
                        type="button"
                        disabled={busy}
                        onClick={() => void setRow(m, { kind: k.value })}
                        className="border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                      >
                        {k.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void removeRow(m)}
                      className="border px-1.5 py-0.5 text-[11px] text-destructive"
                    >
                      شيل
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
