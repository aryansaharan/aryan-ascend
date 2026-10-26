import type { Course, MoveId } from "./course-types";
import { MOVES } from "./moves";
import type { Check, Engine } from "./pick-types";
import { buildWeeks, type PlanWeek } from "./plan-build";
import type { FitProfile, Hours } from "./profile";
import { rankedGaps } from "./fit";
import { skillLabel } from "./skills";

// Job 4, "Tailor every week to your job" (addendum-ai): shapes, the model's
// input, and the template answer. Pure, shared by the server route and the
// client fallback. Weeks always come from lib/plan-build, never from a client.

export type TailorReason = "no-key" | "ai-error" | "ai-timeout" | "ai-invalid" | "too-many-weeks" | "rate-limited" | "unavailable";

/** Longest plan the AI tailors; longer plans use templates. */
export const MAX_TAILOR_WEEKS = 16;
export const TASK_MAX = 170;
export const ARTIFACT_MAX = 220;

/** POST /api/tailor response body. Always HTTP 200 when the guard passes. */
export type TailorResponse = {
  engine: Engine;
  reason?: TailorReason;
  /** exactly one per week, week 1 first */
  tasks: string[];
  /** per week: true when the AI's task survived the checks, false when a template filled in */
  tailored: boolean[];
  /** the "When you finish, you'll have" line */
  artifact: string;
  artifactTailored: boolean;
  checks: Check[];
  ms?: number;
  model?: string;
  raw?: unknown;
  /** what the model saw: each week's module names */
  sent?: TailorAiInput;
};

/** What the tailor model is shown, as JSON. No hours, weeks or prices. */
export type TailorAiInput = {
  person: { role: string; situation: string; direction: string };
  gaps: string[];
  strengths: { label: string; quote: string }[];
  artifactTemplate: string;
  course: { title: string; provider: string };
  weeks: { k: number; modules: string[]; skim: string[] }[];
};

/** Weeks for a course and scope. Dates don't matter to tailoring, so a fixed start is used. */
export function tailorWeeks(args: {
  course: Course;
  n: number;
  h: Hours | number;
  move: MoveId;
  w?: string;
}): PlanWeek[] {
  return buildWeeks({
    course: args.course,
    n: args.n,
    h: args.h,
    s: "2026-01-05T09:00:00.000Z",
    move: args.move,
    w: args.w,
  }).weeks;
}

/** The model's input: the person, their gaps, the artifact template, and each week's module names. */
export function buildTailorInput(args: {
  profile: FitProfile;
  course: Course;
  weeks: PlanWeek[];
  skim?: readonly number[];
}): TailorAiInput {
  const { profile, course, weeks } = args;
  const skimNames = new Set((args.skim ?? []).map((i) => course.modules[i]?.name).filter(Boolean));
  return {
    person: {
      role: profile.currentRole,
      situation: profile.situation ?? "",
      direction: MOVES[profile.move].label,
    },
    gaps: rankedGaps(profile).map(skillLabel),
    strengths: (profile.strengths ?? []).map((s) => ({ label: s.label, quote: s.quote })),
    artifactTemplate: MOVES[profile.move].artifact,
    course: { title: course.title, provider: course.provider },
    weeks: weeks.map((w) => {
      const names = [...new Set(w.items.map((i) => i.name))];
      return { k: w.k, modules: names, skim: names.filter((n) => skimNames.has(n)) };
    }),
  };
}

/** The template answer: each week's tie-in line and the move's artifact. */
export function rulesTailoring(
  weeks: PlanWeek[],
  move: MoveId,
  reason: TailorReason,
  extra: Partial<Pick<TailorResponse, "checks" | "ms" | "model" | "raw" | "sent">> = {},
): TailorResponse {
  return {
    engine: "rules",
    reason,
    tasks: weeks.map((w) => w.tieIn),
    tailored: weeks.map(() => false),
    artifact: MOVES[move].artifact,
    artifactTailored: false,
    checks: extra.checks ?? [],
    ...(extra.ms !== undefined ? { ms: extra.ms } : {}),
    ...(extra.model ? { model: extra.model } : {}),
    ...(extra.raw !== undefined ? { raw: extra.raw } : {}),
    ...(extra.sent ? { sent: extra.sent } : {}),
  };
}
