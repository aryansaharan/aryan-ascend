"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { ArrowRight, Sparkles, Star } from "lucide-react";
import { Logo } from "@/components/Logo";

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function Landing() {
  return (
    <main className="relative min-h-screen bg-background overflow-x-clip">
      {/* Soft warm page-level glow */}
      <div className="page-glow" aria-hidden />
      {/* Subtle paper grain across the page */}
      <div className="grain absolute inset-0 pointer-events-none" aria-hidden />

      <div className="relative w-full max-w-5xl mx-auto px-6 sm:px-10 lg:px-16 flex flex-col">
        {/* Top bar:motion.dev-inspired metadata strip */}
        <header className="py-6 sm:py-7 flex items-center justify-between">
          <Logo size="md" />
          <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 flex items-center gap-2">
            <span>// V0.1.0</span>
            <span className="text-border">·</span>
            <span>GUIDED DECISION SUPPORT</span>
          </div>
        </header>

        {/* Pre-hero metadata strip */}
        <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 flex items-center gap-3 pt-6 sm:pt-8">
          <span>// 01 NEW SESSION</span>
          <span className="flex-1 h-px bg-border-soft" />
          <span>EST. READ TIME 15 MIN</span>
        </div>

        {/* Hero:left-aligned to the container. Hero text constrains per-element, not via inner wrapper. */}
        <section className="relative pt-10 sm:pt-16 lg:pt-20 pb-12 sm:pb-16">
          <div className="relative flex flex-col items-start gap-7">
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, ease: easeOut }}
              className="mono-label inline-flex items-center gap-1.5 rounded-full bg-foreground text-accent-fg px-3 py-1 text-[10px] uppercase tracking-[0.22em]"
            >
              <Sparkles className="w-3 h-3" />
              15 minutes
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.05, ease: easeOut }}
              className="text-[2.25rem] sm:text-[3rem] md:text-[3.5rem] lg:text-[4rem] leading-[1.02] tracking-[-0.025em] font-semibold text-foreground max-w-[20ch]"
            >
              Overwhelmed by learning choices?{" "}
              <span className="serif-italic font-normal text-foreground/85">
                Find your next skill in 15 minutes.
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.15, ease: easeOut }}
              className="text-[15px] sm:text-base lg:text-lg leading-relaxed text-muted max-w-[58ch]"
            >
              A guided session that maps your role, goals, and time, then narrows
              hundreds of course options into a shortlist you&apos;ll actually
              finish.{" "}
              <span className="text-foreground font-medium">
                No more decision paralysis.
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25, ease: easeOut }}
              className="flex items-center gap-3 text-[11px] text-muted-2"
            >
              <span className="inline-block w-4 h-px bg-muted-2" />
              <span className="mono-label">
                Built from 25+ user interviews · 67% choice paralysis surfaced
              </span>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.32, ease: easeOut }}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 pt-2"
            >
              <motion.div
                whileHover={{ scale: 1.005 }}
                whileTap={{ scale: 0.985 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="relative"
              >
                <Link
                  href="/assess"
                  onClick={() => {
                    if (typeof window !== "undefined") {
                      localStorage.removeItem("ascend.profile.v1");
                      localStorage.removeItem("ascend.chosen.v1");
                    }
                  }}
                  className="relative group inline-flex items-center justify-center gap-2 bg-foreground text-accent-fg rounded-2xl py-3.5 px-6 font-medium text-[15px] shadow-[0_10px_30px_-12px_rgba(10,10,10,0.45)]"
                >
                  Start Your Guided Session
                  <motion.span
                    className="inline-flex"
                    animate={{ x: [0, 3, 0] }}
                    transition={{
                      duration: 1.8,
                      repeat: Infinity,
                      ease: "easeInOut",
                    }}
                  >
                    <ArrowRight className="w-4 h-4" />
                  </motion.span>
                </Link>
              </motion.div>
              <div className="mono-label text-[11px] uppercase tracking-[0.22em] text-muted-2">
                3 to 5 picks · 15 min · no signup
              </div>
            </motion.div>
          </div>
        </section>

        {/* What's inside:4 numbered features (motion.dev-style row) */}
        <section className="border-t border-border-soft pt-8 sm:pt-10 pb-6">
          <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 mb-6">
            // INSIDE
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-6">
            <Feature
              num="01"
              title="Guided Assessment"
              body="Six short questions about your role, goals, and time."
            />
            <Feature
              num="02"
              title="AI Recommendations"
              body="Hundreds narrowed to 3 to 5, with reasoning for each."
            />
            <Feature
              num="03"
              title="Peer Reviews"
              body="Outcomes from learners in your cohort. Confidence builders."
            />
            <Feature
              num="04"
              title="Zero Signup"
              body="Anonymous, ephemeral. Sign-in for save in v0.2."
            />
          </div>
        </section>

        {/* Sources row */}
        <section className="border-t border-border-soft pt-6 sm:pt-8 mt-6 sm:mt-10">
          <div className="flex flex-col sm:flex-row sm:items-baseline gap-3 sm:gap-8">
            <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 shrink-0">
              // SOURCED FROM
            </div>
            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1.5 text-[12px] text-muted">
              <span>Coursera</span>
              <span>Pluralsight</span>
              <span>DeepLearning.AI</span>
              <span>Linux Foundation</span>
              <span>HashiCorp</span>
              <span>Reforge</span>
              <span>SVPG</span>
              <span>O&apos;Reilly</span>
            </div>
          </div>
        </section>

        {/* Stats: 3 equal cards, sized to content (no stretch) */}
        <motion.section
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={{
            visible: { transition: { staggerChildren: 0.08 } },
          }}
          className="grid grid-cols-3 gap-3 sm:gap-4 mt-12 sm:mt-16"
        >
          <Stat
            number={61}
            suffix="%"
            label="report choice overload"
            eyebrow="Survey · n=25"
          />
          <Stat
            numberText="3 to 5"
            label="picks per session"
            eyebrow="Output"
          />
          <Stat
            number={48}
            suffix="h"
            label="to first action"
            eyebrow="North Star"
          />
        </motion.section>

        {/* How it works:equal-width cards. Funnel conveyed by internal progress arc, not card width. */}
        <section className="mt-20 sm:mt-28">
          <SectionEyebrow index="02">How it works</SectionEyebrow>
          <div className="mt-7 grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <Step
              index="01"
              title="Assess"
              body="Six short questions about your role, goal, and time."
              scaleLabel="Hundreds of options"
              progress={1.0}
            />
            <Step
              index="02"
              title="Recommend"
              body="Hundreds of courses narrowed to 3 to 5, with reasoning for each."
              scaleLabel="3 to 5 picks"
              progress={0.45}
            />
            <Step
              index="03"
              title="Decide"
              body="Compare side by side with peer reviews, then commit."
              scaleLabel="1 chosen"
              progress={0.12}
            />
          </div>
        </section>

        {/* Testimonials */}
        <section className="mt-20 sm:mt-28 mb-12">
          <SectionEyebrow index="03">What our users say</SectionEyebrow>
          <div className="mt-7 grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
            <TestimonialCard
              quote="Helped me cut my reading list from 30 tabs to 3 courses I actually finished."
              author="Aanya Mehta"
              role="Software Engineer at Razorpay, 2 yrs"
              delay={0}
            />
            <TestimonialCard
              quote="Confirmed the one growth course I'd been circling for months. Started it the next morning."
              author="Ishaan Kapoor"
              role="Growth Marketer at Zerodha, 4 yrs"
              delay={0.1}
            />
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto pt-8 pb-8 flex items-center justify-between border-t border-border-soft">
          <span className="mono-label text-[11px] uppercase tracking-[0.22em] text-muted-2">
            Free · no signup · MVP by Aryan Saharan
          </span>
          <span className="hidden sm:inline serif-italic text-[13px] text-muted">
            est. 2025
          </span>
        </footer>
      </div>
    </main>
  );
}

function SectionEyebrow({
  index,
  children,
}: {
  index: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-3">
      <span className="mono-label text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-muted font-medium">
        // {index} {children}
      </span>
      <span className="flex-1 h-px bg-border-soft" />
    </div>
  );
}

function Feature({
  num,
  title,
  body,
}: {
  num: string;
  title: string;
  body: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, ease: easeOut }}
      className="flex flex-col gap-2"
    >
      <span className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
        {num}
      </span>
      <h3 className="text-[14px] sm:text-[15px] font-semibold text-foreground tracking-[-0.005em]">
        {title}
      </h3>
      <p className="text-[12.5px] leading-relaxed text-muted">{body}</p>
    </motion.div>
  );
}

function Step({
  index,
  title,
  body,
  scaleLabel,
  progress,
}: {
  index: string;
  title: string;
  body: string;
  scaleLabel: string;
  progress: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, ease: easeOut }}
      whileHover={{ y: -2 }}
      className="bg-card border border-border-soft rounded-2xl p-6 sm:p-7 flex flex-col gap-3 card-elev card-elev-hover"
    >
      <div className="flex items-baseline justify-between">
        <span className="serif-italic text-[22px] text-foreground/75 leading-none">
          {index}
        </span>
        <span className="mono-label text-[9px] uppercase tracking-[0.22em] text-muted-2">
          {scaleLabel}
        </span>
      </div>

      <h3 className="text-[20px] sm:text-[22px] font-semibold text-foreground leading-tight tracking-[-0.01em]">
        {title}
      </h3>
      <p className="text-[13.5px] leading-relaxed text-muted">{body}</p>

      {/* Funnel bar:width reflects the step's scale */}
      <div className="mt-4 pt-4 border-t border-border-soft">
        <div className="relative h-[3px] rounded-full bg-card-alt overflow-hidden">
          <motion.div
            initial={{ scaleX: 0 }}
            whileInView={{ scaleX: progress }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 1, ease: easeOut, delay: 0.2 }}
            style={{ transformOrigin: "0 0" }}
            className="absolute inset-y-0 left-0 right-0 bg-foreground rounded-full"
          />
        </div>
        <div className="mt-2 flex justify-between text-[10px] mono-label uppercase tracking-[0.18em] text-muted-2">
          <span>Step {index}</span>
          <span>{Math.round(progress * 100)}% of scale</span>
        </div>
      </div>
    </motion.div>
  );
}

function Stat({
  number,
  numberText,
  suffix,
  label,
  eyebrow,
}: {
  number?: number;
  numberText?: string;
  suffix?: string;
  label: string;
  eyebrow: string;
}) {
  const [display, setDisplay] = useState(numberText ?? "0");
  const count = useMotionValue(0);
  const rounded = useTransform(count, (v) => Math.round(v));

  useEffect(() => {
    if (typeof number !== "number") return;
    const unsubscribe = rounded.on("change", (v) =>
      setDisplay(`${v}${suffix ?? ""}`),
    );
    const controls = animate(count, number, {
      duration: 1.2,
      ease: easeOut,
      delay: 0.3,
    });
    return () => {
      unsubscribe();
      controls.stop();
    };
  }, [number, suffix, count, rounded]);

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 8 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: easeOut },
        },
      }}
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
      className="bg-card border border-border-soft rounded-2xl p-5 sm:p-6 card-elev card-elev-hover"
    >
      <div className="mono-label text-[9px] sm:text-[10px] uppercase tracking-[0.26em] text-muted-2 mb-3">
        {eyebrow}
      </div>
      <div className="flex items-baseline gap-1">
        <div className="text-[2rem] sm:text-[2.5rem] font-semibold text-foreground tabular-nums leading-none tracking-[-0.025em]">
          {display}
        </div>
      </div>
      <div className="text-[12px] sm:text-[13px] leading-snug text-muted mt-2">
        {label}
      </div>
    </motion.div>
  );
}

function TestimonialCard({
  quote,
  author,
  role,
  delay,
}: {
  quote: string;
  author: string;
  role: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay, ease: easeOut }}
      whileHover={{ y: -2 }}
      className="bg-card border border-border-soft rounded-2xl p-6 sm:p-7 card-elev card-elev-hover"
    >
      <div className="flex items-center gap-0.5 mb-3">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className="w-3 h-3 fill-foreground text-foreground" />
        ))}
      </div>
      <p className="serif-italic text-[17px] sm:text-[18px] leading-relaxed text-foreground/85">
        &ldquo;{quote}&rdquo;
      </p>
      <div className="mt-5 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-card-alt border border-border-soft flex items-center justify-center text-[13px] font-semibold text-foreground">
          {author[0]}
        </div>
        <div>
          <div className="text-[13.5px] font-medium text-foreground leading-tight">
            {author}
          </div>
          <div className="text-xs text-muted leading-tight mt-0.5">{role}</div>
        </div>
      </div>
    </motion.div>
  );
}
