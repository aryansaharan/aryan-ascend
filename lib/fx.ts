import type { Currency } from "./course-types";

// One fixed rate, set by hand on a known date, never fetched live. It is used
// to compare USD prices against a rupee budget and for the "(about ₹X)" and
// "(about $X)" suffixes. The compare page footnote prints the rate and date.
// Catalog-free on purpose: lib/format imports the budget amounts from here.
//
// RBI reference rate for 19 Oct 2026 (via the MSEI archive of RBI rates).
export const USD_INR: { rate: number; setOn: string } = {
  rate: 94.77,
  setOn: "2026-10-19",
};

/** Converts to rupees at USD_INR.rate, rounded to the nearest rupee. */
export function toINR(amount: number, currency: Currency): number {
  return currency === "INR" ? amount : Math.round(amount * USD_INR.rate);
}

/** Converts to dollars at USD_INR.rate, rounded to the cent. */
export function toUSD(amount: number, currency: Currency): number {
  return currency === "USD"
    ? amount
    : Math.round((amount / USD_INR.rate) * 100) / 100;
}

/** Converts between the two currencies (identity when they match). */
export function convert(amount: number, from: Currency, to: Currency): number {
  return to === "INR" ? toINR(amount, from) : toUSD(amount, from);
}

/**
 * The capped budgets as the chips show them, in each display currency
 * ("Up to ₹5,000" or "Up to $60"). The budget chip labels (lib/format) and the
 * gate (lib/fit) both read these, so a label can't drift from the check.
 */
export const BUDGET_LIMIT = {
  INR: { low: 5000, mid: 25000 },
  USD: { low: 60, mid: 300 },
} as const satisfies Record<Currency, { low: number; mid: number }>;

/**
 * The limit the gate compares in rupees: the amount on the chip the user saw,
 * converted at USD_INR.rate for USD users. A course at or under the chip
 * amount always passes.
 */
export function budgetLimitInr(b: "low" | "mid", currency: Currency): number {
  return currency === "USD" ? Math.round(BUDGET_LIMIT.USD[b] * USD_INR.rate) : BUDGET_LIMIT.INR[b];
}
