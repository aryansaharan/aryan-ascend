import type { Course } from "./course-types";
import {
  budgetPhrase,
  costLine,
  fmtDay,
  fmtTime,
  fmtWeekday,
  durationPhrase,
  hoursAWeek,
  modelLabel,
  startTarget,
  weeksPhrase,
  type CostAtPace,
  type DisplayCurrency,
} from "./format";
import { MOVES } from "./moves";
import { budgetStepDown, normalizeAdjust, type Adjust, type FitProfile } from "./profile";
import type { Candidate } from "./fit";
import type { MoveId } from "./course-types";
import type {
  CandidateCoverage,
  CoverageSource,
  DecisionOrigin,
  Engine,
  PickReason,
  Receipt,
  Verdict,
} from "./pick-types";

// Code-written copy. Every line here is a template filled from the catalog or
// the user's answers, so it may carry numbers. The model's text carries only
// figures the person wrote themselves.

function sentence(s: string): string {
  const t = s.trim();
  return /[.!?]$/.test(t) ? t : `${t}.`;
}

/** Drops a trailing full stop so a typed role can sit inside a sentence. */
export function roleInSentence(role: string): string {
  return role.trim().replace(/[.\s]+$/, "");
}

/**
 * The role as a noun phrase after "I'm" or "You're": "a customer success
 * manager", "an HR generalist", "a UX designer". A leading "I'm" or "I work
 * as" is dropped, a leading capital is lowered unless it starts an acronym,
 * and "a" or "an" is added unless the role brings its own article. Empty when
 * nothing is left.
 */
export function roleNoun(raw: string): string {
  let r = roleInSentence(raw)
    .replace(/^(i am|i'm|im|i work as|i work in|i'm working as|currently|right now)\s+/i, "")
    .trim();
  if (!r) return "";
  if (/^(a|an|the|my|our)\s/i.test(r)) return r[0].toLowerCase() + r.slice(1);
  const first = r.split(/\s+/)[0] ?? "";
  const acronym = first.length > 1 && first === first.toUpperCase() && /[A-Z]/.test(first);
  if (!acronym && /^[A-Z][a-z'-]*$/.test(first)) r = r[0].toLowerCase() + r.slice(1);
  const w = first.toLowerCase();
  // Acronyms are read letter by letter: "an HR", "an SDE", "a UX".
  const vowelSound = acronym
    ? /^[AEFHILMNORSX]/.test(first)
    : /^(hour|honest|heir)/.test(w) || (/^[aeiou]/.test(w) && !/^(uni|use|usu|uti|eu|one|once)/.test(w));
  return `${vowelSound ? "an" : "a"} ${r}`;
}

/** Each direction as it reads mid-sentence: "working on {phrase}". */
export const MOVE_PHRASES: Record<MoveId, string> = {
  "ai-build": "building with AI",
  "ai-pm": "AI product management",
  product: "product management",
  data: "data analysis",
  ux: "UX design",
  lead: "leading a team",
  growth: "growth marketing",
  cloud: "cloud and DevOps",
};

// Pick card ----------------------------------------------------------------

/**
 * The catalog's bestFor is a noun phrase ("People who want..."), so it reads
 * as "Best for people who want...". Acronyms and plurals like "PMs" keep
 * their capitals.
 */
export function bestForSentence(bestFor: string): string {
  const t = sentence(bestFor);
  const first = t.split(/\s+/)[0] ?? "";
  const keep = /^[A-Z]{2,}|^[A-Z][a-z]*[A-Z]/.test(first);
  return `Best for ${keep ? t : t.charAt(0).toLowerCase() + t.slice(1)}`;
}

/** "Best for {bestFor} It fits {h} hours a week and {budget phrase}." (spec 5.2) */
export function whyThisOneTemplate(
  course: Course,
  profile: FitProfile,
  adjust: Partial<Adjust> | null | undefined,
  currency: DisplayCurrency,
): string {
  const a = normalizeAdjust(adjust);
  const budget = a.cheaper ? budgetStepDown(profile.budget) : profile.budget;
  return `${bestForSentence(course.bestFor)} It fits ${hoursAWeek(profile.hoursPerWeek)} and ${budgetPhrase(budget, currency)}.`;
}

/** The move's first tie-in (spec 5.2). */
export function atWorkTemplate(profile: Pick<FitProfile, "move">): string {
  return MOVES[profile.move].tieIns[0];
}

/** Used only when the model says the fit is weak but leaves the gap empty. */
export const GAP_NOTE_TEMPLATE =
  "Ascend's list doesn't have a closer match for this direction yet.";

/** "This is the closest fit in Ascend's list, not a strong one. {gapNote}" */
export function weakFitNote(gapNote: string): string {
  return `This is the closest fit in Ascend's list, not a strong one. ${gapNote}`.trim();
}

/**
 * Read-back line: `{role}. {Move}, at the starting point you confirmed
 * ({anchor}). {h} hours a week, {budget}.` The anchor is one of three preset
 * levels, not the person's words, so it is never shown in quotation marks.
 */
export function readBackLine(profile: FitProfile, currency: DisplayCurrency): string {
  const move = MOVES[profile.move];
  return `${roleInSentence(profile.currentRole)}. ${move.label}, at the starting point you confirmed (${lowerAnchor(move.anchors[profile.baseline])}). ${hoursAWeek(profile.hoursPerWeek)}, ${budgetPhrase(profile.budget, currency)}.`;
}

/** "I've used ChatGPT, never the API" reads "I've used ChatGPT, never the API"; "Spreadsheets, no SQL yet" reads "spreadsheets, no SQL yet". */
function lowerAnchor(anchor: string): string {
  const first = anchor.split(/\s+/)[0] ?? "";
  // "I", "I've", "I'm" and acronyms keep their capitals
  if (/^I(?:'|’|$)/.test(first) || (first.length > 1 && first === first.toUpperCase())) return anchor;
  return anchor.charAt(0).toLowerCase() + anchor.slice(1);
}

/** Shown when the scope is trimmed: "Start with {scope}. About {w} weeks. Decide on the rest after." */
export function scopeNotice(candidate: Pick<Candidate, "scope" | "scopeLabel" | "weeks">): string | null {
  if (candidate.scope === "whole") return null;
  return `Start with ${candidate.scopeLabel}. About ${weeksPhrase(candidate.weeks)}. Decide on the rest after.`;
}

// "Pick this instead if" -------------------------------------------------

export const INSTEAD_IF = {
  free: "Pick this instead if you want to spend nothing.",
  less: "Pick this instead if you want to spend less.",
  shorter: (weeks: number) => `Pick this instead if you want a win in ${weeksPhrase(weeks)}.`,
  book: "Pick this instead if you'd rather read than watch.",
  fromBook: "Pick this instead if you want exercises, not just reading.",
  practice: "Pick this instead if you learn best by doing.",
  cohort: "Pick this instead if you want a group and deadlines.",
  certificate: "Pick this instead if you need a certificate for applications.",
  deeper: "Pick this instead if you want more depth and can stretch.",
  alsoFits: "Also fits your hours and budget.",
} as const;

// Engine line ------------------------------------------------------------

/**
 * The mono line under the pick (spec section 7), without the leading "// ".
 * Pass the decision's origin; "pick" and "repick" use the engine and reason.
 */
export function engineLine(d: {
  engine: Engine;
  reason?: PickReason;
  origin?: DecisionOrigin;
  model?: string;
  ms?: number;
  sent?: { candidateIds: string[] };
}): string {
  if (d.origin === "swapped") return "Your choice. These lines come from the catalog";
  if (d.origin === "adjusted") return "Adjusted by rules after your change";
  if (d.engine === "ai" || d.engine === "mock") {
    const n = d.sent?.candidateIds.length ?? 0;
    const secs = typeof d.ms === "number" ? ` · ${(d.ms / 1000).toFixed(1)}s` : "";
    if (d.engine === "mock") {
      return `${MOCK_LABEL}. Chosen from ${n} courses that passed the rules${secs}`;
    }
    return `Chosen by ${modelLabel(d.model)} from ${n} courses that passed the rules${secs}`;
  }
  switch (d.reason) {
    case "one-candidate":
      return "Only one course passed the rules, so no AI call was needed";
    case "no-key":
      return "Chosen by Ascend's rules. AI isn't set up here";
    case "no-candidates":
      return "No course passed the rules";
    case "ai-invalid":
      return "Chosen by Ascend's rules. The AI's answer didn't pass the checks, so these lines come from the catalog";
    default:
      return "Chosen by Ascend's rules. The AI is busy right now, so these lines come from the catalog";
  }
}

/** Prefix for every line that describes the dev-only mock (ASCEND_MOCK_AI=1). */
export const MOCK_LABEL = "MOCK AI (dev only)";

/** "Claude Opus 5.5", or the mock label. */
export function engineName(engine: Engine, model?: string): string {
  if (engine === "mock") return MOCK_LABEL;
  if (engine === "ai") return modelLabel(model);
  return "Ascend's rules";
}

/** "No AI call. {reason}." for the nested "Show what the AI saw" panel. */
export function noAiCallLine(reason: PickReason | undefined): string {
  switch (reason) {
    case "one-candidate":
      return "No AI call. Only one course passed the rules.";
    case "no-candidates":
      return "No AI call. No course passed the rules.";
    case "no-key":
      return "No AI call. AI isn't set up here.";
    default:
      return "No AI call. Ascend's rules chose.";
  }
}

/** The three "Why it works this way" lines. */
export const WHY_IT_WORKS: [string, string, string] = [
  "Code checks every course against your hours, level and budget first.",
  "The AI chooses among what's left and can only return courses from that list.",
  "Code checks the answer and removes any sentence that states a time, price, rating or share you didn't write, because those come from the catalog.",
];

const CHECK_LABELS: Record<"understand" | "pick" | "tailor", Record<string, string>> = {
  understand: {
    complete: "The answer was complete and in the expected format",
    move: "The direction is one Ascend covers",
    quotes: "Every quote is copied from your words",
    gaps: "Gaps come from this direction's skills",
    mentions: "Courses you named are in your words and matched to the right course",
    style: "No dashes, hype or numbers you didn't write",
    hours: "Hours are a figure you wrote",
  },
  pick: {
    complete: "The answer was complete and in the expected format",
    ids: "Every course is from the list that passed the rules",
    coverage: "Every module it mapped exists in that course's scope",
    "no numbers": "No times, prices or ratings the catalog doesn't back",
    style: "No dashes, exclamation marks or hype",
    quotes: "Quotes are real module names or your own words, and so is anything it says you wrote",
    "first gap": "Only your first gap is called your first",
    length: "Each line fits its length limit",
    empty: "No line was left empty",
    gapNote: "A gap note only when the fit is weak",
    vsRules: "A comparison only when the pick differs from the rules",
    skim: "Skim notes point at real modules of the pick",
    verdicts: "One verdict per course you mentioned, consistent with the pick",
    "useful alternates": "Every alternate closes at least one of your gaps",
  },
  tailor: {
    complete: "The answer was complete and in the expected format",
    length: "One task for every week",
    "no numbers": "No times, prices or ratings the catalog doesn't back",
    style: "No dashes, exclamation marks or hype",
    quotes: "Quotes are real module names",
    "other weeks": "No task names another week's module",
    artifact: "The finish line is tied to your situation",
  },
};

/** What a verifier check makes sure of, in plain words, for "How this was decided". */
export function checkLabel(job: "understand" | "pick" | "tailor", name: string): string {
  return CHECK_LABELS[job][name] ?? `${name.charAt(0).toUpperCase()}${name.slice(1)}`;
}

// Compare ------------------------------------------------------------------

/** Prefilled "Ask someone who took it" message. */
export function askSomeoneMessage(title: string, role: string, h: number): string {
  const who = roleNoun(role);
  // A typed role often carries its own clauses ("..., 2 years"), so it gets its own sentence.
  return `Hi, I saw you did ${title}. ${who ? `I'm ${who}. ` : ""}I have about ${hoursAWeek(h)}. Was it worth it for you? Two lines is plenty.`;
}

export function linkedInSearchUrl(title: string): string {
  return `https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(title)}`;
}

export function whatsAppUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

// Plan ---------------------------------------------------------------------

/**
 * First step on the ticket card. After a missed session ("Not yet"), the step
 * shrinks to the first 10 minutes.
 */
export function firstStep(
  course: Course,
  rebooked: boolean,
): { text: string; url: string } {
  const label = course.freeStart?.label ?? course.title;
  const target = startTarget(course);
  const url = course.freeStart?.url ?? course.url;
  const first = course.modules[0].name;
  // A free start that is the first module itself ("Chapter 1: Introduction")
  // would otherwise read "Open Chapter 1 and start Chapter 1".
  const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const same =
    course.freeStart !== null &&
    (norm(first).includes(norm(label)) ||
      norm(label).includes(norm(first)) ||
      // a one-page course whose free start is the page itself
      (course.modules.length === 1 && course.freeStart.url === course.url));
  const text = rebooked
    ? `Open ${target} and do just the first 10 minutes.`
    : same
      ? `Open ${target} and start at the beginning.`
      : `Open ${target} and start ${first}.`;
  return { text, url };
}

/**
 * "You're {a role}, working on {move phrase} at about {h} hours a week." then
 * "This plan covers {scope}, sized to that." for a trimmed plan, or "The weeks
 * below are sized to that." for the whole course (scope null). The role stops
 * at its first comma, so "HR generalist, 4 years" doesn't run into the clause.
 */
export function planOpener(
  profile: Pick<FitProfile, "currentRole" | "move" | "hoursPerWeek">,
  scope: string | null,
): string {
  const who = roleNoun(profile.currentRole.split(",")[0] ?? "");
  const doing = `working on ${MOVE_PHRASES[profile.move]} at about ${hoursAWeek(profile.hoursPerWeek)}`;
  const lead = who ? `You're ${who}, ${doing}.` : `${doing[0].toUpperCase()}${doing.slice(1)}.`;
  return scope ? `${lead} This plan covers ${scope}, sized to that.` : `${lead} The weeks below are sized to that.`;
}

/**
 * Money line on the plan: free courses get "Free." (plus the certificate note);
 * paid ones lead with "Start free. Pay only if week one still fits." when a free
 * start exists, then the cost line.
 */
export function moneyLine(
  course: Course,
  pace: CostAtPace | null,
  currency: DisplayCurrency,
): { lead: string | null; cost: string } {
  if (course.cost?.model === "free") {
    return {
      lead: null,
      cost: course.certificate === "paid" ? "Free. Certificate costs extra." : "Free.",
    };
  }
  return {
    lead: course.freeStart ? "Start free. Pay only if week one still fits." : null,
    cost: costLine(course, pace, currency),
  };
}

/** Coverage line under the weeks (spec 3.5). */
export function coverageLine(args: {
  whole: boolean;
  scopeLabel: string;
  scopeHours: number;
  totalHours: number;
  remainingWeeks: number;
  weekCount: number;
}): string {
  if (args.whole) return "This plan covers the whole course.";
  return `This plan covers ${args.scopeLabel}, about ${round1(args.scopeHours)} of ${round1(args.totalHours)} hours. The rest is about ${weeksPhrase(args.remainingWeeks)} at this pace. Decide after week ${Math.min(4, args.weekCount)}.`;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** "Week 2 · Mon 27 Oct · about 2.5 hours" (or "about 40 minutes") */
export function weekHeading(k: number, start: string, hours: number): string {
  return `Week ${k} · ${fmtDay(start)} · about ${durationPhrase(hours)}`;
}

/** "I'm starting {title} on {Tue 21 Oct} at {8:30 pm}. 25 minutes. Ask me on {Thu} how it went." */
export function tellOnePerson(title: string, s: Date | string): string {
  const start = typeof s === "string" ? new Date(s) : s;
  const askOn = new Date(start.getTime() + 2 * 86_400_000);
  return `I'm starting ${title} on ${fmtDay(start)} at ${fmtTime(start)}. 25 minutes. Ask me on ${fmtWeekday(askOn)} how it went.`;
}

/** "You started {n} hours after choosing." */
export function startedLine(hours: number): string {
  return `You started ${hours} ${hours === 1 ? "hour" : "hours"} after choosing.`;
}

/**
 * The strip under the plan title (without "// "): who built the weeks, who
 * wrote the tasks, and that opening the link calls no AI.
 */
export function planEngineLine(te: Engine, model?: string): string {
  const tasks =
    te === "ai"
      ? `tasks tailored once by ${modelLabel(model)}`
      : te === "mock"
        ? `tasks written once by ${MOCK_LABEL}`
        : "tasks from Ascend's templates";
  return `Weeks built in code from the course outline · ${tasks} · opening this link makes no AI call`;
}

export const PLAN_FOOTER =
  "Saved on this device. The link opens the same plan anywhere. It includes the role you typed, so share it with that in mind.";

export const STORAGE_BLOCKED = "This browser isn't saving, so keep the link.";

// Showing the work (addendum-ai) ---------------------------------------------------

function count(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The receipt under the pick card, counted by code, without the leading "// ".
 * AI path: "AI read your {words} words · found {g} gaps · mapped {m} modules
 * across {c} courses · chose 1" and "Code checked: {x} invented courses ·
 * {y} invented modules · every hour and price from the catalog". Rules path: one line.
 * Empty when nothing was picked. `understoodBy` comes from the profile: gaps
 * the user set by hand are "used", not "found". With `aiGapIds` (the gaps the
 * AI's own reading named, in its order), the AI is credited with "found" only
 * when the pick used exactly those gaps in that order; any edit on Check is
 * said ("you reordered them", "you changed them to N"). null means that
 * reading isn't on this device, so it isn't credited.
 */
export function receiptLines(
  d: {
    engine: Engine;
    reason?: PickReason;
    origin?: DecisionOrigin;
    pickId: string | null;
    receipt: Receipt;
    coverage?: readonly CandidateCoverage[];
    gaps?: readonly string[];
  },
  understoodBy: "ai" | "user" = "ai",
  aiGapIds?: readonly string[] | null,
): string[] {
  if (!d.pickId) return [];
  const r = d.receipt;
  const aiWork = (d.coverage ?? []).some((c) => c.source !== "keywords");
  const checked = `Code checked: ${count(r.invalidIdsRemoved, "invented course", "invented courses")} · ${count(r.invalidModulesRemoved, "invented module", "invented modules")} · every hour and price from the catalog`;
  if (d.origin === "swapped" || d.origin === "adjusted") {
    if (!aiWork) return [`Chosen by rules from ${count(r.courses, "course", "courses")}, matched by keywords`];
    const tail = d.origin === "swapped" ? "you chose this one" : "rules re-ranked after your change";
    return [`AI mapped ${count(r.modulesMapped, "module", "modules")} across ${count(r.courses, "course", "courses")} · ${tail}`, checked];
  }
  if (d.engine === "rules") {
    if (d.reason === "one-candidate") return ["Only one course passed the rules, so no AI call was needed"];
    // the engine line above already says why the AI didn't choose
    return [`Your gaps matched to modules by keywords across ${count(r.courses, "course", "courses")}`];
  }
  const lead = d.engine === "mock" ? `${MOCK_LABEL} · read` : "AI read";
  const read = `${lead} your ${count(r.words, "word", "words")}`;
  if (r.gaps === 0) return [`${read} · no gaps to match · chose 1 from ${count(r.courses, "course", "courses")}`, checked];
  // "found" only when the pick used exactly the gaps the AI's reading named, in its order.
  const used = d.gaps ?? [];
  const sameSet = !!aiGapIds && aiGapIds.length === used.length && used.every((g) => aiGapIds.includes(g));
  const sameOrder = sameSet && used.every((g, i) => aiGapIds?.[i] === g);
  const gapPart =
    sameOrder || (understoodBy === "ai" && aiGapIds === undefined)
      ? `found ${count(r.gaps, "gap", "gaps")}`
      : sameSet
        ? `found ${count(r.gaps, "gap", "gaps")} · you reordered them`
        : aiGapIds && aiGapIds.length > 0
          ? `found ${count(aiGapIds.length, "gap", "gaps")} · you changed them to ${r.gaps}`
          : `worked from your ${count(r.gaps, "gap", "gaps")}`;
  return [
    `${read} · ${gapPart} · mapped ${count(r.modulesMapped, "module", "modules")} across ${count(r.courses, "course", "courses")} · chose 1`,
    checked,
  ];
}

/**
 * "Rules alone would have picked {title}. {vsRules}" when the AI chose
 * differently, the "same course" line when it agreed, null on the rules path
 * or after a swap or a chip that re-ranked. The pick page also hides it after
 * a chip that kept the AI's pick but changed the list it chose from.
 */
export function rulesAloneLine(
  d: {
    engine: Engine;
    origin?: DecisionOrigin;
    pickId: string | null;
    rulesPickId: string | null;
    vsRules: string;
    gaps?: readonly string[];
  },
  rulesTitle: string | null,
): string | null {
  if (d.engine === "rules" || !d.pickId || !d.rulesPickId) return null;
  if (d.origin === "swapped" || d.origin === "adjusted") return null;
  if (d.pickId === d.rulesPickId) {
    // with no gaps there is no module match to add
    return d.gaps && d.gaps.length === 0
      ? "Rules alone pick the same course. The AI adds your weekly tasks."
      : "Rules alone pick the same course. The AI adds the module match and your weekly tasks.";
  }
  const why = d.vsRules.trim();
  return `Rules alone would have picked ${rulesTitle ?? "another course"}.${why ? ` ${why}` : ""}`;
}

/** "Matched by Claude Opus 5.5" / "Matched by keywords" (without "// "). */
export function coverageSourceLine(source: CoverageSource, model?: string): string {
  if (source === "mock") return `${MOCK_LABEL}. Matched by keyword heuristics`;
  if (source === "ai") return `Matched by ${modelLabel(model)}`;
  return "Matched by keywords";
}

/** "Covers 2 of your 3 gaps" (code arithmetic over verified coverage). */
export function coverageCountLine(covered: number, gaps: number): string {
  if (gaps === 0) return "No gaps to match";
  if (gaps === 1) return covered >= 1 ? "Covers your gap" : "Doesn't cover your gap";
  return `Covers ${covered} of your ${count(gaps, "gap", "gaps")}`;
}

/** "Skim: {module}. {reason}" under a gap in "What this closes for you". */
export function skimLine(moduleName: string, reason: string): string {
  return `Skim: ${moduleName}. ${reason}`.trim();
}

/** Verdict chip text for "The courses you mentioned". */
export const VERDICT_LABELS: Record<Verdict, string> = {
  "start-here": "Start here",
  later: "Later",
  skip: "Skip for now",
  "different-direction": "Different direction",
};

/** Shown on a mentioned course that isn't in the catalog. */
export const NOT_IN_LIST_NOTE = "Based on the name only. Not in Ascend's checked list.";

/** Shown on a mentioned catalog course when there's no AI verdict (rules path). */
export const NO_VERDICT_NOTE = "Facts from the catalog. No AI verdict this time.";

/** The confirm screen's mono line (without "// "). */
export function understandEngineLine(d: { engine: Engine; model?: string; words: number; reason?: string }): string {
  if (d.engine === "ai") return `Read by ${modelLabel(d.model)} from your ${count(d.words, "word", "words")}. Fix anything that's off.`;
  if (d.engine === "mock") return `${MOCK_LABEL}. Read from your ${count(d.words, "word", "words")} by keyword heuristics. Fix anything that's off.`;
  if (d.reason === "no-key") return "AI isn't set up here, so set these yourself. Everything else works the same.";
  return "The AI couldn't read this just now, so set these yourself. Everything else works the same.";
}

/** Skeleton line while /api/understand runs. */
export const UNDERSTAND_LOADING = "Reading what you wrote";

/** Skeleton line while /api/tailor runs. */
export const TAILOR_LOADING = "Tailoring each week to your job";

/** The plan's tailoring line (without "// "). */
export function tailorEngineLine(d: { engine: Engine; model?: string; reason?: string }): string {
  if (d.engine === "ai") return `Weekly tasks tailored to your job by ${modelLabel(d.model)}, checked by code`;
  if (d.engine === "mock") return `${MOCK_LABEL}. Weekly tasks built by keyword heuristics, checked by code`;
  if (d.reason === "no-key") return "AI isn't set up here. Weeks use Ascend's templates.";
  if (d.reason === "too-many-weeks") return "Plans this long use Ascend's templates for the weekly tasks.";
  return "The AI couldn't tailor this just now. Weeks use Ascend's templates.";
}

export type TaskTagText = "AI" | "MOCK AI" | "TEMPLATE";

/** The tiny tag next to "At work this week". */
export function taskTag(engine: Engine, tailored: boolean): TaskTagText {
  if (!tailored || engine === "rules") return "TEMPLATE";
  return engine === "mock" ? "MOCK AI" : "AI";
}

/**
 * A plan week's tag from where its task came from: the tailoring (plan.te),
 * the kept pick's own "use it at work" line (plan.e), or a template.
 */
export function weekTaskTag(
  plan: { e: Engine; te?: Engine },
  week: { source: "tailored" | "pick" | "template" },
): TaskTagText {
  if (week.source === "tailored") return taskTag(plan.te ?? "rules", true);
  if (week.source === "pick") return taskTag(plan.e, true);
  return "TEMPLATE";
}

/** The four AI jobs, for the landing "// 03 WHAT THE AI DOES" cards. */
export const AI_JOBS: { title: string; body: string }[] = [
  {
    title: "Reads your situation",
    body: "You describe where you are in your own words. The AI picks out your direction, starting point, what you already have and the gaps to close, quoting you.",
  },
  {
    title: "Matches modules to your gaps",
    body: "For every course that passes the rules, it maps real module names to your gaps, then chooses one and says why.",
  },
  {
    title: "Judges the courses you're circling",
    body: "Name the courses open in your tabs. It says start here, later, skip for now, or that one is a different direction.",
  },
  {
    title: "Tailors each week to your job",
    body: "Every week of your plan gets one task to do at work with that week's modules.",
  },
];

/** The line under the four AI cards. */
export const AI_JOBS_FOOTNOTE =
  "Code does the arithmetic and the checking: hours, weeks, prices, links, and every AI answer against the catalog.";

