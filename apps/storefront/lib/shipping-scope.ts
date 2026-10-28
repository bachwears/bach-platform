/**
 * "Delivery within Lebanon only" (site_content 'shipping', switched and worded
 * from MGMT → محتوى الموقع). While card payments aren't live the shop can't take
 * orders from abroad, so the notice shows on the product page, bag, checkout,
 * shipping page and footer. (Checkout no longer asks for a tick: the notice above
 * the address says it, and the extra box cost orders.)
 * Switching it off (once international delivery is back) hides all of it.
 */
export interface ShippingScope {
  lebanonOnly: boolean;
  /** the short notice shown around the site */
  notice: string;
}

export const SHIPPING_DEFAULTS = {
  notice: "We currently deliver within Lebanon only.",
};

export function shippingScopeOf(value: unknown): ShippingScope {
  const v = (value ?? {}) as { lebanon_only?: boolean; notice?: string };
  return {
    lebanonOnly: v.lebanon_only === true,
    notice: v.notice?.trim() || SHIPPING_DEFAULTS.notice,
  };
}
