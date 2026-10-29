"use client";

import { useEffect, useRef, useState, type AnimationEvent, type CSSProperties, type ReactNode } from "react";

// A CSS stand-in for framer-motion's AnimatePresence (mode "wait") for one
// child at a time. The child named by `id` enters with the `enter` class; when
// `id` changes or becomes null, the child on screen plays the `exit` class
// with the content it last had, then the next one enters. Keyed by `id`, so
// each child is a fresh instance, as with AnimatePresence. The animations are
// CSS keyframes in app/globals.css.

type Shown = { id: string; node: ReactNode; phase: "enter" | "idle" | "exit" };

/** Longest any exit may take before the next child shows anyway (e.g. inside a hidden parent). */
const EXIT_FALLBACK_MS = 1200;

export function Presence({
  id,
  children,
  enter,
  exit,
  initial = true,
  className,
  style,
  domId,
  onEntered,
}: {
  /** what is on screen; null for nothing */
  id: string | null;
  children: ReactNode;
  enter: string;
  exit: string;
  /** play `enter` for a child that is there on the first render */
  initial?: boolean;
  className?: string;
  style?: CSSProperties;
  /** the wrapper's DOM id (for aria-controls) */
  domId?: string;
  /** after a child finishes entering */
  onEntered?: () => void;
}) {
  const [shown, setShown] = useState<Shown | null>(() =>
    id === null ? null : { id, node: children, phase: initial ? "enter" : "idle" },
  );

  // Derived from props during render (React's "storing information from
  // previous renders"): start an exit when the id changes, and otherwise keep
  // the latest content, so an exit shows what was last on screen.
  if (shown === null) {
    if (id !== null) setShown({ id, node: children, phase: "enter" });
  } else if (shown.phase !== "exit") {
    if (id !== shown.id) setShown({ ...shown, phase: "exit" });
    else if (children !== shown.node) setShown({ ...shown, node: children });
  }

  const exiting = shown?.phase === "exit";
  const next = (): void => setShown(id === null ? null : { id, node: children, phase: "enter" });
  const nextRef = useRef(next);
  useEffect(() => {
    nextRef.current = next;
  });

  // An exit whose animation never runs (inside a display: none parent) still finishes.
  useEffect(() => {
    if (!exiting) return;
    const t = setTimeout(() => nextRef.current(), EXIT_FALLBACK_MS);
    return () => clearTimeout(t);
  }, [exiting]);

  if (!shown) return null;

  function onAnimationEnd(e: AnimationEvent<HTMLDivElement>) {
    if (e.target !== e.currentTarget || !shown) return;
    if (shown.phase === "exit") next();
    else if (shown.phase === "enter") {
      setShown({ ...shown, phase: "idle" });
      onEntered?.();
    }
  }

  const cls = shown.phase === "enter" ? enter : shown.phase === "exit" ? exit : "";
  return (
    <div
      key={shown.id}
      id={domId}
      className={[className, cls].filter(Boolean).join(" ") || undefined}
      style={style}
      onAnimationEnd={onAnimationEnd}
    >
      {shown.node}
    </div>
  );
}

/**
 * Opens to the content's height and closes back to nothing (framer's
 * height 0 to "auto" with opacity), keeping the content on screen while it
 * closes.
 */
export function Collapse({
  open,
  children,
  duration = 0.45,
  className,
  domId,
  onOpened,
}: {
  open: boolean;
  children: ReactNode;
  /** seconds */
  duration?: number;
  className?: string;
  domId?: string;
  onOpened?: () => void;
}) {
  return (
    <Presence
      id={open ? "open" : null}
      enter="expand-in"
      exit="expand-out"
      initial={false}
      domId={domId}
      className={["grid", className].filter(Boolean).join(" ")}
      style={{ "--xd": `${duration}s` } as CSSProperties}
      onEntered={onOpened}
    >
      <div className="min-h-0 overflow-hidden">{children}</div>
    </Presence>
  );
}
