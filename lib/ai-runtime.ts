import { createHash } from "node:crypto";
import { aiEnabled } from "./ai";

// Server-only plumbing shared by the three AI routes (understand, pick,
// tailor): which mode answers, the in-memory cache, timeouts and the
// non-production test and mock switches. Pages never import this.

if (typeof window !== "undefined") {
  throw new Error("lib/ai-runtime.ts is server-only");
}

/**
 * Every model call: 25 s, then the rules answer, so the server answers before
 * the client gives up at 30 s (lib/ai-client.ts). Claude Opus 5.5 at low effort
 * answered the largest of these calls in about 6 to 10 s when measured.
 */
export const AI_TIMEOUT_MS = 25_000;

// Modes ------------------------------------------------------------------------

export type AiTestMode = "length" | "error" | "timeout" | "fake";

/**
 * ASCEND_TEST_AI simulates the model outside production, on all three routes,
 * so every fallback can be exercised without a key: "length" (cut-off answer),
 * "error" (thrown), "timeout" (aborted), "fake" (a canned answer that the
 * checks have to fix).
 */
export function aiTestMode(): AiTestMode | null {
  if (process.env.NODE_ENV === "production") return null;
  const v = process.env.ASCEND_TEST_AI;
  return v === "length" || v === "error" || v === "timeout" || v === "fake" ? v : null;
}

/**
 * The dev-only mock (ASCEND_MOCK_AI=1 in .env.development.local): never in
 * production and never when a real key is set. Answers are built from the
 * request by keyword heuristics, then go through the same checks as the model.
 */
export function mockEnabled(): boolean {
  return (
    process.env.NODE_ENV !== "production" &&
    process.env.ASCEND_MOCK_AI === "1" &&
    !aiEnabled()
  );
}

/** Who answers this request: a test flag, the real model, the dev mock, or nobody (rules). */
export type AiMode =
  | { kind: "test"; mode: AiTestMode }
  | { kind: "live" }
  | { kind: "mock" }
  | { kind: "off" };

export function aiMode(): AiMode {
  const test = aiTestMode();
  if (test) return { kind: "test", mode: test };
  if (aiEnabled()) return { kind: "live" };
  if (mockEnabled()) return { kind: "mock" };
  return { kind: "off" };
}

/** True when something can stand in for the rules: a key, a test flag or the mock. */
export function aiAvailable(): boolean {
  return aiMode().kind !== "off";
}

/** Simulated mock latency, so loading states are visible in dev. ASCEND_MOCK_DELAY_MS overrides 900. */
export function mockDelay(): Promise<void> {
  const raw = Number(process.env.ASCEND_MOCK_DELAY_MS);
  const ms = Number.isFinite(raw) && raw >= 0 ? Math.min(raw, 8000) : 900;
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Throws or returns what a test flag simulates; "fake" is handled by each caller. */
export function simulateFailure(mode: AiTestMode): { finishReason: string; output: undefined; raw: string } | null {
  if (mode === "error") throw new Error("Simulated AI error (ASCEND_TEST_AI=error)");
  if (mode === "timeout") {
    throw new DOMException("Simulated timeout (ASCEND_TEST_AI=timeout)", "TimeoutError");
  }
  if (mode === "length") return { finishReason: "length", output: undefined, raw: '{"cut":"' };
  return null;
}

// Errors -----------------------------------------------------------------------

export function isTimeout(err: unknown, elapsed: number): boolean {
  const names = new Set(["AbortError", "TimeoutError", "APIConnectionTimeoutError"]);
  let e: unknown = err;
  for (let i = 0; i < 4 && e && typeof e === "object"; i++) {
    const name = (e as { name?: unknown }).name;
    if (typeof name === "string" && names.has(name)) return true;
    if (names.has((e as { constructor?: { name?: string } }).constructor?.name ?? "")) return true;
    e = (e as { cause?: unknown }).cause;
  }
  return elapsed >= AI_TIMEOUT_MS - 100;
}

export function tryParse(text: string | undefined): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

// Cache ------------------------------------------------------------------------

export const CACHE_MAX = 200;
export const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

/** Small in-memory LRU with a TTL. Per server instance, lost on cold start. */
export class LruCache<V> {
  private map = new Map<string, { value: V; at: number }>();
  constructor(
    private max: number = CACHE_MAX,
    private ttl: number = CACHE_TTL_MS,
  ) {}
  get(key: string, now = Date.now()): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    if (now - hit.at > this.ttl) {
      this.map.delete(key);
      return undefined;
    }
    this.map.delete(key);
    this.map.set(key, hit);
    return hit.value;
  }
  set(key: string, value: V, now = Date.now()): void {
    this.map.delete(key);
    this.map.set(key, { value, at: now });
    while (this.map.size > this.max) {
      const oldest = this.map.keys().next().value;
      if (oldest === undefined) break;
      this.map.delete(oldest);
    }
  }
  clear(): void {
    this.map.clear();
  }
  get size(): number {
    return this.map.size;
  }
}

/**
 * Cache key for a request: sha256 of its JSON. A strong hash, because a
 * collision would hand one person's answer (with quotes from their text) to
 * someone else.
 */
export function requestHash(value: unknown): string {
  return createHash("sha256").update(JSON.stringify(value)).digest("base64url");
}
