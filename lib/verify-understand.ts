import { COURSES } from "./courses";
import type { Baseline, MoveId } from "./course-types";
import { MENTION_STATUSES, LIMITS, PREFERS_FORMATS, type Mention, type MentionStatus, type PrefersFormat, type Strength } from "./profile";
import type { Check } from "./pick-types";
import { isSkillOf, type SkillId } from "./skills";
import {
  cutWords,
  findMentions,
  hoursNumbers,
  isVerbatim,
  normalizeForQuote,
  snapHours,
  unbackedNumbers,
  type Understanding,
  type UnderstoodGap,
} from "./understand";
import { HAS_DASH, cleanProse, cutToCap, hasHype, replaceDashes, sentences } from "./verify";

// The understand verifier (addendum-ai, Job 1). Pure. Enums already limit the
// model to real moves, skills and catalog ids; this checks what enums can't:
// every quote must be copied from the person's own text, gaps must belong to
// the chosen move, lengths are capped, dashes go, and hours must be backed by
// a number they actually wrote.

export const UNDERSTAND_CAPS = {
  role: 80,
  moveWhy: 200,
  gapReason: 120,
} as const;

/** The model's object before checks (field types loosely checked here). */
export type UnderstandAiOutput = {
  role: string;
  move: string;
  moveWhy: string;
  baseline: string | number;
  baselineEvidence: string;
  strengths: { label: string; quote: string }[];
  gaps: { id: string; reason: string }[];
  mentioned: { text: string; courseId: string; status: string }[];
  wantsCertificate: boolean;
  prefersFormat: string;
  hoursMentioned: number | null;
};

export type UnderstandVerifyInput = {
  finishReason: string | undefined;
  output: unknown;
  situation: string;
  /** availableMoves() ids at request time */
  moves: readonly MoveId[];
};

export type UnderstandCounts = {
  quotesDropped: number;
  mentionsDropped: number;
  gapsDropped: number;
};

export type UnderstandVerifyResult =
  | { ok: true; understanding: Understanding; checks: Check[]; counts: UnderstandCounts }
  | { ok: false; checks: Check[] };

const COURSE_IDS = new Set(COURSES.map((c) => c.id));

// Mention links ----------------------------------------------------------------

/** Words that don't tell two courses apart ("Google ... certificate"). */
const GENERIC_WORDS = new Set([
  "google", "coursera", "course", "courses", "certificate", "certification", "professional",
  "specialization", "specialisation", "program", "programme", "the", "and", "for", "with", "from",
  "edition", "second", "guide", "introduction", "intro", "learn", "a", "an", "of", "to", "in", "on", "by",
  "your", "my",
]);
const wordsOf = (t: string) => t.toLowerCase().match(/[a-z0-9+#]+/g) ?? [];

/** Distinctive words of a course title (provider words and generic words left out), plus their acronym. */
function titleKeys(courseId: string): Set<string> {
  const c = COURSES.find((x) => x.id === courseId);
  if (!c) return new Set();
  const provider = new Set(wordsOf(c.provider));
  const ws = wordsOf(c.title.split(":")[0]).filter((w) => !GENERIC_WORDS.has(w) && !provider.has(w));
  const keys = new Set(ws.filter((w) => w.length >= 2));
  if (ws.length >= 2) keys.add(ws.map((w) => w[0]).join(""));
  return keys;
}

/**
 * Checks the model's catalog link for a mention against code: when code
 * found the same mention in the text and matched it to a course, code's id
 * wins; otherwise the model's id stays only if the mention shares a
 * distinctive word with that course's title. A wrong link would show another
 * course's weeks, price and verdict under the person's words.
 */
export function checkMentionLink(
  text: string,
  modelId: string | null,
  codeMentions: readonly Mention[],
): string | null {
  const t = normalizeForQuote(text);
  const code = codeMentions.find((m) => {
    const c = normalizeForQuote(m.text);
    return c.includes(t) || t.includes(c);
  });
  if (code?.courseId) return code.courseId;
  if (!modelId) return null;
  const keys = titleKeys(modelId);
  const mine = new Set(wordsOf(text));
  return [...keys].some((k) => mine.has(k)) ? modelId : null;
}

// Negated quotes ---------------------------------------------------------------

const NEGATOR = /\b(never|not|no|without|want to|would like to|hope to|hoping to|suggested)\b|n't\b/;

/**
 * True when every place the quote appears in their text says the opposite of
 * having it: "never", "not", "want to" and the like in the three words before
 * it, in the same clause ("Never written SQL" is not a strength in SQL).
 */
export function quoteNegated(quote: string, situation: string): boolean {
  const s = normalizeForQuote(situation);
  const q = normalizeForQuote(quote).replace(/^["']|["']$/g, "").replace(/[.,;:]+$/, "").trim();
  if (q.length < 2) return false;
  if (NEGATOR.test(q.split(" ").slice(0, 2).join(" "))) return true;
  let at = s.indexOf(q);
  if (at < 0) return false;
  while (at >= 0) {
    const before = s.slice(0, at);
    const cut = Math.max(before.search(/[.,;:!?](?!.*[.,;:!?])/), before.lastIndexOf(" but "));
    const clause = cut >= 0 ? before.slice(cut + 1) : before;
    const last3 = clause.trim().split(/\s+/).slice(-3).join(" ");
    if (!NEGATOR.test(last3)) return false;
    at = s.indexOf(q, at + 1);
  }
  return true;
}

export function isUnderstandAiOutput(x: unknown): x is UnderstandAiOutput {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.role === "string" &&
    typeof o.move === "string" &&
    typeof o.moveWhy === "string" &&
    (typeof o.baseline === "string" || typeof o.baseline === "number") &&
    typeof o.baselineEvidence === "string" &&
    Array.isArray(o.strengths) &&
    Array.isArray(o.gaps) &&
    Array.isArray(o.mentioned) &&
    typeof o.wantsCertificate === "boolean" &&
    typeof o.prefersFormat === "string" &&
    (o.hoursMentioned === null || typeof o.hoursMentioned === "number")
  );
}

function plain(text: unknown, cap: number): { text: string; dashes: boolean; cut: boolean } {
  let t = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
  const dashes = HAS_DASH.test(t);
  if (dashes) t = replaceDashes(t);
  const cut = t.length > cap;
  if (cut) t = cutWords(t, cap);
  return { text: t, dashes, cut };
}

/** Removes quote marks around any quoted part that isn't copied from the situation. */
export function unquoteUnbacked(text: string, situation: string): { text: string; fixed: number } {
  let fixed = 0;
  const out = text.replace(/["“]([^"”]{1,200})["”]/g, (whole, inner: string) => {
    if (isVerbatim(inner, situation)) return whole;
    fixed++;
    return inner;
  });
  return { text: out, fixed };
}

function note(checks: Check[], name: string, notes: string[]): void {
  const n = notes.filter(Boolean);
  checks.push({ name, passed: n.length === 0, ...(n.length ? { note: n.join(" ") } : {}) });
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Checks in order: complete, move, quotes, gaps, mentions, style, hours. A
 * failed "complete" means the caller returns the rules answer with reason
 * "ai-invalid"; everything else is fixed in place.
 */
export function verifyUnderstanding(input: UnderstandVerifyInput): UnderstandVerifyResult {
  const checks: Check[] = [];
  if (input.finishReason !== "stop" || !isUnderstandAiOutput(input.output)) {
    checks.push({
      name: "complete",
      passed: false,
      note:
        input.finishReason && input.finishReason !== "stop"
          ? `The answer stopped early (${input.finishReason}), so you set these yourself.`
          : "The answer didn't match the expected format, so you set these yourself.",
    });
    return { ok: false, checks };
  }
  checks.push({ name: "complete", passed: true });
  const out = input.output;
  const situation = input.situation;
  let dashes = false;
  let cuts = 0;
  let numbersCut = 0;

  // move and baseline
  const move = (input.moves as readonly string[]).includes(out.move) ? (out.move as MoveId) : null;
  const bNum = typeof out.baseline === "number" ? out.baseline : Number(out.baseline);
  const baseline: Baseline | null = move && (bNum === 0 || bNum === 1 || bNum === 2) ? (bNum as Baseline) : null;
  note(checks, "move", [
    !move && out.move !== "none" ? "The direction wasn't one Ascend covers, so you choose it." : "",
    !move && out.move === "none" ? "No covered direction fit, so you choose it." : "",
    move && baseline === null ? "The starting point was invalid, so you choose it." : "",
  ]);

  // quotes: strengths and evidence must be copied from their text
  let quotesDropped = 0;
  const strengths: Strength[] = [];
  for (const s of out.strengths) {
    if (!s || typeof s.label !== "string" || typeof s.quote !== "string") {
      quotesDropped++;
      continue;
    }
    const quote = cutWords(s.quote.replace(/^["“']|["”']$/g, ""), LIMITS.quoteMax);
    if (!isVerbatim(quote, situation) || quoteNegated(quote, situation)) {
      quotesDropped++;
      continue;
    }
    const label = plain(s.label, LIMITS.strengthLabelMax);
    dashes ||= label.dashes;
    if (!label.text || hasHype(label.text)) {
      quotesDropped++;
      continue;
    }
    if (unbackedNumbers(label.text, situation).length > 0) {
      quotesDropped++;
      numbersCut++;
      continue;
    }
    if (strengths.length < LIMITS.strengthsMax) strengths.push({ label: label.text, quote });
  }
  let baselineEvidence = cutWords(out.baselineEvidence.replace(/^["“']|["”']$/g, ""), LIMITS.quoteMax);
  let evidenceBlanked = false;
  if (baselineEvidence && (!isVerbatim(baselineEvidence, situation) || !move)) {
    baselineEvidence = "";
    evidenceBlanked = true;
  }
  const why = unquoteUnbacked(out.moveWhy, situation);

  // gaps: only the chosen move's vocabulary, ranked, deduped, at most 5
  let gapsDropped = 0;
  let reasonsUnquoted = 0;
  const gaps: UnderstoodGap[] = [];
  for (const g of out.gaps) {
    const id = g && typeof g.id === "string" ? g.id : "";
    if (!move || !isSkillOf(move, id) || gaps.some((x) => x.id === id) || gaps.length >= LIMITS.gapsMax) {
      gapsDropped++;
      continue;
    }
    const r = cleanProse(g.reason, UNDERSTAND_CAPS.gapReason, situation);
    dashes ||= r.dashes;
    const uq = unquoteUnbacked(r.text, situation);
    reasonsUnquoted += uq.fixed;
    gaps.push({ id: id as SkillId, reason: uq.text });
  }

  note(checks, "quotes", [
    quotesDropped ? `Removed ${plural(quotesDropped, "strength")} whose quote wasn't in your words.` : "",
    evidenceBlanked ? "Removed a starting-point quote that wasn't in your words." : "",
    why.fixed || reasonsUnquoted ? "Removed quote marks from words you didn't write." : "",
  ]);

  note(checks, "gaps", [
    gapsDropped ? `Removed ${plural(gapsDropped, "gap")} outside this direction or repeated.` : "",
    move && gaps.length < 2 ? "Fewer than two gaps came back. Add the ones that matter." : "",
  ]);

  // mentions: text copied from their words, real catalog ids that name the same course
  let mentionsDropped = 0;
  let unlinked = 0;
  let relinked = 0;
  const codeMentions = findMentions(situation);
  const mentioned: Mention[] = [];
  for (const m of out.mentioned) {
    const text = m && typeof m.text === "string" ? cutWords(m.text.replace(/^["“']|["”']$/g, ""), LIMITS.mentionTextMax) : "";
    if (!text || !isVerbatim(text, situation) || mentioned.some((x) => x.text.toLowerCase() === text.toLowerCase())) {
      mentionsDropped++;
      continue;
    }
    if (mentioned.length >= LIMITS.mentionedMax) {
      mentionsDropped++;
      continue;
    }
    const modelId = typeof m.courseId === "string" && COURSE_IDS.has(m.courseId) ? m.courseId : null;
    const courseId = checkMentionLink(text, modelId, codeMentions);
    if (modelId && courseId === null) unlinked++;
    else if (courseId !== modelId) relinked++;
    const status: MentionStatus = (MENTION_STATUSES as readonly string[]).includes(m.status)
      ? (m.status as MentionStatus)
      : "considering";
    mentioned.push({ text, courseId, status });
  }
  note(checks, "mentions", [
    mentionsDropped ? `Removed ${plural(mentionsDropped, "course mention")} that wasn't in your words.` : "",
    unlinked ? `Unlinked ${plural(unlinked, "course")} whose name didn't match Ascend's list.` : "",
    relinked ? "Matched a course to the title you wrote." : "",
  ]);

  // style and length for the free text; numbers they never wrote go
  const role = plain(out.role, UNDERSTAND_CAPS.role);
  dashes ||= role.dashes;
  if (role.cut) cuts++;
  const roleClauses = role.text.split(/\s*,\s*/);
  const roleKept = roleClauses.filter((c) => unbackedNumbers(c, situation).length === 0);
  numbersCut += roleClauses.length - roleKept.length;
  role.text = roleKept.join(", ");
  const whySentences = sentences(why.text.replace(/\s+/g, " ").trim());
  const whyKept = whySentences.filter((x) => unbackedNumbers(x, situation).length === 0);
  numbersCut += whySentences.length - whyKept.length;
  let moveWhy = whyKept.join(" ");
  if (HAS_DASH.test(moveWhy)) {
    dashes = true;
    moveWhy = replaceDashes(moveWhy);
  }
  if (moveWhy.length > UNDERSTAND_CAPS.moveWhy) {
    moveWhy = cutToCap(moveWhy, UNDERSTAND_CAPS.moveWhy) ?? "";
    cuts++;
  }
  if (hasHype(moveWhy)) moveWhy = "";
  note(checks, "style", [
    dashes ? "Replaced dashes or exclamation marks." : "",
    cuts ? "Shortened long lines." : "",
    numbersCut ? "Removed a number you didn't write." : "",
  ]);

  // hours must be a number they wrote
  let hoursMentioned: number | null = null;
  let hoursDropped = false;
  if (typeof out.hoursMentioned === "number" && Number.isFinite(out.hoursMentioned)) {
    const h = out.hoursMentioned;
    // written right before an hours word, so "4 years" can't become 4 hours
    if (h > 0 && h <= 80 && hoursNumbers(situation).includes(h)) hoursMentioned = h;
    else hoursDropped = true;
  }
  note(checks, "hours", [hoursDropped ? "Removed an hours figure you didn't write." : ""]);

  const prefersFormat: PrefersFormat = (PREFERS_FORMATS as readonly string[]).includes(out.prefersFormat)
    ? (out.prefersFormat as PrefersFormat)
    : "any";

  return {
    ok: true,
    understanding: {
      role: role.text,
      move,
      moveWhy,
      baseline,
      baselineEvidence,
      strengths,
      gaps,
      mentioned,
      wantsCertificate: out.wantsCertificate === true,
      prefersFormat,
      hoursMentioned,
      hoursChip: snapHours(hoursMentioned),
    },
    checks,
    counts: { quotesDropped: quotesDropped + (evidenceBlanked ? 1 : 0), mentionsDropped, gapsDropped },
  };
}
