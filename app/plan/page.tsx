"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  Rocket,
} from "lucide-react";
import { experimental_useObject as useObject } from "@ai-sdk/react";
import { planSchema } from "@/lib/recommend-schema";
import { decodePlan, type PlanPayload } from "@/lib/plan-link";
import { COURSES } from "@/lib/courses";

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function PlanPage() {
  // undefined = still reading the URL; null = invalid/missing link.
  const [payload, setPayload] = useState<PlanPayload | null | undefined>(
    undefined,
  );
  const submittedRef = useRef(false);
  const [copied, setCopied] = useState(false);

  const { object, submit, isLoading, error } = useObject({
    api: "/api/plan",
    schema: planSchema,
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setPayload(decodePlan(params.get("d")));
  }, []);

  const course = payload
    ? COURSES.find((c) => c.id === payload.courseId)
    : undefined;

  useEffect(() => {
    // Only request a plan once we have a resolvable course; a valid-shaped link
    // pointing at an unknown id would otherwise fire a doomed request.
    if (payload && course && !submittedRef.current) {
      submittedRef.current = true;
      submit({ profile: payload.profile, courseId: payload.courseId });
    }
  }, [payload, course, submit]);

  function copyLink() {
    navigator.clipboard?.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen px-6 sm:px-10 lg:px-12">
        <header className="py-5 flex items-center justify-between">
          <Link
            href="/compare"
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to compare
          </Link>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Your plan
          </div>
        </header>

        {(payload === null || (payload && !course)) && (
          <section className="mt-10 bg-card-alt rounded-2xl p-6">
            <p className="text-foreground">
              This plan link looks incomplete. Start a fresh session and pick a
              course to generate a plan.
            </p>
            <Link
              href="/"
              className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:gap-2 transition-all"
            >
              Start over
            </Link>
          </section>
        )}

        {payload && course && (
          <>
            <section className="mt-6">
              <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
                // Learning plan
              </div>
              <motion.h1
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: easeOut }}
                className="mt-2 text-[1.6rem] sm:text-3xl leading-[1.15] tracking-[-0.01em] font-semibold text-foreground"
              >
                {course.title}
              </motion.h1>
              <div className="mt-1.5 text-xs text-muted-2">
                {course.provider}
                <span className="mx-1.5 text-border">·</span>
                {course.durationHours > 0 ? `${course.durationHours}h` : "Ongoing"}
                <span className="mx-1.5 text-border">·</span>
                <span className="capitalize">{course.level}</span>
              </div>

              {object?.opener && (
                <p className="mt-4 text-foreground/90 text-[15px] leading-relaxed border-l-2 border-foreground/40 pl-3.5">
                  {object.opener}
                  {isLoading && <Caret />}
                </p>
              )}

              {!object?.opener && isLoading && (
                <div className="mt-4 flex items-center gap-2.5 text-muted text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Building a plan sized to your week
                </div>
              )}
            </section>

            {/* First step: the 48-hour commitment, front and center. */}
            {object?.firstStep && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-7 rounded-2xl border border-foreground/15 bg-card p-5"
              >
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-muted">
                  <Rocket className="w-3.5 h-3.5" />
                  Do this in the next 48 hours
                </div>
                <p className="mt-2 text-[15px] font-medium text-foreground leading-relaxed">
                  {object.firstStep}
                  {isLoading && <Caret />}
                </p>
              </motion.section>
            )}

            {/* Week-by-week schedule, streaming in. */}
            {Array.isArray(object?.weeks) && object.weeks.length > 0 && (
              <section className="mt-8">
                <h2 className="text-[11px] uppercase tracking-[0.16em] text-muted mb-3">
                  Week by week
                </h2>
                <ol className="flex flex-col gap-3">
                  {object.weeks.map((w, i) =>
                    w ? (
                      <motion.li
                        key={i}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, ease: easeOut }}
                        className="rounded-2xl border border-border bg-card p-5"
                      >
                        <div className="flex items-baseline justify-between gap-3">
                          <div className="text-[15px] font-semibold text-foreground">
                            Week {w.week ?? i + 1}
                            {w.focus ? (
                              <span className="font-normal text-foreground/80">
                                {" "}
                                · {w.focus}
                              </span>
                            ) : null}
                          </div>
                          {typeof w.hours === "number" && (
                            <div className="text-[11px] text-muted-2 whitespace-nowrap">
                              ~{w.hours}h
                            </div>
                          )}
                        </div>
                        {Array.isArray(w.tasks) && w.tasks.length > 0 && (
                          <ul className="mt-3 flex flex-col gap-1.5">
                            {w.tasks.map((t, ti) =>
                              t ? (
                                <li
                                  key={ti}
                                  className="flex items-start gap-2 text-[13.5px] text-foreground/85 leading-relaxed"
                                >
                                  <Check className="w-3.5 h-3.5 mt-1 text-muted flex-shrink-0" />
                                  {t}
                                </li>
                              ) : null,
                            )}
                          </ul>
                        )}
                        {w.milestone && (
                          <div className="mt-3 flex items-start gap-2 text-[12.5px] text-foreground/75">
                            <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 text-success flex-shrink-0" />
                            <span>{w.milestone}</span>
                          </div>
                        )}
                      </motion.li>
                    ) : null,
                  )}
                </ol>
              </section>
            )}

            {object?.finishLine && (
              <motion.section
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-8 rounded-2xl bg-foreground text-accent-fg p-5"
              >
                <div className="text-[11px] uppercase tracking-[0.16em] text-accent-fg/70">
                  When you finish
                </div>
                <p className="mt-1.5 text-[15px] leading-relaxed">
                  {object.finishLine}
                </p>
              </motion.section>
            )}

            {error && (
              <section className="mt-8 bg-card-alt rounded-2xl p-6">
                <p className="text-foreground">
                  The plan stopped early. You can try again, or head straight to
                  the course and start.
                </p>
                <button
                  onClick={() => {
                    if (payload && course && !isLoading) {
                      submittedRef.current = true;
                      submit({
                        profile: payload.profile,
                        courseId: payload.courseId,
                      });
                    }
                  }}
                  disabled={isLoading}
                  className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:gap-2 transition-all disabled:opacity-50"
                >
                  {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Try again
                </button>
              </section>
            )}

            {/* Actions */}
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <a
                href={course.url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-foreground text-accent-fg rounded-2xl py-3.5 font-medium text-[15px] hover:gap-3 transition-all"
              >
                Open the course <ExternalLink className="w-4 h-4" />
              </a>
              <button
                onClick={copyLink}
                aria-label="Copy plan link"
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3.5 px-5 font-medium text-[14px] text-foreground hover:border-foreground/30 transition-colors"
              >
                {copied ? (
                  <span
                    role="status"
                    aria-live="polite"
                    className="inline-flex items-center gap-2"
                  >
                    <Check className="w-4 h-4" /> Link copied
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2">
                    <Link2 className="w-4 h-4" /> Copy plan link
                  </span>
                )}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-muted-2">
              This link holds your whole plan. Bookmark it or send it to yourself
              to come back to it later.
            </p>

            <div className="mt-auto pt-10 pb-8">
              <Link
                href="/"
                className="text-xs text-muted hover:text-foreground transition-colors"
              >
                ← Run a fresh session
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Caret() {
  return (
    <motion.span
      aria-hidden
      animate={{ opacity: [1, 0.15, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
      className="inline-block w-[2px] h-[1em] translate-y-[2px] ml-0.5 bg-foreground/70"
    />
  );
}
