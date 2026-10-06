import type { z } from "zod";

// Server-only gate for the AI routes. Runs before any model call, in order:
//   1. 403 unless the request comes from this site's own pages
//   2. 413 if the body is larger than MAX_BODY_BYTES
//   3. 429 if this IP has used up its allowance for the route
//   4. 400 unless the body is JSON that matches the route's schema
//
// The origin check stops other websites from using the API through a
// visitor's browser. It does not stop scripts, which can fake any header;
// the rate limit is what slows those down.

const ALLOWED_ORIGIN = "https://ascendmvp.vercel.app";
const MAX_BODY_BYTES = 20_000;

// Best-effort, per server instance: memory is not shared between Vercel
// instances and resets on cold start. A shared store (Upstash Redis) or a
// Vercel Firewall rate-limit rule would enforce this globally.
const RATE_LIMIT = 10;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const MAX_TRACKED_KEYS = 5_000;
const hits = new Map<string, number[]>();

function json(status: number, error: string, headers?: HeadersInit): Response {
  return Response.json({ error }, { status, headers });
}

function isSameSite(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "same-origin") return true;
  return request.headers.get("origin") === ALLOWED_ORIGIN;
}

function clientIp(request: Request): string {
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || "unknown";
}

/** Returns 0 if allowed, otherwise the seconds until the next request is. */
function retryAfterSeconds(key: string, now: number): number {
  const recent = (hits.get(key) ?? []).filter((t) => now - t < RATE_WINDOW_MS);
  if (recent.length >= RATE_LIMIT) {
    hits.set(key, recent);
    return Math.max(1, Math.ceil((recent[0] + RATE_WINDOW_MS - now) / 1000));
  }
  recent.push(now);
  hits.set(key, recent);
  if (hits.size > MAX_TRACKED_KEYS) {
    for (const [k, times] of hits) {
      if (times.every((t) => now - t >= RATE_WINDOW_MS)) hits.delete(k);
    }
  }
  return 0;
}

/** Reads the body as text, giving up as soon as it passes the size cap. */
async function readCapped(request: Request): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY_BYTES) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  return new TextDecoder().decode(Buffer.concat(chunks));
}

export async function guardRequest<T>(
  request: Request,
  route: string,
  schema: z.ZodType<T>,
): Promise<{ ok: true; body: T } | { ok: false; response: Response }> {
  if (!isSameSite(request)) {
    return { ok: false, response: json(403, "Forbidden") };
  }

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY_BYTES) {
    return { ok: false, response: json(413, "Request too large") };
  }

  const wait = retryAfterSeconds(`${route}:${clientIp(request)}`, Date.now());
  if (wait > 0) {
    return {
      ok: false,
      response: json(429, "Too many requests. Try again in a few minutes.", {
        "retry-after": String(wait),
      }),
    };
  }

  const text = await readCapped(request);
  if (text === null) {
    return { ok: false, response: json(413, "Request too large") };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, response: json(400, "Invalid request body") };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false, response: json(400, "Invalid request body") };
  }
  return { ok: true, body: parsed.data };
}
