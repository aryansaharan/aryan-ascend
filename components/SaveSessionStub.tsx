"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Save-session stub. Visually a tiny text link that pops a toast explaining
 * sign-in is deferred to v0.2. Shared by /recommendations and /compare so the
 * placeholder reads identically on both surfaces.
 *
 * The toast opens above the link, ignores taps (so it never blocks the main
 * button below it), and wraps on narrow phones instead of running off-screen.
 */
export function SaveSessionStub() {
  const [shown, setShown] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShown(true);
          if (timer.current) clearTimeout(timer.current);
          timer.current = setTimeout(() => setShown(false), 3000);
        }}
        className="text-xs text-muted hover:text-foreground transition-colors"
      >
        Save this session →
      </button>
      <AnimatePresence>
        {shown && (
          <motion.div
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            transition={{ duration: 0.25 }}
            className="pointer-events-none absolute right-0 bottom-full mb-2 z-10 w-max max-w-[15rem] sm:max-w-none bg-foreground text-accent-fg text-[11px] leading-snug px-3 py-2 rounded-xl"
          >
            Sign-in coming in v0.2. For now, your session resets on next visit.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
