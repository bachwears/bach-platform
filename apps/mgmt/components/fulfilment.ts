import { STATUS_LABELS } from "../lib/order-status";

/**
 * Pickup orders reuse the online status path: after «جاهز» (packed) the order
 * moves to 'shipped', which for a pickup means "ready for pickup", and
 * 'delivered' means the customer collected it.
 */
export const PICKUP_STATUS_LABELS: Record<string, string> = {
  shipped: "جاهز للاستلام",
  delivered: "انستلم",
};

export function statusLabelFor(status: string, fulfilment?: string | null): string {
  if (fulfilment === "pickup" && PICKUP_STATUS_LABELS[status]) return PICKUP_STATUS_LABELS[status]!;
  return STATUS_LABELS[status] ?? status;
}

export const PICKUP_BADGE = "استلام من المحل";
