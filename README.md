# Ascend

**Find your next skill in 15 minutes.** A guided decision-support tool for
early-career professionals who want to upskill but stall out on *what to learn
next*. Ascend turns a short assessment into a small, honest, AI-reasoned
shortlist — and then into a learning plan you can actually start.

Live: https://ascendmvp.vercel.app

Built as the MVP for the Ascend product concept (NextLeap). The problem framing,
user research, and metrics come from a real survey of early-career professionals
(see "What's real" below).

---

## The flow

1. **Assess** (`/assess`) — six short questions: your role (free text), years of
   experience, goal, self-rated level, weekly time, and the tracks pulling you.
2. **Recommend** (`/recommendations`) — a live AI pass ranks the catalog against
   your whole profile and **streams** 1–5 picks back, each with a rationale that
   quotes something you actually typed. A built-in advisor lets you push back
   ("why not the Kubernetes course?") and get a grounded answer.
3. **Compare** (`/compare`) — the top three side by side.
4. **Plan** (`/plan`) — pick one and Ascend generates a week-by-week plan sized
   to your real weekly hours, with a concrete first step for the next 48 hours.
   The plan lives entirely in a shareable URL — no account, no database.

## How the AI works

The intelligence is real and runs on every request (with a deterministic
fallback so the app never dead-ends).

- **Provider:** Google Gemini via the [Vercel AI SDK](https://sdk.vercel.ai)
  (`@ai-sdk/google`). Runs on Gemini's free tier.
- **Ranking** (`/api/recommend`): `streamObject` over a Zod schema streams a
  read-back sentence plus structured picks, so cards and reasoning materialize
  live instead of popping in after a spinner. The model is constrained to the
  real catalog by exact id and told to return *fewer* picks rather than pad with
  off-topic courses.
- **Advisor** (`/api/advise`): `streamText`, grounded in the catalog + your
  profile + the current shortlist, for counterfactual follow-ups.
- **Planner** (`/api/plan`): `streamObject` turns the chosen course into a
  schedule that respects your stated weekly hours.
- **Fallback:** a transparent, multi-signal scorer (`lib/recommend.ts`) runs if
  no key is configured or the model call fails. It uses a relevance gate so it
  only ever returns courses that serve your stated interests, goal, or role.

## Architecture

- **Next.js 16** (App Router, Turbopack), React 19, Tailwind v4, Framer Motion.
- `lib/recommend-schema.ts` — Zod schemas shared by server and client, so both
  agree on the streamed shape.
- `lib/recommend-ai.ts` — server-only Gemini wiring + prompts.
- `lib/enrich.ts` — joins a (possibly partial, mid-stream) pick with the real
  course record; used identically by the API, the streaming page, and compare.
- `lib/recommend-client.ts` — sessionStorage cache so `/recommendations` and
  `/compare` show the same picks without a second model call.
- `lib/plan-link.ts` — encodes a plan into a shareable URL.

## Environment

| Variable        | Required | Notes                                                               |
| --------------- | -------- | ------------------------------------------------------------------- |
| `AI_API_KEY`    | for AI   | Google Gemini API key. (`GOOGLE_GENERATIVE_AI_API_KEY` also works.) |
| `AI_MODEL`      | no       | Defaults to `gemini-2.5-flash`.                                     |

Without a key, the app runs entirely on the deterministic scorer.

## Run locally

```bash
npm install
# optional, to exercise the live AI path:
echo "AI_API_KEY=your_gemini_key" > .env.local
npm run dev
```

## What's real vs. prototyped

- **Real:** the AI recommender, advisor, and planner; the deterministic
  fallback; the research figures on the landing page (from a survey of
  early-career professionals, n≈25) and the cited market data.
- **Seed data:** the course catalog (`lib/courses.ts`) is a hand-curated set of
  high-signal resources, not an exhaustive index.
- **Sample data:** the peer reviews on the compare screen are illustrative
  placeholders for the planned Peer Reviews module (and are labeled as such
  in-app), pending real learner cohorts.
