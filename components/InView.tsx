"use client";

import { createElement, useEffect, useRef, type CSSProperties, type ReactNode } from "react";

// Reveal-on-scroll without a per-frame animation library: an
// IntersectionObserver sets data-shown on the element the first time it comes
// into view, and the .reveal / .reveal-group CSS in app/globals.css does the
// fade. Same trigger as framer-motion's whileInView with once: true (the
// observer's isIntersecting at threshold `amount`). No React state changes, so
// nothing re-renders when it fires.

const observers = new Map<number, IntersectionObserver>();
const callbacks = new WeakMap<Element, () => void>();

function observerFor(amount: number): IntersectionObserver {
  const existing = observers.get(amount);
  if (existing) return existing;
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        io.unobserve(e.target);
        e.target.setAttribute("data-shown", "");
        callbacks.get(e.target)?.();
        callbacks.delete(e.target);
      }
    },
    { threshold: amount },
  );
  observers.set(amount, io);
  return io;
}

/**
 * A ref for an element that should get data-shown the first time `amount`
 * (0 to 1) of it is in view; `onShow` runs at that moment.
 */
export function useInViewOnce<T extends Element>(amount: number, onShow?: () => void) {
  const ref = useRef<T>(null);
  const latest = useRef(onShow);
  useEffect(() => {
    latest.current = onShow;
  });
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const fire = () => latest.current?.();
    if (typeof IntersectionObserver === "undefined") {
      el.setAttribute("data-shown", "");
      fire();
      return;
    }
    const io = observerFor(amount);
    callbacks.set(el, fire);
    io.observe(el);
    return () => {
      io.unobserve(el);
      callbacks.delete(el);
    };
  }, [amount]);
  return ref;
}

/** An element with class .reveal (or .reveal-group) that reveals once in view. */
export function InView({
  as = "div",
  amount = 0.3,
  className,
  style,
  children,
}: {
  as?: "div" | "ul" | "h2" | "section";
  /** how much of it must be in view, 0 to 1 */
  amount?: number;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  const ref = useInViewOnce<HTMLElement>(amount);
  return createElement(as, { ref, className, style }, children);
}
