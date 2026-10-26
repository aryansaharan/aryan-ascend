"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { SectionLabel, TextLink, easeOut } from "@/components/ui";
import type { Engine } from "@/lib/pick-types";
import type { PlanWeek } from "@/lib/plan-build";
import { durationPhrase, fmtDay } from "@/lib/format";
import { weekTaskTag, type TaskTagText } from "@/lib/templates";

// The weeks of a plan (spec 6.3, addendum-ai Job 4). Everything here comes
// from code: the dates, the hours and the module names verbatim from the
// catalog. The only AI text is the "At work this week" task, tagged AI (or
// MOCK AI in dev), or TEMPLATE when Ascend's template filled in.

/** Keeps "7:00 am" on one line. */
export function keepTimes(text: string): string {
  return text.replace(/(\d) (am|pm)\b/g, "$1\u00a0$2");
}

/** The tiny mono tag next to "At work this week". */
export function TaskTag({ tag, onDark = false }: { tag: TaskTagText; onDark?: boolean }) {
  const tone = onDark
    ? tag === "TEMPLATE"
      ? "border border-accent-fg/25 text-accent-fg/60"
      : "bg-accent-fg text-foreground"
    : tag === "AI"
      ? "bg-foreground text-accent-fg"
      : tag === "MOCK AI"
        ? "border border-foreground/35 text-foreground"
        : "border border-border-soft bg-card-alt text-muted";
  return (
    <span
      className={`mono-label inline-flex items-center rounded-full px-1.5 py-[3px] text-[9px] leading-none uppercase tracking-[0.16em] ${tone}`}
    >
      {tag}
    </span>
  );
}

function WeekCheck({
  k,
  checked,
  locked,
  onToggle,
}: {
  k: number;
  checked: boolean;
  locked: boolean;
  onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={`Week ${k} done`}
      disabled={locked}
      onClick={onToggle}
      whileTap={locked ? undefined : { scale: 0.92 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className="-mr-1.5 -mt-1.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full disabled:cursor-not-allowed"
    >
      <span
        className={`flex h-6 w-6 items-center justify-center rounded-full border transition-colors ${
          checked
            ? "border-foreground bg-foreground text-accent-fg"
            : locked
              ? "border-border-soft bg-card-alt"
              : "border-border bg-card hover:border-foreground/40"
        }`}
      >
        {checked && <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />}
      </span>
    </motion.button>
  );
}

export function PlanWeeks({
  weeks,
  engines,
  weeksDone,
  locked,
  currentK,
  onToggle,
}: {
  weeks: PlanWeek[];
  /** who chose the course (plan.e, for week 1's pick line) and who wrote the tasks (plan.te) */
  engines: { e: Engine; te?: Engine };
  weeksDone: number[];
  /** checkboxes stay disabled until the first session is confirmed */
  locked: boolean;
  /** the week containing today, if any */
  currentK: number | null;
  onToggle: (k: number) => void;
}) {
  // Short plans show every week; longer ones open on the first four (or up to the week after this one).
  const initial = weeks.length <= 5 ? weeks.length : Math.max(4, (currentK ?? 0) + 1);
  const [showAll, setShowAll] = useState(false);
  const shown = showAll ? weeks : weeks.slice(0, initial);
  const hidden = weeks.length - shown.length;
  const done = new Set(weeksDone);
  const anySkim = weeks.some((w) => w.items.some((i) => i.skim));

  return (
    <div>
      {(locked || anySkim) && (
        <div className="mb-4 flex flex-col gap-1.5 text-[12.5px] leading-relaxed text-muted">
          {locked && <p>You can tick weeks off once your first session is confirmed.</p>}
          {anySkim && (
            <p>
              <span className="mono-label mr-1.5 text-[10px] uppercase tracking-[0.16em] text-foreground/70">Skim</span>
              marks a module you can move through quickly, because of something you said you already do.
            </p>
          )}
        </div>
      )}
      <ol className="flex flex-col gap-3">
        {shown.map((w, i) => {
          const isDone = done.has(w.k);
          const isNow = currentK === w.k;
          const tag = weekTaskTag(engines, w);
          return (
            <motion.li
              key={w.k}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: Math.min(i, 6) * 0.04, ease: easeOut }}
              className={`rounded-2xl border bg-card p-5 sm:p-6 card-elev ${
                isNow ? "border-foreground/25" : "border-border-soft"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold leading-snug text-foreground">
                    <span className={isDone ? "text-muted line-through decoration-border" : undefined}>Week {w.k}</span>
                    <span className="hidden sm:inline font-normal text-muted"> · </span>
                    <span className="block sm:inline mt-0.5 sm:mt-0 text-[13.5px] sm:text-[15px] font-normal text-muted">
                      {fmtDay(w.start)} · about {durationPhrase(w.hours)}
                    </span>
                  </h3>
                  {isNow && (
                    <span className="mono-label mt-1.5 inline-block text-[10px] uppercase tracking-[0.2em] text-foreground/70">
                      {"// This week"}
                    </span>
                  )}
                </div>
                <WeekCheck k={w.k} checked={isDone} locked={locked} onToggle={() => onToggle(w.k)} />
              </div>

              <ul className="mt-3 flex flex-col gap-1.5">
                {w.items.map((item) => (
                  <li
                    key={`${item.index}-${item.partIndex ?? 0}`}
                    className="flex items-start gap-2.5 text-[14px] leading-relaxed text-foreground/85"
                  >
                    <span aria-hidden className="mt-[0.6rem] h-1 w-1 flex-shrink-0 rounded-full bg-foreground/35" />
                    <span>
                      {item.name}
                      {item.partCount ? (
                        <>
                          {" "}
                          <span className="text-muted whitespace-nowrap">
                            (part {item.partIndex} of {item.partCount})
                          </span>
                        </>
                      ) : null}
                      {item.skim && (
                        <span className="mono-label ml-2 inline-flex translate-y-[-1px] items-center rounded-full border border-border-soft bg-card-alt px-1.5 py-[3px] text-[9px] leading-none uppercase tracking-[0.16em] text-muted">
                          Skim
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>

              <div className="mt-4 pt-4 border-t border-border-soft">
                <div className="flex items-center gap-2">
                  <SectionLabel as="h4">At work this week</SectionLabel>
                  <TaskTag tag={tag} />
                </div>
                <p className="mt-2 text-[14.5px] leading-relaxed text-foreground">{w.task}</p>
              </div>
            </motion.li>
          );
        })}
      </ol>
      {hidden > 0 && (
        <div className="mt-4 flex justify-center">
          <TextLink onClick={() => setShowAll(true)}>
            Show weeks {shown.length + 1} to {weeks.length}
          </TextLink>
        </div>
      )}
    </div>
  );
}
