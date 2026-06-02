"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";

const easeOut = [0.16, 1, 0.3, 1] as const;

export default function NotFound() {
  return (
    <main className="relative min-h-screen bg-background flex flex-col items-center overflow-x-clip">
      <div className="page-glow" aria-hidden />
      <div className="grain absolute inset-0 pointer-events-none" aria-hidden />

      <div className="relative w-full max-w-3xl mx-auto flex flex-col min-h-screen px-6 sm:px-10 lg:px-16">
        <header className="py-5 flex items-center justify-between">
          <Logo size="md" />
          <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
            // 404
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center text-center pb-16">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 mb-5"
          >
            Off the path
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.05, ease: easeOut }}
            className="serif-italic text-[5rem] sm:text-[6.5rem] leading-none text-foreground"
          >
            Lost?
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: easeOut }}
            className="mt-6 text-[15px] sm:text-base text-muted max-w-[42ch]"
          >
            This page doesn&apos;t exist in your guided session. The shortlist
            lives elsewhere.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: easeOut }}
            className="mt-9"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-foreground text-accent-fg rounded-2xl px-6 py-3.5 font-medium text-[15px] hover:gap-3 transition-all"
            >
              Back to landing
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>
        </div>
      </div>
    </main>
  );
}
