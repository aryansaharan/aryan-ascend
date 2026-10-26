import { COURSES } from "./courses";
import { MOVE_IDS, type Course, type MoveId } from "./course-types";

// The directions Ascend covers. Each one feeds a rule: anchors set the
// starting point, tieIns become the weekly "use it at work" lines, and the
// artifact is the plan's finish line. A move only ships when the catalog has
// at least MIN_ENTRIES courses for it.

export type Move = {
  id: MoveId;
  label: string;
  hint: string;
  anchors: [string, string, string];
  artifact: string;
  tieIns: [string, string, string, string];
  /** true for fast-moving fields: entries with updatedYear < 2024 are ruled out */
  recencySensitive: boolean;
};

export const MIN_ENTRIES = 5;

/** Year an entry must reach to count as current in a recency-sensitive move. */
export const RECENT_YEAR = 2024;

export const MOVES: Record<MoveId, Move> = {
  "ai-build": {
    id: "ai-build",
    label: "Build with AI",
    hint: "For engineers who want to ship features on top of LLMs.",
    anchors: [
      "I've used ChatGPT, never the API",
      "I've called an LLM API or built a demo",
      "I've shipped an LLM feature to users",
    ],
    artifact:
      "A small LLM feature from your own work, with a 20-case test sheet that shows where it fails.",
    tieIns: [
      "Pick one repetitive task at work and write down what an LLM would need to do it well.",
      "Try this week's idea on a real example from your work, with nothing sensitive in it.",
      "Write five test inputs for what you built and note which ones fail.",
      "Show one teammate what you built and write down their first question.",
    ],
    recencySensitive: true,
  },
  "ai-pm": {
    id: "ai-pm",
    label: "AI product management",
    hint: "For PMs and people near product who want to define, ship and judge AI features.",
    anchors: [
      "I use AI tools, I haven't specced an AI feature",
      "I've written a spec or run a pilot for an AI feature",
      "I own an AI feature in production",
    ],
    artifact:
      "A one-page spec for an AI feature in your product, with success measures and 20 test cases that show where it fails.",
    tieIns: [
      "List three places in your product where users wait on a person or a search. Pick one for an AI feature.",
      "Write five example inputs and the ideal output for each.",
      "Ask an engineer what would make that feature hard to build. Note the answer.",
      "Review one AI feature in a product you use and write down where it fails.",
    ],
    recencySensitive: true,
  },
  product: {
    id: "product",
    label: "Product management",
    hint: "Moving into product, or getting better at it.",
    anchors: [
      "I work near PMs, I haven't owned a roadmap",
      "I've owned features or a backlog",
      "I've been a PM for a year or more",
    ],
    artifact:
      "A one-page problem brief for a request your team ignored, with three pieces of customer evidence.",
    tieIns: [
      "Pick one request your team ignored and write who asked for it and why.",
      "Read five support tickets or talk to one user about it. Note what they actually need.",
      "Write the problem in one paragraph, with no solution in it.",
      "Share your write-up with one PM and ask what they would cut.",
    ],
    recencySensitive: false,
  },
  data: {
    id: "data",
    label: "Data analysis",
    hint: "From spreadsheets to SQL and dashboards, or deeper.",
    anchors: [
      "Spreadsheets, no SQL yet",
      "I can write a SQL join",
      "I build dashboards others rely on",
    ],
    artifact:
      "A dashboard on a public dataset, published with a short write-up of one finding.",
    tieIns: [
      "Pick one question your team asks every month and find where its data lives.",
      "Answer that question with this week's technique instead of your usual way.",
      "Write one finding in three sentences someone outside your team would understand.",
      "Show one colleague your result and note what they'd want to see next.",
    ],
    recencySensitive: false,
  },
  ux: {
    id: "ux",
    label: "UX design",
    hint: "Moving into UX or content design.",
    anchors: [
      "I haven't done design work",
      "I've done some design or research on the side",
      "I design at work",
    ],
    artifact:
      "One case study of a real flow you redesigned, with before, after and what you tested.",
    tieIns: [
      "Pick one flow that annoys you, at work or in an app you use. Screenshot each step.",
      "Watch one person use that flow and note where they hesitate.",
      "Sketch one change on paper, next to the before screenshot.",
      "Show your sketch to someone who uses the flow and note their first reaction.",
    ],
    recencySensitive: false,
  },
  lead: {
    id: "lead",
    label: "Lead a team",
    hint: "For people about to manage, or new to it.",
    anchors: [
      "I haven't managed anyone yet",
      "I lead projects or mentor people",
      "I manage people now",
    ],
    artifact:
      "A written one-to-one and feedback plan for your team, reviewed by your own manager.",
    tieIns: [
      "Write how you'd like your next one-to-one to go, in five lines.",
      "Ask one person on your team what they'd want more of from you.",
      "Give one piece of specific, kind feedback and note how it landed.",
      "Write your team's next 30 days on one page and share it with your manager.",
    ],
    recencySensitive: false,
  },
  growth: {
    id: "growth",
    label: "Growth marketing",
    hint: "From running channels to owning a growth number.",
    anchors: [
      "I haven't run a campaign or an experiment",
      "I run channels or campaigns",
      "I own a growth number",
    ],
    artifact:
      "A one-page growth model for your product, with one experiment you ran and what happened.",
    tieIns: [
      "Write down the one number your team is judged on and where it comes from.",
      "Try this week's idea on one live campaign or page, small enough to undo.",
      "Pull last month's funnel and mark the step where most people drop.",
      "Share one result with your manager in three sentences.",
    ],
    recencySensitive: false,
  },
  cloud: {
    id: "cloud",
    label: "Cloud and DevOps",
    hint: "For engineers who want to deploy, run and automate what they build.",
    anchors: [
      "I've never deployed anything myself",
      "I've deployed an app or written a Dockerfile",
      "I run production infrastructure",
    ],
    artifact:
      "One of your own apps running in a container, deployed by a pipeline, with its infrastructure written as code and a README.",
    tieIns: [
      "Find one manual step in how your team ships and write it down.",
      "Try this week's idea on a side project, never on production.",
      "Write a short runbook for one thing that broke recently.",
      "Show a teammate what you automated and ask what they'd add.",
    ],
    recencySensitive: false,
  },
};

/** Moves in display order. */
export const ALL_MOVES: Move[] = MOVE_IDS.map((id) => MOVES[id]);

export function isMoveId(value: unknown): value is MoveId {
  return (
    typeof value === "string" && (MOVE_IDS as readonly string[]).includes(value)
  );
}

export function moveById(id: MoveId): Move {
  return MOVES[id];
}

/** Catalog entries that list `move`, in catalog order. */
export function entriesFor(move: MoveId): Course[] {
  return COURSES.filter((c) => c.moves.some((m) => m.move === move));
}

/** Moves with at least MIN_ENTRIES catalog entries, in display order. */
export function availableMoves(): Move[] {
  return ALL_MOVES.filter((m) => entriesFor(m.id).length >= MIN_ENTRIES);
}

export function isAvailableMove(id: MoveId): boolean {
  return entriesFor(id).length >= MIN_ENTRIES;
}
