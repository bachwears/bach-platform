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

/** Transitions managers may apply from each status (terminal states stay terminal). */
export const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["picking", "cancelled"],
  picking: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: ["completed", "returned", "exchanged"],
  completed: ["returned", "exchanged"],
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
