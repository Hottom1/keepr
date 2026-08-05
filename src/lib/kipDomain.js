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


