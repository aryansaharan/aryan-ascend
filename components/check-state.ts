import { tidyRole } from "@/components/SituationInput";
import type { Baseline, MoveId } from "@/lib/course-types";
import { isAvailableMove } from "@/lib/moves";
import { isBaseline, isPrefersFormat, type Mention, type PrefersFormat, type Strength } from "@/lib/profile";
import { cleanGaps, type SkillId } from "@/lib/skills";
import type { ProfileDraft } from "@/lib/store";
import type { ProfileEdits, Understanding as UnderstandingT } from "@/lib/understand";

// The Check step's state (step 4 of /assess) and the conversions around it.
// Kept apart from components/Understanding, the editor itself, so /assess can
// load that editor only when the Check step is on screen.

/** Everything the person can change on the Check step. */
export type CheckState = {
  role: string;
  move: MoveId | null;
  baseline: Baseline | null;
  gaps: SkillId[];
  strengths: Strength[];
  mentioned: Mention[];
  wantsCertificate: boolean;
  prefersFormat: PrefersFormat;
};

/**
 * The starting state: what was understood, or, when the person already
 * confirmed this same situation before (a saved profile with a move), their
 * earlier answers, so "Edit answers" doesn't throw their fixes away.
 */
export function checkStateFrom(u: UnderstandingT, saved?: ProfileDraft | null): CheckState {
  if (saved?.move && isAvailableMove(saved.move)) {
    return {
      role: tidyRole(saved.currentRole ?? u.role),
      move: saved.move,
      baseline: isBaseline(saved.baseline) ? saved.baseline : null,
      gaps: cleanGaps(saved.move, saved.gaps ?? []),
      strengths: saved.strengths ?? [],
      mentioned: saved.mentioned ?? [],
      wantsCertificate: saved.wantsCertificate === true,
      prefersFormat: isPrefersFormat(saved.prefersFormat) ? saved.prefersFormat : "any",
    };
  }
  return {
    role: tidyRole(u.role),
    move: u.move,
    baseline: u.move ? u.baseline : null,
    gaps: u.move ? cleanGaps(u.move, u.gaps.map((g) => g.id)) : [],
    strengths: u.strengths,
    mentioned: u.mentioned,
    wantsCertificate: u.wantsCertificate,
    prefersFormat: u.prefersFormat,
  };
}

/** The edits passed to profileFromUnderstanding: the whole Check state. */
export function editsFrom(s: CheckState): ProfileEdits {
  return {
    currentRole: s.role,
    ...(s.move ? { move: s.move } : {}),
    ...(s.baseline !== null ? { baseline: s.baseline } : {}),
    gaps: s.gaps,
    strengths: s.strengths,
    mentioned: s.mentioned,
    wantsCertificate: s.wantsCertificate,
    prefersFormat: s.prefersFormat,
  };
}

/** What still blocks "Looks right", or null. */
export function missingFor(s: CheckState): "move" | "baseline" | null {
  if (!s.move) return "move";
  if (s.baseline === null) return "baseline";
  return null;
}
