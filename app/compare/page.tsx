"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Check, ExternalLink, Loader2, Star } from "lucide-react";
import { useProfile } from "@/lib/store";
import {
  recommend,
  syntheticReviews,
  type Profile,
  type Recommendation,
} from "@/lib/recommend";
import { SaveSessionStub } from "@/components/SaveSessionStub";

const easeOut = [0.16, 1, 0.3, 1] as const;

const COMPARE_TERMS = ["Side by side", "Hours per week", "Peer outcomes"];

type ReviewWithCourse = ReturnType<typeof syntheticReviews>[number] & {
  courseId: string;
  courseTitle: string;
};

export default function Compare() {
  const router = useRouter();
  const [profile, , profileReady] = useProfile();
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [chosen, setChosen] = useState<string | null>(null);
  const [termIndex, setTermIndex] = useState(0);

  useEffect(() => {
    if (!profileReady) return;
    if (!profile.currentRole) {
      router.replace("/assess");
      return;
    }
    let active = true;
    recommend(profile as Profile).then((r) => {
      if (active) setRecs(r);
    });
    return () => {
      active = false;
    };
  }, [profile, profileReady, router]);

  useEffect(() => {
    if (recs) return;
    const id = window.setInterval(() => {
      setTermIndex((i) => (i + 1) % COMPARE_TERMS.length);
    }, 600);
    return () => window.clearInterval(id);
  }, [recs]);

  const top = useMemo(() => (recs ? recs.slice(0, 3) : []), [recs]);

  // Build the peer-review pool from the top 3 picks, dedupe by quote text,
  // and cap at 6 reviews for the dedicated section below the cards.
  const peerReviews = useMemo<ReviewWithCourse[]>(() => {
    if (top.length === 0) return [];
    const collected: ReviewWithCourse[] = [];
    const seen = new Set<string>();
    top.forEach((rec) => {
      for (const rev of syntheticReviews(rec.course)) {
        if (seen.has(rev.text)) continue;
        seen.add(rev.text);
        collected.push({
          ...rev,
          courseId: rec.course.id,
          courseTitle: rec.course.title,
        });
      }
    });
    // Deterministic interleave: pull one review per course in rotation so
    // the section reads as a mix, not three quotes from the same source.
    const byCourse = new Map<string, ReviewWithCourse[]>();
    for (const r of collected) {
      const list = byCourse.get(r.courseId) ?? [];
      list.push(r);
      byCourse.set(r.courseId, list);
    }
    const interleaved: ReviewWithCourse[] = [];
    let added = true;
    while (added && interleaved.length < 6) {
      added = false;
      for (const list of byCourse.values()) {
        const next = list.shift();
        if (next) {
          interleaved.push(next);
          added = true;
          if (interleaved.length === 6) break;
        }
      }
    }
    return interleaved.slice(0, 6);
  }, [top]);

  if (!recs)
    return (
      <main className="min-h-screen bg-background flex flex-col items-center">
        <div className="w-full max-w-6xl mx-auto flex flex-col min-h-screen px-6 sm:px-10 lg:px-16">
          <header className="py-5 flex items-center justify-between">
            <button
              onClick={() => router.push("/recommendations")}
              className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to picks
            </button>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
              Side-by-side
            </div>
          </header>
          <section className="py-12">
            <div className="flex items-center gap-2.5 text-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-muted" />
              Lining up your top 3 picks
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs text-muted">
              <span>Checking:</span>
              <AnimatePresence mode="wait">
                <motion.span
                  key={COMPARE_TERMS[termIndex]}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                  className="text-foreground font-medium"
                >
                  {COMPARE_TERMS[termIndex]}
                </motion.span>
              </AnimatePresence>
            </div>
          </section>
        </div>
      </main>
    );

  const chosenRec = top.find((t) => t.course.id === chosen);

  return (
    <main className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-6xl mx-auto flex flex-col min-h-screen px-6 sm:px-10 lg:px-16">
        <header className="py-5 flex items-center justify-between">
          <button
            onClick={() => router.push("/recommendations")}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to picks
          </button>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Side-by-side
          </div>
        </header>

        <section className="mt-6">
          <motion.h1
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="text-[1.75rem] sm:text-3xl leading-[1.15] tracking-[-0.01em] font-semibold text-foreground"
          >
            Compare top recommendations
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
            className="mt-2 text-muted text-sm sm:text-base"
          >
            Three serious options, lined up. Pick the one that fits your week
            and your goal.
          </motion.p>
        </section>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {top.map((rec, idx) => {
            const selected = chosen === rec.course.id;
            const durationLabel =
              rec.course.durationHours > 0
                ? `${rec.course.durationHours}h`
                : "ongoing";
            return (
              <motion.article
                key={rec.course.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -2 }}
                transition={{
                  duration: 0.5,
                  delay: 0.05 + idx * 0.08,
                  ease: easeOut,
                }}
                className={`rounded-2xl p-5 flex flex-col gap-4 transition-colors ${
                  selected
                    ? "border-2 border-foreground bg-card-alt"
                    : "border border-border bg-card hover:border-border-soft"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center rounded-full bg-card-alt border border-border-soft px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted">
                    {rec.category}
                  </span>
                  <div className="text-xs font-medium text-foreground">
                    Fit {Math.min(99, Math.round(rec.score))}
                  </div>
                </div>

                <div>
                  <h3 className="text-[15px] font-semibold text-foreground leading-snug">
                    {rec.course.title}
                  </h3>
                  <div className="mt-1 text-[11px] text-muted">
                    {rec.course.provider} · {durationLabel} · {rec.course.level}
                  </div>
                </div>

                <blockquote className="border-l-2 border-border pl-3 text-[13px] italic text-foreground/80 leading-relaxed">
                  {rec.whyThisFitsYou}
                </blockquote>

                {rec.fitNotes.length > 0 && (
                  <ul
                    className="flex flex-wrap gap-1"
                    aria-label="What this was scored on"
                  >
                    {rec.fitNotes.map((n) => (
                      <li
                        key={n.label}
                        title={n.text}
                        className="mono-label text-[9px] uppercase tracking-[0.14em] text-muted-2 bg-card-alt rounded-full px-2 py-0.5 cursor-default"
                      >
                        {n.label}
                      </li>
                    ))}
                  </ul>
                )}

                <dl className="flex flex-col gap-2.5 text-[12px] leading-relaxed">
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-2">
                      Career impact
                    </dt>
                    <dd className="mt-0.5 text-foreground/85">
                      {rec.careerImpact}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-2">
                      Prerequisites
                    </dt>
                    <dd className="mt-0.5 text-foreground/85">
                      {rec.prerequisites}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-[10px] uppercase tracking-[0.14em] text-muted-2">
                      At your pace
                    </dt>
                    <dd className="mt-0.5 text-foreground/85">
                      {rec.weeksToFinish} {rec.weeksToFinish === 1 ? "week" : "weeks"} at {rec.weeklyHours} hrs/week
                    </dd>
                  </div>
                </dl>

                <button
                  onClick={() =>
                    setChosen(selected ? null : rec.course.id)
                  }
                  className={`mt-auto inline-flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-all ${
                    selected
                      ? "bg-foreground text-accent-fg"
                      : "bg-card-alt text-foreground hover:bg-border-soft"
                  }`}
                  aria-pressed={selected}
                >
                  {selected ? (
                    <>
                      <Check className="w-4 h-4" /> Picked
                    </>
                  ) : (
                    "Pick this one"
                  )}
                </button>
              </motion.article>
            );
          })}
        </div>

        <section className="mt-14">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="text-xl sm:text-2xl font-semibold text-foreground tracking-[-0.01em]"
          >
            What other learners said
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.5, delay: 0.05, ease: easeOut }}
            className="mt-1.5 text-muted text-sm"
          >
            Snippets pulled from across your three picks. Look for outcomes
            close to yours.
          </motion.p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
            {peerReviews.map((rev, i) => (
              <motion.div
                key={`${rev.courseId}-${i}`}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{
                  duration: 0.45,
                  delay: i * 0.06,
                  ease: easeOut,
                }}
                className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3"
              >
                <StarRow rating={rev.rating} />
                <p className="text-[14px] text-foreground/90 leading-relaxed">
                  &ldquo;{rev.text}&rdquo;
                </p>
                <div className="mt-auto pt-2 border-t border-border-soft flex flex-col gap-1">
                  <div className="text-[12px] leading-snug">
                    <span className="font-medium text-foreground">
                      {rev.author}
                    </span>
                    <span className="text-muted">, {rev.role}</span>
                    {rev.outcome && (
                      <span className="text-muted-2"> · {rev.outcome}</span>
                    )}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-muted-2">
                    About: {rev.courseTitle}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <p className="mt-5 text-[11px] italic text-muted-2">
            Synthetic peer reviews, sample data for the prototype. Real version
            uses verified learner cohorts.
          </p>
        </section>

        {chosenRec && (
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="mt-12 flex flex-col items-center gap-3"
          >
            <a
              href={chosenRec.course.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-2 bg-foreground text-accent-fg rounded-2xl px-7 py-3.5 font-medium text-[15px] hover:gap-3 transition-all"
            >
              Open chosen course
              <ExternalLink className="w-4 h-4" />
            </a>
            <div className="text-xs text-muted italic">
              Decision made. Take the first step in the next 48 hours.
            </div>
          </motion.div>
        )}

        <div className="mt-auto pt-10 pb-8 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="text-xs text-muted hover:text-foreground transition-colors"
          >
            ← Run a fresh session
          </Link>
          <SaveSessionStub tooltipPosition="bottom" />
        </div>
      </div>
    </main>
  );
}

function StarRow({ rating }: { rating: number }) {
  const clamped = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`Rated ${clamped} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const filled = i < clamped;
        return (
          <Star
            key={i}
            className={`w-3.5 h-3.5 ${
              filled ? "text-foreground" : "text-muted-2"
            }`}
            strokeWidth={1.5}
            fill={filled ? "currentColor" : "none"}
          />
        );
      })}
    </div>
  );
}
