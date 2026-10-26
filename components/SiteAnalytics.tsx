"use client";

import { Analytics, type BeforeSendEvent } from "@vercel/analytics/next";

// Vercel Web Analytics without the plan. A plan link carries the person's
// role, situation details and dates in its hash (#p=) or, for old links, in
// ?d=. Neither should leave the browser, so every page view and milestone
// event is sent with the hash and the d parameter removed.

function scrub(event: BeforeSendEvent): BeforeSendEvent | null {
  try {
    const url = new URL(event.url);
    url.hash = "";
    url.searchParams.delete("d");
    return { ...event, url: url.toString() };
  } catch {
    // a URL that can't be parsed is dropped rather than sent as is
    return null;
  }
}

export function SiteAnalytics() {
  return <Analytics beforeSend={scrub} />;
}
