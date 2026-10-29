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

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

function subscribeReducedMotion(onChange: () => void): () => void {
  const mq = window.matchMedia(REDUCED_MOTION);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
}

/** True when the system asks for reduced motion; false during prerender and hydration. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => false,
  );
}
