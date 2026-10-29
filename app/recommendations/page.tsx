"use client";

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { AdjustChips } from "@/components/AdjustChips";
import { Alternates, type AlternateRow } from "@/components/Alternates";
import { CheckAnother } from "@/components/CheckAnother";
import { DecisionPanel } from "@/components/DecisionPanel";
import { MentionedCourses } from "@/components/MentionedCourses";
import { PickCard } from "@/components/PickCard";
import { RepickNote, type RepickStatus } from "@/components/RepickNote";
import { RulesVsAi } from "@/components/RulesVsAi";
import { WorkLedger, aiSawThese, ledgerStages } from "@/components/WorkLedger";
import { AskSomeone } from "@/components/AskSomeone";
import { matchFor } from "@/lib/skills";
import {
  BlinkCaret,
  Card,
  EngineLine,
  Reveal,
  SectionLabel,
  SkeletonLine,
  TextLink,
} from "@/components/ui";
import { profileForExample, getUnderstanding } from "@/lib/ai-client";
import { courseById } from "@/lib/catalog";
import {
  MAX_REPICKS,
  adjustDecision,
  getLatestDecision,
  loadDecision,
  pruneForFreshStart,
  repicksUsed,
  repickWithNote,
  resetDecision,
  setChosen,
  shouldRetryAi,
  swapDecision,
} from "@/lib/decision-store";
import { exampleById, exampleFor, type ExampleProfile } from "@/lib/examples";
import {
  closestRuledOut,
  fit,
  funnelStages,
  rankedPassing,
  relaxations,
  type Candidate,
  type Relaxation,
} from "@/lib/fit";
import { budgetPhrase, hoursAWeek } from "@/lib/format";
import { useDisplayCurrency, useReducedMotion } from "@/lib/hooks";
import { trackMilestone } from "@/lib/metrics";
import { MOVES } from "@/lib/moves";
import { isAiEngine, type CandidateCoverage, type Decision } from "@/lib/pick-types";
import {
  adjustedChipNames,
  defaultAdjust,
  normalizeProfile,
  toggleChip,
  type Adjust,
  type AdjustChip,
  type ProfileV2,
} from "@/lib/profile";
import { keywordCoverage } from "@/lib/skills";
import { candidateCoverage } from "@/lib/decide-rules";
import { clearSession, readProfile, saveProfile, writeProfile } from "@/lib/store";
import {
  GAP_NOTE_TEMPLATE,
  UNDERSTAND_LOADING,
  readBackLine,
  weakFitNote,
} from "@/lib/templates";

// "Your pick" (spec 3.3, addendum-ai "Showing the work"). Rules run in the
// browser first and the funnel shows them; then one POST /api/pick lets the AI
// match modules to the person's gaps and choose; any failure falls back to the
// same rules locally. The pick card, the gap coverage and the receipt come
// first; everything else is calm and secondary. Chips and swaps never call
// the network.

const noopSubscribe = () => () => {};
/** Ruled-out entries listed under "Left out, and why" (spec 3.3: up to 4). */
const LEFT_OUT_SHOWN = 4;
const onClient = () => true;
const onServer = () => false;

type Start =
  | { kind: "example"; example: ExampleProfile }
  | { kind: "missing" }
  | { kind: "profile"; profile: ProfileV2; cached: Decision | null };

type Session = {
  profile: ProfileV2;
  decision: Decision | null;
  /** a fresh request is behind this view: the funnel plays */
  fresh: boolean;
  /** bumps for every fresh request, so stale answers are dropped */
  loadId: number;
  /** adjust and exclude of the request in flight */
  pending: { adjust: Adjust; exclude: string[] };
};

function initialSession(start: Start | null): Session | null {
  if (start?.kind !== "profile") return null;
  return {
    profile: start.profile,
    decision: start.cached,
    fresh: start.cached === null,
    loadId: 0,
    pending: { adjust: defaultAdjust(start.profile), exclude: [] },
  };
}

export default function YourPick() {
  const router = useRouter();
  const ready = useSyncExternalStore(noopSubscribe, onClient, onServer);
  const currency = useDisplayCurrency();
  const reduced = useReducedMotion();

  // Where the page starts, read once in the browser.
  const start = useMemo<Start | null>(() => {
    if (!ready) return null;
    const ex = exampleById(new URLSearchParams(window.location.search).get("example"));
    if (ex) return { kind: "example", example: ex };
    const profile = readProfile();
    if (!profile) return { kind: "missing" };
    return { kind: "profile", profile, cached: getLatestDecision(profile) };
  }, [ready]);

  const [override, setOverride] = useState<Session | null>(null);
  const initial = useMemo(() => initialSession(start), [start]);
  const session = override ?? initial;
  const seq = useRef(0);
  const [heldId, setHeldId] = useState<number | null>(null);
  const [doneId, setDoneId] = useState<number | null>(null);
  const [repick, setRepick] = useState<RepickStatus>({ kind: "idle" });

  /** One fresh request: shows the funnel, then the answer (or the rules, on any failure). */
  async function decide(profile: ProfileV2, adjust: Adjust, exclude: string[], signal?: AbortSignal) {
    const id = ++seq.current;
    setOverride({ profile, decision: null, fresh: true, loadId: id, pending: { adjust, exclude } });
    const { decision } = await loadDecision({ profile, currency, adjust, exclude, signal });
    if (signal?.aborted || seq.current !== id) return;
    setOverride((s) => (s && s.loadId === id ? { ...s, decision } : s));
  }

  // No answers yet: back to the questions.
  useEffect(() => {
    if (start?.kind === "missing") router.replace("/assess");
  }, [start, router]);

  // Saved answers without a decision: ask once. A saved rules answer from a
  // failed AI call is asked again once it is a minute old; its card stays on
  // screen meanwhile.
  useEffect(() => {
    if (start?.kind !== "profile") return;
    const cached = start.cached;
    if (cached && !shouldRetryAi(cached)) return;
    const ctrl = new AbortController();
    const id = seq.current;
    loadDecision({
      profile: start.profile,
      currency,
      ...(cached ? { adjust: cached.adjust, exclude: cached.exclude } : {}),
      signal: ctrl.signal,
    }).then(({ decision }) => {
      if (ctrl.signal.aborted || seq.current !== id) return;
      setOverride((s) => {
        const base = s ?? initialSession(start);
        return base ? { ...base, decision } : s;
      });
    });
    return () => ctrl.abort();
  }, [start, currency]);

  // ?example=id: read the example's situation with the real understand call,
  // then decide fresh.
  useEffect(() => {
    if (start?.kind !== "example") return;
    const ctrl = new AbortController();
    const ex = start.example;
    profileForExample(ex, { signal: ctrl.signal }).then(({ profile }) => {
      if (ctrl.signal.aborted) return;
      if (!profile) {
        writeProfile({ situation: ex.situation, hoursPerWeek: ex.hoursPerWeek, budget: ex.budget });
        router.replace("/assess");
        return;
      }
      saveProfile(profile);
      pruneForFreshStart();
      window.history.replaceState(null, "", "/recommendations");
      void decide(normalizeProfile(profile), defaultAdjust(profile), [], ctrl.signal);
    });
    return () => ctrl.abort();
    // decide is recreated each render; this runs once per start
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [start, router]);

  const profile = session?.profile ?? null;
  const decision = session?.decision ?? null;
  const pending = session?.pending ?? null;
  const adjust = decision?.adjust ?? pending?.adjust ?? null;
  const exclude = useMemo(() => decision?.exclude ?? pending?.exclude ?? [], [decision, pending]);

  // The rules, in the browser: funnel, candidates, ruled-out list.
  const result = useMemo(
    () => (profile && adjust ? fit(profile, adjust, { currency, exclude }) : null),
    [profile, adjust, currency, exclude],
  );
  const passing = useMemo(
    () => (profile && adjust ? rankedPassing(profile, adjust, { currency }) : []),
    [profile, adjust, currency],
  );
  const stages = useMemo(() => (result && profile ? funnelStages(result, profile) : []), [result, profile]);
  const candidateIds = useMemo(() => result?.candidates.map((c) => c.id) ?? [], [result]);
  const understanding = useMemo(
    () => (profile && ready ? getUnderstanding(profile.situation) : null),
    [profile, ready],
  );

  const fresh = session?.fresh ?? false;
  const animating = fresh && !reduced;
  const shown = decision !== null && (!animating || doneId === session?.loadId);

  // One /m/pick per decision rendered.
  useEffect(() => {
    if (shown && decision?.pickId) trackMilestone("pick", decision.key);
  }, [shown, decision]);

  const example = profile ? exampleFor(profile) : start?.kind === "example" ? start.example : null;

  function candidateFor(id: string): Candidate | null {
    return result?.candidates.find((c) => c.id === id) ?? passing.find((c) => c.id === id) ?? null;
  }

  function coverageFor(id: string): CandidateCoverage | null {
    if (!decision || !profile) return null;
    const hit = decision.coverage.find((c) => c.id === id);
    if (hit) return hit;
    const course = courseById(id);
    const cand = candidateFor(id);
    if (!course || decision.gaps.length === 0) return null;
    return candidateCoverage(id, "keywords", keywordCoverage(course, decision.gaps, cand?.moduleCount));
  }

  function update(d: Decision, keepRepickNote = false) {
    if (!session) return;
    setOverride({ ...session, decision: d, fresh: false });
    if (!keepRepickNote) setRepick({ kind: "idle" });
  }

  function onToggle(chip: AdjustChip) {
    if (!decision || !profile) return;
    // a level chip's exclusion lasts only while that chip is on
    const next = toggleChip(
      { adjust: decision.adjust, exclude: decision.exclude, levelExclude: decision.levelExclude },
      chip,
      decision.pickId,
    );
    update(adjustDecision(decision, profile, next.adjust, next.exclude, next.levelExclude));
  }

  /** Back to the first decision for these answers (the AI's, when it ran), swaps and hidden courses undone. */
  function onReset() {
    if (!decision || !profile) return;
    update(resetDecision(decision, profile));
  }

  function onSwap(id: string) {
    if (!decision || !profile) return;
    update(swapDecision(decision, id, profile));
  }

  async function onRepick(note: string) {
    if (!decision || !profile) return;
    setRepick({ kind: "loading" });
    const res = await repickWithNote(decision, profile, note, currency);
    if (res.ok) {
      update(res.decision, true);
      setRepick({ kind: "ok", note: note.trim().slice(0, 200) });
    } else {
      setRepick(res.reason === "limit" ? { kind: "idle" } : { kind: "failed" });
    }
  }

  function onRelax(r: Relaxation) {
    if (!decision || !profile) return;
    const next = normalizeProfile(
      r.kind === "hours" ? { ...profile, hoursPerWeek: r.hoursPerWeek } : { ...profile, budget: r.budget },
    );
    const a = r.kind === "budget" ? { ...decision.adjust, cheaper: false } : decision.adjust;
    saveProfile(next);
    setRepick({ kind: "idle" });
    void decide(next, a, decision.exclude);
  }

  function onBook() {
    if (!decision?.pickId) return;
    setChosen(decision, decision.pickId);
    router.push("/plan");
  }

  // ------------------------------------------------------------------------

  const pickCourse = decision?.pickId ? courseById(decision.pickId) : undefined;
  const pickCandidate = decision?.pickId ? candidateFor(decision.pickId) : null;
  const altRows: AlternateRow[] = (decision?.alternates ?? []).flatMap((alt) => {
    const course = courseById(alt.id);
    return course ? [{ alt, course, candidate: candidateFor(alt.id), coverage: coverageFor(alt.id) }] : [];
  });
  const adjustedNote = decision && profile ? adjustedChipNames(profile, decision.adjust) : "";
  // a swap counts too: Reset brings back the first decision (the AI's, when it ran)
  const canReset = Boolean(adjustedNote) || (decision?.exclude.length ?? 0) > 0 || decision?.origin === "swapped";
  // courses an earlier change keeps out that no pressed chip explains (a re-pick's, say)
  const hidden = (decision?.exclude ?? [])
    .filter((id) => id !== decision?.levelExclude)
    .flatMap((id) => courseById(id)?.title ?? []);
  // counted per set of answers in storage, so Reset or a reload doesn't hand out more
  const repicksUsedNow = decision && profile ? Math.max(decision.repicks.length, repicksUsed(profile)) : 0;
  const othersLeft = result && decision ? result.candidates.filter((c) => c.id !== decision.pickId).length : 0;
  const showRepick = decision !== null && decision.pickId !== null && decision.reason !== "no-key" && othersLeft >= 2;
  const rulesTitle = decision?.rulesPickId ? courseById(decision.rulesPickId)?.title ?? null : null;
  const leftOut = (result?.ruledOut ?? []).slice(0, LEFT_OUT_SHOWN);
  // the AI's own gaps, when its reading is still on this device, so the receipt credits it only with those
  const aiGapIds =
    understanding && isAiEngine(understanding.engine) ? understanding.understanding.gaps.map((g) => g.id) : null;

  return (
    <main className="min-h-screen bg-background">
      <div className="w-full max-w-4xl mx-auto px-6 sm:px-10 lg:px-16 pb-20 sm:pb-28">
        <header className="py-5 flex items-center justify-between">
          <Link
            href="/assess?edit=1"
            aria-label="Back to your answers"
            className="-my-2 inline-flex min-h-10 items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft aria-hidden className="w-4 h-4" />
            Back
          </Link>
        </header>

        <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 flex items-center gap-3 pt-2 sm:pt-6">
          <span className="mono-label text-muted font-medium">{"// 02 YOUR PICK"}</span>
          <span aria-hidden className="flex-1 h-px bg-border-soft" />
        </div>
        <h1 className="sr-only">Your pick</h1>

        {example && (
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1">
            <span className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
              {"// Example answers · "}
              {example.label}
            </span>
            <TextLink
              href="/assess"
              onClick={() => clearSession()}
              className="text-[12.5px]"
            >
              Use my own answers
            </TextLink>
          </div>
        )}

        {/* Reading an example's situation (the understand call) */}
        {!profile && start?.kind === "example" && (
          <Reveal className="mt-6">
            <Card padded={false} className="p-5 sm:p-8">
              <EngineLine>
                {UNDERSTAND_LOADING}
                <BlinkCaret />
              </EngineLine>
              <p className="mt-4 serif-italic text-[18px] sm:text-[20px] leading-snug text-foreground/75 max-w-[60ch]">
                &ldquo;{start.example.situation}&rdquo;
              </p>
              <div className="mt-6 flex flex-col gap-2.5">
                <SkeletonLine className="w-2/3" />
                <SkeletonLine className="w-1/2" />
              </div>
            </Card>
          </Reveal>
        )}

        {profile && result && (
          <>
            <p className="mt-5 text-[13px] leading-relaxed text-muted max-w-[70ch]">
              {readBackLine(profile, currency)}{" "}
              <TextLink href="/assess?edit=1" className="text-[13px] whitespace-nowrap">
                Edit answers
              </TextLink>
            </p>

            <WorkLedger
              funnelKey={session?.loadId ?? 0}
              className="mt-4"
              stages={stages}
              candidateIds={candidateIds}
              decision={decision}
              understoodBy={profile.understoodBy}
              aiGapIds={aiGapIds}
              pending={!shown}
              play={animating}
              hold={decision === null}
              onHeld={() => setHeldId(session?.loadId ?? 0)}
              onDone={() => setDoneId(session?.loadId ?? 0)}
            />

            {!shown && (
              <PickSkeleton
                line={
                  heldId === session?.loadId && result.candidates.length >= 2 && profile.gaps.length > 0
                    ? `Matching modules in ${result.candidates.length} courses to your ${profile.gaps.length} ${profile.gaps.length === 1 ? "gap" : "gaps"}`
                    : `Checking ${result.funnel.checked} courses against your answers`
                }
              />
            )}

            {shown && decision && !pickCourse && (
              <EmptyState
                profile={profile}
                adjust={decision.adjust}
                exclude={decision.exclude}
                currency={currency}
                onRelax={onRelax}
                onCertificateOff={() => onToggle("certificate")}
                chips={
                  <AdjustChips
                    adjust={decision.adjust}
                    adjustedNote={adjustedNote}
                    canReset={canReset}
                    hidden={hidden}
                    onToggle={onToggle}
                    onReset={onReset}
                  />
                }
              />
            )}

            {shown && decision && pickCourse && (
              <>
                {decision.honestFit === "weak" && (
                  <Reveal className="mt-6">
                    <p className="rounded-2xl border border-border-soft bg-card-alt/60 px-4 sm:px-5 py-3.5 text-[13.5px] leading-relaxed text-foreground/85">
                      {weakFitNote(decision.gapNote || GAP_NOTE_TEMPLATE)}
                    </p>
                  </Reveal>
                )}

                <div className="mt-6">
                  <PickCard
                    course={pickCourse}
                    candidate={pickCandidate}
                    profile={profile}
                    decision={decision}
                    coverage={coverageFor(pickCourse.id)}
                    currency={currency}
                    onBook={onBook}
                    onCompare={altRows.length > 0 ? () => router.push("/compare") : undefined}
                  />
                </div>

                {/* the comparison is about the list the AI chose from; a chip that changed that list hides it */}
                {aiSawThese(decision, candidateIds) && (
                  <Reveal delay={0.15}>
                    <RulesVsAi className="mt-5" decision={decision} rulesTitle={rulesTitle} />
                  </Reveal>
                )}

                <Reveal delay={0.25} className="mt-14 sm:mt-16 flex flex-col gap-14 sm:gap-16">
                  <MentionedCourses profile={profile} decision={decision} currency={currency} />

                  {/* with no alternates there is no compare page, so the message to a past learner sits here */}
                  {altRows.length === 0 && (
                    <AskSomeone
                      courses={[{ id: pickCourse.id, title: pickCourse.title }]}
                      role={profile.currentRole}
                      hoursPerWeek={profile.hoursPerWeek}
                    />
                  )}

                  <Alternates
                    rows={altRows}
                    gapCount={decision.gaps.length}
                    pickCoversFirst={Boolean(matchFor(coverageFor(pickCourse.id)?.gaps ?? [], 0))}
                    hoursPerWeek={profile.hoursPerWeek}
                    currency={currency}
                    onSwap={onSwap}
                  />

                  <AdjustChips
                    adjust={decision.adjust}
                    adjustedNote={adjustedNote}
                    canReset={canReset}
                    hidden={hidden}
                    onToggle={onToggle}
                    onReset={onReset}
                  >
                    {showRepick && (
                      <RepickNote used={repicksUsedNow} max={MAX_REPICKS} status={repick} onSubmit={onRepick} />
                    )}
                  </AdjustChips>

                  {leftOut.length > 0 && (
                    <section id="left-out" aria-label="Left out, and why" className="scroll-mt-6">
                      <SectionLabel as="h2">Left out, and why</SectionLabel>
                      <ul className="mt-3 flex flex-col">
                        {leftOut.map((r) => (
                          <li
                            key={r.id}
                            className="py-3 border-t border-border-soft first:border-t-0 first:pt-1 text-[13.5px] leading-relaxed text-muted"
                          >
                            <LeftOutLine id={r.id} text={r.text} />
                          </li>
                        ))}
                      </ul>
                    </section>
                  )}

                  <CheckAnother profile={profile} adjust={decision.adjust} currency={currency} />

                  <DecisionPanel
                    profile={profile}
                    decision={decision}
                    stages={ledgerStages(stages, decision, candidateIds)}
                    ruledOut={result.ruledOut}
                    leftOutShown={leftOut.length}
                    understanding={understanding}
                  />
                </Reveal>
              </>
            )}
          </>
        )}
      </div>
    </main>
  );
}

/** "{title}: {why}" with the title set slightly stronger, so the list can be scanned. */
function LeftOutLine({ id, text }: { id: string; text: string }) {
  const title = courseById(id)?.title;
  if (!title || !text.startsWith(`${title}:`)) return <>{text}</>;
  return (
    <>
      <span className="text-foreground/85 font-medium">{title}</span>
      {text.slice(title.length)}
    </>
  );
}

function PickSkeleton({ line }: { line: string }) {
  return (
    <Card padded={false} className="mt-6 p-5 sm:p-8" aria-busy="true">
      <EngineLine>
        {line}
        <BlinkCaret />
      </EngineLine>
      <div className="mt-6 flex gap-1.5">
        <SkeletonLine className="w-16 h-5" />
        <SkeletonLine className="w-20 h-5" />
      </div>
      <SkeletonLine className="mt-5 h-6 w-4/5" />
      <SkeletonLine className="mt-3 w-1/3" />
      <div className="mt-6 flex flex-wrap gap-1.5">
        <SkeletonLine className="w-44 h-6" />
        <SkeletonLine className="w-24 h-6" />
        <SkeletonLine className="w-36 h-6" />
      </div>
      <div className="mt-8 flex flex-col gap-2.5">
        <SkeletonLine className="w-full" />
        <SkeletonLine className="w-11/12" />
        <SkeletonLine className="w-2/3" />
      </div>
      <div className="mt-6 h-32 rounded-xl bg-card-alt/70 animate-pulse" />
    </Card>
  );
}

function RelaxButton({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group w-full min-h-12 rounded-xl border border-border bg-card px-4 py-3 text-left text-[14px] text-foreground hover:border-foreground/30 flex items-center justify-between gap-3"
    >
      <span>{text}</span>
      <ArrowRight aria-hidden className="w-4 h-4 text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-foreground" />
    </button>
  );
}

function EmptyState({
  profile,
  adjust,
  exclude,
  currency,
  onRelax,
  onCertificateOff,
  chips,
}: {
  profile: ProfileV2;
  adjust: Adjust;
  exclude: string[];
  currency: "INR" | "USD";
  onRelax: (r: Relaxation) => void;
  /** turns "With a certificate" off (a chip change, no network) */
  onCertificateOff: () => void;
  chips: React.ReactNode;
}) {
  const result = fit(profile, adjust, { currency, exclude });
  const relax = relaxations(profile, adjust, { currency, exclude });
  // when the certificate is what rules everything out, offer that change too
  const withoutCert = adjust.certificate
    ? fit(profile, { ...adjust, certificate: false }, { currency, exclude }).funnel.finishable
    : 0;
  const changes = relax.length + (withoutCert > 0 ? 1 : 0);
  const closest = closestRuledOut(result);
  const closestCourse = closest ? courseById(closest.id) : undefined;
  const adjustedNames = adjustedChipNames(profile, adjust);
  const adjusted = adjustedNames !== "" || exclude.length > 0;
  // "With a certificate" they asked for in their own words is part of the answers, not a change
  const certFromSituation = adjust.certificate && !adjustedNames.includes("With a certificate");
  return (
    <Reveal className="mt-6 flex flex-col gap-10">
      <Card padded={false} className="p-5 sm:p-8">
        <p className="text-[17px] sm:text-[19px] leading-snug font-medium text-foreground max-w-[46ch]">
          Nothing in {MOVES[profile.move].label} fits {hoursAWeek(profile.hoursPerWeek)} on{" "}
          {budgetPhrase(profile.budget, currency)}
          {certFromSituation ? ", with a certificate" : ""}
          {adjusted ? " with your changes" : ""}.{changes > 0 ? " Change one answer:" : ""}
        </p>
        {changes > 0 && (
          <div className="mt-5 flex flex-col gap-2">
            {relax.map((r) => (
              <RelaxButton key={r.kind} text={r.text} onClick={() => onRelax(r)} />
            ))}
            {withoutCert > 0 && (
              <RelaxButton
                text={`Without a certificate, ${withoutCert} ${withoutCert === 1 ? "course fits" : "courses fit"}.`}
                onClick={onCertificateOff}
              />
            )}
          </div>
        )}
        {closest && (
          <div className="mt-6 pt-5 border-t border-border-soft text-[13.5px] leading-relaxed text-muted">
            <p>Closest: {closest.text}</p>
            {closestCourse?.freeStart && (
              <p className="mt-1.5">
                You can still try its free start:{" "}
                <a
                  href={closestCourse.freeStart.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground/40"
                >
                  {closestCourse.freeStart.label}
                </a>
                .
              </p>
            )}
          </div>
        )}
        <div className="mt-6">
          <TextLink href="/assess?edit=1">Edit answers</TextLink>
        </div>
      </Card>
      {chips}
    </Reveal>
  );
}
