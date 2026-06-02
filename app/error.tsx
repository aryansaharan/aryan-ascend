"use client";

import { useEffect } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Logo } from "@/components/Logo";

const easeOut = [0.16, 1, 0.3, 1] as const;

/**
 * Root error boundary. Per Next 16.2 the prop is `unstable_retry`
 * (replaces the older `reset`). Must be a Client Component.
 */
export default function Error({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // Surface the error for local debugging. In production, this is where a
    // reporter (Sentry, etc.) would be wired up.
    console.error(error);
  }, [error]);

  return (
    <main className="relative min-h-screen bg-background flex flex-col items-center overflow-x-clip">
      <div className="page-glow" aria-hidden />
      <div className="grain absolute inset-0 pointer-events-none" aria-hidden />

      <div className="relative w-full max-w-3xl mx-auto flex flex-col min-h-screen px-6 sm:px-10 lg:px-16">
        <header className="py-5 flex items-center justify-between">
          <Logo size="md" />
          <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
            // Error
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center text-center pb-16">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: easeOut }}
            className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 mb-5"
          >
            Unexpected stop
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.05, ease: easeOut }}
            className="serif-italic text-[3.5rem] sm:text-[4.5rem] leading-[1.05] text-foreground max-w-[14ch]"
          >
            Something snapped mid-session.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.15, ease: easeOut }}
            className="mt-6 text-[15px] sm:text-base text-muted max-w-[44ch]"
          >
            Most of these clear on a retry. If it sticks, head back to the
            landing page and start a fresh session.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25, ease: easeOut }}
            className="mt-9 flex flex-col sm:flex-row items-center gap-3"
          >
            <button
              onClick={() => unstable_retry()}
              className="inline-flex items-center gap-2 bg-foreground text-accent-fg rounded-2xl px-6 py-3.5 font-medium text-[15px] hover:gap-3 transition-all"
            >
              <RotateCcw className="w-4 h-4" />
              Try again
            </button>
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-card-alt text-foreground rounded-2xl px-6 py-3.5 font-medium text-[15px] hover:gap-3 transition-all"
            >
              Back to landing
              <ArrowRight className="w-4 h-4" />
            </Link>
          </motion.div>

          {error.digest && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.4, ease: easeOut }}
              className="mono-label text-[10px] uppercase tracking-[0.18em] text-muted-2 mt-10"
            >
              Ref: {error.digest}
            </motion.div>
          )}
        </div>
      </div>
    </main>
  );
}
