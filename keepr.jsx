import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Plus, X, ChevronDown, ChevronRight, ChevronLeft, Dumbbell,
  Waves, Snowflake, Trash2, Check, Pencil, CalendarRange, Target,
  Users, User, ListChecks, BookOpen, ArrowLeft, Circle, CheckCircle2,
  Lightbulb, Eye, ShieldCheck, Zap, Brain, Compass, MessageCircle,
  Send, Sparkles, AlertTriangle, BarChart3, TrendingUp,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

/* ---------------------------------------------------------------- */
/* Design tokens                                                     */
/* INK     #12213A  – deep navy, primary text / dark surfaces        */
/* PAPER   #F3F2ED  – background                                     */
/* TEAL    #0E8388  – primary accent (the goal-line / arc)           */
/* WINTER  #3B5BA5  – indoor court accent                            */
/* SUMMER  #E2984B  – beach / sand accent                            */
/* LINE    #DAD7CC  – hairline borders                               */
/* ---------------------------------------------------------------- */

const CATS = [
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

const TYPES = ["Solo", "Partner", "Team", "Gym"];
const SEASONS = ["Winter", "Summer", "Both"];

const DEFAULT_EXERCISES = [
  { id: "e1", name: "Reaction Ball Drops", category: "Reflexes", type: "Solo", season: "Both", equipment: "Reaction ball", format: "4 x 15", desc: "Drop the ball from shoulder height and react to its unpredictable bounce with quick hands. Stay low, hands ready before each drop." },
  { id: "e2", name: "Tennis Ball Wall Reflex", category: "Reflexes", type: "Solo", season: "Both", equipment: "Tennis ball, wall", format: "4 x 20", desc: "Throw a tennis ball hard against a wall from close range and save the rebound. Vary throw height and angle each set." },
  { id: "e3", name: "Two-Ball Partner Reaction", category: "Reflexes", type: "Partner", season: "Both", equipment: "2 balls", format: "5 x 10 throws", desc: "Partner throws two balls in quick succession to different corners of the goal. Focus on resetting stance between saves." },
  { id: "e4", name: "Colour-Call Reaction", category: "Reflexes", type: "Partner", season: "Both", equipment: "Coloured cones/bibs", format: "6 x 8", desc: "Partner calls a colour or number just before shooting to split your attention, testing reaction under a cognitive load." },
  { id: "e5", name: "Light / App Reaction Drill", category: "Reflexes", type: "Solo", season: "Both", equipment: "Reaction light app or phone", format: "4 x 30s", desc: "React to a random visual cue with a dive or lateral step. Builds first-movement speed independent of a shooter." },
  { id: "e6", name: "Post-to-Post Dive Series", category: "Diving & Ground Work", type: "Solo", season: "Winter", equipment: "None", format: "5 x 6 each side", desc: "Dive corner to corner along the goal line, emphasising full extension and a quick recovery to stance." },
  { id: "e7", name: "Sand Roll Recovery", category: "Diving & Ground Work", type: "Solo", season: "Summer", equipment: "None", format: "6 x 8", desc: "Dive and roll on sand, focusing on the softer sand-specific landing technique and getting back to a ready stance fast." },
  { id: "e8", name: "Low Ball Smother Drill", category: "Diving & Ground Work", type: "Partner", season: "Both", equipment: "Ball", format: "4 x 10", desc: "Partner rolls or throws low shots along the ground to save and smother, working on getting the body behind the ball early." },
  { id: "e9", name: "Diving Save to Feet", category: "Diving & Ground Work", type: "Partner", season: "Both", equipment: "Ball", format: "5 x 6", desc: "Full extension dive followed immediately by an explosive recovery back to your feet, simulating a rebound scramble." },
  { id: "e10", name: "Beach Full-Length Dive", category: "Diving & Ground Work", type: "Solo", season: "Summer", equipment: "None", format: "6 x 5", desc: "Full-length dives in sand working on extension range and a safe, controlled landing given the softer surface." },
  { id: "e11", name: "Ladder Lateral Shuffle", category: "Footwork & Agility", type: "Solo", season: "Both", equipment: "Agility ladder", format: "4 x 20m", desc: "Lateral in-out ladder steps mirroring the small, quick adjustment steps used to track the ball across the goal." },
  { id: "e12", name: "Shadow Save Footwork", category: "Footwork & Agility", type: "Solo", season: "Both", equipment: "None", format: "5 x 30s", desc: "Shadow your own movement against an imaginary shooter changing angles, keeping feet active and stance compact throughout." },
  { id: "e13", name: "Cone T-Drill, Keeper Style", category: "Footwork & Agility", type: "Solo", season: "Both", equipment: "Cones", format: "4 reps", desc: "T-shaped sprint and shuffle pattern adapted to keeper movement: forward, shuffle, backpedal, shuffle." },
  { id: "e14", name: "Beach Sand Sprints", category: "Footwork & Agility", type: "Solo", season: "Summer", equipment: "None", format: "6 x 15m", desc: "Short sprints in sand to build explosive leg power against the extra resistance the surface provides." },
  { id: "e15", name: "Arc Shuffle & React", category: "Footwork & Agility", type: "Partner", season: "Both", equipment: "Ball", format: "5 x 8", desc: "Shuffle laterally along the 6m arc line, then react to a shot cue from your partner at an unpredictable moment." },
  { id: "e16", name: "Angle Narrowing Walkthrough", category: "Positioning", type: "Solo", season: "Both", equipment: "None", format: "3 reps per zone", desc: "Walk through shooting angles from different zones of the court, marking and feeling the correct standing point for each." },
  { id: "e17", name: "Near-Post Coverage Drill", category: "Positioning", type: "Partner", season: "Both", equipment: "Ball", format: "4 x 8", desc: "Partner shoots from tight angles near the post to test and sharpen your near-post positioning instincts." },
  { id: "e18", name: "Six-Metre Line Reads", category: "Positioning", type: "Team", season: "Winter", equipment: "Full attack unit", format: "3 x 10 min", desc: "Live attacking phases against a real team, reading positioning and angles against genuine match movement." },
  { id: "e19", name: "Beach Two-Point Positioning", category: "Positioning", type: "Partner", season: "Summer", equipment: "Ball", format: "4 x 8", desc: "Positioning drill built around beach handball's two-point specialist shot, adjusting your set point for its trajectory." },
  { id: "e20", name: "Wind-Up Cue Recognition", category: "Shot Reading", type: "Partner", season: "Both", equipment: "Ball", format: "5 x 10", desc: "Partner varies wind-up speed and angle; call the shot direction out loud before the release to sharpen anticipation." },
  { id: "e21", name: "Spin Shot Anticipation", category: "Shot Reading", type: "Partner", season: "Summer", equipment: "Ball", format: "5 x 8", desc: "Face beach handball's spin / 360 shot repeatedly, learning to read the early body cues before the spin commits." },
  { id: "e22", name: "Wing Shot Angle Reading", category: "Shot Reading", type: "Partner", season: "Both", equipment: "Ball", format: "4 x 8", desc: "Shots taken from the wing to test narrow-angle anticipation and the adjusted near-post set-up it demands." },
  { id: "e23", name: "Video Shot Study", category: "Shot Reading", type: "Solo", season: "Both", equipment: "Phone or laptop footage", format: "20 min", desc: "Review your own game or professional footage, pausing before each shot to call the save before it happens." },
  { id: "e24", name: "Breakaway 1v1 Series", category: "1v1 & Breakaways", type: "Partner", season: "Both", equipment: "Ball", format: "6 reps", desc: "Attacker runs in alone from distance; practice delaying your commitment and timing the shot-blocking window." },
  { id: "e25", name: "Penalty (7m) Save Reps", category: "1v1 & Breakaways", type: "Partner", season: "Both", equipment: "Ball", format: "10 reps", desc: "Standard penalty facing reps, sharpening timing of your dive trigger relative to the shooter's release." },
  { id: "e26", name: "Beach Penalty (Spin) Reps", category: "1v1 & Breakaways", type: "Partner", season: "Summer", equipment: "Ball", format: "10 reps", desc: "Beach-specific penalty reps facing the spin shot, working the same timing principles against its different trajectory." },
  { id: "e27", name: "Lateral Bound Power", category: "Strength & Power", type: "Gym", season: "Both", equipment: "None / mats", format: "4 x 6 each side", desc: "Explosive lateral bounds building the single-leg push-off power that drives your dive." },
  { id: "e28", name: "Box Jump Explosiveness", category: "Strength & Power", type: "Gym", season: "Both", equipment: "Plyo box", format: "4 x 5", desc: "Vertical explosive power work to lift high saves and improve reach on top-corner shots." },
  { id: "e29", name: "Med Ball Rotational Throws", category: "Strength & Power", type: "Gym", season: "Both", equipment: "Medicine ball", format: "4 x 8 each side", desc: "Rotational power transfer through the hips and trunk, feeding directly into arm speed on saves." },
  { id: "e30", name: "Single-Leg RDL Stability", category: "Strength & Power", type: "Gym", season: "Both", equipment: "Dumbbell", format: "3 x 10 each leg", desc: "Balance and posterior-chain strength for a stable, controlled landing after a dive or jump." },
  { id: "e31", name: "Shoulder Stability Band Work", category: "Core & Prevention", type: "Gym", season: "Both", equipment: "Resistance band", format: "3 x 15", desc: "Rotator cuff and shoulder-stability work to protect against the repetitive diving load keepers carry." },
  { id: "e32", name: "Anti-Rotation Core Hold", category: "Core & Prevention", type: "Gym", season: "Both", equipment: "Cable or band", format: "3 x 30s each side", desc: "Core stability under rotational load — resisting the twist rather than creating it, for injury-resilient saves." },
  { id: "e33", name: "Hip Mobility Flow", category: "Core & Prevention", type: "Solo", season: "Both", equipment: "Mat", format: "10 min flow", desc: "Dynamic hip-opener sequence to extend safe range of motion going into a dive." },
  { id: "e34", name: "Beach Heat Conditioning Circuit", category: "Conditioning", type: "Solo", season: "Summer", equipment: "None", format: "20 min circuit", desc: "Sand-based conditioning circuit built to mimic match intensity in the heat beach handball is played in." },
  { id: "e35", name: "Repeat Sprint Save Combo", category: "Conditioning", type: "Partner", season: "Winter", equipment: "Ball", format: "6 reps", desc: "Sprint into a save, reset, sprint again — repeated to build match-realistic conditioning around your save action." },
  { id: "e36", name: "Seated Slide Reach", category: "Diving & Ground Work", type: "Solo", season: "Both", equipment: "None / mat", format: "4 x 8 each side", desc: "Sit in a wide, half-split-style position and reach laterally to a target with control. An early-progression step for sliding technique that grooves the hip path without the impact of a full slide." },
  { id: "e37", name: "Kneeling Slide Push-Off", category: "Diving & Ground Work", type: "Solo", season: "Both", equipment: "None / mat", format: "4 x 6 each side", desc: "From a kneeling position, drive off the outside leg and extend the other leg out to the side. Isolates the push-off and hip trajectory that a standing slide depends on, at a controlled speed." },
  { id: "e38", name: "Basic-Stance Slide Progression", category: "Diving & Ground Work", type: "Partner", season: "Both", equipment: "Ball", format: "5 x 6 each side", desc: "From your normal ready stance, slide out to low, wide targets fed by a partner. The full-speed version of the seated and kneeling progressions — only add this once those feel controlled." },
  { id: "e39", name: "Slide Recovery to Ready Stance", category: "Diving & Ground Work", type: "Solo", season: "Both", equipment: "None", format: "5 x 6", desc: "Slide out to a low target, then focus purely on getting back to a balanced ready stance as quickly as possible — the recovery half of the movement that's easy to neglect." },
  { id: "e40", name: "Non-Reacting Side Control", category: "Diving & Ground Work", type: "Partner", season: "Both", equipment: "Ball", format: "4 x 8", desc: "During slide reps, a partner watches only your non-reacting arm and leg, calling out when they collapse or trail — building awareness of the support side that keeps the whole movement stable." },
  { id: "e41", name: "Sliding Prep Mobility & Activation", category: "Core & Prevention", type: "Solo", season: "Both", equipment: "Mat, band", format: "12 min circuit", desc: "A short hip-flexor, adductor and glute-activation circuit to run before any sliding-technique work, so the joints taking the load are properly warmed up first." },
  { id: "e42", name: "Cue-Reveal Reaction Drill", category: "Reflexes", type: "Partner", season: "Both", equipment: "Ball", format: "5 x 10", desc: "Partner holds the ball out of sight and reveals it to one side for a split second before shooting. React to the reveal, not the release, to sharpen early visual pickup." },
  { id: "e43", name: "Decision Save: Which Shooter?", category: "Shot Reading", type: "Team", season: "Both", equipment: "Ball, 3 players", format: "4 x 8", desc: "Three players stand across the top of the D, each ready to shoot; only one does, on a delayed cue. Forces you to hold your position and read late rather than committing early to a guess." },
  { id: "e44", name: "Cognitive Ladder Callouts", category: "Footwork & Agility", type: "Partner", season: "Both", equipment: "Agility ladder", format: "4 x 20m", desc: "Run a standard ladder pattern while a partner calls out numbers or directions mid-run that change your footwork on the spot — layering a decision-making load onto the movement pattern." },
  { id: "e45", name: "Fast Break Outlet After Save", category: "Fast Break & Distribution", type: "Partner", season: "Both", equipment: "Ball", format: "6 reps", desc: "Make the save, then immediately find and release an accurate outlet pass to a sprinting teammate. Trains the save-to-transition sequence as one continuous action rather than two separate skills." },
  { id: "e46", name: "Overhead Ball Recovery & Release", category: "Fast Break & Distribution", type: "Partner", season: "Both", equipment: "Ball", format: "5 x 6", desc: "Track and control a ball played over you or off the crossbar, then get it under control and away quickly. Builds composure and speed in the scrappier moments before a counter-attack." },
  { id: "e47", name: "Directed Outlet Pass Drill", category: "Fast Break & Distribution", type: "Team", season: "Both", equipment: "Ball, 2+ players", format: "5 x 8", desc: "After each save, a coach or teammate signals which side to release the outlet pass to. Builds the habit of scanning for the break before the ball even arrives." },
  { id: "e48", name: "Ready Stance Fundamentals", category: "Positioning", type: "Solo", season: "Both", equipment: "Mirror (optional)", format: "5 x 30s holds", desc: "Set and hold the base ready stance: feet shoulder-width apart, knees bent, weight forward, hands up and slightly ahead with palms out and fingers spread, eyes on the ball carrier. A simple check-and-reset drill worth revisiting even at senior level." },
  { id: "e49", name: "Basic Catch Fundamentals", category: "Reflexes", type: "Partner", season: "Both", equipment: "Ball", format: "4 x 15", desc: "Partner tosses or rolls the ball straight at you from close range. Focus purely on clean hand positioning and secure control rather than power or placement — the foundation every other catching drill builds on. Increase toss speed only once catches are consistently clean." },
];

const GOALS = [
  { id: "reaction", name: "Reaction Speed", blurb: "Sharpen first-movement speed and hand reflexes.", cats: ["Reflexes", "Shot Reading"] },
  { id: "diving", name: "Diving & Ground Coverage", blurb: "Extend your range and recover faster off the floor.", cats: ["Diving & Ground Work", "Core & Prevention"] },
  { id: "power", name: "Explosive Power", blurb: "Build the push-off and jump power behind every save.", cats: ["Strength & Power", "Footwork & Agility"] },
  { id: "footwork", name: "Footwork & Positioning", blurb: "Cleaner angles, tighter footwork, better set-up.", cats: ["Footwork & Agility", "Positioning"] },
  { id: "allround", name: "All-Round Keeper", blurb: "A balanced block touching every area.", cats: CATS },
];

const PHASES = [
  { weeks: [1, 2], label: "Foundation", sessions: 2, perSession: 3 },
  { weeks: [3, 4], label: "Build", sessions: 3, perSession: 4 },
  { weeks: [5, 6], label: "Peak", sessions: 3, perSession: 4 },
];

const ADVICE_TOPICS = [
  {
    id: "stance",
    title: "Ready Stance & Positioning Basics",
    icon: "Compass",
    summary: "The foundation every save is built on.",
    tips: [
      "Reset to a shoulder-width, knees-bent stance between every shot — not just at the start of a phase.",
      "Let the shooter's angle set your position, not the goal's centre; step off the centre line to close the near side down.",
      "Hands come up and slightly forward with palms open. Don't let them drop while your feet are still moving.",
      "Eyes stay on the shooter's body, not the ball, until the release.",
    ],
  },
  {
    id: "reading",
    title: "Reading the Shooter",
    icon: "Eye",
    summary: "Anticipation is trainable — it's a read, not a guess.",
    tips: [
      "Watch the shoulder and hip rotation, not the ball. The wind-up tells you the shot before the release does.",
      "Build a mental library of each shooter's tendencies as the match goes on, rather than resetting your read on every attack.",
      "Commit late enough that a wrong read still leaves you a chance to adjust — anticipation you can recover from beats anticipation you can't.",
    ],
  },
  {
    id: "sliding",
    title: "Sliding Technique, Trained Safely",
    icon: "ShieldCheck",
    summary: "One of the most injury-prone skills in the position — worth building in stages.",
    tips: [
      "Train it in stages — seated, then kneeling, then full standing — rather than copying what elite keepers do at full speed.",
      "Hip mobility, adductor strength and core stability aren't optional extras here; they're what keeps your hips and knees safe under the load.",
      "The recovery back to your feet matters as much as the dive itself. A slide that leaves you stuck on the ground invites a second shot.",
      "Warm up the hips and activate the glutes specifically before a sliding-heavy session — a general jog isn't enough preparation.",
    ],
  },
  {
    id: "fastbreak",
    title: "Fast Break & Distribution",
    icon: "Zap",
    summary: "The save is only half the job.",
    tips: [
      "Treat the save and the outlet pass as one action — start scanning for runners while the ball is still in your hands.",
      "A slightly slower, accurate outlet beats a fast, wild one. A turnover off your own throw costs more than the half-second you saved.",
      "Deliberately train distribution on its own — most keepers rack up far more save reps than release reps.",
    ],
  },
  {
    id: "beach",
    title: "Beach vs Indoor: What Actually Changes",
    icon: "Waves",
    summary: "Same position, different surface — and it changes more than you'd think.",
    tips: [
      "Sand changes your push-off and landing mechanics. A full-effort indoor dive translates poorly onto sand without specific practice.",
      "The spin shot needs its own read — the cues arrive later and from a different body position than a standard 9m shot indoors.",
      "Heat and surface fatigue add up fast in beach sessions. Build recovery and hydration into a summer block, not just skill volume.",
    ],
  },
  {
    id: "load",
    title: "Training Load & Injury Prevention",
    icon: "ShieldCheck",
    summary: "Availability across a season is a skill in itself.",
    tips: [
      "Goalkeepers carry a high share of overuse injuries relative to other positions — repetitive diving and sliding load adds up even on days that don't feel hard.",
      "Rotate high-impact diving and sliding work with lower-impact reaction and footwork days rather than stacking them back to back.",
      "Core and shoulder stability work isn't glamorous, but it's what keeps you on the court for the whole season, not just the good weeks.",
    ],
  },
  {
    id: "mental",
    title: "The Mental Side",
    icon: "Brain",
    summary: "Short, repeatable habits beat trying to 'feel confident' on the day.",
    tips: [
      "A save you should have made and a shot that was never save-able feel the same in the moment — sort out which was which afterwards, not during the game.",
      "Build a short reset routine — a breath, a phrase, a stance check — that you use after every goal conceded, regardless of whose fault it was.",
      "Confidence comes from repetition banked in training, not from trying to summon it on match day.",
    ],
  },
];

const ADVICE_ICONS = { Compass, Eye, ShieldCheck, Zap, Waves, Brain };

const LEVELS = ["Social", "Club", "State", "National", "International"];
const DISCIPLINES = ["Indoor", "Beach", "Both"];
const WEAKNESS_OPTIONS = [
  "Low shots", "High shots", "Near-post", "Wing shots", "6m / 1v1",
  "Penalties / shootout", "Footwork & positioning", "Distribution & fast-break",
  "Reaction speed", "Conditioning",
];
const SEVERITIES = ["Mild", "Moderate", "Significant"];
const KIP_PROMPTS = [
  "Cut today to 30 min",
  "Debrief my match",
  "Swap gym for home workout",
  "Why this session?",
  "Shoulder's a bit sore",
  "Got beaten low-left all weekend",
  "Only have a wall today",
  "What should I focus on this week?",
];

/* ---------------------------------------------------------------- */
/* Match stats — zones + discipline-accurate scoring                 */
/* ---------------------------------------------------------------- */

const ZONE_GRID = [
  ["TL", "TM", "TR"],
  ["ML", "MM", "MR"],
  ["BL", "BM", "BR"],
];
const ZONE_LABELS = {
  TL: "Top Left", TM: "Top Centre", TR: "Top Right",
  ML: "Mid Left", MM: "Mid Centre", MR: "Mid Right",
  BL: "Bottom Left", BM: "Bottom Centre", BR: "Bottom Right",
};

// Indoor: every goal is worth 1 point regardless of shot type — these tags are context only.
const INDOOR_SHOT_TYPES = ["Wing", "9m", "6m", "Fast break", "7m Penalty", "Other"];

// Beach handball: a regular goal is 1 point. Spin/360, in-flight, a specialist/goalkeeper
// goal, and a 6m penalty goal are each worth 2 points under IHF beach handball rules.
const BEACH_SHOT_TYPES = ["Regular", "Spin / 360", "In-flight", "Specialist / GK goal", "6m Penalty"];
const BEACH_TWO_POINT_TYPES = ["Spin / 360", "In-flight", "Specialist / GK goal", "6m Penalty"];

function shotTypesFor(season) {
  return season === "Summer" ? BEACH_SHOT_TYPES : INDOOR_SHOT_TYPES;
}

function pointsForShot(season, shotType) {
  if (season === "Summer" && BEACH_TWO_POINT_TYPES.includes(shotType)) return 2;
  return 1;
}

function emptyZoneMap() {
  const z = {};
  ZONE_GRID.flat().forEach((k) => { z[k] = { saves: 0, goals: 0, points: 0 }; });
  return z;
}

function aggregateMatchStats(matches, seasonFilter) {
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

function aggregateShotTypeStats(matches) {
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

function zoneColor(z) {
  const total = z.saves + z.goals;
  if (total === 0) return "#F3F2ED";
  const pct = z.saves / total;
  if (pct >= 0.6) return "#0E8388";
  if (pct >= 0.4) return "#E2984B";
  return "#C1483B";
}

function buildKipSystemPrompt(profile, plans, season, matches) {
  const activePlan = [...plans].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  const recentLogs = [];
  plans.forEach((p) => {
    p.weeks.forEach((w) => {
      w.sessions.forEach((s) => {
        if (s.completed) recentLogs.push({ plan: p.name, week: w.weekNumber, session: s.sessionNumber, rpe: s.rpe, note: s.note });
      });
    });
  });
  const lastLogs = recentLogs.slice(-8);

  const lines = [
    "You are Kip, an AI training coach for handball and beach handball goalkeepers, built into an app called Keepr.",
    "Persona: knowledgeable, encouraging, direct. You speak like an experienced GK coach, not a generic fitness bot. Keep replies fairly short and practical, mobile-chat length, unless the keeper asks for depth.",
    "You must never diagnose injuries or advise training through real pain. For anything beyond mild soreness or fatigue, tell the keeper to get it looked at by a physio rather than prescribing around it.",
    "You can suggest adjustments to a session (shorter, different equipment, lower intensity, swapped exercises) in plain language. You cannot directly edit their saved plan in the app yet, so be explicit about what you're suggesting rather than implying you've changed anything.",
    "",
    `Current season context: ${season === "Winter" ? "Winter — indoor court handball" : "Summer — beach handball"}.`,
    "",
    "KEEPER PROFILE:",
    `Level: ${profile.level || "Not set"}. Discipline: ${profile.discipline || "Not set"}.`,
    `Season phase: ${profile.seasonPhase || "Not set"}. Next competition: ${profile.nextCompetition || "Not set"}.`,
    `Availability: ${profile.sessionsPerWeek || "?"} sessions/week, ~${profile.minutesPerSession || "?"} min each.`,
    `Access: ${Object.entries(profile.access || {}).filter(([, v]) => v).map(([k]) => k).join(", ") || "Not set"}.`,
    `Self-rated weaknesses to prioritise: ${(profile.weaknesses || []).join(", ") || "None flagged"}.`,
    `Current niggles: ${(profile.niggles || []).length ? profile.niggles.map((n) => `${n.part} (${n.severity}, cleared by physio: ${n.clearedByPhysio ? "yes" : "no"})`).join("; ") : "None reported"}.`,
    "",
    "CURRENT PROGRAM:",
    activePlan
      ? `"${activePlan.name}" — ${activePlan.season} block${activePlan.goal ? `, goal: ${activePlan.goal}` : ""}. ${activePlan.weeks.length} weeks: ${activePlan.weeks.map((w) => `Week ${w.weekNumber}${w.focus ? ` (${w.focus})` : ""}`).join(", ")}.`
      : "No saved training block yet — encourage them to build one, or talk through what they need in the meantime.",
    "",
    "RECENT SESSION LOGS:",
    lastLogs.length ? lastLogs.map((l) => `${l.plan} W${l.week} S${l.session}${l.rpe ? ` — RPE ${l.rpe}` : ""}${l.note ? ` — "${l.note}"` : ""}`).join("\n") : "No completed sessions logged yet.",
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
  ];
  return lines.join("\n");
}

const uid = () => Math.random().toString(36).slice(2, 10);

function phaseFor(weekNum) {
  return PHASES.find((p) => p.weeks.includes(weekNum)) || PHASES[0];
}

function poolFor(exercises, season, cats) {
  const pool = exercises.filter(
    (e) => (e.season === "Both" || e.season === season) && cats.includes(e.category)
  );
  return pool.length ? pool : exercises.filter((e) => e.season === "Both" || e.season === season);
}

function generateGoalBlock(name, season, goalId, exercises) {
  const goal = GOALS.find((g) => g.id === goalId);
  const pool = poolFor(exercises, season, goal.cats);
  let cursor = 0;
  const weeks = [1, 2, 3, 4, 5, 6].map((weekNumber) => {
    const phase = phaseFor(weekNumber);
    const sessions = Array.from({ length: phase.sessions }).map((_, sIdx) => {
      const exs = Array.from({ length: phase.perSession }).map(() => {
        const ex = pool[cursor % pool.length];
        cursor += 1;
        return { entryId: uid(), exerciseId: ex.id, prescription: ex.format };
      });
      return { sessionId: uid(), sessionNumber: sIdx + 1, exercises: exs, completed: false };
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

function generateFreeformBlock(name, season, sessionsPerWeek) {
  const weeks = [1, 2, 3, 4, 5, 6].map((weekNumber) => ({
    weekId: uid(),
    weekNumber,
    focus: "",
    sessions: Array.from({ length: sessionsPerWeek }).map((_, sIdx) => ({
      sessionId: uid(),
      sessionNumber: sIdx + 1,
      exercises: [],
      completed: false,
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

/* ---------------------------------------------------------------- */
/* Small UI atoms                                                    */
/* ---------------------------------------------------------------- */

function Chip({ active, onClick, children, accent = "#0E8388" }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors"
      style={
        active
          ? { background: accent, borderColor: accent, color: "#fff" }
          : { background: "transparent", borderColor: "#DAD7CC", color: "#12213A" }
      }
    >
      {children}
    </button>
  );
}

function SeasonBadge({ season }) {
  const map = {
    Winter: { bg: "#3B5BA5", label: "Winter · Court", Icon: Snowflake },
    Summer: { bg: "#E2984B", label: "Summer · Sand", Icon: Waves },
    Both: { bg: "#0E8388", label: "Both seasons", Icon: Target },
  };
  const cfg = map[season] || map.Both;
  const { Icon } = cfg;
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-white"
      style={{ background: cfg.bg }}
    >
      <Icon size={11} strokeWidth={2.5} />
      {cfg.label}
    </span>
  );
}

const typeIcon = { Solo: User, Partner: Users, Team: Users, Gym: Dumbbell };

/* ---------------------------------------------------------------- */
/* App                                                                */
/* ---------------------------------------------------------------- */

export default function GKTrainerApp() {
  const [loading, setLoading] = useState(true);
  const [customExercises, setCustomExercises] = useState([]);
  const [plans, setPlans] = useState([]);
  const [season, setSeason] = useState("Winter");
  const [tab, setTab] = useState("library");
  const [saveError, setSaveError] = useState(false);
  const [profile, setProfile] = useState({ onboarded: false, access: {}, weaknesses: [], niggles: [] });
  const [kipMessages, setKipMessages] = useState([]);
  const [matches, setMatches] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await window.storage.get("gk-trainer-data", false);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setCustomExercises(parsed.customExercises || []);
          setPlans(parsed.plans || []);
          setSeason(parsed.season || "Winter");
          setProfile(parsed.profile || { onboarded: false, access: {}, weaknesses: [], niggles: [] });
          setKipMessages(parsed.kipMessages || []);
          setMatches(parsed.matches || []);
        }
      } catch (e) {
        /* no saved data yet */
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const persist = useCallback(async (next) => {
    try {
      const res = await window.storage.set("gk-trainer-data", JSON.stringify(next), false);
      if (!res) setSaveError(true);
      else setSaveError(false);
    } catch (e) {
      setSaveError(true);
    }
  }, []);

  const allExercises = useMemo(() => [...DEFAULT_EXERCISES, ...customExercises], [customExercises]);

  function updateAndSave({ nextCustom = customExercises, nextPlans = plans, nextSeason = season, nextProfile = profile, nextKip = kipMessages, nextMatches = matches }) {
    setCustomExercises(nextCustom);
    setPlans(nextPlans);
    setSeason(nextSeason);
    setProfile(nextProfile);
    setKipMessages(nextKip);
    setMatches(nextMatches);
    persist({ customExercises: nextCustom, plans: nextPlans, season: nextSeason, profile: nextProfile, kipMessages: nextKip, matches: nextMatches });
  }

  function addExercise(ex) {
    const next = [...customExercises, { ...ex, id: uid(), custom: true }];
    updateAndSave({ nextCustom: next });
  }

  function deleteExercise(id) {
    const next = customExercises.filter((e) => e.id !== id);
    updateAndSave({ nextCustom: next });
  }

  function savePlan(plan) {
    const exists = plans.some((p) => p.id === plan.id);
    const next = exists ? plans.map((p) => (p.id === plan.id ? plan : p)) : [...plans, plan];
    updateAndSave({ nextPlans: next });
  }

  function deletePlan(id) {
    const next = plans.filter((p) => p.id !== id);
    updateAndSave({ nextPlans: next });
  }

  function setSeasonAndSave(s) {
    updateAndSave({ nextSeason: s });
  }

  function saveProfile(p) {
    updateAndSave({ nextProfile: p });
  }

  function saveKipMessages(msgs) {
    updateAndSave({ nextKip: msgs });
  }

  function saveMatch(match) {
    const exists = matches.some((m) => m.id === match.id);
    const next = exists ? matches.map((m) => (m.id === match.id ? match : m)) : [...matches, match];
    updateAndSave({ nextMatches: next });
  }

  function deleteMatch(id) {
    const next = matches.filter((m) => m.id !== id);
    updateAndSave({ nextMatches: next });
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#F3F2ED" }}>
        <div className="text-sm font-semibold tracking-widest uppercase" style={{ color: "#12213A" }}>
          Loading…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#F3F2ED", fontFamily: "system-ui, -apple-system, sans-serif" }}>
      <TopBar season={season} setSeason={setSeasonAndSave} />
      {saveError && (
        <div className="text-center text-[11px] py-1 bg-red-50 text-red-700 border-b border-red-200">
          Couldn't save — your changes may not persist.
        </div>
      )}
      <div className="flex-1 overflow-y-auto pb-20 max-w-md w-full mx-auto">
        {tab === "library" && (
          <Library
            exercises={allExercises}
            season={season}
            onAdd={addExercise}
            onDelete={deleteExercise}
          />
        )}
        {tab === "builder" && (
          <Builder
            exercises={allExercises}
            season={season}
            onSave={(plan) => {
              savePlan(plan);
              setTab("plans");
            }}
          />
        )}
        {tab === "plans" && (
          <Plans
            plans={plans}
            exercises={allExercises}
            onSave={savePlan}
            onDelete={deletePlan}
          />
        )}
        {tab === "advice" && <AdviceHub />}
        {tab === "stats" && (
          <StatsTab matches={matches} season={season} onSave={saveMatch} onDelete={deleteMatch} />
        )}
        {tab === "kip" && (
          <KipTab
            profile={profile}
            onSaveProfile={saveProfile}
            messages={kipMessages}
            onSaveMessages={saveKipMessages}
            plans={plans}
            season={season}
            matches={matches}
          />
        )}
      </div>
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Top bar + season toggle (signature element)                       */
/* ---------------------------------------------------------------- */

function TopBar({ season, setSeason }) {
  return (
    <div className="border-b" style={{ borderColor: "#DAD7CC", background: "#12213A" }}>
      <div className="max-w-md mx-auto px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Keepr<span style={{ color: "#0E8388" }}>.</span>
          </h1>
          <span className="text-[10px] uppercase tracking-widest text-white/50 font-semibold">
            Keeper training
          </span>
        </div>
        <div className="mt-3 flex rounded-lg overflow-hidden border border-white/15">
          {["Winter", "Summer"].map((s) => {
            const active = season === s;
            const Icon = s === "Winter" ? Snowflake : Waves;
            const activeBg = s === "Winter" ? "#3B5BA5" : "#E2984B";
            return (
              <button
                key={s}
                onClick={() => setSeason(s)}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs font-bold uppercase tracking-wide transition-colors"
                style={{
                  background: active ? activeBg : "transparent",
                  color: active ? "#fff" : "rgba(255,255,255,0.55)",
                }}
              >
                <Icon size={13} strokeWidth={2.5} />
                {s === "Winter" ? "Court" : "Sand"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function BottomNav({ tab, setTab }) {
  const items = [
    { id: "library", label: "Library", Icon: BookOpen },
    { id: "builder", label: "Build", Icon: Plus },
    { id: "plans", label: "Plans", Icon: ListChecks },
    { id: "advice", label: "Advice", Icon: Lightbulb },
    { id: "stats", label: "Stats", Icon: BarChart3 },
    { id: "kip", label: "Kip", Icon: Sparkles },
  ];
  return (
    <div
      className="fixed bottom-0 left-0 right-0 border-t bg-white"
      style={{ borderColor: "#DAD7CC" }}
    >
      <div className="max-w-md mx-auto flex">
        {items.map(({ id, label, Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className="flex-1 flex flex-col items-center gap-0.5 py-2 px-0.5 min-w-0"
              style={{ color: active ? "#0E8388" : "#8A8779" }}
            >
              <Icon size={18} strokeWidth={active ? 2.5 : 2} />
              <span className="text-[9px] font-bold uppercase tracking-wide truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Library                                                            */
/* ---------------------------------------------------------------- */

function Library({ exercises, season, onAdd, onDelete }) {
  const [q, setQ] = useState("");
  const [cat, setCat] = useState(null);
  const [type, setType] = useState(null);
  const [seasonFilter, setSeasonFilter] = useState("current"); // current | all
  const [detail, setDetail] = useState(null);
  const [showAdd, setShowAdd] = useState(false);

  const filtered = exercises.filter((e) => {
    if (q && !e.name.toLowerCase().includes(q.toLowerCase())) return false;
    if (cat && e.category !== cat) return false;
    if (type && e.type !== type) return false;
    if (seasonFilter === "current" && !(e.season === "Both" || e.season === season)) return false;
    return true;
  });

  return (
    <div className="px-4 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex-1 flex items-center gap-2 bg-white rounded-lg px-3 py-2 border" style={{ borderColor: "#DAD7CC" }}>
          <Search size={16} color="#8A8779" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search exercises & drills"
            className="flex-1 text-sm outline-none bg-transparent"
          />
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="p-2.5 rounded-lg text-white shrink-0"
          style={{ background: "#12213A" }}
          aria-label="Add exercise"
        >
          <Plus size={18} />
        </button>
      </div>

      <div className="flex gap-1.5 mb-2 -mx-4 px-4 overflow-x-auto pb-1">
        <Chip active={seasonFilter === "current"} onClick={() => setSeasonFilter(seasonFilter === "current" ? "all" : "current")} accent="#12213A">
          {seasonFilter === "current" ? `${season} relevant` : "All seasons"}
        </Chip>
        {TYPES.map((t) => (
          <Chip key={t} active={type === t} onClick={() => setType(type === t ? null : t)}>
            {t}
          </Chip>
        ))}
      </div>
      <div className="flex gap-1.5 mb-4 -mx-4 px-4 overflow-x-auto pb-1">
        {CATS.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? null : c)} accent="#3B5BA5">
            {c}
          </Chip>
        ))}
      </div>

      <div className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
        {filtered.length} exercise{filtered.length !== 1 ? "s" : ""}
      </div>

      <div className="space-y-2">
        {filtered.map((e) => (
          <ExerciseRow key={e.id} ex={e} onClick={() => setDetail(e)} />
        ))}
        {filtered.length === 0 && (
          <div className="text-sm text-gray-500 py-8 text-center">
            Nothing matches those filters. Try clearing one, or add your own.
          </div>
        )}
      </div>

      {detail && (
        <ExerciseDetailModal
          ex={detail}
          onClose={() => setDetail(null)}
          onDelete={
            detail.custom
              ? () => {
                  onDelete(detail.id);
                  setDetail(null);
                }
              : null
          }
        />
      )}
      {showAdd && <AddExerciseModal onClose={() => setShowAdd(false)} onSave={(ex) => { onAdd(ex); setShowAdd(false); }} />}
    </div>
  );
}

function ExerciseRow({ ex, onClick }) {
  const Icon = typeIcon[ex.type] || User;
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-white rounded-lg border p-3 flex items-start gap-3 active:scale-[0.99] transition-transform"
      style={{ borderColor: "#DAD7CC" }}
    >
      <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: "#F3F2ED" }}>
        <Icon size={16} color="#12213A" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="font-bold text-sm" style={{ color: "#12213A" }}>{ex.name}</span>
          {ex.custom && (
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "#F3F2ED", color: "#8A8779" }}>
              Mine
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500 mt-0.5">{ex.category} · {ex.format}</div>
      </div>
      <ChevronRight size={16} color="#DAD7CC" className="mt-1 shrink-0" />
    </button>
  );
}

function ExerciseDetailModal({ ex, onClose, onDelete }) {
  return (
    <Modal onClose={onClose}>
      <div className="flex items-start justify-between mb-1">
        <h3 className="text-lg font-black" style={{ color: "#12213A" }}>{ex.name}</h3>
        <SeasonBadge season={ex.season} />
      </div>
      <div className="flex gap-1.5 flex-wrap mb-3">
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: "#DAD7CC" }}>{ex.category}</span>
        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full border" style={{ borderColor: "#DAD7CC" }}>{ex.type}</span>
      </div>
      <p className="text-sm text-gray-700 leading-relaxed mb-4">{ex.desc}</p>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Prescription</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: "#0E8388" }}>{ex.format}</div>
        </div>
        <div className="bg-white rounded-lg p-3 border" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Equipment</div>
          <div className="text-sm font-bold mt-0.5">{ex.equipment}</div>
        </div>
      </div>
      {onDelete && (
        <button onClick={onDelete} className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-semibold" style={{ color: "#C1483B", border: "1px solid #C1483B33" }}>
          <Trash2 size={14} /> Remove from library
        </button>
      )}
    </Modal>
  );
}

function AddExerciseModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    name: "", category: CATS[0], type: TYPES[0], season: "Both", equipment: "", format: "", desc: "",
  });
  const valid = form.name.trim() && form.format.trim();
  return (
    <Modal onClose={onClose}>
      <h3 className="text-lg font-black mb-3" style={{ color: "#12213A" }}>Add your own exercise</h3>
      <div className="space-y-3">
        <Field label="Name">
          <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Rebound Chase Drill" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
              {CATS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Type">
            <select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
              {TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Field>
        </div>
        <Field label="Season">
          <div className="flex gap-2">
            {SEASONS.map((s) => (
              <button key={s} type="button" onClick={() => setForm({ ...form, season: s })}
                className="flex-1 py-2 rounded-lg text-xs font-bold border"
                style={form.season === s ? { background: "#12213A", color: "#fff", borderColor: "#12213A" } : { borderColor: "#DAD7CC" }}>
                {s}
              </button>
            ))}
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Equipment">
            <input className="input" value={form.equipment} onChange={(e) => setForm({ ...form, equipment: e.target.value })} placeholder="e.g. Ball, cones" />
          </Field>
          <Field label="Sets / format">
            <input className="input" value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })} placeholder="e.g. 4 x 10" />
          </Field>
        </div>
        <Field label="Description">
          <textarea className="input" rows={3} value={form.desc} onChange={(e) => setForm({ ...form, desc: e.target.value })} placeholder="What it works on, and coaching cues." />
        </Field>
        <button
          disabled={!valid}
          onClick={() => onSave(form)}
          className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40"
          style={{ background: "#0E8388" }}
        >
          Save exercise
        </button>
      </div>
    </Modal>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">{label}</div>
      {children}
    </label>
  );
}

function Modal({ onClose, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-[#F3F2ED] rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[85vh] overflow-y-auto p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-end -mt-1 -mr-1 mb-1">
          <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: "#fff" }}>
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
      <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.875rem;outline:none;}`}</style>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Builder                                                            */
/* ---------------------------------------------------------------- */

function Builder({ exercises, season, onSave }) {
  const [step, setStep] = useState("setup");
  const [name, setName] = useState("");
  const [blockSeason, setBlockSeason] = useState(season);
  const [method, setMethod] = useState(null);
  const [goalId, setGoalId] = useState(null);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [draft, setDraft] = useState(null);

  function startGoalBlock() {
    const finalName = name.trim() || `${GOALS.find((g) => g.id === goalId).name} Block`;
    setDraft(generateGoalBlock(finalName, blockSeason, goalId, exercises));
    setStep("edit");
  }
  function startFreeformBlock() {
    const finalName = name.trim() || "New Training Block";
    setDraft(generateFreeformBlock(finalName, blockSeason, sessionsPerWeek));
    setStep("edit");
  }

  if (step === "edit" && draft) {
    return (
      <PlanEditor
        plan={draft}
        exercises={exercises}
        onBack={() => setStep("setup")}
        onSave={(p) => { onSave(p); setStep("setup"); setDraft(null); setName(""); setMethod(null); setGoalId(null); }}
      />
    );
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <h2 className="text-lg font-black mb-3" style={{ color: "#12213A" }}>Build a 6-week block</h2>

      <Field label="Block name">
        <input className="input" placeholder="e.g. Pre-season Reflex Block" value={name} onChange={(e) => setName(e.target.value)} />
      </Field>

      <div className="mt-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Season</div>
        <div className="flex gap-2">
          {["Winter", "Summer"].map((s) => (
            <button key={s} onClick={() => setBlockSeason(s)}
              className="flex-1 py-2.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5"
              style={blockSeason === s ? { background: s === "Winter" ? "#3B5BA5" : "#E2984B", color: "#fff", borderColor: "transparent" } : { borderColor: "#DAD7CC" }}>
              {s === "Winter" ? <Snowflake size={13} /> : <Waves size={13} />}
              {s === "Winter" ? "Winter · Court handball" : "Summer · Beach handball"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">How do you want to build it?</div>
        <button onClick={() => setMethod("goal")} className="w-full text-left bg-white rounded-lg border p-3 mb-2 flex items-center gap-3" style={{ borderColor: method === "goal" ? "#0E8388" : "#DAD7CC", borderWidth: method === "goal" ? 2 : 1 }}>
          <Target size={18} color="#0E8388" />
          <div>
            <div className="font-bold text-sm">Choose a goal, get a suggested structure</div>
            <div className="text-xs text-gray-500">Auto-built 6 weeks, progressive, fully editable after</div>
          </div>
        </button>
        <button onClick={() => setMethod("freeform")} className="w-full text-left bg-white rounded-lg border p-3 flex items-center gap-3" style={{ borderColor: method === "freeform" ? "#0E8388" : "#DAD7CC", borderWidth: method === "freeform" ? 2 : 1 }}>
          <Pencil size={18} color="#0E8388" />
          <div>
            <div className="font-bold text-sm">Build from scratch</div>
            <div className="text-xs text-gray-500">Pick every exercise yourself, week by week</div>
          </div>
        </button>
      </div>

      {method === "goal" && (
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Goal</div>
          <div className="space-y-2">
            {GOALS.map((g) => (
              <button key={g.id} onClick={() => setGoalId(g.id)} className="w-full text-left bg-white rounded-lg border p-3" style={{ borderColor: goalId === g.id ? "#0E8388" : "#DAD7CC", borderWidth: goalId === g.id ? 2 : 1 }}>
                <div className="font-bold text-sm">{g.name}</div>
                <div className="text-xs text-gray-500">{g.blurb}</div>
              </button>
            ))}
          </div>
          <button disabled={!goalId} onClick={startGoalBlock} className="w-full mt-4 py-3 rounded-lg text-sm font-bold text-white disabled:opacity-40" style={{ background: "#0E8388" }}>
            Generate 6-week block
          </button>
        </div>
      )}

      {method === "freeform" && (
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">Sessions per week</div>
          <div className="flex gap-2">
            {[2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setSessionsPerWeek(n)} className="flex-1 py-2 rounded-lg text-sm font-bold border" style={n === sessionsPerWeek ? { background: "#12213A", color: "#fff", borderColor: "#12213A" } : { borderColor: "#DAD7CC" }}>
                {n}
              </button>
            ))}
          </div>
          <button onClick={startFreeformBlock} className="w-full mt-4 py-3 rounded-lg text-sm font-bold text-white" style={{ background: "#0E8388" }}>
            Start building
          </button>
        </div>
      )}
    </div>
  );
}

/* Shared editor used both for a fresh draft and for editing a saved plan */
function PlanEditor({ plan, exercises, onBack, onSave }) {
  const [p, setP] = useState(plan);
  const [picker, setPicker] = useState(null); // {weekIdx, sessionIdx}
  const [openWeek, setOpenWeek] = useState(1);

  function updateSession(weekIdx, sessionIdx, updater) {
    setP((prev) => {
      const weeks = prev.weeks.map((w, wi) => {
        if (wi !== weekIdx) return w;
        const sessions = w.sessions.map((s, si) => (si === sessionIdx ? updater(s) : s));
        return { ...w, sessions };
      });
      return { ...prev, weeks };
    });
  }

  function addExerciseToSession(weekIdx, sessionIdx, ex) {
    updateSession(weekIdx, sessionIdx, (s) => ({
      ...s,
      exercises: [...s.exercises, { entryId: uid(), exerciseId: ex.id, prescription: ex.format }],
    }));
    setPicker(null);
  }

  function removeExerciseFromSession(weekIdx, sessionIdx, entryId) {
    updateSession(weekIdx, sessionIdx, (s) => ({ ...s, exercises: s.exercises.filter((e) => e.entryId !== entryId) }));
  }

  function setPrescription(weekIdx, sessionIdx, entryId, val) {
    updateSession(weekIdx, sessionIdx, (s) => ({
      ...s,
      exercises: s.exercises.map((e) => (e.entryId === entryId ? { ...e, prescription: val } : e)),
    }));
  }

  function setFocus(weekIdx, val) {
    setP((prev) => ({ ...prev, weeks: prev.weeks.map((w, wi) => (wi === weekIdx ? { ...w, focus: val } : w)) }));
  }

  return (
    <div className="px-4 pt-4 pb-6">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-3">
        <ArrowLeft size={14} /> Back
      </button>
      <input
        value={p.name}
        onChange={(e) => setP({ ...p, name: e.target.value })}
        className="text-lg font-black w-full bg-transparent outline-none mb-1"
        style={{ color: "#12213A" }}
      />
      <div className="mb-4"><SeasonBadge season={p.season} /> {p.goal && <span className="text-xs text-gray-500 ml-2">Goal: {p.goal}</span>}</div>

      <div className="space-y-2">
        {p.weeks.map((w, wi) => (
          <div key={w.weekId} className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DAD7CC" }}>
            <button onClick={() => setOpenWeek(openWeek === w.weekNumber ? null : w.weekNumber)} className="w-full flex items-center justify-between p-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black text-white" style={{ background: "#12213A" }}>{w.weekNumber}</div>
                <div className="text-left">
                  <div className="text-sm font-bold">Week {w.weekNumber}{w.focus ? ` · ${w.focus}` : ""}</div>
                  <div className="text-[11px] text-gray-500">{w.sessions.length} session{w.sessions.length !== 1 ? "s" : ""}</div>
                </div>
              </div>
              <ChevronDown size={16} className={openWeek === w.weekNumber ? "rotate-180 transition-transform" : "transition-transform"} />
            </button>
            {openWeek === w.weekNumber && (
              <div className="px-3 pb-3 space-y-2">
                <input
                  value={w.focus}
                  onChange={(e) => setFocus(wi, e.target.value)}
                  placeholder="Focus for this week (optional)"
                  className="input text-xs"
                />
                {w.sessions.map((s, si) => (
                  <div key={s.sessionId} className="rounded-lg p-2.5" style={{ background: "#F3F2ED" }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-bold">Session {s.sessionNumber}</span>
                      <button onClick={() => setPicker({ weekIdx: wi, sessionIdx: si })} className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: "#0E8388" }}>
                        <Plus size={12} /> Add exercise
                      </button>
                    </div>
                    {s.exercises.length === 0 && <div className="text-[11px] text-gray-400 py-1">No exercises yet</div>}
                    <div className="space-y-1">
                      {s.exercises.map((entry) => {
                        const ex = exercises.find((e) => e.id === entry.exerciseId);
                        if (!ex) return null;
                        return (
                          <div key={entry.entryId} className="flex items-center gap-2 bg-white rounded-md px-2 py-1.5 border" style={{ borderColor: "#DAD7CC" }}>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-semibold truncate">{ex.name}</div>
                              <input
                                value={entry.prescription}
                                onChange={(e) => setPrescription(wi, si, entry.entryId, e.target.value)}
                                className="text-[11px] text-gray-500 bg-transparent outline-none w-full"
                              />
                            </div>
                            <button onClick={() => removeExerciseFromSession(wi, si, entry.entryId)}>
                              <X size={13} color="#C1483B" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      <button onClick={() => onSave(p)} className="w-full mt-5 py-3 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1.5" style={{ background: "#12213A" }}>
        <Check size={16} /> Save block
      </button>

      {picker && (
        <ExercisePickerModal
          exercises={exercises}
          onClose={() => setPicker(null)}
          onPick={(ex) => addExerciseToSession(picker.weekIdx, picker.sessionIdx, ex)}
        />
      )}
    </div>
  );
}

function ExercisePickerModal({ exercises, onClose, onPick }) {
  const [q, setQ] = useState("");
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-black mb-3">Add an exercise</h3>
      <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border mb-3" style={{ borderColor: "#DAD7CC" }}>
        <Search size={15} color="#8A8779" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search…" className="flex-1 text-sm outline-none bg-transparent" />
      </div>
      <div className="space-y-1.5 max-h-[50vh] overflow-y-auto">
        {filtered.map((ex) => (
          <button key={ex.id} onClick={() => onPick(ex)} className="w-full text-left bg-white rounded-lg border p-2.5" style={{ borderColor: "#DAD7CC" }}>
            <div className="text-sm font-semibold">{ex.name}</div>
            <div className="text-[11px] text-gray-500">{ex.category} · {ex.format}</div>
          </button>
        ))}
        {filtered.length === 0 && <div className="text-sm text-gray-400 text-center py-6">No matches</div>}
      </div>
    </Modal>
  );
}

/* ---------------------------------------------------------------- */
/* Plans                                                              */
/* ---------------------------------------------------------------- */

function Plans({ plans, exercises, onSave, onDelete }) {
  const [openId, setOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [logTarget, setLogTarget] = useState(null); // { plan, weekId, sessionId }

  const editingPlan = plans.find((p) => p.id === editingId);
  if (editingPlan) {
    return (
      <PlanEditor
        plan={editingPlan}
        exercises={exercises}
        onBack={() => setEditingId(null)}
        onSave={(p) => { onSave(p); setEditingId(null); }}
      />
    );
  }

  if (plans.length === 0) {
    return (
      <div className="px-4 pt-16 text-center">
        <CalendarRange size={32} color="#DAD7CC" className="mx-auto mb-3" />
        <div className="text-sm font-bold" style={{ color: "#12213A" }}>No blocks yet</div>
        <div className="text-xs text-gray-500 mt-1">Head to Build to create your first 6-week block.</div>
      </div>
    );
  }

  return (
    <div className="px-4 pt-4 pb-6 space-y-3">
      {plans.map((p) => {
        const open = openId === p.id;
        const totalSessions = p.weeks.reduce((a, w) => a + w.sessions.length, 0);
        const doneSessions = p.weeks.reduce((a, w) => a + w.sessions.filter((s) => s.completed).length, 0);
        return (
          <div key={p.id} className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DAD7CC" }}>
            <button onClick={() => setOpenId(open ? null : p.id)} className="w-full p-3 text-left">
              <div className="flex items-center justify-between">
                <div className="font-bold text-sm" style={{ color: "#12213A" }}>{p.name}</div>
                <ChevronDown size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <SeasonBadge season={p.season} />
                {p.goal && <span className="text-[11px] text-gray-500">{p.goal}</span>}
              </div>
              <div className="text-[11px] text-gray-400 mt-1.5">{doneSessions}/{totalSessions} sessions completed</div>
            </button>
            {open && (
              <div className="px-3 pb-3">
                <div className="space-y-2 mb-3">
                  {p.weeks.map((w) => (
                    <div key={w.weekId} className="rounded-lg p-2.5" style={{ background: "#F3F2ED" }}>
                      <div className="text-xs font-bold mb-1.5">Week {w.weekNumber}{w.focus ? ` · ${w.focus}` : ""}</div>
                      {w.sessions.map((s) => (
                        <div key={s.sessionId} className="bg-white rounded-md p-2 mb-1.5 border" style={{ borderColor: "#DAD7CC" }}>
                          <button
                            onClick={() => {
                              if (s.completed) {
                                const next = {
                                  ...p,
                                  weeks: p.weeks.map((ww) => ww.weekId === w.weekId
                                    ? { ...ww, sessions: ww.sessions.map((ss) => ss.sessionId === s.sessionId ? { ...ss, completed: false } : ss) }
                                    : ww),
                                };
                                onSave(next);
                              } else {
                                setLogTarget({ plan: p, weekId: w.weekId, sessionId: s.sessionId });
                              }
                            }}
                            className="flex items-center gap-1.5 text-xs font-bold mb-1"
                          >
                            {s.completed ? <CheckCircle2 size={14} color="#0E8388" /> : <Circle size={14} color="#DAD7CC" />}
                            Session {s.sessionNumber}
                            {s.completed && s.rpe && (
                              <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ background: "#F3F2ED", color: "#8A8779" }}>
                                RPE {s.rpe}
                              </span>
                            )}
                          </button>
                          {s.completed && s.note && <div className="pl-5 text-[11px] text-gray-500 italic mb-1">"{s.note}"</div>}
                          <div className="pl-5 space-y-0.5">
                            {s.exercises.map((entry) => {
                              const ex = exercises.find((e) => e.id === entry.exerciseId);
                              if (!ex) return null;
                              return (
                                <div key={entry.entryId} className="text-[11px] text-gray-600">
                                  {ex.name} <span className="text-gray-400">— {entry.prescription}</span>
                                </div>
                              );
                            })}
                            {s.exercises.length === 0 && <div className="text-[11px] text-gray-300">Empty</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setEditingId(p.id)} className="flex-1 py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1" style={{ borderColor: "#DAD7CC" }}>
                    <Pencil size={12} /> Edit
                  </button>
                  <button onClick={() => setConfirmDelete(p.id)} className="flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1" style={{ color: "#C1483B", border: "1px solid #C1483B33" }}>
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(null)}>
          <h3 className="text-base font-black mb-2">Delete this block?</h3>
          <p className="text-sm text-gray-600 mb-4">This can't be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(null)} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Cancel</button>
            <button onClick={() => { onDelete(confirmDelete); setConfirmDelete(null); setOpenId(null); }} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "#C1483B" }}>Delete</button>
          </div>
        </Modal>
      )}

      {logTarget && (
        <LogSessionModal
          onClose={() => setLogTarget(null)}
          onSave={({ rpe, note }) => {
            const { plan, weekId, sessionId } = logTarget;
            const next = {
              ...plan,
              weeks: plan.weeks.map((ww) => ww.weekId === weekId
                ? { ...ww, sessions: ww.sessions.map((ss) => ss.sessionId === sessionId ? { ...ss, completed: true, rpe, note } : ss) }
                : ww),
            };
            onSave(next);
            setLogTarget(null);
          }}
        />
      )}
    </div>
  );
}

function LogSessionModal({ onClose, onSave }) {
  const [rpe, setRpe] = useState(null);
  const [note, setNote] = useState("");
  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-black mb-1" style={{ color: "#12213A" }}>Log this session</h3>
      <p className="text-xs text-gray-500 mb-3">Optional — but it's what Kip uses to adjust your next sessions.</p>
      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">RPE (effort, 1–10)</div>
      <div className="grid grid-cols-5 gap-1.5 mb-3">
        {Array.from({ length: 10 }).map((_, i) => {
          const n = i + 1;
          return (
            <button key={n} onClick={() => setRpe(n)} className="py-2 rounded-lg text-xs font-bold border" style={rpe === n ? { background: "#12213A", color: "#fff", borderColor: "#12213A" } : { borderColor: "#DAD7CC" }}>
              {n}
            </button>
          );
        })}
      </div>
      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Notes</div>
      <textarea className="input mb-4" rows={3} placeholder="How did it feel? Anything sore, anything clicked?" value={note} onChange={(e) => setNote(e.target.value)} />
      <div className="flex gap-2">
        <button onClick={() => onSave({ rpe: null, note: "" })} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Skip</button>
        <button onClick={() => onSave({ rpe, note })} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1.5" style={{ background: "#0E8388" }}>
          <Check size={14} /> Mark complete
        </button>
      </div>
      <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.875rem;outline:none;}`}</style>
    </Modal>
  );
}

/* ---------------------------------------------------------------- */
/* Kip                                                                */
/* ---------------------------------------------------------------- */

function KipTab({ profile, onSaveProfile, messages, onSaveMessages, plans, season, matches }) {
  const [editing, setEditing] = useState(!profile.onboarded);

  if (editing) {
    return (
      <KipOnboarding
        profile={profile}
        onSave={(p) => { onSaveProfile(p); setEditing(false); }}
        onCancel={profile.onboarded ? () => setEditing(false) : null}
      />
    );
  }

  return (
    <KipChat
      profile={profile}
      messages={messages}
      onSaveMessages={onSaveMessages}
      plans={plans}
      season={season}
      matches={matches}
      onEditProfile={() => setEditing(true)}
    />
  );
}

function KipOnboarding({ profile, onSave, onCancel }) {
  const [form, setForm] = useState({
    level: profile.level || "",
    discipline: profile.discipline || "",
    seasonPhase: profile.seasonPhase || "",
    nextCompetition: profile.nextCompetition || "",
    sessionsPerWeek: profile.sessionsPerWeek || 3,
    minutesPerSession: profile.minutesPerSession || 60,
    access: { court: false, sand: false, gym: false, ballWall: false, noEquipment: false, ...(profile.access || {}) },
    weaknesses: profile.weaknesses || [],
    niggles: profile.niggles || [],
    heightCm: profile.heightCm || "",
    wingspanCm: profile.wingspanCm || "",
    yearsInGoal: profile.yearsInGoal || "",
  });

  function toggleAccess(key) {
    setForm({ ...form, access: { ...form.access, [key]: !form.access[key] } });
  }
  function toggleWeakness(w) {
    setForm({ ...form, weaknesses: form.weaknesses.includes(w) ? form.weaknesses.filter((x) => x !== w) : [...form.weaknesses, w] });
  }
  function addNiggle() {
    setForm({ ...form, niggles: [...form.niggles, { id: uid(), part: "", severity: "Mild", clearedByPhysio: false }] });
  }
  function updateNiggle(id, patch) {
    setForm({ ...form, niggles: form.niggles.map((n) => (n.id === id ? { ...n, ...patch } : n)) });
  }
  function removeNiggle(id) {
    setForm({ ...form, niggles: form.niggles.filter((n) => n.id !== id) });
  }

  const valid = form.level && form.discipline;

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={18} color="#0E8388" />
        <h2 className="text-lg font-black" style={{ color: "#12213A" }}>Meet Kip</h2>
      </div>
      <p className="text-xs text-gray-500 mb-4">
        A few questions so Kip's advice is actually about you, not generic. Takes a minute.
      </p>

      <Field label="Level">
        <div className="flex gap-1.5 flex-wrap">
          {LEVELS.map((l) => (
            <Chip key={l} active={form.level === l} onClick={() => setForm({ ...form, level: l })} accent="#12213A">{l}</Chip>
          ))}
        </div>
      </Field>

      <div className="mt-3">
        <Field label="Discipline">
          <div className="flex gap-2">
            {DISCIPLINES.map((d) => (
              <button key={d} onClick={() => setForm({ ...form, discipline: d })} className="flex-1 py-2 rounded-lg text-xs font-bold border" style={form.discipline === d ? { background: "#0E8388", color: "#fff", borderColor: "#0E8388" } : { borderColor: "#DAD7CC" }}>
                {d}
              </button>
            ))}
          </div>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3 mt-3">
        <Field label="Season phase">
          <input className="input" placeholder="e.g. Pre-season" value={form.seasonPhase} onChange={(e) => setForm({ ...form, seasonPhase: e.target.value })} />
        </Field>
        <Field label="Next competition">
          <input className="input" placeholder="e.g. Sept 12" value={form.nextCompetition} onChange={(e) => setForm({ ...form, nextCompetition: e.target.value })} />
        </Field>
      </div>

      <div className="mt-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Sessions per week</div>
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button key={n} onClick={() => setForm({ ...form, sessionsPerWeek: n })} className="flex-1 py-2 rounded-lg text-xs font-bold border" style={n === form.sessionsPerWeek ? { background: "#12213A", color: "#fff", borderColor: "#12213A" } : { borderColor: "#DAD7CC" }}>
              {n}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <Field label="Minutes per session">
          <input type="number" className="input" value={form.minutesPerSession} onChange={(e) => setForm({ ...form, minutesPerSession: e.target.value })} />
        </Field>
      </div>

      <div className="mt-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">What do you have access to?</div>
        <div className="flex gap-1.5 flex-wrap">
          {[["court", "Court"], ["sand", "Sand"], ["gym", "Gym"], ["ballWall", "Ball + wall only"], ["noEquipment", "No equipment"]].map(([key, label]) => (
            <Chip key={key} active={form.access[key]} onClick={() => toggleAccess(key)}>{label}</Chip>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Where do you want to improve?</div>
        <div className="flex gap-1.5 flex-wrap">
          {WEAKNESS_OPTIONS.map((w) => (
            <Chip key={w} active={form.weaknesses.includes(w)} onClick={() => toggleWeakness(w)} accent="#3B5BA5">{w}</Chip>
          ))}
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between mb-1">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Current niggles</div>
          <button onClick={addNiggle} className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: "#0E8388" }}>
            <Plus size={12} /> Add
          </button>
        </div>
        {form.niggles.length === 0 && <div className="text-[11px] text-gray-400">None reported — good place to be.</div>}
        <div className="space-y-2">
          {form.niggles.map((n) => (
            <div key={n.id} className="bg-white rounded-lg border p-2.5" style={{ borderColor: "#DAD7CC" }}>
              <div className="flex items-center gap-2 mb-1.5">
                <input className="input flex-1" placeholder="Body part" value={n.part} onChange={(e) => updateNiggle(n.id, { part: e.target.value })} />
                <button onClick={() => removeNiggle(n.id)}><X size={14} color="#C1483B" /></button>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex gap-1">
                  {SEVERITIES.map((s) => (
                    <button key={s} onClick={() => updateNiggle(n.id, { severity: s })} className="px-2 py-1 rounded text-[10px] font-bold border" style={n.severity === s ? { background: "#12213A", color: "#fff", borderColor: "#12213A" } : { borderColor: "#DAD7CC" }}>
                      {s}
                    </button>
                  ))}
                </div>
                <label className="flex items-center gap-1 text-[10px] font-semibold text-gray-500">
                  <input type="checkbox" checked={n.clearedByPhysio} onChange={(e) => updateNiggle(n.id, { clearedByPhysio: e.target.checked })} />
                  Cleared by physio
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mt-3">
        <Field label="Height (cm)"><input className="input" value={form.heightCm} onChange={(e) => setForm({ ...form, heightCm: e.target.value })} /></Field>
        <Field label="Wingspan (cm)"><input className="input" value={form.wingspanCm} onChange={(e) => setForm({ ...form, wingspanCm: e.target.value })} /></Field>
        <Field label="Years in goal"><input className="input" value={form.yearsInGoal} onChange={(e) => setForm({ ...form, yearsInGoal: e.target.value })} /></Field>
      </div>

      <div className="flex gap-2 mt-5">
        {onCancel && (
          <button onClick={onCancel} className="flex-1 py-3 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Cancel</button>
        )}
        <button disabled={!valid} onClick={() => onSave({ ...form, onboarded: true })} className="flex-1 py-3 rounded-lg text-sm font-bold text-white disabled:opacity-40" style={{ background: "#0E8388" }}>
          {onCancel ? "Save changes" : "Start chatting with Kip"}
        </button>
      </div>
      <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.875rem;outline:none;}`}</style>
    </div>
  );
}

function KipChat({ profile, messages, onSaveMessages, plans, season, matches, onEditProfile }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = React.useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;
    const userMsg = { role: "user", content: trimmed, ts: Date.now() };
    const nextMessages = [...messages, userMsg];
    onSaveMessages(nextMessages);
    setInput("");
    setSending(true);
    setError(null);
    try {
      const systemPrompt = buildKipSystemPrompt(profile, plans, season, matches);
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: systemPrompt,
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const data = await response.json();
      const textResp = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      const assistantMsg = { role: "assistant", content: textResp || "Sorry, I didn't quite get a response there — try again?", ts: Date.now() };
      onSaveMessages([...nextMessages, assistantMsg]);
    } catch (e) {
      setError("Kip couldn't respond just now — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 190px)" }}>
      <div className="px-4 pt-3 pb-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-1.5">
          <Sparkles size={15} color="#0E8388" />
          <span className="text-sm font-black" style={{ color: "#12213A" }}>Kip</span>
          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "#F3F2ED", color: "#8A8779" }}>Beta</span>
        </div>
        <button onClick={onEditProfile} className="text-[11px] font-semibold" style={{ color: "#0E8388" }}>Edit profile</button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-2.5">
        {messages.length === 0 && (
          <div className="text-xs text-gray-400 py-2">
            Say hi, or tap a suggestion below — Kip already knows your level, availability and current program.
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug whitespace-pre-wrap"
              style={
                m.role === "user"
                  ? { background: "#12213A", color: "#fff", borderBottomRightRadius: 4 }
                  : { background: "#fff", color: "#12213A", border: "1px solid #DAD7CC", borderBottomLeftRadius: 4 }
              }
            >
              {m.content}
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-start">
            <div className="rounded-2xl px-3 py-2 text-sm bg-white border" style={{ borderColor: "#DAD7CC", color: "#8A8779" }}>
              Kip is thinking…
            </div>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-1.5 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {error}
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 pt-2 pb-3 border-t bg-white" style={{ borderColor: "#DAD7CC" }}>
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4">
          {KIP_PROMPTS.map((p) => (
            <button key={p} onClick={() => sendMessage(p)} disabled={sending} className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap disabled:opacity-40" style={{ borderColor: "#DAD7CC", color: "#12213A" }}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            className="flex-1 bg-white border rounded-full px-3.5 py-2 text-sm outline-none"
            style={{ borderColor: "#DAD7CC" }}
            placeholder="Ask Kip anything…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") sendMessage(input); }}
            disabled={sending}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={sending || !input.trim()}
            className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0 disabled:opacity-40"
            style={{ background: "#0E8388" }}
          >
            <Send size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function AdviceHub() {
  const [openId, setOpenId] = useState(ADVICE_TOPICS[0].id);
  return (
    <div className="px-4 pt-4 pb-6">
      <h2 className="text-lg font-black mb-1" style={{ color: "#12213A" }}>Coach's notes</h2>
      <p className="text-xs text-gray-500 mb-4">
        Short, practical principles behind the exercises — the "why" to go with the "what".
      </p>
      <div className="space-y-2">
        {ADVICE_TOPICS.map((t) => {
          const open = openId === t.id;
          const Icon = ADVICE_ICONS[t.icon] || Lightbulb;
          return (
            <div key={t.id} className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DAD7CC" }}>
              <button onClick={() => setOpenId(open ? null : t.id)} className="w-full flex items-center gap-3 p-3 text-left">
                <div className="w-9 h-9 rounded-md flex items-center justify-center shrink-0" style={{ background: "#F3F2ED" }}>
                  <Icon size={16} color="#0E8388" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold" style={{ color: "#12213A" }}>{t.title}</div>
                  <div className="text-[11px] text-gray-500">{t.summary}</div>
                </div>
                <ChevronDown size={16} className={open ? "rotate-180 transition-transform shrink-0" : "transition-transform shrink-0"} />
              </button>
              {open && (
                <ul className="px-3 pb-3 space-y-2">
                  {t.tips.map((tip, i) => (
                    <li key={i} className="flex gap-2 text-sm text-gray-700 leading-snug">
                      <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "#0E8388" }} />
                      {tip}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Stats                                                              */
/* ---------------------------------------------------------------- */

function GoalGrid({ zones, onZoneTap, size = "normal" }) {
  const cellClass = size === "small" ? "aspect-square" : "aspect-square";
  return (
    <div className="rounded-lg overflow-hidden border-2" style={{ borderColor: "#12213A", background: "#12213A" }}>
      <div className="grid grid-cols-3 gap-[2px]">
        {ZONE_GRID.flat().map((key) => {
          const z = zones[key] || { saves: 0, goals: 0 };
          const total = z.saves + z.goals;
          const pct = total > 0 ? Math.round((z.saves / total) * 100) : null;
          return (
            <button
              key={key}
              onClick={() => onZoneTap && onZoneTap(key)}
              className={`${cellClass} flex flex-col items-center justify-center relative`}
              style={{ background: zoneColor(z) }}
              disabled={!onZoneTap}
            >
              {total > 0 ? (
                <>
                  <span className="text-white font-black text-sm">{pct}%</span>
                  <span className="text-white/70 text-[9px] font-semibold">{total} shot{total !== 1 ? "s" : ""}</span>
                </>
              ) : (
                onZoneTap && <Plus size={14} color="#B8B5A8" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ShotLogModal({ season, zone, onClose, onSave }) {
  const [outcome, setOutcome] = useState(null);
  const types = shotTypesFor(season);

  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-black mb-1" style={{ color: "#12213A" }}>{ZONE_LABELS[zone]}</h3>
      {!outcome && (
        <>
          <p className="text-xs text-gray-500 mb-3">What happened on this shot?</p>
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => setOutcome("Save")} className="py-4 rounded-lg text-sm font-bold text-white" style={{ background: "#0E8388" }}>Save</button>
            <button onClick={() => setOutcome("Goal")} className="py-4 rounded-lg text-sm font-bold text-white" style={{ background: "#C1483B" }}>Goal</button>
          </div>
        </>
      )}
      {outcome && (
        <>
          <p className="text-xs text-gray-500 mb-3">
            {outcome} — {season === "Summer" ? "what type of shot?" : "shot origin (optional)"}
          </p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => onSave({ zone, outcome, shotType: t })}
                className="px-3 py-2 rounded-lg text-xs font-bold border"
                style={{ borderColor: "#DAD7CC" }}
              >
                {t}
                {season === "Summer" && (
                  <span className="ml-1 text-[10px] font-black" style={{ color: pointsForShot(season, t) === 2 ? "#C1483B" : "#8A8779" }}>
                    {outcome === "Goal" ? `+${pointsForShot(season, t)}` : ""}
                  </span>
                )}
              </button>
            ))}
          </div>
          {season !== "Summer" && (
            <button onClick={() => onSave({ zone, outcome, shotType: null })} className="w-full py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>
              Log without a type
            </button>
          )}
        </>
      )}
    </Modal>
  );
}

function MatchFormModal({ season, onClose, onSave }) {
  const [form, setForm] = useState({ date: new Date().toISOString().slice(0, 10), opponent: "", competition: "", result: "", season });
  const valid = form.date && form.opponent.trim();
  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-black mb-3" style={{ color: "#12213A" }}>New match</h3>
      <div className="space-y-3">
        <Field label="Date">
          <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Opponent">
          <input className="input" placeholder="e.g. North Shore" value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Competition">
            <input className="input" placeholder="Optional" value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })} />
          </Field>
          <Field label="Result">
            <input className="input" placeholder="e.g. 24-19 W" value={form.result} onChange={(e) => setForm({ ...form, result: e.target.value })} />
          </Field>
        </div>
        <Field label="Discipline">
          <div className="flex gap-2">
            {["Winter", "Summer"].map((s) => (
              <button key={s} onClick={() => setForm({ ...form, season: s })} className="flex-1 py-2 rounded-lg text-xs font-bold border flex items-center justify-center gap-1.5" style={form.season === s ? { background: s === "Winter" ? "#3B5BA5" : "#E2984B", color: "#fff", borderColor: "transparent" } : { borderColor: "#DAD7CC" }}>
                {s === "Winter" ? <Snowflake size={13} /> : <Waves size={13} />}
                {s === "Winter" ? "Indoor" : "Beach"}
              </button>
            ))}
          </div>
        </Field>
        <button disabled={!valid} onClick={() => onSave({ id: uid(), ...form, shots: [] })} className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40" style={{ background: "#0E8388" }}>
          Create match
        </button>
      </div>
    </Modal>
  );
}

function MatchDetail({ match, onBack, onSave, onDelete }) {
  const [zoneTap, setZoneTap] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const zones = emptyZoneMap();
  (match.shots || []).forEach((s) => {
    if (!zones[s.zone]) return;
    if (s.outcome === "Save") zones[s.zone].saves++;
    else { zones[s.zone].goals++; zones[s.zone].points += pointsForShot(match.season, s.shotType); }
  });
  const totalShots = (match.shots || []).length;
  const totalSaves = (match.shots || []).filter((s) => s.outcome === "Save").length;
  const totalGoals = totalShots - totalSaves;
  const totalPoints = (match.shots || []).reduce((a, s) => a + (s.outcome === "Goal" ? pointsForShot(match.season, s.shotType) : 0), 0);
  const savePct = totalShots > 0 ? Math.round((totalSaves / totalShots) * 100) : 0;

  function logShot({ zone, outcome, shotType }) {
    const shot = { id: uid(), zone, outcome, shotType: shotType || null };
    onSave({ ...match, shots: [...(match.shots || []), shot] });
    setZoneTap(null);
  }
  function removeShot(id) {
    onSave({ ...match, shots: (match.shots || []).filter((s) => s.id !== id) });
  }

  return (
    <div className="px-4 pt-4 pb-8">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-3">
        <ArrowLeft size={14} /> Back
      </button>
      <div className="flex items-start justify-between mb-1">
        <div>
          <div className="text-lg font-black" style={{ color: "#12213A" }}>vs {match.opponent}</div>
          <div className="text-xs text-gray-500">{match.date}{match.competition ? ` · ${match.competition}` : ""}{match.result ? ` · ${match.result}` : ""}</div>
        </div>
        <SeasonBadge season={match.season} />
      </div>

      <div className="grid grid-cols-3 gap-2 my-4">
        <div className="bg-white rounded-lg p-2.5 border text-center" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-lg font-black" style={{ color: "#0E8388" }}>{savePct}%</div>
          <div className="text-[10px] text-gray-500 font-semibold uppercase">Save rate</div>
        </div>
        <div className="bg-white rounded-lg p-2.5 border text-center" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-lg font-black" style={{ color: "#12213A" }}>{totalSaves}/{totalShots}</div>
          <div className="text-[10px] text-gray-500 font-semibold uppercase">Saves</div>
        </div>
        <div className="bg-white rounded-lg p-2.5 border text-center" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-lg font-black" style={{ color: "#C1483B" }}>{match.season === "Summer" ? totalPoints : totalGoals}</div>
          <div className="text-[10px] text-gray-500 font-semibold uppercase">{match.season === "Summer" ? "Points against" : "Goals against"}</div>
        </div>
      </div>

      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Tap a zone to log a shot</div>
      <GoalGrid zones={zones} onZoneTap={(z) => setZoneTap(z)} />

      {totalShots > 0 && (
        <div className="mt-4">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Logged shots</div>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {[...(match.shots || [])].reverse().map((s) => (
              <div key={s.id} className="flex items-center justify-between bg-white rounded-md border px-2.5 py-1.5" style={{ borderColor: "#DAD7CC" }}>
                <div className="flex items-center gap-2 text-xs">
                  <span className="font-bold" style={{ color: s.outcome === "Save" ? "#0E8388" : "#C1483B" }}>{s.outcome}</span>
                  <span className="text-gray-500">{ZONE_LABELS[s.zone]}</span>
                  {s.shotType && <span className="text-gray-400">· {s.shotType}</span>}
                  {s.outcome === "Goal" && match.season === "Summer" && (
                    <span className="text-[10px] font-black" style={{ color: "#8A8779" }}>+{pointsForShot(match.season, s.shotType)}</span>
                  )}
                </div>
                <button onClick={() => removeShot(s.id)}><X size={13} color="#C1483B" /></button>
              </div>
            ))}
          </div>
        </div>
      )}

      <button onClick={() => setConfirmDelete(true)} className="w-full mt-6 py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1" style={{ color: "#C1483B", border: "1px solid #C1483B33" }}>
        <Trash2 size={12} /> Delete match
      </button>

      {zoneTap && <ShotLogModal season={match.season} zone={zoneTap} onClose={() => setZoneTap(null)} onSave={logShot} />}

      {confirmDelete && (
        <Modal onClose={() => setConfirmDelete(false)}>
          <h3 className="text-base font-black mb-2">Delete this match?</h3>
          <p className="text-sm text-gray-600 mb-4">All logged shots for it go with it. This can't be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDelete(false)} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Cancel</button>
            <button onClick={() => { onDelete(match.id); onBack(); }} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "#C1483B" }}>Delete</button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function StatsTab({ matches, season, onSave, onDelete }) {
  const [openMatchId, setOpenMatchId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState(season);

  const openMatch = matches.find((m) => m.id === openMatchId);
  if (openMatch) {
    return <MatchDetail match={openMatch} onBack={() => setOpenMatchId(null)} onSave={onSave} onDelete={onDelete} />;
  }

  const agg = aggregateMatchStats(matches, filter);
  const shotTypeAgg = filter !== "Winter" ? aggregateShotTypeStats(matches.filter((m) => filter === "All" || m.season === filter)) : {};
  const hasData = agg.totalSaves + agg.totalGoals > 0;
  const overallSavePct = hasData ? Math.round((agg.totalSaves / (agg.totalSaves + agg.totalGoals)) * 100) : 0;
  const zoneEntries = Object.entries(agg.zones).filter(([, z]) => z.saves + z.goals > 0);
  const best = zoneEntries.length ? [...zoneEntries].sort((a, b) => (b[1].saves / (b[1].saves + b[1].goals)) - (a[1].saves / (a[1].saves + a[1].goals)))[0] : null;
  const worst = zoneEntries.length ? [...zoneEntries].sort((a, b) => (a[1].saves / (a[1].saves + a[1].goals)) - (b[1].saves / (b[1].saves + b[1].goals)))[0] : null;

  const sortedMatches = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-black" style={{ color: "#12213A" }}>Match stats</h2>
        <button onClick={() => setShowForm(true)} className="p-2 rounded-lg text-white" style={{ background: "#12213A" }}>
          <Plus size={16} />
        </button>
      </div>

      <div className="flex gap-1.5 mb-4">
        {["All", "Winter", "Summer"].map((s) => (
          <Chip key={s} active={filter === s} onClick={() => setFilter(s)} accent={s === "Summer" ? "#E2984B" : s === "Winter" ? "#3B5BA5" : "#12213A"}>
            {s === "Winter" ? "Indoor" : s === "Summer" ? "Beach" : "All"}
          </Chip>
        ))}
      </div>

      {!hasData ? (
        <div className="text-center py-10">
          <Target size={28} color="#DAD7CC" className="mx-auto mb-2" />
          <div className="text-sm font-bold" style={{ color: "#12213A" }}>No shots logged yet</div>
          <div className="text-xs text-gray-500 mt-1">Add a match and start tapping the goal grid during or after a game.</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-2 mb-4">
            <div className="bg-white rounded-lg p-2.5 border text-center" style={{ borderColor: "#DAD7CC" }}>
              <div className="text-lg font-black" style={{ color: "#0E8388" }}>{overallSavePct}%</div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase">Save rate</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 border text-center" style={{ borderColor: "#DAD7CC" }}>
              <div className="text-lg font-black" style={{ color: "#12213A" }}>{agg.totalSaves + agg.totalGoals}</div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase">Shots faced</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 border text-center" style={{ borderColor: "#DAD7CC" }}>
              <div className="text-lg font-black" style={{ color: "#C1483B" }}>{filter === "Summer" ? agg.totalPoints : agg.totalGoals}</div>
              <div className="text-[10px] text-gray-500 font-semibold uppercase">{filter === "Summer" ? "Points against" : "Goals against"}</div>
            </div>
          </div>

          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Save % by zone</div>
          <GoalGrid zones={agg.zones} />
          {best && worst && (
            <div className="flex justify-between text-[11px] text-gray-500 mt-1.5 mb-4">
              <span>Strongest: <b style={{ color: "#0E8388" }}>{ZONE_LABELS[best[0]]}</b></span>
              <span>Weakest: <b style={{ color: "#C1483B" }}>{ZONE_LABELS[worst[0]]}</b></span>
            </div>
          )}

          {filter !== "Winter" && Object.keys(shotTypeAgg).length > 0 && (
            <div className="mb-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Beach shot types faced</div>
              <div className="space-y-1.5">
                {Object.entries(shotTypeAgg).map(([type, v]) => {
                  const total = v.saves + v.goals;
                  const pct = total > 0 ? Math.round((v.saves / total) * 100) : 0;
                  return (
                    <div key={type} className="bg-white rounded-lg border px-3 py-2 flex items-center justify-between" style={{ borderColor: "#DAD7CC" }}>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        {type}
                        {BEACH_TWO_POINT_TYPES.includes(type) && <span className="text-[9px] font-black px-1 py-0.5 rounded" style={{ background: "#F3F2ED", color: "#C1483B" }}>2 PT</span>}
                      </div>
                      <div className="text-xs text-gray-500">{pct}% saved ({total})</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">Beach: regular goals are 1 point; spin/360, in-flight, specialist/GK and 6m penalty goals are 2 points.</p>
            </div>
          )}

          {agg.trend.length > 1 && (
            <div className="mb-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1">
                <TrendingUp size={12} /> Save % over time
              </div>
              <div className="bg-white rounded-lg border p-2" style={{ borderColor: "#DAD7CC" }}>
                <ResponsiveContainer width="100%" height={140}>
                  <LineChart data={agg.trend}>
                    <XAxis dataKey="opponent" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={40} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 9 }} width={28} />
                    <Tooltip formatter={(v) => `${v}%`} />
                    <Line type="monotone" dataKey="savePct" stroke="#0E8388" strokeWidth={2} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}

      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5 mt-2">Matches</div>
      {sortedMatches.length === 0 && <div className="text-xs text-gray-400 py-3">No matches added yet.</div>}
      <div className="space-y-2">
        {sortedMatches.map((m) => {
          const shots = m.shots || [];
          const saves = shots.filter((s) => s.outcome === "Save").length;
          return (
            <button key={m.id} onClick={() => setOpenMatchId(m.id)} className="w-full text-left bg-white rounded-lg border p-3 flex items-center justify-between" style={{ borderColor: "#DAD7CC" }}>
              <div>
                <div className="text-sm font-bold" style={{ color: "#12213A" }}>vs {m.opponent}</div>
                <div className="text-[11px] text-gray-500">{m.date}{m.result ? ` · ${m.result}` : ""} · {shots.length ? `${saves}/${shots.length} saved` : "No shots logged"}</div>
              </div>
              <div className="flex items-center gap-2">
                <SeasonBadge season={m.season} />
                <ChevronRight size={16} color="#DAD7CC" />
              </div>
            </button>
          );
        })}
      </div>

      {showForm && (
        <MatchFormModal
          season={season}
          onClose={() => setShowForm(false)}
          onSave={(m) => { onSave(m); setShowForm(false); setOpenMatchId(m.id); }}
        />
      )}
    </div>
  );
}
