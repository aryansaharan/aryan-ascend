"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

// Shared primitives in Ascend's existing visual language: cream page, white
// hairline cards with card-elev, black rounded-2xl buttons, JetBrains Mono
// micro-labels (uppercase only for short labels), Instrument Serif italic
// accents, easeOut
// [0.16, 1, 0.3, 1] and soft spring hovers. Every interactive element is at
// least 40px tall.

export const easeOut = [0.16, 1, 0.3, 1] as const;
export const spring = { type: "spring", stiffness: 300, damping: 25 } as const;

function cx(...parts: (string | false | null | undefined)[]): string {
  return parts.filter(Boolean).join(" ");
}

// Labels ---------------------------------------------------------------------

/**
 * Mono "// LABEL" eyebrow. `variant="strip"` is the small metadata strip
 * (header, pre-hero); `variant="section"` is the bolder section eyebrow, with
 * an optional hairline rule filling the row.
 */
export function Eyebrow({
  children,
  variant = "strip",
  rule = false,
  className,
}: {
  children: ReactNode;
  variant?: "strip" | "section";
  rule?: boolean;
  className?: string;
}) {
  const text =
    variant === "section"
      ? "mono-label text-[10px] sm:text-[11px] uppercase tracking-[0.28em] text-muted font-medium"
      : "mono-label text-[10px] uppercase tracking-[0.22em] text-muted-2";
  return (
    <div className={cx("flex items-baseline gap-3", className)}>
      <span className={text}>
        {"// "}
        {children}
      </span>
      {rule && <span aria-hidden className="flex-1 h-px bg-border-soft" />}
    </div>
  );
}

/**
 * The engine line under a pick or plan: mono, muted, sentence case, prefixed
 * with "// ". It carries whole sentences, so it never goes uppercase.
 */
export function EngineLine({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cx("mono-label text-[11px] leading-relaxed text-muted-2 text-pretty", className)}>
      {"// "}
      {children}
    </p>
  );
}

/** Small uppercase heading inside a card: "Why this one", "Before you start". */
export function SectionLabel({
  children,
  as: Tag = "h3",
  className,
}: {
  children: ReactNode;
  as?: "h2" | "h3" | "h4" | "dt" | "div";
  className?: string;
}) {
  return (
    <Tag className={cx("text-[11px] uppercase tracking-[0.16em] text-muted-2 font-medium", className)}>
      {children}
    </Tag>
  );
}

// Surfaces -------------------------------------------------------------------

/** White hairline card with the layered shadow. `hover` adds the richer hover shadow. */
export function Card<T extends ElementType = "div">({
  as,
  children,
  className,
  hover = false,
  padded = true,
  ...rest
}: {
  as?: T;
  children: ReactNode;
  className?: string;
  hover?: boolean;
  padded?: boolean;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">) {
  const Tag: ElementType = as ?? "div";
  return (
    <Tag
      className={cx(
        "bg-card border border-border-soft rounded-2xl card-elev",
        hover && "card-elev-hover",
        padded && "p-5 sm:p-6",
        className,
      )}
      {...rest}
    >
      {children}
    </Tag>
  );
}

/**
 * A visible fact, never a tooltip: "About 5 weeks at 3 hrs a week", "Free",
 * "Checked Oct 2026". `neutral` sits on cream tint; `muted` is an outline.
 */
export function FactChip({
  children,
  variant = "neutral",
  icon: Icon,
  className,
}: {
  children: ReactNode;
  variant?: "neutral" | "muted";
  icon?: LucideIcon;
  className?: string;
}) {
  return (
    <span
      className={cx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] leading-snug",
        variant === "neutral"
          ? "bg-card-alt text-foreground/85"
          : "border border-border-soft bg-card text-muted",
        className,
      )}
    >
      {Icon && <Icon aria-hidden className="w-3.5 h-3.5 flex-shrink-0" />}
      <span>{children}</span>
    </span>
  );
}

/** Small mono badge for kind and format: "COURSE", "SELF-PACED". */
export function Badge({ children, dark = false }: { children: ReactNode; dark?: boolean }) {
  return (
    <span
      className={cx(
        "mono-label inline-flex items-center rounded-full px-2.5 py-1 text-[10px] uppercase tracking-[0.18em]",
        dark ? "bg-foreground text-accent-fg" : "bg-card-alt border border-border-soft text-foreground/70",
      )}
    >
      {children}
    </span>
  );
}

// Buttons --------------------------------------------------------------------

type ButtonCommon = {
  children: ReactNode;
  className?: string;
  /** stretches to the container width */
  full?: boolean;
  /** trailing icon, e.g. ArrowRight */
  icon?: LucideIcon;
  /** leading icon */
  leadingIcon?: LucideIcon;
};

type AsLink = ButtonCommon & {
  href: string;
  /** opens in a new tab with rel="noreferrer" (for course and provider links) */
  external?: boolean;
  onClick?: () => void;
};

type AsButton = ButtonCommon & {
  href?: undefined;
  onClick?: () => void;
  type?: "button" | "submit";
  disabled?: boolean;
  "aria-pressed"?: boolean;
};

export type ButtonProps = AsLink | AsButton;

function ButtonBase({ base, props }: { base: string; props: ButtonProps }) {
  const { children, className, full, icon: Icon, leadingIcon: Lead } = props;
  const classes = cx(base, full && "w-full", className);
  const inner = (
    <>
      {Lead && <Lead aria-hidden className="w-4 h-4" />}
      {children}
      {Icon && <Icon aria-hidden className="w-4 h-4" />}
    </>
  );
  let el: ReactNode;
  if (props.href !== undefined) {
    el = props.external ? (
      <a href={props.href} target="_blank" rel="noreferrer" onClick={props.onClick} className={classes}>
        {inner}
      </a>
    ) : (
      <Link href={props.href} onClick={props.onClick} className={classes}>
        {inner}
      </Link>
    );
  } else {
    el = (
      <button
        type={props.type ?? "button"}
        onClick={props.onClick}
        disabled={props.disabled}
        aria-pressed={props["aria-pressed"]}
        className={classes}
      >
        {inner}
      </button>
    );
  }
  const disabled = props.href === undefined && props.disabled;
  return (
    <motion.div
      whileHover={disabled ? undefined : { scale: 1.005 }}
      whileTap={disabled ? undefined : { scale: 0.985 }}
      transition={spring}
      className={cx("relative", full ? "w-full" : "inline-flex")}
    >
      {el}
    </motion.div>
  );
}

/** The black pill: "Find my course", "Book my first session". Link when `href` is set. */
export function PrimaryButton(props: ButtonProps) {
  return (
    <ButtonBase
      props={props}
      base="inline-flex items-center justify-center gap-2 min-h-11 bg-foreground text-accent-fg rounded-2xl py-3.5 px-6 font-medium text-[15px] shadow-[0_10px_30px_-12px_rgba(10,10,10,0.45)] disabled:opacity-25 disabled:cursor-not-allowed transition-opacity"
    />
  );
}

/** The outline button: "Compare side by side", "Copy plan link". */
export function SecondaryButton(props: ButtonProps) {
  return (
    <ButtonBase
      props={props}
      base="inline-flex items-center justify-center gap-2 min-h-11 rounded-2xl border border-border bg-card py-3 px-5 font-medium text-[14px] text-foreground hover:border-foreground/30 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
    />
  );
}

/**
 * Quiet text link ("Edit answers", "Use my own answers", "Reset"). Its hit
 * area is padded (40px tall, wider on both sides) without moving the text or
 * changing the line it sits in.
 */
export function TextLink({
  children,
  href,
  onClick,
  external = false,
  className,
}: {
  children: ReactNode;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  className?: string;
}) {
  const classes = cx(
    "inline-flex items-center gap-1 py-2.5 -my-2.5 px-2 -mx-2 text-[13px] text-muted underline decoration-border underline-offset-4 hover:text-foreground hover:decoration-foreground/40",
    className,
  );
  if (href === undefined) {
    return (
      <button type="button" onClick={onClick} className={classes}>
        {children}
      </button>
    );
  }
  if (external || href.startsWith("mailto:") || /^https?:/.test(href)) {
    return (
      <a
        href={href}
        onClick={onClick}
        className={classes}
        {...(external ? { target: "_blank", rel: "noreferrer" } : {})}
      >
        {children}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick} className={classes}>
      {children}
    </Link>
  );
}

/**
 * Toggle chip for adjust chips, booking day and time, obstacles. Black when
 * pressed, hairline outline otherwise; 40px tall.
 */
export function ToggleChip({
  pressed,
  onClick,
  children,
  disabled = false,
  className,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <motion.button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      whileHover={disabled ? undefined : { y: -1 }}
      whileTap={disabled ? undefined : { scale: 0.96 }}
      transition={{ type: "spring", stiffness: 500, damping: 20 }}
      className={cx(
        "inline-flex items-center justify-center min-h-10 rounded-full px-4 text-[14px] border transition-opacity",
        pressed
          ? "bg-foreground text-accent-fg border-foreground"
          : "bg-card text-foreground border-border hover:border-foreground/30",
        disabled && "opacity-35 cursor-not-allowed",
        className,
      )}
    >
      {children}
    </motion.button>
  );
}

// Small motion bits ------------------------------------------------------------

/** The blinking caret from the original streaming UI. Still under reduced motion. */
export function BlinkCaret() {
  const reduced = useReducedMotion();
  const cls = "inline-block w-[2px] h-[1em] translate-y-[2px] ml-0.5 bg-foreground/70";
  if (reduced) return <span aria-hidden className={cls} />;
  return (
    <motion.span
      aria-hidden
      animate={{ opacity: [1, 0.15, 1] }}
      transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
      className={cls}
    />
  );
}

/** Placeholder bar for skeleton cards. */
export function SkeletonLine({ className }: { className?: string }) {
  return <span aria-hidden className={cx("block h-3 rounded-full bg-card-alt animate-pulse", className)} />;
}

/** Fade-and-rise wrapper with the house easing. Fade only under reduced motion. */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial={{ opacity: 0, y: reduced ? 0 : 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: easeOut }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
