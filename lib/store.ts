"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import type { Profile } from "./recommend";

const KEY = "ascend.profile.v1";
const EMPTY: Partial<Profile> = {};

function loadProfile(): Partial<Profile> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<Profile>) : {};
  } catch {
    return {};
  }
}

function saveProfile(p: Partial<Profile>) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...loadProfile(), ...p };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

// False during prerender and the hydration pass, true once in the browser.
const noopSubscribe = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * The assessment profile, persisted in localStorage.
 * Returns [profile, update, ready]; `ready` is false until the saved profile
 * has been read in the browser, so pages can wait before redirecting.
 */
export function useProfile(): [
  Partial<Profile>,
  (p: Partial<Profile>) => void,
  boolean,
] {
  const ready = useSyncExternalStore(noopSubscribe, onClient, onServer);
  // Read the saved profile once the browser is available. Edits made through
  // `set` take over from then on (and are written back to storage).
  const stored = useMemo(() => (ready ? loadProfile() : EMPTY), [ready]);
  const [edits, setEdits] = useState<Partial<Profile> | null>(null);
  const profile = edits ?? stored;

  function set(p: Partial<Profile>) {
    setEdits((prev) => {
      const next = { ...(prev ?? stored), ...p };
      saveProfile(next);
      return next;
    });
  }

  return [profile, set, ready];
}
