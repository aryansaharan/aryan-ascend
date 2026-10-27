"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Funnel } from "@/components/Funnel";
import { BlinkCaret, easeOut } from "@/components/ui";
import type { FunnelStage } from "@/lib/fit";
import { modelLabel } from "@/lib/format";
import { isAiEngine, type Decision } from "@/lib/pick-types";
import type { SkillId } from "@/lib/skills";
import { MOCK_LABEL, engineLine, receiptLines } from "@/lib/templates";

// The top of the pick page: who did what, in three rows. RULES is the funnel
// (code narrowing the catalog), AI is what the model did with what was left,
// CHECKS is what code verified in the model's answer. Every number comes from
// receiptLines and funnelStages, which count the real request and the
// verified answer; this component only lays them out. On the rules path the
// AI row says why the AI didn't choose, and there is no CHECKS row.

const ROW_BASE = "mono-label text-[10.5px] sm:text-[11px] leading-[1.6] text-muted-2";
const ROW_TEXT = `${ROW_BASE} uppercase tracking-[0.14em]`;

/** Numbers in the foreground, words muted, like the funnel. */
function emphasize(text: string): ReactNode[] {
  return text.split(/(\d[\d,.]*)/).map((part, i) =>
    /^\d/.test(part) ? (
      <span key={i} className="mono-label tabular-nums text-foreground">
        {part}
      </span>
    ) : (
      <span key={i} className="mono-label">
        {part}
      </span>
    ),
  );
}

function Row({ label, tag, children }: { label: string; tag?: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[3.75rem_1fr] sm:grid-cols-[4.5rem_1fr] gap-x-3 items-baseline">
      <div className="flex flex-col gap-1">
        <span className="mono-label text-[10px] uppercase tracking-[0.22em] text-foreground font-medium">
          {label}
        </span>
        {tag && (
          <span className="mono-label text-[9px] uppercase tracking-[0.16em] text-muted-2">{tag}</span>
        )}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * True when the AI chose from exactly these courses: the list on screen is the
 * one it was sent. A chip that keeps the AI's pick but changes the list makes
 * this false. Without `candidateIds` (a caller that can't tell), true.
 */
export function aiSawThese(decision: Decision | null, candidateIds?: readonly string[]): boolean {
  if (!decision?.sent || candidateIds === undefined) return true;
  const sent = decision.sent.candidateIds;
  return sent.length === candidateIds.length && sent.every((id) => candidateIds.includes(id));
}

/**
 * The funnel's last stage depends on who chose: on the AI path code hands the
 * finishable courses to the AI (the "chose 1" pill moves to the AI row); on
 * the rules path code picks, so the pill stays in the rules row. "{n} to the
 * AI" shows only while the courses on screen are the ones the AI was sent
 * (pass `candidateIds`, the current fit() candidates); after a chip changes
 * them the funnel ends in "1 pick", counted from today's list.
 */
export function ledgerStages(
  stages: FunnelStage[],
  decision: Decision | null,
  candidateIds?: readonly string[],
): FunnelStage[] {
  if (!decision || !isAiEngine(decision.engine) || decision.origin === "swapped" || decision.origin === "adjusted") {
    return stages;
  }
  if (!aiSawThese(decision, candidateIds)) return stages;
  const sent = decision.sent?.candidateIds.length ?? decision.receipt.courses;
  return stages.map((s) => (s.key === "pick" ? { key: "sent", count: sent, suffix: "to the AI" } : s));
}

export function WorkLedger({
  stages,
  candidateIds,
  decision,
  understoodBy,
  aiGapIds,
  play,
  hold,
  onHeld,
  onDone,
  pending,
  funnelKey,
  className,
}: {
  stages: FunnelStage[];
  /** the fit() candidates on screen, so "{n} to the AI" shows only while they are what the AI saw */
  candidateIds?: readonly string[];
  decision: Decision | null;
  understoodBy: "ai" | "user";
  aiGapIds?: readonly SkillId[] | null;
  play: boolean;
  hold: boolean;
  onHeld?: () => void;
  onDone?: () => void;
  /** the answer has arrived but the funnel is still revealing, or nothing yet */
  pending: boolean;
  funnelKey: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const lines = decision && !pending ? receiptLines(decision, understoodBy, aiGapIds ?? null) : [];
  const ai = decision ? isAiEngine(decision.engine) : false;
  const mock = decision?.engine === "mock";

  let aiRow: ReactNode = null;
  let checksRow: ReactNode = null;
  if (pending || !decision) {
    aiRow = (
      <p className={ROW_TEXT}>
        <span className="mono-label">waiting for the rules</span>
        <BlinkCaret />
      </p>
    );
  } else if (decision.pickId) {
    const workLine = lines.find((l) => !l.startsWith("Code checked:")) ?? "";
    const checked = lines.find((l) => l.startsWith("Code checked:"));
    if (ai || decision.origin === "swapped" || decision.origin === "adjusted") {
      const work = workLine.replace(`${MOCK_LABEL} · `, "").replace(/^AI /, "");
      const by =
        ai && decision.origin !== "swapped" && decision.origin !== "adjusted"
          ? `${mock ? MOCK_LABEL : modelLabel(decision.model)}${typeof decision.ms === "number" ? ` · ${(decision.ms / 1000).toFixed(1)}s` : ""}`
          : null;
      const parts = work.split(" · ");
      const last = parts.length > 1 && /^chose \d/.test(parts[parts.length - 1]) ? parts.pop() : null;
      aiRow = (
        <p className={ROW_TEXT}>
          {emphasize(parts.join(" · "))}
          {last && (
            <>
              <span className="mono-label text-border">{" · "}</span>
              <span className="mono-label inline-flex items-center rounded-full bg-foreground text-accent-fg px-2 py-px">
                {last}
              </span>
            </>
          )}
          {by && (
            <span className="mono-label block mt-0.5 normal-case tracking-[0.04em] text-muted-2">
              by {by}
            </span>
          )}
        </p>
      );
      if (checked) checksRow = <p className={ROW_TEXT}>{emphasize(checked.replace("Code checked: ", ""))}</p>;
    } else {
      // Rules path: say plainly why the AI didn't choose.
      const why = engineLine(decision).replace(/^Chosen by Ascend's rules\. /, "");
      aiRow = (
        <p className={`${ROW_BASE} tracking-[0.02em]`}>
          <span className="mono-label">{why}.</span>
          {workLine && workLine !== engineLine(decision) && (
            <span className="mono-label block">{emphasize(workLine)}.</span>
          )}
        </p>
      );
    }
  }

  return (
    <section
      aria-label="How this pick was made"
      className={`rounded-2xl border border-border-soft bg-card/70 px-4 sm:px-5 py-3.5 sm:py-4 flex flex-col gap-2.5 ${className ?? ""}`}
    >
      <Row label="Rules" tag="code">
        <Funnel
          key={funnelKey}
          stages={ledgerStages(stages, decision, candidateIds)}
          play={play}
          hold={hold}
          onHeld={onHeld}
          onDone={onDone}
        />
      </Row>
      <motion.div
        initial={false}
        animate={{ opacity: aiRow ? 1 : 0 }}
        transition={{ duration: reduced ? 0 : 0.35, ease: easeOut }}
      >
        <Row label="AI">
          {aiRow}
        </Row>
      </motion.div>
      {checksRow && (
        <motion.div
          initial={reduced ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: reduced ? 0 : 0.15, ease: easeOut }}
        >
          <Row label="Checks" tag="code">
            {checksRow}
          </Row>
        </motion.div>
      )}
    </section>
  );
}
