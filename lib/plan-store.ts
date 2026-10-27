import { MOVE_IDS, outlineHash, type Baseline, type Course, type MoveId } from "./course-types";
import { backupSlot, isObstacle, type Obstacle } from "./booking";
import { courseById } from "./catalog";
import { maxPlanN } from "./fit";
import { restartList, type Restart } from "./plan-build";
import { HAS_DASH, HYPE_RE, NUMBER_UNIT_RE, URL_RE } from "./text-rules";
import { HOURS, type Hours } from "./profile";
import { localGet, localSet } from "./local-store";
import { LATEST_PLAN_KEY, PLANS_KEY, progressKey } from "./storage-keys";

// The plan link and everything saved on this device (spec 6.1, 6.2,
// addendum-ai Job 4). The payload lives in the URL hash, so the typed role and
// tailored tasks never reach server logs. Tailored tasks are stored once in
// the payload, so reopening a plan never calls the AI and it reads the same
// everywhere. Progress (ticks, first session done) lives only in localStorage.

export type PlanPayloadV2 = {
  v: 2;
  /** 8 chars, crypto.getRandomValues */
  id: string;
  /** course id */
  c: string;
  /**
   * modules in scope (a prefix). Whole when n === modules.length on a course
   * with no `beyond`, or n === modules.length + 1 (the tail included, lib/fit
   * planN). n === modules.length on a course with `beyond` is a trimmed plan.
   */
  n: number;
  h: Hours;
  m: MoveId;
  b: Baseline;
  /** role, at most 200 chars (trimmed to 120 if the link runs long) */
  r: string;
  /** commitAt, ISO UTC */
  t: string;
  /** first session, ISO UTC */
  s: string;
  /** backup slot, ISO UTC */
  k: string;
  o: Obstacle;
  /** useItAtWork, at most 140 (AI text only if the user kept the AI's pick) */
  w?: string;
  /** who chose the course: the AI, the dev mock, or the rules (also after a swap) */
  e: "ai" | "rules" | "mock";
  /** outlineHash at creation */
  mh: string;
  /** reschedules */
  rb?: number;
  /** restart: weeks >= w start on local date d; a list after more than one restart */
  rs?: Restart | Restart[];
  /** tailored tasks, one per week, each at most 170 chars (POST /api/tailor) */
  tw?: string[];
  /** tailored "When you finish, you'll have" line, at most 220 chars */
  ta?: string;
  /** who wrote tw/ta: the AI, the dev mock, or templates */
  te?: "ai" | "rules" | "mock";
  /** the model that tailored the tasks (te === "ai" only), so a reopened link names it */
  tm?: string;
  /** weeks (1-based) whose task is a template even though tw is set */
  tf?: number[];
  /** module indices the pick said they can skim, at most 3 */
  sk?: number[];
};

export type Progress = { firstSessionDoneAt?: string; weeksDone: number[] };

export { LATEST_PLAN_KEY, PLANS_KEY, progressKey };
/** The whole "/plan#p=..." path stays under this (addendum-ai). */
export const MAX_LINK_CHARS = 2000;
export const TASK_CHARS = 170;
export const ARTIFACT_CHARS = 220;
const MAX_WEEKS_STORED = 16;
/** Decompressed payloads larger than this are rejected (a link can't inflate into megabytes). */
const MAX_INFLATED_BYTES = 32_000;

// Encoding -------------------------------------------------------------------

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(token: string): Uint8Array | null {
  try {
    if (!/^[A-Za-z0-9_-]*$/.test(token)) return null;
    const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
    const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
    return Uint8Array.from(bin, (ch) => ch.charCodeAt(0));
  } catch {
    return null;
  }
}

function toBase64Url(text: string): string {
  return bytesToBase64Url(new TextEncoder().encode(text));
}

function fromBase64Url(token: string): string | null {
  const bytes = base64UrlToBytes(token);
  if (!bytes) return null;
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

/** True where CompressionStream("deflate-raw") exists (current browsers, Node 18+). */
export function canCompress(): boolean {
  try {
    return typeof CompressionStream !== "undefined" && Boolean(new CompressionStream("deflate-raw"));
  } catch {
    return false;
  }
}

async function deflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  const stream = new Blob([bytes as BlobPart]).stream().pipeThrough(new CompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array | null> {
  try {
    const reader = new Blob([bytes as BlobPart])
      .stream()
      .pipeThrough(new DecompressionStream("deflate-raw"))
      .getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_INFLATED_BYTES) {
        await reader.cancel().catch(() => {});
        return null;
      }
      chunks.push(value);
    }
    const out = new Uint8Array(total);
    let at = 0;
    for (const c of chunks) {
      out.set(c, at);
      at += c.byteLength;
    }
    return out;
  } catch {
    return null;
  }
}

function orderedRestarts(rs: Restart | Restart[]): Restart | Restart[] {
  const list = restartList(rs).map((r) => ({ w: r.w, d: r.d }));
  return list.length === 1 ? list[0] : list;
}

function isRestart(x: unknown): x is Restart {
  if (typeof x !== "object" || x === null) return false;
  const { w, d } = x as { w?: unknown; d?: unknown };
  if (!Number.isInteger(w) || (w as number) < 1 || (w as number) > 64) return false;
  if (typeof d !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
  const year = Number(d.slice(0, 4));
  return year >= 2020 && year < 2100;
}

/** Fixed key order so the same plan always encodes to the same link. */
function ordered(p: PlanPayloadV2): PlanPayloadV2 {
  return {
    v: 2,
    id: p.id,
    c: p.c,
    n: p.n,
    h: p.h,
    m: p.m,
    b: p.b,
    r: p.r,
    t: p.t,
    s: p.s,
    k: p.k,
    o: p.o,
    ...(p.w ? { w: p.w } : {}),
    e: p.e,
    mh: p.mh,
    ...(p.rb ? { rb: p.rb } : {}),
    ...(p.rs ? { rs: orderedRestarts(p.rs) } : {}),
    ...(p.tw && p.tw.length ? { tw: p.tw.map((t) => t.slice(0, TASK_CHARS)) } : {}),
    ...(p.ta ? { ta: p.ta.slice(0, ARTIFACT_CHARS) } : {}),
    ...(p.te ? { te: p.te } : {}),
    ...(p.tm && p.te === "ai" ? { tm: p.tm } : {}),
    ...(p.tf && p.tf.length ? { tf: [...p.tf] } : {}),
    ...(p.sk && p.sk.length ? { sk: [...p.sk] } : {}),
  };
}

const DANGLING = /(?:\s+(?:and|then|with|for|to|or|but|so|the|a|an|of|in|on|at|your|their))+$/i;

/**
 * A task cut to fit `n` characters (full stop included): at the last
 * sentence end inside the limit when there is one, else at a word, with
 * trailing commas and dangling joiners ("and", "then", "for") removed, so it
 * never ends "renewal list,." or "segment 2, then.".
 */
export function shortenTask(t: string, n: number): string {
  if (t.length <= n) return t;
  const head = t.slice(0, n);
  const end = head.match(/^[\s\S]*[.?](?=\s|$)/);
  if (end && end[0].trim().length >= n * 0.5) return end[0].trim();
  let cut = t.slice(0, n - 1);
  if (/\S/.test(t.charAt(n - 1))) cut = cut.replace(/\s+\S*$/, "");
  for (let i = 0; i < 4; i++) cut = cut.replace(/[\s,;:]+$/, "").replace(DANGLING, "");
  return `${cut.replace(/[\s,;:.]+$/, "")}.`;
}

/**
 * Smaller versions of a payload, tried in order until the link fits: the role
 * trimmed to 120, tasks cut to 140 then 110 then 80 characters, the finish
 * line cut, `w` dropped, and finally the tailored text dropped (the plan then
 * shows templates, and the full text stays in the copy saved on this device).
 */
function shrinkSteps(p: PlanPayloadV2): PlanPayloadV2[] {
  const cutTask = (t: string, n: number) => shortenTask(t, n);
  const steps: PlanPayloadV2[] = [p];
  let cur: PlanPayloadV2 = { ...p, r: p.r.slice(0, 120) };
  steps.push(cur);
  for (const n of [140, 110, 80]) {
    if (!cur.tw) break;
    cur = { ...cur, tw: cur.tw.map((t) => cutTask(t, n)) };
    steps.push(cur);
  }
  if (cur.ta) {
    cur = { ...cur, ta: cutTask(cur.ta, 140) };
    steps.push(cur);
  }
  if (cur.w) {
    cur = { ...cur };
    delete cur.w;
    steps.push(cur);
  }
  if (cur.tw || cur.ta) {
    cur = { ...cur };
    delete cur.tw;
    delete cur.ta;
    delete cur.tf;
    delete cur.tm;
    cur.te = "rules";
    steps.push(cur);
  }
  return steps.map(ordered);
}

const PATH_PREFIX = "/plan#p=";

/**
 * Uncompressed link token: "u." + base64url(UTF-8 JSON), shrunk until the path
 * fits in MAX_LINK_CHARS. Used where CompressionStream is missing.
 */
export function encodePlanUncompressed(p: PlanPayloadV2): string {
  let token = "";
  for (const step of shrinkSteps(ordered(p))) {
    token = `u.${toBase64Url(JSON.stringify(step))}`;
    if (PATH_PREFIX.length + token.length <= MAX_LINK_CHARS) return token;
  }
  return token;
}

/**
 * The link token (addendum-ai): "z." + base64url(deflate-raw(UTF-8 JSON)) where
 * CompressionStream exists, otherwise the "u." form. Shrinks the payload until
 * "/plan#p=" plus the token fits in 2,000 characters.
 */
export async function encodePlan(p: PlanPayloadV2): Promise<string> {
  if (!canCompress()) return encodePlanUncompressed(p);
  let token = "";
  for (const step of shrinkSteps(ordered(p))) {
    const bytes = await deflateRaw(new TextEncoder().encode(JSON.stringify(step)));
    token = `z.${bytesToBase64Url(bytes)}`;
    if (PATH_PREFIX.length + token.length <= MAX_LINK_CHARS) return token;
  }
  return token;
}

/** toISOString() output only, between 2020 and 2100: a far-future date would overflow the week maths. */
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const MIN_MS = Date.UTC(2020, 0, 1);
const MAX_MS = Date.UTC(2100, 0, 1);

function isIso(v: unknown): v is string {
  if (typeof v !== "string" || !ISO_UTC.test(v)) return false;
  const ms = Date.parse(v);
  return ms > MIN_MS && ms < MAX_MS;
}

/** A Claude model id ("claude-opus-5-5", "claude-sonnet-4-5-20250929"): the only kind a plan names. */
const MODEL_ID_RE = /^claude-[a-z]+-\d+(?:-\d{1,2})?(?:-\d{8})?$/;

function normName(s: string): string {
  return s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

/**
 * Text a link may show as the AI's: no dashes, links, stated numbers or hype.
 * A quoted module name of the plan's own course is copied text, so its "!" or
 * "Three Months" doesn't count; hype inside any quote doesn't either.
 */
function linkTextOk(t: string, names: ReadonlySet<string> = new Set()): boolean {
  const masked = t.replace(/["“]([^"”]{1,200})["”]/g, (whole, inner: string) => (names.has(normName(inner)) ? " " : whole));
  const outsideQuotes = t.replace(/["“][^"”]*["”]/g, " ");
  return !HAS_DASH.test(masked) && !URL_RE.test(t) && !NUMBER_UNIT_RE.test(masked) && !HYPE_RE.test(outsideQuotes);
}

/** The plan course's title and module names, as linkTextOk compares them. */
function courseNames(id: string): Set<string> {
  const c = courseById(id);
  return new Set(c ? [c.title, ...c.modules.map((m) => m.name)].map(normName) : []);
}

/**
 * A link can carry any text, so AI-attributed text is checked again here: a
 * week whose task breaks Ascend's text rules shows its template (tf), a
 * finish line or pick line that does is dropped, and with nothing tailored
 * left the plan stops naming a model.
 */
function recheckLinkText(p: PlanPayloadV2): PlanPayloadV2 {
  const next: PlanPayloadV2 = { ...p };
  // The dev-only mock never answers in production, so a link that says it did
  // (made on a dev server, or edited) shows Ascend's templates instead.
  if (process.env.NODE_ENV === "production") {
    if (next.e === "mock") {
      next.e = "rules";
      delete next.w;
      delete next.sk;
    }
    if (next.te === "mock") {
      delete next.tw;
      delete next.ta;
      delete next.tf;
      delete next.tm;
      next.te = "rules";
    }
  }
  // only a Claude model id is named as the one that tailored the tasks
  if (next.tm !== undefined && !MODEL_ID_RE.test(next.tm)) delete next.tm;
  const names = courseNames(next.c);
  if (next.w && !linkTextOk(next.w, names)) delete next.w;
  if (next.ta && !linkTextOk(next.ta, names)) delete next.ta;
  if (next.tw) {
    const tf = new Set(next.tf ?? []);
    next.tw.forEach((t, i) => {
      if (!linkTextOk(t, names)) tf.add(i + 1);
    });
    if (tf.size) next.tf = [...tf].sort((a, b) => a - b);
    if (next.tw.every((_, i) => tf.has(i + 1))) {
      delete next.tw;
      delete next.tf;
    }
  }
  if (next.te && next.te !== "rules" && !next.tw && !next.ta) {
    next.te = "rules";
    delete next.tm;
  }
  // the AI pick's work line rides along only with AI-tailored tasks, so a
  // templated plan never shows one AI-tagged week
  if (next.w && next.e !== "rules" && (next.te === undefined || next.te === "rules")) delete next.w;
  return next;
}

/** Validates a decoded object; null when anything is off. */
export function toPlanPayload(x: unknown): PlanPayloadV2 | null {
  if (!x || typeof x !== "object") return null;
  const p = x as Record<string, unknown>;
  const ok =
    p.v === 2 &&
    typeof p.id === "string" &&
    /^[a-z0-9]{4,16}$/.test(p.id) &&
    typeof p.c === "string" &&
    p.c.length <= 80 &&
    typeof p.n === "number" &&
    Number.isInteger(p.n) &&
    p.n >= 1 &&
    p.n <= 200 &&
    (HOURS as readonly unknown[]).includes(p.h) &&
    (MOVE_IDS as readonly unknown[]).includes(p.m) &&
    (p.b === 0 || p.b === 1 || p.b === 2) &&
    typeof p.r === "string" &&
    p.r.length <= 200 &&
    isIso(p.t) &&
    isIso(p.s) &&
    isIso(p.k) &&
    isObstacle(p.o) &&
    (p.w === undefined || (typeof p.w === "string" && p.w.length <= 140)) &&
    (p.e === "ai" || p.e === "rules" || p.e === "mock") &&
    typeof p.mh === "string" &&
    p.mh.length <= 12 &&
    (p.rb === undefined || (typeof p.rb === "number" && Number.isInteger(p.rb) && p.rb >= 0 && p.rb <= 99)) &&
    (p.rs === undefined ||
      isRestart(p.rs) ||
      (Array.isArray(p.rs) && p.rs.length >= 1 && p.rs.length <= MAX_WEEKS_STORED && p.rs.every(isRestart))) &&
    (p.tw === undefined ||
      (Array.isArray(p.tw) &&
        p.tw.length <= MAX_WEEKS_STORED &&
        p.tw.every((t) => typeof t === "string" && t.length <= TASK_CHARS))) &&
    (p.ta === undefined || (typeof p.ta === "string" && p.ta.length <= ARTIFACT_CHARS)) &&
    (p.te === undefined || p.te === "ai" || p.te === "rules" || p.te === "mock") &&
    (p.tm === undefined || (typeof p.tm === "string" && /^[A-Za-z0-9._-]{1,40}$/.test(p.tm))) &&
    (p.tf === undefined ||
      (Array.isArray(p.tf) &&
        p.tf.length <= MAX_WEEKS_STORED &&
        p.tf.every((k) => Number.isInteger(k) && k >= 1 && k <= MAX_WEEKS_STORED))) &&
    (p.sk === undefined ||
      (Array.isArray(p.sk) && p.sk.length <= 3 && p.sk.every((i) => Number.isInteger(i) && i >= 0 && i < 200)));
  return ok ? ordered(recheckLinkText(p as unknown as PlanPayloadV2)) : null;
}

function parsePayload(json: string | null): PlanPayloadV2 | null {
  if (!json) return null;
  try {
    return toPlanPayload(JSON.parse(json));
  } catch {
    return null;
  }
}

/**
 * Decodes "u." tokens and the earlier unprefixed base64url tokens without
 * waiting. Returns null for "z." tokens, which need decodePlan().
 */
export function decodePlanSync(token: string): PlanPayloadV2 | null {
  const t = token.trim();
  if (t.startsWith("z.")) return null;
  return parsePayload(fromBase64Url(t.startsWith("u.") ? t.slice(2) : t));
}

/** Decodes any plan token: "z." (compressed), "u." (uncompressed) or the earlier unprefixed form. */
export async function decodePlan(token: string): Promise<PlanPayloadV2 | null> {
  const t = token.trim();
  if (!t.startsWith("z.")) return decodePlanSync(t);
  if (typeof DecompressionStream === "undefined") return null;
  const bytes = base64UrlToBytes(t.slice(2));
  if (!bytes || bytes.length === 0) return null;
  const inflated = await inflateRaw(bytes);
  if (!inflated) return null;
  try {
    return parsePayload(new TextDecoder("utf-8", { fatal: true }).decode(inflated));
  } catch {
    return null;
  }
}

export type PlanHashResult =
  | { status: "none" }
  | { status: "invalid" }
  | { status: "ok"; plan: PlanPayloadV2 };

/**
 * Reads `#p=...` from a location hash. "none" when there's no plan in the
 * hash, "invalid" when there is one that doesn't decode.
 */
export async function readPlanHash(hash: string): Promise<PlanHashResult> {
  const m = /(?:^#|&)p=([^&]*)/.exec(hash);
  if (!m) return { status: "none" };
  let token: string;
  try {
    token = decodeURIComponent(m[1]);
  } catch {
    return { status: "invalid" };
  }
  const plan = await decodePlan(token);
  return plan ? { status: "ok", plan } : { status: "invalid" };
}

/** "/plan#p=..." for history.replaceState. */
export async function planPath(p: PlanPayloadV2): Promise<string> {
  return `${PATH_PREFIX}${await encodePlan(p)}`;
}

/** Absolute plan link for copying and calendar descriptions. */
export async function planUrl(p: PlanPayloadV2, origin: string): Promise<string> {
  return `${origin.replace(/\/$/, "")}${await planPath(p)}`;
}

// Building --------------------------------------------------------------------

/** 8 random lowercase letters and digits. */
export function newPlanId(): string {
  const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => alphabet[b % alphabet.length]).join("");
}

export type CreatePlanArgs = {
  course: Course;
  /** modules in scope: planN(course, scope) from lib/fit (modules.length + 1 for the whole course with its tail) */
  n: number;
  h: Hours;
  m: MoveId;
  b: Baseline;
  role: string;
  /** when the course was chosen (decision.commitAt) */
  commitAt: Date | string;
  /** first session */
  s: Date;
  o: Obstacle;
  /** backup; defaults to backupSlot(s, o) */
  k?: Date;
  /** useItAtWork to carry into week 1, only if the user kept the AI's pick */
  w?: string;
  /** who chose the course: decision.engine, or "rules" after a swap */
  e: "ai" | "rules" | "mock";
  id?: string;
  /** the tailoring (POST /api/tailor or the local template fallback) */
  tailoring?: {
    engine: "ai" | "rules" | "mock";
    tasks: string[];
    tailored: boolean[];
    artifact: string;
    artifactTailored: boolean;
    model?: string;
  };
  /** module indices of the pick they can skim (decision.skim[].module), kept AI pick only */
  skim?: number[];
};

export function createPlan(a: CreatePlanArgs): PlanPayloadV2 {
  const t = typeof a.commitAt === "string" ? new Date(a.commitAt) : a.commitAt;
  const w = a.w?.trim().slice(0, 140);
  // the same text check a link gets on opening, so this device and any other show the same tags
  return ordered(recheckLinkText({
    v: 2,
    id: a.id ?? newPlanId(),
    c: a.course.id,
    n: Math.max(1, Math.min(a.n, maxPlanN(a.course))),
    h: a.h,
    m: a.m,
    b: a.b,
    r: a.role.trim().slice(0, 200),
    t: t.toISOString(),
    s: a.s.toISOString(),
    k: (a.k ?? backupSlot(a.s, a.o)).toISOString(),
    o: a.o,
    ...(w ? { w } : {}),
    e: a.e,
    mh: outlineHash(a.course),
    ...tailoringFields(a.tailoring),
    ...(a.skim && a.skim.length ? { sk: [...new Set(a.skim)].slice(0, 3) } : {}),
  }));
}

/** tw / ta / te / tf from a tailoring answer; nothing when it was all templates. */
export function tailoringFields(t: CreatePlanArgs["tailoring"]): Pick<PlanPayloadV2, "tw" | "ta" | "te" | "tm" | "tf"> {
  if (!t || t.engine === "rules") return t ? { te: "rules" } : {};
  const anyTask = t.tailored.some(Boolean);
  const tf = t.tailored.map((ok, i) => (ok ? 0 : i + 1)).filter((k) => k > 0);
  const te = anyTask || t.artifactTailored ? t.engine : "rules";
  const tm = te === "ai" && t.model && MODEL_ID_RE.test(t.model) ? t.model : undefined;
  return {
    ...(anyTask ? { tw: t.tasks.slice(0, MAX_WEEKS_STORED).map((x) => x.slice(0, TASK_CHARS)) } : {}),
    ...(t.artifactTailored ? { ta: t.artifact.slice(0, ARTIFACT_CHARS) } : {}),
    te,
    ...(tm ? { tm } : {}),
    ...(anyTask && tf.length ? { tf } : {}),
  };
}

/** Adds a tailoring to an existing plan (e.g. when it arrives after the plan was made). */
export function withTailoring(p: PlanPayloadV2, t: NonNullable<CreatePlanArgs["tailoring"]>): PlanPayloadV2 {
  const next: PlanPayloadV2 = { ...p };
  delete next.tw;
  delete next.ta;
  delete next.tf;
  delete next.tm;
  return ordered({ ...next, ...tailoringFields(t) });
}

/** "Not yet": a new first session, a recomputed backup, one more reschedule. */
export function reschedule(p: PlanPayloadV2, s: Date): PlanPayloadV2 {
  return ordered({
    ...p,
    s: s.toISOString(),
    k: backupSlot(s, p.o).toISOString(),
    rb: (p.rb ?? 0) + 1,
  });
}

/**
 * "Restart from Monday": weeks from `w` on start at local date `d`. Earlier
 * restarts of earlier weeks stay, so the weeks they moved keep their dates;
 * restarts from week `w` or later are replaced.
 */
export function restartFrom(p: PlanPayloadV2, w: number, d: string): PlanPayloadV2 {
  const kept = restartList(p.rs).filter((r) => r.w < w);
  return ordered({ ...p, rs: orderedRestarts([...kept, { w, d }]) });
}

/** Whole hours from choosing (t) to the first session (s). */
export function hoursToStart(p: PlanPayloadV2): number {
  return Math.round((Date.parse(p.s) - Date.parse(p.t)) / 3_600_000);
}

/** The first session was booked within 48 hours of choosing (s <= t + 48h). */
export function startsWithin48h(p: PlanPayloadV2): boolean {
  return Date.parse(p.s) <= Date.parse(p.t) + 48 * 3_600_000;
}

/** Check-in banner: the session time plus 25 minutes has passed and it isn't confirmed. */
export function checkInDue(p: PlanPayloadV2, progress: Progress, now: Date = new Date()): boolean {
  return now.getTime() > Date.parse(p.s) + 25 * 60_000 && !progress.firstSessionDoneAt;
}

// Storage -------------------------------------------------------------------

function read<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localGet(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

/** Writes through lib/local-store; false when only memory kept it (storage blocked). */
function write(key: string, value: unknown): boolean {
  if (typeof window === "undefined") return false;
  return localSet(key, JSON.stringify(value));
}

/** False in private modes that block storage; the plan page then says to keep the link. */
export function storageWorks(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const k = "ascend.storage-test";
    localStorage.setItem(k, "1");
    localStorage.removeItem(k);
    return true;
  } catch {
    return false;
  }
}

export function listPlans(): Record<string, PlanPayloadV2> {
  const raw = read<Record<string, unknown>>(PLANS_KEY) ?? {};
  const out: Record<string, PlanPayloadV2> = {};
  for (const [id, value] of Object.entries(raw)) {
    const p = toPlanPayload(value);
    if (p) out[id] = p;
  }
  return out;
}

export function getPlan(id: string): PlanPayloadV2 | null {
  return listPlans()[id] ?? null;
}

/** Saves (or replaces) a plan and makes it the latest. Returns false when storage is blocked. */
export function savePlan(p: PlanPayloadV2): boolean {
  const plans = listPlans();
  plans[p.id] = ordered(p);
  const ok = write(PLANS_KEY, plans);
  // also kept in memory when storage is blocked, so this visit still finds it
  const latestOk = localSet(LATEST_PLAN_KEY, p.id);
  return ok && latestOk;
}

export function latestPlanId(): string | null {
  if (typeof window === "undefined") return null;
  return localGet(LATEST_PLAN_KEY);
}

/** The plan behind "ascend.plans.latest" (landing Continue card, /plan state 4). */
export function getLatestPlan(): PlanPayloadV2 | null {
  const id = latestPlanId();
  return id ? getPlan(id) : null;
}

export function getProgress(planId: string): Progress {
  const raw = read<Partial<Progress>>(progressKey(planId));
  const weeksDone = Array.isArray(raw?.weeksDone)
    ? raw.weeksDone.filter((k): k is number => Number.isInteger(k) && k >= 1)
    : [];
  return {
    ...(typeof raw?.firstSessionDoneAt === "string"
      ? { firstSessionDoneAt: raw.firstSessionDoneAt }
      : {}),
    weeksDone: [...new Set(weeksDone)].sort((a, b) => a - b),
  };
}

export function setProgress(planId: string, progress: Progress): boolean {
  return write(progressKey(planId), progress);
}

/** Ticks or unticks week k. */
export function toggleWeek(planId: string, k: number): Progress {
  const p = getProgress(planId);
  const weeksDone = p.weeksDone.includes(k)
    ? p.weeksDone.filter((x) => x !== k)
    : [...p.weeksDone, k].sort((a, b) => a - b);
  const next = { ...p, weeksDone };
  setProgress(planId, next);
  return next;
}

/** "Yes, it did": records when the first session was confirmed. */
export function markFirstSessionDone(planId: string, at: Date = new Date()): Progress {
  const next = { ...getProgress(planId), firstSessionDoneAt: at.toISOString() };
  setProgress(planId, next);
  return next;
}
