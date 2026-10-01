"use client";

import { useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";
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

// Underlined fields, like the rest of the storefront forms.
const FIELD =
  "h-11 w-full border-0 border-b border-border bg-transparent px-0 text-sm outline-none transition-colors focus:border-foreground";
const selectClass = `${FIELD} cursor-pointer`;
const SAVE = "type-label h-11 bg-foreground px-8 text-background hover:opacity-90 disabled:opacity-40";

export function AccountProfile({
  locale,
  customer,
  onSaved,
  part,
}: {
  locale: Locale;
  customer: ProfileCustomer;
  onSaved: (patch: Partial<ProfileCustomer>) => void;
  /** which half to render — the account page shows them as separate rows */
  part: "details" | "sizes";
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

  if (part === "sizes") {
    if (!hasSizes) return null;
    return (
      <div className="text-sm">
        <p className="text-xs text-muted-foreground">{t(locale, "sf.acct.sizesSub")}</p>
        <div className="mt-5 grid grid-cols-3 gap-4">
          {(
            [
              ["size_top", "sf.acct.sizeTop", LETTERS],
              ["size_bottom", "sf.acct.sizeBottom", LETTERS],
              ["size_shoe", "sf.acct.sizeShoe", SHOES],
            ] as const
          ).map(([key, label, options]) => (
            <label key={key} className="block">
              <span className="type-meta text-muted-foreground">{t(locale, label)}</span>
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
        <div className="mt-6 flex items-center gap-4">
          <button type="button" className={SAVE} disabled={busy === "sizes" || !sizesDirty} onClick={() => void saveSizes()}>
            {t(locale, "sf.acct.save")}
          </button>
          {sizeMsg && <p className="text-xs text-muted-foreground">{sizeMsg}</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-sm">
      <label className="block">
        <span className="type-meta text-muted-foreground">{t(locale, "sf.acct.name")}</span>
        <div className="flex items-end gap-4">
          <input
            className={FIELD}
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              setNameMsg("");
            }}
            autoComplete="name"
          />
          <button
            type="button"
            className="type-label h-11 shrink-0 underline underline-offset-4 hover:opacity-60 disabled:opacity-30 disabled:no-underline"
            disabled={busy === "name" || !name.trim() || name.trim() === customer.full_name}
            onClick={() => void saveName()}
          >
            {t(locale, "sf.acct.save")}
          </button>
        </div>
        {nameMsg && <p className="mt-2 text-xs text-muted-foreground">{nameMsg}</p>}
      </label>
      <div>
        <p className="type-meta text-muted-foreground">{t(locale, "sf.acct.email")}</p>
        <p className="mt-1" dir="ltr">
          {customer.email ?? "—"}
        </p>
      </div>
      <div>
        <p className="type-meta text-muted-foreground">{t(locale, "sf.acct.phone")}</p>
        <p className="mt-1" dir="ltr">
          {customer.phone ?? "—"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">{t(locale, "sf.acct.phoneNote")}</p>
      </div>
    </div>
  );
}
