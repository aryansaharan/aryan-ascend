import { COURSES, CATALOG_VERSION } from "./courses";
import type { Course } from "./course-types";

// Lookups over the catalog. Pure, shared by server, client and scripts.

const BY_ID: ReadonlyMap<string, Course> = new Map(COURSES.map((c) => [c.id, c]));

export function courseById(id: string): Course | undefined {
  return BY_ID.get(id);
}

export function hasCourse(id: string): boolean {
  return BY_ID.has(id);
}

/** Every catalog id, in catalog order. */
export const COURSE_IDS: readonly string[] = COURSES.map((c) => c.id);

/** Unique providers, most entries first, then by name (landing "Courses from"). */
export function catalogProviders(): string[] {
  const counts = new Map<string, number>();
  for (const c of COURSES) counts.set(c.provider, (counts.get(c.provider) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name]) => name);
}

/** Every course title with its id, sorted by title (the "another course" type-ahead). */
export function catalogTitles(): { id: string; title: string; provider: string }[] {
  return COURSES.map((c) => ({ id: c.id, title: c.title, provider: c.provider })).sort(
    (a, b) => a.title.localeCompare(b.title),
  );
}

export { CATALOG_VERSION };
