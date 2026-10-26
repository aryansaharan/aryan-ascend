import { guardRequest } from "@/lib/api-guard";
import { courseById } from "@/lib/catalog";
import { maxPlanN } from "@/lib/fit";
import { tailorBodySchema } from "@/lib/request-schemas";
import { rulesTailoring, tailorWeeks, type TailorResponse } from "@/lib/tailor";
import { peekTailor, tailorPlan } from "@/lib/tailor-ai";

// POST /api/tailor (addendum-ai, Job 4): one task per week for the person's
// job. The body names a course and a scope; the server rebuilds the weeks from
// the catalog, so a client can't inject module names. Any failure returns the
// move's templates, HTTP 200.

export const runtime = "nodejs";
export const maxDuration = 40;

function respond(body: TailorResponse): Response {
  return Response.json(body, {
    headers: { "x-ascend-engine": body.engine, "cache-control": "no-store" },
  });
}

export async function POST(request: Request) {
  const guarded = await guardRequest(request, "tailor", tailorBodySchema);
  if (!guarded.ok) return guarded.response;
  const { profile, courseId, n, h, skim } = guarded.body;
  const course = courseById(courseId);
  if (!course) return Response.json({ error: "Invalid request body" }, { status: 400 });
  // n may be modules.length + 1: the whole course with its unlisted tail (lib/fit planN)
  const scope = Math.min(n, maxPlanN(course));
  // Already answered for exactly these inputs: no model call, so not charged.
  const hit = peekTailor({ profile, course, n: scope, h, skim });
  if (hit) return respond(hit);
  const limited = guarded.spend();
  if (limited) return limited;
  try {
    return respond(await tailorPlan({ profile, course, n: scope, h, skim }));
  } catch (err) {
    console.error("tailor route failed, using templates:", err);
    return respond(rulesTailoring(tailorWeeks({ course, n: scope, h, move: profile.move }), profile.move, "ai-error"));
  }
}
