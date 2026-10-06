import { z } from "zod";
import { COURSES } from "./courses";
import type { Profile } from "./recommend";

// Server-side validation for every body the API routes accept. Anything that
// does not match exactly (unknown keys, wrong enum values, oversized strings,
// course ids outside the catalog) is rejected with a 400 before a model call.

const COURSE_IDS = new Set(COURSES.map((c) => c.id));
const courseId = z
  .string()
  .refine((id) => COURSE_IDS.has(id), "Unknown course id");

export const profileSchema = z.strictObject({
  currentRole: z.string().trim().min(1).max(200),
  experience: z.enum(["0-1", "1-3", "3-5", "5+"]),
  goal: z.enum([
    "promotion",
    "switch-field",
    "salary",
    "deeper-craft",
    "leadership",
  ]),
  level: z.enum(["beginner", "intermediate", "advanced"]),
  timePerWeek: z.enum(["<2", "2-5", "5-10", "10+"]),
  interests: z.array(z.string().trim().min(1).max(40)).min(1).max(10),
}) satisfies z.ZodType<Profile>;

export const recommendBodySchema = z.strictObject({
  profile: profileSchema,
});

export const planBodySchema = z.strictObject({
  profile: profileSchema,
  courseId,
});

export const adviseBodySchema = z.strictObject({
  prompt: z.string().trim().min(1).max(500),
  profile: profileSchema,
  shortlist: z
    .array(
      z.strictObject({
        id: courseId,
        title: z.string().max(120),
      }),
    )
    .min(1)
    .max(5),
});
