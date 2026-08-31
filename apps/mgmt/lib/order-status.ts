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
