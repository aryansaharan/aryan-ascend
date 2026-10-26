import type { Check } from "./pick-types";
import type { PlanWeek } from "./plan-build";
import { ARTIFACT_MAX, TASK_MAX } from "./tailor";
import { cleanProse, sentences } from "./verify";

// The tailor verifier (addendum-ai, Job 4). Pure. Every week gets exactly one
// task: missing weeks are filled from the move's templates, numbers with units
// go, dashes go, a quoted phrase must be one of that week's real module names
// (otherwise the quote marks are removed), and a task that names another
// week's module loses that sentence.

export type TailorAiOutput = { weeks: { k: number; task: string }[]; artifact: string };

export type TailorVerifyInput = {
  finishReason: string | undefined;
  output: unknown;
  /** from lib/plan-build: module names per week and the template tie-ins */
  weeks: PlanWeek[];
  /** the move's artifact template */
  artifactTemplate: string;
  /** the person's own text: a figure they wrote ("my 3 years") may be repeated */
  situation?: string;
};

export type TailorVerifyResult =
  | {
      ok: true;
      tasks: string[];
      tailored: boolean[];
      artifact: string;
      artifactTailored: boolean;
      checks: Check[];
      counts: { filled: number; numbersRemoved: number; unquoted: number; otherWeek: number };
    }
  | { ok: false; checks: Check[] };

export function isTailorAiOutput(x: unknown): x is TailorAiOutput {
  if (!x || typeof x !== "object") return false;
  const o = x as Record<string, unknown>;
  return Array.isArray(o.weeks) && typeof o.artifact === "string";
}

function norm(s: string): string {
  return s.toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, " ").trim();
}

/** "Chapter 5: ", "Module 2: ", "Introduction and Chapter 1: " at the start of a module name. */
const NAME_PREFIX = /^(introduction and )?(chapter|module|part|habit|week|lesson|unit)\s*\d+\s*:\s*/i;

function bareName(s: string): string {
  return norm(s).replace(/[.!?,;:]+$/, "").replace(NAME_PREFIX, "").trim();
}

/**
 * True when a quoted phrase names one of `names`: the full name, the name
 * without its "Chapter 5:" prefix, or two or more words in a row from it.
 * Trailing "." or "!" don't matter ("Clutter is your enemy!" loses its "!"
 * to the style check before this runs).
 */
export function namesModule(inner: string, names: readonly string[]): boolean {
  const q = bareName(inner);
  if (!q) return false;
  return names.some((n) => {
    const full = norm(n).replace(/[.!?,;:]+$/, "");
    const b = bareName(n);
    return q === full || q === b || (q.split(" ").length >= 2 && ` ${b} `.includes(` ${q} `));
  });
}

/**
 * Removes quote marks around anything that isn't one of `names` (this
 * week's modules). `fixed` counts only phrases that match no module at all
 * (`allNames`): one from another week is handled by the other-weeks check.
 */
export function unquoteNonModules(
  text: string,
  names: readonly string[],
  allNames: readonly string[] = names,
): { text: string; fixed: number } {
  let fixed = 0;
  const out = text.replace(/["“]([^"”]{1,200})["”]/g, (whole, inner: string) => {
    if (namesModule(inner, names)) return whole;
    if (!namesModule(inner, allNames)) fixed++;
    return inner;
  });
  return { text: out, fixed };
}

function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * Checks: complete, length (exactly W tasks), no numbers, style, quotes,
 * other weeks, artifact. A failed "complete" means the caller returns the
 * template answer with reason "ai-invalid".
 */
export function verifyTailoring(input: TailorVerifyInput): TailorVerifyResult {
  const checks: Check[] = [];
  if (input.finishReason !== "stop" || !isTailorAiOutput(input.output)) {
    checks.push({
      name: "complete",
      passed: false,
      note:
        input.finishReason && input.finishReason !== "stop"
          ? `The answer stopped early (${input.finishReason}), so the weeks use templates.`
          : "The answer didn't match the expected format, so the weeks use templates.",
    });
    return { ok: false, checks };
  }
  checks.push({ name: "complete", passed: true });
  const out = input.output;
  const W = input.weeks.length;

  // exactly one task per week, by k
  const byK = new Map<number, string>();
  let extra = 0;
  for (const w of out.weeks) {
    const k = w && Number.isInteger(w.k) ? w.k : -1;
    if (k < 1 || k > W || byK.has(k) || typeof w.task !== "string") {
      extra++;
      continue;
    }
    byK.set(k, w.task);
  }

  // module names: what each week may quote, and what other weeks own
  const weekNames = input.weeks.map((w) => [...new Set(w.items.map((i) => i.name))]);
  const allNames = [...new Set(weekNames.flat())];
  const situation = input.situation ?? "";

  let numbers = 0;
  let dashes = 0;
  let hype = 0;
  let cut = 0;
  let unquoted = 0;
  let otherWeek = 0;
  let filled = 0;
  const tasks: string[] = [];
  const tailored: boolean[] = [];
  input.weeks.forEach((week, idx) => {
    const raw = byK.get(week.k);
    const fallback = week.tieIn;
    if (raw === undefined) {
      tasks.push(fallback);
      tailored.push(false);
      filled++;
      return;
    }
    const r = cleanProse(raw, 1000, situation);
    numbers += r.numbers;
    if (r.dashes) dashes++;
    if (r.hype) hype++;
    let t = r.text;
    const own = weekNames[idx];
    const q = unquoteNonModules(t, own, allNames);
    unquoted += q.fixed;
    t = q.text;
    // a sentence naming another week's module goes (short generic names like "Introduction" are ignored)
    const others = allNames.filter(
      (n) => !own.includes(n) && n.length >= 12 && n.trim().split(/\s+/).length >= 2,
    );
    const kept = sentences(t).filter((s) => {
      const hit = others.some((n) => norm(s).includes(norm(n)));
      if (hit) otherWeek++;
      return !hit;
    });
    t = kept.join(" ");
    if (t.length > TASK_MAX) {
      const c = cleanProse(t, TASK_MAX, situation);
      t = c.text;
      cut++;
    }
    if (!t.trim()) {
      tasks.push(fallback);
      tailored.push(false);
      filled++;
      return;
    }
    tasks.push(t.trim());
    tailored.push(true);
  });

  const a = cleanProse(out.artifact, ARTIFACT_MAX, situation);
  numbers += a.numbers;
  if (a.dashes) dashes++;
  const artifactTailored = a.text.length > 0 && !/^\s*Your background as/i.test(a.text);
  const artifact = artifactTailored ? a.text : input.artifactTemplate;

  const add = (name: string, notes: string[]) => {
    const n = notes.filter(Boolean);
    checks.push({ name, passed: n.length === 0, ...(n.length ? { note: n.join(" ") } : {}) });
  };
  add("length", [
    filled ? `Filled ${plural(filled, "week")} from templates.` : "",
    extra ? `Removed ${plural(extra, "task")} for weeks that don't exist or repeated.` : "",
  ]);
  add("no numbers", [numbers ? `Removed ${plural(numbers, "sentence")} with a number.` : ""]);
  add("style", [
    dashes ? "Replaced dashes or exclamation marks." : "",
    hype ? "Replaced tasks with hype words." : "",
    cut ? `Shortened ${plural(cut, "task")}.` : "",
  ]);
  add("quotes", [unquoted ? `Removed quote marks from ${plural(unquoted, "phrase")} that aren't module names.` : ""]);
  add("other weeks", [otherWeek ? `Removed ${plural(otherWeek, "sentence")} naming another week's module.` : ""]);
  add("artifact", [!artifactTailored ? "Used the template for the finish line." : ""]);

  return {
    ok: true,
    tasks,
    tailored,
    artifact,
    artifactTailored,
    checks,
    counts: { filled, numbersRemoved: numbers, unquoted, otherWeek },
  };
}
