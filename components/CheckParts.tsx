"use client";

import type { ReactNode } from "react";
import { Check } from "lucide-react";
import { Presence } from "@/components/Presence";
import { Card, SkeletonLine } from "@/components/ui";

// The parts of /assess that load with the page: OptionCard (the time and
// budget answers, and the direction and starting-point pickers on Check) and
// the Check step's skeleton. Plain CSS motion; components/Understanding, with
// its framer-motion list animations, loads only when the Check step shows.

/** Press depths for .tap (app/globals.css). */
const TAP_985 = { "--tap": "0.985" } as React.CSSProperties;

export function OptionCard({
  selected,
  onClick,
  label,
  hint,
  className,
}: {
  selected: boolean;
  onClick: () => void;
  label: ReactNode;
  hint?: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      style={TAP_985}
      className={`tap w-full text-left rounded-2xl px-4 py-3.5 border ${
        selected
          ? "border-foreground bg-foreground text-accent-fg shadow-[0_2px_10px_-4px_rgba(0,0,0,0.18)]"
          : "border-border bg-card hover:border-foreground/30 hover:shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
      } ${className ?? ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className={`text-[15px] font-medium ${selected ? "" : "text-foreground"}`}>{label}</div>
          {hint && (
            <div className={`text-xs mt-0.5 ${selected ? "text-accent-fg/70" : "text-muted"}`}>{hint}</div>
          )}
        </div>
        <div
          className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border transition-transform duration-300 ease-[var(--ease-bounce)] ${
            selected ? "scale-100 border-accent-fg bg-accent-fg" : "scale-90 border-border"
          }`}
        >
          <Presence id={selected ? "on" : null} enter="pop-in" exit="pop-out" className="flex">
            <Check className="w-3 h-3 text-foreground" />
          </Presence>
        </div>
      </div>
    </button>
  );
}

/** Placeholder while /api/understand is still running (the page caps the wait at 10 s). */
export function UnderstandingSkeleton() {
  return (
    <div aria-hidden>
      <Card padded={false} className="divide-y divide-border-soft">
        {[0.62, 0.38, 0.7].map((w, i) => (
          <div key={i} className="px-4 sm:px-6 py-4 sm:py-5">
            <SkeletonLine className="w-20 h-2.5" />
            <SkeletonLine className="mt-3.5 h-3.5" />
            <span className="block" style={{ width: `${w * 100}%` }}>
              <SkeletonLine className="mt-2 h-3" />
            </span>
          </div>
        ))}
      </Card>
      <div className="mt-9">
        <SkeletonLine className="w-36 h-2.5" />
        <div className="mt-4 flex flex-wrap gap-2">
          {[9, 12, 8].map((w, i) => (
            <span key={i} className="block h-10 rounded-full bg-card-alt animate-pulse" style={{ width: `${w}rem` }} />
          ))}
        </div>
      </div>
    </div>
  );
}
