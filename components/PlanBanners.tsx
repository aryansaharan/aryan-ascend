"use client";

import { useState } from "react";
import { CalendarPlus, Check } from "lucide-react";
import { Presence } from "@/components/Presence";
import { PrimaryButton, SecondaryButton, TextLink } from "@/components/ui";
import { SlotPicker, defaultSlotState, slotDate, slotPhrase, slotValid, type Slot } from "@/components/BookingSheet";
import { fmtDay } from "@/lib/format";
import { fadeUp, leave } from "@/lib/motion";
import { missedWeek, type BuiltPlan } from "@/lib/plan-build";
import { checkInDue, type PlanPayloadV2, type Progress } from "@/lib/plan-store";

// Plan banners (spec 3.5), at most one at a time, in this priority: check-in,
// missed week, outline changed, legacy. A confirmation from the banner the
// user just answered stays until they move on.

type Done =
  | { kind: "started" }
  | { kind: "rebooked"; at: Date }
  | { kind: "restarted"; k: number; d: string }
  | { kind: "retimed"; at: Date };

function Shell({ children, tone = "plain" }: { children: React.ReactNode; tone?: "plain" | "done" }) {
  return (
    <section
      role="status"
      aria-live="polite"
      className={`rounded-2xl border p-5 sm:p-6 ${
        tone === "done" ? "border-border-soft bg-card card-elev" : "border-border-soft bg-card-alt"
      }`}
    >
      {children}
    </section>
  );
}

function Title({ children }: { children: React.ReactNode }) {
  return <p className="text-[15.5px] font-medium leading-snug text-foreground">{children}</p>;
}

function Body({ children }: { children: React.ReactNode }) {
  return <p className="mt-1.5 text-[14px] leading-relaxed text-muted">{children}</p>;
}

export function PlanBanners({
  plan,
  built,
  progress,
  now,
  legacy,
  onStarted,
  onReschedule,
  onRestart,
  onRetime,
  onDownloadIcs,
}: {
  plan: PlanPayloadV2;
  built: BuiltPlan;
  progress: Progress;
  now: Date;
  /** set right after an old ?d= link was converted */
  legacy: boolean;
  /** "Yes, it did" */
  onStarted: () => void;
  /** "Not yet", then a new slot */
  onReschedule: (s: Date) => void;
  /** "Restart from Monday" for week k */
  onRestart: (k: number) => { k: number; d: string };
  /** legacy "Pick your own time" */
  onRetime: (s: Date) => void;
  onDownloadIcs: () => void;
}) {
  const [done, setDone] = useState<Done | null>(null);
  const [mode, setMode] = useState<"ask" | "rebook">("ask");
  const [picking, setPicking] = useState(false);
  const [slot, setSlot] = useState<Slot>(() => defaultSlotState(now));

  const checkIn = checkInDue(plan, progress, now);
  const missed = progress.firstSessionDoneAt ? missedWeek(built.weeks, progress.weeksDone, now) : null;

  let content: React.ReactNode = null;
  let key = "none";

  if (done) {
    key = `done-${done.kind}`;
    content = (
      <Shell tone="done">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-foreground text-accent-fg">
            <Check aria-hidden className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
          <div className="min-w-0">
            {done.kind === "started" && (
              <>
                <Title>First session done.</Title>
                <Body>Tick each week below as you finish it. Ticks stay on this device.</Body>
              </>
            )}
            {done.kind === "rebooked" && (
              <>
                <Title>Booked for {slotPhrase(done.at)}.</Title>
                <Body>
                  Your first step is now just the first 10 minutes. Your calendar still has the old time, so add the new
                  one.
                </Body>
                <div className="mt-4">
                  <SecondaryButton leadingIcon={CalendarPlus} onClick={onDownloadIcs}>
                    Download the new calendar file
                  </SecondaryButton>
                </div>
              </>
            )}
            {done.kind === "restarted" && (
              <>
                <Title>
                  Week {done.k} now starts {fmtDay(done.d)}.
                </Title>
                <Body>The weeks after it moved with it. The link below has the new dates.</Body>
              </>
            )}
            {done.kind === "retimed" && (
              <>
                <Title>Your first session is now {slotPhrase(done.at)}.</Title>
                <Body>Add it to your calendar from the card below.</Body>
              </>
            )}
            <div className="mt-3">
              <TextLink onClick={() => setDone(null)}>Dismiss</TextLink>
            </div>
          </div>
        </div>
      </Shell>
    );
  } else if (checkIn) {
    key = `checkin-${mode}`;
    const valid = slotValid(slot, now);
    content = (
      <Shell>
        {mode === "ask" ? (
          <>
            <Title>Did your first session happen?</Title>
            <Body>It was on {slotPhrase(new Date(plan.s))}.</Body>
            <div className="mt-4 flex flex-wrap gap-2.5">
              <PrimaryButton
                onClick={() => {
                  onStarted();
                  setDone({ kind: "started" });
                }}
              >
                Yes, it did
              </PrimaryButton>
              <SecondaryButton onClick={() => setMode("rebook")}>Not yet</SecondaryButton>
            </div>
          </>
        ) : (
          <>
            <Title>Missed it. That&apos;s normal. Pick the next slot.</Title>
            <div className="mt-4">
              <SlotPicker slot={slot} onChange={setSlot} now={now} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <PrimaryButton
                disabled={!valid}
                onClick={() => {
                  const s = slotDate(slot);
                  if (!s || !valid) return;
                  onReschedule(s);
                  setMode("ask");
                  setDone({ kind: "rebooked", at: s });
                }}
              >
                Book this slot
              </PrimaryButton>
              <TextLink onClick={() => setMode("ask")}>Back</TextLink>
            </div>
          </>
        )}
      </Shell>
    );
  } else if (missed !== null) {
    key = `missed-${missed}`;
    content = (
      <Shell>
        <Title>Week {missed} slipped. That&apos;s normal.</Title>
        <Body>Move the rest of the plan to start Monday?</Body>
        <div className="mt-4">
          <PrimaryButton
            onClick={() => {
              const r = onRestart(missed);
              setDone({ kind: "restarted", k: r.k, d: r.d });
            }}
          >
            Restart from Monday
          </PrimaryButton>
        </div>
      </Shell>
    );
  } else if (built.outlineChanged) {
    key = "outline";
    content = (
      <Shell>
        <Title>This course&apos;s outline changed since you planned.</Title>
        <Body>The weeks below use the current outline.</Body>
      </Shell>
    );
  } else if (legacy) {
    key = `legacy-${picking}`;
    const valid = slotValid(slot, now);
    content = (
      <Shell>
        <Title>This plan was made with an earlier version of Ascend.</Title>
        <Body>It now uses the course&apos;s real outline. Its first session was set to tomorrow at 8:30 pm.</Body>
        {picking ? (
          <>
            <div className="mt-4">
              <SlotPicker slot={slot} onChange={setSlot} now={now} />
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-4">
              <PrimaryButton
                disabled={!valid}
                onClick={() => {
                  const s = slotDate(slot);
                  if (!s || !valid) return;
                  onRetime(s);
                  setPicking(false);
                  setDone({ kind: "retimed", at: s });
                }}
              >
                Use this time
              </PrimaryButton>
              <TextLink onClick={() => setPicking(false)}>Keep tomorrow</TextLink>
            </div>
          </>
        ) : (
          <div className="mt-4">
            <SecondaryButton onClick={() => setPicking(true)}>Pick your own time</SecondaryButton>
          </div>
        )}
      </Shell>
    );
  }

  return (
    // One banner at a time: the one on screen fades up and out, then the next fades in.
    <Presence
      id={content ? key : null}
      enter="fade-up"
      exit="fade-out"
      initial={false}
      style={{ ...fadeUp(8, 0.4), ...leave(-6, 0.4) }}
    >
      {content}
    </Presence>
  );
}
