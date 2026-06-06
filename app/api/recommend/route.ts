import { recommend, type Profile } from "@/lib/recommend";
import { recommendAI } from "@/lib/recommend-ai";

export const runtime = "nodejs";

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
  let aiError: string | undefined;
  if (process.env.OPENAI_API_KEY) {
    try {
      const recommendations = await recommendAI(profile);
      return Response.json({ recommendations, engine: "ai" });
    } catch (err) {
      aiError =
        err instanceof Error ? `${err.name}: ${err.message}` : String(err);
      console.error("AI recommender failed, using deterministic fallback:", err);
    }
  } else {
    aiError = "OPENAI_API_KEY is not set on this deployment";
  }

  const recommendations = await recommend(profile);
  return Response.json({ recommendations, engine: "deterministic", aiError });
}
