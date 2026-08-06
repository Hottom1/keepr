// Help Centre content — plain data, no React, so it can be searched and
// rendered the same lightweight way from anywhere in the app. Written
// against the app as it actually is right now (read through every tab
// before writing a word of this), not from any original feature spec —
// see DECISIONS.md for the ones that don't apply here (there's no billing
// in the app to write a Billing category about).
//
// body strings use a tiny plain-text convention, rendered by
// renderHelpBody() in App.jsx: blank line = paragraph break, a line
// starting with "- " = a bullet. Nothing fancier than that on purpose —
// this is FAQ-style content, not a CMS.

export const HELP_CATEGORIES = [
  { id: "library", label: "Library" },
  { id: "build", label: "Build" },
  { id: "plans", label: "Plans" },
  { id: "stats", label: "Stats" },
  { id: "record", label: "Record" },
  { id: "kip", label: "Kip" },
  { id: "calendar", label: "Calendar" },
  { id: "profile", label: "Profile" },
];

export const HELP_ARTICLES = [
  // ---------------------------------------------------------------- Library
  {
    id: "lib-search",
    category: "library",
    title: "Finding an exercise or drill",
    keywords: ["search", "filter", "category", "type", "season relevant", "browse"],
    body: `Library's search box filters by name as you type. Below it, two rows of chips narrow things further: the first row is season relevance (tap it to switch between "only what's relevant to your current discipline" and "all seasons") plus exercise type (Solo, Partner, Team, Gym), the second row is category (Reflexes, Footwork & Agility, Positioning, and so on).

Chips are toggles, not a single-select list — tap one on, tap it again to clear it. Search and filters combine, so you can search "catch" within just the Gym type if you want.

Tap any exercise to open it — you'll get what it trains, how to do it step by step, and a common mistake to watch for, plus sets/reps and equipment needed.`,
  },
  {
    id: "lib-add",
    category: "library",
    title: "Adding your own exercise",
    keywords: ["custom", "create exercise", "my own drill"],
    body: `Tap the + button next to Library's search bar to add your own exercise — name, category, type, season, equipment, format, and a description.

Anything you add gets a small "Mine" tag so it's easy to spot in a list alongside the built-in library. Only your own custom exercises can be removed (open one, "Remove from library" at the bottom) — the built-in library isn't editable, since Kip and the block builder both rely on it staying consistent.

Exercises pulled in from an uploaded PT/physio plan show up the same way, tagged "Physio" instead of "Mine."`,
  },
  {
    id: "lib-notes",
    category: "library",
    title: "Coach's Notes (the mental side)",
    keywords: ["mental", "advice", "psychology", "warm-up", "fundamentals"],
    body: `Library has a second tab alongside Exercises — "Coach's Notes." That's where the non-drill content lives: mental-side topics, warm-up structure, and fundamentals write-ups, organized by subject rather than as a single long article.`,
  },

  // ------------------------------------------------------------------ Build
  {
    id: "build-methods",
    category: "build",
    title: "Three ways to build a training block",
    keywords: ["new block", "6-week", "goal", "freeform", "build with kip", "generate"],
    body: `From Plans, "New block" gives you three ways to put a 6-week block together:

- Choose a goal, get a suggested structure — pick what you're working on and Keepr builds a progressive 6-week structure for you. If you've got a few matches or sessions logged, there's a "use my data" toggle that lets it weight the selection toward your actual weak zones, shot types, training gaps, or an unresolved niggle — it only appears when there's real data behind it, never as a placebo toggle.
- Build from scratch — pick every exercise yourself, week by week, full control from the start.
- Build with Kip — describe what you need in plain language ("beach block, my shoulder's a bit sore") and Kip drafts one for you to review.

All three land in the same review screen before anything's saved — nothing gets created without you seeing it first.`,
  },
  {
    id: "build-edit",
    category: "build",
    title: "Editing a block after it's built",
    keywords: ["plan editor", "add exercise", "remove exercise", "weeks", "sessions"],
    body: `Whichever method you use to build a block, you land in the same editor before it's saved — add or remove exercises per session, adjust weeks, rename it. Nothing is locked in until you save.

Once a block is saved, you can still open it from Plans and adjust it later — sessions you've already logged stay logged even if you change what's ahead of them.`,
  },

  // ------------------------------------------------------------------ Plans
  {
    id: "plans-log",
    category: "plans",
    title: "Logging a training session",
    keywords: ["rpe", "focus", "process goal", "complete session", "notes", "gym sets"],
    body: `Plans' "Today" card shows whatever session is next due, with its exercise list. There's an editable focus field — a one-line process goal for the session ("early first step," "soft hands") — that shows back up when you log it, so you can see whether you actually stuck to it.

You can record it live (see the Record help topic) or tap "Or log it after the fact" to mark it complete directly: rate RPE (effort, 1–10), add a note on how it felt, and if the session includes gym exercises, log your sets — weight and reps per set, same as any lifting app.

Logging is optional at every step — you can skip RPE and notes entirely and just mark a session done.`,
  },
  {
    id: "plans-streak",
    category: "plans",
    title: "Streaks and training load",
    keywords: ["weekly streak", "flame", "rpe trend", "chart"],
    body: `Plans shows a weekly streak (consecutive weeks with at least one completed session) once you've got one going, and an RPE-over-time chart once you've logged effort on more than one session — both are read-only, derived straight from what you've already logged, nothing to configure.`,
  },
  {
    id: "plans-adhoc",
    category: "plans",
    title: "One-off sessions that aren't part of a block",
    keywords: ["ad hoc", "extra session", "one-off"],
    body: `Not every session needs to belong to a 6-week block. From the Calendar view in Plans, tapping a date gives you the option to add a one-off training session — give it a title, optionally link exercises for reference, and log it the same way as any block session (RPE, notes). It's deliberately lighter than a full block session: no per-set gym logging, since that data only feeds progress graphs for exercises tracked inside a block.`,
  },

  // ------------------------------------------------------------------ Stats
  {
    id: "stats-log-match",
    category: "stats",
    title: "Logging a match",
    keywords: ["new match", "goal grid", "zone", "shot", "outcome", "save", "goal against"],
    body: `From Stats, the + button adds a match after the fact (date, opponent, competition, result, discipline, optional video link) — or "Record" starts one live, which also drops you straight into shot logging as it happens.

Either way, logging shots works the same: tap a zone on the goal grid, then say whether it was a Save or a Goal, and optionally the shot type and which shooter took it (pulled from that opponent's roster, if you've built one out). If the match has a video link, you can attach a timestamp to a shot so you can jump straight to it later.

Every logged shot can be removed individually — tap the X next to it in the shot list — so a mis-tap during a live match isn't permanent.`,
  },
  {
    id: "stats-zones",
    category: "stats",
    title: "The goal-zone grid and your save stats",
    keywords: ["save percentage", "zone breakdown", "indoor scoring", "beach scoring", "points against"],
    body: `The goal is split into nine zones (top/mid/bottom × left/centre/right). Every shot you log against a zone builds up your save percentage for that zone specifically, not just an overall number — Stats shows your best and worst zone once there's enough logged to compare.

Scoring differs by discipline: indoor, every goal against is just a goal. Beach handball scores shots — a regular goal is worth 1 point, but a spin/360, in-flight, specialist, or 6m penalty goal is worth 2, matching real IHF beach handball rules — so Stats shows "Points against" for beach matches instead of a plain goal count.

Use the Indoor / Beach / All chips at the top of Stats to filter which matches your numbers are drawn from.`,
  },
  {
    id: "stats-opponents",
    category: "stats",
    title: "Opponent history and per-shooter breakdowns",
    keywords: ["roster", "shooter number", "opponent record"],
    body: `Tap an opponent's name (from the match form or a match's detail page) to open their history — your record against them, and a roster you can build out yourself: shooter numbers and names.

Once a roster exists, you can tag shots with which shooter took them while logging, and Stats builds a per-shooter save percentage automatically — useful for knowing who to watch for before you play a team again.`,
  },
  {
    id: "stats-reports",
    category: "stats",
    title: "Generating a progress report",
    keywords: ["report", "summary", "kip report"],
    body: `Stats' Reports card ("+ Generate report") pulls together your real numbers — save% trend, weakest zones, training completion, RPE trend, gym progress — and has Kip write it up as a few honest paragraphs, not a bullet-point dump. It's a snapshot of that moment, saved permanently, so it won't silently change later if your underlying numbers shift. Past reports are listed right there to reopen any time.`,
  },

  // ----------------------------------------------------------------- Record
  {
    id: "record-live",
    category: "record",
    title: "Recording a live match or session",
    keywords: ["live recording", "pause", "resume", "finish", "ask kip"],
    body: `The Record tab is the fast path into either a training session or a match — tap one, and if there's already something in progress, it offers to resume rather than starting over.

Training sessions default to whatever's next due in your plans, or a one-off if nothing's scheduled. Matches ask for the opponent first, then drop you into the goal grid.

While recording, you can pause and resume freely (the timer accounts for paused time), tap "Ask Kip" for a quick, data-grounded chip ("who's dangerous today," that kind of thing) without leaving the recorder, and Finish whenever you're done — it'll ask for the final score if you haven't entered one yet. Closing the app mid-recording doesn't lose anything; reopening picks up exactly where you left off.`,
  },
  {
    id: "record-teammates",
    category: "record",
    title: "Recording for a connected teammate",
    keywords: ["teammate", "connection", "invite code", "recording for", "permission"],
    body: `If you and a teammate both use Keepr, you can connect (Profile → Teammates: share your invite code, or enter theirs) and, separately, choose to let them log matches into your account — connecting and granting recording permission are two different switches on purpose, so accepting a teammate request never by itself hands over write access to your data.

Once someone's granted you that permission, starting a live match gives you the option to link it to them. A "Now recording for: Me / [teammate]" switch appears in the recorder — whoever's selected is who the next shots you log get attributed to. It's still two separate match records under the hood (same opponent and date, different shots), not one shared one.

Anything logged into a teammate's account shows up there tagged "Recorded by [you]" — they can review and correct it afterward exactly like any match they logged themselves. Either side can disconnect at any time from Profile; it only stops future recording, past matches are untouched.`,
  },

  // -------------------------------------------------------------------- Kip
  {
    id: "kip-overview",
    category: "kip",
    title: "What Kip can actually do",
    keywords: ["assistant", "chat", "ai", "coach"],
    body: `Kip is Keepr's built-in coach — a chat you can ask anything, but it also takes real actions: it can pull your actual logged numbers when you ask something specific (a zone or shot-type breakdown, training summary, gym progress, how you've done against a particular opponent) rather than guessing, it can build a full training block right in the conversation, and it generates the same progress reports Stats does.

It's grounded in what you've actually logged — if you haven't logged much yet, it'll say so rather than making something up.`,
  },
  {
    id: "kip-profile",
    category: "kip",
    title: "Setting up your profile so Kip's advice fits you",
    keywords: ["onboarding", "level", "discipline", "niggles", "weaknesses", "access"],
    body: `Profile has an onboarding section Kip reads from: your level, discipline, optional gender (for grounded sex-specific content, entirely optional), season phase and next competition, how many sessions a week and how long, what you've got access to (court, sand, gym, ball wall, or none of the above), self-identified weaknesses, and any niggles — with severity and whether a physio's cleared them.

None of it's required, but the more that's filled in, the more Kip's suggestions and the data-driven block-building option actually fit your situation instead of being generic. Niggle details never leave your own account — they're excluded from anything shareable, including the coach-sharing feature.`,
  },
  {
    id: "kip-alerts",
    category: "kip",
    title: "Kip's proactive check-ins and alerts",
    keywords: ["notifications", "in-app alerts", "check-in"],
    body: `Kip checks in on its own when something's genuinely worth flagging — a missed streak, a weakening zone, load creeping up, a niggle gone quiet without being cleared, a new PR. A small dot appears on the Kip tab when there's something new; open the tab and it delivers one natural message covering it, not a stack of separate notifications.

This is the in-app version — turn it off with the toggle at the top of the Kip tab if you'd rather not get proactive check-ins at all. Email versions of the same alerts are a separate setting in Profile (see Email alerts), so turning one off doesn't silently turn off the other.`,
  },
  {
    id: "kip-points",
    category: "kip",
    title: "Points and badges",
    keywords: ["gamification", "trophy", "achievements"],
    body: `Tap the points pill at the top of the Kip tab to see your total and every badge — earned and not yet. Points come from completed sessions, logged matches, and PRs; badges are tiered milestones built on top of that same activity. Nothing to configure here, it's just a read-out of what you've already logged.`,
  },

  // ------------------------------------------------------------- Calendar
  {
    id: "cal-view",
    category: "calendar",
    title: "The Calendar view",
    keywords: ["schedule", "month view", "add training", "add game"],
    body: `Plans has a List/Calendar toggle near the top. Calendar view lays your plan sessions, matches, and one-off sessions out on a month grid — tap any date to add a training session or a match on that day, or tap an existing item to open and log it.`,
  },
  {
    id: "cal-forward",
    category: "calendar",
    title: "Forwarding a match or training invite by email",
    keywords: ["inbound alias", "forward email", "ics", "calendar invite"],
    body: `Profile shows a unique email address under "Forward your schedule" — forward a match or training invite to it (a calendar invite with a real .ics attachment, or just a plain email mentioning a fixture) and Kip reads it and works out what it found.

Nothing is added automatically. It lands as a suggestion in Plans (a banner at the top: "N forwarded items to review") where you confirm it's a match or training session, fix anything it got wrong, and only then does it become a real entry — or you can discard it.`,
  },
  {
    id: "cal-bulk",
    category: "calendar",
    title: "Uploading your whole season schedule at once",
    keywords: ["season schedule", "bulk upload", "spreadsheet", "csv", "fixtures"],
    body: `Profile → Uploads has a "Season schedule" card that accepts a PDF, a photo, or a spreadsheet (CSV or Excel) of your fixture list. It extracts every fixture it can find and shows you the whole list before adding anything — every row starts checked and is individually editable, so you can fix a wrong date or deselect one that got misread rather than accepting or rejecting the whole batch. Tap "Add N matches" once you're happy with the selection.`,
  },

  // -------------------------------------------------------------- Profile
  {
    id: "profile-uploads",
    category: "profile",
    title: "Uploading a PT or physio plan",
    keywords: ["physio", "rehab", "pdf upload", "extraction"],
    body: `Profile → Uploads lets you hand over a PDF or photo of a rehab/PT plan. Keepr reads it and shows you what it found before anything's added — confirm and it becomes a rehab block you can follow like any other training block, with the exercises tagged "Physio" in your Library.`,
  },
  {
    id: "profile-email-alerts",
    category: "profile",
    title: "Email alerts",
    keywords: ["notifications", "unsubscribe", "categories", "master switch"],
    body: `Profile's "Email alerts" card is the email counterpart to Kip's in-app check-ins, covering the same underlying conditions — missed sessions & streaks, training load, gym plateaus, weakening zones, quiet niggles, and PRs/milestones — each individually toggleable, plus one master switch that covers all of them including email.

Emails are sent at most once a day and only when there's something genuinely new to say, not on a fixed schedule regardless of content. Every email has a working unsubscribe link, which flips the same master switch shown here.`,
  },
  {
    id: "profile-coach",
    category: "profile",
    title: "Sharing progress with your coach",
    keywords: ["coach email", "digest", "send now", "cadence"],
    body: `Profile → "Share with coach" lets you add a coach's email — they don't need a Keepr account, it's just a recipient. You control what's in it: training completion/session logs, match stats, and which sessions you've attended are each independently toggleable (all on by default once you add a coach), and you choose weekly or monthly as the digest cadence.

"Send now" sends an update immediately regardless of the schedule. Every digest that goes out is also saved to your own Reports, so you can see exactly what your coach received. Removing the coach's email is just as easy as adding it — nothing else changes.`,
  },
  {
    id: "profile-account",
    category: "profile",
    title: "Your account and signing out",
    keywords: ["sign out", "logout", "discipline toggle", "winter summer"],
    body: `Sign out from the small icon next to the Winter/Summer toggle at the top of every screen. That same toggle sets your current discipline — it controls which exercises Library treats as "relevant right now" and what a new training block defaults to, but doesn't hide or delete anything from the other discipline.`,
  },
];

// Deliberately simple keyword scoring, not fuzzy/semantic matching — a few
// dozen articles doesn't need more than this. Title hits count for more
// than a keyword hit, which counts for more than a body hit, so a search
// for "rpe" surfaces the article titled around RPE before one that just
// mentions it in passing.
export function searchHelpArticles(query, articles = HELP_ARTICLES) {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const terms = q.split(/\s+/).filter(Boolean);

  return articles
    .map((article) => {
      const title = article.title.toLowerCase();
      const keywords = (article.keywords || []).join(" ").toLowerCase();
      const body = article.body.toLowerCase();
      let score = 0;
      for (const term of terms) {
        if (title.includes(term)) score += title === term ? 6 : 4;
        if (keywords.includes(term)) score += 3;
        if (body.includes(term)) score += 1;
      }
      return { article, score };
    })
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((r) => r.article);
}

export function articlesByCategory(categoryId, articles = HELP_ARTICLES) {
  return articles.filter((a) => a.category === categoryId);
}

export function findHelpArticle(id, articles = HELP_ARTICLES) {
  return articles.find((a) => a.id === id) || null;
}
