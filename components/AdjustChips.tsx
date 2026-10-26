"use client";

import type { ReactNode } from "react";
import { SectionLabel, TextLink, ToggleChip } from "@/components/ui";
import { ADJUST_CHIPS, isChipOn, type Adjust, type AdjustChip } from "@/lib/profile";

// "Not quite right?" Five toggle chips and Reset (spec 5.4). Each change
// re-runs the rules in the browser; no network call. Courses still hidden by
// an earlier re-pick are named under the chips, so nothing drops out of view
// silently. The re-pick note (RepickNote) sits in the same section.

export function AdjustChips({
  adjust,
  adjustedNote,
  canReset,
  hidden = [],
  onToggle,
  onReset,
  children,
}: {
  adjust: Adjust;
  /** "Shorter, With a certificate", relative to the profile's default; "" when nothing changed */
  adjustedNote: string;
  canReset: boolean;
  /** titles of courses kept out by an earlier change that no pressed chip explains */
  hidden?: string[];
  onToggle: (chip: AdjustChip) => void;
  onReset: () => void;
  /** the re-pick note, under the chips */
  children?: ReactNode;
}) {
  return (
    <section aria-label="Not quite right?">
      <div className="flex items-baseline justify-between gap-4">
        <SectionLabel as="h2">Not quite right?</SectionLabel>
        {canReset && <TextLink onClick={onReset}>Reset</TextLink>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {ADJUST_CHIPS.map((c) => (
          <ToggleChip key={c.id} pressed={isChipOn(adjust, c.id)} onClick={() => onToggle(c.id)}>
            {c.label}
          </ToggleChip>
        ))}
      </div>
      <div aria-live="polite">
        {adjustedNote && <p className="mt-3 text-[12.5px] text-muted">Adjusted: {adjustedNote}.</p>}
      </div>
      {hidden.length > 0 && (
        <p className="mt-2 text-[12.5px] leading-relaxed text-muted">
          Hidden: {hidden.join(", ")}.{" "}
          <TextLink onClick={onReset} className="text-[12.5px]">
            {hidden.length === 1 ? "Show it again" : "Show them again"}
          </TextLink>
        </p>
      )}
      {children}
    </section>
  );
}
