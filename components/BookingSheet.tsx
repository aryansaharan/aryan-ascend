"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import {
  BlinkCaret,
  Card,
  EngineLine,
  FactChip,
  PrimaryButton,
  SectionLabel,
  SkeletonLine,
  TextLink,
  ToggleChip,
  easeOut,
} from "@/components/ui";
import type { Course, MoveId } from "@/lib/course-types";
import {
  OBSTACLES,
  OUT_OF_WINDOW,
  TIME_OPTIONS,
  backupSlot,
  bookingWindow,
  chipAllowed,
  dayOptions,
  ifThenLine,
  inBookingWindow,
  slotAt,
  type Obstacle,
} from "@/lib/booking";
import { fmtDay, fmtDayTime, fmtTime, toLocalISODate } from "@/lib/format";
import { buildWeeks } from "@/lib/plan-build";
import { TAILOR_LOADING } from "@/lib/templates";
import { keepTimes } from "@/components/PlanWeeks";

// Booking setup (spec 3.5): when the first 25 minutes happen (30 minutes to
// 48 hours from now), what usually gets in the way, a backup slot computed by
// code, and the if-then line. "Make my plan" hands the choice to the page,
// which waits for the tailored weeks (addendum-ai Job 4) and shows
// TailoringPreview meanwhile.

// Slots ------------------------------------------------------------------------

/** A day chip plus a time chip (or the "Other" time input). */
export type Slot = { date: string; time: string | null; custom: boolean };

/** Tomorrow at 8:30 pm, always inside the window. */
export function defaultSlotState(now: Date): Slot {
  return { date: dayOptions(now)[1].date, time: "20:30", custom: false };
}

export function slotDate(slot: Slot): Date | null {
  return slot.time ? slotAt(slot.date, slot.time) : null;
}

export function slotValid(slot: Slot, now: Date): boolean {
  const d = slotDate(slot);
  return d !== null && inBookingWindow(d, now);
}

/**
 * Why a typed time can't be booked, or null when it can (or nothing is typed
 * yet): already past, under the 30 minute lead, or beyond two days.
 */
export function typedSlotIssue(slot: Slot, now: Date): string | null {
  const d = slot.custom ? slotDate(slot) : null;
  if (!d || inBookingWindow(d, now)) return null;
  if (d.getTime() <= now.getTime()) {
    return toLocalISODate(d) === toLocalISODate(now) ? "That time has passed today." : "That time has passed.";
  }
  if (d.getTime() < bookingWindow(now).min.getTime()) return "Pick a time at least 30 minutes from now.";
  return OUT_OF_WINDOW;
}

/** A day chip is usable when some minute of that day falls inside the window. */
function dayAllowed(date: string, now: Date): boolean {
  const { min, max } = bookingWindow(now);
  return slotAt(date, "23:59").getTime() >= min.getTime() && slotAt(date, "00:00").getTime() <= max.getTime();
}

/** Moving to another day keeps the time when it still fits, else the first preset that does. */
function withDay(slot: Slot, date: string, now: Date): Slot {
  if (slot.custom || !slot.time || chipAllowed(date, slot.time, now)) return { ...slot, date };
  const first = TIME_OPTIONS.find((t) => chipAllowed(date, t.id, now));
  return { date, time: first?.id ?? null, custom: false };
}

function ChipGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <SectionLabel as="div">{label}</SectionLabel>
      <div className="mt-2.5 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function TimeInput({
  value,
  onChange,
  label,
}: {
  value: string | null;
  onChange: (v: string | null) => void;
  label: string;
}) {
  return (
    <input
      type="time"
      aria-label={label}
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value || null)}
      className="mono-label mt-3 min-h-10 w-full max-w-[11rem] rounded-full border border-border bg-card px-4 text-base sm:text-[14px] text-foreground focus:border-foreground/40 focus:outline-none"
    />
  );
}

/**
 * Day chips (Today, Tomorrow, the weekday after) and time chips (7:00 am,
 * 1:00 pm, 8:30 pm, Other). Chips outside the 30 minute to 48 hour window are
 * disabled; a typed time outside it says why (see typedSlotIssue).
 */
export function SlotPicker({ slot, onChange, now }: { slot: Slot; onChange: (s: Slot) => void; now: Date }) {
  const days = dayOptions(now);
  const issue = typedSlotIssue(slot, now);
  return (
    <div className="flex flex-col gap-5">
      <ChipGroup label="Day">
        {days.map((d) => (
          <ToggleChip
            key={d.date}
            pressed={slot.date === d.date}
            disabled={!dayAllowed(d.date, now)}
            onClick={() => onChange(withDay(slot, d.date, now))}
          >
            {d.label}
          </ToggleChip>
        ))}
      </ChipGroup>
      <div>
        <ChipGroup label="Time">
          {TIME_OPTIONS.map((t) => (
            <ToggleChip
              key={t.id}
              pressed={!slot.custom && slot.time === t.id}
              disabled={!chipAllowed(slot.date, t.id, now)}
              onClick={() => onChange({ date: slot.date, time: t.id, custom: false })}
            >
              {t.label}
            </ToggleChip>
          ))}
          <ToggleChip pressed={slot.custom} onClick={() => onChange({ ...slot, custom: true })}>
            Other
          </ToggleChip>
        </ChipGroup>
        {slot.custom && (
          <TimeInput
            label="Time for your first session"
            value={slot.time}
            onChange={(time) => onChange({ ...slot, time, custom: true })}
          />
        )}
        {issue && (
          <p role="alert" className="mt-2 text-[13px] text-foreground">
            {issue}
          </p>
        )}
      </div>
    </div>
  );
}

// Backup ------------------------------------------------------------------------

/** Local "HH:MM" of a date. */
function hhmm(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

function addDaysLocal(d: Date, days: number): string {
  return toLocalISODate(new Date(d.getFullYear(), d.getMonth(), d.getDate() + days));
}

/** Day and time chips for the backup: the three days after the session, plus the suggested day. */
function BackupPicker({
  s,
  suggested,
  slot,
  onChange,
}: {
  s: Date;
  suggested: Date;
  slot: Slot;
  onChange: (slot: Slot) => void;
}) {
  const days = [...new Set([1, 2, 3].map((i) => addDaysLocal(s, i)).concat(toLocalISODate(suggested)))].sort();
  const valid = (date: string, hhmm: string) => slotAt(date, hhmm).getTime() > s.getTime() + 25 * 60_000;
  return (
    <div className="flex flex-col gap-4">
      <ChipGroup label="Backup day">
        {days.map((d) => (
          <ToggleChip key={d} pressed={slot.date === d} onClick={() => onChange({ ...slot, date: d })}>
            {fmtDay(d)}
          </ToggleChip>
        ))}
      </ChipGroup>
      <div>
        <ChipGroup label="Backup time">
          {TIME_OPTIONS.map((t) => (
            <ToggleChip
              key={t.id}
              pressed={!slot.custom && slot.time === t.id}
              disabled={!valid(slot.date, t.id)}
              onClick={() => onChange({ ...slot, time: t.id, custom: false })}
            >
              {t.label}
            </ToggleChip>
          ))}
          <ToggleChip pressed={slot.custom} onClick={() => onChange({ ...slot, custom: true })}>
            Other
          </ToggleChip>
        </ChipGroup>
        {slot.custom && (
          <TimeInput
            label="Time for your backup slot"
            value={slot.time}
            onChange={(time) => onChange({ ...slot, time })}
          />
        )}
      </div>
    </div>
  );
}

// The sheet ----------------------------------------------------------------------

export type BookingChoice = { s: Date; k: Date; o: Obstacle };

export function BookingSheet({
  course,
  n,
  h,
  move,
  facts,
  now,
  busy,
  onSubmit,
}: {
  course: Course;
  /** modules in scope */
  n: number;
  h: number;
  move: MoveId;
  /** fact chips for the course summary: pace, cost, free start */
  facts: string[];
  now: Date;
  /** true while the page waits for the tailored weeks */
  busy: boolean;
  onSubmit: (choice: BookingChoice) => void;
}) {
  const [slot, setSlot] = useState<Slot>(() => defaultSlotState(now));
  const [obstacle, setObstacle] = useState<Obstacle | null>(null);
  const [backup, setBackup] = useState<Slot | null>(null);
  const [changingBackup, setChangingBackup] = useState(false);

  const s = slotValid(slot, now) ? slotDate(slot) : null;
  const suggested = s && obstacle ? backupSlot(s, obstacle) : null;
  const custom = backup ? slotDate(backup) : null;
  const k = s && custom && custom.getTime() > s.getTime() + 25 * 60_000 ? custom : suggested;
  const ready = Boolean(s && obstacle && k);
  // A typed time that doesn't fit already says why, right under the input.
  const hint = s
    ? "Pick what usually gets in the way to see your backup."
    : typedSlotIssue(slot, now)
      ? null
      : OUT_OF_WINDOW;

  function changeSlot(next: Slot) {
    setSlot(next);
    setBackup(null);
    setChangingBackup(false);
  }

  function chooseObstacle(o: Obstacle) {
    setObstacle(o);
    setBackup(null);
    setChangingBackup(false);
  }

  function openBackup() {
    if (!k) return;
    const time = hhmm(k);
    setBackup({ date: toLocalISODate(k), time, custom: !TIME_OPTIONS.some((t) => t.id === time) });
    setChangingBackup(true);
  }

  return (
    <div className="flex flex-col gap-4">
      <Card as="section" aria-label="Your course">
        <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">{"// Your course"}</div>
        <h2 className="mt-2.5 text-[17px] sm:text-[18px] font-semibold leading-snug tracking-[-0.005em] text-foreground">
          {course.title}
        </h2>
        <div className="mt-0.5 text-[13px] text-muted">{course.provider}</div>
        {facts.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-2">
            {facts.map((f) => (
              <FactChip key={f}>{f}</FactChip>
            ))}
          </div>
        )}
      </Card>

      <fieldset disabled={busy} className={busy ? "opacity-60 transition-opacity" : "transition-opacity"}>
        <legend className="sr-only">When and what gets in the way</legend>
        <div className="flex flex-col gap-4">
          <Card as="section" aria-label="When">
            <SlotPicker slot={slot} onChange={changeSlot} now={now} />
            <div className="mt-5 pt-4 border-t border-border-soft flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
              <span className="text-[13px] text-muted">First session</span>
              <span className="serif-italic text-[20px] leading-tight text-foreground" aria-live="polite">
                {s ? `${fmtDayTime(s)}, 25 minutes` : "Pick a time"}
              </span>
            </div>
          </Card>

          <Card as="section" aria-label="What gets in the way">
            <div role="group" aria-labelledby="obstacle-q">
              <h2 id="obstacle-q" className="text-[15.5px] font-medium leading-snug text-foreground">
                What&apos;s most likely to get in the way?
              </h2>
              <p className="mt-1 text-[13px] text-muted">Ascend sets a backup slot for it.</p>
              <div className="mt-3.5 flex flex-wrap gap-2">
                {OBSTACLES.map((o) => (
                  <ToggleChip key={o.id} pressed={obstacle === o.id} onClick={() => chooseObstacle(o.id)}>
                    {o.label}
                  </ToggleChip>
                ))}
              </div>
            </div>

            <AnimatePresence initial={false}>
              {s && obstacle && k && (
                <motion.div
                  key="plan-b"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.35, ease: easeOut }}
                  className="overflow-hidden"
                >
                  <div className="mt-5 pt-4 border-t border-border-soft flex flex-col gap-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                      <span className="text-[13px] text-muted">Backup slot</span>
                      <span className="flex items-baseline gap-3">
                        <span className="text-[14px] font-medium text-foreground">{fmtDayTime(k)}</span>
                        {!changingBackup && <TextLink onClick={openBackup}>Change</TextLink>}
                      </span>
                    </div>
                    {changingBackup && backup && (
                      <div className="rounded-xl bg-card-alt/60 p-4">
                        <BackupPicker s={s} suggested={suggested ?? k} slot={backup} onChange={setBackup} />
                        {custom && custom.getTime() <= s.getTime() + 25 * 60_000 && (
                          <p role="alert" className="mt-2 text-[13px] text-foreground">
                            Pick a backup after your first session.
                          </p>
                        )}
                        <div className="mt-3 flex gap-4">
                          <TextLink onClick={() => setChangingBackup(false)}>Done</TextLink>
                          <TextLink
                            onClick={() => {
                              setBackup(null);
                              setChangingBackup(false);
                            }}
                          >
                            Use the suggested slot
                          </TextLink>
                        </div>
                      </div>
                    )}
                    <div>
                      <SectionLabel as="div">Your if-then plan</SectionLabel>
                      <p className="mt-2 border-l-2 border-foreground/40 pl-3.5 text-[15px] leading-relaxed text-foreground">
                        {keepTimes(ifThenLine(obstacle, s, k, course))}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        </div>
      </fieldset>

      {busy && s ? (
        <TailoringPreview course={course} n={n} h={h} move={move} s={s} />
      ) : (
        <div className="mt-2 flex flex-col gap-3">
          <PrimaryButton
            full
            icon={ArrowRight}
            disabled={!ready}
            onClick={() => {
              if (s && obstacle && k) onSubmit({ s, k, o: obstacle });
            }}
          >
            Make my plan
          </PrimaryButton>
          {!ready && hint && <p className="text-center text-[12.5px] text-muted-2">{hint}</p>}
          <EngineLine className="text-center text-balance">
            Next: code builds your weeks from the course outline, then the AI writes one task a week for your job
          </EngineLine>
        </div>
      )}
    </div>
  );
}

/**
 * Shown while POST /api/tailor runs (at most 10 s): the real weeks, already
 * built by code, with the "At work this week" lines still pulsing.
 */
export function TailoringPreview({
  course,
  n,
  h,
  move,
  s,
}: {
  course: Course;
  n: number;
  h: number;
  move: MoveId;
  s: Date;
}) {
  const weeks = buildWeeks({ course, n, h, s: s.toISOString(), move }).weeks;
  const shown = weeks.slice(0, 4);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: easeOut }}
      role="status"
      aria-live="polite"
    >
      <Card>
        <EngineLine>
          {TAILOR_LOADING}
          <BlinkCaret />
        </EngineLine>
        <ol className="mt-4 flex flex-col divide-y divide-border-soft">
          {shown.map((w) => (
            <li key={w.k} className="py-3.5 first:pt-1">
              <div className="text-[13.5px] font-medium text-foreground">
                Week {w.k} <span className="font-normal text-muted">· {fmtDay(w.start)}</span>
              </div>
              <div className="mt-1 text-[12.5px] leading-relaxed text-muted line-clamp-2">
                {w.items.map((i) => i.label).join(" · ")}
              </div>
              <div className="mt-3 flex flex-col gap-1.5">
                <SectionLabel as="div" className="mb-1">
                  At work this week
                </SectionLabel>
                <SkeletonLine className="w-[88%]" />
                <SkeletonLine className="w-[56%]" />
              </div>
            </li>
          ))}
        </ol>
        {weeks.length > shown.length && (
          <p className="mt-1 text-[12.5px] text-muted-2">
            And {weeks.length - shown.length} more {weeks.length - shown.length === 1 ? "week" : "weeks"}.
          </p>
        )}
      </Card>
    </motion.div>
  );
}

/** "Wed 22 Oct at 7:00 am" for confirmation lines. */
export function slotPhrase(d: Date): string {
  return `${fmtDay(d)} at ${fmtTime(d)}`;
}
