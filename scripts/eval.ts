// Persona eval and unit checks (spec 6.7, addendum-ai). Run with `npm run eval`.
//
// Rules engine assertions run for every persona in scripts/personas.json, with
// no chips and with each adjust chip, including keyword coverage of the ranked
// gaps. Unit checks cover the skill vocabulary, the week builder, cost at
// pace, plan links (compressed and not), the .ics file, the three verifiers
// (understand, pick, tailor), the rules reading of a situation, the dev-only
// mock, and every AI fallback (simulated with ASCEND_TEST_AI, no key needed).
// Course ids are never hardcoded: the catalog can be swapped. If ANTHROPIC_API_KEY is
// set, every persona also goes through the real model (understand, pick,
// tailor), 6 seconds apart. Writes scripts/eval-results.json and prints the
// pass rate.

import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { JOB_RUN } from "../lib/landing-run";
import { MODEL, structuredCall } from "../lib/ai";
import { courseById } from "../lib/catalog";
import { COURSES, CATALOG_VERSION } from "../lib/courses";
import { COURSE_SOURCES } from "../lib/course-sources";
import { outlineHash, totalHours, type Course } from "../lib/course-types";
import { adjustPick, mentionMatchesCourse, rulesDecision, swapPick, usefulAlternates } from "../lib/decide-rules";
import { adjustDecision, decisionKey, isAiFailedFallback, makeDecision, saveDecision, shouldRetryAi, swapDecision } from "../lib/decision-store";
import { EXAMPLES, exampleFor } from "../lib/examples";
import {
  checkCourse,
  costAtPaceFor,
  effectiveHours,
  fit,
  funnelLine,
  MAX_CANDIDATES,
  planN,
  relaxations,
  scopeFor,
  scopeLabel,
  scopeOfPrefix,
  weeksAt,
  type FitResult,
} from "../lib/fit";
import { approxMoney, budgetCap, budgetLabel, costLine, durationPhrase, formatMoney, modelLabel, roundApprox } from "../lib/format";
import { BUDGET_LIMIT, USD_INR, budgetLimitInr, convert, toUSD } from "../lib/fx";
import { buildIcs } from "../lib/ics";
import { decodeLegacyPlan, legacyToV2 } from "../lib/legacy";
import { mockPickOutput, mockTailorOutput, mockUnderstandOutput } from "../lib/mock-ai";
import { availableMoves, isAvailableMove, MIN_ENTRIES, MOVES, entriesFor } from "../lib/moves";
import { SYSTEM, aiDecide, buildAiInput, clearPickCache, pickOutputSchema } from "../lib/pick-ai";
import type { PickResponse } from "../lib/pick-types";
import { buildWeeks } from "../lib/plan-build";
import {
  createPlan,
  decodePlan,
  decodePlanSync,
  encodePlan,
  encodePlanUncompressed,
  MAX_LINK_CHARS,
  readPlanHash,
  reschedule,
  toPlanPayload,
} from "../lib/plan-store";
import { backupSlot, defaultSlot, inBookingWindow } from "../lib/booking";
import {
  HOURS,
  NO_ADJUST,
  budgetStepDown,
  countWords,
  defaultAdjust,
  normalizeAdjust,
  normalizeProfile,
  toggleChip,
  toProfileV2,
  type Adjust,
  type Budget,
  type FitProfile,
  type ProfileV2,
} from "../lib/profile";
import { profileV2Schema, tailorBodySchema, understandBodySchema } from "../lib/request-schemas";
import {
  ALL_SKILLS,
  ALL_SKILL_IDS,
  coverageScore,
  coveredCount,
  keywordCoverage,
  modulesMapped,
  skillLabel,
  skillsFor,
  type SkillId,
} from "../lib/skills";
import { buildTailorInput, tailorWeeks } from "../lib/tailor";
import { TAILOR_SYSTEM, clearTailorCache, tailorOutputSchema, tailorPlan } from "../lib/tailor-ai";
import {
  engineLine,
  askSomeoneMessage,
  atWorkTemplate,
  firstStep,
  MOVE_PHRASES,
  planOpener,
  readBackLine,
  receiptLines,
  roleNoun,
  rulesAloneLine,
  weekTaskTag,
  whyThisOneTemplate,
} from "../lib/templates";
import {
  findMentions,
  guessMove,
  hoursFromText,
  isVerbatim,
  profileFromUnderstanding,
  rulesUnderstanding,
  type Understanding,
} from "../lib/understand";
import {
  UNDERSTAND_SYSTEM,
  buildUnderstandInput,
  clearUnderstandCache,
  understandOutputSchema,
  understandSituation,
} from "../lib/understand-ai";
import { NUMBER_UNIT_RE, cleanProse, cutToCap, hasHype, sentences, verify } from "../lib/verify";
import { verifyTailoring } from "../lib/verify-tailor";
import { verifyUnderstanding } from "../lib/verify-understand";
import { guardRequest } from "../lib/api-guard";
import { pickBodySchema } from "../lib/request-schemas";
import { restartFrom, shortenTask } from "../lib/plan-store";
import { catalogDataProblems } from "./catalog-rules";

type Persona = { id: string; label: string; expectedMove: ProfileV2["move"]; profile: ProfileV2 };
type Result = { section: string; name: string; pass: boolean; detail?: string };

const NOW = new Date();
const DASH = /[—–]/;
const results: Result[] = [];

function check(section: string, name: string, pass: boolean, detail?: string): boolean {
  results.push({ section, name, pass, ...(detail ? { detail } : {}) });
  return pass;
}

function eq<T>(section: string, name: string, actual: T, expected: T): boolean {
  const pass = JSON.stringify(actual) === JSON.stringify(expected);
  return check(section, name, pass, pass ? undefined : `got ${JSON.stringify(actual)}, want ${JSON.stringify(expected)}`);
}

const personas: Persona[] = (
  JSON.parse(readFileSync(resolve(process.cwd(), "scripts/personas.json"), "utf8")) as Persona[]
).map((p) => ({ ...p, profile: normalizeProfile(p.profile) }));

function persona(id: string): ProfileV2 {
  const p = personas.find((x) => x.id === id);
  if (!p) throw new Error(`persona ${id} missing`);
  return p.profile;
}

/** A persona whose move ships and that has at least `n` candidates (no chips). */
function personaWith(n: number): ProfileV2 {
  const p = personas.find((x) => isAvailableMove(x.profile.move) && fit(x.profile, NO_ADJUST, { now: NOW }).candidates.length >= n);
  if (!p) throw new Error(`no persona with ${n} candidates`);
  return p.profile;
}

function section(name: string, fn: () => void) {
  try {
    fn();
  } catch (err) {
    check(name, "threw", false, String(err));
  }
}

async function sectionAsync(name: string, fn: () => Promise<void>) {
  try {
    await fn();
  } catch (err) {
    check(name, "threw", false, String(err));
  }
}

async function withEnv<T>(vars: Record<string, string | undefined>, fn: () => Promise<T>): Promise<T> {
  const prev: Record<string, string | undefined> = {};
  for (const k of Object.keys(vars)) {
    prev[k] = process.env[k];
    if (vars[k] === undefined) delete process.env[k];
    else process.env[k] = vars[k];
  }
  const quiet = console.error;
  console.error = () => {};
  try {
    return await fn();
  } finally {
    console.error = quiet;
    for (const k of Object.keys(vars)) {
      if (prev[k] === undefined) delete process.env[k];
      else process.env[k] = prev[k];
    }
  }
}

const HAS_KEY = Boolean(process.env.ANTHROPIC_API_KEY);

// Rules engine ---------------------------------------------------------------------

const CHIP_VARIANTS: { name: string; adjust: Adjust }[] = [
  { name: "no chips", adjust: NO_ADJUST },
  { name: "Shorter", adjust: { ...NO_ADJUST, shorter: true } },
  { name: "Cheaper", adjust: { ...NO_ADJUST, cheaper: true } },
  { name: "With a certificate", adjust: { ...NO_ADJUST, certificate: true } },
  { name: "Too basic", adjust: { ...NO_ADJUST, baselineShift: 1 } },
  { name: "Too advanced", adjust: { ...NO_ADJUST, baselineShift: -1 } },
];

function assertDecision(
  persona: Persona,
  variant: string,
  adjust: Adjust,
  result: FitResult,
  decision: PickResponse,
): void {
  const s = `rules:${persona.id}`;
  const p = persona.profile;
  const tag = `[${variant}]`;
  const lim = result.limits;
  const ids = new Set(result.candidates.map((c) => c.id));

  const f = result.funnel;
  const chain = [
    f.checked,
    f.inMove,
    f.atLevel,
    ...(f.current !== undefined ? [f.current] : []),
    f.withinBudget,
    ...(f.withCertificate !== undefined ? [f.withCertificate] : []),
    f.finishable,
  ];
  check(s, `${tag} funnel only narrows`, chain.every((n, i) => i === 0 || n <= chain[i - 1]), chain.join(" > "));
  check(s, `${tag} candidates are the top of the finishable set (at most ${MAX_CANDIDATES})`, result.candidates.length <= Math.min(MAX_CANDIDATES, f.finishable));
  if (f.withCertificate !== undefined) {
    check(
      s,
      `${tag} within budget minus with a certificate is the no-certificate count`,
      f.withinBudget - f.withCertificate === result.ruledOut.filter((r) => r.reason === "no_certificate").length,
    );
  }
  // a free budget's "to finish" amount is the whole course at their pace
  for (const r of result.ruledOut.filter((x) => x.reason === "over_budget" && lim.budget === "free")) {
    const c = courseById(r.id) as Course;
    const whole = costAtPaceFor(c, weeksAt(totalHours(c), lim.hoursPerWeek));
    const amount = whole ? formatMoney(whole.amount >= 100 ? Math.round(whole.amount) : whole.amount, whole.currency) : "";
    if (whole?.currency === "INR") check(s, `${tag} ${r.id} free-budget line shows the whole-course cost`, r.text.includes(amount), r.text);
  }

  const shown = [decision.pickId, ...decision.alternates.map((a) => a.id)].filter(
    (x): x is string => typeof x === "string",
  );
  for (const id of shown) {
    const c = courseById(id) as Course;
    const cand = result.candidates.find((x) => x.id === id);
    const entry = c.moves.find((m) => m.move === p.move);
    check(s, `${tag} ${id} is in the move`, Boolean(entry));
    check(
      s,
      `${tag} ${id} is in the level window`,
      Boolean(entry) && Math.abs((entry?.baseline ?? 9) - lim.baseline) <= 1,
    );
    check(s, `${tag} ${id} is a candidate`, Boolean(cand));
    if (!cand) continue;
    check(s, `${tag} ${id} weeks <= capWeeks`, cand.weeks <= lim.capWeeks, `${cand.weeks} vs ${lim.capWeeks}`);
    if (lim.budget === "free") {
      check(
        s,
        `${tag} ${id} costs exactly 0 on a free budget`,
        c.cost?.model === "free" && cand.costAtPace?.inr === 0,
      );
    } else if (lim.budget !== "any") {
      check(
        s,
        `${tag} ${id} cost at pace within budget`,
        cand.costAtPace !== null && cand.costAtPace.inr <= budgetLimitInr(lim.budget, "INR"),
        `${cand.costAtPace?.inr}`,
      );
    }
    if (adjust.certificate) check(s, `${tag} ${id} has a certificate`, c.certificate !== "none");
    if (p.move === "ai-build" || p.move === "ai-pm") {
      check(s, `${tag} ${id} is current`, c.updatedYear >= 2024);
    }
  }
  const altIds = decision.alternates.map((a) => a.id);
  check(
    s,
    `${tag} alternates are distinct, not the pick, and candidates`,
    new Set(altIds).size === altIds.length &&
      !altIds.includes(decision.pickId ?? "") &&
      altIds.every((id) => ids.has(id)),
  );
  check(s, `${tag} at most 2 alternates`, altIds.length <= 2);
  check(
    s,
    `${tag} alternates fill when candidates allow`,
    altIds.length === Math.min(2, Math.max(0, result.candidates.length - 1)),
  );
  check(
    s,
    `${tag} every ruled-out entry has text, no dashes`,
    result.ruledOut.every((r) => r.text.trim().length > 0 && !DASH.test(r.text) && !r.text.includes("!")),
  );
  check(
    s,
    `${tag} code text has no dashes or exclamation marks`,
    [decision.whyThisOne, decision.useItAtWork, ...decision.alternates.map((a) => a.insteadIf)].every(
      (t) => !DASH.test(t) && !t.includes("!"),
    ),
  );
  // keyword coverage: one entry per candidate, real indices, and it ranks
  const nGaps = p.gaps.length;
  check(
    s,
    `${tag} coverage covers every candidate, from keywords`,
    decision.coverage.length === result.candidates.length &&
      decision.coverage.every((c, i) => c.id === result.candidates[i].id && c.source === "keywords"),
  );
  check(
    s,
    `${tag} coverage indices are real`,
    result.candidates.every((c) =>
      c.coverage.every((g) => g.gap >= 0 && g.gap < nGaps && g.modules.length > 0 && g.modules.every((m) => m >= 0 && m < c.moduleCount)),
    ),
  );
  // coverage of the top gaps ranks right after role and scope: first gap (direct, partial, none), then the weighted score
  const firstGap = (c: (typeof result.candidates)[number]) => {
    const m = c.coverage.find((g) => g.gap === 0 && g.modules.length > 0);
    return m ? (m.depth === "direct" ? 0 : 1) : 2;
  };
  let ordered = true;
  for (let i = 1; i < result.candidates.length; i++) {
    const a = result.candidates[i - 1];
    const b = result.candidates[i];
    if (a.role !== b.role || a.scope !== b.scope) continue;
    if (firstGap(b) < firstGap(a)) ordered = false;
    if (firstGap(b) === firstGap(a) && b.coverageScore > a.coverageScore) ordered = false;
  }
  check(s, `${tag} coverage ranks right after role and scope`, ordered);
  check(s, `${tag} receipt counts match`, decision.receipt.courses === result.candidates.length && decision.receipt.words === countWords(p.situation) && decision.receipt.gaps === nGaps);
  check(s, `${tag} rules path has no verdicts, skim or comparison`, decision.mentionedVerdicts.length === 0 && decision.skim.length === 0 && decision.vsRules === "");
  if (decision.pickId === null) {
    check(s, `${tag} empty state has a reason`, decision.reason === "no-candidates");
  } else {
    check(s, `${tag} pick is the top candidate`, decision.pickId === result.candidates[0]?.id && decision.rulesPickId === decision.pickId);
  }
}

for (const persona of personas) {
  const p = persona.profile;
  const hidden = !isAvailableMove(p.move);
  for (const v of CHIP_VARIANTS) {
    const result = fit(p, v.adjust, { now: NOW, currency: "INR" });
    const decision = rulesDecision(p, v.adjust, [], { now: NOW, fit: result });
    assertDecision(persona, v.name, v.adjust, result, decision);
    if (v.adjust.cheaper) {
      eq(`rules:${persona.id}`, "[Cheaper] steps the budget down", result.limits.budget, budgetStepDown(p.budget));
    }
    if (v.adjust.shorter) {
      eq(
        `rules:${persona.id}`,
        "[Shorter] caps at 4 weeks (6 at 1 hr)",
        result.limits.capWeeks,
        p.hoursPerWeek === 1 ? 6 : 4,
      );
    }
  }
  const base = fit(p, NO_ADJUST, { now: NOW });
  if (base.candidates.length === 0) {
    const relax = relaxations(p, NO_ADJUST, { now: NOW });
    check(
      `rules:${persona.id}`,
      "empty state offers a relaxation or a closest course",
      hidden || relax.length > 0 || base.ruledOut.length > 0,
      relax.map((r) => r.text).join(" | "),
    );
  }
  const d0 = rulesDecision(p, NO_ADJUST, [], { now: NOW });
  if (d0.pickId) {
    const d1 = rulesDecision(p, NO_ADJUST, [d0.pickId], { now: NOW });
    check(`rules:${persona.id}`, "excluded pick never comes back", d1.pickId !== d0.pickId && !d1.alternates.some((a) => a.id === d0.pickId));
  }
  if (hidden) {
    check(`rules:${persona.id}`, `move ${p.move} is hidden (under ${MIN_ENTRIES} entries)`, entriesFor(p.move).length < MIN_ENTRIES);
  }
  check(`rules:${persona.id}`, "persona profile passes the server schema", profileV2Schema.safeParse(p).success || hidden);
}

// Catalog ----------------------------------------------------------------------------

{
  const s = "catalog";
  check(s, "no entry has totalHours 0", COURSES.every((c) => totalHours(c) > 0), COURSES.filter((c) => totalHours(c) <= 0).map((c) => c.id).join(", "));
  check(s, "every entry has a module, a source and a date", COURSES.every((c) => c.modules.length > 0 && (COURSE_SOURCES[c.id]?.length ?? 0) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(c.lastVerified)));
  check(s, "sources stay out of the catalog pages ship", COURSES.every((c) => !("sources" in c)) && Object.keys(COURSE_SOURCES).length === COURSES.length);
  check(s, "ids are unique", new Set(COURSES.map((c) => c.id)).size === COURSES.length);
  check(s, "paid costs carry amount and currency", COURSES.every((c) => !c.cost || c.cost.model === "free" || (c.cost.amount > 0 && Boolean(c.cost.currency))));
  check(s, "CATALOG_VERSION is the newest lastVerified", COURSES.every((c) => c.lastVerified <= CATALOG_VERSION));
  const shipped = availableMoves().map((m) => m.id);
  check(s, "must-ship moves pass MIN_ENTRIES", ["ai-build", "product", "data"].every((m) => shipped.includes(m as ProfileV2["move"])), shipped.join(", "));
  check(s, "no NextLeap entry", COURSES.every((c) => !/nextleap/i.test(`${c.title} ${c.provider} ${c.url}`)));
  check(s, "no dashes in catalog text", COURSES.every((c) => !DASH.test(JSON.stringify(c))));
  for (const e of EXAMPLES) {
    const u = rulesUnderstanding(e.situation);
    const prof = profileFromUnderstanding({ situation: e.situation, understanding: u, engine: "rules", hoursPerWeek: e.hoursPerWeek, budget: e.budget });
    check(s, `example "${e.label}" reaches a profile on the rules path`, prof !== null, `move ${u.move}`);
    if (prof) {
      const r = fit(prof, undefined, { now: NOW });
      check(s, `example "${e.label}" reaches a pick or a relaxation`, r.candidates.length > 0 || relaxations(prof, undefined, { now: NOW }).length > 0, `${r.candidates.length} candidates`);
      check(s, `example "${e.label}" is recognised by exampleFor`, exampleFor(prof)?.id === e.id);
    }
  }
}

// Units ------------------------------------------------------------------------------

section("unit:skills", () => {
  const s = "unit:skills";
  for (const m of availableMoves()) {
    const list = skillsFor(m.id);
    check(s, `${m.id} has 8 to 10 skills`, list.length >= 8 && list.length <= 10, String(list.length));
  }
  check(s, "skill ids are unique across moves", new Set(ALL_SKILLS.map((x) => x.id)).size === ALL_SKILLS.length);
  check(
    s,
    "every skill has 3 to 8 lowercase keywords",
    ALL_SKILLS.every((x) => x.keywords.length >= 3 && x.keywords.length <= 8 && x.keywords.every((k) => k === k.toLowerCase())),
    ALL_SKILLS.filter((x) => x.keywords.length < 3 || x.keywords.length > 8).map((x) => x.id).join(", "),
  );
  check(s, "labels have no dashes", ALL_SKILLS.every((x) => !DASH.test(x.label)));
  const fake = {
    modules: [
      { name: "Getting Started With SQL and BigQuery", hours: 1 },
      { name: "Joining Data", hours: 1 },
      { name: "Choosing an effective visual", hours: 1 },
      { name: "Storage and backups", hours: 1 },
    ],
  };
  const cov = keywordCoverage(fake, ["sql", "dashboards", "statistics"]);
  eq(s, "keyword coverage finds SQL modules", cov.find((g) => g.gap === 0)?.modules, [0, 1]);
  eq(s, "keyword coverage finds the chart module", cov.find((g) => g.gap === 1)?.modules, [2]);
  check(s, "uncovered gaps are left out", !cov.some((g) => g.gap === 2));
  eq(s, "scope limits coverage", keywordCoverage(fake, ["sql"], 1)[0]?.modules, [0]);
  check(s, "word boundaries: 'rag' doesn't match 'Storage'", keywordCoverage(fake, ["rag"]).length === 0);
  eq(s, "covered count", coveredCount(cov), 2);
  eq(s, "coverage score uses rank weights", coverageScore(cov), 1.8);
  eq(s, "partial counts half", coverageScore([{ gap: 0, modules: [0], depth: "partial" }]), 0.5);
});

section("unit:profile", () => {
  const s = "unit:profile";
  const p = persona("csm");
  check(s, "persona normalizes to a schema-valid profile", profileV2Schema.safeParse(p).success);
  const old = { v: 2, currentRole: "Analyst", move: p.move, baseline: 0, hoursPerWeek: 3, budget: "free" };
  const fromOld = toProfileV2(old);
  check(s, "an older five-answer draft still loads, with defaults", fromOld !== null && fromOld.gaps.length === 0 && fromOld.situation === "" && fromOld.understoodBy === "user");
  check(s, "the server schema accepts the defaulted profile", fromOld !== null && profileV2Schema.safeParse(fromOld).success);
  const otherMoveGap = skillsFor(p.move === "data" ? "product" : "data")[0].id;
  check(s, "schema rejects a gap from another move", !profileV2Schema.safeParse({ ...p, gaps: [otherMoveGap] }).success);
  check(s, "normalize drops a gap from another move", normalizeProfile({ ...p, gaps: [otherMoveGap, p.gaps[0]] } as ProfileV2).gaps.length === 1);
  check(s, "schema rejects unknown keys", !profileV2Schema.safeParse({ ...p, extra: 1 }).success);
  check(s, "understand body needs 20 characters", !understandBodySchema.safeParse({ situation: "too short" }).success && understandBodySchema.safeParse({ situation: p.situation }).success);
  const cid = fit(p, undefined, { now: NOW }).candidates[0]?.id;
  if (cid) {
    check(s, "tailor body accepts a catalog course", tailorBodySchema.safeParse({ profile: p, courseId: cid, n: 2, h: 3 }).success);
    check(s, "tailor body rejects module names from the client", !tailorBodySchema.safeParse({ profile: p, courseId: cid, n: 2, h: 3, modules: ["x"] }).success);
  }
  // wantsCertificate maps to the certificate gate by default
  const wants = { ...personaWith(2), wantsCertificate: true };
  eq(s, "default adjust turns the certificate chip on", defaultAdjust(wants).certificate, true);
  const withCert = fit(wants, undefined, { now: NOW });
  check(s, "wantsCertificate filters out courses without a certificate", withCert.candidates.every((c) => courseById(c.id)?.certificate !== "none"));
  const explicit = fit(wants, NO_ADJUST, { now: NOW });
  check(s, "an explicit adjust can turn it off", explicit.candidates.length >= withCert.candidates.length);
  check(s, "decision key uses the default adjust", decisionKey(wants) === decisionKey(wants, defaultAdjust(wants)) && decisionKey(wants) !== decisionKey(wants, NO_ADJUST));
});

section("unit:pace", () => {
  const s = "unit:pace";
  eq(s, "effective hours at 3 h", effectiveHours(3), 2.1);
  eq(s, "weeksAt 16.8 h at 3 h is 8, not 9", weeksAt(16.8, 3), 8);
  eq(s, "weeksAt 0 h is 0", weeksAt(0, 3), 0);
  const zero = { ...COURSES[0], id: "zero", modules: [{ name: "Nothing", hours: 0 }], beyond: undefined };
  eq(s, "0-hour outline has no scope", scopeFor(zero, 100), null);
});

section("unit:cost", () => {
  const s = "unit:cost";
  const monthly = { ...COURSES[0], cost: { model: "subscription", amount: 1888, currency: "INR", period: "month" } } as Course;
  eq(s, "monthly at 8 weeks is 2 months", costAtPaceFor(monthly, 8)?.amount, 3776);
  eq(s, "monthly at 4 weeks is 1 month", costAtPaceFor(monthly, 4)?.amount, 1888);
  eq(s, "monthly at 5 weeks is 2 months", costAtPaceFor(monthly, 5)?.months, 2);
  const yearly = { ...COURSES[0], cost: { model: "subscription", amount: 1995, currency: "USD", period: "year" } } as Course;
  eq(s, "yearly is the amount", costAtPaceFor(yearly, 30)?.amount, 1995);
  eq(s, "yearly in rupees", costAtPaceFor(yearly, 30)?.inr, Math.round(1995 * USD_INR.rate));
  const once = { ...COURSES[0], cost: { model: "one-time", amount: 499, currency: "INR" } } as Course;
  eq(s, "one-time is the amount", costAtPaceFor(once, 12)?.amount, 499);
  const free = { ...COURSES[0], cost: { model: "free" }, certificate: "none" } as Course;
  eq(s, "free is 0", costAtPaceFor(free, 12)?.inr, 0);
  eq(s, "unlisted is null", costAtPaceFor({ ...COURSES[0], cost: null }, 12), null);

  eq(s, "cost line: free", costLine(free, costAtPaceFor(free, 3), "INR"), "Free");
  eq(s, "cost line: free, paid certificate", costLine({ ...free, certificate: "paid" }, null, "INR"), "Free. Certificate costs extra.");
  eq(s, "cost line: once", costLine(once, costAtPaceFor(once, 3), "INR"), "₹499 once");
  eq(s, "cost line: monthly", costLine(monthly, costAtPaceFor(monthly, 8), "INR"), "₹1,888 a month, about ₹3,776 at your pace");
  eq(s, "cost line: monthly for USD users", costLine(monthly, costAtPaceFor(monthly, 8), "USD"), `₹1,888 a month, about ₹3,776 at your pace (about ${formatMoney(roundApprox(toUSD(3776, "INR")), "USD")})`);
  eq(s, "cost line: yearly USD for INR users", costLine(yearly, costAtPaceFor(yearly, 8), "INR"), `$1,995 a year (about ${formatMoney(roundApprox(Math.round(1995 * USD_INR.rate)), "INR")})`);
  eq(s, "cost line: unlisted", costLine({ ...COURSES[0], cost: null }, null, "INR"), "Price not listed publicly");
  eq(s, "en-IN grouping", formatMoney(175560, "INR"), "₹1,75,560");
  eq(s, "model label", modelLabel("claude-opus-5-5"), "Claude Opus 5.5");
  eq(s, "model label, no minor", modelLabel("claude-sonnet-5"), "Claude Sonnet 5");
  eq(s, "model label, older saved id", modelLabel("gemini-2.5-flash"), "Gemini 2.5 Flash");
  eq(s, "about amounts round in the same currency", approxMoney(3943.3, "INR", "INR"), "₹3,940");
});

section("unit:copy", () => {
  const s = "unit:copy";
  eq(s, "role noun: acronym takes an", roleNoun("HR generalist, 4 years"), "an HR generalist, 4 years");
  eq(s, "role noun: lowered with a", roleNoun("Customer success manager at a B2B SaaS company."), "a customer success manager at a B2B SaaS company");
  eq(s, "role noun: drops I'm", roleNoun("I'm a data analyst"), "a data analyst");
  eq(s, "role noun: UX takes a", roleNoun("UX designer"), "a UX designer");
  eq(s, "role noun: engineer takes an", roleNoun("Engineer at a fintech"), "an engineer at a fintech");
  check(s, "ask message reads naturally", askSomeoneMessage("Intro to SQL", "HR generalist", 1).includes("I'm an HR generalist. I have about 1 hour a week."));
  const opener = planOpener({ currentRole: "Customer success manager", move: "product", hoursPerWeek: 3 }, "INSPIRED");
  eq(s, "plan opener", opener, "You're a customer success manager, working on product management at about 3 hours a week. This plan covers INSPIRED, sized to that.");
  eq(s, "plan opener, whole course, role up to its first comma", planOpener({ currentRole: "HR generalist, 4 years", move: "data", hoursPerWeek: 2 }, null), `You're an HR generalist, working on ${MOVE_PHRASES.data} at about 2 hours a week. The weeks below are sized to that.`);
  const same = COURSES.find((c) => c.freeStart && c.modules[0].name.toLowerCase().includes(c.freeStart.label.toLowerCase()));
  if (same) check(s, "first step doesn't repeat the free start", firstStep(same, false).text.endsWith("start at the beginning."), firstStep(same, false).text);
});

section("unit:scope", () => {
  const s = "unit:scope";
  const program = COURSES.find(
    (c) => c.beyond && c.modules.length > 1 && c.modules.every((m) => m.part && m.part === c.modules[0].part) && /\d/.test(c.beyond.label),
  );
  if (program) {
    const n = Math.max(...(program.beyond?.label.match(/\d+/g) ?? []).map(Number));
    const noun = /^Learning paths/.test(program.beyond?.label ?? "") ? "Learning path" : "Course";
    eq(s, "program scope label", scopeLabel(program, program.modules.length), `${noun} 1 of ${n}: ${program.modules[0].part}`);
  }
  const pl300 = courseById("microsoft-learn-power-bi-pl-300");
  if (pl300) check(s, "learning paths are called learning paths", scopeLabel(pl300, pl300.modules.length).startsWith("Learning path 1 of"), scopeLabel(pl300, pl300.modules.length));
  const book = COURSES.find((c) => c.kind === "book" && c.modules.length > 3 && !c.beyond);
  if (book) {
    eq(s, "book scope label", scopeLabel(book, 3), `Chapters 1 to 3 of ${book.title}`);
    eq(s, "whole scope label is the title", scopeLabel(book, book.modules.length), book.title);
  }
});

section("unit:weeks", () => {
  const s = "unit:weeks";
  let cases = 0;
  let bad = 0;
  for (const c of COURSES) {
    for (const h of [1, 2, 3, 5, 8, 12] as const) {
      const cap = effectiveHours(h) * (h === 1 ? 12 : 8);
      const scope = scopeFor(c, cap);
      const n = scope ? planN(c, scope) : 1;
      const built = buildWeeks({ course: c, n, h, s: "2026-10-21T15:00:00.000Z", move: c.moves[0].move });
      const sum = built.weeks.reduce((a, w) => a + w.hours, 0);
      const names = new Set([...c.modules.map((m) => m.name), ...(c.beyond ? [c.beyond.label] : [])]);
      const isItem = (i: { index: number; name: string }) =>
        c.modules[i.index]?.name === i.name || (i.index === c.modules.length && i.name === c.beyond?.label);
      const listed = new Set(built.weeks.flatMap((w) => w.items.map((i) => i.name)));
      const E = effectiveHours(h);
      const ceilWeeks = Math.ceil(built.scopeHours / E - 1e-9);
      // the ceiling, unless the last week would be under 15 minutes (it folds into the one before)
      const expectedWeeks = ceilWeeks > 1 && built.scopeHours - (ceilWeeks - 1) * E < 0.25 - 1e-9 ? ceilWeeks - 1 : ceilWeeks;
      const ok =
        Math.abs(sum - built.scopeHours) <= 0.01 + 0.005 * built.weekCount &&
        built.weekCount === expectedWeeks &&
        built.weekCount === weeksAt(built.scopeHours, h) &&
        built.weeks.length === built.weekCount &&
        (built.weekCount === 1 || built.weeks.every((w) => w.hours >= 0.25 - 1e-9)) &&
        built.weeks.every((w) => w.items.length > 0 && w.hours > 0 && w.items.every((i) => names.has(i.name) && isItem(i))) &&
        c.modules.slice(0, built.n).every((m) => listed.has(m.name));
      if (!ok) {
        bad++;
        check(s, `${c.id} at ${h} h`, false, `sum ${sum} vs ${built.scopeHours}, weeks ${built.weekCount}`);
      }
      cases++;
    }
  }
  check(s, `week hours sum to the scope, count is ceil with tiny tails folded, no week under 15 minutes, names verbatim (${cases} cases)`, bad === 0);
  eq(s, "a 2.2 h scope at 3 h is 1 week, not 2 (tail under 15 minutes folds)", weeksAt(2.2, 3), 1);
  eq(s, "a 2.4 h scope at 3 h is 2 weeks", weeksAt(2.4, 3), 2);
  eq(s, "duration under 2 hours reads in minutes", durationPhrase(0.7), "40 minutes");
  eq(s, "duration of 1.65 hours", durationPhrase(1.65), "1 hour 40 minutes");
  eq(s, "duration of 2.4 hours", durationPhrase(2.4), "2.5 hours");
  eq(s, "duration never under 5 minutes", durationPhrase(0.01), "5 minutes");
  const long =
    COURSES.find((c) => c.modules.length >= 6 && !c.beyond && totalHours(c) >= 4 && c.modules[0].hours < 0.7) ??
    (COURSES.find((c) => c.modules.length >= 6) as Course);
  const restarted = buildWeeks({ course: long, n: long.modules.length, h: 1, s: "2026-10-21T15:00:00.000Z", move: long.moves[0].move, rs: { w: 3, d: "2026-11-23" } });
  if (restarted.weeks.length >= 4) {
    eq(s, "restart moves week 3 to the restart date", restarted.weeks[2]?.start, "2026-11-23");
    eq(s, "restart moves week 4 a week later", restarted.weeks[3]?.start, "2026-11-30");
  }
  const big = COURSES.find((c) => c.modules[0].hours > effectiveHours(3) * 1.5);
  if (big) {
    const split = buildWeeks({ course: big, n: 1, h: 3, s: "2026-10-21T15:00:00.000Z", move: big.moves[0].move });
    check(s, "a module across weeks is labelled part i of n", split.weeks[0].items[0].label.includes("(part 1 of"), split.weeks[0].items[0].label);
  }
  // tailored tasks and skim flags
  const tw = restarted.weeks.map((w) => `Task for week ${w.k}.`);
  const tailoredWeeks = buildWeeks({ course: long, n: long.modules.length, h: 1, s: "2026-10-21T15:00:00.000Z", move: long.moves[0].move, tw, tf: [2], sk: [0] });
  check(s, "tailored tasks replace tie-ins", tailoredWeeks.weeks[0].task === "Task for week 1." && tailoredWeeks.weeks[0].tailored);
  check(s, "template weeks keep the tie-in", !tailoredWeeks.weeks[1].tailored && tailoredWeeks.weeks[1].task === tailoredWeeks.weeks[1].tieIn);
  check(s, "skim flags mark the module", tailoredWeeks.weeks[0].items.some((i) => i.index === 0 && i.skim === true));
  check(s, "week sources: tailored, template", tailoredWeeks.weeks[0].source === "tailored" && tailoredWeeks.weeks[1].source === "template");
  const withPick = buildWeeks({ course: long, n: long.modules.length, h: 1, s: "2026-10-21T15:00:00.000Z", move: long.moves[0].move, w: "Use it on one real ticket." });
  check(s, "week 1 from the pick's own line is marked as such", withPick.weeks[0].source === "pick" && withPick.weeks[0].task === "Use it on one real ticket.");
  eq(s, "pick line tag follows the plan's engine", weekTaskTag({ e: "ai", te: "rules" }, withPick.weeks[0]), "AI");
  eq(s, "template tag", weekTaskTag({ e: "ai", te: "ai" }, withPick.weeks[1]), "TEMPLATE");
});

async function planLinkChecks(): Promise<void> {
 await sectionAsync("unit:plan-link", async () => {
  const s = "unit:plan-link";
  const course = COURSES.find((c) => c.modules.length >= 12) ?? COURSES[0];
  const base = {
    course,
    n: Math.min(4, course.modules.length),
    h: 3 as const,
    m: course.moves[0].move,
    b: 0 as const,
    role: "डेटा एनालिस्ट बनना है, HR generalist 🙂 with commas, semicolons; and \"quotes\"",
    commitAt: new Date("2026-10-20T14:00:00Z"),
    s: new Date("2026-10-21T15:00:00Z"),
    o: "late-work" as const,
    w: "Pick one question your team asks every month.",
    e: "ai" as const,
  };
  const plan = createPlan(base);
  const token = await encodePlan(plan);
  check(s, "compressed token is prefixed z.", token.startsWith("z."));
  eq(s, "round trip (z.)", await decodePlan(token), plan);
  const u = encodePlanUncompressed(plan);
  eq(s, "round trip (u.)", await decodePlan(u), plan);
  eq(s, "u. decodes without waiting", decodePlanSync(u), plan);
  // the earlier unprefixed form still opens
  const legacyToken = Buffer.from(JSON.stringify(plan), "utf8").toString("base64url");
  eq(s, "unprefixed tokens from before still decode", await decodePlan(legacyToken), plan);
  eq(s, "readPlanHash reads #p=", (await readPlanHash(`#p=${token}`)).status, "ok");
  eq(s, "readPlanHash says none without p", (await readPlanHash("#x=1")).status, "none");
  eq(s, "garbage decodes to null", await decodePlan("z.not-a-plan"), null);
  eq(s, "garbage u. decodes to null", await decodePlan("u.@@@"), null);

  // 12 weeks of 170-character tasks, varied text
  const vocab = "pick one real ticket from your queue this week and apply the module idea then write down what changed for the customer share it with your manager in three short sentences so the team sees the difference before planning on monday try again with a harder case note where it broke and why ask a colleague which part confused them keep the example small enough to finish in one sitting".split(" ");
  let seed = 11;
  const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  const tasks = Array.from({ length: 12 }, (_, i) => {
    let t = `Week ${i + 1} at work: `;
    while (t.length < 168) t += `${vocab[Math.floor(rnd() * vocab.length)]} `;
    return `${t.slice(0, 169).trim()}.`;
  });
  const tailoredPlan = createPlan({
    ...base,
    n: Math.min(12, course.modules.length),
    h: 1,
    role: "Customer success manager at a B2B SaaS company, 3 years, logging feature requests every day",
    tailoring: { engine: "ai", tasks, tailored: tasks.map(() => true), artifact: "A one-page problem brief for a request your team ignored, with three pieces of customer evidence from the tickets you log every week, shared with one PM.", artifactTailored: true },
    skim: [0, 1],
  });
  check(s, "tasks are capped at 170 characters", (tailoredPlan.tw ?? []).every((t) => t.length <= 170) && tailoredPlan.tw?.length === 12);
  const zt = await encodePlan(tailoredPlan);
  const path = `/plan#p=${zt}`;
  check(s, "12 weeks of 170-character tasks fit under 2,000 characters", path.length < MAX_LINK_CHARS, String(path.length));
  const back = await decodePlan(zt);
  check(s, "and every task survives the round trip", JSON.stringify(back?.tw) === JSON.stringify(tailoredPlan.tw) && back?.ta === tailoredPlan.ta && back?.te === "ai", String(back?.tw?.length));
  const ut = encodePlanUncompressed(tailoredPlan);
  check(s, "the u. fallback also stays under 2,000 (shortening tasks)", `/plan#p=${ut}`.length <= MAX_LINK_CHARS, String(ut.length));
  check(s, "the u. fallback still decodes", (await decodePlan(ut)) !== null);
  const huge = createPlan({ ...base, role: "多".repeat(200), w: "x".repeat(140), tailoring: { engine: "ai", tasks: tasks.map((t) => t.replace(/[a-z]/g, "語")), tailored: tasks.map(() => true), artifact: "語".repeat(220), artifactTailored: true } });
  const ht = await encodePlan(huge);
  check(s, "even a multibyte worst case fits under 2,000", `/plan#p=${ht}`.length <= MAX_LINK_CHARS, String(ht.length));
  check(s, "and still decodes to a valid plan", (await decodePlan(ht)) !== null);
  eq(s, "outline hash is 6 chars", outlineHash(course).length, 6);
  const moved = reschedule(plan, new Date("2026-10-22T02:30:00Z"));
  eq(s, "reschedule counts", moved.rb, 1);
  check(s, "payload validation rejects a 171-character task", toPlanPayload({ ...tailoredPlan, tw: ["x".repeat(171)] }) === null);
  check(s, "payload accepts the mock engine", toPlanPayload({ ...tailoredPlan, e: "mock", te: "mock" }) !== null);
  {
    // a link that says the dev mock answered shows templates in production
    const env = process.env as Record<string, string | undefined>;
    const was = env.NODE_ENV;
    env.NODE_ENV = "production";
    const prodMock = toPlanPayload({ ...tailoredPlan, e: "mock", te: "mock", w: "Mock line." });
    env.NODE_ENV = was;
    check(s, "in production a mock link shows no mock text or label", prodMock !== null && prodMock.e === "rules" && prodMock.te === "rules" && !prodMock.tw && !prodMock.ta && !prodMock.w, JSON.stringify(prodMock));
  }
  check(s, "a link names only a Claude model", !toPlanPayload({ ...tailoredPlan, te: "ai", tm: "gpt-5" })?.tm);
  check(s, "payload rejects a far-future session date", toPlanPayload({ ...tailoredPlan, s: "+275760-09-10T00:00:00.000Z" }) === null);
  check(s, "payload rejects a date that isn't toISOString output", toPlanPayload({ ...tailoredPlan, t: "Tue, 21 Oct 2026 15:00:00 GMT" }) === null);
  check(s, "payload rejects a restart outside 2020 to 2100", toPlanPayload({ ...tailoredPlan, rs: { w: 2, d: "9999-01-05" } }) === null);
});
}

section("unit:ics", () => {
  const s = "unit:ics";
  const course = COURSES.find((c) => c.freeStart) ?? COURSES[0];
  const plan = createPlan({ course, n: 1, h: 1, m: course.moves[0].move, b: 0, role: "HR, generalist; Excel", commitAt: new Date(), s: new Date("2026-10-21T15:00:00Z"), o: "tired", e: "rules" });
  const ics = buildIcs({ plan, course, planLink: "https://ascendmvp.vercel.app/plan#p=z.abc", firstStep: "Open Getting Started, then start; go", now: new Date("2026-10-20T10:00:00Z") });
  eq(s, "3 VEVENTs", (ics.match(/BEGIN:VEVENT/g) ?? []).length, 3);
  eq(s, "3 alarms at 10 minutes", (ics.match(/TRIGGER:-PT10M/g) ?? []).length, 3);
  check(s, "CRLF line endings only", ics.includes("\r\n") && !/[^\r]\n/.test(ics));
  check(s, "lines folded at 75 octets", ics.split("\r\n").every((l) => new TextEncoder().encode(l).length <= 75));
  check(s, "commas and semicolons escaped", ics.replace(/\r\n /g, "").includes("then start\\; go"));
  check(s, "UTC times", /DTSTART:20261021T150000Z/.test(ics));
});

section("unit:booking", () => {
  const s = "unit:booking";
  const tue = new Date(2026, 9, 20, 20, 30);
  eq(s, "late work: next day 7:00", backupSlot(tue, "late-work").toString(), new Date(2026, 9, 21, 7, 0).toString());
  eq(s, "plans change: Saturday 10:00", backupSlot(tue, "plans-change").toString(), new Date(2026, 9, 24, 10, 0).toString());
  eq(s, "plans change on a Saturday: Sunday", backupSlot(new Date(2026, 9, 24, 9, 0), "plans-change").toString(), new Date(2026, 9, 25, 10, 0).toString());
  eq(s, "where to start: next day same time", backupSlot(tue, "where-to-start").toString(), new Date(2026, 9, 21, 20, 30).toString());
  check(s, "default slot is inside the window", inBookingWindow(defaultSlot(NOW), NOW));
  check(s, "20 minutes from now is outside", !inBookingWindow(new Date(NOW.getTime() + 20 * 60_000), NOW));
  check(s, "49 hours from now is outside", !inBookingWindow(new Date(NOW.getTime() + 49 * 3_600_000), NOW));
});

section("unit:legacy", () => {
  const s = "unit:legacy";
  const course = COURSES.find((c) => c.moves.some((m) => m.move === "data")) ?? COURSES[0];
  const v1 = { profile: { currentRole: "HR generalist", experience: "3-5", goal: "deeper-craft", level: "beginner", timePerWeek: "<2", interests: ["hr", "data-analyst"] }, courseId: course.id };
  const decoded = decodeLegacyPlan(encodeURIComponent(JSON.stringify(v1)));
  check(s, "decodes an old ?d= value", decoded?.courseId === course.id);
  const conv = decoded ? legacyToV2(decoded, NOW) : null;
  check(s, "converts to a v2 plan", conv?.kind === "ok" && conv.plan.m === "data" && conv.plan.h === 1 && conv.plan.b === 0);
  const gone = legacyToV2({ ...v1, courseId: "google-project-management-certificate" } as typeof v1 & { profile: never }, NOW);
  eq(s, "removed course", gone.kind, "removed");
  const proto = legacyToV2({ profile: { ...v1.profile, timePerWeek: "constructor", level: "constructor", interests: ["constructor", "toString"] }, courseId: course.id } as unknown as Parameters<typeof legacyToV2>[0], NOW);
  check(s, "inherited keys like constructor fall back to the defaults", proto.kind === "ok" && proto.plan.h === 3 && proto.plan.b === 0 && proto.plan.m === course.moves[0].move);
  const odd = decodeLegacyPlan(encodeURIComponent(JSON.stringify({ profile: { currentRole: "x", timePerWeek: "__proto__", level: 7, interests: "pm" }, courseId: course.id })));
  const oddConv = odd ? legacyToV2(odd, NOW) : null;
  check(s, "odd field types still convert", oddConv?.kind === "ok" && oddConv.plan.h === 3 && oddConv.plan.b === 0);
});

section("unit:keys", () => {
  const s = "unit:keys";
  const p = personas[0].profile;
  const shuffled = { ...Object.fromEntries(Object.entries(p).reverse()) } as ProfileV2;
  eq(s, "decision key ignores key order", decisionKey(shuffled, NO_ADJUST), decisionKey(p, normalizeAdjust({})));
});

section("unit:swap", () => {
  const s = "unit:swap";
  const p = personaWith(3);
  const r = fit(p, NO_ADJUST, { now: NOW });
  const d = rulesDecision(p, NO_ADJUST, [], { now: NOW, fit: r });
  const alt = d.alternates[0]?.id;
  if (alt && d.pickId) {
    const sw = swapPick(d, alt, { profile: p, result: r });
    check(s, "swap makes the alternate the pick and keeps the old pick as an alternate", sw.pickId === alt && sw.alternates.some((a) => a.id === d.pickId));
    check(s, "swap keeps coverage and clears skim and comparison", sw.coverage.length === d.coverage.length && sw.skim.length === 0 && sw.vsRules === "");
  }
  check(s, "engine lines have no dashes", (["ai", "rules", "mock"] as const).every((e) => !DASH.test(engineLine({ engine: e, ms: 3200, sent: { candidateIds: ["a", "b"] } }))));
  check(s, "mock engine line says MOCK AI (dev only)", engineLine({ engine: "mock", ms: 900, sent: { candidateIds: ["a", "b"] } }).startsWith("MOCK AI (dev only)"));
  const lines = receiptLines({ ...d, engine: "ai", origin: "pick" });
  check(s, "receipt line counts words, gaps, modules and courses", lines.length === 2 && lines[0].includes(`${d.receipt.words} words`) && lines[0].includes(`across ${d.receipt.courses} courses`), lines[0]);
  check(s, "rules receipt doesn't repeat the engine line", !/AI (unavailable|isn't set up)/.test(receiptLines({ ...d, origin: "pick" })[0]) && receiptLines({ ...d, origin: "pick" })[0].includes("by keywords"), receiptLines({ ...d, origin: "pick" })[0]);
  const withGaps = { ...d, engine: "ai" as const, origin: "pick" as const, receipt: { ...d.receipt, gaps: 2 } };
  check(s, "receipt credits the AI only for gaps it named", receiptLines({ ...withGaps, gaps: ["a", "b"] }, "ai", ["a"])[0].includes("found 1 gap · you changed them to 2") && receiptLines(withGaps, "ai", null)[0].includes("worked from your 2 gaps"));
  const removedOne = { ...withGaps, gaps: ["a"], receipt: { ...withGaps.receipt, gaps: 1 } };
  check(s, "receipt says so when a gap was removed on Check", receiptLines(removedOne, "ai", ["a", "b"])[0].includes("found 2 gaps · you changed them to 1"), receiptLines(removedOne, "ai", ["a", "b"])[0]);
  check(s, "receipt says so when gaps were reordered on Check", receiptLines({ ...withGaps, gaps: ["b", "a"] }, "ai", ["a", "b"])[0].includes("found 2 gaps · you reordered them"));
  check(s, "receipt credits found only for the AI's own gaps in its order", receiptLines({ ...withGaps, gaps: ["a", "b"] }, "ai", ["a", "b"])[0].includes("· found 2 gaps · mapped"));
  check(s, "receipt says worked from your gaps when the user set them", receiptLines(withGaps, "user")[0].includes("worked from your 2 gaps"));
  check(s, "receipt with no gaps says so", receiptLines({ ...withGaps, gaps: [], receipt: { ...d.receipt, gaps: 0 } })[0].includes("no gaps to match · chose 1 from"));
  eq(s, "rules alone, same course, no gaps", rulesAloneLine({ engine: "ai", pickId: "a", rulesPickId: "a", vsRules: "", gaps: [] }, "A"), "Rules alone pick the same course. The AI adds your weekly tasks.");
  eq(s, "engine line for an answer that failed the checks", engineLine({ engine: "rules", reason: "ai-invalid" }), "Chosen by Ascend's rules. The AI's answer didn't pass the checks, so these lines come from the catalog");
  eq(s, "rules alone, same course", rulesAloneLine({ engine: "ai", pickId: "a", rulesPickId: "a", vsRules: "" }, "A"), "Rules alone pick the same course. The AI adds the module match and your weekly tasks.");
  eq(s, "rules alone, different course", rulesAloneLine({ engine: "ai", pickId: "b", rulesPickId: "a", vsRules: "It fits better." }, "Course A"), "Rules alone would have picked Course A. It fits better.");
  check(s, "the read-back never puts the preset starting point in quote marks", !/[“”"]/.test(readBackLine(p, "INR")), readBackLine(p, "INR"));
});

section("unit:chip-chain", () => {
  const s = "unit:chip-chain";
  // decision-store reads and writes localStorage; give it a memory one for this section only
  const mem = new Map<string, string>();
  const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  const g = globalThis as unknown as { window?: unknown };
  const had = "window" in g;
  const before = g.window;
  g.window = { localStorage: store, sessionStorage: store };
  try {
    const p = normalizeProfile({
      v: 2,
      situation: "Operations analyst at a logistics company, 2 years. I build weekly reports in Excel and want SQL and dashboards.",
      currentRole: "Operations analyst",
      move: "data",
      baseline: 1,
      hoursPerWeek: 1,
      budget: "free",
      gaps: ["dashboards", "sql", "storytelling"],
      strengths: [],
      mentioned: [],
      wantsCertificate: false,
      prefersFormat: "any",
      understoodBy: "ai",
    } as ProfileV2);
    const r = rulesDecision(p, NO_ADJUST, [], { now: NOW, currency: "INR" });
    // an AI-shaped answer: the same map, marked as the model's
    const d0 = saveDecision(
      makeDecision({ ...r, engine: "mock", coverage: r.coverage.map((c) => ({ ...c, source: "mock" as const })) }, { profile: p, adjust: NO_ADJUST, origin: "pick", currency: "INR" }),
    );
    const mapped = (d: { coverage: { id: string; gaps: Parameters<typeof modulesMapped>[0] }[] }) =>
      Object.fromEntries(d.coverage.map((c) => [c.id, modulesMapped(c.gaps)]));
    const full = mapped(d0);
    const shorter = { ...NO_ADJUST, shorter: true };
    const trimmedSome = (d: Parameters<typeof mapped>[0]) => Object.entries(mapped(d)).some(([id, n]) => n < (full[id] ?? 0));
    const alt = d0.alternates[0]?.id;
    if (alt) {
      const sw = swapDecision(d0, alt, p);
      const on = adjustDecision(sw, p, shorter, []);
      const off = adjustDecision(on, p, NO_ADJUST, []);
      check(s, "Shorter trims the module map to the part in scope (precondition)", trimmedSome(on), JSON.stringify(mapped(on)));
      check(s, "swap, Shorter, Shorter off: the swap stays and the full module map comes back", off.pickId === alt && JSON.stringify(mapped(off)) === JSON.stringify(full), JSON.stringify(mapped(off)));
    }
    const c1 = adjustDecision(d0, p, shorter, []);
    const c2 = adjustDecision(c1, p, { ...shorter, cheaper: true }, []);
    const c3 = adjustDecision(c2, p, { ...NO_ADJUST, cheaper: true }, []);
    eq(s, "Shorter, Cheaper, Shorter off: the full module map comes back", mapped(c3), full);
  } finally {
    if (had) g.window = before;
    else delete g.window;
  }
});

// Understand: rules reading and verifier ------------------------------------------

section("unit:understand-rules", () => {
  const s = "unit:understand-rules";
  for (const e of EXAMPLES) {
    const u = rulesUnderstanding(e.situation);
    check(s, `"${e.label}": role is the first sentence, at most 80 chars`, u.role.length > 0 && u.role.length <= 80 && e.situation.startsWith(u.role.slice(0, 20)), u.role);
    check(s, `"${e.label}": manual fields stay empty`, u.gaps.length === 0 && u.strengths.length === 0 && u.baseline === null);
    check(s, `"${e.label}": mentions are verbatim`, u.mentioned.every((m) => isVerbatim(m.text, e.situation)), JSON.stringify(u.mentioned));
  }
  const keywordHits = personas.filter((p) => isAvailableMove(p.expectedMove) && guessMove(p.profile.situation) === p.expectedMove).length;
  const shippedPersonas = personas.filter((p) => isAvailableMove(p.expectedMove)).length;
  check(s, `keyword move guess reads the expected move for most personas (${keywordHits} of ${shippedPersonas})`, keywordHits >= Math.ceil(shippedPersonas * 0.75));
  const csm = EXAMPLES.find((e) => /project management/i.test(e.situation));
  if (csm) {
    const m = findMentions(csm.situation).find((x) => /project management/i.test(x.text));
    check(s, "a dropped course is found with its status", m?.status === "dropped" && m.courseId === null, JSON.stringify(m));
  }
  const hours = rulesUnderstanding("I can do about 5 hours a week. I want to learn SQL for my job in finance.");
  check(s, "hours a week are read and snapped to a chip", hours.hoursMentioned === 5 && hours.hoursChip === 5);
  check(s, "a stated need for a certificate is read", rulesUnderstanding("I need a certificate for job applications, and I want to learn data analysis.").wantsCertificate);
});

section("unit:understand-verifier", () => {
  const s = "unit:understand-verifier";
  const situation = EXAMPLES[1].situation;
  const moves = availableMoves().map((m) => m.id);
  const move = (guessMove(situation) ?? moves[0]) as ProfileV2["move"];
  const other = moves.find((m) => m !== move) ?? move;
  const em = String.fromCharCode(0x2014);
  const run = (output: unknown, finishReason = "stop") => verifyUnderstanding({ finishReason, output, situation, moves });
  const base = {
    role: `Customer success manager ${em} B2B SaaS, 3 years, with a much longer line that has to be shortened to fit`,
    move,
    moveWhy: `You said "I dream about this" and "I want to move into product".`,
    baseline: "0",
    baselineEvidence: "I log feature requests that mostly get ignored",
    strengths: [
      { label: "Customer requests", quote: "I log feature requests that mostly get ignored" },
      { label: "Invented", quote: "I have led three product launches" },
      { label: "Spacing and case", quote: "i  KNOW basic sql" },
    ],
    gaps: [
      { id: skillsFor(move)[0].id, reason: "It takes about 6 weeks to learn." },
      { id: skillsFor(other)[0].id, reason: "From another move." },
      { id: skillsFor(move)[1].id, reason: "Second." },
      { id: skillsFor(move)[0].id, reason: "Repeated." },
    ],
    mentioned: [
      { text: "Google Project Management certificate", courseId: "none", status: "dropped" },
      { text: "A course they never named", courseId: "none", status: "considering" },
    ],
    wantsCertificate: false,
    prefersFormat: "sideways",
    hoursMentioned: 37,
  };
  const r = run(base);
  check(s, "accepts a complete answer", r.ok);
  if (!r.ok) return;
  const u = r.understanding;
  check(s, "fake quotes are dropped", u.strengths.length === 2 && !u.strengths.some((x) => x.label === "Invented"), JSON.stringify(u.strengths));
  check(s, "quotes match ignoring case and spacing", u.strengths.some((x) => x.label === "Spacing and case"));
  check(s, "verbatim evidence is kept", u.baselineEvidence === base.baselineEvidence);
  check(s, "invented evidence is blanked", run({ ...base, baselineEvidence: "I have run a product team" }).ok && (run({ ...base, baselineEvidence: "I have run a product team" }) as { understanding: { baselineEvidence: string } }).understanding.baselineEvidence === "");
  check(s, "gaps outside the move and repeats are dropped", u.gaps.length === 2 && u.gaps.every((g) => skillsFor(move).some((x) => x.id === g.id)), JSON.stringify(u.gaps));
  check(s, "numbers are removed from gap reasons", !u.gaps.some((g) => NUMBER_UNIT_RE.test(g.reason)));
  check(s, "mentions not in their words are dropped", u.mentioned.length === 1 && u.mentioned[0].status === "dropped");
  check(s, "role is shortened to 80 with dashes replaced", u.role.length <= 80 && !DASH.test(u.role), u.role);
  check(s, "unbacked quote marks are removed from moveWhy", !u.moveWhy.includes('"I dream about this"') && u.moveWhy.includes('"I want to move into product"'), u.moveWhy);
  check(s, "hours they didn't write are dropped", u.hoursMentioned === null && u.hoursChip === null);
  eq(s, "an unknown format becomes any", u.prefersFormat, "any");
  const none = run({ ...base, move: "none" });
  check(s, "move none asks the user", none.ok && none.understanding.move === null && none.understanding.gaps.length === 0 && none.understanding.baseline === null);
  const bad = run({ ...base, move: "astrology" });
  check(s, "an invalid move asks the user", bad.ok && bad.understanding.move === null);
  check(s, "finishReason length fails complete", !run(base, "length").ok);
  check(s, "a malformed answer fails complete", !run({ role: "x" }).ok);
  check(s, "checks record what was fixed", r.checks.filter((c) => !c.passed).length >= 4, r.checks.map((c) => `${c.name}:${c.passed}`).join(" "));
});

// Pick verifier ------------------------------------------------------------------------------

section("unit:pick-verifier", () => {
  const s = "unit:pick-verifier";
  const p = personaWith(3);
  const r = fit(p, NO_ADJUST, { now: NOW });
  const rules = rulesDecision(p, NO_ADJUST, [], { now: NOW, fit: r });
  const templates = {
    whyThisOne: (id: string) => whyThisOneTemplate(courseById(id) as Course, p, NO_ADJUST, "INR"),
    useItAtWork: atWorkTemplate(p),
    gapNote: "Template gap.",
    vsRules: () => "Template comparison.",
  };
  const ids = r.candidates.map((c) => c.id);
  const em = String.fromCharCode(0x2014);
  const en = String.fromCharCode(0x2013);
  const mentioned = [
    { text: "Some course they named", courseId: null, status: "considering" as const },
    { text: "The rules' top course", courseId: ids[0], status: "considering" as const },
  ];
  const run = (output: unknown, finishReason = "stop") =>
    verify({ finishReason, output, candidates: r.candidates, exclude: [], rules, gaps: p.gaps, mentioned, words: countWords(p.situation), rulesTopId: ids[0], templates });
  const pickCand = r.candidates[1];
  const good = run({
    coverage: [
      { id: ids[0], gaps: [{ gap: 0, modules: [0], depth: "direct" }] },
      { id: ids[1], gaps: [{ gap: 0, modules: [0, 999, -1], depth: "partial" }, { gap: 77, modules: [0], depth: "direct" }, { gap: 1, modules: [0], depth: "sideways" }] },
      { id: "not-a-course", gaps: [{ gap: 0, modules: [0], depth: "direct" }] },
    ],
    pickId: ids[1],
    alternateIds: [ids[0], ids[0], "not-a-course"],
    whyThisOne: `You already work near this ${em} it builds on that. It takes about 6 weeks at your pace.`,
    vsRules: "It is cheaper. It costs $49 less than the other one.",
    skim: [{ module: 0, reason: "You know this. It takes 2 hours." }, { module: 0, reason: "Repeat." }, { module: pickCand.moduleCount + 5, reason: "Out of range." }],
    mentionedVerdicts: [
      { index: 0, verdict: "later", reason: "It looks useful. It takes 3 months." },
      { index: 1, verdict: "start-here", reason: "Start with this one." },
      { index: 9, verdict: "skip", reason: "No such mention." },
    ],
    useItAtWork: "It costs ₹1,888 a month to finish.",
    honestFit: "ok",
    gapNote: "Should be dropped.",
  });
  const d = good.decision;
  eq(s, "keeps the AI engine", d.engine, "ai");
  check(s, "strips 'about 6 weeks' and keeps the rest", !/6 weeks/.test(d.whyThisOne) && d.whyThisOne.startsWith("You already work near this"), d.whyThisOne);
  check(s, "strips '₹1,888' and falls back to the template", d.useItAtWork === templates.useItAtWork, d.useItAtWork);
  check(s, "replaces dashes", !DASH.test(d.whyThisOne) && d.whyThisOne.includes(", it builds"), d.whyThisOne);
  check(s, "removes numbers from vsRules", d.vsRules === "It is cheaper.", d.vsRules);
  // the AI mapped nothing for the rules' filler, so only the alternate that closes a gap stays
  check(s, "dedupes alternates and keeps only ones that close a gap", d.alternates.length >= 1 && new Set(d.alternates.map((a) => a.id)).size === d.alternates.length && !d.alternates.some((a) => a.id === d.pickId) && d.alternates.every((a) => (d.coverage.find((c) => c.id === a.id)?.covered ?? 0) > 0), JSON.stringify(d.alternates));
  eq(s, "drops gapNote when the fit isn't weak", d.gapNote, "");
  check(s, "every candidate gets a coverage entry", d.coverage.length === ids.length && d.coverage.every((c, i) => c.id === ids[i] && c.source === "ai"));
  const pc = d.coverage.find((c) => c.id === ids[1]);
  eq(s, "bad module indices are dropped", pc?.gaps.find((g) => g.gap === 0)?.modules, [0]);
  check(s, "bad gap indices are dropped", !pc?.gaps.some((g) => g.gap === 77));
  eq(s, "an invalid depth becomes partial", pc?.gaps.find((g) => g.gap === 1)?.depth, "partial");
  check(s, "missing candidates get an empty coverage list", d.coverage.slice(2).every((c) => c.gaps.length === 0 && c.covered === 0));
  eq(s, "receipt counts invented ids (alternate and coverage)", d.receipt.invalidIdsRemoved, 2);
  eq(s, "receipt counts invented modules (coverage and skim)", d.receipt.invalidModulesRemoved, 3);
  check(s, "receipt counts removed number sentences", d.receipt.numbersRemoved >= 5, String(d.receipt.numbersRemoved));
  eq(s, "receipt mapped modules equals distinct pairs", d.receipt.modulesMapped, d.coverage.reduce((a, c) => a + new Set(c.gaps.flatMap((g) => g.modules)).size, 0));
  check(s, "skim keeps one valid entry with a number-free reason", d.skim.length === 1 && d.skim[0].module === 0 && d.skim[0].reason === "You know this.", JSON.stringify(d.skim));
  const skimDirect = run({ coverage: [{ id: ids[1], gaps: [{ gap: 0, modules: [0], depth: "direct" }] }], pickId: ids[1], alternateIds: [], whyThisOne: "It fits.", vsRules: "", skim: [{ module: 0, reason: "You know this." }], mentionedVerdicts: [], useItAtWork: "Do it.", honestFit: "ok", gapNote: "" });
  check(s, "a skim note on a module that directly closes a gap is dropped", skimDirect.decision.skim.length === 0, JSON.stringify(skimDirect.decision.skim));
  check(s, "numbers removed from verdict reasons", d.mentionedVerdicts.find((v) => v.index === 0)?.reason === "It looks useful.", JSON.stringify(d.mentionedVerdicts));
  check(s, "start-here for a course that isn't the pick becomes later", d.mentionedVerdicts.find((v) => v.index === 1)?.verdict === "later");
  check(s, "verdicts for mentions that don't exist are dropped", !d.mentionedVerdicts.some((v) => v.index === 9));
  eq(s, "rulesPickId is the rules' top", d.rulesPickId, ids[0]);
  check(s, "records fixes", d.checks.filter((c) => !c.passed).length >= 7, d.checks.map((c) => `${c.name}:${c.passed}`).join(" "));

  const same = run({ coverage: [], pickId: ids[0], alternateIds: [], whyThisOne: "It fits.", vsRules: "Should be dropped.", skim: [], mentionedVerdicts: [{ index: 1, verdict: "skip", reason: "Not this." }], useItAtWork: "Do it.", honestFit: "ok", gapNote: "" });
  eq(s, "vsRules is emptied when the AI agrees with the rules", same.decision.vsRules, "");
  check(s, "a mention that is the pick becomes start-here", same.decision.mentionedVerdicts[0]?.verdict === "start-here");
  const blank = run({ coverage: [], pickId: ids[1], alternateIds: [], whyThisOne: "", vsRules: "", skim: [], mentionedVerdicts: [], useItAtWork: "   ", honestFit: "weak", gapNote: "" });
  check(s, "empty fields use templates", blank.decision.whyThisOne === templates.whyThisOne(ids[1]) && blank.decision.gapNote === "Template gap." && blank.decision.vsRules === "Template comparison.");
  const cut = run({ coverage: [], pickId: ids[0], alternateIds: [], whyThisOne: "x", vsRules: "", skim: [], mentionedVerdicts: [], useItAtWork: "y", honestFit: "ok", gapNote: "" }, "length");
  eq(s, "rejects finishReason length", [cut.decision.engine, cut.decision.reason], ["rules", "ai-invalid"]);
  const outside = run({ coverage: [], pickId: "not-a-course", alternateIds: [], whyThisOne: "x", vsRules: "", skim: [], mentionedVerdicts: [], useItAtWork: "y", honestFit: "ok", gapNote: "" });
  eq(s, "rejects a pick outside the list", outside.decision.reason, "ai-invalid");
  check(s, "the rules fallback still carries keyword coverage", outside.decision.coverage.length === ids.length && outside.decision.coverage.every((c) => c.source === "keywords"));
  const hype = run({ coverage: [], pickId: ids[0], alternateIds: [], whyThisOne: "Your background as an analyst is perfect.", vsRules: "", skim: [], mentionedVerdicts: [], useItAtWork: `This will unlock everything ${en} truly.`, honestFit: "strong", gapNote: "" });
  check(s, "'Your background as' and hype words use templates", hype.decision.whyThisOne === templates.whyThisOne(ids[0]) && hype.decision.useItAtWork === templates.useItAtWork);
  const long = run({ coverage: [], pickId: ids[0], alternateIds: [], whyThisOne: `${"A short first sentence that is fine. ".repeat(9)}`, vsRules: "", skim: [], mentionedVerdicts: [], useItAtWork: "Do it.", honestFit: "ok", gapNote: "" });
  check(s, "cuts to the last sentence within 260", long.decision.whyThisOne.length <= 260 && long.decision.whyThisOne.endsWith("."));
  for (const t of ["about 6 weeks", "₹1,888", "$49", "20 hrs", "50%", "3 months", "100 rs"]) {
    check(s, `number regex matches "${t}"`, NUMBER_UNIT_RE.test(t));
  }
  check(s, "number regex ignores a bare year", !NUMBER_UNIT_RE.test("Updated in 2025 for agents."));
});

// Tailor verifier ------------------------------------------------------------------------------

section("unit:tailor-verifier", () => {
  const s = "unit:tailor-verifier";
  const course = COURSES.find((c) => c.modules.length >= 4 && c.modules.every((m) => m.name.length >= 12)) ?? COURSES[0];
  const move = course.moves[0].move;
  const weeks = tailorWeeks({ course, n: course.modules.length, h: 1, move });
  const W = weeks.length;
  const em = String.fromCharCode(0x2014);
  const own = weeks[0].items[0].name;
  const later = weeks[W - 1].items.map((i) => i.name).find((n) => !weeks[0].items.some((x) => x.name === n) && n.length >= 12 && n.split(/\s+/).length >= 2);
  const out = {
    weeks: [
      { k: 1, task: `Use “${own}” on one real ticket ${em} keep it small. It takes 2 hours.` },
      { k: 2, task: `Try "Advanced Wizardry" with one customer.` },
      ...(later && W > 2 ? [{ k: 3, task: `Apply ${later} to a real case. Then tell one teammate.` }] : []),
      { k: 1, task: "Duplicate week." },
      { k: W + 3, task: "A week that doesn't exist." },
    ],
    artifact: `A short write-up of what you built ${em} shared with your team.`,
  };
  const r = verifyTailoring({ finishReason: "stop", output: out, weeks, artifactTemplate: MOVES[move].artifact });
  check(s, "accepts a complete answer", r.ok);
  if (!r.ok) return;
  eq(s, "exactly one task per week", r.tasks.length, W);
  check(s, "missing weeks are filled from the move's templates", r.tasks.slice(later && W > 2 ? 3 : 2).every((t, i) => t === weeks[i + (later && W > 2 ? 3 : 2)].tieIn) && r.tailored.slice(later && W > 2 ? 3 : 2).every((x) => !x));
  check(s, "a real module name keeps its quotes", r.tasks[0].includes(`“${own}”`), r.tasks[0]);
  check(s, "numbers with units are removed", !NUMBER_UNIT_RE.test(r.tasks[0]), r.tasks[0]);
  check(s, "dashes are replaced", !DASH.test(r.tasks[0]) && !DASH.test(r.artifact));
  check(s, "quoted text that isn't a module of that week is unquoted", W > 1 && r.tasks[1] === "Try Advanced Wizardry with one customer.", r.tasks[1]);
  if (later && W > 2) check(s, "a sentence naming another week's module is removed", r.tasks[2] === "Then tell one teammate.", r.tasks[2]);
  check(s, "duplicate and out-of-range weeks are ignored", r.checks.some((c) => c.name === "length" && !c.passed));
  check(s, "the tailored finish line is kept", r.artifactTailored && r.artifact.startsWith("A short write-up"));
  const short = verifyTailoring({ finishReason: "stop", output: { weeks: [], artifact: "" }, weeks, artifactTemplate: MOVES[move].artifact });
  check(s, "an empty answer fills every week and the finish line from templates", short.ok && short.tasks.length === W && short.tailored.every((x) => !x) && short.artifact === MOVES[move].artifact);
  check(s, "finishReason length fails complete", !verifyTailoring({ finishReason: "length", output: out, weeks, artifactTemplate: "x" }).ok);
});

// The dev-only mock --------------------------------------------------------------------------

section("unit:mock", () => {
  const s = "unit:mock";
  const moves = availableMoves().map((m) => m.id);
  let mockDiffers = 0;
  for (const e of EXAMPLES) {
    const raw = mockUnderstandOutput(e.situation, moves);
    const v = verifyUnderstanding({ finishReason: "stop", output: raw, situation: e.situation, moves });
    check(s, `"${e.label}": mock understanding passes the verifier untouched`, v.ok && v.checks.every((c) => c.passed), v.ok ? v.checks.filter((c) => !c.passed).map((c) => c.note).join(" ") : "failed");
    if (!v.ok) continue;
    const u = v.understanding;
    check(s, `"${e.label}": mock reads a move, gaps and quoted strengths`, u.move !== null && u.gaps.length >= 2 && u.strengths.every((x) => isVerbatim(x.quote, e.situation)));
    const prof = profileFromUnderstanding({ situation: e.situation, understanding: u, engine: "mock", hoursPerWeek: e.hoursPerWeek, budget: e.budget });
    if (!prof) continue;
    const r = fit(prof, undefined, { now: NOW });
    if (r.candidates.length < 2) continue;
    const input = buildAiInput(prof, r, r.candidates, { rulesTopId: r.candidates[0].id, adjust: defaultAdjust(prof) });
    const out = mockPickOutput(input);
    const rules = rulesDecision(prof, undefined, [], { now: NOW, fit: r });
    const names = Object.fromEntries(input.candidates.map((c) => [c.id, [c.title, ...c.modules.map((m) => m.name)]]));
    const vd = verify({ finishReason: "stop", output: out, candidates: r.candidates, exclude: [], rules, gaps: prof.gaps, mentioned: prof.mentioned, words: countWords(prof.situation), rulesTopId: r.candidates[0].id, engine: "mock", situation: prof.situation, names, mentionTitles: input.mentioned.map((m) => m.catalogTitle), templates: { whyThisOne: () => "t", useItAtWork: "t", gapNote: "t", vsRules: () => "t" } });
    check(s, `"${e.label}": mock pick passes the quotes check untouched`, vd.checks.find((c) => c.name === "quotes")?.passed === true, JSON.stringify(vd.checks.filter((c) => !c.passed)));
    check(s, `"${e.label}": mock pick passes every check untouched`, vd.checks.every((c) => c.passed), JSON.stringify(vd.checks.filter((c) => !c.passed)));
    const covOf = (id: string | null) => vd.decision.coverage.find((c) => c.id === id)?.score ?? 0;
    check(s, `"${e.label}": mock pick never covers less than the rules' pick`, vd.decision.engine === "mock" && covOf(vd.decision.pickId) >= covOf(r.candidates[0].id), `${vd.decision.pickId} ${covOf(vd.decision.pickId)} vs ${r.candidates[0].id} ${covOf(r.candidates[0].id)}`);
    check(s, `"${e.label}": mock comparison is filled only when the pick differs`, (vd.decision.pickId !== r.candidates[0].id) === vd.decision.vsRules.length > 0);
    mockDiffers += vd.decision.pickId !== r.candidates[0].id ? 1 : 0;
    check(s, `"${e.label}": mock coverage is from the mock`, vd.decision.coverage.every((c) => c.source === "mock"));
    if (/project management/i.test(e.situation) && prof.move === "product") {
      check(s, "CSM: the Project Management mention is a different direction", vd.decision.mentionedVerdicts.some((x) => x.verdict === "different-direction"), JSON.stringify(vd.decision.mentionedVerdicts));
    }
    const pickCourse = courseById(vd.decision.pickId as string) as Course;
    const cand = r.candidates.find((c) => c.id === vd.decision.pickId);
    const weeks = tailorWeeks({ course: pickCourse, n: cand?.moduleCount ?? 1, h: prof.hoursPerWeek, move: prof.move });
    const tOut = mockTailorOutput(buildTailorInput({ profile: prof, course: pickCourse, weeks }));
    const vt = verifyTailoring({ finishReason: "stop", output: tOut, weeks, artifactTemplate: MOVES[prof.move].artifact });
    check(s, `"${e.label}": mock tailoring gives one task per week`, vt.ok && vt.tasks.length === weeks.length && vt.tasks.every((t) => t.length <= 170 && !DASH.test(t)));
  }
  console.log(`  mock: picks differ from the rules for ${mockDiffers} of ${EXAMPLES.length} examples`);
  check(s, "the mock shows \"Rules alone would have picked\" for at least one example", mockDiffers >= 1, String(mockDiffers));
});

// AI paths with simulated failures and the mock (no key needed) -----------------------------

async function simulated(): Promise<void> {
  const s = "unit:ai-fallbacks";
  const p = personaWith(3);
  for (const [mode, reason] of [["length", "ai-invalid"], ["error", "ai-error"], ["timeout", "ai-timeout"]] as const) {
    await withEnv({ ASCEND_TEST_AI: mode, ASCEND_MOCK_AI: undefined }, async () => {
      const d = await aiDecide(p, NO_ADJUST, undefined, [], { noCache: true });
      check(s, `pick, ASCEND_TEST_AI=${mode}: the rules with ${reason}`, d.engine === "rules" && d.reason === reason && d.pickId !== null && d.coverage.length > 0, `${d.engine} ${d.reason}`);
      const u = await understandSituation(p.situation, { noCache: true });
      check(s, `understand, ASCEND_TEST_AI=${mode}: the rules reading with ${reason}`, u.engine === "rules" && u.reason === reason && u.understanding.role.length > 0, `${u.engine} ${u.reason}`);
      const course = courseById(fit(p, NO_ADJUST, { now: NOW }).candidates[0].id) as Course;
      const t = await tailorPlan({ profile: p, course, n: 1, h: p.hoursPerWeek, noCache: true });
      check(s, `tailor, ASCEND_TEST_AI=${mode}: templates with ${reason}`, t.engine === "rules" && t.reason === reason && t.tasks.length >= 1, `${t.engine} ${t.reason}`);
    });
  }
  await withEnv({ ASCEND_TEST_AI: "fake", ASCEND_MOCK_AI: undefined }, async () => {
    const fake = await aiDecide(p, NO_ADJUST, undefined, [], { noCache: true });
    check(s, "pick, fake: goes through the verifier and is fixed", fake.engine === "ai" && fake.checks.some((c) => !c.passed) && !DASH.test(fake.whyThisOne) && !NUMBER_UNIT_RE.test(fake.whyThisOne) && !NUMBER_UNIT_RE.test(fake.vsRules), fake.whyThisOne);
    check(s, "pick, fake: invented ids and modules are counted", fake.receipt.invalidIdsRemoved >= 1 && fake.receipt.invalidModulesRemoved >= 1, JSON.stringify(fake.receipt));
    check(s, "pick, fake: says what it sent", Boolean(fake.sent?.candidateIds.length) && Boolean(fake.sent?.input?.candidates[0]?.modules.length));
    check(s, "pick, fake: the model saw no hours or prices", !/"(hours|weeks|amount|price|costAtPace)"/.test(JSON.stringify(fake.sent?.input)));
    const u = await understandSituation(p.situation, { noCache: true });
    check(s, "understand, fake: the invented quote, gap and mention are removed", u.engine === "ai" && u.understanding.strengths.length === 1 && u.understanding.mentioned.length === 0 && u.understanding.hoursMentioned === null && u.understanding.baselineEvidence === "", JSON.stringify(u.understanding));
    const course = courseById(fit(p, NO_ADJUST, { now: NOW }).candidates[0].id) as Course;
    const n = Math.min(course.modules.length, 6);
    const t = await tailorPlan({ profile: p, course, n, h: 1, noCache: true });
    const W = tailorWeeks({ course, n, h: 1, move: p.move }).length;
    check(s, "tailor, fake: exactly W tasks, fixed", t.engine === "ai" && t.tasks.length === W && t.tasks.every((x) => !DASH.test(x) && !NUMBER_UNIT_RE.test(x)) && !t.tasks[0].includes('"Advanced Wizardry"'), JSON.stringify(t.tasks));
  });
  await withEnv({ ASCEND_TEST_AI: undefined, ASCEND_MOCK_AI: "1", ASCEND_MOCK_DELAY_MS: "0" }, async () => {
    if (HAS_KEY) return;
    const ex = EXAMPLES[1];
    const u = await understandSituation(ex.situation, { noCache: true });
    check(s, "mock mode: understand answers with engine mock", u.engine === "mock" && u.model === "mock");
    const prof = profileFromUnderstanding({ situation: ex.situation, understanding: u.understanding, engine: u.engine, hoursPerWeek: ex.hoursPerWeek, budget: ex.budget });
    if (prof) {
      check(s, "mock mode: the profile says the AI read it", prof.understoodBy === "ai");
      const d = await aiDecide(prof, undefined, undefined, [], { noCache: true });
      check(s, "mock mode: pick answers with engine mock", d.engine === "mock" || d.reason === "one-candidate", `${d.engine} ${d.reason}`);
    }
  });
  await withEnv({ ASCEND_TEST_AI: undefined, ASCEND_MOCK_AI: "1", NODE_ENV: "production" }, async () => {
    if (HAS_KEY) return;
    const u = await understandSituation(EXAMPLES[0].situation, { noCache: true });
    check(s, "mock mode never runs in production", u.engine === "rules" && u.reason === "no-key");
  });
  await withEnv({ ASCEND_TEST_AI: undefined, ASCEND_MOCK_AI: undefined }, async () => {
    if (HAS_KEY) return;
    const d = await aiDecide(p, NO_ADJUST, undefined, []);
    eq(s, "no key: pick returns the rules with no-key", [d.engine, d.reason], ["rules", "no-key"]);
    const u = await understandSituation(p.situation);
    eq(s, "no key: understand returns the rules reading with no-key", [u.engine, u.reason], ["rules", "no-key"]);
  });
}


// Review fixes (budget currency, scope tails, funnel, verifiers) ------------------------

const profileOf = (move: ProfileV2["move"], baseline: 0 | 1 | 2, h: ProfileV2["hoursPerWeek"], budget: Budget, extra: Partial<FitProfile> = {}): FitProfile => ({
  v: 2,
  currentRole: "Someone",
  move,
  baseline,
  hoursPerWeek: h,
  budget,
  ...extra,
});

section("unit:budget-currency", () => {
  const s = "unit:budget-currency";
  for (const cur of ["INR", "USD"] as const) {
    for (const b of ["low", "mid"] as const) {
      eq(s, `budget cap ${b} ${cur} comes from BUDGET_LIMIT`, budgetCap(b, cur), formatMoney(BUDGET_LIMIT[cur][b], cur));
      eq(s, `budget chip ${b} ${cur} names the same amount`, budgetLabel(b, cur), `Up to ${formatMoney(BUDGET_LIMIT[cur][b], cur)}`);
    }
  }
  let cases = 0;
  let over = 0;
  let wrongOut = 0;
  let roundedContradiction = 0;
  for (const m of availableMoves()) {
    for (const baseline of [0, 1, 2] as const) {
      for (const h of HOURS) {
        for (const b of ["low", "mid"] as const) {
          for (const cur of ["INR", "USD"] as const) {
            const p = profileOf(m.id, baseline, h, b);
            const r = fit(p, NO_ADJUST, { now: NOW, currency: cur, maxCandidates: Number.MAX_SAFE_INTEGER });
            cases++;
            const cap = BUDGET_LIMIT[cur][b];
            for (const c of r.candidates) {
              if (c.costAtPace && convert(c.costAtPace.amount, c.costAtPace.currency, cur) > cap) over++;
            }
            for (const x of r.ruledOut.filter((y) => y.reason === "over_budget")) {
              const c = courseById(x.id) as Course;
              const chk = checkCourse(p, NO_ADJUST, c, { now: NOW, currency: cur });
              if (chk.costAtPace && convert(chk.costAtPace.amount, chk.costAtPace.currency, cur) <= cap) wrongOut++;
              // the printed amount is never at or under the chip it is "over"
              const printed = Number((x.text.match(/[₹$]([\d,]+(?:\.\d+)?)/)?.[1] ?? "0").replace(/,/g, ""));
              if (printed <= cap) roundedContradiction++;
            }
          }
        }
      }
    }
  }
  check(s, `every candidate is at or under the chip amount, INR and USD (${cases} profiles)`, over === 0, String(over));
  check(s, "no course at or under the chip amount is ruled out as over budget", wrongOut === 0, String(wrongOut));
  check(s, "an over-budget line never prints an amount at or under the chip", roundedContradiction === 0, String(roundedContradiction));
  const agentic = courseById("deeplearning-ai-agentic-ai");
  if (agentic) {
    for (const h of [2, 3] as const) {
      const chk = checkCourse(profileOf("ai-build", 1, h, "low"), NO_ADJUST, agentic, { now: NOW, currency: "USD" });
      check(s, `Agentic AI at $60 fits "Up to $60" (${h} hrs)`, chk.reason !== "over_budget", chk.text);
    }
  }
  const lfs = courseById("lf-kubernetes-fundamentals-lfs258");
  if (lfs) {
    const chk = checkCourse(profileOf("cloud", 1, 8, "mid"), NO_ADJUST, lfs, { now: NOW, currency: "USD" });
    check(s, 'LFS258 at $299 fits "Up to $300"', chk.reason !== "over_budget", chk.text);
    eq(s, "the rupee limit for $300", budgetLimitInr("mid", "USD"), Math.round(300 * USD_INR.rate));
  }
});

section("unit:funnel-certificate", () => {
  const s = "unit:funnel-certificate";
  const p = profileOf("product", 0, 3, "low");
  const on = fit(p, { ...NO_ADJUST, certificate: true }, { now: NOW });
  const off = fit(p, NO_ADJUST, { now: NOW });
  eq(s, "the certificate doesn't change within budget", on.funnel.withinBudget, off.funnel.withinBudget);
  check(s, "with a certificate is its own stage", on.funnel.withCertificate !== undefined && funnelLine(on, p).includes("with a certificate"), funnelLine(on, p));
  check(s, "no certificate stage without the chip", off.funnel.withCertificate === undefined && !funnelLine(off, p).includes("with a certificate"));
});

section("unit:relaxations", () => {
  const s = "unit:relaxations";
  let mismatches = 0;
  let checked = 0;
  for (const persona of personas) {
    const p = persona.profile;
    if (!isAvailableMove(p.move)) continue;
    const d = rulesDecision(p, NO_ADJUST, [], { now: NOW });
    if (!d.pickId) continue;
    for (const chip of ["too-basic", "too-advanced"] as const) {
      const next = toggleChip({ adjust: NO_ADJUST, exclude: [] }, chip, d.pickId);
      const r = fit(p, next.adjust, { now: NOW, exclude: next.exclude });
      if (r.candidates.length > 0) continue;
      for (const rx of relaxations(p, next.adjust, { now: NOW, exclude: next.exclude })) {
        checked++;
        const relaxed = rx.kind === "hours" ? { ...p, hoursPerWeek: rx.hoursPerWeek } : { ...p, budget: rx.budget };
        const a = rx.kind === "budget" ? { ...next.adjust, cheaper: false } : next.adjust;
        const n = fit(relaxed, a, { now: NOW, exclude: next.exclude, maxCandidates: Number.MAX_SAFE_INTEGER }).candidates.length;
        if (n !== rx.count || n === 0) mismatches++;
      }
    }
  }
  // the reviewer's case: product, 1 hr, free; Too basic hides the pick
  const p = profileOf("product", 1, 1, "free");
  const d = rulesDecision(p, NO_ADJUST, [], { now: NOW });
  if (d.pickId) {
    const next = toggleChip({ adjust: NO_ADJUST, exclude: [] }, "too-basic", d.pickId);
    for (const rx of relaxations(p, next.adjust, { now: NOW, exclude: next.exclude })) {
      checked++;
      const relaxed = rx.kind === "hours" ? { ...p, hoursPerWeek: rx.hoursPerWeek } : { ...p, budget: rx.budget };
      const a = rx.kind === "budget" ? { ...next.adjust, cheaper: false } : next.adjust;
      if (fit(relaxed, a, { now: NOW, exclude: next.exclude }).candidates.length === 0) mismatches++;
    }
  }
  check(s, `a relaxation's count is what appears after the tap, never 0 (${checked} offered)`, mismatches === 0, String(mismatches));
  // level chips: the exclusion lasts only while the chip is on
  const on = toggleChip({ adjust: NO_ADJUST, exclude: ["repicked"] }, "too-basic", "pick-a");
  check(s, "Too basic hides the pick as a level exclusion", on.exclude.includes("pick-a") && on.levelExclude === "pick-a");
  const off = toggleChip(on, "too-basic", "pick-b");
  check(s, "turning it off brings the course back and keeps a re-pick's exclusion", !off.exclude.includes("pick-a") && off.exclude.includes("repicked") && off.levelExclude === undefined, JSON.stringify(off));
  const swapped = toggleChip(on, "too-advanced", "pick-b");
  check(s, "switching level chips swaps the hidden course", !swapped.exclude.includes("pick-a") && swapped.exclude.includes("pick-b") && swapped.levelExclude === "pick-b");
  const lvl0 = fit(profileOf("data", 0, 3, "any"), { ...NO_ADJUST, baselineShift: -1 }, { now: NOW });
  check(s, "Too advanced at the first starting point offers nothing a step up", lvl0.candidates.every((c) => c.baseline === 0), lvl0.candidates.map((c) => `${c.id}:${c.baseline}`).join(" "));
});

section("unit:scope-tail", () => {
  const s = "unit:scope-tail";
  const aws = courseById("aws-cloud-practitioner-essentials");
  if (aws) {
    const p = profileOf("cloud", 0, 12, "any", { gaps: ["cloud-basics"] });
    const r = fit(p, NO_ADJUST, { now: NOW });
    const at = r.candidates.findIndex((c) => c.id === aws.id);
    const cand = r.candidates[at];
    check(s, "a course whose whole outline fits is whole, beyond tail included", cand?.scope === "whole" && cand.scopeLabel === aws.title, JSON.stringify(cand?.scopeLabel));
    check(s, "and it ranks above every course that covers none of the gaps", at >= 0 && r.candidates.every((c, i) => c.coverageScore > 0 || i > at), r.candidates.map((c) => `${c.id}:${c.coverageScore}`).join(" "));
    const scope = scopeFor(aws, 100);
    if (scope) {
      const n = planN(aws, scope);
      eq(s, "planN counts the tail", n, aws.modules.length + 1);
      const built = buildWeeks({ course: aws, n, h: 12, s: "2026-10-21T15:00:00.000Z", move: "cloud" });
      const sum = built.weeks.reduce((a, w) => a + w.hours, 0);
      check(s, "a whole plan with a tail adds up to the total hours", built.whole && Math.abs(sum - totalHours(aws)) <= 0.02 && built.remainingHours === 0, `${sum} vs ${totalHours(aws)}`);
      check(s, "and lists the tail as its last item", built.weeks.at(-1)?.items.at(-1)?.name === aws.beyond?.label);
    }
    const legacy = scopeOfPrefix(aws, aws.modules.length);
    check(s, "an older link with n = listed modules stays a trimmed plan", !legacy.whole && legacy.moduleCount === aws.modules.length);
  }
  const sre = courseById("google-sre-book");
  if (sre) {
    const move = sre.moves[0];
    const short = checkCourse(profileOf(move.move, move.baseline, 12, "any"), { ...NO_ADJUST, shorter: true }, sre, { now: NOW });
    check(s, "SRE book at 12 hrs with Shorter stays trimmed at 12 modules", short.scope?.whole === false && short.scope.moduleCount === 12 && planN(sre, short.scope) === 12, JSON.stringify(short.scope));
  }
});

section("unit:skim-after-chip", () => {
  const s = "unit:skim-after-chip";
  let tested = 0;
  for (const persona of personas) {
    const p = persona.profile;
    if (!isAvailableMove(p.move)) continue;
    const base = fit(p, NO_ADJUST, { now: NOW });
    const short = fit(p, { ...NO_ADJUST, shorter: true }, { now: NOW });
    const kept = base.candidates.find((c) => {
      const after = short.candidates.find((x) => x.id === c.id);
      return after && after.moduleCount < c.moduleCount;
    });
    if (!kept) continue;
    const rules = rulesDecision(p, NO_ADJUST, [], { now: NOW, fit: base });
    const prev = { ...rules, engine: "ai" as const, origin: "pick" as const, pickId: kept.id, skim: [{ module: kept.moduleCount - 1, reason: "You know this." }] };
    const after = short.candidates.find((x) => x.id === kept.id);
    const res = adjustPick(prev, p, { ...NO_ADJUST, shorter: true }, [], { now: NOW });
    check(s, `${persona.id}: skim notes past a shorter scope are dropped`, res.response.pickId === kept.id && res.response.skim.every((x) => x.module < (after?.moduleCount ?? 0)), JSON.stringify(res.response.skim));
    tested++;
    if (tested >= 3) break;
  }
  check(s, "at least one persona keeps its pick with a shorter scope", tested > 0);
});

section("unit:receipt-after-chip", () => {
  const s = "unit:receipt-after-chip";
  // the AI mapped only the first two candidates; a chip that keeps its pick
  // must not count a course keywords matched as the AI's work
  let tested = 0;
  for (const persona of personas) {
    const p = persona.profile;
    if (!isAvailableMove(p.move)) continue;
    const base = fit(p, NO_ADJUST, { now: NOW });
    if (base.candidates.length < 3) continue;
    const rules = rulesDecision(p, NO_ADJUST, [], { now: NOW, fit: base });
    const seen = base.candidates.slice(0, 2);
    const aiCoverage = rules.coverage.filter((c) => seen.some((x) => x.id === c.id)).map((c) => ({ ...c, source: "ai" as const }));
    const prev = { ...rules, engine: "ai" as const, origin: "pick" as const, pickId: seen[0].id, coverage: aiCoverage };
    const res = adjustPick(prev, p, NO_ADJUST, [], { now: NOW });
    const aiStill = res.response.coverage.filter((c) => c.source === "ai");
    check(s, `${persona.id}: the receipt counts only courses the AI mapped`, res.response.receipt.courses === aiStill.length && aiStill.length <= 2, `${res.response.receipt.courses} vs ${aiStill.length}`);
    tested++;
    if (tested >= 3) break;
  }
  check(s, "at least one persona has three candidates", tested > 0);
});

section("unit:understood-by", () => {
  const s = "unit:understood-by";
  const situation = "Customer success manager, 3 years. I log feature requests and want to move into product.";
  const product = skillsFor("product").map((x) => x.id) as SkillId[];
  const data = skillsFor("data").map((x) => x.id) as SkillId[];
  const u: Understanding = { ...rulesUnderstanding(situation), move: "product", gaps: product.slice(0, 3).map((id) => ({ id, reason: "" })) };
  const make = (understanding: Understanding, edits?: Parameters<typeof profileFromUnderstanding>[0]["edits"]) =>
    profileFromUnderstanding({ situation, understanding, engine: "ai", hoursPerWeek: 3, budget: "free", edits })?.understoodBy;
  eq(s, "the AI's reading unchanged is the AI's", make(u), "ai");
  eq(s, "the AI's gaps reordered are still the AI's", make(u, { gaps: [product[2], product[0], product[1]] }), "ai");
  eq(s, "one of the AI's gaps removed is still the AI's", make(u, { gaps: [product[0], product[1]] }), "ai");
  eq(s, "a gap the AI didn't name makes it the user's", make(u, { gaps: [...product.slice(0, 3), product[4]] }), "user");
  eq(s, "a new direction makes it the user's", make(u, { move: "data", gaps: data.slice(0, 3) }), "user");
  eq(s, "AI said none and the user picked everything", make({ ...u, move: null, gaps: [] }, { move: "data", gaps: data.slice(0, 3) }), "user");
});

section("unit:hours-text", () => {
  const s = "unit:hours-text";
  const cases: [string, number | null][] = [
    ["I spend 9 hours a day in Excel and can study maybe 2 hours a week.", 2],
    ["My commute is 2 hours each way, I can do 5 hours a week.", 5],
    ["I work 10 hours a day. Weekends I have three hours.", 3],
    ["I work 9 hours a day.", null],
    ["I have 3 hours a week.", 3],
    ["two hours", 2],
    ["5 hrs per week", 5],
    ["8+ hours a week", 8],
    ["4 hours on weekends", 4],
    ["I work 45 hours a week and can study 3 hours a week.", 3],
    ["Analyst at a bank, working 40 hours a week.", null],
    ["After work I have 3 hours a week.", 3],
  ];
  for (const [t, want] of cases) eq(s, `hours from "${t}"`, hoursFromText(t), want);
});

section("unit:numbers", () => {
  const s = "unit:numbers";
  for (const t of ["20 minutes", "30 mins", "a 6-week course", "a 2-hour slot", "a 30-minute call", "three weeks", "two months", "half an hour", "Spend an hour", "Rs 499", "INR 4,000", "USD 49", "rated 4.7", "4.8 stars", "4 of your 5 gaps"]) {
    check(s, `matches "${t}"`, NUMBER_UNIT_RE.test(t));
  }
  for (const t of ["once a week", "three sentences", "after a month", "this week's module", "Read “Module 6: Storage” first.", "Updated in 2025 for agents.", "List three ignored feature requests."]) {
    check(s, `ignores "${t}"`, !NUMBER_UNIT_RE.test(t));
  }
  const mine = "Customer success manager, 3 years. I log feature requests.";
  const said = "Your 3 years in customer success mean you already hear the problems first. Start there.";
  eq(s, "a figure the person wrote stays", cleanProse(said, 260, mine).text, said);
  eq(s, "a figure they didn't write goes", cleanProse(said, 260, "Customer success manager. I log feature requests.").text, "Start there.");
  check(s, "words for numbers count as theirs too", cleanProse("Three years of tickets is a real head start.", 260, mine).numbers === 0);
  // hype, but never a real module name
  check(s, "a real module name with a hype word is not hype", !hasHype('Skim "Chapter 8: Supercharged Ideation" first.') && cleanProse('Skim "Chapter 8: Supercharged Ideation" first.', 100).text.length > 0);
  check(s, "hype is still blanked", hasHype("This will supercharge your career.") && cleanProse("This will supercharge your career.", 100).text === "");
  // decimals and dotted names are not sentence ends
  eq(s, "a rating sentence goes whole, not as a fragment", cleanProse("Rated 4.7 by learners, it starts from zero. It suits you.", 260).text, "It suits you.");
  eq(s, "a 4.8 rating is caught", cleanProse("It has a 4.8 rating. It suits you.", 260).text, "It suits you.");
  eq(s, "Next.js stays whole", sentences("Build it in Next.js. Then ship it."), ["Build it in Next.js.", "Then ship it."]);
  for (const t of ["Covers 3 of 5 gaps", "49 dollars", "A 4.9 average", "It has 120 reviews"]) check(s, `matches "${t}"`, NUMBER_UNIT_RE.test(t));
  const badNames = COURSES.flatMap((c) => c.modules.map((m) => m.name).filter((m) => !cleanProse(`Use "${m}" this week.`, 300).text.includes(m)));
  check(s, "every catalog module name survives the text rules when quoted", badNames.length === 0, badNames.join(" | "));
  check(s, "a cut never lands inside a decimal", cutToCap("Rated well. It is 4.7 good and more text here", 16) === "Rated well.");
  check(s, "flattery counts as hype", hasHype("This comprehensive course is the perfect next step."));
  check(s, "no catalog module name or title reads as hype", COURSES.every((c) => [c.title, ...c.modules.map((m) => m.name)].every((n) => !hasHype(n))));
});

section("unit:pick-quotes", () => {
  const s = "unit:pick-quotes";
  const ex = EXAMPLES.find((e) => /product/i.test(e.label)) ?? EXAMPLES[1];
  const p = normalizeProfile({ v: 2, currentRole: "Customer success manager", move: "product", baseline: 0, hoursPerWeek: 5, budget: "any", situation: ex.situation, gaps: skillsFor("product").slice(0, 3).map((x) => x.id) as SkillId[] });
  const r = fit(p, NO_ADJUST, { now: NOW });
  if (r.candidates.length < 2) return;
  const ids = r.candidates.map((c) => c.id);
  const input = buildAiInput(p, r, r.candidates, { rulesTopId: ids[0], adjust: NO_ADJUST });
  const names = Object.fromEntries(input.candidates.map((c) => [c.id, [c.title, ...c.modules.map((m) => m.name)]]));
  const rules = rulesDecision(p, NO_ADJUST, [], { now: NOW, fit: r });
  const tmpl = { whyThisOne: () => "Template why.", useItAtWork: "Template work.", gapNote: "t", vsRules: () => "Template vs." };
  const run = (o: Record<string, unknown>) =>
    verify({ finishReason: "stop", output: { coverage: [], pickId: ids[1], alternateIds: [], whyThisOne: "It fits.", vsRules: "", skim: [], mentionedVerdicts: [], useItAtWork: "Do it.", honestFit: "ok", gapNote: "", ...o }, candidates: r.candidates, exclude: [], rules, gaps: p.gaps, mentioned: p.mentioned, words: countWords(p.situation), rulesTopId: ids[0], situation: p.situation, names, templates: tmpl });
  const invented = run({ whyThisOne: "“Chapter 7: Writing the Product Spec” closes your first gap. It fits." });
  check(s, "an invented quoted module swaps the field for the template", invented.decision.whyThisOne === "Template why." && invented.decision.receipt.invalidModulesRemoved >= 1 && invented.checks.some((c) => c.name === "quotes" && !c.passed));
  const para = run({ whyThisOne: 'It suits someone who wants "to become a product manager". It fits.' });
  check(s, "a paraphrase of their words loses its quote marks, keeps its words", para.decision.whyThisOne === "It suits someone who wants to become a product manager. It fits.", para.decision.whyThisOne);
  const saidQuote = run({ whyThisOne: 'You said "I want to become a product manager". It fits.' });
  check(s, "a 'you said' quote they never wrote goes", saidQuote.decision.whyThisOne === "It fits.", saidQuote.decision.whyThisOne);
  const preset = run({ vsRules: "You said you haven't owned a roadmap, so this starts lower." });
  check(s, "the preset starting level is never repeated as their words", !/roadmap/i.test(preset.decision.vsRules) && preset.checks.some((c) => c.name === "quotes" && !c.passed), preset.decision.vsRules);
  const theirs = run({ whyThisOne: "You said you log feature requests that mostly get ignored. It fits." });
  check(s, "a 'you said' that repeats their words stays", theirs.decision.whyThisOne.startsWith("You said you log feature requests"), theirs.decision.whyThisOne);
  const relative = run({ whyThisOne: "The certificate you mentioned covers scheduling and budgets. It fits." });
  check(s, "'the course you mentioned covers...' is about the course, so it stays", relative.decision.whyThisOne.startsWith("The certificate you mentioned covers"), relative.decision.whyThisOne);
  const since = run({ vsRules: "Since you said you work near PMs, it starts higher." });
  check(s, "'Since you said ...' is checked against their words", !/work near PMs/i.test(since.decision.vsRules), since.decision.vsRules);
  const later = skillLabel(p.gaps[2]).toLowerCase();
  const wrongFirst = run({ whyThisOne: `It closes your ${later} gap first. It fits.` });
  check(s, "whyThisOne never calls a later gap their first", !wrongFirst.decision.whyThisOne.toLowerCase().includes(later) && wrongFirst.checks.some((c) => c.name === "first gap" && !c.passed), wrongFirst.decision.whyThisOne);
  const firstLabel = skillLabel(p.gaps[0]);
  const long = run({ whyThisOne: `It starts from the work you described and walks through every step of the job in order, with plenty of practice along the way and clear examples from real teams. It closes ${firstLabel.toLowerCase()} directly with a worked exercise you can reuse at work.` });
  check(s, "a long whyThisOne keeps the sentence that names their first gap", long.decision.whyThisOne.toLowerCase().includes(firstLabel.toLowerCase()) && long.decision.whyThisOne.length <= 260, long.decision.whyThisOne);
  const realModule = names[ids[1]][1];
  const real = run({ whyThisOne: `“${realModule}” is the place to start. You said "I want to move into product".` });
  check(s, "a real in-scope module and a verbatim quote keep their quote marks", real.decision.whyThisOne.includes(`“${realModule}”`) && real.decision.whyThisOne.includes('"I want to move into product"'), real.decision.whyThisOne);
  const vs = run({ vsRules: "It teaches “Habit 5: Roadmaps That Stick”, which the other doesn't." });
  check(s, "an invented module in vsRules is caught", vs.decision.vsRules !== "It teaches “Habit 5: Roadmaps That Stick”, which the other doesn't." && vs.decision.receipt.invalidModulesRemoved >= 1, vs.decision.vsRules);
  const numbered = run({ useItAtWork: "Use Module 42 on one ticket this week." });
  check(s, "a numbered module that isn't in scope is caught unquoted", numbered.decision.useItAtWork === "Template work.");
});

section("unit:understand-backed", () => {
  const s = "unit:understand-backed";
  const situation = EXAMPLES.find((e) => /HR/.test(e.label))?.situation ?? EXAMPLES[2].situation;
  const moves = availableMoves().map((m) => m.id);
  const base = {
    role: "HR generalist, 4 years",
    move: "data",
    moveWhy: "Four years in HR and you want to stop guessing.",
    baseline: "0",
    baselineEvidence: "",
    strengths: [{ label: "Excel", quote: "I live in Excel" }],
    gaps: [{ id: "sql", reason: "You want attrition answers." }, { id: "dashboards", reason: "To show them." }],
    mentioned: [],
    wantsCertificate: false,
    prefersFormat: "any",
    hoursMentioned: null,
  };
  const run = (o: Record<string, unknown>, sit = situation) => {
    const v = verifyUnderstanding({ finishReason: "stop", output: { ...base, ...o }, situation: sit, moves });
    if (!v.ok) throw new Error("verifier failed");
    return v.understanding;
  };
  eq(s, "a role clause with a number they didn't write goes", run({ role: "HR generalist, 7 years, Fortune 500" }).role, "HR generalist");
  eq(s, "a role with their own number stays", run({}).role, "HR generalist, 4 years");
  eq(s, "moveWhy with an invented number goes", run({ moveWhy: "You have run 12 attrition studies. You want to stop guessing." }).moveWhy, "You want to stop guessing.");
  eq(s, "moveWhy with their own number stays", run({}).moveWhy, base.moveWhy);
  check(s, "a strength from a negated clause is dropped", run({ strengths: [{ label: "SQL", quote: "written SQL" }] }).strengths.length === 0);
  check(s, "a strength label with an invented number is dropped", run({ strengths: [{ label: "10 years of Excel", quote: "I live in Excel" }] }).strengths.length === 0);
  check(s, "a real strength stays", run({}).strengths.length === 1);
  check(s, "an invented quote in a gap reason loses its quote marks", !run({ gaps: [{ id: "sql", reason: 'You said "I can\'t stand guessing".' }, { id: "dashboards", reason: "x" }] }).gaps[0].reason.includes('"'));
  eq(s, "years are not hours", run({ hoursMentioned: 4 }).hoursMentioned, null);
  eq(s, "either end of a range of hours is theirs", run({ hoursMentioned: 4 }, "I can do 3 or 4 hours a week. I live in Excel.").hoursMentioned, 4);
  // mention links checked against code
  const linkOf = (text: string, courseId: string, sit: string) =>
    (verifyUnderstanding({ finishReason: "stop", output: { ...base, mentioned: [{ text, courseId, status: "considering" }] }, situation: sit, moves }) as { ok: true; understanding: Understanding }).understanding.mentioned[0]?.courseId ?? null;
  eq(s, "Google Project Management linked to another Google course is unlinked", linkOf("Google Project Management certificate", "google-ux-design-certificate", "I started the Google Project Management certificate and dropped it."), null);
  eq(s, "Google Data Analytics linked to UX is relinked by code", linkOf("Google Data Analytics certificate", "google-ux-design-certificate", "Someone suggested the Google Data Analytics certificate."), "google-data-analytics");
  eq(s, "Kaggle SQL course keeps its link", linkOf("Kaggle SQL course", "kaggle-intro-to-sql", "I did the Kaggle SQL course."), "kaggle-intro-to-sql");
  eq(s, "Andrew Ng's ML course keeps its link", linkOf("Andrew Ng's ML course", "coursera-machine-learning-specialization", "I have Andrew Ng's ML course open."), "coursera-machine-learning-specialization");
  eq(s, "the UX cert from Google keeps its link", linkOf("the UX cert from Google", "google-ux-design-certificate", "Thinking about the UX cert from Google."), "google-ux-design-certificate");
  eq(s, "Kaggle Python course linked to Intro to SQL is unlinked", linkOf("Kaggle Python course", "kaggle-intro-to-sql", "I did the Kaggle Python course."), null);
  eq(s, "Microsoft Excel course linked to Power BI is unlinked", linkOf("Microsoft Excel course", "microsoft-learn-power-bi-pl-300", "I did a Microsoft Excel course."), null);
});

section("unit:tailor-numbers", () => {
  const s = "unit:tailor-numbers";
  const course = COURSES.find((c) => c.modules.length >= 4 && /^Chapter \d+: /.test(c.modules[1].name)) ?? COURSES[0];
  const weeks = tailorWeeks({ course, n: course.modules.length, h: 1, move: course.moves[0].move });
  const out = { weeks: weeks.map((w) => ({ k: w.k, task: `Set aside 20 minutes for it. Then write one note for your lead.` })), artifact: "A short note." };
  const v = verifyTailoring({ finishReason: "stop", output: out, weeks, artifactTemplate: "x" });
  check(s, "a task's minutes sentence goes and is counted", v.ok && v.tasks[0] === "Then write one note for your lead." && v.counts.numbersRemoved >= weeks.length, v.ok ? v.tasks[0] : "");
  const own = weeks[0].items[0].name;
  const bare = own.replace(/^(introduction and )?(chapter|module|part|habit|week|lesson|unit)\s*\d+\s*:\s*/i, "");
  if (bare !== own && bare.split(/\s+/).length >= 2) {
    const q = verifyTailoring({ finishReason: "stop", output: { weeks: [{ k: 1, task: `Try “${bare}” on one real case.` }], artifact: "" }, weeks, artifactTemplate: "x" });
    check(s, "a module quoted without its Chapter prefix keeps its quotes", q.ok && q.tasks[0].includes(`“${bare}”`) && q.checks.find((c) => c.name === "quotes")?.passed === true, q.ok ? q.tasks[0] : "");
  }
});

section("unit:catalog-rules", () => {
  const s = "unit:catalog-rules";
  const problems = catalogDataProblems(COURSES);
  check(s, "Coursera prices are stored for India and Python prerequisites are tagged", problems.length === 0, problems.join(" | "));
  const gdm = courseById("coursera-google-digital-marketing-ecommerce");
  if (gdm) {
    const chk = checkCourse(profileOf("growth", 0, 2, "low"), NO_ADJUST, gdm, { now: NOW, currency: "INR" });
    check(s, "Google Digital Marketing fits Up to ₹5,000 at 2 hrs like the other Google certificates", chk.reason !== "over_budget", chk.text);
  }
});

section("unit:skills-precision", () => {
  const s = "unit:skills-precision";
  eq(s, "Pandas' Indexing, Selecting & Assigning is not SQL", keywordCoverage({ modules: [{ name: "Indexing, Selecting & Assigning", hours: 1 }] }, ["sql"]).length, 0);
  const pandas = courseById("kaggle-pandas");
  if (pandas) check(s, "Kaggle Pandas has no SQL coverage", keywordCoverage(pandas, ["sql", "sql-advanced"]).length === 0);
  const sql = courseById("kaggle-intro-to-sql");
  if (sql) {
    const i = sql.modules.findIndex((m) => m.name === "Select, From & Where");
    check(s, "Intro to SQL still covers Select, From & Where", i >= 0 && (keywordCoverage(sql, ["sql"])[0]?.modules ?? []).includes(i));
  }
  const tableau = courseById("trailhead-tableau-public-storytelling");
  if (tableau) {
    const cov = keywordCoverage(tableau, ["dashboards", "statistics"]);
    eq(s, "Tableau's dashboards row lists only Data Presentation", (cov.find((g) => g.gap === 0)?.modules ?? []).map((i) => tableau.modules[i].name), ["Data Presentation in Tableau"]);
    check(s, "Tableau has no statistics coverage", !cov.some((g) => g.gap === 1));
  }
  const pbi = courseById("microsoft-learn-power-bi-pl-300");
  if (pbi) check(s, "Power BI still covers dashboards directly", keywordCoverage(pbi, ["dashboards"])[0]?.depth === "direct");
  const quizHits = COURSES.flatMap((c) => keywordCoverage(c, skillsFor(c.moves[0].move).map((x) => x.id)).flatMap((g) => g.modules.map((i) => c.modules[i].name))).filter((n) => /\bquiz$/i.test(n.trim()));
  check(s, "no quiz module is mapped to a gap", quizHits.length === 0, quizHits.join(", "));
});

section("unit:links-and-dates", () => {
  const s = "unit:links-and-dates";
  eq(s, "a cut task drops a dangling comma", shortenTask("Pull last month's renewal list, compute the churn rate and share it with your team lead today", 34), "Pull last month's renewal list.");
  check(s, "a cut task never ends with a joiner", !/\b(and|then|for|to|with),?\.$/.test(shortenTask("Compare segment 1 with segment 2, then write it up for your manager this week", 36)), shortenTask("Compare segment 1 with segment 2, then write it up for your manager this week", 36));
  const course = COURSES.find((c) => c.modules.length >= 6 && !c.beyond) ?? COURSES[0];
  const plan = createPlan({ course, n: course.modules.length, h: 1, m: course.moves[0].move, b: 0, role: "x", commitAt: new Date("2026-10-20T10:00:00Z"), s: new Date("2026-10-21T15:00:00Z"), o: "tired", e: "ai" });
  const once = restartFrom(plan, 2, "2026-11-02");
  const twice = restartFrom(once, 3, "2026-11-16");
  const built = buildWeeks({ course, n: twice.n, h: 1, s: twice.s, move: twice.m, rs: twice.rs });
  if (built.weeks.length >= 3) {
    eq(s, "a second restart keeps the weeks the first one moved", built.weeks[1].start, "2026-11-02");
    eq(s, "and moves the later weeks", built.weeks[2].start, "2026-11-16");
  }
  const forged = toPlanPayload({ ...plan, tw: ["Visit https://example.com today.", "Pay ₹999 now.", "Use the first module on one ticket."], te: "ai", tm: "gemini-2.5-flash" });
  check(s, "a link's task with a URL or a price shows its template", forged !== null && (forged.tf ?? []).includes(1) && (forged.tf ?? []).includes(2) && !(forged.tf ?? []).includes(3), JSON.stringify(forged?.tf));
  const allBad = toPlanPayload({ ...plan, tw: ["Pay ₹999 now."], te: "ai", tm: "gemini-2.5-flash" });
  check(s, "with nothing tailored left the link stops naming a model", allBad !== null && allBad.te === "rules" && !allBad.tm && !allBad.tw);
  const ics = buildIcs({ plan, course, planLink: "https://ascendmvp.vercel.app/plan#p=z.abc", firstStep: "Open it", now: new Date("2026-10-20T10:00:00Z") });
  const starts = [...ics.matchAll(/DTSTART:(\d{8}T\d{6}Z)/g)].map((m) => m[1]);
  const first = new Date(plan.s);
  const check14 = new Date(first.getFullYear(), first.getMonth(), first.getDate() + 14, first.getHours(), first.getMinutes());
  const z = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  eq(s, "the two-week check is 14 calendar days later at the same local time", starts[2], z(check14));
  check(s, "events carry a sequence for reschedules", ics.includes("SEQUENCE:0"));
  const v1 = { profile: { currentRole: "Analyst", experience: "1-3", goal: "switch-field", level: "beginner", timePerWeek: "2-5", interests: ["ml-engineer", "data-analyst"] }, courseId: "google-data-analytics" };
  const conv = courseById("google-data-analytics") ? legacyToV2(v1 as Parameters<typeof legacyToV2>[0], NOW) : null;
  if (conv) check(s, "a legacy link takes the interest whose move the course is in", conv.kind === "ok" && conv.plan.m === "data", conv.kind === "ok" ? conv.plan.m : conv.kind);
});

section("unit:decision-retry", () => {
  const s = "unit:decision-retry";
  const p = personaWith(2);
  const base = { ...rulesDecision(p, NO_ADJUST, [], { now: NOW, reason: "ai-error" }), origin: "pick" as const };
  const at = (ms: number) => new Date(Date.now() - ms).toISOString();
  check(s, "a rules answer after a failed AI call is a fallback", isAiFailedFallback(base));
  check(s, "a chosen one is not", !isAiFailedFallback({ ...base, chosenId: "x" }));
  check(s, "no-key is not", !isAiFailedFallback({ ...base, reason: "no-key" }));
  check(s, "an adjusted one is not", !isAiFailedFallback({ ...base, origin: "adjusted" }));
  const decision = { ...base, key: "k", profileKey: "p", funnel: fit(p, NO_ADJUST, { now: NOW }).funnel, ruledOut: [], adjust: NO_ADJUST, exclude: [], repicks: [], currency: "INR" as const, createdAt: at(120_000), updatedAt: at(0) };
  check(s, "it is asked again after a minute", shouldRetryAi(decision));
  check(s, "but not within the minute", !shouldRetryAi({ ...decision, createdAt: at(10_000) }));
});

async function guardChecks(): Promise<void> {
  await sectionAsync("unit:rate-limit", async () => {
    const s = "unit:rate-limit";
    await withEnv({ ASCEND_DEV_NO_RATE_LIMIT: undefined }, async () => {
      const p = personas[0].profile;
      const req = () =>
        new Request("http://localhost/api/pick", {
          method: "POST",
          headers: { "content-type": "application/json", "sec-fetch-site": "same-origin", "x-real-ip": "203.0.113.77" },
          body: JSON.stringify({ profile: p }),
        });
      let limitedAt = 0;
      for (let i = 1; i <= 12; i++) {
        const g = await guardRequest(req(), "eval-route", pickBodySchema);
        if (!g.ok) throw new Error("guard rejected a valid body");
        // pretend every other request is answered from the server cache: not charged
        if (i % 2 === 0) continue;
        if (g.spend() && !limitedAt) limitedAt = i;
      }
      check(s, "cached answers don't use up the limit (12 requests, 6 charged)", limitedAt === 0, String(limitedAt));
      let first429 = 0;
      for (let i = 1; i <= 6; i++) {
        const g = await guardRequest(req(), "eval-route", pickBodySchema);
        if (g.ok && g.spend() && !first429) first429 = i;
      }
      eq(s, "the 11th charged request gets 429", first429, 5);
      const bad = await guardRequest(new Request("http://localhost/api/pick", { method: "POST", headers: { "sec-fetch-site": "cross-site" }, body: "{}" }), "eval-route", pickBodySchema);
      check(s, "another site still gets 403", !bad.ok && bad.response.status === 403);
    });
  });
}

// The real Anthropic SDK, offline -------------------------------------------------
// A fake fetch stands in for the Claude API, so this checks what can be checked
// without a key: the SDK accepts each schema (enums included) and sends it as a
// structured-output format, the request carries low effort, the refusal
// fallback opt-in and no sampling parameters, and a well-formed reply parses
// and passes the verifier. Whether Claude itself accepts the schema shows in the
// live run below (with a key).

/** Walks a path of keys through parsed JSON. */
function at(obj: unknown, ...path: string[]): unknown {
  return path.reduce<unknown>((x, k) => (x && typeof x === "object" ? (x as Record<string, unknown>)[k] : undefined), obj);
}

function findKey(obj: unknown, key: string): unknown {
  if (!obj || typeof obj !== "object") return undefined;
  if (key in (obj as Record<string, unknown>)) return (obj as Record<string, unknown>)[key];
  for (const v of Object.values(obj as Record<string, unknown>)) {
    const hit = findKey(v, key);
    if (hit !== undefined) return hit;
  }
  return undefined;
}

/** Follows a local "#/$defs/x" reference against the root schema. */
function deref(node: unknown, root: unknown): unknown {
  const ref = node && typeof node === "object" ? (node as { $ref?: unknown }).$ref : undefined;
  if (typeof ref !== "string" || !ref.startsWith("#/$defs/")) return node;
  return at(root, "$defs", ref.slice("#/$defs/".length));
}

/** The enum list under a property name (at any depth below `node`), following $refs into the root's $defs. */
function enumUnder(node: unknown, prop: string, root: unknown): unknown[] | undefined {
  let target = deref(findKey(node, prop), root);
  for (let i = 0; i < 4 && target && typeof target === "object"; i++) {
    const e = (target as { enum?: unknown }).enum;
    if (Array.isArray(e)) return e;
    const items = (target as { items?: unknown }).items;
    if (items === undefined) break;
    target = deref(items, root);
  }
  return undefined;
}

function mentionsAndAlternates(): void {
  section("unit:mentions-alternates", () => {
    const s = "unit:mentions-alternates";
    const pandas = courseById("kaggle-pandas");
    const sql = courseById("kaggle-intro-to-sql");
    const pmReforge = courseById("reforge-mastering-product-management");
    check(s, "catalog has the test courses", Boolean(pandas && sql && pmReforge));
    check(s, "'a pandas course' is the Pandas pick", mentionMatchesCourse("A colleague suggested a pandas course", pandas));
    check(s, "'an SQL course' is Intro to SQL", mentionMatchesCourse("an SQL course", sql));
    check(s, "project management is not Mastering Product Management", !mentionMatchesCourse("Google Project Management certificate", pmReforge));
    check(s, "a data analytics certificate is not Intro to SQL", !mentionMatchesCourse("Google Data Analytics certificate", sql));
    check(s, "no course, no match", !mentionMatchesCourse("a pandas course", null));

    // alternates have to close at least one gap
    const prof = personaWith(4);
    const r = fit(prof, NO_ADJUST, { now: NOW });
    const [pick, a1, a2, a3] = r.candidates;
    const cov = (id: string, covered: number) => ({ id, source: "ai" as const, gaps: [], covered, score: covered });
    const coverage = r.candidates.map((c) => cov(c.id, c.id === pick.id ? 2 : c.id === a2.id || c.id === a3.id ? 1 : 0));
    const alts = [{ id: a1.id, insteadIf: "x" }, { id: a2.id, insteadIf: "y" }];
    const out = usefulAlternates(pick, alts, r.candidates, coverage, 3);
    check(s, "an alternate that closes no gap is replaced", !out.some((a) => a.id === a1.id) && out.some((a) => a.id === a2.id), JSON.stringify(out.map((a) => a.id)));
    check(s, "the replacement closes a gap", out.every((a) => coverage.find((c) => c.id === a.id)!.covered > 0) && out.length === 2);
    const none = usefulAlternates(pick, alts, r.candidates, r.candidates.map((c) => cov(c.id, c.id === pick.id ? 1 : 0)), 3);
    check(s, "never padded with alternates that close none", none.length === 0);
    const noGaps = usefulAlternates(pick, alts, r.candidates, coverage, 0);
    check(s, "with no gaps the alternates stay as they were", JSON.stringify(noGaps) === JSON.stringify(alts));
    const kw = (id: string, covered: number) => ({ id, source: "keywords" as const, gaps: [], covered, score: covered });
    const kwOut = usefulAlternates(pick, alts, r.candidates, [kw(pick.id, 1), kw(a1.id, 0), kw(a2.id, 0)], 3);
    check(s, "a zero from keywords never removes an alternate", JSON.stringify(kwOut) === JSON.stringify(alts));
  });
}

function landingRunNamesRealModules(): void {
  section("unit:landing-run", () => {
    const s = "unit:landing-run";
    const c = courseById(JOB_RUN.courseId);
    check(s, "the landing's example course is in the catalog", Boolean(c));
    const names = c ? c.modules.map((m) => m.name) : [];
    check(s, "the matched module is one of its real modules", names.includes(JOB_RUN.match.module), JOB_RUN.match.module);
    check(s, "the task's module is one of its real modules", names.includes(JOB_RUN.task.module), JOB_RUN.task.module);
    check(s, "the course name shown is that course", Boolean(c && c.title.startsWith(JOB_RUN.match.course)));
    const all = JSON.stringify(JOB_RUN);
    check(s, "no dashes in the recorded lines", !/[\u2013\u2014]/.test(all));
  });
}

async function anthropicWire(): Promise<void> {
  await sectionAsync("unit:anthropic-wire", async () => {
    const s = "unit:anthropic-wire";
    const bodies: unknown[] = [];
    const headers: Headers[] = [];
    let reply = "{}";
    let stop = "end_turn";
    let content: unknown[] | null = null;
    let iterations: unknown[] | null = null;
    const fakeFetch = async (_url: RequestInfo | URL, init?: RequestInit) => {
      bodies.push(JSON.parse(String(init?.body ?? "{}")));
      headers.push(new Headers(init?.headers));
      return new Response(
        JSON.stringify({
          id: "msg_offline",
          type: "message",
          role: "assistant",
          model: "claude-opus-5-5",
          content: content ?? [{ type: "text", text: reply }],
          stop_reason: stop,
          stop_sequence: null,
          usage: { input_tokens: 1, output_tokens: 1, ...(iterations ? { iterations } : {}) },
        }),
        { status: 200, headers: { "content-type": "application/json" } },
      );
    };
    const client = new Anthropic({ apiKey: "offline-test", fetch: fakeFetch as typeof fetch, maxRetries: 0 });
    const call = <S extends Parameters<typeof structuredCall>[0]["schema"]>(system: string, prompt: string, schema: S) =>
      structuredCall({ system, prompt, schema, maxTokens: 4000, timeoutMs: 5000, client });
    const moves = availableMoves().map((m) => m.id);
    const ex = EXAMPLES[1];

    // Job 1
    reply = JSON.stringify(mockUnderstandOutput(ex.situation, moves));
    const u = await call(UNDERSTAND_SYSTEM, JSON.stringify(buildUnderstandInput(ex.situation, moves)), understandOutputSchema(moves));
    const uBody = bodies.at(-1);
    const uSchema = at(uBody, "output_config", "format", "schema");
    check(s, "understand: the SDK sends a JSON schema format", at(uBody, "output_config", "format", "type") === "json_schema" && Boolean(uSchema));
    check(s, "understand: move is an enum of covered moves plus none", JSON.stringify([...(enumUnder(at(uSchema, "properties"), "move", uSchema) ?? [])].sort()) === JSON.stringify(["none", ...moves].sort()));
    check(s, "understand: gaps are an enum of the whole vocabulary", enumUnder(deref(at(uSchema, "properties", "gaps", "items"), uSchema), "id", uSchema)?.length === ALL_SKILL_IDS.length);
    check(s, "understand: course ids are an enum of the catalog plus none", enumUnder(deref(at(uSchema, "properties", "mentioned", "items"), uSchema), "courseId", uSchema)?.length === COURSES.length + 1);
    eq(s, "understand: effort is low", at(uBody, "output_config", "effort"), "low");
    eq(s, "understand: the model is the configured one", at(uBody, "model"), MODEL);
    check(s, "understand: no sampling parameters (rejected by Claude Opus 5.5)", findKey(uBody, "temperature") === undefined && findKey(uBody, "top_p") === undefined);
    check(s, "understand: thinking is left to the model (not disabled)", findKey(uBody, "thinking") === undefined);
    if (!/haiku/.test(MODEL)) {
      eq(s, "understand: refusal fallback opted in", at(uBody, "fallbacks"), "default");
      check(s, "understand: the fallback beta header is sent", (headers.at(-1)?.get("anthropic-beta") ?? "").includes("server-side-fallback-2026-07-01"));
    }
    const uv = verifyUnderstanding({ finishReason: u.finishReason, output: u.output, situation: ex.situation, moves });
    check(s, "understand: the parsed reply passes the verifier", u.finishReason === "stop" && uv.ok);

    // Jobs 2 and 3
    const prof = uv.ok ? profileFromUnderstanding({ situation: ex.situation, understanding: uv.understanding, engine: "ai", hoursPerWeek: 3, budget: "any" }) : null;
    check(s, "understand: the reply makes a profile", Boolean(prof));
    if (prof) {
      const r = fit(prof, undefined, { now: NOW });
      const ids = r.candidates.map((c) => c.id) as [string, ...string[]];
      const input = buildAiInput(prof, r, r.candidates, { rulesTopId: ids[0], adjust: defaultAdjust(prof) });
      reply = JSON.stringify(mockPickOutput(input));
      const pRes = await call(SYSTEM, JSON.stringify(input), pickOutputSchema(ids));
      const pSchema = at(bodies.at(-1), "output_config", "format", "schema");
      check(s, "pick: pickId is an enum of exactly the candidates", JSON.stringify(enumUnder(at(pSchema, "properties"), "pickId", pSchema)) === JSON.stringify(ids));
      check(s, "pick: coverage ids are the same enum", JSON.stringify(enumUnder(deref(at(pSchema, "properties", "coverage", "items"), pSchema), "id", pSchema)) === JSON.stringify(ids));
      check(s, "pick: the prompt carries no hours or prices", !/"(hours|weeks|amount|costAtPace|price)"/.test(JSON.stringify(findKey(bodies.at(-1), "messages"))));
      const rules = rulesDecision(prof, undefined, [], { now: NOW, fit: r });
      const pv = verify({ finishReason: pRes.finishReason, output: pRes.output, candidates: r.candidates, exclude: [], rules, gaps: prof.gaps, mentioned: prof.mentioned, words: countWords(prof.situation), rulesTopId: ids[0], templates: { whyThisOne: () => "t", useItAtWork: "t", gapNote: "t", vsRules: () => "t" } });
      check(s, "pick: the parsed reply passes the verifier", pRes.finishReason === "stop" && pv.decision.engine === "ai", pv.decision.reason);

      // Job 4
      const course = courseById(pv.decision.pickId ?? ids[0]) as Course;
      const cand = r.candidates.find((c) => c.id === course.id);
      const weeks = tailorWeeks({ course, n: cand?.moduleCount ?? 1, h: 3, move: prof.move });
      reply = JSON.stringify(mockTailorOutput(buildTailorInput({ profile: prof, course, weeks })));
      const tRes = await call(TAILOR_SYSTEM, JSON.stringify(buildTailorInput({ profile: prof, course, weeks })), tailorOutputSchema);
      const tv = verifyTailoring({ finishReason: tRes.finishReason, output: tRes.output, weeks, artifactTemplate: MOVES[prof.move].artifact });
      check(s, "tailor: the parsed reply passes the verifier with W tasks", tv.ok && tv.tasks.length === weeks.length);

      // a turn the server-side fallback served: only the text after the
      // hand-over is the answer, and the model named is the one that wrote it
      const usageOf = (type: string, model?: string) => ({ type, ...(model ? { model } : {}), input_tokens: 1, output_tokens: 1, cache_creation: null, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 });
      content = [
        { type: "text", text: '{"pickId":' },
        { type: "fallback", from: { model: MODEL }, to: { model: "claude-opus-4-8" }, trigger: { type: "refusal" } },
        { type: "text", text: JSON.stringify(mockPickOutput(input)) },
      ];
      iterations = [usageOf("message"), usageOf("fallback_message", "claude-opus-4-8")];
      const fb = await call(SYSTEM, JSON.stringify(input), pickOutputSchema(ids));
      content = null;
      iterations = null;
      check(s, "a fallback-served answer names the model that wrote it and parses only its text", fb.model === "claude-opus-4-8" && fb.finishReason === "stop", `${fb.model} ${fb.finishReason}`);
      eq(s, "an ordinary answer names the model that answered", pRes.model, "claude-opus-5-5");

      // a cut-off reply and a refusal both come back as something other than "stop"
      reply = '{"pickId":"';
      stop = "max_tokens";
      const cut = await call(SYSTEM, "x", pickOutputSchema(ids));
      check(s, "a cut-off reply is not 'stop' (mapped to the rules by the verifier)", cut.finishReason !== "stop" && cut.output === undefined, cut.finishReason);
      reply = "";
      stop = "refusal";
      const refused = await call(SYSTEM, "x", pickOutputSchema(ids));
      check(s, "a refusal is not 'stop'", refused.finishReason !== "stop" && refused.output === undefined, refused.finishReason);
      reply = "not json at all";
      stop = "end_turn";
      const junk = await call(SYSTEM, "x", pickOutputSchema(ids));
      check(s, "an unparseable reply is 'invalid'", junk.finishReason === "invalid" && junk.output === undefined, junk.finishReason);
    }
  });
}

// Live AI (only with a key) -------------------------------------------------------------

type AiRun = {
  persona: string;
  understood: string | null;
  expected: string;
  engine: string;
  reason?: string;
  ms?: number;
  fixed: string[];
  pickId: string | null;
  rulesPickId: string | null;
  tailorEngine?: string;
};

let tailoredTasks = 0;
let specificTasks = 0;

async function live(): Promise<AiRun[]> {
  const runs: AiRun[] = [];
  if (!HAS_KEY) return runs;
  clearPickCache();
  clearUnderstandCache();
  clearTailorCache();
  const s = "ai:live";
  const pause = () => new Promise((res) => setTimeout(res, 6000));
  let first = true;
  for (const persona of personas) {
    const p = persona.profile;
    if (!isAvailableMove(p.move)) continue;
    if (!first) await pause();
    first = false;

    // Job 1: read the situation
    const u = await understandSituation(p.situation, { noCache: true });
    check(s, `${persona.id}: understand answered from the AI`, u.engine === "ai", `${u.engine} ${u.reason ?? ""}`);
    const quotes = [...u.understanding.strengths.map((x) => x.quote), ...(u.understanding.baselineEvidence ? [u.understanding.baselineEvidence] : []), ...u.understanding.mentioned.map((m) => m.text)];
    check(s, `${persona.id}: every surviving quote is verbatim`, quotes.every((q) => isVerbatim(q, p.situation)));

    // Job 2 and 3: match and choose
    const r = fit(p, NO_ADJUST, { now: NOW });
    let d: PickResponse | null = null;
    if (r.candidates.length >= 2) {
      d = await aiDecide(p, NO_ADJUST, undefined, [], { noCache: true });
      const ids = new Set(r.candidates.map((c) => c.id));
      check(s, `${persona.id}: ids in candidates`, d.pickId !== null && ids.has(d.pickId) && d.alternates.every((a) => ids.has(a.id)), `${d.engine} ${d.reason ?? ""}`);
      check(
        s,
        `${persona.id}: coverage indices valid`,
        d.coverage.every((c) => {
          const cand = r.candidates.find((x) => x.id === c.id);
          return cand && c.gaps.every((g) => g.gap < p.gaps.length && g.modules.every((m) => m < cand.moduleCount));
        }),
      );
      const prose = [d.whyThisOne, d.useItAtWork, d.gapNote, d.vsRules, ...d.skim.map((x) => x.reason), ...d.mentionedVerdicts.map((x) => x.reason)];
      const tmpl = [whyThisOneTemplate(courseById(d.pickId ?? "") as Course, p, NO_ADJUST, "INR"), atWorkTemplate(p)];
      check(s, `${persona.id}: no digit plus unit in AI prose`, prose.every((t) => tmpl.includes(t) || !NUMBER_UNIT_RE.test(t)), d.whyThisOne);
      check(s, `${persona.id}: no dashes`, prose.every((t) => !DASH.test(t)));
      await pause();
    }

    // CSM: the Google Project Management mention
    if (persona.id === "csm") {
      const prof = profileFromUnderstanding({ situation: p.situation, understanding: u.understanding, engine: u.engine, hoursPerWeek: p.hoursPerWeek, budget: p.budget });
      if (prof && prof.mentioned.some((m) => /project management/i.test(m.text))) {
        const dc = await aiDecide(prof, undefined, undefined, [], { noCache: true });
        const idx = prof.mentioned.findIndex((m) => /project management/i.test(m.text));
        const v = dc.mentionedVerdicts.find((x) => x.index === idx);
        check(s, "csm: Google Project Management gets different-direction or skip", v?.verdict === "different-direction" || v?.verdict === "skip", JSON.stringify(v));
        await pause();
      } else {
        check(s, "csm: the Google Project Management mention was read", false, JSON.stringify(u.understanding.mentioned));
      }
    }

    // Job 4: tailor
    let tailorEngine: string | undefined;
    if (d?.pickId) {
      const course = courseById(d.pickId) as Course;
      const cand = r.candidates.find((c) => c.id === d?.pickId);
      const t = await tailorPlan({ profile: p, course, n: cand?.moduleCount ?? 1, h: p.hoursPerWeek, skim: d.skim.map((x) => x.module), noCache: true });
      const W = tailorWeeks({ course, n: cand?.moduleCount ?? 1, h: p.hoursPerWeek, move: p.move }).length;
      check(s, `${persona.id}: tailor returns exactly W tasks`, t.tasks.length === W, `${t.engine} ${t.tasks.length} vs ${W}`);
      check(s, `${persona.id}: tailored tasks have no units or dashes`, t.tasks.every((x) => !NUMBER_UNIT_RE.test(x) && !DASH.test(x)));
      tailorEngine = t.engine;
      // specific tasks: quote one of that week's modules and share a word with their role or situation
      const builtWeeks = tailorWeeks({ course, n: cand?.moduleCount ?? 1, h: p.hoursPerWeek, move: p.move });
      const theirWords = new Set(`${p.currentRole} ${p.situation}`.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []);
      t.tasks.forEach((task, i) => {
        if (!t.tailored[i]) return;
        tailoredTasks++;
        const quotesModule = builtWeeks[i]?.items.some((it) => task.includes(`"${it.name}"`) || task.includes(`“${it.name}”`)) ?? false;
        const usesThem = (task.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []).some((w) => theirWords.has(w) && !["the", "and", "your", "with", "for", "this", "week", "work"].includes(w));
        if (quotesModule && usesThem) specificTasks++;
      });
    }

    runs.push({
      persona: persona.id,
      understood: u.understanding.move,
      expected: persona.expectedMove,
      engine: d?.engine ?? "none",
      reason: d?.reason,
      ms: d?.ms,
      fixed: d ? d.checks.filter((c) => !c.passed).map((c) => c.name) : [],
      pickId: d?.pickId ?? null,
      rulesPickId: d?.rulesPickId ?? null,
      tailorEngine,
    });
  }
  return runs;
}

async function main() {
  await planLinkChecks();
  await guardChecks();
  mentionsAndAlternates();
  landingRunNamesRealModules();
  await anthropicWire();
  await simulated();
  const aiRuns = await live();

  const failed = results.filter((r) => !r.pass);
  const passRate = results.length ? (results.length - failed.length) / results.length : 0;
  const bySection = new Map<string, { pass: number; fail: number }>();
  for (const r of results) {
    const key = r.section.split(":")[0];
    const v = bySection.get(key) ?? { pass: 0, fail: 0 };
    if (r.pass) v.pass++;
    else v.fail++;
    bySection.set(key, v);
  }
  const moveAccuracy = aiRuns.length ? aiRuns.filter((r) => r.understood === r.expected).length / aiRuns.length : null;
  const picked = aiRuns.filter((r) => r.engine === "ai" && r.pickId);
  const agreement = picked.length ? picked.filter((r) => r.pickId === r.rulesPickId).length / picked.length : null;

  writeFileSync(
    resolve(process.cwd(), "scripts/eval-results.json"),
    JSON.stringify(
      {
        ranAt: NOW.toISOString(),
        catalogVersion: CATALOG_VERSION,
        catalogEntries: COURSES.length,
        shippedMoves: availableMoves().map((m) => m.id),
        total: results.length,
        failed: failed.length,
        passRate,
        sections: Object.fromEntries(bySection),
        failures: failed,
        ai: aiRuns.length
          ? {
              runs: aiRuns,
              understandMoveAccuracy: moveAccuracy,
              aiRulesPickAgreement: agreement,
              medianMs: aiRuns.map((r) => r.ms ?? 0).sort((a, b) => a - b)[Math.floor(aiRuns.length / 2)],
              specificTailoredTasks: tailoredTasks ? specificTasks / tailoredTasks : null,
            }
          : "skipped (ANTHROPIC_API_KEY not set)",
        personas: personas.map((p) => {
          const r = fit(p.profile, NO_ADJUST, { now: NOW });
          const d = rulesDecision(p.profile, NO_ADJUST, [], { now: NOW, fit: r });
          return {
            id: p.id,
            move: p.profile.move,
            shipped: isAvailableMove(p.profile.move),
            keywordMoveGuess: guessMove(p.profile.situation),
            funnel: r.funnel,
            pick: d.pickId,
            alternates: d.alternates,
            gapsCovered: d.coverage.find((c) => c.id === d.pickId)?.covered ?? 0,
            reason: d.reason ?? null,
          };
        }),
      },
      null,
      2,
    ) + "\n",
  );

  for (const [k, v] of bySection) console.log(`${k.padEnd(10)} ${v.pass} passed, ${v.fail} failed`);
  for (const f of failed) console.log(`FAIL ${f.section} :: ${f.name}${f.detail ? ` (${f.detail})` : ""}`);
  console.log(
    `\n${results.length - failed.length}/${results.length} checks passed (${(passRate * 100).toFixed(1)}%). AI live run: ${
      aiRuns.length
        ? `${aiRuns.length} personas, understand move accuracy ${((moveAccuracy ?? 0) * 100).toFixed(0)}%, AI and rules agree on ${((agreement ?? 0) * 100).toFixed(0)}% of picks, ${tailoredTasks ? ((specificTasks / tailoredTasks) * 100).toFixed(0) : 0}% of tailored tasks quote a week's module and use their words`
        : "skipped, ANTHROPIC_API_KEY not set"
    }.`,
  );
  console.log(`Shipped moves: ${availableMoves().map((m) => MOVES[m.id].label).join(", ")}`);
  process.exit(failed.length ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
