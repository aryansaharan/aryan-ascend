"use client";

import { ArrowRight, Check, ExternalLink, FastForward } from "lucide-react";
import {
  Badge,
  Card,
  EngineLine,
  FactChip,
  PrimaryButton,
  SecondaryButton,
  SectionLabel,
} from "@/components/ui";
import { fadeUp } from "@/lib/motion";
import type { Course } from "@/lib/course-types";
import type { Candidate } from "@/lib/fit";
import {
  certificateChip,
  checkedLabel,
  costLine,
  costMentionsCertificate,
  formatLabel,
  kindLabel,
  paceLine,
  ratingLine,
  type DisplayCurrency,
} from "@/lib/format";
import { MOVES } from "@/lib/moves";
import type { CandidateCoverage, Decision, Skim } from "@/lib/pick-types";
import type { ProfileV2 } from "@/lib/profile";
import { matchFor, skillLabel, type Depth, type SkillId } from "@/lib/skills";
import { coverageCountLine, coverageSourceLine, engineName, scopeNotice, skimLine } from "@/lib/templates";

// The pick: one large card. Facts are visible chips from the catalog and the
// rules; "Why this one" and "Use it at work" are the AI's (or the template's);
// "What this closes for you" maps the person's ranked gaps to real module
// names, the AI's main piece of work, shown where the decision is.

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

/** Check (direct), half (partial) or empty (not covered). Shared with the alternates. */
export function GapMark({ depth, size = "md" }: { depth: Depth | null; size?: "sm" | "md" }) {
  const box = size === "sm" ? "w-3 h-3" : "w-5 h-5";
  const label = depth === "direct" ? "Covered" : depth === "partial" ? "Partly covered" : "Not covered";
  if (depth === "direct") {
    return (
      <span role="img" aria-label={label} className={cx(box, "inline-grid place-items-center rounded-full bg-foreground text-accent-fg flex-shrink-0")}>
        {size === "md" && <Check aria-hidden className="w-3 h-3" strokeWidth={3} />}
      </span>
    );
  }
  if (depth === "partial") {
    return (
      <span role="img" aria-label={label} className={cx(box, "relative inline-block rounded-full border border-foreground overflow-hidden flex-shrink-0")}>
        <span aria-hidden className="absolute inset-y-0 left-0 w-1/2 bg-foreground" />
      </span>
    );
  }
  return <span role="img" aria-label={label} className={cx(box, "inline-block rounded-full border border-border bg-card flex-shrink-0")} />;
}

/** The short attribution in the card's corner. */
function chosenBy(d: Decision): string {
  if (d.origin === "swapped") return "Your choice";
  if (d.origin === "adjusted") return "Adjusted by rules";
  if (d.engine === "rules") return "Chosen by rules";
  return `Chosen by ${engineName(d.engine, d.model)}`;
}

function GapCoverage({
  course,
  candidate,
  gaps,
  coverage,
  skim,
  model,
}: {
  course: Course;
  candidate: Candidate | null;
  gaps: SkillId[];
  coverage: CandidateCoverage;
  skim: Skim[];
  model?: string;
}) {
  const trimmed = candidate?.scope === "trimmed";
  const placed = new Set<number>();
  const rows = gaps.map((id, i) => {
    const m = matchFor(coverage.gaps, i);
    const modules = (m?.modules ?? []).filter((x) => course.modules[x]);
    const skims = skim.filter((s) => modules.includes(s.module) && !placed.has(s.module));
    skims.forEach((s) => placed.add(s.module));
    return { id, i, depth: m ? m.depth : null, modules, skims };
  });
  const loose = skim.filter((s) => !placed.has(s.module) && course.modules[s.module]);
  const MAX_NAMES = 3;

  return (
    <div className="mt-6 rounded-xl bg-card-alt/70 border border-border-soft">
      <div className="px-4 sm:px-5 pt-4 pb-3 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <SectionLabel>What this closes for you</SectionLabel>
        <span className="mono-label text-[10px] uppercase tracking-[0.18em] text-muted-2">
          {coverageCountLine(coverage.covered, gaps.length)}
        </span>
      </div>
      <ol>
        {rows.map((r) => (
          <li key={r.id} className="px-4 sm:px-5 py-3.5 border-t border-border-soft flex gap-3">
            <div className="pt-px">
              <GapMark depth={r.depth} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span className="mono-label text-[10px] text-muted-2 tabular-nums">{String(r.i + 1).padStart(2, "0")}</span>
                <span className="text-[14.5px] font-medium text-foreground leading-snug">{skillLabel(r.id)}</span>
                {r.depth === "partial" && (
                  <span className="mono-label text-[9.5px] uppercase tracking-[0.18em] text-muted-2">Partly</span>
                )}
              </div>
              {r.modules.length > 0 ? (
                <ul className="mt-1.5 flex flex-col gap-1">
                  {r.modules.slice(0, MAX_NAMES).map((x) => (
                    <li key={x} className="text-[13px] leading-snug text-muted">
                      {course.modules[x].name}
                    </li>
                  ))}
                  {r.modules.length > MAX_NAMES && (
                    <li className="text-[12.5px] text-muted-2">
                      and {r.modules.length - MAX_NAMES} more {r.modules.length - MAX_NAMES === 1 ? "module" : "modules"}
                    </li>
                  )}
                </ul>
              ) : (
                <p className="mt-1 text-[13px] leading-snug text-muted-2">
                  {trimmed ? "Not covered in the part you'll take." : "Not covered by this course."}
                </p>
              )}
              {r.skims.map((s) => (
                <p key={s.module} className="mt-2 flex gap-1.5 text-[12.5px] leading-snug text-muted">
                  <FastForward aria-hidden className="w-3.5 h-3.5 mt-[2px] flex-shrink-0 text-muted-2" />
                  <span>{skimLine(course.modules[s.module].name, s.reason)}</span>
                </p>
              ))}
            </div>
          </li>
        ))}
      </ol>
      {loose.length > 0 && (
        <div className="px-4 sm:px-5 py-3 border-t border-border-soft flex flex-col gap-1.5">
          {loose.map((s) => (
            <p key={s.module} className="flex gap-1.5 text-[12.5px] leading-snug text-muted">
              <FastForward aria-hidden className="w-3.5 h-3.5 mt-[2px] flex-shrink-0 text-muted-2" />
              <span>{skimLine(course.modules[s.module].name, s.reason)}</span>
            </p>
          ))}
        </div>
      )}
      <div className="px-4 sm:px-5 py-3 border-t border-border-soft">
        <EngineLine>{coverageSourceLine(coverage.source, model)}</EngineLine>
      </div>
    </div>
  );
}

function Section({ label, children, className }: { label: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <SectionLabel>{label}</SectionLabel>
      <div className="mt-2 text-[14.5px] leading-relaxed text-foreground/85">{children}</div>
    </div>
  );
}

export function PickCard({
  course,
  candidate,
  profile,
  decision,
  coverage,
  currency,
  onBook,
  onCompare,
}: {
  course: Course;
  candidate: Candidate | null;
  profile: ProfileV2;
  decision: Decision;
  /** this course's coverage entry (AI, mock or keywords) */
  coverage: CandidateCoverage | null;
  currency: DisplayCurrency;
  onBook: () => void;
  /** hidden when there are no alternates */
  onCompare?: () => void;
}) {
  const h = profile.hoursPerWeek;
  const notice = candidate ? scopeNotice(candidate) : null;
  const rating = ratingLine(course);
  const showCoverage = decision.gaps.length > 0 && coverage !== null;
  // "Free. Certificate costs extra." already says it; no second certificate chip
  const certInCost = costMentionsCertificate(course);
  // skim notes only for modules inside the scope this plan covers
  const listed = candidate?.moduleCount ?? course.modules.length;
  const skimInScope = decision.skim.filter((s) => s.module < listed);
  const missing = candidate?.prereqMissing ?? [];

  return (
    <div
      style={fadeUp(14, 0.55)}
      className="fade-up"
    >
      <Card as="article" padded={false} className="p-5 sm:p-8" aria-labelledby="pick-title">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge dark>{kindLabel(course.kind)}</Badge>
            {formatLabel(course.format) !== kindLabel(course.kind) && <Badge>{formatLabel(course.format)}</Badge>}
          </div>
          <span className="mono-label text-[10px] uppercase tracking-[0.2em] text-muted-2">{chosenBy(decision)}</span>
        </div>

        <h2
          id="pick-title"
          className="mt-5 text-[1.45rem] sm:text-[1.85rem] leading-[1.15] tracking-[-0.015em] font-semibold text-foreground"
        >
          {course.title}
        </h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted">
          <span>{course.provider}</span>
          <span aria-hidden className="text-border">·</span>
          <a
            href={course.url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 py-2.5 -my-2.5 underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground/40"
          >
            Course page <ExternalLink aria-hidden className="w-3 h-3" />
          </a>
        </div>

        <ul className="mt-5 flex flex-wrap gap-1.5" aria-label="Facts">
          {candidate && (
            <li>
              <FactChip>{paceLine(candidate.weeks, h)}</FactChip>
            </li>
          )}
          <li>
            <FactChip>{costLine(course, candidate?.costAtPace, currency)}</FactChip>
          </li>
          {!certInCost && (
            <li>
              <FactChip variant="muted">{certificateChip(course.certificate)}</FactChip>
            </li>
          )}
          <li>
            <FactChip variant="muted">{checkedLabel(course)}</FactChip>
          </li>
        </ul>

        {course.freeStart && (
          <p className="mt-3 text-[13px] leading-relaxed text-muted">
            Free to start:{" "}
            <a
              href={course.freeStart.url}
              target="_blank"
              rel="noreferrer"
              className="py-2 -my-2 text-foreground/85 underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground/40"
            >
              {course.freeStart.label}
              <ExternalLink aria-hidden className="inline-block w-3 h-3 ml-1 -mt-0.5 text-muted-2" />
            </a>
          </p>
        )}

        {notice && (
          <p className="mt-4 text-[13px] leading-relaxed text-foreground/80 border-l-2 border-foreground/25 pl-3">
            {notice}
          </p>
        )}

        <Section label="Why this one" className="mt-7">
          <p className="text-[15.5px] sm:text-[16px] leading-relaxed text-foreground">{decision.whyThisOne}</p>
        </Section>

        {showCoverage && coverage && (
          <GapCoverage
            course={course}
            candidate={candidate}
            gaps={decision.gaps}
            coverage={coverage}
            skim={skimInScope}
            model={decision.model}
          />
        )}

        <Section label="Use it at work this week" className="mt-7">
          <p>{decision.useItAtWork}</p>
        </Section>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
          <Section label="Before you start">
            <p>{course.assumes}</p>
            {missing.length > 0 && (
              <p className="mono-label mt-2 text-[10.5px] tracking-[0.04em] text-muted-2">
                {`// You didn't mention ${missing.join(" or ")}`}
              </p>
            )}
          </Section>
          <Section label="Where this direction leads">
            <p>{MOVES[profile.move].artifact}</p>
          </Section>
        </div>

        {rating && course.rating && (
          <p className="mt-6 text-[12.5px] text-muted">
            <a
              href={course.rating.url}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-border underline-offset-4 hover:text-foreground"
            >
              {rating}
            </a>
          </p>
        )}

        <div className="mt-8 pt-6 border-t border-border-soft flex flex-col sm:flex-row gap-2.5 sm:gap-3">
          <PrimaryButton onClick={onBook} icon={ArrowRight} className="w-full sm:w-auto">
            Book my first session
          </PrimaryButton>
          {onCompare && (
            <SecondaryButton onClick={onCompare} className="w-full sm:w-auto">
              Compare side by side
            </SecondaryButton>
          )}
        </div>
      </Card>
    </div>
  );
}
