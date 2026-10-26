import type { Course, MoveId } from "./course-types";

// The skill vocabulary (addendum-ai). About nine skills per move, each with
// keywords that tend to appear in real module names. The AI names a person's
// gaps from this list only (a per-request enum), and the rules engine uses the
// keywords to match gaps to modules when the AI is unavailable. Pure, shared by
// server, client and scripts.

export type Depth = "direct" | "partial";

/**
 * One gap matched to modules of one course. `gap` is the index into the
 * profile's ranked gaps, `modules` are indices into the course's modules (only
 * modules in scope), sorted.
 */
export type GapMatch = { gap: number; modules: number[]; depth: Depth };

export type Skill = {
  id: string;
  label: string;
  /** lowercase; a module name containing one at a word start is a direct match */
  keywords: readonly string[];
  /** lowercase; a match here only counts as partial */
  related: readonly string[];
};

const VOCABULARY = {
  "ai-build": [
    {
      id: "llm-apis",
      label: "Calling LLM APIs",
      keywords: ["api", "apis", "sdk", "claude platform", "llm-powered", "openai", "building with claude"],
      related: ["large language model", "platform", "features of claude"],
    },
    {
      id: "prompting",
      label: "Prompt design",
      keywords: ["prompt", "guidelines", "iterative", "summariz", "inferring", "transforming", "expanding"],
      related: ["teaching your agent", "chatbot", "description"],
    },
    {
      id: "rag",
      label: "Retrieval (RAG)",
      keywords: ["rag", "retrieval", "vector", "embedding", "semantic search"],
      related: ["llamaindex", "search", "context"],
    },
    {
      id: "evals",
      label: "Evaluating outputs",
      keywords: ["eval", "evaluat", "error analysis", "llm-as-a-judge", "judge", "trajectory"],
      related: ["test", "tracing", "measuring"],
    },
    {
      id: "agents",
      label: "Agents and tool use",
      keywords: ["agent", "agentic", "tool use", "smolagents", "langgraph", "model context protocol", "mcp"],
      related: ["tool", "workflow", "reflection", "router"],
    },
    {
      id: "fine-tuning",
      label: "Fine-tuning",
      keywords: ["fine-tun", "finetun", "tuning", "reinforcement learning"],
      related: ["dataset engineering", "training", "pre-training", "synthetic data"],
    },
    {
      id: "ml-basics",
      label: "ML fundamentals",
      keywords: ["machine learning", "regression", "classification", "neural", "overfitting", "deep learning"],
      related: ["embeddings", "datasets", "transformer", "numerical data"],
    },
    {
      id: "python-ai",
      label: "Python for AI",
      keywords: ["python", "numpy", "pandas", "notebook", "jupyter"],
      related: ["code", "library", "framework"],
    },
    {
      id: "shipping-ai",
      label: "Shipping AI features",
      keywords: ["production", "deploy", "inference", "architecture", "ci/cd", "monitoring", "final project"],
      related: ["user feedback", "cost", "managed agents", "practical tips", "optimization"],
    },
  ],
  "ai-pm": [
    {
      id: "llm-basics",
      label: "How LLMs work",
      keywords: ["large language model", "llm", "foundation model", "generative ai", "language model"],
      related: ["neural", "embeddings", "machine learning", "essential ai"],
    },
    {
      id: "ai-use-cases",
      label: "Finding AI use cases",
      keywords: ["use case", "problem framing", "ideation", "opportunit", "framing"],
      related: ["delegation", "strategic thinking", "role of ai product", "tools for product"],
    },
    {
      id: "ai-specs",
      label: "Specifying AI features",
      keywords: ["prd", "spec", "requirements", "product development lifecycle", "roadmap"],
      related: ["planning", "description", "lifecycle"],
    },
    {
      id: "ai-evals",
      label: "Judging AI quality",
      keywords: ["eval", "evaluat", "error analysis", "judge", "discernment", "trace"],
      related: ["quality", "testing", "accuracy", "measuring with"],
    },
    {
      id: "data-for-ai",
      label: "Data for AI",
      keywords: ["dataset", "synthetic data", "training data", "labeling", "data engineering"],
      related: ["data", "numerical", "categorical"],
    },
    {
      id: "ai-ux",
      label: "Designing AI experiences",
      keywords: ["user feedback", "user experience", "interface", "human-ai", "ux"],
      related: ["design", "trust", "description-discernment", "day-to-day"],
    },
    {
      id: "ai-risk",
      label: "Risk and responsible AI",
      keywords: ["fairness", "safety", "adversarial", "responsible", "ethic", "risk"],
      related: ["diligence", "global considerations", "compliance"],
    },
    {
      id: "ai-metrics",
      label: "Measuring AI impact",
      keywords: ["measur", "metric", "success", "okr", "impact"],
      related: ["goals", "cost", "improving"],
    },
    {
      id: "with-ml-teams",
      label: "Working with ML engineers",
      keywords: ["ml engineer", "managing ml", "ml projects", "experiments to production", "production ml"],
      related: ["team", "day-to-day", "automl", "planning"],
    },
  ],
  product: [
    {
      id: "discovery",
      label: "Problem discovery",
      keywords: ["discovery", "problem", "opportunit", "assumption", "signal", "jtbd"],
      related: ["value hypothesis", "new product idea", "market", "outcomes"],
    },
    {
      id: "user-research",
      label: "Talking to users",
      keywords: ["interview", "user insight", "customer", "user research", "talking to users"],
      related: ["users", "research", "feedback"],
    },
    {
      id: "prioritization",
      label: "Prioritization",
      keywords: ["prioriti", "pick what matters", "betting", "bets", "decision making", "make the call"],
      related: ["focus", "trade-off", "potential of new functionality"],
    },
    {
      id: "specs",
      label: "Writing specs",
      keywords: ["spec", "pitch", "prd", "requirements", "shaping", "set boundaries"],
      related: ["roadmap", "framing", "elements", "rabbit holes"],
    },
    {
      id: "metrics",
      label: "Product metrics",
      keywords: ["metric", "analytics", "cohort", "dashboard", "measur", "statistical"],
      related: ["retention", "outcomes", "data"],
    },
    {
      id: "strategy",
      label: "Product strategy",
      keywords: ["strategy", "vision", "strategic", "competitor", "market leader"],
      related: ["market", "okr", "winning", "transformation"],
    },
    {
      id: "with-engineers",
      label: "Working with engineers",
      keywords: ["engineer", "execution", "hand over", "get one piece done", "team topology", "scopes"],
      related: ["building", "process", "delivery", "launch"],
    },
    {
      id: "stakeholders",
      label: "Stakeholder communication",
      keywords: ["stakeholder", "evangelism", "business collaboration", "communicat", "people skills"],
      related: ["leadership", "coaching", "culture", "show progress"],
    },
    {
      id: "experiments",
      label: "Experiments",
      keywords: ["experiment", "a/b", "testing", "prototyp", "hypothes"],
      related: ["test", "launch", "assumption", "significance"],
    },
  ],
  data: [
    {
      id: "spreadsheets",
      label: "Spreadsheet analysis",
      keywords: ["spreadsheet", "excel", "sheets", "pivot", "formula", "vlookup"],
      related: ["toolbox", "cleaning", "analytical thinking"],
    },
    {
      id: "sql",
      label: "SQL",
      // "select," (with its comma) is the SQL clause list "Select, From & Where"; bare
      // "select" also matched Pandas' "Indexing, Selecting & Assigning"
      keywords: ["sql", "query", "queries", "join", "select,", "group by", "order by", "bigquery"],
      related: ["having", "as & with", "where"],
    },
    {
      id: "sql-advanced",
      label: "Advanced SQL",
      keywords: ["advanced sql", "analytic functions", "window function", "nested", "efficient queries", "union", "subquer"],
      related: ["repeated data", "cte", "performance"],
    },
    {
      id: "python-data",
      label: "Python for data",
      keywords: ["python", "pandas", "numpy", "dataframe", "missing values", "grouping and sorting"],
      related: ["indexing", "functions and packages", "lists", "summary functions"],
    },
    {
      id: "dashboards",
      label: "Dashboards and charts",
      // tool names alone ("tableau", "power bi") belong to bi-tools: "The Tableau Data Model" is not about charts
      keywords: ["dashboard", "visual", "chart", "data presentation", "building with power bi"],
      related: ["report", "seaborn", "presentation", "clutter"],
    },
    {
      id: "statistics",
      label: "Statistics",
      keywords: ["statistic", "hypothesis", "sampling", "probability", "significance", "distribution"],
      related: ["regression", "summary functions"],
    },
    {
      id: "storytelling",
      label: "Explaining findings",
      keywords: ["story", "audience", "insight", "context", "lessons in storytelling"],
      related: ["presentation", "clutter", "think like a designer", "case studies"],
    },
    {
      id: "data-modeling",
      label: "Data modeling",
      keywords: ["models", "modeling", "data model", "sources", "metadata", "schema", "data tests"],
      related: ["data types", "documentation", "analytics development"],
    },
    {
      id: "bi-tools",
      label: "BI tools",
      keywords: ["power bi", "tableau", "looker", "fabric", "metabase", "dbt"],
      related: ["copilot", "workspace", "semantic model"],
    },
  ],
  ux: [
    {
      id: "ux-process",
      label: "UX process",
      keywords: ["user experience", "ux", "design sprint", "interaction design", "user-centred", "user-centered"],
      related: ["design process", "real world", "methods and tools"],
    },
    {
      id: "ux-research",
      label: "User research",
      keywords: ["research", "discovery", "user needs", "how users", "journey", "problem space"],
      related: ["design context", "audience", "user stories"],
    },
    {
      id: "wireframing",
      label: "Wireframing",
      keywords: ["wireframe", "wireframing", "layout", "frames", "sketch", "solution space"],
      related: ["layers", "constraints", "elements"],
    },
    {
      id: "prototyping",
      label: "Prototyping",
      keywords: ["prototyp", "auto layout", "components", "instances"],
      related: ["interaction", "frame presets"],
    },
    {
      id: "visual-design",
      label: "Visual design",
      keywords: ["visual", "design system", "tokens", "styles", "typography", "vector"],
      related: ["colour", "color", "variables"],
    },
    {
      id: "usability-testing",
      label: "Usability testing",
      keywords: ["usability", "test plan", "testing", "reporting on your test", "got them right"],
      related: ["crits", "reviewing", "acceptance criteria"],
    },
    {
      id: "content-design",
      label: "Content design",
      keywords: ["content", "writing", "voice and tone", "how we read", "science of reading", "pair writing"],
      related: ["language", "read me first", "finished pages"],
    },
    {
      id: "portfolio",
      label: "A design portfolio",
      keywords: ["portfolio", "case study", "professional presence", "finished pages"],
      related: ["certificate", "wrap-up"],
    },
    {
      id: "accessibility",
      label: "Accessibility",
      keywords: ["accessib", "inclusive", "a11y", "contrast"],
      related: ["guiding principles", "things you need to get right"],
    },
  ],
  lead: [
    {
      id: "one-on-ones",
      label: "One-to-ones",
      keywords: ["one-on-one", "one-to-one", "1:1", "meetings", "meet your team", "mentoring"],
      related: ["coaching", "communicat", "listening"],
    },
    {
      id: "feedback",
      label: "Giving feedback",
      keywords: ["feedback", "radical candor", "candor", "praise", "criticism"],
      related: ["recognition", "coaching", "assessment"],
    },
    {
      id: "delegation",
      label: "Delegation",
      keywords: ["delegat", "making things happen", "hand over", "responsibility", "tech lead"],
      related: ["your time", "empower", "managing a team"],
    },
    {
      id: "hiring",
      label: "Hiring",
      keywords: ["hiring", "hire", "staffing", "recruit", "onboard"],
      related: ["interview", "growing team"],
    },
    {
      id: "motivation",
      label: "Motivating people",
      keywords: ["motivat", "rewards", "drivers of performance", "human needs", "grow your teammates", "employees work"],
      related: ["vision", "meaning", "purpose", "culture"],
    },
    {
      id: "conflict",
      label: "Handling conflict",
      keywords: ["conflict", "difficult", "resilien", "when leadership goes wrong", "pressure"],
      related: ["stress", "challenges", "candor"],
    },
    {
      id: "team-planning",
      label: "Team planning",
      keywords: ["goals", "expectations", "planning", "managing a team", "objectives", "small team"],
      related: ["vision", "growing team", "multiple teams"],
    },
    {
      id: "managing-up",
      label: "Managing up",
      keywords: ["managing up", "your manager", "managing managers", "followership", "managing yourself"],
      related: ["your job", "big leagues", "complex system"],
    },
    {
      id: "performance",
      label: "Performance reviews",
      keywords: ["performance", "effectiveness", "review", "assessment", "career"],
      related: ["grow", "rewards", "first three months"],
    },
  ],
  growth: [
    {
      id: "funnels",
      label: "Funnel analysis",
      keywords: ["funnel", "customer journey", "conversion", "north star", "drop-off"],
      related: ["breaking down", "metrics", "levers"],
    },
    {
      id: "growth-experiments",
      label: "Experiments",
      keywords: ["experiment", "a/b", "testing", "controlled", "hypothes", "high tempo"],
      related: ["test", "metrics", "oec", "twyman"],
    },
    {
      id: "acquisition",
      label: "Acquisition channels",
      keywords: ["acquisition", "channel", "seo", "paid growth", "promote", "guest blogging"],
      related: ["marketing", "ads", "e-commerce strategy"],
    },
    {
      id: "activation",
      label: "Activation and onboarding",
      keywords: ["activation", "onboarding", "must-have", "aha moment", "product/market fit"],
      related: ["first-time", "added value", "value"],
    },
    {
      id: "retention",
      label: "Retention",
      keywords: ["retention", "engagement", "churn", "cohort"],
      related: ["repeat", "habit", "lifecycle"],
    },
    {
      id: "content-marketing",
      label: "Content marketing",
      keywords: ["content", "blog", "storytelling", "video marketing", "topic clusters", "repurpos"],
      related: ["ideas", "pillar pages", "audience"],
    },
    {
      id: "marketing-analytics",
      label: "Marketing analytics",
      keywords: ["measur", "metric", "analytics", "analyzing results", "statistics"],
      related: ["data", "performance", "characterizing"],
    },
    {
      id: "positioning",
      label: "Positioning",
      keywords: ["positioning", "target market", "jtbd", "market", "brand"],
      related: ["value", "strategy", "competitors"],
    },
    {
      id: "growth-models",
      label: "Growth models",
      keywords: ["growth model", "growth levers", "levers", "monetization", "virtuous", "growth is a function"],
      related: ["loops", "growth slowdown", "product growth"],
    },
  ],
  cloud: [
    {
      id: "linux",
      label: "Linux basics",
      keywords: ["linux", "shell", "command line", "bash", "terminal", "unix"],
      related: ["installing", "install", "scripting"],
    },
    {
      id: "containers",
      label: "Containers",
      keywords: ["container", "docker", "containeriz", "microservices", "image"],
      related: ["monolith", "orchestration"],
    },
    {
      id: "kubernetes",
      label: "Kubernetes",
      keywords: ["kubernetes", "minikube", "helm", "pods", "kustomize", "cluster"],
      related: ["ingress", "scheduling", "deployments", "api objects"],
    },
    {
      id: "ci-cd",
      label: "CI/CD pipelines",
      keywords: ["ci/cd", "continuous integration", "github actions", "pipeline", "release engineering", "automate"],
      related: ["deploy", "workflow", "automation", "flow"],
    },
    {
      id: "iac",
      label: "Infrastructure as code",
      keywords: ["infrastructure as code", "terraform", "infrastructure", "cloudformation", "provision"],
      related: ["hcp", "configuration", "manage infrastructure"],
    },
    {
      id: "cloud-basics",
      label: "Cloud fundamentals",
      keywords: ["cloud", "aws", "azure", "compute", "storage", "going global"],
      related: ["databases", "pricing", "migrating"],
    },
    {
      id: "networking",
      label: "Networking",
      keywords: ["network", "ingress", "dns", "load balanc", "vpc"],
      related: ["services", "global"],
    },
    {
      id: "observability",
      label: "Monitoring and on-call",
      keywords: ["monitor", "on-call", "alert", "observab", "troubleshoot", "service level"],
      related: ["toil", "tracing", "feedback", "risk"],
    },
    {
      id: "cloud-security",
      label: "Cloud security",
      keywords: ["security", "authentication", "authorization", "compliance", "iam", "admission control"],
      related: ["access", "governance", "risk"],
    },
  ],
} as const satisfies Record<MoveId, readonly Skill[]>;

type Vocab = typeof VOCABULARY;
export type SkillId = Vocab[MoveId][number]["id"];

/** Every skill of every move, in move order. */
export const ALL_SKILLS: readonly Skill[] = Object.values(VOCABULARY).flat() as Skill[];

/** Every skill id, for the per-request enum the understand call uses. */
export const ALL_SKILL_IDS: readonly SkillId[] = ALL_SKILLS.map((s) => s.id as SkillId);

const BY_ID: ReadonlyMap<string, Skill> = new Map(ALL_SKILLS.map((s) => [s.id, s]));
const MOVE_OF: ReadonlyMap<string, MoveId> = new Map(
  (Object.entries(VOCABULARY) as [MoveId, readonly Skill[]][]).flatMap(([move, skills]) =>
    skills.map((s) => [s.id, move] as const),
  ),
);

/** The skills of one move, in vocabulary order. */
export function skillsFor(move: MoveId): readonly Skill[] {
  return VOCABULARY[move] as readonly Skill[];
}

export function isSkillId(id: unknown): id is SkillId {
  return typeof id === "string" && BY_ID.has(id);
}

export function skillById(id: string): Skill | undefined {
  return BY_ID.get(id);
}

/** "Problem discovery"; the id itself if it isn't in the vocabulary. */
export function skillLabel(id: string): string {
  return BY_ID.get(id)?.label ?? id;
}

/** The move a skill belongs to. */
export function moveOfSkill(id: string): MoveId | undefined {
  return MOVE_OF.get(id);
}

/** True when `id` is in `move`'s vocabulary. */
export function isSkillOf(move: MoveId, id: unknown): id is SkillId {
  return typeof id === "string" && MOVE_OF.get(id) === move;
}

/**
 * Keeps only ids from `move`'s vocabulary, in order, without duplicates, at
 * most `max` (5 by default).
 */
export function cleanGaps(move: MoveId, ids: readonly unknown[], max = 5): SkillId[] {
  const out: SkillId[] = [];
  for (const id of ids) {
    if (isSkillOf(move, id) && !out.includes(id)) out.push(id);
    if (out.length >= max) break;
  }
  return out;
}

// Keyword matching ------------------------------------------------------------

function normalize(text: string): string {
  return ` ${text
    .toLowerCase()
    .replace(/[‘’ʼ]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/\s+/g, " ")} `;
}

/** True when `keyword` appears in `name` starting at a word boundary. */
export function keywordHit(name: string, keyword: string): boolean {
  const text = normalize(name);
  let from = 0;
  for (;;) {
    const i = text.indexOf(keyword, from);
    if (i < 0) return false;
    if (!/[a-z0-9]/.test(text[i - 1] ?? " ")) return true;
    from = i + 1;
  }
}

/**
 * Which in-scope modules of `course` cover each ranked gap, by keyword. Only
 * gaps with at least one module are returned. A gap whose keywords hit is
 * "direct"; one only touched by related words is "partial".
 */
export function keywordCoverage(
  course: Pick<Course, "modules">,
  gapIds: readonly string[],
  scopeModules: number = course.modules.length,
): GapMatch[] {
  const mods = course.modules.slice(0, Math.max(0, Math.min(scopeModules, course.modules.length)));
  const out: GapMatch[] = [];
  gapIds.forEach((id, gap) => {
    const skill = BY_ID.get(id);
    if (!skill) return;
    const direct: number[] = [];
    const partial: number[] = [];
    mods.forEach((m, i) => {
      // a quiz checks the module before it; it never teaches the gap itself
      if (/\bquiz$/i.test(m.name.trim())) return;
      if (skill.keywords.some((k) => keywordHit(m.name, k))) direct.push(i);
      else if (skill.related.some((k) => keywordHit(m.name, k))) partial.push(i);
    });
    if (direct.length) {
      out.push({ gap, modules: [...direct, ...partial].sort((a, b) => a - b), depth: "direct" });
    } else if (partial.length) {
      out.push({ gap, modules: partial, depth: "partial" });
    }
  });
  return out;
}

// Coverage arithmetic (code, never the model) ------------------------------------

/** Weight of the gap at each rank: the first gap counts most. */
export const GAP_RANK_WEIGHTS = [1, 0.8, 0.6, 0.45, 0.35] as const;
export const DEPTH_WEIGHTS: Record<Depth, number> = { direct: 1, partial: 0.5 };

/** Distinct gaps covered at all. */
export function coveredCount(matches: readonly GapMatch[]): number {
  return new Set(matches.filter((m) => m.modules.length > 0).map((m) => m.gap)).size;
}

/**
 * Weighted coverage: sum over covered gaps of rank weight times depth weight
 * (each gap counted once, at its best depth). Rounded to 2 decimals so it can
 * be compared exactly in a sort key.
 */
export function coverageScore(matches: readonly GapMatch[]): number {
  const best = new Map<number, number>();
  for (const m of matches) {
    if (m.modules.length === 0) continue;
    const w = DEPTH_WEIGHTS[m.depth] ?? 0;
    best.set(m.gap, Math.max(best.get(m.gap) ?? 0, w));
  }
  let sum = 0;
  for (const [gap, w] of best) sum += (GAP_RANK_WEIGHTS[gap] ?? 0) * w;
  return Math.round(sum * 100) / 100;
}

/** Distinct modules mapped to any gap. */
export function modulesMapped(matches: readonly GapMatch[]): number {
  return new Set(matches.flatMap((m) => m.modules)).size;
}

/** The match for gap index `gap`, if covered. */
export function matchFor(matches: readonly GapMatch[], gap: number): GapMatch | undefined {
  return matches.find((m) => m.gap === gap && m.modules.length > 0);
}
