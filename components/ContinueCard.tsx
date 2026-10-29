"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { courseById } from "@/lib/catalog";
import { fmtDay, fmtTime, toLocalISODate } from "@/lib/format";
import { buildWeeks, currentWeek } from "@/lib/plan-build";
import {
  checkInDue,
  getLatestPlan,
  getProgress,
  planPath,
  type PlanPayloadV2,
} from "@/lib/plan-store";
import { fadeUp } from "@/lib/motion";

// False during prerender and hydration, true once in the browser, so the card
// never renders on the server (the plan lives in localStorage).
const noopSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

type ContinueInfo = {
  /** "First session" or "Week 2 of 5" */
  lead: string;
  /** "Tue 21 Oct, 8:30 pm", shown in serif italic after the lead */
  when?: string;
  title: string;
};

/** Line text from the saved plan and its progress (spec 7, Continue card). */
function describe(plan: PlanPayloadV2, now: Date): ContinueInfo {
  const course = courseById(plan.c);
  if (!course) {
    return {
      lead: "Your saved plan",
      title: "This course is no longer in Ascend's checked list.",
    };
  }
  const progress = getProgress(plan.id);
  if (!progress.firstSessionDoneAt) {
    if (checkInDue(plan, progress, now)) {
      return { lead: "Did your first session happen?", title: course.title };
    }
    return {
      lead: "First session",
      when: `${fmtDay(plan.s)}, ${fmtTime(plan.s)}`,
      title: course.title,
    };
  }
  const built = buildWeeks({
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
  });
  const W = built.weekCount;
  const today = toLocalISODate(now);
  const last = built.weeks[built.weeks.length - 1];
  const k = currentWeek(built.weeks, now)?.k ?? (last && today >= last.end ? W : 1);
  return { lead: `Week ${k} of ${W}`, title: course.title };
}

/**
 * "// CONTINUE": shown under the landing CTA only when ascend.plans.latest
 * points at a saved plan. Opens that exact plan through its link, so a
 * pending booking on /plan can't hide it.
 */
export function ContinueCard() {
  const ready = useSyncExternalStore(noopSubscribe, onClient, onServer);
  const plan = useMemo(() => (ready ? getLatestPlan() : null), [ready]);
  const info = useMemo(() => (plan ? describe(plan, new Date()) : null), [plan]);
  const [href, setHref] = useState("/plan");

  useEffect(() => {
    if (!plan) return;
    let alive = true;
    planPath(plan)
      .then((path) => {
        if (alive) setHref(path);
      })
      .catch(() => {
        // "/plan" still opens the latest plan
      });
    return () => {
      alive = false;
    };
  }, [plan]);

  if (!plan || !info) return null;

  return (
    <div style={fadeUp(8, 0.5)} className="fade-up w-full max-w-xl">
      <div className="bg-card border border-border-soft rounded-2xl card-elev p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
            {"// CONTINUE"}
          </div>
          <div className="mt-2 text-[15px] font-medium text-foreground leading-snug">
            {info.lead}
            {info.when && (
              <>
                {" "}
                <span className="serif-italic font-normal text-[17px] text-foreground/85">
                  {info.when}
                </span>
              </>
            )}
          </div>
          <div className="mt-0.5 text-[13px] text-muted leading-snug truncate">{info.title}</div>
        </div>
        <div className="press relative inline-flex self-start sm:self-auto shrink-0">
          {/* A full load, so /plan reads the hash on arrival exactly as it does for a shared link. */}
          <a
            href={href}
            className="inline-flex items-center justify-center gap-2 min-h-11 rounded-2xl border border-border bg-card py-3 px-5 font-medium text-[14px] text-foreground hover:border-foreground/30 transition-colors"
          >
            Open your plan
            <ArrowRight aria-hidden className="w-4 h-4" />
          </a>
        </div>
      </div>
    </div>
  );
}
