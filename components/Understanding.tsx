"use client";

import { useState, type ReactNode } from "react";
import { AnimatePresence, LazyMotion, MotionConfig, domMax, m } from "framer-motion";
import { ChevronDown, ChevronUp, Plus, X } from "lucide-react";
import { OptionCard } from "@/components/CheckParts";
import type { CheckState } from "@/components/check-state";
import { Badge, Card, SectionLabel, TextLink, ToggleChip, easeOut } from "@/components/ui";
import { stripPrompt, tidyRole } from "@/components/SituationInput";
import { courseById } from "@/lib/catalog";
import type { Baseline, MoveId } from "@/lib/course-types";
import { MOVES, availableMoves } from "@/lib/moves";
import { isAiEngine } from "@/lib/pick-types";
import { LIMITS, type MentionStatus, type PrefersFormat } from "@/lib/profile";
import { cleanGaps, skillLabel, skillsFor, type SkillId } from "@/lib/skills";
import { MOVE_PHRASES } from "@/lib/templates";
import type { Understanding as UnderstandingT, UnderstandResponse } from "@/lib/understand";

// Step 4 of /assess, "Check". When the AI (or the dev mock) read the
// situation, this is the read-back: every part of what Ascend understood,
// each one editable. When it couldn't, the same screen shows manual controls
// with an honest label. Either way the page turns the result into a profile
// with profileFromUnderstanding(). Its state and the conversions around it
// are in components/check-state.
//
// The list animations here (reordering gaps, removing a row, the switch knob)
// are framer-motion layout animations, the only framer-motion left in the
// app. /assess loads this file on its own, only for the Check step, so no
// other page or step pays for the library. OptionCard and the chips are plain
// CSS.

/** "Up to three" on the manual path, "up to five" when the AI ranked them. */
export const MANUAL_GAPS_MAX = 3;

const CONTACT =
  "mailto:aryansaharan30@gmail.com?subject=" + encodeURIComponent("A direction for Ascend");

/**
 * A new direction: the starting-point anchors and the skill vocabulary belong
 * to the move, so both reset. Going back to the move that was read restores
 * what was read for it.
 */
function withMove(s: CheckState, u: UnderstandingT, move: MoveId): CheckState {
  if (move === s.move) return s;
  const back = move === u.move;
  return {
    ...s,
    move,
    baseline: back ? u.baseline : null,
    gaps: back ? cleanGaps(move, u.gaps.map((g) => g.id)) : [],
  };
}

const STATUS_LABEL: Record<MentionStatus, string> = {
  considering: "Considering",
  started: "Started",
  finished: "Finished",
  dropped: "Dropped",
};

const FORMAT_LABEL: Record<PrefersFormat, string> = {
  any: "Any",
  "hands-on": "Hands-on",
  reading: "Reading",
  video: "Video",
  cohort: "With a group",
};

// Small pieces ------------------------------------------------------------------

/** The /assess option card: label, optional hint, check circle. Black when selected. */
/** Press depth for the add chips (.tap in app/globals.css). */
const TAP_94 = { "--tap": "0.94" } as React.CSSProperties;

/** A 40px round icon button for up, down and remove. */
function IconButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center w-10 h-10 rounded-full text-muted hover:text-foreground hover:bg-card-alt disabled:opacity-25 disabled:hover:bg-transparent disabled:cursor-not-allowed"
    >
      {children}
    </button>
  );
}

/** Add-a-skill chip, in the /assess multi chip style. */
function AddChip({
  children,
  onClick,
  disabled,
  pressed = false,
  rank,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled: boolean;
  pressed?: boolean;
  rank?: number;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      style={TAP_94}
      className={`tap inline-flex items-center gap-1.5 min-h-10 rounded-full px-3.5 py-2 text-sm border ${
        pressed
          ? "bg-foreground text-accent-fg border-foreground"
          : disabled
            ? "bg-card text-muted border-border opacity-40 cursor-not-allowed"
            : "bg-card text-foreground border-border hover:border-foreground/30"
      }`}
    >
      {pressed && rank !== undefined ? (
        <span className="mono-label text-[11px] text-accent-fg/70">{rank}</span>
      ) : (
        <Plus aria-hidden className="w-3.5 h-3.5" />
      )}
      {children}
    </button>
  );
}

/** On/off switch with a 40px hit area. */
function Switch({ on, onChange, label }: { on: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className="relative inline-flex items-center justify-center w-14 h-10 flex-shrink-0 -mr-1.5"
    >
      <span
        className={`flex items-center w-11 h-6 rounded-full border px-[3px] ${
          on ? "bg-foreground border-foreground justify-end" : "bg-card-alt border-border justify-start"
        }`}
      >
        <m.span
          layout
          transition={{ type: "spring", stiffness: 600, damping: 32 }}
          className={`block w-4 h-4 rounded-full ${on ? "bg-accent-fg" : "bg-card border border-border shadow-[0_1px_2px_rgba(0,0,0,0.08)]"}`}
        />
      </span>
    </button>
  );
}

/** A row in a hairline card: small label, optional action on the right, then the value. */
function Row({ label, action, children }: { label: string; action?: ReactNode; children: ReactNode }) {
  return (
    <div className="px-4 sm:px-6 py-4 sm:py-5">
      <div className="flex items-center justify-between gap-4 min-h-6">
        <SectionLabel as="h3">{label}</SectionLabel>
        {action}
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

/** A labelled block below the main card. */
function Block({ label, note, children }: { label: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-9">
      <SectionLabel as="h3">{label}</SectionLabel>
      {note && <p className="mt-1.5 text-[13px] text-muted leading-relaxed">{note}</p>}
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

/** A question on the manual path. */
function Question({ title, note, children }: { title: string; note?: ReactNode; children: ReactNode }) {
  return (
    <section className="mt-10">
      <h2 className="text-[17px] leading-snug tracking-[-0.01em] font-semibold text-foreground">{title}</h2>
      {note && <p className="mt-1.5 text-[13px] text-muted leading-relaxed">{note}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Reveal({ children }: { children: ReactNode }) {
  return (
    <m.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.3, ease: easeOut }}
    >
      {children}
    </m.div>
  );
}

function Quote({ children }: { children: ReactNode }) {
  const text = typeof children === "string" ? stripPrompt(children) : children;
  return <span className="serif-italic text-[15.5px] leading-snug text-foreground/85">&ldquo;{text}&rdquo;</span>;
}

// Shared blocks -------------------------------------------------------------------

function MovePicker({ value, onPick }: { value: MoveId | null; onPick: (m: MoveId) => void }) {
  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-2">
        {availableMoves().map((m) => (
          <OptionCard
            key={m.id}
            selected={value === m.id}
            onClick={() => onPick(m.id)}
            label={m.label}
            hint={m.hint}
            className="h-full"
          />
        ))}
      </div>
      <p className="mt-3.5 text-[12.5px] leading-relaxed text-muted-2">
        Not here? Ascend only covers directions where it has checked enough courses.{" "}
        <TextLink href={CONTACT} className="text-[12.5px]">
          Tell Aryan which one
        </TextLink>
      </p>
    </div>
  );
}

function AnchorPicker({
  move,
  value,
  onPick,
}: {
  move: MoveId;
  value: Baseline | null;
  onPick: (b: Baseline) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {MOVES[move].anchors.map((a, i) => (
        <OptionCard key={a} selected={value === i} onClick={() => onPick(i as Baseline)} label={a} />
      ))}
    </div>
  );
}

function RoleRow({
  state,
  fallback,
  onChange,
}: {
  state: CheckState;
  fallback: string;
  onChange: (s: CheckState) => void;
}) {
  const [editing, setEditing] = useState(false);
  function done() {
    if (!state.role.trim()) onChange({ ...state, role: fallback });
    setEditing(false);
  }
  return (
    <Row
      label="Your role"
      action={
        <TextLink onClick={editing ? done : () => setEditing(true)} className="min-w-10 justify-end">{editing ? "Done" : "Edit"}</TextLink>
      }
    >
      {editing ? (
        <input
          type="text"
          value={state.role}
          onChange={(e) => onChange({ ...state, role: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === "Escape") {
              e.preventDefault();
              done();
            }
          }}
          maxLength={LIMITS.roleMax}
          autoFocus
          aria-label="Your role"
          className="w-full bg-card-alt rounded-2xl px-4 py-3 text-foreground text-base sm:text-[15px] outline-none border border-transparent focus:border-foreground focus-visible:outline-none transition-colors"
        />
      ) : (
        <p className="text-[15px] font-medium leading-snug text-foreground">{state.role || fallback}</p>
      )}
    </Row>
  );
}

function Mentions({ state, onChange }: { state: CheckState; onChange: (s: CheckState) => void }) {
  if (state.mentioned.length === 0) return null;
  return (
    <Block
      label="Courses you mentioned"
      note="Your pick page checks each one against your answers."
    >
      <Card as="ul" padded={false} className="divide-y divide-border-soft">
        <AnimatePresence initial={false}>
          {state.mentioned.map((mention, i) => {
            const course = mention.courseId ? courseById(mention.courseId) : undefined;
            return (
              <m.li
                key={`${mention.text}-${i}`}
                layout
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25, ease: easeOut }}
                className="flex items-start gap-2 pl-4 sm:pl-6 pr-2 sm:pr-3 py-3"
              >
                <div className="flex-1 min-w-0 py-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1.5">
                    <Quote>{mention.text}</Quote>
                    <Badge>{STATUS_LABEL[mention.status]}</Badge>
                  </div>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                    {course ? (
                      <>
                        In Ascend&apos;s checked list as{" "}
                        <span className="text-foreground/85">
                          {course.title}, {course.provider}
                        </span>
                      </>
                    ) : (
                      "Not in Ascend's checked list"
                    )}
                  </p>
                </div>
                <IconButton
                  label={`Remove ${mention.text}`}
                  onClick={() => onChange({ ...state, mentioned: state.mentioned.filter((_, j) => j !== i) })}
                >
                  <X className="w-4 h-4" />
                </IconButton>
              </m.li>
            );
          })}
        </AnimatePresence>
      </Card>
    </Block>
  );
}

function CertificateRow({ state, onChange }: { state: CheckState; onChange: (s: CheckState) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 sm:px-6 py-4">
      <div className="min-w-0">
        <div className="text-[15px] font-medium text-foreground">I need a certificate</div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
          Courses without one are left out. You can change this on your pick.
        </p>
      </div>
      <Switch
        on={state.wantsCertificate}
        onChange={(on) => onChange({ ...state, wantsCertificate: on })}
        label="I need a certificate"
      />
    </div>
  );
}

// The AI read-back ------------------------------------------------------------------

function GapList({
  state,
  u,
  onChange,
}: {
  state: CheckState;
  u: UnderstandingT;
  onChange: (s: CheckState) => void;
}) {
  const [adding, setAdding] = useState(false);
  const move = state.move;
  if (!move) {
    return <p className="text-[13px] text-muted">Choose a direction first. The gaps come from it.</p>;
  }
  const gaps = state.gaps;
  const atCap = gaps.length >= LIMITS.gapsMax;
  const showAdd = adding || gaps.length === 0;
  const readFor = state.move === u.move;
  const reasonOf = (id: SkillId) => (readFor ? u.gaps.find((g) => g.id === id)?.reason : undefined);

  function move1(i: number, d: -1 | 1) {
    const next = [...gaps];
    const j = i + d;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange({ ...state, gaps: next });
  }

  return (
    <div>
      {gaps.length > 0 && (
        <Card as="ol" padded={false} className="divide-y divide-border-soft">
          {gaps.map((id, i) => {
            const reason = reasonOf(id);
            return (
              <m.li
                key={id}
                layout
                transition={{ type: "spring", stiffness: 500, damping: 40 }}
                className="grid grid-cols-[1.25rem_minmax(0,1fr)_auto] gap-x-3 items-center pl-4 sm:pl-6 pr-1.5 sm:pr-3 py-2.5"
              >
                <span className="mono-label text-[11px] text-muted-2 tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="text-[15px] font-medium leading-snug text-foreground">{skillLabel(id)}</div>
                <div className="flex items-center">
                  <IconButton label={`Move ${skillLabel(id)} up`} onClick={() => move1(i, -1)} disabled={i === 0}>
                    <ChevronUp className="w-4 h-4" />
                  </IconButton>
                  <IconButton
                    label={`Move ${skillLabel(id)} down`}
                    onClick={() => move1(i, 1)}
                    disabled={i === gaps.length - 1}
                  >
                    <ChevronDown className="w-4 h-4" />
                  </IconButton>
                  <IconButton
                    label={`Remove ${skillLabel(id)}`}
                    onClick={() => onChange({ ...state, gaps: gaps.filter((g) => g !== id) })}
                  >
                    <X className="w-4 h-4" />
                  </IconButton>
                </div>
                {reason && (
                  <p className="col-start-2 col-span-2 mt-0.5 pb-1.5 pr-2 sm:pr-3 text-[13px] leading-relaxed text-muted">
                    {reason}
                  </p>
                )}
              </m.li>
            );
          })}
        </Card>
      )}

      {showAdd ? (
        <Reveal>
          <div className={gaps.length > 0 ? "mt-4" : ""}>
            {gaps.length === 0 && (
              <p className="mb-3 text-[13px] leading-relaxed text-muted">
                Pick what you want to get better at in {MOVE_PHRASES[move]}, the most important first.
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {skillsFor(move)
                .filter((s) => !gaps.includes(s.id as SkillId))
                .map((s) => (
                  <AddChip
                    key={s.id}
                    disabled={atCap}
                    onClick={() => {
                      setAdding(true);
                      onChange({ ...state, gaps: [...gaps, s.id as SkillId] });
                    }}
                  >
                    {s.label}
                  </AddChip>
                ))}
            </div>
            {atCap && (
              <p className="mt-3 text-[12.5px] text-muted-2">Five is the most. Remove one to add another.</p>
            )}
          </div>
        </Reveal>
      ) : (
        <div className="mt-3">
          <TextLink onClick={() => setAdding(true)}>
            <Plus aria-hidden className="w-3.5 h-3.5" />
            Add a gap
          </TextLink>
        </div>
      )}
    </div>
  );
}

function ReadBack({
  u,
  state,
  onChange,
}: {
  u: UnderstandingT;
  state: CheckState;
  onChange: (s: CheckState) => void;
}) {
  const [moveOpen, setMoveOpen] = useState(false);
  const [baseOpen, setBaseOpen] = useState(false);
  const showMoves = moveOpen || !state.move;
  const showAnchors = !!state.move && (baseOpen || state.baseline === null);
  const sameRead = state.move === u.move;
  const evidence = sameRead && state.baseline === u.baseline ? u.baselineEvidence : "";

  return (
    <div>
      <Card padded={false} className="divide-y divide-border-soft">
        <RoleRow state={state} fallback={tidyRole(u.role)} onChange={onChange} />

        <Row
          label="Direction"
          action={
            state.move ? (
              <TextLink onClick={() => setMoveOpen((o) => !o)}>{moveOpen ? "Done" : "Change"}</TextLink>
            ) : undefined
          }
        >
          {state.move ? (
            <>
              <p className="text-[15px] font-medium leading-snug text-foreground">{MOVES[state.move].label}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted">
                {sameRead && u.moveWhy ? u.moveWhy : MOVES[state.move].hint}
              </p>
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-muted">
              Ascend couldn&apos;t tell from what you wrote. Choose the one you&apos;d act on this month.
            </p>
          )}
          <AnimatePresence initial={false}>
            {showMoves && (
              <Reveal key="moves">
                <div className="mt-4">
                  <MovePicker
                    value={state.move}
                    onPick={(m) => {
                      onChange(withMove(state, u, m));
                      setMoveOpen(false);
                    }}
                  />
                </div>
              </Reveal>
            )}
          </AnimatePresence>
        </Row>

        <Row
          label="Starting point"
          action={
            state.move && state.baseline !== null ? (
              <TextLink onClick={() => setBaseOpen((o) => !o)}>{baseOpen ? "Done" : "Change"}</TextLink>
            ) : undefined
          }
        >
          {!state.move ? (
            <p className="text-[13px] text-muted">Choose a direction first.</p>
          ) : state.baseline !== null ? (
            <>
              <p className="text-[15px] font-medium leading-snug text-foreground">
                {MOVES[state.move].anchors[state.baseline]}
              </p>
              {evidence && (
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted">
                  You said: <Quote>{evidence}</Quote>
                </p>
              )}
            </>
          ) : (
            <p className="text-[13px] leading-relaxed text-muted">Choose the closest. It sets where your course starts.</p>
          )}
          <AnimatePresence initial={false}>
            {showAnchors && state.move && (
              <Reveal key={`anchors-${state.move}`}>
                <div className="mt-4">
                  <AnchorPicker
                    move={state.move}
                    value={state.baseline}
                    onPick={(b) => {
                      onChange({ ...state, baseline: b });
                      setBaseOpen(false);
                    }}
                  />
                </div>
              </Reveal>
            )}
          </AnimatePresence>
        </Row>
      </Card>

      {(state.strengths.length > 0 || u.strengths.length > 0) && (
        <Block label="You already have">
          {state.strengths.length === 0 ? (
            <p className="text-[13px] text-muted">None kept.</p>
          ) : (
            <Card as="ul" padded={false} className="divide-y divide-border-soft">
              <AnimatePresence initial={false}>
                {state.strengths.map((s) => (
                  <m.li
                    key={`${s.label}-${s.quote}`}
                    layout
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.25, ease: easeOut }}
                    className="flex items-start gap-2 pl-4 sm:pl-6 pr-2 sm:pr-3 py-3"
                  >
                    <div className="flex-1 min-w-0 py-1">
                      <div className="text-[15px] font-medium leading-snug text-foreground">{s.label}</div>
                      <div className="mt-0.5 text-[13px] leading-snug text-muted">
                        <Quote>{s.quote}</Quote>
                      </div>
                    </div>
                    <IconButton
                      label={`Remove ${s.label}`}
                      onClick={() =>
                        onChange({ ...state, strengths: state.strengths.filter((x) => x !== s) })
                      }
                    >
                      <X className="w-4 h-4" />
                    </IconButton>
                  </m.li>
                ))}
              </AnimatePresence>
            </Card>
          )}
        </Block>
      )}

      <Block label="Gaps to close, in order">
        <GapList state={state} u={u} onChange={onChange} />
      </Block>

      <Mentions state={state} onChange={onChange} />

      <Block label="Anything else">
        <Card padded={false} className="divide-y divide-border-soft">
          <CertificateRow state={state} onChange={onChange} />
          <div className="px-4 sm:px-6 py-4">
            <div className="text-[15px] font-medium text-foreground">How you like to learn</div>
            <p className="mt-0.5 text-[13px] leading-relaxed text-muted">
              Breaks ties between courses that fit equally well.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {(Object.keys(FORMAT_LABEL) as PrefersFormat[]).map((f) => (
                <ToggleChip
                  key={f}
                  pressed={state.prefersFormat === f}
                  onClick={() => onChange({ ...state, prefersFormat: f })}
                >
                  {FORMAT_LABEL[f]}
                </ToggleChip>
              ))}
            </div>
          </div>
        </Card>
      </Block>
    </div>
  );
}

// The manual fallback ---------------------------------------------------------------

function Manual({
  u,
  state,
  onChange,
}: {
  u: UnderstandingT;
  state: CheckState;
  onChange: (s: CheckState) => void;
}) {
  const guessed = !!u.move && state.move === u.move;
  const move = state.move;
  const gaps = state.gaps;
  const atCap = gaps.length >= MANUAL_GAPS_MAX;

  function toggleGap(id: SkillId) {
    onChange({
      ...state,
      gaps: gaps.includes(id) ? gaps.filter((g) => g !== id) : [...gaps, id].slice(0, MANUAL_GAPS_MAX),
    });
  }

  return (
    <div>
      <Card padded={false}>
        <RoleRow state={state} fallback={tidyRole(u.role)} onChange={onChange} />
      </Card>

      <div>
        <Question
          title="Where do you want to grow?"
          note={
            guessed
              ? "Preselected from words in what you wrote. Change it if it's off."
              : "Pick the one you'd act on this month. Moving into it or getting better at it both count."
          }
        >
          <MovePicker value={move} onPick={(m) => onChange(withMove(state, u, m))} />
        </Question>

        <AnimatePresence initial={false} mode="popLayout">
          {move && (
            <Reveal key={`manual-${move}`}>
              <Question title="How much of this do you already do?" note="Pick the closest. It sets where your course starts.">
                <AnchorPicker move={move} value={state.baseline} onPick={(b) => onChange({ ...state, baseline: b })} />
              </Question>

              <Question
                title="What do you most want to get better at?"
                note="Up to three. The first one you choose counts most."
              >
                <div className="flex flex-wrap gap-2">
                  {skillsFor(move).map((s) => {
                    const id = s.id as SkillId;
                    const at = gaps.indexOf(id);
                    return (
                      <AddChip
                        key={id}
                        pressed={at >= 0}
                        rank={at >= 0 ? at + 1 : undefined}
                        disabled={at < 0 && atCap}
                        onClick={() => toggleGap(id)}
                      >
                        {s.label}
                      </AddChip>
                    );
                  })}
                </div>
              </Question>
            </Reveal>
          )}
        </AnimatePresence>
      </div>

      <Mentions state={state} onChange={onChange} />

      <section className="mt-10">
        <Card padded={false}>
          <CertificateRow state={state} onChange={onChange} />
        </Card>
      </section>
    </div>
  );
}

// Entry points ------------------------------------------------------------------------

/** The Check step body: the AI read-back, or manual controls on the rules path. */
export function Understanding({
  response,
  state,
  onChange,
}: {
  response: UnderstandResponse;
  state: CheckState;
  onChange: (s: CheckState) => void;
}) {
  return (
    <LazyMotion features={domMax} strict>
      {/* transforms and layout jump instead of moving under reduced motion; fades stay */}
      <MotionConfig reducedMotion="user">
        {isAiEngine(response.engine) ? (
          <ReadBack u={response.understanding} state={state} onChange={onChange} />
        ) : (
          <Manual u={response.understanding} state={state} onChange={onChange} />
        )}
      </MotionConfig>
    </LazyMotion>
  );
}
