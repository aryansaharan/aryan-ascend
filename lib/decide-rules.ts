import { courseById } from "./catalog";
import type { Course } from "./course-types";
import type { DisplayCurrency } from "./format";
import { fit, rankedGaps, type Candidate, type FitResult } from "./fit";
import { countWords, type Adjust, type FitProfile, type Mention } from "./profile";
import {
  isAiEngine,
  type Alternate,
  type CandidateCoverage,
  type DecisionOrigin,
  type MentionVerdict,
  type PickReason,
  type PickResponse,
  type Receipt,
} from "./pick-types";
import { coverageScore, coveredCount, modulesMapped } from "./skills";
import { INSTEAD_IF, atWorkTemplate, whyThisOneTemplate } from "./templates";

// The rules engine (spec 5.2). It is the whole product when there's no AI key,
// the fallback for every AI failure, and the source of every "Pick this
// instead if" line, which the model never writes.

export type AltAxis = "cheaper" | "shorter" | "format" | "certificate" | "deeper";

const AXES: AltAxis[] = ["cheaper", "shorter", "format", "certificate", "deeper"];

function course(c: Candidate): Course | undefined {
  return courseById(c.id);
}

/** The line for `alt` beating `pick` on `axis`, or null when it doesn't. */
function axisLine(axis: AltAxis, alt: Candidate, pick: Candidate): string | null {
  const a = course(alt);
  const p = course(pick);
  if (!a || !p) return null;
  switch (axis) {
    case "cheaper": {
      const ai = alt.costAtPace?.inr;
      const pi = pick.costAtPace?.inr;
      if (ai === undefined) return null;
      if (ai === 0 && (pi === undefined || pi > 0)) return INSTEAD_IF.free;
      if (pi !== undefined && ai <= pi - 500) return INSTEAD_IF.less;
      return null;
    }
    case "shorter":
      return alt.weeks <= pick.weeks - 2 ? INSTEAD_IF.shorter(alt.weeks) : null;
    case "format":
      if (a.kind === "book" && p.kind !== "book") return INSTEAD_IF.book;
      if (p.kind === "book" && ["course", "program", "practice"].includes(a.kind)) {
        return INSTEAD_IF.fromBook;
      }
      if (a.format === "cohort" && p.format !== "cohort") return INSTEAD_IF.cohort;
      if (a.kind === "practice" && p.kind !== "practice") return INSTEAD_IF.practice;
      return null;
    case "certificate":
      return a.certificate !== "none" && p.certificate === "none" ? INSTEAD_IF.certificate : null;
    case "deeper":
      return alt.baseline > pick.baseline ? INSTEAD_IF.deeper : null;
  }
}

/** Every axis `alt` wins on against `pick`, in axis order, with its line. */
export function axesWon(alt: Candidate, pick: Candidate): { axis: AltAxis; line: string }[] {
  const out: { axis: AltAxis; line: string }[] = [];
  for (const axis of AXES) {
    const line = axisLine(axis, alt, pick);
    if (line) out.push({ axis, line });
  }
  return out;
}

/** "Pick this instead if ..." for one alternate: its first winning axis. */
export function insteadIf(alt: Candidate, pick: Candidate): string {
  return axesWon(alt, pick)[0]?.line ?? INSTEAD_IF.alsoFits;
}

/**
 * Labels alternates against a pick so no two share an axis: each takes its
 * first winning axis not used by an earlier one, else "Also fits".
 */
export function labelAlternates(pick: Candidate, alts: Candidate[]): Alternate[] {
  const used = new Set<AltAxis>();
  return alts.map((alt) => {
    const won = axesWon(alt, pick).find((w) => !used.has(w.axis));
    if (won) used.add(won.axis);
    return { id: alt.id, insteadIf: won?.line ?? INSTEAD_IF.alsoFits };
  });
}

/**
 * Up to `max` alternates from the ranked rest (spec 5.2): the first candidate
 * that wins on any axis, then the first that wins on a different axis, else
 * the next ranked one ("Also fits your hours and budget.").
 */
export function pickAlternates(pick: Candidate, rest: Candidate[], max = 2): Alternate[] {
  const pool = rest.filter((c) => c.id !== pick.id);
  const chosen: { cand: Candidate; axis: AltAxis | null; line: string }[] = [];
  const used = new Set<AltAxis>();
  while (chosen.length < max && chosen.length < pool.length) {
    const remaining = pool.filter((c) => !chosen.some((x) => x.cand.id === c.id));
    let picked: { cand: Candidate; axis: AltAxis | null; line: string } | null = null;
    for (const cand of remaining) {
      const won = axesWon(cand, pick).find((w) => !used.has(w.axis));
      if (won) {
        picked = { cand, axis: won.axis, line: won.line };
        break;
      }
    }
    if (!picked) picked = { cand: remaining[0], axis: null, line: INSTEAD_IF.alsoFits };
    if (picked.axis) used.add(picked.axis);
    chosen.push(picked);
  }
  return chosen.map((x) => ({ id: x.cand.id, insteadIf: x.line }));
}

// Coverage, receipt and verdict helpers -------------------------------------

/** A CandidateCoverage with covered and score computed by code. */
export function candidateCoverage(
  id: string,
  source: CandidateCoverage["source"],
  gaps: CandidateCoverage["gaps"],
): CandidateCoverage {
  return { id, source, gaps, covered: coveredCount(gaps), score: coverageScore(gaps) };
}

/** Keyword coverage for every candidate, as the rules path reports it. */
export function keywordCoverageOf(candidates: Candidate[]): CandidateCoverage[] {
  return candidates.map((c) => candidateCoverage(c.id, "keywords", c.coverage));
}

/**
 * Coverage for a new candidate list after a chip or swap: the AI's earlier
 * match is kept for candidates it mapped (module indices beyond a shorter
 * scope dropped), keywords fill in the rest.
 */
export function mergeCoverage(
  prev: readonly CandidateCoverage[] | undefined,
  candidates: Candidate[],
): CandidateCoverage[] {
  const byId = new Map((prev ?? []).map((c) => [c.id, c]));
  return candidates.map((c) => {
    const old = byId.get(c.id);
    if (old && old.source !== "keywords") {
      const gaps = old.gaps
        .map((g) => ({ ...g, modules: g.modules.filter((i) => i < c.moduleCount) }))
        .filter((g) => g.modules.length > 0);
      return candidateCoverage(c.id, old.source, gaps);
    }
    return candidateCoverage(c.id, "keywords", c.coverage);
  });
}

/** Distinct (course, module) pairs mapped to any gap. */
export function totalModulesMapped(coverage: readonly CandidateCoverage[]): number {
  return coverage.reduce((sum, c) => sum + modulesMapped(c.gaps), 0);
}

/**
 * The receipt's course and module counts after a chip or swap: only courses
 * the AI (or the dev mock) mapped itself, so a course keywords matched for the
 * first time is never counted as the AI's work. Keyword-only coverage (the
 * rules path) is counted as it is.
 */
function receiptCounts(coverage: readonly CandidateCoverage[]): { courses: number; modulesMapped: number } {
  const own = coverage.filter((c) => c.source !== "keywords");
  const counted = own.length > 0 ? own : coverage;
  return { courses: counted.length, modulesMapped: totalModulesMapped(counted) };
}

/** The receipt counts for a response with nothing removed (rules path, mock base). */
export function baseReceipt(profile: FitProfile, coverage: readonly CandidateCoverage[]): Receipt {
  return {
    words: countWords(profile.situation),
    gaps: rankedGaps(profile).length,
    modulesMapped: totalModulesMapped(coverage),
    courses: coverage.length,
    invalidIdsRemoved: 0,
    invalidModulesRemoved: 0,
    numbersRemoved: 0,
  };
}

/**
 * Keeps verdicts consistent with the pick on screen: "start-here" only for
 * the mentioned course that is the pick, and a catalog mention that became
 * the pick loses its old verdict (the page shows code facts instead).
 */
export function reconcileVerdicts(
  verdicts: readonly MentionVerdict[] | undefined,
  mentioned: readonly Mention[] | undefined,
  pickId: string | null,
): MentionVerdict[] {
  const list = mentioned ?? [];
  return (verdicts ?? []).filter((v) => {
    const m = list[v.index];
    if (!m) return false;
    if (v.verdict === "start-here") return m.courseId !== null && m.courseId === pickId;
    return !(m.courseId !== null && m.courseId === pickId);
  });
}

/** Just the PickResponse fields of a Decision (or any superset). */
export function pickResponseOf(d: PickResponse): PickResponse {
  return {
    engine: d.engine,
    ...(d.reason ? { reason: d.reason } : {}),
    pickId: d.pickId,
    alternates: d.alternates,
    whyThisOne: d.whyThisOne,
    useItAtWork: d.useItAtWork,
    honestFit: d.honestFit,
    gapNote: d.gapNote,
    checks: d.checks,
    rulesPickId: d.rulesPickId ?? null,
    gaps: d.gaps ?? [],
    coverage: d.coverage ?? [],
    vsRules: d.vsRules ?? "",
    skim: d.skim ?? [],
    mentionedVerdicts: d.mentionedVerdicts ?? [],
    receipt: d.receipt,
    ...(d.sent ? { sent: d.sent } : {}),
    ...(d.raw !== undefined ? { raw: d.raw } : {}),
    ...(d.model ? { model: d.model } : {}),
    ...(d.ms !== undefined ? { ms: d.ms } : {}),
  };
}

export type RulesOptions = {
  now?: Date;
  currency?: DisplayCurrency;
  /** why the rules chose, when it isn't implied by the candidate count */
  reason?: PickReason;
  /** reuse a fit() result computed with the same profile, adjust and exclude */
  fit?: FitResult;
};

/**
 * The rules decision: the top candidate not excluded, two alternates by axis,
 * template text, and keyword coverage for every candidate. With 0 candidates
 * pickId is null and the reason is "no-candidates"; with 1 it is
 * "one-candidate".
 */
export function rulesDecision(
  profile: FitProfile,
  adjust?: Partial<Adjust> | null,
  exclude: readonly string[] = [],
  opts: RulesOptions = {},
): PickResponse {
  const currency = opts.currency ?? "INR";
  const result = opts.fit ?? fit(profile, adjust, { now: opts.now, currency, exclude });
  const ex = new Set(exclude);
  const cands = result.candidates.filter((c) => !ex.has(c.id));
  const coverage = keywordCoverageOf(cands);
  const base = {
    engine: "rules" as const,
    honestFit: "ok" as const,
    gapNote: "",
    checks: [],
    rulesPickId: cands[0]?.id ?? null,
    gaps: rankedGaps(profile),
    coverage,
    vsRules: "",
    skim: [],
    mentionedVerdicts: [],
    receipt: baseReceipt(profile, coverage),
  };
  if (cands.length === 0) {
    return {
      ...base,
      reason: "no-candidates",
      pickId: null,
      alternates: [],
      whyThisOne: "",
      useItAtWork: "",
    };
  }
  const pick = cands[0];
  const pickCourse = courseById(pick.id) as Course;
  const reason: PickReason | undefined =
    cands.length === 1 ? "one-candidate" : opts.reason;
  return {
    ...base,
    ...(reason ? { reason } : {}),
    pickId: pick.id,
    alternates: pickAlternates(pick, cands.slice(1)),
    whyThisOne: whyThisOneTemplate(pickCourse, profile, adjust, currency),
    useItAtWork: atWorkTemplate(profile),
  };
}

/**
 * "Make this my pick" (spec 3.3): local only. The chosen alternate becomes the
 * pick, the old pick takes its slot, insteadIf lines are recomputed against
 * the new pick, and why / use-at-work fall back to templates.
 */
export function swapPick(
  prev: PickResponse,
  newPickId: string,
  ctx: { profile: FitProfile; adjust?: Partial<Adjust> | null; result: FitResult; currency?: DisplayCurrency },
): PickResponse {
  const currency = ctx.currency ?? "INR";
  const byId = new Map(ctx.result.candidates.map((c) => [c.id, c]));
  const next = byId.get(newPickId);
  const nextCourse = courseById(newPickId);
  if (!next || !nextCourse || prev.pickId === newPickId) return prev;
  const slotIds = prev.alternates.map((a) =>
    a.id === newPickId ? (prev.pickId as string) : a.id,
  );
  const alts = slotIds
    .map((id) => byId.get(id))
    .filter((c): c is Candidate => Boolean(c) && c?.id !== newPickId);
  return {
    ...pickResponseOf(prev),
    pickId: newPickId,
    alternates: labelAlternates(next, alts),
    whyThisOne: whyThisOneTemplate(nextCourse, ctx.profile, ctx.adjust, currency),
    useItAtWork: atWorkTemplate(ctx.profile),
    honestFit: "ok",
    gapNote: "",
    coverage: mergeCoverage(prev.coverage, ctx.result.candidates),
    vsRules: "",
    skim: [],
    mentionedVerdicts: reconcileVerdicts(prev.mentionedVerdicts, ctx.profile.mentioned, newPickId),
  };
}

/**
 * After an adjust chip (spec 5.4): if the current pick is still a candidate and
 * not excluded, and it was the AI's pick or the user's own swap, keep it and
 * its text, refreshing the alternates. Otherwise the rules decide again and
 * the origin becomes "adjusted".
 */
export function adjustPick(
  prev: PickResponse & { origin: DecisionOrigin },
  profile: FitProfile,
  adjust: Partial<Adjust> | null | undefined,
  exclude: readonly string[],
  opts: { now?: Date; currency?: DisplayCurrency } = {},
): { response: PickResponse; origin: DecisionOrigin; result: FitResult } {
  const currency = opts.currency ?? "INR";
  const result = fit(profile, adjust, { now: opts.now, currency, exclude });
  const keepable =
    prev.pickId !== null &&
    !exclude.includes(prev.pickId) &&
    (isAiEngine(prev.engine) || prev.origin === "swapped") &&
    result.candidates.some((c) => c.id === prev.pickId);
  if (keepable) {
    const pick = result.candidates.find((c) => c.id === prev.pickId) as Candidate;
    const rest = result.candidates.filter((c) => c.id !== pick.id);
    const kept = prev.alternates
      .map((a) => rest.find((c) => c.id === a.id))
      .filter((c): c is Candidate => Boolean(c));
    const fill = pickAlternates(
      pick,
      rest.filter((c) => !kept.some((k) => k.id === c.id)),
      Math.max(0, Math.min(2, rest.length) - kept.length),
    )
      .map((a) => rest.find((c) => c.id === a.id))
      .filter((c): c is Candidate => Boolean(c));
    const rulesPickId = result.candidates[0]?.id ?? null;
    const coverage = mergeCoverage(prev.coverage, result.candidates);
    return {
      response: {
        ...pickResponseOf(prev),
        alternates: labelAlternates(pick, [...kept, ...fill]),
        rulesPickId,
        coverage,
        // the reason compared the pick with the old rules pick; keep it only if that didn't change
        vsRules: rulesPickId === prev.rulesPickId && rulesPickId !== pick.id ? prev.vsRules : "",
        // skim notes past a shorter scope would name modules they won't take
        skim: (prev.skim ?? []).filter((x) => x.module < pick.moduleCount),
        receipt: { ...prev.receipt, ...receiptCounts(coverage) },
      },
      origin: prev.origin,
      result,
    };
  }
  const rules = rulesDecision(profile, adjust, exclude, { now: opts.now, currency, fit: result });
  // the AI's module map survives the chip for candidates it mapped
  const coverage = mergeCoverage(prev.coverage, result.candidates.filter((c) => !exclude.includes(c.id)));
  return {
    response: {
      ...rules,
      coverage,
      mentionedVerdicts: [],
      receipt: { ...rules.receipt, ...receiptCounts(coverage) },
    },
    origin: "adjusted",
    result,
  };
}
