"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ExternalLink,
  Loader2,
  Send,
  Sparkles,
} from "lucide-react";
import { experimental_useObject as useObject, useCompletion } from "@ai-sdk/react";
import { useProfile } from "@/lib/store";
import { recommend, type Profile, type Recommendation } from "@/lib/recommend";
import { picksSchema } from "@/lib/recommend-schema";
import { enrichPicks } from "@/lib/enrich";
import { cacheRecommendations } from "@/lib/recommend-client";
import { SaveSessionStub } from "@/components/SaveSessionStub";

const easeOut = [0.16, 1, 0.3, 1] as const;

function fitLabel(score: number): string {
  if (score >= 80) return "Strong fit";
  if (score >= 50) return "Good fit";
  return "Stretch";
}

const REQUIRED: (keyof Profile)[] = [
  "currentRole",
  "experience",
  "goal",
  "level",
  "timePerWeek",
  "interests",
];

export default function Recommendations() {
  const router = useRouter();
  const [profile, , profileReady] = useProfile();

  const submittedRef = useRef(false);
  const fallbackRef = useRef(false);
  const engineRef = useRef<"ai" | "deterministic">("ai");
  const profileRef = useRef(profile);
  const [engine, setEngine] = useState<"ai" | "deterministic">("ai");
  const [fallback, setFallback] = useState<Recommendation[] | null>(null);
  const [recovering, setRecovering] = useState(false);

  // Keep the latest profile in a ref so the hook callbacks never read a stale
  // value, without mutating a ref during render.
  useEffect(() => {
    profileRef.current = profile;
  });

  // Falls back to the local deterministic scorer. Used both when the request
  // errors (onError) and when the live stream finishes without usable picks.
  // A mid-stream provider error is swallowed by the SDK as an HTTP 200 with a
  // truncated body, so onFinish (not onError) is usually where we catch it.
  // Uses refs so it stays correct regardless of which render captured the hook
  // callbacks.
  const recoverDeterministic = () => {
    if (fallbackRef.current) return;
    fallbackRef.current = true;
    setRecovering(true);
    const p = profileRef.current as Profile;
    recommend(p)
      .then((recs) => {
        engineRef.current = "deterministic";
        setEngine("deterministic");
        setFallback(recs);
        cacheRecommendations(p, {
          recommendations: recs,
          engine: "deterministic",
          readBack: "",
        });
      })
      .finally(() => setRecovering(false));
  };

  const { object, submit, isLoading, error } = useObject({
    api: "/api/recommend",
    schema: picksSchema,
    // Capture which engine answered (from the response header) without showing
    // the model's name, and without a second request.
    fetch: async (input, init) => {
      const res = await fetch(input as RequestInfo, init);
      const eng =
        res.headers.get("x-ascend-engine") === "deterministic"
          ? "deterministic"
          : "ai";
      engineRef.current = eng;
      setEngine(eng);
      return res;
    },
    onError: () => recoverDeterministic(),
    onFinish: ({ object: final }) => {
      if (fallbackRef.current) return;
      const p = profileRef.current as Profile;
      // If the finished object has no usable picks (strict validation failed, or
      // a provider error truncated the stream into an HTTP 200), recover to the
      // deterministic scorer so the page never dead-ends.
      const recs = enrichPicks(final?.picks, p);
      if (recs.length === 0) {
        recoverDeterministic();
        return;
      }
      cacheRecommendations(p, {
        recommendations: recs,
        engine: engineRef.current,
        readBack: final?.readBack ?? "",
      });
    },
  });

  useEffect(() => {
    if (!profileReady) return;
    const ready = REQUIRED.every((k) => {
      const v = profile[k];
      return v !== undefined && (Array.isArray(v) ? v.length > 0 : true);
    });
    if (!ready) {
      router.replace("/assess");
      return;
    }
    if (!submittedRef.current) {
      submittedRef.current = true;
      submit({ profile });
    }
  }, [profile, profileReady, router, submit]);

  const readBack = object?.readBack ?? "";
  const liveRecs = useMemo(
    () => fallback ?? enrichPicks(object?.picks, profile as Profile),
    [fallback, object, profile],
  );

  const done = !isLoading || fallback !== null;
  const showEmpty =
    done &&
    !recovering &&
    liveRecs.length === 0 &&
    (!!object || !!error || !!fallback);

  return (
    <main className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-4xl mx-auto flex flex-col min-h-screen px-6 sm:px-10 lg:px-16">
        <header className="py-5 flex items-center justify-between">
          <button
            onClick={() => router.push("/assess")}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Adjust answers
          </button>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Your picks
          </div>
        </header>

        <section className="mt-6">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="text-[1.75rem] sm:text-3xl leading-[1.15] tracking-[-0.01em] font-semibold text-foreground"
          >
            Your personalized recommendations
          </motion.h1>

          {/* Read-back: the advisor reflecting the user's own words back. This is
              the live, per-person line that proves the answers were read. */}
          <div className="mt-4 min-h-[1.5rem]">
            {readBack ? (
              <motion.p
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-foreground text-[15px] sm:text-base leading-relaxed border-l-2 border-foreground/40 pl-3.5"
              >
                {readBack}
                {isLoading && <BlinkCaret />}
              </motion.p>
            ) : isLoading ? (
              <div className="flex items-center gap-2.5 text-muted text-sm">
                <Loader2 className="w-4 h-4 animate-spin" />
                Reading your answers and lining up your matches
              </div>
            ) : null}
          </div>

          {done && liveRecs.length > 0 && (
            <div className="mt-3 mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
              {engine === "ai"
                ? "// Ranked by AI from your answers"
                : "// Ranked by Ascend's matching engine"}
            </div>
          )}
        </section>

        <section className="mt-7 mb-8">
          <AnimatePresence mode="popLayout">
            {liveRecs.map((r, i) => (
              <div key={r.course.id} className={i > 0 ? "mt-3" : ""}>
                <RecCard rec={r} streaming={isLoading} />
              </div>
            ))}
          </AnimatePresence>

          {/* Placeholder while the first card is still forming, or while the
              deterministic fallback is being computed. */}
          {liveRecs.length === 0 &&
            ((isLoading && readBack) || recovering) && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Choosing your matches
              </div>
            )}

          {showEmpty && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-card-alt rounded-2xl p-6"
            >
              <p className="text-foreground">
                Nothing matched strongly enough to recommend with confidence
                based on what you told us. That happens. A small tweak to your
                interests or time usually unlocks a better shortlist.
              </p>
              <button
                onClick={() => router.push("/assess")}
                className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:gap-2 transition-all"
              >
                Adjust answers <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}
        </section>

        {/* Ask-back advisor: a real second turn, grounded in these exact picks. */}
        {done && liveRecs.length > 0 && (
          <Advisor profile={profile as Profile} recs={liveRecs} />
        )}

        {done && liveRecs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="mt-10 pb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <Link
                href="/assess"
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                Refine your picks
              </Link>
              <SaveSessionStub />
            </div>
            <Link
              href="/compare"
              className="w-full inline-flex items-center justify-center gap-2 bg-foreground text-accent-fg rounded-2xl py-3.5 font-medium text-[15px]"
            >
              Compare top picks
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        )}
      </div>
    </main>
  );
}

function BlinkCaret() {
  return (
    <motion.span
      aria-hidden
      animate={{ opacity: [1, 0.15, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
      className="inline-block w-[2px] h-[1em] translate-y-[2px] ml-0.5 bg-foreground/70"
    />
  );
}

function RecCard({
  rec,
  streaming,
}: {
  rec: Recommendation;
  streaming: boolean;
}) {
  const fit = fitLabel(rec.score);
  const durationLabel =
    rec.course.durationHours > 0 ? `${rec.course.durationHours}h` : "Ongoing";

  return (
    <motion.article
      layout
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: easeOut }}
      className="bg-card border border-border rounded-2xl p-5 sm:p-6 hover:border-border-soft transition-colors"
    >
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center bg-card-alt text-foreground text-[11px] font-medium px-2.5 py-1 rounded-full">
          {rec.category}
        </span>
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted">
          {rec.score > 0 ? fit : ""}
        </span>
      </div>

      <div className="mt-3">
        <h3 className="text-[18px] sm:text-xl leading-snug font-semibold text-foreground">
          {rec.course.title}
        </h3>
        <div className="mt-1.5 text-xs text-muted-2">
          {rec.course.provider}
          <span className="mx-1.5 text-border">·</span>
          {durationLabel}
          <span className="mx-1.5 text-border">·</span>
          <span className="capitalize">{rec.course.level}</span>
        </div>
      </div>

      {rec.whyThisFitsYou ? (
        <blockquote className="mt-4 border-l-2 border-foreground/30 pl-3.5 italic text-foreground/85 text-[14px] leading-relaxed">
          {rec.whyThisFitsYou}
          {streaming && <BlinkCaret />}
        </blockquote>
      ) : (
        streaming && (
          <div className="mt-4 flex items-center gap-2 text-xs text-muted-2 pl-3.5">
            <Loader2 className="w-3 h-3 animate-spin" />
            writing your fit
          </div>
        )
      )}

      {rec.fitNotes.length > 0 && (
        <ul
          className="mt-4 flex flex-wrap gap-1.5"
          aria-label="What this was scored on"
        >
          {rec.fitNotes.map((n) => (
            <li
              key={n.label}
              title={n.text}
              className="mono-label text-[9px] uppercase tracking-[0.16em] text-muted-2 bg-card-alt rounded-full px-2.5 py-1 cursor-default"
            >
              {n.label}
              <span className="sr-only">: {n.text}</span>
            </li>
          ))}
        </ul>
      )}

      {(rec.careerImpact || rec.prerequisites) && (
        <dl className="mt-4 flex flex-col gap-2 text-[13px] leading-relaxed">
          {rec.careerImpact && (
            <div className="flex gap-2">
              <dt className="text-muted font-medium min-w-[110px] flex-shrink-0">
                Career impact:
              </dt>
              <dd className="text-foreground/85">{rec.careerImpact}</dd>
            </div>
          )}
          {rec.prerequisites && (
            <div className="flex gap-2">
              <dt className="text-muted font-medium min-w-[110px] flex-shrink-0">
                Prerequisites:
              </dt>
              <dd className="text-foreground/85">{rec.prerequisites}</dd>
            </div>
          )}
        </dl>
      )}

      <div className="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-border-soft">
        <div className="text-xs text-muted">
          About {rec.weeksToFinish} {rec.weeksToFinish === 1 ? "week" : "weeks"} at{" "}
          {rec.weeklyHours} hrs/week
        </div>
        <a
          href={rec.course.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-xs font-medium text-foreground hover:gap-1.5 transition-all"
        >
          Open course <ExternalLink className="w-3 h-3" />
        </a>
      </div>
    </motion.article>
  );
}

function Advisor({
  profile,
  recs,
}: {
  profile: Profile;
  recs: Recommendation[];
}) {
  const shortlist = useMemo(
    () => recs.map((r) => ({ id: r.course.id, title: r.course.title })),
    [recs],
  );
  const { completion, complete, isLoading, input, setInput, error } =
    useCompletion({
      api: "/api/advise",
      streamProtocol: "text",
    });
  const [asked, setAsked] = useState<string | null>(null);

  function ask(question: string) {
    const q = question.trim();
    if (!q || isLoading) return;
    setAsked(q);
    setInput("");
    complete(q, { body: { profile, shortlist } }).catch(() => {});
  }

  const suggestions = [
    "Is this realistic for my schedule?",
    "Which one should I start first, and why?",
    "What did you almost recommend but didn't?",
  ];

  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="mb-2 rounded-2xl border border-border bg-card-alt/60 p-5 sm:p-6"
    >
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-foreground" />
        <h2 className="text-[15px] font-semibold text-foreground">
          Push back on these picks
        </h2>
      </div>
      <p className="mt-1 text-[13px] text-muted leading-relaxed">
        Ask why something is or isn&apos;t here. The advisor answers against your
        profile and these exact courses.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => ask(s)}
            disabled={isLoading}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-[12px] text-foreground hover:border-foreground/30 disabled:opacity-50 transition-colors"
          >
            {s}
          </button>
        ))}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="mt-3 flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="e.g. Why not something more advanced?"
          className="flex-1 bg-card rounded-xl px-3.5 py-2.5 text-[14px] text-foreground placeholder:text-muted-2 outline-none border border-border focus:border-foreground transition-colors"
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          aria-label="Ask"
          className="inline-flex items-center justify-center rounded-xl bg-foreground text-accent-fg w-10 h-10 disabled:opacity-30 transition-opacity flex-shrink-0"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </button>
      </form>

      <AnimatePresence>
        {(asked || completion) && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-4 rounded-xl bg-card border border-border p-4"
          >
            {asked && (
              <div className="text-[12px] text-muted-2 mb-1.5">
                You asked: <span className="text-muted">{asked}</span>
              </div>
            )}
            <p className="text-[14px] text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {completion}
              {isLoading && !completion && (
                <span className="inline-flex items-center gap-2 text-muted">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" /> thinking
                </span>
              )}
              {isLoading && completion && <BlinkCaret />}
              {!isLoading && asked && !completion && (
                <span className="text-muted">
                  {error
                    ? "Couldn't answer that just now. Try again."
                    : "No answer came back. Try rephrasing it."}
                </span>
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
