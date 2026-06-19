import { COURSES } from "./courses";
import {
  deriveCategory,
  weeklyHoursFor,
  type Profile,
  type Recommendation,
} from "./recommend";

// Turns a model (or deterministic) "pick" into a full Recommendation by joining
// it with the real course record and computing the pace math the same way for
// both engines. Pure and isomorphic: the API route, the streaming client, and
// the compare page all enrich through here, so a card looks identical no matter
// where it was assembled.
//
// PickLike is deliberately permissive so it accepts both a fully-formed pick
// and the DeepPartial objects useObject emits mid-stream (every field optional,
// signal labels/text possibly absent until they finish streaming).
export type PickLike = {
  courseId?: string;
  score?: number;
  whyThisFitsYou?: string;
  careerImpact?: string;
  prerequisites?: string;
  signals?: ({ label?: string; text?: string } | undefined)[];
};

export function enrichPick(
  pick: PickLike | undefined,
  profile: Profile,
): Recommendation | null {
  if (!pick || typeof pick.courseId !== "string") return null;
  const course = COURSES.find((c) => c.id === pick.courseId);
  if (!course) return null;

  const weeklyHours = weeklyHoursFor(profile);
  const score =
    typeof pick.score === "number" && Number.isFinite(pick.score)
      ? Math.max(0, Math.min(100, pick.score))
      : 0;

  return {
    course,
    score,
    rationale: pick.whyThisFitsYou ?? "",
    fitNotes: Array.isArray(pick.signals)
      ? pick.signals
          .filter((s): s is { label: string; text: string } =>
            Boolean(s && s.label && s.text),
          )
          .slice(0, 5)
      : [],
    category: deriveCategory(course),
    careerImpact: pick.careerImpact ?? "",
    prerequisites: pick.prerequisites ?? "",
    whyThisFitsYou: pick.whyThisFitsYou ?? "",
    weeklyHours,
    weeksToFinish: Math.max(
      1,
      Math.round(course.durationHours / Math.max(weeklyHours, 1)),
    ),
  };
}

export function enrichPicks(
  picks: (PickLike | undefined)[] | undefined,
  profile: Profile,
): Recommendation[] {
  if (!Array.isArray(picks)) return [];
  const seen = new Set<string>();
  const out: Recommendation[] = [];
  for (const p of picks) {
    const rec = enrichPick(p, profile);
    if (!rec || seen.has(rec.course.id)) continue;
    seen.add(rec.course.id);
    out.push(rec);
  }
  return out.slice(0, 5);
}
