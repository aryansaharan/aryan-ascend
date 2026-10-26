"use client";

import { CalendarPlus, Check, Copy, ExternalLink } from "lucide-react";
import { PrimaryButton, SecondaryButton, SectionLabel, TextLink } from "@/components/ui";
import { keepTimes } from "@/components/PlanWeeks";
import { useCopied } from "@/components/TellOnePerson";
import type { Course } from "@/lib/course-types";
import { ifThenLine } from "@/lib/booking";
import { fmtDay, fmtDayTime, fmtTime } from "@/lib/format";
import { buildIcs, copyDetailsText, downloadIcs, googleCalendarUrl } from "@/lib/ics";
import { hoursToStart, type PlanPayloadV2, type Progress } from "@/lib/plan-store";
import { firstStep, startedLine } from "@/lib/templates";

// The first session as a ticket (spec 3.5): the date in serif italic, the
// first step linked to the free start (or the course), the if-then line, and
// the calendar actions. A notched hairline splits the ticket from its stub.

/** The .ics with the first session, the backup and the day-14 check. */
export function downloadPlanIcs(plan: PlanPayloadV2, course: Course, planLink: string): void {
  const step = firstStep(course, (plan.rb ?? 0) > 0);
  downloadIcs(buildIcs({ plan, course, planLink, firstStep: step.text }));
}

function Notch({ side }: { side: "left" | "right" }) {
  return (
    <span
      aria-hidden
      className={`absolute top-1/2 -translate-y-1/2 h-6 w-6 rounded-full border border-border bg-background ${
        side === "left" ? "-left-3" : "-right-3"
      }`}
    />
  );
}

export function FirstSessionCard({
  plan,
  course,
  planLink,
  progress,
}: {
  plan: PlanPayloadV2;
  course: Course;
  /** absolute plan link; null while it is being encoded */
  planLink: string | null;
  progress: Progress;
}) {
  const s = new Date(plan.s);
  const k = new Date(plan.k);
  const rebooked = (plan.rb ?? 0) > 0;
  const step = firstStep(course, rebooked);
  // The icon rides on the last word, so it never wraps onto a line of its own.
  const cut = step.text.lastIndexOf(" ") + 1;
  const stepHead = step.text.slice(0, cut);
  const stepTail = step.text.slice(cut);
  const done = Boolean(progress.firstSessionDoneAt);
  const [copied, copy] = useCopied();

  return (
    <section
      aria-label="Your first session"
      className="relative overflow-hidden rounded-2xl border border-border-soft bg-card card-elev"
    >
      <div className="px-5 pt-5 pb-6 sm:px-7 sm:pt-6 sm:pb-7">
        <div className="flex items-baseline justify-between gap-3">
          <span className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
            {rebooked ? "// Your first session, rebooked" : "// Your first session"}
          </span>
          <span className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">25 min</span>
        </div>
        <p className="mt-4 serif-italic text-[2.1rem] sm:text-[2.6rem] leading-[1.05] text-foreground">
          {fmtDay(s)}
          <span className="serif-italic text-foreground/45">, </span>
          <span className="serif-italic whitespace-nowrap">{fmtTime(s)}</span>
        </p>
        <p className="mt-2.5 text-[13.5px] text-muted">
          25 minutes <span className="mx-1 text-border">·</span> Backup {fmtDayTime(k)}
        </p>
        {done && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-card-alt px-3 py-1.5 text-[12.5px] text-foreground/85">
            <Check aria-hidden className="h-3.5 w-3.5 text-success" />
            {startedLine(hoursToStart(plan))}
          </p>
        )}
      </div>

      <div className="relative mx-5 sm:mx-7 h-px bg-border-soft">
        <span className="absolute inset-y-0 -left-5 sm:-left-7 -right-5 sm:-right-7">
          <Notch side="left" />
          <Notch side="right" />
        </span>
      </div>

      <div className="px-5 pt-5 pb-5 sm:px-7 sm:pt-6 sm:pb-6">
        <SectionLabel as="h3">First step</SectionLabel>
        <a
          href={step.url}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-block text-[15px] leading-relaxed text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground/40"
        >
          {stepHead}
          <span className="whitespace-nowrap">
            {stepTail}
            <ExternalLink aria-hidden className="ml-1 inline-block h-3.5 w-3.5 align-[-2px] text-muted" />
          </span>
        </a>

        {!done && (
          <>
            <SectionLabel as="h3" className="mt-5">
              If it slips
            </SectionLabel>
            <p className="mt-2 text-[14px] leading-relaxed text-foreground/85 text-pretty">
              {keepTimes(ifThenLine(plan.o, s, k, course))}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2.5">
              <div className="w-full sm:w-auto">
                <PrimaryButton
                  full
                  leadingIcon={CalendarPlus}
                  disabled={!planLink}
                  onClick={() => {
                    if (planLink) downloadPlanIcs(plan, course, planLink);
                  }}
                >
                  Add to calendar
                </PrimaryButton>
              </div>
              <div className="flex items-center gap-5 sm:gap-2.5">
                <SecondaryButton
                  href={
                    planLink
                      ? googleCalendarUrl({
                          title: `First session: ${course.title}`,
                          start: s,
                          minutes: 25,
                          details: `${step.text}\n${planLink}`,
                        })
                      : "#"
                  }
                  external
                  leadingIcon={ExternalLink}
                >
                  Google Calendar
                </SecondaryButton>
                <TextLink
                  className="sm:ml-3"
                  onClick={() => {
                    if (planLink) void copy(copyDetailsText(s, step.text, planLink), "Copy the session details:");
                  }}
                >
                  {copied ? (
                    <Check aria-hidden className="h-3.5 w-3.5" />
                  ) : (
                    <Copy aria-hidden className="h-3.5 w-3.5" />
                  )}
                  <span aria-live="polite">{copied ? "Copied" : "Copy details"}</span>
                </TextLink>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}
