/**
 * The till receipt (C200I thermal printer: 80mm roll, ~72mm printable) — shared
 * by the cashier after a sale and by the invoice archive for reprints.
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
  number: number | null;
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

export function ReceiptView({
  receipt,
  branchName,
  copy = false,
}: {
  receipt: ReceiptData;
  branchName: string;
  /** a reprint: marked so it can't pass for a second original */
  copy?: boolean;
}) {
  return (
    <>
      <style>{`@media print { @page { size: 80mm auto; margin: 0; } .receipt-80 { width: 72mm; margin: 0 auto; font-size: 11px; } }`}</style>
      <div className="receipt-80 rounded-lg border p-6 print:rounded-none print:border-0 print:p-1" dir="ltr">
        <div className="text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-bach.png" alt="BACH WEARS" className="mx-auto h-5 w-auto" />
          <p className="text-sm text-muted-foreground">{branchName}</p>
          {copy ? (
            <p className="mx-auto mt-2 w-fit border border-current px-2 text-xs font-semibold tracking-widest">
              COPY / نسخة
            </p>
          ) : null}
          {receipt.number != null ? (
            <p className="mt-2 font-mono text-lg">Invoice #{receipt.number}</p>
          ) : (
            <p className="mt-2 font-mono text-lg">OFFLINE-{receipt.offlineRef}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {(receipt.date ? new Date(receipt.date) : new Date()).toLocaleString("en-GB")}
          </p>
        </div>
        <div className="my-4 border-t border-dashed" />
        {receipt.lines.map((l) => (
          <div key={l.key} className="flex justify-between py-1 text-sm">
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
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span className="font-mono">
              {usd(receipt.total)} / LBP {((receipt.total / 100) * receipt.rate).toLocaleString("en-US")}
            </span>
          </div>
          {receipt.paidUsdCents > 0 && <Row label="Paid USD" value={usd(receipt.paidUsdCents)} />}
          {receipt.paidLbp > 0 && <Row label="Paid LBP" value={`LBP ${receipt.paidLbp.toLocaleString("en-US")}`} />}
          {receipt.changeLbp > 0 && <Row label="Change (LBP)" value={`LBP ${receipt.changeLbp.toLocaleString("en-US")}`} />}
          {(receipt.extraRows ?? []).map((r) => (
            <Row key={r.label} label={r.label} value={r.value} />
          ))}
          <p className="pt-2 text-center text-xs text-muted-foreground">
            Exchange rate: LBP {receipt.rate.toLocaleString("en-US")} / $
          </p>
        </div>
        {receipt.number == null && (
          <p className="mt-3 text-center text-xs text-muted-foreground" dir="rtl">
            رقم مؤقت — الفاتورة الرسمية بتنسجّل تلقائيًا لما يرجع النت.
          </p>
        )}
        <p className="mt-4 text-center text-xs text-muted-foreground">Thank you for shopping with us.</p>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-mono">{value}</span>
    </div>
  );
}
