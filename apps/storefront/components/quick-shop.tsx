"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { t } from "@bach/i18n";

import { addToCart } from "../lib/cart";
import { useLocale } from "../lib/locale-client";

export interface QuickShopSize {
  variantId: string;
  size: string;
}

/**
 * The + beside a card's name opens its sizes over the bottom of the photo;
 * picking one drops it in the bag. Works on touch as well as with a mouse.
 */
export function QuickShop({
  sizes,
  name,
  color,
  align = "end",
}: {
  sizes: QuickShopSize[];
  name: string;
  /** the colour the sizes belong to, echoed in the confirmation */
  color?: string | null;
  /** "center": the + sits centred under the price (mini cards) */
  align?: "end" | "center";
}) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);
  const [added, setAdded] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent | TouchEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", away);
    document.addEventListener("touchstart", away);
    window.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", away);
      document.removeEventListener("touchstart", away);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);

  useEffect(() => {
    if (!added) return;
    const id = setTimeout(() => {
      setAdded(null);
      setOpen(false);
    }, 1400);
    return () => clearTimeout(id);
  }, [added]);

  if (!sizes.length) return null;

  return (
    <div ref={ref}>
      <button
        type="button"
        aria-label={`${t(locale, "sf.shop.quickShop")}: ${name}`}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`absolute grid h-10 w-10 place-items-center ${align === "center" ? "start-1/2 top-5 -translate-x-1/2 rtl:translate-x-1/2" : "end-0 top-[-0.6rem]"}`}
      >
        {open ? <X className="h-4 w-4" strokeWidth={1.25} aria-hidden /> : <Plus className="h-4 w-4" strokeWidth={1.25} aria-hidden />}
      </button>
      {open && (
        <div className="absolute inset-x-0 bottom-[calc(100%+0.75rem)] z-10 border bg-background p-3" role="dialog" aria-label={name}>
          {added ? (
            <p className="type-meta py-2 text-center" role="status">
              {t(locale, "sf.shop.addedShort")} · {added}
            </p>
          ) : (
            <>
              <p className="type-heading text-muted-foreground">
                {t(locale, "sf.shop.selectSize")}
                {color ? <span className="ms-2">· {color}</span> : null}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {sizes.map((s) => (
                  <button
                    key={s.variantId}
                    type="button"
                    className="type-label grid h-10 min-w-10 place-items-center px-2 underline-offset-4 hover:underline"
                    onClick={() => {
                      addToCart(s.variantId);
                      setAdded(color ? `${color} / ${s.size}` : s.size);
                    }}
                  >
                    {s.size}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
