import Link from "next/link";

/**
 * Ascend wordmark.
 * Serif italic "A" (Instrument Serif) + Inter "scend": pairs an editorial
 * accent letter with a clean sans body. The single italic letter gives the
 * wordmark personality without needing an SVG mark.
 */
export function Logo({
  size = "md",
  asLink = true,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  asLink?: boolean;
  className?: string;
}) {
  const sizes = {
    sm: { a: "text-[20px]", rest: "text-[14px]" },
    md: { a: "text-[24px]", rest: "text-[16px]" },
    lg: { a: "text-[32px]", rest: "text-[20px]" },
  } as const;
  const s = sizes[size];

  const inner = (
    <span className={`inline-flex items-baseline ${className}`}>
      <span
        className={`serif-italic ${s.a} leading-none text-foreground`}
        aria-hidden
      >
        A
      </span>
      <span
        className={`${s.rest} leading-none text-foreground font-medium tracking-tight ml-[1px]`}
        aria-hidden
      >
        scend
      </span>
      <span className="sr-only">Ascend</span>
    </span>
  );

  if (!asLink) return inner;
  return (
    <Link href="/" className="inline-flex">
      {inner}
    </Link>
  );
}
