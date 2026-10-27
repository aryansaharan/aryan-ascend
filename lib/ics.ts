import type { Course } from "./course-types";
import { fmtDayTime } from "./format";
import type { PlanPayloadV2 } from "./plan-store";

// Calendar export (spec 6.5): one .ics with three events (first session,
// backup slot, day-14 check), each with a 10 minute alert. Times are UTC so
// they land at the chosen local time in any calendar. RFC 5545: CRLF line
// endings, lines folded at 75 octets, commas, semicolons, backslashes and
// newlines escaped.

const CRLF = "\r\n";
const UID_DOMAIN = "ascendmvp.vercel.app";

export const ICS_FILENAME = "ascend-first-session.ics";

/** "20261027T150000Z" */
export function icsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escapes TEXT values: backslash, semicolon, comma and newlines. */
export function icsEscape(s: string): string {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

const encoder = new TextEncoder();

/** Folds a content line at 75 octets without splitting a UTF-8 character. */
export function foldLine(line: string): string {
  if (encoder.encode(line).length <= 75) return line;
  const out: string[] = [];
  let current = "";
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const n = encoder.encode(ch).length;
    if (bytes + n > limit) {
      out.push(current);
      current = " ";
      bytes = 1;
      limit = 75;
    }
    current += ch;
    bytes += n;
  }
  out.push(current);
  return out.join(CRLF);
}

type IcsEvent = {
  uid: string;
  start: Date;
  minutes: number;
  summary: string;
  description: string;
};

/** `sequence` counts reschedules, so a file downloaded again after "Not yet" updates the same events. */
function eventLines(e: IcsEvent, stamp: string, sequence: number): string[] {
  const end = new Date(e.start.getTime() + e.minutes * 60_000);
  return [
    "BEGIN:VEVENT",
    `UID:${e.uid}`,
    `SEQUENCE:${sequence}`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${icsUtc(e.start)}`,
    `DTEND:${icsUtc(end)}`,
    `SUMMARY:${icsEscape(e.summary)}`,
    `DESCRIPTION:${icsEscape(e.description)}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "TRIGGER:-PT10M",
    `DESCRIPTION:${icsEscape(e.summary)}`,
    "END:VALARM",
    "END:VEVENT",
  ];
}

/**
 * The calendar file: first session (s, 25 min), backup (k, 25 min) and the
 * day-14 check (s + 14 days, 10 min), each with a 10-minute alert. The first
 * session and the backup carry the first step and the plan link; the two-week
 * check carries the plan link, since by then the first step is done.
 */
export function buildIcs(args: {
  plan: PlanPayloadV2;
  course: Course;
  /** absolute plan link */
  planLink: string;
  /** the first step text (templates.firstStep) */
  firstStep: string;
  now?: Date;
}): string {
  const { plan, course, planLink, firstStep } = args;
  const stamp = icsUtc(args.now ?? new Date());
  const s = new Date(plan.s);
  const details = `${firstStep}\n${planLink}`;
  const events: IcsEvent[] = [
    {
      uid: `${plan.id}-1@${UID_DOMAIN}`,
      start: s,
      minutes: 25,
      summary: `First session: ${course.title}`,
      description: details,
    },
    {
      uid: `${plan.id}-2@${UID_DOMAIN}`,
      start: new Date(plan.k),
      minutes: 25,
      summary: `Backup slot: ${course.title}`,
      description: details,
    },
    {
      uid: `${plan.id}-3@${UID_DOMAIN}`,
      // 14 calendar days at the same local time, not 336 hours (a clock change in between would shift it)
      start: new Date(s.getFullYear(), s.getMonth(), s.getDate() + 14, s.getHours(), s.getMinutes()),
      minutes: 10,
      summary: "Two-week check: open your Ascend plan",
      description: planLink,
    },
  ];
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Ascend//Plan//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events.flatMap((e) => eventLines(e, stamp, plan.rb ?? 0)),
    "END:VCALENDAR",
  ];
  return lines.map(foldLine).join(CRLF) + CRLF;
}

/** Triggers the .ics download in the browser. */
export function downloadIcs(text: string, filename: string = ICS_FILENAME): void {
  const blob = new Blob([text], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Google Calendar "add event" link for the first session only. */
export function googleCalendarUrl(args: {
  title: string;
  start: Date;
  minutes: number;
  details: string;
}): string {
  const end = new Date(args.start.getTime() + args.minutes * 60_000);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: args.title,
    dates: `${icsUtc(args.start)}/${icsUtc(end)}`,
    details: args.details,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** "Copy details": the date line, the first step, the link. */
export function copyDetailsText(s: Date | string, firstStep: string, planLink: string): string {
  const start = typeof s === "string" ? new Date(s) : s;
  return `${fmtDayTime(start)}, 25 minutes\n${firstStep}\n${planLink}`;
}
