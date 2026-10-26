import { CATALOG_VERSION } from "./courses";
import { adjustPick, pickResponseOf, rulesDecision, swapPick } from "./decide-rules";
import type { DisplayCurrency } from "./format";
import { fit, type FitResult } from "./fit";
import { djb2Key } from "./hash";
import {
  addExclude,
  defaultAdjust,
  normalizeProfile,
  resolveAdjust,
  type Adjust,
  type ProfileV2,
} from "./profile";
import {
  isAiEngine,
  type Alternate,
  type CandidateCoverage,
  type Check,
  type Decision,
  type DecisionOrigin,
  type PickReason,
  type PickResponse,
  type Repick,
} from "./pick-types";
import { localGet, localRemove, localSet } from "./local-store";
import { modulesMapped } from "./skills";
import { DECISION_KEY, REPICKS_KEY } from "./storage-keys";

// The decision cache (spec 6.1) and the client side of POST /api/pick. A
// decision is the pick response plus the funnel and ruled-out list it was
// shown with. Keyed by everything that changes the answer, so coming back to
// a page shows the same pick with no network call.

export { DECISION_KEY };
export const MAX_DECISIONS = 10;
/** Re-picks with a note allowed per decision chain (spec 3.3). */
export const MAX_REPICKS = 2;
/** Client timeout before falling back to the local rules (spec 3.3). */
export const PICK_TIMEOUT_MS = 30_000;
/** A rules answer given only because the AI failed is asked again after this (not sooner: a 429 needs a pause). */
export const RETRY_AI_AFTER_MS = 60_000;

const AI_FAILED: readonly PickReason[] = ["ai-error", "ai-timeout", "ai-invalid"];

/**
 * A rules answer given only because the AI failed this time (a 429, a
 * timeout, a network blip, an answer that failed the checks). It is saved, so
 * Book, /plan and /compare keep working, but worth asking the AI again later.
 * Chosen, adjusted, swapped and re-picked decisions never count.
 */
export function isAiFailedFallback(d: Pick<Decision, "engine" | "origin" | "reason" | "chosenId">): boolean {
  return d.engine === "rules" && d.origin === "pick" && !d.chosenId && !!d.reason && AI_FAILED.includes(d.reason);
}

/** True once a failed-AI fallback is old enough to ask the AI again. */
export function shouldRetryAi(d: Decision, now: number = Date.now()): boolean {
  return isAiFailedFallback(d) && now - Date.parse(d.createdAt) > RETRY_AI_AFTER_MS;
}

/**
 * djb2 of { profile, adjust, exclude, note, CATALOG_VERSION }. A missing
 * adjust is the profile's default (With a certificate on when they asked).
 */
export function decisionKey(
  profile: ProfileV2,
  adjust?: Partial<Adjust> | null,
  exclude: readonly string[] = [],
  note?: string,
): string {
  return djb2Key(
    JSON.stringify({
      profile: normalizeProfile(profile),
      adjust: resolveAdjust(profile, adjust),
      exclude: [...exclude],
      note: note ?? null,
      CATALOG_VERSION,
    }),
  );
}

/** djb2 of { profile, CATALOG_VERSION }; ties every decision to its answers. */
export function profileKey(profile: ProfileV2): string {
  return djb2Key(JSON.stringify({ profile: normalizeProfile(profile), CATALOG_VERSION }));
}

export type DecisionContext = {
  profile: ProfileV2;
  adjust?: Partial<Adjust> | null;
  exclude?: readonly string[];
  note?: string;
  origin: DecisionOrigin;
  repicks?: Repick[];
  currency: DisplayCurrency;
  now?: Date;
  /** a fit() result for the same inputs, to skip recomputing */
  result?: FitResult;
  /** the id in exclude that a level chip added */
  levelExclude?: string;
};

/** Wraps a PickResponse with the funnel, ruled-out list and keys (no storage). */
export function makeDecision(resp: PickResponse, ctx: DecisionContext): Decision {
  const adjust = resolveAdjust(ctx.profile, ctx.adjust);
  const exclude = [...(ctx.exclude ?? [])];
  const result =
    ctx.result ?? fit(ctx.profile, adjust, { now: ctx.now, currency: ctx.currency, exclude });
  const at = (ctx.now ?? new Date()).toISOString();
  return {
    ...pickResponseOf(resp),
    key: decisionKey(ctx.profile, adjust, exclude, ctx.note),
    profileKey: profileKey(ctx.profile),
    origin: ctx.origin,
    funnel: result.funnel,
    ruledOut: result.ruledOut,
    adjust,
    exclude,
    ...(ctx.levelExclude && exclude.includes(ctx.levelExclude) ? { levelExclude: ctx.levelExclude } : {}),
    ...(ctx.note ? { note: ctx.note } : {}),
    repicks: ctx.repicks ?? [],
    currency: ctx.currency,
    createdAt: at,
    updatedAt: at,
  };
}

// Storage -------------------------------------------------------------------

function readAll(): Record<string, Decision> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localGet(DECISION_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : null;
    return v && typeof v === "object" ? (v as Record<string, Decision>) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, Decision>): void {
  if (typeof window === "undefined") return;
  const kept = Object.values(all)
    .filter((d) => d && typeof d.key === "string")
    .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1))
    .slice(0, MAX_DECISIONS);
  // storage blocked: lib/local-store keeps it in memory for the session
  localSet(DECISION_KEY, JSON.stringify(Object.fromEntries(kept.map((d) => [d.key, d]))));
}

/** Entries cached before the AI layer existed lack coverage and a receipt; they count as a miss. */
function isCurrent(d: Decision | undefined): d is Decision {
  return Boolean(d && Array.isArray(d.coverage) && d.receipt && Array.isArray(d.mentionedVerdicts));
}

export function getDecision(key: string): Decision | null {
  const d = readAll()[key];
  return isCurrent(d) ? d : null;
}

/**
 * The cached decision for exactly these inputs, or null (a cache hit means no
 * network call). With a currency, an entry saved in another currency is a
 * miss: its budget check and ruled-out amounts were for a different chip.
 */
export function cachedDecision(
  profile: ProfileV2,
  adjust?: Partial<Adjust> | null,
  exclude: readonly string[] = [],
  note?: string,
  currency?: DisplayCurrency,
): Decision | null {
  const d = getDecision(decisionKey(profile, adjust, exclude, note));
  if (!d || d.profileKey !== profileKey(profile)) return null;
  return currency && d.currency !== currency ? null : d;
}

/** The most recently touched decision for this profile (what /compare and /plan read). */
export function getLatestDecision(profile: ProfileV2): Decision | null {
  const pk = profileKey(profile);
  let best: Decision | null = null;
  for (const d of Object.values(readAll())) {
    if (isCurrent(d) && d.profileKey === pk && (!best || d.updatedAt > best.updatedAt)) best = d;
  }
  return best;
}

/** Saves (or replaces) a decision, marks it most recent, keeps the 10 newest. */
export function saveDecision(d: Decision): Decision {
  const touched = { ...d, updatedAt: new Date().toISOString() };
  const all = readAll();
  all[d.key] = touched;
  writeAll(all);
  return touched;
}

/**
 * "Book my first session" / "Choose this": records the chosen course and when
 * it was chosen (the plan's `t`). Takes the decision's key, or the decision
 * itself (saved even if storage had dropped it). Returns the updated
 * decision, or null when only a key was given and it isn't cached.
 */
export function setChosen(
  keyOrDecision: string | Decision,
  chosenId: string,
  commitAt: string = new Date().toISOString(),
): Decision | null {
  const key = typeof keyOrDecision === "string" ? keyOrDecision : keyOrDecision.key;
  const d = getDecision(key) ?? (typeof keyOrDecision === "string" ? null : keyOrDecision);
  if (!d) return null;
  return saveDecision({ ...d, chosenId, commitAt });
}

function readRepicks(): Record<string, { n: number; at: string }> {
  try {
    const raw = localGet(REPICKS_KEY);
    const v = raw ? (JSON.parse(raw) as unknown) : null;
    return v && typeof v === "object" ? (v as Record<string, { n: number; at: string }>) : {};
  } catch {
    return {};
  }
}

/** Counts one re-pick for these answers, in its own small map (the decision cache drops entries). */
function countRepick(profile: ProfileV2): void {
  if (typeof window === "undefined") return;
  const pk = profileKey(profile);
  const all = readRepicks();
  const n = Math.max(Number(all[pk]?.n) || 0, repicksFromCache(pk)) + 1;
  all[pk] = { n, at: new Date().toISOString() };
  const kept = Object.entries(all)
    .sort((a, b) => (a[1].at < b[1].at ? 1 : -1))
    .slice(0, MAX_DECISIONS);
  localSet(REPICKS_KEY, JSON.stringify(Object.fromEntries(kept)));
}

function repicksFromCache(pk: string): number {
  let used = 0;
  for (const d of Object.values(readAll())) {
    if (isCurrent(d) && d.profileKey === pk) used = Math.max(used, d.repicks?.length ?? 0);
  }
  return used;
}

/**
 * Re-picks used for this set of answers: the counter, or the most any cached
 * decision carries (so a chip, Reset, reload or a full cache doesn't hand out
 * more than MAX_REPICKS).
 */
export function repicksUsed(profile: ProfileV2): number {
  const pk = profileKey(profile);
  return Math.max(Number(readRepicks()[pk]?.n) || 0, repicksFromCache(pk));
}

export function clearDecisions(): void {
  if (typeof window === "undefined") return;
  localRemove(DECISION_KEY);
}

/** Drops every cached decision for this profile. */
export function clearDecisionsFor(profile: ProfileV2): void {
  const pk = profileKey(profile);
  const all = readAll();
  for (const [k, d] of Object.entries(all)) if (d.profileKey === pk) delete all[k];
  writeAll(all);
}

/**
 * A fresh start for example answers without a new AI call: keeps AI (and dev
 * mock) picks made with no chips, which are keyed by content and so still
 * right, and drops everything else (chips, swaps, re-picks, rules fallbacks).
 * The same rule as pruneDecisionsForFreshStart in lib/session.ts, which the
 * landing uses because this file pulls in the catalog.
 */
export function pruneForFreshStart(): void {
  const all = readAll();
  for (const [k, d] of Object.entries(all)) {
    if (!d || d.origin !== "pick" || !isAiEngine(d.engine) || d.chosenId) delete all[k];
  }
  writeAll(all);
}

// Network -------------------------------------------------------------------

export type PickRequest = {
  profile: ProfileV2;
  adjust?: Adjust;
  note?: string;
  exclude?: string[];
  currency?: DisplayCurrency;
};

function isPickResponse(x: unknown): x is PickResponse {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    (o.engine === "ai" || o.engine === "rules" || o.engine === "mock") &&
    Array.isArray(o.coverage) &&
    Array.isArray(o.gaps) &&
    Array.isArray(o.skim) &&
    Array.isArray(o.mentionedVerdicts) &&
    typeof o.vsRules === "string" &&
    !!o.receipt &&
    typeof o.receipt === "object" &&
    (o.pickId === null || typeof o.pickId === "string") &&
    Array.isArray(o.alternates) &&
    (o.alternates as Alternate[]).every(
      (a) => a && typeof a.id === "string" && typeof a.insteadIf === "string",
    ) &&
    typeof o.whyThisOne === "string" &&
    typeof o.useItAtWork === "string" &&
    typeof o.gapNote === "string" &&
    Array.isArray(o.checks as Check[])
  );
}

/**
 * POST /api/pick with a 10 s client timeout. Resolves { ok: false } on any
 * network error, non-200 status, timeout or malformed body; never throws.
 */
export async function requestPick(
  body: PickRequest,
  opts: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<{ ok: true; response: PickResponse } | { ok: false; status?: number }> {
  // One controller for both the caller's signal and the timeout (AbortSignal.any
  // is too new for some Safari versions).
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? PICK_TIMEOUT_MS);
  const onAbort = () => ctrl.abort();
  opts.signal?.addEventListener("abort", onAbort);
  if (opts.signal?.aborted) ctrl.abort();
  try {
    const res = await fetch("/api/pick", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: ctrl.signal,
    });
    if (!res.ok) return { ok: false, status: res.status };
    const json: unknown = await res.json();
    return isPickResponse(json) ? { ok: true, response: json } : { ok: false, status: res.status };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
    opts.signal?.removeEventListener("abort", onAbort);
  }
}

/**
 * The /recommendations load flow (spec 3.3 steps 3 to 5): a cache hit returns
 * at once with no network call; otherwise POST /api/pick; on any failure the
 * local rules decide with reason "ai-error". The result is saved and returned.
 */
type PickResult = Awaited<ReturnType<typeof requestPick>>;

// One request per question in flight. A caller that aborts and a new caller
// that asks the same thing in the same tick (React's double effect in
// development, a quick remount) share one POST instead of sending two. The
// request is only cancelled once every caller has gone.
const inFlight = new Map<string, { promise: Promise<PickResult>; ctrl: AbortController; waiters: number }>();

function sharedPick(key: string, body: PickRequest, signal?: AbortSignal): Promise<PickResult> {
  let entry = inFlight.get(key);
  if (!entry) {
    const ctrl = new AbortController();
    const promise = requestPick(body, { signal: ctrl.signal }).finally(() => {
      if (inFlight.get(key)?.promise === promise) inFlight.delete(key);
    });
    entry = { promise, ctrl, waiters: 0 };
    inFlight.set(key, entry);
  }
  const e = entry;
  e.waiters++;
  let left = false;
  const leave = () => {
    if (left) return;
    left = true;
    e.waiters--;
    // Wait a tick: a caller that re-asks right away joins this request.
    setTimeout(() => {
      if (e.waiters <= 0 && inFlight.get(key) === e) {
        inFlight.delete(key);
        e.ctrl.abort();
      }
    }, 0);
  };
  if (signal?.aborted) leave();
  else signal?.addEventListener("abort", leave, { once: true });
  return e.promise.finally(() => {
    if (!left) {
      left = true;
      e.waiters--;
    }
    signal?.removeEventListener("abort", leave);
  });
}

export async function loadDecision(args: {
  profile: ProfileV2;
  currency: DisplayCurrency;
  adjust?: Adjust;
  exclude?: string[];
  signal?: AbortSignal;
}): Promise<{ decision: Decision; fromCache: boolean }> {
  const profile = normalizeProfile(args.profile);
  const { currency } = args;
  const adjust = resolveAdjust(profile, args.adjust);
  const exclude = args.exclude ?? [];
  const hit = cachedDecision(profile, adjust, exclude, undefined, currency);
  // a rules answer from a failed AI call is asked again once it is a minute old
  if (hit && !shouldRetryAi(hit)) return { decision: saveDecision(hit), fromCache: true };
  const res = await sharedPick(
    `${decisionKey(profile, adjust, exclude)}|${currency}`,
    { profile, adjust, exclude, currency },
    args.signal,
  );
  const response = res.ok
    ? res.response
    : rulesDecision(profile, adjust, exclude, { currency, reason: "ai-error" });
  const decision = makeDecision(response, { profile, adjust, exclude, origin: "pick", currency });
  // A caller that aborted (unmount, React's double effect) must not cache a fallback.
  if (args.signal?.aborted) return { decision, fromCache: false };
  return { decision: saveDecision(decision), fromCache: false };
}

/**
 * "Re-pick" with a note (spec 3.3): excludes the current pick (keeping at most
 * 3 exclusions) and asks the AI once. Only an AI answer counts; anything else
 * resolves { ok: false } and the page keeps the current decision.
 */
export async function repickWithNote(
  prev: Decision,
  profile: ProfileV2,
  note: string,
  currency: DisplayCurrency,
): Promise<{ ok: true; decision: Decision } | { ok: false; reason: "limit" | "failed" }> {
  if (Math.max(prev.repicks.length, repicksUsed(profile)) >= MAX_REPICKS) return { ok: false, reason: "limit" };
  const text = note.trim().slice(0, 200);
  if (!text || !prev.pickId) return { ok: false, reason: "failed" };
  const exclude = addExclude(prev.exclude, prev.pickId);
  const res = await requestPick({
    profile: normalizeProfile(profile),
    adjust: prev.adjust,
    note: text,
    exclude,
    currency,
  });
  if (!res.ok || !isAiEngine(res.response.engine) || !res.response.pickId) {
    return { ok: false, reason: "failed" };
  }
  countRepick(profile);
  const decision = makeDecision(res.response, {
    profile,
    adjust: prev.adjust,
    exclude,
    note: text,
    origin: "repick",
    repicks: [...prev.repicks, { note: text, fromId: prev.pickId, toId: res.response.pickId }],
    currency,
  });
  return { ok: true, decision: saveDecision(decision) };
}

/** Swapped answers live beside the entry they replaced, never over it, so a chip or Reset can still find the AI's. */
function swapKey(key: string): string {
  return key.endsWith(SWAP_SUFFIX) ? key : `${key}${SWAP_SUFFIX}`;
}
const SWAP_SUFFIX = ":swap";

/**
 * "Make this my pick": local, no network. Saved as the newest entry under its
 * own key (swapKey), so the swap survives a reload and the AI's entry for the
 * same inputs stays cached. The answer on screen before the first swap is
 * kept on the entry (beforeSwap), so Reset can bring the AI's pick back.
 */
export function swapDecision(prev: Decision, newPickId: string, profile: ProfileV2): Decision {
  const result = fit(profile, prev.adjust, { currency: prev.currency, exclude: prev.exclude });
  const response = swapPick(prev, newPickId, {
    profile,
    adjust: prev.adjust,
    result,
    currency: prev.currency,
  });
  if (response === prev) return prev;
  const beforeSwap = prev.beforeSwap ?? { ...pickResponseOf(prev), origin: prev.origin };
  return saveDecision({
    ...prev,
    ...pickResponseOf(response),
    key: swapKey(prev.key),
    origin: "swapped",
    funnel: result.funnel,
    ruledOut: result.ruledOut,
    beforeSwap,
  });
}

/** A swapped entry turned back into the answer it replaced. */
function unswapped(d: Decision): Decision {
  if (d.origin !== "swapped" || !d.beforeSwap) return d;
  const { origin, ...resp } = d.beforeSwap;
  const back: Decision = { ...d, ...pickResponseOf(resp), origin };
  delete back.beforeSwap;
  return back;
}

/**
 * The AI's module map at its fullest. A chip like Shorter trims each course's
 * coverage to the part in scope, so a chain of chips (swap then Shorter then
 * Shorter off, or Shorter, Cheaper, Shorter off) would keep the trimmed map.
 * For each course this takes the entry with the most mapped modules from the
 * decision on screen, the answer before a swap, and the cached answer for the
 * default chips; adjustPick then trims it to the scope that applies now.
 * Gap indices agree across these: the gaps come from the same profile.
 */
function withFullCoverage<T extends Pick<Decision, "coverage">>(d: T, prev: Decision, profile: ProfileV2): T {
  const first = cachedDecision(profile, defaultAdjust(profile), [], undefined, prev.currency);
  const best = new Map<string, CandidateCoverage>();
  for (const list of [d.coverage, prev.coverage, prev.beforeSwap?.coverage, first?.coverage]) {
    for (const c of list ?? []) {
      if (c.source === "keywords") continue;
      const cur = best.get(c.id);
      if (!cur || modulesMapped(c.gaps) > modulesMapped(cur.gaps)) best.set(c.id, c);
    }
  }
  if (best.size === 0) return d;
  const ids = new Set(d.coverage.map((c) => c.id));
  const coverage = [
    ...d.coverage.map((c) => best.get(c.id) ?? c),
    ...[...best.values()].filter((c) => !ids.has(c.id)),
  ];
  return { ...d, coverage };
}

/**
 * An adjust chip (spec 5.4): no network. Reuses a cached decision for the new
 * inputs when there is one; otherwise keeps the current AI pick if it still
 * fits, or lets the rules decide with origin "adjusted". Saved as its own
 * entry. `levelExclude` is the id a Too basic / Too advanced chip excluded.
 */
export function adjustDecision(
  prev: Decision,
  profile: ProfileV2,
  adjust: Adjust,
  exclude: string[],
  levelExclude?: string,
): Decision {
  // A swap is the user's own choice: it carries through a chip while the course
  // still fits, under the swap key, and only then does a cached answer apply.
  if (prev.origin === "swapped") {
    const kept = adjustPick(withFullCoverage(prev, prev, profile), profile, adjust, exclude, { currency: prev.currency });
    if (kept.origin === "swapped") {
      const d = makeDecision(kept.response, {
        profile,
        adjust,
        exclude,
        levelExclude,
        origin: "swapped",
        repicks: prev.repicks,
        currency: prev.currency,
        result: kept.result,
      });
      // keep the answer the swap replaced, so Reset can still bring it back
      return saveDecision({ ...d, key: swapKey(d.key), ...(prev.beforeSwap ? { beforeSwap: prev.beforeSwap } : {}) });
    }
  }
  const hit = cachedDecision(profile, adjust, exclude, undefined, prev.currency);
  if (hit) {
    const lx = levelExclude && exclude.includes(levelExclude) ? levelExclude : undefined;
    const same = hit.levelExclude === lx;
    const next: Decision = same ? hit : { ...hit, ...(lx ? { levelExclude: lx } : {}) };
    if (!same && !lx) delete next.levelExclude;
    return saveDecision(next);
  }
  // a swapped course that no longer fits leaves the choice to the rules
  const base = withFullCoverage(prev.origin === "swapped" ? unswapped(prev) : prev, prev, profile);
  const { response, origin, result } = adjustPick(base, profile, adjust, exclude, {
    currency: prev.currency,
  });
  return saveDecision(
    makeDecision(response, {
      profile,
      adjust,
      exclude,
      levelExclude,
      origin,
      repicks: prev.repicks,
      currency: prev.currency,
      result,
    }),
  );
}

/**
 * Reset: back to the first decision for these answers (the AI's, when it
 * ran), with chips, hidden courses and any swap undone. No network: it is the
 * cached answer for the default inputs, or the rules for them.
 */
export function resetDecision(prev: Decision, profile: ProfileV2): Decision {
  const adjust = defaultAdjust(profile);
  const hit = cachedDecision(profile, adjust, [], undefined, prev.currency);
  if (hit) return saveDecision(unswapped(hit));
  return adjustDecision(prev.origin === "swapped" ? unswapped(prev) : prev, profile, adjust, []);
}

/** Fallback text for a failed request, used by pages that call requestPick directly. */
export function rulesFallback(
  profile: ProfileV2,
  currency: DisplayCurrency,
  adjust?: Adjust,
  exclude: string[] = [],
  reason: PickReason = "ai-error",
): PickResponse {
  return rulesDecision(profile, adjust, exclude, { currency, reason });
}
