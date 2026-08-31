"use client";

import { useMemo, useState } from "react";
import { Button } from "@bach/ui/components/button";

import { addToCart } from "../lib/cart";

export interface PdpVariant {
  id: string;
  size: string;
  color_code: string;
  color_en: string;
  available: number;
}

export function AddToCart({ variants }: { variants: PdpVariant[] }) {
  const colors = useMemo(
    () => [...new Map(variants.map((v) => [v.color_code, v.color_en])).entries()],
    [variants],
  );
  const [color, setColor] = useState(colors.length === 1 ? colors[0]![0] : "");
  const sizes = useMemo(
    () => variants.filter((v) => !color || v.color_code === color),
    [variants, color],
  );
  const [variantId, setVariantId] = useState(sizes.length === 1 ? sizes[0]!.id : "");
  const chosen = variants.find((v) => v.id === variantId);
  const [added, setAdded] = useState(false);

  return (
    <div className="mt-8 space-y-6">
      {colors.length > 0 && (
        <div>
          <p className="text-sm font-medium">Color</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {colors.map(([code, name]) => (
              <button
                key={code}
                type="button"
                onClick={() => {
                  setColor(code);
                  setVariantId("");
                  setAdded(false);
                }}
                className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                  color === code ? "border-foreground bg-foreground text-background" : "hover:border-foreground"
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <p className="text-sm font-medium">Size</p>
        {colors.length > 1 && !color ? (
          <p className="mt-2 text-sm text-muted-foreground">Select a color first.</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          {(colors.length > 1 && !color ? [] : sizes).map((v) => (
            <button
              key={v.id}
              type="button"
              disabled={v.available <= 0}
              onClick={() => {
                setVariantId(v.id);
                setAdded(false);
              }}
              className={`min-w-12 rounded-md border px-3 py-1.5 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                variantId === v.id ? "border-foreground bg-foreground text-background" : "hover:border-foreground"
              }`}
            >
              {v.size}
            </button>
          ))}
        </div>
        {chosen && chosen.available <= 3 && (
          <p className="mt-2 text-xs text-muted-foreground">Only {chosen.available} left</p>
        )}
      </div>

      <Button
        className="h-12 w-full text-base"
        disabled={!chosen || chosen.available <= 0}
        onClick={() => {
          if (!chosen) return;
          addToCart(chosen.id);
          setAdded(true);
        }}
      >
        {added ? "Added to bag ✓" : chosen ? "Add to bag" : "Select a size"}
      </Button>
    </div>
  );
}
