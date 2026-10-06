"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Badge } from "@bach/ui/components/badge";
import { Button } from "@bach/ui/components/button";
import { Select } from "@bach/ui/components/select";

import { NOT_SAVED } from "../lib/access";
import { PhotoMove } from "./photo-move";
import {
  SLOT_KINDS,
  VIEWS,
  VIEW_LABEL,
  VIEW_SORT,
  hiddenSort,
  isImage,
  nextShownSort,
  nextViewNumber,
  onSite,
  photoView,
  renameView,
  shownExtra,
  storefrontOrder,
  thumb,
  uploadRenditions,
  viewRank,
  viewTag,
  type MediaRow,
} from "./photo-tools";
import { Icon } from "@bach/ui/components/icon";

export interface ProductColour {
  /** colour name as on the variants (English) */
  en: string;
  ar: string | null;
  /** storage folder for new photos of this colour, from the variant SKU (BW-SWT-055-BLA) */
  code: string | null;
  /** at least one active variant in this colour */
  active: boolean;
  /** sellable units in this colour */
  stock: number;
}

type Sb = ReturnType<typeof supabaseBrowser>;

async function update(sb: Sb, id: string, patch: Record<string, unknown>): Promise<string | null> {
  const { data, error } = await sb.from("media_assets").update(patch).eq("id", id).select("id");
  if (error) return error.code === "23505" ? "في صورة تانية بنفس الدور لهالمنتج — غيّر دورها أوّل." : error.message;
  return data?.length ? null : NOT_SAVED;
}

const role = (m: MediaRow) =>
  m.kind === "front" ? "الأساسية" : m.kind === "back" ? "صورة الهوفر" : null;

/**
 * Photos grouped by the colour they show — one card per colour of the product
 * (plus «بلا لون»), in the order the site shows them. Pick a photo to change its
 * role, colour or file, hide it, move it to another product or delete it.
 */
export function ColourPhotos({
  productId,
  photos,
  colours,
}: {
  productId: string;
  photos: MediaRow[];
  colours: ProductColour[];
}) {
  const front = photos.find((m) => m.kind === "front") ?? null;
  const heroColor = front?.color_en ?? null;
  const known = new Set(colours.map((c) => c.en));
  // colours that only exist on photos (a colour we no longer sell, or a typo)
  const orphan = [...new Set(photos.map((m) => m.color_en).filter((c): c is string => !!c && !known.has(c)))].sort();
  const cards: Array<{ key: string; colour: ProductColour | null; orphan?: boolean }> = [
    ...[...colours]
      .sort((a, b) => Number(b.en === heroColor) - Number(a.en === heroColor) || Number(b.active) - Number(a.active) || a.en.localeCompare(b.en))
      .map((c) => ({ key: c.en, colour: c })),
    ...orphan.map((en) => ({ key: en, colour: { en, ar: null, code: null, active: false, stock: 0 }, orphan: true })),
  ];
  const noColour = photos.filter((m) => !m.color_en);
  if (noColour.length || !colours.length) cards.push({ key: "", colour: null });

  return (
    <div className="space-y-4">
      {!front ? (
        <p role="alert" className="border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300">
          ما في صورة أساسية — المنتج مخفي عن الموقع. زيد صورة «قدّام» لأي لون، أو اختار صورة موجودة واكبس «خليها الأساسية».
        </p>
      ) : null}
      <p className="text-xs text-muted-foreground">
        الصور مرتّبة متل ما بتبيّن بالموقع (اللابس أوّل، بعدين القطعة لحالها، بعدين التفاصيل). اكبس على أي صورة لتعدّلها.
      </p>
      {cards.map((c) => (
        <ColourCard
          key={c.key || "none"}
          productId={productId}
          colour={c.colour}
          orphan={!!c.orphan}
          isHero={!!c.colour && c.colour.en === heroColor}
          heroColor={heroColor}
          all={photos}
          list={photos.filter((m) => (m.color_en ?? "") === c.key)}
          colours={colours}
          canAdd={(!!c.colour && !c.orphan) || !colours.length}
        />
      ))}
    </div>
  );
}

function ColourCard({
  productId,
  colour,
  orphan,
  isHero,
  heroColor,
  all,
  list,
  colours,
  canAdd,
}: {
  productId: string;
  colour: ProductColour | null;
  orphan: boolean;
  isHero: boolean;
  heroColor: string | null;
  all: MediaRow[];
  list: MediaRow[];
  colours: ProductColour[];
  canAdd: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [addView, setAddView] = useState<string>(() => (all.some((m) => m.kind === "front") ? "model-front" : "front"));
  const [over, setOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const color = colour?.en ?? null;
  const dir = colour?.code ?? `products/${productId}`;
  // the hero colour's card is the main gallery; a slot photo tagged with another colour
  // still shows there on the site, so its own card flags it («مع اللون الأساسي»)
  const shown = storefrontOrder(list.filter(onSite));
  const hidden = list.filter((m) => !onSite(m)).sort((a, b) => (a.sort ?? 0) - (b.sort ?? 0));
  const ordered = [...shown, ...hidden];
  const sel = ordered.find((m) => m.id === selected) ?? null;

  async function run(fn: (sb: Sb) => Promise<string | null>, done?: string, keepSelection = true) {
    setBusy(true);
    setErr("");
    setMsg("");
    try {
      const e = await fn(supabaseBrowser());
      if (e) setErr(e);
      else {
        if (done) setMsg(done);
        if (!keepSelection) setSelected(null);
        router.refresh();
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function addFiles(files: FileList | File[] | null) {
    const list = Array.from(files ?? []).filter(isImage);
    if (!list.length) return setErr("اختار صور JPG / PNG / WebP.");
    await run(async (sb) => {
      const working = [...all];
      for (const [i, file] of list.entries()) {
        setMsg(`عم نرفع ${i + 1} من ${list.length}…`);
        const n = nextViewNumber(working, color, addView);
        const url = await uploadRenditions(sb, file, dir, viewTag(addView, n));
        const kind =
          addView === "front" && !working.some((m) => m.kind === "front")
            ? "front"
            : addView === "back" && color && color === heroColor && !working.some((m) => m.kind === "back")
              ? "back"
              : "other";
        const sort = kind === "front" ? 0 : kind === "back" ? 1 : nextShownSort(working, color);
        const { data, error } = await sb
          .from("media_assets")
          .insert({ product_id: productId, kind, storage_path: url, sort, color_en: color })
          .select("id")
          .single();
        if (error) return `انرفعت ${i} من ${list.length}. الباقي ما مشي: ${error.message}`;
        if (!data) return NOT_SAVED;
        working.push({ id: data.id as string, kind, storage_path: url, sort, color_en: color });
      }
      return null;
    }, list.length > 1 ? `انرفعت ${list.length} صور.` : "انرفعت الصورة.");
  }

  async function move(m: MediaRow, d: -1 | 1) {
    const i = shown.indexOf(m);
    const other = shown[i + d];
    if (!other) return;
    const [a, b] = [m.sort ?? 0, other.sort ?? 0];
    const [na, nb] = a === b ? (d < 0 ? [a, Math.min(499, a + 1)] : [Math.min(499, a + 1), a]) : [b, a];
    await run(async (sb) => (await update(sb, m.id, { sort: na })) ?? (await update(sb, other.id, { sort: nb })));
  }

  const canSwap = (m: MediaRow, d: -1 | 1) => {
    const other = shown[shown.indexOf(m) + d];
    // the site orders by view first; only photos of the same view group can trade places
    return !!other && m.kind === "other" && other.kind === "other" && shownExtra(m.sort) && shownExtra(other.sort) && viewRank(m) === viewRank(other);
  };

  const missing = !!colour && !orphan && !shown.length && !(isHero && all.some((m) => m.kind === "front"));

  return (
    <section className={`space-y-3 border p-4 ${isHero ? "border-foreground/30" : ""}`}>
      <header className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 className="text-sm font-medium" dir="ltr">
          {colour ? colour.en : "بلا لون"}
        </h3>
        {colour?.ar ? <span className="text-sm text-muted-foreground">{colour.ar}</span> : null}
        {isHero ? <Badge variant="outline">اللون الأساسي</Badge> : null}
        {orphan ? <Badge variant="outline">لون مش منبيعو</Badge> : null}
        {colour && !colour.active && !orphan ? <Badge variant="outline">موقّف</Badge> : null}
        <span className="text-xs text-muted-foreground">
          {shown.length} عالموقع{hidden.length ? ` · ${hidden.length} مخفية` : ""}
          {colour && !orphan ? ` · ستوك ${colour.stock}` : ""}
        </span>
      </header>
      {!colour && list.length ? (
        <p className="text-xs text-amber-700 dark:text-amber-400">الصور بلا لون ما بتبيّن عالموقع (إلا الصور الأساسية). اختار صورة وحدّدلها لونها.</p>
      ) : null}
      {orphan ? <p className="text-xs text-amber-700 dark:text-amber-400">ما في مقاسات بهاللون — صورو ما بتبيّن. غيّر لونها أو انقلها.</p> : null}
      {missing ? <p className="text-xs text-amber-700 dark:text-amber-400">ما في صور عالموقع لهاللون — لمّا الزبون يختارو بيضل يشوف صور اللون الأساسي.</p> : null}

      {ordered.length ? (
        <ul className="grid grid-cols-3 gap-2 sm:grid-cols-5 lg:grid-cols-6">
          {ordered.map((m) => {
            const live = onSite(m);
            const r = role(m);
            const otherColourSlot = m.kind !== "other" && m.kind !== "front" && heroColor && m.color_en !== heroColor;
            return (
              <li key={m.id} className="space-y-1">
                <button
                  type="button"
                  onClick={() => setSelected(selected === m.id ? null : m.id)}
                  aria-pressed={selected === m.id}
                  className={`relative block aspect-[2/3] w-full overflow-hidden bg-muted outline-none ring-offset-2 ring-offset-background focus-visible:ring-2 focus-visible:ring-ring ${
                    selected === m.id ? "ring-2 ring-foreground" : ""
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumb(m.storage_path)} alt="" loading="lazy" className={`h-full w-full object-cover ${live ? "" : "opacity-40"}`} />
                  <span className="absolute inset-x-1 top-1 flex flex-wrap gap-1">
                    <span className="bg-background/85 px-1.5 py-0.5 text-[10px] leading-none">
                      {VIEW_LABEL[photoView(m).view] ?? photoView(m).view}
                      {photoView(m).n > 1 ? ` ${photoView(m).n}` : ""}
                    </span>
                    {r ? <span className="bg-foreground px-1.5 py-0.5 text-[10px] leading-none text-background">{r}</span> : null}
                  </span>
                  {!live ? <span className="absolute inset-x-1 bottom-1 bg-background/85 px-1.5 py-0.5 text-center text-[10px]">مخفية</span> : null}
                  {otherColourSlot ? (
                    <span className="absolute inset-x-1 bottom-1 bg-amber-500/90 px-1.5 py-0.5 text-center text-[10px] text-black">مع اللون الأساسي</span>
                  ) : null}
                </button>
                {canSwap(m, -1) || canSwap(m, 1) ? (
                  <span className="flex gap-1">
                    <button type="button" disabled={busy || !canSwap(m, -1)} onClick={() => void move(m, -1)} className="h-7 flex-1 border text-xs disabled:opacity-30" aria-label="قبل">
                      →
                    </button>
                    <button type="button" disabled={busy || !canSwap(m, 1)} onClick={() => void move(m, 1)} className="h-7 flex-1 border text-xs disabled:opacity-30" aria-label="بعد">
                      ←
                    </button>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="border border-dashed p-4 text-center text-xs text-muted-foreground">ما في صور لهاللون بعد.</p>
      )}

      {sel ? (
        <PhotoEditor
          key={sel.id}
          productId={productId}
          photo={sel}
          all={all}
          heroColor={heroColor}
          colours={colours}
          dir={dir}
          busy={busy}
          run={run}
          onClose={() => setSelected(null)}
          onMoved={(text) => {
            setSelected(null);
            setMsg(text);
            router.refresh();
          }}
        />
      ) : null}

      {canAdd ? (
        <div
          className={`flex flex-wrap items-center gap-2 border border-dashed p-2 ${over ? "bg-muted" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            if (!busy) void addFiles(e.dataTransfer.files);
          }}
        >
          <label htmlFor={`add-view-${color ?? "none"}`} className="text-xs text-muted-foreground">
            زيد صور كـ
          </label>
          <Select id={`add-view-${color ?? "none"}`} value={addView} onChange={(e) => setAddView(e.target.value)} className="h-8 w-auto text-xs">
            {VIEWS.map((v) => (
              <option key={v} value={v}>
                {VIEW_LABEL[v]}
              </option>
            ))}
          </Select>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={16} />
            {busy ? "عم نشتغل…" : "اختار صور"}
          </Button>
          <span className="text-[11px] text-muted-foreground">أو اسحبها لهون</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              void addFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>
      ) : null}

      {msg ? <p className="text-xs text-muted-foreground">{msg}</p> : null}
      {err ? <p className="text-xs text-destructive">{err}</p> : null}
    </section>
  );
}

function PhotoEditor({
  productId,
  photo,
  all,
  heroColor,
  colours,
  dir,
  busy,
  run,
  onClose,
  onMoved,
}: {
  productId: string;
  photo: MediaRow;
  all: MediaRow[];
  heroColor: string | null;
  colours: ProductColour[];
  dir: string;
  busy: boolean;
  run: (fn: (sb: Sb) => Promise<string | null>, done?: string, keepSelection?: boolean) => Promise<void>;
  onClose: () => void;
  onMoved: (text: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [moving, setMoving] = useState(false);
  const { view } = photoView(photo);
  const live = onSite(photo);
  const isFront = photo.kind === "front";
  const isSlot = photo.kind !== "other";
  const colourOptions = [...new Set([...colours.map((c) => c.en), ...(photo.color_en ? [photo.color_en] : [])])];

  // ── make it the product's main photo ──────────────────────────────────────
  const makeMain = () =>
    run(async (sb) => {
      const old = all.find((m) => m.kind === "front");
      const working = [...all];
      if (old) {
        const e = await update(sb, old.id, { kind: "other", sort: old.color_en ? nextShownSort(working, old.color_en, old.id) : hiddenSort(0) });
        if (e) return e;
      }
      const e = await update(sb, photo.id, { kind: "front", sort: 0 });
      if (e) {
        // put the old main photo back so the product doesn't drop off the site
        if (old) await update(sb, old.id, { kind: "front", sort: 0 });
        return e;
      }
      const newColor = photo.color_en ?? null;
      let backFree = photo.kind === "back" || !all.some((m) => m.kind === "back");
      if (newColor && newColor !== (old?.color_en ?? null)) {
        // the main gallery now shows the new colour: other colours' slot photos become that colour's extras
        for (const s of all) {
          if (s.id === photo.id || s.id === old?.id || s.kind === "other" || s.kind === "front" || !s.color_en || s.color_en === newColor) continue;
          const e2 = await update(sb, s.id, { kind: "other", sort: nextShownSort(working, s.color_en, s.id) });
          if (e2) return `الصورة صارت الأساسية، بس ما قدرنا نرتّب باقي الصور: ${e2}`;
          if (s.kind === "back") backFree = true;
        }
      }
      if (backFree && newColor) {
        // the new colour's back shot becomes the card's hover photo
        const back = all.find((m) => m.id !== photo.id && m.kind === "other" && m.color_en === newColor && shownExtra(m.sort) && photoView(m).view === "back");
        if (back) await update(sb, back.id, { kind: "back", sort: 1 });
      }
      return null;
    }, "صارت الصورة الأساسية للمنتج.");

  // ── view (what the photo shows) — lives in the file name ───────────────────
  const setView = (next: string) =>
    run(async (sb) => {
      const n = nextViewNumber(all, photo.color_en, next, photo.id);
      const url = await renameView(sb, photo.storage_path, viewTag(next, n), dir);
      const patch: Record<string, unknown> = { storage_path: url };
      if (next === "back" && photo.kind === "other" && photo.color_en && photo.color_en === heroColor && shownExtra(photo.sort) && !all.some((m) => m.kind === "back")) {
        Object.assign(patch, { kind: "back", sort: 1 });
      } else if (photo.kind === "back" && next !== "back" && photo.color_en) {
        Object.assign(patch, { kind: "other", sort: nextShownSort(all, photo.color_en, photo.id) });
      }
      return update(sb, photo.id, patch);
    }, `صارت «${VIEW_LABEL[next]}».`);

  // ── show / hide on the site ────────────────────────────────────────────────
  const toggle = () =>
    run(async (sb) => {
      if (live) {
        return update(sb, photo.id, isSlot ? { kind: "other", sort: 500 + (VIEW_SORT[view] ?? 5) * 10 } : { sort: hiddenSort(photo.sort) });
      }
      if (!photo.color_en) return "حدّد لون الصورة أوّل — الصور الزيادة بلا لون ما بتطلع عالموقع.";
      return update(sb, photo.id, { sort: nextShownSort(all, photo.color_en, photo.id) });
    }, live ? "تخبّت عن الموقع." : "صارت ظاهرة عالموقع.");

  // ── colour ─────────────────────────────────────────────────────────────────
  const setColour = (next: string) =>
    run(async (sb) => {
      const c = next || null;
      if (isFront) {
        // the main photos show one colour together
        const { data, error } = await sb
          .from("media_assets")
          .update({ color_en: c })
          .eq("product_id", productId)
          .in("kind", [...SLOT_KINDS])
          .select("id");
        if (error) return error.message;
        return data?.length ? null : NOT_SAVED;
      }
      if (isSlot && c !== heroColor) {
        return update(sb, photo.id, { color_en: c, kind: "other", sort: c ? nextShownSort(all, c, photo.id) : hiddenSort(0) });
      }
      return update(sb, photo.id, { color_en: c, ...(shownExtra(photo.sort) && c ? { sort: nextShownSort(all, c, photo.id) } : {}) });
    }, isFront ? "تغيّر لون الصور الأساسية." : "تغيّر اللون.", false);

  // ── replace the file, keep role / colour / order ─────────────────────────────
  const replace = (file: File | undefined) => {
    if (!file) return;
    if (!isImage(file)) return void run(async () => "اختار صورة JPG / PNG / WebP.");
    return run(async (sb) => {
      const { view: v, n } = photoView(photo);
      const url = await uploadRenditions(sb, file, dir, viewTag(VIEW_LABEL[v] ? v : "detail", n));
      return update(sb, photo.id, { storage_path: url });
    }, "تبدّلت الصورة.");
  };

  // ── delete ─────────────────────────────────────────────────────────────────
  const remove = () => {
    const warn = isFront
      ? "هيدي الصورة الأساسية. إذا محيتها، المنتج بيختفي عن الموقع لحدّ ما تختار وحدة تانية. أكيد؟"
      : "أكيد بدك تمحي هالصورة من المنتج؟";
    if (!window.confirm(warn)) return;
    return run(async (sb) => {
      const { data, error } = await sb.from("media_assets").delete().eq("id", photo.id).select("id");
      if (error) return error.message;
      return data?.length ? null : NOT_SAVED;
    }, "انمحت الصورة.", false);
  };

  const where = isFront
    ? "الصورة الأساسية: بتبيّن بالشوب وبالبحث، وهي يلّي بتخلّي المنتج ظاهر."
    : live
      ? photo.kind !== "other" || photo.color_en === heroColor
        ? "ظاهرة بمعرض الصور الأساسي."
        : `ظاهرة لمّا الزبون يختار ${photo.color_en}.`
      : !photo.color_en
        ? "مخفية: ما إلها لون."
        : "مخفية عن الموقع.";

  return (
    <div className="grid gap-4 border bg-muted/20 p-3 sm:grid-cols-[10rem_1fr]">
      <a href={photo.storage_path} target="_blank" rel="noreferrer" className="block">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumb(photo.storage_path).replace(/-400\.webp$/, "-800.webp")} alt="" className="aspect-[2/3] w-full bg-muted object-cover" />
      </a>
      <div className="min-w-0 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <p className="text-xs text-muted-foreground">{where}</p>
          <button type="button" onClick={onClose} className="text-xs underline underline-offset-2">
            سكّر
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label htmlFor={`view-${photo.id}`} className="text-xs font-medium">
              شو بتفرجي الصورة
            </label>
            <Select id={`view-${photo.id}`} value={VIEW_LABEL[view] && view !== "model" ? view : ""} disabled={busy} onChange={(e) => e.target.value && void setView(e.target.value)}>
              {!VIEW_LABEL[view] || view === "model" ? <option value="">{VIEW_LABEL[view] ?? view} (قديم)</option> : null}
              {VIEWS.map((v) => (
                <option key={v} value={v}>
                  {VIEW_LABEL[v]}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-1">
            <label htmlFor={`colour-${photo.id}`} className="text-xs font-medium">
              {isFront ? "لون الصور الأساسية" : "اللون بالصورة"}
            </label>
            <Select id={`colour-${photo.id}`} dir="ltr" value={photo.color_en ?? ""} disabled={busy} onChange={(e) => void setColour(e.target.value)}>
              {colourOptions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
              <option value="">بلا لون</option>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isFront ? (
            <Button type="button" size="sm" disabled={busy} onClick={() => void makeMain()}>
              <Icon name="hero" size={16} />
              خليها الأساسية
            </Button>
          ) : null}
          {!isFront ? (
            <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => void toggle()}>
              <Icon name={live ? "hidden" : "visible"} size={16} />
              {live ? "خبّي عن الموقع" : "ورجي عالموقع"}
            </Button>
          ) : null}
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}>
            <Icon name="refresh" size={16} />
            بدّل الملف
          </Button>
          <Button type="button" size="sm" variant="outline" disabled={busy} onClick={() => setMoving((v) => !v)}>
            <Icon name="move" size={16} />
            انقل لمنتج تاني
          </Button>
          <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => void remove()} className="text-destructive">
            <Icon name="remove" size={16} />
            امحي
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              void replace(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
        {isFront ? <p className="text-[11px] text-muted-foreground">لتبدّل الصورة الأساسية، اختار صورة تانية واكبس «خليها الأساسية».</p> : null}
        {moving ? <PhotoMove productId={productId} photo={photo} onCancel={() => setMoving(false)} onDone={(text) => onMoved(text)} /> : null}
      </div>
    </div>
  );
}
