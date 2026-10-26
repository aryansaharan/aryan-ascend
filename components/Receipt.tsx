"use client";

import { EngineLine } from "@/components/ui";
import type { Decision } from "@/lib/pick-types";
import type { SkillId } from "@/lib/skills";
import { engineLine, receiptLines } from "@/lib/templates";

// The receipt under the pick card: who chose, what the AI did, and what code
// checked, each counted by code from the real request and the verified answer
// (lib/templates.ts). On the rules path it says so in one line. The gaps are
// only credited to the AI when its own reading is still on this device and
// matches the gaps the pick used.

export function Receipt({
  decision,
  understoodBy,
  aiGapIds,
  className,
}: {
  decision: Decision;
  understoodBy: "ai" | "user";
  /** the gaps the AI's reading found, or null when that reading isn't on this device */
  aiGapIds?: readonly SkillId[] | null;
  className?: string;
}) {
  const lines = [engineLine(decision), ...receiptLines(decision, understoodBy, aiGapIds ?? null)];
  // the one-candidate engine line and receipt line are the same sentence
  const unique = lines.filter((l, i) => lines.findIndex((x) => x.replace(/\.$/, "") === l.replace(/\.$/, "")) === i);
  return (
    <div className={`flex flex-col gap-1.5 ${className ?? ""}`} aria-label="How this pick was made">
      {unique.map((l) => (
        <EngineLine key={l}>{l}</EngineLine>
      ))}
    </div>
  );
}
