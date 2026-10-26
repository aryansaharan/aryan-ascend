import type { Course } from "./course-types";
import { fmtTime, fmtWeekday, toLocalISODate, parseLocalDate, startTarget } from "./format";

// Booking the first session (spec 3.5): the 30 minute to 48 hour window, the
// day and time chips, the obstacle and the backup slot code computes from it.
// Pure; every function takes `now` so it can be tested.

export type Obstacle = "late-work" | "tired" | "plans-change" | "where-to-start";

export const OBSTACLES: { id: Obstacle; label: string }[] = [
  { id: "late-work", label: "Work runs late" },
  { id: "tired", label: "Too tired by then" },
  { id: "plans-change", label: "Plans change" },
  { id: "where-to-start", label: "I won't know where to start" },
];

export function isObstacle(v: unknown): v is Obstacle {
  return v === "late-work" || v === "tired" || v === "plans-change" || v === "where-to-start";
}

export const SESSION_MINUTES = 25;
const MIN_LEAD_MS = 30 * 60 * 1000;
const MAX_LEAD_MS = 48 * 60 * 60 * 1000;

/** Earliest and latest allowed first-session times. */
export function bookingWindow(now: Date = new Date()): { min: Date; max: Date } {
  return {
    min: new Date(now.getTime() + MIN_LEAD_MS),
    max: new Date(now.getTime() + MAX_LEAD_MS),
  };
}

/** At least 30 minutes and at most 48 hours from now. */
export function inBookingWindow(when: Date, now: Date = new Date()): boolean {
  const { min, max } = bookingWindow(now);
  const t = when.getTime();
  return t >= min.getTime() && t <= max.getTime();
}

export const OUT_OF_WINDOW = "Pick a time in the next two days.";

export type DayOption = { offset: 0 | 1 | 2; label: string; date: string };

/** "Today", "Tomorrow", and the weekday after ("Thu"), as local dates. */
export function dayOptions(now: Date = new Date()): DayOption[] {
  return ([0, 1, 2] as const).map((offset) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const label = offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : fmtWeekday(d);
    return { offset, label, date: toLocalISODate(d) };
  });
}

/** Preset time chips; "Other" is a time input on the page. */
export const TIME_OPTIONS: { id: string; label: string }[] = [
  { id: "07:00", label: "7:00 am" },
  { id: "13:00", label: "1:00 pm" },
  { id: "20:30", label: "8:30 pm" },
];

/** Local date "YYYY-MM-DD" plus "HH:MM" as a Date. */
export function slotAt(date: string, hhmm: string): Date {
  const d = parseLocalDate(date);
  const [h, m] = hhmm.split(":").map(Number);
  d.setHours(h || 0, m || 0, 0, 0);
  return d;
}

/** Default chip pair: tomorrow at 8:30 pm (always inside the window). */
export function defaultSlot(now: Date = new Date()): Date {
  return slotAt(dayOptions(now)[1].date, "20:30");
}

/** True when a day and time chip pair lands inside the window (for disabling chips). */
export function chipAllowed(date: string, hhmm: string, now: Date = new Date()): boolean {
  return inBookingWindow(slotAt(date, hhmm), now);
}

function atLocal(base: Date, addDays: number, hours: number, minutes: number): Date {
  return new Date(base.getFullYear(), base.getMonth(), base.getDate() + addDays, hours, minutes);
}

/**
 * Backup slot (spec 3.5): late work or tiredness, the next day at 7:00 am;
 * plans changing, the next Saturday at 10:00 am (Sunday if the session is on
 * a Saturday); not knowing where to start, the next day at the same time.
 */
export function backupSlot(s: Date, o: Obstacle): Date {
  switch (o) {
    case "late-work":
    case "tired":
      return atLocal(s, 1, 7, 0);
    case "plans-change": {
      const day = s.getDay();
      const toSaturday = day === 6 ? 1 : (6 - day + 7) % 7 || 7;
      return atLocal(s, toSaturday, 10, 0);
    }
    case "where-to-start":
      return atLocal(s, 1, s.getHours(), s.getMinutes());
  }
}

const OBSTACLE_PHRASE: Record<Exclude<Obstacle, "where-to-start">, string> = {
  "late-work": "work runs late",
  tired: "I'm too tired",
  "plans-change": "plans change",
};

/**
 * The if-then line: "If work runs late on Tue, I'll do it Wed at 7:00 am."
 * For where-to-start: "If I don't know where to start, I'll open {free start}
 * and do just the first 10 minutes."
 */
export function ifThenLine(o: Obstacle, s: Date, k: Date, course: Course): string {
  if (o === "where-to-start") {
    return `If I don't know where to start, I'll open ${startTarget(course)} and do just the first 10 minutes.`;
  }
  return `If ${OBSTACLE_PHRASE[o]} on ${fmtWeekday(s)}, I'll do it ${fmtWeekday(k)} at ${fmtTime(k)}.`;
}
