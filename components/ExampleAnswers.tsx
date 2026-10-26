"use client";

import { useRef } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { availableExamples, EXAMPLES } from "@/lib/examples";
import { budgetLabel, hrsAWeek } from "@/lib/format";
import { useDisplayCurrency } from "@/lib/hooks";
import { startExampleSession } from "@/lib/session";
import { easeOut } from "@/components/ui";

/**
 * "Try it with example answers": an inline card with the three labelled
 * situations from lib/examples.ts. Each one starts a fresh session and opens
 * /assess?example=N (1-based, in EXAMPLES order), which fills in the situation
 * and jumps to Check, so the visitor sees what the AI reads from it before
 * anything is chosen. The parent owns `open` so the trigger can sit in
 * the CTA row while the card opens below it.
 */
export function ExampleAnswers({
  open,
  onClose,
  id,
}: {
  open: boolean;
  onClose: () => void;
  /** for the trigger's aria-controls */
  id?: string;
}) {
  const currency = useDisplayCurrency();
  const reduced = useReducedMotion();
  const panel = useRef<HTMLDivElement>(null);
  const examples = availableExamples();

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="examples"
          ref={panel}
          id={id}
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.45, ease: easeOut }}
          onAnimationComplete={(def) => {
            // Once open, bring the whole card into view if it landed below the fold.
            if (typeof def === "object" && def && "height" in def && def.height === "auto") {
              panel.current?.scrollIntoView({
                block: "nearest",
                behavior: reduced ? "auto" : "smooth",
              });
            }
          }}
          className="w-full overflow-hidden"
        >
          {/* Inner padding keeps the card shadow clear of the clipping edge. */}
          <div className="p-px pb-1">
            <div className="bg-card border border-border-soft rounded-2xl card-elev overflow-hidden">
              <div className="flex items-start justify-between gap-4 pl-5 sm:pl-6 pr-2.5 sm:pr-3 pt-4 sm:pt-5">
                <div className="pt-1.5">
                  <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
                    {"// EXAMPLE ANSWERS"}
                  </div>
                  <p className="mt-2 text-[13px] leading-relaxed text-muted max-w-[52ch]">
                    Three situations, written the way people describe their own.
                    Choose one and Ascend runs on it exactly as it would on yours.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close example answers"
                  className="shrink-0 w-10 h-10 inline-flex items-center justify-center rounded-full text-muted hover:text-foreground hover:bg-card-alt"
                >
                  <X aria-hidden className="w-4 h-4" />
                </button>
              </div>

              <ul className="mt-4 border-t border-border-soft divide-y divide-border-soft">
                {examples.map((e) => (
                  <li key={e.id}>
                    <Link
                      href={`/assess?example=${EXAMPLES.indexOf(e) + 1}`}
                      onClick={() => startExampleSession()}
                      className="group flex items-center gap-4 px-5 sm:px-6 py-4 hover:bg-card-alt/60"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-[15px] font-medium text-foreground leading-snug tracking-[-0.005em]">
                          {e.label}
                        </div>
                        <p className="serif-italic mt-1 text-[15px] sm:text-[16px] leading-snug text-foreground/70 line-clamp-2">
                          &ldquo;{e.situation}&rdquo;
                        </p>
                        <div className="mono-label mt-2 text-[10px] uppercase tracking-[0.18em] text-muted-2">
                          {hrsAWeek(e.hoursPerWeek)} · {budgetLabel(e.budget, currency)}
                        </div>
                      </div>
                      <ArrowRight
                        aria-hidden
                        className="w-4 h-4 shrink-0 text-muted transition-transform duration-300 group-hover:translate-x-0.5 group-hover:text-foreground"
                      />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
