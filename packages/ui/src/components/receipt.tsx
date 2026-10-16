"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "@bach/supabase/browser";

import { invoiceNo } from "../lib/invoice-number";
import { DEFAULT_INVOICE_SETTINGS, cachedInvoiceConfig, loadInvoiceConfig, type InvoiceConfig } from "../lib/invoice-settings";

/**
 * The till receipt (C200I thermal printer: 80mm roll, ~72mm printable; 58mm
 * rolls supported) — shared by the POS after a sale, the invoice archive for
 * reprints, and the MGMT invoice settings preview. What it prints around the
 * sale (logo, shop details, LBP total, policy line, footer) comes from MGMT →
 * إعدادات الفاتورة; the POS caches the last settings so it prints offline too.
 */

export interface ReceiptLine {
  key: string;
  nameEn: string;
  size: string;
  colorEn: string;
  quantity: number;
  unitUsdCents: number;
}

export interface ReceiptData {
  /** the order number (customer reference) */
  number: number | null;
  /** the gapless invoice number (null on an offline sale until it syncs) */
  invoiceNumber?: number | null;
  offlineRef?: string;
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  tva: number;
  total: number;
  paidUsdCents: number;
  paidLbp: number;
  changeLbp: number;
  rate: number;
  /** when the sale happened (ISO); a fresh sale prints "now" */
  date?: string;
  /** other recorded payments on a reprint (e.g. store credit) */
  extraRows?: Array<{ label: string; value: string }>;
}

function usd(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

/** The saved settings: this device's last copy at once, the current ones as soon as they load. */
export function useInvoiceConfig(): InvoiceConfig {
  // defaults on the first render (same on server and client), then the cache, then fresh
  const [config, setConfig] = useState<InvoiceConfig>({ settings: DEFAULT_INVOICE_SETTINGS, returns: null });
  useEffect(() => {
    setConfig(cachedInvoiceConfig());
    void loadInvoiceConfig(supabaseBrowser()).then(setConfig);
  }, []);
  return config;
}

export function ReceiptView({
  receipt,
  branchName,
  copy = false,
  config,
}: {
  receipt: ReceiptData;
  branchName: string;
  /** a reprint: marked so it can't pass for a second original */
  copy?: boolean;
  /** settings to print with (the MGMT preview passes the form's); else the saved ones */
  config?: InvoiceConfig;
}) {
  const saved = useInvoiceConfig();
  const { settings: s, returns } = config ?? saved;
  const width = s.paper === "58" ? "48mm" : "72mm";
  const details = [s.address, s.phone, [s.website, s.instagram ? `@${s.instagram.replace(/^@/, "")}` : ""].filter(Boolean).join(" · ")].filter(
    (x) => x && x.trim(),
  );

  return (
    <>
      <style>{`@media print { @page { size: ${s.paper === "58" ? "58mm" : "80mm"} auto; margin: 0; } .receipt-roll { width: ${width}; margin: 0 auto; font-size: ${s.paper === "58" ? "10px" : "11px"}; } }`}</style>
      <div className="receipt-roll border p-6 print:border-0 print:p-1" dir="ltr">
        <div className="text-center">
          {s.show_logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/logo-bach.png" alt={s.business_name || "BACH WEARS"} className="mx-auto h-5 w-auto" />
          ) : (
            <p className="text-base font-bold tracking-widest">{s.business_name || "BACH WEARS"}</p>
          )}
          {details.map((d) => (
            <p key={d} className="text-xs text-muted-foreground">
              {d}
            </p>
          ))}
          {s.tax_id.trim() ? <p className="text-xs text-muted-foreground">Reg. No. {s.tax_id}</p> : null}
          {s.show_branch && branchName ? <p className="text-sm text-muted-foreground">{branchName}</p> : null}
          {copy ? (
            <p className="mx-auto mt-2 w-fit border border-current px-2 text-xs font-semibold tracking-widest">
              COPY / نسخة
            </p>
          ) : null}
          {receipt.invoiceNumber != null ? (
            <>
              <p className="mt-2 font-mono text-lg">Invoice No. {invoiceNo(receipt.invoiceNumber)}</p>
              {receipt.number != null && <p className="font-mono text-xs">Order #{receipt.number}</p>}
            </>
          ) : receipt.number != null ? (
            <p className="mt-2 font-mono text-lg">Order #{receipt.number}</p>
          ) : (
            <p className="mt-2 font-mono text-lg">OFFLINE-{receipt.offlineRef}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {(receipt.date ? new Date(receipt.date) : new Date()).toLocaleString("en-GB")}
          </p>
        </div>
        <div className="my-4 border-t border-dashed" />
        {receipt.lines.map((l) => (
          <div key={l.key} className="flex justify-between gap-2 py-1 text-sm">
            <span>
              {l.nameEn} — {l.size} {l.colorEn} × {l.quantity}
            </span>
            <span className="font-mono">{usd(l.unitUsdCents * l.quantity)}</span>
          </div>
        ))}
        <div className="my-4 border-t border-dashed" />
        <div className="space-y-1 text-sm">
          <Row label="Subtotal" value={usd(receipt.subtotal)} />
          {receipt.discount > 0 && <Row label="Discount" value={`- ${usd(receipt.discount)}`} />}
          {receipt.tva > 0 && <Row label="TVA" value={usd(receipt.tva)} />}
          <div className="flex justify-between gap-2 text-base font-bold">
            <span>Total</span>
            <span className="text-end font-mono">
              {usd(receipt.total)}
              {s.show_lbp_total ? ` / LBP ${Math.round((receipt.total / 100) * receipt.rate).toLocaleString("en-US")}` : ""}
            </span>
          </div>
          {receipt.paidUsdCents > 0 && <Row label="Paid USD" value={usd(receipt.paidUsdCents)} />}
          {receipt.paidLbp > 0 && <Row label="Paid LBP" value={`LBP ${receipt.paidLbp.toLocaleString("en-US")}`} />}
          {receipt.changeLbp > 0 && <Row label="Change (LBP)" value={`LBP ${receipt.changeLbp.toLocaleString("en-US")}`} />}
          {(receipt.extraRows ?? []).map((r) => (
            <Row key={r.label} label={r.label} value={r.value} />
          ))}
          {s.show_rate ? (
            <p className="pt-2 text-center text-xs text-muted-foreground">
              Exchange rate: LBP {receipt.rate.toLocaleString("en-US")} / $
            </p>
          ) : null}
        </div>
        {receipt.number == null && (
          <p className="mt-3 text-center text-xs text-muted-foreground" dir="rtl">
            رقم مؤقت — الفاتورة الرسمية بتنسجّل تلقائيًا لما يرجع النت.
          </p>
        )}
        {s.show_policy && returns ? (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Returns within {returns.return_days} days · exchange within {returns.exchange_days} days, with this receipt.
          </p>
        ) : null}
        {s.footer_en.trim() ? <p className="mt-4 text-center text-xs text-muted-foreground">{s.footer_en}</p> : null}
        {s.footer_ar.trim() ? (
          <p className="mt-1 text-center text-xs text-muted-foreground" dir="rtl">
            {s.footer_ar}
          </p>
        ) : null}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
