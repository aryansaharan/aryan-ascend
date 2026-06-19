import { streamObject } from "ai";
import { aiEnabled, model } from "@/lib/recommend-ai";
import { COURSES } from "@/lib/courses";
import { planSchema } from "@/lib/recommend-schema";
import { weeklyHoursFor, type Profile } from "@/lib/recommend";

export const runtime = "nodejs";
export const maxDuration = 45;

type Body = { profile?: Profile; courseId?: string };

const SYSTEM = `You are Ascend, a career-learning advisor turning a chosen course into a realistic, week-by-week learning plan the user will actually follow.

Rules:
- Size the schedule to the user's stated weekly hours. Do not plan 10 hours a week for someone who has 2. The total roughly matches the course's duration.
- The first step must be doable in 30 minutes within the next 48 hours, and concrete (e.g. "Create a free Mode account and finish the first SQL exercise", not "review the syllabus").
- Each week has a clear focus, 2 to 4 checkable tasks, and a milestone that marks real progress.
- Quote a detail from the user's role or goal in the opener so the plan is obviously theirs.
- Plain, motivating, honest. No emoji, no hype.`;

export async function POST(request: Request) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const course = COURSES.find((c) => c.id === body.courseId);
  if (!course || !body.profile) {
    return Response.json({ error: "Unknown course or profile" }, { status: 400 });
  }
  if (!aiEnabled()) {
    return Response.json({ error: "Planner unavailable" }, { status: 503 });
  }

  const profile = body.profile;
  const weeklyHours = weeklyHoursFor(profile);

  const result = streamObject({
    model: model(),
    schema: planSchema,
    temperature: 0.4,
    onError: ({ error }) => console.error("plan streamObject error:", error),
    system: SYSTEM,
    prompt: `User profile (JSON):\n${JSON.stringify(
      profile,
    )}\n\nThey have about ${weeklyHours} hours per week.\n\nChosen course (JSON):\n${JSON.stringify(
      {
        id: course.id,
        title: course.title,
        provider: course.provider,
        level: course.level,
        durationHours: course.durationHours,
        skills: course.skills,
        summary: course.summary,
        url: course.url,
      },
    )}\n\nWrite the learning plan.`,
  });

  return result.toTextStreamResponse();
}
