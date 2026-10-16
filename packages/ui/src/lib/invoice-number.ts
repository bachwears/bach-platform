/** Invoice numbers print zero-padded, the way shop receipts do: 16 → "000016". */
export function invoiceNo(n: number | null | undefined): string {
  return n == null ? "—" : String(n).padStart(6, "0");
}
