import { streamText } from "ai";
import { aiEnabled, catalogText, model } from "@/lib/recommend-ai";
import type { Profile } from "@/lib/recommend";

export const runtime = "nodejs";
export const maxDuration = 45;

type Body = {
  prompt?: string;
  profile?: Profile;
  shortlist?: { id: string; title: string }[];
};

const SYSTEM = `You are Ascend, a candid career-learning advisor talking with someone who just got a shortlist of course recommendations. They will ask a follow-up: to challenge a pick, ask "why not X", weigh two options, or sanity-check the plan against their life.

Rules:
- Ground every answer in the supplied catalog and the user's profile. Reason out loud about the real trade-offs: their weekly time vs a course's hours, their level vs a course's level, their goal vs what a course actually builds.
- When they ask "why not <course>", give the honest reason it was or wasn't a top pick (e.g. "Kubernetes is 60 hours; at 2 to 5 hours a week that's about 5 months, so it lost to a faster win"), not a brush-off.
- Only reference courses that exist in the catalog. Never invent one. If something isn't in the catalog, say so.
- Be concise and direct: a few short sentences, not an essay. No emoji, no hype, no markdown headings.`;

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return new Response("Sorry, I couldn't read that question.", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  const question = (body.prompt ?? "").trim();
  if (!question) {
    return new Response("Ask me anything about your picks.", {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (!aiEnabled()) {
    return new Response(
      "The live advisor isn't available in this environment.",
      { headers: { "content-type": "text/plain; charset=utf-8" } },
    );
  }

  const shortlist = (body.shortlist ?? [])
    .map((s) => `- ${s.title} (id: ${s.id})`)
    .join("\n");

  const result = streamText({
    model: model(),
    temperature: 0.5,
    onError: ({ error }) => console.error("advise streamText error:", error),
    system: `${SYSTEM}\n\nFull course catalog (JSON):\n${catalogText}`,
    prompt: `User profile (JSON):\n${JSON.stringify(body.profile ?? {})}\n\nThe shortlist they were just shown:\n${
      shortlist || "(none)"
    }\n\nTheir question:\n${question}`,
  });

  return result.toTextStreamResponse();
}
