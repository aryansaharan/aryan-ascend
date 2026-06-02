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

/**
 * STUBBED recommender: deterministic scoring over profile + corpus.
 * Replace with an LLM call (OpenAI / Anthropic / Groq) for the real
 * version: pass profile + COURSES, ask for top-5 with reasoning.
 */
export async function recommend(profile: Profile): Promise<Recommendation[]> {
  // Simulate latency so the UI's loading state has somewhere to live.
  await new Promise((r) => setTimeout(r, 900));

  const weeklyHours = parseTime(profile.timePerWeek);

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
      score += 18;
      fitNotes.push({
        label: "Time",
        text: `Finishable in about ${Math.max(1, Math.round(weeksToFinish))} week${weeksToFinish > 1 ? "s" : ""} at your pace.`,
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

    return { course: c, score, fitNotes, weeksToFinish };
  });

  // PDF spec: "narrows hundreds of course options down to 3 to 5 personalized recommendations"
  const top = scored
    .filter((s) => s.score > 30)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return top.map((t) => ({
    course: t.course,
    score: t.score,
    fitNotes: t.fitNotes,
    rationale: buildRationale(t.course, t.fitNotes),
    category: deriveCategory(t.course),
    careerImpact: deriveCareerImpact(t.course, profile),
    prerequisites: derivePrerequisites(t.course),
    whyThisFitsYou: deriveWhyThisFits(t.course, profile),
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

function deriveCategory(course: Course): string {
  for (const track of course.tracks) {
    if (TRACK_TO_CATEGORY[track]) return TRACK_TO_CATEGORY[track];
  }
  return "General";
}

function deriveCareerImpact(course: Course, profile: Profile): string {
  const cat = deriveCategory(course);
  const role = profile.currentRole.trim() || "your current role";

  switch (profile.goal) {
    case "promotion":
      return `Adds depth for the next title past ${role.toLowerCase()}. Often cited in ${cat.toLowerCase()} promo conversations.`;
    case "switch-field":
      return `Provides the foundational vocabulary to credibly enter ${cat.toLowerCase()}.`;
    case "salary":
      return `High-signal in ${cat.toLowerCase()}. Concrete proof of skill for comp conversations.`;
    case "deeper-craft":
      return `Sharpens your core ${cat.toLowerCase()} craft. Outcomes show up in the work itself.`;
    case "leadership":
      return `Required vocabulary for leading teams in ${cat.toLowerCase()}.`;
  }
}

function derivePrerequisites(course: Course): string {
  if (course.level === "beginner") return "None. This is your start.";
  if (course.level === "intermediate")
    return `Comfort with the basics of ${course.skills[0] ?? "the topic"}.`;
  return `Solid intermediate experience with ${course.skills.slice(0, 2).join(", ") || "the area"}.`;
}

function deriveWhyThisFits(course: Course, profile: Profile): string {
  const matchedTracks = course.tracks.filter((t) =>
    profile.interests.includes(t),
  );
  const levelPhrase =
    course.level === profile.level
      ? `at your current ${course.level} level`
      : `a step beyond ${profile.level}`;

  if (matchedTracks.length > 0) {
    const trackName = TRACK_TO_CATEGORY[matchedTracks[0]] ?? matchedTracks[0];
    return `You said ${trackName.toLowerCase()} was pulling you. This is the highest-fit option in that lane, ${levelPhrase}, that fits the time you said you'd give it.`;
  }
  return `Picked because it aligns with ${humanGoal(profile.goal)} and fits ${levelPhrase}.`;
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
