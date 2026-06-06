import OpenAI from "openai";
import { COURSES } from "./courses";
import {
  deriveCategory,
  weeklyHoursFor,
  type Profile,
  type Recommendation,
} from "./recommend";

// Server-only. Imported only by app/api/recommend/route.ts so the SDK and the
// API key never reach the client bundle.
//
// Provider-flexible: it uses the OpenAI client library (a de facto standard
// for chat APIs), but the provider is config, not hardcoded. AI_BASE_URL points
// it at any OpenAI-compatible endpoint. Works as-is with:
//   - OpenAI:  AI_BASE_URL unset                 AI_MODEL e.g. gpt-4o-mini
//   - Gemini:  https://generativelanguage.googleapis.com/v1beta/openai/  (free)
//   - Groq:    https://api.groq.com/openai/v1                             (free)
// Uses JSON mode (not forced tool calls) for the widest cross-provider support.

const SYSTEM_PROMPT = `You are Ascend, a sharp and honest career-learning advisor. Given a user profile and a fixed catalog of courses, pick the 3 to 5 courses that genuinely fit this person best and explain why, in a builder and operator voice with no marketing fluff.

How to choose:
- Recommend ONLY courses from the catalog provided below. Use the exact course id values. Never invent a course.
- Rank by real fit across the whole profile: their interest tracks, self-rated level, weekly time, goal, years of experience, and current role.
- Be honest. If a course runs long relative to their weekly time, or sits a level above or below them, say so plainly. Do not pretend everything is a perfect fit.
- Only one pick should read as the single strongest match.

Respond with ONLY a JSON object (no prose, no markdown code fences) of this exact shape:
{"picks":[{"courseId":"<exact id from the catalog>","score":<number 0 to 100>,"whyThisFitsYou":"<2 to 3 sentences, advisor voice, specific to this course and this person>","careerImpact":"<one sentence on the concrete career outcome, tied to the course's actual skills>","prerequisites":"<one short line, or 'None. This is your start.' for true entry points>","signals":[{"label":"<1 to 2 words, e.g. Track fit, Level, Time, Goal, Experience, Your role>","text":"<one honest sentence>"}]}]}
Include 3 to 5 picks, strongest match first, each with 2 to 5 signals.

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

// The catalog is identical across requests; built once. OpenAI-compatible
// providers cache the stable prefix server-side where supported.
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

function parsePicks(content: string): AIPick[] {
  // Strip accidental markdown fences some models add, then parse.
  const cleaned = content
    .trim()
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/, "")
    .trim();
  const parsed = JSON.parse(cleaned) as { picks?: AIPick[] };
  return Array.isArray(parsed.picks) ? parsed.picks : [];
}

export async function recommendAI(profile: Profile): Promise<Recommendation[]> {
  const client = new OpenAI({
    apiKey: process.env.AI_API_KEY,
    baseURL: process.env.AI_BASE_URL || undefined,
    // Free tiers (e.g. Gemini) intermittently return 503/429 under load. The
    // SDK retries 408/409/429/5xx with exponential backoff; give it more tries
    // so a transient overload retries instead of dropping to the fallback.
    maxRetries: 4,
  });
  const model = process.env.AI_MODEL ?? "gpt-4o-mini";

  const messages = [
    {
      role: "system" as const,
      content: `${SYSTEM_PROMPT}\n\nCourse catalog (JSON array). Recommend only from these, by exact id:\n${catalogText}`,
    },
    {
      role: "user" as const,
      content: `User profile (JSON):\n${JSON.stringify(profile)}\n\nReturn the JSON object with the 3 to 5 courses that genuinely fit this person best, strongest match first.`,
    },
  ];

  // One model call: try JSON mode, retry without response_format on a 400
  // (some OpenAI-compatible providers reject that field; the prompt already
  // demands a bare JSON object and parsePicks handles fences defensively).
  async function callOnce(): Promise<AIPick[]> {
    let completion;
    try {
      completion = await client.chat.completions.create({
        model,
        response_format: { type: "json_object" },
        messages,
      });
    } catch (err) {
      if (err instanceof OpenAI.APIError && err.status === 400) {
        completion = await client.chat.completions.create({ model, messages });
      } else {
        throw err;
      }
    }
    const content = completion.choices[0]?.message?.content ?? "";
    if (!content) throw new Error("Model returned empty content");
    return parsePicks(content);
  }

  // Models occasionally emit malformed JSON. Retry once on a parse error
  // before giving up (the route then falls back to the deterministic scorer).
  let picks: AIPick[];
  try {
    picks = await callOnce();
  } catch (err) {
    if (err instanceof SyntaxError) picks = await callOnce();
    else throw err;
  }

  const byId = new Map(COURSES.map((c) => [c.id, c]));
  const weeklyHours = weeklyHoursFor(profile);

  const seen = new Set<string>();
  const recs: Recommendation[] = [];
  for (const pick of picks) {
    const course = byId.get(pick.courseId);
    if (!course || seen.has(course.id)) continue;
    seen.add(course.id);
    recs.push({
      course,
      // Clamp to 0..100 so a stray model value cannot render as "Fit -12".
      score: Number.isFinite(pick.score)
        ? Math.max(0, Math.min(100, pick.score))
        : 0,
      rationale: pick.whyThisFitsYou ?? "",
      fitNotes: Array.isArray(pick.signals)
        ? pick.signals.filter((s) => s && s.label && s.text).slice(0, 5)
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
