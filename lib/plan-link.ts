import type { Profile } from "./recommend";

// A learning plan is shareable by encoding everything it needs into the URL, so
// it survives "your session resets on next visit" with no account and no
// database. The payload is small (a profile + a course id).

export type PlanPayload = { profile: Profile; courseId: string };

export function encodePlan(payload: PlanPayload): string {
  return encodeURIComponent(JSON.stringify(payload));
}

function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

// Tolerant of both the raw token and an already-once-decoded value (URLSearchParams
// decodes for you), so it works however the caller reads the query string.
export function decodePlan(raw: string | null | undefined): PlanPayload | null {
  if (!raw) return null;
  for (const candidate of [raw, safeDecode(raw)]) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as PlanPayload;
      if (parsed && parsed.profile && typeof parsed.courseId === "string") {
        return parsed;
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}
