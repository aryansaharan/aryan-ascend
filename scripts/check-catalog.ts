// Catalog checker (spec 6.7). Run with `npm run check:catalog` before each deploy.
//
// Fetches every course url, free-start url and source with a desktop Chrome
// user agent and a 20 second timeout, then prints one row per course.
// Errors (exit 1): 404 or 410; a redirect to "/" or to another host's root;
// a duplicate id. Warnings: 403, 429 or 202 bot walls (unverified); a page
// title sharing under half the catalog title's words; any of the first three
// module names missing from the sources' text; lastVerified over 90 days old;
// a move under MIN_ENTRIES. Also errors, offline: the data rules in
// scripts/catalog-rules.ts (Coursera prices stored for India, `requires` set
// when `assumes` names Python).

import { COURSE_SOURCES } from "../lib/course-sources";
import { COURSES } from "../lib/courses";
import { isStale } from "../lib/format";
import { ALL_MOVES, MIN_ENTRIES, entriesFor } from "../lib/moves";
import { catalogDataProblems } from "./catalog-rules";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";
const TIMEOUT_MS = 20_000;
const CONCURRENCY = 6;

type Fetched = {
  url: string;
  status: number | null;
  finalUrl: string;
  title: string;
  text: string;
  error?: string;
};

async function fetchPage(url: string): Promise<Fetched> {
  try {
    const res = await fetch(url, {
      redirect: "follow",
      headers: { "user-agent": UA, accept: "text/html,application/xhtml+xml" },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const html = res.headers.get("content-type")?.includes("html") ? await res.text() : "";
    const title = (/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? "").replace(/\s+/g, " ").trim();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#39;|&rsquo;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/\s+/g, " ")
      .toLowerCase();
    return { url, status: res.status, finalUrl: res.url || url, title, text };
  } catch (err) {
    return { url, status: null, finalUrl: url, title: "", text: "", error: String((err as Error).name ?? err) };
  }
}

async function fetchAll(urls: string[]): Promise<Map<string, Fetched>> {
  const out = new Map<string, Fetched>();
  const queue = [...new Set(urls)];
  async function worker() {
    for (;;) {
      const url = queue.shift();
      if (!url) return;
      out.set(url, await fetchPage(url));
    }
  }
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  return out;
}

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 3 && !["the", "and", "for", "with", "your"].includes(t)),
  );
}

function overlap(catalogTitle: string, pageTitle: string): number {
  const want = tokens(catalogTitle);
  if (want.size === 0) return 1;
  const have = tokens(pageTitle);
  let hit = 0;
  for (const t of want) if (have.has(t)) hit++;
  return hit / want.size;
}

function norm(s: string): string {
  return s.toLowerCase().replace(/&/g, "and").replace(/[^a-z0-9]+/g, " ").trim();
}

/** Error for a homepage redirect: the final path is "/" but the original wasn't. */
function homepageRedirect(f: Fetched): boolean {
  try {
    const from = new URL(f.url);
    const to = new URL(f.finalUrl);
    return to.pathname === "/" && from.pathname !== "/" && (to.host !== from.host || to.href !== from.href);
  } catch {
    return false;
  }
}

function statusNote(f: Fetched): { level: "ok" | "warn" | "error"; note: string } {
  if (f.status === null) return { level: "warn", note: `unreachable (${f.error ?? "error"})` };
  if (f.status === 404 || f.status === 410) return { level: "error", note: String(f.status) };
  if (homepageRedirect(f)) return { level: "error", note: `redirects to ${f.finalUrl}` };
  if ([403, 429, 202].includes(f.status)) return { level: "warn", note: `${f.status} unverified` };
  if (f.status >= 400) return { level: "warn", note: String(f.status) };
  return { level: "ok", note: String(f.status) };
}

async function main() {
  const errors: string[] = [];
  const warnings: string[] = [];

  const seen = new Set<string>();
  for (const c of COURSES) {
    if (seen.has(c.id)) errors.push(`${c.id}: duplicate id`);
    seen.add(c.id);
  }
  // data rules that need no network: region of Coursera prices, Python prerequisites
  errors.push(...catalogDataProblems(COURSES));
  for (const m of ALL_MOVES) {
    const n = entriesFor(m.id).length;
    if (n < MIN_ENTRIES) warnings.push(`move ${m.id}: ${n} entries, under ${MIN_ENTRIES}, hidden`);
  }

  const sourcesOf = (id: string) => COURSE_SOURCES[id] ?? [];
  for (const c of COURSES) if (sourcesOf(c.id).length === 0) errors.push(`${c.id}: no sources in lib/course-sources.ts`);
  const urls = COURSES.flatMap((c) => [c.url, ...(c.freeStart ? [c.freeStart.url] : []), ...sourcesOf(c.id)]);
  console.log(`Fetching ${new Set(urls).size} URLs for ${COURSES.length} entries...`);
  const pages = await fetchAll(urls);

  const rows: string[][] = [];
  for (const c of COURSES) {
    const page = pages.get(c.url) as Fetched;
    const st = statusNote(page);
    const notes: string[] = [];
    if (st.level === "error") errors.push(`${c.id}: url ${st.note}`);
    if (st.level === "warn") notes.push(`url ${st.note}`);

    if (c.freeStart) {
      const fs = statusNote(pages.get(c.freeStart.url) as Fetched);
      if (fs.level === "error") errors.push(`${c.id}: freeStart ${fs.note}`);
      if (fs.level === "warn") notes.push(`freeStart ${fs.note}`);
    }
    for (const src of sourcesOf(c.id)) {
      if (src === c.url) continue;
      const ss = statusNote(pages.get(src) as Fetched);
      if (ss.level === "error") errors.push(`${c.id}: source ${src} ${ss.note}`);
      if (ss.level === "warn") notes.push(`source ${ss.note}`);
    }

    const ov = page.title ? overlap(c.title, page.title) : null;
    if (st.level === "ok" && ov !== null && ov < 0.5) {
      notes.push(`title "${page.title.slice(0, 60)}" shares ${Math.round(ov * 100)}%`);
    }

    const sourceText = sourcesOf(c.id).map((s) => norm(pages.get(s)?.text ?? "")).join(" ");
    const firstThree = c.modules.slice(0, 3).map((m) => m.name);
    const missing = sourceText ? firstThree.filter((n) => !sourceText.includes(norm(n))) : firstThree;
    if (missing.length) notes.push(`modules not found in sources: ${missing.length} of ${firstThree.length}`);

    if (isStale(c.lastVerified)) notes.push(`lastVerified ${c.lastVerified} is over 90 days old`);

    for (const n of notes) warnings.push(`${c.id}: ${n}`);
    rows.push([
      c.id,
      st.note,
      ov === null ? "no title" : `${Math.round(ov * 100)}%`,
      `${firstThree.length - missing.length}/${firstThree.length}`,
      notes.length ? `${notes.length} warning${notes.length === 1 ? "" : "s"}` : "",
    ]);
  }

  const header = ["id", "url", "title match", "modules", "notes"];
  const widths = header.map((h, i) => Math.max(h.length, ...rows.map((r) => r[i].length)));
  const line = (r: string[]) => r.map((v, i) => v.padEnd(widths[i])).join("  ");
  console.log(`\n${line(header)}`);
  console.log(widths.map((w) => "=".repeat(w)).join("  "));
  for (const r of rows) console.log(line(r));

  if (warnings.length) {
    console.log(`\nWarnings (${warnings.length}):`);
    for (const w of warnings) console.log(`  ${w}`);
  }
  if (errors.length) {
    console.log(`\nErrors (${errors.length}):`);
    for (const e of errors) console.log(`  ${e}`);
    process.exit(1);
  }
  console.log(`\nNo errors. ${warnings.length} warnings.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
