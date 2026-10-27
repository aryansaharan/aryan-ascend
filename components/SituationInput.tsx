"use client";

import { useRef, useSyncExternalStore } from "react";
import { motion } from "framer-motion";
import { Check, Lock, Plus } from "lucide-react";
import { LIMITS } from "@/lib/profile";

// Step 1 of /assess: the situation, in the person's own words. A textarea
// with guide chips that start a prompt line, a quiet character count and the
// privacy line. Enter adds a new line; Cmd or Ctrl + Enter continues.

/** The guide chips, in order. Tapping one starts a line "{label}: ". */
export const GUIDE_PROMPTS = [
  "What I do now",
  "Where I want to be",
  "What I've tried",
  "Courses I'm looking at",
] as const;

export const SITUATION_PLACEHOLDER =
  "Customer success manager at a B2B SaaS company, 3 years. I log feature requests that mostly get ignored, and I want to move into product. I know basic SQL. I started the Google Project Management certificate and dropped it after a month.";

const PROMPT_ALT = GUIDE_PROMPTS.map((p) => p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace("'", "['’]")).join("|");
/** A line that is only a prompt label, with nothing written after it. */
const EMPTY_PROMPT_LINE = new RegExp(`^\\s*(${PROMPT_ALT})\\s*:?\\s*$`, "i");
const LEADING_PROMPT = new RegExp(`^\\s*(${PROMPT_ALT})\\s*:\\s*`, "i");
const LATER_PROMPT = new RegExp(`\\s+(${PROMPT_ALT})\\s*:.*$`, "i");

/**
 * The text that is sent and saved: prompt lines left empty are dropped, and
 * each line of a multi-line answer ends as a sentence, so code and the model
 * both read one line as one thought. Nothing the person wrote is removed.
 */
export function cleanSituation(raw: string): string {
  const lines = raw
    .replace(/\r\n?/g, "\n")
    .split("\n")
    .map((l) => l.replace(/[ \t]+/g, " ").trim())
    .filter((l) => l.length > 0 && !EMPTY_PROMPT_LINE.test(l));
  const plain = lines.join("\n").trim();
  if (lines.length < 2) return plain;
  const ended = lines.map((l) => (/[A-Za-z0-9)\]"'’”]$/.test(l) ? `${l}.` : l)).join("\n").trim();
  // the added full stops must never push the text past the server's limit
  return ended.length <= LIMITS.situationMax ? ended : plain;
}

/** A role line without a leading "What I do now:" and without the next prompt line run into it. */
export function tidyRole(role: string): string {
  const t = role.replace(LEADING_PROMPT, "").replace(LATER_PROMPT, "").replace(/[.\s]+$/, "").trim();
  return t ? t[0].toUpperCase() + t.slice(1) : t;
}

/** A quote without a leading prompt label, for display ("What I do now: X" shows as "X"). Still verbatim. */
export function stripPrompt(text: string): string {
  return text.replace(LEADING_PROMPT, "").trim() || text;
}

/** True when a line starting with this prompt is already in the text. */
function hasPrompt(text: string, prompt: string): boolean {
  return text.split("\n").some((l) => l.trim().toLowerCase().startsWith(`${prompt.toLowerCase()}:`));
}

const noopSubscribe = () => () => {};
const isMacClient = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
const isMacServer = () => true;

export function SituationInput({
  value,
  onChange,
  onSubmit,
  autoFocus = false,
}: {
  value: string;
  onChange: (next: string) => void;
  /** Cmd or Ctrl + Enter; the page decides whether the text is long enough */
  onSubmit: () => void;
  autoFocus?: boolean;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const isMac = useSyncExternalStore(noopSubscribe, isMacClient, isMacServer);
  const length = cleanSituation(value).length;
  const short = length < LIMITS.situationMin;

  function placeCaret(at: number) {
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(at, at);
      el.scrollTop = el.scrollHeight;
    });
  }

  function startPrompt(prompt: string) {
    if (hasPrompt(value, prompt)) {
      // already started: put the caret at the end of that line, after a space
      const lines = value.split("\n");
      let at = 0;
      let i = 0;
      for (; i < lines.length; i++) {
        at += lines[i].length;
        if (lines[i].trim().toLowerCase().startsWith(`${prompt.toLowerCase()}:`)) break;
        at += 1;
      }
      if (i < lines.length && lines[i].endsWith(":")) {
        lines[i] = `${lines[i]} `;
        const next = lines.join("\n").slice(0, LIMITS.situationMax);
        onChange(next);
        placeCaret(Math.min(at + 1, next.length));
        return;
      }
      placeCaret(at);
      return;
    }
    // a prompt line nobody has written on yet keeps its space, so the caret
    // lands after "Label: " when they come back to it
    const last = value.split("\n").pop() ?? "";
    const base = EMPTY_PROMPT_LINE.test(last) ? value : value.replace(/[ \t]+$/, "");
    const sep = base.length === 0 || base.endsWith("\n") ? "" : "\n";
    const next = `${base}${sep}${prompt}: `.slice(0, LIMITS.situationMax);
    onChange(next);
    placeCaret(next.length);
  }

  return (
    <div>
      <label htmlFor="situation" className="sr-only">
        Your situation, in your own words
      </label>
      <textarea
        id="situation"
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            onSubmit();
          }
        }}
        placeholder={SITUATION_PLACEHOLDER}
        maxLength={LIMITS.situationMax}
        rows={7}
        autoFocus={autoFocus}
        aria-describedby="situation-count situation-privacy"
        className="block w-full min-h-[11.5rem] sm:min-h-[12.5rem] resize-y bg-card-alt rounded-2xl px-4 py-3.5 text-foreground placeholder:text-muted-2 text-base leading-relaxed outline-none border border-transparent focus:border-foreground focus-visible:outline-none transition-colors"
      />

      <div className="mt-2.5 flex items-center justify-between gap-4 mono-label text-[10px] uppercase tracking-[0.18em] text-muted-2">
        <span className="hidden sm:inline">{isMac ? "⌘" : "Ctrl"} + Enter to continue</span>
        <span id="situation-count" aria-live="polite" className="ml-auto tabular-nums">
          {short
            ? `${LIMITS.situationMin - length} more ${LIMITS.situationMin - length === 1 ? "character" : "characters"} to go`
            : `${length} / ${LIMITS.situationMax}`}
        </span>
      </div>

      <div className="mt-6">
        <div className="mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2">
          {"// Start a line"}
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5 sm:gap-2">
          {GUIDE_PROMPTS.map((p) => {
            const used = hasPrompt(value, p);
            const Icon = used ? Check : Plus;
            return (
              <motion.button
                key={p}
                type="button"
                onClick={() => startPrompt(p)}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.94 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className={`inline-flex items-center gap-1.5 min-h-10 rounded-full px-3 sm:px-3.5 py-2 text-sm border ${
                  used
                    ? "bg-card text-muted border-border-soft"
                    : "bg-card text-foreground border-border hover:border-foreground/30"
                }`}
              >
                <Icon aria-hidden className="w-3.5 h-3.5" />
                {p}
              </motion.button>
            );
          })}
        </div>
      </div>

      <p
        id="situation-privacy"
        className="mt-6 flex items-start gap-2 text-[12.5px] leading-relaxed text-muted-2"
      >
        <Lock aria-hidden className="w-3.5 h-3.5 mt-[3px] flex-shrink-0" />
        <span>
          This is sent to Anthropic&apos;s Claude to understand your situation. Leave out names and
          employers if you like.
        </span>
      </p>
    </div>
  );
}
