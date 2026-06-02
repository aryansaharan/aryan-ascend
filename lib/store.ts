"use client";

import { useEffect, useState } from "react";
import type { Profile } from "./recommend";

const KEY = "ascend.profile.v1";

export function loadProfile(): Partial<Profile> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as Partial<Profile>) : {};
  } catch {
    return {};
  }
}

export function saveProfile(p: Partial<Profile>) {
  if (typeof window === "undefined") return;
  try {
    const next = { ...loadProfile(), ...p };
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
}

export function useProfile(): [
  Partial<Profile>,
  (p: Partial<Profile>) => void,
  boolean,
] {
  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(loadProfile());
    setReady(true);
  }, []);

  function set(p: Partial<Profile>) {
    setProfile((prev) => {
      const next = { ...prev, ...p };
      saveProfile(next);
      return next;
    });
  }

  return [profile, set, ready];
}
