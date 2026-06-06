import OpenAI from "openai";
import { COURSES } from "./courses";
import {
  deriveCategory,
  weeklyHoursFor,
  type Profile,
  type Recommendation,
} from "./recommend";

// Server-only. Imported only by app/api/recommend/route.ts so the OpenAI SDK
// and the API key never reach the client bundle.
//
// Provider-flexible: uses the OpenAI client, but OPENAI_BASE_URL can point it
// at any OpenAI-compatible endpoint (Groq, Gemini, OpenRouter, ...).

const SYSTEM_PROMPT = `You are Ascend, a sharp and honest career-learning advisor. Given a user profile and a fixed catalog of courses, pick the 3 to 5 courses that genuinely fit this person best and explain why, in a builder and operator voice with no marketing fluff.

How to choose:
- Recommend ONLY courses from the catalog provided below. Use the exact course id values. Never invent a course.
- Rank by real fit across the whole profile: their interest tracks, self-rated level, weekly time, goal, years of experience, and current role.
- Be honest. If a course runs long relative to their weekly time, or sits a level above or below them, say so plainly. Do not pretend everything is a perfect fit.
- Only one pick should read as the single strongest match.

For each pick:
- score: 0 to 100, reflecting overall fit.
- whyThisFitsYou: 2 to 3 sentences, advisor voice, specific to THIS course and THIS person. Name the concrete reason (their track, level, weekly time, goal, or role).
- careerImpact: one sentence on the concrete career outcome, tied to the course's actual skills.
- prerequisites: one short line on what they need before starting, or "None. This is your start." for true entry points.
- signals: 2 to 5 short tags showing what drove the pick. label is 1 to 2 words (for example "Track fit", "Level", "Time", "Goal", "Experience", "Your role"); text is one honest sentence.

Writing rules (strict):
- Do NOT use em dashes or en dashes anywhere. Use periods or commas instead.
- Use straight quotes and straight apostrophes only. Never curly.
- No emoji, no hype. Keep it plain, direct, and specific.`;

type AIPick = {
  courseId: string;
  score: number;
  whyThisFitsYou: string;
  careerImpact: string;
  prerequisites: string;
  signals: { label: string; text: string }[];
};

// JSON Schema for the function the model is forced to call.
const RECOMMENDER_PARAMETERS = {
  type: "object",
  additionalProperties: false,
  properties: {
    picks: {
      type: "array",
      description: "The 3 to 5 best-fit courses, strongest match first.",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          courseId: { type: "string", description: "Exact id from the catalog." },
          score: { type: "number", description: "Overall fit from 0 to 100." },
          whyThisFitsYou: { type: "string" },
          careerImpact: { type: "string" },
          prerequisites: { type: "string" },
          signals: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              properties: {
                label: { type: "string" },
                text: { type: "string" },
              },
              required: ["label", "text"],
            },
          },
        },
        required: [
          "courseId",
          "score",
          "whyThisFitsYou",
          "careerImpact",
          "prerequisites",
          "signals",
        ],
      },
    },
  },
  required: ["picks"],
};

// The catalog is identical across requests; built once. OpenAI auto-caches the
// stable system prefix server-side, so repeat calls are cheaper for free.
const catalogText = JSON.stringify(
  COURSES.map((c) => ({
    id: c.id,
    title: c.title,
    provider: c.provider,
    level: c.level,
    durationHours: c.durationHours,
    tracks: c.tracks,
    skills: c.skills,
    summary: c.summary,
  })),
);

export async function recommendAI(profile: Profile): Promise<Recommendation[]> {
  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    baseURL: process.env.OPENAI_BASE_URL || undefined,
  });
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";

  const completion = await client.chat.completions.create({
    model,
    messages: [
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\nCourse catalog (JSON array). Recommend only from these, by exact id:\n${catalogText}`,
      },
      {
        role: "user",
        content: `User profile (JSON):\n${JSON.stringify(profile)}\n\nPick the 3 to 5 courses that genuinely fit this person best, strongest match first.`,
      },
    ],
    tools: [
      {
        type: "function",
        function: {
          name: "submit_recommendations",
          description:
            "Submit the 3 to 5 best-fit course recommendations for this user.",
          parameters: RECOMMENDER_PARAMETERS,
        },
      },
    ],
    tool_choice: {
      type: "function",
      function: { name: "submit_recommendations" },
    },
  });

  const call = completion.choices[0]?.message?.tool_calls?.[0];
  if (!call || call.type !== "function") {
    throw new Error("Model returned no recommendations");
  }

  const picks =
    (JSON.parse(call.function.arguments) as { picks?: AIPick[] }).picks ?? [];
  const byId = new Map(COURSES.map((c) => [c.id, c]));
  const weeklyHours = weeklyHoursFor(profile);

  const recs: Recommendation[] = [];
  for (const pick of picks) {
    const course = byId.get(pick.courseId);
    if (!course) continue;
    recs.push({
      course,
      score: typeof pick.score === "number" ? pick.score : 0,
      rationale: pick.whyThisFitsYou ?? "",
      fitNotes: Array.isArray(pick.signals)
        ? pick.signals.filter((s) => s && s.label && s.text)
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
    });
  }

  if (recs.length === 0) throw new Error("Model returned no valid course ids");
  return recs.slice(0, 5);
}
