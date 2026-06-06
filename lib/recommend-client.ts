import { recommend, type Profile, type Recommendation } from "./recommend";

// Client-side entry point for both /recommendations and /compare. Calls the
// server route (which runs Claude, or the deterministic scorer as fallback)
// and caches the result per-profile in sessionStorage, so the two pages always
// show the SAME picks and we don't pay for a second model call.

const CACHE_KEY = "ascend.recs.v1";

type Engine = "ai" | "deterministic";

export type RecommendResult = {
  recommendations: Recommendation[];
  engine: Engine;
};

export async function getRecommendations(
  profile: Profile,
): Promise<RecommendResult> {
  const cacheId = JSON.stringify(profile);

  if (typeof window !== "undefined") {
    try {
      const raw = sessionStorage.getItem(CACHE_KEY);
      if (raw) {
        const cached = JSON.parse(raw) as { id: string } & RecommendResult;
        if (cached.id === cacheId) {
          return {
            recommendations: cached.recommendations,
            engine: cached.engine,
          };
        }
      }
    } catch {
      // ignore a corrupt cache entry
    }
  }

  let result: RecommendResult;
  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    if (!res.ok) throw new Error(`recommend request failed: ${res.status}`);
    const data = (await res.json()) as RecommendResult;
    result = {
      recommendations: data.recommendations,
      engine: data.engine,
    };
  } catch {
    // Network or server failure: fall back to the local deterministic scorer
    // so the flow never dead-ends. Guard it too, so getRecommendations always
    // resolves; a rejection here would hang the page on its loading spinner.
    try {
      result = {
        recommendations: await recommend(profile),
        engine: "deterministic",
      };
    } catch {
      result = { recommendations: [], engine: "deterministic" };
    }
  }

  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(
        CACHE_KEY,
        JSON.stringify({ id: cacheId, ...result }),
      );
    } catch {
      // sessionStorage can throw in private mode; non-fatal
    }
  }

  return result;
}
