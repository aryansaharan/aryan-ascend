"use client";

import { useEffect, useRef, useState } from "react";
import { animate, useReducedMotion } from "framer-motion";
import type { FunnelStage } from "@/lib/fit";

// The funnel line under the read-back: real counts from fit(), stage by stage.
// While a fresh pick loads it plays once: each stage fades in and its count
// ticks down from the stage before it, so "rules first" is something you see.
// The last stage ("1 pick") waits for the answer when `hold` is set. Reduced
// motion, a cached pick and every later change show the final line.

const STAGE_SECONDS = 0.24;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function Funnel({
  stages,
  play,
  hold = false,
  onHeld,
  onDone,
  className,
}: {
  stages: FunnelStage[];
  /** play the reveal once (a fresh load); remount with a new key to replay */
  play: boolean;
  /** stop before the last stage until the pick arrives */
  hold?: boolean;
  /** called when the reveal reaches the held stage */
  onHeld?: () => void;
  /** called when the reveal finishes (not called when it doesn't play) */
  onDone?: () => void;
  className?: string;
}) {
  const reduced = useReducedMotion();
  const animated = play && !reduced;
  const n = stages.length;
  const target = hold ? n - 1 : n;
  const [progress, setProgress] = useState(0);
  const at = useRef(0);
  const callbacks = useRef({ onHeld, onDone });

  useEffect(() => {
    callbacks.current = { onHeld, onDone };
  });

  useEffect(() => {
    if (!animated) return;
    const from = at.current;
    if (from >= target) {
      if (target === n) callbacks.current.onDone?.();
      return;
    }
    const controls = animate(from, target, {
      duration: (target - from) * STAGE_SECONDS,
      ease: "linear",
      onUpdate: (v) => {
        at.current = v;
        setProgress(v);
      },
      onComplete: () => {
        if (target === n) callbacks.current.onDone?.();
        else callbacks.current.onHeld?.();
      },
    });
    return () => controls.stop();
  }, [animated, target, n]);

  const p = animated ? progress : n;
  const finalText = stages.map((s) => `${s.count} ${s.suffix}`).join(", ");

  const stage = (s: FunnelStage, i: number) => {
    const f = Math.min(1, Math.max(0, p - i));
    const from = i === 0 ? 0 : stages[i - 1].count;
    const shown = Math.round(from + (s.count - from) * easeOutCubic(f));
    const visible = Math.min(1, f * 3);
    const last = s.key === "pick";
    return (
      <span
        key={s.key}
        className="mono-label inline-flex items-center whitespace-nowrap before:content-['·'] before:inline-block before:w-5 before:text-center before:text-border"
        style={{ opacity: visible }}
      >
        {last ? (
          <span
            className={`mono-label inline-flex items-center rounded-full px-2 py-px ${
              s.count > 0 ? "bg-foreground text-accent-fg" : "border border-border text-muted"
            }`}
          >
            <span className="mono-label tabular-nums">{shown}</span>&nbsp;{s.suffix}
          </span>
        ) : (
          <span className="mono-label">
            <span className="mono-label tabular-nums text-foreground">{shown}</span> {s.suffix}
          </span>
        )}
      </span>
    );
  };

  // The last two stages wrap together, so "1 pick" never sits alone on a line.
  // Each stage carries its separator in front; the row is pulled into a
  // clipped gutter, so a separator that starts a line is hidden instead of
  // dangling at the end of the line above.
  // Only a final "pick" pill is kept with its neighbour; a "sent to the AI"
  // stage wraps like any other, so a narrow column never clips it.
  const groupTail = stages[n - 1]?.key === "pick";
  const head = groupTail ? stages.slice(0, Math.max(0, n - 2)) : stages;
  const tail = groupTail ? stages.slice(Math.max(0, n - 2)) : [];

  return (
    <p
      className={`mono-label overflow-hidden text-[10.5px] sm:text-[11px] uppercase tracking-[0.14em] leading-[1.6] text-muted-2 ${className ?? ""}`}
    >
      <span className="sr-only">{finalText}</span>
      <span aria-hidden className="-ml-5 flex flex-wrap items-center gap-y-1.5">
        {head.map((s, i) => stage(s, i))}
        {tail.length > 0 && (
          <span className="mono-label inline-flex items-center whitespace-nowrap">
            {tail.map((s, j) => stage(s, head.length + j))}
          </span>
        )}
      </span>
    </p>
  );
}
