import Landing from "@/components/Landing";
import { COURSES } from "@/lib/courses";
import { catalogProviders, CATALOG_VERSION } from "@/lib/catalog";
import { DEFAULT_MODEL, fmtMonthYear, modelLabel } from "@/lib/format";
import { availableMoves } from "@/lib/moves";
import { AI_JOBS, AI_JOBS_FOOTNOTE } from "@/lib/templates";

// A server component: the catalog stays on the server and the landing gets
// only the handful of facts it shows, computed here, never typed by hand
// (spec 3.1). components/Landing.tsx is the client half.

export default function Home() {
  return (
    <Landing
      providers={catalogProviders()}
      courseCount={COURSES.length}
      checkedMonth={fmtMonthYear(CATALOG_VERSION)}
      moves={availableMoves().map((m) => ({ id: m.id, label: m.label }))}
      aiJobs={AI_JOBS.map((j) => ({ title: j.title, body: j.body }))}
      aiJobsFootnote={AI_JOBS_FOOTNOTE}
      modelName={modelLabel(DEFAULT_MODEL)}
    />
  );
}
