"use client";

import type { ReactNode } from "react";
import { Check as CheckIcon, ChevronDown } from "lucide-react";
import { EngineLine, TextLink } from "@/components/ui";
import { courseById } from "@/lib/catalog";
import type { FunnelStage, RuledOut } from "@/lib/fit";
import { MOVES } from "@/lib/moves";
import { isAiEngine, type Check, type Decision } from "@/lib/pick-types";
import type { ProfileV2 } from "@/lib/profile";
import { skillLabel } from "@/lib/skills";
import {
  WHY_IT_WORKS,
  checkLabel,
  coverageCountLine,
  engineLine,
  engineName,
  noAiCallLine,
} from "@/lib/templates";
import type { UnderstandResponse } from "@/lib/understand";

// "How this was decided": a collapsed card with one part per job. Each part
// says what went in, what came out, which checks passed or fixed something,
// how long it took, and keeps the raw JSON one click further down.

function secs(ms: number | undefined): string | null {
  return typeof ms === "number" ? `${(ms / 1000).toFixed(1)}s` : null;
}

function Job({
  index,
  title,
  by,
  children,
}: {
  index: string;
  title: string;
  by: string;
  children: ReactNode;
}) {
  return (
    <section className="pt-6 first:pt-0 border-t border-border-soft first:border-t-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="flex items-baseline gap-3">
          <span className="serif-italic text-[20px] leading-none text-foreground/70">{index}</span>
          <span className="text-[16px] font-semibold text-foreground tracking-[-0.005em]">{title}</span>
        </h3>
        <span className="mono-label text-[10px] uppercase tracking-[0.2em] text-muted-2">{by}</span>
      </div>
      <div className="mt-4 flex flex-col gap-3.5">{children}</div>
    </section>
  );
}

/** A labelled row: label on the left on wide screens, above on narrow ones. */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-[120px_1fr] gap-1 sm:gap-4">
      <div className="mono-label text-[10px] uppercase tracking-[0.18em] text-muted-2 sm:pt-[3px]">{label}</div>
      <div className="text-[13.5px] leading-relaxed text-foreground/85 min-w-0">{children}</div>
    </div>
  );
}

function Checks({ checks, job }: { checks: Check[]; job: "understand" | "pick" }) {
  if (checks.length === 0) return <span className="text-muted">None ran.</span>;
  const fixed = checks.filter((c) => !c.passed).length;
  // fixed ones first: they are where code changed the AI's answer
  const sorted = [...checks].sort((a, b) => Number(a.passed) - Number(b.passed));
  return (
    <>
      <p className="mono-label text-[11px] text-muted-2">
        {checks.length} {checks.length === 1 ? "check" : "checks"} · {fixed} fixed
      </p>
      <ul className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
        {sorted.map((c) =>
          c.passed ? (
            <li key={c.name} className="flex items-start gap-2">
              <CheckIcon aria-hidden className="w-3.5 h-3.5 text-muted-2 shrink-0 mt-[3px]" />
              <span className="text-[13px] leading-snug text-foreground/85">{checkLabel(job, c.name)}</span>
            </li>
          ) : (
            <li key={c.name} className="sm:col-span-2 flex flex-col gap-0.5">
              <span className="flex items-baseline gap-2">
                <span className="mono-label text-[10px] uppercase tracking-[0.16em] text-foreground">Fixed</span>
                <span className="text-[13px] leading-snug text-foreground/85">{checkLabel(job, c.name)}</span>
              </span>
              {c.note && <span className="text-[12.5px] leading-snug text-muted">{c.note}</span>}
            </li>
          ),
        )}
      </ul>
    </>
  );
}

function Raw({ summary, value }: { summary: string; value: unknown }) {
  return (
    <details className="group/raw rounded-xl border border-border-soft bg-card-alt/50">
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer min-h-10 px-4 py-2.5 flex items-center justify-between gap-3 text-[13px] text-muted hover:text-foreground">
        <span>{summary}</span>
        <ChevronDown aria-hidden className="w-4 h-4 transition-transform group-open/raw:rotate-180" />
      </summary>
      <pre className="px-4 pb-4 max-h-80 overflow-auto text-[11px] leading-relaxed text-foreground/80 mono-label whitespace-pre-wrap break-words">
        {JSON.stringify(value, null, 2)}
      </pre>
    </details>
  );
}

function titleOf(id: string | null | undefined): string {
  if (!id) return "None";
  return courseById(id)?.title ?? id;
}

export function DecisionPanel({
  profile,
  decision,
  stages,
  ruledOut,
  leftOutShown = 0,
  understanding,
}: {
  profile: ProfileV2;
  decision: Decision;
  stages: FunnelStage[];
  ruledOut: RuledOut[];
  /** how many of ruledOut the page lists under "Left out, and why" (the first ones) */
  leftOutShown?: number;
  /** the cached /api/understand answer for this situation, if still on this device */
  understanding: UnderstandResponse | null;
}) {
  const move = MOVES[profile.move];
  const ai = isAiEngine(decision.engine);
  const u = understanding;
  const uAi = u !== null && isAiEngine(u.engine);
  const input = decision.sent?.input;
  const coverageById = new Map(decision.coverage.map((c) => [c.id, c]));
  // the person changed the AI's gaps on the check screen
  const gapsChanged =
    uAi && u !== null && u.understanding.gaps.map((g) => g.id).join("|") !== profile.gaps.join("|");
  // the first ones are listed on the page under "Left out, and why"
  const listedOnPage = ruledOut.slice(0, leftOutShown);
  const notOnPage = ruledOut.slice(leftOutShown);

  return (
    <details className="group bg-card border border-border-soft rounded-2xl card-elev">
      <summary className="list-none [&::-webkit-details-marker]:hidden cursor-pointer min-h-14 px-5 sm:px-6 py-4 flex items-center justify-between gap-4">
        <span className="text-[15px] font-semibold text-foreground">How this was decided</span>
        <span className="flex items-center gap-3">
          <span className="hidden sm:inline mono-label text-[10px] uppercase tracking-[0.2em] text-muted-2">
            Read · Rules · Match · Tailor
          </span>
          <ChevronDown aria-hidden className="w-4 h-4 text-muted transition-transform group-open:rotate-180" />
        </span>
      </summary>

      <div className="px-5 sm:px-6 pb-6 pt-2 flex flex-col gap-6">
        <EngineLine>{engineLine(decision)}</EngineLine>

        {/* 01 Read your situation */}
        <Job index="01" title="Read your situation" by={uAi && u ? engineName(u.engine, u.model) : profile.understoodBy === "ai" ? "AI" : "You"}>
          <Row label="In">
            {profile.situation
              ? `The ${u?.words ?? profile.situation.trim().split(/\s+/).length} words you wrote.`
              : "Your answers."}
          </Row>
          {uAi && u ? (
            <>
              <Row label="Out">
                <ul className="flex flex-col gap-1">
                  <li>
                    Direction: {u.understanding.move ? MOVES[u.understanding.move].label : "not clear, so you chose"}
                    {u.understanding.moveWhy ? <span className="text-muted"> {u.understanding.moveWhy}</span> : null}
                  </li>
                  {u.understanding.baseline !== null && u.understanding.move && (
                    <li>
                      Starting point: {MOVES[u.understanding.move].anchors[u.understanding.baseline]}
                      {u.understanding.baselineEvidence && (
                        <span className="text-muted"> You said: &ldquo;{u.understanding.baselineEvidence}&rdquo;</span>
                      )}
                    </li>
                  )}
                  <li>
                    You already have:{" "}
                    {u.understanding.strengths.length
                      ? u.understanding.strengths.map((s) => s.label).join(", ")
                      : "nothing named"}
                  </li>
                  <li>
                    Gaps, in order:{" "}
                    {u.understanding.gaps.length ? u.understanding.gaps.map((g) => skillLabel(g.id)).join(", ") : "none named"}
                    {gapsChanged && (
                      <span className="block text-muted">
                        Used for the pick: {profile.gaps.length ? profile.gaps.map(skillLabel).join(", ") : "none"}
                      </span>
                    )}
                  </li>
                  <li>
                    Courses mentioned:{" "}
                    {u.understanding.mentioned.length ? u.understanding.mentioned.map((m) => m.text).join(", ") : "none"}
                  </li>
                </ul>
                <p className="mt-1.5 text-[12.5px] text-muted">You confirmed or changed these on the check screen.</p>
              </Row>
              <Row label="Checks">
                <Checks job="understand" checks={u.checks} />
              </Row>
              {secs(u.ms) && <Row label="Time">{secs(u.ms)}</Row>}
              {u.raw !== undefined && <Raw summary="Show the raw answer" value={u.raw} />}
            </>
          ) : (
            <Row label="Out">
              {profile.understoodBy === "ai"
                ? "Read by the AI and confirmed by you. The raw answer is no longer saved on this device."
                : "You set the direction, starting point and gaps yourself."}
              <ul className="mt-1.5 flex flex-col gap-1 text-muted">
                <li>Direction: {move.label}</li>
                <li>Starting point: {move.anchors[profile.baseline]}</li>
                <li>Gaps, in order: {profile.gaps.length ? profile.gaps.map(skillLabel).join(", ") : "none chosen"}</li>
              </ul>
            </Row>
          )}
        </Job>

        {/* 02 Rules */}
        <Job index="02" title="Rules" by="Code">
          <Row label="Funnel">
            <ul className="flex flex-col gap-1">
              {stages.map((s) => (
                <li key={s.key}>
                  <span className="tabular-nums font-medium text-foreground">{s.count}</span>{" "}
                  <span className="text-muted">{s.suffix}</span>
                </li>
              ))}
            </ul>
          </Row>
          <Row label="Ruled out">
            {ruledOut.length === 0 ? (
              <span className="text-muted">Nothing in {move.label} was ruled out.</span>
            ) : (
              <>
                {ruledOut.length} {ruledOut.length === 1 ? "course" : "courses"}
                {listedOnPage.length > 0 && (
                  <>
                    {notOnPage.length > 0 ? `. The first ${listedOnPage.length} are` : ", listed"} under{" "}
                    <TextLink href="#left-out" className="text-[13.5px]">
                      Left out, and why
                    </TextLink>
                    {notOnPage.length > 0 ? ". The rest:" : ""}
                  </>
                )}
                {notOnPage.length > 0 && (
                  <ul className="mt-1.5 flex flex-col gap-1.5">
                    {notOnPage.map((r) => (
                      <li key={r.id} className="text-muted">
                        {r.text}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </Row>
          <Row label="Why">
            <ul className="flex flex-col gap-1">
              {WHY_IT_WORKS.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
          </Row>
        </Job>

        {/* 03 Match and choose */}
        <Job index="03" title="Match and choose" by={ai ? engineName(decision.engine, decision.model) : "Rules"}>
          <Row label="In">
            {input ? (
              <>
                {input.candidates.length} courses that passed the rules, with the module names in scope; your{" "}
                {input.gaps.length} {input.gaps.length === 1 ? "gap" : "gaps"}
                {input.mentioned.length ? `; ${input.mentioned.length} ${input.mentioned.length === 1 ? "course" : "courses"} you mentioned` : ""}
                . No hours or prices.
              </>
            ) : (
              <>
                {decision.coverage.length} {decision.coverage.length === 1 ? "course" : "courses"} that passed the rules, matched to your{" "}
                {decision.gaps.length} {decision.gaps.length === 1 ? "gap" : "gaps"} by keywords in their module names.
              </>
            )}
          </Row>
          <Row label="Out">
            <ul className="flex flex-col gap-1">
              <li>Pick: {titleOf(decision.pickId)}</li>
              {decision.alternates.length > 0 && (
                <li>Instead: {decision.alternates.map((a) => titleOf(a.id)).join(", ")}</li>
              )}
              {decision.rulesPickId && decision.rulesPickId !== decision.pickId && (
                <li className="text-muted">Rules alone: {titleOf(decision.rulesPickId)}</li>
              )}
              {ai && <li className="text-muted">Fit: {decision.honestFit}</li>}
            </ul>
            {decision.gaps.length > 0 && decision.coverage.length > 0 && (
              <ul className="mt-2.5 flex flex-col gap-1">
                {decision.coverage.map((c) => (
                  <li key={c.id} className="text-[12.5px] text-muted">
                    {titleOf(c.id)}: {coverageCountLine(coverageById.get(c.id)?.covered ?? 0, decision.gaps.length).toLowerCase()}
                    <span className="mono-label text-[10px] uppercase tracking-[0.16em] text-muted-2"> · {c.source === "keywords" ? "keywords" : c.source === "mock" ? "mock" : "AI"}</span>
                  </li>
                ))}
              </ul>
            )}
          </Row>
          {decision.checks.length > 0 && (
            <Row label="Checks">
              <Checks job="pick" checks={decision.checks} />
            </Row>
          )}
          {ai && secs(decision.ms) && <Row label="Time">{secs(decision.ms)}</Row>}
          {decision.sent ? (
            <div className="flex flex-col gap-2">
              <Raw summary="Show what the AI saw" value={decision.sent.input ?? { candidateIds: decision.sent.candidateIds }} />
              {decision.raw !== undefined && <Raw summary="Show the raw answer, before checks" value={decision.raw} />}
            </div>
          ) : (
            <Row label="AI">{noAiCallLine(decision.reason)}</Row>
          )}
        </Job>

        {/* 04 Tailor */}
        <Job index="04" title="Tailor" by="When you book">
          <Row label="When">
            Runs once when you make your plan. Each week gets one task for your job, built from that week&apos;s modules
            and checked by code. Opening the plan later makes no AI call.
          </Row>
        </Job>
      </div>
    </details>
  );
}
