"use client";

import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import type { FunnelStage } from "@/lib/fit";
import { useReducedMotion } from "@/lib/hooks";

// The funnel line under the read-back: real counts from fit(), stage by stage.
// While a fresh pick loads it plays once: each stage fades in and its count
// ticks down from the stage before it, so "rules first" is something you see.
// The last stage ("1 pick") waits for the answer when `hold` is set. Reduced
// motion, a cached pick and every later change show the final line.
//
// The reveal writes each stage's opacity and count straight into the DOM from
// one requestAnimationFrame loop, so nothing re-renders 60 times a second.
// React renders the starting frame (or the final line); the loop only changes
// what React rendered, through the same text nodes, so a later render with new
// counts still lands.

const STAGE_SECONDS = 0.24;

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Stage `i` at progress `p` (0 to stages.length): its count and opacity. */
function frameOf(stages: FunnelStage[], i: number, p: number): { shown: number; opacity: number } {
  const f = Math.min(1, Math.max(0, p - i));
  const from = i === 0 ? 0 : stages[i - 1].count;
  return {
    shown: Math.round(from + (stages[i].count - from) * easeOutCubic(f)),
    opacity: Math.min(1, f * 3),
  };
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
  const at = useRef(0);
  const callbacks = useRef({ onHeld, onDone });
  const latest = useRef(stages);
  /** each stage's element and the span holding its count, by index */
  const els = useRef<(HTMLSpanElement | null)[]>([]);
  const counts = useRef<(HTMLSpanElement | null)[]>([]);

  useLayoutEffect(() => {
    callbacks.current = { onHeld, onDone };
    latest.current = stages;
  });

  // Writes progress `p` into the stages on screen.
  const paint = useCallback((p: number) => {
    const list = latest.current;
    for (let i = 0; i < list.length; i++) {
      const el = els.current[i];
      if (!el) continue;
      const { shown, opacity } = frameOf(list, i, p);
      el.style.opacity = String(opacity);
      const text = counts.current[i]?.firstChild;
      if (text && text.nodeValue !== String(shown)) text.nodeValue = String(shown);
    }
  }, []);

  // A render mid-reveal (the answer arriving, say) shows React's starting
  // frame; put the current progress back before it is painted.
  useLayoutEffect(() => {
    if (animated) paint(at.current);
  });

  useEffect(() => {
    if (!animated) return;
    const from = at.current;
    if (from >= target) {
      if (target === n) callbacks.current.onDone?.();
      return;
    }
    const ms = (target - from) * STAGE_SECONDS * 1000;
    let start = -1;
    let raf = requestAnimationFrame(function tick(now) {
      if (start < 0) start = now;
      const t = Math.min(1, (now - start) / ms);
      at.current = from + (target - from) * t;
      paint(at.current);
      if (t < 1) raf = requestAnimationFrame(tick);
      else if (target === n) callbacks.current.onDone?.();
      else callbacks.current.onHeld?.();
    });
    return () => cancelAnimationFrame(raf);
  }, [animated, target, n, paint]);

  // React renders the first frame of the reveal, or the final line.
  const p = animated ? 0 : n;
  const finalText = stages.map((s) => `${s.count} ${s.suffix}`).join(", ");

  const stage = (s: FunnelStage, i: number) => {
    const { shown, opacity } = frameOf(stages, i, p);
    const last = s.key === "pick";
    const count = (cls: string) => (
      <span
        ref={(el) => {
          counts.current[i] = el;
        }}
        className={cls}
      >
        {shown}
      </span>
    );
    return (
      <span
        key={s.key}
        ref={(el) => {
          els.current[i] = el;
        }}
        className="mono-label inline-flex items-center whitespace-nowrap before:content-['·'] before:inline-block before:w-5 before:text-center before:text-border"
        style={{ opacity }}
      >
        {last ? (
          <span
            className={`mono-label inline-flex items-center rounded-full px-2 py-px ${
              s.count > 0 ? "bg-foreground text-accent-fg" : "border border-border text-muted"
            }`}
          >
            {count("mono-label tabular-nums")}&nbsp;{s.suffix}
          </span>
        ) : (
          <span className="mono-label">
            {count("mono-label tabular-nums text-foreground")} {s.suffix}
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
