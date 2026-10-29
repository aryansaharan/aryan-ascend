"use client";

import { GapMark } from "@/components/PickCard";
import { Card, SecondaryButton, SectionLabel } from "@/components/ui";
import type { Course } from "@/lib/course-types";
import type { Candidate } from "@/lib/fit";
import { checkedLabel, costLine, paceLine, type DisplayCurrency } from "@/lib/format";
import type { Alternate, CandidateCoverage } from "@/lib/pick-types";
import { fadeUp } from "@/lib/motion";
import { matchFor } from "@/lib/skills";
import { coverageCountLine } from "@/lib/templates";

// "Or pick one of these instead": up to two compact rows. The code-written
// "Pick this instead if" line leads, then the facts, then how many of the
// person's gaps the course covers. Swapping is local and makes no call.

export type AlternateRow = {
  alt: Alternate;
  course: Course;
  candidate: Candidate | null;
  coverage: CandidateCoverage | null;
};

export function Alternates({
  rows,
  gapCount,
  pickCoversFirst = false,
  hoursPerWeek,
  currency,
  onSwap,
}: {
  rows: AlternateRow[];
  gapCount: number;
  /** the pick closes the first gap, so an alternate that doesn't says so (the AI ranks the first gap highest) */
  pickCoversFirst?: boolean;
  hoursPerWeek: number;
  currency: DisplayCurrency;
  onSwap: (id: string) => void;
}) {
  if (rows.length === 0) return null;
  return (
    <section aria-labelledby="alts-label">
      <SectionLabel as="h2" className="mb-3">
        <span id="alts-label">Or pick one of these instead</span>
      </SectionLabel>
      <div className="flex flex-col gap-3">
        {rows.map((r, idx) => (
          <div
            key={r.alt.id}
            style={fadeUp(10, 0.45, 0.05 * idx)}
            className="fade-up"
          >
            <Card padded={false} className="p-4 sm:p-5">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6">
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-medium text-foreground leading-snug">{r.alt.insteadIf}</p>
                  <p className="mt-1.5 text-[13.5px] text-foreground/80 leading-snug">
                    {r.course.title}
                    <span className="text-muted"> · {r.course.provider}</span>
                  </p>
                  <p className="mt-1.5 text-[12.5px] text-muted leading-relaxed">
                    {r.candidate ? `${paceLine(r.candidate.weeks, hoursPerWeek)} · ` : ""}
                    {costLine(r.course, r.candidate?.costAtPace, currency)}
                    {` · ${checkedLabel(r.course)}`}
                  </p>
                  {gapCount > 0 && r.coverage && (
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="flex items-center gap-1" aria-hidden>
                        {Array.from({ length: gapCount }, (_, i) => {
                          const m = matchFor(r.coverage?.gaps ?? [], i);
                          return <GapMark key={i} size="sm" depth={m ? m.depth : null} />;
                        })}
                      </span>
                      <span className="mono-label text-[10px] uppercase tracking-[0.18em] text-muted-2">
                        {coverageCountLine(r.coverage.covered, gapCount)}
                        {pickCoversFirst && gapCount > 1 && !matchFor(r.coverage.gaps, 0) ? " · not your first gap" : ""}
                      </span>
                    </div>
                  )}
                </div>
                <SecondaryButton onClick={() => onSwap(r.alt.id)} className="w-full sm:w-auto whitespace-nowrap">
                  Make this my pick
                </SecondaryButton>
              </div>
            </Card>
          </div>
        ))}
      </div>
    </section>
  );
}
