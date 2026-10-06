import { Icon, type IconName } from "./icon";

const STATUS: Record<string, { ar: string; icon: IconName; tone?: "bad" | "done" | "new" }> = {
  // new orders stand out: they need someone to act
  pending: { ar: "جديد", icon: "statusPending", tone: "new" },
  confirmed: { ar: "مؤكّد", icon: "statusConfirmed" },
  picking: { ar: "قيد التجهيز", icon: "statusPicking" },
  packed: { ar: "جاهز", icon: "statusPacked" },
  shipped: { ar: "بالشحن", icon: "statusShipped" },
  delivered: { ar: "وصل", icon: "statusDelivered", tone: "done" },
  completed: { ar: "مكتمل", icon: "statusCompleted", tone: "done" },
  cancelled: { ar: "ملغى", icon: "statusCancelled", tone: "bad" },
  returned: { ar: "مرتجع", icon: "statusReturned", tone: "bad" },
  exchanged: { ar: "مبدّل", icon: "statusExchanged" },
};
// pickup orders walk the same path: shipped = ready for pickup, delivered = collected
const PICKUP: Record<string, { ar: string; icon: IconName }> = {
  shipped: { ar: "جاهز للاستلام", icon: "statusReadyPickup" },
  delivered: { ar: "انستلم", icon: "statusDelivered" },
};

export function orderStatusLabel(status: string, fulfilment?: string | null): string {
  return (fulfilment === "pickup" ? PICKUP[status]?.ar : undefined) ?? STATUS[status]?.ar ?? status;
}

/** An order's status, the same everywhere: icon + Arabic word in a hairline box. */
export function OrderStatus({ status, fulfilment, className = "" }: { status: string; fulfilment?: string | null; className?: string }) {
  const s = STATUS[status];
  const p = fulfilment === "pickup" ? PICKUP[status] : undefined;
  const tone =
    s?.tone === "new"
      ? "border-foreground bg-foreground text-background"
      : s?.tone === "bad"
        ? "border-destructive/60 text-destructive"
        : s?.tone === "done"
          ? "border-foreground/40"
          : "";
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-0.5 text-xs ${tone} ${className}`}>
      <Icon name={p?.icon ?? s?.icon ?? "statusPending"} size={14} />
      {p?.ar ?? s?.ar ?? status}
    </span>
  );
}
