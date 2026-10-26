import { guardRequest } from "@/lib/api-guard";
import { aiAvailable } from "@/lib/ai-runtime";
import { rulesDecision } from "@/lib/decide-rules";
import { fit } from "@/lib/fit";
import { aiDecide, peekPick } from "@/lib/pick-ai";
import type { PickResponse } from "@/lib/pick-types";
import { resolveAdjust } from "@/lib/profile";
import { pickBodySchema } from "@/lib/request-schemas";

// POST /api/pick (spec 5.5, addendum-ai Jobs 2 and 3). Rules decide what's
// possible; the model maps modules to gaps, chooses among what's left and
// judges the courses the person mentioned; code checks the answer. Every
// outcome, including an AI failure, is HTTP 200 with a usable decision.

export const runtime = "nodejs";
export const maxDuration = 40;

function respond(decision: PickResponse): Response {
  return Response.json(decision, {
    headers: {
      "x-ascend-engine": decision.engine,
      "cache-control": "no-store",
    },
  });
}

export async function POST(request: Request) {
  const guarded = await guardRequest(request, "pick", pickBodySchema);
  if (!guarded.ok) return guarded.response;
  const { profile, note, exclude = [], currency = "USD" } = guarded.body;
  const adjust = resolveAdjust(profile, guarded.body.adjust);

  // Already answered for exactly these inputs: no model call, so not charged.
  const hit = peekPick(profile, adjust, note, exclude, { currency });
  if (hit) return respond(hit);
  // Every other path is charged, with or without a key, so the limit is the same everywhere.
  const limited = guarded.spend();
  if (limited) return limited;

  const result = fit(profile, adjust, { currency, exclude });
  const n = result.candidates.length;
  if (n === 0 || n === 1) {
    return respond(rulesDecision(profile, adjust, exclude, { currency, fit: result }));
  }
  if (!aiAvailable()) {
    return respond(
      rulesDecision(profile, adjust, exclude, { currency, fit: result, reason: "no-key" }),
    );
  }

  try {
    return respond(await aiDecide(profile, adjust, note, exclude, { currency }));
  } catch (err) {
    console.error("pick route failed, using the rules:", err);
    return respond(
      rulesDecision(profile, adjust, exclude, { currency, fit: result, reason: "ai-error" }),
    );
  }
}
