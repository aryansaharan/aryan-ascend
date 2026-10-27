import type {
  CertificateKind,
  Course,
  CourseFormat,
  CourseKind,
  Currency,
} from "./course-types";
import { BUDGET_LIMIT, convert } from "./fx";
import type { Budget, Hours } from "./profile";

// Every user-facing number and date passes through here, so the wording is the
// same on every page. No dashes, no exclamation marks.

// Currency ---------------------------------------------------------------

export type DisplayCurrency = Currency;

const INDIA_ZONES = new Set(["Asia/Kolkata", "Asia/Calcutta"]);

/**
 * "INR" for browsers in India, "USD" everywhere else. Returns "USD" on the
 * server; components use useDisplayCurrency() (lib/hooks.ts) so hydration
 * matches. Kept free of React so server code (the API route) can import this
 * file.
 */
export function displayCurrency(): DisplayCurrency {
  if (typeof window === "undefined") return "USD";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return INDIA_ZONES.has(tz) ? "INR" : "USD";
  } catch {
    return "USD";
  }
}

/** "₹1,75,560" (en-IN grouping) or "$1,995"; cents only when not whole. */
export function formatMoney(amount: number, currency: Currency): string {
  const whole = Number.isInteger(amount);
  const n = new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    minimumFractionDigits: whole ? 0 : 2,
    maximumFractionDigits: whole ? 0 : 2,
  }).format(amount);
  return `${currency === "INR" ? "₹" : "$"}${n}`;
}

/** Rounded for "about" amounts: to 1 under 100, to 10 under 10,000, else to 100. */
export function roundApprox(value: number): number {
  const step = value < 100 ? 1 : value < 10_000 ? 10 : 100;
  return Math.round(value / step) * step;
}

/** An amount converted into the display currency and rounded, e.g. "₹4,310". */
export function approxMoney(
  amount: number,
  from: Currency,
  display: Currency,
): string {
  if (from === display) return formatMoney(roundApprox(amount), display);
  return formatMoney(roundApprox(convert(amount, from, display)), display);
}

/** " (about ₹4,310)" when the source currency differs from the display one. */
export function fxSuffix(
  amount: number,
  from: Currency,
  display: Currency,
): string {
  if (from === display || amount <= 0) return "";
  return ` (about ${approxMoney(amount, from, display)})`;
}

/** The cost of finishing the scope at the user's pace (computed in lib/fit.ts). */
export type CostAtPace = {
  amount: number;
  currency: Currency;
  inr: number;
  /** months paid, monthly subscriptions only */
  months?: number;
};

/**
 * The cost line for a course card (spec section 7):
 * "Free", "Free. Certificate costs extra.", "₹499 once",
 * "₹1,888 a month, about ₹3,776 at your pace", "$1,995 a year (about ₹1,75,560)",
 * "Price not listed publicly". Pass the candidate's costAtPace when known; a
 * monthly price without one prints just the monthly rate.
 */
/** costLine says "Free. Certificate costs extra." for these, so a certificate chip would repeat it. */
export function costMentionsCertificate(c: Course): boolean {
  return c.cost?.model === "free" && c.certificate === "paid";
}

export function costLine(
  course: Course,
  pace: CostAtPace | null | undefined,
  currency: DisplayCurrency,
): string {
  const cost = course.cost;
  if (!cost) return "Price not listed publicly";
  if (cost.model === "free") {
    return course.certificate === "paid" ? "Free. Certificate costs extra." : "Free";
  }
  const src = cost.currency;
  const price = formatMoney(cost.amount, src);
  if (cost.model === "one-time") {
    return `${price} once${fxSuffix(cost.amount, src, currency)}`;
  }
  if (cost.period === "year") {
    return `${price} a year${fxSuffix(cost.amount, src, currency)}`;
  }
  const months = pace?.months;
  if (!pace || !months) {
    return `${price} a month${fxSuffix(cost.amount, src, currency)}`;
  }
  if (months === 1) {
    return `${price} a month, one month at your pace${fxSuffix(cost.amount, src, currency)}`;
  }
  return `${price} a month, about ${formatMoney(pace.amount, src)} at your pace${fxSuffix(pace.amount, src, currency)}`;
}

/**
 * The at-pace amount in the display currency, e.g. "₹3,776" or "$43": exact
 * when the price is in that currency (so it matches costLine on the same
 * card), converted and rounded otherwise.
 */
export function paceMoney(pace: CostAtPace, display: DisplayCurrency): string {
  if (pace.currency === display) {
    // paise and cents only on small amounts: "about ₹3,943", "about $59.98"
    return formatMoney(pace.amount >= 100 ? Math.round(pace.amount) : pace.amount, display);
  }
  return approxMoney(pace.amount, pace.currency, display);
}

// Budget -----------------------------------------------------------------

/** The capped amount as text, e.g. "₹5,000" or "$60"; null for free and any. */
export function budgetCap(b: Budget, currency: DisplayCurrency): string | null {
  if (b === "low" || b === "mid") return formatMoney(BUDGET_LIMIT[currency][b], currency);
  return null;
}

/** Chip label on /assess: "Free only", "Up to ₹5,000", "Up to $300", "Whatever fits best". */
export function budgetLabel(b: Budget, currency: DisplayCurrency): string {
  if (b === "free") return "Free only";
  if (b === "any") return "Whatever fits best";
  return `Up to ${budgetCap(b, currency)}`;
}

/**
 * Mid-sentence phrase: "a free budget", "a budget up to ₹5,000", "any budget".
 * Used in the read-back, the why template and the empty state.
 */
export function budgetPhrase(b: Budget, currency: DisplayCurrency): string {
  if (b === "free") return "a free budget";
  if (b === "any") return "any budget";
  return `a budget up to ${budgetCap(b, currency)}`;
}

// Hours and weeks --------------------------------------------------------

/** Chip label: "1 hr", "3 hrs", "12+ hrs". */
export function hoursChipLabel(h: Hours): string {
  if (h === 12) return "12+ hrs";
  return h === 1 ? "1 hr" : `${h} hrs`;
}

/** "1 hr a week", "3 hrs a week". */
export function hrsAWeek(h: number): string {
  return `${h} ${h === 1 ? "hr" : "hrs"} a week`;
}

/** "1 hour a week", "3 hours a week". */
export function hoursAWeek(h: number): string {
  return `${h} ${h === 1 ? "hour" : "hours"} a week`;
}

/** "1 week", "5 weeks". */
export function weeksPhrase(w: number): string {
  return `${w} ${w === 1 ? "week" : "weeks"}`;
}

/** Fact chip: "About 5 weeks at 3 hrs a week". */
export function paceLine(weeks: number, h: number): string {
  return `About ${weeksPhrase(weeks)} at ${hrsAWeek(h)}`;
}

/** "0.5 hours", "1 hour", "2.5 hours", "12 hours". */
export function hoursPhrase(x: number): string {
  const v = Math.round(x * 10) / 10;
  return `${v} ${v === 1 ? "hour" : "hours"}`;
}

/**
 * A plan week's length for display: under 2 hours in minutes, rounded to 5
 * ("40 minutes", "1 hour 40 minutes"); otherwise hours to the half ("2.5
 * hours"). Never shows less than 5 minutes.
 */
export function durationPhrase(hours: number): string {
  if (hours < 2 - 1 / 24) {
    const m = Math.max(5, Math.round((hours * 60) / 5) * 5);
    if (m < 60) return `${m} minutes`;
    const rest = m - 60;
    return rest === 0 ? "1 hour" : `1 hour ${rest} minutes`;
  }
  const h = Math.round(hours * 2) / 2;
  return `${h} hours`;
}

/** "1 course", "3 courses". */
export function countPhrase(n: number, singular: string, plural: string): string {
  return `${n} ${n === 1 ? singular : plural}`;
}

// Dates ------------------------------------------------------------------

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "YYYY-MM-DD" as local midnight (not UTC, so the day never shifts). */
export function parseLocalDate(iso: string): Date {
  const m = DATE_ONLY.exec(iso);
  if (!m) return new Date(iso);
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

/** Local calendar date as "YYYY-MM-DD". */
export function toLocalISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function toDate(value: Date | string): Date {
  return value instanceof Date ? value : parseLocalDate(value);
}

const DAY_FMT = new Intl.DateTimeFormat("en-GB", {
  weekday: "short",
  day: "numeric",
  month: "short",
});
const WEEKDAY_FMT = new Intl.DateTimeFormat("en-GB", { weekday: "short" });
const TIME_FMT = new Intl.DateTimeFormat("en-IN", {
  hour: "numeric",
  minute: "2-digit",
  hour12: true,
});
const MONTH_YEAR_FMT = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "numeric",
});
const FULL_DATE_FMT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** "Mon 27 Oct" */
export function fmtDay(value: Date | string): string {
  return DAY_FMT.format(toDate(value));
}

/** "Tue" */
export function fmtWeekday(value: Date | string): string {
  return WEEKDAY_FMT.format(toDate(value));
}

/** "8:30 pm" */
export function fmtTime(value: Date | string): string {
  return TIME_FMT.format(toDate(value)).toLowerCase();
}

/** "Tue 21 Oct, 8:30 pm" */
export function fmtDayTime(value: Date | string): string {
  return `${fmtDay(value)}, ${fmtTime(value)}`;
}

/** "Oct 2026" */
export function fmtMonthYear(value: Date | string): string {
  return MONTH_YEAR_FMT.format(toDate(value));
}

/** "20 Oct 2026" */
export function fmtDate(value: Date | string): string {
  return FULL_DATE_FMT.format(toDate(value));
}

export const STALE_DAYS = 90;

/** Whole days from a "YYYY-MM-DD" date to `now` (local calendar days). */
export function daysSince(isoDate: string, now: Date = new Date()): number {
  const then = parseLocalDate(isoDate);
  const today = parseLocalDate(toLocalISODate(now));
  return Math.round((today.getTime() - then.getTime()) / 86_400_000);
}

/** True when lastVerified is more than 90 days old. */
export function isStale(lastVerified: string, now: Date = new Date()): boolean {
  return daysSince(lastVerified, now) > STALE_DAYS;
}

/** "Checked Oct 2026", or "Checked 20 Jul 2026, may have changed" when stale. */
export function checkedLabel(course: Course, now: Date = new Date()): string {
  return isStale(course.lastVerified, now)
    ? `Checked ${fmtDate(course.lastVerified)}, may have changed`
    : `Checked ${fmtMonthYear(course.lastVerified)}`;
}

// Course facts -----------------------------------------------------------

const KIND_LABELS: Record<CourseKind, string> = {
  course: "Course",
  program: "Program",
  book: "Book",
  practice: "Practice",
  docs: "Docs",
};

const FORMAT_LABELS: Record<CourseFormat, string> = {
  "self-paced": "Self-paced",
  cohort: "Cohort",
  book: "Book",
};

export function kindLabel(kind: CourseKind): string {
  return KIND_LABELS[kind];
}

export function formatLabel(format: CourseFormat): string {
  return FORMAT_LABELS[format];
}

/** "Certificate: free", "Certificate: paid", "Certificate: none". */
export function certificateChip(cert: CertificateKind): string {
  return `Certificate: ${cert}`;
}

/**
 * What to open first, as it reads after "Open": the free start's label, with
 * "the" before labels like "Free preview of Module 1", else the title.
 */
export function startTarget(course: Pick<Course, "freeStart" | "title">): string {
  const label = course.freeStart?.label ?? course.title;
  if (!course.freeStart) return label;
  const lower = `${label.charAt(0).toLowerCase()}${label.slice(1)}`;
  if (/^(Free|Sample)\b/.test(label)) return `the ${lower}`;
  // "The whole tutorial" reads "Open the whole tutorial ..."
  return /^The\s/.test(label) ? lower : label;
}

/** "{value} from {count} ratings on {source}, checked {Mon YYYY}", or null. */
export function ratingLine(course: Course): string | null {
  const r = course.rating;
  if (!r) return null;
  const count = new Intl.NumberFormat("en-US").format(r.count);
  return `${r.value} from ${count} ratings on ${r.source}, checked ${fmtMonthYear(r.checkedOn)}`;
}

// Model ------------------------------------------------------------------

/** The model the server uses unless AI_MODEL overrides it (lib/ai.ts). */
export const DEFAULT_MODEL = "claude-opus-5-5";

/**
 * "claude-opus-5-5" to "Claude Opus 5.5", "claude-sonnet-5" to "Claude Sonnet
 * 5". Other ids (an older saved decision may name "gemini-2.5-flash") are
 * title-cased word by word.
 */
export function modelLabel(model: string = DEFAULT_MODEL): string {
  // a dated canonical id ("claude-sonnet-4-5-20250929") reads the same as its alias
  const claude = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/.exec(model);
  if (claude) {
    const [, family, major, minor] = claude;
    return `Claude ${family[0].toUpperCase()}${family.slice(1)} ${major}${minor ? `.${minor}` : ""}`;
  }
  return model
    .split("-")
    .filter(Boolean)
    .map((w) => (/^[a-z]/.test(w) ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");
}
