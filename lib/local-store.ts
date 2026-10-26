// localStorage with an in-memory fallback. Browsers that block storage
// (cookies off, some private modes) throw on every call; without a fallback
// the answers saved on /assess vanish before /recommendations reads them and
// the flow loops back to step 1. The memory copy lives as long as the tab's
// JavaScript does, which covers a whole session of client-side navigation.
// Catalog-free on purpose: the landing imports it through lib/session.

const memory = new Map<string, string>();

function storage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Reads a key; a value only memory holds (storage refused it) wins. */
export function localGet(key: string): string | null {
  if (memory.has(key)) return memory.get(key) as string;
  try {
    return storage()?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

/** Writes a key, falling back to memory when storage refuses. Returns true when storage kept it. */
export function localSet(key: string, value: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const s = storage();
    if (!s) throw new Error("storage blocked");
    s.setItem(key, value);
    memory.delete(key);
    return true;
  } catch {
    memory.set(key, value);
    return false;
  }
}

export function localRemove(key: string): void {
  memory.delete(key);
  try {
    storage()?.removeItem(key);
  } catch {
    // blocked: memory is already clear
  }
}

/** sessionStorage remove that never throws. */
export function sessionRemove(key: string): void {
  if (typeof window === "undefined") return;
  try {
    window.sessionStorage.removeItem(key);
  } catch {
    // blocked
  }
}
