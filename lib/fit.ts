import { COURSES } from "./courses";
import {
  prefixHours,
  round2,
  totalHours,
  type Baseline,
  type Course,
  type CourseKind,
  type MoveEntry,
} from "./course-types";
import {
  countPhrase,
  formatMoney,
  hoursAWeek,
  hrsAWeek,
  isStale,
  paceMoney,
  roundApprox,
  weeksPhrase,
  budgetCap,
  type CostAtPace,
  type DisplayCurrency,
} from "./format";
import { BUDGET_LIMIT, budgetLimitInr, convert, toINR } from "./fx";
import { MOVES, RECENT_YEAR } from "./moves";
import {
  HOURS,
  budgetStepDown,
  budgetStepUp,
  resolveAdjust,
  type Adjust,
  type Budget,
  type FitProfile,
  type Hours,
  type PrefersFormat,
} from "./profile";
import {
  cleanGaps,
  coverageScore,
  coveredCount,
  keywordCoverage,
  type GapMatch,
  type SkillId,
} from "./skills";

// The fit gate (spec 5.1). Pure and deterministic: the same profile, adjust
// and date give the same funnel, candidates and ruled-out list on the server,
// in the browser and in scripts/eval.ts. This is what makes "hours, level and
// budget are enforced in code before the model runs" true.

export type ReasonCode =
  | "level_high"
  | "level_low"
  | "dated"
  | "over_budget"
  | "price_unknown"
  | "no_certificate"
  | "too_long"
  /** defensive: an entry whose modules add up to 0 hours can't be sized */
  | "no_hours";

export type Funnel = {
  checked: number;
  inMove: number;
  atLevel: number;
  /** only for recency-sensitive moves (ai-build, ai-pm) */
  current?: number;
  /** passed the budget check itself (courses later dropped for no certificate still count) */
  withinBudget: number;
  /** only when the certificate adjust is on */
  withCertificate?: number;
  finishable: number;
};

export type Candidate = {
  id: string;
  scope: "whole" | "trimmed";
  /** modules in scope (a prefix); equals modules.length when whole */
  moduleCount: number;
  scopeHours: number;
  weeks: number;
  costAtPace: CostAtPace | null;
  stale: boolean;
  /** this course's role and level for the profile's move */
  role: MoveEntry["role"];
  baseline: Baseline;
  /** "Course 1 of 9: Foundations", "Chapters 1 to 4 of {title}", or the title */
  scopeLabel: string;
  /** the profile's ranked gaps matched to in-scope modules by keyword (lib/skills.ts) */
  coverage: GapMatch[];
  /** weighted keyword coverage, the third ranking key */
  coverageScore: number;
  /** distinct gaps covered by keyword */
  gapsCovered: number;
  /**
   * What the course expects that they never mentioned (lib/course-types
   * `requires`), e.g. ["Python"]. Code fact: the AI is told, the card can say so.
   */
  prereqMissing: string[];
};

export type RuledOut = {
  id: string;
  reason: ReasonCode;
  text: string;
  role: MoveEntry["role"];
};

export type FitLimits = {
  hoursPerWeek: Hours;
  /** effective hours a week: hoursPerWeek × 0.7 */
  effectiveHours: number;
  capWeeks: number;
  capHours: number;
  /** baseline after the Too basic / Too advanced shift */
  baseline: Baseline;
  /**
   * The level window: one step either side of `baseline`, except that "Too
   * advanced" at the first starting point drops courses a step up, and "Too
   * basic" at the last drops courses a step down.
   */
  minLevel: Baseline;
  maxLevel: Baseline;
  /** budget after the Cheaper chip */
  budget: Budget;
};

export type FitResult = {
  funnel: Funnel;
  /** ranked, best first, at most 8, excluded ids removed */
  candidates: Candidate[];
  /** every course in the move that failed a gate: core first, then catalog order */
  ruledOut: RuledOut[];
  limits: FitLimits;
};

export type FitOptions = {
  /** for the 90-day staleness rule; defaults to the current time */
  now?: Date;
  /** currency for amounts in ruled-out text; defaults to INR */
  currency?: DisplayCurrency;
  /** ids removed from candidates (re-picks, Too basic / Too advanced) */
  exclude?: readonly string[];
  /** defaults to 8 */
  maxCandidates?: number;
};

/** Up to 8 candidates reach the AI (addendum-ai, Job 2). */
export const MAX_CANDIDATES = 8;
const PLAN_FACTOR = 0.7;
const EPS = 1e-9;
const KIND_ORDER: CourseKind[] = ["course", "program", "practice", "book", "docs"];

// Pace math --------------------------------------------------------------

/** Hours a week Ascend plans with: 70% of what the user said. */
export function effectiveHours(h: number): number {
  return Math.round(h * PLAN_FACTOR * 100) / 100;
}

/** Longest a pick may run: 8 weeks (12 at 1 hr), or 4 (6 at 1 hr) with Shorter. */
export function capWeeksFor(h: number, shorter: boolean): number {
  if (shorter) return h === 1 ? 6 : 4;
  return h === 1 ? 12 : 8;
}

/** ceil that ignores floating noise (16.8 / 2.1 is 8, not 8.000000001). */
function ceilSafe(x: number): number {
  return Math.ceil(x - EPS);
}

/** A last week shorter than this folds into the week before it. */
export const SMALL_TAIL_HOURS = 0.25;

/**
 * Weeks to cover `hours` at `h` hours a week (0 only when hours is 0): the
 * ceiling, except that a last week under a quarter hour folds into the one before,
 * so a plan never ends on a five-minute week. lib/plan-build uses the same
 * count, so pace lines, costs and plans always agree.
 */
export function weeksAt(hours: number, h: number): number {
  if (hours <= 0) return 0;
  const E = effectiveHours(h);
  const w = Math.max(1, ceilSafe(hours / E));
  if (w > 1 && hours - (w - 1) * E < SMALL_TAIL_HOURS - EPS) return w - 1;
  return w;
}

/**
 * Hours, weeks, level and budget limits for a profile. A missing adjust is the
 * profile's default (With a certificate on when they asked for one).
 */
export function limitsFor(profile: FitProfile, adjust?: Partial<Adjust> | null): FitLimits {
  const a = resolveAdjust(profile, adjust);
  const h = profile.hoursPerWeek;
  const E = effectiveHours(h);
  const capWeeks = capWeeksFor(h, a.shorter);
  const shifted = profile.baseline + a.baselineShift;
  const b = Math.min(2, Math.max(0, shifted)) as Baseline;
  return {
    hoursPerWeek: h,
    effectiveHours: E,
    capWeeks,
    capHours: round2(E * capWeeks),
    baseline: b,
    minLevel: (shifted > 2 ? b : Math.max(0, b - 1)) as Baseline,
    maxLevel: (shifted < 0 ? b : Math.min(2, b + 1)) as Baseline,
    budget: a.cheaper ? budgetStepDown(profile.budget) : profile.budget,
  };
}

// Scope ------------------------------------------------------------------

export type Scope = { whole: boolean; moduleCount: number; hours: number };

/**
 * The part of a course that fits in capHours: the whole course when it fits
 * (its `beyond` tail included: the plan lists the tail as one last item),
 * otherwise the longest prefix of listed modules (at least one). moduleCount
 * is always a count of listed modules, so coverage and AI module indices stay
 * the same. Null when even the first module is too long, or the outline has
 * no hours.
 */
export function scopeFor(course: Course, capHours: number): Scope | null {
  const total = totalHours(course);
  if (total <= 0) return null;
  if (total <= capHours + EPS) {
    return { whole: true, moduleCount: course.modules.length, hours: total };
  }
  let n = 0;
  let sum = 0;
  for (const m of course.modules) {
    if (sum + m.hours > capHours + EPS) break;
    sum += m.hours;
    n++;
  }
  if (n === 0 || sum <= 0) return null;
  return { whole: false, moduleCount: n, hours: round2(sum) };
}

/**
 * A plan link's `n` for a scope: the listed module count, or modules.length
 * + 1 when the scope is the whole course including its `beyond` tail. A link
 * with n === modules.length on a course with `beyond` stays a trimmed plan.
 */
export function planN(course: Course, scope: Pick<Scope, "whole" | "moduleCount">): number {
  return scope.whole && course.beyond ? course.modules.length + 1 : scope.moduleCount;
}

/** The largest `n` a plan link may carry for this course (see planN). */
export function maxPlanN(course: Course): number {
  return course.modules.length + (course.beyond ? 1 : 0);
}

/** The scope a plan of `n` modules covers (n clamped to the outline; see planN). */
export function scopeOfPrefix(course: Course, n: number): Scope {
  if (course.beyond && Math.floor(n) > course.modules.length) {
    return { whole: true, moduleCount: course.modules.length, hours: totalHours(course) };
  }
  const k = Math.min(Math.max(1, Math.floor(n)), course.modules.length);
  const whole = k === course.modules.length && !course.beyond;
  return { whole, moduleCount: k, hours: prefixHours(course, k) };
}

function partCount(course: Course): number {
  const fromLabel = (course.beyond?.label.match(/\d+/g) ?? []).map(Number);
  if (fromLabel.length > 0) return Math.max(...fromLabel);
  const parts = new Set(course.modules.map((m) => m.part).filter(Boolean));
  return parts.size + (course.beyond ? 1 : 0);
}

/**
 * What one part is called, from the beyond label ("Learning paths 2 to 5 of
 * the course" gives "Learning path" / "Learning paths"); "Course" otherwise.
 */
function partNoun(course: Course): { one: string; many: string } {
  const lead = course.beyond?.label.match(/^([A-Za-z][A-Za-z ]*?)\s+\d/)?.[1]?.trim();
  if (!lead || !/s$/i.test(lead)) return { one: "Course", many: "Courses" };
  return { one: lead.replace(/s$/i, ""), many: lead };
}

/**
 * Scope label (spec 5.1): the title when whole; "Course 1 of {n}: {part}" when
 * the prefix ends where a part ends (the noun follows the catalog: "Learning
 * path 1 of 5: ..."); "Chapters 1 to {k} of {title}" for books; otherwise
 * "Modules 1 to {k} of {part or title}". Takes a listed-module count; use
 * scopeLabelFor when the scope may be whole with a `beyond` tail.
 */
export function scopeLabel(course: Course, moduleCount: number): string {
  const k = Math.min(Math.max(1, moduleCount), course.modules.length);
  if (k === course.modules.length && !course.beyond) return course.title;
  const last = course.modules[k - 1];
  const next = course.modules[k];
  if (last.part && (!next || next.part !== last.part)) {
    const partsSoFar = new Set(course.modules.slice(0, k).map((m) => m.part)).size;
    const n = partCount(course);
    const noun = partNoun(course);
    return partsSoFar === 1
      ? `${noun.one} 1 of ${n}: ${last.part}`
      : `${noun.many} 1 to ${partsSoFar} of ${n}`;
  }
  if (course.kind === "book") {
    return k === 1 ? `Chapter 1 of ${course.title}` : `Chapters 1 to ${k} of ${course.title}`;
  }
  const of = last.part ?? course.title;
  return k === 1 ? `Module 1 of ${of}` : `Modules 1 to ${k} of ${of}`;
}

/** The label for a scope: the title when whole (beyond tail included), else scopeLabel. */
export function scopeLabelFor(course: Course, scope: Pick<Scope, "whole" | "moduleCount">): string {
  return scope.whole ? course.title : scopeLabel(course, scope.moduleCount);
}

// Prerequisites -------------------------------------------------------------

const PREREQ_LABEL: Record<NonNullable<Course["requires"]>[number], string> = { python: "Python" };
const PREREQ_RE: Record<NonNullable<Course["requires"]>[number], RegExp> = { python: /\bpython\b/i };

/**
 * What a course expects (its `requires`) that the person never mentioned in
 * their situation, role or strengths, as labels ("Python"). Code reads this;
 * the model only weighs it.
 */
export function prereqsMissing(
  course: Course,
  profile: Pick<FitProfile, "situation" | "currentRole" | "strengths">,
): string[] {
  const said = [
    profile.situation ?? "",
    profile.currentRole,
    ...(profile.strengths ?? []).flatMap((s) => [s.label, s.quote]),
  ].join(" \n ");
  return (course.requires ?? []).filter((r) => !PREREQ_RE[r].test(said)).map((r) => PREREQ_LABEL[r]);
}

// Cost -------------------------------------------------------------------

/**
 * What finishing `weeks` costs (spec 5.1): free 0; one-time the amount; a
 * monthly subscription for every started month, at least 1; yearly the amount.
 * Null when the price is not listed.
 */
export function costAtPaceFor(course: Course, weeks: number): CostAtPace | null {
  const cost = course.cost;
  if (!cost) return null;
  if (cost.model === "free") return { amount: 0, currency: "INR", inr: 0 };
  if (cost.model === "one-time" || cost.period === "year") {
    return {
      amount: cost.amount,
      currency: cost.currency,
      inr: toINR(cost.amount, cost.currency),
    };
  }
  const months = Math.max(1, Math.ceil((weeks * 7) / 30));
  const amount = round2(cost.amount * months);
  return { amount, currency: cost.currency, inr: toINR(amount, cost.currency), months };
}

// Gates ------------------------------------------------------------------

/** 0 failed move, 1 level, 2 dated, 3 budget, 4 length, 5 passed. */
type Stage = 0 | 1 | 2 | 3 | 4 | 5;

const REASON_STAGE: Record<ReasonCode, Stage> = {
  level_high: 1,
  level_low: 1,
  dated: 2,
  over_budget: 3,
  price_unknown: 3,
  no_certificate: 3,
  too_long: 4,
  no_hours: 4,
};

type Evaluation = {
  course: Course;
  entry: MoveEntry;
  stage: Stage;
  reason: ReasonCode | null;
  scope: Scope | null;
  weeks: number;
  wholeWeeks: number;
  costAtPace: CostAtPace | null;
  /** what the whole course costs at their pace ("to finish" in ruled-out lines) */
  wholeCost: CostAtPace | null;
  stale: boolean;
  /** keyword coverage of the ranked gaps, in scope; empty until it passes */
  coverage: GapMatch[];
};

function evaluate(
  course: Course,
  entry: MoveEntry,
  profile: FitProfile,
  limits: FitLimits,
  certificate: boolean,
  now: Date,
  currency: DisplayCurrency,
): Evaluation {
  const h = limits.hoursPerWeek;
  const total = totalHours(course);
  const scope = scopeFor(course, limits.capHours);
  const wholeWeeks = weeksAt(total, h);
  const weeks = scope ? weeksAt(scope.hours, h) : wholeWeeks;
  const costAtPace = costAtPaceFor(course, weeks);
  const wholeCost = costAtPaceFor(course, wholeWeeks);
  const stale = isStale(course.lastVerified, now);
  const base = { course, entry, scope, weeks, wholeWeeks, costAtPace, wholeCost, stale, coverage: [] as GapMatch[] };
  const fail = (stage: Stage, reason: ReasonCode): Evaluation => ({ ...base, stage, reason });

  if (entry.baseline > limits.maxLevel) return fail(1, "level_high");
  if (entry.baseline < limits.minLevel) return fail(1, "level_low");

  if (MOVES[profile.move].recencySensitive && course.updatedYear < RECENT_YEAR) {
    return fail(2, "dated");
  }

  const budget = limits.budget;
  if (budget !== "any") {
    if (!course.cost || !costAtPace) return fail(3, "price_unknown");
    if (budget === "free") {
      if (course.cost.model !== "free") return fail(3, "over_budget");
    } else if (costAtPace.inr > budgetLimitInr(budget, currency)) {
      // in rupees, against the chip the user saw ($60 converted for USD users)
      return fail(3, "over_budget");
    }
  }
  if (certificate && course.certificate === "none") return fail(3, "no_certificate");

  if (total <= 0) return fail(4, "no_hours");
  if (!scope) return fail(4, "too_long");

  return { ...base, stage: 5, reason: null };
}

/**
 * An over-budget amount as text: "about $63", or the exact "$60.40" when
 * rounding would show an amount at or under the cap ("about $60. Over your
 * budget." under "Up to $60" would read as a contradiction).
 */
function overCapMoney(pace: CostAtPace, budget: "low" | "mid", currency: DisplayCurrency): string {
  const same = pace.currency === currency;
  const exact = same ? pace.amount : convert(pace.amount, pace.currency, currency);
  // the value paceMoney would print
  const shown = same ? (pace.amount >= 100 ? Math.round(pace.amount) : pace.amount) : roundApprox(exact);
  return shown > BUDGET_LIMIT[currency][budget] ? `about ${paceMoney(pace, currency)}` : formatMoney(exact, currency);
}

/** The ruled-out line for a course (spec 5.3). */
export function reasonText(
  ev: Pick<Evaluation, "course" | "reason" | "costAtPace" | "wholeWeeks"> &
    Partial<Pick<Evaluation, "wholeCost" | "scope">>,
  limits: FitLimits,
  currency: DisplayCurrency,
): string {
  const c = ev.course;
  const t = c.title;
  const x = ev.costAtPace ? paceMoney(ev.costAtPace, currency) : "";
  switch (ev.reason) {
    case "level_high":
      return `${t}: assumes more than you said you know. ${c.assumes}`;
    case "level_low":
      return `${t}: likely too basic for where you are.`;
    case "dated":
      return `${t}: from ${c.updatedYear}. Dated for this direction.`;
    case "over_budget": {
      if (limits.budget === "free") {
        // "to finish" is the whole course at their pace, every month included
        const fin = ev.wholeCost ? paceMoney(ev.wholeCost, currency) : x;
        return c.freeStart
          ? `${t}: free to start, about ${fin} to finish at your pace. Over a free budget.`
          : `${t}: about ${fin} to finish at your pace. Over a free budget.`;
      }
      // low/mid: the gate failed on the part Ascend would plan, so name it
      const amount =
        ev.costAtPace && (limits.budget === "low" || limits.budget === "mid")
          ? overCapMoney(ev.costAtPace, limits.budget, currency)
          : `about ${x}`;
      return ev.scope && !ev.scope.whole
        ? `${t}: ${amount} for ${scopeLabel(c, ev.scope.moduleCount)} at your pace. Over your budget.`
        : `${t}: ${amount} at your pace. Over your budget.`;
    }
    case "price_unknown":
      return `${t}: price not listed publicly, so Ascend can't check it against your budget.`;
    case "no_certificate":
      return `${t}: no certificate.`;
    case "too_long":
      return `${t}: about ${weeksPhrase(ev.wholeWeeks)} at ${hrsAWeek(limits.hoursPerWeek)}, and even its first part is too long to start with.`;
    case "no_hours":
      return `${t}: no hours listed, so Ascend can't size it to your week.`;
    default:
      return `${t}: fits your answers.`;
  }
}

// Ranking ----------------------------------------------------------------

function levelRank(entry: Baseline, b: Baseline): number {
  if (entry === b) return 0;
  if (entry === b + 1) return 1;
  return 2;
}

function roleHintMatches(course: Course, role: string): boolean {
  if (!course.roleHints) return false;
  try {
    return new RegExp(course.roleHints, "i").test(role);
  } catch {
    return false;
  }
}

/**
 * How well a course's format suits a stated preference: 0 best. "any" ranks
 * every course the same, so the preference only ever breaks ties.
 */
export function formatRank(course: Course, pref: PrefersFormat | undefined): number {
  switch (pref) {
    case "hands-on":
      return course.kind === "practice" ? 0 : course.kind === "book" ? 2 : 1;
    case "reading":
      return course.kind === "book" ? 0 : course.kind === "docs" ? 1 : 2;
    case "video":
      if (course.format === "self-paced" && (course.kind === "course" || course.kind === "program")) return 0;
      return course.format === "cohort" ? 1 : 2;
    case "cohort":
      return course.format === "cohort" ? 0 : 1;
    default:
      return 0;
  }
}

/**
 * How a course covers the first ranked gap, the one to close first: 0 direct,
 * 1 partial, 2 not at all (or no gaps). It ranks ahead of the overall score so
 * a course that covers gaps 2 and 3 never outranks one that covers gap 1.
 */
function firstGapRank(coverage: readonly GapMatch[]): number {
  const m = coverage.find((c) => c.gap === 0 && c.modules.length > 0);
  if (!m) return 2;
  return m.depth === "direct" ? 0 : 1;
}

/**
 * The rules engine's sort key (spec 5.1 plus addendum-ai): core before
 * supporting, whole before trimmed, keyword coverage of the top gaps (the
 * first gap, then the weighted score), level, not stale, the stated format
 * preference, pace, free start, kind, role hints, id.
 */
function rankTuple(
  ev: Evaluation,
  profile: FitProfile,
  limits: FitLimits,
  shorter: boolean,
): (number | string)[] {
  return [
    ev.entry.role === "core" ? 0 : 1,
    ev.scope?.whole ? 0 : 1,
    firstGapRank(ev.coverage),
    -coverageScore(ev.coverage),
    levelRank(ev.entry.baseline, limits.baseline),
    ev.stale ? 1 : 0,
    formatRank(ev.course, profile.prefersFormat),
    shorter ? ev.weeks : Math.abs(ev.weeks - 5),
    ev.course.freeStart ? 0 : 1,
    KIND_ORDER.indexOf(ev.course.kind),
    roleHintMatches(ev.course, profile.currentRole) ? 0 : 1,
    ev.course.id,
  ];
}

function compareTuples(a: (number | string)[], b: (number | string)[]): number {
  for (let i = 0; i < a.length; i++) {
    const x = a[i];
    const y = b[i];
    if (x === y) continue;
    if (typeof x === "number" && typeof y === "number") return x - y;
    return String(x) < String(y) ? -1 : 1;
  }
  return 0;
}

function toCandidate(ev: Evaluation, profile: FitProfile): Candidate {
  const scope = ev.scope as Scope;
  return {
    id: ev.course.id,
    scope: scope.whole ? "whole" : "trimmed",
    moduleCount: scope.moduleCount,
    scopeHours: scope.hours,
    weeks: ev.weeks,
    costAtPace: ev.costAtPace,
    stale: ev.stale,
    role: ev.entry.role,
    baseline: ev.entry.baseline,
    scopeLabel: scopeLabelFor(ev.course, scope),
    coverage: ev.coverage,
    coverageScore: coverageScore(ev.coverage),
    gapsCovered: coveredCount(ev.coverage),
    prereqMissing: prereqsMissing(ev.course, profile),
  };
}

/** The profile's gaps, cleaned to its move's vocabulary (what coverage indices refer to). */
export function rankedGaps(profile: FitProfile): SkillId[] {
  return cleanGaps(profile.move, profile.gaps ?? []);
}

// fit() ------------------------------------------------------------------

function evaluateMove(
  profile: FitProfile,
  adjust: Partial<Adjust> | null | undefined,
  now: Date,
  currency: DisplayCurrency,
): { limits: FitLimits; evals: Evaluation[]; shorter: boolean; certificate: boolean } {
  const a = resolveAdjust(profile, adjust);
  const limits = limitsFor(profile, a);
  const gaps = rankedGaps(profile);
  const evals: Evaluation[] = [];
  for (const course of COURSES) {
    const entry = course.moves.find((m) => m.move === profile.move);
    if (!entry) continue;
    const ev = evaluate(course, entry, profile, limits, a.certificate, now, currency);
    if (ev.stage === 5 && ev.scope && gaps.length > 0) {
      ev.coverage = keywordCoverage(course, gaps, ev.scope.moduleCount);
    }
    evals.push(ev);
  }
  return { limits, evals, shorter: a.shorter, certificate: a.certificate };
}

/**
 * Runs every catalog course through the gates in order (move, level, dated,
 * budget, length), ranks what passes, and explains what doesn't. A missing
 * adjust is the profile's default (see resolveAdjust).
 */
export function fit(
  profile: FitProfile,
  adjust?: Partial<Adjust> | null,
  opts: FitOptions = {},
): FitResult {
  const now = opts.now ?? new Date();
  const currency = opts.currency ?? "INR";
  const exclude = new Set(opts.exclude ?? []);
  const max = opts.maxCandidates ?? MAX_CANDIDATES;
  const { limits, evals, shorter, certificate } = evaluateMove(profile, adjust, now, currency);
  const recency = MOVES[profile.move].recencySensitive;

  const at = (stage: Stage) => evals.filter((e) => e.stage >= stage).length;
  // The budget check runs before the certificate check, so every course left
  // out for having no certificate already passed the budget.
  const noCert = evals.filter((e) => e.reason === "no_certificate").length;
  const funnel: Funnel = {
    checked: COURSES.length,
    inMove: evals.length,
    atLevel: at(2),
    ...(recency ? { current: at(3) } : {}),
    withinBudget: at(4) + noCert,
    ...(certificate ? { withCertificate: at(4) } : {}),
    finishable: at(5),
  };

  const passed = evals
    .filter((e) => e.stage === 5)
    .map((e) => ({ e, key: rankTuple(e, profile, limits, shorter) }))
    .sort((x, y) => compareTuples(x.key, y.key))
    .map(({ e }) => e);

  const candidates = passed
    .filter((e) => !exclude.has(e.course.id))
    .slice(0, max)
    .map((e) => toCandidate(e, profile));

  const ruledOut: RuledOut[] = evals
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => e.reason !== null)
    .sort(
      (x, y) =>
        (x.e.entry.role === "core" ? 0 : 1) - (y.e.entry.role === "core" ? 0 : 1) ||
        x.i - y.i,
    )
    .map(({ e }) => ({
      id: e.course.id,
      reason: e.reason as ReasonCode,
      text: reasonText(e, limits, currency),
      role: e.entry.role,
    }));

  return { funnel, candidates, ruledOut, limits };
}

/** All courses that pass, ranked, ignoring exclusions and the cap of 8. Pass the display currency. */
export function rankedPassing(
  profile: FitProfile,
  adjust?: Partial<Adjust> | null,
  opts: Pick<FitOptions, "now" | "currency"> = {},
): Candidate[] {
  return fit(profile, adjust, { ...opts, maxCandidates: Number.MAX_SAFE_INTEGER })
    .candidates;
}

// Helpers for the pick page ----------------------------------------------

/** The ruled-out course that got furthest through the gates (empty state "Closest"). */
export function closestRuledOut(result: FitResult): RuledOut | null {
  let best: RuledOut | null = null;
  for (const r of result.ruledOut) {
    if (!best || REASON_STAGE[r.reason] > REASON_STAGE[best.reason]) best = r;
  }
  return best;
}

export type Relaxation =
  | { kind: "hours"; hoursPerWeek: Hours; count: number; text: string }
  | { kind: "budget"; budget: Budget; count: number; text: string };

/**
 * Up to two one-tap changes for the empty state (spec 3.3): the next hours
 * chip up, then the next budget step up, each with how many courses the user
 * would then see. Exclusions (re-picks, Too basic / Too advanced) are
 * respected, so the count is what appears after the tap. Only changes that
 * produce at least one course are returned.
 */
export function relaxations(
  profile: FitProfile,
  adjust?: Partial<Adjust> | null,
  opts: Pick<FitOptions, "now" | "currency" | "exclude"> = {},
): Relaxation[] {
  const currency = opts.currency ?? "INR";
  const out: Relaxation[] = [];
  const countAfter = (p: FitProfile, a: Partial<Adjust> | null | undefined) =>
    fit(p, a, { ...opts, maxCandidates: Number.MAX_SAFE_INTEGER }).candidates.length;
  const nextHours = HOURS.find((x) => x > profile.hoursPerWeek);
  if (nextHours) {
    const n = countAfter({ ...profile, hoursPerWeek: nextHours }, adjust);
    if (n > 0) {
      out.push({
        kind: "hours",
        hoursPerWeek: nextHours,
        count: n,
        text: `At ${hoursAWeek(nextHours)}, ${countPhrase(n, "course fits", "courses fit")}.`,
      });
    }
  }
  const nextBudget = budgetStepUp(profile.budget);
  if (nextBudget) {
    const a = { ...resolveAdjust(profile, adjust), cheaper: false };
    const n = countAfter({ ...profile, budget: nextBudget }, a);
    if (n > 0) {
      const cap = budgetCap(nextBudget, currency);
      const lead = cap ? `With up to ${cap}` : "With any budget";
      out.push({
        kind: "budget",
        budget: nextBudget,
        count: n,
        text: `${lead}, ${countPhrase(n, "course fits", "courses fit")}.`,
      });
    }
  }
  return out;
}

export type CourseCheck = {
  course: Course;
  /** true when it passes every gate for these answers */
  fits: boolean;
  /** null when it fits; "other_move" when the course isn't listed for this move */
  reason: ReasonCode | "other_move" | null;
  /** "Fits your answers" or the ruled-out line */
  text: string;
  /** weeks for the scope that fits, or the whole course when nothing does */
  weeks: number;
  wholeWeeks: number;
  scope: Scope | null;
  scopeLabel: string | null;
  costAtPace: CostAtPace | null;
  /** the profile's ranked gaps matched by keyword to the scope (or the whole outline when nothing fits) */
  coverage: GapMatch[];
};

/** "Already looking at another course?" for a catalog course (spec 3.3). Pass the display currency: the budget check depends on it. */
export function checkCourse(
  profile: FitProfile,
  adjust: Partial<Adjust> | null | undefined,
  course: Course,
  opts: Pick<FitOptions, "now" | "currency"> = {},
): CourseCheck {
  const now = opts.now ?? new Date();
  const currency = opts.currency ?? "INR";
  const a = resolveAdjust(profile, adjust);
  const limits = limitsFor(profile, a);
  const gaps = rankedGaps(profile);
  const coverageOf = (scope: Scope | null) =>
    gaps.length ? keywordCoverage(course, gaps, scope?.moduleCount ?? course.modules.length) : [];
  const entry = course.moves.find((m) => m.move === profile.move);
  if (!entry) {
    const scope = scopeFor(course, limits.capHours);
    const wholeWeeks = weeksAt(totalHours(course), profile.hoursPerWeek);
    const weeks = scope ? weeksAt(scope.hours, profile.hoursPerWeek) : wholeWeeks;
    return {
      course,
      fits: false,
      reason: "other_move",
      text: `${course.title}: not one of Ascend's courses for ${MOVES[profile.move].label}.`,
      weeks,
      wholeWeeks,
      scope,
      scopeLabel: scope ? scopeLabelFor(course, scope) : null,
      costAtPace: costAtPaceFor(course, weeks),
      coverage: coverageOf(scope),
    };
  }
  const ev = evaluate(course, entry, profile, limits, a.certificate, now, currency);
  return {
    course,
    fits: ev.reason === null,
    reason: ev.reason,
    text: ev.reason === null ? "Fits your answers" : reasonText(ev, limits, currency),
    weeks: ev.weeks,
    wholeWeeks: ev.wholeWeeks,
    scope: ev.scope,
    scopeLabel: ev.scope ? scopeLabelFor(course, ev.scope) : null,
    costAtPace: ev.costAtPace,
    coverage: coverageOf(ev.scope),
  };
}

export type FunnelStage = {
  /** "sent" replaces "pick" on the pick page when code hands the finishable courses to the AI */
  key: "checked" | "inMove" | "atLevel" | "current" | "withinBudget" | "withCertificate" | "finishable" | "pick" | "sent";
  count: number;
  /** text after the number: "checked", "in Data analysis", "you can finish at 3 hrs a week" */
  suffix: string;
};

/**
 * The funnel line, stage by stage (spec 3.3):
 * "{N} checked · {a} in {move} · {b} at your level · [{c} current ·]
 *  {d} within budget · [{w} with a certificate ·] {e} you can finish at
 *  {h} hrs a week · 1 pick".
 */
export function funnelStages(result: FitResult, profile: FitProfile): FunnelStage[] {
  const f = result.funnel;
  const picks = result.candidates.length > 0 ? 1 : 0;
  const stages: FunnelStage[] = [
    { key: "checked", count: f.checked, suffix: "checked" },
    { key: "inMove", count: f.inMove, suffix: `in ${MOVES[profile.move].label}` },
    { key: "atLevel", count: f.atLevel, suffix: "at your level" },
  ];
  if (f.current !== undefined) stages.push({ key: "current", count: f.current, suffix: "current" });
  stages.push({ key: "withinBudget", count: f.withinBudget, suffix: "within budget" });
  if (f.withCertificate !== undefined) {
    stages.push({ key: "withCertificate", count: f.withCertificate, suffix: "with a certificate" });
  }
  stages.push(
    {
      key: "finishable",
      count: f.finishable,
      suffix: `you can finish at ${hrsAWeek(profile.hoursPerWeek)}`,
    },
    { key: "pick", count: picks, suffix: picks === 1 ? "pick" : "picks" },
  );
  return stages;
}

/** The whole funnel line as one string, joined with " · ". */
export function funnelLine(result: FitResult, profile: FitProfile): string {
  return funnelStages(result, profile)
    .map((s) => `${s.count} ${s.suffix}`)
    .join(" · ");
}
