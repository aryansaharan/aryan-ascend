import { COURSES } from "./courses";
import type { Baseline, MoveId } from "./course-types";
import { availableMoves, isAvailableMove } from "./moves";
import type { Check, Engine } from "./pick-types";
import {
  HOURS,
  LIMITS,
  countWords,
  normalizeProfile,
  type Budget,
  type Hours,
  type Mention,
  type MentionStatus,
  type PrefersFormat,
  type ProfileV2,
  type Strength,
} from "./profile";
import { cleanGaps, type SkillId } from "./skills";

// Job 1, "Read your situation" (addendum-ai): the shapes, plus everything code
// can read from the text without a model. Pure, shared by the server (rules
// fallback, verifier, mock) and the client (fallback when the request fails).

export type UnderstandReason =
  | "no-key"
  | "ai-error"
  | "ai-timeout"
  | "ai-invalid"
  /** the client got a 429 from the rate limit */
  | "rate-limited"
  /** the client couldn't reach the server (network, 4xx, 5xx, 10 s timeout) */
  | "unavailable";

export type UnderstoodGap = { id: SkillId; reason: string };

/** What Ascend understood. On the rules path most fields are empty and the confirm screen shows manual controls. */
export type Understanding = {
  /** short role line, at most 80 characters */
  role: string;
  /** an available move, or null when the AI said "none" or nothing matched (ask the user) */
  move: MoveId | null;
  /** one sentence, may quote them; "" on the rules path */
  moveWhy: string;
  /** index into the move's anchors; null when unknown */
  baseline: Baseline | null;
  /** copied verbatim from their text, or "" */
  baselineEvidence: string;
  /** every quote copied verbatim from their text */
  strengths: Strength[];
  /** ranked, from the move's vocabulary */
  gaps: UnderstoodGap[];
  /** courses they named; text is verbatim, courseId a catalog id or null */
  mentioned: Mention[];
  wantsCertificate: boolean;
  prefersFormat: PrefersFormat;
  /** hours a week they wrote, if any (backed by a number in their text) */
  hoursMentioned: number | null;
  /** hoursMentioned snapped down to an hours chip, to prefill the Time step */
  hoursChip: Hours | null;
};

/** What the understand model is shown, as JSON. */
export type UnderstandAiInput = {
  text: string;
  moves: {
    id: MoveId;
    label: string;
    startingPoints: string[];
    skills: { id: string; label: string }[];
  }[];
  catalog: { id: string; title: string; provider: string }[];
};

/** POST /api/understand response body. Always HTTP 200 when the guard passes. */
export type UnderstandResponse = {
  engine: Engine;
  reason?: UnderstandReason;
  understanding: Understanding;
  checks: Check[];
  /** words in the situation, counted by code */
  words: number;
  /** model call time */
  ms?: number;
  model?: string;
  /** the model's JSON before checks */
  raw?: unknown;
  /** what the model saw (moves and skills offered; the catalog list is summarised) */
  sent?: { moves: MoveId[]; skills: number; catalog: number };
};

// Text utilities -------------------------------------------------------------

/** Lowercase, straight quotes, single spaces: how quotes are compared to the situation. */
export function normalizeForQuote(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’ʼ`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")
    .trim();
}

/** True when `quote` appears in `situation`, ignoring case, quote style and spacing. Trailing full stops are ignored. */
export function isVerbatim(quote: string, situation: string): boolean {
  const q = normalizeForQuote(quote).replace(/^["']|["']$/g, "").replace(/[.,;:]+$/, "").trim();
  if (q.length < 2) return false;
  return normalizeForQuote(situation).includes(q);
}

/** Cuts at a word boundary within `max` characters (a prefix of a quote is still verbatim). */
export function cutWords(text: string, max: number): string {
  const t = text.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  const head = t.slice(0, max + 1);
  const i = head.lastIndexOf(" ");
  return (i > max * 0.5 ? head.slice(0, i) : t.slice(0, max)).replace(/[,;:\s]+$/, "").trim();
}

/** The first sentence, at most `max` characters (the role line on the rules path). */
export function firstSentence(text: string, max = 80): string {
  const t = text.replace(/\s+/g, " ").trim();
  const m = t.match(/^(.+?[.!?])(\s|$)/);
  const s = (m ? m[1] : t).replace(/[.!?]+$/, "").trim();
  return cutWords(s, max);
}

/** Sentences of the situation, for status and evidence lookups. */
function sentencesOf(text: string): string[] {
  return (text.replace(/\s+/g, " ").match(/[^.!?]+[.!?]*/g) ?? []).map((s) => s.trim()).filter(Boolean);
}

// Move guess (keywords, allowed on the fallback path) ---------------------------

const MOVE_PATTERNS: Record<MoveId, RegExp> = {
  "ai-build": /\b(llms?|gpt|openai|chatgpt|ai features?|build(ing)? (with )?ai|rag|agents?|langchain|prompt engineering|machine learning|ml engineer|genai|gen ai|generative ai|ai engineer)\b/gi,
  "ai-pm": /\b(ai product|ai pm|ai features? (spec|roadmap)|ai features? on the roadmap|ai strategy|ai roadmap|ai evals?|ai products?|(chatbot|ai|llm) pilot|good enough to ship|judge (whether|if) the ai)\b/gi,
  product: /\b(product manag\w*|into product|product roles?|product team|roadmaps?|product owner|apm|feature requests?|pm role)\b/gi,
  data: /\b(data analy\w*|sql|dashboards?|excel|spreadsheets?|tableau|power bi|analytics|data scien\w*|pandas|attrition questions?)\b/gi,
  ux: /\b(ux|user experience|ui design|figma|designers?|usability|content design|wireframes?|prototyp\w*)\b/gi,
  lead: /\b(manag(e|ing) (a team|people)|team lead|direct reports?|first-time manager|new manager|lead a team|leadership|people manager|one-to-ones?|1:1s?)\b/gi,
  growth: /\b(growth|marketing|acquisition|retention|funnels?|campaigns?|seo|performance marketer)\b/gi,
  cloud: /\b(devops|cloud|aws|azure|gcp|docker|kubernetes|terraform|ci\/cd|deploy\w*|infrastructure)\b/gi,
};

const INTENT_RE = /\b(want|wants|wanted|move into|moving into|become|switch|transition|get into|learn|grow into|aim|hoping|goal|would like)\b/i;

/**
 * Keyword guess at the direction: each sentence that states an intention
 * ("I want to move into product") counts three times. Only available moves.
 * Null when nothing matches.
 */
export function guessMove(text: string, moves: readonly MoveId[] = availableMoves().map((m) => m.id)): MoveId | null {
  const scores = new Map<MoveId, number>();
  for (const s of sentencesOf(text)) {
    const weight = INTENT_RE.test(s) ? 3 : 1;
    for (const id of moves) {
      const hits = s.match(MOVE_PATTERNS[id])?.length ?? 0;
      if (hits) scores.set(id, (scores.get(id) ?? 0) + hits * weight);
    }
  }
  let best: MoveId | null = null;
  let bestScore = 0;
  for (const id of moves) {
    const sc = scores.get(id) ?? 0;
    if (sc > bestScore) {
      best = id;
      bestScore = sc;
    }
  }
  return best;
}

// Mentions (catalog titles and named courses) --------------------------------------

const TITLE_TAIL = /\s*(professional certificate|specialization|specialisation|certificate|certification course|certification|course|program|programme)\s*$/i;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** A regex that finds `name` in free text: words in order, any punctuation or spacing between. */
function nameRegex(name: string): RegExp | null {
  const words = name.toLowerCase().match(/[a-z0-9+#]+/g);
  if (!words || words.length === 0) return null;
  return new RegExp(`\\b${words.map(escapeRe).join("[^a-z0-9+#]+")}\\b`, "i");
}

type CatalogName = { id: string; re: RegExp; words: number; provider: RegExp | null };

const CATALOG_NAMES: CatalogName[] = COURSES.flatMap((c) => {
  const names = new Set<string>();
  const title = c.title.trim();
  names.add(title);
  const head = title.split(":")[0].trim();
  names.add(head);
  names.add(head.replace(TITLE_TAIL, "").trim());
  names.add(title.replace(TITLE_TAIL, "").trim());
  const providerWord = c.provider.split(/[\s(]/)[0];
  const provider = providerWord && providerWord.length > 2 ? nameRegex(providerWord) : null;
  return [...names]
    .filter((n) => n.length >= 6)
    .map((n) => ({ id: c.id, re: nameRegex(n), words: (n.match(/[A-Za-z0-9+#]+/g) ?? []).length, provider }))
    .filter((x): x is CatalogName => x.re !== null);
});

const NAMED_COURSE_RE =
  /((?:[A-Z][\w'’&.+-]*\s+){1,6}(?:[Cc]ertificate|[Cc]ertification|[Cc]ourse|[Ss]peciali[sz]ation|[Pp]rogram|[Pp]rogramme|[Bb]ootcamp|[Nn]anodegree|[Bb]ook))\b/g;

const STOP_LEAD = /^(I|I'm|I've|My|The|A|An|And|But|Someone|We|It|This|That|Then|Also)\s+/;

/** Status from the sentence a mention sits in. */
export function mentionStatus(sentence: string): MentionStatus {
  if (/\b(dropped|quit|gave up|stopped|abandoned|left it)\b/i.test(sentence)) return "dropped";
  if (/\b(finished|completed|done with|passed)\b/i.test(sentence)) return "finished";
  if (/\b(started|am doing|i'm doing|halfway|enrolled|taking|working through)\b/i.test(sentence)) return "started";
  return "considering";
}

/**
 * Courses named in the text, found by code: catalog titles (or their
 * distinctive part) and phrases like "the Google Project Management
 * certificate". Text is copied verbatim; status comes from its sentence.
 */
export function findMentions(text: string): Mention[] {
  const out: (Mention & { at: number; end: number })[] = [];
  const flat = text.replace(/\s+/g, " ");
  // The clause a mention sits in: from the previous sentence or clause break to the next.
  const sentenceAt = (i: number) => {
    let start = 0;
    let end = flat.length;
    for (const m of flat.matchAll(/[.!?;,]\s|\s(?:and|but|then)\s/gi)) {
      const at = m.index ?? 0;
      if (at < i) start = at + m[0].length;
      else {
        end = at;
        break;
      }
    }
    // "I started X and dropped it": a later "dropped it" in the same sentence wins.
    const sentenceEnd = flat.slice(end).search(/[.!?](\s|$)/);
    const rest = flat.slice(end, sentenceEnd < 0 ? flat.length : end + sentenceEnd);
    const it = rest.match(/\b(dropped|quit|gave up on|stopped|abandoned|finished|completed) it\b/i);
    return it ? `${flat.slice(start, end)} ${it[0]}` : flat.slice(start, end);
  };

  // named phrases first (they carry the user's fuller wording)
  for (const m of flat.matchAll(NAMED_COURSE_RE)) {
    let phrase = m[1].trim();
    let at = m.index ?? 0;
    while (STOP_LEAD.test(phrase)) {
      const cut = phrase.replace(STOP_LEAD, "");
      at += phrase.length - cut.length;
      phrase = cut;
    }
    if (phrase.split(/\s+/).length < 2) continue;
    out.push({ text: cutWords(phrase, LIMITS.mentionTextMax), courseId: null, status: mentionStatus(sentenceAt(at)), at, end: at + phrase.length });
  }

  // catalog titles: three words or more, or two with the provider named too
  for (const n of CATALOG_NAMES) {
    const m = n.re.exec(flat);
    if (!m) continue;
    if (n.words < 2) continue;
    if (n.words === 2 && !(n.provider && n.provider.test(flat))) continue;
    const at = m.index;
    const end = at + m[0].length;
    const overlap = out.find((o) => at < o.end && end > o.at);
    if (overlap) {
      if (!overlap.courseId) overlap.courseId = n.id;
      continue;
    }
    out.push({ text: cutWords(m[0], LIMITS.mentionTextMax), courseId: n.id, status: mentionStatus(sentenceAt(at)), at, end });
  }

  return out
    .sort((a, b) => a.at - b.at)
    .slice(0, LIMITS.mentionedMax)
    .map(({ text: t, courseId, status }) => ({ text: t, courseId, status }));
}

// Small readers ---------------------------------------------------------------------

/** They said they need or want a certificate. */
export function wantsCertificateFromText(text: string): boolean {
  return /\b(need|needs|want|wants|require|required|must have|looking for)\b[^.]{0,50}\bcertific/i.test(text);
}

/** Number words code reads as numbers (hours, years, counts in the person's text). */
export const NUMBER_WORDS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, eleven: 11, twelve: 12,
  fifteen: 15, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, ninety: 90, hundred: 100,
};

/** A number as written: digits, or a word up to twenty. */
const NUM = "(\\d{1,2}(?:\\.\\d)?|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty)";
const HOURS_RE = new RegExp(`\\b${NUM}\\s*(?:\\+\\s*)?(?:hours?|hrs?)\\b`, "gi");
/** Right after the figure: it is per week ("a week", "weekly", "on weekends"). */
const WEEKLY_AFTER = /^\s*(?:a|per|each|every|\/)\s*week\b|^\s*weekly\b|^\s*(?:on|over|at|every)\s+(?:the\s+)?weekends?\b/i;
/** Right after the figure: it is not study time (per day, a commute, at work, per month). */
const NOT_STUDY_AFTER =
  /^\s*(?:(?:a|per|each|every)\s+(?:day|night|shift)|daily|each\s+way|(?:of|on|in)\s+(?:my\s+)?(?:commute|commuting|meetings?|calls?)|at\s+(?:work|the\s+office)|(?:a|per)\s+(?:month|year))\b/i;
/** Just before the figure: they are offering it ("I can study", "I have", "spare"). */
const STUDY_BEFORE = /\b(?:study|learn(?:ing)?|spare|free|give|put in|set aside|have|got|manage|can do|for this|for courses?)\b[^.]{0,25}$/i;
/** Just before the figure: it is time at work ("I work 45 hours", "working 40 hours", "full-time, 40 hours"). */
const WORK_BEFORE = /\b(?:work(?:s|ing)?|job|shifts?|office|full[- ]time|part[- ]time)\b[^.]{0,20}$/i;

function numberValue(raw: string): number {
  const w = raw.toLowerCase();
  return NUMBER_WORDS[w] ?? Number(w);
}

/**
 * Hours a week written in the text, or null. Every "N hours" is read with
 * the words around it: a figure offered for study ("I can study two hours a
 * week") wins, then any other weekly figure, then a lone bare figure. Per
 * day, each way, at work and per month figures never count ("9 hours a day in
 * Excel"), and neither do working hours ("I work 45 hours a week").
 */
export function hoursFromText(text: string): number | null {
  let weekly: number | null = null;
  let study: number | null = null;
  const bare: number[] = [];
  for (const m of text.matchAll(HOURS_RE)) {
    const n = numberValue(m[1]);
    if (!Number.isFinite(n) || n <= 0 || n > 80) continue;
    const at = m.index ?? 0;
    const end = at + m[0].length;
    const after = text.slice(end, end + 30);
    const before = text.slice(Math.max(0, at - 40), at);
    if (NOT_STUDY_AFTER.test(after)) continue;
    // The nearer context wins: in "I have a full-time job, 40 hours a week"
    // the work words sit closer to 40 than "have", so it is work time.
    const studyAt = before.search(STUDY_BEFORE);
    const workAt = before.search(WORK_BEFORE);
    const offered = studyAt >= 0 && studyAt > workAt;
    if (!offered && workAt >= 0) continue;
    if (offered) {
      study ??= n;
      continue;
    }
    if (WEEKLY_AFTER.test(after)) {
      weekly ??= n;
      continue;
    }
    bare.push(n);
  }
  return study ?? weekly ?? (bare.length === 1 ? bare[0] : null);
}

/**
 * Every number written right before an hours word, both ends of a range
 * included ("3 or 4 hours" gives 3 and 4). What an AI hours figure must match.
 */
export function hoursNumbers(text: string): number[] {
  const re = new RegExp(`\\b${NUM}(?:\\s*(?:-|or|to|and)\\s*${NUM})?\\s*(?:\\+\\s*)?(?:hours?|hrs?)\\b`, "gi");
  const out: number[] = [];
  for (const m of text.matchAll(re)) {
    for (const raw of [m[1], m[2]]) {
      if (!raw) continue;
      const n = numberValue(raw);
      if (Number.isFinite(n) && n > 0 && !out.includes(n)) out.push(n);
    }
  }
  return out;
}

/**
 * Numbers in `text` that the person never wrote (as digits or a word),
 * e.g. the 7 in "HR generalist, 7 years" when they wrote 4. "one" is left
 * out: it is mostly not a number ("one place to answer").
 */
export function unbackedNumbers(text: string, situation: string): string[] {
  const re = /\b(\d+(?:[.,]\d+)?|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|sixty|ninety|hundred)\b/gi;
  const out: string[] = [];
  for (const m of text.matchAll(re)) {
    const raw = m[1];
    const n = NUMBER_WORDS[raw.toLowerCase()] ?? Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(n)) continue;
    if (!numberInText(n, situation) && !normalizeForQuote(situation).includes(raw.toLowerCase())) out.push(raw);
  }
  return out;
}

/** True when the number appears in the text as digits or as a word. */
export function numberInText(n: number, text: string): boolean {
  const t = text.toLowerCase();
  if (new RegExp(`(^|[^\\d.])${String(n).replace(".", "\\.")}([^\\d]|$)`).test(t)) return true;
  return Object.entries(NUMBER_WORDS).some(([w, v]) => v === n && new RegExp(`\\b${w}\\b`).test(t));
}

/** The largest hours chip at or below `n` (a bad week keeps fewer hours), or null. */
export function snapHours(n: number | null | undefined): Hours | null {
  if (typeof n !== "number" || !Number.isFinite(n) || n <= 0) return null;
  let best: Hours = HOURS[0];
  for (const h of HOURS) if (h <= n) best = h;
  return best;
}

// The rules answer --------------------------------------------------------------------

/**
 * What code alone reads from the situation: a role from the first sentence,
 * a keyword guess at the direction, the catalog courses named, a stated need
 * for a certificate, and hours a week if written. Everything else is left for
 * the user to set on the confirm screen.
 */
export function rulesUnderstanding(situation: string): Understanding {
  const hours = hoursFromText(situation);
  return {
    role: firstSentence(situation, 80),
    move: guessMove(situation),
    moveWhy: "",
    baseline: null,
    baselineEvidence: "",
    strengths: [],
    gaps: [],
    mentioned: findMentions(situation),
    wantsCertificate: wantsCertificateFromText(situation),
    prefersFormat: "any",
    hoursMentioned: hours,
    hoursChip: snapHours(hours),
  };
}

/** The response shape for the rules path (server fallback and client fallback). */
export function rulesUnderstandResponse(
  situation: string,
  reason: UnderstandReason,
  extra: Partial<Pick<UnderstandResponse, "checks" | "ms" | "model" | "raw" | "sent">> = {},
): UnderstandResponse {
  return {
    engine: "rules",
    reason,
    understanding: rulesUnderstanding(situation),
    checks: extra.checks ?? [],
    words: countWords(situation),
    ...(extra.ms !== undefined ? { ms: extra.ms } : {}),
    ...(extra.model ? { model: extra.model } : {}),
    ...(extra.raw !== undefined ? { raw: extra.raw } : {}),
    ...(extra.sent ? { sent: extra.sent } : {}),
  };
}

// From understanding to profile -------------------------------------------------------

export type ProfileEdits = Partial<
  Pick<
    ProfileV2,
    "currentRole" | "move" | "baseline" | "gaps" | "strengths" | "mentioned" | "wantsCertificate" | "prefersFormat"
  >
>;

/**
 * Builds the profile the confirm screen saves: the understanding, then the
 * user's edits on top, plus hours and budget from steps 2 and 3. Gaps that
 * don't belong to the final move are dropped (the page should then ask for
 * gaps from that move). Null when there's still no available move.
 */
export function profileFromUnderstanding(args: {
  situation: string;
  understanding: Understanding;
  engine: Engine;
  hoursPerWeek: Hours;
  budget: Budget;
  edits?: ProfileEdits;
}): ProfileV2 | null {
  const u = args.understanding;
  const e = args.edits ?? {};
  const move = e.move ?? u.move;
  if (!move || !isAvailableMove(move)) return null;
  const role = (e.currentRole ?? u.role).trim() || firstSentence(args.situation, 80) || "Not given";
  // The AI is credited with the gaps only when the direction is the one it
  // read and every gap kept is one it named (reordering or removing is fine).
  // A new direction, a direction picked by hand, or an added gap: the user's.
  const gaps = cleanGaps(move, e.gaps ?? u.gaps.map((g) => g.id));
  const aiGaps = u.move === move ? cleanGaps(move, u.gaps.map((g) => g.id)) : [];
  const byAi = args.engine !== "rules" && u.move === move && gaps.every((id) => aiGaps.includes(id));
  return normalizeProfile({
    v: 2,
    currentRole: role,
    move,
    baseline: e.baseline ?? u.baseline ?? 0,
    hoursPerWeek: args.hoursPerWeek,
    budget: args.budget,
    situation: args.situation,
    gaps,
    strengths: e.strengths ?? u.strengths,
    mentioned: e.mentioned ?? u.mentioned,
    wantsCertificate: e.wantsCertificate ?? u.wantsCertificate,
    prefersFormat: e.prefersFormat ?? u.prefersFormat,
    understoodBy: byAi ? "ai" : "user",
  });
}
