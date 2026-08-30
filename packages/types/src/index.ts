/** Currencies supported platform-wide. LBP has no minor unit in practice; USD uses cents. */
export type Currency = "USD" | "LBP";

/**
 * Money is ALWAYS integer minor units (USD cents, LBP pounds).
 * Floating-point money is forbidden everywhere in the platform.
 */
export interface Money {
  amountMinor: number;
  currency: Currency;
}

/** Exchange rate snapshot captured per transaction (manual-managed rate with history). */
export interface ExchangeRate {
  id: string;
  lbpPerUsd: number;
  effectiveAt: string;
}

export type AppRole =
  | "super_admin"
  | "store_manager"
  | "inventory_manager"
  | "cashier"
  | "support_agent"
  | "marketing_manager";

export type Season = "winter" | "spring" | "summer" | "autumn" | "all-season";

export interface Branch {
  id: string;
  name: string;
  isActive: boolean;
}
