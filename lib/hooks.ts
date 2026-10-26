"use client";

import { useSyncExternalStore } from "react";
import { displayCurrency, type DisplayCurrency } from "./format";

// Client-only hooks. Kept out of lib/format.ts because route handlers import
// that file and React's client hooks can't load in server code.

const noopSubscribe = () => () => {};
const serverCurrency = (): DisplayCurrency => "USD";

/** "INR" in India, "USD" elsewhere; "USD" during prerender and hydration, then the real value. */
export function useDisplayCurrency(): DisplayCurrency {
  return useSyncExternalStore(noopSubscribe, displayCurrency, serverCurrency);
}
