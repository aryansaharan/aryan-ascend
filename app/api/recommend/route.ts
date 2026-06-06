import { recommend, type Profile } from "@/lib/recommend";
import { recommendAI } from "@/lib/recommend-ai";

export const runtime = "nodejs";
// Allow headroom for retrying transient provider 503/429s before falling back.
export const maxDuration = 45;

export async function POST(request: Request) {
  let profile: Profile;
  try {
    const body = (await request.json()) as { profile?: Profile };
    if (!body.profile) throw new Error("missing profile");
    profile = body.profile;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Use the AI recommender when a key is configured. Any failure (no quota,
  // timeout, bad output) degrades to the deterministic scorer so the user
  // still gets a real, input-driven shortlist instead of an error.
  if (process.env.AI_API_KEY) {
    try {
      const recommendations = await recommendAI(profile);
      return Response.json({ recommendations, engine: "ai" });
    } catch (err) {
      console.error("AI recommender failed, using deterministic fallback:", err);
    }
  }

  // Never 500: even if the deterministic scorer throws (e.g. a malformed
  // profile), return an empty list so the client renders its empty state.
  try {
    const recommendations = await recommend(profile);
    return Response.json({ recommendations, engine: "deterministic" });
  } catch (err) {
    console.error("Deterministic recommender failed:", err);
    return Response.json({ recommendations: [], engine: "deterministic" });
  }
}
