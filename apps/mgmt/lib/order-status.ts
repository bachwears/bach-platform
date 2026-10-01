export const STATUS_LABELS: Record<string, string> = {
  pending: "جديد",
  confirmed: "مؤكّد",
  picking: "قيد التجهيز",
  packed: "جاهز",
  shipped: "بالشحن",
  delivered: "وصل",
  completed: "مكتمل",
  cancelled: "ملغى",
  returned: "مرتجع",
  exchanged: "مبدّل",
};

/**
 * Online-order steps staff may take from each status — mirrors the
 * advance_online_order RPC, which also moves stock: packing turns the
 * reservation into a sale, cancelling (before packing) releases it.
 * Returns and exchanges go through the returns flow (restock + refund),
 * never a bare status change.
 */
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["picking", "cancelled"],
  picking: ["packed", "cancelled"],
  packed: ["shipped"],
  shipped: ["delivered"],
  delivered: ["completed"],
  completed: [],
  cancelled: [],
  returned: [],
  exchanged: [],
};

/** How an order was (or will be) paid — orders.payment_method / order_payments.method. */
export const PAYMENT_LABELS: Record<string, string> = {
  cash: "كاش",
  cod: "كاش عند التسليم",
  whish: "Whish",
  stripe: "بطاقة",
  wallet: "المحفظة",
};

export function paymentLabel(method: string | null | undefined): string {
  return method ? (PAYMENT_LABELS[method] ?? method) : "—";
}
