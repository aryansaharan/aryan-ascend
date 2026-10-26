import { pageview } from "@vercel/analytics";

// The North Star without a database (spec 6.6): virtual page views that show
// up in Vercel Web Analytics. Started-in-48h rate = /m/started-48h over /m/booked.
// "/m/understood" fires when the confirm screen is accepted (addendum-ai), so
// the drop between reading a situation and seeing a pick is visible too.

export type Milestone = "understood" | "pick" | "booked" | "started" | "started-48h";

const fired = new Set<string>();

/**
 * Records one milestone as a page view of /m/{milestone}. Pass `onceKey`
 * (a decision key or plan id) to fire at most once per page load for it,
 * which also covers React's double effects in development.
 */
export function trackMilestone(milestone: Milestone, onceKey?: string): void {
  if (typeof window === "undefined") return;
  const key = `${milestone}:${onceKey ?? ""}`;
  if (onceKey !== undefined) {
    if (fired.has(key)) return;
    fired.add(key);
  }
  try {
    const path = `/m/${milestone}`;
    pageview({ route: path, path });
  } catch {
    // analytics must never break the page
  }
}
