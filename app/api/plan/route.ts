import { streamObject } from "ai";
import { aiEnabled, model, providerOptions } from "@/lib/recommend-ai";
import { COURSES } from "@/lib/courses";
import { planSchema } from "@/lib/recommend-schema";
import { weeklyHoursFor } from "@/lib/recommend";
import { guardRequest } from "@/lib/api-guard";
import { planBodySchema } from "@/lib/request-schemas";

export const runtime = "nodejs";
export const maxDuration = 45;

const SYSTEM = `You are Ascend, a career-learning advisor turning a chosen course into a realistic, week-by-week learning plan the user will actually follow.

Rules:
- Size the schedule to the user's stated weekly hours. Do not plan 10 hours a week for someone who has 2. The total roughly matches the course's duration.
- The first step must be doable in 30 minutes within the next 48 hours, and concrete (e.g. "Create a free Mode account and finish the first SQL exercise", not "review the syllabus").
- Each week has a clear focus, 2 to 4 checkable tasks, and a milestone that marks real progress.
- Plan at most 12 weeks. If the course needs longer at their pace, plan the first 12 weeks and say in finishLine what they will be able to do by then and roughly how much of the course remains.
- Quote a detail from the user's role or goal in the opener so the plan is obviously theirs.
- Plain, motivating, honest. No emoji, no hype.`;

export async function POST(request: Request) {
  const guarded = await guardRequest(request, "plan", planBodySchema);
  if (!guarded.ok) return guarded.response;
  const { profile, courseId } = guarded.body;

  // The schema already checked the id is in the catalog.
  const course = COURSES.find((c) => c.id === courseId);
  if (!course) {
    return Response.json({ error: "Unknown course" }, { status: 400 });
  }
  if (!aiEnabled()) {
    return Response.json({ error: "Planner unavailable" }, { status: 503 });
  }

  const weeklyHours = weeklyHoursFor(profile);

  const result = streamObject({
    model: model(),
    schema: planSchema,
    temperature: 0.4,
    maxOutputTokens: 2500,
    providerOptions,
    maxRetries: 1,
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
