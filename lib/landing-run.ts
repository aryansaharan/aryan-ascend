// What each AI job returned for the landing's example person (the customer
// success manager from the example answers), copied word for word from a real
// Claude Opus 5.5 run. Pure data, so scripts/eval.ts can check that every
// course and module named here is in the catalog.

export const JOB_RUN = {
  date: "26 Oct 2026",
  courseId: "pendo-product-judgment",
  read: {
    wrote: "I log feature requests that mostly get ignored, and I want to move into product.",
    read: "Product management. Strength: collects feature requests. First gap: prioritization.",
  },
  match: { gap: "Prioritization", module: "Habit 3: Pick What Matters", course: "Product Judgment" },
  verdict: {
    wrote: "I started the Google Project Management certificate and dropped it after a month.",
    said: "Different direction. Project management is about running delivery, not deciding what to build, so it sits off your product direction.",
  },
  task: {
    module: "Habit 2: Find the Real Problem",
    task: "Pick one ignored feature request from your log, use “Habit 2: Find the Real Problem” to name the problem behind it, and draft a short note with three customer quotes.",
  },
} as const;
