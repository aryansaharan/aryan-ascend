import type { CSSProperties } from "react";

// Settings for the CSS motion classes in app/globals.css (.fade-up, .reveal,
// .fade-out), passed as custom properties. Plain values, no client code, so
// any component can use them.

/** House easing, for the few framer-motion animations left (components/Understanding). */
export const easeOut = [0.16, 1, 0.3, 1] as const;

/** .fade-up: rise `y` px while fading in over `duration` s, after `delay` s. */
export function fadeUp(y = 10, duration = 0.5, delay = 0): CSSProperties {
  return { "--fy": `${y}px`, "--fd": `${duration}s`, "--fdelay": `${delay}s` } as CSSProperties;
}

/** .reveal (and children of .reveal-group): rise `y` px over `duration` s, after `delay` s. */
export function reveal(y = 8, duration = 0.5, delay = 0): CSSProperties {
  return { "--ry": `${y}px`, "--rd": `${duration}s`, "--rdelay": `${delay}s` } as CSSProperties;
}

/** .fade-out / .expand-*: move `y` px while leaving, over `duration` s. */
export function leave(y = 0, duration = 0.3): CSSProperties {
  return { "--xy": `${y}px`, "--xd": `${duration}s` } as CSSProperties;
}

/**
 * A CSS cubic-bezier() timing function as a JS function of progress 0..1,
 * for the few values that still animate in script (the landing count-ups).
 */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sampleX = (u: number) => ((ax * u + bx) * u + cx) * u;
  const sampleY = (u: number) => ((ay * u + by) * u + cy) * u;
  const slopeX = (u: number) => (3 * ax * u + 2 * bx) * u + cx;
  return (t: number) => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    // Newton's method, then bisection if the slope is too flat
    let u = t;
    for (let i = 0; i < 8; i++) {
      const err = sampleX(u) - t;
      if (Math.abs(err) < 1e-6) return sampleY(u);
      const d = slopeX(u);
      if (Math.abs(d) < 1e-6) break;
      u -= err / d;
    }
    let lo = 0;
    let hi = 1;
    u = t;
    for (let i = 0; i < 30; i++) {
      const x = sampleX(u);
      if (Math.abs(x - t) < 1e-6) break;
      if (x < t) lo = u;
      else hi = u;
      u = (lo + hi) / 2;
    }
    return sampleY(u);
  };
}
