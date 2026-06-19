import { z } from "zod";

// Shared schemas for the streamed AI responses. Imported by BOTH the server
// (as the streamObject schema) and the client (as the useObject schema), so the
// two always agree on shape. Keep the shapes Gemini-friendly: plain strings,
// numbers, arrays, and nested objects. No unions, minimal optionals.

export const signalSchema = z.object({
  label: z
    .string()
    .describe("1 to 2 words: Track fit, Level, Time, Goal, Experience, or Your role"),
  text: z.string().describe("one honest sentence explaining this signal"),
});

export const pickSchema = z.object({
  courseId: z.string().describe("the EXACT id of a course from the supplied catalog"),
  score: z.number().describe("fit score from 0 to 100"),
  whyThisFitsYou: z
    .string()
    .describe(
      "2 to 3 sentences in a direct advisor voice. MUST quote or paraphrase a concrete detail the user typed in their current role, so it is obviously written for this person.",
    ),
  careerImpact: z
    .string()
    .describe("one sentence on the concrete career outcome, tied to the course's real skills"),
  prerequisites: z
    .string()
    .describe("one short line, or 'None. This is your start.' for a true entry point"),
  signals: z.array(signalSchema).describe("2 to 5 honest scoring signals"),
});

export const picksSchema = z.object({
  readBack: z
    .string()
    .describe(
      "ONE sentence, advisor voice, that reflects the user's own words back to them, quoting the role they typed and naming their goal, level, and weekly time. This proves you read their answers. Example: 'You're a frontend engineer at a fintech startup who wants to switch into data, studying 2 to 5 hours a week, so here's where I'd start.'",
    ),
  picks: z
    .array(pickSchema)
    .describe(
      "1 to 5 courses that genuinely fit, strongest match first. Return FEWER than 3 if fewer than 3 honestly fit. Never pad with off-topic courses.",
    ),
});

export type Picks = z.infer<typeof picksSchema>;
export type Pick = z.infer<typeof pickSchema>;

// ─── Learning plan (the commitment artifact) ───────────────────────────────

export const planWeekSchema = z.object({
  week: z.number().describe("week number, starting at 1"),
  focus: z.string().describe("the one thing this week is about, in plain words"),
  hours: z.number().describe("planned hours this week, matching the user's stated weekly time"),
  tasks: z.array(z.string()).describe("2 to 4 concrete, checkable tasks for the week"),
  milestone: z.string().describe("what is true at the end of this week that wasn't before"),
});

export const planSchema = z.object({
  courseTitle: z.string().describe("the exact title of the chosen course"),
  opener: z
    .string()
    .describe(
      "ONE sentence, advisor voice, quoting a detail from the user's role/goal so the plan is obviously theirs",
    ),
  firstStep: z
    .string()
    .describe(
      "ONE concrete task of 30 minutes or less that the user can do in the next 48 hours to start. Specific, not 'read the syllabus'.",
    ),
  weeks: z
    .array(planWeekSchema)
    .describe("a realistic week-by-week schedule sized to the user's weekly hours"),
  finishLine: z
    .string()
    .describe("one sentence on what the user will be able to DO when the plan is finished, tied to their goal"),
});

export type Plan = z.infer<typeof planSchema>;
