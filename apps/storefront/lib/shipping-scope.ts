/**
 * "Delivery within Lebanon only" (site_content 'shipping', switched and worded
 * from MGMT → محتوى الموقع). While card payments aren't live the shop can't take
 * orders from abroad, so the notice shows on the product page, bag, checkout,
 * shipping page and footer, and checkout asks the customer to confirm.
 * Switching it off (once international delivery is back) hides all of it.
 */
export interface ShippingScope {
  lebanonOnly: boolean;
  /** the short notice shown around the site */
  notice: string;
  /** the tick box at checkout */
  confirm: string;
}

export const SHIPPING_DEFAULTS = {
  notice: "We currently deliver within Lebanon only.",
  confirm: "I confirm my delivery address is in Lebanon.",
};

export function shippingScopeOf(value: unknown): ShippingScope {
  const v = (value ?? {}) as { lebanon_only?: boolean; notice?: string; confirm?: string };
  return {
    lebanonOnly: v.lebanon_only === true,
    notice: v.notice?.trim() || SHIPPING_DEFAULTS.notice,
    confirm: v.confirm?.trim() || SHIPPING_DEFAULTS.confirm,
  };
}
