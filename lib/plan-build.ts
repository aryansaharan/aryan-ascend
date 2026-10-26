import { outlineHash, totalHours, type Course, type MoveId } from "./course-types";
import { effectiveHours, scopeLabelFor, scopeOfPrefix, weeksAt } from "./fit";
import { parseLocalDate, toLocalISODate } from "./format";
import { MOVES } from "./moves";

// The week builder (spec 6.3). Pure: the same course, scope, hours and dates
// always give the same weeks, so a plan link opens identically anywhere. Weeks
// are never stored; they're derived from the catalog outline every render.

export type PlanItem = {
  /** index into the course's modules; modules.length for the course's unlisted tail (`beyond`) */
  index: number;
  /** module name, verbatim from the catalog */
  name: string;
  /** the pick said they can skim it (plan.sk) */
  skim?: boolean;
  /** set when the module is split across weeks */
  partIndex?: number;
  partCount?: number;
  /** "Prompt Engineering" or "Prompt Engineering (part 1 of 2)" */
  label: string;
};

export type PlanWeek = {
  k: number;
  /** local date "YYYY-MM-DD" the week starts */
  start: string;
  /** local date "YYYY-MM-DD" the next week starts (exclusive end) */
  end: string;
  /** hours this week covers, unrounded (to 2 decimals); show with durationPhrase() (lib/format) */
  hours: number;
  items: PlanItem[];
  /** the move's template line for this week (week 1 uses `w` when given) */
  tieIn: string;
  /** "At work this week": the tailored task when there is one, else the tie-in */
  task: string;
  /** true when `task` is the AI's (or the dev mock's) tailored text for this week */
  tailored: boolean;
  /**
   * Where `task` came from: the tailoring, the pick's own "use it at work"
   * line (week 1, plan.w), or the move's template.
   */
  source: "tailored" | "pick" | "template";
};

export type BuiltPlan = {
  n: number;
  whole: boolean;
  scopeLabel: string;
  scopeHours: number;
  totalHours: number;
  effectiveHours: number;
  weekCount: number;
  weeks: PlanWeek[];
  /** hours and weeks left after the scope, at this pace */
  remainingHours: number;
  remainingWeeks: number;
  /** true when the catalog outline differs from the one the plan was made with */
  outlineChanged: boolean;
};

/** "Restart from Monday": weeks from w on start at local date d. */
export type Restart = { w: number; d: string };

export type BuildArgs = {
  course: Course;
  /** modules in scope, clamped to the current outline; modules.length + 1 is the whole course with its tail (lib/fit planN) */
  n: number;
  h: number;
  /** first session, ISO */
  s: string;
  /** restarts, one or several (each later one from a later week) */
  rs?: Restart | Restart[];
  move: MoveId;
  /** AI useItAtWork, used as week 1's tie-in when present */
  w?: string;
  /** outlineHash at creation */
  mh?: string;
  /** tailored tasks, one per week (plan.tw) */
  tw?: string[];
  /** weeks (1-based) whose task is a template even though tw is set (plan.tf) */
  tf?: number[];
  /** module indices the pick said they can skim (plan.sk) */
  sk?: number[];
};

const MIN_LISTED_OVERLAP = 0.25;
const EPS = 1e-9;

function addDays(isoDate: string, days: number): string {
  const d = parseLocalDate(isoDate);
  return toLocalISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

function round2(x: number): number {
  return Math.round(x * 100) / 100;
}

/** Restarts as a list sorted by week. */
export function restartList(rs: Restart | Restart[] | undefined): Restart[] {
  if (!rs) return [];
  return (Array.isArray(rs) ? rs : [rs]).slice().sort((a, b) => a.w - b.w);
}

/**
 * Local start date of week k: from the latest restart at or before k, so a
 * second restart keeps the weeks the first one moved.
 */
export function weekStart(k: number, s: string, rs?: Restart | Restart[]): string {
  const r = restartList(rs).filter((x) => x.w <= k).at(-1);
  if (r) return addDays(r.d, 7 * (k - r.w));
  return addDays(toLocalISODate(new Date(s)), 7 * (k - 1));
}

export function buildWeeks(args: BuildArgs): BuiltPlan {
  const { course, h, s, rs, move, w } = args;
  const skim = new Set(args.sk ?? []);
  const templated = new Set(args.tf ?? []);
  const E = effectiveHours(h);
  const scope = scopeOfPrefix(course, args.n);
  // the whole course includes its unlisted tail as one last item, so the weeks add up to the total
  const tail = scope.whole && course.beyond ? [{ name: course.beyond.label, hours: course.beyond.hours }] : [];
  const mods = [...course.modules.slice(0, scope.moduleCount), ...tail];
  const H = scope.hours;
  const W = Math.max(1, weeksAt(H, h));

  // Each module covers a cumulative hour range; week k covers [(k-1)E, kE).
  // The last week runs to the end of the scope: weeksAt() folds a tail under
  // a quarter of an hour into it, so no week is a few minutes long.
  let acc = 0;
  const ranges = mods.map((m) => {
    const a = acc;
    acc += m.hours;
    return { a, b: acc };
  });
  const weekEnd = (k: number): number => (k >= W ? H : Math.min(k * E, H));
  const overlap = (i: number, k: number): number => {
    const lo = Math.max(ranges[i].a, (k - 1) * E);
    const hi = Math.min(ranges[i].b, weekEnd(k));
    return Math.max(0, hi - lo);
  };

  // List a module in every week it overlaps by more than 0.25 h; smaller
  // overlaps merge into a neighbouring listed week. Every module is listed at
  // least once (its biggest overlap), and every week lists something.
  const listed: Set<number>[] = Array.from({ length: W + 1 }, () => new Set<number>());
  mods.forEach((_, i) => {
    let best = 1;
    let bestOv = -1;
    let any = false;
    for (let k = 1; k <= W; k++) {
      const ov = overlap(i, k);
      if (ov > MIN_LISTED_OVERLAP + EPS) {
        listed[k].add(i);
        any = true;
      }
      if (ov > bestOv + EPS) {
        bestOv = ov;
        best = k;
      }
    }
    if (!any) listed[best].add(i);
  });
  for (let k = 1; k <= W; k++) {
    if (listed[k].size > 0) continue;
    let best = -1;
    let bestOv = 0;
    mods.forEach((_, i) => {
      const ov = overlap(i, k);
      if (ov > bestOv + EPS) {
        bestOv = ov;
        best = i;
      }
    });
    if (best >= 0) listed[k].add(best);
  }

  const weeksOf = new Map<number, number[]>();
  for (let k = 1; k <= W; k++) {
    for (const i of listed[k]) weeksOf.set(i, [...(weeksOf.get(i) ?? []), k]);
  }

  const tieIns = MOVES[move].tieIns;
  const weeks: PlanWeek[] = [];
  for (let k = 1; k <= W; k++) {
    const items = [...listed[k]]
      .sort((x, y) => x - y)
      .map((i) => {
        const all = weeksOf.get(i) ?? [k];
        const name = mods[i].name;
        const extra = skim.has(i) ? { skim: true } : {};
        if (all.length <= 1) return { index: i, name, label: name, ...extra };
        const partIndex = all.indexOf(k) + 1;
        return {
          index: i,
          name,
          partIndex,
          partCount: all.length,
          label: `${name} (part ${partIndex} of ${all.length})`,
          ...extra,
        };
      });
    // Exact, so the weeks add up to the scope; durationPhrase() rounds for display.
    const hours = round2(Math.max(0, weekEnd(k) - Math.min((k - 1) * E, H)));
    const start = weekStart(k, s, rs);
    const fromPick = k === 1 && Boolean(w);
    const tieIn = fromPick ? (w as string) : tieIns[(k - 1) % 4];
    const tailoredTask = args.tw?.[k - 1]?.trim();
    const tailored = Boolean(tailoredTask) && !templated.has(k);
    weeks.push({
      k,
      start,
      end: addDays(start, 7),
      hours,
      items,
      tieIn,
      task: tailored ? (tailoredTask as string) : tieIn,
      tailored,
      source: tailored ? "tailored" : fromPick ? "pick" : "template",
    });
  }

  const total = totalHours(course);
  const remainingHours = scope.whole ? 0 : Math.max(0, Math.round((total - H) * 100) / 100);
  return {
    n: scope.moduleCount,
    whole: scope.whole,
    scopeLabel: scopeLabelFor(course, scope),
    scopeHours: H,
    totalHours: total,
    effectiveHours: E,
    weekCount: W,
    weeks,
    remainingHours,
    remainingWeeks: weeksAt(remainingHours, h),
    outlineChanged: args.mh !== undefined && args.mh !== outlineHash(course),
  };
}

/** The week containing today, or null before the first and after the last. */
export function currentWeek(weeks: PlanWeek[], now: Date = new Date()): PlanWeek | null {
  const today = toLocalISODate(now);
  return weeks.find((w) => w.start <= today && today < w.end) ?? null;
}

/**
 * Missed-week banner (spec 3.5): the first week whose end has passed, that
 * isn't ticked, with no later week ticked. Null when nothing slipped.
 */
export function missedWeek(
  weeks: PlanWeek[],
  weeksDone: number[],
  now: Date = new Date(),
): number | null {
  const today = toLocalISODate(now);
  const done = new Set(weeksDone);
  for (const wk of weeks) {
    if (today < wk.end) break;
    if (done.has(wk.k)) continue;
    const laterTicked = weeksDone.some((d) => d > wk.k);
    if (!laterTicked) return wk.k;
  }
  return null;
}

/** Today if it's a Monday, otherwise the coming Monday, as a local date. */
export function nextMondayISO(now: Date = new Date()): string {
  const day = now.getDay();
  const add = day === 1 ? 0 : (8 - day) % 7;
  return toLocalISODate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + add));
}
