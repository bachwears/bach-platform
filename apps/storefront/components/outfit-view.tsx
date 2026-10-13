"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { outfitPrice, type OutfitPriceKind } from "@bach/ui/lib/outfit-price";

import { addOutfitToCart, addToCart } from "../lib/cart";
import { colorFill } from "../lib/colors";
import { photoView } from "../lib/media";
import { sizeRank } from "../lib/sizes";
import { track } from "../lib/track";
import { PdpGallery } from "./pdp-gallery";

type Level = { quantity: number; reserved: number };
interface Variant {
  id: string;
  size: string;
  color_en: string;
  color_code: string;
  is_active: boolean;
  inventory_levels: Level[] | null;
}
interface Product {
  id: string;
  slug: string;
  name_en: string;
  status: string;
  price_usd_cents: number;
  sale_price_usd_cents: number | null;
  media_assets: Array<{ kind: string; storage_path: string; color_en: string | null; sort: number | null }> | null;
  product_variants: Variant[] | null;
}
export interface OutfitViewData {
  id: string;
  slug: string;
  name_en: string;
  description_en: string | null;
  price_kind: OutfitPriceKind;
  percent_off: number | null;
  fixed_usd_cents: number | null;
  sell_mode: "flexible" | "whole" | "exclusive";
  photos: string[];
  pieces: Array<{ default_color_code: string | null; product: Product | null }>;
}

const usd = (cents: number) => `$${(cents / 100).toFixed(cents % 100 === 0 ? 0 : 2)}`;
const units = (v: Variant) => (v.is_active ? Math.max((v.inventory_levels ?? []).reduce((n, l) => n + l.quantity - l.reserved, 0), 0) : 0);
const current = (p: Product) => Math.min(p.sale_price_usd_cents ?? p.price_usd_cents, p.price_usd_cents);

/** A colour's product shots (front, back) — packshots only, never the model. */
function packshots(p: Product, colorEn: string | null): { front: string | null; back: string | null; shownIn: string | null } {
  const media = p.media_assets ?? [];
  const hero = media.find((m) => m.kind === "front");
  const heroColour = hero?.color_en ?? null;
  const ofColour = (view: "front" | "back") =>
    media.find((m) => m.color_en === colorEn && photoView(m).view === view && !photoView(m).numbered)?.storage_path ?? null;
  if (colorEn && colorEn !== heroColour) {
    const f = ofColour("front");
    if (f) return { front: f, back: ofColour("back"), shownIn: null };
  }
  return {
    front: hero?.storage_path ?? null,
    back: media.find((m) => m.kind === "back")?.storage_path ?? null,
    // the shots show another colour than the one picked
    shownIn: colorEn && heroColour && colorEn !== heroColour ? heroColour : null,
  };
}

interface PieceState {
  include: boolean;
  colour: string | null; // color_code
  variantId: string | null;
}

/**
 * An outfit's page: the look's photos, then each piece (product shots in the
 * picked colour, colour squares, sizes, and — for a flexible look — a tick to
 * leave it out), and a pinned bar with the total. The full look gets the look's
 * price; anything less is each piece at its own price. Checkout re-prices it all
 * on the server (price_cart), this only shows the same numbers.
 */
export function OutfitView({ outfit, colourFills }: { outfit: OutfitViewData; colourFills: Record<string, string> }) {
  const pieces = outfit.pieces.filter((p) => p.product);
  const available = (p: Product) =>
    p.status === "published" && (p.product_variants ?? []).some((v) => units(v) > 0);

  const [state, setState] = useState<PieceState[]>(() =>
    pieces.map(({ product, default_color_code }) => {
      const p = product!;
      const vs = (p.product_variants ?? []).filter((v) => v.is_active);
      const inStockColour = (code: string | null) => vs.some((v) => v.color_code === code && units(v) > 0);
      const colour = inStockColour(default_color_code) ? default_color_code : vs.find((v) => units(v) > 0)?.color_code ?? default_color_code ?? vs[0]?.color_code ?? null;
      const sizes = vs.filter((v) => v.color_code === colour);
      // a one-size piece is picked already
      const only = sizes.length === 1 && units(sizes[0]!) > 0 ? sizes[0]!.id : null;
      return { include: available(p), colour, variantId: only };
    }),
  );
  const [missing, setMissing] = useState<number | null>(null);
  const [added, setAdded] = useState(false);
  const rows = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    track("outfit_view", { meta: { outfit: outfit.slug } });
  }, [outfit.slug]);

  const allAvailable = pieces.every((p) => available(p.product!));
  const lockedLook = outfit.sell_mode !== "flexible";
  const full = state.every((s) => s.include) && allAvailable;
  const chosen = pieces.filter((_, i) => state[i]!.include);

  const total = useMemo(() => {
    const priced = chosen.map((p) => ({ current: current(p.product!), full: p.product!.price_usd_cents }));
    if (full) return outfitPrice(priced, outfit.price_kind, outfit.percent_off, outfit.fixed_usd_cents);
    const sum = priced.reduce((n, p) => n + p.current, 0);
    return { sum, full: sum, pay: sum, saving: 0, percentSaving: 0 };
  }, [chosen, full, outfit]);
  const lookSaving = useMemo(() => {
    const priced = pieces.map((p) => ({ current: current(p.product!), full: p.product!.price_usd_cents }));
    return outfitPrice(priced, outfit.price_kind, outfit.percent_off, outfit.fixed_usd_cents);
  }, [pieces, outfit]);

  const update = (i: number, patch: Partial<PieceState>) => setState((cur) => cur.map((s, k) => (k === i ? { ...s, ...patch } : s)));

  function add() {
    if (lockedLook && !allAvailable) return;
    const need = state.findIndex((s) => s.include && !s.variantId);
    if (need >= 0) {
      setMissing(need);
      rows.current[need]?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    if (!chosen.length) return;
    if (full) {
      addOutfitToCart({
        outfitId: outfit.id,
        name: outfit.name_en,
        slug: outfit.slug,
        mode: outfit.sell_mode,
        variantIds: state.map((s) => s.variantId!),
      });
    } else {
      // part of a flexible look: each piece at its own price, as loose pieces
      state.forEach((s) => s.include && s.variantId && addToCart(s.variantId));
    }
    track("outfit_add", { value: total.pay, meta: { outfit: outfit.slug, pieces: chosen.length, full: full ? 1 : 0 } });
    setMissing(null);
    setAdded(true);
  }

  const buttonLabel = lockedLook
    ? allAvailable
      ? "ADD THE LOOK"
      : "UNAVAILABLE"
    : full
      ? `ADD THE LOOK (${chosen.length})`
      : `ADD ${chosen.length} ${chosen.length === 1 ? "PIECE" : "PIECES"}`;

  return (
    <div className="pb-[calc(6rem+env(safe-area-inset-bottom,0px))]">
      <div className="mx-auto grid max-w-[1440px] lg:grid-cols-[minmax(0,1fr)_440px] lg:gap-12 lg:px-8 lg:pt-6">
        <div>
          <div className="lg:hidden">
            <PdpGallery images={outfit.photos.map((url) => ({ kind: "model", url }))} name={outfit.name_en} layout="lead" />
          </div>
          <div className="hidden lg:block">
            <PdpGallery images={outfit.photos.map((url) => ({ kind: "model", url }))} name={outfit.name_en} layout="grid" />
          </div>
        </div>

        <div className="px-4 pt-6 lg:px-0 lg:pt-0">
          <p className="type-meta text-muted-foreground">OUTFIT · {pieces.length} PIECES</p>
          <h1 className="type-label mt-2 text-[15px] leading-snug">{outfit.name_en}</h1>
          <p className="type-label mt-2 text-[15px] tabular-nums">
            {lookSaving.saving > 0 ? (
              <>
                <span className="text-muted-foreground line-through">{usd(lookSaving.sum)}</span> {usd(lookSaving.pay)}
                <span className="ms-2 bg-foreground px-1 text-background">SAVE {usd(lookSaving.saving)}</span>
              </>
            ) : (
              usd(lookSaving.pay)
            )}
          </p>
          {outfit.description_en ? <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{outfit.description_en}</p> : null}
          {lookSaving.saving > 0 && !lockedLook ? (
            <p className="type-meta mt-3 text-muted-foreground">Take the full look to save {usd(lookSaving.saving)}. Leave a piece out and each is at its own price.</p>
          ) : null}
          {lockedLook ? (
            <p className="type-meta mt-3 text-muted-foreground">
              {outfit.sell_mode === "exclusive" ? "These pieces are sold together only, as one look." : "This look is sold complete."}
            </p>
          ) : null}
          {!allAvailable ? (
            <p className="mt-4 border p-3 text-sm">
              {lockedLook
                ? "A piece of this look is sold out, so the look is unavailable for now. Use Notify me on that piece."
                : "A piece of this look is sold out — the rest can be bought at their own prices."}
            </p>
          ) : null}

          <ol className="mt-8 space-y-8">
            {pieces.map(({ product }, i) => {
              const p = product!;
              const s = state[i]!;
              const ok = available(p);
              const vs = (p.product_variants ?? []).filter((v) => v.is_active);
              const colours = [...new Map(vs.map((v) => [v.color_code, v.color_en])).entries()];
              const colourName = colours.find(([c]) => c === s.colour)?.[1] ?? null;
              const sizes = vs.filter((v) => v.color_code === s.colour).sort((a, b) => sizeRank(a.size) - sizeRank(b.size));
              const shots = packshots(p, colourName);
              const fill = (en: string) => colourFills[en.toLowerCase()] ?? colorFill(en) ?? "var(--muted)";
              return (
                <li
                  key={p.id}
                  ref={(el) => {
                    rows.current[i] = el;
                  }}
                  className={`border-t pt-6 ${!s.include ? "opacity-50" : ""} ${missing === i ? "outline outline-1 outline-offset-4 outline-foreground" : ""}`}
                >
                  <div className="flex gap-3">
                    {[shots.front, shots.back].map((src, k) =>
                      src ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img key={k} src={src.replace(/-1600\.webp$/, "-400.webp")} alt={`${p.name_en} — ${k ? "back" : "front"}`} loading="lazy" className="aspect-[3/4] w-[30%] bg-secondary object-cover" />
                      ) : (
                        <span key={k} className="aspect-[3/4] w-[30%] bg-secondary" />
                      ),
                    )}
                    <div className="min-w-0 flex-1 space-y-1">
                      <Link href={`/products/${p.slug}${s.colour ? `?color=${s.colour}` : ""}`} className="type-meta block hover:underline">
                        {p.name_en}
                      </Link>
                      <p className="type-meta tabular-nums">
                        {p.sale_price_usd_cents != null && p.sale_price_usd_cents < p.price_usd_cents ? (
                          <>
                            {usd(p.sale_price_usd_cents)} <span className="text-muted-foreground line-through">{usd(p.price_usd_cents)}</span>
                          </>
                        ) : (
                          usd(p.price_usd_cents)
                        )}
                      </p>
                      {!ok ? <p className="type-label pt-1">SOLD OUT</p> : null}
                      {shots.shownIn ? <p className="type-meta text-muted-foreground">Shown in {shots.shownIn}</p> : null}
                      {!lockedLook ? (
                        <label className="type-meta flex items-center gap-2 pt-1">
                          <input
                            type="checkbox"
                            className="h-4 w-4 accent-foreground"
                            checked={s.include}
                            disabled={!ok}
                            onChange={(e) => update(i, { include: e.target.checked })}
                          />
                          {s.include ? "In the look" : "Left out"}
                        </label>
                      ) : null}
                    </div>
                  </div>

                  {ok ? (
                    <>
                      {colours.length > 1 ? (
                        <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label={`${p.name_en} colour`}>
                          {colours.map(([code, en]) => {
                            const out = !vs.some((v) => v.color_code === code && units(v) > 0);
                            return (
                              <button
                                key={code}
                                type="button"
                                role="radio"
                                aria-checked={s.colour === code}
                                aria-label={`${en}${out ? " — sold out" : ""}`}
                                title={en}
                                disabled={out}
                                onClick={() => {
                                  const sameSize = vs.find((v) => v.color_code === code && v.size === vs.find((x) => x.id === s.variantId)?.size && units(v) > 0);
                                  update(i, { colour: code, variantId: sameSize?.id ?? null });
                                }}
                                className={`relative h-8 w-8 border p-[3px] ${s.colour === code ? "border-foreground" : "border-transparent"} ${out ? "opacity-40" : ""}`}
                              >
                                <span className="block h-full w-full border border-black/10" style={{ background: fill(en) }} />
                                {out ? <span aria-hidden className="absolute inset-0 m-auto h-px w-full rotate-45 bg-foreground" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label={`${p.name_en} size`}>
                        {sizes.map((v) => {
                          const out = units(v) <= 0;
                          return (
                            <button
                              key={v.id}
                              type="button"
                              role="radio"
                              aria-checked={s.variantId === v.id}
                              disabled={out}
                              onClick={() => {
                                update(i, { variantId: v.id, include: true });
                                if (missing === i) setMissing(null);
                              }}
                              className={`type-label h-10 min-w-12 border px-3 ${s.variantId === v.id ? "border-foreground bg-foreground text-background" : "border-border hover:border-foreground"} ${out ? "text-muted-foreground line-through" : ""}`}
                            >
                              {v.size}
                            </button>
                          );
                        })}
                      </div>
                      {missing === i ? <p className="type-meta mt-2">Choose a size</p> : null}
                    </>
                  ) : (
                    <Link href={`/products/${p.slug}`} className="type-label mt-3 inline-block underline underline-offset-4">
                      Notify me
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </div>

      {/* pinned bar: the total for what's ticked, and the one ADD */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t bg-background px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3">
        <div className="mx-auto flex max-w-[1440px] items-center gap-3 lg:px-4">
          <div className="min-w-0 flex-1">
            <p className="type-meta truncate">{outfit.name_en}</p>
            <p className="type-meta tabular-nums">
              {total.saving > 0 ? (
                <>
                  <span className="text-muted-foreground line-through">{usd(total.sum)}</span> {usd(total.pay)} · SAVE {usd(total.saving)}
                </>
              ) : (
                usd(total.pay)
              )}
            </p>
          </div>
          {added ? (
            <Link href="/cart" className="type-label grid h-11 shrink-0 place-items-center border border-foreground px-6">
              VIEW BAG
            </Link>
          ) : null}
          <button
            type="button"
            onClick={add}
            disabled={(lockedLook && !allAvailable) || !chosen.length}
            className="type-label h-11 shrink-0 bg-foreground px-6 text-background disabled:opacity-40"
          >
            {buttonLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
