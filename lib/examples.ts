import type { Budget, Hours, ProfileV2 } from "./profile";

// "Try it with example answers" (addendum-ai). Three situations written the
// way a real person would, with preset hours and budget. Nothing about the
// understanding is baked in: choosing one runs the real understand and pick
// calls (the server caches them, so repeat clicks are cheap). No course ids.

export type ExampleProfile = {
  id: string;
  label: string;
  situation: string;
  hoursPerWeek: Hours;
  budget: Budget;
};

export const EXAMPLES: ExampleProfile[] = [
  {
    id: "frontend-ai",
    label: "Frontend engineer moving into AI",
    situation:
      "Frontend engineer at a fintech startup, 2 years in React and TypeScript. I want to build AI features, not just call them from the UI. I've played with the OpenAI playground but never shipped anything. I have Andrew Ng's Machine Learning Specialization open in a tab.",
    hoursPerWeek: 3,
    budget: "low",
  },
  {
    id: "csm-product",
    label: "Customer success manager moving into product",
    situation:
      "Customer success manager at a B2B SaaS company, 3 years. I log feature requests that mostly get ignored, and I want to move into product. I know basic SQL. I started the Google Project Management certificate and dropped it after a month.",
    hoursPerWeek: 3,
    budget: "free",
  },
  {
    id: "hr-data",
    label: "HR generalist learning data",
    situation:
      "HR generalist, 4 years. I live in Excel and our HRIS and I want to answer attrition questions properly instead of guessing. Never written SQL. Someone suggested the Google Data Analytics certificate.",
    hoursPerWeek: 1,
    budget: "free",
  },
];

/** All three; the move comes from the understand call, so none is hidden in advance. */
export function availableExamples(): ExampleProfile[] {
  return EXAMPLES;
}

/** Matches a profile to its example by situation text, for the "// EXAMPLE ANSWERS · {label}" tag. */
export function exampleFor(profile: Pick<ProfileV2, "situation">): ExampleProfile | null {
  const s = profile.situation.trim();
  return EXAMPLES.find((e) => e.situation === s) ?? null;
}

export function exampleById(id: string | null | undefined): ExampleProfile | null {
  return EXAMPLES.find((e) => e.id === id) ?? null;
}
