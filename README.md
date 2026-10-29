# Ascend

**One course you can finish.** Describe where you are in your own words. Ascend's AI reads it, finds the gaps between you and where you want to be, and matches them to the real modules of courses that fit your hours and budget. You get one pick, why it fits, and your first 25 minutes on the calendar within 48 hours.

Live: https://ascendmvp.vercel.app

Product line: *Rules keep it honest. The AI does the thinking a quiz can't.*

---

## The problem

Early-career professionals, 1 to 5 years in, usually know the direction they want to grow in: building with AI, AI product management, product management, data analysis, UX design, leading a team, growth marketing, or cloud and DevOps. What stalls them is the next step. Ten course tabs stay open for weeks, nothing clearly wins, and the course they do buy often doesn't fit the hours that survive a bad week.

From a survey of early-career professionals (30+ responses) and 5 interviews (2025): 61% named too many options as the problem, 52% feared paying for the wrong course, and 87% rated proof from other learners as decisive.

## The use case

The evening after a trigger (a review, a job post they couldn't apply for, a colleague's switch), someone opens Ascend and in about 3 minutes gets:

- one course that fits their direction, starting point, real hours and budget, plus two alternatives with a plain "pick this instead if"
- which of their gaps the course closes, with the real module names that close each one
- a verdict on the courses they were already circling
- the courses that were left out, and why, with numbers
- the cost at their pace and the free way to start, when there is one
- a week by week plan from the course's real outline, with one task a week to do at their own job
- a dated first session with a backup slot, a calendar file and a check-in

Every link, price and module name comes from a dated catalog. The model never states an hour, week, price, rating or count that you didn't write yourself; code adds those from the catalog. The plan opens the same way every time, with no AI call.

## What the AI does, and what code checks

The AI has four jobs. Each one is visible on screen, verified by code before anything is shown, and has a deterministic fallback.

| Job | Route | What the AI returns | What code checks |
|---|---|---|---|
| 1. Read your situation | `POST /api/understand` | Role, direction, starting point with a quote as evidence, strengths with quotes, 2 to 5 ranked gaps from the direction's skill list, courses you mentioned matched to the catalog, certificate need, format preference, hours | Ids come from per-request enums. Every quote must appear word for word in what you wrote, or it is dropped. Gaps outside the direction are dropped. Dashes stripped, lengths capped. You confirm or fix everything on the Check step before anything is chosen. |
| 2. Match modules to your gaps, then choose | `POST /api/pick` | For every course that passed the rules: which in-scope modules cover which gap, direct or partial. Then one pick, two alternates, why this one, why it beats the rules' own first choice, modules you can skim | Course ids must be on the candidate list. Gap and module indices must exist. Any sentence that states a time, price, rating, share or count you didn't write is removed, and so is any sentence that says you wrote something you didn't. Only your first gap may be called your first. Code counts coverage ("covers 2 of your 3 gaps") and prints a receipt of what it removed. |
| 3. Judge the courses you're circling | part of `/api/pick` | Start here, later, skip for now, or different direction, with one reason each | Verdicts must refer to real mentions and agree with the pick. Courses outside the catalog are judged by name only and labelled that way. Weeks and cost for catalog courses come from code. |
| 4. Tailor every week to your job | `POST /api/tailor` | One task a week to do at work with that week's modules, and the proof of work you will have at the end | Exactly one task per week, no numbers with units, no module from another week. Stored once in the plan link, so reopening never calls the AI. |

On the pick page the work is shown, not claimed: a receipt line counted by code ("AI read your 42 words · found 3 gaps · mapped 16 modules across 5 courses · chose 1"), a rules vs AI line ("Rules alone would have picked" when the AI chose differently, or a note that both chose the same course), gap coverage with real module names, and a "How this was decided" panel with the input, output, checks, timing and raw JSON of every job.

## Architecture

**Rules decide what's possible, the AI reads you and matches modules to your gaps, code checks every answer.**

1. **Rules first** (`lib/fit.ts`, pure, runs in the browser and on the server). Direction, level window, recency for AI directions, budget at your pace and a length cap filter the catalog. What passes is ranked: core before supporting, whole before trimmed, keyword coverage of your gaps, level, freshness, format preference, pace. Up to 8 candidates. The funnel on the pick page shows every count.
2. **The AI judges among what's left** (`lib/understand-ai.ts`, `lib/pick-ai.ts`, `lib/tailor-ai.ts`). It sees module names, your words and your gaps. It never sees the hours, weeks or prices code works out (the tailor call does see how many weeks the plan has). It does see your own words as you wrote them, including any figures you typed. It can only return ids from the list it was handed.
3. **Code checks the answer** (`lib/verify-understand.ts`, `lib/verify.ts`, `lib/verify-tailor.ts`, pure). Invalid ids and indices are removed and counted, numbers and dashes are stripped, lengths are capped, and any failure falls back to the rules for that field or the whole answer.
4. **Code owns every number.** Weeks, hours, prices and dates come from `lib/fit.ts`, `lib/plan-build.ts` and `lib/format.ts`. Cost lines show the source currency, with an approximate conversion at a fixed rate (`lib/fx.ts`) when your display currency differs.

Other pieces:

- `lib/courses.ts`: the dated catalog (`lib/course-types.ts` for the shape). `lib/skills.ts`: about 9 skills per direction, each with keywords for the rules' coverage.
- `lib/decide-rules.ts`: the rules decision, alternates and "pick this instead if" lines. Adjust chips and swaps re-run it in the browser with no network call.
- `lib/plan-store.ts`: the plan lives in the link (`/plan#p=z...`, deflate-raw plus base64url, under 2,000 characters), plus localStorage. Ticks stay on the device. `lib/legacy.ts` converts old `?d=` links with no AI.
- `lib/ics.ts`: a calendar file with the first session, the backup slot and a day 14 check-in.
- `lib/api-guard.ts`: same-origin check, 20 KB body cap, strict schemas (`lib/request-schemas.ts`) and a per-IP rate limit kept in memory on each server instance, before any model call.
- `lib/templates.ts`: every code-written line of copy.

Stack: Next.js 16 (App Router), React 19, Tailwind v4, Framer Motion, the Anthropic TypeScript SDK (Claude Opus 5.5), zod.

## Call budget

- A typical session makes 3 model calls: understand 1, pick 1, tailor 1. Re-picks from a note add at most 2.
- Compare, chips, swaps and reopening a plan make none.
- Every call: one attempt (`maxRetries: 0`), a 25 second timeout, effort `low`, structured output against a JSON schema whose enums the API enforces (directions, skills, course ids, verdicts), and the server-side refusal fallback (`fallbacks: "default"`).
- Each route allows 10 requests per 10 minutes per IP on each server instance. The count lives in memory, so on Vercel it is a best-effort limit per instance, not a global one; cached answers don't count against it.
- A per-instance server cache (200 entries, 24 hours) answers repeated requests, such as the example profiles, without a new call. It lives in memory, so a cold start, or a request that lands on another instance, makes a new call.
- The tailor call starts when the booking step opens, once per course for the same answers; the answer is saved on the device, and making or reopening the plan doesn't call it again.
- Any failure (no key, error, timeout, invalid answer, rate limit) returns HTTP 200 with the rules' answer and an honest label. There is no error screen.

## The flow

| Route | What happens |
|---|---|
| `/` | Who it's for, what the AI does, and "Try it with example answers" for three ready-made profiles. A Continue card appears when a plan exists. |
| `/assess` | Four steps: Situation (your own words), Time, Budget, Check. The AI reads the situation while you answer the next two; Check shows what it understood so you can fix it. Without AI, Check shows simple manual controls. |
| `/recommendations` | Your pick: the rules funnel, the pick with the gaps it closes, the receipt, rules vs AI, the courses you mentioned, alternates, adjust chips, re-pick with a note, left out and why, check another course, how this was decided. |
| `/compare` | The pick and two alternates side by side, starting with "Your gaps covered". |
| `/plan` | Book the first session (when, and what usually gets in the way), then the plan: weeks from the real outline, one task a week for your job, calendar file, check-in and progress. |

## Environment

| Variable | Where | Notes |
|---|---|---|
| `ANTHROPIC_API_KEY` | production | Anthropic API key. Without it every job takes the rules path. |
| `AI_MODEL` | optional | Defaults to `claude-opus-5-5`. Only `claude-` ids are used; anything else is ignored. |
| `ASCEND_MOCK_AI=1` | dev only | Deterministic AI-shaped answers from keyword heuristics, labelled "MOCK AI (dev only)" everywhere, so every AI state can be built without a key. Ignored when `NODE_ENV` is production or a key is set. |
| `ASCEND_DEV_NO_RATE_LIMIT=1` | dev only | Skips the rate limit locally. Ignored in production. |
| `ASCEND_TEST_AI` | dev only | `length`, `error`, `timeout` or `fake`: forces each failure path, or runs the full AI path on a canned answer the checks must fix. Ignored in production. |
| `ASCEND_MOCK_DELAY_MS` | dev only | Mock latency, 900 ms by default. |

The repo's `.env.development.local` turns on the mock and the rate-limit bypass for local work.

## Scripts

```bash
npm install
npm run dev            # http://localhost:3000
npm run build          # production build (mock and test flags are inert)
npm run lint
npm run eval           # rules, catalog and unit checks; live AI evals when ANTHROPIC_API_KEY is set
npm run check:catalog  # fetches every catalog link and source page
```

`npm run eval` runs 14 personas through the rules engine, checks every catalog entry, and unit tests the verifiers, plan builder, plan links, calendar file, mock and every AI fallback without a key. With `ANTHROPIC_API_KEY` set it also runs the live AI evals: move accuracy, verbatim quotes, valid ids and module indices, number-free prose, one task per week, and AI vs rules agreement. Results go to `scripts/eval-results.json`.

Latest eval: 2,906 of 2,906 rules, catalog and unit checks passed on 26 Oct 2026, run without a key (`scripts/eval-results.json`). The live AI evals run only when `ANTHROPIC_API_KEY` is set.

## What's real

- **Real:** the four AI jobs and their verifiers, the rules engine and its fallback, the funnel counts, the plan builder, calendar file and plan links.
- **Catalog:** 69 courses, books, programs and guides across 8 directions, 9 per direction (a few serve two), each with its real module names, hours, price, sources and the free way in when there is one. One agent researched each entry and a second re-checked it against the pages in `sources`. Catalog checked: 20 Oct 2026. Prices change, so every course card shows when it was checked. Run `npm run check:catalog` before each deploy: it fetches every link and checks titles and module names against the source pages, but not prices, so check the paid entries' prices by hand too. A few providers block the checker (403); check those by hand.
- **Research:** the landing figures come from a survey of early-career professionals with 30+ responses, plus 5 interviews, in 2025.
- **Testimonials:** two quotes from early users about v0.1, kept verbatim and confirmed by Aryan.
- **Not here:** accounts, a database, reminders, reviews or ratings Ascend didn't check, and any claim about completion rates. Progress is saved on the device only.
