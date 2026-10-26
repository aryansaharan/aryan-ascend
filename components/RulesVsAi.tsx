"use client";

import type { Decision } from "@/lib/pick-types";
import { rulesAloneLine } from "@/lib/templates";

// "Rules alone would have picked {title}. {vsRules}" when the AI chose
// differently from the keyword ranking, or the "same course" line when they
// agree. Nothing on the rules path, after a swap or after a chip.

export function RulesVsAi({
  decision,
  rulesTitle,
  className,
}: {
  decision: Decision;
  rulesTitle: string | null;
  className?: string;
}) {
  const line = rulesAloneLine(decision, rulesTitle);
  if (!line) return null;
  const lead = "Rules alone would have picked ";
  const differs = rulesTitle !== null && line.startsWith(lead + rulesTitle);
  return (
    <div className={`rounded-2xl border border-border-soft bg-card-alt/60 px-4 sm:px-5 py-3.5 ${className ?? ""}`}>
      <p className="mono-label text-[10px] uppercase tracking-[0.2em] text-muted-2">Rules vs AI</p>
      <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">
        {differs && rulesTitle ? (
          <>
            {lead}
            <span className="text-foreground font-medium">{rulesTitle}</span>
            {line.slice(lead.length + rulesTitle.length)}
          </>
        ) : (
          line
        )}
      </p>
    </div>
  );
}
