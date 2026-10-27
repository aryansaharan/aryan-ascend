import type { Candidate } from "./fit";
import {
  candidateCoverage,
  labelAlternates,
  pickAlternates,
  pickResponseOf,
  totalModulesMapped,
} from "./decide-rules";
import type { Mention } from "./profile";
import {
  VERDICTS,
  type AiOutput,
  type CandidateCoverage,
  type Check,
  type HonestFit,
  type MentionVerdict,
  type PickResponse,
  type Skim,
  type Verdict,
} from "./pick-types";
import { COURSES } from "./courses";
import { HAS_DASH, HYPE_RE, NUMBER_UNIT_RE, NUMBER_UNIT_SRC } from "./text-rules";
import { skillLabel, type Depth, type GapMatch, type SkillId } from "./skills";
import { NUMBER_WORDS, isVerbatim, normalizeForQuote } from "./understand";

// The pick verifier (spec 5.5, addendum-ai Jobs 2 and 3). Pure: it takes the
// model's raw answer and returns the decision that reaches the page plus a
// record of every check, so the "How this was decided" panel can show what
// code fixed, and the receipt can count what it removed.

export { HAS_DASH, HYPE_RE, NUMBER_UNIT_RE };
const NUMBER_UNIT_G = new RegExp(NUMBER_UNIT_SRC, "gi");

const UNIT_STEMS: [RegExp, string][] = [
  [/^(minutes?|mins?)$/, "min"],
  [/^(hours?|hrs?)$/, "hour"],
  [/^weeks?$/, "week"],
  [/^months?$/, "month"],
  [/^days?$/, "day"],
  [/^(years?|yrs?)$/, "year"],
];
const UNIT_RES: Record<string, string> = {
  min: "(?:minutes?|mins?)",
  hour: "(?:hours?|hrs?)",
  week: "weeks?",
  month: "months?",
  day: "days?",
  year: "(?:years?|yrs?)",
};

/**
 * True when the person wrote this figure themselves: the same number (as
 * digits or a word) next to the same time unit ("3 years" for "three yrs"),
 * or the exact phrase. Prices, shares and ratings only count when the exact
 * phrase is in their text.
 */
export function backedByUser(match: string, situation: string): boolean {
  if (!situation) return false;
  const sit = normalizeForQuote(situation);
  if (sit.includes(normalizeForQuote(match))) return true;
  const m = match.toLowerCase().match(/^(\d+(?:\.\d+)?|[a-z]+)[\s-]*([a-z]+)$/);
  if (!m) return false;
  const n = NUMBER_WORDS[m[1]] ?? Number(m[1]);
  const stem = UNIT_STEMS.find(([re]) => re.test(m[2]))?.[1];
  if (!Number.isFinite(n) || !stem) return false;
  const words = Object.entries(NUMBER_WORDS).filter(([, v]) => v === n).map(([w]) => w);
  const num = [String(n).replace(".", "\\."), ...words].join("|");
  return new RegExp(`(^|[^\\d.])(?:${num})[\\s-]*${UNIT_RES[stem]}\\b`).test(sit);
}

/** True when the sentence states a number the page should own and the person didn't write. */
export function hasUnbackedNumber(sentence: string, situation = ""): boolean {
  for (const m of sentence.matchAll(NUMBER_UNIT_G)) {
    if (!backedByUser(m[0], situation)) return true;
  }
  return false;
}

const DASH_RE = /\s*[\u2014\u2013]\s*/g;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Catalog text that HYPE_RE matches (today "Chapter 8: Supercharged Ideation"): quoting it is not hype. */
const HYPE_SAFE: string[] = [
  ...new Set(
    COURSES.flatMap((c) => [c.title, ...c.modules.map((m) => m.name), ...(c.beyond ? [c.beyond.label] : [])]).filter((t) =>
      HYPE_RE.test(t),
    ),
  ),
].sort((a, b) => b.length - a.length);

// Quoted catalog names ------------------------------------------------------------
//
// A real module name or title in quote marks is copied text: a "!" in
// "Chapter 3: Clutter is your enemy!" or the "Three Months" in "Your First
// Three Months" is part of the name, not the model's style or a number it
// stated. The text rules mask such quotes while they work, so the name comes
// through untouched. Only exact catalog names count.

const QUOTABLE = new Set(
  COURSES.flatMap((c) => [c.title, ...c.modules.map((m) => m.name), ...(c.beyond ? [c.beyond.label] : [])]).map((n) =>
    n.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim(),
  ),
);
const MASK_RE = /\uE000([a-z]+)\uE001/g;

function maskKey(i: number): string {
  let k = "";
  let n = i;
  do {
    k = String.fromCharCode(97 + (n % 26)) + k;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return k;
}

function maskIndex(k: string): number {
  let n = 0;
  for (const ch of k) n = n * 26 + (ch.charCodeAt(0) - 96);
  return n - 1;
}

/** Replaces each quoted exact catalog name with a placeholder no text rule matches. */
export function maskQuotedNames(text: string, names: readonly string[] | Set<string> = QUOTABLE): { text: string; quotes: string[] } {
  const allowed = names instanceof Set ? names : new Set(names.map((n) => n.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim()));
  const quotes: string[] = [];
  const out = text.replace(/["“]([^"”]{1,200})["”]/g, (whole, inner: string) => {
    if (!allowed.has(inner.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim())) return whole;
    quotes.push(whole);
    return `\uE000${maskKey(quotes.length - 1)}\uE001`;
  });
  return { text: out, quotes };
}

/** Puts the masked quotes back. */
export function unmaskQuotedNames(text: string, quotes: readonly string[]): string {
  return quotes.length ? text.replace(MASK_RE, (whole, k: string) => quotes[maskIndex(k)] ?? whole) : text;
}

/** An em or en dash, or an exclamation mark, outside quoted catalog names. */
export function hasDash(t: string): boolean {
  return HAS_DASH.test(maskQuotedNames(t).text);
}

/** Hype in the text, ignoring real module names and titles that happen to match. */
export function hasHype(t: string): boolean {
  let s = t;
  for (const p of HYPE_SAFE) s = s.replace(new RegExp(escapeRe(p), "gi"), " ");
  return HYPE_RE.test(s);
}

export const FIELD_CAPS = {
  whyThisOne: 260,
  useItAtWork: 140,
  gapNote: 200,
  vsRules: 200,
  skim: 100,
  verdict: 160,
} as const;
type Field = "whyThisOne" | "useItAtWork" | "gapNote" | "vsRules";
const FIELDS: Field[] = ["whyThisOne", "useItAtWork", "gapNote", "vsRules"];
const MAX_SKIM = 3;

export type VerifyInput = {
  /** generateText's finishReason; anything but "stop" fails "complete" */
  finishReason: string | undefined;
  /** the parsed model object, or null/undefined when nothing parsed */
  output: unknown;
  /** fit() candidates after exclusions, ranked; these were sent */
  candidates: Candidate[];
  exclude: readonly string[];
  /** the rules decision, returned whole when the answer can't be used */
  rules: PickResponse;
  /** the ranked gaps coverage indices refer to */
  gaps: readonly SkillId[];
  /** profile.mentioned; verdict indices refer to it */
  mentioned: readonly Mention[];
  /** words in the situation (receipt) */
  words: number;
  /** the rules' top candidate id (sent as rulesTopId) */
  rulesTopId: string;
  /** "mock" for the dev-only mock; defaults to "ai" */
  engine?: "ai" | "mock";
  /** the person's own text: numbers and quotes they wrote may be repeated */
  situation?: string;
  /**
   * Candidate id to [title, ...in-scope module names]: the only course and
   * module names a quote may hold. Without it the quotes check is skipped.
   */
  names?: Record<string, string[]>;
  /** catalog titles of the mentioned courses, by mention index (null when not in the catalog) */
  mentionTitles?: readonly (string | null)[];
  /** code templates for each field, given the final pick id and the verified coverage */
  templates: {
    whyThisOne: (pickId: string) => string;
    useItAtWork: string;
    gapNote: string;
    vsRules: (pickId: string, coverage: readonly CandidateCoverage[]) => string;
  };
};

export type VerifyResult = { decision: PickResponse; checks: Check[] };

const HONEST: HonestFit[] = ["strong", "ok", "weak"];

/** Shape check for the model's object (zod already ran in the SDK; this guards tests and refactors). */
export function isAiOutput(x: unknown): x is AiOutput {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.pickId === "string" &&
    Array.isArray(o.alternateIds) &&
    o.alternateIds.every((id) => typeof id === "string") &&
    typeof o.whyThisOne === "string" &&
    typeof o.useItAtWork === "string" &&
    HONEST.includes(o.honestFit as HonestFit) &&
    typeof o.gapNote === "string" &&
    (o.vsRules === undefined || typeof o.vsRules === "string") &&
    (o.coverage === undefined || Array.isArray(o.coverage)) &&
    (o.skim === undefined || Array.isArray(o.skim)) &&
    (o.mentionedVerdicts === undefined || Array.isArray(o.mentionedVerdicts))
  );
}

// Text helpers (shared with the understand and tailor verifiers) ----------------

/**
 * Splits prose into sentences, keeping their end punctuation. A sentence ends
 * at ".", "!" or "?" (plus any closing quote or bracket) followed by a space,
 * so "4.7", "Next.js" and "Unit 2.1" stay whole.
 */
export function sentences(text: string): string[] {
  const m = maskQuotedNames(text);
  return splitSentences(m.text).map((s) => unmaskQuotedNames(s, m.quotes));
}

function splitSentences(text: string): string[] {
  return text
    .split(/(?<=[.!?]["'”’)]*)\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Removes every sentence that states a time, price, share, rating or count
 * the person didn't write themselves (a figure from their own text, like
 * "your 3 years in support", may stay). Returns the text and how many went.
 */
export function stripNumberSentences(text: string, situation = ""): { text: string; removed: number } {
  // a quoted catalog name ("Your First Three Months") is not a number the model stated
  const m = maskQuotedNames(text);
  const all = splitSentences(m.text);
  const kept = all.filter((s) => !hasUnbackedNumber(s, situation));
  return { text: unmaskQuotedNames(kept.join(" "), m.quotes), removed: all.length - kept.length };
}

/** Replaces em and en dashes with ", " and exclamation marks with full stops, and tidies the spacing they leave. */
export function replaceDashes(text: string): string {
  // quoted catalog names keep their own punctuation
  const m = maskQuotedNames(text);
  const out = m.text
    .replace(/!+/g, ".")
    .replace(/\.{2,}/g, ".")
    .replace(DASH_RE, ", ")
    .replace(/,\s*,/g, ",")
    .replace(/^\s*,\s*/, "")
    .replace(/\s*,\s*([.!?])/g, "$1")
    .trim();
  return unmaskQuotedNames(out, m.quotes);
}

/**
 * Cuts to the last sentence end within `cap` characters; null when there is
 * none. A sentence end is followed by a space in the full text, so a cap that
 * lands on "4." of "4.7" doesn't count as one.
 */
export function cutToCap(text: string, cap: number): string | null {
  if (text.length <= cap) return text;
  // never cut inside a quoted catalog name ("What Makes Employees Work? Money, Of Course!")
  const masked = maskQuotedNames(text);
  let best = "";
  for (const m of masked.text.matchAll(/[.!?]+["'”’)]*(?=\s|$)/g)) {
    const e = (m.index ?? 0) + m[0].length;
    const head = unmaskQuotedNames(masked.text.slice(0, e), masked.quotes).trim();
    if (head.length > cap) break;
    best = head;
  }
  return best.length > 0 ? best : null;
}

/**
 * Like cutToCap, but when the sentences that fit name none of `labels` and a
 * sentence that does would fit, that sentence is kept instead, so the line
 * still names the gap it is about.
 */
export function cutToCapKeeping(text: string, cap: number, labels: readonly string[]): string | null {
  if (text.length <= cap) return text;
  const named = (s: string) => labels.some((l) => l && s.toLowerCase().includes(l.toLowerCase()));
  const plain = cutToCap(text, cap);
  if (labels.length === 0 || (plain && named(plain))) return plain;
  const all = sentences(text);
  const first = all[0] ?? "";
  const hit = all.find((s) => named(s) && s.length <= cap);
  if (!hit) return plain;
  const both = hit !== first ? `${first} ${hit}` : hit;
  return both.length <= cap ? both : hit;
}

// "You said ..." -----------------------------------------------------------------

/** "you said", "you wrote", "you mentioned", "you told us" (optionally "you've"). */
const SAID_RE = /\byou(?:'ve|\s+have)?\s+(?:said|wrote|written|mentioned|told\s+us|noted)\b(?:\s+that)?/i;
/** Words after which "you said" starts a clause of its own ("Since you said ..."). */
const CLAUSE_START = new Set(["and", "but", "because", "since", "as", "so", "while", "although", "though", "if", "when", "where", "which"]);
/** Where the reported words end: punctuation, or the model's own reasoning starting. */
const SAID_END = /[,;:.!?]|\s(?:so|which|because|but|while|and\s+(?:this|that|it))\s/i;
const SAID_STOP = new Set([
  "you", "your", "yours", "have", "has", "had", "haven't", "hasn't", "are", "aren't", "was", "were", "the", "and",
  "but", "for", "with", "that", "this", "these", "those", "them", "they", "their", "there", "its", "into", "from",
  "about", "just", "also", "still", "want", "wants", "wanted", "would", "like", "can", "can't", "could", "will",
  "won't", "been", "being", "any", "some", "much", "many", "more", "most", "very", "really", "only", "all", "own",
  "get", "got", "one", "out", "now", "yet", "not", "don't", "didn't", "doesn't", "isn't", "what", "when", "where",
  "who", "how", "why", "which", "then", "than", "too", "did", "does", "you're", "you've", "already", "currently",
]);

/**
 * True when a sentence says the person said, wrote or mentioned something
 * their own text doesn't back: every content word of the reported words must
 * appear in what they wrote (a shared first four letters is enough, so
 * "logged" matches "log"), unless the reported words are a quote of theirs.
 * Catches a preset starting level repeated as their words ("you said you
 * haven't owned a roadmap").
 */
export function saidUnbacked(sentence: string, situation: string): boolean {
  const m = SAID_RE.exec(sentence);
  if (!m) return false;
  // "the course you mentioned covers..." is a relative clause: what follows is
  // about the course, not their words. Only a "you said" that starts a clause counts.
  const before = sentence.slice(0, m.index).trim();
  const prev = (before.split(/\s+/).pop() ?? "").toLowerCase();
  if (before && !/[,;:(]$/.test(before) && !CLAUSE_START.has(prev)) return false;
  let clause = sentence.slice(m.index + m[0].length);
  const quoted = clause.match(/^\s*["“]([^"”]{2,200})["”]/);
  if (quoted) return !isVerbatim(quoted[1], situation);
  const end = clause.search(SAID_END);
  if (end >= 0) clause = clause.slice(0, end);
  const norm = (s: string) => s.toLowerCase().replace(/[‘’ʼ]/g, "'");
  const theirs = norm(situation).match(/[a-z0-9][a-z0-9'+#]*/g) ?? [];
  const content = (norm(clause).match(/[a-z0-9][a-z0-9'+#]*/g) ?? []).filter(
    (w) => w.length >= 3 && !SAID_STOP.has(w),
  );
  const backed = (w: string) =>
    theirs.some((t) => {
      const k = Math.min(w.length, t.length, 4);
      return k >= 3 && w.slice(0, k) === t.slice(0, k);
    });
  return content.some((w) => !backed(w));
}

/** Drops every sentence that says they wrote something they didn't (saidUnbacked). */
export function stripUnbackedSaid(text: string, situation: string): { text: string; removed: number } {
  const all = sentences(text);
  const kept = all.filter((s) => !saidUnbacked(s, situation));
  return { text: kept.join(" "), removed: all.length - kept.length };
}

/**
 * One short prose field through the shared rules: numbers out, dashes
 * replaced, hype rejected, cut to the cap. Returns "" when nothing usable is
 * left, plus what was fixed.
 */
export function cleanProse(
  text: unknown,
  cap: number,
  situation = "",
): { text: string; numbers: number; dashes: boolean; hype: boolean; cut: boolean } {
  let t = typeof text === "string" ? text.replace(/\s+/g, " ").trim() : "";
  const r = stripNumberSentences(t, situation);
  t = r.text;
  const dashes = hasDash(t);
  if (dashes) t = replaceDashes(t);
  const hype = hasHype(t);
  if (hype) t = "";
  let cut = false;
  if (t.length > cap) {
    t = cutToCap(t, cap) ?? "";
    cut = true;
  }
  return { text: t.trim(), numbers: r.removed, dashes, hype, cut };
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

function check(checks: Check[], name: string, notes: string[]): void {
  const n = notes.filter(Boolean);
  checks.push({ name, passed: n.length === 0, ...(n.length ? { note: n.join(" ") } : {}) });
}

const VERDICT_SET = new Set<string>(VERDICTS);

// Quotes -------------------------------------------------------------------------

/** A quote that names a numbered part: "Chapter 7: ...", "Module 3", "Habit 5: ...". */
const MODULE_REF = /^(chapter|module|habit|week|lesson|part|unit|section)\s*\d/i;
/** "Module 3", "Chapter 12" anywhere in the text, quoted or not. */
const NUMBERED_REF = /\b(chapter|module|habit|lesson|unit|section)\s+\d+\b/gi;

function qnorm(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[.,;:?!]+$/, "");
}

/** Looks like a title: three or more words, most of them capitalised. */
function titleish(s: string): boolean {
  const w = s.split(/\s+/).filter((x) => /[a-z]/i.test(x));
  return w.length >= 3 && w.filter((x) => /^[A-Z0-9]/.test(x)).length / w.length >= 0.6;
}

/**
 * Checks quoted text against what may be quoted: real names (`allowed`) and
 * the person's own words. A quote that looks like a module or title but is
 * neither is invented; any other unbacked quote loses its quote marks. A
 * numbered reference ("Module 3") must belong to one of the allowed names.
 */
export function checkQuotes(
  text: string,
  allowed: readonly string[],
  situation: string,
): { text: string; invented: boolean; unquoted: number } {
  const ok = new Set(allowed.map(qnorm));
  const inAllowed = (ref: string) => allowed.some((n) => qnorm(n).includes(qnorm(ref)));
  let invented = false;
  let unquoted = 0;
  const out = text.replace(/["“]([^"”]{1,200})["”]/g, (whole, inner: string) => {
    if (ok.has(qnorm(inner)) || isVerbatim(inner, situation)) return whole;
    if (MODULE_REF.test(inner.trim()) || titleish(inner)) {
      invented = true;
      return whole;
    }
    unquoted++;
    return inner;
  });
  for (const m of out.matchAll(NUMBERED_REF)) if (!inAllowed(m[0])) invented = true;
  return { text: out, invented, unquoted };
}

/** Template reasons for verdicts code had to correct. */
export const VERDICT_TEMPLATES = {
  pick: "This is the course Ascend picked for you.",
  laterOnList: "It fits your answers. Start with the pick, then decide on this one.",
  later: "Worth a look after the pick.",
} as const;

/**
 * Runs the checks in order: complete, ids, coverage, no numbers, style,
 * length, empty, gapNote, vsRules, skim, verdicts. A failed "complete" or an
 * unusable pick returns the rules decision with reason "ai-invalid"; every
 * other failure is fixed in place and counted.
 */
export function verify(input: VerifyInput): VerifyResult {
  const checks: Check[] = [];
  const fallback = (note: string, name: string): VerifyResult => {
    checks.push({ name, passed: false, note });
    return {
      decision: { ...pickResponseOf(input.rules), engine: "rules", reason: "ai-invalid", checks },
      checks,
    };
  };

  // 1. complete
  if (input.finishReason !== "stop" || !isAiOutput(input.output)) {
    const note =
      input.finishReason && input.finishReason !== "stop"
        ? `The answer stopped early (${input.finishReason}), so the rules chose.`
        : "The answer didn't match the expected format, so the rules chose.";
    return fallback(note, "complete");
  }
  checks.push({ name: "complete", passed: true });
  const out = input.output;
  let invalidIds = 0;
  let invalidModules = 0;
  let numbers = 0;

  // 2. ids
  const ex = new Set(input.exclude);
  const byId = new Map(
    input.candidates.filter((c) => !ex.has(c.id)).map((c) => [c.id, c] as const),
  );
  const pick = byId.get(out.pickId);
  if (!pick) return fallback("The pick wasn't on the list, so the rules chose.", "ids");
  const altIds: string[] = [];
  let dropped = 0;
  for (const id of out.alternateIds) {
    if (!byId.has(id)) {
      invalidIds++;
      dropped++;
    } else if (id === pick.id || altIds.includes(id)) dropped++;
    else altIds.push(id);
  }
  const want = Math.min(2, byId.size - 1);
  if (altIds.length > want) {
    dropped += altIds.length - want;
    altIds.length = want;
  }
  let filled = 0;
  if (altIds.length < want) {
    const rest = [...byId.values()].filter((c) => c.id !== pick.id && !altIds.includes(c.id));
    for (const a of pickAlternates(pick, rest, want - altIds.length)) {
      altIds.push(a.id);
      filled++;
    }
  }
  const alternates = labelAlternates(
    pick,
    altIds.map((id) => byId.get(id) as Candidate),
  );
  check(checks, "ids", [
    dropped ? `Removed ${plural(dropped, "alternate")} that repeated or wasn't on the list.` : "",
    filled ? `Added ${plural(filled, "alternate")} by rules.` : "",
  ]);

  // 3. coverage: real candidates, real gap indices, real module indices in scope
  const source = input.engine === "mock" ? "mock" : "ai";
  const nGaps = input.gaps.length;
  const merged = new Map<string, Map<number, { mods: Set<number>; depth: Depth }>>();
  let badGaps = 0;
  let unknownCands = 0;
  for (const entry of out.coverage ?? []) {
    const cand = entry && typeof entry.id === "string" ? byId.get(entry.id) : undefined;
    if (!cand) {
      unknownCands++;
      invalidIds++;
      continue;
    }
    const gaps = merged.get(cand.id) ?? new Map<number, { mods: Set<number>; depth: Depth }>();
    for (const g of Array.isArray(entry.gaps) ? entry.gaps : []) {
      if (!g || !Number.isInteger(g.gap) || g.gap < 0 || g.gap >= nGaps) {
        badGaps++;
        continue;
      }
      const mods: number[] = [];
      for (const m of Array.isArray(g.modules) ? g.modules : []) {
        if (Number.isInteger(m) && m >= 0 && m < cand.moduleCount) mods.push(m);
        else invalidModules++;
      }
      if (mods.length === 0) continue;
      const depth: Depth = g.depth === "direct" ? "direct" : "partial";
      const prev = gaps.get(g.gap);
      if (prev) {
        for (const m of mods) prev.mods.add(m);
        if (depth === "direct") prev.depth = "direct";
      } else {
        gaps.set(g.gap, { mods: new Set(mods), depth });
      }
    }
    merged.set(cand.id, gaps);
  }
  const coverage: CandidateCoverage[] = input.candidates
    .filter((c) => !ex.has(c.id))
    .map((c) => {
      const gaps: GapMatch[] = [...(merged.get(c.id) ?? new Map()).entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([gap, v]) => ({ gap, modules: [...v.mods].sort((a, b) => a - b), depth: v.depth }));
      return candidateCoverage(c.id, source, gaps);
    });
  const missing = coverage.length - merged.size;
  check(checks, "coverage", [
    unknownCands ? `Removed coverage for ${plural(unknownCands, "course")} not on the list.` : "",
    badGaps ? `Removed ${plural(badGaps, "gap reference")} that didn't exist.` : "",
    invalidModules ? `Removed ${plural(invalidModules, "module reference")} outside the course.` : "",
    nGaps > 0 && missing > 0 ? `${plural(missing, "course")} came back without coverage, shown as none.` : "",
  ]);

  // 4 to 8. prose fields: numbers, style, length, empty, gapNote, vsRules
  const tmpl: Record<Field, string> = {
    whyThisOne: input.templates.whyThisOne(pick.id),
    useItAtWork: input.templates.useItAtWork,
    gapNote: input.templates.gapNote,
    vsRules: input.templates.vsRules(pick.id, coverage),
  };
  const raw: Record<Field, string> = {
    whyThisOne: out.whyThisOne,
    useItAtWork: out.useItAtWork,
    gapNote: out.gapNote,
    vsRules: typeof out.vsRules === "string" ? out.vsRules : "",
  };
  const text: Record<Field, string> = { ...raw };
  const differs = pick.id !== input.rulesTopId;

  const situation = input.situation ?? "";
  let removed = 0;
  for (const f of FIELDS) {
    const r = stripNumberSentences(text[f], situation);
    removed += r.removed;
    if (r.removed) text[f] = r.text;
  }
  numbers += removed;
  check(checks, "no numbers", [removed ? `Removed ${plural(removed, "sentence")} with a number.` : ""]);

  // "you said ..." must be something they said (the starting level is a preset, not their words)
  let saidDropped = 0;
  for (const f of FIELDS) {
    const r = stripUnbackedSaid(text[f], situation);
    saidDropped += r.removed;
    if (r.removed) text[f] = r.text;
  }

  // whyThisOne never calls a later gap their first one
  const gapLabels0 = input.gaps.map((g) => skillLabel(g).toLowerCase());
  let firstGapFixed = false;
  if (gapLabels0.length > 1 && text.whyThisOne) {
    const kept = sentences(text.whyThisOne).filter((s) => {
      const low = s.toLowerCase();
      if (!/\bfirst\b/.test(low) || low.includes(gapLabels0[0])) return true;
      // "it doesn't cover your first gap" is the honest version, not a claim
      // ("before anything else" is emphasis, not a negation, so it doesn't count)
      if (/\b(?:not|doesn't|does not|isn't|won't|skips|rather than|instead of)\b/.test(low)) return true;
      const namesOther = gapLabels0.slice(1).some((l) => low.includes(l));
      if (namesOther) firstGapFixed = true;
      return !namesOther;
    });
    if (firstGapFixed) text.whyThisOne = kept.join(" ");
  }

  let dashes = 0;
  const swapped: Field[] = [];
  for (const f of FIELDS) {
    if (hasDash(text[f])) {
      dashes++;
      text[f] = replaceDashes(text[f]);
    }
    if (/^\s*Your background as/i.test(text[f]) || hasHype(text[f])) {
      text[f] = f === "vsRules" && !differs ? "" : tmpl[f];
      swapped.push(f);
    }
  }
  check(checks, "style", [
    dashes ? "Replaced dashes or exclamation marks." : "",
    swapped.length ? `Used the template for ${swapped.join(", ")}.` : "",
  ]);

  // quotes: a quoted module or title must be real and in scope; words in
  // quote marks must be theirs. An invented name swaps the whole field for the
  // template (cutting by sentence could split a module name with a "?").
  const quoteChecks = Boolean(input.names);
  const names = input.names ?? {};
  const gapLabels = input.gaps.map((g) => skillLabel(g));
  const mentionTexts = input.mentioned.map((m) => m.text);
  const pickNames = names[pick.id] ?? [];
  let unquoted = 0;
  let inventedFields = 0;
  if (quoteChecks) {
    for (const f of FIELDS) {
      if (!text[f]) continue;
      const allowed = [
        ...pickNames,
        ...gapLabels,
        ...mentionTexts,
        ...(f === "vsRules" ? (names[input.rulesTopId] ?? []) : []),
      ];
      const q = checkQuotes(text[f], allowed, situation);
      if (q.invented) {
        text[f] = f === "vsRules" && !differs ? "" : tmpl[f];
        invalidModules++;
        inventedFields++;
      } else if (q.unquoted) {
        text[f] = q.text;
        unquoted += q.unquoted;
      }
    }
  }
  const verdictAllowed = (index: number) => [
    ...pickNames,
    ...mentionTexts,
    ...(input.mentionTitles?.[index] ? [input.mentionTitles[index] as string] : []),
  ];

  const cut: Field[] = [];
  for (const f of FIELDS) {
    if (text[f].length <= FIELD_CAPS[f]) continue;
    // a long whyThisOne keeps the sentence that names their gap
    const short =
      f === "whyThisOne" ? cutToCapKeeping(text[f], FIELD_CAPS[f], gapLabels) : cutToCap(text[f], FIELD_CAPS[f]);
    text[f] = short ?? tmpl[f];
    cut.push(f);
  }
  check(checks, "length", [cut.length ? `Shortened ${cut.join(", ")}.` : ""]);

  const filledEmpty: Field[] = [];
  let emptyComparison = false;
  for (const f of FIELDS) {
    if (f === "gapNote" && out.honestFit !== "weak") continue;
    if (f === "vsRules" && !differs) continue;
    if (text[f].trim() === "") {
      text[f] = tmpl[f];
      if (tmpl[f]) filledEmpty.push(f);
      else emptyComparison = true;
    }
  }
  check(checks, "empty", [
    filledEmpty.length ? `Used the template for empty ${filledEmpty.join(", ")}.` : "",
    emptyComparison ? "No usable comparison with the rules' choice, so only its name is shown." : "",
  ]);

  const dropGap = out.honestFit !== "weak" && text.gapNote.trim() !== "";
  if (out.honestFit !== "weak") text.gapNote = "";
  check(checks, "gapNote", [dropGap ? "Dropped a gap note because the fit isn't weak." : ""]);

  const dropVs = !differs && text.vsRules.trim() !== "";
  if (!differs) text.vsRules = "";
  check(checks, "vsRules", [dropVs ? "Dropped the comparison because the pick matches the rules." : ""]);

  // 9. skim: real modules of the pick, a usable reason, at most 3, and never
  // a module the answer itself says closes one of their gaps directly
  const closes = new Set(
    (coverage.find((c) => c.id === pick.id)?.gaps ?? []).filter((g) => g.depth === "direct").flatMap((g) => g.modules),
  );
  const skim: Skim[] = [];
  let skimDropped = 0;
  for (const s of Array.isArray(out.skim) ? out.skim : []) {
    if (!s || !Number.isInteger(s.module) || s.module < 0 || s.module >= pick.moduleCount) {
      invalidModules++;
      skimDropped++;
      continue;
    }
    if (skim.some((x) => x.module === s.module) || skim.length >= MAX_SKIM || closes.has(s.module)) {
      skimDropped++;
      continue;
    }
    const r = cleanProse(s.reason, FIELD_CAPS.skim, situation);
    numbers += r.numbers;
    const sd = stripUnbackedSaid(r.text, situation);
    saidDropped += sd.removed;
    let reason = sd.text;
    if (reason && quoteChecks) {
      const q = checkQuotes(reason, verdictAllowed(-1), situation);
      if (q.invented) {
        invalidModules++;
        inventedFields++;
        reason = "";
      } else {
        unquoted += q.unquoted;
        reason = q.text;
      }
    }
    if (!reason) {
      skimDropped++;
      continue;
    }
    skim.push({ module: s.module, reason });
  }
  check(checks, "skim", [skimDropped ? `Removed ${plural(skimDropped, "skim note")}.` : ""]);

  // 10. verdicts: real mentions, one each, consistent with the pick
  const verdicts: MentionVerdict[] = [];
  let verdictFixes = 0;
  const onList = new Set(byId.keys());
  for (const v of Array.isArray(out.mentionedVerdicts) ? out.mentionedVerdicts : []) {
    const m = v && Number.isInteger(v.index) ? input.mentioned[v.index] : undefined;
    if (!m || !VERDICT_SET.has(v.verdict) || verdicts.some((x) => x.index === v.index)) {
      verdictFixes++;
      continue;
    }
    let verdict = v.verdict as Verdict;
    const r = cleanProse(v.reason, FIELD_CAPS.verdict, situation);
    numbers += r.numbers;
    const sd = stripUnbackedSaid(r.text, situation);
    saidDropped += sd.removed;
    let reason = sd.text;
    if (reason && quoteChecks) {
      const q = checkQuotes(reason, verdictAllowed(v.index), situation);
      if (q.invented) {
        invalidModules++;
        inventedFields++;
        reason = "";
      } else {
        unquoted += q.unquoted;
        reason = q.text;
      }
    }
    const isPick = m.courseId !== null && m.courseId === pick.id;
    if (isPick && verdict !== "start-here") {
      verdict = "start-here";
      reason = VERDICT_TEMPLATES.pick;
      verdictFixes++;
    } else if (!isPick && verdict === "start-here") {
      verdict = "later";
      reason = m.courseId && onList.has(m.courseId) ? VERDICT_TEMPLATES.laterOnList : VERDICT_TEMPLATES.later;
      verdictFixes++;
    }
    if (!reason) {
      reason = isPick ? VERDICT_TEMPLATES.pick : VERDICT_TEMPLATES.later;
      verdictFixes++;
    }
    verdicts.push({ index: v.index, verdict, reason });
  }
  verdicts.sort((a, b) => a.index - b.index);
  check(checks, "verdicts", [verdictFixes ? `Fixed ${plural(verdictFixes, "verdict")}.` : ""]);
  if (quoteChecks || saidDropped) {
    check(checks, "quotes", [
      unquoted ? "Removed quote marks from words you didn't write." : "",
      inventedFields
        ? `Replaced ${plural(inventedFields, "line")} that named a module not in the course with the template.`
        : "",
      saidDropped ? `Removed ${plural(saidDropped, "sentence")} that said you wrote something you didn't.` : "",
    ]);
  }
  check(checks, "first gap", [firstGapFixed ? "Removed a sentence that called a later gap your first." : ""]);

  return {
    decision: {
      engine: input.engine ?? "ai",
      pickId: pick.id,
      alternates,
      whyThisOne: text.whyThisOne.trim(),
      useItAtWork: text.useItAtWork.trim(),
      honestFit: out.honestFit,
      gapNote: text.gapNote.trim(),
      checks,
      rulesPickId: input.rulesTopId,
      gaps: [...input.gaps],
      coverage,
      vsRules: text.vsRules.trim(),
      skim,
      mentionedVerdicts: verdicts,
      receipt: {
        words: input.words,
        gaps: nGaps,
        modulesMapped: totalModulesMapped(coverage),
        courses: coverage.length,
        invalidIdsRemoved: invalidIds,
        invalidModulesRemoved: invalidModules,
        numbersRemoved: numbers,
      },
    },
    checks,
  };
}
