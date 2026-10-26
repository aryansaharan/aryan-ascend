"use client";

import { useEffect, useMemo, type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, ExternalLink } from "lucide-react";
import { AskSomeone } from "@/components/AskSomeone";
import {
  Badge,
  Card,
  EngineLine,
  PrimaryButton,
  Reveal,
  SecondaryButton,
  SectionLabel,
  SkeletonLine,
  TextLink,
  easeOut,
} from "@/components/ui";
import { CATALOG_VERSION, courseById } from "@/lib/catalog";
import { totalHours, type CertificateKind, type Course, type Currency } from "@/lib/course-types";
import { getLatestDecision, setChosen } from "@/lib/decision-store";
import { checkCourse, fit } from "@/lib/fit";
import {
  costLine,
  fmtDate,
  fmtMonthYear,
  formatLabel,
  formatMoney,
  hrsAWeek,
  isStale,
  kindLabel,
  ratingLine,
  weeksPhrase,
  type CostAtPace,
  type DisplayCurrency,
} from "@/lib/format";
import { USD_INR } from "@/lib/fx";
import { useDisplayCurrency } from "@/lib/hooks";
import type { CandidateCoverage, CoverageSource, Decision } from "@/lib/pick-types";
import type { ProfileV2 } from "@/lib/profile";
import {
  coverageScore,
  coveredCount,
  matchFor,
  skillLabel,
  type Depth,
  type GapMatch,
  type SkillId,
} from "@/lib/skills";
import { useCompleteProfile } from "@/lib/store";
import { coverageCountLine, coverageSourceLine, engineLine } from "@/lib/templates";

// /compare (spec 3.4 plus addendum-ai): the pick and its alternates in one
// aligned table, same facts in the same rows, read from the decision the
// pick page saved. Every number comes from the catalog and the user's answers
// via lib/fit.ts; the gap row shows the verified module match. No network.

// Data ------------------------------------------------------------------------

type Column = {
  course: Course;
  isPick: boolean;
  /** "Pick this if" row */
  lead: string;
  weeks: number;
  /** the scope label when only the first part fits, else null */
  partLabel: string | null;
  pace: CostAtPace | null;
  coverage: CandidateCoverage;
};

function buildColumns(profile: ProfileV2, d: Decision, currency: DisplayCurrency): Column[] {
  if (!d.pickId) return [];
  // Every passing course, ignoring exclusions and the candidate cap, so a
  // column is found even if the ranking shifted since the decision was made.
  const passing = new Map(
    fit(profile, d.adjust, { currency, maxCandidates: Number.MAX_SAFE_INTEGER }).candidates.map(
      (c) => [c.id, c],
    ),
  );
  const pickLead = d.origin === "swapped" ? "Your choice" : "Ascend's pick for you";
  const entries = [
    { id: d.pickId, lead: pickLead, isPick: true },
    ...d.alternates.slice(0, 2).map((a) => ({ id: a.id, lead: a.insteadIf, isPick: false })),
  ];
  const seen = new Set<string>();
  const cols: Column[] = [];
  for (const e of entries) {
    if (seen.has(e.id)) continue;
    seen.add(e.id);
    const course = courseById(e.id);
    if (!course) continue;
    const cand = passing.get(e.id);
    let weeks: number;
    let partLabel: string | null;
    let pace: CostAtPace | null;
    let keywords: GapMatch[];
    if (cand) {
      weeks = cand.weeks;
      partLabel = cand.scope === "trimmed" ? cand.scopeLabel : null;
      pace = cand.costAtPace;
      keywords = cand.coverage;
    } else {
      const check = checkCourse(profile, d.adjust, course, { currency });
      weeks = check.weeks;
      partLabel = check.scope && !check.scope.whole ? check.scopeLabel : null;
      pace = check.costAtPace;
      keywords = check.coverage;
    }
    const coverage: CandidateCoverage = d.coverage.find((c) => c.id === e.id) ?? {
      id: e.id,
      source: "keywords",
      gaps: keywords,
      covered: coveredCount(keywords),
      score: coverageScore(keywords),
    };
    cols.push({ course, isPick: e.isPick, lead: e.lead, weeks, partLabel, pace, coverage });
  }
  return cols;
}

/** Indices holding the lowest value, or none when every column ties. */
function lowest(values: number[]): Set<number> {
  if (values.length < 2) return new Set();
  const min = Math.min(...values);
  if (values.every((v) => v === min)) return new Set();
  return new Set(values.flatMap((v, i) => (v === min ? [i] : [])));
}

// Copy helpers ---------------------------------------------------------------

const COUNT_WORDS = ["", "One", "Two", "Three"] as const;

const CERTIFICATE_TEXT: Record<CertificateKind, string> = {
  free: "Free",
  paid: "Paid",
  none: "None",
};

/** Under 2 hours in minutes rounded to 5, otherwise hours rounded to the half. */
function totalHoursText(hours: number): string {
  if (hours < 2) return `About ${Math.max(5, Math.round((hours * 60) / 5) * 5)} minutes`;
  const h = Math.round(hours * 2) / 2;
  return `About ${h} ${h === 1 ? "hour" : "hours"}`;
}

function formatText(course: Course): string {
  if (course.format === "book" || course.kind === "book") return kindLabel(course.kind);
  return `${kindLabel(course.kind)} · ${formatLabel(course.format)}`;
}

function checkedOnText(course: Course): string {
  const date = fmtDate(course.lastVerified);
  return isStale(course.lastVerified) ? `${date}, may have changed` : date;
}

/** The FX sentence, only when a converted amount is on screen. */
function fxNote(cols: Column[], currency: DisplayCurrency): string | null {
  const other: Currency = currency === "INR" ? "USD" : "INR";
  const converts = cols.some((c) => {
    const cost = c.course.cost;
    return cost !== null && cost.model !== "free" && cost.currency === other;
  });
  if (!converts) return null;
  const rate = formatMoney(USD_INR.rate, "INR");
  const set = fmtDate(USD_INR.setOn);
  return currency === "INR"
    ? `Rupee amounts for USD prices use ${rate} to the dollar, set ${set}.`
    : `Dollar amounts for rupee prices use ${rate} to the dollar, set ${set}.`;
}

// Small pieces -----------------------------------------------------------------

/** The 6px black dot on the best value in the Weeks and Cost rows. */
function BestDot({ label }: { label: string }) {
  return (
    <>
      <span
        aria-hidden
        className="inline-block w-1.5 h-1.5 rounded-full bg-foreground align-middle mr-2 -mt-0.5"
      />
      <span className="sr-only">{label}: </span>
    </>
  );
}

/** Check (direct), half (partial) or empty (not covered). */
function GapMark({ depth }: { depth: Depth | null }) {
  const label = depth === "direct" ? "Covered" : depth === "partial" ? "Partly covered" : "Not covered";
  return (
    <span
      role="img"
      aria-label={label}
      className={`relative mt-px inline-flex w-[18px] h-[18px] flex-shrink-0 items-center justify-center rounded-full ${
        depth === "direct"
          ? "bg-foreground text-accent-fg"
          : depth === "partial"
            ? "border border-foreground bg-card"
            : "border border-border bg-card"
      }`}
      style={
        depth === "partial"
          ? { backgroundImage: "linear-gradient(90deg, #0A0A0A 50%, transparent 50%)" }
          : undefined
      }
    >
      {depth === "direct" && <Check aria-hidden strokeWidth={3} className="w-[11px] h-[11px]" />}
    </span>
  );
}

/** "// Matched by ..." under the gap row: the engine-line voice, tracked tighter so it fits a narrow column. */
function SourceLine({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={`mono-label text-[10px] uppercase tracking-[0.08em] leading-relaxed text-muted-2 ${className ?? ""}`}
    >
      {"// "}
      {children}
    </p>
  );
}

/** An inline external link with a 40px hit area that doesn't change the line. */
function CellLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="py-2.5 -my-2.5 text-foreground/85 underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground/40"
    >
      {children}
      <ExternalLink aria-hidden className="inline-block w-3 h-3 ml-1 -mt-0.5 text-muted-2" />
    </a>
  );
}

function GapModules({ col, gap, compact = false }: { col: Column; gap: number; compact?: boolean }) {
  const m = matchFor(col.coverage.gaps, gap);
  const size = compact ? "text-[12px]" : "text-[13px]";
  if (!m) {
    return (
      <p className={`${size} leading-snug text-muted-2`}>
        {col.partLabel ? "Not in the part that fits" : "Not covered"}
      </p>
    );
  }
  const names = m.modules
    .map((i) => col.course.modules[i]?.name)
    .filter((n): n is string => Boolean(n));
  const shown = names.slice(0, 2);
  const more = names.length - shown.length;
  return (
    <div className={`min-w-0 ${size} leading-snug`}>
      <ul className="flex flex-col gap-1">
        {shown.map((n, i) => (
          <li key={`${i}-${n}`} className={compact ? "text-muted" : "text-foreground/85"}>
            {i === 0 && m.depth === "partial" && <span className="text-muted-2">Partly: </span>}
            {n}
          </li>
        ))}
      </ul>
      {more > 0 && <p className="mt-1 text-muted-2">and {more} more</p>}
    </div>
  );
}

function CourseHead({ col }: { col: Column }) {
  const c = col.course;
  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5">
        {col.isPick && <Badge dark>Your pick</Badge>}
        <Badge>{kindLabel(c.kind)}</Badge>
      </div>
      <h2 className="mt-3 text-[16px] lg:text-[17px] leading-snug font-semibold tracking-[-0.005em] text-foreground">
        {c.title}
      </h2>
      <div className="mt-1 text-[12px] text-muted-2">{c.provider}</div>
      <div className="mt-auto pt-3">
        <TextLink href={c.url} external>
          Course page
          <ExternalLink aria-hidden className="w-3 h-3" />
        </TextLink>
      </div>
    </div>
  );
}

/** "Choose this": black for the pick, outline for the others. */
function ChooseButton({ col, onChoose }: { col: Column; onChoose: (id: string) => void }) {
  const inner = (
    <>
      Choose this
      <ArrowRight aria-hidden className="w-4 h-4" />
    </>
  );
  const onClick = () => onChoose(col.course.id);
  return col.isPick ? (
    <PrimaryButton full onClick={onClick} className="whitespace-nowrap">
      {inner}
    </PrimaryButton>
  ) : (
    <SecondaryButton full onClick={onClick} className="whitespace-nowrap">
      {inner}
    </SecondaryButton>
  );
}

// Rows -----------------------------------------------------------------------

type Fact = {
  key: string;
  label: string;
  /** small line under the label (desktop) */
  hint?: string;
  render: (col: Column, i: number) => ReactNode;
};

function useFacts(
  cols: Column[],
  profile: ProfileV2 | null,
  currency: DisplayCurrency,
): Fact[] {
  return useMemo(() => {
    if (!profile) return [];
    const bestWeeks = lowest(cols.map((c) => c.weeks));
    const costs = cols.map((c) => c.pace?.inr);
    const bestCost = costs.every((x): x is number => typeof x === "number")
      ? lowest(costs)
      : new Set<number>();
    const text = "text-[13px] lg:text-[14px] leading-relaxed text-foreground/85";
    return [
      {
        key: "lead",
        label: "Pick this if",
        render: (col) =>
          col.isPick ? (
            <p className="text-[13px] lg:text-[14px] leading-relaxed font-medium text-foreground">
              {col.lead}
            </p>
          ) : (
            <p className={text}>{col.lead}</p>
          ),
      },
      {
        key: "bestFor",
        label: "Best for",
        render: (col) => <p className={text}>{col.course.bestFor}</p>,
      },
      {
        key: "weeks",
        label: "Weeks at your pace",
        hint: `At ${hrsAWeek(profile.hoursPerWeek)}`,
        render: (col, i) => (
          <div className={text}>
            <p className="font-medium text-foreground">
              {bestWeeks.has(i) && <BestDot label="Fewest weeks" />}
              About {weeksPhrase(col.weeks)}
              <span className="lg:hidden font-normal text-foreground/85">
                {" "}
                at {hrsAWeek(profile.hoursPerWeek)}
              </span>
            </p>
            {col.partLabel && (
              <p className="mt-1 text-[12px] leading-snug text-muted">
                First part only: {col.partLabel}
              </p>
            )}
          </div>
        ),
      },
      {
        key: "hours",
        label: "Total hours",
        render: (col) => (
          <div className={text}>
            <p>{totalHoursText(totalHours(col.course))}</p>
            {col.course.hoursSource === "estimate" && (
              <p className="mt-0.5 text-[12px] text-muted-2">Ascend&apos;s estimate</p>
            )}
          </div>
        ),
      },
      {
        key: "cost",
        label: "Cost at your pace",
        render: (col, i) => (
          <p className={text}>
            {bestCost.has(i) && <BestDot label="Lowest cost" />}
            {costLine(col.course, col.pace, currency)}
          </p>
        ),
      },
      {
        key: "free",
        label: "Free way in",
        render: (col) => (
          <p className={text}>
            {col.course.freeStart ? (
              <CellLink href={col.course.freeStart.url}>{col.course.freeStart.label}</CellLink>
            ) : (
              <span className="text-muted-2">None listed</span>
            )}
          </p>
        ),
      },
      {
        key: "certificate",
        label: "Certificate",
        render: (col) => <p className={text}>{CERTIFICATE_TEXT[col.course.certificate]}</p>,
      },
      {
        key: "format",
        label: "Format",
        render: (col) => <p className={text}>{formatText(col.course)}</p>,
      },
      {
        key: "assumes",
        label: "Assumes",
        render: (col) => <p className={text}>{col.course.assumes}</p>,
      },
      {
        key: "updated",
        label: "Course updated",
        render: (col) => <p className={text}>{col.course.updatedYear}</p>,
      },
      {
        key: "rating",
        label: "Public rating",
        render: (col) => {
          const line = ratingLine(col.course);
          return (
            <p className={text}>
              {line && col.course.rating ? (
                <CellLink href={col.course.rating.url}>{line}</CellLink>
              ) : (
                <span className="text-muted-2">No public rating we could check</span>
              )}
            </p>
          );
        },
      },
      {
        key: "checked",
        label: "Checked on",
        render: (col) => <p className={text}>{checkedOnText(col.course)}</p>,
      },
    ];
  }, [cols, profile, currency]);
}

// Table (1024px and up) --------------------------------------------------

type DeskRow =
  | { kind: "head" }
  | { kind: "gapHead" }
  | { kind: "gap"; gap: number; last: boolean }
  | { kind: "fact"; fact: Fact }
  | { kind: "foot" };

function CompareTable({
  cols,
  gaps,
  facts,
  sharedSource,
  model,
  dotLegend,
  onChoose,
}: {
  cols: Column[];
  gaps: SkillId[];
  facts: Fact[];
  sharedSource: CoverageSource | null;
  model?: string;
  dotLegend: string | null;
  onChoose: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  const rows: DeskRow[] = [
    { kind: "head" },
    ...(gaps.length > 0
      ? [
          { kind: "gapHead" } as const,
          ...gaps.map((_, gap) => ({ kind: "gap", gap, last: gap === gaps.length - 1 }) as const),
        ]
      : []),
    ...facts.map((fact) => ({ kind: "fact", fact }) as const),
    { kind: "foot" },
  ];

  const labelCell = (row: DeskRow): ReactNode => {
    switch (row.kind) {
      case "head":
        return dotLegend ? (
          <div className="flex h-full items-end pb-1">
            <p className="text-[12px] leading-snug text-muted-2">
              <span
                aria-hidden
                className="inline-block w-1.5 h-1.5 rounded-full bg-foreground align-middle mr-2 -mt-0.5"
              />
              {dotLegend}
            </p>
          </div>
        ) : null;
      case "gapHead":
        return (
          <div>
            <SectionLabel as="div" className="text-foreground/80">
              Your gaps covered
            </SectionLabel>
            {sharedSource && (
              <SourceLine className="mt-1.5">
                {coverageSourceLine(sharedSource, model)}
              </SourceLine>
            )}
          </div>
        );
      case "gap":
        return (
          <div className="flex items-baseline gap-2">
            <span className="mono-label text-[10px] text-muted-2">
              {String(row.gap + 1).padStart(2, "0")}
            </span>
            <span className="text-[13px] leading-snug text-foreground/85">{skillLabel(gaps[row.gap])}</span>
          </div>
        );
      case "fact":
        return (
          <div>
            <SectionLabel as="div">{row.fact.label}</SectionLabel>
            {row.fact.hint && <p className="mt-1 text-[12px] text-muted-2">{row.fact.hint}</p>}
          </div>
        );
      case "foot":
        return null;
    }
  };

  const columnCell = (row: DeskRow, col: Column, i: number): ReactNode => {
    switch (row.kind) {
      case "head":
        return <CourseHead col={col} />;
      case "gapHead":
        return (
          <div>
            <p className="flex items-baseline gap-1.5 leading-none">
              <span className="sr-only">
                {coverageCountLine(coveredCount(col.coverage.gaps), gaps.length)}
              </span>
              <span aria-hidden className="text-[26px] lg:text-[28px] font-semibold tracking-[-0.02em] text-foreground">
                {coveredCount(col.coverage.gaps)}
              </span>
              <span aria-hidden className="text-[14px] text-muted">
                of {gaps.length}
              </span>
            </p>
            {!sharedSource && (
              <SourceLine className="mt-1">
                {coverageSourceLine(col.coverage.source, model)}
              </SourceLine>
            )}
          </div>
        );
      case "gap": {
        const m = matchFor(col.coverage.gaps, row.gap);
        return (
          <div className="flex items-start gap-2.5">
            <GapMark depth={m?.depth ?? null} />
            <GapModules col={col} gap={row.gap} />
          </div>
        );
      }
      case "fact":
        return row.fact.render(col, i);
      case "foot":
        return <ChooseButton col={col} onChoose={onChoose} />;
    }
  };

  const pad = (row: DeskRow, side: "label" | "col"): string => {
    const x = side === "col" ? "px-4 lg:px-5" : "pr-4";
    switch (row.kind) {
      case "head":
        return `${x} pt-5 pb-4`;
      case "gapHead":
        return `${x} pt-4 pb-2.5 border-t border-border-soft`;
      case "gap":
        return `${x} py-2 ${row.last ? "pb-4" : ""}`;
      case "fact":
        return `${x} py-3.5 border-t border-border-soft`;
      case "foot":
        return `${x} pt-4 pb-5 border-t border-border-soft`;
    }
  };

  const key = (row: DeskRow, idx: number) =>
    row.kind === "fact" ? row.fact.key : row.kind === "gap" ? `gap-${row.gap}` : `${row.kind}-${idx}`;

  return (
    <div
      className="hidden lg:grid gap-x-3"
      style={{
        gridTemplateColumns: `minmax(7.5rem, 17%) repeat(${cols.length}, minmax(0, 1fr))`,
        gridTemplateRows: `repeat(${rows.length}, auto)`,
      }}
    >
      <div className="row-span-full grid grid-rows-subgrid">
        {rows.map((row, idx) => (
          <div key={key(row, idx)} className={`min-w-0 ${pad(row, "label")}`}>
            {labelCell(row)}
          </div>
        ))}
      </div>
      {cols.map((col, i) => (
        <motion.div
          key={col.course.id}
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: easeOut }}
          className={`row-span-full grid grid-rows-subgrid min-w-0 rounded-2xl bg-card border ${
            col.isPick
              ? "border-foreground shadow-[0_10px_30px_-18px_rgba(10,10,10,0.35)]"
              : "border-border-soft card-elev"
          }`}
        >
          {rows.map((row, idx) => (
            <div key={key(row, idx)} className={`min-w-0 ${pad(row, "col")}`}>
              {columnCell(row, col, i)}
            </div>
          ))}
        </motion.div>
      ))}
    </div>
  );
}

// Stacked cards (under 1024px, so phones and tablets get them) ------------------------------------------------------

function CompareCards({
  cols,
  gaps,
  facts,
  model,
  onChoose,
}: {
  cols: Column[];
  gaps: SkillId[];
  facts: Fact[];
  model?: string;
  onChoose: (id: string) => void;
}) {
  const reduced = useReducedMotion();
  return (
    <div className="lg:hidden flex flex-col gap-3">
      {cols.map((col, i) => (
        <motion.article
          key={col.course.id}
          initial={reduced ? false : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 + i * 0.08, ease: easeOut }}
          className={`rounded-2xl bg-card border ${
            col.isPick
              ? "border-foreground shadow-[0_10px_30px_-18px_rgba(10,10,10,0.35)]"
              : "border-border-soft card-elev"
          }`}
        >
          <div className="px-5 pt-5 pb-4">
            <CourseHead col={col} />
          </div>
          <dl>
            {gaps.length > 0 && (
              <div className="px-5 py-4 border-t border-border-soft">
                <dt className="flex items-baseline justify-between gap-3">
                  <SectionLabel as="div" className="text-foreground/80">
                    Your gaps covered
                  </SectionLabel>
                  <span className="text-[13px] font-medium text-foreground">
                    {coveredCount(col.coverage.gaps)} of {gaps.length}
                  </span>
                </dt>
                <dd className="mt-3">
                  <ul className="flex flex-col gap-3">
                    {gaps.map((id, gap) => {
                      const m = matchFor(col.coverage.gaps, gap);
                      return (
                        <li key={id} className="flex items-start gap-2.5">
                          <GapMark depth={m?.depth ?? null} />
                          <div className="min-w-0">
                            <p className="text-[13px] leading-snug font-medium text-foreground">
                              {skillLabel(id)}
                            </p>
                            <div className="mt-0.5">
                              <GapModules col={col} gap={gap} compact />
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <SourceLine className="mt-3">
                    {coverageSourceLine(col.coverage.source, model)}
                  </SourceLine>
                </dd>
              </div>
            )}
            {facts.map((fact) => (
              <div key={fact.key} className="px-5 py-3 border-t border-border-soft">
                <dt>
                  <SectionLabel as="div" className="text-[10px]">
                    {fact.label}
                  </SectionLabel>
                </dt>
                <dd className="mt-1">{fact.render(col, i)}</dd>
              </div>
            ))}
          </dl>
          <div className="px-5 pt-4 pb-5 border-t border-border-soft">
            <ChooseButton col={col} onChoose={onChoose} />
          </div>
        </motion.article>
      ))}
    </div>
  );
}

// Page -------------------------------------------------------------------------

/** "// 03 SIDE BY SIDE" with a hairline and the catalog month, like the pick page's strip. */
function SectionStrip() {
  return (
    <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 flex items-center gap-3 pt-2 sm:pt-6">
      <span className="mono-label text-muted font-medium">{"// 03 SIDE BY SIDE"}</span>
      <span aria-hidden className="flex-1 h-px bg-border-soft" />
      <span className="mono-label">Checked {fmtMonthYear(CATALOG_VERSION)}</span>
    </div>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-6xl mx-auto flex flex-col min-h-screen px-6 sm:px-10 lg:px-16">
        <header className="py-5 flex items-center justify-between">
          <Link
            href="/recommendations"
            className="inline-flex min-h-10 items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft aria-hidden className="w-4 h-4" />
            Your pick
          </Link>
        </header>
        {children}
      </div>
    </main>
  );
}

export default function Compare() {
  const router = useRouter();
  const [profile, ready] = useCompleteProfile();
  const currency = useDisplayCurrency();

  const decision = useMemo(
    () => (ready && profile ? getLatestDecision(profile) : null),
    [ready, profile],
  );

  useEffect(() => {
    if (!ready) return;
    if (!profile) router.replace("/assess");
    else if (!decision || !decision.pickId) router.replace("/recommendations");
  }, [ready, profile, decision, router]);

  const cols = useMemo(
    () => (profile && decision ? buildColumns(profile, decision, currency) : []),
    [profile, decision, currency],
  );
  const facts = useFacts(cols, profile, currency);

  if (!ready || !profile || !decision || !decision.pickId) {
    return (
      <Shell>
        <section className="mt-6" aria-busy="true">
          <SkeletonLine className="w-28" />
          <SkeletonLine className="mt-5 h-7 w-72 max-w-full" />
          <SkeletonLine className="mt-4 w-96 max-w-full" />
        </section>
      </Shell>
    );
  }

  if (cols.length < 2) {
    return (
      <Shell>
        <section>
          <SectionStrip />
          <Reveal delay={0.05}>
            <Card className="mt-6 max-w-2xl">
              <p className="text-[15px] leading-relaxed text-foreground">
                Only one course fit your answers, so there&apos;s nothing to compare yet.
              </p>
              <div className="mt-4">
                <TextLink href="/recommendations">
                  <ArrowLeft aria-hidden className="w-3.5 h-3.5" />
                  Back to your pick
                </TextLink>
              </div>
            </Card>
          </Reveal>
        </section>
      </Shell>
    );
  }

  const d = decision;
  const gaps = d.gaps ?? [];
  const sources = new Set(cols.map((c) => c.coverage.source));
  const sharedSource = sources.size === 1 ? cols[0].coverage.source : null;
  const weeksDot = lowest(cols.map((c) => c.weeks)).size > 0;
  const costDot = cols.every((c) => c.pace) && lowest(cols.map((c) => c.pace?.inr ?? 0)).size > 0;
  const dotLegend =
    weeksDot && costDot
      ? "Fewest weeks and lowest cost"
      : weeksDot
        ? "Fewest weeks"
        : costDot
          ? "Lowest cost"
          : null;
  const allFree = cols.every((c) => c.course.cost?.model === "free");
  const pickCourse = cols.find((c) => c.isPick)?.course ?? null;
  // only promise a free way in when the pick has one
  const beforeYouPay = allFree
    ? "All of these are free. Start with week one of your pick, and decide after."
    : pickCourse?.cost?.model === "free"
      ? "Your pick is free. Start with week one, and decide after."
      : pickCourse?.freeStart
        ? "Start with the free way in. If week one fits, then decide."
        : "There is no free way in for this one. Read the course page before you pay, and check the first module fits.";
  const fx = fxNote(cols, currency);

  function choose(id: string) {
    setChosen(d.key, id);
    router.push("/plan?from=compare");
  }

  return (
    <Shell>
      <section>
        <Reveal>
          <SectionStrip />
        </Reveal>
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.05, ease: easeOut }}
          className="mt-5 text-[2rem] sm:text-[2.5rem] lg:text-[2.75rem] leading-[1.05] tracking-[-0.02em] font-semibold text-foreground"
        >
          {COUNT_WORDS[cols.length]} that fit.{" "}
          <span className="serif-italic font-normal text-foreground/85">One to start.</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.12, ease: easeOut }}
          className="mt-3 text-[15px] sm:text-base leading-relaxed text-muted max-w-[58ch]"
        >
          Same facts, same rows.{" "}
          <span className="hidden lg:inline">The outlined column is your pick.</span>
          <span className="lg:hidden">The outlined card is your pick.</span>
        </motion.p>
        <Reveal delay={0.18}>
          <EngineLine className="mt-4">{engineLine(d)}</EngineLine>
        </Reveal>
      </section>

      <section className="mt-8 sm:mt-10" aria-label="Courses side by side">
        {dotLegend && (
          <p className="lg:hidden mb-3 text-[12px] text-muted-2">
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full bg-foreground align-middle mr-2 -mt-0.5"
            />
            {dotLegend}
          </p>
        )}
        <CompareTable
          cols={cols}
          gaps={gaps}
          facts={facts}
          sharedSource={sharedSource}
          model={d.model}
          dotLegend={dotLegend}
          onChoose={choose}
        />
        <CompareCards cols={cols} gaps={gaps} facts={facts} model={d.model} onChoose={choose} />
      </section>

      <section className="mt-10 sm:mt-12 flex flex-col gap-3">
        <Reveal className="rounded-2xl bg-card-alt px-5 py-4 sm:px-6 sm:py-5 flex flex-col sm:flex-row sm:items-baseline gap-1.5 sm:gap-6">
          <SectionLabel as="h2" className="flex-shrink-0 text-foreground/70">
            Before you pay
          </SectionLabel>
          <p className="text-[15px] leading-relaxed text-foreground">{beforeYouPay}</p>
        </Reveal>
        <AskSomeone
          className="min-w-0"
          courses={cols.map((c) => ({ id: c.course.id, title: c.course.title }))}
          role={profile.currentRole}
          hoursPerWeek={profile.hoursPerWeek}
        />
      </section>

      <footer className="mt-auto pt-10 pb-8">
        <p className="text-[12px] leading-relaxed text-muted-2 max-w-[72ch]">
          Prices and ratings checked on the dates shown. They change, so confirm on the course
          page.{fx ? ` ${fx}` : ""}
        </p>
        <div className="mt-5">
          <TextLink href="/recommendations">
            <ArrowLeft aria-hidden className="w-3.5 h-3.5" />
            Back to your pick
          </TextLink>
        </div>
      </footer>
    </Shell>
  );
}
