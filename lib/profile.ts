import { COURSES } from "./courses";
import type { Baseline, MoveId } from "./course-types";
import { isAvailableMove, isMoveId } from "./moves";
import { BUDGET_LIMIT } from "./fx";
import { cleanGaps, type SkillId } from "./skills";

// The profile: the situation the user wrote, what Ascend understood from it
// (direction, starting point, gaps, strengths, courses they mentioned), plus
// hours and budget, and the adjust chips from "Not quite right?". Pure types
// and guards, safe on server and client. The zod schemas that validate request
// bodies live in lib/request-schemas.ts.

export const HOURS = [1, 2, 3, 5, 8, 12] as const;
export type Hours = (typeof HOURS)[number];

/**
 * Stored currency-neutral. The gate compares in rupees against the chip the
 * user saw: ₹5,000 / ₹25,000, or $60 / $300 converted (lib/fx.ts budgetLimitInr).
 */
export const BUDGETS = ["free", "low", "mid", "any"] as const;
export type Budget = (typeof BUDGETS)[number];

export { BUDGET_LIMIT, budgetLimitInr } from "./fx";

/** Upper limits in rupees for INR users. USD users get BUDGET_LIMIT.USD, converted. */
export const BUDGET_LIMIT_INR = BUDGET_LIMIT.INR;

/** "Cheaper" chip and relaxation order: any, mid, low, free. */
export function budgetStepDown(b: Budget): Budget {
  return b === "any" ? "mid" : b === "mid" ? "low" : "free";
}

export function budgetStepUp(b: Budget): Budget | null {
  return b === "free" ? "low" : b === "low" ? "mid" : b === "mid" ? "any" : null;
}

export const PREFERS_FORMATS = ["any", "hands-on", "reading", "video", "cohort"] as const;
export type PrefersFormat = (typeof PREFERS_FORMATS)[number];

export const MENTION_STATUSES = ["considering", "started", "finished", "dropped"] as const;
export type MentionStatus = (typeof MENTION_STATUSES)[number];

/** Caps shared by the zod schemas, the verifiers and toProfileV2. */
export const LIMITS = {
  situationMin: 20,
  situationMax: 800,
  roleMax: 120,
  gapsMax: 5,
  strengthsMax: 4,
  strengthLabelMax: 40,
  quoteMax: 160,
  mentionedMax: 5,
  mentionTextMax: 80,
} as const;

/** Something they already have, with the words they used for it. */
export type Strength = { label: string; quote: string };

/** A course or resource they named. courseId is a catalog id, or null when it isn't in the catalog. */
export type Mention = { text: string; courseId: string | null; status: MentionStatus };

/** The fields the rules engine has always used. */
export type ProfileBase = {
  v: 2;
  /** short role line, 1..120 characters */
  currentRole: string;
  move: MoveId;
  baseline: Baseline;
  hoursPerWeek: Hours;
  budget: Budget;
};

/** What the situation step and the understanding added (addendum-ai). */
export type ProfileExtras = {
  /** the user's own words, up to 800 characters */
  situation: string;
  /** ranked, from the move's vocabulary, 0..5; the first is the one to close first */
  gaps: SkillId[];
  /** 0..4, each quote copied from the situation */
  strengths: Strength[];
  /** 0..5 */
  mentioned: Mention[];
  wantsCertificate: boolean;
  prefersFormat: PrefersFormat;
  /** "ai" when the user confirmed what the AI read, "user" when they set it by hand */
  understoodBy: "ai" | "user";
};

export type ProfileV2 = ProfileBase & ProfileExtras;

/**
 * What the pure engine functions (fit, rules, templates) accept: the base
 * fields, with the newer ones optional. Every ProfileV2 is a FitProfile.
 */
export type FitProfile = ProfileBase & Partial<ProfileExtras>;

export type Adjust = {
  shorter: boolean;
  cheaper: boolean;
  certificate: boolean;
  baselineShift: -1 | 0 | 1;
};

export const NO_ADJUST: Adjust = {
  shorter: false,
  cheaper: false,
  certificate: false,
  baselineShift: 0,
};

// Guards ----------------------------------------------------------------------

export function isHours(value: unknown): value is Hours {
  return (HOURS as readonly unknown[]).includes(value);
}

export function isBudget(value: unknown): value is Budget {
  return (BUDGETS as readonly unknown[]).includes(value);
}

export function isBaseline(value: unknown): value is Baseline {
  return value === 0 || value === 1 || value === 2;
}

export function isPrefersFormat(value: unknown): value is PrefersFormat {
  return (PREFERS_FORMATS as readonly unknown[]).includes(value);
}

export function isMentionStatus(value: unknown): value is MentionStatus {
  return (MENTION_STATUSES as readonly unknown[]).includes(value);
}

const COURSE_IDS = new Set(COURSES.map((c) => c.id));

function str(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max).trim() : "";
}

/** Valid strengths only, capped. */
export function cleanStrengths(value: unknown): Strength[] {
  if (!Array.isArray(value)) return [];
  const out: Strength[] = [];
  for (const x of value) {
    if (!x || typeof x !== "object") continue;
    const label = str((x as Strength).label, LIMITS.strengthLabelMax);
    const quote = str((x as Strength).quote, LIMITS.quoteMax);
    if (label && quote) out.push({ label, quote });
    if (out.length >= LIMITS.strengthsMax) break;
  }
  return out;
}

/** Valid mentions only, capped; unknown course ids become null. */
export function cleanMentioned(value: unknown): Mention[] {
  if (!Array.isArray(value)) return [];
  const out: Mention[] = [];
  for (const x of value) {
    if (!x || typeof x !== "object") continue;
    const m = x as Partial<Mention>;
    const text = str(m.text, LIMITS.mentionTextMax);
    if (!text) continue;
    const courseId =
      typeof m.courseId === "string" && COURSE_IDS.has(m.courseId) ? m.courseId : null;
    out.push({ text, courseId, status: isMentionStatus(m.status) ? m.status : "considering" });
    if (out.length >= LIMITS.mentionedMax) break;
  }
  return out;
}

/**
 * Narrows anything (a stored draft, a decoded payload) to a complete, valid
 * profile, or null. Only moves that currently pass MIN_ENTRIES count. The
 * newer fields are optional on input and fall back to empty defaults, so an
 * older draft with just the five answers still works.
 */
export function toProfileV2(value: unknown): ProfileV2 | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const role = str(v.currentRole, LIMITS.roleMax);
  if (role.length < 1) return null;
  if (!isMoveId(v.move) || !isAvailableMove(v.move)) return null;
  if (!isBaseline(v.baseline)) return null;
  if (!isHours(v.hoursPerWeek)) return null;
  if (!isBudget(v.budget)) return null;
  return normalizeProfile({
    v: 2,
    currentRole: role,
    move: v.move,
    baseline: v.baseline,
    hoursPerWeek: v.hoursPerWeek,
    budget: v.budget,
    situation: typeof v.situation === "string" ? v.situation : undefined,
    gaps: Array.isArray(v.gaps) ? (v.gaps as SkillId[]) : undefined,
    strengths: cleanStrengths(v.strengths),
    mentioned: cleanMentioned(v.mentioned),
    wantsCertificate: v.wantsCertificate === true,
    prefersFormat: isPrefersFormat(v.prefersFormat) ? v.prefersFormat : undefined,
    understoodBy: v.understoodBy === "ai" ? "ai" : "user",
  });
}

/**
 * Every field in a fixed key order, with defaults for missing newer fields and
 * gaps limited to the move's vocabulary, so JSON-based cache keys are stable
 * and request bodies always pass the server schema.
 */
export function normalizeProfile(p: FitProfile): ProfileV2 {
  return {
    v: 2,
    currentRole: str(p.currentRole, LIMITS.roleMax),
    move: p.move,
    baseline: p.baseline,
    hoursPerWeek: p.hoursPerWeek,
    budget: p.budget,
    situation:
      typeof p.situation === "string" ? p.situation.trim().slice(0, LIMITS.situationMax) : "",
    gaps: cleanGaps(p.move, p.gaps ?? [], LIMITS.gapsMax),
    strengths: cleanStrengths(p.strengths),
    mentioned: cleanMentioned(p.mentioned),
    wantsCertificate: p.wantsCertificate === true,
    prefersFormat: isPrefersFormat(p.prefersFormat) ? p.prefersFormat : "any",
    understoodBy: p.understoodBy === "ai" ? "ai" : "user",
  };
}

/** Words in the situation, counted by code (the receipt's "{words} words"). */
export function countWords(text: string | undefined | null): number {
  return (text ?? "").trim().split(/\s+/).filter(Boolean).length;
}

// Adjust ----------------------------------------------------------------------

/** Same fields in a fixed key order; missing input means no adjustments. */
export function normalizeAdjust(a?: Partial<Adjust> | null): Adjust {
  return {
    shorter: Boolean(a?.shorter),
    cheaper: Boolean(a?.cheaper),
    certificate: Boolean(a?.certificate),
    baselineShift:
      a?.baselineShift === 1 ? 1 : a?.baselineShift === -1 ? -1 : 0,
  };
}

export function isNoAdjust(a?: Partial<Adjust> | null): boolean {
  const n = normalizeAdjust(a);
  return !n.shorter && !n.cheaper && !n.certificate && n.baselineShift === 0;
}

/**
 * The adjust a profile starts with: "With a certificate" is on when they said
 * they want one (addendum-ai), everything else off. Use it for Reset too.
 */
export function defaultAdjust(profile: Pick<FitProfile, "wantsCertificate">): Adjust {
  return { ...NO_ADJUST, certificate: profile.wantsCertificate === true };
}

/** An explicit adjust as given (normalized); a missing one is the profile's default. */
export function resolveAdjust(
  profile: Pick<FitProfile, "wantsCertificate">,
  adjust?: Partial<Adjust> | null,
): Adjust {
  return adjust == null ? defaultAdjust(profile) : normalizeAdjust(adjust);
}

// The "Not quite right?" chips, in display order.
export type AdjustChip =
  | "shorter"
  | "cheaper"
  | "certificate"
  | "too-basic"
  | "too-advanced";

export const ADJUST_CHIPS: { id: AdjustChip; label: string }[] = [
  { id: "shorter", label: "Shorter" },
  { id: "cheaper", label: "Cheaper" },
  { id: "certificate", label: "With a certificate" },
  { id: "too-basic", label: "Too basic" },
  { id: "too-advanced", label: "Too advanced" },
];

export function isChipOn(a: Adjust, chip: AdjustChip): boolean {
  switch (chip) {
    case "shorter":
      return a.shorter;
    case "cheaper":
      return a.cheaper;
    case "certificate":
      return a.certificate;
    case "too-basic":
      return a.baselineShift === 1;
    case "too-advanced":
      return a.baselineShift === -1;
  }
}

/**
 * Toggles one chip. "Too basic" and "Too advanced" also exclude the current
 * pick (spec 5.4), recorded as `levelExclude`: that exclusion lasts only while
 * a level chip is on, so turning the chip off (or switching to the other one)
 * brings the course back. Other exclusions (re-picks) stay until Reset. The
 * API accepts at most 3 excluded ids, so the oldest drop off first.
 */
export function toggleChip(
  state: { adjust: Adjust; exclude: string[]; levelExclude?: string | null },
  chip: AdjustChip,
  currentPickId: string | null,
): { adjust: Adjust; exclude: string[]; levelExclude?: string } {
  const a = { ...state.adjust };
  let exclude = [...state.exclude];
  let levelExclude = state.levelExclude ?? undefined;
  const on = !isChipOn(a, chip);
  const isLevel = chip === "too-basic" || chip === "too-advanced";
  if (isLevel && levelExclude) {
    // the earlier level chip's exclusion goes with it (off, or replaced by the other chip)
    const gone = levelExclude;
    exclude = exclude.filter((x) => x !== gone);
    levelExclude = undefined;
  }
  switch (chip) {
    case "shorter":
      a.shorter = on;
      break;
    case "cheaper":
      a.cheaper = on;
      break;
    case "certificate":
      a.certificate = on;
      break;
    case "too-basic":
      a.baselineShift = on ? 1 : 0;
      break;
    case "too-advanced":
      a.baselineShift = on ? -1 : 0;
      break;
  }
  if (on && isLevel && currentPickId) {
    const already = exclude.includes(currentPickId);
    exclude = addExclude(exclude, currentPickId);
    // an id a re-pick already excluded stays excluded after the chip goes
    if (!already) levelExclude = currentPickId;
  }
  if (levelExclude && !exclude.includes(levelExclude)) levelExclude = undefined;
  return { adjust: a, exclude, ...(levelExclude ? { levelExclude } : {}) };
}

/** Appends an id (no duplicates), keeping the 3 most recent. */
export function addExclude(exclude: string[], id: string): string[] {
  return [...exclude.filter((x) => x !== id), id].slice(-3);
}

/** "Shorter, With a certificate" for the "Adjusted: {chip names}" note. */
export function adjustChipNames(a: Adjust): string {
  return ADJUST_CHIPS.filter((c) => isChipOn(a, c.id))
    .map((c) => c.label)
    .join(", ");
}

/**
 * Like adjustChipNames, but relative to the profile's default adjust: a
 * certificate they asked for in their situation isn't an adjustment, and
 * turning it off is ("Without a certificate").
 */
export function adjustedChipNames(profile: Pick<FitProfile, "wantsCertificate">, a: Adjust): string {
  const base = defaultAdjust(profile);
  return ADJUST_CHIPS.filter((c) => isChipOn(a, c.id) !== isChipOn(base, c.id))
    .map((c) => (isChipOn(a, c.id) ? c.label : c.id === "certificate" ? "Without a certificate" : c.label))
    .join(", ");
}
