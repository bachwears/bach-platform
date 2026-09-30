"use client";

import { useEffect, useMemo, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { HintDot } from "@bach/ui/components/hint-dot";

const BUCKET = "product-media";
const KINDS: Array<{ value: string; label: string }> = [
  { value: "front", label: "واجهة" },
  { value: "back", label: "ضهر" },
  { value: "closeup", label: "قريبة" },
  { value: "side", label: "جانب/موديل" },
  { value: "other", label: "إضافية" },
];
const KIND_LABEL = Object.fromEntries(KINDS.map((k) => [k.value, k.label]));

interface UnmatchedFile {
  name: string;
  url: string;
}
interface ProductHit {
  id: string;
  name_en: string;
  status: string;
}
interface MediaRow {
  id: string;
  kind: string;
  storage_path: string;
  sort: number;
}

/**
 * مطابقة الصور: الصور غير المرتبطة (storage: unmatched/) تنسحب يدويًا
 * على المنتج الصح مع اختيار نوع اللقطة. الخانات الفريدة (واجهة/ضهر/قريبة/جانب)
 * بتتبدل تلقائيًا — القديمة بتنزل "إضافية" بدل ما تنحذف.
 */
export function MediaMatch() {
  const supabase = supabaseBrowser();
  const [files, setFiles] = useState<UnmatchedFile[]>([]);
  const [filesLoading, setFilesLoading] = useState(true);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<ProductHit[]>([]);
  const [product, setProduct] = useState<ProductHit | null>(null);
  const [media, setMedia] = useState<MediaRow[]>([]);
  const [kind, setKind] = useState("front");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const pub = (path: string) => supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;

  async function loadFiles() {
    setFilesLoading(true);
    const all: UnmatchedFile[] = [];
    for (let offset = 0; ; offset += 100) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list("unmatched", { limit: 100, offset, sortBy: { column: "name", order: "asc" } });
      if (error) {
        setErr(error.message);
        break;
      }
      for (const f of data ?? []) {
        if (f.name.endsWith(".webp")) all.push({ name: f.name, url: pub(`unmatched/${f.name}`) });
      }
      if (!data || data.length < 100) break;
    }
    setFiles(all);
    setFilesLoading(false);
  }
  useEffect(() => {
    void loadFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // product search (debounced)
  useEffect(() => {
    const t = setTimeout(async () => {
      const term = query.trim();
      if (term.length < 2) {
        setHits([]);
        return;
      }
      const { data } = await supabase
        .from("products")
        .select("id, name_en, status")
        .ilike("name_en", `%${term}%`)
        .order("name_en")
        .limit(12);
      setHits((data ?? []) as ProductHit[]);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query]);

  async function openProduct(p: ProductHit) {
    setProduct(p);
    setHits([]);
    setQuery(p.name_en);
    const { data } = await supabase
      .from("media_assets")
      .select("id, kind, storage_path, sort")
      .eq("product_id", p.id)
      .order("sort");
    setMedia((data ?? []) as MediaRow[]);
  }

  async function demoteSlot(productId: string, slot: string) {
    // unique slots: the occupant moves to "other" instead of being lost
    if (slot === "other") return;
    const occupied = media.find((m) => m.kind === slot);
    if (occupied) {
      const { error } = await supabase.from("media_assets").update({ kind: "other" }).eq("id", occupied.id);
      if (error) throw new Error(error.message);
    }
  }

  async function assign() {
    if (!selected || !product) return;
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      await demoteSlot(product.id, kind);
      const from = `unmatched/${selected}`;
      const to = `products/${selected}`;
      const { error: cpErr } = await supabase.storage.from(BUCKET).copy(from, to);
      if (cpErr && !cpErr.message.includes("already exists")) throw new Error(cpErr.message);
      const sort = media.length ? Math.max(...media.map((m) => m.sort)) + 1 : 0;
      const { error: insErr } = await supabase.from("media_assets").insert({
        product_id: product.id,
        kind,
        storage_path: pub(to),
        sort,
      });
      if (insErr) throw new Error(insErr.message);
      await supabase.storage.from(BUCKET).remove([from]);
      setFiles((fs) => fs.filter((f) => f.name !== selected));
      setSelected(null);
      setMsg(`انربطت بـ ${product.name_en} (${KIND_LABEL[kind]})`);
      await openProduct(product);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "صار خطأ — جرّب مرة تانية");
    } finally {
      setBusy(false);
    }
  }

  async function setRowKind(row: MediaRow, next: string) {
    if (!product || row.kind === next) return;
    setBusy(true);
    setErr("");
    try {
      await demoteSlot(product.id, next);
      const { error } = await supabase.from("media_assets").update({ kind: next }).eq("id", row.id);
      if (error) throw new Error(error.message);
      await openProduct(product);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "ما زبطت");
    } finally {
      setBusy(false);
    }
  }

  async function removeRow(row: MediaRow) {
    if (!product) return;
    if (!confirm("نحذف هالصورة من المنتج؟ (الملف بيضل بالستورج)")) return;
    setBusy(true);
    try {
      await supabase.from("media_assets").delete().eq("id", row.id);
      await openProduct(product);
    } finally {
      setBusy(false);
    }
  }

  const visible = useMemo(() => {
    const f = filter.trim().toLowerCase();
    return f ? files.filter((x) => x.name.toLowerCase().includes(f)) : files;
  }, [files, filter]);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* ---- unmatched photos ---- */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">صور بلا منتج ({files.length})</h2>
          <HintDot
            hint={{
              title: "من وين هالصور؟",
              what: "صور من دفعات التصوير ما انطابقت تلقائيًا مع الكتالوج.",
              source: "مجلد unmatched في الستورج (product-media).",
              edit: "اختار صورة، دوّر عالمنتج، حدد نوع اللقطة واكبس «اربط».",
            }}
          />
        </div>
        <Input placeholder="فلترة بالاسم (نوع القطعة أو اللون بالإنجليزي)" value={filter} onChange={(e) => setFilter(e.target.value)} dir="ltr" />
        {filesLoading ? (
          <p className="text-sm text-muted-foreground">عم نحمّل الصور…</p>
        ) : !visible.length ? (
          <p className="rounded-md border p-6 text-center text-sm text-muted-foreground">
            ما في صور غير مرتبطة — كل شي بمحله.
          </p>
        ) : (
          <div className="grid max-h-[70vh] grid-cols-3 gap-2 overflow-y-auto rounded-md border p-2 sm:grid-cols-4">
            {visible.map((f) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setSelected(selected === f.name ? null : f.name)}
                className={`group relative overflow-hidden rounded-md border bg-muted transition-shadow ${
                  selected === f.name ? "ring-2 ring-foreground" : "hover:shadow"
                }`}
                title={f.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={f.url} alt={f.name} loading="lazy" className="aspect-[3/4] w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1.5 py-0.5 text-[10px] text-white" dir="ltr">
                  {f.name.replace(".webp", "")}
                </span>
              </button>
            ))}
          </div>
        )}
      </section>

      {/* ---- product + assignment ---- */}
      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="font-semibold">المنتج</h2>
          <HintDot
            hint={{
              title: "كيف بتشتغل الخانات؟",
              what: "كل منتج إله خانة وحدة لكل نوع: واجهة (كرت المنتج)، ضهر (القلبة عالـ hover)، قريبة وجانب (غاليري صفحة المنتج).",
              source: "جدول media_assets — نفس الصور اللي بيقراها الموقع مباشرة.",
              edit: "ربط صورة على خانة مشغولة بينزّل القديمة تلقائيًا على «إضافية» — ما بينحذف شي.",
            }}
          />
        </div>
        <div className="relative">
          <Input
            placeholder="دوّر عالمنتج بالاسم الإنجليزي…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setProduct(null);
            }}
            dir="ltr"
          />
          {hits.length > 0 && (
            <div className="absolute inset-x-0 top-full z-10 mt-1 overflow-hidden rounded-md border bg-popover shadow-lg">
              {hits.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => void openProduct(h)}
                  className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted"
                >
                  <span dir="ltr">{h.name_en}</span>
                  <Badge variant={h.status === "published" ? "success" : "secondary"}>
                    {h.status === "published" ? "منشور" : "مسودة"}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </div>

        {selected && product && (
          <div className="flex flex-wrap items-center gap-2 rounded-md border bg-muted/40 p-3">
            <span className="text-sm">اربط الصورة المختارة كـ</span>
            {KINDS.map((k) => (
              <button
                key={k.value}
                type="button"
                onClick={() => setKind(k.value)}
                className={`rounded-full border px-3 py-1 text-sm transition-colors ${
                  kind === k.value ? "bg-foreground text-background" : "hover:bg-muted"
                }`}
              >
                {k.label}
              </button>
            ))}
            <Button onClick={() => void assign()} disabled={busy}>
              {busy ? "عم نربط…" : "اربط"}
            </Button>
          </div>
        )}
        {msg && <p className="text-sm text-green-600 dark:text-green-400">{msg}</p>}
        {err && <p className="text-sm text-destructive">{err}</p>}

        {product && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              صور <span dir="ltr">{product.name_en}</span> الحالية ({media.length})
            </p>
            {!media.length ? (
              <p className="rounded-md border p-4 text-center text-sm text-muted-foreground">بعده بلا صور.</p>
            ) : (
              <div className="grid max-h-[50vh] grid-cols-3 gap-2 overflow-y-auto rounded-md border p-2 sm:grid-cols-4">
                {media.map((m) => (
                  <div key={m.id} className="space-y-1">
                    <div className="relative overflow-hidden rounded-md border bg-muted">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={m.storage_path} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover" />
                      <Badge className="absolute start-1 top-1" variant={m.kind === "other" ? "secondary" : "default"}>
                        {KIND_LABEL[m.kind] ?? m.kind}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {KINDS.filter((k) => k.value !== m.kind).map((k) => (
                        <button
                          key={k.value}
                          type="button"
                          disabled={busy}
                          onClick={() => void setRowKind(m, k.value)}
                          className="rounded border px-1.5 py-0.5 text-[11px] text-muted-foreground hover:text-foreground"
                        >
                          {k.label}
                        </button>
                      ))}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void removeRow(m)}
                        className="rounded border px-1.5 py-0.5 text-[11px] text-destructive"
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
