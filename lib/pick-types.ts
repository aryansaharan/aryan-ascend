import type { Currency } from "./course-types";
import type { Funnel, RuledOut } from "./fit";
import type { Adjust, MentionStatus, PrefersFormat, ProfileV2, Strength } from "./profile";
import type { GapMatch, SkillId } from "./skills";

// Shapes shared by POST /api/pick, the rules engine, the verifier and the
// decision cache. Types only.

/**
 * Who produced an answer. "mock" is the dev-only stand-in for the model
 * (ASCEND_MOCK_AI=1, never in production); pages label it "MOCK AI (dev only)".
 */
export type Engine = "ai" | "rules" | "mock";

/** True for the model and its dev-only mock: an answer that went through the AI path and its checks. */
export function isAiEngine(e: Engine | undefined | null): e is "ai" | "mock" {
  return e === "ai" || e === "mock";
}

export type PickReason =
  | "no-key"
  | "one-candidate"
  | "no-candidates"
  | "ai-error"
  | "ai-timeout"
  | "ai-invalid";

export type HonestFit = "strong" | "ok" | "weak";

export type Alternate = { id: string; insteadIf: string };

/** One verifier check; passed false means the answer was fixed by code. */
export type Check = { name: string; passed: boolean; note?: string };

/** Where a candidate's gap coverage came from. */
export type CoverageSource = "ai" | "keywords" | "mock";

/**
 * One candidate's gaps matched to its in-scope modules. `gaps[].gap` indexes
 * PickResponse.gaps, `gaps[].modules` index the course's modules. `covered`
 * and `score` are computed by code (lib/skills.ts), never by the model.
 */
export type CandidateCoverage = {
  id: string;
  source: CoverageSource;
  gaps: GapMatch[];
  /** distinct gaps covered: "covers {covered} of your {gaps.length} gaps" */
  covered: number;
  /** weighted score: rank weights 1, 0.8, 0.6, 0.45, 0.35; direct 1, partial 0.5 */
  score: number;
};

/** A module of the pick they can go through quickly because of a strength. `module` indexes the pick's modules. */
export type Skim = { module: number; reason: string };

export const VERDICTS = ["start-here", "later", "skip", "different-direction"] as const;
export type Verdict = (typeof VERDICTS)[number];

/** The AI's verdict on one course they mentioned. `index` indexes profile.mentioned. */
export type MentionVerdict = { index: number; verdict: Verdict; reason: string };

/** Counted by code from the real request and the verified answer (the receipt line). */
export type Receipt = {
  /** words in the situation they wrote */
  words: number;
  /** ranked gaps the match used */
  gaps: number;
  /** distinct (course, module) pairs mapped to a gap across all candidates */
  modulesMapped: number;
  /** candidates the AI (or the rules) chose from */
  courses: number;
  /** course ids the model returned that weren't on the list, removed */
  invalidIdsRemoved: number;
  /** module indices the model returned that don't exist in scope, removed */
  invalidModulesRemoved: number;
  /** sentences removed because they stated a number with a unit */
  numbersRemoved: number;
};

/** What the model is shown for one candidate (addendum-ai, Job 2). No hours, weeks or prices. */
export type AiCandidateFacts = {
  id: string;
  title: string;
  provider: string;
  kind: string;
  format: string;
  role: "core" | "supporting";
  levelVsYou: "same" | "one step up" | "one step down";
  scope: "whole" | "first part only";
  certificate: "none" | "free" | "paid";
  cost: "free" | "paid" | "not listed";
  hasFreeStart: boolean;
  assumes: string;
  /** false when the course expects something they never mentioned (code checks `requires`) */
  assumesMet: boolean;
  /** what they never mentioned, e.g. ["Python"]; only when assumesMet is false */
  missing?: string[];
  bestFor: string;
  /** the modules in scope, indexed */
  modules: { i: number; name: string }[];
};

/** A course they mentioned, as the model sees it. Code facts are words, never numbers. */
export type AiMentionFacts = {
  i: number;
  text: string;
  status: MentionStatus;
  /** the matched catalog course, or null when it isn't in Ascend's checked list */
  catalogTitle: string | null;
  catalogId: string | null;
  /** "passed the rules", or why the rules left it out ("too long for their hours") */
  rules: string | null;
};

/** The whole prompt body sent to the model for /api/pick, as JSON. */
export type AiInput = {
  person: {
    role: string;
    situation: string;
    direction: string;
    startingPoint: string;
    budget: string;
  };
  gaps: { i: number; id: string; label: string }[];
  strengths: Strength[];
  mentioned: AiMentionFacts[];
  preferences: { wantsCertificate: boolean; prefersFormat: PrefersFormat };
  /** the course the keyword ranking put first */
  rulesTopId: string;
  /** a re-pick: what they were shown before (now off the list) and what they said about it */
  repick?: { note: string; shownBefore: { title: string; kind: string; format: string } | null };
  candidates: AiCandidateFacts[];
};

/** The model's structured answer before checks. */
export type AiOutput = {
  coverage: { id: string; gaps: { gap: number; modules: number[]; depth: string }[] }[];
  pickId: string;
  alternateIds: string[];
  whyThisOne: string;
  vsRules: string;
  skim: { module: number; reason: string }[];
  mentionedVerdicts: { index: number; verdict: string; reason: string }[];
  useItAtWork: string;
  honestFit: HonestFit;
  gapNote: string;
};

/** POST /api/pick response body (spec 5.5 plus addendum-ai Jobs 2 and 3). */
export type PickResponse = {
  engine: Engine;
  reason?: PickReason;
  pickId: string | null;
  alternates: Alternate[];
  whyThisOne: string;
  useItAtWork: string;
  honestFit: HonestFit;
  gapNote: string;
  checks: Check[];
  /** the rules engine's top candidate for the same inputs ("Rules alone would have picked") */
  rulesPickId: string | null;
  /** the ranked gaps that coverage indices refer to (profile.gaps at request time) */
  gaps: SkillId[];
  /** one entry per candidate considered, in rank order */
  coverage: CandidateCoverage[];
  /** why the AI's pick beats the rules' pick for this person; "" when they agree or the rules chose */
  vsRules: string;
  /** modules of the pick they can skim, at most 3 */
  skim: Skim[];
  /** verdicts on the courses they mentioned; empty on the rules path */
  mentionedVerdicts: MentionVerdict[];
  receipt: Receipt;
  /** what the model saw; present when an AI call was attempted */
  sent?: { candidateIds: string[]; input?: AiInput };
  /** the model's JSON before checks, when it parsed */
  raw?: unknown;
  /** model id, e.g. "claude-opus-5-5", or "mock" */
  model?: string;
  /** model call time in milliseconds */
  ms?: number;
};

/** How the decision on screen came to be; drives the engine line. */
export type DecisionOrigin = "pick" | "adjusted" | "swapped" | "repick";

export type Repick = { note: string; fromId: string | null; toId: string | null };

/** A PickResponse plus everything the pages need to render it again (spec 6.1). */
export type Decision = PickResponse & {
  /** djb2 of { profile, adjust, exclude, note, CATALOG_VERSION } */
  key: string;
  /** djb2 of { profile, CATALOG_VERSION }, for getLatestDecision(profile) */
  profileKey: string;
  origin: DecisionOrigin;
  funnel: Funnel;
  ruledOut: RuledOut[];
  adjust: Adjust;
  exclude: string[];
  /** the id in `exclude` that a Too basic / Too advanced chip added; it goes when that chip goes */
  levelExclude?: string;
  note?: string;
  repicks: Repick[];
  currency: Currency;
  chosenId?: string;
  commitAt?: string;
  /** on a swapped entry: the answer that was on screen before the first swap, so Reset can bring it back */
  beforeSwap?: PickResponse & { origin: DecisionOrigin };
  createdAt: string;
  updatedAt: string;
};

export type { ProfileV2 };
