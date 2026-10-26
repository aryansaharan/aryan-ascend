import { localGet, localRemove, localSet, sessionRemove } from "./local-store";
import { DECISION_KEY, PROFILE_KEY, TAILOR_KEY, UNDERSTAND_KEY } from "./storage-keys";

// Catalog-free on purpose: the landing imports this, and anything that reaches
// lib/profile or lib/courses would ship the whole catalog to the first page.

/**
 * Starts a new session: the v2 profile, cached decisions, understanding and
 * tailoring all go, plus the old v1 profile and the recs cache. Saved plans
 * and their progress stay.
 */
export function clearSession(): void {
  if (typeof window === "undefined") return;
  localRemove(PROFILE_KEY);
  localRemove(DECISION_KEY);
  localRemove(UNDERSTAND_KEY);
  localRemove(TAILOR_KEY);
  localRemove("ascend.profile.v1");
  sessionRemove("ascend.recs.v2");
  // unconfirmed edits on the /assess check screen
  sessionRemove("ascend.check.v1");
}

/**
 * Drops cached decisions that a fresh start shouldn't reuse: anything made
 * with chips, a swap, a re-pick or a choice, and rules answers (including
 * fallbacks from a failed AI call). AI and dev mock picks for the default
 * inputs stay: they are keyed by the answers themselves, so trying an example
 * again costs no AI call. Same rule as pruneForFreshStart in
 * lib/decision-store.ts, kept here so the landing stays catalog-free.
 */
export function pruneDecisionsForFreshStart(): void {
  if (typeof window === "undefined") return;
  try {
    const raw = localGet(DECISION_KEY);
    const all = raw ? (JSON.parse(raw) as Record<string, unknown>) : null;
    if (!all || typeof all !== "object") return;
    const kept = Object.fromEntries(
      Object.entries(all).filter(([, d]) => {
        const x = d as { origin?: unknown; engine?: unknown; chosenId?: unknown } | null;
        return Boolean(x) && x?.origin === "pick" && (x.engine === "ai" || x.engine === "mock") && !x.chosenId;
      }),
    );
    localSet(DECISION_KEY, JSON.stringify(kept));
  } catch {
    // ignore
  }
}

/**
 * "Try it with example answers": a new session that keeps what is still
 * right. The profile and the old recs cache go; the cached understanding
 * (keyed by the situation text, AI answers only) and the tailoring stay, and
 * decisions are pruned as above. So clicking an example again sends no
 * request, and the rate limit isn't spent on answers the browser already has.
 */
export function startExampleSession(): void {
  if (typeof window === "undefined") return;
  localRemove(PROFILE_KEY);
  localRemove("ascend.profile.v1");
  sessionRemove("ascend.recs.v2");
  sessionRemove("ascend.check.v1");
  pruneDecisionsForFreshStart();
}
