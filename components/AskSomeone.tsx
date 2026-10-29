"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, Copy, MessageCircle, Search } from "lucide-react";
import { askSomeoneMessage, linkedInSearchUrl, whatsAppUrl } from "@/lib/templates";
import { Presence } from "@/components/Presence";
import { Card, SecondaryButton, SectionLabel, ToggleChip } from "@/components/ui";
import { fadeUp, leave } from "@/lib/motion";

// "Ask someone who took it" (spec 3.4). Real peer signal instead of reviews:
// a prefilled message the user can edit, copy or send, and a LinkedIn people
// search for the course title. Ascend never writes, stores or filters what
// comes back.

export type AskCourse = { id: string; title: string };

function prefilled(title: string, role: string, hours: number): string {
  return askSomeoneMessage(title, role, hours);
}

async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // fall through to the textarea fallback
  }
  try {
    const el = document.createElement("textarea");
    el.value = text;
    el.setAttribute("readonly", "");
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

export function AskSomeone({
  courses,
  role,
  hoursPerWeek,
  className,
}: {
  /** the compared courses, pick first */
  courses: AskCourse[];
  /** the role line from the profile */
  role: string;
  hoursPerWeek: number;
  className?: string;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<"ok" | "failed" | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const box = useRef<HTMLTextAreaElement | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const course = courses.find((c) => c.id === selectedId) ?? courses[0];
  const message = course ? (edits[course.id] ?? prefilled(course.title, role, hoursPerWeek)) : "";

  // The message box grows with its text, so the whole message shows on a phone.
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [message]);

  if (!course) return null;
  const sendable = message.trim().length > 0;

  function choose(id: string) {
    setSelectedId(id);
    setCopied(null);
  }

  async function onCopy() {
    const ok = await copyText(message);
    setCopied(ok ? "ok" : "failed");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(null), 2400);
  }

  return (
    <Card as="section" aria-labelledby="ask-someone-title" className={className}>
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-10">
        <div className="min-w-0">
          <SectionLabel as="h2">
            <span id="ask-someone-title">Ask someone who took it</span>
          </SectionLabel>
          <p className="mt-2 text-[14px] leading-relaxed text-muted max-w-[52ch]">
            A short answer from someone who did the course. Send this to anyone you know who took
            it, or find people who list it on LinkedIn.
          </p>

          {courses.length > 1 && (
            <div className="mt-5" role="group" aria-label="Which course to ask about">
              <p className="mb-2.5 text-[12px] text-muted-2">Ask about</p>
              <div className="flex flex-wrap gap-2">
                {courses.map((c) => (
                  <ToggleChip
                    key={c.id}
                    pressed={c.id === course.id}
                    onClick={() => choose(c.id)}
                    className="max-w-full min-w-0 text-left"
                  >
                    <span className="truncate">{c.title}</span>
                  </ToggleChip>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="min-w-0">
          <label htmlFor="ask-someone-message" className="sr-only">
            Message about {course.title}
          </label>
          <textarea
            id="ask-someone-message"
            ref={box}
            value={message}
            onChange={(e) => {
              const value = e.target.value;
              setEdits((prev) => ({ ...prev, [course.id]: value }));
            }}
            rows={4}
            maxLength={600}
            className="block w-full resize-none rounded-xl border border-border-soft bg-card-alt px-4 py-3.5 text-base sm:text-[15px] leading-relaxed text-foreground/90 outline-none focus:border-foreground/40 transition-colors"
          />
          <p className="mt-2 text-[12px] text-muted-2">You can edit it before you send it.</p>

          <div className="mt-4 flex flex-col sm:flex-row sm:flex-wrap sm:items-start gap-2.5">
            <SecondaryButton
              onClick={onCopy}
              disabled={!sendable}
              leadingIcon={copied === "ok" ? Check : Copy}
              className="w-full sm:w-auto"
            >
              {copied === "ok" ? "Copied" : copied === "failed" ? "Couldn't copy" : "Copy"}
            </SecondaryButton>
            <SecondaryButton
              href={whatsAppUrl(message)}
              external
              leadingIcon={MessageCircle}
              className="w-full sm:w-auto"
            >
              WhatsApp
            </SecondaryButton>
            <div className="flex flex-col gap-1.5">
              <SecondaryButton
                href={linkedInSearchUrl(course.title)}
                external
                leadingIcon={Search}
                className="w-full sm:w-auto"
              >
                <span className="sm:hidden">Find people on LinkedIn</span>
                <span className="hidden sm:inline">Search LinkedIn for people who list it</span>
              </SecondaryButton>
              <span className="text-[12px] text-muted-2 text-center sm:text-left sm:pl-1">
                Needs a LinkedIn login
              </span>
            </div>
          </div>

          <span aria-live="polite" className="sr-only">
            {copied === "ok" ? "Message copied" : copied === "failed" ? "Couldn't copy the message" : ""}
          </span>

          <Presence
            id={copied === "failed" ? "failed" : null}
            enter="fade-up"
            exit="fade-out"
            initial={false}
            style={{ ...fadeUp(-4, 0.3), ...leave(0, 0.3) }}
          >
            <p className="mt-3 text-[12px] text-muted">
              This browser blocked copying. Select the message above and copy it yourself.
            </p>
          </Presence>
        </div>
      </div>

      <p className="mt-6 pt-4 border-t border-border-soft text-[12px] leading-relaxed text-muted-2">
        Ascend doesn&apos;t write or filter reviews. These links go to pages it doesn&apos;t control.
      </p>
    </Card>
  );
}
