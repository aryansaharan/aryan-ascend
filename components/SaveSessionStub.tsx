"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * Save-session stub. Visually a tiny text link that pops a toast tooltip
 * explaining sign-in is deferred to v0.2. Shared by /recommendations and
 * /compare so the placeholder reads identically on both surfaces.
 */
export function SaveSessionStub({
  tooltipPosition = "top",
}: {
  tooltipPosition?: "top" | "bottom";
}) {
  const [shown, setShown] = useState(false);

  const tooltipPositionClass =
    tooltipPosition === "top"
      ? "top-full mt-2"
      : "bottom-full mb-2";

  return (
    <div className="relative">
      <button
        onClick={() => {
          setShown(true);
          setTimeout(() => setShown(false), 3000);
        }}
        className="text-xs text-muted hover:text-foreground transition-colors"
      >
        Save this session →
      </button>
      <AnimatePresence>
        {shown && (
          <motion.div
            initial={{ opacity: 0, y: tooltipPosition === "top" ? -4 : 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: tooltipPosition === "top" ? -4 : 4 }}
            transition={{ duration: 0.25 }}
            className={`absolute right-0 ${tooltipPositionClass} bg-foreground text-accent-fg text-[11px] px-3 py-2 rounded-xl whitespace-nowrap`}
          >
            Sign-in coming in v0.2. For now, your session resets on next visit.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default SaveSessionStub;
