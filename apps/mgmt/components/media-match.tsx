"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { Icon } from "@bach/ui/components/icon";
import { loadFrontPhotos, photoFor, type PhotoMap } from "@bach/ui/lib/photos";
import { fetchAllPages } from "../lib/fetch-all";

const BUCKET = "product-media";
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

interface Group {
  code: string;
  files: Pending[];
  hits: Array<{ p: Product; sure: boolean }>;
}

/**
 * مطابقة الصور، قطعة قطعة: بتطلع صور قطعة وحدة (مجمّعة من اسم الملف) وحدّها القطعة
 * المقترحة من الكتالوج، وسؤال واحد: «هيدي هي؟». إيه = بتنربط كلها (الخانة واللون
 * تلقائيًا من اسم الملف)، لا = دوّر على قطعة تانية، مكرّرة = بتنخبّى (بتضل بالستورج).
 * بعد كل جواب بتنتقل عالقطعة يلّي بعدها. يلّي بلا صور بالكتالوج بيطلعوا أول.
 */
export function MediaMatch() {
  const supabase = supabaseBrowser();
  const [files, setFiles] = useState<Pending[]>([]);
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<Product[]>([]);
  const [allMedia, setAllMedia] = useState<MediaRow[]>([]);
  const [photos, setPhotos] = useState<PhotoMap | null>(null);

  const [at, setAt] = useState(0);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [off, setOff] = useState<string[]>([]); // photos of this piece left out of the link
  const [chosen, setChosen] = useState<Product | null>(null); // "another piece" pick
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
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
      const [{ data: prods }, media] = await Promise.all([
        supabase
          .from("products")
          .select("id, name_en, name_ar, slug, status, category_id, product_variants(sku, color_en, is_active)")
          .neq("status", "archived")
          .order("name_en"),
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

  // one piece at a time: pieces with no photos on the site first, then unknown, then likely duplicates
  const queue = useMemo(() => {
    const byCode = new Map<string, Pending[]>();
    for (const f of files) (byCode.get(f.code) ?? byCode.set(f.code, []).get(f.code)!).push(f);
    const rank = (g: Group) => (!g.hits[0] ? 1 : countOf(g.hits[0].p.id) ? 2 : 0);
    return [...byCode.entries()]
      .map(([code, list]): Group => ({ code, files: list, hits: suggest(code, products) }))
      .filter((g) => !skipped.includes(g.code))
      .sort((a, b) => rank(a) - rank(b) || a.code.localeCompare(b.code))
      .concat(
        [...byCode.entries()]
          .filter(([code]) => skipped.includes(code))
          .map(([code, list]) => ({ code, files: list, hits: suggest(code, products) })),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [files, products, mediaOf, skipped]);

  const group = queue[Math.min(at, queue.length - 1)] ?? null;
  const target = chosen ?? group?.hits[0]?.p ?? null;
  const linkFiles = group ? group.files.filter((f) => !off.includes(f.name)) : [];
  const hasPhotos = target ? countOf(target.id) > 0 : false;

  function reset() {
    setOff([]);
    setChosen(null);
    setSearching(false);
    setQuery("");
    setErr("");
  }
  function go(i: number) {
    setAt(Math.max(0, Math.min(i, queue.length - 1)));
    reset();
    setMsg("");
  }

  /** The piece's colour for a photo; unknown → the colour its photos already show, so it still appears. */
  function colourOf(p: Product, f: Pending) {
    const hero = (mediaOf.get(p.id) ?? []).find((m) => m.kind === "front")?.color_en ?? "";
    return colourFor(p, f.colour) || hero || p.colours[0] || "";
  }

  async function link() {
    if (!target || !group || !linkFiles.length) return;
    setBusy(true);
    setErr("");
    const done: string[] = [];
    try {
      const current = mediaOf.get(target.id) ?? [];
      const empty = current.length === 0;
      const taken = new Set<string>();
      const firstColour = colourOf(target, linkFiles[0]!);
      let extraSort = Math.max(EXTRA_MIN - 1, ...current.filter((m) => m.kind === "other").map((m) => m.sort)) + 1;
      let slotSort = 0;
      for (const f of linkFiles) {
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

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    return products
      .filter(
        (p) =>
          p.name_en.toLowerCase().includes(q) ||
          (p.name_ar ?? "").includes(query.trim()) ||
          p.codes.some((c) => c.toLowerCase().includes(q)),
      )
      .slice(0, 12);
  }, [products, query]);

  if (loading) return <p className="text-sm text-muted-foreground">عم نحمّل الصور…</p>;
  if (!group)
    return <p className="border p-10 text-center text-sm text-muted-foreground">خلصنا — ما في صور ناطرة تنربط.</p>;

  const big = "h-44 w-32 shrink-0 bg-muted object-cover sm:h-52 sm:w-36";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* progress */}
      <div className="flex items-center justify-between gap-3 text-sm">
        <Button variant="ghost" size="sm" onClick={() => go(at - 1)} disabled={at === 0 || busy}>
          <Icon name="next" size={16} /> السابقة
        </Button>
        <span className="tabular-nums text-muted-foreground">
          قطعة {Math.min(at, queue.length - 1) + 1} من {queue.length} · {files.length} صورة ناطرة
        </span>
        <Button variant="ghost" size="sm" onClick={() => go(at + 1)} disabled={at >= queue.length - 1 || busy}>
          التالية <Icon name="back" size={16} />
        </Button>
      </div>

      {msg && <p className="border border-green-600/30 bg-green-600/5 p-3 text-sm text-green-700 dark:text-green-400">{msg}</p>}
      {err && <p className="text-sm text-destructive">{err}</p>}

      {/* 1 — the photos */}
      <section className="space-y-2">
        <h2 className="font-medium">
          ١. هيدي الصور <span className="text-sm font-normal text-muted-foreground">({group.files.length})</span>
        </h2>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {group.files.map((f) => {
            const on = !off.includes(f.name);
            return (
              <button
                key={f.name}
                type="button"
                onClick={() => setOff((o) => (on ? [...o, f.name] : o.filter((n) => n !== f.name)))}
                aria-pressed={on}
                title={f.name}
                className={`relative shrink-0 ${on ? "" : "opacity-30"}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.name} loading="lazy" className={big} />
                {!on ? <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 bg-background/90 py-1 text-center text-xs">مش معهم</span> : null}
              </button>
            );
          })}
        </div>
        {group.files.length > 1 ? (
          <p className="text-xs text-muted-foreground">صورة مش من نفس القطعة؟ كبسة عليها بتطلّعها من الربط.</p>
        ) : null}
      </section>

      {/* 2 — the piece */}
      <section className="space-y-3">
        <h2 className="font-medium">٢. لأي قطعة؟</h2>

        {target && !searching ? (
          <div className="flex gap-4 border p-3">
            {photoFor(photos, target.id) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoFor(photos, target.id)!} alt="" className={big} />
            ) : (
              <span className={`${big} grid place-items-center text-xs text-muted-foreground`}>بلا صورة</span>
            )}
            <div className="min-w-0 flex-1 space-y-2">
              <p dir="ltr" className="text-end text-lg">{target.name_en}</p>
              <p className="text-sm text-muted-foreground">
                {chosen ? "انت اخترتها" : group.hits[0]?.sure ? "نفس كود الموديل — تطابق أكيد" : "اقتراح من الاسم"}
              </p>
              {hasPhotos ? (
                <div className="space-y-1">
                  <p className="text-sm">عندها {countOf(target.id)} صورة عالموقع — قارن:</p>
                  <div className="flex gap-1 overflow-x-auto">
                    {(mediaOf.get(target.id) ?? []).slice(0, 8).map((m) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={m.id} src={m.storage_path.replace(/-1600\.webp$/, "-400.webp")} alt="" loading="lazy" className="h-16 w-12 shrink-0 bg-muted object-cover" />
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-green-700 dark:text-green-400">بعدها بلا صور — هالصور رح تصير صورها.</p>
              )}
            </div>
          </div>
        ) : !searching ? (
          <p className="border p-4 text-sm text-muted-foreground">ما لقينا قطعة بتشبه اسم الملف — دوّر عليها.</p>
        ) : null}

        {/* 3 — one clear choice */}
        {target && !searching ? (
          <div className="flex flex-wrap gap-2">
            {hasPhotos ? (
              <>
                <Button size="lg" onClick={() => void hide()} disabled={busy}>
                  مكرّرة — خبّيهم
                </Button>
                <Button size="lg" variant="outline" onClick={() => void link()} disabled={busy || !linkFiles.length}>
                  زيدهم عليها كصور جديدة
                </Button>
              </>
            ) : (
              <Button size="lg" onClick={() => void link()} disabled={busy || !linkFiles.length}>
                {busy ? "عم نربط…" : `إيه، هيدي هي — اربط ${linkFiles.length} صورة`}
              </Button>
            )}
            <Button size="lg" variant="outline" onClick={() => setSearching(true)} disabled={busy}>
              لا، قطعة تانية
            </Button>
            <Button size="lg" variant="ghost" onClick={skip} disabled={busy}>
              بعدين
            </Button>
          </div>
        ) : null}

        {(searching || !target) && (
          <div className="space-y-2 border p-3">
            <Input
              autoFocus
              placeholder="اكتب اسم القطعة أو الكود…"
              aria-label="دوّر عالقطعة"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {results.length ? (
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                {results.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setChosen(p);
                      setSearching(false);
                    }}
                    className="space-y-1 border p-1 text-start hover:border-foreground"
                  >
                    {photoFor(photos, p.id) ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={photoFor(photos, p.id)!} alt="" loading="lazy" className="aspect-[3/4] w-full bg-muted object-cover" />
                    ) : (
                      <span className="grid aspect-[3/4] w-full place-items-center bg-muted text-[11px] text-muted-foreground">بلا صورة</span>
                    )}
                    <span dir="ltr" className="line-clamp-2 block text-end text-xs">{p.name_en}</span>
                  </button>
                ))}
              </div>
            ) : query.trim().length >= 2 ? (
              <p className="text-sm text-muted-foreground">ما في قطعة بهالاسم.</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {target ? (
                <Button variant="ghost" onClick={() => setSearching(false)}>
                  رجوع
                </Button>
              ) : null}
              <Button variant="ghost" onClick={skip} disabled={busy}>
                بعدين
              </Button>
              <Button variant="ghost" onClick={() => void hide()} disabled={busy}>
                خبّيهم (مش لازمين)
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
