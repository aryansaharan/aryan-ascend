import { djb2Key } from "./hash";

// The catalog's shape. lib/courses.ts holds the data and must only ever export
// COURSES and CATALOG_VERSION built from this type, so the data file can be
// swapped for a re-verified one without touching any code. The URLs each
// entry was verified against live in lib/course-sources.ts (scripts only).

export const MOVE_IDS = [
  "ai-build",
  "ai-pm",
  "product",
  "data",
  "ux",
  "lead",
  "growth",
  "cloud",
] as const;

export type MoveId = (typeof MOVE_IDS)[number];
export type Baseline = 0 | 1 | 2;
export type Currency = "INR" | "USD";

export type CourseKind = "course" | "program" | "book" | "practice" | "docs";
export type CourseFormat = "self-paced" | "cohort" | "book";
export type CertificateKind = "none" | "free" | "paid";

export type CourseModule = { name: string; hours: number; part?: string };

export type MoveEntry = {
  move: MoveId;
  role: "core" | "supporting";
  baseline: Baseline;
};

/**
 * Price as listed by the provider. `null` on the course means the price is not
 * listed publicly. Amount and currency exist on every paid model; `period` only
 * on subscriptions.
 */
export type CourseCost =
  | { model: "free"; note?: string }
  | { model: "one-time"; amount: number; currency: Currency; note?: string }
  | {
      model: "subscription";
      amount: number;
      currency: Currency;
      period: "month" | "year";
      note?: string;
    };

export type FreeStart = { label: string; url: string; minutes: number };

export type CourseRating = {
  value: number;
  count: number;
  source: string;
  url: string;
  checkedOn: string;
};

export type Course = {
  /** kebab-case, stable forever */
  id: string;
  /** exactly as on the provider page */
  title: string;
  /** current name (e.g. "ThoughtSpot", not "Mode") */
  provider: string;
  /** canonical page, verified 200, not a homepage redirect */
  url: string;
  kind: CourseKind;
  format: CourseFormat;
  moves: MoveEntry[];
  /** hand-written, one plain line: "You can write a basic SQL join." */
  assumes: string;
  /**
   * Structured prerequisites behind `assumes`, for code to check against what
   * the person wrote (lib/fit prereqsMissing). Required by check:catalog
   * whenever `assumes` names Python.
   */
  requires?: "python"[];
  /** hand-written, one line; the fallback "why" */
  bestFor: string;
  /** real names, in order, at least 1 */
  modules: CourseModule[];
  /** remainder after the listed modules, e.g. later courses of a certificate */
  beyond?: { label: string; hours: number };
  hoursSource: "provider" | "estimate";
  cost: CourseCost | null;
  certificate: CertificateKind;
  freeStart: FreeStart | null;
  updatedYear: number;
  rating?: CourseRating;
  /** lowercase regex source, tie-break only, e.g. "react|frontend|javascript" */
  roleHints?: string;
  /** "YYYY-MM-DD" */
  lastVerified: string;
};

/** Hours across the listed modules plus `beyond`. */
export function totalHours(c: Course): number {
  const listed = c.modules.reduce((sum, m) => sum + m.hours, 0);
  return round2(listed + (c.beyond?.hours ?? 0));
}

/** Hours across the first `n` listed modules. */
export function prefixHours(c: Course, n: number): number {
  return round2(
    c.modules.slice(0, Math.max(0, n)).reduce((sum, m) => sum + m.hours, 0),
  );
}

/**
 * 6-char fingerprint of the outline (module names and hours, in order). A plan
 * stores it so the plan page can tell when a course's outline changed.
 */
export function outlineHash(c: Course): string {
  const text = c.modules.map((m) => `${m.name}|${m.hours}`).join("\n");
  return djb2Key(text).slice(-6);
}

/** Avoids 0.1 + 0.2 noise in summed hours. */
export function round2(x: number): number {
  return Math.round(x * 100) / 100;
}
