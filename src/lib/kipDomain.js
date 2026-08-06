// Pure, framework-free domain logic — no React, no browser globals, no JSX.
// Shared verbatim between the client (src/App.jsx) and server-side Netlify
// Functions (the scheduled Kip email-alerts job, the inbound-email webhook)
// so alert conditions and block generation are computed identically in both
// places, per the "reused, not reimplemented" requirement in DECISIONS.md,
// "Email infrastructure (ImprovMX)". Moved verbatim out of App.jsx — see
// that entry for why this boundary exists, not a rewrite.

export const CATS = [
  "Warm-Up",
  "Reflexes",
  "Diving & Ground Work",
  "Footwork & Agility",
  "Positioning",
  "Shot Reading",
  "1v1 & Breakaways",
  "Strength & Power",
  "Conditioning",
  "Core & Prevention",
  "Fast Break & Distribution",
];

export const GOALS = [
  { id: "reaction", name: "Reaction Speed", blurb: "Sharpen first-movement speed and hand reflexes.", cats: ["Reflexes", "Shot Reading"] },
  { id: "diving", name: "Diving & Ground Coverage", blurb: "Extend your range and recover faster off the floor.", cats: ["Diving & Ground Work", "Core & Prevention"] },
  { id: "power", name: "Explosive Power", blurb: "Build the push-off and jump power behind every save.", cats: ["Strength & Power", "Footwork & Agility"] },
  { id: "footwork", name: "Footwork & Positioning", blurb: "Cleaner angles, tighter footwork, better set-up.", cats: ["Footwork & Agility", "Positioning"] },
  { id: "allround", name: "All-Round Keeper", blurb: "A balanced block touching every area.", cats: CATS },
];

export const PHASES = [
  { weeks: [1, 2], label: "Foundation", sessions: 2, perSession: 3 },
  { weeks: [3, 4], label: "Build", sessions: 3, perSession: 4 },
  { weeks: [5, 6], label: "Peak", sessions: 3, perSession: 4 },
];

export const ZONE_GRID = [
  ["TL", "TM", "TR"],
  ["ML", "MM", "MR"],
  ["BL", "BM", "BR"],
];
export const ZONE_LABELS = {
  TL: "Top Left", TM: "Top Centre", TR: "Top Right",
  ML: "Mid Left", MM: "Mid Centre", MR: "Mid Right",
  BL: "Bottom Left", BM: "Bottom Centre", BR: "Bottom Right",
};

// Indoor: every goal is worth 1 point regardless of shot type — these tags are context only.
export const INDOOR_SHOT_TYPES = ["Wing", "9m", "6m", "Fast break", "7m Penalty", "Other"];

// Beach handball: a regular goal is 1 point. Spin/360, in-flight, a specialist/goalkeeper
// goal, and a 6m penalty goal are each worth 2 points under IHF beach handball rules.
export const BEACH_SHOT_TYPES = ["Regular", "Spin / 360", "In-flight", "Specialist / GK goal", "6m Penalty"];
export const BEACH_TWO_POINT_TYPES = ["Spin / 360", "In-flight", "Specialist / GK goal", "6m Penalty"];

export function shotTypesFor(season) {
  return season === "Summer" ? BEACH_SHOT_TYPES : INDOOR_SHOT_TYPES;
}

export function pointsForShot(season, shotType) {
  if (season === "Summer" && BEACH_TWO_POINT_TYPES.includes(shotType)) return 2;
  return 1;
}

export function emptyZoneMap() {
  const z = {};
  ZONE_GRID.flat().forEach((k) => { z[k] = { saves: 0, goals: 0, points: 0 }; });
  return z;
}

export function aggregateMatchStats(matches, seasonFilter) {
  const zones = emptyZoneMap();
  let totalSaves = 0, totalGoals = 0, totalPoints = 0;
  const trend = [];
  matches
    .filter((m) => seasonFilter === "All" || m.season === seasonFilter)
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((m) => {
      let mSaves = 0, mShots = 0;
      (m.shots || []).forEach((s) => {
        const z = zones[s.zone];
        if (!z) return;
        mShots++;
        if (s.outcome === "Save") {
          z.saves++; totalSaves++; mSaves++;
        } else {
          z.goals++; totalGoals++;
          const pts = pointsForShot(m.season, s.shotType);
          z.points += pts; totalPoints += pts;
        }
      });
      if (mShots > 0) trend.push({ date: m.date, opponent: m.opponent, savePct: Math.round((mSaves / mShots) * 100) });
    });
  return { zones, totalSaves, totalGoals, totalPoints, trend };
}

export function aggregateShotTypeStats(matches) {
  const map = {};
  matches.filter((m) => m.season === "Summer").forEach((m) => {
    (m.shots || []).forEach((s) => {
      const t = s.shotType || "Regular";
      if (!map[t]) map[t] = { saves: 0, goals: 0 };
      if (s.outcome === "Save") map[t].saves++; else map[t].goals++;
    });
  });
  return map;
}

// The six standard outfield attacking positions in indoor handball, left to
// right across the court as a keeper would actually face them. A distinct
// axis from shotType (origin/range — Wing/9m/6m/etc) and zone (where in the
// GOAL the shot landed) — position is which court lane the shooter played
// from. Additive, optional, indoor-only: beach handball's 3-a-side format
// has no equivalent formation, so this is never asked for a Summer match.
export const POSITIONS = ["LW", "LB", "CB", "RB", "RW", "Pivot"];

export function aggregatePositionStats(matches) {
  const map = {};
  matches.filter((m) => m.season === "Winter").forEach((m) => {
    (m.shots || []).forEach((s) => {
      if (!s.position) return;
      if (!map[s.position]) map[s.position] = { saves: 0, goals: 0 };
      if (s.outcome === "Save") map[s.position].saves++; else map[s.position].goals++;
    });
  });
  return map;
}

// Shared key for anything grouped by opponent name — matches, opponent
// records, and the roster below all key off this exact normalization so a
// team is recognized as "the same opponent" regardless of casing/whitespace.
export function normalizeOpponentName(name) {
  return (name || "").trim().toLowerCase();
}

// Best-effort record: only counts matches whose free-text "result" field ends in a
// standalone W/L/D (the form's own placeholder convention, e.g. "24-19 W"). Matches that
// don't parse still count toward the match total and save% below, just not the record.
export function opponentRecord(matches, opponentName, excludeId) {
  const target = normalizeOpponentName(opponentName);
  if (!target) return null;
  const prior = matches.filter((m) => m.id !== excludeId && normalizeOpponentName(m.opponent) === target);
  if (prior.length === 0) return null;
  let wins = 0, losses = 0, draws = 0, saves = 0, shots = 0;
  prior.forEach((m) => {
    const letter = (m.result || "").trim().toUpperCase().match(/\b([WLD])\s*$/)?.[1];
    if (letter === "W") wins++;
    else if (letter === "L") losses++;
    else if (letter === "D") draws++;
    (m.shots || []).forEach((s) => {
      shots++;
      if (s.outcome === "Save") saves++;
    });
  });
  return {
    count: prior.length,
    wins, losses, draws,
    recordKnown: wins + losses + draws > 0,
    savePct: shots > 0 ? Math.round((saves / shots) * 100) : null,
    shots,
  };
}

// The roster lives at the opponent-team level, not per-match — one shared
// list of {number, name} shooters reused across every match against that
// team, keyed by the same normalized name as opponentRecord.
export function findOpponentRoster(opponents, opponentName) {
  const key = normalizeOpponentName(opponentName);
  if (!key) return null;
  return (opponents || []).find((o) => o.key === key) || null;
}

export function upsertOpponentRoster(opponents, opponentName, roster) {
  const key = normalizeOpponentName(opponentName);
  const name = (opponentName || "").trim();
  const exists = (opponents || []).some((o) => o.key === key);
  return exists
    ? opponents.map((o) => (o.key === key ? { ...o, name, roster } : o))
    : [...(opponents || []), { key, name, roster }];
}

// Per-shooter save%/goals across every match vs this opponent, matched by
// shot.shooterNumber against the roster's jersey number. Returns [] until
// shots actually carry shooterNumber (wired in a later pass) — harmless,
// since every caller already handles an empty breakdown.
export function shooterStats(matches, opponentName, roster) {
  const target = normalizeOpponentName(opponentName);
  const byNumber = {};
  (matches || []).filter((m) => normalizeOpponentName(m.opponent) === target).forEach((m) => {
    (m.shots || []).forEach((s) => {
      if (s.shooterNumber == null) return;
      const key = String(s.shooterNumber);
      if (!byNumber[key]) byNumber[key] = { saves: 0, goals: 0 };
      if (s.outcome === "Save") byNumber[key].saves++;
      else byNumber[key].goals++;
    });
  });
  return Object.entries(byNumber)
    .map(([number, v]) => {
      const total = v.saves + v.goals;
      const rosterEntry = (roster || []).find((r) => String(r.number) === number);
      return {
        number,
        name: rosterEntry?.name || null,
        saves: v.saves,
        goals: v.goals,
        total,
        savePct: total > 0 ? Math.round((v.saves / total) * 100) : null,
      };
    })
    .sort((a, b) => b.goals - a.goals);
}

// Highest-scoring shooter on record, for the "heads up" note surfaced when
// setting up a match against a team faced before.
export function mostDangerousShooter(matches, opponentName, roster) {
  const stats = shooterStats(matches, opponentName, roster).filter((s) => s.goals > 0);
  return stats.length ? stats[0] : null;
}

// mm:ss or h:mm:ss free text (matches whatever convention the keeper's video platform uses).
export function parseTimestampToSeconds(ts) {
  if (!ts) return null;
  const parts = ts.split(":").map((p) => Number(p.trim()));
  if (parts.length === 0 || parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

// Deep-links only for recognisable YouTube URLs (the one host with a reliable &t= param);
// everything else falls back to the plain video link — no automatic detection, per the brief.
export function videoLinkForShot(videoUrl, timestamp) {
  if (!videoUrl) return null;
  const seconds = parseTimestampToSeconds(timestamp);
  if (seconds == null) return videoUrl;
  if (/youtu\.?be/i.test(videoUrl)) {
    const sep = videoUrl.includes("?") ? "&" : "?";
    return `${videoUrl}${sep}t=${seconds}s`;
  }
  return videoUrl;
}

export function zoneColor(z) {
  const total = z.saves + z.goals;
  if (total === 0) return "#F3F2ED";
  const pct = z.saves / total;
  if (pct >= 0.6) return "#0E8388";
  if (pct >= 0.4) return "#E2984B";
  return "#C1483B";
}

export function buildKipSystemPrompt(profile, plans, season, matches, exercises = [], adHocSessions = []) {
  const activePlan = [...plans].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const recentLogs = [];
  plans.forEach((p) => {
    p.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        if (s.completed) recentLogs.push({ plan: p.name, week: w.weekNumber, session: s.sessionNumber, focus: s.focus, rpe: s.rpe, note: s.note });
      });
    });
  });
  const lastLogs = recentLogs.slice(-8);

  const lines = [
    "You are Kip, an AI training coach for handball and beach handball goalkeepers, built into an app called Keepr.",
    "Persona: you talk like an experienced goalkeeper coach texting a player you know well — knowledgeable, direct, a little dry. Not a hype machine, not customer support. No filler openers: never start with \"Great question,\" \"I'd be happy to help,\" \"Certainly,\" or any variant — just answer. Don't restate what the keeper just said back to them before responding. Default to plain prose, 1-3 sentences, mobile-chat length, unless they ask for depth or the content is genuinely list-shaped (a few exercises, a couple of options) — don't turn one piece of advice into bullet points out of habit. Cut hedging filler like \"it's worth noting that\" or \"keep in mind\" — say the thing directly. Praise only when it's specific and earned (a real PR, a genuine step forward), never generic cheerleading for routine logging or an ordinary check-in. Use contractions, write like a person who knows the sport. Don't close every message with a recap or a tacked-on question — end when you're actually done saying something.",
    "Coaching knowledge: you know handball goalkeeping specifically, not sport in general — draw on this the way a coach naturally drops the right term without announcing it, never as a recited list. Short corner and long corner are relative to the shooter at the moment of release (short is whichever post is nearer them, long is the far one), not fixed left/right — translate naturally between this and Keepr's own fixed zone grid (top-left, bottom-right, etc.) when both come up. Name specific save techniques when they're actually relevant — goalkeeper's sit, splits (sitting astride) with trunk rotation, arm-and-leg save, elbow-and-knee save — each tied to a specific ball height or position, not just \"get down\" or \"reach for it.\" \"Pulling the throw\" is a shooter's fake — a straight throw shown, then the wrist extends late to redirect it — name it specifically when a keeper describes being deceived on a shot, rather than saying \"watch the shoulders\" generically. Central throws, especially from 9m, are technically the hardest and most likely to leave a keeper's movement falling short of what the shot needed — that's a different axis from distance, not the same thing. Distinguish direct from bounced penalty throws — bounced ones are measurably harder to save — rather than treating \"penalties\" as one category. Kinematic cues (approach path, jump timing, shoulder/body rotation, throwing arm/wrist/ball position) and contextual cues (a shooter's known tendencies, who a team feeds under pressure, block position and whether it's active or passive) are two different families of information — be clear which kind you're pointing a keeper toward. Quiet eye — a stable final fixation held just before the save, linked to more effective saves — is a real, nameable skill, not just \"focus.\" Bait-the-corner is deliberately showing a corner open to induce a predictable shot, then closing it late. Distance changes the kind of decision a keeper is making, not just its difficulty — more time to read and simulate options from range, far more reactive and instant up close — treat these as different skills if a keeper describes struggling at a specific range. Location-reading tends to be a relative strength for trained goalkeepers versus timing-reading — if a keeper's getting beaten despite reading direction correctly, probe timing specifically. The goalkeeper's job includes organizing and communicating with the defense, not just stopping shots — acknowledge that dimension if a keeper brings up team or defensive issues rather than redirecting everything to individual technique. Beach and indoor differ in more than surface — sand changes push-off and landing mechanics, the spin/360 shot needs its own read, and heat/fatigue management matters more in beach sessions.",
    "You must never diagnose injuries or advise training through real pain. For anything beyond mild soreness or fatigue, tell the keeper to get it looked at by a physio rather than prescribing around it.",
    "You can suggest adjustments to a session (shorter, different equipment, lower intensity, swapped exercises) in plain language. You cannot directly edit their saved plan in the app yet, so be explicit about what you're suggesting rather than implying you've changed anything.",
    (profile.gender === "male" || profile.gender === "female")
      ? `If relevant, you can quietly lean on two evidence-based tailoring points for this keeper — never announce or lead with gender, just let it inform the advice. (1) Quiet-eye coaching cue: research on elite handball goalkeepers (Jedziniak et al., 2025) found effective male goalkeepers tend to fixate on the throwing arm/forearm and ball, effective female goalkeepers on the torso and head — when coaching visual focus, lean toward the ${profile.gender === "male" ? "arm/ball" : "torso/head"} cue for this keeper, but the general principle (hold the fixation steady through release) applies either way. (2) Injury prevention: cutting and landing sports carry well-documented higher ACL injury risk for female athletes — ${profile.gender === "female" ? "for this keeper, lean a bit more into landing-mechanics and core/neuromuscular stability advice when relevant" : "not directly relevant for this keeper"}. Neither point changes anything else about how you coach them.`
      : null,
    "",
    `Current season context: ${season === "Winter" ? "Winter — indoor court handball" : "Summer — beach handball"}.`,
    "",
    "KEEPER PROFILE:",
    `Level: ${profile.level || "Not set"}. Discipline: ${profile.discipline || "Not set"}.`,
    `Gender: ${profile.gender === "male" ? "Male" : profile.gender === "female" ? "Female" : "Not set"}.`,
    `Season phase: ${profile.seasonPhase || "Not set"}. Next competition: ${profile.nextCompetition || "Not set"}.`,
    `Availability: ${profile.sessionsPerWeek || "?"} sessions/week, ~${profile.minutesPerSession || "?"} min each.`,
    `Access: ${Object.entries(profile.access || {}).filter(([, v]) => v).map(([k]) => k).join(", ") || "Not set"}.`,
    `Self-rated weaknesses to prioritise: ${(profile.weaknesses || []).join(", ") || "None flagged"}.`,
    `Current niggles: ${(profile.niggles || []).length ? profile.niggles.map((n) => {
      const recentLogs = [...(n.rehabLog || [])].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 3);
      const logSummary = recentLogs.length
        ? ` — recent rehab log: ${recentLogs.map((l) => `${l.date}: "${l.note}"`).join("; ")}`
        : "";
      return `${n.part} (${n.severity}, cleared by physio: ${n.clearedByPhysio ? "yes" : "no"})${logSummary}`;
    }).join(" | ") : "None reported"}.`,
    "",
    "CURRENT PROGRAM:",
    activePlan
      ? `"${activePlan.name}" — ${activePlan.season} block${activePlan.goal ? `, goal: ${activePlan.goal}` : ""}. ${activePlan.weeks.length} weeks: ${activePlan.weeks.map((w) => `Week ${w.weekNumber}${w.focus ? ` (${w.focus})` : ""}`).join(", ")}.`
      : "No saved training block yet — encourage them to build one, or talk through what they need in the meantime.",
    "",
    "RECENT SESSION LOGS:",
    lastLogs.length ? lastLogs.map((l) => `${l.plan} W${l.week} S${l.session}${l.focus ? ` — focus was: "${l.focus}"` : ""}${l.rpe ? ` — RPE ${l.rpe}` : ""}${l.note ? ` — "${l.note}"` : ""}`).join("\n") : "No completed sessions logged yet.",
    "",
    "MATCH STATS:",
    (() => {
      if (!matches || matches.length === 0) return "No match stats logged yet.";
      const agg = aggregateMatchStats(matches, season);
      if (agg.totalSaves + agg.totalGoals === 0) return "No shots logged yet for the current season.";
      const zoneEntries = Object.entries(agg.zones).filter(([, z]) => z.saves + z.goals > 0);
      const weakest = zoneEntries.sort((a, b) => (a[1].saves / (a[1].saves + a[1].goals)) - (b[1].saves / (b[1].saves + b[1].goals)))[0];
      const savePct = Math.round((agg.totalSaves / (agg.totalSaves + agg.totalGoals)) * 100);
      return `Season save rate: ${savePct}% across ${agg.totalSaves + agg.totalGoals} shots logged. Weakest zone: ${ZONE_LABELS[weakest[0]]} (${weakest[1].saves}/${weakest[1].saves + weakest[1].goals} saved).`;
    })(),
    "",
    "GYM TRAINING LOG:",
    (() => {
      const summaries = [...loggedGymExerciseIds(plans, adHocSessions)].map((id) => {
        const ex = exercises.find((e) => e.id === id);
        const history = exerciseLogHistory(plans, id, adHocSessions);
        if (!ex || history.length === 0) return null;
        const first = history[0];
        const latest = history[history.length - 1];
        const trend = history.length > 1
          ? latest.topWeight > first.topWeight ? "trending up" : latest.topWeight < first.topWeight ? "trending down" : "holding steady"
          : "first session logged";
        const prCount = history.filter((h) => h.isPr).length;
        return `${ex.name}: ${history.length} session${history.length !== 1 ? "s" : ""} logged, latest top set ${latest.topWeight}kg (est. 1RM ${latest.e1rm}kg), ${trend}${prCount ? `, ${prCount} PR${prCount !== 1 ? "s" : ""} hit` : ""}.`;
      }).filter(Boolean);
      return summaries.length ? summaries.join("\n") : "No gym sets logged yet.";
    })(),
  ];
  return lines.join("\n");
}

export const uid = () => Math.random().toString(36).slice(2, 10);

export function phaseFor(weekNum) {
  return PHASES.find((p) => p.weeks.includes(weekNum)) || PHASES[0];
}

export function poolFor(exercises, season, cats) {
  const pool = exercises.filter(
    (e) => (e.season === "Both" || e.season === season) && cats.includes(e.category)
  );
  return pool.length ? pool : exercises.filter((e) => e.season === "Both" || e.season === season);
}

/* ---------------------------------------------------------------- */
/* Data-driven block generation                                       */
/* Optional bias layer on top of the existing category-cycling         */
/* generator: weak match-stat zones/shot-types, training-log RPE/      */
/* completion signal, and gym-lift plateau detection each nudge a      */
/* weighted-without-replacement picker instead of a blind cursor.      */
/* Falls back to identical blind cycling when data is sparse or the    */
/* "use my data" option is off — see generateGoalBlock's hasSignal     */
/* check, which is the actual fallback gate, not just a UI toggle.     */
/* ---------------------------------------------------------------- */

// Free-text niggle "part" is normalized against this small controlled
// vocabulary, shared with each exercise's loadAreas tag.
export const NIGGLE_AREA_KEYWORDS = {
  shoulder: ["shoulder", "rotator cuff", "ac joint", "deltoid"],
  elbow: ["elbow"],
  wrist: ["wrist", "hand"],
  hip: ["hip", "glute"],
  groin: ["groin", "adductor"],
  hamstring: ["hamstring", "hammy"],
  knee: ["knee", "acl", "mcl", "meniscus", "patella"],
  ankle: ["ankle"],
  "low back": ["back", "lumbar", "spine"],
  core: ["core", "abs", "abdominal", "oblique"],
  calf: ["calf", "achilles", "shin"],
};

export function matchNiggleAreas(partText) {
  if (!partText) return [];
  const lower = partText.toLowerCase();
  return Object.entries(NIGGLE_AREA_KEYWORDS)
    .filter(([, keywords]) => keywords.some((kw) => lower.includes(kw)))
    .map(([area]) => area);
}

// Hard exclusion, not deprioritization — same caution as Kip's "never
// suggest training through real pain" rule. A niggle counts as hard if
// it's Significant severity OR simply not yet cleared by physio,
// regardless of severity. If the free-text body part can't be
// confidently matched to a known area, fail safe by excluding every
// load-bearing category rather than guessing which exercises are safe.
export function excludedExerciseIdsForNiggles(exercises, niggles) {
  const hard = (niggles || []).filter((n) => n.severity === "Significant" || !n.clearedByPhysio);
  const excluded = new Set();
  if (hard.length === 0) return excluded;

  let anyUnmatched = false;
  hard.forEach((n) => {
    const areas = matchNiggleAreas(n.part);
    if (areas.length === 0) { anyUnmatched = true; return; }
    exercises.forEach((ex) => {
      if ((ex.loadAreas || []).some((a) => areas.includes(a))) excluded.add(ex.id);
    });
  });
  if (anyUnmatched) {
    exercises.forEach((ex) => {
      if (ex.type === "Gym" || ex.category === "Core & Prevention") excluded.add(ex.id);
    });
  }
  return excluded;
}

// A handful of exercises are genuinely tied to a specific zone or shot
// type by their own description, unlike most of the library which is
// zone-agnostic. Kept as a small local lookup rather than a persisted
// field — it only decides which picks earn a specific reason string.
export const NEAR_POST_ZONES = ["TL", "ML", "BL", "TR", "MR", "BR"];
export const LOW_ZONES = ["BL", "BM", "BR"];
export const EXERCISE_ZONE_MAP = {
  e17: NEAR_POST_ZONES, // Near-Post Coverage Drill
  e22: NEAR_POST_ZONES, // Wing Shot Angle Reading
  e8: LOW_ZONES, // Low Ball Smother Drill
};
export const EXERCISE_SHOTTYPE_MAP = {
  e21: "Spin / 360", // Spin Shot Anticipation
  e26: "Spin / 360", // Beach Penalty (Spin) Reps
};

export const MATCH_DATA_MIN_MATCHES = 3;
export const MATCH_DATA_MIN_SHOTS = 15;
export const TRAINING_LOG_MIN_SESSIONS = 4;
export const TRAINING_LOG_WINDOW_DAYS = 42; // 6 weeks

export function weakestZoneSignal(matches, season) {
  const agg = aggregateMatchStats(matches, season);
  const totalShots = agg.totalSaves + agg.totalGoals;
  const seasonMatches = matches.filter((m) => m.season === season).length;
  if (seasonMatches < MATCH_DATA_MIN_MATCHES || totalShots < MATCH_DATA_MIN_SHOTS) return null;
  const zoneEntries = Object.entries(agg.zones)
    .filter(([, z]) => z.saves + z.goals > 0)
    .map(([zone, z]) => ({ zone, savePct: z.saves / (z.saves + z.goals) }));
  if (zoneEntries.length === 0) return null;
  zoneEntries.sort((a, b) => a.savePct - b.savePct);
  return zoneEntries[0];
}

export function weakestShotTypeSignal(matches, season) {
  if (season !== "Summer") return null;
  const agg = aggregateShotTypeStats(matches.filter((m) => m.season === "Summer"));
  const entries = Object.entries(agg)
    .map(([type, v]) => ({ type, savePct: v.saves / (v.saves + v.goals), shots: v.saves + v.goals }))
    .filter((e) => e.shots >= 8);
  if (entries.length === 0) return null;
  entries.sort((a, b) => a.savePct - b.savePct);
  return entries[0];
}

// Attributes each due session — past its implied date whether completed
// or not, using the same createdAt + (weekNumber-1)*7 inference as
// nextSuggestedSession — to whichever category its exercises mostly
// belong to, then summarizes completion rate and recent RPE per category.
export function categoryTrainingSignal(plans, season, exercises) {
  const byId = {};
  exercises.forEach((ex) => { byId[ex.id] = ex; });

  const now = new Date();
  const dueSessions = [];
  plans.filter((p) => p.season === season).forEach((p) => {
    const created = new Date(p.createdAt);
    p.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        const impliedDate = new Date(created);
        impliedDate.setDate(impliedDate.getDate() + (w.weekNumber - 1) * 7);
        if (impliedDate > now) return;
        const counts = {};
        (s.exercises || []).forEach((entry) => {
          const ex = byId[entry.exerciseId];
          if (ex) counts[ex.category] = (counts[ex.category] || 0) + 1;
        });
        const entries = Object.entries(counts);
        if (entries.length === 0) return;
        entries.sort((a, b) => b[1] - a[1]);
        dueSessions.push({ category: entries[0][0], completed: s.completed, rpe: s.rpe, date: impliedDate });
      });
    });
  });

  const windowStart = new Date(now);
  windowStart.setDate(windowStart.getDate() - TRAINING_LOG_WINDOW_DAYS);
  const recentCompleted = dueSessions.filter((s) => s.completed && s.date >= windowStart);
  if (recentCompleted.length < TRAINING_LOG_MIN_SESSIONS) return null;

  const byCategory = {};
  dueSessions.forEach((s) => {
    if (!byCategory[s.category]) byCategory[s.category] = [];
    byCategory[s.category].push(s);
  });

  const signal = {};
  Object.entries(byCategory).forEach(([category, sessions]) => {
    if (sessions.length < 3) return;
    const completedCount = sessions.filter((s) => s.completed).length;
    const completionRate = completedCount / sessions.length;
    const rpeSessions = sessions
      .filter((s) => s.completed && s.rpe)
      .sort((a, b) => b.date - a.date)
      .slice(0, 3);
    const avgRpeLast3 = rpeSessions.length ? rpeSessions.reduce((a, s) => a + s.rpe, 0) / rpeSessions.length : null;
    signal[category] = { completionRate, completedCount, dueCount: sessions.length, avgRpeLast3, rpeSampleSize: rpeSessions.length };
  });
  return Object.keys(signal).length ? signal : null;
}

// Flat/declining top-set 1RM across the last 3 logged sessions. Per
// confirmed scope, a plateau doesn't swap to a harder variant (nothing
// in the library defines one) — it just keeps the exercise in rotation
// with a reason nudging more weight, rather than letting it get cycled
// out right when consistency matters most.
export function isPlateaued(history) {
  if (history.length < 3) return false;
  const last3 = history.slice(-3);
  return last3[2].e1rm <= last3[0].e1rm * 1.02;
}

export function exerciseGenWeight(ex, ctx) {
  let weight = 1;
  let reason = null;

  const zoneCats = ["Shot Reading", "Diving & Ground Work", "Positioning"];
  if (ctx.zoneSignal && zoneCats.includes(ex.category)) {
    weight *= 1.3;
    const zoneGroup = EXERCISE_ZONE_MAP[ex.id];
    if (zoneGroup && zoneGroup.includes(ctx.zoneSignal.zone)) {
      weight *= 1.8;
      reason = `Added — ${ZONE_LABELS[ctx.zoneSignal.zone]} save% is your lowest zone this season.`;
    }
  }

  if (ctx.shotTypeSignal && EXERCISE_SHOTTYPE_MAP[ex.id] === ctx.shotTypeSignal.type) {
    weight *= 1.8;
    reason = reason || `Added — ${ctx.shotTypeSignal.type} is your lowest-saved shot type this season.`;
  }

  const sig = ctx.trainingSignal && ctx.trainingSignal[ex.category];
  if (sig) {
    if (sig.completionRate < 0.5) {
      weight *= 0.6;
      reason = reason || `Reduced volume — only ${sig.completedCount}/${sig.dueCount} sessions with ${ex.category} work have been completed.`;
    } else if (sig.avgRpeLast3 !== null && sig.avgRpeLast3 >= 8 && sig.rpeSampleSize >= 3) {
      weight *= 0.6;
      reason = reason || `Reduced volume — your last ${sig.rpeSampleSize} sessions here logged RPE 8+ on average.`;
    }
  }

  if (ex.type === "Gym") {
    const hist = exerciseLogHistory(ctx.plans, ex.id, ctx.adHocSessions);
    if (isPlateaued(hist)) {
      weight *= 1.3;
      reason = reason || `Kept in rotation — your top set here has been flat the last ${hist.length} sessions. Push for more weight.`;
    }
  }

  // Gender set to female only ever supplements existing Core & Prevention
  // volume with more of what's already there — landing/cutting-mechanics
  // work (tagged loadAreas: knee) and general neuromuscular/core stability
  // work — never a new or different exercise. Grounded in well-established
  // sports science on higher ACL injury risk for female athletes in
  // cutting/landing sports, not an assumption. See DECISIONS.md.
  if (ctx.genderInjuryFocus && (ex.category === "Core & Prevention" || (ex.loadAreas || []).includes("knee"))) {
    weight *= 1.4;
    reason = reason || "Added — extra landing-mechanics/core-stability work; cutting and landing sports carry well-documented higher ACL-injury risk for female athletes.";
  }

  return { weight, reason };
}

// Weighted sampling without replacement, auto-refilling once exhausted.
// Keeps higher-weight exercises appearing more often across a block's
// slots without ever guaranteeing a fixed "data-driven slot" count, and
// without repeating an exercise twice in the same pass through the pool.
export function makeWeightedPicker(items, weightFn) {
  let remaining = [...items];
  return function next() {
    if (remaining.length === 0) remaining = [...items];
    const scored = remaining.map((it) => ({ it, ...weightFn(it) }));
    const total = scored.reduce((a, s) => a + s.weight, 0);
    let r = Math.random() * total;
    let idx = scored.length - 1;
    for (let i = 0; i < scored.length; i++) {
      r -= scored[i].weight;
      if (r <= 0) { idx = i; break; }
    }
    remaining.splice(idx, 1);
    return { ex: scored[idx].it, reason: scored[idx].reason };
  };
}

export function generateGoalBlock(name, season, goalId, exercises, dataContext = null) {
  const goal = GOALS.find((g) => g.id === goalId);
  const pool = poolFor(exercises, season, goal.cats);

  let excludedIds = new Set();
  let ctx = null;
  if (dataContext && dataContext.useData) {
    const plans = dataContext.plans || [];
    const matches = dataContext.matches || [];
    const adHocSessions = dataContext.adHocSessions || [];
    const niggleExcluded = excludedExerciseIdsForNiggles(exercises, dataContext.profile?.niggles);
    const zoneSignal = weakestZoneSignal(matches, season);
    const shotTypeSignal = weakestShotTypeSignal(matches, season);
    const trainingSignal = categoryTrainingSignal(plans, season, exercises);
    const anyPlateaued = pool.some((ex) => ex.type === "Gym" && isPlateaued(exerciseLogHistory(plans, ex.id, adHocSessions)));
    const genderInjuryFocus = dataContext.profile?.gender === "female";
    const hasSignal = niggleExcluded.size > 0 || zoneSignal || shotTypeSignal || trainingSignal || anyPlateaued || genderInjuryFocus;
    if (hasSignal) {
      excludedIds = niggleExcluded;
      ctx = { zoneSignal, shotTypeSignal, trainingSignal, plans, adHocSessions, genderInjuryFocus };
    }
  }

  const eligiblePool = pool.filter((ex) => !excludedIds.has(ex.id));
  const finalPool = eligiblePool.length ? eligiblePool : pool; // never let niggle exclusion alone empty the block

  const pick = ctx ? makeWeightedPicker(finalPool, (ex) => exerciseGenWeight(ex, ctx)) : null;
  let cursor = 0;

  const weeks = [1, 2, 3, 4, 5, 6].map((weekNumber) => {
    const phase = phaseFor(weekNumber);
    const sessions = Array.from({ length: phase.sessions }).map((_, sIdx) => {
      const exs = Array.from({ length: phase.perSession }).map(() => {
        let ex, reason;
        if (pick) {
          ({ ex, reason } = pick());
        } else {
          ex = finalPool[cursor % finalPool.length];
          reason = null;
          cursor += 1;
        }
        return { entryId: uid(), exerciseId: ex.id, ...makeReps(ex.format), ...(reason ? { genReason: reason } : {}) };
      });
      return { sessionId: uid(), sessionNumber: sIdx + 1, exercises: exs, completed: false, focus: "" };
    });
    return { weekId: uid(), weekNumber, focus: phase.label, sessions };
  });
  return {
    id: uid(),
    name,
    season,
    goal: goal.name,
    method: "goal",
    createdAt: new Date().toISOString(),
    weeks,
  };
}

export function generateFreeformBlock(name, season, sessionsPerWeek) {
  const weeks = [1, 2, 3, 4, 5, 6].map((weekNumber) => ({
    weekId: uid(),
    weekNumber,
    focus: "",
    sessions: Array.from({ length: sessionsPerWeek }).map((_, sIdx) => ({
      sessionId: uid(),
      sessionNumber: sIdx + 1,
      exercises: [],
      completed: false,
      focus: "",
    })),
  }));
  return {
    id: uid(),
    name,
    season,
    goal: null,
    method: "freeform",
    createdAt: new Date().toISOString(),
    weeks,
  };
}

// Rehab blocks are their own kind — distinct from goal-based/freeform —
// since a rehab progression is time-boxed and manually assembled from a
// confirmed physio plan, not generated or weighted by Keepr. `buildEntries`
// is called fresh per session so each session gets its own entryIds rather
// than sharing references.
export function generateRehabBlock(name, season, weekCount, sessionsPerWeek, buildEntries) {
  const weeks = Array.from({ length: weekCount }).map((_, wIdx) => ({
    weekId: uid(),
    weekNumber: wIdx + 1,
    focus: "",
    sessions: Array.from({ length: sessionsPerWeek }).map((_, sIdx) => ({
      sessionId: uid(),
      sessionNumber: sIdx + 1,
      exercises: buildEntries(),
      completed: false,
      focus: "",
    })),
  }));
  return {
    id: uid(),
    name: name || "Rehab Plan",
    season,
    goal: null,
    method: "rehab",
    blockType: "rehab",
    createdAt: new Date().toISOString(),
    weeks,
  };
}

export function completedSessionsWithMeta(plans) {
  const out = [];
  plans.forEach((p) => {
    p.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        if (s.completed) out.push({ plan: p, week: w, session: s });
      });
    });
  });
  return out;
}

export function rpeTrend(plans) {
  return completedSessionsWithMeta(plans)
    .filter(({ session }) => session.rpe && session.completedAt)
    .sort((a, b) => new Date(a.session.completedAt) - new Date(b.session.completedAt))
    .slice(-20)
    .map(({ session }) => ({
      date: new Date(session.completedAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      rpe: session.rpe,
    }));
}

// Monday-start week key, used so a streak counts calendar weeks rather than rolling 7-day windows.
export function weekStartKey(dateLike) {
  const dt = new Date(dateLike);
  const day = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}

export function formatShortDate(dateStr) {
  if (!dateStr) return "";
  return new Date(dateStr + "T00:00:00").toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/* ---------------------------------------------------------------- */
/* Live recording                                                     */
/* A `recording` sub-object lives directly on the plan session,        */
/* ad-hoc session, or match it belongs to — the same object, not a     */
/* parallel one — and persists through the app's normal save path on   */
/* every action. That's the whole mechanism for surviving the app      */
/* being closed or backgrounded mid-recording: there's nothing held    */
/* only in memory, so reopening later just finds the same in-progress  */
/* record and can resume it. Elapsed time is computed from real        */
/* wall-clock timestamps (startedAt / pausedAt), not a running counter,*/
/* so it's correct immediately on resume regardless of how long the    */
/* tab was suspended.                                                  */
/* ---------------------------------------------------------------- */

export function startRecording() {
  return { startedAt: new Date().toISOString(), pausedAt: null, totalPausedMs: 0 };
}

export function pauseRecording(recording) {
  if (!recording || recording.pausedAt) return recording;
  return { ...recording, pausedAt: new Date().toISOString() };
}

export function resumeRecording(recording) {
  if (!recording || !recording.pausedAt) return recording;
  const pausedMs = Date.now() - new Date(recording.pausedAt).getTime();
  return { ...recording, pausedAt: null, totalPausedMs: (recording.totalPausedMs || 0) + pausedMs };
}

export function recordingElapsedMs(recording, now = Date.now()) {
  if (!recording) return 0;
  const end = recording.pausedAt ? new Date(recording.pausedAt).getTime() : now;
  return Math.max(0, end - new Date(recording.startedAt).getTime() - (recording.totalPausedMs || 0));
}

export function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// Minutes, rounded, for auto-filling a duration field from a finished recording.
export function recordingElapsedMinutes(recording) {
  return Math.round(recordingElapsedMs(recording) / 60000);
}

// Scans freshly-loaded data (not React state, which wouldn't be updated yet)
// for any plan session, ad-hoc session, or match left with an unfinished
// `recording` — e.g. the app was closed mid-recording. Used once on app load
// to jump straight back into the live recorder instead of defaulting to Library.
export function findActiveRecording({ plans, adHocSessions, matches }) {
  for (const plan of plans || []) {
    for (const week of plan.weeks || []) {
      for (const session of week.sessions || []) {
        if (session.recording) {
          return { kind: "plan", planId: plan.id, weekId: week.weekId, sessionId: session.sessionId, focus: session.focus };
        }
      }
    }
  }
  for (const s of adHocSessions || []) {
    if (s.recording) return { kind: "adhoc", sessionId: s.id };
  }
  for (const m of matches || []) {
    if (m.recording) return { kind: "match", matchId: m.id };
  }
  return null;
}

// YYYY-MM-DD, matching the plain <input type="date"> convention used
// throughout the app (Match.date, session.date) — no timezone shifting.
export function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Monday-start month grid: array of 42 cells (6 weeks), each either a day
// number or null for the leading/trailing blanks.
export function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

export function weeklyStreak(plans) {
  const weeksWithSessions = new Set();
  completedSessionsWithMeta(plans).forEach(({ session }) => {
    if (session.completedAt) weeksWithSessions.add(weekStartKey(session.completedAt));
  });
  if (weeksWithSessions.size === 0) return 0;
  const cursor = new Date();
  // Don't zero the streak just because this week hasn't happened yet — it isn't over.
  if (!weeksWithSessions.has(weekStartKey(cursor))) {
    cursor.setDate(cursor.getDate() - 7);
  }
  let streak = 0;
  while (weeksWithSessions.has(weekStartKey(cursor))) {
    streak++;
    cursor.setDate(cursor.getDate() - 7);
  }
  return streak;
}

// "Due soonest" is inferred from plan.createdAt + a 7-day-per-week offset, since sessions
// have no explicit schedule — this is the closest honest proxy available in the data.
export function nextSuggestedSession(plans) {
  let best = null;
  plans.forEach((p) => {
    const created = new Date(p.createdAt);
    p.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        if (s.completed) return;
        const impliedDate = new Date(created);
        impliedDate.setDate(impliedDate.getDate() + (w.weekNumber - 1) * 7);
        if (!best || impliedDate < best.impliedDate) {
          best = { plan: p, week: w, session: s, impliedDate };
        }
      });
    });
  });
  return best;
}

/* ---------------------------------------------------------------- */
/* Reps / gym logging                                                */
/* Session-exercise entries used to carry a single free-text          */
/* `prescription` string (e.g. "4 x 6 each side"). New entries now    */
/* carry that same text as `repsRaw` (always the source of truth for  */
/* display, so a parser quirk never corrupts what's shown) plus       */
/* best-effort structured fields derived from it for charts/logging.  */
/* ---------------------------------------------------------------- */

export function parseRepsFromFormat(format) {
  if (!format) return { sets: null, value: null, unit: null, note: null };
  const m = format.match(/^(\d+)\s*x\s*(\d+)\s*(seconds|secs|sec|minutes|mins|min|metres|meters|reps?|s|m)?\s*(.*)$/i);
  if (m) {
    const sets = parseInt(m[1], 10);
    const value = parseInt(m[2], 10);
    const token = (m[3] || "").toLowerCase();
    let unit = "reps";
    if (token.startsWith("s")) unit = "seconds";
    else if (token.startsWith("min")) unit = "minutes";
    else if (token.startsWith("m")) unit = "metres";
    const note = (m[4] || "").trim() || null;
    return { sets, value, unit, note };
  }
  const m2 = format.match(/^(\d+)\s*(reps?|shots?|throws?)\s*(.*)$/i);
  if (m2) {
    return { sets: 1, value: parseInt(m2[1], 10), unit: "reps", note: (m2[3] || "").trim() || null };
  }
  return { sets: null, value: null, unit: null, note: null };
}

export function makeReps(format) {
  const parsed = parseRepsFromFormat(format);
  return {
    repsRaw: format || "",
    repsSets: parsed.sets,
    repsValue: parsed.value,
    repsUnit: parsed.unit,
    repsNote: parsed.note,
    repsWeight: null,
    weightUnit: null,
  };
}

// Reads either shape — new repsRaw, or the old `prescription` string on
// session-exercise entries saved before this field existed.
export function repsDisplay(entry) {
  return entry.repsRaw ?? entry.prescription ?? "";
}

export function epley1RM(weight, reps) {
  return (weight || 0) * (1 + (reps || 0) / 30);
}

// Library exercise descriptions are written as three "\n\n"-separated parts —
// what it trains, how to do it (one step per line), common mistake. Custom
// user-written descriptions won't match this shape, so callers must fall
// back to rendering the raw string when this returns null.
export function parseExerciseDesc(desc) {
  if (!desc) return null;
  const parts = desc.split("\n\n").map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 3) return null;
  const [whatWhy, howTo, mistake] = parts;
  const steps = howTo.split("\n").map((s) => s.trim()).filter(Boolean);
  return { whatWhy, steps, mistake };
}

// History for one exercise's logged gym sets, across every completed
// session in every plan — same flatten-then-sort shape as rpeTrend.
export function exerciseLogHistory(plans, exerciseId, adHocSessions = []) {
  const points = [];
  plans.forEach((p) => {
    p.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        if (!s.completed || !s.completedAt) return;
        const entry = (s.exercises || []).find((e) => e.exerciseId === exerciseId && e.loggedSets && e.loggedSets.length > 0);
        if (!entry) return;
        points.push({ date: s.completedAt, sets: entry.loggedSets });
      });
    });
  });
  (adHocSessions || []).forEach((s) => {
    if (!s.completed || !s.completedAt) return;
    const sets = (s.exerciseLogs || {})[exerciseId];
    if (sets && sets.length > 0) points.push({ date: s.completedAt, sets });
  });
  points.sort((a, b) => new Date(a.date) - new Date(b.date));

  let bestWeightEver = 0, bestVolumeEver = 0;
  const bestRepsAtWeight = {};

  return points.map(({ date, sets }) => {
    const topWeight = Math.max(0, ...sets.map((x) => x.weight || 0));
    const volume = sets.reduce((a, x) => a + (x.reps || 0) * (x.weight || 0), 0);
    const e1rm = Math.max(0, ...sets.map((x) => epley1RM(x.weight, x.reps)));

    let isPr = topWeight > bestWeightEver || volume > bestVolumeEver;
    sets.forEach((x) => {
      if (x.weight && (x.reps || 0) > (bestRepsAtWeight[x.weight] || 0)) isPr = true;
    });

    bestWeightEver = Math.max(bestWeightEver, topWeight);
    bestVolumeEver = Math.max(bestVolumeEver, volume);
    sets.forEach((x) => {
      if (x.weight) bestRepsAtWeight[x.weight] = Math.max(bestRepsAtWeight[x.weight] || 0, x.reps || 0);
    });

    return {
      date,
      label: new Date(date).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      topWeight,
      volume,
      e1rm: Math.round(e1rm * 10) / 10,
      isPr,
    };
  });
}

/* ---------------------------------------------------------------- */
/* Kip alerts, points, and badges                                     */
/* Everything here is derived fresh from existing data, same as        */
/* rpeTrend/weeklyStreak — no separate mutable ledger. The only new    */
/* persisted state is "already surfaced" tracking (profile.seenAlert-  */
/* Fingerprints / seenBadgeIds), so a still-true condition doesn't     */
/* re-alert every time the app opens.                                  */
/* ---------------------------------------------------------------- */

export const SESSION_POINTS = 10;
export const MATCH_POINTS = 15;
export const PR_POINTS = 25;

export function loggedGymExerciseIds(plans, adHocSessions = []) {
  const ids = new Set();
  plans.forEach((p) => p.weeks.forEach((w) => w.sessions.forEach((s) => {
    if (!s.completed) return;
    (s.exercises || []).forEach((entry) => {
      if (entry.loggedSets && entry.loggedSets.length > 0) ids.add(entry.exerciseId);
    });
  })));
  (adHocSessions || []).forEach((s) => {
    if (!s.completed) return;
    Object.entries(s.exerciseLogs || {}).forEach(([exerciseId, sets]) => {
      if (sets && sets.length > 0) ids.add(exerciseId);
    });
  });
  return ids;
}

export function totalPrCount(plans, adHocSessions = []) {
  let count = 0;
  loggedGymExerciseIds(plans, adHocSessions).forEach((id) => {
    count += exerciseLogHistory(plans, id, adHocSessions).filter((h) => h.isPr).length;
  });
  return count;
}

export function computeTotalPoints(plans, adHocSessions, matches) {
  const planSessionsDone = plans.reduce((a, p) => a + p.weeks.reduce((b, w) => b + w.sessions.filter((s) => s.completed).length, 0), 0);
  const adHocDone = (adHocSessions || []).filter((s) => s.completed).length;
  const sessionsCompleted = planSessionsDone + adHocDone;
  const matchesLogged = (matches || []).length;
  const prsHit = totalPrCount(plans, adHocSessions);
  return {
    total: sessionsCompleted * SESSION_POINTS + matchesLogged * MATCH_POINTS + prsHit * PR_POINTS,
    sessionsCompleted,
    matchesLogged,
    prsHit,
  };
}

export const BADGES = [
  { id: "first_save", name: "First Save", description: "Completed your first training session." },
  { id: "clean_week", name: "Clean Sheet Week", description: "Completed every session in a planned week." },
  { id: "month_streak", name: "Month of Reps", description: "Trained four weeks in a row." },
  { id: "block_complete", name: "Block Complete", description: "Finished every session in a full 6-week block." },
];

export function computeEarnedBadgeIds(plans, adHocSessions) {
  const earned = new Set();

  const anyCompleted = plans.some((p) => p.weeks.some((w) => w.sessions.some((s) => s.completed)))
    || (adHocSessions || []).some((s) => s.completed);
  if (anyCompleted) earned.add("first_save");

  const hasCleanWeek = plans.some((p) => p.weeks.some((w) => w.sessions.length > 0 && w.sessions.every((s) => s.completed)));
  if (hasCleanWeek) earned.add("clean_week");

  // Reuses weeklyStreak exactly as-is, per explicit "no change needed" scope —
  // plan sessions only, not ad-hoc, matching that feature's existing definition.
  if (weeklyStreak(plans) >= 4) earned.add("month_streak");

  const hasCompletedBlock = plans.some((p) => {
    const total = p.weeks.reduce((a, w) => a + w.sessions.length, 0);
    if (total === 0) return false;
    const done = p.weeks.reduce((a, w) => a + w.sessions.filter((s) => s.completed).length, 0);
    return done === total;
  });
  if (hasCompletedBlock) earned.add("block_complete");

  return earned;
}

// A genuine trend, not a restated snapshot: splits the season's matches into
// an older and newer half and requires a real swing in both direction and
// sample size before calling it a trend either way.
export const TREND_MIN_MATCHES = 4;
export const TREND_MIN_SHOTS_PER_HALF = 4;
export const TREND_SWING_POINTS = 15;

export function splitMatchHalves(matches, seasonFilter) {
  const subset = matches.filter((m) => m.season === seasonFilter).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (subset.length < TREND_MIN_MATCHES) return null;
  const mid = Math.floor(subset.length / 2);
  return { older: subset.slice(0, mid), newer: subset.slice(mid) };
}

export function zoneTallies(matchesSubset) {
  const zones = emptyZoneMap();
  matchesSubset.forEach((m) => (m.shots || []).forEach((s) => {
    const z = zones[s.zone];
    if (!z) return;
    if (s.outcome === "Save") z.saves++; else z.goals++;
  }));
  return zones;
}

export function zoneTrendSignals(matches, season) {
  const halves = splitMatchHalves(matches, season);
  if (!halves) return [];
  const older = zoneTallies(halves.older);
  const newer = zoneTallies(halves.newer);
  const signals = [];
  Object.keys(older).forEach((zone) => {
    const o = older[zone], n = newer[zone];
    const oShots = o.saves + o.goals, nShots = n.saves + n.goals;
    if (oShots < TREND_MIN_SHOTS_PER_HALF || nShots < TREND_MIN_SHOTS_PER_HALF) return;
    const oPct = Math.round((o.saves / oShots) * 100);
    const nPct = Math.round((n.saves / nShots) * 100);
    const delta = nPct - oPct;
    if (delta <= -TREND_SWING_POINTS) signals.push({ zone, direction: "worse", oldPct: oPct, newPct: nPct });
    else if (delta >= TREND_SWING_POINTS) signals.push({ zone, direction: "better", oldPct: oPct, newPct: nPct });
  });
  return signals;
}

export function shotTypeTallies(matchesSubset) {
  const map = {};
  matchesSubset.forEach((m) => (m.shots || []).forEach((s) => {
    const t = s.shotType || "Regular";
    if (!map[t]) map[t] = { saves: 0, goals: 0 };
    if (s.outcome === "Save") map[t].saves++; else map[t].goals++;
  }));
  return map;
}

// Beach-only, since indoor shot-type tags are context only (every indoor
// goal is worth the same, per pointsForShot's own comment).
export function shotTypeTrendSignals(matches) {
  const halves = splitMatchHalves(matches, "Summer");
  if (!halves) return [];
  const older = shotTypeTallies(halves.older);
  const newer = shotTypeTallies(halves.newer);
  const signals = [];
  Object.keys(older).forEach((type) => {
    const o = older[type], n = newer[type];
    if (!n) return;
    const oShots = o.saves + o.goals, nShots = n.saves + n.goals;
    if (oShots < TREND_MIN_SHOTS_PER_HALF || nShots < TREND_MIN_SHOTS_PER_HALF) return;
    const oPct = Math.round((o.saves / oShots) * 100);
    const nPct = Math.round((n.saves / nShots) * 100);
    const delta = nPct - oPct;
    if (delta <= -TREND_SWING_POINTS) signals.push({ shotType: type, direction: "worse", oldPct: oPct, newPct: nPct });
    else if (delta >= TREND_SWING_POINTS) signals.push({ shotType: type, direction: "better", oldPct: oPct, newPct: nPct });
  });
  return signals;
}

// Trailing run of consecutive missed sessions (past their implied due date,
// same createdAt + (weekNumber-1)*7 inference used elsewhere, and still
// incomplete) at the end of a plan's session order.
export function missedSessionsSignals(plans) {
  const now = new Date();
  const signals = [];
  plans.forEach((p) => {
    const created = new Date(p.createdAt);
    const ordered = [];
    p.weeks.forEach((w) => w.sessions.forEach((s) => {
      const impliedDate = new Date(created);
      impliedDate.setDate(impliedDate.getDate() + (w.weekNumber - 1) * 7);
      ordered.push({ session: s, impliedDate });
    }));
    let run = 0;
    for (let i = ordered.length - 1; i >= 0; i--) {
      const { session, impliedDate } = ordered[i];
      if (impliedDate > now) continue; // not due yet — doesn't count, doesn't break the run either
      if (session.completed) break;
      run++;
    }
    if (run >= 2) signals.push({ planId: p.id, planName: p.name, count: run });
  });
  return signals;
}

export function rpeHighSignal(plans, adHocSessions) {
  const all = [
    ...completedSessionsWithMeta(plans).map(({ session }) => session),
    ...(adHocSessions || []).filter((s) => s.completed),
  ].filter((s) => s.rpe && s.completedAt).sort((a, b) => new Date(a.completedAt) - new Date(b.completedAt));
  const last3 = all.slice(-3);
  if (last3.length === 3 && last3.every((s) => s.rpe >= 8)) return { lastCompletedAt: last3[2].completedAt };
  return null;
}

// weeklyStreak already treats the current, still-in-progress week as "not
// broken yet" — calling it directly gives the streak as of the last full
// week, exactly what's "at risk" if this week ends with nothing logged.
export function streakAtRiskSignal(plans) {
  const now = new Date();
  const thisWeekKey = weekStartKey(now);
  const hasThisWeek = completedSessionsWithMeta(plans).some(({ session }) => session.completedAt && weekStartKey(session.completedAt) === thisWeekKey);
  if (hasThisWeek) return null;
  const dayIdx = (now.getDay() + 6) % 7; // Monday = 0
  if (dayIdx < 4) return null; // not late enough yet (before Friday)
  const priorStreak = weeklyStreak(plans);
  if (priorStreak < 1) return null;
  return { weekKey: thisWeekKey, priorStreak };
}

export const NIGGLE_QUIET_DAYS = 10;

export function niggleQuietSignals(profile) {
  const now = new Date();
  const signals = [];
  (profile.niggles || []).forEach((n) => {
    if (n.clearedByPhysio) return;
    const log = [...(n.rehabLog || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
    if (log.length === 0) return; // no baseline date to measure quietness from
    const daysSince = Math.floor((now - new Date(log[0].date)) / (1000 * 60 * 60 * 24));
    if (daysSince >= NIGGLE_QUIET_DAYS) signals.push({ niggleId: n.id, part: n.part, daysSince, weeksSince: Math.floor(daysSince / 7) });
  });
  return signals;
}

export function newPrSignals(plans, exercises, adHocSessions = []) {
  const signals = [];
  loggedGymExerciseIds(plans, adHocSessions).forEach((id) => {
    const history = exerciseLogHistory(plans, id, adHocSessions);
    const last = history[history.length - 1];
    if (last && last.isPr) {
      const ex = exercises.find((e) => e.id === id);
      signals.push({ exerciseId: id, exerciseName: ex?.name || "that exercise", sessionCount: history.length });
    }
  });
  return signals;
}

export function completedBlockSignals(plans) {
  return plans.filter((p) => {
    const total = p.weeks.reduce((a, w) => a + w.sessions.length, 0);
    if (total === 0) return false;
    const done = p.weeks.reduce((a, w) => a + w.sessions.filter((s) => s.completed).length, 0);
    return done === total;
  }).map((p) => ({ planId: p.id, planName: p.name }));
}

// Gathers every currently-true condition, tags each with a fingerprint that
// only changes when the underlying situation genuinely changes (an escalating
// count, a new PR, a new week), then returns only the ones not yet seen —
// this is the actual "don't repeat yourself" mechanism, not a time cooldown.
export function computeKipAlerts({ profile, plans, adHocSessions, matches, season, exercises }) {
  const items = [];

  missedSessionsSignals(plans).forEach((s) => {
    items.push({ fingerprint: `missed:${s.planId}:${s.count}`, kind: "warning", type: "missed_sessions", data: s });
  });

  const rpeHigh = rpeHighSignal(plans, adHocSessions);
  if (rpeHigh) items.push({ fingerprint: `rpe_high:${rpeHigh.lastCompletedAt}`, kind: "warning", type: "rpe_high", data: rpeHigh });

  loggedGymExerciseIds(plans, adHocSessions).forEach((id) => {
    const history = exerciseLogHistory(plans, id, adHocSessions);
    if (isPlateaued(history)) {
      const ex = exercises.find((e) => e.id === id);
      items.push({ fingerprint: `plateau:${id}:${history.length}`, kind: "warning", type: "plateau", data: { exerciseId: id, exerciseName: ex?.name || "that lift", sessionCount: history.length } });
    }
  });

  zoneTrendSignals(matches, season).forEach((s) => {
    items.push({ fingerprint: `zone_${s.direction}:${s.zone}:${s.newPct}`, kind: s.direction === "worse" ? "warning" : "positive", type: `zone_${s.direction}`, data: s });
  });
  shotTypeTrendSignals(matches).forEach((s) => {
    items.push({ fingerprint: `shottype_${s.direction}:${s.shotType}:${s.newPct}`, kind: s.direction === "worse" ? "warning" : "positive", type: `shottype_${s.direction}`, data: s });
  });

  const streakRisk = streakAtRiskSignal(plans);
  if (streakRisk) items.push({ fingerprint: `streak_risk:${streakRisk.weekKey}`, kind: "warning", type: "streak_risk", data: streakRisk });

  niggleQuietSignals(profile).forEach((s) => {
    items.push({ fingerprint: `niggle_quiet:${s.niggleId}:${s.weeksSince}`, kind: "warning", type: "niggle_quiet", data: s });
  });

  newPrSignals(plans, exercises, adHocSessions).forEach((s) => {
    items.push({ fingerprint: `pr:${s.exerciseId}:${s.sessionCount}`, kind: "positive", type: "new_pr", data: s });
  });

  completedBlockSignals(plans).forEach((s) => {
    items.push({ fingerprint: `block_done:${s.planId}`, kind: "positive", type: "block_complete", data: s });
  });

  const seenBadges = new Set(profile.seenBadgeIds || []);
  computeEarnedBadgeIds(plans, adHocSessions).forEach((id) => {
    if (!seenBadges.has(id)) {
      const badge = BADGES.find((b) => b.id === id);
      items.push({ fingerprint: `badge:${id}`, kind: "positive", type: "badge", data: badge });
    }
  });

  const seenFingerprints = new Set(profile.seenAlertFingerprints || []);
  return items.filter((it) => !seenFingerprints.has(it.fingerprint));
}

export function describeAlertItem(item) {
  const d = item.data;
  switch (item.type) {
    case "missed_sessions": return `Missed ${d.count} sessions in a row in "${d.planName}".`;
    case "rpe_high": return "The last 3 logged sessions were all RPE 8 or higher.";
    case "plateau": return `${d.exerciseName} has been flat — no improvement — across the last ${d.sessionCount} logged sessions.`;
    case "zone_worse": return `${ZONE_LABELS[d.zone]} save% has genuinely dropped recently, from ${d.oldPct}% to ${d.newPct}% — a real trend, not just the usual weak zone.`;
    case "zone_better": return `${ZONE_LABELS[d.zone]} save% has genuinely improved recently, from ${d.oldPct}% to ${d.newPct}%.`;
    case "shottype_worse": return `Save% against ${d.shotType} shots has dropped from ${d.oldPct}% to ${d.newPct}% recently.`;
    case "shottype_better": return `Save% against ${d.shotType} shots has improved from ${d.oldPct}% to ${d.newPct}% recently.`;
    case "streak_risk": return `Nothing logged yet this week, and it's late in the week — the ${d.priorStreak}-week training streak is at risk of breaking.`;
    case "niggle_quiet": return `The ${d.part} niggle hasn't had a rehab log entry in ${d.daysSince} days — worth a gentle check-in, not a warning.`;
    case "new_pr": return `New PR on ${d.exerciseName}.`;
    case "block_complete": return `Just finished every session in "${d.planName}" — a fully completed block.`;
    case "badge": return `Just earned the "${d.name}" milestone: ${d.description}`;
    default: return "";
  }
}

// Groups computeKipAlerts' item types into the categories a keeper actually
// thinks in terms of, for per-category email preferences (part 4 of the
// ImprovMX brief). Shared here rather than duplicated between the Profile
// preferences UI (client) and the scheduled alerts function (server) — see
// DECISIONS.md, "Email infrastructure (ImprovMX)".
export const EMAIL_ALERT_CATEGORIES = [
  { id: "training_consistency", label: "Missed sessions & streaks" },
  { id: "rpe_trend", label: "Training load (RPE) trend" },
  { id: "plateaus", label: "Gym plateaus" },
  { id: "weakening_zones", label: "Weakening save zones" },
  { id: "quiet_niggles", label: "Quiet niggles" },
  { id: "milestones", label: "PRs & milestones" },
];

export function categoryForAlertType(type) {
  switch (type) {
    case "missed_sessions":
    case "streak_risk":
      return "training_consistency";
    case "rpe_high":
      return "rpe_trend";
    case "plateau":
      return "plateaus";
    case "zone_worse":
    case "shottype_worse":
      return "weakening_zones";
    case "niggle_quiet":
      return "quiet_niggles";
    case "new_pr":
    case "block_complete":
    case "badge":
    case "zone_better":
    case "shottype_better":
    default:
      return "milestones";
  }
}

// Moved here verbatim from App.jsx (Teammate/coach-sharing brief) — pure,
// no callKip dependency, so the new server-side coach-digest scheduled
// function can compute the exact same numbers the in-app "Generate report"
// button does, without a second implementation to keep in sync.
export function computeReportData({ matches, plans, adHocSessions, exercises, season }) {
  const agg = aggregateMatchStats(matches, season);
  const totalShots = agg.totalSaves + agg.totalGoals;
  const zoneEntries = Object.entries(agg.zones)
    .filter(([, z]) => z.saves + z.goals > 0)
    .map(([zone, z]) => ({ zone, label: ZONE_LABELS[zone], savePct: Math.round((z.saves / (z.saves + z.goals)) * 100), shots: z.saves + z.goals }));
  const weakestZones = [...zoneEntries].sort((a, b) => a.savePct - b.savePct).slice(0, 3);

  const completed = completedSessionsWithMeta(plans);
  const totalSessionsInPlans = plans.reduce((a, p) => a + p.weeks.reduce((b, w) => b + w.sessions.length, 0), 0);
  const completionRate = totalSessionsInPlans > 0 ? Math.round((completed.length / totalSessionsInPlans) * 100) : null;

  const gymIds = [...loggedGymExerciseIds(plans, adHocSessions)];
  const gymProgress = gymIds.map((id) => {
    const ex = exercises.find((e) => e.id === id);
    const history = exerciseLogHistory(plans, id, adHocSessions);
    if (!ex || history.length === 0) return null;
    const latest = history[history.length - 1];
    const first = history[0];
    return {
      exercise: ex.name,
      sessionsLogged: history.length,
      latestTopWeight: latest.topWeight,
      trend: history.length > 1 ? (latest.topWeight > first.topWeight ? "up" : latest.topWeight < first.topWeight ? "down" : "flat") : "single session",
      prCount: history.filter((h) => h.isPr).length,
    };
  }).filter(Boolean);

  return {
    season,
    generatedAt: new Date().toISOString(),
    overallSavePct: totalShots > 0 ? Math.round((agg.totalSaves / totalShots) * 100) : null,
    totalShots,
    weakestZones,
    saveTrend: agg.trend.slice(-10),
    completionRate,
    sessionsCompleted: completed.length,
    totalSessionsInPlans,
    rpeTrend: rpeTrend(plans).map((r) => r.rpe),
    streakWeeks: weeklyStreak(plans),
    gymProgress,
  };
}

// Category toggles + digest categories for the "Share with coach" feature.
// Kept alongside EMAIL_ALERT_CATEGORIES above since it's the same shape of
// idea (a keeper-controlled set of on/off switches), just for a different
// recipient.
export const COACH_SHARE_CATEGORIES = [
  { id: "trainingLogs", label: "Training completion & session logs" },
  { id: "matchStats", label: "Match stats" },
  { id: "attendance", label: "Trainings/sessions attended" },
];

// Coach-scoped, category-filtered, and windowed to sinceDate (if given) —
// unlike the keeper's own "Generate report" (all-time, on demand), a
// periodic coach digest showing the full career history every single week
// would be repetitive noise, so this scopes matchStats/trainingLogs/
// attendance to whatever's happened since the window started rather than
// reusing computeReportData's all-time view unfiltered.
export function computeCoachReportData({ matches, plans, adHocSessions, exercises, season, categories = {}, sinceDate = null }) {
  const inWindow = (dateStr) => !sinceDate || (dateStr && dateStr >= sinceDate);
  const windowedMatches = (matches || []).filter((m) => inWindow(m.date));
  const base = computeReportData({ matches: windowedMatches, plans, adHocSessions, exercises, season });

  const out = { season, generatedAt: new Date().toISOString(), sinceDate };

  if (categories.matchStats !== false) {
    out.matchStats = {
      overallSavePct: base.overallSavePct,
      totalShots: base.totalShots,
      weakestZones: base.weakestZones,
      saveTrend: base.saveTrend,
    };
  }

  if (categories.trainingLogs !== false) {
    out.trainingLogs = {
      completionRate: base.completionRate,
      sessionsCompleted: base.sessionsCompleted,
      totalSessionsInPlans: base.totalSessionsInPlans,
      rpeTrend: base.rpeTrend,
      streakWeeks: base.streakWeeks,
      gymProgress: base.gymProgress,
    };
  }

  if (categories.attendance !== false) {
    const fromPlans = completedSessionsWithMeta(plans)
      .filter(({ session }) => inWindow(session.date))
      .map(({ session }) => ({ date: session.date, title: session.focus || "Training session" }));
    const fromAdHoc = (adHocSessions || [])
      .filter((s) => s.completed && inWindow(s.date))
      .map((s) => ({ date: s.date, title: s.title || "One-off session" }));
    out.attendance = [...fromPlans, ...fromAdHoc].sort((a, b) => new Date(a.date) - new Date(b.date));
  }

  return out;
}

// Full curated exercise library — pure data, moved here (not just
// alert/domain logic) so the scheduled-alerts function can look up real
// exercise names for plateau/PR alerts server-side, instead of only
// having customExercises (the per-user JSONB blob doesn't store the
// static library itself). Same "reused, not reimplemented" reasoning as
// the rest of this file.
export const DEFAULT_EXERCISES = [
  { id: "e1", name: "Reaction Ball Drops", category: "Reflexes", type: "Solo", season: "Both", equipment: "Reaction ball", format: "4 x 15", loadAreas: [], desc: "Builds first-touch hand speed against a genuinely unpredictable bounce — the same \"the ball won't go where you expect\" quality of a deflected or bobbled shot in a real game.\n\nStand in a relaxed ready stance with hands up at chest height.\nHold the reaction ball at shoulder height and let it drop without any spin or throw.\nReact to the bounce and catch or parry it with soft hands before it hits the ground a second time.\nReset to a full ready stance between every drop rather than chasing straight into the next one.\n\nRushing the reset between drops so every rep starts from a half-collapsed stance, which trains a sloppy base instead of the quick hands the drill is actually for." },
  { id: "e2", name: "Tennis Ball Wall Reflex", category: "Reflexes", type: "Solo", season: "Both", equipment: "Tennis ball, wall", format: "4 x 20", loadAreas: [], desc: "Trains close-range hand reflexes against a fast, short-flight-time rebound — closer to a point-blank deflection than a slower feed drill can replicate.\n\nStand roughly two to three metres from a flat wall in your ready stance.\nThrow the tennis ball firmly at the wall, varying the height and angle you aim for each rep.\nSave the rebound with the same hand mechanics you'd use on a real shot, not just a block.\n\nThrowing every rep at the same height and angle out of habit, which turns the drill into a memorised pattern instead of a genuine reaction test." },
  { id: "e3", name: "Two-Ball Partner Reaction", category: "Reflexes", type: "Partner", season: "Both", equipment: "2 balls", format: "5 x 10 throws", loadAreas: [], desc: "Forces a full reset between two closely-spaced saves — the exact sequence a rebound or a fast second phase of an attack demands.\n\nPartner stands roughly six to eight metres out with two balls ready.\nThey throw the first ball to one corner of the goal; save it and immediately reset to a balanced ready stance.\nThey throw the second ball to a different corner within a second or two — react to it fresh, not off the momentum of the first save.\n\nStaying down or off-balance after the first save, so the second reaction starts from a compromised position instead of a genuine reset." },
  { id: "e4", name: "Colour-Call Reaction", category: "Reflexes", type: "Partner", season: "Both", equipment: "Coloured cones/bibs", format: "6 x 8", loadAreas: [], desc: "Splits attention between a verbal cue and the shot itself — closer to the divided attention of reading a shooter while also tracking a screen or a run.\n\nPartner holds up a colour or number just before or during their wind-up.\nCall the colour or number out loud as fast as you can while still tracking the shot.\nMake the save based on the shot itself, not the call — the call is a distraction load, not the cue to react to.\n\nFocusing so hard on getting the call right that reaction to the actual shot slows down; the point is to keep both going at once, not trade one for the other." },
  { id: "e5", name: "Light / App Reaction Drill", category: "Reflexes", type: "Solo", season: "Both", equipment: "Reaction light app or phone", format: "4 x 30s", loadAreas: ["hip"], desc: "Isolates pure first-movement speed with no shooter to read, so the only variable is how fast a visual cue converts into a dive or step.\n\nSet the reaction light or app to a random interval and stand in your ready stance facing it.\nOn the cue, dive or step explosively in the direction indicated.\nRecover to stance immediately and reset before the next cue.\n\nAnticipating the app's timing pattern instead of waiting for the actual cue, which trains guessing rather than genuine reaction speed." },
  { id: "e6", name: "Post-to-Post Dive Series", category: "Diving & Ground Work", type: "Solo", season: "Winter", equipment: "None", format: "5 x 6 each side", loadAreas: ["shoulder", "hip"], desc: "Builds full-extension diving range and, just as importantly, the recovery back to stance — a save that leaves you stranded on the floor isn't useful against a fast second phase.\n\nStart in your ready stance in the centre of the goal.\nDive explosively to one post, extending fully through the save.\nGet up with control and reset to centre stance before diving to the opposite post.\n\nDiving with the upper body only and leaving the legs trailing behind, which shortens genuine reach and slows the recovery down." },
  { id: "e7", name: "Sand Roll Recovery", category: "Diving & Ground Work", type: "Solo", season: "Summer", equipment: "None", format: "6 x 8", loadAreas: ["shoulder", "hip"], desc: "Beach handball's softer surface changes both how you can safely land and how fast you can get back up — this trains the sand-specific version of both.\n\nStart in your ready stance on the sand.\nDive and let the landing roll through your shoulder and back rather than absorbing it through a stiff arm or hip.\nUse the roll's own momentum to help drive you back up to a ready stance.\n\nLanding the same way you would on an indoor court — bracing rigidly instead of rolling — which wastes the sand's forgiving surface and slows the recovery." },
  { id: "e8", name: "Low Ball Smother Drill", category: "Diving & Ground Work", type: "Partner", season: "Both", equipment: "Ball", format: "4 x 10", loadAreas: ["hip", "knee"], desc: "Low, along-the-ground shots need the body positioned behind the ball early, not a late stab at it — this isolates that specific save.\n\nPartner rolls or throws low, along-the-ground shots at you from a few metres out.\nGet your body behind the line of the ball as early as possible, not just your hands.\nSmother the ball into your body rather than trying to catch it cleanly out in front.\n\nReaching out with just the hands while the body stays upright, which lets the ball squeeze through underneath on anything hit with real pace." },
  { id: "e9", name: "Diving Save to Feet", category: "Diving & Ground Work", type: "Partner", season: "Both", equipment: "Ball", format: "5 x 6", loadAreas: ["shoulder", "hip", "knee"], desc: "A save that stays on the ground is only half the job in a scramble — this drills the explosive recovery that turns a save into a second chance to react.\n\nDive to full extension and make the save as normal.\nThe instant you're down, drive off the ground explosively back to your feet.\nReset into a ready stance as if a rebound could come immediately.\n\nTreating the recovery as an afterthought and standing up slowly, which is exactly the moment a real rebound punishes you." },
  { id: "e10", name: "Beach Full-Length Dive", category: "Diving & Ground Work", type: "Solo", season: "Summer", equipment: "None", format: "6 x 5", loadAreas: ["shoulder", "hip"], desc: "Sand's give changes the calculation on diving range — you can commit to a longer dive than on a hard court because the landing is safer.\n\nStart in your ready stance and dive to full length, reaching as far as the extension allows.\nLet the landing spread across the sand rather than aiming for a single point of impact.\nGet back to your feet under control, checking balance before moving again.\n\nHolding back on full extension out of old habits from indoor diving, which leaves genuine range on the table the sand would actually support safely." },
  { id: "e11", name: "Ladder Lateral Shuffle", category: "Footwork & Agility", type: "Solo", season: "Both", equipment: "Agility ladder", format: "4 x 20m", loadAreas: ["ankle", "knee"], desc: "Mirrors the small, rapid adjustment steps used to track the ball across the goal — footwork that's about quick, controlled steps more than raw sprint speed.\n\nStand side-on to the ladder in a low, athletic stance.\nStep in-out through each rung, staying low and keeping the feet quick rather than long.\nMove down the full length of the ladder, then reset and repeat facing the other way.\n\nStanding too upright partway through the ladder as fatigue sets in, which loses the low base the actual movement in goal depends on." },
  { id: "e12", name: "Shadow Save Footwork", category: "Footwork & Agility", type: "Solo", season: "Both", equipment: "None", format: "5 x 30s", loadAreas: ["ankle", "knee"], desc: "Trains the feet to stay active and the stance to stay compact against a moving, unpredictable target, with no ball needed to isolate just the movement.\n\nStand in your ready stance and imagine a shooter moving and changing angles in front of you.\nShuffle and adjust your position continuously in response, keeping your stance width consistent throughout.\nVary the imagined movement each set so you're not repeating a memorised pattern.\n\nLetting the feet go static between imagined movements instead of staying in continuous small adjustments — the exact habit this drill is meant to break." },
  { id: "e13", name: "Cone T-Drill, Keeper Style", category: "Footwork & Agility", type: "Solo", season: "Both", equipment: "Cones", format: "4 reps", loadAreas: ["ankle", "knee", "hip"], desc: "Adapts a classic agility pattern to the actual movement vocabulary of the position — forward, shuffle, backpedal — rather than generic straight-line sprinting.\n\nSet up cones in a T shape: one at the base, one at the top, one at each end of the crossbar.\nSprint forward to the top cone, shuffle sideways to one end cone, shuffle back across to the other end cone, then backpedal to the start.\nKeep your chest up and stance low through every direction change.\n\nTurning the hips to run the sideways sections instead of shuffling, which is faster in a straight sprint but doesn't build the lateral movement pattern the drill is for." },
  { id: "e14", name: "Beach Sand Sprints", category: "Footwork & Agility", type: "Solo", season: "Summer", equipment: "None", format: "6 x 15m", loadAreas: ["ankle", "knee", "hamstring"], desc: "Sand's extra resistance builds explosive leg power that carries over directly to push-off strength once that resistance is removed on a hard court.\n\nMark a short sprint distance on the sand.\nDrive out of a low start with maximum effort for the full distance.\nWalk back to recover fully before the next rep — this is about power output per sprint, not conditioning volume.\n\nShortening the recovery between sprints to fit more reps in, which turns a power drill into a fatigue drill and drops the quality of every rep after the first couple." },
  { id: "e15", name: "Arc Shuffle & React", category: "Footwork & Agility", type: "Partner", season: "Both", equipment: "Ball", format: "5 x 8", loadAreas: ["ankle", "knee", "hip"], desc: "Combines the two things a keeper actually does at once in a match — track along the arc and react to a shot — rather than training them in isolation.\n\nShuffle laterally along the 6m line, mirroring an imagined or partner's movement.\nAt an unpredictable moment, your partner gives a shot cue.\nReact immediately from wherever the shuffle has taken you, not from a reset stance.\n\nStopping the shuffle and resetting to a neutral stance before reacting to the cue, which removes the exact challenge — reacting mid-movement — the drill is built around." },
  { id: "e16", name: "Angle Narrowing Walkthrough", category: "Positioning", type: "Solo", season: "Both", equipment: "None", format: "3 reps per zone", loadAreas: [], desc: "Builds a felt sense of the correct standing point for each zone of the court, using the actual geometry of narrowing a shooting angle rather than a guess.\n\nStand at a marked shooting zone and identify the line from that point to the centre of the goal.\nWalk out along that line to the correct standing point, checking you're covering both posts equally.\nRepeat from several zones around the court, feeling how the correct point shifts as the angle changes.\n\nStanding too deep in goal out of habit, which feels safer but actually opens up more net than stepping out to the correct point on the angle." },
  { id: "e17", name: "Near-Post Coverage Drill", category: "Positioning", type: "Partner", season: "Both", equipment: "Ball", format: "4 x 8", loadAreas: [], desc: "Tight-angle shots near the post punish poor positioning more than almost any other shot — this sharpens the specific instinct for covering that space.\n\nPartner shoots repeatedly from tight angles close to the post.\nAdjust your position tighter to the near post than your normal angle-narrowing point would suggest.\nStay compact and ready to react to a shot that has almost no far-post option.\n\nApplying the standard angle-narrowing position from open play, which leaves the near post exposed on shots taken from this tight a range." },
  { id: "e18", name: "Six-Metre Line Reads", category: "Positioning", type: "Team", season: "Winter", equipment: "Full attack unit", format: "3 x 10 min", loadAreas: ["shoulder", "hip", "knee"], desc: "Live attacking phases against a real unit test positioning against genuine match movement, not a scripted feed — the read has to hold up under real deception.\n\nFace a full attacking unit running live phases against your defence.\nTrack the ball and the shape of the attack together, adjusting your position as both develop.\nCommit to a save decision only once a real shot is clearly coming.\n\nLocking onto the ball-carrier and losing track of the shape around them, which is exactly when a switch of play or a late run catches you out of position." },
  { id: "e19", name: "Beach Two-Point Positioning", category: "Positioning", type: "Partner", season: "Summer", equipment: "Ball", format: "4 x 8", loadAreas: [], desc: "Beach handball's two-point specialist shot has a different trajectory to a standard shot, and your normal set point undersells your coverage against it.\n\nSet up facing a shooter attempting the two-point shot from its usual distance and angle.\nAdjust your set point to account for the shot's flatter, longer trajectory rather than your standard angle position.\nReact to the release, tracking the ball's flight rather than anticipating a normal-shot arc.\n\nHolding the same position you'd take against a standard shot from that zone, which is calibrated for the wrong trajectory entirely." },
  { id: "e20", name: "Wind-Up Cue Recognition", category: "Shot Reading", type: "Partner", season: "Both", equipment: "Ball", format: "5 x 10", loadAreas: [], desc: "A shooter's wind-up gives away real information before release — sharpening anticipation here buys reaction time a pure reflex drill can't.\n\nPartner varies their wind-up speed, angle and body shape before each shot.\nCall the shot direction out loud as soon as you think you've read it, before the release.\nCompare your call to the actual shot and adjust what you're watching for next time.\n\nWatching the ball itself during the wind-up instead of the shoulder and hip cues that precede it, which gives away the read far too late to be useful." },
  { id: "e21", name: "Spin Shot Anticipation", category: "Shot Reading", type: "Partner", season: "Summer", equipment: "Ball", format: "5 x 8", loadAreas: ["hip"], desc: "The spin (360) shot commits the shooter's body early in a way a standard shot doesn't — learning to read that commitment is what makes this shot defendable.\n\nFace the spin shot repeatedly from its usual set-up distance.\nWatch for the early rotation and weight shift that signal the spin is starting, before the ball itself moves.\nReact to that early signal rather than waiting to see where the ball ends up pointing.\n\nWaiting for the shooter to fully face the goal before reacting, which is far too late — the spin's whole advantage is the time it buys before that point." },
  { id: "e22", name: "Wing Shot Angle Reading", category: "Shot Reading", type: "Partner", season: "Both", equipment: "Ball", format: "4 x 8", loadAreas: ["hip"], desc: "Shots from the wing come from a much narrower angle than central shots, and reading them wrong usually means over-committing to a save option that was never really available.\n\nFace shots taken from the wing position at its typical range.\nSet up tighter to the near post than you would centrally, reflecting the narrow angle available.\nRead the shooter's shoulder and wrist for direction rather than assuming the shot must go far post.\n\nAssuming a wing shooter must go far post because the near-post gap looks small — exactly the assumption a good wing shooter exploits." },
  { id: "e23", name: "Video Shot Study", category: "Shot Reading", type: "Solo", season: "Both", equipment: "Phone or laptop footage", format: "20 min", loadAreas: [], desc: "Removes the physical reaction entirely so you can isolate and train the read itself — the part of shot-stopping that improves through repetition of watching, not just doing.\n\nLoad footage of your own games or professional matches.\nPause the clip just before each shot is taken.\nCall out loud what save you'd make and why, before resuming the footage to check.\n\nWatching passively without committing to a call before resuming, which turns the session into entertainment rather than a genuine anticipation drill." },
  { id: "e24", name: "Breakaway 1v1 Series", category: "1v1 & Breakaways", type: "Partner", season: "Both", equipment: "Ball", format: "6 reps", loadAreas: ["shoulder", "hip", "knee"], desc: "A breakaway strips away all the team-defence support you'd normally have — timing when to commit becomes the entire contest.\n\nHave the attacker start from distance and run in alone.\nAdvance out to meet them at a controlled pace, delaying your final commitment as long as possible.\nTime your commitment to the shot-blocking window just before they release, not before.\n\nCommitting to a dive or a set position too early, which gives the attacker a clear read and an easy finish around a keeper who's already moved." },
  { id: "e25", name: "Penalty (7m) Save Reps", category: "1v1 & Breakaways", type: "Partner", season: "Both", equipment: "Ball", format: "10 reps", loadAreas: ["shoulder", "hip"], desc: "A penalty is a pure timing contest with no positioning variable — reading the shooter's release, not their approach, is the whole skill.\n\nSet up on your line facing a shooter taking standard penalties.\nWatch the shooter's arm and wrist through their approach, not their eyes or run-up.\nTrigger your dive on the actual release, not a moment before.\n\nDiving early based on the shooter's approach or a guessed direction — the single most common way a penalty gets beaten even when the dive itself was well executed." },
  { id: "e26", name: "Beach Penalty (Spin) Reps", category: "1v1 & Breakaways", type: "Partner", season: "Summer", equipment: "Ball", format: "10 reps", loadAreas: ["shoulder", "hip"], desc: "The same release-timing discipline as a standard penalty, applied against a shot whose spin trajectory is genuinely different to read.\n\nFace standard beach handball penalties taken with the spin shot.\nWatch for the same early rotation cues used in general spin-shot reading, adapted to the fixed penalty distance.\nTrigger your movement on the read, staying committed once you've moved.\n\nApplying standard penalty timing built for a straight shot, which reacts too late against the spin's different release point and trajectory." },
  { id: "e27", name: "Lateral Bound Power", category: "Strength & Power", type: "Gym", season: "Both", equipment: "None / mats", format: "4 x 6 each side", loadAreas: ["hip", "knee", "ankle"], desc: "Builds the single-leg push-off power that actually drives a dive — most of a save's initial speed comes from this push, not the arm reaching afterward.\n\nStart balanced on one leg in a slight athletic crouch.\nBound explosively sideways, landing on the opposite leg with control.\nStick the landing for a moment before bounding back the other way.\n\nRushing the landing and immediately bounding back without sticking it, which trades away the control half of the exercise and raises injury risk on the landing leg." },
  { id: "e28", name: "Box Jump Explosiveness", category: "Strength & Power", type: "Gym", season: "Both", equipment: "Plyo box", format: "4 x 5", loadAreas: ["knee", "ankle"], desc: "Vertical explosive power lifts high saves and extends reach on top-corner shots — a quality that's hard to build through diving reps alone.\n\nStand facing the box in an athletic stance, arms ready to swing.\nDrop into a quarter squat and explode upward, driving the arms to help lift.\nLand softly on top of the box with both feet, then step down under control.\n\nJumping down off the box instead of stepping down, which adds unnecessary landing-impact volume without adding any of the exercise's actual benefit." },
  { id: "e29", name: "Med Ball Rotational Throws", category: "Strength & Power", type: "Gym", season: "Both", equipment: "Medicine ball", format: "4 x 8 each side", loadAreas: ["low back", "shoulder"], desc: "Transfers rotational power through the hips and trunk directly into arm speed on saves — a save's power comes from the body turning, not the arm alone.\n\nStand side-on to a wall with the medicine ball held at hip height.\nRotate through the hips and trunk first, letting the arms follow, and release the ball explosively into the wall.\nCatch or collect the rebound and reset your stance before the next rep.\n\nThrowing with the arms and shoulders while the hips stay square, which turns a rotational-power exercise into an arm exercise and misses the point entirely." },
  { id: "e30", name: "Single-Leg RDL Stability", category: "Strength & Power", type: "Gym", season: "Both", equipment: "Dumbbell", format: "3 x 10 each leg", loadAreas: ["hip", "hamstring", "low back"], desc: "Builds the balance and posterior-chain strength needed for a stable, controlled landing after a dive or jump — an uncontrolled landing is where avoidable strain happens.\n\nStand on one leg holding a dumbbell in the opposite hand.\nHinge at the hip, extending the free leg back as the torso lowers toward parallel with the floor.\nKeep the standing knee soft and the hips square throughout, then return to standing with control.\n\nLetting the hips rotate open as you hinge, which is the body compensating for a balance loss rather than genuinely building it." },
  { id: "e31", name: "Shoulder Stability Band Work", category: "Core & Prevention", type: "Gym", season: "Both", equipment: "Resistance band", format: "3 x 15", loadAreas: ["shoulder"], desc: "Protects the rotator cuff and shoulder against the repetitive diving and overhead load keepers carry through a season — an often-skipped exercise that prevents a common, nagging injury.\n\nAnchor the band at roughly shoulder height.\nWith the elbow tucked close to your side, rotate the forearm outward against the band's resistance.\nControl the return back to the start position rather than letting the band snap it back.\n\nLetting the elbow drift away from the body during the rotation, which shifts the work off the rotator cuff and onto bigger, less relevant muscles." },
  { id: "e32", name: "Anti-Rotation Core Hold", category: "Core & Prevention", type: "Gym", season: "Both", equipment: "Cable or band", format: "3 x 30s each side", loadAreas: ["low back", "core"], desc: "Trains the core to resist rotational force rather than create it — stability under load that carries directly into injury-resilient saves and dives.\n\nSet up side-on to a cable or band anchored at chest height.\nPress the handle straight out from your chest and hold, resisting the pull trying to rotate your torso toward the anchor.\nKeep hips and shoulders square throughout the hold, breathing normally.\n\nLetting the torso rotate slightly to \"win\" against the resistance, which defeats the exercise — the goal is to hold still, not out-muscle the band." },
  { id: "e33", name: "Hip Mobility Flow", category: "Core & Prevention", type: "Solo", season: "Both", equipment: "Mat", format: "10 min flow", loadAreas: ["hip"], desc: "Extends safe range of motion at the hip going into a dive, where a tight hip is often what limits genuine extension more than strength does.\n\nMove through a sequence of hip-opener stretches and dynamic mobility positions.\nHold each static position briefly before flowing into the next dynamic movement.\nWork through the full range on both sides evenly.\n\nRushing through the flow to get it done, which turns a mobility sequence into a series of half-stretches that don't actually extend range over time." },
  { id: "e34", name: "Beach Heat Conditioning Circuit", category: "Conditioning", type: "Solo", season: "Summer", equipment: "None", format: "20 min circuit", loadAreas: ["ankle", "knee", "hip"], desc: "Built to mimic match intensity in the specific heat and surface conditions beach handball is actually played in, not generic fitness conditioning.\n\nSet up a circuit combining sand sprints, save reps, and short recovery periods.\nWork through the circuit at match-realistic intensity for the full duration.\nHydrate and monitor how you're coping with the heat throughout, not just at the end.\n\nGoing too hard in the first few rounds and fading badly by the end, which trains poor pacing rather than the sustained match intensity the circuit is meant to build." },
  { id: "e35", name: "Repeat Sprint Save Combo", category: "Conditioning", type: "Partner", season: "Winter", equipment: "Ball", format: "6 reps", loadAreas: ["ankle", "knee", "shoulder", "hip"], desc: "Builds match-realistic conditioning around the save action itself, rather than generic running fitness that doesn't transfer to how a keeper actually gets tired in a game.\n\nSprint a short distance into position for a save.\nMake the save, then immediately sprint again to reset for the next one.\nRepeat for the full set, keeping save quality high even as fatigue builds.\n\nLetting save technique fall apart once fatigue sets in, which trains bad habits under tiredness instead of the match-realistic conditioning the drill is meant to build." },
  { id: "e36", name: "Seated Slide Reach", category: "Diving & Ground Work", type: "Solo", season: "Both", equipment: "None / mat", format: "4 x 8 each side", loadAreas: ["hip", "groin"], desc: "Grooves the hip path a full slide depends on, with none of the impact — the first step in the progression before adding speed or a live feed.\n\nSit on the floor in a wide, half-split-style position, chest tall.\nReach laterally toward a target with control, feeling the hip rotate rather than just the arm stretching.\nReturn to the start position with the same control you reached with.\n\nLetting the reach come purely from the shoulder and arm instead of the hip, which fails to build the actual movement pattern a real slide needs." },
  { id: "e37", name: "Kneeling Slide Push-Off", category: "Diving & Ground Work", type: "Solo", season: "Both", equipment: "None / mat", format: "4 x 6 each side", loadAreas: ["hip", "knee", "groin"], desc: "Isolates the push-off leg and hip trajectory a standing slide depends on, at a controlled speed where the mechanics are easy to feel and correct.\n\nStart kneeling, with one leg extended out to the side.\nDrive off the outside (kneeling) leg, extending the other leg further out to the target.\nReturn to the starting kneeling position under control before repeating on the same side.\n\nPushing off with a straight, locked knee instead of a bent, springy one, which limits how much force the leg can actually generate." },
  { id: "e38", name: "Basic-Stance Slide Progression", category: "Diving & Ground Work", type: "Partner", season: "Both", equipment: "Ball", format: "5 x 6 each side", loadAreas: ["hip", "groin", "knee"], desc: "The full-speed version of the seated and kneeling progressions — this is where the isolated mechanics get tested against a real, reactive target.\n\nStart in your normal ready stance.\nHave a partner feed low, wide targets to either side.\nSlide out to each one at full speed, using the same hip and push-off mechanics grooved in the earlier progressions.\n\nRushing into this stage before the seated and kneeling versions feel automatic, which tends to bring back the arm-led reach those drills were built to correct." },
  { id: "e39", name: "Slide Recovery to Ready Stance", category: "Diving & Ground Work", type: "Solo", season: "Both", equipment: "None", format: "5 x 6", loadAreas: ["hip", "knee"], desc: "The recovery half of the slide is easy to neglect in training but just as important in a match — a slide that leaves you stuck out wide is a liability against a second shot.\n\nSlide out to a low target as in the standard drill.\nOnce there, focus purely on the return: drive back to a centred, balanced ready stance as fast as possible.\nTreat every rep as if another shot could be coming immediately after.\n\nStanding up slowly and repositioning in stages rather than driving back to stance in one controlled motion, which leaves a real gap for a follow-up shot." },
  { id: "e40", name: "Non-Reacting Side Control", category: "Diving & Ground Work", type: "Partner", season: "Both", equipment: "Ball", format: "4 x 8", loadAreas: ["hip", "groin"], desc: "Builds awareness of the support side of a slide — the arm and leg not doing the reaching — which is what actually keeps the whole movement stable.\n\nPerform standard slide reps as normal.\nHave a partner watch only your non-reacting arm and leg throughout each rep.\nThey call out any time that side collapses, trails, or loses tension.\n\nLetting the trailing arm drop or the support leg go passive once attention shifts to the reaching side, which destabilises the whole slide even when the reach itself looks fine." },
  { id: "e41", name: "Sliding Prep Mobility & Activation", category: "Core & Prevention", type: "Solo", season: "Both", equipment: "Mat, band", format: "12 min circuit", loadAreas: ["hip", "groin"], desc: "The hip flexors, adductors and glutes take real load in sliding work — this warms and activates them specifically before that load starts, rather than relying on a generic warm-up.\n\nRun through a short sequence of hip-flexor stretches, adductor mobility work, and glute activation exercises.\nMove from static holds into dynamic, sliding-specific ranges as the circuit progresses.\nFinish with a couple of light, controlled slide reps before moving into full-intensity sliding work.\n\nSkipping straight to full-speed sliding reps without this circuit, especially early in a session — when sliding-related strains are most likely to happen." },
  { id: "e42", name: "Cue-Reveal Reaction Drill", category: "Reflexes", type: "Partner", season: "Both", equipment: "Ball", format: "5 x 10", loadAreas: [], desc: "Trains early visual pickup from a shooter's hand position rather than the release itself — the window a real shooter actually gives away before shooting.\n\nPartner starts with the ball hidden behind their body or out of your sightline.\nThey reveal it to one side for a brief moment, then shoot.\nReact to the reveal itself — the side the ball appears on — rather than waiting for the ball to leave their hand.\n\nWatching the shooter's face or shoulders instead of the ball's reveal point, since those cues are far less reliable predictors of shot direction." },
  { id: "e43", name: "Decision Save: Which Shooter?", category: "Shot Reading", type: "Team", season: "Both", equipment: "Ball, 3 players", format: "4 x 8", loadAreas: ["shoulder", "hip"], desc: "Forces holding your position and reading late rather than committing early to a guess — the exact discipline a real multi-option attack demands.\n\nHave three players stand across the top of the D, each ready to shoot.\nHold a balanced, central position covering all three as they move and feint.\nReact only once one of them actually commits to a shot, on a delayed and unpredictable cue.\n\nDrifting toward whichever player looks most likely to shoot before the cue, which is a guess dressed up as a read and leaves you out of position if a different player goes." },
  { id: "e44", name: "Cognitive Ladder Callouts", category: "Footwork & Agility", type: "Partner", season: "Both", equipment: "Agility ladder", format: "4 x 20m", loadAreas: ["ankle", "knee"], desc: "Layers a real decision-making load onto an established movement pattern — closer to how footwork actually gets used, while also reading and reacting to something.\n\nRun a standard ladder footwork pattern you already know well.\nPartner calls out numbers or directions partway through that change your next steps.\nAdjust the pattern on the spot without breaking stride or slowing to think.\n\nSlowing down to process the callout before reacting, which defeats the point — the goal is adjusting the movement while it's still happening, not pausing and restarting." },
  { id: "e45", name: "Fast Break Outlet After Save", category: "Fast Break & Distribution", type: "Partner", season: "Both", equipment: "Ball", format: "6 reps", loadAreas: ["shoulder", "hip"], desc: "Trains the save-to-transition sequence as one continuous action, which is how it actually happens in a match, not two separate skills trained in isolation.\n\nMake the save as normal.\nImmediately scan the court for a sprinting teammate as you're still coming up from the save.\nRelease an accurate outlet pass to them without pausing to reset first.\n\nFully resetting to a standing position before even looking for the outlet, which costs the exact half-second that turns a fast break into a wasted opportunity." },
  { id: "e46", name: "Overhead Ball Recovery & Release", category: "Fast Break & Distribution", type: "Partner", season: "Both", equipment: "Ball", format: "5 x 6", loadAreas: ["shoulder"], desc: "Builds composure in the scrappier moments before a counter-attack, when the ball's off the crossbar or over you and there's no clean save to fall back on.\n\nHave a partner play or deflect a ball over you or off the crossbar.\nTrack it, get it under control quickly, and gather it into your body.\nRelease it accurately and without delay once controlled.\n\nRushing the release before the ball is genuinely under control, which turns a scrappy moment into a turnover instead of a transition opportunity." },
  { id: "e47", name: "Directed Outlet Pass Drill", category: "Fast Break & Distribution", type: "Team", season: "Both", equipment: "Ball, 2+ players", format: "5 x 8", loadAreas: ["shoulder"], desc: "Builds the habit of scanning for the break before the ball even arrives, so the decision is already made by the time you need to release it.\n\nAfter each save, a coach or teammate signals which side to release the outlet pass to.\nMake the save, then release the pass to the signalled side as quickly as possible.\nScan for the signal early, during the save itself if you can, rather than after.\n\nWaiting until after the save to start looking for the signal, which adds a full beat of delay to a pass that should be near-instant." },
  { id: "e48", name: "Ready Stance Fundamentals", category: "Positioning", type: "Solo", season: "Both", equipment: "Mirror (optional)", format: "5 x 30s holds", loadAreas: [], desc: "Every save starts from this position — a small flaw here quietly limits every other drill in the library, which is why it's worth revisiting even at a senior level.\n\nStand with feet roughly shoulder-width apart, knees bent, weight forward onto the balls of your feet.\nBring hands up and slightly ahead of your body, palms out and fingers spread.\nKeep your eyes on the ball carrier, not the ball alone, and hold the position under control.\n\nLetting the weight settle back onto the heels during the hold, which feels comfortable but noticeably slows the first step in any direction." },
  { id: "e49", name: "Basic Catch Fundamentals", category: "Reflexes", type: "Partner", season: "Both", equipment: "Ball", format: "4 x 15", loadAreas: [], desc: "The foundation every other catching and reflex drill in the library builds on — clean hands here is what makes the harder versions of the skill possible.\n\nStand a few metres from your partner in a relaxed ready stance, hands up and open.\nHave them toss or roll the ball straight at your body at an easy, controllable pace.\nCatch with soft hands and full finger contact, bringing the ball into your body rather than snatching at it.\nIncrease the toss speed only once every catch is clean and controlled.\n\nTrying to catch with stiff, flat palms instead of spread fingers and slight give in the hands, which causes clean, straight throws to pop out or bobble." },
  { id: "e50", name: "Warm-Up: General Physical Preparation", category: "Warm-Up", type: "Solo", season: "Both", equipment: "None", format: "4-5 min", loadAreas: [], desc: "General preparation before anything goal-specific starts — the first of four phases, raising heart rate and mobility rather than testing anything yet.\n\nMove through joint mobility for shoulders, elbows, hips, ankles and knees.\nProgress from static holds into dynamic swings through each joint.\nFinish with a few short bursts of GK-specific fast movement — quick feet, a couple of explosive steps — to raise heart rate.\n\nRushing straight to the explosive bursts before the joints have moved through their full range, which skips the actual preparation this phase exists for." },
  { id: "e51", name: "Warm-Up: Progressive Throws", category: "Warm-Up", type: "Partner", season: "Both", equipment: "Ball", format: "6-8 min", loadAreas: ["shoulder"], desc: "Grooves clean technique before testing it against anything unpredictable — phase three of four, where the warm-up starts asking real questions.\n\nStart with your partner showing or telling you which corner is coming before each throw.\nFocus on clean technique and ball contact while the shot is still predictable.\nOnce that feels sharp, move to realistic, unpredictable shot positions without the advance cue.\n\nMoving to unpredictable shots too early, before technique feels genuinely sharp on the cued version, which just repeats poor habits at higher intensity." },
  { id: "e52", name: "Noise-Filter Reaction Drill", category: "Reflexes", type: "Partner", season: "Both", equipment: "Ball, plus a second person or noise source", format: "4 x 10", loadAreas: [], desc: "Trains filtering out noise that isn't the shot signal — a genuinely different skill from picking up a cue, and one that only shows up under real match conditions.\n\nSet up as a standard partner reaction drill, with a second person or a speaker adding noise alongside it.\nHave the second source shout numbers, contradictory directions, or play crowd noise while your partner prepares to throw.\nReact only to the real throw, ignoring everything else going on around it.\n\nReacting to the loudest or most recent sound rather than the actual throw, especially early on — the instinct is to orient toward noise, which is exactly what this drill trains out." },
  { id: "e53", name: "Multi-Target Tracking Drill", category: "Positioning", type: "Team", season: "Both", equipment: "Ball, 3+ players", format: "5 x 6", loadAreas: ["hip"], desc: "Real attacks rarely come from a single, obvious thrower — this trains holding awareness of several moving threats and the space between them at once.\n\nHave two or more attackers move and pass around the top of the D.\nTrack all of them continuously, adjusting your position as the ball and the space shift.\nReact to a shot from whichever attacker is signalled, without having locked onto just one beforehand.\n\nFixating on whoever last touched the ball rather than the whole picture, which leaves you flat-footed when the shot comes from someone you'd stopped tracking." },
  { id: "e54", name: "Post-Touch Positional Awareness", category: "Positioning", type: "Solo", season: "Both", equipment: "None (blindfold optional)", format: "5 x 30s", loadAreas: [], desc: "Builds an internal sense of exact position in goal without a visual check — the same re-orientation needed in the split second after a scramble, when there's no time to look.\n\nClose your eyes or put on a blindfold in the centre of the goal.\nMove out and touch one post by feel, then return to centre before touching the other.\nIncrease the pace once you can complete the movement confidently without hesitating.\n\nSliding a foot along the ground to \"cheat\" a visual reference instead of relying on genuine spatial memory, which undermines the exact sense the drill is trying to build." },
  { id: "e55", name: "Auditory Reaction Drill", category: "Reflexes", type: "Team", season: "Both", equipment: "Ball, 2+ players", format: "5 x 8", loadAreas: [], desc: "Sharpens the auditory pickup — footstep timing, contact sound — that supplements vision during a scramble, when your eyes genuinely can't track everything at once.\n\nFace away from play or close your eyes while teammates pass the ball around.\nListen for the contact sound of the shot being taken.\nReact to that sound alone, without opening your eyes early to check.\n\nPeeking a fraction of a second before or after the shot sound to confirm the direction visually, which defeats the purpose and hides how reliable the auditory read actually is." },
  { id: "e56", name: "Cover-the-Frame Drill", category: "Positioning", type: "Team", season: "Both", equipment: "Ball, 3+ shooters", format: "4 x 10 shots", loadAreas: ["shoulder", "hip", "knee"], desc: "A real scramble rarely gives you a clean reset between shots — this trains covering the goal instinctively from wherever you've landed, not from a fresh set stance every time.\n\nHave multiple shooters positioned around the 6m and 9m arc take shots in quick succession.\nAfter each save, get up and cover the frame from your current position rather than resetting fully to centre first.\nStay ready for the next shot to arrive before you feel fully reset.\n\nTaking the extra half-second to fully reset to centre stance between shots, which isn't available in a real scramble and defeats the purpose of the drill." },
  { id: "e57", name: "Ball Absorption: Static Catch", category: "Core & Prevention", type: "Partner", season: "Both", equipment: "Ball", format: "4 x 10", loadAreas: ["elbow", "shoulder"], desc: "The bent-elbow technique here avoids the elbow hyperextension risk a straight-arm block carries on a hard shot — the foundation tier of a three-part progression.\n\nStand still facing a partner a few metres away.\nReceive the ball with elbows bent and forearms angled forward, absorbing the impact into the body.\nKeep the arms soft on contact rather than locking them out to block.\n\nStraightening the arms to meet the ball rather than keeping the bend — the exact rigid, straight-arm habit this drill exists to prevent." },
  { id: "e58", name: "Ball Absorption: Lateral Step Catch", category: "Core & Prevention", type: "Partner", season: "Both", equipment: "Ball", format: "4 x 8 each side", loadAreas: ["elbow", "shoulder", "hip"], desc: "Adds a small step to the same bent-elbow absorption technique, testing whether it holds up once movement is introduced — tier two of three.\n\nStand in your ready stance a few metres from your partner.\nStep laterally toward a ball thrown slightly to one side.\nAbsorb it with the same bent-elbow technique used in the static version, without straightening the arms under the added movement.\n\nMoving on to this stage before the static catch is automatic, which tends to bring the rigid, straight-arm habit back the moment movement is added." },
  { id: "e59", name: "Ball Absorption: One-Handed Leaning Save", category: "Core & Prevention", type: "Partner", season: "Both", equipment: "Ball", format: "4 x 6 each side", loadAreas: ["elbow", "shoulder", "hip"], desc: "Applies the same soft-absorption principle at full extension, where the temptation to brace rigidly is strongest — the final tier of the progression.\n\nStand ready with a partner throwing to your full reach at one side.\nLean into the save with one arm, keeping a soft bend through the elbow rather than reaching with a stiff, locked arm.\nAbsorb the impact through the lean and the bent arm together, not the arm alone.\n\nReverting to a straight, locked arm at full extension because it feels like it offers more reach, when it actually raises injury risk without meaningfully improving it." },
  { id: "e60", name: "Warm-Up: In-Goal Movement Preparation", category: "Warm-Up", type: "Solo", season: "Both", equipment: "None", format: "3-4 min", loadAreas: [], desc: "Gets you comfortable moving in the goal space itself before anyone starts shooting — phase two of four, bridging general preparation and live shots.\n\nMove through the goal area at working pace, checking your footing and the surroundings.\nRun through your basic save positions and styles without facing a live shot yet.\nCover the full width and depth of the goal area at least once.\n\nSkipping straight from general mobility to facing live shots and missing this phase entirely — the first live shot then doubles as your first time properly moving in the space that session." },
  { id: "e61", name: "Warm-Up: Distribution Finish", category: "Warm-Up", type: "Partner", season: "Both", equipment: "Ball", format: "3-4 min", loadAreas: ["shoulder"], desc: "Ends the warm-up on the transition skill you'll actually need seconds after a save in a real match, not just on defending.\n\nReceive a ball as if from a save or a pass.\nIdentify a simulated counterattack run from the corner of the court.\nRelease an accurate pass to that run to finish the sequence.\n\nTreating this phase as optional or skippable once the defensive warm-up feels done, which leaves the distribution side of the game completely cold going into a match." },
];
