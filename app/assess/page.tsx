"use client";

import {
  Suspense,
  useEffect,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ComponentProps,
  type Dispatch,
  type ReactNode,
  type RefObject,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { Presence } from "@/components/Presence";
import { BlinkCaret, EngineLine, TextLink } from "@/components/ui";
import { SituationInput, cleanSituation } from "@/components/SituationInput";
import { OptionCard, UnderstandingSkeleton } from "@/components/CheckParts";
import { checkStateFrom, editsFrom, missingFor, type CheckState } from "@/components/check-state";
import type { Understanding as UnderstandingEditor } from "@/components/Understanding";
import { loadUnderstanding, situationKey } from "@/lib/ai-client";
import { EXAMPLES, exampleById, type ExampleProfile } from "@/lib/examples";
import { budgetLabel, hoursChipLabel } from "@/lib/format";
import { useDisplayCurrency } from "@/lib/hooks";
import { fadeUp, leave } from "@/lib/motion";
import { trackMilestone } from "@/lib/metrics";
import { isAiEngine } from "@/lib/pick-types";
import { storageWorks } from "@/lib/plan-store";
import { BUDGETS, HOURS, LIMITS, isBudget, isHours, type Budget, type Hours } from "@/lib/profile";
import { loadProfile, saveProfile, writeProfile, type ProfileDraft } from "@/lib/store";
import { understandEngineLine, UNDERSTAND_LOADING } from "@/lib/templates";
import {
  hoursFromText,
  profileFromUnderstanding,
  rulesUnderstandResponse,
  snapHours,
  type ProfileEdits,
  type UnderstandResponse,
} from "@/lib/understand";

// /assess: four steps (addendum-ai). 1 Situation, in their own words; 2 Time;
// 3 Budget; 4 Check, where they confirm what Ascend understood. The
// understand call starts the moment they leave step 1, so it runs while they
// answer time and budget. ?example=1|2|3 fills in an example and jumps to
// Check. Each step forward is a browser history entry, so the phone's back
// gesture goes back one question, and a reload stays on the same step. Edits
// on Check are kept for the tab in sessionStorage until "Looks right".

// The Check step's editor, with framer-motion's list animations, is a chunk
// of its own, so the first load of /assess doesn't carry it (the effect in
// Assess fetches it ahead of time). Not next/dynamic: a lazy component shows
// its fallback for at least 300 ms once it suspends, even when the chunk is
// already here, so the loaded component is kept in a small store instead.
let CheckEditorLoaded: typeof UnderstandingEditor | null = null;
const editorListeners = new Set<() => void>();
/** Fetches the editor once; a failed fetch (offline) leaves the skeleton and is tried again next time. */
function loadCheckEditor(): void {
  if (CheckEditorLoaded) return;
  import("@/components/Understanding")
    .then((mod) => {
      if (CheckEditorLoaded) return;
      CheckEditorLoaded = mod.Understanding;
      editorListeners.forEach((l) => l());
    })
    .catch(() => {});
}
function subscribeEditor(onChange: () => void): () => void {
  editorListeners.add(onChange);
  return () => editorListeners.delete(onChange);
}

/** The Check step's editor, or its skeleton until the chunk is in. */
function CheckEditor(props: ComponentProps<typeof UnderstandingEditor>) {
  const Editor = useSyncExternalStore(subscribeEditor, () => CheckEditorLoaded, () => null);
  useEffect(() => {
    loadCheckEditor();
  }, []);
  // Editor is the module's own export, set once and never replaced, so it
  // can't remount the editor the way a component made during render would.
  // eslint-disable-next-line react-hooks/static-components
  return Editor ? <Editor {...props} /> : <UnderstandingSkeleton />;
}

const STEPS = ["Situation", "Time", "Budget", "Check"] as const;
type StepIndex = 0 | 1 | 2 | 3;
const CHECK: StepIndex = 3;

/** The longest the Check step waits for the understanding before switching to manual controls. */
const CHECK_WAIT_MS = 30_000;

/** Unconfirmed Check edits for this tab: { key: situationKey(text), edits }. */
const CHECK_EDITS_KEY = "ascend.check.v1";

// History -------------------------------------------------------------------------

/** What each /assess history entry carries, next to Next's own state. */
type StepEntry = { ascendStep: StepIndex; ascendFlow: string; ascendPushed: boolean };

function isStep(v: unknown): v is StepIndex {
  return v === 0 || v === 1 || v === 2 || v === 3;
}

/** The step stored on a history entry for this flow, or null. */
function stepFromHistory(state: unknown, flow: string): StepIndex | null {
  if (!state || typeof state !== "object") return null;
  const e = state as Partial<StepEntry>;
  return e.ascendFlow === flow && isStep(e.ascendStep) ? e.ascendStep : null;
}

/** Writes the step onto the current entry, or onto a new one. No URL: ?example and ?edit stay. */
function writeStep(step: StepIndex, flow: string, mode: "push" | "replace") {
  if (typeof window === "undefined") return;
  if (mode === "push") {
    const entry: StepEntry = { ascendStep: step, ascendFlow: flow, ascendPushed: true };
    window.history.pushState(entry, "");
  } else {
    const prev = window.history.state as Partial<StepEntry> | null;
    const entry: StepEntry = { ascendStep: step, ascendFlow: flow, ascendPushed: prev?.ascendPushed === true };
    window.history.replaceState({ ...(prev ?? {}), ...entry }, "");
  }
}

/** The furthest step the answers allow: Time needs a situation, Budget needs hours, Check needs a budget. */
function furthestStep(text: string, hours: Hours | null, budget: Budget | null): StepIndex {
  if (cleanSituation(text).length < LIMITS.situationMin) return 0;
  if (hours === null) return 1;
  if (budget === null) return 2;
  return CHECK;
}

// Check edits (sessionStorage) ----------------------------------------------------

function readCheckEdits(text: string): ProfileEdits | null {
  try {
    const raw = sessionStorage.getItem(CHECK_EDITS_KEY);
    const v = raw ? (JSON.parse(raw) as { key?: unknown; edits?: unknown }) : null;
    return v && v.key === situationKey(text) && v.edits && typeof v.edits === "object"
      ? (v.edits as ProfileEdits)
      : null;
  } catch {
    return null;
  }
}

function writeCheckEdits(text: string, check: CheckState) {
  try {
    sessionStorage.setItem(CHECK_EDITS_KEY, JSON.stringify({ key: situationKey(text), edits: editsFrom(check) }));
  } catch {
    // storage blocked: the edits still live in memory for this visit
  }
}

function clearCheckEdits() {
  try {
    sessionStorage.removeItem(CHECK_EDITS_KEY);
  } catch {
    // ignore
  }
}

// State --------------------------------------------------------------------------

type Understand =
  | { status: "idle" }
  | { status: "pending"; text: string }
  | { status: "done"; text: string; response: UnderstandResponse };

type State = {
  step: StepIndex;
  /** the textarea, as typed */
  text: string;
  hours: Hours | null;
  /** "text" when prefilled from hours they wrote, until they choose */
  hoursFrom: "user" | "text" | null;
  /** the number they wrote, for the prefill note */
  hoursSaid: number | null;
  budget: Budget | null;
  und: Understand;
  check: CheckState | null;
};

type Action =
  | { type: "text"; text: string }
  | { type: "hours"; hours: Hours }
  | { type: "budget"; budget: Budget }
  | { type: "step"; step: StepIndex }
  /** browser Back or Forward landed on this step (already capped to the answers) */
  | { type: "goto"; step: StepIndex }
  /** leaving step 1 with this cleaned text */
  | { type: "leave-situation"; text: string }
  | { type: "understood"; text: string; response: UnderstandResponse; saved: ProfileDraft | null }
  | { type: "check"; check: CheckState };

/** Hours they wrote, as a chip, unless they already chose one. */
function prefillHours(s: State, said: number | null): State {
  if (s.hoursFrom === "user") return s;
  const chip = snapHours(said);
  if (chip) return { ...s, hours: chip, hoursFrom: "text", hoursSaid: said };
  if (s.hoursFrom === "text") return { ...s, hours: null, hoursFrom: null, hoursSaid: null };
  return s;
}

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "text":
      return { ...s, text: a.text };
    case "hours":
      return { ...s, hours: a.hours, hoursFrom: "user", hoursSaid: null };
    case "budget":
      return { ...s, budget: a.budget };
    case "step":
      return { ...s, step: a.step };
    case "goto": {
      // past step 1 the situation is read, the same as pressing Continue
      if (a.step === 0) return { ...s, step: 0 };
      return { ...reducer(s, { type: "leave-situation", text: cleanSituation(s.text) }), step: a.step };
    }
    case "leave-situation": {
      const same = s.und.status !== "idle" && s.und.text === a.text;
      const next = same ? s : { ...s, und: { status: "pending" as const, text: a.text }, check: null };
      // code reads written hours at once; the AI's reading may refine it
      return same ? next : prefillHours(next, hoursFromText(a.text));
    }
    case "understood": {
      if (s.und.status === "idle" || s.und.text !== a.text) return s;
      const u = a.response.understanding;
      const next: State = {
        ...s,
        und: { status: "done", text: a.text, response: a.response },
        check: checkStateFrom(u, a.saved),
      };
      if (u.hoursChip) return prefillHours(next, u.hoursMentioned ?? u.hoursChip);
      // The AI read no study hours (say, only working hours): a prefill from
      // code's quick read goes, unless they have already moved past Time.
      if (isAiEngine(a.response.engine) && s.hoursFrom === "text" && s.step <= 1) {
        return { ...next, hours: null, hoursFrom: null, hoursSaid: null };
      }
      return next;
    }
    case "check":
      return { ...s, check: a.check };
  }
}

/** ?example=1, 2 or 3 (or an example id). */
function exampleFromParam(v: string | null): ExampleProfile | null {
  if (!v) return null;
  if (/^[1-9]$/.test(v)) return EXAMPLES[Number(v) - 1] ?? null;
  return exampleById(v);
}

/**
 * The saved draft when it belongs to this same situation, so earlier fixes
 * come back, with this tab's unconfirmed Check edits on top. The edits never
 * go into the saved profile: "Looks right" stays the only way in.
 */
function savedFor(text: string): ProfileDraft | null {
  const d = loadProfile();
  const draft = typeof d.situation === "string" && cleanSituation(d.situation) === text ? d : null;
  const edits = readCheckEdits(text);
  if (!edits) return draft;
  // a baseline belongs to its move: none chosen yet means none, not the draft's old one
  return { ...(draft ?? { situation: text }), ...edits, baseline: edits.baseline };
}

/**
 * "Edit answers" from the pick (/assess?edit=1): a complete saved draft opens
 * on Check, with what was understood and the user's own fixes; anything less
 * starts at step 1 as usual.
 */
function editStart(): State | null {
  const d = loadProfile();
  if (typeof d.situation !== "string" || !isHours(d.hoursPerWeek) || !isBudget(d.budget)) return null;
  const text = cleanSituation(d.situation);
  if (text.length < LIMITS.situationMin) return null;
  return {
    step: CHECK,
    text: d.situation.slice(0, LIMITS.situationMax),
    hours: d.hoursPerWeek,
    hoursFrom: "user",
    hoursSaid: null,
    budget: d.budget,
    und: { status: "pending", text },
    check: null,
  };
}

/** Where this visit starts, before a reload's saved step is applied. */
function firstState({ example, edit }: { example: ExampleProfile | null; edit: boolean }): State {
  if (!example && edit) {
    const s = editStart();
    if (s) return s;
  }
  if (example) {
    return {
      step: CHECK,
      text: example.situation,
      hours: example.hoursPerWeek,
      hoursFrom: "user",
      hoursSaid: null,
      budget: example.budget,
      und: { status: "pending", text: cleanSituation(example.situation) },
      check: null,
    };
  }
  // "Use my own answers" after an example: a saved example is not their own
  // draft, so step 1 starts blank instead of holding the example's words.
  const d0 = loadProfile();
  const isExample =
    typeof d0.situation === "string" &&
    EXAMPLES.some((e) => cleanSituation(e.situation) === cleanSituation(d0.situation as string));
  const d: ProfileDraft = isExample ? {} : d0;
  return {
    step: 0,
    text: typeof d.situation === "string" ? d.situation.slice(0, LIMITS.situationMax) : "",
    hours: isHours(d.hoursPerWeek) ? d.hoursPerWeek : null,
    hoursFrom: isHours(d.hoursPerWeek) ? "user" : null,
    hoursSaid: null,
    budget: isBudget(d.budget) ? d.budget : null,
    und: { status: "idle" },
    check: null,
  };
}

/**
 * The first state, then the step a reload (or Back from the pick) left on this
 * history entry, capped to what the saved answers allow.
 */
function init(args: { example: ExampleProfile | null; edit: boolean; flow: string }): State {
  const s = firstState(args);
  const saved = typeof window === "undefined" ? null : stepFromHistory(window.history.state, args.flow);
  if (saved === null || saved === s.step) return s;
  const step = Math.min(saved, furthestStep(s.text, s.hours, s.budget)) as StepIndex;
  return reducer(s, { type: "goto", step });
}

type Req = { text: string; ctrl: AbortController };

/**
 * Starts POST /api/understand for this text unless it's already running or
 * done. A cached answer comes back at once; failures come back as the rules
 * reading (lib/ai-client), never as an error.
 */
function requestUnderstanding(ref: RefObject<Req | null>, text: string, dispatch: Dispatch<Action>) {
  if (ref.current?.text === text) return;
  ref.current?.ctrl.abort();
  const ctrl = new AbortController();
  ref.current = { text, ctrl };
  void loadUnderstanding(text, { signal: ctrl.signal }).then(({ response }) => {
    if (ctrl.signal.aborted) return;
    dispatch({ type: "understood", text, response, saved: savedFor(text) });
  });
}

// Page ---------------------------------------------------------------------------

const noopSubscribe = () => () => {};

function Blank() {
  return <main className="min-h-screen bg-background" />;
}

export default function AssessPage() {
  return (
    <Suspense fallback={<Blank />}>
      <AssessGate />
    </Suspense>
  );
}

/** Waits for the browser (the draft lives in localStorage), then mounts the flow keyed by the example. */
function AssessGate() {
  const params = useSearchParams();
  const example = exampleFromParam(params.get("example"));
  const edit = params.get("edit") === "1";
  const ready = useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
  if (!ready) return <Blank />;
  const flow = example?.id ?? (edit ? "edit" : "own");
  return <Assess key={flow} flow={flow} example={example} edit={edit} />;
}

function Assess({ flow, example, edit }: { flow: string; example: ExampleProfile | null; edit: boolean }) {
  const router = useRouter();
  const currency = useDisplayCurrency();
  const [s, dispatch] = useReducer(reducer, { example, edit, flow }, init);
  const [storageOk] = useState(() => storageWorks());
  const reqRef = useRef<Req | null>(null);
  const stateRef = useRef(s);
  const exampleText = example ? cleanSituation(example.situation) : null;

  useEffect(() => {
    stateRef.current = s;
  });

  // The Check step's editor is its own chunk. A page that opens past the
  // first question (an example, "Edit answers", a reload) fetches it at once;
  // otherwise leaving the first question does, two questions before Check.
  useEffect(() => {
    if (stateRef.current.step > 0) loadCheckEditor();
  }, []);

  // Whenever a reading is pending (an example, "Edit answers", a reload past
  // step 1, Back or Forward), make sure its understand call is running. A
  // cached answer comes back at once. No abort on cleanup: a second run in
  // development finds it already running, and an answer that lands after
  // unmount is simply dropped.
  const pendingText = s.und.status === "pending" ? s.und.text : null;
  useEffect(() => {
    if (pendingText) requestUnderstanding(reqRef, pendingText, dispatch);
  }, [pendingText]);

  // This history entry carries the step it opened on, so Back from a later
  // step, or from the pick, returns here.
  useEffect(() => {
    if (stepFromHistory(window.history.state, flow) !== stateRef.current.step) {
      writeStep(stateRef.current.step, flow, "replace");
    }
  }, [flow]);

  // Browser Back and Forward move between steps, capped to what's answered.
  useEffect(() => {
    function onPop(e: PopStateEvent) {
      const want = stepFromHistory(e.state, flow);
      if (want === null) return; // another page or flow; the router handles it
      const cur = stateRef.current;
      const step = Math.min(want, furthestStep(cur.text, cur.hours, cur.budget)) as StepIndex;
      if (step !== want) writeStep(step, flow, "replace");
      dispatch({ type: "goto", step });
      window.scrollTo({ top: 0 });
    }
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [flow]);

  // On Check, wait at most 10 s, then fall back to manual controls.
  useEffect(() => {
    if (s.step !== CHECK || s.und.status !== "pending") return;
    const text = s.und.text;
    const timer = setTimeout(() => {
      reqRef.current?.ctrl.abort();
      dispatch({
        type: "understood",
        text,
        response: rulesUnderstandResponse(text, "unavailable"),
        saved: savedFor(text),
      });
    }, CHECK_WAIT_MS);
    return () => clearTimeout(timer);
  }, [s.step, s.und]);

  const cleaned = cleanSituation(s.text);
  const inExample = !!example && cleaned === exampleText;
  const response = s.und.status === "done" ? s.und.response : null;
  const missing = s.check ? missingFor(s.check) : null;

  /** Keeps the draft so a reload or "Edit answers" brings it back. Examples aren't saved until confirmed. */
  function persist(patch: { text?: string; hours?: Hours; budget?: Budget }) {
    if (example) return;
    const text = patch.text ?? s.text;
    const stored = loadProfile();
    const same =
      typeof stored.situation === "string" && cleanSituation(stored.situation) === cleanSituation(text);
    writeProfile({
      ...(same ? stored : {}),
      situation: text,
      hoursPerWeek: patch.hours ?? s.hours ?? undefined,
      budget: patch.budget ?? s.budget ?? undefined,
    });
  }

  /** Forward pushes a history entry; going back in-app rewrites the current one. */
  function go(step: StepIndex, mode: "push" | "replace" = "push") {
    dispatch({ type: "step", step });
    writeStep(step, flow, mode);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  }

  function canAdvance(): boolean {
    if (s.step === 0) return cleaned.length >= LIMITS.situationMin;
    if (s.step === 1) return s.hours !== null;
    if (s.step === 2) return s.budget !== null;
    return !!response && !!s.check && missing === null && s.hours !== null && s.budget !== null;
  }

  function next() {
    if (!canAdvance()) return;
    if (s.step === 0) {
      dispatch({ type: "leave-situation", text: cleaned });
      requestUnderstanding(reqRef, cleaned, dispatch);
      loadCheckEditor();
      go(1);
    } else if (s.step === 1) {
      go(2);
    } else if (s.step === 2) {
      // after a reload on Time or Budget the reading may not have started yet
      if (s.und.status === "idle") dispatch({ type: "leave-situation", text: cleaned });
      go(CHECK);
    } else {
      confirm();
    }
  }

  function back() {
    if (s.step === 0) {
      router.push("/");
      return;
    }
    // an entry this page pushed: the browser's Back, so both stay in step
    const h = window.history.state as Partial<StepEntry> | null;
    if (h?.ascendPushed && stepFromHistory(h, flow) === s.step) window.history.back();
    else go((s.step - 1) as StepIndex, "replace");
  }

  function confirm() {
    if (s.und.status !== "done" || !s.check || s.hours === null || s.budget === null) return;
    const { text, response: r } = s.und;
    const profile = profileFromUnderstanding({
      situation: text,
      understanding: r.understanding,
      engine: r.engine,
      hoursPerWeek: s.hours,
      budget: s.budget,
      edits: editsFrom(s.check),
    });
    if (!profile) return;
    saveProfile(profile);
    clearCheckEdits();
    trackMilestone("understood", situationKey(text));
    router.push("/recommendations");
  }

  function resetToOwn() {
    reqRef.current?.ctrl.abort();
    router.replace("/assess");
  }

  // Check step header, by phase
  const phase: "loading" | "ai" | "rules" = !response ? "loading" : isAiEngine(response.engine) ? "ai" : "rules";

  let hint: string | null = null;
  if (s.step === CHECK && phase !== "loading") {
    if (missing === "move") hint = "Choose a direction to continue.";
    else if (missing === "baseline") hint = "Choose a starting point to continue.";
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen px-6 sm:px-10 lg:px-12">
        {/* Top bar */}
        <header className="py-5 flex items-center justify-between">
          <button
            onClick={back}
            aria-label={s.step === 0 ? "Back to home" : "Previous question"}
            className="flex items-center gap-1.5 min-h-10 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Step {s.step + 1} of {STEPS.length} <span className="text-muted-2">·</span> {STEPS[s.step]}
          </div>
        </header>

        {/* Progress bar */}
        <div className="h-1 bg-card-alt rounded-full overflow-hidden">
          <div
            className="h-full bg-foreground"
            style={{
              width: `${((s.step + 1) / STEPS.length) * 100}%`,
              transition: "width 0.5s var(--ease-out)",
            }}
          />
        </div>

        {!storageOk && (
          <p className="mt-4 text-[12.5px] leading-relaxed text-muted-2">
            This browser isn&apos;t saving, so finish in one go and keep the plan link.
          </p>
        )}

        {inExample && example && (
          <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
            <span className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 leading-relaxed">
              {"// Example answers · "}
              {example.label}
            </span>
            <TextLink onClick={resetToOwn} className="self-start sm:self-auto flex-shrink-0">
              Use my own answers
            </TextLink>
          </div>
        )}

        {/* Question */}
        <section className={`flex-1 flex flex-col justify-start ${inExample ? "mt-8" : "mt-10"} pb-6`}>
          {/* One step at a time: the old one fades up and out, then the next fades in. */}
          <Presence
            id={String(s.step)}
            enter="fade-up"
            exit="fade-out"
            style={{ ...fadeUp(16, 0.35), ...leave(-8, 0.35) }}
          >
            {s.step === 0 && (
              <>
                <StepHead
                  title="Where are you now, and where do you want to grow?"
                  helper="A few sentences in your own words. What you do, where you want to be, what you've tried."
                  why="Ascend's AI reads this for your direction, what you already have and the gaps to close. You'll check what it understood before anything is chosen."
                />
                <div className="mt-7">
                  <SituationInput
                    value={s.text}
                    onChange={(text) => {
                      dispatch({ type: "text", text });
                      persist({ text });
                    }}
                    onSubmit={next}
                    autoFocus={s.text.length === 0}
                  />
                </div>
              </>
            )}

            {s.step === 1 && (
              <>
                <StepHead
                  title="How many hours a week can you give this?"
                  helper="Pick what survives a bad work week, not your best one."
                  why="Ascend plans at 70% of this, because most weeks run short. That's its own rule of thumb, not a study."
                />
                <div className="mt-7 grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {HOURS.map((h) => (
                    <OptionCard
                      key={h}
                      selected={s.hours === h}
                      onClick={() => {
                        dispatch({ type: "hours", hours: h });
                        persist({ hours: h });
                      }}
                      label={hoursChipLabel(h)}
                    />
                  ))}
                </div>
                {s.hoursFrom === "text" && s.hoursSaid !== null && (
                  <p className="mt-4 text-[12.5px] leading-relaxed text-muted-2">
                    Set from what you wrote: {s.hoursSaid} {s.hoursSaid === 1 ? "hour" : "hours"} a week.
                    Change it if a bad week has less.
                  </p>
                )}
              </>
            )}

            {s.step === 2 && (
              <>
                <StepHead
                  title="What can you spend on this?"
                  helper="You'll see the real price and any free way to start either way."
                  why="The cap covers every month at your pace for the part you'd start with. Code checks it before any AI runs."
                />
                <div className="mt-7 flex flex-col gap-2">
                  {BUDGETS.map((b) => (
                    <OptionCard
                      key={b}
                      selected={s.budget === b}
                      onClick={() => {
                        dispatch({ type: "budget", budget: b });
                        persist({ budget: b });
                      }}
                      label={budgetLabel(b, currency)}
                    />
                  ))}
                </div>
              </>
            )}

            {s.step === CHECK && (
              <Presence
                id={phase}
                enter="fade-up"
                exit="fade-out"
                initial={false}
                style={{ ...fadeUp(8, 0.3), ...leave(0, 0.3) }}
              >
                {phase === "loading" && (
                  <>
                    <StepHead
                      title={
                        <>
                          {UNDERSTAND_LOADING}
                          <BlinkCaret />
                        </>
                      }
                      helper="Your direction, starting point, strengths and gaps, read from your words."
                    />
                    <div className="mt-7" aria-live="polite">
                      <span className="sr-only">{UNDERSTAND_LOADING}</span>
                      <UnderstandingSkeleton />
                    </div>
                  </>
                )}

                {phase !== "loading" && response && s.check && (
                  <>
                    <StepHead
                      title={phase === "ai" ? "Here's what Ascend understood." : "Set your direction."}
                      helper={
                        phase === "ai"
                          ? "Nothing is chosen until you say it looks right."
                          : "A few quick choices. Ascend still uses what you wrote."
                      }
                      why={
                        <EngineLine>
                          {understandEngineLine({
                            engine: response.engine,
                            model: response.model,
                            words: response.words,
                            reason: response.reason,
                          })}
                        </EngineLine>
                      }
                    />
                    <div className="mt-7">
                      <CheckEditor
                        response={response}
                        state={s.check}
                        onChange={(check) => {
                          dispatch({ type: "check", check });
                          // examples aren't saved until confirmed
                          if (!example && s.und.status === "done") writeCheckEdits(s.und.text, check);
                        }}
                      />
                    </div>
                  </>
                )}
              </Presence>
            )}
          </Presence>
        </section>

        {/* Footer CTA */}
        <footer className="py-5 sticky bottom-0 bg-background">
          {hint && <p className="mb-3 text-center text-[12.5px] text-muted-2">{hint}</p>}
          <button
            onClick={next}
            disabled={!canAdvance()}
            className="w-full inline-flex items-center justify-center gap-2 bg-foreground text-accent-fg rounded-2xl py-3.5 font-medium text-[15px] disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
          >
            {s.step === CHECK ? "Looks right. Show my pick" : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </footer>
      </div>
    </main>
  );
}

function StepHead({ title, helper, why }: { title: ReactNode; helper?: string; why?: ReactNode }) {
  return (
    <>
      <h1 className="text-[1.75rem] leading-[1.2] tracking-[-0.01em] font-semibold text-foreground">{title}</h1>
      {helper && <p className="mt-2 text-muted text-sm">{helper}</p>}
      {why &&
        (typeof why === "string" ? (
          <p className="mt-3 text-muted-2 text-[12.5px] leading-relaxed">{why}</p>
        ) : (
          <div className="mt-3">{why}</div>
        ))}
    </>
  );
}
