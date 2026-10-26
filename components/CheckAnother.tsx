"use client";

import { useId, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { SectionLabel } from "@/components/ui";
import { catalogTitles, courseById } from "@/lib/catalog";
import { checkCourse, weeksAt } from "@/lib/fit";
import { costLine, paceLine, type DisplayCurrency } from "@/lib/format";
import type { Adjust, ProfileV2 } from "@/lib/profile";

// "Already looking at another course?" A type-ahead over every catalog title,
// including ruled-out ones. A match shows its weeks and cost at their pace and
// whether it fits, all from code. Anything else gets the hours calculator.
// No AI.

/** "Enter its total hours" for a course outside the catalog. Code only. */
export function HoursCalculator({ hoursPerWeek, label = "Enter its total hours:" }: { hoursPerWeek: number; label?: string }) {
  const id = useId();
  const [value, setValue] = useState("");
  const hours = Number(value);
  const valid = value.trim() !== "" && Number.isFinite(hours) && hours > 0 && hours <= 2000;
  const weeks = valid ? weeksAt(hours, hoursPerWeek) : 0;
  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
      <label htmlFor={id} className="text-[13px] text-muted">
        {label}
      </label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={1}
          max={2000}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Hours"
          className="w-28 min-h-10 rounded-xl border border-border bg-card px-3 text-base sm:text-[14px] text-foreground placeholder:text-muted-2 outline-none focus:border-foreground transition-colors"
        />
        <span aria-live="polite" className="text-[13px] text-foreground/85">
          {valid ? `${paceLine(weeks, hoursPerWeek)}.` : ""}
        </span>
      </div>
    </div>
  );
}

export function CheckAnother({
  profile,
  adjust,
  currency,
}: {
  profile: ProfileV2;
  adjust: Adjust;
  currency: DisplayCurrency;
}) {
  const inputId = useId();
  const listId = useId();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const titles = useMemo(() => catalogTitles(), []);

  const q = query.trim().toLowerCase();
  const matches = useMemo(() => {
    if (q.length < 2) return [];
    const words = q.split(/\s+/).filter(Boolean);
    return titles
      .filter((t) => {
        const hay = `${t.title} ${t.provider}`.toLowerCase();
        return words.every((w) => hay.includes(w));
      })
      .slice(0, 6);
  }, [q, titles]);

  const course = selected ? courseById(selected) : undefined;
  const check = course ? checkCourse(profile, adjust, course, { currency }) : null;
  const noMatch = !course && q.length >= 2 && matches.length === 0;

  function choose(id: string) {
    const c = courseById(id);
    setSelected(id);
    setQuery(c?.title ?? "");
    setOpen(false);
  }

  function clear() {
    setSelected(null);
    setQuery("");
    setOpen(false);
  }

  return (
    <section aria-labelledby={`${inputId}-label`}>
      <SectionLabel as="h2">
        <span id={`${inputId}-label`}>Already looking at another course?</span>
      </SectionLabel>
      <div className="mt-3 relative">
        <Search aria-hidden className="w-4 h-4 text-muted-2 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          id={inputId}
          role="combobox"
          aria-expanded={open && matches.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "Enter" && matches[0] && !selected) {
              e.preventDefault();
              choose(matches[0].id);
            }
          }}
          placeholder="Type a course name"
          maxLength={120}
          className="w-full min-h-11 rounded-xl border border-border bg-card pl-10 pr-11 text-base sm:text-[14px] text-foreground placeholder:text-muted-2 outline-none focus:border-foreground transition-colors"
        />
        {query && (
          <button
            type="button"
            onClick={clear}
            aria-label="Clear"
            className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 grid place-items-center text-muted-2 hover:text-foreground"
          >
            <X aria-hidden className="w-4 h-4" />
          </button>
        )}
        {open && !selected && matches.length > 0 && (
          <ul
            id={listId}
            role="listbox"
            className="absolute z-20 left-0 right-0 mt-1.5 rounded-xl border border-border-soft bg-card card-elev-hover overflow-hidden"
          >
            {matches.map((m) => (
              <li key={m.id} role="option" aria-selected={false}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => choose(m.id)}
                  className="w-full min-h-11 text-left px-4 py-2.5 hover:bg-card-alt transition-colors border-t border-border-soft first:border-t-0"
                >
                  <span className="block text-[13.5px] text-foreground leading-snug">{m.title}</span>
                  <span className="block text-[12px] text-muted-2">{m.provider}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {check && course && (
        <div className="mt-3 rounded-xl border border-border-soft bg-card px-4 py-3.5" aria-live="polite">
          <p className="text-[13.5px] text-foreground font-medium leading-snug">{course.title}</p>
          <p className="mt-1 text-[13px] text-muted leading-relaxed">
            {paceLine(check.weeks, profile.hoursPerWeek)}
            {check.scope && !check.scope.whole && check.scopeLabel ? ` for ${check.scopeLabel}` : ""}
            {" · "}
            {costLine(course, check.costAtPace, currency)}
          </p>
          <p className={`mt-2 text-[13px] leading-relaxed ${check.fits ? "text-foreground" : "text-muted"}`}>
            {check.fits ? "Fits your answers." : check.text}
          </p>
        </div>
      )}

      {noMatch && (
        <div className="mt-3 rounded-xl border border-border-soft bg-card px-4 py-3.5">
          <p className="text-[13px] text-muted mb-2.5">Not in Ascend&apos;s list.</p>
          <HoursCalculator hoursPerWeek={profile.hoursPerWeek} />
        </div>
      )}
    </section>
  );
}
