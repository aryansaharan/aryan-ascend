"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";
import { Card, SecondaryButton, SectionLabel } from "@/components/ui";
import { tellOnePerson, whatsAppUrl } from "@/lib/templates";
import { keepTimes } from "@/components/PlanWeeks";

// "Tell one person" on the plan (spec 3.5): one prefilled message with the
// session date, so someone asks how it went. Copy and WhatsApp only; Ascend
// never sends anything itself.

/**
 * Copies text to the clipboard. Falls back to a hidden textarea for browsers
 * without the Clipboard API, and finally to a prompt the user can copy from.
 * Resolves true when the text was copied without the prompt.
 */
export async function copyText(text: string, promptLabel = "Copy this:"): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API missing or blocked
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(ta);
  if (!ok) window.prompt(promptLabel, text);
  return ok;
}

/** A "Copied" flag that resets after two seconds. */
export function useCopied(): [boolean, (text: string, promptLabel?: string) => Promise<void>] {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  async function copy(text: string, promptLabel?: string) {
    const ok = await copyText(text, promptLabel);
    if (!ok) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 2000);
  }
  return [copied, copy];
}

export function TellOnePerson({ title, s }: { title: string; s: string }) {
  const message = tellOnePerson(title, s);
  const [copied, copy] = useCopied();
  return (
    <Card as="section" aria-labelledby="tell-one-person">
      <SectionLabel as="h2">
        <span id="tell-one-person">Tell one person</span>
      </SectionLabel>
      <p className="mt-1.5 text-[13px] leading-relaxed text-muted">One message, so someone asks you how it went.</p>
      <blockquote className="mt-4 rounded-xl bg-card-alt px-4 py-3.5 text-[14.5px] leading-relaxed text-foreground/90">
        {keepTimes(message)}
      </blockquote>
      <div className="mt-4 flex flex-wrap gap-2.5">
        <SecondaryButton onClick={() => void copy(message, "Copy your message:")} leadingIcon={copied ? Check : Copy}>
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </SecondaryButton>
        <SecondaryButton href={whatsAppUrl(message)} external leadingIcon={MessageCircle}>
          WhatsApp
        </SecondaryButton>
      </div>
    </Card>
  );
}
