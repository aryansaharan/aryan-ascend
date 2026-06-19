import { recommend, type Profile } from "@/lib/recommend";
import { aiEnabled, streamPicks } from "@/lib/recommend-ai";

export const runtime = "nodejs";
// Headroom for the model to stream a full response.
export const maxDuration = 45;

// Builds the same {readBack, picks} shape the model streams, so the client's
// useObject hook parses both engines identically. Used when no AI key is
// configured, or if the model call fails before streaming starts.
function deterministicReadBack(profile: Profile): string {
  const role = profile.currentRole?.trim();
  const goal = {
    promotion: "aiming for a promotion",
    "switch-field": "switching fields",
    salary: "growing your earning power",
    "deeper-craft": "going deeper on your craft",
    leadership: "moving into leadership",
  }[profile.goal];
  const time = {
    "<2": "under 2 hours a week",
    "2-5": "2 to 5 hours a week",
    "5-10": "5 to 10 hours a week",
    "10+": "10+ hours a week",
  }[profile.timePerWeek];
  const lead = role ? `You're ${role}` : `You're ${profile.level}`;
  return `${lead}, ${goal}, with ${time} to invest. Here's the shortlist that fits.`;
}

async function deterministicResponse(profile: Profile): Promise<Response> {
  const recs = await recommend(profile);
  const picks = recs.map((r) => ({
    courseId: r.course.id,
    score: r.score,
    whyThisFitsYou: r.whyThisFitsYou,
    careerImpact: r.careerImpact,
    prerequisites: r.prerequisites,
    signals: r.fitNotes,
  }));
  const body = JSON.stringify({
    readBack: deterministicReadBack(profile),
    picks,
  });
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "x-ascend-engine": "deterministic",
    },
  });
}

export async function POST(request: Request) {
  let profile: Profile;
  try {
    const body = (await request.json()) as { profile?: Profile };
    if (!body.profile) throw new Error("missing profile");
    profile = body.profile;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Stream the live model when a key is configured. streamObject returns
  // synchronously and streams asynchronously; a setup error here (bad config)
  // drops to the deterministic shortlist. A mid-stream failure surfaces to the
  // client, which then falls back locally.
  if (aiEnabled()) {
    try {
      const result = streamPicks(profile);
      return result.toTextStreamResponse({
        headers: { "x-ascend-engine": "ai" },
      });
    } catch (err) {
      console.error("AI stream setup failed, using deterministic fallback:", err);
    }
  }

  try {
    return await deterministicResponse(profile);
  } catch (err) {
    console.error("Deterministic recommender failed:", err);
    return new Response(JSON.stringify({ readBack: "", picks: [] }), {
      headers: {
        "content-type": "text/plain; charset=utf-8",
        "x-ascend-engine": "deterministic",
      },
    });
  }
}
