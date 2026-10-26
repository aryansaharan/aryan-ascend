"use client";

import { useId, useState } from "react";
import { LoaderCircle } from "lucide-react";

// "Or tell Ascend what's off" (spec 3.3), under the adjust chips in the same
// section: one line of text and a Re-pick button. Asks the AI again with the
// note, excluding the current pick. At most two per set of answers; a failure
// keeps the options already on screen.

export type RepickStatus =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; note: string }
  | { kind: "failed" };

export function RepickNote({
  used,
  max,
  status,
  onSubmit,
}: {
  used: number;
  max: number;
  status: RepickStatus;
  onSubmit: (note: string) => void;
}) {
  const id = useId();
  const [note, setNote] = useState("");
  const loading = status.kind === "loading";
  const spent = used >= max;
  const text = note.trim();
  const usedLine = "Re-picks used. The options above still work.";

  return (
    <div className="mt-6" role="group" aria-labelledby={`${id}-label`}>
      <p id={`${id}-label`} className="text-[13px] text-muted">
        Or tell Ascend what&apos;s off
      </p>
      {!spent && (
        <form
          className="mt-2.5 flex flex-col sm:flex-row gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!text || loading) return;
            onSubmit(text);
            setNote("");
          }}
        >
          <label htmlFor={id} className="sr-only">
            What&apos;s off about this pick
          </label>
          <input
            id={id}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={200}
            disabled={loading}
            placeholder="For example: I'd rather build than read"
            className="flex-1 min-h-11 rounded-xl border border-border bg-card px-4 text-base sm:text-[14px] text-foreground placeholder:text-muted-2 outline-none focus:border-foreground disabled:opacity-60 transition-colors"
          />
          <button
            type="submit"
            disabled={!text || loading}
            className="inline-flex items-center justify-center gap-2 min-h-11 rounded-xl bg-foreground text-accent-fg px-5 text-[14px] font-medium disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
          >
            {loading && <LoaderCircle aria-hidden className="w-4 h-4 animate-spin" />}
            Re-pick
          </button>
        </form>
      )}
      <div aria-live="polite">
        {(status.kind === "ok" || status.kind === "failed" || spent) && (
          <p className="mt-3 text-[12.5px] leading-relaxed text-muted">
            {status.kind === "ok" && <>Re-picked because you said: &ldquo;{status.note}&rdquo;</>}
            {status.kind === "failed" && "Couldn't re-pick from a note right now. The options above still work."}
            {status.kind !== "ok" && status.kind !== "failed" && spent && usedLine}
            {status.kind === "ok" && spent && <span className="block mt-1">{usedLine}</span>}
          </p>
        )}
      </div>
    </div>
  );
}
