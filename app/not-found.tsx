"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Logo } from "@/components/Logo";
import { fadeUp } from "@/lib/motion";


export default function NotFound() {
  return (
    <main className="relative min-h-screen bg-background flex flex-col items-center overflow-x-clip">
      <div className="page-glow" aria-hidden />

      <div className="relative w-full max-w-3xl mx-auto flex flex-col min-h-screen px-6 sm:px-10 lg:px-16">
        <header className="py-5 flex items-center justify-between">
          <Logo />
          <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
            {"// 404"}
          </div>
        </header>

        <div className="flex-1 flex flex-col items-center justify-center text-center pb-16">
          <div
            style={fadeUp(8, 0.5)}
            className="fade-up mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2 mb-5"
          >
            Off the path
          </div>

          <h1
            style={fadeUp(14, 0.65, 0.05)}
            className="fade-up serif-italic text-[5rem] sm:text-[6.5rem] leading-none text-foreground"
          >
            Lost?
          </h1>

          <p
            style={fadeUp(12, 0.6, 0.15)}
            className="fade-up mt-6 text-[15px] sm:text-base text-muted max-w-[42ch]"
          >
            Nothing lives at this address. If you followed a plan link, check
            that the whole link was copied.
          </p>

          <div
            style={fadeUp(12, 0.6, 0.25)}
            className="fade-up mt-9"
          >
            <Link
              href="/"
              className="inline-flex items-center gap-2 bg-foreground text-accent-fg rounded-2xl px-6 py-3.5 font-medium text-[15px] hover:gap-3 transition-all"
            >
              Back to the start
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
