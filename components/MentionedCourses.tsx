"use client";

import { motion } from "framer-motion";
import { HoursCalculator } from "@/components/CheckAnother";
import { Card, EngineLine, SectionLabel, easeOut } from "@/components/ui";
import { courseById } from "@/lib/catalog";
import { checkCourse } from "@/lib/fit";
import { costLine, paceLine, type DisplayCurrency } from "@/lib/format";
import { isAiEngine, type Decision, type Verdict } from "@/lib/pick-types";
import type { MentionStatus, ProfileV2 } from "@/lib/profile";
import { NOT_IN_LIST_NOTE, NO_VERDICT_NOTE, VERDICT_LABELS, engineName } from "@/lib/templates";

// "The courses you mentioned" (addendum-ai, Job 3). The AI's verdict and its
// reason come from the pick call; every fact (weeks, cost, why the rules left
// it out) comes from code. A course outside the catalog is judged on its name
// only, and gets the hours calculator instead of facts.

const STATUS_LABELS: Record<MentionStatus, string> = {
  considering: "Considering",
  started: "Started",
  finished: "Finished",
  dropped: "Dropped",
};

function VerdictChip({ verdict }: { verdict: Verdict }) {
  const strong = verdict === "start-here";
  return (
    <span
      className={`mono-label inline-flex items-center rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] ${
        strong ? "bg-foreground text-accent-fg" : verdict === "later" ? "bg-card-alt text-foreground border border-border-soft" : "border border-border text-foreground/80"
      }`}
    >
      {VERDICT_LABELS[verdict]}
    </span>
  );
}

export function MentionedCourses({
  profile,
  decision,
  currency,
}: {
  profile: ProfileV2;
  decision: Decision;
  currency: DisplayCurrency;
}) {
  const mentioned = profile.mentioned;
  if (mentioned.length === 0) return null;
  const ai = isAiEngine(decision.engine);
  const anyVerdict = decision.mentionedVerdicts.length > 0;

  return (
    <section aria-label="The courses you mentioned">
      <SectionLabel as="h2" className="mb-3">
        The courses you mentioned
      </SectionLabel>
      <div className="flex flex-col gap-3">
        {mentioned.map((m, i) => {
          const verdict = decision.mentionedVerdicts.find((v) => v.index === i);
          const course = m.courseId ? courseById(m.courseId) : undefined;
          const isPick = course !== undefined && course.id === decision.pickId;
          const check = course ? checkCourse(profile, decision.adjust, course, { currency }) : null;
          return (
            <motion.div
              key={`${m.text}-${i}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 * i, ease: easeOut }}
            >
              <Card padded={false} className="p-4 sm:p-5">
                <div className="flex flex-wrap items-center gap-2">
                  {verdict && <VerdictChip verdict={verdict.verdict} />}
                  {isPick && !verdict && (
                    <span className="mono-label inline-flex items-center rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] bg-foreground text-accent-fg">
                      Your pick
                    </span>
                  )}
                  <span className="mono-label text-[10px] uppercase tracking-[0.18em] text-muted-2">
                    {STATUS_LABELS[m.status]}
                  </span>
                </div>
                <p className="mt-2.5 text-[15px] font-medium text-foreground leading-snug">
                  &ldquo;{m.text}&rdquo;
                </p>
                {course && course.title.toLowerCase() !== m.text.toLowerCase() && (
                  <p className="mt-1 text-[12.5px] text-muted">
                    In Ascend&apos;s list as {course.title}, {course.provider}
                  </p>
                )}

                {verdict && (
                  <p className="mt-3 text-[14px] leading-relaxed text-foreground/85">{verdict.reason}</p>
                )}

                {course && check ? (
                  <div className="mt-3 pt-3 border-t border-border-soft">
                    {check.fits ? (
                      <p className="text-[13px] leading-relaxed text-muted">
                        {paceLine(check.weeks, profile.hoursPerWeek)}
                        {check.scope && !check.scope.whole && check.scopeLabel ? ` for ${check.scopeLabel}` : ""}
                        {" · "}
                        {costLine(course, check.costAtPace, currency)}
                      </p>
                    ) : (
                      <p className="text-[13px] leading-relaxed text-muted">{check.text}</p>
                    )}
                    {!verdict && !isPick && <p className="mt-1.5 text-[12.5px] text-muted-2">{NO_VERDICT_NOTE}</p>}
                  </div>
                ) : (
                  <div className="mt-3 pt-3 border-t border-border-soft">
                    <p className="text-[12.5px] text-muted-2 mb-2.5">
                      {verdict ? NOT_IN_LIST_NOTE : "Not in Ascend's checked list."}
                    </p>
                    <HoursCalculator hoursPerWeek={profile.hoursPerWeek} />
                  </div>
                )}
              </Card>
            </motion.div>
          );
        })}
      </div>
      {ai && anyVerdict && (
        <EngineLine className="mt-3">Verdicts by {engineName(decision.engine, decision.model)}. Facts from the catalog</EngineLine>
      )}
    </section>
  );
}
