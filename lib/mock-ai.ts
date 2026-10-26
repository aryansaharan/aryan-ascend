import type { MoveId } from "./course-types";
import { MOVES } from "./moves";
import type { AiInput, AiOutput } from "./pick-types";
import type { PrefersFormat } from "./profile";
import { coverageScore, coveredCount, keywordCoverage, keywordHit, skillsFor, type GapMatch } from "./skills";
import type { TailorAiInput } from "./tailor";
import type { TailorAiOutput } from "./verify-tailor";
import type { UnderstandAiOutput } from "./verify-understand";
import {
  cutWords,
  findMentions,
  firstSentence,
  guessMove,
  hoursFromText,
  wantsCertificateFromText,
} from "./understand";

// MOCK AI (dev only). Deterministic stand-ins for the three model calls,
// built from the request with keyword heuristics, so every AI state of the UI
// can be built and screenshotted without a key. Only reachable when
// ASCEND_MOCK_AI=1, NODE_ENV is not production and no key is set (see
// lib/ai-runtime.ts). Every answer goes through the same verifier as the
// model's, and every page labels it "MOCK AI (dev only)".

// Understand -------------------------------------------------------------------

function clauses(text: string): string[] {
  const out: string[] = [];
  for (const part of text.replace(/\s+/g, " ").split(/[.;!?]\s*|,\s*|\s+but\s+/i)) {
    const p = part.trim();
    if (!p) continue;
    if (p.length > 70) out.push(...p.split(/\s+and\s+(?=I\b|our\b|my\b)/i).map((x) => x.trim()).filter(Boolean));
    else out.push(p);
  }
  return out;
}

const NEGATED = /\b(never|haven't|have not|no experience|not yet|don't|do not)\b/i;

/** A clause about what they want, or were told to try: never a strength, often a gap. */
const INTENT =
  /\b(want|wants|wanted|would like|hoping|hope to|learn|move into|moving into|become|switch|get into|suggested|recommended|open in a tab|looking at|considering)\b/i;

const NEW_SUBJECT = /^(i|i'm|i've|i'd|my|our|we|someone|they)\b/i;

type Clause = { c: string; intent: boolean; negated: boolean };

/**
 * Clauses tagged by what they say. A clause that follows a "want" clause in
 * the same sentence without a new subject ("I want to move into data, with
 * SQL and dashboards") carries the want, so "SQL" reads as a gap there.
 */
function taggedClauses(text: string): Clause[] {
  const out: Clause[] = [];
  for (const sentence of text.replace(/\s+/g, " ").split(/(?<=[.!?;])\s+/)) {
    let carry = false;
    for (const c of clauses(sentence)) {
      const intent: boolean = INTENT.test(c) || (carry && !NEW_SUBJECT.test(c));
      carry = intent;
      out.push({ c, intent, negated: NEGATED.test(c) });
    }
  }
  return out;
}

const LEVEL_PATTERNS: Record<MoveId, { one: RegExp; two: RegExp }> = {
  "ai-build": {
    one: /called (an?|the) (llm |openai |ai )?api|built a (demo|prototype|chatbot)/i,
    two: /shipped (an? )?(llm|ai|gpt)|in production/i,
  },
  "ai-pm": { one: /written a spec|ran a pilot|run a pilot/i, two: /own an ai feature|ai feature in production/i },
  product: {
    one: /owned (a |the )?(feature|backlog)|product owner|associate product manager|\bapm\b/i,
    two: /(i've been|i am|i'm) a (pm|product manager)|product manager (at|for)/i,
  },
  data: {
    one: /(write|writes|writing) sql|sql (daily|every day)|can write a (sql )?join/i,
    two: /dashboards? (that )?(others|people|the team) (rely|use)/i,
  },
  ux: { one: /design (on the side|side projects)|some (design|research)/i, two: /designer at|design at work|(i'm|i am) a (ux|product|visual) designer/i },
  lead: { one: /lead projects|mentor|tech lead|engineering lead/i, two: /direct reports?|manage (a team|people|\d+)/i },
  growth: {
    one: /run(ning)? (channels|campaigns|ads|meta|google)|performance marketer|growth marketer/i,
    two: /own (a|the) growth (number|metric)|own (acquisition|retention)/i,
  },
  cloud: { one: /deployed|dockerfile/i, two: /run production|on-call|production infrastructure/i },
};

function mockBaseline(text: string, move: MoveId): { baseline: 0 | 1 | 2; evidence: string } {
  const p = LEVEL_PATTERNS[move];
  let best: { baseline: 0 | 1 | 2; evidence: string } = { baseline: 0, evidence: "" };
  for (const c of clauses(text)) {
    if (NEGATED.test(c)) {
      if (!best.evidence) best = { baseline: 0, evidence: c };
      continue;
    }
    if (p.two.test(c)) return { baseline: 2, evidence: c };
    if (p.one.test(c) && best.baseline < 1) best = { baseline: 1, evidence: c };
  }
  return best;
}

const STRENGTH_WORDS: { re: RegExp; label: string }[] = [
  { re: /\b(customer|clients?|support)\b/i, label: "Close to customers" },
  { re: /\bfeature requests?\b/i, label: "Customer requests" },
  { re: /\b(react|typescript|javascript|frontend|front-end)\b/i, label: "Frontend engineering" },
  { re: /\b(java|spring|backend|back-end|full stack)\b/i, label: "Backend engineering" },
  { re: /\b(excel|spreadsheets?)\b/i, label: "Spreadsheets" },
  { re: /\bbasic sql\b/i, label: "Basic SQL" },
  { re: /\bsql\b/i, label: "SQL" },
  { re: /\bpython\b/i, label: "Python" },
  { re: /\b(hris|hr generalist|human resources)\b/i, label: "People data" },
  { re: /\b(figma|visual designer|design work)\b/i, label: "Design work" },
  { re: /\b(ads|campaigns?)\b/i, label: "Running campaigns" },
  { re: /\b(teach|teacher|teaching)\b/i, label: "Explaining things" },
  { re: /\b(mentor|lead projects|engineering lead|tech lead)\b/i, label: "Leading people" },
  { re: /\banalyst\b/i, label: "Analysis" },
];

function mockStrengths(text: string): { label: string; quote: string }[] {
  const out: { label: string; quote: string }[] = [];
  for (const { c, intent, negated } of taggedClauses(text)) {
    if (negated || intent) continue;
    const hit = STRENGTH_WORDS.find((s) => s.re.test(c) && !out.some((o) => o.label === s.label));
    if (hit) out.push({ label: hit.label, quote: cutWords(c, 120) });
    if (out.length >= 3) break;
  }
  return out;
}

const DEFAULT_GAPS: Record<MoveId, string[]> = {
  "ai-build": ["llm-apis", "prompting", "evals", "rag", "agents", "shipping-ai"],
  "ai-pm": ["llm-basics", "ai-use-cases", "ai-specs", "ai-evals", "ai-metrics"],
  product: ["discovery", "user-research", "prioritization", "specs", "metrics"],
  data: ["sql", "spreadsheets", "dashboards", "storytelling", "statistics"],
  ux: ["ux-process", "ux-research", "wireframing", "prototyping", "usability-testing"],
  lead: ["one-on-ones", "feedback", "delegation", "team-planning", "conflict"],
  growth: ["funnels", "growth-experiments", "retention", "acquisition", "activation"],
  cloud: ["containers", "ci-cd", "cloud-basics", "iac", "kubernetes"],
};

function mockGaps(text: string, move: MoveId, strengthQuotes: string[]): { id: string; reason: string }[] {
  const skills = skillsFor(move);
  // What they want or said they lack ranks first; strengths never become gaps.
  const wanted = taggedClauses(text)
    .filter((x) => x.intent || x.negated)
    .map((x) => x.c)
    .join(". ");
  const said = (kw: string) => keywordHit(wanted, kw);
  const owned = (kw: string) => strengthQuotes.some((q) => keywordHit(q, kw));
  const ranked = DEFAULT_GAPS[move]
    .map((id, i) => ({ id, i, skill: skills.find((s) => s.id === id) }))
    .filter((x) => x.skill && !x.skill.keywords.some(owned))
    .map((x) => ({ ...x, boost: x.skill?.keywords.some(said) ? -10 : 0 }))
    .sort((a, b) => a.boost + a.i - (b.boost + b.i));
  // Order-free reasons: the user can reorder gaps on the check screen.
  const generic = [
    "A core skill in this direction, and not yet in what you wrote.",
    "Most courses in this direction build on it.",
    "Useful once you are working in this direction.",
  ];
  return ranked.slice(0, 3).map((x, rank) => {
    const kw = x.skill?.keywords.find(said);
    return {
      id: x.id,
      reason: kw ? `You mentioned ${lowerFirst(x.skill?.label ?? kw)} in what you wrote.` : generic[rank],
    };
  });
}

function mockFormat(text: string): PrefersFormat {
  if (/\b(hands-on|by doing|learn by building|side projects?)\b/i.test(text)) return "hands-on";
  if (/\b(read|reading|books?)\b/i.test(text) && !/\bbook(ed)? (a|my) /i.test(text)) return "reading";
  if (/\bvideos?\b/i.test(text)) return "video";
  if (/\b(cohort|deadlines|live class|with a group)\b/i.test(text)) return "cohort";
  return "any";
}

/** MOCK AI (dev only): an understand answer from keyword heuristics. */
export function mockUnderstandOutput(situation: string, moves: readonly MoveId[]): UnderstandAiOutput {
  const move = guessMove(situation, moves);
  const strengths = mockStrengths(situation);
  const base = move ? mockBaseline(situation, move) : { baseline: 0 as const, evidence: "" };
  const intent = situation
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .find((s) => /\b(want|move into|become|switch|learn|get into)\b/i.test(s));
  return {
    role: firstSentence(situation, 80),
    move: move ?? "none",
    moveWhy: move && intent ? `You wrote "${cutWords(intent.replace(/[.!?]+$/, ""), 150)}".` : "",
    baseline: String(base.baseline),
    baselineEvidence: base.evidence,
    strengths,
    gaps: move ? mockGaps(situation, move, strengths.map((s) => s.quote)) : [],
    mentioned: findMentions(situation).map((m) => ({ text: m.text, courseId: m.courseId ?? "none", status: m.status })),
    wantsCertificate: wantsCertificateFromText(situation),
    prefersFormat: mockFormat(situation),
    hoursMentioned: hoursFromText(situation),
  };
}

// Pick -----------------------------------------------------------------------------

/** "Problem discovery" to "problem discovery", leaving "SQL" and "CI/CD pipelines" alone. */
function lowerFirst(label: string): string {
  return label.replace(/^[A-Z][a-z]/, (m) => m.toLowerCase());
}

function roleNoun(role: string): string {
  const head = role.split(/,| at | who /i)[0].trim();
  const noun = cutWords(head, 40)
    .split(" ")
    .map(lowerFirst)
    .join(" ");
  const first = noun.split(" ")[0] ?? "";
  const acronym = /^[A-Z]{2,}/.test(first);
  const vowelSound = acronym ? /^[AEFHILMNORSX]/.test(first) : /^[aeiou]/i.test(first);
  return vowelSound ? `an ${noun}` : `a ${noun}`;
}

function coverageOf(c: AiInput["candidates"][number], gapIds: string[]): GapMatch[] {
  return keywordCoverage({ modules: c.modules.map((m) => ({ name: m.name, hours: 0 })) }, gapIds);
}

type NoteWish = "doing" | "reading" | "shorter" | "cheaper" | null;

/** What a re-pick note asks for, read by keywords. */
function noteWish(note: string): NoteWish {
  const n = note.toLowerCase();
  if (/\b(build|building|hands[- ]?on|practi[cs]e|project|projects|exercises?|by doing)\b/.test(n)) return "doing";
  if (/\b(read|reading|books?)\b/.test(n)) return "reading";
  if (/\b(short|shorter|quick|quicker|faster|less time)\b/.test(n)) return "shorter";
  if (/\b(cheap|cheaper|free|cost|price|money)\b/.test(n)) return "cheaper";
  return null;
}

/** 0 when the candidate answers the note, 1 when it doesn't. */
function noteFit(c: AiInput["candidates"][number], wish: NoteWish): number {
  switch (wish) {
    case "doing":
      return c.kind === "practice" || c.kind === "course" || c.kind === "program" ? 0 : 1;
    case "reading":
      return c.kind === "book" || c.kind === "docs" ? 0 : 1;
    case "shorter":
      return c.scope === "whole" ? 0 : 1;
    case "cheaper":
      return c.cost === "free" || c.hasFreeStart ? 0 : 1;
    default:
      return 0;
  }
}

const KIND_PHRASE: Record<string, string> = {
  practice: "hands-on practice",
  course: "a course with exercises",
  program: "a program with graded work",
  docs: "a guide you work through",
  book: "a book you read at your own pace",
};

function shortTitle(title: string): string {
  return title.split(":")[0].trim();
}

/**
 * MOCK AI (dev only): a pick answer from keyword coverage. It picks the
 * candidate that closes the first gap best, then covers most; on a tie it
 * prefers one at the person's own level that is NOT the rules' top pick, so
 * the "Rules alone would have picked" state can be built. It never picks a
 * course that covers less than the rules' choice, so it agrees with the rules
 * when theirs is best, with two exceptions that a reader would make too: when
 * the rules' choice assumes something they never mentioned (assumesMet
 * false) and another course doesn't, and on a re-pick, where the note comes
 * first.
 */
export function mockPickOutput(input: AiInput): AiOutput {
  const gapIds = input.gaps.map((g) => g.id);
  const scored = input.candidates.map((c, rank) => {
    const cov = coverageOf(c, gapIds);
    const first = cov.find((m) => m.gap === 0);
    const firstGap = first ? (first.depth === "direct" ? 0 : 1) : 2;
    return { c, rank, cov, firstGap, score: coverageScore(cov), covered: coveredCount(cov) };
  });
  type Scored = (typeof scored)[number];
  const byCoverage = (a: Scored, b: Scored) => a.firstGap - b.firstGap || b.score - a.score || a.rank - b.rank;
  const others = scored.filter((s) => s.c.id !== input.rulesTopId);
  const top = scored.find((s) => s.c.id === input.rulesTopId) ?? scored[0];
  const move = Object.values(MOVES).find((m) => m.label === input.person.direction);
  const startingOut = move ? move.anchors.indexOf(input.person.startingPoint) === 0 : false;
  // A challenger must be startable: nothing assumed they never mentioned, and
  // never a step up for someone at the first starting point.
  const startable = (x: Scored) => x.c.assumesMet !== false && !(startingOut && x.c.levelVsYou === "one step up");
  const pool = others.filter(startable);
  const challenger = pool.length > 0 ? [...pool].sort(byCoverage)[0] : null;
  // Strictly better coverage wins; on a tie only a course at their own level
  // may replace the rules' choice (never a step up for someone starting out).
  const better = (a: Scored, b: Scored) => a.firstGap < b.firstGap || (a.firstGap === b.firstGap && a.score > b.score);
  const tied = (a: Scored, b: Scored) => a.firstGap === b.firstGap && a.score === b.score;
  const topUnmet = top.c.assumesMet === false && challenger !== null;
  const wish = input.repick ? noteWish(input.repick.note) : null;
  let pick: Scored;
  let answersNote = true;
  if (input.repick) {
    // the note comes first, then startable, then coverage
    const ranked = [...scored].sort(
      (a, b) =>
        noteFit(a.c, wish) - noteFit(b.c, wish) ||
        Number(!startable(a)) - Number(!startable(b)) ||
        byCoverage(a, b),
    );
    pick = ranked[0];
    answersNote = noteFit(pick.c, wish) === 0;
  } else if (topUnmet && challenger) {
    pick = challenger;
  } else {
    pick =
      challenger && (better(challenger, top) || (tied(challenger, top) && challenger.c.levelVsYou === "same")) ? challenger : top;
  }
  const alternates = [top, ...[...others].filter((s) => s.c.id !== pick.c.id).sort(byCoverage)]
    .filter((s) => s.c.id !== pick.c.id)
    .slice(0, 2)
    .map((s) => s.c.id);

  const firstCovered = [...pick.cov].sort((a, b) => a.gap - b.gap)[0];
  const gapLabel = lowerFirst((firstCovered ? input.gaps[firstCovered.gap]?.label : input.gaps[0]?.label) ?? "");
  const moduleName = firstCovered ? pick.c.modules[firstCovered.modules[0]]?.name : undefined;
  const strength = input.strengths[0];
  const why1 =
    moduleName && gapLabel
      ? `“${moduleName}” works on ${gapLabel}, the first gap it closes for you.`
      : `It is the closest match to what you wrote about your work.`;
  const missing = pick.c.missing ?? [];
  const why2 =
    pick.c.assumesMet === false && missing.length
      ? `Before you start, it expects ${missing.join(" and ")}, which you didn't mention.`
      : strength
        ? `It builds on what you said: “${cutWords(strength.quote, 70)}”.`
        : "It starts from where you said you are.";
  const note = input.repick ? cutWords(input.repick.note, 60) : "";
  const before = input.repick?.shownBefore;
  const kindLine = `It is ${KIND_PHRASE[pick.c.kind] ?? "a different kind of course"}${
    before && before.kind !== pick.c.kind && KIND_PHRASE[before.kind] ? `, not ${KIND_PHRASE[before.kind]}` : ""
  }`;
  const wishLine: Record<Exclude<NoteWish, null>, string> = {
    doing: kindLine,
    reading: kindLine,
    shorter: "You can finish all of it at your hours",
    cheaper: pick.c.cost === "free" ? "It is free" : "It is free to start",
  };
  const whyNote = !input.repick
    ? ""
    : answersNote && wish
      ? `${wishLine[wish]}, which answers “${note}”.`
      : `Nothing left on the list fully answers “${note}”, so this is the closest.`;

  const notOnTop = pick.cov.find((m) => !top.cov.some((t) => t.gap === m.gap));
  const topMissing = top.c.missing ?? [];
  const vsRules =
    pick.c.id === input.rulesTopId
      ? ""
      : top.c.assumesMet === false && topMissing.length && pick.c.assumesMet !== false
        ? `${shortTitle(top.c.title)} assumes ${topMissing.join(" and ")}, which you didn't mention; this one starts from where you are.`
        : notOnTop
          ? `It has modules on ${lowerFirst(input.gaps[notOnTop.gap]?.label ?? "your gaps")}, which the rules' first choice doesn't cover by name.`
          : pick.score > top.score
            ? "It covers more of your gaps by module name."
            : `It reads closer to what you wrote about your work as ${roleNoun(input.person.role)}.`;

  const skim: AiOutput["skim"] = [];
  if (strength) {
    const words = (strength.quote.toLowerCase().match(/[a-z]{5,}/g) ?? []).filter(
      (w) => !["about", "their", "which", "would", "there", "years"].includes(w),
    );
    // never a module that closes one of their gaps
    const closes = new Set(pick.cov.flatMap((g) => g.modules));
    const open = pick.c.modules.filter((m) => !closes.has(m.i));
    const hit = open.find((m) => words.some((w) => keywordHit(m.name, w)));
    const intro = open.find((m) => /introduction|welcome|overview|get(ting)? started/i.test(m.name));
    const target = hit ?? intro;
    if (target) skim.push({ module: target.i, reason: `Overlaps with what you already have: ${lowerFirst(strength.label)}.` });
  }

  const verdicts: AiOutput["mentionedVerdicts"] = input.mentioned.map((m) => {
    if (/project management/i.test(m.text) && input.person.direction === MOVES.product.label) {
      return {
        index: m.i,
        verdict: "different-direction",
        reason: "Project management is a different job from product management. It runs plans; product decides what to build.",
      };
    }
    if (m.catalogId && m.catalogId === pick.c.id) {
      return { index: m.i, verdict: "start-here", reason: "It is the course picked for you, so start here." };
    }
    if (m.catalogId && input.candidates.some((c) => c.id === m.catalogId)) {
      return { index: m.i, verdict: "later", reason: "It fits your answers, but the pick covers your first gap more directly." };
    }
    if (m.catalogId) {
      const why = (m.rules ?? "it doesn't fit your answers").replace(/\btheir\b/g, "your").replace(/\bthey\b/g, "you");
      return { index: m.i, verdict: "skip", reason: `Skip it for now: ${why}.` };
    }
    return { index: m.i, verdict: "later", reason: "From its name it fits this direction, but Ascend hasn't checked it." };
  });

  return {
    coverage: scored.map((s) => ({ id: s.c.id, gaps: s.cov.map((g) => ({ ...g })) })),
    pickId: pick.c.id,
    alternateIds: alternates,
    whyThisOne: input.repick ? `${whyNote} ${why1}` : `${why1} ${why2}`,
    vsRules,
    skim,
    mentionedVerdicts: verdicts,
    useItAtWork: `Pick one task from your week as ${roleNoun(input.person.role)} and try the first module's idea on it.`,
    honestFit: pick.covered >= 2 ? "strong" : pick.covered === 1 ? "ok" : "weak",
    gapNote:
      pick.covered === 0 && input.gaps[0]
        ? `Nothing on the list covers ${lowerFirst(input.gaps[0].label)} by module name yet.`
        : "",
  };
}

// Tailor ---------------------------------------------------------------------------

/** MOCK AI (dev only): one task per week built from that week's module names and the role. */
export function mockTailorOutput(input: TailorAiInput): TailorAiOutput {
  const who = roleNoun(input.person.role);
  const gap = lowerFirst(input.gaps[0] ?? "this direction");
  const weeks = input.weeks.map((w) => {
    const name = w.modules.find((m) => !w.skim.includes(m)) ?? w.modules[0] ?? "";
    const m = name && name.length <= 70 ? `“${name}”` : "this week's module";
    const k = w.k;
    const task =
      k % 4 === 1
        ? `Use ${m} on one real case from your work as ${who}, and write down one thing you would change.`
        : k % 4 === 2
          ? `Take one problem from your week where ${gap} would help, and work through it with ${m}.`
          : k % 4 === 3
            ? `Write five lines for your team on what ${m} changes about how you work.`
            : `Show one colleague what you tried from ${m} and note their first question.`;
    return { k, task };
  });
  const artifact = `${input.artifactTemplate.replace(/\.$/, "")}, built from your own work as ${who}.`;
  return { weeks, artifact };
}
