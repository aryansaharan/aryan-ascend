import { courseById } from "./catalog";
import { CATALOG_VERSION } from "./courses";
import type { Course } from "./course-types";
import { djb2Key } from "./hash";
import type { ExampleProfile } from "./examples";
import { normalizeProfile, type Hours, type ProfileV2 } from "./profile";
import { localGet, localSet } from "./local-store";
import { TAILOR_KEY, UNDERSTAND_KEY } from "./storage-keys";
import { rulesTailoring, tailorWeeks, type TailorResponse } from "./tailor";
import {
  guessMove,
  profileFromUnderstanding,
  rulesUnderstandResponse,
  type UnderstandResponse,
} from "./understand";

// The client side of POST /api/understand and POST /api/tailor. Each call has
// a 10 s timeout and doesn't reject on failure: network errors, 4xx, 429, 5xx,
// timeouts and malformed bodies all resolve to the same rules answer the
// server would give, computed locally. (loadTailoring throws only for a course
// id that isn't in the catalog, which is a bug in the caller.) AI and mock
// answers are cached in localStorage, so going back and forth costs no call.

export const AI_REQUEST_TIMEOUT_MS = 30_000;
const KEEP = 3;

type Result<T> = { ok: true; response: T } | { ok: false; status?: number };

async function postJson<T>(
  url: string,
  body: unknown,
  isT: (x: unknown) => x is T,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<Result<T>> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? AI_REQUEST_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener("abort", onAbort);
  if (opts.signal?.aborted) ctrl.abort();
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, status: res.status };
    const json: unknown = await res.json();
    return isT(json) ? { ok: true, response: json } : { ok: false, status: res.status };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

// Small keyed localStorage maps, newest kept --------------------------------------

type Stamped<T> = { at: string; value: T };

function readMap<T>(storageKey: string): Record<string, Stamped<T>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localGet(storageKey);
    const v = raw ? (JSON.parse(raw) as unknown) : null;
    return v && typeof v === "object" ? (v as Record<string, Stamped<T>>) : {};
  } catch {
    return {};
  }
}

function writeEntry<T>(storageKey: string, key: string, value: T): void {
  if (typeof window === "undefined") return;
  const all = readMap<T>(storageKey);
  all[key] = { at: new Date().toISOString(), value };
  const kept = Object.entries(all)
    .sort((a, b) => (a[1].at < b[1].at ? 1 : -1))
    .slice(0, KEEP);
  // storage blocked: lib/local-store keeps it in memory for the session
  localSet(storageKey, JSON.stringify(Object.fromEntries(kept)));
}

// Understand -------------------------------------------------------------------------

function isUnderstandResponse(x: unknown): x is UnderstandResponse {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  const u = o.understanding as Record<string, unknown> | undefined;
  return (
    (o.engine === "ai" || o.engine === "rules" || o.engine === "mock") &&
    typeof o.words === "number" &&
    Array.isArray(o.checks) &&
    !!u &&
    typeof u.role === "string" &&
    Array.isArray(u.gaps) &&
    Array.isArray(u.strengths) &&
    Array.isArray(u.mentioned)
  );
}

/** Cache key for a situation text (same text, same answer). */
export function situationKey(situation: string): string {
  return djb2Key(JSON.stringify({ s: situation.trim(), c: CATALOG_VERSION }));
}

/** The cached answer for this exact text, if any (the "Read your situation" panel uses it). */
export function getUnderstanding(situation: string): UnderstandResponse | null {
  const hit = readMap<UnderstandResponse>(UNDERSTAND_KEY)[situationKey(situation)];
  return hit && isUnderstandResponse(hit.value) ? hit.value : null;
}

export function requestUnderstand(
  situation: string,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<Result<UnderstandResponse>> {
  return postJson("/api/understand", { situation: situation.trim() }, isUnderstandResponse, opts);
}

/**
 * Fire this when the user leaves the situation step (addendum-ai): they answer
 * hours and budget while it runs. A cached answer returns at once; otherwise
 * one POST with a 10 s timeout. Failures resolve to the rules reading with
 * reason "rate-limited" (429) or "unavailable", which is not cached so a later
 * try can still reach the AI. AI and mock answers are cached unless the
 * caller aborted.
 */
export async function loadUnderstanding(
  situation: string,
  opts: { signal?: AbortSignal } = {},
): Promise<{ response: UnderstandResponse; fromCache: boolean }> {
  const text = situation.trim();
  const hit = getUnderstanding(text);
  if (hit) return { response: hit, fromCache: true };
  const res = await requestUnderstand(text, { signal: opts.signal });
  if (!res.ok) {
    return {
      response: rulesUnderstandResponse(text, res.status === 429 ? "rate-limited" : "unavailable"),
      fromCache: false,
    };
  }
  if (!opts.signal?.aborted && res.response.engine !== "rules") {
    writeEntry(UNDERSTAND_KEY, situationKey(text), res.response);
  }
  return { response: res.response, fromCache: false };
}

/**
 * "Try it with example answers": runs the real understand call on the
 * example's situation (cached after the first time) and builds the profile
 * with the example's hours and budget. On the rules path the keyword guess
 * supplies the move and the starting point defaults to the first anchor, so
 * an example always reaches a pick. `profile` is null only if no covered
 * direction matches at all (send them to /assess with the text prefilled).
 */
export async function profileForExample(
  ex: ExampleProfile,
  opts: { signal?: AbortSignal } = {},
): Promise<{ profile: ProfileV2 | null; understanding: UnderstandResponse }> {
  const { response } = await loadUnderstanding(ex.situation, opts);
  const profile =
    profileFromUnderstanding({
      situation: ex.situation,
      understanding: response.understanding,
      engine: response.engine,
      hoursPerWeek: ex.hoursPerWeek,
      budget: ex.budget,
    }) ??
    profileFromUnderstanding({
      situation: ex.situation,
      understanding: { ...response.understanding, move: guessMove(ex.situation) },
      engine: "rules",
      hoursPerWeek: ex.hoursPerWeek,
      budget: ex.budget,
    });
  return { profile, understanding: response };
}

// Tailor -----------------------------------------------------------------------------

function isTailorResponse(x: unknown): x is TailorResponse {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    (o.engine === "ai" || o.engine === "rules" || o.engine === "mock") &&
    Array.isArray(o.tasks) &&
    o.tasks.every((t) => typeof t === "string") &&
    Array.isArray(o.tailored) &&
    typeof o.artifact === "string" &&
    typeof o.artifactTailored === "boolean" &&
    Array.isArray(o.checks)
  );
}

export type TailorArgs = {
  profile: ProfileV2;
  courseId: string;
  /** modules in scope (Candidate.moduleCount) */
  n: number;
  /** hours a week (profile.hoursPerWeek) */
  h: Hours;
  /** decision.skim[].module, only when the user kept the AI's pick */
  skim?: number[];
};

export function tailorKey(a: TailorArgs): string {
  const p = normalizeProfile(a.profile);
  return djb2Key(
    JSON.stringify({
      r: p.currentRole,
      s: p.situation,
      m: p.move,
      g: p.gaps,
      c: a.courseId,
      n: a.n,
      h: a.h,
      k: [...(a.skim ?? [])].sort(),
      v: CATALOG_VERSION,
    }),
  );
}

/** The cached tailoring for these inputs, if any. */
export function getTailoring(a: TailorArgs): TailorResponse | null {
  const hit = readMap<TailorResponse>(TAILOR_KEY)[tailorKey(a)];
  return hit && isTailorResponse(hit.value) ? hit.value : null;
}

/** The template answer, computed locally (same as the server's fallback). */
export function localTailoring(course: Course, a: TailorArgs, reason: TailorResponse["reason"] = "unavailable"): TailorResponse {
  const weeks = tailorWeeks({ course, n: a.n, h: a.h, move: a.profile.move });
  return rulesTailoring(weeks, a.profile.move, reason ?? "unavailable");
}

/**
 * Fire this as soon as the booking setup shows the chosen course (the weeks
 * don't depend on the date), and await it on "Make my plan". Cached answers
 * return at once; failures resolve to the templates. The answer always has
 * exactly one task per week of the plan.
 */
export async function loadTailoring(
  a: TailorArgs,
  opts: { signal?: AbortSignal } = {},
): Promise<{ response: TailorResponse; fromCache: boolean }> {
  const course = courseById(a.courseId);
  if (!course) throw new Error(`Unknown course ${a.courseId}`);
  const hit = getTailoring(a);
  if (hit) return { response: hit, fromCache: true };
  const expected = tailorWeeks({ course, n: a.n, h: a.h, move: a.profile.move }).length;
  const res = await postJson(
    "/api/tailor",
    {
      profile: normalizeProfile(a.profile),
      courseId: a.courseId,
      n: a.n,
      h: a.h,
      ...(a.skim && a.skim.length ? { skim: a.skim.slice(0, 3) } : {}),
    },
    isTailorResponse,
    { signal: opts.signal },
  );
  if (!res.ok || res.response.tasks.length !== expected) {
    const status = res.ok ? undefined : res.status;
    return { response: localTailoring(course, a, status === 429 ? "rate-limited" : "unavailable"), fromCache: false };
  }
  if (!opts.signal?.aborted && res.response.engine !== "rules") {
    writeEntry(TAILOR_KEY, tailorKey(a), res.response);
  }
  return { response: res.response, fromCache: false };
}
