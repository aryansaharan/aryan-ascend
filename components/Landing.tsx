"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
  useInView,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, ChevronDown, Sparkles } from "lucide-react";
import { Logo } from "@/components/Logo";
import { ExampleAnswers } from "@/components/ExampleAnswers";
import type { MoveId } from "@/lib/course-types";
import { localGet } from "@/lib/local-store";
import { clearSession } from "@/lib/session";
import { JOB_RUN } from "@/lib/landing-run";
import { LATEST_PLAN_KEY } from "@/lib/storage-keys";

// Every first visit downloads this file, so it never imports the catalog at
// runtime: no lib/courses, lib/catalog, lib/moves, lib/skills, lib/templates,
// lib/profile or lib/store (type imports are fine). app/page.tsx, a server
// component, computes every catalog fact and passes it in as plain props.

// The Continue card reads the saved plan through lib/plan-store, which pulls
// in the catalog, so it loads only for visitors who have a plan.
const ContinueCard = dynamic(
  () => import("@/components/ContinueCard").then((m) => m.ContinueCard),
  { ssr: false },
);

const easeOut = [0.16, 1, 0.3, 1] as const;

const CONTACT_EMAIL = "aryansaharan30@gmail.com";
const PROVIDERS_SHOWN = 12;

/** A real module that keyword-matches a gap, found by app/page.tsx. */
export type ModuleMatch = { module: string; course: string };

export type LandingProps = {
  /** catalogProviders(), most entries first */
  providers: string[];
  courseCount: number;
  /** "Oct 2026", from CATALOG_VERSION */
  checkedMonth: string;
  /** the directions that pass MIN_ENTRIES, in availableMoves() order */
  moves: { id: MoveId; label: string }[];
  /** AI_JOBS from lib/templates */
  aiJobs: { title: string; body: string }[];
  aiJobsFootnote: string;
  /** the model the server calls, "Claude Opus 5.5" */
  modelName: string;
  /** the model of the recorded run below (lib/landing-run JOB_RUN.model) */
  runModelName: string;
};

type JobExample = {
  /** top-right mono label: what code checks for this job */
  check: string;
  inLabel: string;
  input: string;
  /** the input is the person's own words */
  quoted: boolean;
  outLabel: string;
  output: string;
};

// What each job returned for one example person, recorded from a real Claude
// run (lib/landing-run.ts, checked against the catalog by the eval). Labels
// are in the past tense for that reason; "See all four on an example" runs it
// live again, and live answers vary a little from run to run.
function jobExamples(): JobExample[] {
  return [
    {
      check: "Quotes checked",
      inLabel: "They wrote",
      input: JOB_RUN.read.wrote,
      quoted: true,
      outLabel: "It read",
      output: JOB_RUN.read.read,
    },
    {
      check: "Modules checked",
      inLabel: "Their first gap",
      input: JOB_RUN.match.gap,
      quoted: false,
      outLabel: "It matched, from the catalog",
      output: `\u201c${JOB_RUN.match.module}\u201d in ${JOB_RUN.match.course}`,
    },
    {
      check: "Verdicts checked",
      inLabel: "They wrote",
      input: JOB_RUN.verdict.wrote,
      quoted: true,
      outLabel: "It said",
      output: JOB_RUN.verdict.said,
    },
    {
      check: "Tasks checked",
      inLabel: "This week's module",
      input: JOB_RUN.task.module,
      quoted: false,
      outLabel: "At work this week",
      output: JOB_RUN.task.task,
    },
  ];
}

// False during prerender and hydration, true once in the browser.
const noopSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/** True once in the browser when ascend.plans.latest points at a saved plan. */
function useHasSavedPlan(): boolean {
  const ready = useSyncExternalStore(noopSubscribe, onClient, onServer);
  return useMemo(() => {
    if (!ready) return false;
    // memory fallback included, so a plan made earlier in a storage-blocked tab still shows
    return Boolean(localGet(LATEST_PLAN_KEY));
  }, [ready]);
}

export default function Landing({
  providers: allProviderNames,
  courseCount,
  checkedMonth,
  moves,
  aiJobs,
  aiJobsFootnote,
  modelName,
  runModelName,
}: LandingProps) {
  const reduced = useReducedMotion();
  const hasPlan = useHasSavedPlan();
  const examples = useMemo(() => jobExamples(), []);
  const [examplesOpen, setExamplesOpen] = useState(false);
  const [aiExamplesOpen, setAiExamplesOpen] = useState(false);
  const [allProviders, setAllProviders] = useState(false);
  const providers = allProviders ? allProviderNames : allProviderNames.slice(0, PROVIDERS_SHOWN);
  const hiddenProviders = allProviderNames.length - PROVIDERS_SHOWN;

  return (
    <main className="relative min-h-screen bg-background overflow-x-clip">
      {/* Soft warm page-level glow */}
      <div className="page-glow" aria-hidden />
      {/* Subtle paper grain across the page */}
      <div className="grain absolute inset-0 pointer-events-none" aria-hidden />

      <div className="relative w-full max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col">
        {/* Top bar: motion.dev-inspired metadata strip */}
        <header className="py-6 sm:py-7 flex items-center justify-between">
          <Logo />
          <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 flex items-center gap-2">
            <span>{"// V0.2"}</span>
            <span className="hidden sm:inline text-border">·</span>
            <span className="hidden sm:inline">ONE PICK</span>
            <span className="text-border">·</span>
            <span>CHECKED COURSES</span>
          </div>
        </header>

        {/* Pre-hero metadata strip */}
        <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 flex items-center gap-3 pt-6 sm:pt-8">
          <span>{"// 01 NEW SESSION"}</span>
          <span className="flex-1 h-px bg-border-soft" />
          <span>ABOUT 3 MIN</span>
        </div>

        {/* Hero: left-aligned to the container. Hero text constrains per-element, not via inner wrapper. */}
        <section className="relative pt-10 sm:pt-16 lg:pt-20 pb-12 sm:pb-16">
          <div className="relative flex flex-col items-start gap-7">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: easeOut }}
              className="mono-label inline-flex items-center gap-1.5 rounded-full bg-foreground text-accent-fg px-3 py-1 text-[10px] uppercase tracking-[0.22em]"
            >
              <Sparkles className="w-3 h-3" />
              AI reads, code checks
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: easeOut }}
              className="text-[2.25rem] sm:text-[3rem] md:text-[3.5rem] lg:text-[4rem] leading-[1.02] tracking-[-0.025em] font-semibold text-foreground max-w-[20ch]"
            >
              One course you can finish.{" "}
              <span className="serif-italic font-normal text-foreground/85">
                First 25 minutes on your calendar, within 48 hours.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: easeOut }}
              className="text-[15px] sm:text-base lg:text-lg leading-relaxed text-muted max-w-[58ch]"
            >
              For people early in their career who know the direction they
              want to grow in. Describe where you are in your own words.
              Ascend&apos;s AI reads it, finds the gaps between you and where
              you want to be, and matches them to the real modules of courses
              that fit your hours and budget.{" "}
              <span className="text-foreground font-medium">
                You get one pick, why it fits, and your first session on the
                calendar.
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: easeOut }}
              className="text-[11px] text-muted-2"
            >
              <span className="mono-label">
                Built from 25+ interviews and a survey of early-career professionals.
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.32, ease: easeOut }}
              className="w-full flex flex-col items-start gap-4 pt-2"
            >
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-6">
                <motion.div
                  whileHover={{ scale: 1.005 }}
                  whileTap={{ scale: 0.985 }}
                  transition={{ type: "spring", stiffness: 300, damping: 25 }}
                  className="relative"
                >
                  <Link
                    href="/assess"
                    onClick={() => {
                      // A new session starts blank: the v2 profile, cached
                      // decisions, understanding and tailoring all go.
                      // Saved plans stay.
                      clearSession();
                    }}
                    className="relative group inline-flex items-center justify-center gap-2 bg-foreground text-accent-fg rounded-2xl py-3.5 px-6 font-medium text-[15px] shadow-[0_10px_30px_-12px_rgba(10,10,10,0.45)]"
                  >
                    Find my course
                    <motion.span
                      className="inline-flex"
                      animate={reduced ? undefined : { x: [0, 3, 0] }}
                      transition={
                        reduced
                          ? undefined
                          : { duration: 1.8, repeat: Infinity, ease: "easeInOut" }
                      }
                    >
                      <ArrowRight className="w-4 h-4" />
                    </motion.span>
                  </Link>
                </motion.div>
                <ExamplesToggle
                  open={examplesOpen}
                  onToggle={() => setExamplesOpen((v) => !v)}
                  controls="hero-examples"
                >
                  Try it with example answers
                </ExamplesToggle>
              </div>

              <div className="mono-label text-[11px] uppercase tracking-[0.22em] text-muted-2">
                4 steps · 1 pick · no signup
              </div>

              <div className="w-full max-w-xl">
                <ExampleAnswers
                  id="hero-examples"
                  open={examplesOpen}
                  onClose={() => setExamplesOpen(false)}
                />
              </div>

              {hasPlan && <ContinueCard />}
            </motion.div>
          </div>
        </section>

        {/* What's inside: 4 numbered features (motion.dev-style row) */}
        <section className="border-t border-border-soft pt-8 sm:pt-10 pb-6">
          <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 mb-6">
            {"// INSIDE"}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-7">
            <Feature
              num="01"
              title="Your words in"
              body="A few sentences, not a quiz."
            />
            <Feature
              num="02"
              title="Rules first"
              body="Hours, level and budget filter courses in code before the AI sees any."
            />
            <Feature
              num="03"
              title="Honest cost"
              body="The price at your pace, and the free way in when there is one."
            />
            <Feature
              num="04"
              title="A plan you keep"
              body="A calendar invite and a backup slot. Progress stays on this device."
            />
          </div>
        </section>

        {/* Sources row: providers and month computed from the catalog */}
        <section className="border-t border-border-soft pt-6 sm:pt-8 mt-6 sm:mt-10">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 sm:gap-8">
            <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 shrink-0">
              {"// COURSES FROM"}
            </div>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-[12px] text-muted">
              {providers.map((p) => (
                <span key={p}>{p}</span>
              ))}
              {hiddenProviders > 0 && (
                <button
                  type="button"
                  onClick={() => setAllProviders((v) => !v)}
                  aria-expanded={allProviders}
                  className="inline-flex items-center py-3 -my-3 text-[12px] text-foreground/80 underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground/40"
                >
                  {allProviders ? "Show fewer" : `and ${hiddenProviders} more`}
                </button>
              )}
            </div>
          </div>
          <ul className="mono-label mt-6 grid grid-cols-2 sm:flex sm:flex-wrap items-baseline gap-x-3 gap-y-2 text-[10px] uppercase tracking-[0.18em] text-muted-2">
            {[
              `${courseCount} courses, links and prices checked ${checkedMonth}`,
              "No sponsored placements",
              "No invented reviews",
              "No signup",
            ].map((item, i) => (
              <li
                key={item}
                className={`flex items-baseline gap-3 ${i === 0 ? "col-span-2 sm:col-span-1" : ""}`}
              >
                {i > 0 && (
                  <span aria-hidden className="hidden sm:inline text-border">
                    ·
                  </span>
                )}
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* What we heard: each finding paired with the decision it led to */}
        <section className="mt-20 sm:mt-28">
          <SectionEyebrow index="02">What we heard</SectionEyebrow>
          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.2 }}
            variants={{
              visible: { transition: { staggerChildren: 0.08 } },
            }}
            className="mt-7 grid grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4"
          >
            <Stat
              number={61}
              suffix="%"
              eyebrow="Survey"
              label="named too many options as the problem."
              decision="So you get one pick and two alternatives, not a list."
            />
            <Stat
              number={52}
              suffix="%"
              eyebrow="Survey"
              label="feared paying for the wrong course."
              decision="So every pick shows what it costs at your pace, and a free way to start when there is one."
            />
            <Stat
              number={87}
              suffix="%"
              eyebrow="Survey"
              label="rated proof from other learners as decisive."
              decision="So you see a public rating with its source and date where one exists, and a message to send someone who took it. Ascend writes no reviews."
            />
            <Stat
              number={48}
              suffix="h"
              eyebrow="North Star"
              label="is the number Ascend is built around."
              decision="A first session within two days of choosing."
            />
          </motion.div>
          <p className="mt-5 text-[12px] text-muted-2">
            Survey of early-career professionals and 25+ interviews, 2025.
          </p>
        </section>

        {/* What the AI does: four jobs, each shown on one example person */}
        <section className="mt-20 sm:mt-28">
          <SectionEyebrow index="03" aside={modelName}>
            What the AI does
          </SectionEyebrow>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.6 }}
            transition={{ duration: 0.6, ease: easeOut }}
            className="mt-7 text-[1.625rem] sm:text-[2.125rem] leading-[1.08] tracking-[-0.02em] font-semibold text-foreground max-w-[24ch]"
          >
            Rules keep it honest.{" "}
            <span className="serif-italic font-normal text-foreground/85">
              The AI does the thinking a quiz can&apos;t.
            </span>
          </motion.h2>
          <p className="mt-4 text-[14px] sm:text-[15px] leading-relaxed text-muted max-w-[60ch]">
            Four jobs, each one visible on your screen and checked by code.
            Below, what each job returned for one example person, a customer
            success manager moving into product, in a real {runModelName} run
            on {JOB_RUN.date}. Run the example to see live answers, which can
            differ a little from this run. The weekly tasks appear once you
            book a first session.
          </p>
          <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            {aiJobs.map((job, i) => (
              <Step
                key={job.title}
                index={String(i + 1).padStart(2, "0")}
                title={job.title}
                body={job.body}
                example={examples[i]}
              />
            ))}
          </div>
          <div className="mt-6 flex flex-col gap-4">
            <p className="text-[13.5px] leading-relaxed text-muted max-w-[62ch]">
              {aiJobsFootnote}
            </p>
            <ExamplesToggle
              open={aiExamplesOpen}
              onToggle={() => setAiExamplesOpen((v) => !v)}
              controls="ai-examples"
            >
              See all four on an example
            </ExamplesToggle>
            <div className="w-full max-w-xl">
              <ExampleAnswers
                id="ai-examples"
                open={aiExamplesOpen}
                onClose={() => setAiExamplesOpen(false)}
              />
            </div>
          </div>
        </section>

        {/* Where it helps: the directions that pass MIN_ENTRIES */}
        <section className="mt-20 sm:mt-28 mb-12">
          <SectionEyebrow index="04">Where it helps</SectionEyebrow>
          <motion.ul
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={{ visible: { transition: { staggerChildren: 0.04 } } }}
            className="mt-7 flex flex-wrap items-baseline gap-x-6 gap-y-2.5 text-[15px] sm:text-base text-foreground/85"
          >
            {/* Plain text like the providers row, not pills: a list, not buttons. */}
            {moves.map((m) => (
              <motion.li
                key={m.id}
                variants={{
                  hidden: { opacity: 0, y: 6 },
                  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: easeOut } },
                }}
              >
                {m.label}
              </motion.li>
            ))}
          </motion.ul>
          <p className="mt-5 text-[13.5px] leading-relaxed text-muted max-w-[62ch]">
            Ascend covers {moves.length} directions, each with courses
            checked one by one. Not here yet?{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent("A direction for Ascend")}`}
              className="inline-flex items-center py-2.5 -my-2.5 text-foreground/85 underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground/40"
            >
              Tell Aryan which one.
            </a>
          </p>
        </section>

        {/* Footer */}
        <footer className="mt-auto pt-8 pb-8 flex items-center justify-between border-t border-border-soft">
          <span className="mono-label text-[11px] uppercase tracking-[0.22em] text-muted-2">
            Free · no signup · MVP by Aryan Saharan
          </span>
          <span className="hidden sm:inline serif-italic text-[13px] text-muted">
            est. 2025
          </span>
        </footer>
      </div>
    </main>
  );
}

/** Quiet text toggle that opens an ExampleAnswers card; 40px hit area. */
function ExamplesToggle({
  open,
  onToggle,
  controls,
  children,
}: {
  open: boolean;
  onToggle: () => void;
  controls: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-expanded={open}
      aria-controls={controls}
      className="group inline-flex items-center gap-1.5 min-h-10 text-[14px] text-foreground/80 underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground/40"
    >
      {children}
      <ChevronDown
        aria-hidden
        className={`w-3.5 h-3.5 text-muted transition-transform duration-300 ${open ? "rotate-180" : ""}`}
      />
    </button>
  );
}

function SectionEyebrow({
  index,
  aside,
  children,
}: {
  index: string;
  /** small mono label at the end of the rule */
  aside?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="mono-label text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-muted font-medium">
          {"// "}
          {index} {children}
        </span>
        <span className="flex-1 h-px bg-border-soft" />
        {aside && (
          <span className="mono-label hidden sm:inline text-[10px] uppercase tracking-[0.22em] text-muted-2">
            {aside}
          </span>
        )}
      </div>
      {/* On phones the aside drops under the rule instead of squeezing it. */}
      {aside && (
        <div className="mono-label sm:hidden mt-2 text-[10px] uppercase tracking-[0.22em] text-muted-2">
          {aside}
        </div>
      )}
    </div>
  );
}

function Feature({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="flex flex-col gap-2"
    >
      <span className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
        {num}
      </span>
      <h3 className="text-[14px] sm:text-[15px] font-semibold text-foreground tracking-[-0.005em]">
        {title}
      </h3>
      <p className="text-[12.5px] leading-relaxed text-muted">{body}</p>
    </motion.div>
  );
}

function Step({
  index,
  title,
  body,
  example,
}: {
  index: string;
  title: string;
  body: string;
  example: JobExample;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: easeOut }}
      whileHover={{ y: -2 }}
      className="bg-card border border-border-soft rounded-2xl p-6 sm:p-7 flex flex-col gap-3 card-elev card-elev-hover"
    >
      <div className="flex items-baseline justify-between gap-4">
        <span className="serif-italic text-[22px] text-foreground/75 leading-none">
          {index}
        </span>
        <span className="mono-label text-[9px] uppercase tracking-[0.22em] text-muted-2">
          {example.check}
        </span>
      </div>

      <h3 className="text-[20px] sm:text-[22px] font-semibold text-foreground leading-tight tracking-[-0.01em]">
        {title}
      </h3>
      <p className="text-[13.5px] leading-relaxed text-muted">{body}</p>

      {/* One concrete example: what went in, what the AI gave back */}
      <dl className="mt-auto pt-4 border-t border-border-soft flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <dt className="mono-label text-[9px] uppercase tracking-[0.22em] text-muted-2">
            {example.inLabel}
          </dt>
          <dd
            className={
              example.quoted
                ? "serif-italic text-[16px] leading-snug text-foreground/80"
                : "text-[13.5px] leading-snug text-foreground/85"
            }
          >
            {example.quoted ? <>&ldquo;{example.input}&rdquo;</> : example.input}
          </dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="mono-label text-[9px] uppercase tracking-[0.22em] text-muted-2">
            {example.outLabel}
          </dt>
          <dd className="mono-label text-[12px] leading-relaxed text-foreground/85">
            {example.output}
          </dd>
        </div>
      </dl>
    </motion.div>
  );
}

function Stat({
  number,
  suffix,
  label,
  eyebrow,
  decision,
}: {
  number: number;
  suffix?: string;
  label: string;
  eyebrow: string;
  /** what Ascend does because of this finding */
  decision: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const [display, setDisplay] = useState(`0${suffix ?? ""}`);
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));
  const reduced = useReducedMotion();

  useEffect(() => {
    const unsubscribe = rounded.on("change", (v) =>
      setDisplay(`${v}${suffix ?? ""}`),
    );
    if (!inView && !reduced) return unsubscribe;
    // Reduced motion jumps straight to the final number instead of counting up.
    const controls = animate(
      count,
      number,
      reduced ? { duration: 0 } : { duration: 1.2, ease: easeOut, delay: 0.3 },
    );
    return () => {
      unsubscribe();
      controls.stop();
    };
  }, [number, suffix, count, rounded, reduced, inView]);

  // Phones: the number on the left, finding and decision beside it. Wider: stacked.
  return (
    <motion.div
      ref={ref}
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: easeOut },
        },
      }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="bg-card border border-border-soft rounded-2xl p-5 sm:p-6 card-elev card-elev-hover grid grid-cols-[4.5rem_1fr] gap-x-4 min-[420px]:flex min-[420px]:flex-col"
    >
      <div className="col-span-2 mono-label text-[9px] sm:text-[10px] uppercase tracking-[0.26em] text-muted-2 mb-3">
        {eyebrow}
      </div>
      <div className="flex items-baseline gap-1">
        <div className="text-[2rem] sm:text-[2.5rem] font-semibold text-foreground tabular-nums leading-none tracking-[-0.025em]">
          {display}
        </div>
      </div>
      <div className="min-[420px]:mt-2">
        <div className="text-[12.5px] sm:text-[13px] leading-snug text-muted">{label}</div>
        <p className="mt-3 pt-3 sm:mt-4 sm:pt-4 border-t border-border-soft text-[12.5px] sm:text-[13px] leading-relaxed text-foreground/80">
          {decision}
        </p>
      </div>
    </motion.div>
  );
}
