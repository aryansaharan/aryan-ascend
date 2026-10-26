"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { Baseline, MoveId } from "./course-types";
import {
  normalizeProfile,
  toProfileV2,
  type Budget,
  type Hours,
  type Mention,
  type PrefersFormat,
  type ProfileV2,
  type Strength,
} from "./profile";
import type { SkillId } from "./skills";
import { localGet, localRemove, localSet } from "./local-store";
import { PROFILE_KEY } from "./storage-keys";

// The /assess answers, persisted in localStorage under ascend.profile.v2.
// v1 data under ascend.profile.v1 is ignored, not migrated. Every storage call
// goes through lib/local-store: when the browser blocks storage the answers
// live in memory for the session instead.

export { PROFILE_KEY };

/** Answers so far; fields fill in step by step (situation, time, budget, then the confirm screen). */
export type ProfileDraft = {
  situation?: string;
  currentRole?: string;
  move?: MoveId;
  baseline?: Baseline;
  hoursPerWeek?: Hours;
  budget?: Budget;
  gaps?: SkillId[];
  strengths?: Strength[];
  mentioned?: Mention[];
  wantsCertificate?: boolean;
  prefersFormat?: PrefersFormat;
  understoodBy?: "ai" | "user";
};

const EMPTY: ProfileDraft = {};

export function loadProfile(): ProfileDraft {
  if (typeof window === "undefined") return {};
  try {
    const raw = localGet(PROFILE_KEY);
    if (!raw) return {};
    const v = JSON.parse(raw) as Record<string, unknown>;
    return v && typeof v === "object" ? (v as ProfileDraft) : {};
  } catch {
    return {};
  }
}

/** Writes the whole draft (as a v2 object). */
export function writeProfile(draft: ProfileDraft): void {
  if (typeof window === "undefined") return;
  // storage blocked: lib/local-store keeps it in memory for the session
  localSet(PROFILE_KEY, JSON.stringify({ v: 2, ...draft }));
}

/**
 * Merges a patch into a draft. Changing the move clears the baseline and the
 * gaps, because the starting-point anchors and the skill vocabulary belong to
 * the move (spec 3.2, addendum-ai).
 */
export function mergeDraft(prev: ProfileDraft, patch: ProfileDraft): ProfileDraft {
  const next: ProfileDraft = { ...prev, ...patch };
  if (patch.move !== undefined && patch.move !== prev.move) {
    if (patch.baseline === undefined) delete next.baseline;
    if (patch.gaps === undefined) delete next.gaps;
  }
  return next;
}

/** The saved profile when complete and valid (move still shipped), else null. */
export function readProfile(): ProfileV2 | null {
  return toProfileV2(loadProfile());
}

/** Saves a complete profile (the confirm screen, or an example after its understand call). */
export function saveProfile(profile: ProfileV2): void {
  const p = normalizeProfile(profile);
  writeProfile({
    situation: p.situation,
    currentRole: p.currentRole,
    move: p.move,
    baseline: p.baseline,
    hoursPerWeek: p.hoursPerWeek,
    budget: p.budget,
    gaps: p.gaps,
    strengths: p.strengths,
    mentioned: p.mentioned,
    wantsCertificate: p.wantsCertificate,
    prefersFormat: p.prefersFormat,
    understoodBy: p.understoodBy,
  });
}

export function clearProfile(): void {
  if (typeof window === "undefined") return;
  localRemove(PROFILE_KEY);
}

/** "Find my course": a new session starts blank (one copy, in the catalog-free lib/session). */
export { clearSession } from "./session";

// False during prerender and the hydration pass, true once in the browser.
const noopSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * The /assess draft, persisted. Returns [draft, update, ready]; `ready` is
 * false until the saved draft has been read in the browser, so pages can wait
 * before redirecting. `update` merges (see mergeDraft) and writes through.
 */
export function useProfile(): [ProfileDraft, (patch: ProfileDraft) => void, boolean] {
  const ready = useSyncExternalStore(noopSubscribe, onClient, onServer);
  const stored = useMemo(() => (ready ? loadProfile() : EMPTY), [ready]);
  const [edits, setEdits] = useState<ProfileDraft | null>(null);
  const draft = edits ?? stored;

  function update(patch: ProfileDraft) {
    setEdits((prev) => {
      const next = mergeDraft(prev ?? stored, patch);
      writeProfile(next);
      return next;
    });
  }

  return [draft, update, ready];
}

/** The complete profile once ready: [profile or null, ready]. Use on /recommendations, /compare, /plan. */
export function useCompleteProfile(): [ProfileV2 | null, boolean] {
  const [draft, , ready] = useProfile();
  const profile = useMemo(() => (ready ? toProfileV2(draft) : null), [draft, ready]);
  return [profile, ready];
}
