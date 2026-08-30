import type { Currency, Money } from "@bach/types";

/** Minor units per major unit. LBP is transacted in whole pounds. */
const MINOR_PER_MAJOR: Record<Currency, number> = {
  USD: 100,
  LBP: 1,
};

export function money(amountMinor: number, currency: Currency): Money {
  if (!Number.isSafeInteger(amountMinor)) {
    throw new Error(`Money must be an integer of minor units, got ${amountMinor}`);
  }
  return { amountMinor, currency };
}

export function add(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor + b.amountMinor, a.currency);
}

export function subtract(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amountMinor - b.amountMinor, a.currency);
}

/** Percentage application with banker-safe integer rounding (e.g., TVA, discounts). */
export function applyPercent(a: Money, percentBasisPoints: number): Money {
  if (!Number.isSafeInteger(percentBasisPoints)) {
    throw new Error("Percent must be integer basis points (e.g., 11% = 1100)");
  }
  const raw = (a.amountMinor * percentBasisPoints) / 10_000;
  return money(Math.round(raw), a.currency);
}

/** Convert USD → LBP at a captured rate. Rate history is stored per transaction. */
export function usdToLbp(a: Money, lbpPerUsd: number): Money {
  if (a.currency !== "USD") throw new Error("usdToLbp expects USD input");
  const usdMajor = a.amountMinor / MINOR_PER_MAJOR.USD;
  return money(Math.round(usdMajor * lbpPerUsd), "LBP");
}

export function format(a: Money, locale: "en" | "ar" = "en"): string {
  const major = a.amountMinor / MINOR_PER_MAJOR[a.currency];
  return new Intl.NumberFormat(locale === "ar" ? "ar-LB" : "en-LB", {
    style: "currency",
    currency: a.currency,
    maximumFractionDigits: a.currency === "LBP" ? 0 : 2,
  }).format(major);
}

function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(`Currency mismatch: ${a.currency} vs ${b.currency}`);
  }
}
