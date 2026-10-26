import { z } from "zod";
import { COURSES } from "./courses";
import { MOVE_IDS, type MoveId } from "./course-types";
import { availableMoves } from "./moves";
import {
  BUDGETS,
  LIMITS,
  MENTION_STATUSES,
  PREFERS_FORMATS,
  type Adjust,
  type ProfileV2,
} from "./profile";
import { ALL_SKILL_IDS, isSkillOf, type SkillId } from "./skills";

// Server-side validation for every body the API accepts. Anything that does
// not match exactly (unknown keys, wrong enum values, oversized strings, course
// ids outside the catalog, hidden moves, gaps outside the move's vocabulary)
// is rejected with a 400 before any model call.

const COURSE_IDS = new Set(COURSES.map((c) => c.id));

const courseIdSchema = z
  .string()
  .max(80)
  .refine((id) => COURSE_IDS.has(id), "Unknown course id");

// Only moves that pass MIN_ENTRIES at module load. The fallback to every id
// only matters for an empty catalog, which check:catalog reports as an error.
const shipped = availableMoves().map((m) => m.id);
const MOVE_ENUM = (shipped.length > 0 ? shipped : [...MOVE_IDS]) as [MoveId, ...MoveId[]];

const moveSchema = z.enum(MOVE_ENUM);

const baselineSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

const hoursSchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
  z.literal(5),
  z.literal(8),
  z.literal(12),
]);

const budgetSchema = z.enum(BUDGETS);

const skillIdSchema = z.enum(ALL_SKILL_IDS as [SkillId, ...SkillId[]]);

/** The user's own words. The 20-character minimum is enforced where it's typed (/api/understand, /assess). */
const situationSchema = z.string().trim().max(LIMITS.situationMax);

const strengthSchema = z.strictObject({
  label: z.string().trim().min(1).max(LIMITS.strengthLabelMax),
  quote: z.string().trim().min(1).max(LIMITS.quoteMax),
});

const mentionSchema = z.strictObject({
  text: z.string().trim().min(1).max(LIMITS.mentionTextMax),
  courseId: courseIdSchema.nullable(),
  status: z.enum(MENTION_STATUSES),
});

export const profileV2Schema = z
  .strictObject({
    v: z.literal(2),
    currentRole: z.string().trim().min(1).max(LIMITS.roleMax),
    move: moveSchema,
    baseline: baselineSchema,
    hoursPerWeek: hoursSchema,
    budget: budgetSchema,
    situation: situationSchema,
    gaps: z.array(skillIdSchema).max(LIMITS.gapsMax),
    strengths: z.array(strengthSchema).max(LIMITS.strengthsMax),
    mentioned: z.array(mentionSchema).max(LIMITS.mentionedMax),
    wantsCertificate: z.boolean(),
    prefersFormat: z.enum(PREFERS_FORMATS),
    understoodBy: z.enum(["ai", "user"]),
  })
  .superRefine((p, ctx) => {
    const seen = new Set<string>();
    p.gaps.forEach((g, i) => {
      if (!isSkillOf(p.move, g) || seen.has(g)) {
        ctx.addIssue({ code: "custom", path: ["gaps", i], message: "Gap not in this move's vocabulary" });
      }
      seen.add(g);
    });
  }) satisfies z.ZodType<ProfileV2>;

const adjustSchema = z.strictObject({
  shorter: z.boolean(),
  cheaper: z.boolean(),
  certificate: z.boolean(),
  baselineShift: z.union([z.literal(-1), z.literal(0), z.literal(1)]),
}) satisfies z.ZodType<Adjust>;

const currencySchema = z.enum(["INR", "USD"]);

export const pickBodySchema = z.strictObject({
  profile: profileV2Schema,
  adjust: adjustSchema.optional(),
  note: z.string().trim().min(1).max(200).optional(),
  exclude: z.array(courseIdSchema).max(3).optional(),
  /** display currency, only used for the template text's budget phrase */
  currency: currencySchema.optional(),
});

/** POST /api/understand: just the situation text. */
export const understandBodySchema = z.strictObject({
  situation: z.string().trim().min(LIMITS.situationMin).max(LIMITS.situationMax),
});

/**
 * POST /api/tailor. The client sends the course and scope, never module names:
 * the server rebuilds the weeks from the catalog with lib/plan-build.
 */
export const tailorBodySchema = z.strictObject({
  profile: profileV2Schema,
  courseId: courseIdSchema,
  /** modules in scope (Candidate.moduleCount) */
  n: z.number().int().min(1).max(200),
  /** hours a week the plan is sized to */
  h: hoursSchema,
  /** module indices the pick said they can skim, at most 3 */
  skim: z.array(z.number().int().min(0).max(200)).max(3).optional(),
});
