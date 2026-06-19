import { recommend, type Profile, type Recommendation } from "./recommend";
import { enrichPicks } from "./enrich";
import type { Picks } from "./recommend-schema";

// Client-side data layer for /compare (and anyone landing without going through
// the streaming /recommendations page). The streaming page writes its final
// result into sessionStorage via cacheRecommendations; this reads it back so the
// two pages always show the SAME picks without paying for a second model call.
// If there's no cache, it fetches the API once, reads the completed stream, and
// enriches it the same way.

const CACHE_KEY = "ascend.recs.v2";

type Engine = "ai" | "deterministic";

export type RecommendResult = {
  recommendations: Recommendation[];
  engine: Engine;
  readBack: string;
};

function cacheId(profile: Profile): string {
  return JSON.stringify(profile);
}

export function readCachedRecommendations(
  profile: Profile,
): RecommendResult | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const cached = JSON.parse(raw) as { id: string } & RecommendResult;
    if (cached.id === cacheId(profile)) {
      return {
        recommendations: cached.recommendations,
        engine: cached.engine,
        readBack: cached.readBack ?? "",
      };
    }
  } catch {
    // ignore a corrupt cache entry
  }
  return null;
}

export function cacheRecommendations(
  profile: Profile,
  result: RecommendResult,
): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      CACHE_KEY,
      JSON.stringify({ id: cacheId(profile), ...result }),
    );
  } catch {
    // sessionStorage can throw in private mode; non-fatal
  }
}

export async function fetchRecommendations(
  profile: Profile,
): Promise<RecommendResult> {
  try {
    const res = await fetch("/api/recommend", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ profile }),
    });
    if (!res.ok) throw new Error(`recommend request failed: ${res.status}`);
    const engine: Engine =
      res.headers.get("x-ascend-engine") === "deterministic"
        ? "deterministic"
        : "ai";
    // Reading text() drains the stream to completion, so this is the final
    // object whether the route streamed it (AI) or sent it whole (fallback).
    const parsed = JSON.parse(await res.text()) as Picks;
    const result: RecommendResult = {
      recommendations: enrichPicks(parsed.picks, profile),
      engine,
      readBack: parsed.readBack ?? "",
    };
    cacheRecommendations(profile, result);
    return result;
  } catch {
    // Network/server failure: fall back to the local deterministic scorer so the
    // flow never dead-ends.
    try {
      const result: RecommendResult = {
        recommendations: await recommend(profile),
        engine: "deterministic",
        readBack: "",
      };
      cacheRecommendations(profile, result);
      return result;
    } catch {
      return { recommendations: [], engine: "deterministic", readBack: "" };
    }
  }
}

export async function getRecommendations(
  profile: Profile,
): Promise<RecommendResult> {
  return (
    readCachedRecommendations(profile) ?? (await fetchRecommendations(profile))
  );
}
