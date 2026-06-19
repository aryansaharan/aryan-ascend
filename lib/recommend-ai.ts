import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { streamObject } from "ai";
import { COURSES } from "./courses";
import { picksSchema } from "./recommend-schema";
import type { Profile } from "./recommend";

// Server-only. Imported only by the API routes so the SDK and the key never
// reach the client bundle.
//
// Provider: Google Gemini via the AI SDK's native provider. It reads the key
// already configured on the deployment (AI_API_KEY, or GOOGLE_GENERATIVE_AI_API_KEY
// as a fallback name) and a model from AI_MODEL, defaulting to a fast, free-tier
// Gemini model. Structured output streams natively, which is what lets the
// recommendations materialize live in the browser.

const apiKey =
  process.env.AI_API_KEY ?? process.env.GOOGLE_GENERATIVE_AI_API_KEY;

const google = createGoogleGenerativeAI({ apiKey });

// Default to a fast, free-tier Gemini model. Guard against a stale non-Gemini
// AI_MODEL left over from a previous provider (e.g. an OpenAI model id), which
// would otherwise make every call fail and silently drop to the fallback.
export const MODEL =
  process.env.AI_MODEL && process.env.AI_MODEL.toLowerCase().includes("gemini")
    ? process.env.AI_MODEL
    : "gemini-2.5-flash";

export function aiEnabled(): boolean {
  return Boolean(apiKey);
}

export function model() {
  return google(MODEL);
}

// Built once. The catalog is identical across requests; only the profile varies.
export const catalogText = JSON.stringify(
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

const SYSTEM_PROMPT = `You are Ascend, a sharp, honest career-learning advisor. Given a user profile and a fixed catalog of courses, pick the 3 to 5 courses that genuinely fit this person best and explain why, in a direct builder-and-operator voice with no marketing fluff.

How to choose:
- Recommend ONLY courses from the catalog below, using the EXACT course id values. Never invent a course or an id.
- Rank by real fit across the WHOLE profile: their interest tracks, self-rated level, weekly time, goal, years of experience, and the role they typed in free text.
- Honor the free-text role. In whyThisFitsYou, quote or closely paraphrase something they actually wrote, so it is unmistakably written for this person and not a template.
- Be honest. If a course runs long against their weekly time, or sits a level above or below them, say so plainly. Only ONE pick should read as the single strongest match.
- Quality over quantity. If fewer than 3 courses genuinely fit, return only the ones that do. NEVER pad the list with a course that does not serve their stated interests or goal just to reach a count.
- Calibrate score to honesty: 80+ strong fit, 50 to 79 good fit, below 50 a stretch worth naming.

Write plainly and specifically. No emoji, no hype.`;

export function streamPicks(profile: Profile) {
  return streamObject({
    model: model(),
    schema: picksSchema,
    temperature: 0.4,
    // On the free tier a 429 is the common failure; retrying 3x just triples
    // quota burn and (honoring the provider's retry-after) can hang the user for
    // up to a minute before the client falls back. One retry is the better
    // balance: it rides out a transient blip without hammering the quota.
    maxRetries: 1,
    // streamObject swallows provider errors by default (they become a clean
    // stream close). Log them so a failing key/quota is visible server-side.
    // The client recovers to the deterministic scorer when no usable picks land.
    onError: ({ error }) => console.error("recommend streamObject error:", error),
    system: `${SYSTEM_PROMPT}\n\nCourse catalog (JSON array). Recommend only from these, by exact id:\n${catalogText}`,
    prompt: `User profile (JSON):\n${JSON.stringify(
      profile,
    )}\n\nReturn the readBack sentence plus the 1 to 5 courses that genuinely fit this person best, strongest match first.`,
  });
}
