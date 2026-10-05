"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@bach/supabase/browser";
import { t, type Locale } from "@bach/i18n";

import { lhref } from "../lib/locale-client";

const SAVE = "type-label h-11 shrink-0 bg-foreground px-8 text-background hover:opacity-90 disabled:opacity-40";
const FIELD =
  "h-11 w-full border-0 border-b border-border bg-transparent px-0 text-sm outline-none transition-colors focus:border-foreground";

/** Why the database refused a deletion → what the customer can do about it. */
function refusal(locale: Locale, message: string): string {
  if (message.includes("wallet balance")) return t(locale, "sf.privacy.errWallet");
  if (message.includes("top-up pending")) return t(locale, "sf.privacy.errTopup");
  if (message.includes("order still open")) return t(locale, "sf.privacy.errOrder");
  return t(locale, "sf.privacy.errGeneric");
}

/**
 * Privacy tools: download everything we hold as one JSON file, or delete the
 * account (typed confirmation). Deletion anonymises the customer record — orders
 * stay for the accounts, under "Deleted customer" — and removes the login.
 */
export function AccountPrivacy({ locale }: { locale: Locale }) {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [asking, setAsking] = useState(false);
  const [typed, setTyped] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  async function download() {
    setExporting(true);
    setExportMsg(null);
    const { data, error } = await supabaseBrowser().rpc("export_my_data");
    setExporting(false);
    if (error || !data) {
      setExportMsg({
        ok: false,
        text: error?.message.includes("too many") ? t(locale, "sf.privacy.errTooMany") : t(locale, "sf.privacy.errExport"),
      });
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bach-wears-my-data-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setExportMsg({ ok: true, text: t(locale, "sf.privacy.downloaded") });
  }

  async function remove() {
    if (typed !== "DELETE") return;
    setDeleting(true);
    setDeleteError("");
    const supabase = supabaseBrowser();
    const { error } = await supabase.rpc("delete_my_account");
    if (error) {
      setDeleting(false);
      setDeleteError(refusal(locale, error.message));
      return;
    }
    // the login is gone server-side; only this browser's copy of the session is left
    await supabase.auth.signOut({ scope: "local" });
    router.replace(lhref(locale, "/"));
  }

  return (
    <div className="max-w-md space-y-10">
      <div>
        <p className="type-meta">{t(locale, "sf.privacy.downloadTitle")}</p>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{t(locale, "sf.privacy.downloadBody")}</p>
        <button type="button" className={`${SAVE} mt-4`} disabled={exporting} onClick={() => void download()}>
          {exporting ? t(locale, "sf.privacy.preparing") : t(locale, "sf.privacy.download")}
        </button>
        {exportMsg && (
          <p role={exportMsg.ok ? "status" : "alert"} className={`mt-3 text-xs ${exportMsg.ok ? "text-muted-foreground" : "text-destructive"}`}>
            {exportMsg.text}
          </p>
        )}
      </div>

      <div className="border-t pt-8">
        <p className="type-meta">{t(locale, "sf.privacy.deleteTitle")}</p>
        {!asking ? (
          <button
            type="button"
            className="type-meta mt-3 underline underline-offset-4 hover:opacity-60"
            onClick={() => setAsking(true)}
          >
            {t(locale, "sf.privacy.deleteStart")}
          </button>
        ) : (
          <div className="mt-3 space-y-4">
            <ul className="list-disc space-y-1 ps-4 text-xs leading-relaxed text-muted-foreground">
              <li>{t(locale, "sf.privacy.deleteGone")}</li>
              <li>{t(locale, "sf.privacy.deleteKept")}</li>
              <li>{t(locale, "sf.privacy.deletePoints")}</li>
              <li>{t(locale, "sf.privacy.deleteFinal")}</li>
            </ul>
            <label className="block">
              <span className="type-meta text-muted-foreground">{t(locale, "sf.privacy.typeDelete")}</span>
              <input
                className={FIELD}
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                dir="ltr"
              />
            </label>
            {deleteError && (
              <p role="alert" className="text-xs text-destructive">
                {deleteError}
              </p>
            )}
            <div className="flex flex-wrap items-center gap-6">
              <button
                type="button"
                className="type-label h-11 shrink-0 border border-destructive px-8 text-destructive hover:bg-destructive hover:text-background disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-destructive"
                disabled={typed !== "DELETE" || deleting}
                onClick={() => void remove()}
              >
                {deleting ? t(locale, "sf.privacy.deleting") : t(locale, "sf.privacy.deleteConfirm")}
              </button>
              <button
                type="button"
                className="type-meta underline underline-offset-4 hover:opacity-60"
                onClick={() => {
                  setAsking(false);
                  setTyped("");
                  setDeleteError("");
                }}
              >
                {t(locale, "sf.privacy.keep")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
