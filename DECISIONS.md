# Decisions

Architectural choices made while turning Keepr from a Claude.ai artifact into a deployed app, and why.

## Phase 1 — Repo scaffold

**Stack: Vite + React 19 + Tailwind v4, installed directly rather than via `npm create vite`.**
The directory already had `keepr.jsx` and a `.claude/` folder in it, so the interactive scaffolder wasn't a clean fit. Built the project by hand instead: `npm init -y`, then installed `react`, `react-dom`, `lucide-react`, `recharts` as dependencies and `vite`, `@vitejs/plugin-react`, `tailwindcss`, `@tailwindcss/vite` as dev dependencies.

**Tailwind v4 via the `@tailwindcss/vite` plugin, no `tailwind.config.js`.**
v4 doesn't need a JS config file or PostCSS setup for a project with no custom theme — `@import "tailwindcss";` in `src/index.css` plus the Vite plugin is enough. Keepr's colours are all applied via inline `style` props (not Tailwind color classes), so there's no theme to extend yet. If that changes, a `@theme` block in the CSS file is the v4-native place to add it, not a config file.

**`keepr.jsx` ported to `src/App.jsx` verbatim.**
No restructuring into smaller component files yet — the brief for this phase was to confirm the port works before adding infrastructure, not to refactor. Splitting `App.jsx` into per-feature files is worth doing before Phase 2 gets underway, since the Supabase swap will touch every `updateAndSave` call site.

**`window.storage` shimmed in-memory (`src/lib/mockStorage.js`), not `localStorage`.**
The original code calls `window.storage.get(key, isPublic)` / `.set(key, value, isPublic)`, an API that only exists inside the Claude.ai artifact sandbox. Shimming that exact interface with an in-memory `Map` meant zero edits to the ported component for Phase 1, and keeps the shim obviously temporary — it forgets everything on reload, which is intentional so Phase 2's Supabase swap is the first real persistence this app gets, not a second temporary one (localStorage) that would need unwinding later.

**Kip's direct Anthropic API call left untouched for now.**
`KipChat` still `fetch`es `https://api.anthropic.com/v1/messages` client-side with no `Authorization` header — that only worked inside Claude.ai's sandbox, which intercepted the request. It will fail in this app (no key, likely CORS) until Phase 4 replaces it with a call to a Netlify Function proxy. Left as-is deliberately rather than stubbed, so it fails loudly and visibly rather than silently, as a marker of exactly what Phase 4 needs to fix.

## Phase 2 — Supabase: auth + data

**Data model: single `user_data` JSONB row per user, not normalized tables.**
Presented both options; user chose the blob. One table, `public.user_data(user_id uuid primary key, data jsonb, updated_at)`, with three RLS policies (select/insert/update, all `auth.uid() = user_id`). Migration lives in `supabase/migrations/0001_user_data.sql` — written for the user to run in the Supabase SQL Editor, since there's no CLI link or DB credential in this environment. The blob shape mirrors exactly what was already in React state (`customExercises`, `plans`, `season`, `profile`, `kipMessages`, `matches`), so `src/lib/storage.js`'s `loadUserData`/`saveUserData` are near drop-in replacements for the old `window.storage.get/set` calls in `App.jsx` — one `select`, one `upsert`, both scoped to `auth.uid()` server-side by RLS rather than trusted client-side. Escape hatch if it's ever needed: peel `matches`/`shots` into real tables later without touching the rest, rather than normalizing everything.

**No service-role key anywhere in this app.**
`src/lib/supabaseClient.js` only ever holds the `anon` public key (`VITE_SUPABASE_ANON_KEY`, from `.env.local`, gitignored). All access control is enforced by Postgres RLS using the caller's JWT, not by trusting the client. If a future serverless function genuinely needs to bypass RLS, that's a separate, explicit decision — not a default.

**`TempAuthGate` — deliberate, temporary scope overlap with Phase 3.**
Testing the Supabase read/write wiring requires *some* signed-in session, but building real sign-up/login/forgot-password/logout is Phase 3's job. Rather than block Phase 2 on Phase 3, or fake a session, added `src/TempAuthGate.jsx`: a bare email/password `signInWithPassword` form with no sign-up, wrapping `<App/>` in `main.jsx`. It's flagged in its own header comment as throwaway. Phase 3 replaces it outright rather than extending it — it's a verification tool, not a foundation.

## Phase 3 — Login/auth UI

**The app now lives at `/app`, not `/`.**
Added `react-router-dom` and moved the protected `GKTrainerApp` behind `/app`, with `/login`, `/signup`, `/forgot-password`, `/reset-password` as public routes and a catch-all that redirects to `/app`. This is ahead of need — Phase 5 hasn't happened yet — but it means the marketing landing page can claim `/` later without a breaking route change to anything built now. Flagging this since it's a structural call made before the page it's really for exists; easy to change if a different structure is preferred once Phase 5 is in view.

**`react-router-dom` pinned to the latest release (7.18.2), not downgraded.**
`npm audit` flagged a high-severity advisory in the 7.12–8.2 range, but it's specific to React Router's RSC (React Server Components) mode, which this app never uses — it's a plain Vite SPA with a client-side `<BrowserRouter>`, no server data loading or server actions. Tried pinning to 7.11.0 to dodge that advisory, but that range carries a much larger set of advisories that *do* apply to plain client-side routing (open redirects in `<Link>`/`useNavigate`, XSS in `ScrollRestoration`), all fixed by 7.17.0+. Latest is the safer choice for how this app actually uses the library.

**`TempAuthGate.jsx` deleted, not folded into the new auth flow.**
Real auth lives in `src/auth/`: `AuthProvider` (session context + `signOut`), `ProtectedRoute` (redirects to `/login`, preserves the originally-requested path via router state), and `LoginPage`/`SignupPage`/`ForgotPasswordPage`/`ResetPasswordPage`, all sharing an `AuthLayout` shell styled to match the rest of the app (same navy/teal/paper tokens, same input styling pattern as the existing `Modal` component's `.input` class).

**Sign-up handles both of Supabase's confirmation modes.**
`supabase.auth.signUp()` returns a session immediately if email confirmation is off in the project's Auth settings, or `session: null` if it's on. `SignupPage` checks for a session and either logs the user straight in or shows a "check your email" screen — it doesn't assume which mode the project is in.

**Password reset needs a Supabase-side redirect URL allowlisted — can't be done from code.**
`ForgotPasswordPage` sends users to `${origin}/reset-password`. Supabase rejects redirect URLs that aren't on the project's allowlist (Authentication → URL Configuration → Redirect URLs). `http://localhost:5173/**` needs adding now, and the production domain once Phase 6 deploys — this is a dashboard setting, not something a migration or client code can set.

**Sign-out lives in `App.jsx`'s `TopBar`, not a new component.**
One `useAuth().signOut` call behind a small icon button next to the existing "Keeper training" label — didn't introduce a new header or settings surface for a single action.

**Email-link flows (password reset, sign-up confirmation) verified as working server-side, but not click-tested end-to-end locally.**
The dev server this session runs against lives inside this sandboxed session, not the user's own machine — an email opened on their real device can't reach its `localhost:5173`. Confirmed the reset-request itself completes without error server-side (Supabase only returns the "check your email" success state when the API call succeeds), so the code path is sound; the actual link-click flow gets verified once Phase 6 deploys to a real, publicly-reachable domain. Documented here rather than treated as done, since it's genuinely unverified past that point.

## Phase 4 — Kip proxy

**Netlify Functions, per the brief's own Technical Requirements section — not re-litigated as a choice.**
The brief's build-order text says "your call" between a Netlify Function and a Supabase Edge Function, but the Technical Requirements section lower down already commits to "Netlify (Functions for the Kip proxy)." Went with that rather than treating it as open: Phase 6 already deploys via Netlify, so colocating the function there means one deploy target and one place secrets live, instead of splitting the backend across two platforms.

**`netlify/functions/kip-chat.js` verifies the caller's Supabase session before calling Anthropic.**
This endpoint is public once deployed — anything short of checking auth would let anyone with the URL burn the Anthropic budget, key or no key. The client sends its Supabase access token as a bearer header; the function verifies it via `supabase.auth.getUser(token)` (using the anon key, same as the client) before forwarding anything to Anthropic. `KipChat`'s `sendMessage` now fetches `/.netlify/functions/kip-chat` with that token instead of calling Anthropic directly — the API key itself never reaches the browser.

**Model id corrected from `claude-sonnet-4-6` to `claude-sonnet-5` while wiring this up.**
Flagged back in the Phase 1 summary as a model id I didn't recognize and hadn't verified. Now that this call is actually being made for real (rather than intercepted by the Claude.ai sandbox, which didn't care what string was in the `model` field), it needed to be a real, current model id — `claude-sonnet-5` is correct per current model documentation. Worth a second look if this stops working after a future model deprecation.

**`netlify-cli` added as a devDependency so functions are testable locally.**
Plain `vite dev` only serves the frontend — it doesn't know how to run `netlify/functions/*`. Added a `dev:netlify` script (`netlify dev`) and a `netlify.toml` `[dev]` block that proxies Vite on 5173 through Netlify's dev server on 8888, so both the app and the function are reachable from one place during local testing.

**Server-side secrets live in root `.env`, separate from the client-facing `.env.local`.**
`.env.local` keeps the `VITE_`-prefixed values Vite exposes to the browser bundle (Supabase URL/anon key). `.env` holds `SUPABASE_URL`, `SUPABASE_ANON_KEY` (unprefixed duplicates, read server-side by the function — same public-by-design values, just without the `VITE_` prefix so there's no ambiguity about which context reads which var) and `ANTHROPIC_API_KEY`, which never appears in `.env.local` or any client-reachable file. Both files are gitignored; `ANTHROPIC_API_KEY` still needs setting directly in Netlify's dashboard env vars for the deployed site in Phase 6, since `.env` never gets committed or uploaded.

**Accepted, monitored `npm audit` finding: `sharp`/libvips CVEs via `netlify-cli`'s optional image-transform tooling.**
Already on `netlify-cli`'s latest release (27.0.1); the vulnerable `sharp` version is pulled in transitively by `@netlify/images`, a dev-only image-proxy feature this project doesn't use. It's a devDependency that never ships to production or reaches an end user, and there's no newer release yet that resolves it. Not forcing a downgrade over it — will revisit if Netlify ships a patched release.

## Phase 5 — Marketing landing page

**`/` now renders the landing page; the catch-all redirects there instead of `/app`.**
This is the payoff of the Phase 3 call to put the protected app at `/app` ahead of need. No route changes needed to existing pages — `/`, previously unclaimed, now renders `src/marketing/LandingPage.jsx`; everything else (`/login`, `/app`, etc.) is untouched.

**Copy is grounded in what's actually built, not generic SaaS language — this is a first draft for review, not a final.** Per the brief's explicit ask. Four feature sections map directly to real functionality (Library, Builder, Stats, Kip), described in terms of what they actually do rather than benefit-speak. Flagging specifically for your review:
- The headline ("Built for the goal. Not the outfield.") and positioning line ("Keepr starts from the goal line.") are a first pass — there are more literal alternatives (e.g. leading with "handball goalkeeper training app") if this reads as too clever for the audience.
- No exact drill count is quoted in the library section (deliberately — the real number lives in `DEFAULT_EXERCISES` in `App.jsx`, and hardcoding it here risked drifting out of sync). Said "add your own alongside the built-in set" instead. If you want a hard number quoted, it needs pulling from that array, not typed by hand.
- Beach handball is given equal billing to indoor throughout, on the assumption it's not an afterthought market for you — worth confirming, since it's the smaller of the two disciplines in most regions.

**Hero visual is a stylised, illustrative goal-grid (real component logic, fake numbers), not a real product screenshot.** Built with the same save%-color-banding logic as the actual in-app `GoalGrid` (`≥60% teal / 40–59% amber / <40% red`), so it's an honest representation of what the feature looks like, not a mockup with invented UI. Didn't use an actual screenshot of the running app — happy to swap in a real one once there's a Stats page with enough logged data to look good, rather than screenshotting the mostly-empty dev account.

**Session-aware CTA, no forced redirects.** The primary button and header link read "Start training free" / "Log in" when signed out, "Go to your training" / "Open app" when signed in — using the same `useAuth()` hook as the rest of the app. Deliberately did *not* force-redirect a signed-in user away from `/` — someone might land there from a shared link and still want to see the marketing page.

**Privacy Policy and Terms of Service added at `/privacy` and `/terms`, linked from the landing page and legal-page footers.** Content is grounded in the actual data flows built in this project (Supabase for auth/storage under RLS, Anthropic via the server-side proxy for Kip, Netlify for hosting) rather than generic boilerplate — no claims about things that aren't true (no ad tracking, no data sales, because there are none). Flagging clearly: **this isn't legal advice and hasn't been reviewed by a lawyer.** It's a solid, honest starting draft; before a real public launch you should have someone qualified review it, particularly the liability/disclaimer language in the Terms given this app gives physical training advice (diving, sliding) with real injury risk. Also: the contact email used throughout is a placeholder (`hello@keepr.coach`) — that inbox doesn't exist yet and needs setting up (or forwarding) once the domain is live.

## Phase 6 — Netlify deploy

**Site created and deployed via Netlify CLI with a personal access token, not `netlify login`.** The user provided a token generated from their own Netlify account (User settings → Applications) rather than completing the interactive browser OAuth flow in this environment. Used it as `NETLIFY_AUTH_TOKEN` for CLI calls only within this session — not written to any file in the repo. Site name `keepr-app` was taken, Netlify auto-suffixed it to `keepr-app-482` (`keepr-app-482.netlify.app`); worth renaming once the custom domain is attached, since the auto-suffixed name will otherwise stick around as the default Netlify subdomain.

**All five environment variables set via `netlify env:set`, not the dashboard.** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY` (server-side, read by the function) and `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (build-time, baked into the client bundle by Vite) — same values as the local `.env`/`.env.local`, now living in Netlify's env store instead. Confirmed working via a live Kip round-trip against the deployed function post-deploy, not just a successful build.

**First deploy was manual (`netlify deploy --prod`), not git-linked, because the GitHub push needed the user's own credentials.** This environment couldn't authenticate `git push` (`fatal: could not read Username for 'https://github.com'`) — no cached credentials, no interactive terminal for GitHub's device/browser flow. Rather than block the whole phase on that, did a manual CLI deploy straight from the local `dist/` build to confirm the build genuinely works on Netlify's infrastructure (not just locally), then handed the `git push` step to the user. Continuous deployment (auto-rebuild on push) still needs linking in the Netlify dashboard once the push lands — that step requires authorizing Netlify's GitHub App, which is tied to the user's GitHub account and can't be done from a token alone.

**Domain purchase (`keepr.coach`) deferred to the user, by necessity.** It's a real financial transaction against their Netlify account's payment method — not something achievable via API token regardless of scope. Netlify sells domains directly through the dashboard; buying it that way auto-configures DNS (no manual record walkthrough needed), which simplifies what the original brief assumed would be a manual DNS step.

**Domain attached via the Netlify API, after confirming scope with the user first.** The account had two DNS zones — `keepr.coach` (this project, unattached, `site_id: null`) and a pre-existing, unrelated `beachhandball.live` zone tied to a different site. Explicitly confirmed with the user before touching anything, then used `updateSite` to set `custom_domain` and `configureDNSForSite` to create the actual DNS records — the zone existed from the purchase but had zero records until this ran. SSL provisioned automatically once the records existed.

**Continuous deployment: the API can configure the link, but can't grant real repo access — that gap cost one failed build.** Set the site's `repo` field via `updateSite` (provider, repo path, branch, build command), which looked complete in the API response, but the resulting auto-triggered build failed with `Host key verification failed` — Netlify had the repo *config* but no actual clone credentials (no GitHub App installed, no deploy key). That authorization step is unavoidably manual: it's a GitHub OAuth screen tied to the user's account. Once they completed it via the dashboard, triggered a fresh build via `createSiteBuild` and confirmed it built successfully with `commit_ref` matching the exact commit hash that was pushed — not just "the build succeeded" but "it pulled the real code."

## Post-launch — AI-writing content audit

**Audited landing page, Privacy Policy, and Terms copy against Wikipedia's "Signs of AI writing" checklist, at the user's request.** Two real findings, fixed: (1) overuse of em dashes as the default connector across all three files, now varied with periods, commas, colons, and parentheses depending on what each sentence actually needed; (2) a repeated "X, not Y" contrastive framing used five times on the landing page alone (headline, two feature-card titles, Kip's blurb, the dual-discipline line) — cut to two deliberate uses. Checked the full checklist against the files; found no hits on AI-vocabulary words (delve, crucial, tapestry, testament, vibrant, etc.), no promotional language, no copulative-avoidance ("serves as" instead of "is"), and no Title Case headers — those were already clean.

**"Outfield"/"outfielders" replaced with "court"/"court players" per the user's correction.** Handball doesn't use "outfield" — that's a cricket/baseball/soccer term; "court player" is the sport's actual term for a non-goalkeeper. Fixed the headline ("Not the court.") and the positioning strip.

**Local `netlify dev` hit an unrelated, unresolved quirk during verification — isolated, not chased.** Its HTML-transform step threw a parse error pinned to `index.html`'s `<title>` line, reproducing identically 3/3 times including after full cache clears and process kills, and persisting even after the flagged em dash was removed from that exact line — proof the reported location was misleading, not a real content issue. Verified the actual fix by running plain `vite dev` (no Netlify wrapper) instead, which rendered everything correctly with zero console errors. Since the deployed site builds via GitHub Actions independent of this local tool and Phase 6 already confirmed that pipeline works, didn't sink further time into Netlify Dev's internals for what's a local-only convenience layer.
