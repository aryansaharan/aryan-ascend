"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { Logo } from "@/components/Logo";
import { fadeUp } from "@/lib/motion";


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

      <div className="relative w-full max-w-3xl mx-auto flex flex-col min-h-screen px-6 sm:px-10 lg:px-16">
        <header className="py-5 flex items-center justify-between">
          <Logo />
          <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
            {"// Error"}
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center text-center pb-16">
          <div
            style={fadeUp(8, 0.5)}
            className="fade-up mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 mb-5"
          >
            Unexpected stop
          </div>

          <h1
            style={fadeUp(14, 0.65, 0.05)}
            className="fade-up serif-italic text-[3.5rem] sm:text-[4.5rem] leading-[1.05] text-foreground max-w-[14ch]"
          >
            Something snapped mid-session.
          </h1>

          <p
            style={fadeUp(12, 0.6, 0.15)}
            className="fade-up mt-6 text-[15px] sm:text-base text-muted max-w-[44ch]"
          >
            Most of these clear on a retry. If it sticks, go back to the start.
            Plans you saved stay on this device.
          </p>

          <div
            style={fadeUp(12, 0.6, 0.25)}
            className="fade-up mt-9 flex flex-col sm:flex-row items-center gap-3"
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
              Back to the start
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {error.digest && (
            <div
              style={fadeUp(0, 0.5, 0.4)}
              className="fade-up mono-label text-[10px] uppercase tracking-[0.18em] text-muted-2 mt-10"
            >
              Ref: {error.digest}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
