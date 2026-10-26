import { guardRequest } from "@/lib/api-guard";
import { rulesUnderstandResponse, type UnderstandResponse } from "@/lib/understand";
import { peekUnderstand, understandSituation } from "@/lib/understand-ai";
import { understandBodySchema } from "@/lib/request-schemas";

// POST /api/understand (addendum-ai, Job 1): reads the situation the person
// wrote. The model's answer is checked by code before it's returned; any
// failure returns the rules reading, HTTP 200, so the confirm screen can switch
// to manual controls.

export const runtime = "nodejs";
export const maxDuration = 40;

function respond(body: UnderstandResponse): Response {
  return Response.json(body, {
    headers: { "x-ascend-engine": body.engine, "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  const guarded = await guardRequest(request, "understand", understandBodySchema);
  if (!guarded.ok) return guarded.response;
  const { situation } = guarded.body;
  // Already answered for this text: no model call, so not charged.
  const hit = peekUnderstand(situation);
  if (hit) return respond(hit);
  const limited = guarded.spend();
  if (limited) return limited;
  try {
    return respond(await understandSituation(situation));
  } catch (err) {
    console.error("understand route failed, using the rules:", err);
    return respond(rulesUnderstandResponse(situation, "ai-error"));
  }
}
