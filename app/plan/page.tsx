"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowLeft, Check, ChevronDown, Info, Link2 } from "lucide-react";
import { Logo } from "@/components/Logo";
import {
  EngineLine,
  Eyebrow,
  FactChip,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
  SkeletonLine,
  TextLink,
  easeOut,
} from "@/components/ui";
import { BookingSheet, type BookingChoice } from "@/components/BookingSheet";
import { FirstSessionCard, downloadPlanIcs } from "@/components/FirstSessionCard";
import { PlanBanners } from "@/components/PlanBanners";
import { PlanWeeks, TaskTag } from "@/components/PlanWeeks";
import { TellOnePerson, useCopied } from "@/components/TellOnePerson";
import { getTailoring, loadTailoring, localTailoring, type TailorArgs } from "@/lib/ai-client";
import { backupSlot } from "@/lib/booking";
import { courseById } from "@/lib/catalog";
import type { Course } from "@/lib/course-types";
import { getLatestDecision, setChosen } from "@/lib/decision-store";
import { checkCourse, costAtPaceFor, fit, planN } from "@/lib/fit";
import { checkedLabel, costLine, durationPhrase, modelLabel, paceLine, weeksPhrase, type CostAtPace } from "@/lib/format";
import { useDisplayCurrency } from "@/lib/hooks";
import { decodeLegacyPlan, legacyToV2 } from "@/lib/legacy";
import { trackMilestone } from "@/lib/metrics";
import { MOVES } from "@/lib/moves";
import type { Decision, Engine } from "@/lib/pick-types";
import { buildWeeks, currentWeek, nextMondayISO, type BuildArgs, type PlanWeek } from "@/lib/plan-build";
import {
  createPlan,
  getLatestPlan,
  getProgress,
  listPlans,
  markFirstSessionDone,
  planPath,
  planUrl,
  readPlanHash,
  reschedule,
  restartFrom,
  savePlan,
  startsWithin48h,
  storageWorks,
  toggleWeek,
  type PlanPayloadV2,
  type Progress,
} from "@/lib/plan-store";
import type { ProfileV2 } from "@/lib/profile";
import { readProfile, writeProfile } from "@/lib/store";
import type { TailorResponse } from "@/lib/tailor";
import {
  MOCK_LABEL,
  PLAN_FOOTER,
  planEngineLine,
  STORAGE_BLOCKED,
  checkLabel,
  coverageLine,
  moneyLine,
  planOpener,
  tailorEngineLine,
  taskTag,
  weekTaskTag,
} from "@/lib/templates";

// /plan (spec 3.5, 6.2 to 6.6, addendum-ai Job 4). States, in order:
//   1. #p= in the hash: decode ("z." compressed, "u." plain, or the earlier
//      unprefixed form) and show the plan; a bad token shows "incomplete".
//   2. a legacy ?d= link: converted with no AI, written back as #p=.
//   3. a chosen course without a plan yet: the booking setup. "Make my plan"
//      waits for the tailored weeks (POST /api/tailor, started as soon as the
//      setup shows, once per course and saved on the device), then writes the
//      plan into the link and saves it.
//   4. the latest saved plan.
//   5. nothing yet.
// Opening a plan never calls the AI: the weeks are rebuilt from the catalog
// and the tailored tasks travel inside the link.

/** At most this long on "Tailoring each week to your job" before templates take over. */
const TAILOR_WAIT_MS = 30_000;

/** The promise: a first session within 48 hours of choosing the course. */
const CHOICE_WINDOW_MS = 48 * 60 * 60 * 1000;

type BookingView = {
  kind: "booking";
  profile: ProfileV2;
  decision: Decision;
  course: Course;
  /** the plan link's n (lib/fit planN): listed modules in scope, or modules.length + 1 for the whole course with its tail */
  n: number;
  /** listed modules in scope; skim notes past this are dropped */
  listed: number;
  weeks: number;
  costAtPace: CostAtPace | null;
  /** set when the scope is trimmed */
  scopeLabel: string | null;
  /** the user kept the AI's own pick (not a swap or an alternate) */
  kept: boolean;
};

type PlanView = { kind: "plan"; plan: PlanPayloadV2; legacy: boolean };

type View =
  | { kind: "loading" }
  | { kind: "invalid"; hasSaved: boolean }
  | { kind: "removed"; role: string }
  | BookingView
  | PlanView
  | { kind: "empty" };

type Resolution = {
  view: View;
  hasPick: boolean;
  /** arrived from "Choose this" on /compare, so the back link returns there */
  fromCompare?: boolean;
  /** side effects (save, rewrite the URL) to run only if the result is still wanted */
  commit?: () => Promise<void>;
};

async function writeHash(p: PlanPayloadV2): Promise<void> {
  try {
    window.history.replaceState(null, "", await planPath(p));
  } catch {
    // a URL the browser refuses to store; the saved copy still works
  }
}

function bookingView(profile: ProfileV2, decision: Decision, course: Course): BookingView {
  const adjust = decision.adjust;
  const cand = fit(profile, adjust, { currency: decision.currency, exclude: decision.exclude }).candidates.find(
    (c) => c.id === course.id,
  );
  const check = cand ? null : checkCourse(profile, adjust, course, { currency: decision.currency });
  // A whole course with an unlisted tail plans as modules.length + 1 (lib/fit planN).
  const n = cand
    ? planN(course, { whole: cand.scope === "whole", moduleCount: cand.moduleCount })
    : check?.scope
      ? planN(course, check.scope)
      : 1;
  const listed = cand?.moduleCount ?? check?.scope?.moduleCount ?? 1;
  const weeks = cand?.weeks ?? check?.weeks ?? 1;
  return {
    kind: "booking",
    profile,
    decision,
    course,
    n,
    listed,
    weeks,
    costAtPace: cand ? cand.costAtPace : costAtPaceFor(course, weeks),
    scopeLabel: cand
      ? cand.scope === "trimmed"
        ? cand.scopeLabel
        : null
      : check?.scope && !check.scope.whole
        ? check.scopeLabel
        : null,
    kept: decision.chosenId === decision.pickId && decision.origin !== "swapped",
  };
}

/** Works out which of the five states this visit is in. Pure apart from reading storage and the URL. */
async function resolveView(): Promise<Resolution> {
  const profile = readProfile();
  const decision = profile ? getLatestDecision(profile) : null;
  const hasPick = Boolean(decision?.pickId);

  // 1. #p=
  const fromHash = await readPlanHash(window.location.hash);
  if (fromHash.status === "invalid") return { view: { kind: "invalid", hasSaved: getLatestPlan() !== null }, hasPick };
  if (fromHash.status === "ok") {
    const plan = fromHash.plan;
    if (!courseById(plan.c)) return { view: { kind: "removed", role: plan.r }, hasPick };
    return {
      view: { kind: "plan", plan, legacy: false },
      hasPick,
      // Opened on a new device: keep a copy so progress and the Continue card work.
      commit: async () => {
        if (!listPlans()[plan.id]) savePlan(plan);
      },
    };
  }

  // 2. legacy ?d=
  const d = new URLSearchParams(window.location.search).get("d");
  if (d !== null) {
    const legacy = decodeLegacyPlan(d);
    if (!legacy) return { view: { kind: "invalid", hasSaved: getLatestPlan() !== null }, hasPick };
    const conv = legacyToV2(legacy);
    if (conv.kind === "removed") return { view: { kind: "removed", role: conv.role }, hasPick };
    const plan = conv.plan;
    return {
      view: { kind: "plan", plan, legacy: true },
      hasPick,
      commit: async () => {
        savePlan(plan);
        await writeHash(plan);
      },
    };
  }

  // 3. a chosen course without its plan yet
  if (profile && decision?.chosenId) {
    const made = Object.values(listPlans()).find(
      (p) =>
        p.c === decision.chosenId &&
        decision.commitAt !== undefined &&
        p.t === new Date(decision.commitAt).toISOString(),
    );
    if (made && courseById(made.c)) {
      return { view: { kind: "plan", plan: made, legacy: false }, hasPick, commit: () => writeHash(made) };
    }
    const course = courseById(decision.chosenId);
    if (course && !made) return { view: bookingView(profile, decision, course), hasPick };
  }

  // 4. the latest saved plan
  const latest = getLatestPlan();
  if (latest && courseById(latest.c)) {
    return { view: { kind: "plan", plan: latest, legacy: false }, hasPick, commit: () => writeHash(latest) };
  }

  // 5. nothing yet
  return { view: { kind: "empty" }, hasPick };
}

/** The current time, refreshed every `ms`; null until the first tick in the browser. */
function useNow(ms: number): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    const tick = () => setNow(new Date());
    const first = setTimeout(tick, 0);
    const id = setInterval(tick, ms);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [ms]);
  return now;
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    p.then(
      (v) => {
        clearTimeout(timer);
        resolve(v);
      },
      () => {
        clearTimeout(timer);
        resolve(null);
      },
    );
  });
}

/** Same key as the tailor verifier: case, curly quotes and spacing don't matter. */
function normName(s: string): string {
  return s.toLowerCase().replace(/[\u2018\u2019]/g, "'").replace(/\s+/g, " ").trim();
}

/**
 * Weeks whose tailored task names another week's module (the tailor check
 * "other weeks", re-run against today's outline). An honest link always
 * passes; one edited by hand, or an outline that moved, falls back to the
 * template for that week. Short generic names like "Introduction" are ignored,
 * as in the verifier.
 */
function otherWeekTasks(weeks: PlanWeek[]): number[] {
  const own = weeks.map((w) => new Set(w.items.map((i) => i.name)));
  const named = [...new Set(own.flatMap((names) => [...names]))].filter(
    (n) => n.length >= 12 && n.trim().split(/\s+/).length >= 2,
  );
  return weeks
    .filter((w, i) => w.tailored && named.some((n) => !own[i].has(n) && normName(w.task).includes(normName(n))))
    .map((w) => w.k);
}

/** The plan's weeks from the catalog, with any tailored task that points at another week templated. */
function planWeeks(args: BuildArgs): ReturnType<typeof buildWeeks> {
  const built = buildWeeks(args);
  const stray = otherWeekTasks(built.weeks);
  return stray.length ? buildWeeks({ ...args, tf: [...(args.tf ?? []), ...stray] }) : built;
}

/** The pick's skim notes that fall inside the planned scope, only when the user kept the AI's pick. */
function skimInScope(v: BookingView): number[] {
  if (!v.kept) return [];
  return v.decision.skim.filter((s) => s.module < v.listed).map((s) => s.module);
}

function tailorArgsOf(v: BookingView): TailorArgs {
  const skim = skimInScope(v);
  return {
    profile: v.profile,
    courseId: v.course.id,
    n: v.n,
    h: v.profile.hoursPerWeek,
    ...(skim.length ? { skim: skim.slice(0, 3) } : {}),
  };
}

export default function PlanPage() {
  const [resolved, setResolved] = useState<Resolution>({ view: { kind: "loading" }, hasPick: false });
  const [busy, setBusy] = useState(false);
  /** the tailoring answer for a plan made in this visit (for the honest label and the panel) */
  const [made, setMade] = useState<{ planId: string; tailoring: TailorResponse } | null>(null);
  const now = useNow(30_000);
  const tailorRef = useRef<Promise<TailorResponse> | null>(null);
  const view = resolved.view;
  const backToCompare = resolved.fromCompare === true;

  // Resolve the state on load and whenever another plan link is pasted into this tab.
  useEffect(() => {
    let active = true;
    // Read once: writing the plan into the link drops the query string.
    const fromCompare = new URLSearchParams(window.location.search).get("from") === "compare";
    const run = () => {
      resolveView().then(async (r) => {
        if (!active) return;
        if (r.commit) await r.commit();
        if (active) setResolved({ ...r, fromCompare });
      });
    };
    run();
    window.addEventListener("hashchange", run);
    return () => {
      active = false;
      window.removeEventListener("hashchange", run);
    };
  }, []);

  // Start tailoring as soon as the booking setup shows the course: the weeks
  // don't depend on the date, so the answer is usually ready by "Make my plan".
  useEffect(() => {
    if (view.kind !== "booking") return;
    const ctrl = new AbortController();
    const args = tailorArgsOf(view);
    tailorRef.current = loadTailoring(args, { signal: ctrl.signal })
      .then((r) => r.response)
      .catch(() => localTailoring(view.course, args));
    return () => ctrl.abort();
  }, [view]);

  async function makePlan(v: BookingView, choice: BookingChoice) {
    setBusy(true);
    try {
      await buildAndSave(v, choice);
      window.scrollTo({ top: 0 });
    } finally {
      setBusy(false);
    }
  }

  async function buildAndSave(v: BookingView, choice: BookingChoice) {
    const args = tailorArgsOf(v);
    const pending = tailorRef.current ?? loadTailoring(args).then((r) => r.response);
    const tailoring = (await withTimeout(pending, TAILOR_WAIT_MS)) ?? localTailoring(v.course, args);
    const { profile, decision, course } = v;
    // The booking window runs 48 hours from now. Someone who chose days ago
    // and comes back to book is choosing again, so the plan's "chosen at"
    // moves to now and the first session stays within 48 hours of it.
    const chosenAt = decision.commitAt ? new Date(decision.commitAt) : new Date();
    const commitAt =
      Number.isNaN(chosenAt.getTime()) || choice.s.getTime() - chosenAt.getTime() > CHOICE_WINDOW_MS
        ? new Date()
        : chosenAt;
    if (!decision.commitAt || commitAt !== chosenAt) {
      // the decision and the plan must agree, so a reload finds this plan
      setChosen(decision, decision.chosenId ?? course.id, commitAt.toISOString());
    }
    const plan = createPlan({
      course,
      n: v.n,
      h: profile.hoursPerWeek,
      m: profile.move,
      b: profile.baseline,
      role: profile.currentRole,
      commitAt,
      s: choice.s,
      o: choice.o,
      k: choice.k,
      // the pick's own work line fills week 1 only when the AI tailored the plan;
      // a templated plan stays all templates, so every label on it agrees
      w: v.kept && tailoring.engine !== "rules" ? decision.useItAtWork : undefined,
      e: v.kept ? decision.engine : "rules",
      tailoring,
      skim: v.kept ? skimInScope(v) : undefined,
    });
    savePlan(plan);
    await writeHash(plan);
    trackMilestone("booked", plan.id);
    setMade({ planId: plan.id, tailoring });
    setResolved((r) => ({ ...r, view: { kind: "plan", plan, legacy: false } }));
  }

  const changePlan = useCallback(async (next: PlanPayloadV2) => {
    setResolved((r) => (r.view.kind === "plan" ? { ...r, view: { ...r.view, plan: next } } : r));
    savePlan(next);
    await writeHash(next);
  }, []);

  const ready = now !== null && view.kind !== "loading";

  return (
    <main className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen px-6 sm:px-10 lg:px-12">
        <header className="py-5 flex items-center justify-between">
          {resolved.hasPick ? (
            <Link
              href={backToCompare ? "/compare" : "/recommendations"}
              className="-my-2 flex min-h-10 items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft aria-hidden className="w-4 h-4" />
              {backToCompare ? "Side by side" : "Your pick"}
            </Link>
          ) : (
            <Logo />
          )}
        </header>

        {!ready && <LoadingState />}

        {ready && view.kind === "invalid" && (
          <Notice
            title="This link is incomplete."
            body="Part of it may have been cut off when it was copied. Ask for the link again, or find a course of your own."
          >
            <PrimaryButton href="/assess">Find my course</PrimaryButton>
            {view.hasSaved && (
              <TextLink
                onClick={() => {
                  window.history.replaceState(null, "", "/plan");
                  window.dispatchEvent(new HashChangeEvent("hashchange"));
                }}
              >
                Open the plan saved on this device
              </TextLink>
            )}
          </Notice>
        )}

        {ready && view.kind === "removed" && (
          <Notice
            title="This course is no longer in Ascend's checked list."
            body="Ascend only plans courses it has checked recently. Find one that fits the same hours and budget."
          >
            <PrimaryButton
              href="/assess"
              onClick={() => {
                if (view.role.trim()) writeProfile({ situation: view.role.trim() });
              }}
            >
              Find a course that fits
            </PrimaryButton>
          </Notice>
        )}

        {ready && view.kind === "empty" && (
          <Notice
            title="No plan yet."
            body="Choose a course first. The plan is built from its real outline, around a first session you book."
          >
            <PrimaryButton href="/assess">Find my course</PrimaryButton>
            {resolved.hasPick && <TextLink href="/recommendations">Back to your pick</TextLink>}
          </Notice>
        )}

        {ready && view.kind === "booking" && (
          <BookingScreen view={view} now={now} busy={busy} onSubmit={(c) => void makePlan(view, c)} />
        )}

        {ready && view.kind === "plan" && (
          <PlanScreen
            key={view.plan.id}
            plan={view.plan}
            legacy={view.legacy}
            now={now}
            made={made && made.planId === view.plan.id ? made.tailoring : null}
            onChange={changePlan}
          />
        )}
      </div>
    </main>
  );
}

// States ---------------------------------------------------------------------------

function LoadingState() {
  return (
    <div aria-hidden className="mt-8 flex flex-col gap-4">
      <SkeletonLine className="w-28" />
      <SkeletonLine className="h-7 w-[80%]" />
      <SkeletonLine className="w-[55%]" />
      <div className="mt-4 h-56 rounded-2xl border border-border-soft bg-card card-elev" />
    </div>
  );
}

function Notice({ title, body, children }: { title: string; body: string; children: React.ReactNode }) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="mt-10"
    >
      <Eyebrow variant="section" rule>
        04 Your plan
      </Eyebrow>
      <div className="mt-6 rounded-2xl border border-border-soft bg-card-alt p-6 sm:p-7">
        <p className="text-[17px] font-medium leading-snug text-foreground">{title}</p>
        <p className="mt-2 text-[14.5px] leading-relaxed text-muted max-w-[52ch]">{body}</p>
        <div className="mt-5 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">{children}</div>
      </div>
    </motion.section>
  );
}

// Booking -----------------------------------------------------------------------------

function BookingScreen({
  view,
  now,
  busy,
  onSubmit,
}: {
  view: BookingView;
  now: Date;
  busy: boolean;
  onSubmit: (c: BookingChoice) => void;
}) {
  const currency = useDisplayCurrency();
  const { course, profile } = view;
  const facts = [
    paceLine(view.weeks, profile.hoursPerWeek),
    ...(view.scopeLabel ? [`Covers ${view.scopeLabel}`] : []),
    costLine(course, view.costAtPace, currency),
    ...(course.freeStart ? [`Free to start: ${course.freeStart.label}`] : []),
    checkedLabel(course, now),
  ];
  return (
    <motion.section
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="mt-6 pb-16"
    >
      <Eyebrow variant="section" rule>
        04 Your first session
      </Eyebrow>
      <h1 className="mt-5 text-[1.75rem] sm:text-[2.1rem] leading-[1.12] tracking-[-0.015em] font-semibold text-foreground">
        When is your first <span className="serif-italic font-normal text-foreground/85 whitespace-nowrap">25 minutes?</span>
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-muted max-w-[52ch]">
        Pick a time in the next two days, and what usually gets in the way. Ascend plans a backup around it.
      </p>
      <div className="mt-7">
        <BookingSheet
          course={course}
          n={view.n}
          h={profile.hoursPerWeek}
          move={profile.move}
          facts={facts}
          now={now}
          busy={busy}
          onSubmit={onSubmit}
        />
      </div>
    </motion.section>
  );
}

// The plan ------------------------------------------------------------------------------

function PlanScreen({
  plan,
  legacy,
  now,
  made,
  onChange,
}: {
  plan: PlanPayloadV2;
  legacy: boolean;
  now: Date;
  /** the tailoring answer, when the plan was made in this visit */
  made: TailorResponse | null;
  onChange: (next: PlanPayloadV2) => Promise<void>;
}) {
  const course = courseById(plan.c) as Course;
  const currency = useDisplayCurrency();
  const [progress, setProgress] = useState<Progress>(() => getProgress(plan.id));
  const [storageOk] = useState(() => storageWorks());
  const [link, setLink] = useState<{ plan: PlanPayloadV2; url: string } | null>(null);
  const [copied, copy] = useCopied();
  const te: Engine = plan.te ?? "rules";

  useEffect(() => {
    let on = true;
    planUrl(plan, window.location.origin).then((url) => {
      if (on) setLink({ plan, url });
    });
    return () => {
      on = false;
    };
  }, [plan]);
  const planLink = link && link.plan === plan ? link.url : null;

  const built = useMemo(
    () =>
      planWeeks({
        course,
        n: plan.n,
        h: plan.h,
        s: plan.s,
        rs: plan.rs,
        move: plan.m,
        w: plan.w,
        mh: plan.mh,
        tw: plan.tw,
        tf: plan.tf,
        sk: plan.sk,
      }),
    [course, plan],
  );
  const current = currentWeek(built.weeks, now);
  const money = moneyLine(course, costAtPaceFor(course, built.weekCount), currency);
  const artifact = plan.ta ?? MOVES[plan.m].artifact;
  const artifactTag = plan.ta ? taskTag(te, true) : "TEMPLATE";
  const opener = planOpener(
    { currentRole: plan.r, move: plan.m, hoursPerWeek: plan.h },
    built.whole ? null : built.scopeLabel,
  );
  const model = made?.model ?? plan.tm;

  async function linkNow(p: PlanPayloadV2): Promise<string> {
    return link && link.plan === p ? link.url : planUrl(p, window.location.origin);
  }

  function confirmStarted() {
    setProgress(markFirstSessionDone(plan.id));
    trackMilestone("started", plan.id);
    if (startsWithin48h(plan)) trackMilestone("started-48h", plan.id);
  }

  return (
    <div className="pb-14">
      <section className="mt-6">
        <Eyebrow variant="section" rule>
          04 Your plan
        </Eyebrow>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: easeOut }}
          className="mt-5 text-[1.6rem] sm:text-[2rem] leading-[1.15] tracking-[-0.015em] font-semibold text-foreground"
        >
          {course.title}
        </motion.h1>
        <p className="mt-2 text-[13.5px] text-muted">{course.provider}</p>
        <div className="mt-3.5 flex flex-wrap gap-2">
          <FactChip>{paceLine(built.weekCount, plan.h)}</FactChip>
          {!built.whole && <FactChip>Covers {built.scopeLabel}</FactChip>}
          <FactChip variant="muted">{checkedLabel(course, now)}</FactChip>
        </div>
        <EngineLine className="mt-5">{planEngineLine(te, model)}</EngineLine>
        {made && made.engine === "rules" && (
          <EngineLine className="mt-1.5">{tailorEngineLine({ engine: "rules", reason: made.reason })}</EngineLine>
        )}
        {!storageOk && (
          <p className="mt-4 inline-flex items-start gap-2 rounded-xl bg-card-alt px-3.5 py-2.5 text-[13px] leading-relaxed text-foreground/85">
            <Info aria-hidden className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-muted" />
            <span>
              {STORAGE_BLOCKED}{" "}
              <TextLink onClick={() => planLink && void copy(planLink, "Copy your plan link:")}>
                {copied ? "Link copied" : "Copy plan link"}
              </TextLink>
            </span>
          </p>
        )}
      </section>

      <div className="mt-7 flex flex-col gap-4">
        <PlanBanners
          plan={plan}
          built={built}
          progress={progress}
          now={now}
          legacy={legacy}
          onStarted={confirmStarted}
          onReschedule={(s) => void onChange(reschedule(plan, s))}
          onRestart={(k) => {
            const d = nextMondayISO(now);
            void onChange(restartFrom(plan, k, d));
            return { k, d };
          }}
          onRetime={(s) => void onChange({ ...plan, s: s.toISOString(), k: backupSlot(s, plan.o).toISOString() })}
          onDownloadIcs={() => {
            void linkNow(plan).then((url) => downloadPlanIcs(plan, course, url));
          }}
        />
        <FirstSessionCard plan={plan} course={course} planLink={planLink} progress={progress} />
        {!progress.firstSessionDoneAt && <TellOnePerson title={course.title} s={plan.s} />}
      </div>

      <section className="mt-14" aria-label="What this plan covers">
        <p className="border-l-2 border-foreground/40 pl-3.5 text-[15.5px] leading-relaxed text-foreground">{opener}</p>
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 pl-4">
          <span className="mono-label text-[10px] uppercase tracking-[0.2em] text-muted-2">{"// Cost"}</span>
          {money.lead && <span className="text-[14px] text-foreground/85">{money.lead}</span>}
          <FactChip>{money.cost.replace(/\.$/, "")}</FactChip>
        </div>
      </section>

      <section className="mt-12" aria-labelledby="weeks-heading">
        <div className="mb-4 flex items-baseline justify-between gap-3">
          <SectionLabel as="h2">
            <span id="weeks-heading">Week by week</span>
          </SectionLabel>
          <span className="mono-label text-[10px] uppercase tracking-[0.2em] text-muted-2">
            {weeksPhrase(built.weekCount)}
          </span>
        </div>
        <PlanWeeks
          weeks={built.weeks}
          engines={{ e: plan.e, te }}
          weeksDone={progress.weeksDone}
          locked={!progress.firstSessionDoneAt}
          currentK={current?.k ?? null}
          onToggle={(k) => setProgress(toggleWeek(plan.id, k))}
        />
        <p className="mt-5 text-[13px] leading-relaxed text-muted">{coverageLine(built)}</p>
      </section>

      <section className="mt-10 rounded-2xl bg-foreground p-5 sm:p-6 text-accent-fg" aria-label="What the weekly tasks build toward">
        <div className="flex items-center gap-2">
          <span className="text-[11px] uppercase tracking-[0.16em] text-accent-fg/70 font-medium">
            What the weekly tasks build toward
          </span>
          <TaskTag tag={artifactTag} onDark />
        </div>
        <p className="mt-2 text-[16px] leading-relaxed">{artifact}</p>
      </section>

      <div className="mt-4">
        <HowMade plan={plan} built={built} te={te} made={made} />
      </div>

      <footer className="mt-12 border-t border-border-soft pt-6">
        <p className="text-[12.5px] leading-relaxed text-muted max-w-[56ch]">{PLAN_FOOTER}</p>
        <div className="mt-4 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
          <SecondaryButton
            leadingIcon={copied ? Check : Link2}
            disabled={!planLink}
            onClick={() => {
              if (planLink) void copy(planLink, "Copy your plan link:");
            }}
          >
            <span aria-live="polite">{copied ? "Link copied" : "Copy plan link"}</span>
          </SecondaryButton>
          <TextLink href="/assess">Find another course</TextLink>
        </div>
      </footer>
    </div>
  );
}

// How this plan was made ------------------------------------------------------------------

function HowRow({ label, tag, children }: { label: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="grid gap-1.5 sm:grid-cols-[7.5rem_1fr] sm:gap-4">
      <dt className="flex items-center gap-2 sm:flex-col sm:items-start sm:gap-1.5">
        <span className="text-[13px] font-medium text-foreground">{label}</span>
        <span className="mono-label text-[9px] uppercase tracking-[0.18em] text-muted-2">{tag}</span>
      </dt>
      <dd className="text-[13.5px] leading-relaxed text-muted">{children}</dd>
    </div>
  );
}

function HowMade({
  plan,
  built,
  te,
  made,
}: {
  plan: PlanPayloadV2;
  built: ReturnType<typeof buildWeeks>;
  te: Engine;
  made: TailorResponse | null;
}) {
  // The answer behind the tasks, when this device still has it (made in this
  // visit, or the cached response for the same answers and scope).
  const tailoring = useMemo<TailorResponse | null>(() => {
    if (te === "rules") return made;
    if (made) return made;
    const profile = readProfile();
    if (!profile || profile.move !== plan.m) return null;
    return getTailoring({
      profile,
      courseId: plan.c,
      n: plan.n,
      h: plan.h,
      ...(plan.sk?.length ? { skim: plan.sk } : {}),
    });
  }, [te, made, plan]);

  const W = built.weekCount;
  // every week tagged AI, including a week 1 filled by the pick's own work line
  const tailoredCount = built.weeks.filter((w) => weekTaskTag({ e: plan.e, te }, w) !== "TEMPLATE").length;
  const modules = built.whole
    ? "the whole course outline"
    : built.n === 1
      ? "the first module of the course outline"
      : `the first ${built.n} modules of the course outline`;
  const tasks =
    te === "ai"
      ? `${tailoredCount} of ${W} weekly tasks were written for your job by ${modelLabel(tailoring?.model ?? plan.tm)}, once, and travel in this link. Code checked each one: no stated times or prices, no dashes, and no module from another week.`
      : te === "mock"
        ? `${tailoredCount} of ${W} weekly tasks were written by ${MOCK_LABEL} from keyword heuristics, then checked by code the same way a real answer is.`
        : `Ascend's templates for ${MOVES[plan.m].label}. No AI wrote these.${tailoring?.reason === "too-many-weeks" ? " Plans this long use templates." : tailoring?.reason === "no-key" ? " AI isn't set up here." : ""}`;
  const tag = te === "ai" ? "AI" : te === "mock" ? "MOCK AI" : "TEMPLATE";

  return (
    <details className="group rounded-2xl border border-border-soft bg-card card-elev">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
        <span className="text-[14.5px] font-medium text-foreground">How this plan was made</span>
        <ChevronDown aria-hidden className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border-soft px-5 pb-6 pt-5 sm:px-6">
        <dl className="flex flex-col gap-5">
          <HowRow label="Weeks" tag="Code">
            Code split {modules} into {weeksPhrase(W)}. It plans for 70% of your{" "}
            {plan.h} {plan.h === 1 ? "hour" : "hours"} a week, about {durationPhrase(built.effectiveHours)}, because most
            weeks run short.
          </HowRow>
          <HowRow label="Tasks" tag={tag}>
            {tasks}
          </HowRow>
          <HowRow label="This link" tag="Code">
            It holds your answers, the dates and the tasks. The weeks are rebuilt from the catalog each time it opens,
            and opening it makes no AI call.
          </HowRow>
        </dl>

        {tailoring && tailoring.checks.length > 0 && (
          <div className="mt-6">
            <SectionLabel as="h3">Checks on the tasks</SectionLabel>
            <p className="mono-label mt-2 text-[11px] text-muted-2">
              {tailoring.checks.length} {tailoring.checks.length === 1 ? "check" : "checks"} ·{" "}
              {tailoring.checks.filter((c) => !c.passed).length} fixed
            </p>
            <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1.5 sm:grid-cols-2">
              {[...tailoring.checks]
                .sort((a, b) => Number(a.passed) - Number(b.passed))
                .map((c) =>
                  c.passed ? (
                    <li key={c.name} className="flex items-start gap-2">
                      <Check aria-hidden className="mt-[3px] h-3.5 w-3.5 shrink-0 text-muted-2" />
                      <span className="text-[13px] leading-snug text-foreground/85">{checkLabel("tailor", c.name)}</span>
                    </li>
                  ) : (
                    <li key={c.name} className="flex flex-col gap-0.5 sm:col-span-2">
                      <span className="flex items-baseline gap-2">
                        <span className="mono-label text-[10px] uppercase tracking-[0.16em] text-foreground">Fixed</span>
                        <span className="text-[13px] leading-snug text-foreground/85">{checkLabel("tailor", c.name)}</span>
                      </span>
                      {c.note && <span className="text-[12.5px] leading-snug text-muted">{c.note}</span>}
                    </li>
                  ),
                )}
            </ul>
          </div>
        )}

        {tailoring && (tailoring.sent || tailoring.raw !== undefined) && (
          <details className="group/raw mt-5">
            <summary className="inline-flex min-h-10 cursor-pointer list-none items-center gap-1.5 text-[13px] text-muted underline decoration-border underline-offset-4 hover:text-foreground [&::-webkit-details-marker]:hidden">
              Show what the AI saw
              <ChevronDown aria-hidden className="h-3.5 w-3.5 transition-transform group-open/raw:rotate-180" />
            </summary>
            <div className="mt-3 flex flex-col gap-3">
              {tailoring.sent && <RawBlock label="Sent to the model" value={tailoring.sent} />}
              {tailoring.raw !== undefined && <RawBlock label="Its answer, before checks" value={tailoring.raw} />}
            </div>
          </details>
        )}
        {!tailoring && te !== "rules" && (
          <p className="mt-5 text-[12.5px] text-muted-2">
            The model&apos;s raw answer stays on the device that made this plan.
          </p>
        )}
      </div>
    </details>
  );
}

function RawBlock({ label, value }: { label: string; value: unknown }) {
  return (
    <div>
      <div className="mono-label text-[10px] uppercase tracking-[0.18em] text-muted-2">{label}</div>
      <pre className="mono-label mt-1.5 max-h-72 overflow-auto rounded-xl bg-card-alt p-3.5 text-[11px] leading-relaxed text-foreground/80 whitespace-pre-wrap break-words">
        {JSON.stringify(value, null, 2)}
      </pre>
    </div>
  );
}
