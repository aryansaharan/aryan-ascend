"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, ExternalLink, Loader2 } from "lucide-react";
import { useProfile } from "@/lib/store";
import { type Profile, type Recommendation } from "@/lib/recommend";
import { getRecommendations } from "@/lib/recommend-client";
import { COURSES } from "@/lib/courses";
import { SaveSessionStub } from "@/components/SaveSessionStub";

const easeOut = [0.16, 1, 0.3, 1] as const;

const ANALYSIS_TERMS = ["Track fit", "Time match", "Goal alignment"];

function fitLabel(score: number): string {
  if (score >= 80) return "Strong fit";
  if (score >= 50) return "Good fit";
  return "Stretch";
}

export default function Recommendations() {
  const router = useRouter();
  const [profile, , profileReady] = useProfile();
  const [recs, setRecs] = useState<Recommendation[] | null>(null);
  const [engine, setEngine] = useState<"ai" | "deterministic" | null>(null);
  const [loading, setLoading] = useState(true);
  const [termIndex, setTermIndex] = useState(0);

  useEffect(() => {
    if (!profileReady) return;
    const required: (keyof Profile)[] = [
      "currentRole",
      "experience",
      "goal",
      "level",
      "timePerWeek",
      "interests",
    ];
    const ready = required.every((k) => {
      const v = profile[k];
      return v !== undefined && (Array.isArray(v) ? v.length > 0 : true);
    });
    if (!ready) {
      router.replace("/assess");
      return;
    }
    let active = true;
    getRecommendations(profile as Profile).then((r) => {
      if (active) {
        setRecs(r.recommendations);
        setEngine(r.engine);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [profile, profileReady, router]);

  useEffect(() => {
    if (!loading) return;
    const id = window.setInterval(() => {
      setTermIndex((i) => (i + 1) % ANALYSIS_TERMS.length);
    }, 600);
    return () => window.clearInterval(id);
  }, [loading]);

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
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1, ease: easeOut }}
            className="mt-2 text-muted text-sm sm:text-base"
          >
            A short list, chosen against your role, level, time, and goal.
            Each card shows why it fits you.
          </motion.p>
          {!loading && engine && (
            <div className="mt-3 mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
              {engine === "ai"
                ? "// Ranked by AI from your answers"
                : "// Ranked by Ascend's matching engine"}
            </div>
          )}
        </section>

        <section className="mt-8 mb-8">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="py-12"
              >
                <div className="flex items-center gap-2.5 text-foreground text-sm">
                  <Loader2 className="w-4 h-4 animate-spin text-muted" />
                  Analyzing {COURSES.length} courses against your profile
                </div>
                <div className="mt-3 flex items-center gap-2 text-xs text-muted">
                  <span>Checking:</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={ANALYSIS_TERMS[termIndex]}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      transition={{ duration: 0.2 }}
                      className="text-foreground font-medium"
                    >
                      {ANALYSIS_TERMS[termIndex]}
                    </motion.span>
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {!loading && recs && recs.length === 0 && (
              <motion.div
                key="empty"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-card-alt rounded-2xl p-6"
              >
                <p className="text-foreground">
                  Nothing in our catalog felt strong enough to recommend with
                  confidence based on what you told us. That happens. A small
                  tweak to your interests or time usually unlocks a better
                  shortlist.
                </p>
                <button
                  onClick={() => router.push("/assess")}
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:gap-2 transition-all"
                >
                  Adjust answers <ArrowRight className="w-4 h-4" />
                </button>
              </motion.div>
            )}

            {!loading && recs && recs.length > 0 && (
              <motion.div
                key="list"
                initial="hidden"
                animate="visible"
                variants={{
                  visible: { transition: { staggerChildren: 0.08 } },
                }}
                className="flex flex-col gap-3"
              >
                {recs.map((r) => (
                  <RecCard key={r.course.id} rec={r} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </section>

        {!loading && recs && recs.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4, ease: easeOut }}
            className="mt-auto pb-8"
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

function RecCard({ rec }: { rec: Recommendation }) {
  const fit = fitLabel(rec.score);
  const durationLabel =
    rec.course.durationHours > 0
      ? `${rec.course.durationHours}h`
      : "Ongoing";

  return (
    <motion.article
      variants={{
        hidden: { opacity: 0, y: 14 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: easeOut } },
      }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className="bg-card border border-border rounded-2xl p-5 sm:p-6 hover:border-border-soft transition-colors"
    >
      {/* Top row: category + fit indicator */}
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex items-center bg-card-alt text-foreground text-[11px] font-medium px-2.5 py-1 rounded-full">
          {rec.category}
        </span>
        <span className="text-[11px] uppercase tracking-[0.14em] text-muted">
          {fit}
        </span>
      </div>

      {/* Title + meta line */}
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

      {/* Why this fits you: advisor voice */}
      <blockquote className="mt-4 border-l-2 border-foreground/30 pl-3.5 italic text-foreground/85 text-[14px] leading-relaxed">
        {rec.whyThisFitsYou}
      </blockquote>

      {/* Scoring signals: the inputs that actually moved this pick */}
      {rec.fitNotes.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-1.5" aria-label="What this was scored on">
          {rec.fitNotes.map((n) => (
            <li
              key={n.label}
              title={n.text}
              className="mono-label text-[9px] uppercase tracking-[0.16em] text-muted-2 bg-card-alt rounded-full px-2.5 py-1 cursor-default"
            >
              {n.label}
            </li>
          ))}
        </ul>
      )}

      {/* Two fact rows */}
      <dl className="mt-4 flex flex-col gap-2 text-[13px] leading-relaxed">
        <div className="flex gap-2">
          <dt className="text-muted font-medium min-w-[110px] flex-shrink-0">
            Career impact:
          </dt>
          <dd className="text-foreground/85">{rec.careerImpact}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="text-muted font-medium min-w-[110px] flex-shrink-0">
            Prerequisites:
          </dt>
          <dd className="text-foreground/85">{rec.prerequisites}</dd>
        </div>
      </dl>

      {/* Time at your pace + Open course */}
      <div className="mt-5 flex items-center justify-between gap-3 pt-3 border-t border-border-soft">
        <div className="text-xs text-muted">
          About {rec.weeksToFinish} {rec.weeksToFinish === 1 ? "week" : "weeks"} at {rec.weeklyHours} hrs/week
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
