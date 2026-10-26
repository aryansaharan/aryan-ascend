import { courseById } from "./catalog";
import type { Baseline, MoveId } from "./course-types";
import { backupSlot } from "./booking";
import { limitsFor, planN, scopeFor } from "./fit";
import { createPlan, type PlanPayloadV2 } from "./plan-store";
import type { Hours } from "./profile";

// v1 compatibility (spec 6.4). The v1 Profile type now only exists to decode
// old /plan?d= links, which are converted to a v2 plan with no AI call.

export type LegacyProfile = {
  currentRole: string;
  experience: "0-1" | "1-3" | "3-5" | "5+";
  goal: "promotion" | "switch-field" | "salary" | "deeper-craft" | "leadership";
  timePerWeek: "<2" | "2-5" | "5-10" | "10+";
  level: "beginner" | "intermediate" | "advanced";
  interests: string[];
};

export type LegacyPlanPayload = { profile: LegacyProfile; courseId: string };

function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

/**
 * Decodes an old `?d=` value (the v1 encodePlan: URI-encoded JSON). Accepts the
 * raw token and an already-decoded value, as URLSearchParams decodes for you.
 */
export function decodeLegacyPlan(raw: string | null | undefined): LegacyPlanPayload | null {
  if (!raw) return null;
  for (const candidate of [raw, safeDecode(raw)]) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as Partial<LegacyPlanPayload>;
      if (
        parsed &&
        typeof parsed.courseId === "string" &&
        parsed.profile &&
        typeof parsed.profile === "object"
      ) {
        return parsed as LegacyPlanPayload;
      }
    } catch {
      // try the next form
    }
  }
  return null;
}

const HOURS_FROM_V1: Record<LegacyProfile["timePerWeek"], Hours> = {
  "<2": 1,
  "2-5": 3,
  "5-10": 5,
  "10+": 12,
};

const BASELINE_FROM_V1: Record<LegacyProfile["level"], Baseline> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

const MOVE_FROM_INTEREST: Record<string, MoveId> = {
  "ai-engineer": "ai-build",
  "ml-engineer": "ai-build",
  pm: "product",
  "data-analyst": "data",
  "data-scientist": "data",
  designer: "ux",
  em: "lead",
  growth: "growth",
  devops: "cloud",
};

/** True when `key` is the object's own string key (not one inherited from Object, like "constructor"). */
function own(obj: object, key: unknown): boolean {
  return typeof key === "string" && Object.prototype.hasOwnProperty.call(obj, key);
}

export type LegacyConversion =
  | { kind: "ok"; plan: PlanPayloadV2 }
  /** the course is no longer in the catalog: show the removed-course card */
  | { kind: "removed"; role: string };

/**
 * Converts a v1 payload to a v2 plan: hours and level mapped, move from the
 * first interest whose move the course is in (else the course's first move), first session
 * tomorrow at 8:30 pm with a late-work backup, scope from the fit rules.
 * The page shows the "Pick your own time" banner after this.
 */
export function legacyToV2(payload: LegacyPlanPayload, now: Date = new Date()): LegacyConversion {
  const p = payload.profile;
  const role = typeof p.currentRole === "string" ? p.currentRole.trim().slice(0, 200) : "";
  const course = courseById(payload.courseId);
  if (!course) return { kind: "removed", role };

  // own keys only: a link can carry anything, and "constructor" would find Object's
  const h = own(HOURS_FROM_V1, p.timePerWeek) ? HOURS_FROM_V1[p.timePerWeek] : 3;
  const b = own(BASELINE_FROM_V1, p.level) ? BASELINE_FROM_V1[p.level] : 0;
  const interests = (Array.isArray(p.interests) ? p.interests : []).filter((i): i is string =>
    own(MOVE_FROM_INTEREST, i),
  );
  const fromInterest = interests
    .map((i) => MOVE_FROM_INTEREST[i])
    .find((m) => course.moves.some((x) => x.move === m));
  const m: MoveId = fromInterest ?? course.moves[0].move;

  const limits = limitsFor(
    { v: 2, currentRole: role || "Not given", move: m, baseline: b, hoursPerWeek: h, budget: "any" },
    null,
  );
  const scope = scopeFor(course, limits.capHours);

  const s = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 20, 30);
  return {
    kind: "ok",
    plan: createPlan({
      course,
      n: scope ? planN(course, scope) : 1,
      h,
      m,
      b,
      role,
      commitAt: now,
      s,
      o: "late-work",
      k: backupSlot(s, "late-work"),
      e: "rules",
    }),
  };
}
