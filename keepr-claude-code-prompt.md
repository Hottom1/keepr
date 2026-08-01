# Claude Code Build Prompt — "Keepr" Handball GK App (Deploy MVP)

Paste everything below this line into Claude Code as your opening prompt.
Attach `keepr.jsx` (the existing Keepr artifact source) alongside this prompt — it's the
starting point, not a spec to rebuild from scratch.

---

## Context

I've been building **Keepr**, a handball goalkeeper training app, as a single-file React
artifact inside a Claude.ai chat. It currently has no backend — data lives in a
per-user browser storage layer that only exists inside Claude's artifact sandbox, and
its AI coach ("Kip") calls the Anthropic API directly from the browser, which is only
safe because Claude.ai's sandbox handles the key — it is not safe to ship that way.

I want to turn this into a real deployed product on Netlify, with a public marketing
landing page and a login page in front of the app. Read `gk-trainer.jsx` first and
summarise: the component structure, the data model currently held in the single
storage blob, and anything that won't port cleanly to a normal React app. Wait for my
confirmation before building.

## What Keepr currently has (all reusable)

- Exercise library with search/filter, plus user-added custom exercises
- 6-week training block builder (freeform, and goal-based auto-generation)
- "Coach's notes" advice hub (static content)
- Match/game stats: a 3×3 goal-zone grid, logged per shot as Save/Goal, with
  discipline-aware scoring (indoor: every goal = 1 point; beach: regular goal = 1
  point, spin/360, in-flight, specialist/GK, and 6m penalty goals = 2 points), save%
  heatmaps by zone, and a save% trend chart
- Kip: an AI coach chat, built from a keeper profile (level, discipline, availability,
  equipment access, weaknesses, niggles) plus the current plan and recent session/match
  data, currently calling the Anthropic API client-side

## Product summary

Deploy Keepr at a real URL with:
- A public **marketing landing page** (no auth) — explains Keepr, highlights the
  library/plans/stats/Kip, CTA into sign-up. I'll want to review copy and design
  before it ships; treat this as needing my input, not a placeholder to fill blind.
- A **login / sign-up page** — email + password to start (magic link or Google is a
  nice-to-have, not required for MVP)
- The existing app (Library, Build, Plans, Advice, Stats, Kip) sitting behind auth,
  scoped per user
- Kip's chat calls proxied through a serverless function so the Anthropic API key
  never reaches the browser

## Build order (stop after each phase for my review)

### Phase 1 — Repo scaffold
Vite + React + Tailwind. Port Keepr's existing components in largely as-is. Get it
running locally against a temporary in-memory store (no backend yet) just to confirm
nothing broke in the port before adding infrastructure.

### Phase 2 — Supabase: auth + data
Set up a Supabase project. Propose a data model (I'd lean toward keeping the current
single-JSON-blob-per-user shape for a fast, low-risk migration, normalizing into real
tables later if it's worth it — tell me the tradeoff and let me decide). Add Postgres
row-level security so a user can only ever read/write their own data. Swap every
storage call in the ported components for Supabase calls.

### Phase 3 — Login/auth UI
Sign-up, log in, log out, forgot-password, and a protected-route wrapper around the
existing app so it's unreachable without a session.

### Phase 4 — Kip proxy
A Netlify Function (or Supabase Edge Function — your call, tell me why) that holds the
Anthropic API key server-side and forwards Kip's chat requests. Update Kip's fetch call
to hit this endpoint instead of the Anthropic API directly.

### Phase 5 — Marketing landing page
Public route, no auth required. Sell what Keepr actually does (goalkeeper-specific
training + match stats + Kip), not generic SaaS copy. Flag any copy or design
decisions you're unsure about rather than presenting them as final.

### Phase 6 — Netlify deploy
Connect the repo, set environment variables (Supabase keys, Anthropic key — server-side
only), confirm a working build, and point the custom domain **keepr.coach** at it once
it's registered (walk me through what DNS records to add).

## Technical requirements

- Stack: Vite + React + Tailwind + Supabase + Netlify (Functions for the Kip proxy)
- Never expose the Anthropic API key or Supabase service-role key client-side
- Mobile-first UI — keepers use this at the gym/court on a phone
- Keep a `DECISIONS.md` updated with every architectural choice and why

## Working style

- Work phase by phase; after each phase, give me a demo path (what to click) and what
  you'd do next.
- Ask me when something about the training/stats logic is ambiguous rather than
  guessing — I'm the domain expert here.
- Flag anything you're unsure about rather than presenting it confidently, especially
  in the landing page copy and the data model tradeoffs in Phase 2.
