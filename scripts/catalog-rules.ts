// Offline rules for the catalog data, shared by `npm run check:catalog`
// (errors) and `npm run eval` (checks). Nothing here fetches.

import type { Course } from "../lib/course-types";

/**
 * Coursera entries allowed to keep a non-rupee price, with why. Coursera
 * prices differ by region, so the budget gate needs every entry in the same
 * region (India, like the rest). Add an id only with a reason.
 */
export const COURSERA_PRICE_ALLOWLIST: Record<string, string> = {
  "coursera-machine-learning-specialization":
    "India price not confirmed yet. It is dated for its only direction (from 2022), so the price changes no budget result.",
};

function isCoursera(c: Course): boolean {
  return /^coursera/i.test(c.provider) || /(^|\.)coursera\.org\//.test(c.url.replace(/^https?:\/\//, ""));
}

/** Problems in the catalog data itself, one line each; empty when clean. */
export function catalogDataProblems(courses: readonly Course[]): string[] {
  const out: string[] = [];
  for (const c of courses) {
    const cost = c.cost;
    if (cost && cost.model !== "free" && isCoursera(c) && cost.currency !== "INR" && !COURSERA_PRICE_ALLOWLIST[c.id]) {
      out.push(`${c.id}: Coursera price in ${cost.currency}; store the India price in INR like the other Coursera entries`);
    }
    if (cost?.note && /\bU\.S\.|United States/.test(cost.note)) {
      out.push(`${c.id}: price note names the U.S.; prices are stored for India`);
    }
    if (/\bpython\b/i.test(c.assumes) && !/no coding needed/i.test(c.assumes) && !c.requires?.includes("python")) {
      out.push(`${c.id}: assumes names Python but requires doesn't list "python"`);
    }
  }
  return out;
}
