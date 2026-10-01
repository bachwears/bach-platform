"use client";

import { useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
import { Button } from "@bach/ui/components/button";
import { Input } from "@bach/ui/components/input";
import { t, type Locale } from "@bach/i18n";

export interface ProfileCustomer {
  id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  size_top?: string | null;
  size_bottom?: string | null;
  size_shoe?: string | null;
}

const LETTERS = ["XS", "S", "M", "L", "XL", "XXL"];
const SHOES = ["38", "39", "40", "41", "42", "43", "44", "45", "46", "47"];

// Matches @bach/ui Input, at touch height below lg.
const selectClass =
  "h-11 w-full rounded-md border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-9";

export function AccountProfile({
  locale,
  customer,
  onSaved,
}: {
  locale: Locale;
  customer: ProfileCustomer;
  onSaved: (patch: Partial<ProfileCustomer>) => void;
}) {
  const [name, setName] = useState(customer.full_name ?? "");
  const [nameMsg, setNameMsg] = useState("");
  // The size columns arrive with a migration; until then the card stays hidden.
  const hasSizes = "size_top" in customer;
  const [sizes, setSizes] = useState({
    size_top: customer.size_top ?? "",
    size_bottom: customer.size_bottom ?? "",
    size_shoe: customer.size_shoe ?? "",
  });
  const [sizeMsg, setSizeMsg] = useState("");
  const [busy, setBusy] = useState<"" | "name" | "sizes">("");

  async function saveName() {
    const next = name.trim();
    if (!next || next === customer.full_name) return;
    setBusy("name");
    const { error } = await supabaseBrowser().from("customers").update({ full_name: next }).eq("id", customer.id);
    setBusy("");
    if (error) return setNameMsg(t(locale, "sf.acct.saveFailed"));
    onSaved({ full_name: next });
    setNameMsg(t(locale, "sf.acct.saved"));
  }

  async function saveSizes() {
    setBusy("sizes");
    const patch = {
      size_top: sizes.size_top || null,
      size_bottom: sizes.size_bottom || null,
      size_shoe: sizes.size_shoe || null,
    };
    const { error } = await supabaseBrowser().from("customers").update(patch).eq("id", customer.id);
    setBusy("");
    if (error) return setSizeMsg(t(locale, "sf.acct.saveFailed"));
    onSaved(patch);
    setSizeMsg(t(locale, "sf.acct.saved"));
  }

  const sizesDirty =
    (sizes.size_top || null) !== (customer.size_top ?? null) ||
    (sizes.size_bottom || null) !== (customer.size_bottom ?? null) ||
    (sizes.size_shoe || null) !== (customer.size_shoe ?? null);

  return (
    <>
      <h2 className="mt-10 text-lg font-medium">{t(locale, "sf.acct.details")}</h2>
      <div className="mt-4 space-y-4 rounded-md border p-5 text-sm">
        <label className="block space-y-1.5">
          <span className="font-medium">{t(locale, "sf.acct.name")}</span>
          <div className="flex gap-2">
            <Input
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setNameMsg("");
              }}
              autoComplete="name"
              className="h-11 lg:h-9"
            />
            <Button
              className="h-11 lg:h-9"
              disabled={busy === "name" || !name.trim() || name.trim() === customer.full_name}
              onClick={() => void saveName()}
            >
              {t(locale, "sf.acct.save")}
            </Button>
          </div>
          {nameMsg && <p className="text-muted-foreground">{nameMsg}</p>}
        </label>
        <div className="space-y-1">
          <p className="font-medium">{t(locale, "sf.acct.email")}</p>
          <p className="text-muted-foreground" dir="ltr">
            {customer.email ?? "—"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="font-medium">{t(locale, "sf.acct.phone")}</p>
          <p className="text-muted-foreground" dir="ltr">
            {customer.phone ?? "—"}
          </p>
          <p className="text-xs text-muted-foreground">{t(locale, "sf.acct.phoneNote")}</p>
        </div>
      </div>

      {hasSizes && (
        <>
          <h2 className="mt-10 text-lg font-medium">{t(locale, "sf.acct.sizes")}</h2>
          <div className="mt-4 rounded-md border p-5 text-sm">
            <p className="text-muted-foreground">{t(locale, "sf.acct.sizesSub")}</p>
            <div className="mt-4 grid grid-cols-3 gap-3">
              {(
                [
                  ["size_top", "sf.acct.sizeTop", LETTERS],
                  ["size_bottom", "sf.acct.sizeBottom", LETTERS],
                  ["size_shoe", "sf.acct.sizeShoe", SHOES],
                ] as const
              ).map(([key, label, options]) => (
                <label key={key} className="block space-y-1.5">
                  <span className="font-medium">{t(locale, label)}</span>
                  <select
                    className={selectClass}
                    value={sizes[key]}
                    onChange={(e) => {
                      setSizes({ ...sizes, [key]: e.target.value });
                      setSizeMsg("");
                    }}
                  >
                    <option value="">—</option>
                    {options.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
            <div className="mt-4 flex items-center gap-3">
              <Button className="h-11 lg:h-9" disabled={busy === "sizes" || !sizesDirty} onClick={() => void saveSizes()}>
                {t(locale, "sf.acct.save")}
              </Button>
              {sizeMsg && <p className="text-muted-foreground">{sizeMsg}</p>}
            </div>
          </div>
        </>
      )}
    </>
  );
}
