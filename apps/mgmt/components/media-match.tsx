"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Icon } from "@bach/ui/components/icon";
import { loadFrontPhotos, photoFor, type PhotoMap } from "@bach/ui/lib/photos";
import { fetchAllPages } from "../lib/fetch-all";

const BUCKET = "product-media";
/** colour choice meaning "these photos show a colour this piece doesn't come in: leave them" */
const SKIP = "__skip";
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

/** The product's colour that a file's colour (white-blue, dark-burgundy…) names, or "" when none does. */
function colourMatch(p: Product, fileColour: string): string {
  const f = fileColour.toLowerCase().replace(/-/g, " ").trim();
  if (!f) return "";
  const exact = p.colours.find((c) => c.toLowerCase() === f || c.toLowerCase().replace(/\//g, " ") === f);
  if (exact) return exact;
  return (
    p.colours.find((c) => {
      const cw = words(c);
      return cw.length > 0 && cw.every((w) => f.includes(w));
    }) ?? ""
  );
}

/** As colourMatch, but a one-colour piece takes its colour when the file doesn't name one it has. */
function colourFor(p: Product, fileColour: string): string {
  return colourMatch(p, fileColour) || (p.colours.length === 1 ? p.colours[0]! : "");
}

/** Products a group of photos probably belongs to: by model code first, then by name words. */
/**
 * Products a group of photos probably belongs to: by model code first, then by name
 * words — a piece that also comes in the photos' colour ranks above one that doesn't.
 */
function suggest(code: string, fileColours: string[], products: Product[]): Array<{ p: Product; sure: boolean }> {
  if (/^BW-[A-Z]+-\d+$/i.test(code)) {
    const hit = products.find((p) => p.codes.includes(code.toUpperCase()));
    if (hit) return [{ p: hit, sure: true }];
  }
  const want = words(code);
  if (!want.length) return [];
  return products
    .map((p) => {
      const have = new Set([...words(p.name_en), ...words(p.slug)]);
      const name = want.filter((w) => have.has(w)).length / want.length;
      const colour = fileColours.some((c) => colourMatch(p, c)) ? 1 : 0;
      return { p, name, colour };
    })
    .filter((x) => x.name >= 0.5)
    .sort((a, b) => b.name + b.colour * 0.3 - (a.name + a.colour * 0.3))
    .slice(0, 3)
    .map(({ p, name, colour }) => ({ p, sure: name === 1 && colour === 1 }));
}

interface Group {
  code: string;
  files: Pending[];
  hits: Array<{ p: Product; sure: boolean }>;
}


interface Category {
  id: string;
  name_ar: string | null;
  name_en: string;
  parent_id: string | null;
}

/**
 * مطابقة الصور، قطعة قطعة: عاليمين صور القطعة (كبيرة، بلا قصّ، وبتتكبّر بكبسة)،
 * عالشمال لايحة القطع مفتوحة دايمًا — الاقتراح فوق، وتحتو بحث وفئات و«بلا صور».
 * بتكبس عالقطعة الصح وبعدين «اربط»، أو «مكرّرة» إذا الصور موجودة أصلًا.
 * بعد كل جواب بتنتقل عالقطعة يلّي بعدها. يلّي إلها اقتراح لقطعة بلا صور بيطلعوا أول.
 */
export function MediaMatch() {
  const supabase = supabaseBrowser();
  const [files, setFiles] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [allMedia, setAllMedia] = useState<MediaRow[]>([]);
  const [photos, setPhotos] = useState<PhotoMap | null>(null);

  const [at, setAt] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [off, setOff] = useState<string[]>([]); // photos of this piece left out of the link
  const [view, setView] = useState(0); // the photo shown large
  const [zoom, setZoom] = useState(false);
  const [picked, setPicked] = useState<Product | null>(null);
  // the piece's colour for each colour named in the file names (white-melange → White), editable
  const [colourPick, setColourPick] = useState<Record<string, string>>({});
  const [query, setQuery] = useState("");
  const [cat, setCat] = useState("");
  const [noPhotos, setNoPhotos] = useState(true);
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

  useEffect(() => {
    void (async () => {
      const [{ data: prods }, { data: cats }, media] = await Promise.all([
        supabase
          .from("products")
          .select("id, name_en, name_ar, slug, status, category_id, product_variants(sku, color_en, is_active)")
          .neq("status", "archived")
          .order("name_en"),
        supabase.from("categories").select("id, name_ar, name_en, parent_id"),
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
      // anything already linked (an earlier clean-up that didn't go through) leaves the list
      const linked = new Set(media.filter((r) => r.storage_path.includes("/products/")).map((r) => r.storage_path.split("/").pop()));
      const stale = all.filter((f) => linked.has(f.name));
      if (stale.length) void supabase.storage.from(BUCKET).remove(stale.map((f) => `unmatched/${f.name}`));
      setFiles(all.filter((f) => !linked.has(f.name)));
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
  const countOf = (id: string) => mediaOf.get(id)?.length ?? 0;

  // one piece at a time: a likely match for a piece with no photos first, then unknown, then likely duplicates
  const queue = useMemo(() => {
    const byCode = new Map<string, Pending[]>();
    for (const f of files) (byCode.get(f.code) ?? byCode.set(f.code, []).get(f.code)!).push(f);
    const make = ([code, list]: [string, Pending[]]): Group => ({
      code,
      files: list,
      hits: suggest(code, [...new Set(list.map((f) => f.colour))], products),
    });
    const rank = (g: Group) => (!g.hits[0] ? 1 : countOf(g.hits[0].p.id) ? 2 : 0);
    const entries = [...byCode.entries()];
    return [
      ...entries
        .filter(([c]) => !skipped.includes(c))
        .map(make)
        .sort((a, b) => rank(a) - rank(b) || a.code.localeCompare(b.code)),
      ...skipped.flatMap((c) => (byCode.has(c) ? [make([c, byCode.get(c)!])] : [])),
    ];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, products, mediaOf, skipped]);

  const group = queue[Math.min(at, queue.length - 1)] ?? null;
  const target = picked ?? group?.hits[0]?.p ?? null;
  const linkFiles = group ? group.files.filter((f) => !off.includes(f.name)) : [];
  const hasPhotos = target ? countOf(target.id) > 0 : false;
  const fileColours = group ? [...new Set(group.files.map((f) => f.colour).filter(Boolean))] : [];
  const colourOff = Boolean(target && fileColours.length && !fileColours.some((c) => colourMatch(target, c)));
  const shown = group?.files[Math.min(view, (group?.files.length ?? 1) - 1)] ?? null;

  // categories that hold pieces, top level only (Knitwear, Jackets & Coats…)
  const parentOf = useMemo(() => new Map(categories.map((c) => [c.id, c.parent_id])), [categories]);
  const rootOf = (id: string | null) => {
    let cur = id;
    for (let i = 0; cur && parentOf.get(cur) && i < 5; i++) cur = parentOf.get(cur)!;
    return cur;
  };
  const roots = useMemo(() => {
    const ids = new Set(products.map((p) => rootOf(p.category_id)));
    return categories.filter((c) => ids.has(c.id)).sort((a, b) => a.name_en.localeCompare(b.name_en));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [categories, products, parentOf]);

  // the list: the suggestions first, then every piece that fits the search / category / filter
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const hitIds = new Set((group?.hits ?? []).map((h) => h.p.id));
    const rest = products
      .filter((p) => !hitIds.has(p.id))
      .filter((p) => !cat || rootOf(p.category_id) === cat)
      .filter((p) => !noPhotos || countOf(p.id) === 0)
      .filter(
        (p) =>
          !q ||
          p.name_en.toLowerCase().includes(q) ||
          (p.name_ar ?? "").includes(query.trim()) ||
          p.codes.some((c) => c.toLowerCase().includes(q)) ||
          p.colours.some((c) => c.toLowerCase().includes(q)),
      );
    // pieces in the photos' colour first
    rest.sort((a, b) => Number(fileColours.some((c) => colourMatch(b, c))) - Number(fileColours.some((c) => colourMatch(a, c))));
    return { hits: q || cat ? [] : group?.hits ?? [], rest: rest.slice(0, 60), total: rest.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products, query, cat, noPhotos, group, mediaOf, parentOf]);

  function reset() {
    setColourPick({});
    setOff([]);
    setPicked(null);
    setView(0);
    setZoom(false);
    setErr("");
  }
  function go(i: number) {
    setAt(Math.max(0, Math.min(i, queue.length - 1)));
    reset();
    setMsg("");
  }

  useEffect(() => {
    if (!zoom || !group) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setZoom(false);
      // RTL: the left arrow moves forward
      if (e.key === "ArrowLeft") setView((v) => Math.min(v + 1, group.files.length - 1));
      if (e.key === "ArrowRight") setView((v) => Math.max(v - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [zoom, group]);

  /** The piece's colour for a photo; unknown → the colour its photos already show, so it still appears. */
  function colourOf(p: Product, f: Pending) {
    if (colourPick[f.colour] != null) return colourPick[f.colour]!;
    const named = colourMatch(p, f.colour);
    if (named) return named;
    // the file names a colour the piece doesn't come in: left out unless chosen
    if (f.colour && p.colours.length > 1) return SKIP;
    const hero = (mediaOf.get(p.id) ?? []).find((m) => m.kind === "front")?.color_en ?? "";
    return colourFor(p, f.colour) || hero || p.colours[0] || "";
  }
  // what «اربط» links: the kept photos, minus a colour the piece doesn't have
  const toLink = target ? linkFiles.filter((f) => colourOf(target, f) !== SKIP) : [];

  async function link() {
    if (!target || !group || !toLink.length) return;
    setBusy(true);
    setErr("");
    const done: string[] = [];
    try {
      const current = mediaOf.get(target.id) ?? [];
      const empty = current.length === 0;
      const taken = new Set<string>();
      const firstColour = colourOf(target, toLink[0]!);
      let extraSort = Math.max(EXTRA_MIN - 1, ...current.filter((m) => m.kind === "other").map((m) => m.sort)) + 1;
      let slotSort = 0;
      for (const f of toLink) {
        const colour = colourOf(target, f);
        // a piece without photos gets its first front / back shot in those slots; the rest are extras
        const slot = f.view === "front" ? "front" : f.view === "back" ? "back" : null;
        const kind = empty && slot && !taken.has(slot) && colour === firstColour ? slot : "other";
        if (kind !== "other") taken.add(kind);
        const from = `unmatched/${f.name}`;
        const to = `products/${f.name}`;
        const { error: cpErr } = await supabase.storage.from(BUCKET).copy(from, to);
        if (cpErr && !cpErr.message.includes("already exists")) throw new Error(cpErr.message);
        const { error: insErr } = await supabase.from("media_assets").insert({
          product_id: target.id,
          kind,
          storage_path: pub(to),
          sort: kind === "other" ? Math.min(extraSort++, EXTRA_MAX) : slotSort++,
          color_en: colour || null,
        });
        if (insErr) throw new Error(insErr.message);
        await supabase.storage.from(BUCKET).remove([from]);
        done.push(f.name);
      }
      setMsg(`انربطت ${done.length} صورة بـ ${target.name_en}.`);
    } catch (e) {
      setErr(`${done.length ? `انربطت ${done.length} وبعدين وقفنا: ` : ""}${e instanceof Error ? e.message : "صار خطأ — جرّب مرة تانية"}`);
    } finally {
      await loadMedia();
      setFiles((fs) => fs.filter((f) => !done.includes(f.name)));
      reset();
      setBusy(false);
    }
  }

  /** Duplicates leave the list but stay in storage (folder ignored/). */
  async function hide() {
    if (!group) return;
    setBusy(true);
    setErr("");
    const done: string[] = [];
    for (const f of group.files) {
      const { error } = await supabase.storage.from(BUCKET).copy(`unmatched/${f.name}`, `ignored/${f.name}`);
      if (error && !error.message.includes("already exists")) {
        setErr(`ما زبطت: ${error.message}`);
        break;
      }
      await supabase.storage.from(BUCKET).remove([`unmatched/${f.name}`]);
      done.push(f.name);
    }
    setFiles((fs) => fs.filter((f) => !done.includes(f.name)));
    if (done.length) setMsg(`انخبّت ${done.length} صورة (محفوظة بمجلد ignored).`);
    reset();
    setBusy(false);
  }

  function skip() {
    if (!group) return;
    setSkipped((s) => [...s.filter((c) => c !== group.code), group.code]);
    reset();
    setMsg("");
  }

  if (loading) return <p className="text-sm text-muted-foreground">عم نحمّل الصور…</p>;
  if (!group || !shown)
    return <p className="border p-10 text-center text-sm text-muted-foreground">خلصنا — ما في صور ناطرة تنربط.</p>;

  const chip = (on: boolean) =>
    `shrink-0 border px-3 py-1.5 text-xs transition-colors ${on ? "border-foreground bg-foreground text-background" : "hover:bg-muted"}`;

  const card = (p: Product, note?: string) => {
    const on = target?.id === p.id;
    const img = photoFor(photos, p.id);
    const match = fileColours.some((c) => colourMatch(p, c));
    return (
      <button
        key={p.id}
        type="button"
        onClick={() => {
          setPicked(p);
          setColourPick({});
        }}
        aria-pressed={on}
        className={`flex w-full items-center gap-3 border p-2 text-start transition-colors ${
          on ? "border-foreground bg-muted/60 ring-1 ring-foreground" : "hover:border-foreground"
        }`}
      >
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={img} alt="" loading="lazy" className="h-20 w-14 shrink-0 bg-muted object-cover" />
        ) : (
          <span className="grid h-20 w-14 shrink-0 place-items-center bg-muted text-[10px] text-muted-foreground">بلا صورة</span>
        )}
        <span className="min-w-0 flex-1 space-y-0.5">
          <span dir="ltr" className="block truncate text-end text-sm">{p.name_en}</span>
          <span dir="ltr" className={`block truncate text-end text-xs ${match ? "text-foreground" : "text-muted-foreground"}`}>
            {p.colours.join(", ") || "—"}
          </span>
          <span className="block text-xs text-muted-foreground">
            {note ? `${note} · ` : ""}
            {countOf(p.id) ? `إلها ${countOf(p.id)} صورة` : "بلا صور"}
          </span>
        </span>
        {on ? <span className="shrink-0 bg-foreground px-2 py-1 text-xs text-background">✓ مختارة</span> : null}
      </button>
    );
  };

  return (
    <div className="space-y-4">
      {/* progress */}
      <div className="flex items-center justify-between gap-3 border-b pb-3 text-sm">
        <Button variant="ghost" size="sm" onClick={() => go(at - 1)} disabled={at === 0 || busy}>
          <Icon name="back" size={16} /> السابقة
        </Button>
        <span className="tabular-nums text-muted-foreground">
          قطعة {Math.min(at, queue.length - 1) + 1} من {queue.length} · {files.length} صورة ناطرة
        </span>
        <Button variant="ghost" size="sm" onClick={() => go(at + 1)} disabled={at >= queue.length - 1 || busy}>
          التالية <Icon name="next" size={16} />
        </Button>
      </div>

      {msg && <p className="border border-green-600/30 bg-green-600/5 p-3 text-sm text-green-700 dark:text-green-400">{msg}</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        {/* ============ the photos: large, uncropped, zoomable ============ */}
        <section className="space-y-3 lg:sticky lg:top-4 lg:self-start">
          <button
            type="button"
            onClick={() => setZoom(true)}
            className="block w-full cursor-zoom-in bg-muted"
            aria-label="كبّر الصورة"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={shown.url} alt={shown.name} className="mx-auto h-[60vh] max-h-[640px] w-full object-contain" />
          </button>
          <p className="text-xs text-muted-foreground">كبسة عالصورة بتكبّرها عالشاشة كلها.</p>
          {group.files.length > 1 ? (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {group.files.map((f, i) => {
                const on = !off.includes(f.name);
                return (
                  <div key={f.name} className="shrink-0 space-y-1">
                    <button
                      type="button"
                      onClick={() => setView(i)}
                      className={`block border-2 ${i === view ? "border-foreground" : "border-transparent"} ${on ? "" : "opacity-30"}`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.url} alt="" loading="lazy" className="h-20 w-14 bg-muted object-contain" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setOff((o) => (on ? [...o, f.name] : o.filter((n) => n !== f.name)))}
                      className="block w-14 text-center text-[10px] text-muted-foreground underline"
                    >
                      {on ? "مش معهم" : "رجّعها"}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : null}
          <p className="text-sm text-muted-foreground">
            اسم الملف: <span dir="ltr" className="text-foreground">{group.code.replace(/-/g, " ")}</span>
            {fileColours.length ? (
              <>
                {" · "}اللون: <span dir="ltr" className="text-foreground">{fileColours.map((c) => c.replace(/-/g, " ")).join(", ")}</span>
              </>
            ) : null}
          </p>
        </section>

        {/* ============ which piece: always open ============ */}
        <section className="min-w-0 space-y-3">
          <h2 className="font-medium">لأي قطعة؟ كبسة عالقطعة الصح</h2>

          <Input placeholder="دوّر: اسم القطعة، الكود أو اللون…" aria-label="دوّر عالقطعة" value={query} onChange={(e) => setQuery(e.target.value)} />
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button type="button" className={chip(!cat)} onClick={() => setCat("")}>
              كل الفئات
            </button>
            {roots.map((c) => (
              <button key={c.id} type="button" className={chip(cat === c.id)} onClick={() => setCat(cat === c.id ? "" : c.id)}>
                {c.name_ar || c.name_en}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" className="h-4 w-4 accent-foreground" checked={noPhotos} onChange={(e) => setNoPhotos(e.target.checked)} />
            بس القطع يلّي بعدها بلا صور
          </label>

          <div className="max-h-[52vh] space-y-2 overflow-y-auto border p-2">
            {list.hits.length ? (
              <>
                <p className="px-1 text-xs text-muted-foreground">مقترحة من اسم الملف</p>
                {list.hits.map((h) => card(h.p, /^BW-/i.test(group.code) ? "نفس الكود" : "اقتراح"))}
                <p className="px-1 pt-2 text-xs text-muted-foreground">أو قطعة تانية</p>
              </>
            ) : null}
            {picked && !list.hits.some((h) => h.p.id === picked.id) && !list.rest.some((p) => p.id === picked.id) ? card(picked) : null}
            {list.rest.length ? (
              list.rest.map((p) => card(p))
            ) : (
              <p className="p-4 text-center text-sm text-muted-foreground">ما في قطع بهالبحث{noPhotos ? " — جرّب تشيل «بس القطع يلّي بلا صور»" : ""}.</p>
            )}
            {list.total > list.rest.length ? (
              <p className="p-2 text-center text-xs text-muted-foreground">في {list.total - list.rest.length} قطعة كمان — اكتب بالبحث لتلاقيها.</p>
            ) : null}
          </div>

          {/* the one decision */}
          <div className="space-y-2 border-t pt-3">
            {target ? (
              <p className="text-sm">
                المختارة: <span dir="ltr" className="font-medium">{target.name_en}</span>
                {hasPhotos ? ` — إلها ${countOf(target.id)} صورة عالموقع` : " — بعدها بلا صور"}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">اختار القطعة من اللايحة.</p>
            )}
            {target ? (
              <div className="space-y-1.5 border p-2">
                <p className="text-sm">لون الصور عالموقع:</p>
                {(fileColours.length ? fileColours : [""]).map((fc) => {
                  const files = group.files.filter((f) => f.colour === fc && !off.includes(f.name));
                  if (!files.length) return null;
                  const value = colourOf(target, files[0]!);
                  return (
                    <label key={fc || "none"} className="flex flex-wrap items-center gap-2 text-sm">
                      {fileColours.length > 1 || fc ? (
                        <span className="text-muted-foreground">
                          {files.length} صورة <span dir="ltr">({fc.replace(/-/g, " ") || "بلا لون"})</span> ←
                        </span>
                      ) : null}
                      <select
                        value={value}
                        onChange={(e) => setColourPick((cp) => ({ ...cp, [fc]: e.target.value }))}
                        className="h-9 min-w-36 border bg-background px-2 text-sm"
                        dir="ltr"
                      >
                        {target.colours.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                        <option value={SKIP}>— ما تربطهم —</option>
                        {value && value !== SKIP && !target.colours.includes(value) ? <option value={value}>{value}</option> : null}
                      </select>
                      {value === SKIP ? (
                        <span className="text-xs text-amber-700 dark:text-amber-400">هاللون مش من ألوان القطعة — رح يضلّوا ناطرين</span>
                      ) : null}
                    </label>
                  );
                })}
                <p className="text-xs text-muted-foreground">
                  الموقع بيوري هالصور لمّا الزبون يختار هاللون. تعبّى تلقائيًا من اسم الملف — غيّرو إذا مش مزبوط.
                  الصور يلّي ما بتنربط (بـ«شيلها» أو «ما تربطهم») بتضل بالصور الناطرة وبترجع تطلع لحالها.
                </p>
              </div>
            ) : null}
            {colourOff ? (
              <p className="border border-amber-500/40 bg-amber-500/10 p-2 text-sm">
                لون الصور مش من ألوان هالقطعة — تأكّد إنها هي قبل ما تربط.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button size="lg" onClick={() => void link()} disabled={busy || !target || !toLink.length}>
                {busy ? "عم نربط…" : `اربط ${toLink.length} صورة${target ? " بهالقطعة" : ""}`}
              </Button>
              <Button size="lg" variant="outline" onClick={() => void hide()} disabled={busy}>
                مكرّرة / مش لازمة — خبّيها
              </Button>
              <Button size="lg" variant="ghost" onClick={skip} disabled={busy}>
                بعدين
              </Button>
            </div>
          </div>
        </section>
      </div>

      {/* full-screen photo */}
      {zoom && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setZoom(false)} role="dialog" aria-label="الصورة كبيرة">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={shown.url} alt={shown.name} className="max-h-[94vh] max-w-[94vw] object-contain" />
          <button type="button" className="absolute end-4 top-4 bg-white px-3 py-1.5 text-sm text-black" onClick={() => setZoom(false)}>
            سكّر ✕
          </button>
          {group.files.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="الصورة السابقة"
                className="absolute start-4 top-1/2 -translate-y-1/2 bg-white/90 px-3 py-6 text-black disabled:opacity-30"
                disabled={view === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  setView((v) => Math.max(v - 1, 0));
                }}
              >
                <Icon name="back" size={20} />
              </button>
              <button
                type="button"
                aria-label="الصورة التالية"
                className="absolute end-4 top-1/2 -translate-y-1/2 bg-white/90 px-3 py-6 text-black disabled:opacity-30"
                disabled={view >= group.files.length - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  setView((v) => Math.min(v + 1, group.files.length - 1));
                }}
              >
                <Icon name="next" size={20} />
              </button>
              <span className="absolute bottom-4 start-1/2 -translate-x-1/2 bg-white/90 px-3 py-1 text-sm tabular-nums text-black">
                {view + 1} / {group.files.length}
              </span>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
}
