"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useProfile } from "@/lib/store";
import type { Profile } from "@/lib/recommend";

type Step = {
  id: keyof Profile;
  question: string;
  helper?: string;
  why: string;
  category: string;
  type: "single" | "multi" | "text";
  options?: { value: string; label: string; hint?: string }[];
};

const STEPS: Step[] = [
  {
    id: "currentRole",
    question: "Where are you right now?",
    helper: "One line is plenty. Title, stack, whatever feels true.",
    why: "We use this to calibrate everything that follows. No judgment, just context.",
    category: "Context",
    type: "text",
  },
  {
    id: "experience",
    question: "How long have you been doing this kind of work?",
    helper: "Pick the bucket that's closest. We're not auditing your CV.",
    why: "Experience shapes what advice will actually be useful, versus condescending.",
    category: "Background",
    type: "single",
    options: [
      { value: "0-1", label: "Less than a year" },
      { value: "1-3", label: "1 to 3 years" },
      { value: "3-5", label: "3 to 5 years" },
      { value: "5+", label: "5+ years" },
    ],
  },
  {
    id: "goal",
    question: "What are you actually trying to do?",
    helper: "Be honest. Pick the one that's loudest in your head this month.",
    why: "Your goal is the single biggest filter we apply. Picking the right one matters more than picking the perfect one.",
    category: "Direction",
    type: "single",
    options: [
      { value: "promotion", label: "Get promoted", hint: "Senior, lead, the next title" },
      { value: "switch-field", label: "Switch fields", hint: "New domain, new role" },
      { value: "salary", label: "Earn more", hint: "Compounding skills, market signal" },
      { value: "deeper-craft", label: "Go deeper on craft", hint: "Sharpen the work itself" },
      { value: "leadership", label: "Move into leadership", hint: "Manager, EM, founder" },
    ],
  },
  {
    id: "level",
    question: "How well do you know the area you want to grow in?",
    helper: "Self-rated, gut feel. You can always adjust later.",
    why: "This sets the depth of what we recommend, so you don't get sent back to lesson one when you're ready for chapter five.",
    category: "Self-assessment",
    type: "single",
    options: [
      { value: "beginner", label: "Beginner", hint: "Curious, fresh" },
      { value: "intermediate", label: "Intermediate", hint: "Used it, room to grow" },
      { value: "advanced", label: "Advanced", hint: "Deep enough to teach it" },
    ],
  },
  {
    id: "timePerWeek",
    question: "Realistically, how much time will this get every week?",
    helper: "Pick what survives a bad work week, not your best one.",
    why: "We size recommendations to your real schedule. Plans that ignore your life don't get finished.",
    category: "Capacity",
    type: "single",
    options: [
      { value: "<2", label: "Less than 2 hrs/week" },
      { value: "2-5", label: "2 to 5 hrs/week" },
      { value: "5-10", label: "5 to 10 hrs/week" },
      { value: "10+", label: "10+ hrs/week" },
    ],
  },
  {
    id: "interests",
    question: "Which tracks are pulling you?",
    helper: "Up to 3. If everything sounds interesting, pick the ones you'd actually open on a Sunday.",
    why: "We narrow from here. Fewer choices usually means a sharper recommendation.",
    category: "Interests",
    type: "multi",
    options: [
      { value: "frontend", label: "Frontend" },
      { value: "backend", label: "Backend" },
      { value: "fullstack", label: "Fullstack" },
      { value: "devops", label: "DevOps / Cloud" },
      { value: "data-analyst", label: "Data analyst" },
      { value: "data-scientist", label: "Data scientist" },
      { value: "ai-engineer", label: "AI engineer" },
      { value: "ml-engineer", label: "ML engineer" },
      { value: "pm", label: "Product management" },
      { value: "designer", label: "Design / UX" },
      { value: "em", label: "Engineering management" },
      { value: "staff-engineer", label: "Staff / IC leadership" },
      { value: "marketing", label: "Marketing" },
      { value: "growth", label: "Growth" },
      { value: "sales", label: "Sales" },
      { value: "customer-success", label: "Customer success" },
    ],
  },
];

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function Assess() {
  const router = useRouter();
  const [profile, setProfile] = useProfile();
  const [stepIdx, setStepIdx] = useState(0);

  const step = STEPS[stepIdx];
  const value = profile[step.id];

  function next() {
    if (stepIdx < STEPS.length - 1) setStepIdx((s) => s + 1);
    else router.push("/recommendations");
  }
  function back() {
    if (stepIdx > 0) setStepIdx((s) => s - 1);
    else router.push("/");
  }

  function canAdvance(): boolean {
    const v = profile[step.id];
    if (step.type === "text") return typeof v === "string" && v.trim().length > 0;
    if (step.type === "single") return typeof v === "string" && v.length > 0;
    if (step.type === "multi") return Array.isArray(v) && v.length > 0;
    return false;
  }

  function toggleMulti(opt: string) {
    const current = (profile.interests ?? []) as string[];
    const has = current.includes(opt);
    let next: string[];
    if (has) next = current.filter((c) => c !== opt);
    else if (current.length >= 3) next = [...current.slice(1), opt];
    else next = [...current, opt];
    setProfile({ interests: next });
  }

  return (
    <main className="min-h-screen bg-background flex flex-col items-center">
      <div className="w-full max-w-2xl mx-auto flex flex-col min-h-screen px-6 sm:px-10 lg:px-12">
        {/* Top bar */}
        <header className="py-5 flex items-center justify-between">
          <button
            onClick={back}
            className="flex items-center gap-1.5 text-sm text-muted hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted">
            Step {stepIdx + 1} of {STEPS.length} <span className="text-muted-2">·</span> {step.category}
          </div>
        </header>

        {/* Progress bar */}
        <div className="h-1 bg-card-alt rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-foreground"
            initial={false}
            animate={{ width: `${((stepIdx + 1) / STEPS.length) * 100}%` }}
            transition={{ duration: 0.5, ease: easeOut }}
          />
        </div>

        {/* Question */}
        <section className="flex-1 flex flex-col justify-start mt-10">
          <AnimatePresence mode="wait">
            <motion.div
              key={step.id as string}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.35, ease: easeOut }}
            >
              <h1 className="text-[1.75rem] leading-[1.2] tracking-[-0.01em] font-semibold text-foreground">
                {step.question}
              </h1>
              {step.helper && (
                <p className="mt-2 text-muted text-sm">{step.helper}</p>
              )}
              <p className="mt-3 text-muted-2 text-[12.5px] leading-relaxed">
                {step.why}
              </p>

              <div className="mt-7">
                {step.type === "text" && (
                  <input
                    type="text"
                    value={(value as string) ?? ""}
                    onChange={(e) =>
                      setProfile({ [step.id]: e.target.value } as Partial<Profile>)
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && canAdvance()) next();
                    }}
                    placeholder="e.g. Early-career frontend engineer at a startup"
                    autoFocus
                    className="w-full bg-card-alt rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-2 text-base outline-none border border-transparent focus:border-foreground transition-colors"
                  />
                )}

                {step.type === "single" && (
                  <div className="flex flex-col gap-2">
                    {step.options!.map((o) => {
                      const selected = value === o.value;
                      return (
                        <motion.button
                          key={o.value}
                          onClick={() =>
                            setProfile({ [step.id]: o.value } as Partial<Profile>)
                          }
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.985 }}
                          transition={{ type: "spring", stiffness: 400, damping: 22 }}
                          className={`text-left rounded-2xl px-4 py-3.5 border ${
                            selected
                              ? "border-foreground bg-foreground text-accent-fg shadow-[0_2px_10px_-4px_rgba(0,0,0,0.18)]"
                              : "border-border bg-card hover:border-foreground/30 hover:shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="min-w-0">
                              <div className={`text-[15px] font-medium ${selected ? "" : "text-foreground"}`}>
                                {o.label}
                              </div>
                              {o.hint && (
                                <div className={`text-xs mt-0.5 ${selected ? "text-accent-fg/70" : "text-muted"}`}>
                                  {o.hint}
                                </div>
                              )}
                            </div>
                            <motion.div
                              animate={selected ? { scale: 1 } : { scale: 0.9 }}
                              transition={{ type: "spring", stiffness: 500, damping: 22 }}
                              className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border ${
                                selected
                                  ? "border-accent-fg bg-accent-fg"
                                  : "border-border"
                              }`}
                            >
                              <AnimatePresence>
                                {selected && (
                                  <motion.span
                                    initial={{ scale: 0, rotate: -90 }}
                                    animate={{ scale: 1, rotate: 0 }}
                                    exit={{ scale: 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                                  >
                                    <Check className="w-3 h-3 text-foreground" />
                                  </motion.span>
                                )}
                              </AnimatePresence>
                            </motion.div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                )}

                {step.type === "multi" && (
                  <div className="flex flex-wrap gap-2">
                    {step.options!.map((o) => {
                      const arr = (profile.interests as string[]) ?? [];
                      const selected = arr.includes(o.value);
                      return (
                        <motion.button
                          key={o.value}
                          onClick={() => toggleMulti(o.value)}
                          whileHover={{ y: -1 }}
                          whileTap={{ scale: 0.94 }}
                          transition={{ type: "spring", stiffness: 500, damping: 20 }}
                          className={`rounded-full px-3.5 py-2 text-sm border ${
                            selected
                              ? "bg-foreground text-accent-fg border-foreground"
                              : "bg-card text-foreground border-border hover:border-foreground/30"
                          }`}
                        >
                          {o.label}
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </section>

        {/* Footer CTA */}
        <footer className="py-5 sticky bottom-0 bg-background">
          <button
            onClick={next}
            disabled={!canAdvance()}
            className="w-full inline-flex items-center justify-center gap-2 bg-foreground text-accent-fg rounded-2xl py-3.5 font-medium text-[15px] disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
          >
            {stepIdx === STEPS.length - 1 ? "See my picks" : "Continue"}
            <ArrowRight className="w-4 h-4" />
          </button>
        </footer>
      </div>
    </main>
  );
}
