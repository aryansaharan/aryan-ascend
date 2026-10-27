import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { DEFAULT_MODEL } from "./format";

// Server-only provider wiring. Imported only by server code (the three *-ai.ts
// modules and the API routes), so the SDK and the key never reach the client
// bundle.
//
// Anthropic's Claude through the official SDK. The key comes from
// ANTHROPIC_API_KEY, the model from AI_MODEL (only a "claude-" id counts, so a
// stale value from another provider can't make every call fail), defaulting to
// Claude Opus 5.5.

if (typeof window !== "undefined") {
  throw new Error("lib/ai.ts is server-only");
}

export const MODEL =
  process.env.AI_MODEL && process.env.AI_MODEL.toLowerCase().startsWith("claude-")
    ? process.env.AI_MODEL
    : DEFAULT_MODEL;

export function aiEnabled(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let client: Anthropic | null = null;
function anthropic(): Anthropic {
  client ??= new Anthropic();
  return client;
}

// Haiku has no server-side fallback (a declined request stays declined, and a
// list returns a 400), so the fallback opt-in is sent only for the models that
// support it.
const SUPPORTS_FALLBACK = !/haiku/.test(MODEL);

/**
 * What every route's verifier reads: "stop" means a complete answer that
 * parsed. `model` is the model that actually wrote the answer: the requested
 * one, or the fallback model when the server-side fallback served the turn.
 */
export type ModelAnswer = { finishReason: string | undefined; output: unknown; raw: unknown; model?: string };

function finishReasonOf(stop: string | null | undefined): string | undefined {
  if (stop === "end_turn") return "stop";
  if (stop === "max_tokens" || stop === "model_context_window_exceeded") return "length";
  return stop ?? undefined;
}

/**
 * One structured-output call. The schema constrains the answer server-side and
 * the SDK parses it; anything incomplete, refused or unparseable comes back
 * with a finishReason other than "stop", so the caller's verifier returns the
 * rules answer instead. Thrown errors (network, 4xx/5xx, timeout) propagate to
 * the caller, which also falls back to the rules.
 *
 * Effort is "low": the answers are short and structured, and these calls sit
 * in front of a person waiting. Thinking can't be turned off on Claude Opus
 * 5.5, so max_tokens leaves room for it on top of the visible answer.
 */
export async function structuredCall<S extends z.ZodType>({
  system,
  prompt,
  schema,
  maxTokens,
  timeoutMs,
  client: injected,
}: {
  system: string;
  prompt: string;
  schema: S;
  maxTokens: number;
  timeoutMs: number;
  /** for the offline eval only: a client with a fake fetch */
  client?: Anthropic;
}): Promise<ModelAnswer> {
  const res = await (injected ?? anthropic()).beta.messages.create(
    {
      model: MODEL,
      max_tokens: maxTokens,
      ...(SUPPORTS_FALLBACK
        ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
        : {}),
      output_config: { effort: "low", format: { type: "json_schema", schema: jsonSchemaFor(schema) } },
      system,
      messages: [{ role: "user", content: prompt }],
    },
    { timeout: timeoutMs, maxRetries: 0 },
  );
  // When the requested model declines and a fallback model takes over, a
  // "fallback" block marks the hand-over: only the text after the last one is
  // the answer, and the model named on the page is the one that wrote it.
  let after = 0;
  let fallbackTo: string | undefined;
  res.content.forEach((b, i) => {
    if (b.type === "fallback") {
      after = i + 1;
      fallbackTo = b.to?.model;
    }
  });
  const servedBy =
    res.usage?.iterations?.find((it) => it.type === "fallback_message")?.model ?? fallbackTo ?? res.model ?? MODEL;
  const model = typeof servedBy === "string" && servedBy ? servedBy : MODEL;
  const text = res.content
    .slice(after)
    .map((b) => (b.type === "text" ? b.text : ""))
    .join("")
    .trim();
  const finish = finishReasonOf(res.stop_reason);
  const raw = parseOrText(text);
  if (finish !== "stop") return { finishReason: finish, output: undefined, raw, model };
  // Constrained decoding makes the shape right; zod is the last check, and
  // anything it rejects is an invalid answer for the verifier, not an outage.
  const parsed = typeof raw === "object" && raw !== null ? schema.safeParse(raw) : null;
  return parsed?.success
    ? { finishReason: "stop", output: parsed.data, raw, model }
    : { finishReason: "invalid", output: undefined, raw, model };
}

// JSON schema ------------------------------------------------------------------
//
// Structured outputs enforce a subset of JSON Schema while decoding. Like the
// SDK's own zod helper, this keeps what the API enforces and moves the rest
// into the description, with one difference that matters here: enum and const
// stay as real constraints (the API enforces them), so course ids, gap ids and
// directions can only be ones code offered. Zod's safe-integer bounds are
// dropped rather than described.

const STRING_FORMATS = new Set(["date-time", "time", "date", "duration", "email", "hostname", "uri", "ipv4", "ipv6", "uuid"]);
const SAFE_BOUND = Number.MAX_SAFE_INTEGER;

type Json = Record<string, unknown>;

function take(o: Json, k: string): unknown {
  const v = o[k];
  delete o[k];
  return v;
}

function strict(node: Json): Json {
  const out: Json = {};
  const defs = take(node, "$defs") as Record<string, Json> | undefined;
  if (defs) out.$defs = Object.fromEntries(Object.entries(defs).map(([k, v]) => [k, strict(v)]));
  const ref = take(node, "$ref");
  if (ref !== undefined) {
    out.$ref = ref;
    return out;
  }
  const type = take(node, "type");
  const anyOf = (take(node, "anyOf") ?? take(node, "oneOf")) as Json[] | undefined;
  const allOf = take(node, "allOf") as Json[] | undefined;
  if (Array.isArray(anyOf)) out.anyOf = anyOf.map(strict);
  else if (Array.isArray(allOf)) out.allOf = allOf.map(strict);
  else if (type !== undefined) out.type = type;
  for (const k of ["description", "title", "enum", "const"]) {
    const v = take(node, k);
    if (v !== undefined) out[k] = v;
  }
  if (type === "object") {
    const props = (take(node, "properties") ?? {}) as Record<string, Json>;
    out.properties = Object.fromEntries(Object.entries(props).map(([k, v]) => [k, strict(v)]));
    take(node, "additionalProperties");
    out.additionalProperties = false;
    const required = take(node, "required");
    if (required !== undefined) out.required = required;
  } else if (type === "string") {
    const format = take(node, "format");
    if (typeof format === "string" && STRING_FORMATS.has(format)) out.format = format;
    else if (format !== undefined) node.format = format;
  } else if (type === "array") {
    const items = take(node, "items") as Json | undefined;
    if (items) out.items = strict(items);
    const minItems = take(node, "minItems");
    if (minItems === 0 || minItems === 1) out.minItems = minItems;
    else if (minItems !== undefined) node.minItems = minItems;
  } else if (type === "integer" || type === "number") {
    if (Math.abs(Number(node.minimum)) >= SAFE_BOUND) delete node.minimum;
    if (Math.abs(Number(node.maximum)) >= SAFE_BOUND) delete node.maximum;
  }
  delete node.$schema;
  if (Object.keys(node).length > 0) {
    const extra = Object.entries(node)
      .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
      .join(", ");
    out.description = `${out.description ? `${out.description}\n\n` : ""}{${extra}}`;
  }
  return out;
}

/** The JSON schema sent as the structured-output format for a zod schema. */
export function jsonSchemaFor(schema: z.ZodType): Json {
  return strict(JSON.parse(JSON.stringify(z.toJSONSchema(schema, { reused: "ref" }))) as Json);
}

function parseOrText(text: string): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
