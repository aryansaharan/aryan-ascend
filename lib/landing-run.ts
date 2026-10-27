// What each AI job returned for the landing's example person (the customer
// success manager from the example answers), copied word for word from a real
// Claude Opus 5.5 run on 26 Oct 2026 (ascend-notes/live/ex2-*): the verdict
// reason and the week 1 task exactly as the page showed them. "Different
// direction." is the verdict's label, shown before its reason. Pure data, so
// scripts/eval.ts can check that every course and module named here is in
// the catalog.

export const JOB_RUN = {
  date: "26 Oct 2026",
  model: "claude-opus-5-5",
  courseId: "pendo-product-judgment",
  read: {
    wrote: "I log feature requests that mostly get ignored, and I want to move into product.",
    read: "Product management. Strength: collects feature requests. First gap: prioritization.",
  },
  match: { gap: "Prioritization", module: "Habit 3: Pick What Matters", course: "Product Judgment" },
  verdict: {
    wrote: "I started the Google Project Management certificate and dropped it after a month.",
    said: "Different direction. Project management is about running delivery schedules, not deciding what to build, so it sits beside your product direction.",
  },
  task: {
    module: "Habit 2: Find the Real Problem",
    task: 'Pick one ignored feature request from your log, use "Habit 2: Find the Real Problem" to name the problem behind it, and draft a short note with three customer quotes.',
  },
} as const;
