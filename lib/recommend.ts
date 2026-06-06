import { COURSES, type Course } from "./courses";

export type Profile = {
  currentRole: string;
  experience: "0-1" | "1-3" | "3-5" | "5+";
  goal: "promotion" | "switch-field" | "salary" | "deeper-craft" | "leadership";
  timePerWeek: "<2" | "2-5" | "5-10" | "10+";
  level: "beginner" | "intermediate" | "advanced";
  interests: string[];
};

export type Recommendation = {
  course: Course;
  score: number;
  rationale: string;
  fitNotes: { label: string; text: string }[];
  category: string;
  careerImpact: string;
  prerequisites: string;
  whyThisFitsYou: string;
  weeklyHours: number;
  weeksToFinish: number;
};

// Lightweight role parsing: map the free-text "current role" answer to course
// tracks so it actually influences ranking instead of being decorative.
const ROLE_KEYWORDS: { re: RegExp; tracks: string[] }[] = [
  { re: /full[\s-]?stack/, tracks: ["fullstack", "frontend", "backend"] },
  { re: /front[\s-]?end|react|vue|angular|\bui engineer\b/, tracks: ["frontend", "fullstack"] },
  { re: /back[\s-]?end|\bnode\b|\bapi\b|server|django|spring|golang/, tracks: ["backend", "fullstack"] },
  { re: /devops|\bsre\b|platform|infra|cloud|kubernetes|docker|terraform/, tracks: ["devops", "platform-engineer"] },
  { re: /data analyst|analytics|\bsql\b|tableau|business intelligence|\bbi\b/, tracks: ["data-analyst", "business-analyst"] },
  { re: /data scien|machine learning|\bml\b|\bai\b|\bllm\b|deep learning/, tracks: ["data-scientist", "ml-engineer", "ai-engineer"] },
  { re: /product manager|product owner|\bpm\b|product lead/, tracks: ["pm"] },
  { re: /design|\bux\b|\bui\b|figma|user research/, tracks: ["designer"] },
  { re: /market|\bseo\b|content|brand/, tracks: ["marketing"] },
  { re: /growth|demand gen/, tracks: ["growth"] },
  { re: /sales|account executive|\bae\b|\bsdr\b|\bbdr\b|business development/, tracks: ["sales"] },
  { re: /customer success|\bcsm\b|account manager|onboarding specialist/, tracks: ["customer-success"] },
  { re: /\bmanager\b|\blead\b|head of|director|\bvp\b|principal/, tracks: ["em", "staff-engineer"] },
];

function tracksFromRole(role: string): Set<string> {
  const text = role.toLowerCase();
  const out = new Set<string>();
  for (const { re, tracks } of ROLE_KEYWORDS) {
    if (re.test(text)) tracks.forEach((t) => out.add(t));
  }
  return out;
}

// Skills (or an advanced level) that signal senior-grade material. Used to fit
// content depth to the user's years in the field.
const SENIOR_SIGNAL_SKILLS = new Set([
  "leadership",
  "management",
  "technical-leadership",
  "staff-engineer",
  "ic-track",
  "product-strategy",
  "growth-strategy",
  "marketing-strategy",
  "cs-leadership",
  "go-to-market",
  "product-discovery",
  "positioning",
  "system-design",
  "distributed-systems",
]);

const SENIORITY: Record<Profile["experience"], number> = {
  "0-1": 0,
  "1-3": 1,
  "3-5": 2,
  "5+": 3,
};

function experienceLabel(e: Profile["experience"]): string {
  return {
    "0-1": "under a year",
    "1-3": "1 to 3 years",
    "3-5": "3 to 5 years",
    "5+": "5+ years",
  }[e];
}

/**
 * Deterministic recommender: multi-signal scoring over profile + corpus.
 * Every assessment answer feeds a signal (interests, level, time, goal,
 * experience, role). Designed so the scorer can be swapped for an LLM call
 * later: pass profile + COURSES, ask for top-5 with reasoning.
 */
export async function recommend(profile: Profile): Promise<Recommendation[]> {
  // Simulate latency so the UI's loading state has somewhere to live.
  await new Promise((r) => setTimeout(r, 900));

  const weeklyHours = parseTime(profile.timePerWeek);
  const roleTracks = tracksFromRole(profile.currentRole);
  const seniority = SENIORITY[profile.experience];

  const scored = COURSES.map((c) => {
    let score = 0;
    const fitNotes: { label: string; text: string }[] = [];

    // Track match (most important)
    const trackOverlap = profile.interests.filter((i) =>
      c.tracks.includes(i),
    ).length;
    if (trackOverlap > 0) {
      score += 40 * trackOverlap;
      fitNotes.push({
        label: "Track fit",
        text: `Direct match for your interest in ${profile.interests
          .filter((i) => c.tracks.includes(i))
          .join(" / ")}.`,
      });
    }

    // Level match
    if (c.level === profile.level) {
      score += 25;
      fitNotes.push({
        label: "Level",
        text: `${capitalize(c.level)} content. Matches where you are now.`,
      });
    } else if (
      (profile.level === "beginner" && c.level === "intermediate") ||
      (profile.level === "intermediate" && c.level === "advanced")
    ) {
      score += 10;
      fitNotes.push({
        label: "Stretch",
        text: `${capitalize(c.level)} content. One rung above your current level. Good growth target.`,
      });
    }

    // Time fit
    const weeksToFinish = c.durationHours / Math.max(weeklyHours, 1);
    if (weeksToFinish <= 4) {
      const wks = Math.max(1, Math.round(weeksToFinish));
      score += 18;
      fitNotes.push({
        label: "Time",
        text: `Finishable in about ${wks} week${wks === 1 ? "" : "s"} at your pace.`,
      });
    } else if (weeksToFinish <= 12) {
      score += 8;
      fitNotes.push({
        label: "Time",
        text: `About ${Math.round(weeksToFinish)} weeks at your pace. A real commitment, not a weekend.`,
      });
    } else {
      score -= 10;
      fitNotes.push({
        label: "Time risk",
        text: `Long course (~${Math.round(weeksToFinish)} weeks). Pair with accountability.`,
      });
    }

    // Goal alignment
    const goalSkills: Record<Profile["goal"], string[]> = {
      promotion: ["system-design", "leadership", "technical-leadership", "growth-strategy", "marketing-strategy"],
      "switch-field": ["sql", "python", "react", "frontend", "data-analyst", "marketing-fundamentals", "sales-fundamentals", "customer-success", "content-marketing"],
      salary: ["aws", "kubernetes", "ml", "ai-engineering", "growth-marketing", "enterprise-sales", "saas-sales"],
      "deeper-craft": ["design-thinking", "ux", "product-discovery", "copywriting", "positioning", "csm-framework", "experimentation"],
      leadership: ["management", "leadership", "1-on-1s", "staff-engineer", "go-to-market", "marketing-strategy", "cs-leadership"],
    };
    const goalMatch = c.skills.some((s) =>
      goalSkills[profile.goal].includes(s),
    );
    if (goalMatch) {
      score += 15;
      fitNotes.push({
        label: "Goal",
        text: `Strong signal for ${humanGoal(profile.goal)}.`,
      });
    }

    // Experience fit: does the depth suit the years you have behind you?
    const hasSeniorSignal =
      c.level === "advanced" || c.skills.some((s) => SENIOR_SIGNAL_SKILLS.has(s));
    const isQuickIntro =
      c.level === "beginner" && c.durationHours > 0 && c.durationHours <= 8;
    if (seniority >= 2 && hasSeniorSignal) {
      score += 12;
      fitNotes.push({
        label: "Experience",
        text: `Pitched for the depth you have after ${experienceLabel(profile.experience)}, not a refresher.`,
      });
    } else if (seniority <= 1 && isQuickIntro) {
      score += 8;
      fitNotes.push({
        label: "Experience",
        text: `Right depth this early in. A clean place to start.`,
      });
    } else if (seniority >= 2 && isQuickIntro) {
      score -= 8;
      fitNotes.push({
        label: "Experience",
        text: `Likely too basic after ${experienceLabel(profile.experience)}. Skim, do not study.`,
      });
    } else if (seniority === 0 && c.level === "advanced") {
      score -= 6;
      fitNotes.push({
        label: "Experience",
        text: `Ambitious this early. Bookmark it once the fundamentals are solid.`,
      });
    }

    // Role fit: connect the free-text current role to relevant tracks.
    if (roleTracks.size > 0 && c.tracks.some((t) => roleTracks.has(t))) {
      score += 8;
      fitNotes.push({
        label: "Your role",
        text: `Lines up with the work your current role points to.`,
      });
    }

    return { course: c, score, fitNotes, weeksToFinish };
  });

  // PDF spec: "narrows hundreds of course options down to 3 to 5 personalized recommendations"
  const top = scored
    .filter((s) => s.score > 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return top.map((t, i) => ({
    course: t.course,
    score: t.score,
    fitNotes: t.fitNotes,
    rationale: buildRationale(t.course, t.fitNotes),
    category: deriveCategory(t.course),
    careerImpact: deriveCareerImpact(t.course, profile),
    prerequisites: derivePrerequisites(t.course),
    whyThisFitsYou: deriveWhyThisFits(t.course, profile, i),
    weeklyHours,
    weeksToFinish: Math.max(1, Math.round(t.weeksToFinish)),
  }));
}

// ─── Derivers ──────────────────────────────────────────────────────────

const TRACK_TO_CATEGORY: Record<string, string> = {
  devops: "DevOps & Cloud",
  "platform-engineer": "DevOps & Cloud",
  sre: "DevOps & Cloud",
  "cloud-engineer": "DevOps & Cloud",
  "data-analyst": "Data & Analytics",
  "data-scientist": "Data & Analytics",
  "data-engineer": "Data & Analytics",
  "analytics-engineer": "Data & Analytics",
  "ai-engineer": "AI Engineering",
  "ml-engineer": "AI Engineering",
  founder: "Founder Skills",
  frontend: "Frontend",
  fullstack: "Fullstack",
  backend: "Backend",
  pm: "Product Management",
  "senior-pm": "Product Management",
  "pm-data": "Product Management",
  "pm-ai": "Product Management",
  "business-analyst": "Data & Analytics",
  em: "Engineering Leadership",
  "engineering-manager": "Engineering Leadership",
  "team-lead": "Engineering Leadership",
  "staff-engineer": "IC Leadership",
  "principal-engineer": "IC Leadership",
  "ic-track": "IC Leadership",
  growth: "Growth",
  marketing: "Marketing",
  sales: "Sales",
  "customer-success": "Customer Success",
  designer: "Design & UX",
  researcher: "Design & UX",
};

export function deriveCategory(course: Course): string {
  for (const track of course.tracks) {
    if (TRACK_TO_CATEGORY[track]) return TRACK_TO_CATEGORY[track];
  }
  return "General";
}

// Render skill tokens as readable labels (typescript -> TypeScript, sql -> SQL).
// Unmapped tokens just lose their hyphens (system-design -> system design).
const SKILL_LABELS: Record<string, string> = {
  sql: "SQL",
  aws: "AWS",
  ux: "UX",
  ml: "ML",
  ai: "AI",
  llm: "LLM",
  seo: "SEO",
  b2b: "B2B",
  saas: "SaaS",
  csm: "CSM",
  k8s: "Kubernetes",
  kubernetes: "Kubernetes",
  iac: "infrastructure as code",
  rag: "RAG",
  dbt: "dbt",
  sre: "SRE",
  node: "Node.js",
  nodejs: "Node.js",
  typescript: "TypeScript",
  react: "React",
  python: "Python",
  docker: "Docker",
  terraform: "Terraform",
  graphql: "GraphQL",
  figma: "Figma",
};

function humanizeSkill(skill: string): string {
  return SKILL_LABELS[skill] ?? skill.replace(/-/g, " ");
}

// The one or two skills that best characterize a course. Track-level tokens
// (frontend / backend / ...) are stripped so the phrase stays specific and
// doesn't echo the category word right next to it.
const TRACK_TOKENS = new Set([
  "frontend",
  "backend",
  "fullstack",
  "devops",
  "marketing",
  "growth",
  "sales",
]);

function courseFocus(course: Course): string {
  const specific = course.skills.filter((s) => !TRACK_TOKENS.has(s));
  const picked = (specific.length ? specific : course.skills).slice(0, 2);
  return picked.map(humanizeSkill).join(" and ");
}

function deriveCareerImpact(course: Course, profile: Profile): string {
  const cat = deriveCategory(course).toLowerCase();
  const focus = courseFocus(course);

  switch (profile.goal) {
    case "promotion":
      return `Builds the ${focus} depth that holds up in ${cat} promotion cases.`;
    case "switch-field":
      return `Gives you credible ${focus} footing to break into ${cat}.`;
    case "salary":
      return `${capitalize(focus)} is high-signal in ${cat} comp conversations.`;
    case "deeper-craft":
      return `Sharpens your ${focus} where the work actually happens, not just in theory.`;
    case "leadership":
      return `The ${focus} grounding you need to lead ${cat} teams.`;
  }
}

function derivePrerequisites(course: Course): string {
  if (course.level === "beginner") return "None. This is your start.";
  if (course.level === "intermediate")
    return `Comfort with the basics of ${humanizeSkill(course.skills[0] ?? "the topic")}.`;
  return `Solid intermediate experience with ${course.skills.slice(0, 2).map(humanizeSkill).join(", ") || "the area"}.`;
}

const LEVEL_ORDER: Record<Course["level"], number> = {
  beginner: 0,
  intermediate: 1,
  advanced: 2,
};

function deriveWhyThisFits(
  course: Course,
  profile: Profile,
  rank: number,
): string {
  const matched = course.tracks.filter((t) => profile.interests.includes(t));
  const lane = matched.length
    ? (TRACK_TO_CATEGORY[matched[0]] ?? matched[0]).toLowerCase()
    : null;

  // Only the top pick gets to claim "closest match", so the cards don't all
  // read identically.
  const opener =
    rank === 0
      ? lane
        ? `Your closest match on the ${lane} track.`
        : `Your closest match for ${humanGoal(profile.goal)}.`
      : rank === 1
        ? lane
          ? `A close runner-up on ${lane}.`
          : `A close runner-up for ${humanGoal(profile.goal)}.`
        : lane
          ? `Also strong on ${lane}.`
          : `Also strong for ${humanGoal(profile.goal)}.`;

  // Honest about direction: a beginner course below your level is not a stretch.
  const diff = LEVEL_ORDER[course.level] - LEVEL_ORDER[profile.level];
  const levelClause =
    diff === 0
      ? `Pitched right at your ${profile.level} level`
      : diff === 1
        ? `One level past ${profile.level}, a deliberate stretch`
        : diff >= 2
          ? `A real jump above ${profile.level}, ambitious but doable with focus`
          : `A notch below your ${profile.level} level, useful for filling gaps fast`;

  return `${opener} ${levelClause}. ${course.summary}`;
}

function buildRationale(
  course: Course,
  notes: { label: string; text: string }[],
): string {
  const lead = notes[0]?.text ?? "Solid all-round fit.";
  return `${lead} ${course.summary}`;
}

function parseTime(t: Profile["timePerWeek"]): number {
  return { "<2": 1, "2-5": 3, "5-10": 7, "10+": 12 }[t];
}

// Exported so the AI recommender derives the same weekly-hours and
// weeks-to-finish math as the deterministic path, keeping the cards consistent.
export function weeklyHoursFor(profile: Profile): number {
  return parseTime(profile.timePerWeek);
}

function capitalize(s: string) {
  return s[0].toUpperCase() + s.slice(1);
}

function humanGoal(g: Profile["goal"]) {
  return {
    promotion: "getting promoted",
    "switch-field": "switching fields",
    salary: "increasing earning power",
    "deeper-craft": "going deeper on craft",
    leadership: "moving into leadership",
  }[g];
}

/**
 * Synthetic peer reviews. Real version: LLM call with course context.
 */
export function syntheticReviews(
  course: Course,
): {
  author: string;
  role: string;
  text: string;
  outcome?: string;
  rating: number;
}[] {
  const seed = course.id.charCodeAt(0) + course.id.length;
  const pool = [
    {
      author: "Rahul Verma",
      role: "Backend Engineer at Razorpay, 3 yrs",
      text: "Cleared up things I'd half-understood for years. The hands-on parts saved me from learning by Googling forever.",
      outcome: "Got promoted within 6 months.",
      rating: 5,
    },
    {
      author: "Sneha Kulkarni",
      role: "Marketing to analytics switcher",
      text: "Felt accessible without being dumbed down. I quit halfway through twice; the third time stuck because the projects were real.",
      outcome: "Landed first data analyst role at Meesho.",
      rating: 5,
    },
    {
      author: "Aditya Joshi",
      role: "Self-taught developer, 2 yrs",
      text: "Pace was fine for me but watching the 'why' explanations changed how I think about the work.",
      rating: 4,
    },
    {
      author: "Priya Iyer",
      role: "Tech Lead at Atlassian, 6 yrs",
      text: "Skim if you've seen the material before. The second half goes deeper than I expected.",
      outcome: "Used at work within 2 weeks.",
      rating: 5,
    },
    {
      author: "Vikram Banerjee",
      role: "Product Manager at Sarvam AI",
      text: "I'm not the target but I wanted to understand what my engineers were doing. I argue smarter with them now.",
      rating: 4,
    },
    {
      author: "Meera Krishnan",
      role: "New grad, hired at Flipkart",
      text: "Intimidating at first, but the structured projects pulled me through.",
      outcome: "Used the cert on first job applications.",
      rating: 4,
    },
  ];
  return [pool[seed % pool.length], pool[(seed + 1) % pool.length]];
}
