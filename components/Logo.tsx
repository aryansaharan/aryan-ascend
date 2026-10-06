import Link from "next/link";

/**
 * Ascend wordmark, linking home.
 * Serif italic "A" (Instrument Serif) + Inter "scend": pairs an editorial
 * accent letter with a clean sans body. The single italic letter gives the
 * wordmark personality without needing an SVG mark.
 */
export function Logo() {
  return (
    <Link href="/" className="inline-flex">
      <span className="inline-flex items-baseline">
        <span
          className="serif-italic text-[24px] leading-none text-foreground"
          aria-hidden
        >
          A
        </span>
        <span
          className="text-[16px] leading-none text-foreground font-medium tracking-tight ml-[1px]"
          aria-hidden
        >
          scend
        </span>
        <span className="sr-only">Ascend</span>
      </span>
    </Link>
  );
}
