// Small, stable string hash (djb2). Used for cache keys and the course
// outline fingerprint. Not for anything security related.

/** djb2 over the UTF-16 code units of `s`, as an unsigned 32-bit integer. */
export function djb2(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  }
  return h >>> 0;
}

/** djb2 as a fixed-width base36 string (7 chars covers every 32-bit value). */
export function djb2Key(s: string): string {
  return djb2(s).toString(36).padStart(7, "0");
}
