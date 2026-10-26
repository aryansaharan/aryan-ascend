"use client";

import { MotionConfig } from "framer-motion";

// Every framer-motion animation follows the system's reduced-motion setting:
// transforms are skipped and only opacity still fades.
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
