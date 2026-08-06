import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Plus, X, ChevronDown, ChevronRight, ChevronLeft, Dumbbell,
  Waves, Snowflake, Trash2, Check, Pencil, CalendarRange, Target,
  Users, User, ListChecks, BookOpen, ArrowLeft, Circle, CheckCircle2,
  Lightbulb, Eye, ShieldCheck, Zap, Brain, Compass, MessageCircle,
  Send, Sparkles, AlertTriangle, BarChart3, TrendingUp, LogOut, Flame, RotateCcw, Video,
  ClipboardList, Paperclip, Upload, Trophy, Bell, BellOff, Lock,
  UserPlus, Link2, Mail, HelpCircle,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { loadUserData, saveUserData, uploadNiggleFile, uploadGeneralFile, getSignedNiggleFileUrl, deleteNiggleFile } from "./lib/storage.js";
import {
  getMyInviteCode, regenerateMyInviteCode, redeemInviteCode, acceptConnection, declineConnection,
  revokeConnection, setRecordingPermission, getMyConnections, summarizeConnections, partnerOf, myOutgoingGrant,
  createOrResumeTeammateMatch, patchTeammateMatch, deleteTeammateMatch,
} from "./lib/connections.js";
import { supabase } from "./lib/supabaseClient.js";
import { HELP_CATEGORIES, searchHelpArticles, articlesByCategory, findHelpArticle } from "./lib/helpContent.js";
import { useAuth } from "./auth/AuthProvider.jsx";
import { AngleNarrowingDiagram, ShadowOfBlockDiagram, WingShotGeometryDiagram, StraightShotCornerDiagram } from "./diagrams.jsx";
import {
  CATS, GOALS, PHASES, ZONE_GRID, ZONE_LABELS, INDOOR_SHOT_TYPES, BEACH_SHOT_TYPES, BEACH_TWO_POINT_TYPES,
  shotTypesFor, pointsForShot, emptyZoneMap, aggregateMatchStats, aggregateShotTypeStats, POSITIONS, aggregatePositionStats, normalizeOpponentName,
  opponentRecord, findOpponentRoster, upsertOpponentRoster, shooterStats, mostDangerousShooter, parseTimestampToSeconds,
  videoLinkForShot, zoneColor, buildKipSystemPrompt, uid, phaseFor, poolFor, NIGGLE_AREA_KEYWORDS, matchNiggleAreas,
  excludedExerciseIdsForNiggles, NEAR_POST_ZONES, LOW_ZONES, EXERCISE_ZONE_MAP, EXERCISE_SHOTTYPE_MAP,
  MATCH_DATA_MIN_MATCHES, MATCH_DATA_MIN_SHOTS, TRAINING_LOG_MIN_SESSIONS, TRAINING_LOG_WINDOW_DAYS,
  weakestZoneSignal, weakestShotTypeSignal, categoryTrainingSignal, isPlateaued, exerciseGenWeight, makeWeightedPicker,
  generateGoalBlock, generateFreeformBlock, generateRehabBlock, completedSessionsWithMeta, rpeTrend, weekStartKey,
  formatShortDate, startRecording, pauseRecording, resumeRecording, recordingElapsedMs, formatElapsed,
  recordingElapsedMinutes, findActiveRecording, dateKey, monthMatrix, weeklyStreak, nextSuggestedSession,
  parseRepsFromFormat, makeReps, repsDisplay, epley1RM, parseExerciseDesc, exerciseLogHistory, SESSION_POINTS,
  MATCH_POINTS, PR_POINTS, loggedGymExerciseIds, totalPrCount, computeTotalPoints, BADGES, computeEarnedBadgeIds,
  TREND_MIN_MATCHES, TREND_MIN_SHOTS_PER_HALF, TREND_SWING_POINTS, splitMatchHalves, zoneTallies, zoneTrendSignals,
  shotTypeTallies, shotTypeTrendSignals, missedSessionsSignals, rpeHighSignal, streakAtRiskSignal, NIGGLE_QUIET_DAYS,
  niggleQuietSignals, newPrSignals, completedBlockSignals, computeKipAlerts, describeAlertItem,
  EMAIL_ALERT_CATEGORIES, categoryForAlertType, DEFAULT_EXERCISES,
  computeReportData, computeCoachReportData, COACH_SHARE_CATEGORIES,
} from "./lib/kipDomain.js";

/* ---------------------------------------------------------------- */
/* Design tokens                                                     */
/* INK     #12213A  – deep navy, primary text / dark surfaces        */
/* PAPER   #F3F2ED  – background                                     */
/* TEAL    #0E8388  – primary accent (the goal-line / arc)           */
/* WINTER  #3B5BA5  – indoor court accent                            */
/* SUMMER  #E2984B  – beach / sand accent                            */
/* LINE    #DAD7CC  – hairline borders                               */
/* ---------------------------------------------------------------- */


const TYPES = ["Solo", "Partner", "Team", "Gym"];
const SEASONS = ["Winter", "Summer", "Both"];



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
    diagrams: [
      { key: "angleNarrowing", caption: "Angle narrowing: stand where the bisector between the shooter and both posts meets your position, not on the centre line." },
      { key: "shadowOfBlock", caption: "Don't stand in a defender's shadow — it blocks your sightline and your coverage just as much as it blocks the shooter's. Step clear of the line between the shooter and the block." },
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
    diagrams: [
      { key: "wingShotGeometry", caption: "A wing shot at a small angle to the post needs you tight to it — there's barely any goal to cover on that side. A wider angle gives you room to step out." },
      { key: "straightShotCorner", caption: "On a straight shot with a defender in the way, the ball goes to whichever corner its path passes on the way past the block — read the gap, not just the shooter." },
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
    id: "processgoals",
    title: "Process Goals vs. Outcome Goals",
    icon: "Target",
    summary: "What you did right beats what the scoreboard says, most nights.",
    tips: [
      "An outcome goal ('concede under 10') tells you nothing about what to actually do differently in the moment. A process goal ('set my feet before every dive') does — it's something you can control and check against, save by save.",
      "Pick one process goal per session or match, not five. One thing you can hold in your head under pressure beats a checklist you'll forget by the second attack.",
      "You can nail every process goal and still lose on shot luck, or skip all of them and win anyway. Judge the goal on whether you did it, not on the scoreline.",
      "Write the goal down before you start. Reviewing it against what actually happened afterwards, honestly, is where the improvement lives — not in having set it.",
    ],
  },
  {
    id: "fearfailure",
    title: "Fear of Failure & Self-Doubt",
    icon: "Brain",
    summary: "The keeper position makes every mistake visible. That's not a character flaw to fix.",
    tips: [
      "Every goal you concede is watched by everyone on the court, in a way an outfield mistake usually isn't. That visibility is structural to the position, not a sign you're not cut out for it.",
      "Fear of failure often shows up as hesitation — a step you don't commit to, a dive half-started. Naming it as fear, specifically, is more useful than just telling yourself to 'be more confident.'",
      "Self-doubt after a bad run tends to generalise ('I'm bad at this') when the honest version is usually specific ('I'm reading low shots late this week'). Specific is fixable. General isn't.",
      "Confidence built from avoiding risk holds up badly under pressure. Confidence built from committing and reviewing what happened, good or bad, holds up better.",
    ],
  },
  {
    id: "weakeropposition",
    title: "Staying Sharp Against Weaker Opposition",
    icon: "Flame",
    summary: "Complacency costs goals just as often as nerves do — it's just quieter about it.",
    tips: [
      "Concentration drops when the shots feel routine. That's exactly when a soft, avoidable goal against a weaker team does more damage to your season save% than a good save against a strong one helps it.",
      "Treat every shot as the first one of the match, not the fortieth against a team you're beating comfortably. The scoreboard doesn't care how the goal went in.",
      "If a game feels easy, that's a cue to sharpen your focus, not relax it — deliberately reset your concentration between phases of play rather than letting it drift with the score.",
      "Lopsided games are good practice for something specific: staying switched on with low shot volume. That's a real, transferable skill, not dead time.",
    ],
  },
  {
    id: "emotionreset",
    title: "Resetting After a Goal",
    icon: "RotateCcw",
    summary: "The next shot doesn't know or care about the last one. Your job is to not let it either.",
    tips: [
      "A goal that beats you cleanly and a goal you should have saved feel identical in the moment. Sorting out which was which is a job for after the match, not the next 10 seconds.",
      "Build a short, physical reset — a breath, a phrase, resetting your stance — and use it after every goal conceded, regardless of whose fault it was. The consistency matters more than what the routine actually is.",
      "Dwelling on the last goal costs you reaction time on the next shot. That's not a mental toughness failing, it's just where your attention is pointed — and attention is something you can redirect on purpose.",
      "A visible reaction is information for the attack, not just a release for you. Neutral body language after a goal is a tactical choice, not fake positivity.",
    ],
  },
];

const ADVICE_ICONS = { Compass, Eye, ShieldCheck, Zap, Waves, Brain, Target, Flame, RotateCcw };
const ADVICE_DIAGRAMS = {
  angleNarrowing: AngleNarrowingDiagram,
  shadowOfBlock: ShadowOfBlockDiagram,
  wingShotGeometry: WingShotGeometryDiagram,
  straightShotCorner: StraightShotCornerDiagram,
};

// Jedziniak et al. (2025), Brain Sciences — eye-tracking study of elite
// handball goalkeepers during penalty throws. Longer "quiet eye" duration
// (the final steady fixation before release) was linked to more effective
// saves in both groups; effective male goalkeepers tended to fixate on the
// throwing arm/forearm and ball, effective female goalkeepers on the torso
// and head. Appended to "Reading the Shooter" at render time rather than
// baked into ADVICE_TOPICS, so the general version (both cues, no mention
// of gender) is what an unset or "prefer not to say" keeper always sees —
// never a gap in content, just no lean either way.
const QUIET_EYE_DURATION_TIP = "Holding your final fixation steady right up to the moment of release — the \"quiet eye\" — is linked to more effective saves. It's the stillness that matters as much as where you're looking.";
function quietEyeCueTip(gender) {
  if (gender === "male") return "Elite male goalkeepers tend to lock that final fixation onto the throwing arm and ball. If that's your instinct too, trust it and hold it through release rather than jumping to the shooter's face or hips.";
  if (gender === "female") return "Elite female goalkeepers tend to lock that final fixation onto the torso and head rather than the arm. If that's your instinct too, trust it and hold it through release rather than chasing the ball itself.";
  return "Elite goalkeepers split roughly into two effective styles here: tracking the throwing arm and ball, or reading the torso and head. Notice which one you naturally do, and hold it steady through release.";
}

const LEVELS = ["Social", "Club", "State", "National", "International"];
const DISCIPLINES = ["Indoor", "Beach", "Both"];
// Optional, skippable, deselectable (tap the active option again to clear).
// Never gates access to anything — only ever feeds two evidence-based
// tailoring points (quiet-eye cue, ACL injury-prevention weighting). See
// DECISIONS.md, "Optional gender field & grounded sex-specific content".
const GENDER_OPTIONS = [["male", "Male"], ["female", "Female"], ["prefer_not_to_say", "Prefer not to say"]];
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
  // Most plans are ordinary training blocks, but a `blockType: "rehab"` plan
  // is assembled directly from a niggle's uploaded PT/physio file — the same
  // injury/rehab privacy rule below applies to those specific plans, not
  // just to profile.niggles/generalUploads themselves. A future sharing
  // allowlist must filter plans by blockType, not just spread this array.
  const [plans, setPlans] = useState([]);
  const [season, setSeason] = useState("Winter");
  const [tab, setTab] = useState("plans");
  const [saveError, setSaveError] = useState(false);
  // profile.niggles (incl. rehabLog and files) is injury/rehab data. If a
  // public-profile sharing feature is ever built, it must construct an
  // explicit allowlist of shareable fields — never spread or forward this
  // profile object wholesale. See DECISIONS.md, "Injury/rehab data privacy".
  const [profile, setProfile] = useState({ onboarded: false, access: {}, weaknesses: [], niggles: [] });
  const [kipMessages, setKipMessages] = useState([]);
  const [matches, setMatches] = useState([]);
  const [adHocSessions, setAdHocSessions] = useState([]);
  // Opponent-team-level rosters — keyed by normalized name, shared across
  // every match against that team rather than living on any single match.
  const [opponents, setOpponents] = useState([]);
  // Uploaded files not linked to any specific niggle — same shape and same
  // private-bucket storage as niggle.files, just not attached to one entity.
  // Like profile.niggles, this is injury/rehab-adjacent data: if a
  // public-profile sharing feature is ever built, it must never be included
  // in whatever gets shared. See DECISIONS.md, "Injury/rehab data privacy".
  const [generalUploads, setGeneralUploads] = useState([]);
  // Persisted Kip-generated progress reports — {id, createdAt, season, data,
  // narrative}. `data` is real computed output from the same aggregation
  // functions Stats itself uses, `narrative` is Kip's own phrasing of it.
  // Lives here rather than being derived, since a report is a snapshot of a
  // point in time, not something that should silently change if later
  // training data shifts the underlying numbers.
  const [reports, setReports] = useState([]);
  // Written server-side by netlify/functions/email-inbound.js (service-role,
  // bypasses this client entirely) whenever a forwarded match/training email
  // parses into something calendar-shaped. Never auto-committed to a Match
  // or AdHocSession — only ever reviewed and confirmed here, in Plans.
  const [pendingCalendarSuggestions, setPendingCalendarSuggestions] = useState([]);
  // Which live recorder overlay is currently shown (null = none). Lifted to
  // App level, not owned by Plans/Stats/Record individually, so starting a
  // recording from any one of them is immediately visible/resumable from the
  // others — one source of truth instead of three copies that could drift.
  // Independent of whether the underlying entity's `recording` field exists:
  // this is just "is the overlay open right now," not "is something in
  // progress" (that's still read straight off the data wherever it's shown).
  const [activeLiveTarget, setActiveLiveTarget] = useState(null);
  // Help Centre panel state — null closed, {} open at the searchable home
  // view, { articleId } open straight to one article (contextual ? buttons).
  // Lifted here, not owned by any one tab, since the global launcher has to
  // work from anywhere.
  const [helpTarget, setHelpTarget] = useState(null);
  function openHelp(articleId = null) {
    setHelpTarget(articleId ? { articleId } : {});
  }
  // Setup screen shown before a NEW recording starts — null closed,
  // {kind:"training"} or {kind:"match"} open. Resuming an in-progress
  // recording never touches this, only starting fresh does.
  const [pendingSetup, setPendingSetup] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const parsed = await loadUserData();
        if (parsed) {
          setCustomExercises(parsed.customExercises || []);
          setPlans(parsed.plans || []);
          setSeason(parsed.season || "Winter");
          setProfile(parsed.profile || { onboarded: false, access: {}, weaknesses: [], niggles: [] });
          setKipMessages(parsed.kipMessages || []);
          setMatches(parsed.matches || []);
          setAdHocSessions(parsed.adHocSessions || []);
          setOpponents(parsed.opponents || []);
          setGeneralUploads(parsed.generalUploads || []);
          setReports(parsed.reports || []);
          setPendingCalendarSuggestions(parsed.pendingCalendarSuggestions || []);

          const active = findActiveRecording({ plans: parsed.plans, adHocSessions: parsed.adHocSessions, matches: parsed.matches });
          if (active) setActiveLiveTarget(active);
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
      await saveUserData(next);
      setSaveError(false);
    } catch (e) {
      setSaveError(true);
    }
  }, []);

  const allExercises = useMemo(() => [...DEFAULT_EXERCISES, ...customExercises], [customExercises]);

  const hasKipAlert = useMemo(() => {
    if (profile.alertsEnabled === false) return false;
    return computeKipAlerts({ profile, plans, adHocSessions, matches, season, exercises: allExercises }).length > 0;
  }, [profile, plans, adHocSessions, matches, season, allExercises]);

  function updateAndSave({ nextCustom = customExercises, nextPlans = plans, nextSeason = season, nextProfile = profile, nextKip = kipMessages, nextMatches = matches, nextAdHoc = adHocSessions, nextOpponents = opponents, nextGeneralUploads = generalUploads, nextReports = reports, nextPendingCalendarSuggestions = pendingCalendarSuggestions }) {
    setCustomExercises(nextCustom);
    setPlans(nextPlans);
    setSeason(nextSeason);
    setProfile(nextProfile);
    setKipMessages(nextKip);
    setMatches(nextMatches);
    setAdHocSessions(nextAdHoc);
    setOpponents(nextOpponents);
    setGeneralUploads(nextGeneralUploads);
    setReports(nextReports);
    setPendingCalendarSuggestions(nextPendingCalendarSuggestions);
    persist({ customExercises: nextCustom, plans: nextPlans, season: nextSeason, profile: nextProfile, kipMessages: nextKip, matches: nextMatches, adHocSessions: nextAdHoc, opponents: nextOpponents, generalUploads: nextGeneralUploads, reports: nextReports, pendingCalendarSuggestions: nextPendingCalendarSuggestions });
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

  // "Open full chat" from a live recorder's quick-tap panel: minimize the
  // recorder (same as tapping Minimize itself — the in-progress recording
  // isn't touched, just no longer covering the screen) and land on Kip's
  // own tab, so it's the exact same conversation thread, not a second one.
  function onOpenKip() {
    setActiveLiveTarget(null);
    setTab("kip");
  }

  function saveMatch(match) {
    const exists = matches.some((m) => m.id === match.id);
    const next = exists ? matches.map((m) => (m.id === match.id ? match : m)) : [...matches, match];
    updateAndSave({ nextMatches: next });
  }

  // Nothing is created or persisted while a setup screen is open — unlike
  // the old flow, where tapping "Record" immediately created the session/
  // match with a running clock. beginTrainingRecording/beginMatchRecording
  // below are the only places that actually create anything and start the
  // clock, and they only run once Start is tapped. Resuming an already-
  // in-progress recording (recording field already set) skips this
  // entirely and goes straight to the live recorder, same as before.
  function beginTrainingRecording({ title, focus } = {}) {
    const next = nextSuggestedSession(plans);
    if (next) {
      const nextPlan = {
        ...next.plan,
        weeks: next.plan.weeks.map((ww) => ww.weekId === next.week.weekId
          ? { ...ww, sessions: ww.sessions.map((ss) => (ss.sessionId === next.session.sessionId ? { ...ss, focus: focus ?? ss.focus, recording: startRecording() } : ss)) }
          : ww),
      };
      savePlan(nextPlan);
      setActiveLiveTarget({ kind: "plan", planId: next.plan.id, weekId: next.week.weekId, sessionId: next.session.sessionId, focus: focus ?? next.session.focus });
    } else {
      const session = {
        id: uid(), title: title?.trim() || "Training session", notes: "", date: new Date().toISOString().slice(0, 10),
        exerciseIds: [], doneExerciseIds: [], exerciseLogs: {},
        completed: false, rpe: null, note: "", completedAt: null,
        recording: startRecording(),
      };
      saveAdHocSession(session);
      setActiveLiveTarget({ kind: "adhoc", sessionId: session.id });
    }
    setPendingSetup(null);
  }

  function beginMatchRecording(fields, teammate) {
    const withRecording = { id: uid(), ...fields, shots: [], recording: startRecording() };
    saveMatch(withRecording);
    setActiveLiveTarget({ kind: "match", matchId: withRecording.id, teammateOwnerId: teammate?.ownerId || null, teammateEmail: teammate?.email || null });
    setPendingSetup(null);
  }

  function deleteMatch(id) {
    const next = matches.filter((m) => m.id !== id);
    updateAndSave({ nextMatches: next });
  }

  function saveOpponentRoster(opponentName, roster) {
    updateAndSave({ nextOpponents: upsertOpponentRoster(opponents, opponentName, roster) });
  }

  function addGeneralUpload(meta) {
    updateAndSave({ nextGeneralUploads: [...generalUploads, meta] });
  }

  function removeGeneralUpload(path) {
    updateAndSave({ nextGeneralUploads: generalUploads.filter((f) => f.path !== path) });
  }

  // Report + the "Kip did this" chat message both need to land in the same
  // updateAndSave call — calling saveKipMessages and a separate addReport
  // back-to-back each closes over the other's stale pre-update value (since
  // neither has re-rendered yet), so the second call silently wins and wipes
  // out whichever field the first call touched. One call, both fields.
  function addReportAndNotify(report) {
    updateAndSave({
      nextReports: [...reports, report],
      nextKip: [...kipMessages, {
        role: "assistant",
        content: "Put together a report on your last stretch of training and matches — worth a look.",
        ts: Date.now(),
        action: { type: "report_generated", reportId: report.id },
      }],
    });
  }

  // Same atomic-update discipline as addReportAndNotify above: removing the
  // suggestion and creating the real Match/AdHocSession both have to land
  // in one updateAndSave call, not two, or the second call's stale closure
  // silently reverts whichever field the first call touched. Match has no
  // location field in its existing schema (MatchFormModal never collected
  // one), so a reviewed location is kept for training sessions (folded into
  // notes) but not persisted for matches — not worth inventing a new field
  // for a value the keeper already saw and confirmed once in the review
  // step.
  function confirmCalendarSuggestion(suggestion, fields) {
    const nextPending = pendingCalendarSuggestions.filter((s) => s.id !== suggestion.id);
    if (fields.kind === "match") {
      const match = { id: uid(), date: fields.date, opponent: fields.title, competition: "", result: "", season, videoUrl: "", shots: [] };
      updateAndSave({ nextMatches: [...matches, match], nextPendingCalendarSuggestions: nextPending });
    } else {
      const session = { id: uid(), title: fields.title, notes: fields.location ? `Location: ${fields.location}` : "", date: fields.date, exerciseIds: [], completed: false, rpe: null, note: "", completedAt: null };
      updateAndSave({ nextAdHoc: [...adHocSessions, session], nextPendingCalendarSuggestions: nextPending });
    }
  }

  function discardCalendarSuggestion(id) {
    updateAndSave({ nextPendingCalendarSuggestions: pendingCalendarSuggestions.filter((s) => s.id !== id) });
  }

  // One updateAndSave for the whole reviewed batch from a season-schedule
  // upload — every match ScheduleReviewModal hands back has already been
  // reviewed and deselected/edited by the keeper, so this is a single bulk
  // append, not one save per row.
  function bulkAddMatches(newMatches) {
    updateAndSave({ nextMatches: [...matches, ...newMatches] });
  }

  // Confirmed PT/physio exercises always become new custom exercises tagged
  // source: "physio" — never silently merged into Keepr's own curated
  // library — placed verbatim into either a new session in an existing
  // block or every session of a fresh rehab-type block. No invented
  // progression: the same confirmed list repeats across every session,
  // exactly matching what a real physio handout usually is ("do these N
  // times a week for N weeks"), rather than Keepr guessing at a ramp.
  function applyPtPlanToBlock({ items, destination, targetPlanId, blockConfig, sourceNiggleId }) {
    const newExercises = items.map((it) => ({
      id: uid(),
      name: it.name,
      category: "Rehab",
      type: "Gym",
      season: "Both",
      equipment: "As prescribed by your physio",
      format: it.prescription,
      loadAreas: [],
      desc: it.notes?.trim() || "Prescribed by your physio.",
      custom: true,
      source: "physio",
      sourceNiggleId: sourceNiggleId || null,
    }));
    const nextCustom = [...customExercises, ...newExercises];
    const buildEntries = () => newExercises.map((ex) => ({ entryId: uid(), exerciseId: ex.id, ...makeReps(ex.format) }));

    if (destination === "new") {
      const plan = generateRehabBlock(blockConfig.name, season, blockConfig.weeks, blockConfig.sessionsPerWeek, buildEntries);
      updateAndSave({ nextCustom, nextPlans: [...plans, plan] });
    } else {
      const targetPlan = plans.find((p) => p.id === targetPlanId);
      if (!targetPlan) return;
      const targetWeek = targetPlan.weeks.find((w) => w.sessions.some((s) => !s.completed)) || targetPlan.weeks[targetPlan.weeks.length - 1];
      const nextSessionNumber = Math.max(0, ...targetWeek.sessions.map((s) => s.sessionNumber)) + 1;
      const newSession = { sessionId: uid(), sessionNumber: nextSessionNumber, exercises: buildEntries(), completed: false, focus: "Physio-prescribed" };
      const nextPlan = {
        ...targetPlan,
        weeks: targetPlan.weeks.map((w) => (w.weekId === targetWeek.weekId ? { ...w, sessions: [...w.sessions, newSession] } : w)),
      };
      updateAndSave({ nextCustom, nextPlans: plans.map((p) => (p.id === targetPlanId ? nextPlan : p)) });
    }
  }

  function saveAdHocSession(session) {
    const exists = adHocSessions.some((s) => s.id === session.id);
    const next = exists ? adHocSessions.map((s) => (s.id === session.id ? session : s)) : [...adHocSessions, session];
    updateAndSave({ nextAdHoc: next });
  }

  function deleteAdHocSession(id) {
    const next = adHocSessions.filter((s) => s.id !== id);
    updateAndSave({ nextAdHoc: next });
  }

  // A plan session's date is a pure calendar overlay — reassigning it never
  // touches week/session numbering, which stays the structural identity.
  function setPlanSessionDate(planId, weekId, sessionId, date) {
    const plan = plans.find((p) => p.id === planId);
    if (!plan) return;
    const next = {
      ...plan,
      weeks: plan.weeks.map((w) => w.weekId === weekId
        ? { ...w, sessions: w.sessions.map((s) => (s.sessionId === sessionId ? { ...s, date } : s)) }
        : w),
    };
    savePlan(next);
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
      {/* Kip manages its own fixed-height header/thread/input layout and needs
          to end flush just above BottomNav, not with the generous pb-20 every
          other (plain-scrolling) tab uses for breathing room past its last
          item — that extra ~30px was showing up as a visible empty gap below
          Kip's input bar. */}
      <div className={`flex-1 overflow-y-auto max-w-md w-full mx-auto ${tab === "kip" ? "pb-[52px]" : "pb-20"}`}>
        {tab === "library" && (
          <Library
            exercises={allExercises}
            season={season}
            onAdd={addExercise}
            onDelete={deleteExercise}
            profile={profile}
          />
        )}
        {tab === "plans" && (
          <Plans
            plans={plans}
            exercises={allExercises}
            season={season}
            profile={profile}
            onSave={savePlan}
            onDelete={deletePlan}
            onSetSessionDate={setPlanSessionDate}
            matches={matches}
            onSaveMatch={saveMatch}
            adHocSessions={adHocSessions}
            onSaveAdHoc={saveAdHocSession}
            onDeleteAdHoc={deleteAdHocSession}
            opponents={opponents}
            onSaveOpponentRoster={saveOpponentRoster}
            onOpenLiveRecorder={setActiveLiveTarget}
            kipMessages={kipMessages}
            onSaveMessages={saveKipMessages}
            pendingCalendarSuggestions={pendingCalendarSuggestions}
            onConfirmCalendarSuggestion={confirmCalendarSuggestion}
            onDiscardCalendarSuggestion={discardCalendarSuggestion}
            onOpenHelp={openHelp}
            onOpenTrainingSetup={() => setPendingSetup({ kind: "training" })}
          />
        )}
        {tab === "record" && (
          <RecordTab
            plans={plans}
            adHocSessions={adHocSessions}
            matches={matches}
            onOpenLiveRecorder={setActiveLiveTarget}
            onOpenTrainingSetup={() => setPendingSetup({ kind: "training" })}
            onOpenMatchSetup={() => setPendingSetup({ kind: "match" })}
            onOpenHelp={() => openHelp("record-live")}
          />
        )}
        {tab === "profile" && (
          <ProfileTab
            profile={profile}
            onSaveProfile={saveProfile}
            exercises={allExercises}
            plans={plans}
            onApplyPtPlan={applyPtPlanToBlock}
            generalUploads={generalUploads}
            onAddGeneralUpload={addGeneralUpload}
            onRemoveGeneralUpload={removeGeneralUpload}
            season={season}
            onBulkAddMatches={bulkAddMatches}
          />
        )}
        {tab === "stats" && (
          <StatsTab
            matches={matches}
            season={season}
            onSave={saveMatch}
            onDelete={deleteMatch}
            plans={plans}
            exercises={allExercises}
            adHocSessions={adHocSessions}
            opponents={opponents}
            onSaveOpponentRoster={saveOpponentRoster}
            onOpenLiveRecorder={setActiveLiveTarget}
            profile={profile}
            onSaveProfile={saveProfile}
            reports={reports}
            onReportGenerated={addReportAndNotify}
            onOpenHelp={() => openHelp("stats-log-match")}
            onOpenMatchSetup={() => setPendingSetup({ kind: "match" })}
          />
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
            exercises={allExercises}
            adHocSessions={adHocSessions}
            opponents={opponents}
            onSavePlan={savePlan}
            onApplyPtPlan={applyPtPlanToBlock}
            onOpenProfile={() => setTab("profile")}
          />
        )}
      </div>

      {activeLiveTarget?.kind === "plan" && (() => {
        const livePlan = plans.find((p) => p.id === activeLiveTarget.planId);
        const liveSession = livePlan?.weeks.find((w) => w.weekId === activeLiveTarget.weekId)?.sessions.find((s) => s.sessionId === activeLiveTarget.sessionId);
        if (!liveSession) return null;
        return (
          <LiveSessionRecorder
            session={liveSession}
            kind="plan"
            exercises={allExercises}
            focus={activeLiveTarget.focus}
            profile={profile}
            season={season}
            plans={plans}
            matches={matches}
            adHocSessions={adHocSessions}
            onOpenKip={onOpenKip}
            onUpdatePatch={(patch) => {
              const next = {
                ...livePlan,
                weeks: livePlan.weeks.map((ww) => ww.weekId === activeLiveTarget.weekId
                  ? { ...ww, sessions: ww.sessions.map((ss) => (ss.sessionId === activeLiveTarget.sessionId ? { ...ss, ...patch } : ss)) }
                  : ww),
              };
              savePlan(next);
            }}
            onFinish={({ rpe, note, durationMinutes, exercises: exercisesNext }) => {
              const { recording, ...rest } = liveSession;
              const next = {
                ...livePlan,
                weeks: livePlan.weeks.map((ww) => ww.weekId === activeLiveTarget.weekId
                  ? { ...ww, sessions: ww.sessions.map((ss) => (ss.sessionId === activeLiveTarget.sessionId
                      ? { ...rest, completed: true, rpe, note, durationMinutes, completedAt: new Date().toISOString(), exercises: exercisesNext }
                      : ss)) }
                  : ww),
              };
              savePlan(next);
              setActiveLiveTarget(null);
            }}
            onExit={() => setActiveLiveTarget(null)}
            onDelete={() => {
              const { recording, ...rest } = liveSession;
              const next = {
                ...livePlan,
                weeks: livePlan.weeks.map((ww) => ww.weekId === activeLiveTarget.weekId
                  ? { ...ww, sessions: ww.sessions.map((ss) => (ss.sessionId === activeLiveTarget.sessionId ? rest : ss)) }
                  : ww),
              };
              savePlan(next);
              setActiveLiveTarget(null);
            }}
          />
        );
      })()}

      {activeLiveTarget?.kind === "adhoc" && (() => {
        const liveSession = adHocSessions.find((s) => s.id === activeLiveTarget.sessionId);
        if (!liveSession) return null;
        return (
          <LiveSessionRecorder
            session={liveSession}
            kind="adhoc"
            exercises={allExercises}
            focus={activeLiveTarget.focus}
            profile={profile}
            season={season}
            plans={plans}
            matches={matches}
            adHocSessions={adHocSessions}
            onOpenKip={onOpenKip}
            onUpdatePatch={(patch) => saveAdHocSession({ ...liveSession, ...patch })}
            onFinish={({ rpe, note, durationMinutes, exerciseLogs }) => {
              const { recording, ...rest } = liveSession;
              saveAdHocSession({ ...rest, completed: true, rpe, note, durationMinutes, completedAt: new Date().toISOString(), exerciseLogs });
              setActiveLiveTarget(null);
            }}
            onExit={() => setActiveLiveTarget(null)}
            onDelete={() => {
              deleteAdHocSession(liveSession.id);
              setActiveLiveTarget(null);
            }}
          />
        );
      })()}

      {activeLiveTarget?.kind === "match" && (() => {
        const liveMatch = matches.find((m) => m.id === activeLiveTarget.matchId);
        if (!liveMatch) return null;
        return (
          <LiveMatchRecorder
            match={liveMatch}
            opponents={opponents}
            profile={profile}
            season={season}
            plans={plans}
            matches={matches}
            adHocSessions={adHocSessions}
            exercises={allExercises}
            onOpenKip={onOpenKip}
            teammateOwnerId={activeLiveTarget.teammateOwnerId || null}
            teammateEmail={activeLiveTarget.teammateEmail || null}
            onUpdatePatch={(patch) => saveMatch({ ...liveMatch, ...patch })}
            onFinish={(patch, teammateMatchId) => {
              const { recording, ...rest } = liveMatch;
              saveMatch({ ...rest, ...patch });
              if (activeLiveTarget.teammateOwnerId && teammateMatchId) {
                const teammatePatch = { recording: null };
                if ("competition" in patch) teammatePatch.competition = patch.competition;
                if ("result" in patch) teammatePatch.result = patch.result;
                patchTeammateMatch(activeLiveTarget.teammateOwnerId, teammateMatchId, teammatePatch).catch(() => {});
              }
              setActiveLiveTarget(null);
            }}
            onExit={() => setActiveLiveTarget(null)}
            onDelete={(teammateMatchId) => {
              deleteMatch(liveMatch.id);
              if (activeLiveTarget.teammateOwnerId && teammateMatchId) {
                deleteTeammateMatch(activeLiveTarget.teammateOwnerId, teammateMatchId).catch(() => {});
              }
              setActiveLiveTarget(null);
            }}
          />
        );
      })()}

      {pendingSetup?.kind === "training" && (
        <TrainingSetupScreen
          plans={plans}
          exercises={allExercises}
          onStart={beginTrainingRecording}
          onClose={() => setPendingSetup(null)}
        />
      )}
      {pendingSetup?.kind === "match" && (
        <MatchSetupScreen
          season={season}
          matches={matches}
          opponents={opponents}
          onSaveOpponentRoster={saveOpponentRoster}
          onStart={beginMatchRecording}
          onClose={() => setPendingSetup(null)}
        />
      )}

      <BottomNav tab={tab} setTab={setTab} hasKipAlert={hasKipAlert} />

      {/* Hidden on the Kip tab — the launcher bubble sits right where the chat's
          own message input lives, crowding/overlapping it on that one screen.
          Still available from every other tab as normal. */}
      {!helpTarget && tab !== "kip" && <HelpWidget onOpen={() => openHelp()} />}
      {helpTarget && (
        <HelpPanel
          initialArticleId={helpTarget.articleId}
          onClose={() => setHelpTarget(null)}
          onOpenKip={onOpenKip}
        />
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Top bar + season toggle (signature element)                       */
/* ---------------------------------------------------------------- */

function TopBar({ season, setSeason }) {
  const { signOut } = useAuth();
  return (
    <div className="border-b" style={{ borderColor: "#DAD7CC", background: "#12213A" }}>
      <div className="max-w-md mx-auto px-4 pt-4 pb-3">
        <div className="flex items-baseline justify-between">
          <h1 className="text-2xl font-black tracking-tight text-white">
            Keepr<span style={{ color: "#0E8388" }}>.</span>
          </h1>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase tracking-widest text-white/50 font-semibold">
              Keeper training
            </span>
            <button
              onClick={signOut}
              aria-label="Sign out"
              className="p-1 rounded text-white/50 hover:text-white/90"
            >
              <LogOut size={13} strokeWidth={2.5} />
            </button>
          </div>
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

function BottomNav({ tab, setTab, hasKipAlert }) {
  const items = [
    { id: "plans", label: "Plans", Icon: ListChecks },
    { id: "record", label: "Record", Icon: Circle },
    { id: "library", label: "Library", Icon: BookOpen },
    { id: "profile", label: "Profile", Icon: User },
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
              className="flex-1 flex flex-col items-center gap-0.5 py-2 px-0.5 min-w-0 relative"
              style={{ color: active ? "#0E8388" : "#8A8779" }}
            >
              <div className="relative">
                <Icon size={18} strokeWidth={active ? 2.5 : 2} />
                {id === "kip" && hasKipAlert && (
                  <span className="absolute -top-0.5 -right-1 w-2 h-2 rounded-full" style={{ background: "#C1483B" }} />
                )}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-wide truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Help Centre                                                        */
/* Intercom-style: a floating launcher available everywhere, opening a  */
/* searchable panel in place — no route change, content comes from     */
/* src/lib/helpContent.js (plain data, kept separate so it's easy to    */
/* keep in sync with the app without touching any UI code). Search is   */
/* static keyword matching on purpose (see that file) — Kip is the      */
/* fallback for anything it can't answer, reached the exact same way    */
/* every other "open Kip" entry point in this app already does          */
/* (minimize whatever's on screen, land on the Kip tab), not a second   */
/* assistant persona bolted onto the help panel.                        */
/* ---------------------------------------------------------------- */

// Tiny plain-text convention matching helpContent.js: a blank line is a
// paragraph break, a run of lines starting with "- " is a bullet list.
// Deliberately not markdown — this is short FAQ copy, not rich content.
function renderHelpBody(text) {
  return text.trim().split("\n\n").map((block, i) => {
    const lines = block.split("\n").filter(Boolean);
    if (lines.length > 0 && lines.every((l) => l.startsWith("- "))) {
      return (
        <ul key={i} className="list-disc list-inside space-y-1.5 mb-3 text-sm text-gray-700 leading-relaxed">
          {lines.map((l, j) => <li key={j}>{l.slice(2)}</li>)}
        </ul>
      );
    }
    return <p key={i} className="text-sm text-gray-700 leading-relaxed mb-3">{block}</p>;
  });
}

// Positioned the same way BottomNav is — a full-width fixed wrapper with
// an inner max-w-md mx-auto column — so the bubble sits inside the app's
// own visible column on both mobile and the centered-desktop layout,
// rather than drifting into the empty margin a plain `fixed right-4`
// would land in outside max-w-md.
function HelpWidget({ onOpen }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 pointer-events-none">
      <div className="max-w-md mx-auto relative">
        <button
          onClick={onOpen}
          aria-label="Help"
          className="pointer-events-auto absolute bottom-20 right-4 w-11 h-11 rounded-full flex items-center justify-center"
          style={{ background: "#12213A", boxShadow: "0 4px 14px rgba(18,33,58,0.35)" }}
        >
          <HelpCircle size={20} color="#fff" />
        </button>
      </div>
    </div>
  );
}

// Small "?" affordance for screens with real complexity (Builder, Stats,
// Record) — jumps straight to the one article most likely to answer
// what's on screen, instead of making someone go through the generic
// launcher and search for it themselves.
function HelpButton({ onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label="Help with this screen"
      className="w-6 h-6 rounded-full flex items-center justify-center border shrink-0"
      style={{ borderColor: "#DAD7CC", color: "#8A8779" }}
    >
      <span className="text-[11px] font-bold">?</span>
    </button>
  );
}

// initialArticleId set => opens straight to that article (contextual ?
// buttons); left null => opens at the searchable home view (global
// launcher). Three internal views (home / category / article) rather than
// separate route-like components, since the whole point is staying
// lightweight — this never leaves a single mounted component.
function HelpPanel({ initialArticleId, onClose, onOpenKip }) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState(null);
  const [articleId, setArticleId] = useState(initialArticleId || null);

  const activeArticle = articleId ? findHelpArticle(articleId) : null;
  const results = query.trim() ? searchHelpArticles(query) : [];

  const showingArticle = !!articleId;
  const showingCategory = !articleId && !!categoryId;
  const showingHome = !articleId && !categoryId;

  function back() {
    if (articleId) { setArticleId(null); return; }
    if (categoryId) { setCategoryId(null); return; }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={onClose}>
      <div
        className="bg-[#F3F2ED] rounded-t-2xl sm:rounded-2xl w-full max-w-md flex flex-col overflow-hidden"
        style={{ height: "85vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 px-4 pt-4 pb-3 border-b bg-white" style={{ borderColor: "#DAD7CC" }}>
          <div className="flex items-center gap-2 mb-3">
            {(showingArticle || showingCategory) ? (
              <button onClick={back} className="flex items-center gap-1 text-xs font-semibold text-gray-500 -ml-1">
                <ArrowLeft size={16} /> Back
              </button>
            ) : (
              <div className="flex items-center gap-1.5">
                <HelpCircle size={16} color="#0E8388" />
                <span className="text-sm font-black" style={{ color: "#12213A" }}>Help</span>
              </div>
            )}
            <div className="flex-1" />
            <button onClick={onClose} className="p-1.5 rounded-full" style={{ background: "#F3F2ED" }} aria-label="Close help">
              <X size={16} />
            </button>
          </div>
          {showingHome && (
            <div className="flex items-center gap-2 rounded-lg px-3 py-2 border" style={{ background: "#F3F2ED", borderColor: "#DAD7CC" }}>
              <Search size={15} color="#8A8779" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search help"
                className="flex-1 text-sm outline-none bg-transparent"
              />
            </div>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-3">
          {showingArticle && activeArticle && (
            <div>
              <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#0E8388" }}>
                {HELP_CATEGORIES.find((c) => c.id === activeArticle.category)?.label}
              </div>
              <h3 className="text-base font-black mb-3" style={{ color: "#12213A" }}>{activeArticle.title}</h3>
              {renderHelpBody(activeArticle.body)}
            </div>
          )}

          {showingCategory && (
            <div>
              <h3 className="text-base font-black mb-3" style={{ color: "#12213A" }}>
                {HELP_CATEGORIES.find((c) => c.id === categoryId)?.label}
              </h3>
              <div className="space-y-2">
                {articlesByCategory(categoryId).map((a) => (
                  <button key={a.id} onClick={() => setArticleId(a.id)} className="w-full text-left bg-white rounded-lg border p-3 flex items-center justify-between" style={{ borderColor: "#DAD7CC" }}>
                    <span className="text-sm font-semibold" style={{ color: "#12213A" }}>{a.title}</span>
                    <ChevronRight size={15} color="#DAD7CC" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {showingHome && (
            query.trim() ? (
              results.length > 0 ? (
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-2">
                    {results.length} result{results.length !== 1 ? "s" : ""}
                  </div>
                  <div className="space-y-2">
                    {results.map((a) => (
                      <button key={a.id} onClick={() => setArticleId(a.id)} className="w-full text-left bg-white rounded-lg border p-3" style={{ borderColor: "#DAD7CC" }}>
                        <div className="text-sm font-semibold" style={{ color: "#12213A" }}>{a.title}</div>
                        <div className="text-[11px] text-gray-400 mt-0.5">{HELP_CATEGORIES.find((c) => c.id === a.category)?.label}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-sm text-gray-500 mb-3">Nothing in Help covers that.</div>
                  <button
                    onClick={() => { onClose(); onOpenKip(); }}
                    className="text-sm font-bold flex items-center justify-center gap-1.5 mx-auto px-4 py-2 rounded-lg text-white"
                    style={{ background: "#0E8388" }}
                  >
                    <Sparkles size={14} /> Ask Kip
                  </button>
                </div>
              )
            ) : (
              <div className="space-y-2">
                {HELP_CATEGORIES.map((c) => (
                  <button key={c.id} onClick={() => setCategoryId(c.id)} className="w-full text-left bg-white rounded-lg border p-3 flex items-center justify-between" style={{ borderColor: "#DAD7CC" }}>
                    <span className="text-sm font-bold" style={{ color: "#12213A" }}>{c.label}</span>
                    <ChevronRight size={15} color="#DAD7CC" />
                  </button>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- */
/* Library                                                            */
/* ---------------------------------------------------------------- */

function Library({ exercises, season, onAdd, onDelete, profile }) {
  const [view, setView] = useState("exercises"); // exercises | notes
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
      <div className="flex rounded-lg overflow-hidden border mb-3" style={{ borderColor: "#DAD7CC" }}>
        {[["exercises", "Exercises"], ["notes", "Coach's Notes"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className="flex-1 py-2 text-xs font-bold uppercase tracking-wide"
            style={view === id ? { background: "#12213A", color: "#fff" } : { color: "#8A8779" }}
          >
            {label}
          </button>
        ))}
      </div>

      {view === "notes" && <AdviceHub profile={profile} />}

      {view === "exercises" && (
        <>
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

      <div className="flex gap-1.5 mb-3">
        <Chip active={seasonFilter === "current"} onClick={() => setSeasonFilter(seasonFilter === "current" ? "all" : "current")} accent="#12213A">
          {seasonFilter === "current" ? `${season} relevant` : "All seasons"}
        </Chip>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <select
          value={type || ""}
          onChange={(e) => setType(e.target.value || null)}
          className="bg-white rounded-lg px-3 py-2 border text-xs font-bold"
          style={{ borderColor: "#DAD7CC", color: "#12213A" }}
        >
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={cat || ""}
          onChange={(e) => setCat(e.target.value || null)}
          className="bg-white rounded-lg px-3 py-2 border text-xs font-bold"
          style={{ borderColor: "#DAD7CC", color: "#12213A" }}
        >
          <option value="">All categories</option>
          {CATS.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
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
        </>
      )}
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
          {ex.source === "physio" ? (
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "#FCEFE9", color: "#C1483B" }}>
              Physio
            </span>
          ) : ex.custom && (
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
      {(() => {
        const parsed = parseExerciseDesc(ex.desc);
        if (!parsed) {
          return <p className="text-sm text-gray-700 leading-relaxed mb-4">{ex.desc}</p>;
        }
        return (
          <div className="space-y-3 mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-1">What it trains</div>
              <p className="text-sm text-gray-700 leading-relaxed">{parsed.whatWhy}</p>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold mb-1">How to do it</div>
              {parsed.steps.length > 1 ? (
                <ol className="text-sm text-gray-700 leading-relaxed space-y-1 list-decimal list-inside">
                  {parsed.steps.map((s, i) => <li key={i}>{s}</li>)}
                </ol>
              ) : (
                <p className="text-sm text-gray-700 leading-relaxed">{parsed.steps[0]}</p>
              )}
            </div>
            <div className="flex gap-2 p-2.5 rounded-lg" style={{ background: "#F3F2ED" }}>
              <AlertTriangle size={14} color="#C1483B" className="shrink-0 mt-0.5" />
              <div>
                <div className="text-[10px] uppercase tracking-wide font-bold mb-0.5" style={{ color: "#C1483B" }}>Common mistake</div>
                <p className="text-sm text-gray-700 leading-relaxed">{parsed.mistake}</p>
              </div>
            </div>
          </div>
        );
      })()}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-white rounded-lg p-3 border" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Sets & Reps</div>
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

function Builder({ exercises, season, profile, matches, plans, adHocSessions, opponents = [], kipMessages = [], onSaveMessages, onSave, onBack, onOpenHelp }) {
  const [step, setStep] = useState("setup");
  const [name, setName] = useState("");
  const [blockSeason, setBlockSeason] = useState(season);
  const [method, setMethod] = useState(null);
  const [goalId, setGoalId] = useState(null);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [useData, setUseData] = useState(false);
  const [draft, setDraft] = useState(null);
  const [showKipSheet, setShowKipSheet] = useState(false);

  // Same eligibility checks generateGoalBlock itself runs — shown here only
  // so the toggle can be honest about whether it'll actually change anything,
  // never so it blocks or errors when data is thin.
  const hasAnySignal = Boolean(
    weakestZoneSignal(matches || [], blockSeason)
    || weakestShotTypeSignal(matches || [], blockSeason)
    || categoryTrainingSignal(plans || [], blockSeason, exercises)
    || (profile?.niggles || []).some((n) => n.severity === "Significant" || !n.clearedByPhysio)
    || profile?.gender === "female"
  );

  function startGoalBlock() {
    const finalName = name.trim() || `${GOALS.find((g) => g.id === goalId).name} Block`;
    const dataContext = useData ? { useData: true, profile, matches, plans, adHocSessions } : null;
    setDraft(generateGoalBlock(finalName, blockSeason, goalId, exercises, dataContext));
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
        onSave={(p) => { onSave(p); setStep("setup"); setDraft(null); setName(""); setMethod(null); setGoalId(null); setUseData(false); }}
      />
    );
  }

  return (
    <div className="px-4 pt-4 pb-6">
      {onBack && (
        <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-3">
          <ArrowLeft size={14} /> Back to Plans
        </button>
      )}
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-black" style={{ color: "#12213A" }}>Build a 6-week block</h2>
        {onOpenHelp && <HelpButton onClick={() => onOpenHelp("build-methods")} />}
      </div>

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
        <button onClick={() => setMethod("freeform")} className="w-full text-left bg-white rounded-lg border p-3 mb-2 flex items-center gap-3" style={{ borderColor: method === "freeform" ? "#0E8388" : "#DAD7CC", borderWidth: method === "freeform" ? 2 : 1 }}>
          <Pencil size={18} color="#0E8388" />
          <div>
            <div className="font-bold text-sm">Build from scratch</div>
            <div className="text-xs text-gray-500">Pick every exercise yourself, week by week</div>
          </div>
        </button>
        <button onClick={() => { setMethod("kip"); setShowKipSheet(true); }} className="w-full text-left bg-white rounded-lg border p-3 flex items-center gap-3" style={{ borderColor: method === "kip" ? "#0E8388" : "#DAD7CC", borderWidth: method === "kip" ? 2 : 1 }}>
          <Sparkles size={18} color="#0E8388" />
          <div>
            <div className="font-bold text-sm">Build with Kip</div>
            <div className="text-xs text-gray-500">Tell it what you need in plain language — "beach block, my shoulder's a bit sore"</div>
          </div>
        </button>
      </div>

      {showKipSheet && (
        <KipAssistantSheet
          profile={profile}
          messages={kipMessages}
          onSaveMessages={onSaveMessages}
          plans={plans}
          season={blockSeason}
          matches={matches}
          exercises={exercises}
          adHocSessions={adHocSessions}
          opponents={opponents}
          onSavePlan={() => {}}
          onBlockBuilt={(block) => {
            setDraft(block);
            setStep("edit");
            setShowKipSheet(false);
          }}
          onClose={() => setShowKipSheet(false)}
        />
      )}

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

          <label className="flex items-start gap-2.5 mt-4 bg-white rounded-lg border p-3 cursor-pointer" style={{ borderColor: useData ? "#0E8388" : "#DAD7CC", borderWidth: useData ? 2 : 1 }}>
            <input type="checkbox" checked={useData} onChange={(e) => setUseData(e.target.checked)} className="mt-0.5" />
            <div>
              <div className="text-sm font-bold" style={{ color: "#12213A" }}>Use my data</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {hasAnySignal
                  ? "Bias exercise selection toward your weak zones, high-effort categories, any niggles, and (if set) injury-prevention emphasis."
                  : "Not enough logged matches or sessions yet to make a difference — log a few more and this will kick in automatically."}
              </div>
            </div>
          </label>

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
      exercises: [...s.exercises, { entryId: uid(), exerciseId: ex.id, ...makeReps(ex.format) }],
    }));
    setPicker(null);
  }

  function removeExerciseFromSession(weekIdx, sessionIdx, entryId) {
    updateSession(weekIdx, sessionIdx, (s) => ({ ...s, exercises: s.exercises.filter((e) => e.entryId !== entryId) }));
  }

  function setReps(weekIdx, sessionIdx, entryId, val) {
    updateSession(weekIdx, sessionIdx, (s) => ({
      ...s,
      exercises: s.exercises.map((e) => (e.entryId === entryId ? { ...e, repsRaw: val } : e)),
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
                              <div className="flex items-center gap-1.5">
                                <div className="text-xs font-semibold truncate">{ex.name}</div>
                                {ex.source === "physio" && (
                                  <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0" style={{ background: "#FCEFE9", color: "#C1483B" }}>
                                    Physio
                                  </span>
                                )}
                              </div>
                              <input
                                value={repsDisplay(entry)}
                                onChange={(e) => setReps(wi, si, entry.entryId, e.target.value)}
                                className="text-[11px] text-gray-500 bg-transparent outline-none w-full"
                              />
                              {entry.genReason && (
                                <div className="flex items-start gap-1 mt-0.5">
                                  <Sparkles size={10} color="#0E8388" className="shrink-0 mt-0.5" />
                                  <span className="text-[10px] italic" style={{ color: "#0E8388" }}>{entry.genReason}</span>
                                </div>
                              )}
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

function SessionFocusInput({ value, onSave, className }) {
  const [local, setLocal] = useState(value);
  return (
    <input
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      onBlur={() => { if (local !== value) onSave(local); }}
      placeholder="Focus for this session (optional)"
      className={className || "block w-full pl-5 text-[11px] text-gray-600 bg-transparent outline-none mb-1 placeholder:text-gray-300"}
    />
  );
}

function CalendarView({ plans, matches, adHocSessions, exercises, onLogPlanSession, onRequestDateChange, onAddTraining, onAddGame, onOpenAdHoc }) {
  const today = new Date();
  const todayKey = dateKey(today.getFullYear(), today.getMonth(), today.getDate());
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selected, setSelected] = useState(todayKey);
  const [addMenuOpen, setAddMenuOpen] = useState(false);

  const entriesByDate = useMemo(() => {
    const map = {};
    const ensure = (key) => { if (!map[key]) map[key] = { planSessions: [], matches: [], adHoc: [] }; return map[key]; };
    plans.forEach((plan) => {
      plan.weeks.forEach((week) => {
        week.sessions.forEach((session) => {
          if (!session.date) return;
          ensure(session.date).planSessions.push({ plan, week, session });
        });
      });
    });
    matches.forEach((m) => { if (m.date) ensure(m.date).matches.push(m); });
    adHocSessions.forEach((s) => { if (s.date) ensure(s.date).adHoc.push(s); });
    return map;
  }, [plans, matches, adHocSessions]);

  const cells = monthMatrix(year, month);
  const monthLabel = new Date(year, month, 1).toLocaleDateString(undefined, { month: "long", year: "numeric" });
  const dayLabels = ["M", "T", "W", "T", "F", "S", "S"];

  function goMonth(delta) {
    let m = month + delta, y = year;
    if (m < 0) { m = 11; y -= 1; }
    if (m > 11) { m = 0; y += 1; }
    setMonth(m); setYear(y);
  }

  const dayEntries = entriesByDate[selected] || { planSessions: [], matches: [], adHoc: [] };
  const dayHasNothing = dayEntries.planSessions.length === 0 && dayEntries.matches.length === 0 && dayEntries.adHoc.length === 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <button onClick={() => goMonth(-1)} className="p-1.5 rounded-lg border" style={{ borderColor: "#DAD7CC" }}><ChevronLeft size={14} /></button>
        <div className="text-sm font-bold" style={{ color: "#12213A" }}>{monthLabel}</div>
        <button onClick={() => goMonth(1)} className="p-1.5 rounded-lg border" style={{ borderColor: "#DAD7CC" }}><ChevronRight size={14} /></button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {dayLabels.map((d, i) => <div key={i} className="text-center text-[10px] font-bold text-gray-400">{d}</div>)}
      </div>
      <div className="grid grid-cols-7 gap-1 mb-3">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const key = dateKey(year, month, day);
          const entries = entriesByDate[key];
          const isSelected = key === selected;
          const isToday = key === todayKey;
          return (
            <button
              key={i}
              onClick={() => setSelected(key)}
              className="aspect-square rounded-lg flex flex-col items-center justify-center"
              style={{ background: isSelected ? "#12213A" : "#fff", border: `1px solid ${isToday && !isSelected ? "#0E8388" : "#DAD7CC"}` }}
            >
              <span className="text-xs font-semibold" style={{ color: isSelected ? "#fff" : "#12213A" }}>{day}</span>
              {entries && (
                <div className="flex gap-0.5 mt-0.5">
                  {entries.planSessions.length > 0 && <span className="w-1 h-1 rounded-full" style={{ background: isSelected ? "#fff" : "#0E8388" }} />}
                  {entries.matches.length > 0 && <span className="w-1 h-1 rounded-full" style={{ background: isSelected ? "#fff" : "#C1483B" }} />}
                  {entries.adHoc.length > 0 && <span className="w-1 h-1 rounded-full" style={{ background: isSelected ? "#fff" : "#E2984B" }} />}
                </div>
              )}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-lg border p-3" style={{ borderColor: "#DAD7CC" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold" style={{ color: "#12213A" }}>{formatShortDate(selected)}</div>
          <div className="relative">
            <button onClick={() => setAddMenuOpen(!addMenuOpen)} className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: "#0E8388" }}>
              <Plus size={12} /> Add
            </button>
            {addMenuOpen && (
              <div className="absolute right-0 top-6 bg-white rounded-lg border shadow-lg z-10 overflow-hidden" style={{ borderColor: "#DAD7CC" }}>
                <button onClick={() => { setAddMenuOpen(false); onAddTraining(selected); }} className="block w-full text-left px-3 py-2 text-xs font-semibold whitespace-nowrap hover:bg-gray-50">Training session</button>
                <button onClick={() => { setAddMenuOpen(false); onAddGame(selected); }} className="block w-full text-left px-3 py-2 text-xs font-semibold whitespace-nowrap hover:bg-gray-50">Game</button>
              </div>
            )}
          </div>
        </div>

        {dayHasNothing && <div className="text-[11px] text-gray-400 py-2">Nothing scheduled.</div>}

        <div className="space-y-1.5">
          {dayEntries.planSessions.map(({ plan, week, session }) => (
            <div key={session.sessionId} className="rounded-md p-2 border" style={{ borderColor: "#DAD7CC" }}>
              <button onClick={() => onLogPlanSession(plan, week.weekId, session.sessionId, session.focus)} className="flex items-center gap-1.5 text-xs font-bold w-full text-left">
                {session.completed ? <CheckCircle2 size={13} color="#0E8388" /> : <Circle size={13} color="#DAD7CC" />}
                {plan.name} — Week {week.weekNumber}, Session {session.sessionNumber}
              </button>
              <button onClick={() => onRequestDateChange(plan, week.weekId, session.sessionId, session.date)} className="text-[10px] font-semibold mt-1" style={{ color: "#8A8779" }}>
                Change date
              </button>
            </div>
          ))}
          {dayEntries.matches.map((m) => (
            <div key={m.id} className="rounded-md p-2 border text-xs" style={{ borderColor: "#DAD7CC" }}>
              <div className="font-bold" style={{ color: "#12213A" }}>vs {m.opponent}</div>
              <div className="text-[11px] text-gray-500">{m.result || "Match"}</div>
            </div>
          ))}
          {dayEntries.adHoc.map((s) => (
            <button key={s.id} onClick={() => onOpenAdHoc(s)} className="w-full text-left rounded-md p-2 border" style={{ borderColor: "#DAD7CC" }}>
              <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "#12213A" }}>
                {s.completed ? <CheckCircle2 size={13} color="#0E8388" /> : <Circle size={13} color="#DAD7CC" />}
                {s.title}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function Plans({ plans, exercises, season, profile, onSave, onDelete, onSetSessionDate, matches, onSaveMatch, adHocSessions, onSaveAdHoc, onDeleteAdHoc, opponents = [], onSaveOpponentRoster, onOpenLiveRecorder, kipMessages, onSaveMessages, pendingCalendarSuggestions = [], onConfirmCalendarSuggestion, onDiscardCalendarSuggestion, onOpenHelp, onOpenTrainingSetup }) {
  const [view, setView] = useState("list"); // "list" | "calendar"
  const [openId, setOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [showBuilder, setShowBuilder] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [logTarget, setLogTarget] = useState(null); // { plan, weekId, sessionId }
  const [dateTarget, setDateTarget] = useState(null); // { plan, weekId, sessionId, current }
  const [adHocFormTarget, setAdHocFormTarget] = useState(null); // { session } | { date } | null-but-open via boolean below
  const [showAdHocForm, setShowAdHocForm] = useState(false);
  const [adHocLogTarget, setAdHocLogTarget] = useState(null); // adHocSession
  const [confirmDeleteAdHoc, setConfirmDeleteAdHoc] = useState(null);
  const [matchFormDate, setMatchFormDate] = useState(null); // date string, non-null means "open match form"
  const [reviewingSuggestion, setReviewingSuggestion] = useState(false);

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

  if (showBuilder) {
    return (
      <Builder
        exercises={exercises}
        season={season}
        profile={profile}
        matches={matches}
        plans={plans}
        adHocSessions={adHocSessions}
        opponents={opponents}
        kipMessages={kipMessages}
        onSaveMessages={onSaveMessages}
        onSave={(plan) => { onSave(plan); setShowBuilder(false); }}
        onBack={() => setShowBuilder(false)}
        onOpenHelp={onOpenHelp}
      />
    );
  }

  const streak = weeklyStreak(plans);
  const next = nextSuggestedSession(plans);
  const trend = rpeTrend(plans);

  return (
    <div className="px-4 pt-4 pb-6 space-y-3">
      {pendingCalendarSuggestions.length > 0 && (
        <button
          onClick={() => setReviewingSuggestion(true)}
          className="w-full flex items-center justify-between rounded-lg border-2 p-3"
          style={{ borderColor: "#0E8388", background: "#fff" }}
        >
          <div className="flex items-center gap-2">
            <Paperclip size={15} color="#0E8388" />
            <span className="text-sm font-bold" style={{ color: "#12213A" }}>
              {pendingCalendarSuggestions.length} forwarded {pendingCalendarSuggestions.length === 1 ? "item" : "items"} to review
            </span>
          </div>
          <ChevronRight size={16} color="#0E8388" />
        </button>
      )}

      <div className="flex rounded-lg overflow-hidden border" style={{ borderColor: "#DAD7CC" }}>
        {[["list", "List"], ["calendar", "Calendar"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className="flex-1 py-2 text-xs font-bold uppercase tracking-wide"
            style={view === id ? { background: "#12213A", color: "#fff" } : { color: "#8A8779" }}
          >
            {label}
          </button>
        ))}
      </div>

      {reviewingSuggestion && (
        <PendingCalendarReviewModal
          suggestions={pendingCalendarSuggestions}
          season={season}
          onClose={() => setReviewingSuggestion(false)}
          onConfirm={onConfirmCalendarSuggestion}
          onDiscard={onDiscardCalendarSuggestion}
        />
      )}

      {view === "calendar" ? (
        <CalendarView
          plans={plans}
          matches={matches}
          adHocSessions={adHocSessions}
          exercises={exercises}
          onLogPlanSession={(plan, weekId, sessionId, focus) => setLogTarget({ plan, weekId, sessionId, focus })}
          onRequestDateChange={(plan, weekId, sessionId, current) => setDateTarget({ plan, weekId, sessionId, current })}
          onAddTraining={(date) => { setAdHocFormTarget({ date }); setShowAdHocForm(true); }}
          onAddGame={(date) => setMatchFormDate(date)}
          onOpenAdHoc={(session) => setAdHocLogTarget(session)}
        />
      ) : (
        <>
      {plans.length === 0 && adHocSessions.length === 0 && (
        <div className="pt-8 text-center">
          <CalendarRange size={32} color="#DAD7CC" className="mx-auto mb-3" />
          <div className="text-sm font-bold" style={{ color: "#12213A" }}>No blocks yet</div>
          <div className="text-xs text-gray-500 mt-1">Tap + New block below to create your first 6-week block, or switch to Calendar to add a one-off session.</div>
        </div>
      )}

      {streak > 0 && (
        <div className="flex items-center gap-1.5 text-xs font-bold" style={{ color: "#12213A" }}>
          <Flame size={14} color="#E2984B" /> {streak}-week streak
        </div>
      )}

      {next ? (
        <div className="rounded-lg border-2 p-3" style={{ borderColor: "#0E8388", background: "#fff" }}>
          <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#0E8388" }}>Today</div>
          <div className="text-sm font-bold mb-0.5" style={{ color: "#12213A" }}>
            {next.plan.name} — Week {next.week.weekNumber}, Session {next.session.sessionNumber}
          </div>
          {next.week.focus && <div className="text-[11px] text-gray-500 mb-1.5">{next.week.focus}</div>}
          <div className="space-y-0.5 mb-2">
            {next.session.exercises.slice(0, 4).map((entry) => {
              const ex = exercises.find((e) => e.id === entry.exerciseId);
              if (!ex) return null;
              return <div key={entry.entryId} className="text-[11px] text-gray-600">{ex.name}</div>;
            })}
            {next.session.exercises.length === 0 && <div className="text-[11px] text-gray-400">No exercises added yet</div>}
          </div>
          <SessionFocusInput
            className="input text-xs mb-2"
            value={next.session.focus || ""}
            onSave={(val) => {
              const nextPlan = {
                ...next.plan,
                weeks: next.plan.weeks.map((ww) => ww.weekId === next.week.weekId
                  ? { ...ww, sessions: ww.sessions.map((ss) => ss.sessionId === next.session.sessionId ? { ...ss, focus: val } : ss) }
                  : ww),
              };
              onSave(nextPlan);
            }}
          />
          <button
            onClick={() => {
              if (next.session.recording) {
                onOpenLiveRecorder({ kind: "plan", planId: next.plan.id, weekId: next.week.weekId, sessionId: next.session.sessionId, focus: next.session.focus });
              } else {
                onOpenTrainingSetup();
              }
            }}
            className="w-full py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2"
            style={{ background: "#0E8388" }}
          >
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#fff" }} /> {next.session.recording ? "Resume recording" : "Record"}
          </button>
          <button
            onClick={() => setLogTarget({ plan: next.plan, weekId: next.week.weekId, sessionId: next.session.sessionId, focus: next.session.focus })}
            className="w-full mt-1.5 py-1.5 rounded-lg text-[11px] font-semibold"
            style={{ color: "#8A8779" }}
          >
            Or log it after the fact
          </button>
          <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.875rem;outline:none;}`}</style>
        </div>
      ) : (
        <div className="bg-white rounded-lg border p-3 text-center" style={{ borderColor: "#DAD7CC" }}>
          <CheckCircle2 size={18} color="#0E8388" className="mx-auto mb-1" />
          <div className="text-xs font-bold" style={{ color: "#12213A" }}>All caught up</div>
          <div className="text-[11px] text-gray-500">Every session in your plans is logged.</div>
        </div>
      )}

      {trend.length > 1 && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1">
            <TrendingUp size={12} /> Training load (RPE) over time
          </div>
          <div className="bg-white rounded-lg border p-2" style={{ borderColor: "#DAD7CC" }}>
            <ResponsiveContainer width="100%" height={140}>
              <LineChart data={trend}>
                <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={40} />
                <YAxis domain={[0, 10]} tick={{ fontSize: 9 }} width={20} />
                <Tooltip />
                <Line type="monotone" dataKey="rpe" stroke="#12213A" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mt-4 mb-1">
        <div className="text-base font-black" style={{ color: "#12213A" }}>Your blocks</div>
        <button
          onClick={() => setShowBuilder(true)}
          className="flex items-center gap-1 text-sm font-bold text-white px-3.5 py-2 rounded-lg active:scale-[0.98] transition-transform"
          style={{ background: "#0E8388" }}
        >
          <Plus size={16} /> New block
        </button>
      </div>

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
                                setLogTarget({ plan: p, weekId: w.weekId, sessionId: s.sessionId, focus: s.focus });
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
                          <button
                            onClick={(e) => { e.stopPropagation(); setDateTarget({ plan: p, weekId: w.weekId, sessionId: s.sessionId, current: s.date || "" }); }}
                            className="flex items-center gap-1 text-[10px] font-semibold mb-1"
                            style={{ color: s.date ? "#0E8388" : "#8A8779" }}
                          >
                            <CalendarRange size={11} />
                            {s.date ? formatShortDate(s.date) : "Set date"}
                          </button>
                          {!s.completed && (
                            <SessionFocusInput
                              value={s.focus || ""}
                              onSave={(val) => {
                                const next = {
                                  ...p,
                                  weeks: p.weeks.map((ww) => ww.weekId === w.weekId
                                    ? { ...ww, sessions: ww.sessions.map((ss) => ss.sessionId === s.sessionId ? { ...ss, focus: val } : ss) }
                                    : ww),
                                };
                                onSave(next);
                              }}
                            />
                          )}
                          {s.completed && s.focus && <div className="pl-5 text-[11px] text-gray-500 mb-1">Focus: <span className="italic">"{s.focus}"</span></div>}
                          {s.completed && s.note && <div className="pl-5 text-[11px] text-gray-500 italic mb-1">"{s.note}"</div>}
                          <div className="pl-5 space-y-0.5">
                            {s.exercises.map((entry) => {
                              const ex = exercises.find((e) => e.id === entry.exerciseId);
                              if (!ex) return null;
                              return (
                                <div key={entry.entryId} className="text-[11px] text-gray-600">
                                  {ex.name}
                                  {ex.source === "physio" && (
                                    <span className="ml-1 text-[8px] font-bold uppercase tracking-wide px-1 py-0.5 rounded" style={{ background: "#FCEFE9", color: "#C1483B" }}>
                                      Physio
                                    </span>
                                  )}
                                  {" "}<span className="text-gray-400">— {repsDisplay(entry)}</span>
                                  {entry.loggedSets && entry.loggedSets.length > 0 && (
                                    <div className="text-[10px] text-gray-400 pl-2">
                                      Logged: {entry.loggedSets.map((set, i) => `${set.weight ?? "–"}kg×${set.reps ?? "–"}`).join(", ")}
                                    </div>
                                  )}
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

      <div className="flex items-center justify-between mt-2">
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">One-off sessions</div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              const session = {
                id: uid(), title: "", notes: "", date: new Date().toISOString().slice(0, 10),
                exerciseIds: [], doneExerciseIds: [], exerciseLogs: {},
                completed: false, rpe: null, note: "", completedAt: null,
                recording: startRecording(),
              };
              onSaveAdHoc(session);
              onOpenLiveRecorder({ kind: "adhoc", sessionId: session.id });
            }}
            className="text-[11px] font-bold flex items-center gap-1"
            style={{ color: "#0E8388" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#0E8388" }} /> Record
          </button>
          <button onClick={() => { setAdHocFormTarget({ date: new Date().toISOString().slice(0, 10) }); setShowAdHocForm(true); }} className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: "#0E8388" }}>
            <Plus size={12} /> Add
          </button>
        </div>
      </div>
      {adHocSessions.length === 0 && <div className="text-[11px] text-gray-400 pb-2">No one-off sessions yet.</div>}
      <div className="space-y-1.5">
        {[...adHocSessions].sort((a, b) => new Date(a.date) - new Date(b.date)).map((s) => (
          <button
            key={s.id}
            onClick={() => (s.recording ? onOpenLiveRecorder({ kind: "adhoc", sessionId: s.id }) : setAdHocLogTarget(s))}
            className="w-full text-left bg-white rounded-lg border p-2.5 flex items-center justify-between"
            style={{ borderColor: s.recording ? "#0E8388" : "#DAD7CC", borderWidth: s.recording ? 2 : 1 }}
          >
            <div className="flex items-center gap-2">
              {s.completed ? <CheckCircle2 size={14} color="#0E8388" /> : <Circle size={14} color="#DAD7CC" />}
              <div>
                <div className="text-xs font-bold" style={{ color: "#12213A" }}>{s.title || "Untitled session"}</div>
                <div className="text-[10px] text-gray-400">
                  {s.recording ? <span style={{ color: "#0E8388" }} className="font-bold">Recording…</span> : formatShortDate(s.date)}
                  {s.completed && s.rpe ? ` · RPE ${s.rpe}` : ""}
                </div>
              </div>
            </div>
            <ChevronRight size={14} color="#DAD7CC" />
          </button>
        ))}
      </div>
      </>
      )}

      {logTarget && (() => {
        const logWeek = logTarget.plan.weeks.find((ww) => ww.weekId === logTarget.weekId);
        const logSession = logWeek?.sessions.find((ss) => ss.sessionId === logTarget.sessionId);
        const gymEntries = (logSession?.exercises || [])
          .map((entry) => ({ entry, ex: exercises.find((e) => e.id === entry.exerciseId) }))
          .filter(({ ex }) => ex && ex.type === "Gym")
          .map(({ entry, ex }) => ({ entryId: entry.entryId, exerciseName: ex.name }));
        return (
          <LogSessionModal
            focus={logTarget.focus}
            gymEntries={gymEntries}
            onClose={() => setLogTarget(null)}
            onSave={({ rpe, note, gymLogs }) => {
              const { plan, weekId, sessionId } = logTarget;
              const next = {
                ...plan,
                weeks: plan.weeks.map((ww) => ww.weekId === weekId
                  ? { ...ww, sessions: ww.sessions.map((ss) => {
                      if (ss.sessionId !== sessionId) return ss;
                      const exercises = ss.exercises.map((entry) =>
                        gymLogs && gymLogs[entry.entryId] ? { ...entry, loggedSets: gymLogs[entry.entryId] } : entry
                      );
                      return { ...ss, completed: true, rpe, note, completedAt: new Date().toISOString(), exercises };
                    }) }
                  : ww),
              };
              onSave(next);
              setLogTarget(null);
            }}
          />
        );
      })()}

      {dateTarget && (
        <Modal onClose={() => setDateTarget(null)}>
          <h3 className="text-base font-black mb-3" style={{ color: "#12213A" }}>Set session date</h3>
          <SetDateForm
            value={dateTarget.current}
            onCancel={() => setDateTarget(null)}
            onSave={(date) => {
              onSetSessionDate(dateTarget.plan.id, dateTarget.weekId, dateTarget.sessionId, date || null);
              setDateTarget(null);
            }}
          />
        </Modal>
      )}

      {showAdHocForm && (
        <AdHocSessionFormModal
          exercises={exercises}
          initialDate={adHocFormTarget?.date}
          onClose={() => { setShowAdHocForm(false); setAdHocFormTarget(null); }}
          onSave={(session) => {
            onSaveAdHoc(session);
            setShowAdHocForm(false);
            setAdHocFormTarget(null);
          }}
        />
      )}

      {adHocLogTarget && (
        <AdHocSessionDetailModal
          session={adHocLogTarget}
          exercises={exercises}
          onClose={() => setAdHocLogTarget(null)}
          onSave={(session) => { onSaveAdHoc(session); setAdHocLogTarget(null); }}
          onDelete={() => { setConfirmDeleteAdHoc(adHocLogTarget.id); }}
        />
      )}

      {confirmDeleteAdHoc && (
        <Modal onClose={() => setConfirmDeleteAdHoc(null)}>
          <h3 className="text-base font-black mb-2">Delete this session?</h3>
          <p className="text-sm text-gray-600 mb-4">This can't be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDeleteAdHoc(null)} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Cancel</button>
            <button onClick={() => { onDeleteAdHoc(confirmDeleteAdHoc); setConfirmDeleteAdHoc(null); setAdHocLogTarget(null); }} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "#C1483B" }}>Delete</button>
          </div>
        </Modal>
      )}

      {matchFormDate && (
        <MatchFormModal
          season={plans[0]?.season || "Winter"}
          matches={matches}
          initialDate={matchFormDate}
          opponents={opponents}
          onSaveOpponentRoster={onSaveOpponentRoster}
          onClose={() => setMatchFormDate(null)}
          onSave={(m) => { onSaveMatch(m); setMatchFormDate(null); }}
        />
      )}
    </div>
  );
}

// Top-level Record tab — the promoted entry point from the brief, sitting
// alongside (not replacing) the contextual Record buttons already in Plans'
// Today card and Stats' header. Both paths call the same onOpenLiveRecorder
// prop lifted to GKTrainerApp, so whichever one is used, the other
// immediately sees it as "in progress" too — one shared source of truth.
// Deliberately thin now — creating anything and starting the clock moved
// out to beginTrainingRecording/beginMatchRecording in GKTrainerApp, only
// reachable via the setup screens below (TrainingSetupScreen/
// MatchSetupScreen). This tab just offers "resume what's already running"
// or "open a setup screen," never starts a recording itself.
function RecordTab({ plans, adHocSessions, matches, onOpenLiveRecorder, onOpenTrainingSetup, onOpenMatchSetup, onOpenHelp }) {
  const active = findActiveRecording({ plans, adHocSessions, matches });

  const resumeLabel = !active ? null
    : active.kind === "match"
      ? `Resume recording — vs ${matches.find((m) => m.id === active.matchId)?.opponent || "match"}`
      : "Resume recording — training";

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-lg font-black" style={{ color: "#12213A" }}>Record</h2>
        {onOpenHelp && <HelpButton onClick={onOpenHelp} />}
      </div>

      {active ? (
        <button
          onClick={() => onOpenLiveRecorder(active)}
          className="w-full py-4 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2"
          style={{ background: "#0E8388" }}
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#fff" }} /> {resumeLabel}
        </button>
      ) : (
        <div className="space-y-3">
          <button onClick={onOpenTrainingSetup} className="w-full text-left bg-white rounded-lg border-2 p-4 flex items-center gap-3" style={{ borderColor: "#0E8388" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#0E8388" }}>
              <span className="w-3 h-3 rounded-full" style={{ background: "#fff" }} />
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: "#12213A" }}>Record training session</div>
              <div className="text-xs text-gray-500 mt-0.5">Your next planned session, or a one-off if nothing's due</div>
            </div>
          </button>
          <button onClick={onOpenMatchSetup} className="w-full text-left bg-white rounded-lg border-2 p-4 flex items-center gap-3" style={{ borderColor: "#0E8388" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#0E8388" }}>
              <span className="w-3 h-3 rounded-full" style={{ background: "#fff" }} />
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: "#12213A" }}>Record match</div>
              <div className="text-xs text-gray-500 mt-0.5">Set the opponent, then track shots live from kickoff</div>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}

// Shown before ANY new recording starts — nothing is created or persisted
// here, only once "Start" is tapped (beginTrainingRecording in
// GKTrainerApp). Mirrors nextSuggestedSession's own auto-pick logic (the
// same "next due, else one-off" choice Plans' Today card already makes) so
// there's one rule for "what session is this," not two that could disagree.
function TrainingSetupScreen({ plans, exercises, onStart, onClose }) {
  const next = nextSuggestedSession(plans);
  const [title, setTitle] = useState("");
  const [focus, setFocus] = useState(next?.session.focus || "");

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "#F3F2ED" }}>
      <div className="px-4 pt-4 pb-3 shrink-0" style={{ background: "#12213A" }}>
        <button onClick={onClose} className="flex items-center gap-1 text-xs font-semibold text-white/70 mb-2">
          <ArrowLeft size={14} /> Cancel
        </button>
        <div className="text-lg font-black text-white">Set up your session</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        {next ? (
          <div className="bg-white rounded-lg border p-3" style={{ borderColor: "#DAD7CC" }}>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#0E8388" }}>Next up</div>
            <div className="text-sm font-bold mb-0.5" style={{ color: "#12213A" }}>
              {next.plan.name} — Week {next.week.weekNumber}, Session {next.session.sessionNumber}
            </div>
            {next.week.focus && <div className="text-[11px] text-gray-500 mb-2">{next.week.focus}</div>}
            <div className="space-y-0.5 mb-3">
              {next.session.exercises.slice(0, 4).map((entry) => {
                const ex = exercises.find((e) => e.id === entry.exerciseId);
                if (!ex) return null;
                return <div key={entry.entryId} className="text-[11px] text-gray-600">{ex.name}</div>;
              })}
              {next.session.exercises.length === 0 && <div className="text-[11px] text-gray-400">No exercises added yet</div>}
            </div>
            <Field label="Focus for this session (optional)">
              <input className="input" placeholder="e.g. early first step" value={focus} onChange={(e) => setFocus(e.target.value)} />
            </Field>
          </div>
        ) : (
          <div className="bg-white rounded-lg border p-3" style={{ borderColor: "#DAD7CC" }}>
            <div className="text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#0E8388" }}>New one-off session</div>
            <p className="text-xs text-gray-500 mb-3">Nothing's due from your blocks right now, so this'll be a standalone session.</p>
            <Field label="Title (optional)">
              <input className="input" placeholder="e.g. Extra reflex work" value={title} onChange={(e) => setTitle(e.target.value)} />
            </Field>
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 border-t bg-white" style={{ borderColor: "#DAD7CC" }}>
        <button
          onClick={() => onStart({ title, focus })}
          className="w-full py-3.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-2"
          style={{ background: "#0E8388" }}
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#fff" }} /> Start
        </button>
      </div>
      <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.875rem;outline:none;}`}</style>
    </div>
  );
}

// Same "nothing created until Start" rule as TrainingSetupScreen, plus this
// is where the teammate connection for THIS match gets made per the
// invite-code mechanism (migration 0005) — not a separate settings flow.
// Redeeming a code here only ever creates/reuses a connection; it can
// never grant recording permission by itself, since that's the teammate's
// own explicit, separate, owner-controlled grant (set_recording_permission
// can only be called by the account being recorded for) — a code entered
// here either matches an already-permitted teammate (immediately usable)
// or starts a request that still needs the other side's own action.
function MatchSetupScreen({ season, matches, opponents, onSaveOpponentRoster, onStart, onClose }) {
  const [form, setForm] = useState({ opponent: "", competition: "", season, videoUrl: "" });
  const [rosterOpen, setRosterOpen] = useState(false);
  const [teammateOptions, setTeammateOptions] = useState([]);
  const [selectedTeammate, setSelectedTeammate] = useState(null);
  const [myCode, setMyCode] = useState(null);
  const [copied, setCopied] = useState(false);
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemStatus, setRedeemStatus] = useState(null);
  const [redeeming, setRedeeming] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        const [code, rows] = await Promise.all([getMyInviteCode(), getMyConnections()]);
        setMyCode(code);
        const { canRecordFor } = summarizeConnections(rows, user?.id);
        setTeammateOptions(canRecordFor.map((c) => partnerOf(c, user?.id)).map((p) => ({ ownerId: p.id, email: p.email })));
      } catch (e) {
        setTeammateOptions([]);
      }
    })();
  }, []);

  function copyMyCode() {
    if (!myCode) return;
    navigator.clipboard?.writeText(myCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleRedeem() {
    if (!redeemInput.trim()) return;
    setRedeeming(true);
    setRedeemStatus(null);
    try {
      const conn = await redeemInviteCode(redeemInput);
      setRedeemInput("");
      setRedeemStatus(
        conn.status === "accepted"
          ? { ok: true, message: "Already connected — once they've granted you recording permission from their own Profile, they'll appear above." }
          : { ok: true, message: "Request sent. They'll need to accept and grant recording permission from their own phone before the switch appears here." }
      );
    } catch (e) {
      setRedeemStatus({
        ok: false,
        message: e.message?.includes("not found") ? "That code doesn't match any account." : e.message?.includes("yourself") ? "That's your own code." : "Couldn't send that request.",
      });
    } finally {
      setRedeeming(false);
    }
  }

  const valid = form.opponent.trim();

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "#F3F2ED" }}>
      <div className="px-4 pt-4 pb-3 shrink-0" style={{ background: "#12213A" }}>
        <button onClick={onClose} className="flex items-center gap-1 text-xs font-semibold text-white/70 mb-2">
          <ArrowLeft size={14} /> Cancel
        </button>
        <div className="text-lg font-black text-white">Set up the match</div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <Field label="Opponent">
          <input className="input" placeholder="e.g. North Shore" value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} />
          <OpponentHistoryNote matches={matches} opponent={form.opponent} roster={findOpponentRoster(opponents, form.opponent)?.roster} onTap={() => setRosterOpen(true)} />
        </Field>
        <Field label="Competition (optional)">
          <input className="input" placeholder="Optional" value={form.competition} onChange={(e) => setForm({ ...form, competition: e.target.value })} />
        </Field>
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

        <div className="bg-white rounded-lg border p-3" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-sm font-bold mb-1.5" style={{ color: "#12213A" }}>Recording with a teammate?</div>
          {teammateOptions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              <button
                onClick={() => setSelectedTeammate(null)}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold border"
                style={!selectedTeammate ? { background: "#12213A", color: "#fff", borderColor: "transparent" } : { borderColor: "#DAD7CC" }}
              >
                Just me
              </button>
              {teammateOptions.map((t) => (
                <button
                  key={t.ownerId}
                  onClick={() => setSelectedTeammate(t)}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold border"
                  style={selectedTeammate?.ownerId === t.ownerId ? { background: "#0E8388", color: "#fff", borderColor: "transparent" } : { borderColor: "#DAD7CC" }}
                >
                  {t.email}
                </button>
              ))}
            </div>
          )}
          <p className="text-xs text-gray-500 mb-2">Not connected yet? Share your code, or enter theirs — mutual consent still applies, so they'll need to accept and grant you recording permission from their own phone.</p>
          <button onClick={copyMyCode} className="w-full text-left rounded-md px-2.5 py-2 text-xs font-mono font-bold tracking-wide mb-1" style={{ background: "#F3F2ED", color: "#12213A" }}>
            {myCode || "…"}
          </button>
          {copied && <div className="text-[10px] font-semibold mb-1.5" style={{ color: "#0E8388" }}>Copied</div>}
          <div className="flex gap-2 mt-1.5">
            <input
              className="flex-1 rounded-md px-2.5 py-2 text-sm border font-mono uppercase"
              style={{ borderColor: "#DAD7CC" }}
              placeholder="Their code"
              value={redeemInput}
              onChange={(e) => { setRedeemInput(e.target.value); setRedeemStatus(null); }}
              maxLength={12}
            />
            <button disabled={!redeemInput.trim() || redeeming} onClick={handleRedeem} className="px-3.5 rounded-md text-xs font-bold text-white disabled:opacity-40" style={{ background: "#0E8388" }}>
              Connect
            </button>
          </div>
          {redeemStatus && <div className="text-[11px] font-semibold mt-1.5" style={{ color: redeemStatus.ok ? "#0E8388" : "#C1483B" }}>{redeemStatus.message}</div>}
        </div>
      </div>

      <div className="shrink-0 px-4 py-3 border-t bg-white" style={{ borderColor: "#DAD7CC" }}>
        <button
          disabled={!valid}
          onClick={() => onStart({ date: new Date().toISOString().slice(0, 10), opponent: form.opponent.trim(), competition: form.competition.trim(), result: "", season: form.season, videoUrl: form.videoUrl }, selectedTeammate)}
          className="w-full py-3.5 rounded-lg text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2"
          style={{ background: "#0E8388" }}
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#fff" }} /> Start
        </button>
      </div>

      {rosterOpen && (
        <OpponentDetailModal
          opponentName={form.opponent}
          opponents={opponents}
          matches={matches}
          onClose={() => setRosterOpen(false)}
          onSaveRoster={(roster) => onSaveOpponentRoster?.(form.opponent, roster)}
        />
      )}
      <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.875rem;outline:none;}`}</style>
    </div>
  );
}

function SetDateForm({ value, onCancel, onSave }) {
  const [date, setDate] = useState(value || "");
  return (
    <div>
      <input type="date" className="input mb-4" value={date} onChange={(e) => setDate(e.target.value)} />
      <div className="flex gap-2">
        {value && (
          <button onClick={() => onSave(null)} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ color: "#C1483B", borderColor: "#C1483B33" }}>
            Clear date
          </button>
        )}
        <button onClick={onCancel} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Cancel</button>
        <button disabled={!date} onClick={() => onSave(date)} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40" style={{ background: "#0E8388" }}>Save</button>
      </div>
      <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.875rem;outline:none;}`}</style>
    </div>
  );
}

// Strong/Hevy-style add-set flow for one gym exercise: reps + weight(kg)
// per set. Only rendered for entries whose exercise is type === "Gym".
function GymSetLogger({ exerciseName, sets, onChange }) {
  function updateSet(i, patch) {
    onChange(sets.map((s, idx) => (idx === i ? { ...s, ...patch } : s)));
  }
  function removeSet(i) {
    onChange(sets.filter((_, idx) => idx !== i));
  }
  function addSet() {
    const last = sets[sets.length - 1];
    onChange([...sets, { reps: last?.reps ?? null, weight: last?.weight ?? null }]);
  }
  return (
    <div className="mb-2.5 p-2.5 rounded-lg border" style={{ borderColor: "#DAD7CC" }}>
      <div className="text-xs font-bold mb-2 flex items-center gap-1.5" style={{ color: "#12213A" }}>
        <Dumbbell size={13} color="#0E8388" /> {exerciseName}
      </div>
      {sets.length > 0 && (
        <div className="grid grid-cols-[20px_1fr_1fr_24px] gap-1.5 mb-1 text-[10px] font-bold uppercase tracking-wide text-gray-400 px-0.5">
          <div>Set</div><div>Weight (kg)</div><div>Reps</div><div></div>
        </div>
      )}
      <div className="space-y-1.5 mb-2">
        {sets.map((set, i) => (
          <div key={i} className="grid grid-cols-[20px_1fr_1fr_24px] gap-1.5 items-center">
            <div className="text-xs font-bold text-gray-400 text-center">{i + 1}</div>
            <input
              type="number"
              inputMode="decimal"
              value={set.weight ?? ""}
              onChange={(e) => updateSet(i, { weight: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="0"
              className="input py-1.5 text-sm text-center"
            />
            <input
              type="number"
              inputMode="numeric"
              value={set.reps ?? ""}
              onChange={(e) => updateSet(i, { reps: e.target.value === "" ? null : Number(e.target.value) })}
              placeholder="0"
              className="input py-1.5 text-sm text-center"
            />
            <button onClick={() => removeSet(i)} className="p-1 text-gray-300">
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
      <button
        onClick={addSet}
        className="w-full py-1.5 rounded-lg text-xs font-bold border flex items-center justify-center gap-1"
        style={{ borderColor: "#0E8388", color: "#0E8388" }}
      >
        <Plus size={12} /> Add set
      </button>
    </div>
  );
}

// Standalone session not tied to any 6-week block. Deliberately lighter
// than a plan session — exercises are plain links for reference, no
// per-set gym logging, since that data has nowhere to feed (progress
// graphs and Kip's gym-performance section only read plan history).
function AdHocSessionFormModal({ exercises, initialDate, onClose, onSave }) {
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState(initialDate || new Date().toISOString().slice(0, 10));
  const [exerciseIds, setExerciseIds] = useState([]);
  const [picker, setPicker] = useState(false);
  const valid = title.trim() && date;

  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-black mb-3" style={{ color: "#12213A" }}>New one-off session</h3>
      <div className="space-y-3">
        <Field label="Title">
          <input className="input" placeholder="e.g. Extra reflex work" value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
        <Field label="Date">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Notes (optional)">
          <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="What's the plan?" />
        </Field>
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Exercises (optional)</div>
            <button onClick={() => setPicker(true)} className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: "#0E8388" }}>
              <Plus size={12} /> Add
            </button>
          </div>
          {exerciseIds.length === 0 && <div className="text-[11px] text-gray-400">None linked</div>}
          <div className="space-y-1">
            {exerciseIds.map((id) => {
              const ex = exercises.find((e) => e.id === id);
              if (!ex) return null;
              return (
                <div key={id} className="flex items-center justify-between bg-white rounded-md px-2 py-1.5 border text-xs" style={{ borderColor: "#DAD7CC" }}>
                  {ex.name}
                  <button onClick={() => setExerciseIds(exerciseIds.filter((x) => x !== id))}><X size={13} color="#C1483B" /></button>
                </div>
              );
            })}
          </div>
        </div>
        <button
          disabled={!valid}
          onClick={() => onSave({ id: uid(), title: title.trim(), notes: notes.trim(), date, exerciseIds, completed: false, rpe: null, note: "", completedAt: null })}
          className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40"
          style={{ background: "#0E8388" }}
        >
          Create session
        </button>
      </div>
      {picker && (
        <ExercisePickerModal
          exercises={exercises}
          onClose={() => setPicker(false)}
          onPick={(ex) => { setExerciseIds([...exerciseIds, ex.id]); setPicker(false); }}
        />
      )}
    </Modal>
  );
}

function AdHocSessionDetailModal({ session, exercises, onClose, onSave, onDelete }) {
  const [logging, setLogging] = useState(false);
  const exerciseLogs = session.exerciseLogs || {};
  const gymEntries = (session.exerciseIds || [])
    .map((id) => exercises.find((e) => e.id === id))
    .filter((ex) => ex && ex.type === "Gym")
    .map((ex) => ({ entryId: ex.id, exerciseName: ex.name }));
  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-black mb-1" style={{ color: "#12213A" }}>{session.title}</h3>
      <div className="text-xs text-gray-500 mb-3">{formatShortDate(session.date)}</div>
      {session.notes && <p className="text-sm text-gray-700 mb-3">{session.notes}</p>}
      {session.exerciseIds && session.exerciseIds.length > 0 && (
        <div className="space-y-1 mb-3">
          {session.exerciseIds.map((id) => {
            const ex = exercises.find((e) => e.id === id);
            if (!ex) return null;
            const sets = exerciseLogs[id];
            return (
              <div key={id} className="text-xs text-gray-600 bg-white rounded-md px-2 py-1.5 border" style={{ borderColor: "#DAD7CC" }}>
                {ex.name}
                {sets && sets.length > 0 && (
                  <div className="text-[10px] text-gray-400 pl-2">
                    Logged: {sets.map((set) => `${set.weight ?? "–"}kg×${set.reps ?? "–"}`).join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {session.completed && (
        <div className="bg-white rounded-lg border p-3 mb-3" style={{ borderColor: "#DAD7CC" }}>
          <div className="flex items-center gap-1.5 text-xs font-bold mb-1" style={{ color: "#0E8388" }}>
            <CheckCircle2 size={14} /> Completed{session.rpe ? ` — RPE ${session.rpe}` : ""}
          </div>
          {session.note && <div className="text-xs text-gray-500 italic">"{session.note}"</div>}
        </div>
      )}
      <div className="flex gap-2">
        {!session.completed ? (
          <button onClick={() => setLogging(true)} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "#0E8388" }}>
            Log this session
          </button>
        ) : (
          <button onClick={() => onSave({ ...session, completed: false })} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>
            Mark incomplete
          </button>
        )}
        <button onClick={onDelete} className="py-2.5 px-3 rounded-lg text-sm font-bold" style={{ color: "#C1483B", border: "1px solid #C1483B33" }}>
          <Trash2 size={14} />
        </button>
      </div>
      {logging && (
        <LogSessionModal
          gymEntries={gymEntries}
          onClose={() => setLogging(false)}
          onSave={({ rpe, note, gymLogs }) => {
            const nextExerciseLogs = { ...exerciseLogs };
            if (gymLogs) Object.entries(gymLogs).forEach(([exerciseId, sets]) => { nextExerciseLogs[exerciseId] = sets; });
            onSave({ ...session, completed: true, rpe, note, completedAt: new Date().toISOString(), exerciseLogs: nextExerciseLogs });
            setLogging(false);
          }}
        />
      )}
    </Modal>
  );
}

// Full-screen live recorder for a training session — either a specific plan
// session (walking its fixed exercise list) or a pure ad-hoc session (adding
// exercises as you go). `recording` lives directly on the session being
// recorded and every action here persists it immediately via onUpdatePatch —
// the same object the rest of the app already saves, not a parallel one —
// so closing or backgrounding the tab never loses progress: reopening just
// finds the same in-progress session and picks up where it left off.
// Chip-only, no text input — "quick-tap, not conversational" per the brief.
// Each chip computes real data client-side from what's already logged (this
// match's own shots so far, or this session's own progress), then makes one
// plain, non-tool callKip request asking Kip to phrase it — same "compute
// then narrate" shape as alerts and reports, not a third pattern. The note
// is ephemeral (not persisted into kipMessages); "open full chat" is the
// escape hatch into the same shared conversation thread if the keeper
// actually wants to talk something through instead of glance at it.
function KipQuickPanel({ kind, doneCount, totalItems, match, opponents = [], profile, season, plans, matches, adHocSessions, exercises, onClose, onOpenKip }) {
  const [loadingChip, setLoadingChip] = useState(null);
  const [note, setNote] = useState(null);
  const [noteError, setNoteError] = useState(null);

  const roster = kind === "match" ? findOpponentRoster(opponents, match.opponent)?.roster : null;

  async function ask(label, dataSummary) {
    setLoadingChip(label);
    setNote(null);
    setNoteError(null);
    try {
      const basePrompt = buildKipSystemPrompt(profile, plans, season, matches, exercises, adHocSessions);
      const prompt = `${basePrompt}\n\nQUICK CHECK-IN:\nThe keeper is mid-${kind === "match" ? "match" : "session"} right now and just tapped a quick prompt rather than typing — they want a glance, not a conversation. Here's the real, already-computed data for it:\n${JSON.stringify(dataSummary)}\n\nRespond with ONE short, specific note — a sentence, maybe two. No greeting, no follow-up question, just the read.`;
      const trigger = { role: "user", content: "(Quick-tap trigger, not a typed message from the keeper.)" };
      const text = await callKip(prompt, [trigger]);
      setNote(text);
    } catch (e) {
      setNoteError("Couldn't get a read just now — check your connection.");
    } finally {
      setLoadingChip(null);
    }
  }

  function halftimeRead() {
    const zones = emptyZoneMap();
    (match.shots || []).forEach((s) => { if (zones[s.zone]) { if (s.outcome === "Save") zones[s.zone].saves++; else zones[s.zone].goals++; } });
    const total = (match.shots || []).length;
    const saves = (match.shots || []).filter((s) => s.outcome === "Save").length;
    ask("Halftime read", {
      opponent: match.opponent,
      shotsFaced: total,
      saves,
      savePct: total > 0 ? Math.round((saves / total) * 100) : null,
      zones: Object.entries(zones).filter(([, z]) => z.saves + z.goals > 0).map(([zone, z]) => ({ zone: ZONE_LABELS[zone], saves: z.saves, goals: z.goals })),
    });
  }

  function dangerousToday() {
    const stats = shooterStats([match], match.opponent, roster).filter((s) => s.total > 0);
    ask("Who's dangerous today", { opponent: match.opponent, shootersFacedSoFar: stats });
  }

  function sessionCheck() {
    ask("How's this going", { doneCount, totalItems, remaining: Math.max(0, totalItems - doneCount) });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40" onClick={onClose}>
      <div className="bg-[#F3F2ED] rounded-t-2xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-1.5">
            <Sparkles size={15} color="#0E8388" />
            <span className="text-sm font-black" style={{ color: "#12213A" }}>Ask Kip</span>
          </div>
          <button onClick={onClose}><X size={18} /></button>
        </div>

        {loadingChip && (
          <div className="rounded-lg px-3 py-2 mb-3 text-sm bg-white border" style={{ borderColor: "#DAD7CC", color: "#8A8779" }}>Reading…</div>
        )}
        {!loadingChip && note && (
          <div className="rounded-lg px-3 py-2 mb-3 text-sm bg-white border" style={{ borderColor: "#DAD7CC", color: "#12213A" }}>{note}</div>
        )}
        {noteError && <div className="text-[11px] mb-2" style={{ color: "#C1483B" }}>{noteError}</div>}

        <div className="flex flex-wrap gap-2 mb-3">
          {kind === "match" ? (
            <>
              <button onClick={halftimeRead} disabled={!!loadingChip} className="px-3 py-1.5 rounded-full text-xs font-semibold border disabled:opacity-40" style={{ borderColor: "#DAD7CC" }}>Halftime read</button>
              {roster && roster.length > 0 && (
                <button onClick={dangerousToday} disabled={!!loadingChip} className="px-3 py-1.5 rounded-full text-xs font-semibold border disabled:opacity-40" style={{ borderColor: "#DAD7CC" }}>Who's dangerous today</button>
              )}
            </>
          ) : (
            <button onClick={sessionCheck} disabled={!!loadingChip} className="px-3 py-1.5 rounded-full text-xs font-semibold border disabled:opacity-40" style={{ borderColor: "#DAD7CC" }}>How's this going</button>
          )}
        </div>
        <button onClick={onOpenKip} className="text-[11px] font-semibold" style={{ color: "#0E8388" }}>Want to actually talk it through? Open full chat</button>
      </div>
    </div>
  );
}

function LiveSessionRecorder({ session, kind, exercises, focus, onUpdatePatch, onFinish, onExit, onDelete, profile, season, plans, matches, adHocSessions, onOpenKip }) {
  const [now, setNow] = useState(Date.now());
  const [picker, setPicker] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [finishing, setFinishing] = useState(false);
  const [confirmDeleting, setConfirmDeleting] = useState(false);
  const [showKipPanel, setShowKipPanel] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const recording = session.recording;
  const isPaused = !!recording?.pausedAt;
  const elapsed = recordingElapsedMs(recording, now);

  const items = kind === "plan"
    ? (session.exercises || []).map((entry) => ({
        key: entry.entryId, exerciseId: entry.exerciseId, reps: repsDisplay(entry),
        done: !!entry.done, loggedSets: entry.loggedSets,
      }))
    : (session.exerciseIds || []).map((id) => ({
        key: id, exerciseId: id, reps: null,
        done: (session.doneExerciseIds || []).includes(id), loggedSets: (session.exerciseLogs || {})[id],
      }));

  const doneCount = items.filter((i) => i.done || (i.loggedSets && i.loggedSets.length > 0)).length;

  function toggleDone(item) {
    if (kind === "plan") {
      onUpdatePatch({ exercises: session.exercises.map((e) => (e.entryId === item.key ? { ...e, done: !e.done } : e)) });
    } else {
      const doneIds = session.doneExerciseIds || [];
      const next = doneIds.includes(item.key) ? doneIds.filter((id) => id !== item.key) : [...doneIds, item.key];
      onUpdatePatch({ doneExerciseIds: next });
    }
  }

  function saveGymSets(item, sets) {
    if (kind === "plan") {
      onUpdatePatch({ exercises: session.exercises.map((e) => (e.entryId === item.key ? { ...e, loggedSets: sets } : e)) });
    } else {
      onUpdatePatch({ exerciseLogs: { ...(session.exerciseLogs || {}), [item.key]: sets } });
    }
  }

  function addAdHocExercise(ex) {
    onUpdatePatch({ exerciseIds: [...(session.exerciseIds || []), ex.id] });
    setPicker(false);
  }

  function removeAdHocExercise(id) {
    onUpdatePatch({
      exerciseIds: (session.exerciseIds || []).filter((x) => x !== id),
      doneExerciseIds: (session.doneExerciseIds || []).filter((x) => x !== id),
    });
  }

  const gymEntries = items
    .map((item) => ({ item, ex: exercises.find((e) => e.id === item.exerciseId) }))
    .filter(({ ex }) => ex && ex.type === "Gym")
    .map(({ item, ex }) => ({ entryId: item.key, exerciseName: ex.name }));

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "#F3F2ED" }}>
      <div className="px-4 pt-4 pb-3 shrink-0" style={{ background: "#12213A" }}>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onExit} className="flex items-center gap-1 text-xs font-semibold text-white/70">
            <ChevronDown size={14} /> Minimize
          </button>
          <button onClick={() => setShowKipPanel(true)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#0E8388" }}>
            <Sparkles size={13} /> Ask Kip
          </button>
          <button onClick={() => setConfirmDeleting(true)} className="ml-auto flex items-center gap-1 text-xs font-semibold text-white/70">
            <Trash2 size={13} /> Delete
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Recording</div>
            <div className="text-lg font-black text-white">{kind === "plan" ? "Training session" : (session.title || "One-off session")}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black tabular-nums" style={{ color: isPaused ? "#E2984B" : "#0E8388" }}>{formatElapsed(elapsed)}</div>
            {isPaused && <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#E2984B" }}>Paused</div>}
          </div>
        </div>
        <div className="flex items-center gap-3 mt-2 text-[11px] text-white/70">
          <span>{doneCount}/{items.length} exercises done</span>
          {focus && <span>· "{focus}"</span>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {items.map((item) => {
          const ex = exercises.find((e) => e.id === item.exerciseId);
          if (!ex) return null;
          const isGym = ex.type === "Gym";
          const expanded = expandedId === item.key;
          const hasLogged = item.loggedSets && item.loggedSets.length > 0;
          return (
            <div key={item.key} className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DAD7CC" }}>
              <button
                onClick={() => (isGym ? setExpandedId(expanded ? null : item.key) : toggleDone(item))}
                className="w-full p-3 flex items-center gap-2.5 text-left"
              >
                {(item.done || hasLogged) ? <CheckCircle2 size={18} color="#0E8388" className="shrink-0" /> : <Circle size={18} color="#DAD7CC" className="shrink-0" />}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div className="text-sm font-semibold" style={{ color: "#12213A" }}>{ex.name}</div>
                    {ex.source === "physio" && (
                      <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0" style={{ background: "#FCEFE9", color: "#C1483B" }}>
                        Physio
                      </span>
                    )}
                  </div>
                  {item.reps && <div className="text-[11px] text-gray-400">{item.reps}</div>}
                  {hasLogged && (
                    <div className="text-[10px] text-gray-400">
                      {item.loggedSets.map((s, i) => `${s.weight ?? "–"}kg×${s.reps ?? "–"}`).join(", ")}
                    </div>
                  )}
                </div>
                {isGym && (expanded ? <ChevronDown size={16} className="rotate-180 transition-transform" /> : <ChevronRight size={16} color="#DAD7CC" />)}
                {kind === "adhoc" && !isGym && (
                  <span onClick={(e) => { e.stopPropagation(); removeAdHocExercise(item.key); }} className="p-1">
                    <X size={13} color="#C1483B" />
                  </span>
                )}
              </button>
              {isGym && expanded && (
                <div className="px-3 pb-3">
                  <GymSetLogger exerciseName={ex.name} sets={item.loggedSets || []} onChange={(sets) => saveGymSets(item, sets)} />
                </div>
              )}
            </div>
          );
        })}
        {items.length === 0 && <div className="text-center text-sm text-gray-400 py-8">No exercises yet.</div>}

        {kind === "adhoc" && (
          <button onClick={() => setPicker(true)} className="w-full py-2.5 rounded-lg text-sm font-bold border flex items-center justify-center gap-1.5" style={{ borderColor: "#0E8388", color: "#0E8388" }}>
            <Plus size={14} /> Add exercise
          </button>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 border-t bg-white flex gap-2" style={{ borderColor: "#DAD7CC" }}>
        <button
          onClick={() => onUpdatePatch({ recording: isPaused ? resumeRecording(recording) : pauseRecording(recording) })}
          className="flex-1 py-3 rounded-lg text-sm font-bold border"
          style={{ borderColor: "#DAD7CC", color: "#12213A" }}
        >
          {isPaused ? "Resume" : "Pause"}
        </button>
        <button onClick={() => setFinishing(true)} className="flex-1 py-3 rounded-lg text-sm font-bold text-white" style={{ background: "#0E8388" }}>
          Finish
        </button>
      </div>

      {picker && <ExercisePickerModal exercises={exercises} onClose={() => setPicker(false)} onPick={addAdHocExercise} />}

      {showKipPanel && (
        <KipQuickPanel
          kind="training"
          doneCount={doneCount}
          totalItems={items.length}
          profile={profile}
          season={season}
          plans={plans}
          matches={matches}
          adHocSessions={adHocSessions}
          exercises={exercises}
          onClose={() => setShowKipPanel(false)}
          onOpenKip={onOpenKip}
        />
      )}

      {confirmDeleting && (
        <Modal onClose={() => setConfirmDeleting(false)}>
          <h3 className="text-base font-black mb-2" style={{ color: "#12213A" }}>
            {kind === "plan" ? "Cancel this recording?" : "Delete this session?"}
          </h3>
          <p className="text-sm text-gray-600 mb-4">
            {kind === "plan"
              ? "This session stays in your block — only the recording and anything logged during it will be cleared."
              : "This session was created for this recording, so deleting it removes it completely. This can't be undone."}
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDeleting(false)} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Keep it</button>
            <button onClick={onDelete} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "#C1483B" }}>
              {kind === "plan" ? "Cancel recording" : "Delete"}
            </button>
          </div>
        </Modal>
      )}

      {finishing && (
        <LogSessionModal
          focus={focus}
          gymEntries={gymEntries}
          onClose={() => setFinishing(false)}
          onSave={({ rpe, note, gymLogs }) => {
            const durationMinutes = recordingElapsedMinutes(recording);
            if (kind === "plan") {
              const exercisesNext = session.exercises.map((entry) =>
                gymLogs && gymLogs[entry.entryId] ? { ...entry, loggedSets: gymLogs[entry.entryId] } : entry
              );
              onFinish({ rpe, note, durationMinutes, exercises: exercisesNext });
            } else {
              const nextExerciseLogs = { ...(session.exerciseLogs || {}) };
              if (gymLogs) Object.entries(gymLogs).forEach(([exerciseId, sets]) => { nextExerciseLogs[exerciseId] = sets; });
              onFinish({ rpe, note, durationMinutes, exerciseLogs: nextExerciseLogs });
            }
          }}
        />
      )}
    </div>
  );
}

function LogSessionModal({ onClose, onSave, focus, gymEntries = [] }) {
  const [rpe, setRpe] = useState(null);
  const [note, setNote] = useState("");
  const [gymLogs, setGymLogs] = useState(() => Object.fromEntries(gymEntries.map((g) => [g.entryId, []])));

  function cleanedGymLogs() {
    return Object.fromEntries(
      Object.entries(gymLogs)
        .map(([id, sets]) => [id, sets.filter((s) => s.reps != null || s.weight != null)])
        .filter(([, sets]) => sets.length > 0)
    );
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-black mb-1" style={{ color: "#12213A" }}>Log this session</h3>
      <p className="text-xs text-gray-500 mb-3">Optional — but it's what Kip uses to adjust your next sessions.</p>
      {focus && (
        <div className="mb-3 p-2.5 rounded-lg text-xs" style={{ background: "#F3F2ED" }}>
          <span className="block text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-0.5">Your focus was</span>
          <span style={{ color: "#12213A" }}>"{focus}"</span>
        </div>
      )}
      {gymEntries.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Log your sets</div>
          {gymEntries.map((g) => (
            <GymSetLogger
              key={g.entryId}
              exerciseName={g.exerciseName}
              sets={gymLogs[g.entryId] || []}
              onChange={(sets) => setGymLogs((prev) => ({ ...prev, [g.entryId]: sets }))}
            />
          ))}
        </div>
      )}
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
        <button onClick={() => onSave({ rpe: null, note: "", gymLogs: {} })} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Skip</button>
        <button onClick={() => onSave({ rpe, note, gymLogs: cleanedGymLogs() })} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white flex items-center justify-center gap-1.5" style={{ background: "#0E8388" }}>
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

function KipTab({ profile, onSaveProfile, messages, onSaveMessages, plans, season, matches, exercises, adHocSessions, opponents, onSavePlan, onApplyPtPlan, onOpenProfile }) {
  const [editing, setEditing] = useState(!profile.onboarded);

  if (editing) {
    return (
      <KipOnboarding
        profile={profile}
        onSave={(p) => { onSaveProfile(p); setEditing(false); }}
        onCancel={profile.onboarded ? () => setEditing(false) : null}
        onSaveProfile={onSaveProfile}
        exercises={exercises}
        plans={plans}
        onApplyPtPlan={onApplyPtPlan}
      />
    );
  }

  return (
    <KipChat
      profile={profile}
      onSaveProfile={onSaveProfile}
      messages={messages}
      onSaveMessages={onSaveMessages}
      plans={plans}
      season={season}
      matches={matches}
      exercises={exercises}
      adHocSessions={adHocSessions}
      opponents={opponents}
      onSavePlan={onSavePlan}
      onOpenProfile={onOpenProfile}
    />
  );
}

function NiggleDetailModal({ niggle, exercises, plans, onClose, onSave, onApplyPtPlan }) {
  const [addingLog, setAddingLog] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logNote, setLogNote] = useState("");
  const [logExerciseIds, setLogExerciseIds] = useState([]);
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [extractingFile, setExtractingFile] = useState(null); // raw File, once uploaded, while it's read for a physio plan
  const fileInputRef = React.useRef(null);

  const rehabLog = niggle.rehabLog || [];
  const files = niggle.files || [];

  function addLogEntry() {
    if (!logNote.trim()) return;
    const entry = { id: uid(), date: logDate, note: logNote.trim(), exerciseIds: logExerciseIds };
    onSave({ ...niggle, rehabLog: [...rehabLog, entry] });
    setLogNote("");
    setLogExerciseIds([]);
    setAddingLog(false);
  }

  function removeLogEntry(id) {
    onSave({ ...niggle, rehabLog: rehabLog.filter((e) => e.id !== id) });
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFileError(null);
    try {
      const meta = await uploadNiggleFile(niggle.id, file);
      onSave({ ...niggle, files: [...files, meta] });
      setExtractingFile(file);
    } catch (err) {
      setFileError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function viewFile(path) {
    try {
      const url = await getSignedNiggleFileUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch (err) {
      setFileError("Couldn't open file");
    }
  }

  async function removeFile(f) {
    try {
      await deleteNiggleFile(f.path);
      onSave({ ...niggle, files: files.filter((x) => x.path !== f.path) });
    } catch (err) {
      setFileError("Couldn't delete file");
    }
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-black mb-1" style={{ color: "#12213A" }}>{niggle.part || "Niggle"}</h3>
      <div className="text-xs text-gray-500 mb-4">{niggle.severity} · {niggle.clearedByPhysio ? "Cleared by physio" : "Not yet cleared"}</div>

      <div className="mb-5">
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">PT / physio files</div>
        <div className="space-y-1.5 mb-2">
          {files.map((f) => (
            <div key={f.path} className="flex items-center justify-between bg-white rounded-md px-2.5 py-2 border text-xs" style={{ borderColor: "#DAD7CC" }}>
              <button onClick={() => viewFile(f.path)} className="flex items-center gap-1.5 flex-1 min-w-0 text-left" style={{ color: "#0E8388" }}>
                <Paperclip size={12} className="shrink-0" />
                <span className="truncate font-semibold">{f.name}</span>
              </button>
              <button onClick={() => removeFile(f)}><X size={13} color="#C1483B" /></button>
            </div>
          ))}
          {files.length === 0 && <div className="text-[11px] text-gray-400">No files attached.</div>}
        </div>
        <label className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border cursor-pointer" style={{ borderColor: "#0E8388", color: "#0E8388" }}>
          <Upload size={13} /> {uploading ? "Uploading…" : "Upload PDF or image"}
          <input ref={fileInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
        </label>
        {fileError && <div className="text-[11px] mt-1" style={{ color: "#C1483B" }}>{fileError}</div>}
        <p className="text-[10px] text-gray-400 mt-1.5">Stored privately — only you can access these. A PDF or image gets read automatically for exercises you can review and add to a block; nothing is scheduled without your confirmation.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400">Rehab log</div>
          <button onClick={() => setAddingLog(!addingLog)} className="text-[11px] font-bold flex items-center gap-0.5" style={{ color: "#0E8388" }}>
            <Plus size={12} /> Add entry
          </button>
        </div>
        {addingLog && (
          <div className="bg-white rounded-lg border p-2.5 mb-2" style={{ borderColor: "#DAD7CC" }}>
            <input type="date" className="input mb-2 text-xs" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
            <textarea className="input text-xs mb-2" rows={2} placeholder="How's it feeling? What did you do today?" value={logNote} onChange={(e) => setLogNote(e.target.value)} />
            <div className="mb-2">
              <div className="flex items-center justify-between mb-1">
                <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400">Exercises done (optional)</div>
                <button onClick={() => setPicker(true)} className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: "#0E8388" }}>
                  <Plus size={10} /> Add
                </button>
              </div>
              {logExerciseIds.length > 0 && (
                <div className="space-y-1">
                  {logExerciseIds.map((id) => {
                    const ex = exercises.find((e) => e.id === id);
                    if (!ex) return null;
                    return (
                      <div key={id} className="flex items-center justify-between bg-white rounded-md px-2 py-1 border text-[11px]" style={{ borderColor: "#DAD7CC" }}>
                        {ex.name}
                        <button onClick={() => setLogExerciseIds(logExerciseIds.filter((x) => x !== id))}><X size={11} color="#C1483B" /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            <button disabled={!logNote.trim()} onClick={addLogEntry} className="w-full py-2 rounded-lg text-xs font-bold text-white disabled:opacity-40" style={{ background: "#0E8388" }}>Save entry</button>
          </div>
        )}
        <div className="space-y-1.5">
          {[...rehabLog].sort((a, b) => new Date(b.date) - new Date(a.date)).map((entry) => (
            <div key={entry.id} className="bg-white rounded-md px-2.5 py-2 border" style={{ borderColor: "#DAD7CC" }}>
              <div className="flex items-center justify-between mb-0.5">
                <div className="text-[11px] font-bold" style={{ color: "#12213A" }}>{formatShortDate(entry.date)}</div>
                <button onClick={() => removeLogEntry(entry.id)}><X size={12} color="#C1483B" /></button>
              </div>
              <div className="text-xs text-gray-600">{entry.note}</div>
              {entry.exerciseIds && entry.exerciseIds.length > 0 && (
                <div className="text-[10px] text-gray-400 mt-0.5">
                  {entry.exerciseIds.map((id) => exercises.find((e) => e.id === id)?.name).filter(Boolean).join(", ")}
                </div>
              )}
            </div>
          ))}
          {rehabLog.length === 0 && <div className="text-[11px] text-gray-400">No entries yet.</div>}
        </div>
      </div>

      {picker && (
        <ExercisePickerModal
          exercises={exercises}
          onClose={() => setPicker(false)}
          onPick={(ex) => { setLogExerciseIds([...logExerciseIds, ex.id]); setPicker(false); }}
        />
      )}

      {extractingFile && (
        <PtPlanReviewModal
          file={extractingFile}
          plans={plans}
          onClose={() => setExtractingFile(null)}
          onConfirmed={(payload) => {
            onApplyPtPlan({ ...payload, sourceNiggleId: niggle.id });
            setExtractingFile(null);
          }}
        />
      )}
      <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.875rem;outline:none;}`}</style>
    </Modal>
  );
}

// One item at a time, not a bulk list — a forwarded email is a single
// event, unlike the season-schedule bulk upload's per-row-deselect list.
// Never writes a Match or AdHocSession directly; onConfirm hands the
// reviewed, keeper-edited fields back up so the actual create happens
// through the app's existing saveMatch/saveAdHocSession paths, same as if
// the keeper had filled the form in by hand.
function PendingCalendarReviewModal({ suggestions, season, onClose, onConfirm, onDiscard }) {
  const [index, setIndex] = useState(0);
  const current = suggestions[index];
  const [kind, setKind] = useState(current?.suggestedKind || "match");
  const [title, setTitle] = useState(current ? current.title.replace(/^\s*vs?\.?\s+/i, "") : "");
  const [date, setDate] = useState(current?.date || "");
  const [location, setLocation] = useState(current?.location || "");

  useEffect(() => {
    if (!current) return;
    setKind(current.suggestedKind || "match");
    setTitle(current.title.replace(/^\s*vs?\.?\s+/i, ""));
    setDate(current.date || "");
    setLocation(current.location || "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id]);

  if (!current) {
    onClose();
    return null;
  }

  function advance() {
    if (index + 1 < suggestions.length) setIndex(index + 1);
    else onClose();
  }

  function confirm() {
    onConfirm(current, { kind, title: title.trim(), date, location: location.trim() });
    advance();
  }

  function discard() {
    onDiscard(current.id);
    advance();
  }

  const valid = title.trim() && date;

  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-black mb-1" style={{ color: "#12213A" }}>Review forwarded item</h3>
      <p className="text-xs text-gray-500 mb-3">
        From "{current.emailSubject || "forwarded email"}" — {current.source === "ics" ? "read from the calendar invite" : "read from the email text"}. Check this matches before adding it.
        {suggestions.length > 1 && ` (${index + 1} of ${suggestions.length})`}
      </p>
      <div className="space-y-3">
        <Field label="Is this a match or training session?">
          <div className="flex gap-2">
            {["match", "training"].map((k) => (
              <button key={k} onClick={() => setKind(k)} className="flex-1 py-2 rounded-lg text-xs font-bold border capitalize" style={kind === k ? { background: "#12213A", color: "#fff", borderColor: "#12213A" } : { borderColor: "#DAD7CC" }}>
                {k === "match" ? "Match" : "Training"}
              </button>
            ))}
          </div>
        </Field>
        <Field label={kind === "match" ? "Opponent" : "Title"}>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder={kind === "match" ? "e.g. North Shore" : "e.g. Training session"} />
        </Field>
        <Field label="Date">
          <input type="date" className="input" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Location (optional)">
          <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
        </Field>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={discard} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Discard</button>
        <button disabled={!valid} onClick={confirm} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40" style={{ background: "#0E8388" }}>
          {kind === "match" ? "Add match" : "Add session"}
        </button>
      </div>
      <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.875rem;outline:none;}`}</style>
    </Modal>
  );
}

// Bulk sibling of PendingCalendarReviewModal — same "read it, show it,
// never commit silently" discipline, but a whole fixture list at once
// rather than one event. The brief's explicit requirement is "let the
// keeper deselect any that got misread rather than accept-all-or-
// reject-all," so every row starts checked and can be individually
// unchecked or edited, never an all-or-nothing accept. The file itself is
// read directly in the browser and never uploaded to storage — unlike a PT
// plan, there's no reason to keep a season schedule file around after its
// fixtures have been reviewed and added.
function ScheduleReviewModal({ file, season, onClose, onConfirmed }) {
  const [status, setStatus] = useState("loading"); // loading | ready | failed
  const [rows, setRows] = useState([]);
  const [reason, setReason] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const result = await extractScheduleFromFile(file);
        if (result.looksLikeSchedule && result.fixtures.length > 0) {
          setRows(result.fixtures.map((f) => ({
            id: uid(),
            selected: true,
            date: f.date || "",
            opponent: f.opponent || "",
            competition: f.competition || "",
          })));
          setStatus("ready");
        } else {
          setReason(result.reason || "This didn't look like a fixture list Kip could read confidently.");
          setStatus("failed");
        }
      } catch (e) {
        setReason("Couldn't read this file automatically.");
        setStatus("failed");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateRow(id, patch) {
    setRows(rows.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  const selectedCount = rows.filter((r) => r.selected && r.date && r.opponent.trim()).length;

  function confirm() {
    const matches = rows
      .filter((r) => r.selected && r.date && r.opponent.trim())
      .map((r) => ({ id: uid(), date: r.date, opponent: r.opponent.trim(), competition: r.competition.trim(), result: "", season, videoUrl: "", shots: [] }));
    onConfirmed(matches);
  }

  return (
    <Modal onClose={onClose}>
      {status === "loading" && (
        <div className="py-8 text-center">
          <div className="text-sm font-bold mb-1" style={{ color: "#12213A" }}>Reading your schedule with Kip…</div>
          <div className="text-xs text-gray-500">This can take a few seconds.</div>
        </div>
      )}

      {status === "failed" && (
        <div>
          <h3 className="text-base font-black mb-1" style={{ color: "#12213A" }}>Couldn't read this automatically</h3>
          <p className="text-sm text-gray-600 mb-4">{reason}</p>
          <button onClick={onClose} className="w-full py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Close</button>
        </div>
      )}

      {status === "ready" && (
        <div>
          <h3 className="text-base font-black mb-1" style={{ color: "#12213A" }}>Review the fixtures</h3>
          <p className="text-xs text-gray-500 mb-3">Found {rows.length} — uncheck any that got misread, or fix a date/name directly. Nothing's added until you confirm.</p>
          <div className="space-y-2 mb-3 max-h-96 overflow-y-auto">
            {rows.map((r) => (
              <div key={r.id} className="bg-white rounded-lg border p-2.5 flex gap-2" style={{ borderColor: r.selected ? "#0E8388" : "#DAD7CC" }}>
                <button onClick={() => updateRow(r.id, { selected: !r.selected })} className="shrink-0 pt-1">
                  {r.selected ? <CheckCircle2 size={18} color="#0E8388" /> : <Circle size={18} color="#DAD7CC" />}
                </button>
                <div className="flex-1 min-w-0 space-y-1.5">
                  <input className="input" placeholder="Opponent" value={r.opponent} onChange={(e) => updateRow(r.id, { opponent: e.target.value })} />
                  <div className="flex gap-1.5">
                    <input type="date" className="input flex-1" value={r.date} onChange={(e) => updateRow(r.id, { date: e.target.value })} />
                    <input className="input flex-1" placeholder="Competition (optional)" value={r.competition} onChange={(e) => updateRow(r.id, { competition: e.target.value })} />
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button disabled={selectedCount === 0} onClick={confirm} className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40" style={{ background: "#0E8388" }}>
            Add {selectedCount} {selectedCount === 1 ? "match" : "matches"}
          </button>
          <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.5rem 0.6rem;font-size:0.8rem;outline:none;}`}</style>
        </div>
      )}
    </Modal>
  );
}

// Extraction runs automatically on mount (the file was already uploaded by
// the caller) with a visible loading state — never silent. Nothing is
// committed to a block until the keeper reviews, edits, and confirms; a
// failed or low-confidence read falls back to the exact same review UI
// started empty, rather than forcing a bad extraction through.
function PtPlanReviewModal({ file, plans, onClose, onConfirmed }) {
  const eligiblePlans = plans.filter((p) => p.weeks.some((w) => w.sessions.some((s) => !s.completed)));
  const [status, setStatus] = useState("loading"); // loading | ready | failed
  const [items, setItems] = useState([]);
  const [reason, setReason] = useState(null);
  const [stage, setStage] = useState("review"); // review | destination
  const [destination, setDestination] = useState(eligiblePlans.length > 0 ? "current" : "new");
  const [targetPlanId, setTargetPlanId] = useState(eligiblePlans[0]?.id || null);
  const [blockName, setBlockName] = useState("Rehab Plan");
  const [weeks, setWeeks] = useState(4);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);

  useEffect(() => {
    (async () => {
      try {
        const result = await extractPtPlanFromFile(file);
        if (result.looksLikePlan && result.exercises.length > 0) {
          setItems(result.exercises.map((e) => ({ name: e.name || "", prescription: e.prescription || "", notes: e.notes || "" })));
          setStatus("ready");
        } else {
          setReason(result.reason || "This didn't look like a structured exercise plan Kip could read confidently.");
          setStatus("failed");
        }
      } catch (e) {
        setReason("Couldn't read this file automatically — you can still enter the exercises yourself.");
        setStatus("failed");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function updateItem(i, patch) {
    setItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function removeItem(i) {
    setItems(items.filter((_, idx) => idx !== i));
  }
  function addItem() {
    setItems([...items, { name: "", prescription: "", notes: "" }]);
  }

  function confirm() {
    const cleanItems = items
      .filter((it) => it.name.trim())
      .map((it) => ({ name: it.name.trim(), prescription: it.prescription.trim(), notes: it.notes.trim() }));
    onConfirmed({
      items: cleanItems,
      destination,
      targetPlanId: destination === "current" ? targetPlanId : null,
      blockConfig: destination === "new" ? { name: blockName.trim() || "Rehab Plan", weeks, sessionsPerWeek } : null,
    });
  }

  return (
    <Modal onClose={onClose}>
      {status === "loading" && (
        <div className="py-8 text-center">
          <div className="text-sm font-bold mb-1" style={{ color: "#12213A" }}>Reading your plan with Kip…</div>
          <div className="text-xs text-gray-500">This can take a few seconds.</div>
        </div>
      )}

      {status === "failed" && (
        <div>
          <h3 className="text-base font-black mb-1" style={{ color: "#12213A" }}>Couldn't read this automatically</h3>
          <p className="text-sm text-gray-600 mb-4">{reason}</p>
          <div className="flex gap-2">
            <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Just keep the file</button>
            <button onClick={() => setStatus("ready")} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "#0E8388" }}>Enter manually</button>
          </div>
        </div>
      )}

      {status === "ready" && stage === "review" && (
        <div>
          <h3 className="text-base font-black mb-1" style={{ color: "#12213A" }}>Review the exercises</h3>
          <p className="text-xs text-gray-500 mb-3">Nothing is added to a block until you confirm below — check these match what's actually on the page, and edit anything that's wrong.</p>
          <div className="space-y-2 mb-3 max-h-80 overflow-y-auto">
            {items.map((it, i) => (
              <div key={i} className="bg-white rounded-lg border p-2.5" style={{ borderColor: "#DAD7CC" }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <input className="input flex-1" placeholder="Exercise name" value={it.name} onChange={(e) => updateItem(i, { name: e.target.value })} />
                  <button onClick={() => removeItem(i)}><X size={14} color="#C1483B" /></button>
                </div>
                <input className="input mb-1.5 text-xs" placeholder="Sets/reps or duration, e.g. 3 x 15" value={it.prescription} onChange={(e) => updateItem(i, { prescription: e.target.value })} />
                <textarea className="input text-xs" rows={2} placeholder="Notes from the physio (optional)" value={it.notes} onChange={(e) => updateItem(i, { notes: e.target.value })} />
              </div>
            ))}
            {items.length === 0 && <div className="text-xs text-gray-400 text-center py-3">No exercises yet — add one below.</div>}
          </div>
          <button onClick={addItem} className="w-full py-2 rounded-lg text-xs font-bold border mb-3" style={{ borderColor: "#0E8388", color: "#0E8388" }}>+ Add exercise</button>
          <button disabled={items.filter((it) => it.name.trim()).length === 0} onClick={() => setStage("destination")} className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40" style={{ background: "#0E8388" }}>
            Continue
          </button>
        </div>
      )}

      {status === "ready" && stage === "destination" && (
        <div>
          <h3 className="text-base font-black mb-3" style={{ color: "#12213A" }}>Add to a block</h3>

          <div className="space-y-2 mb-4">
            <button onClick={() => setDestination("current")} disabled={eligiblePlans.length === 0} className="w-full text-left bg-white rounded-lg border p-3 disabled:opacity-40" style={{ borderColor: destination === "current" ? "#0E8388" : "#DAD7CC", borderWidth: destination === "current" ? 2 : 1 }}>
              <div className="font-bold text-sm" style={{ color: "#12213A" }}>Add to current block</div>
              <div className="text-xs text-gray-500">{eligiblePlans.length === 0 ? "No active block to add to" : "Adds a new session to an existing block"}</div>
            </button>
            <button onClick={() => setDestination("new")} className="w-full text-left bg-white rounded-lg border p-3" style={{ borderColor: destination === "new" ? "#0E8388" : "#DAD7CC", borderWidth: destination === "new" ? 2 : 1 }}>
              <div className="font-bold text-sm" style={{ color: "#12213A" }}>Create a new Rehab block</div>
              <div className="text-xs text-gray-500">A dedicated block just for this plan</div>
            </button>
          </div>

          {destination === "current" && eligiblePlans.length > 0 && (
            <Field label="Which block?">
              <select className="input" value={targetPlanId || ""} onChange={(e) => setTargetPlanId(e.target.value)}>
                {eligiblePlans.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </Field>
          )}

          {destination === "new" && (
            <div className="space-y-3">
              <Field label="Block name">
                <input className="input" value={blockName} onChange={(e) => setBlockName(e.target.value)} />
              </Field>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Length (weeks)</div>
                <div className="flex gap-2">
                  {[2, 4, 6].map((n) => (
                    <button key={n} onClick={() => setWeeks(n)} className="flex-1 py-2 rounded-lg text-sm font-bold border" style={n === weeks ? { background: "#12213A", color: "#fff", borderColor: "#12213A" } : { borderColor: "#DAD7CC" }}>{n}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Sessions per week</div>
                <div className="flex gap-2">
                  {[2, 3, 4, 5].map((n) => (
                    <button key={n} onClick={() => setSessionsPerWeek(n)} className="flex-1 py-2 rounded-lg text-sm font-bold border" style={n === sessionsPerWeek ? { background: "#12213A", color: "#fff", borderColor: "#12213A" } : { borderColor: "#DAD7CC" }}>{n}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button onClick={() => setStage("review")} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Back</button>
            <button
              disabled={destination === "current" && !targetPlanId}
              onClick={confirm}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40"
              style={{ background: "#0E8388" }}
            >
              Add exercises
            </button>
          </div>
        </div>
      )}
      <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.875rem;outline:none;}`}</style>
    </Modal>
  );
}

// Aggregates every uploaded file — niggle-linked and general — into one flat,
// most-recent-first list, and offers the same upload action (with an
// optional niggle-or-general picker) directly from here rather than only
// from inside a niggle's own detail view. Reuses PtPlanReviewModal/
// extractPtPlanFromFile so there's one extraction path, not a second one
// duplicated for this screen.
function UploadsScreen({ profile, onSaveProfile, generalUploads, onAddGeneralUpload, onRemoveGeneralUpload, plans, onApplyPtPlan, season, onBulkAddMatches, onBack }) {
  const niggles = profile.niggles || [];
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [linkTo, setLinkTo] = useState("general");
  const [extracting, setExtracting] = useState(null); // { file, sourceNiggleId }
  const [extractingSchedule, setExtractingSchedule] = useState(null); // raw File
  const fileInputRef = React.useRef(null);
  const scheduleInputRef = React.useRef(null);

  const rows = [
    ...niggles.flatMap((n) => (n.files || []).map((f) => ({ ...f, tag: n.part || "Niggle", niggleId: n.id }))),
    ...generalUploads.map((f) => ({ ...f, tag: "General", niggleId: null })),
  ].sort((a, b) => new Date(b.uploadedAt) - new Date(a.uploadedAt));

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setFileError(null);
    try {
      if (linkTo === "general") {
        const meta = await uploadGeneralFile(file);
        onAddGeneralUpload(meta);
        setExtracting({ file, sourceNiggleId: null });
      } else {
        const niggle = niggles.find((n) => n.id === linkTo);
        const meta = await uploadNiggleFile(niggle.id, file);
        onSaveProfile({ ...profile, niggles: niggles.map((n) => (n.id === niggle.id ? { ...n, files: [...(n.files || []), meta] } : n)) });
        setExtracting({ file, sourceNiggleId: niggle.id });
      }
    } catch (err) {
      setFileError(err.message || "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function viewFile(path) {
    try {
      const url = await getSignedNiggleFileUrl(path);
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      setFileError("Couldn't open file");
    }
  }

  async function removeFile(row) {
    try {
      await deleteNiggleFile(row.path);
      if (row.niggleId) {
        onSaveProfile({ ...profile, niggles: niggles.map((n) => (n.id === row.niggleId ? { ...n, files: (n.files || []).filter((f) => f.path !== row.path) } : n)) });
      } else {
        onRemoveGeneralUpload(row.path);
      }
    } catch {
      setFileError("Couldn't delete file");
    }
  }

  return (
    <div className="px-4 pt-4 pb-8">
      <button onClick={onBack} className="flex items-center gap-1 text-xs font-semibold text-gray-500 mb-3">
        <ArrowLeft size={14} /> Back
      </button>
      <h2 className="text-lg font-black mb-1" style={{ color: "#12213A" }}>Uploads</h2>
      <p className="text-xs text-gray-500 mb-4">Every PT/physio file you've uploaded, in one place. Stored privately — only you can access these.</p>

      <div className="bg-white rounded-lg border p-3 mb-5" style={{ borderColor: "#DAD7CC" }}>
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Upload a file</div>
        {niggles.length > 0 && (
          <select className="input mb-2 text-xs" value={linkTo} onChange={(e) => setLinkTo(e.target.value)}>
            <option value="general">General (not linked to a niggle)</option>
            {niggles.map((n) => <option key={n.id} value={n.id}>{n.part || "Niggle"}</option>)}
          </select>
        )}
        <label className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border cursor-pointer" style={{ borderColor: "#0E8388", color: "#0E8388" }}>
          <Upload size={13} /> {uploading ? "Uploading…" : "Upload PDF or image"}
          <input ref={fileInputRef} type="file" accept="application/pdf,image/*" className="hidden" onChange={handleFileSelect} disabled={uploading} />
        </label>
        {fileError && <div className="text-[11px] mt-1" style={{ color: "#C1483B" }}>{fileError}</div>}
        <p className="text-[10px] text-gray-400 mt-1.5">A PDF or image gets read automatically for exercises you can review and add to a block; nothing is scheduled without your confirmation.</p>
      </div>

      <div className="bg-white rounded-lg border p-3 mb-5" style={{ borderColor: "#DAD7CC" }}>
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Season schedule</div>
        <label className="flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold border cursor-pointer" style={{ borderColor: "#0E8388", color: "#0E8388" }}>
          <CalendarRange size={13} /> Upload fixture list
          <input
            ref={scheduleInputRef}
            type="file"
            accept="application/pdf,image/*,.csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) setExtractingSchedule(file);
              if (scheduleInputRef.current) scheduleInputRef.current.value = "";
            }}
          />
        </label>
        <p className="text-[10px] text-gray-400 mt-1.5">A PDF, spreadsheet, or photo of a printed schedule — Kip reads every fixture and shows you the whole list to review, edit, or deselect before anything's added.</p>
      </div>

      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">All files ({rows.length})</div>
      <div className="space-y-1.5">
        {rows.map((f) => (
          <div key={f.path} className="flex items-center justify-between bg-white rounded-md px-2.5 py-2 border text-xs" style={{ borderColor: "#DAD7CC" }}>
            <button onClick={() => viewFile(f.path)} className="flex items-center gap-1.5 flex-1 min-w-0 text-left" style={{ color: "#0E8388" }}>
              <Paperclip size={12} className="shrink-0" />
              <div className="min-w-0">
                <div className="truncate font-semibold">{f.name}</div>
                <div className="text-[10px] text-gray-400">{f.tag}</div>
              </div>
            </button>
            <button onClick={() => removeFile(f)}><X size={13} color="#C1483B" /></button>
          </div>
        ))}
        {rows.length === 0 && <div className="text-[11px] text-gray-400">No files uploaded yet.</div>}
      </div>

      {extracting && (
        <PtPlanReviewModal
          file={extracting.file}
          plans={plans}
          onClose={() => setExtracting(null)}
          onConfirmed={(payload) => {
            onApplyPtPlan({ ...payload, sourceNiggleId: extracting.sourceNiggleId });
            setExtracting(null);
          }}
        />
      )}

      {extractingSchedule && (
        <ScheduleReviewModal
          file={extractingSchedule}
          season={season}
          onClose={() => setExtractingSchedule(null)}
          onConfirmed={(matches) => {
            onBulkAddMatches(matches);
            setExtractingSchedule(null);
          }}
        />
      )}
    </div>
  );
}

// The actual home for the profile form and Uploads — both previously only
// reachable via links buried inside Kip chat. Uploads is a local toggle
// (mirroring Plans' own showBuilder pattern) rather than an App-level
// overlay, since it's now scoped to this tab rather than floating above all
// of them. onCancel is deliberately omitted from KipOnboarding here: there's
// no other screen to cancel back to, Profile IS the destination.
function ProfileTab({ profile, onSaveProfile, exercises, plans, onApplyPtPlan, generalUploads, onAddGeneralUpload, onRemoveGeneralUpload, season, onBulkAddMatches }) {
  const [showUploads, setShowUploads] = useState(false);

  if (showUploads) {
    return (
      <UploadsScreen
        profile={profile}
        onSaveProfile={onSaveProfile}
        generalUploads={generalUploads}
        onAddGeneralUpload={onAddGeneralUpload}
        onRemoveGeneralUpload={onRemoveGeneralUpload}
        plans={plans}
        onApplyPtPlan={onApplyPtPlan}
        season={season}
        onBulkAddMatches={onBulkAddMatches}
        onBack={() => setShowUploads(false)}
      />
    );
  }

  return (
    <div>
      <KipOnboarding
        profile={profile}
        onSave={onSaveProfile}
        onCancel={null}
        onSaveProfile={onSaveProfile}
        exercises={exercises}
        plans={plans}
        onApplyPtPlan={onApplyPtPlan}
      />
      <div className="px-4 pt-1 flex justify-end">
        <button onClick={() => setShowUploads(true)} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#0E8388" }}>
          <Paperclip size={12} /> Uploads
        </button>
      </div>
      <NotificationsSection profile={profile} onSaveProfile={onSaveProfile} />
      <TeammatesSection />
    </div>
  );
}

// Domain is public config (already live in DNS/Rules Routing), not a
// secret — safe as a VITE_-exposed client env var alongside the anon key.
const IMPROVMX_DOMAIN = import.meta.env.VITE_IMPROVMX_DOMAIN || "schedule.keepr.coach";

function NotificationsSection({ profile, onSaveProfile }) {
  const [copied, setCopied] = useState(false);
  const alertsEnabled = profile.alertsEnabled !== false;
  const categories = profile.emailAlertCategories || {};

  // Assigned once, lazily, the first time a keeper lands on Profile — not at
  // signup — so there's no unused-account cleanup concern and no separate
  // "generate my address" button to skip past. Local part is fully random
  // (not derived from name/email) so the address itself reveals nothing and
  // can't be guessed from a keeper's public info.
  useEffect(() => {
    if (profile.inboundAlias) return;
    const alias = `${uid()}-${uid().slice(0, 6)}@${IMPROVMX_DOMAIN}`;
    onSaveProfile({ ...profile, inboundAlias: alias });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.inboundAlias]);

  function toggleCategory(id) {
    onSaveProfile({ ...profile, emailAlertCategories: { ...categories, [id]: categories[id] === false ? true : false } });
  }

  function copyAlias() {
    if (!profile.inboundAlias) return;
    navigator.clipboard?.writeText(profile.inboundAlias);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="px-4 pt-4">
      <div className="bg-white rounded-lg border p-3.5 mb-2" style={{ borderColor: "#DAD7CC" }}>
        <div className="text-sm font-bold mb-1" style={{ color: "#12213A" }}>Forward your schedule</div>
        <p className="text-xs text-gray-500 mb-2">Forward a match invite or training-calendar email to this address — Kip reads it and shows you what it found before anything's added.</p>
        <button onClick={copyAlias} className="w-full text-left rounded-md px-2.5 py-2 text-xs font-mono break-all" style={{ background: "#F3F2ED", color: "#12213A" }}>
          {profile.inboundAlias || "Generating your address…"}
        </button>
        {copied && <div className="text-[10px] font-semibold mt-1" style={{ color: "#0E8388" }}>Copied</div>}
      </div>

      <div className="bg-white rounded-lg border p-3.5 mb-4" style={{ borderColor: "#DAD7CC" }}>
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-bold" style={{ color: "#12213A" }}>Email alerts</div>
          <button
            onClick={() => onSaveProfile({ ...profile, alertsEnabled: !alertsEnabled })}
            className="flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: alertsEnabled ? "#0E8388" : "#8A8779" }}
          >
            {alertsEnabled ? <Bell size={12} /> : <BellOff size={12} />}
            {alertsEnabled ? "On" : "Off"}
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-2">Same switch as Kip's in-app check-ins — off here means no proactive email either. When it's on, pick which kinds of things are worth an email.</p>
        <div className="space-y-1.5">
          {EMAIL_ALERT_CATEGORIES.map((cat) => {
            const on = alertsEnabled && categories[cat.id] !== false;
            return (
              <button
                key={cat.id}
                disabled={!alertsEnabled}
                onClick={() => toggleCategory(cat.id)}
                className="w-full flex items-center justify-between rounded-md px-2.5 py-2 text-xs disabled:opacity-40"
                style={{ background: "#F3F2ED" }}
              >
                <span style={{ color: "#12213A" }}>{cat.label}</span>
                {on ? <CheckCircle2 size={15} color="#0E8388" /> : <Circle size={15} color="#DAD7CC" />}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Connections live in their own Supabase table (migration 0005), not in the
// per-user JSONB blob everything else here reads/writes — mutual-consent
// requests and permission grants inherently span two accounts, which the
// blob's strict RLS (auth.uid() = user_id, no exceptions) can't express.
// So this section owns its own fetch/refresh state instead of going through
// updateAndSave like the rest of Profile.
function TeammatesSection() {
  const [viewerId, setViewerId] = useState(null);
  const [inviteCode, setInviteCode] = useState(null);
  const [connections, setConnections] = useState(null); // null = still loading
  const [redeemInput, setRedeemInput] = useState("");
  const [redeemError, setRedeemError] = useState(null);
  const [redeeming, setRedeeming] = useState(false);
  const [copied, setCopied] = useState(false);
  const [busyId, setBusyId] = useState(null);
  const [confirmRevokeId, setConfirmRevokeId] = useState(null);

  async function refresh() {
    const { data: { user } } = await supabase.auth.getUser();
    setViewerId(user?.id || null);
    const [code, rows] = await Promise.all([getMyInviteCode(), getMyConnections()]);
    setInviteCode(code);
    setConnections(rows);
  }

  useEffect(() => { refresh(); }, []);

  async function handleRegenerate() {
    const code = await regenerateMyInviteCode();
    setInviteCode(code);
  }

  function copyCode() {
    if (!inviteCode) return;
    navigator.clipboard?.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function handleRedeem() {
    if (!redeemInput.trim()) return;
    setRedeeming(true);
    setRedeemError(null);
    try {
      await redeemInviteCode(redeemInput);
      setRedeemInput("");
      await refresh();
    } catch (e) {
      setRedeemError(e.message?.includes("not found") ? "That code doesn't match any account." : e.message?.includes("yourself") ? "That's your own code." : "Couldn't send that request — try again.");
    } finally {
      setRedeeming(false);
    }
  }

  async function withBusy(id, fn) {
    setBusyId(id);
    try {
      await fn();
      await refresh();
    } finally {
      setBusyId(null);
    }
  }

  if (connections === null) return null;

  const { incomingPending, outgoingPending, accepted } = summarizeConnections(connections, viewerId);

  return (
    <div className="px-4 pt-4">
      <div className="bg-white rounded-lg border p-3.5 mb-2" style={{ borderColor: "#DAD7CC" }}>
        <div className="text-sm font-bold mb-1 flex items-center gap-1.5" style={{ color: "#12213A" }}>
          <Link2 size={14} color="#0E8388" /> Your invite code
        </div>
        <p className="text-xs text-gray-500 mb-2">Share this with a teammate so they can connect with you. Connecting needs both sides to agree — sharing the code alone doesn't do anything on its own.</p>
        <div className="flex gap-2 mb-1">
          <button onClick={copyCode} className="flex-1 text-left rounded-md px-2.5 py-2 text-sm font-mono font-bold tracking-wide" style={{ background: "#F3F2ED", color: "#12213A" }}>
            {inviteCode || "…"}
          </button>
          <button onClick={handleRegenerate} className="px-3 rounded-md text-[11px] font-semibold border" style={{ borderColor: "#DAD7CC", color: "#8A8779" }}>
            New code
          </button>
        </div>
        {copied && <div className="text-[10px] font-semibold mb-2" style={{ color: "#0E8388" }}>Copied</div>}

        <div className="mt-3 pt-3 border-t" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-xs font-bold mb-1.5" style={{ color: "#12213A" }}>Have a teammate's code?</div>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md px-2.5 py-2 text-sm border font-mono uppercase"
              style={{ borderColor: "#DAD7CC" }}
              placeholder="e.g. A1B2C3D"
              value={redeemInput}
              onChange={(e) => { setRedeemInput(e.target.value); setRedeemError(null); }}
              maxLength={12}
            />
            <button
              disabled={!redeemInput.trim() || redeeming}
              onClick={handleRedeem}
              className="px-3.5 rounded-md text-xs font-bold text-white disabled:opacity-40 flex items-center gap-1"
              style={{ background: "#0E8388" }}
            >
              <UserPlus size={13} /> Connect
            </button>
          </div>
          {redeemError && <div className="text-[11px] font-semibold mt-1.5" style={{ color: "#C1483B" }}>{redeemError}</div>}
        </div>
      </div>

      {incomingPending.length > 0 && (
        <div className="bg-white rounded-lg border p-3.5 mb-2" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-sm font-bold mb-2" style={{ color: "#12213A" }}>Requests</div>
          <div className="space-y-2">
            {incomingPending.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-md px-2.5 py-2" style={{ background: "#F3F2ED" }}>
                <div className="text-xs font-semibold break-all pr-2" style={{ color: "#12213A" }}>{c.requester_email || "A keeper"}</div>
                <div className="flex gap-1.5 shrink-0">
                  <button
                    disabled={busyId === c.id}
                    onClick={() => withBusy(c.id, () => acceptConnection(c.id))}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold text-white disabled:opacity-40"
                    style={{ background: "#0E8388" }}
                  >
                    Accept
                  </button>
                  <button
                    disabled={busyId === c.id}
                    onClick={() => withBusy(c.id, () => declineConnection(c.id))}
                    className="px-2.5 py-1 rounded-md text-[11px] font-bold disabled:opacity-40"
                    style={{ color: "#8A8779" }}
                  >
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(accepted.length > 0 || outgoingPending.length > 0) && (
        <div className="bg-white rounded-lg border p-3.5 mb-4" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-sm font-bold mb-2" style={{ color: "#12213A" }}>Your teammates</div>
          <div className="space-y-2">
            {outgoingPending.map((c) => {
              const partner = partnerOf(c, viewerId);
              return (
                <div key={c.id} className="flex items-center justify-between rounded-md px-2.5 py-2" style={{ background: "#F3F2ED" }}>
                  <div className="text-xs pr-2" style={{ color: "#8A8779" }}>Waiting for {partner.email || "them"} to accept</div>
                  <button
                    disabled={busyId === c.id}
                    onClick={() => withBusy(c.id, () => revokeConnection(c.id))}
                    className="text-[11px] font-semibold shrink-0"
                    style={{ color: "#C1483B" }}
                  >
                    Cancel
                  </button>
                </div>
              );
            })}
            {accepted.map((c) => {
              const partner = partnerOf(c, viewerId);
              const iGrant = myOutgoingGrant(c, viewerId);
              return (
                <div key={c.id} className="rounded-md px-2.5 py-2" style={{ background: "#F3F2ED" }}>
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="text-xs font-semibold break-all pr-2" style={{ color: "#12213A" }}>{partner.email || "A keeper"}</div>
                    <button
                      disabled={busyId === c.id}
                      onClick={() => setConfirmRevokeId(c.id)}
                      className="text-[11px] font-semibold shrink-0"
                      style={{ color: "#C1483B" }}
                    >
                      Disconnect
                    </button>
                  </div>
                  <button
                    disabled={busyId === c.id}
                    onClick={() => withBusy(c.id, () => setRecordingPermission(c.id, !iGrant))}
                    className="w-full flex items-center justify-between rounded-md px-2 py-1.5 text-[11px] disabled:opacity-40"
                    style={{ background: "#fff", border: "1px solid #DAD7CC" }}
                  >
                    <span style={{ color: "#12213A" }}>Let them record matches for me</span>
                    {iGrant ? <CheckCircle2 size={14} color="#0E8388" /> : <Circle size={14} color="#DAD7CC" />}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {confirmRevokeId && (
        <Modal onClose={() => setConfirmRevokeId(null)}>
          <h3 className="text-base font-black mb-2" style={{ color: "#12213A" }}>Disconnect?</h3>
          <p className="text-sm text-gray-600 mb-4">Matches already recorded stay exactly as they are — this only stops any future recording-on-behalf between you two. You'd need a new invite to reconnect.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmRevokeId(null)} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Cancel</button>
            <button
              onClick={() => { const id = confirmRevokeId; setConfirmRevokeId(null); withBusy(id, () => revokeConnection(id)); }}
              className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white"
              style={{ background: "#C1483B" }}
            >
              Disconnect
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// Unlike TeammatesSection, everything here lives entirely in the keeper's
// own profile blob — a coach's email is just a field, not a second account
// with its own consent flow (see DECISIONS.md: no coach-side login was ever
// in scope). So this reads/writes through the normal onSaveProfile path,
// no separate fetch/refresh state needed.
function CoachSharingSection({ profile, onSaveProfile }) {
  const [emailInput, setEmailInput] = useState(profile.coachEmail || "");
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  const coachEmail = profile.coachEmail || "";
  const categories = profile.coachShareCategories || { trainingLogs: true, matchStats: true, attendance: true };
  const cadence = profile.coachDigestCadence || "weekly";

  function addCoach() {
    if (!emailInput.trim()) return;
    onSaveProfile({
      ...profile,
      coachEmail: emailInput.trim(),
      coachShareCategories: profile.coachShareCategories || { trainingLogs: true, matchStats: true, attendance: true },
      coachDigestCadence: profile.coachDigestCadence || "weekly",
    });
  }

  function removeCoach() {
    setEmailInput("");
    onSaveProfile({ ...profile, coachEmail: "" });
  }

  function toggleCategory(id) {
    onSaveProfile({ ...profile, coachShareCategories: { ...categories, [id]: categories[id] === false ? true : false } });
  }

  function setCadence(next) {
    onSaveProfile({ ...profile, coachDigestCadence: next });
  }

  async function sendNow() {
    setSending(true);
    setSendResult(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch("/.netlify/functions/send-coach-digest-now", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token}` },
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Send failed");
      setSendResult({ ok: true, message: "Sent — check with them in a bit." });
    } catch (e) {
      setSendResult({ ok: false, message: "Couldn't send just now — try again shortly." });
    } finally {
      setSending(false);
    }
  }

  return (
    <div>
      <div className="text-sm font-bold mb-1 flex items-center gap-1.5" style={{ color: "#12213A" }}>
        <Mail size={14} color="#0E8388" /> Share with coach
      </div>
      <p className="text-xs text-gray-500 mb-3">Send your coach a periodic email digest — they don't need a Keepr account, it's just an email. You choose what's in it.</p>

        {!coachEmail ? (
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-md px-2.5 py-2 text-sm border"
              style={{ borderColor: "#DAD7CC" }}
              placeholder="coach@example.com"
              type="email"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
            />
            <button disabled={!emailInput.trim()} onClick={addCoach} className="px-3.5 rounded-md text-xs font-bold text-white disabled:opacity-40" style={{ background: "#0E8388" }}>
              Add
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between rounded-md px-2.5 py-2 mb-2.5" style={{ background: "#F3F2ED" }}>
              <div className="text-xs font-semibold break-all pr-2" style={{ color: "#12213A" }}>{coachEmail}</div>
              <button onClick={removeCoach} className="text-[11px] font-semibold shrink-0" style={{ color: "#C1483B" }}>Remove</button>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Include</div>
            <div className="space-y-1.5 mb-3">
              {COACH_SHARE_CATEGORIES.map((cat) => {
                const on = categories[cat.id] !== false;
                return (
                  <button
                    key={cat.id}
                    onClick={() => toggleCategory(cat.id)}
                    className="w-full flex items-center justify-between rounded-md px-2.5 py-2 text-xs"
                    style={{ background: "#F3F2ED" }}
                  >
                    <span style={{ color: "#12213A" }}>{cat.label}</span>
                    {on ? <CheckCircle2 size={15} color="#0E8388" /> : <Circle size={15} color="#DAD7CC" />}
                  </button>
                );
              })}
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">How often</div>
            <div className="flex gap-2 mb-3">
              {["weekly", "monthly"].map((c) => (
                <button
                  key={c}
                  onClick={() => setCadence(c)}
                  className="flex-1 py-2 rounded-lg text-xs font-bold border capitalize"
                  style={cadence === c ? { background: "#12213A", color: "#fff", borderColor: "transparent" } : { borderColor: "#DAD7CC" }}
                >
                  {c}
                </button>
              ))}
            </div>

            <button disabled={sending} onClick={sendNow} className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40" style={{ background: "#0E8388" }}>
              {sending ? "Sending…" : "Send now"}
            </button>
            {sendResult && (
              <div className="text-[11px] font-semibold mt-1.5 text-center" style={{ color: sendResult.ok ? "#0E8388" : "#C1483B" }}>{sendResult.message}</div>
            )}
            {profile.lastCoachDigestSentAt && (
              <div className="text-[10px] text-gray-400 mt-1.5 text-center">Last sent {formatShortDate(profile.lastCoachDigestSentAt.slice(0, 10))}</div>
            )}
          </>
        )}
    </div>
  );
}

function KipOnboarding({ profile, onSave, onCancel, onSaveProfile, exercises, plans, onApplyPtPlan }) {
  const [niggleDetailId, setNiggleDetailId] = useState(null);
  const [form, setForm] = useState({
    level: profile.level || "",
    discipline: profile.discipline || "",
    gender: profile.gender || "",
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

  // Rehab log entries and file uploads/deletes save immediately (same
  // pattern as session RPE/note logging elsewhere), bypassing the rest of
  // this form's batched submit — otherwise a cancelled onboarding edit
  // could silently drop a logged rehab entry or orphan an uploaded file
  // reference. Keeps local form.niggles in sync too, so a later full save
  // here never overwrites it with stale data.
  function saveNiggleImmediately(updatedNiggle) {
    const nextNiggles = form.niggles.map((n) => (n.id === updatedNiggle.id ? updatedNiggle : n));
    setForm({ ...form, niggles: nextNiggles });
    onSaveProfile({ ...form, niggles: nextNiggles, onboarded: profile.onboarded });
  }

  const valid = form.level && form.discipline;

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center gap-2 mb-1">
        <Sparkles size={18} color="#0E8388" />
        <h2 className="text-lg font-black" style={{ color: "#12213A" }}>Update Kip Profile</h2>
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

      <div className="mt-3">
        <Field label="Gender (optional)">
          <div className="flex gap-2">
            {GENDER_OPTIONS.map(([val, label]) => (
              <button
                key={val}
                onClick={() => setForm({ ...form, gender: form.gender === val ? "" : val })}
                className="flex-1 py-2 rounded-lg text-xs font-bold border"
                style={form.gender === val ? { background: "#0E8388", color: "#fff", borderColor: "#0E8388" } : { borderColor: "#DAD7CC" }}
              >
                {label}
              </button>
            ))}
          </div>
        </Field>
        <p className="text-[10px] text-gray-400 mt-1">Skippable — only ever adds a couple of evidence-based coaching cues on top of the default, never changes what you have access to.</p>
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
              <button onClick={() => setNiggleDetailId(n.id)} className="text-[10px] font-bold mt-2 flex items-center gap-1" style={{ color: "#0E8388" }}>
                <ClipboardList size={11} /> Rehab log & files
                {n.rehabLog && n.rehabLog.length > 0 && ` (${n.rehabLog.length})`}
              </button>
            </div>
          ))}
        </div>
      </div>

      {niggleDetailId && (
        <NiggleDetailModal
          niggle={form.niggles.find((n) => n.id === niggleDetailId)}
          exercises={exercises}
          plans={plans}
          onClose={() => setNiggleDetailId(null)}
          onSave={saveNiggleImmediately}
          onApplyPtPlan={onApplyPtPlan}
        />
      )}

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
          {profile.onboarded ? "Save changes" : "Start chatting with Kip"}
        </button>
      </div>
      <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.875rem;outline:none;}`}</style>
    </div>
  );
}

async function postKip(body) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/.netlify/functions/kip-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Kip request failed");
  return data;
}

async function callKip(systemPrompt, apiMessages) {
  const data = await postKip({ system: systemPrompt, messages: apiMessages });
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

// Full parsed response (not just joined text) — needed so a tool-enabled
// call can see stop_reason and any tool_use blocks, not just prose.
async function callKipRaw({ system, messages, tools, maxTokens }) {
  return postKip({ system, messages, tools, maxTokens });
}

// Drives the client-executed tool-call loop: send the conversation with
// tools attached; if Claude asks to use one, run the real function against
// ctx (real local app state), feed the result back as a tool_result, and
// repeat until Claude gives a final text answer or the round cap is hit.
// Capped rather than unbounded so a confused loop can't run away — three
// rounds is more than any of the current tools should ever need.
async function runKipWithTools({ system, messages, ctx, maxRounds = 3 }) {
  let working = messages.map((m) => ({ role: m.role, content: m.content }));
  let toolResults = [];
  for (let round = 0; round < maxRounds; round++) {
    const data = await callKipRaw({ system, messages: working, tools: KIP_TOOLS, maxTokens: 1200 });
    const content = data.content || [];
    const toolUses = content.filter((b) => b.type === "tool_use");
    if (data.stop_reason !== "tool_use" || toolUses.length === 0) {
      const text = content.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
      return { text, toolResults };
    }
    working = [...working, { role: "assistant", content }];
    const resultBlocks = toolUses.map((tu) => {
      const result = executeKipTool(tu.name, tu.input || {}, ctx);
      toolResults.push({ name: tu.name, input: tu.input, result });
      return { type: "tool_result", tool_use_id: tu.id, content: JSON.stringify(result.summary !== undefined ? result.summary : result) };
    });
    working = [...working, { role: "user", content: resultBlocks }];
  }
  return { text: "Sorry, that took a few too many steps to work out — try asking a bit more specifically?", toolResults };
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const PT_PLAN_EXTRACTION_PROMPT = `You are reading an uploaded physio/PT rehab document for a handball goalkeeper and extracting a structured exercise list from it. Respond with ONLY a single JSON object, no other text before or after it, in exactly this shape:

{"looksLikePlan": boolean, "exercises": [{"name": string, "prescription": string, "notes": string}], "reason": string or null}

- "looksLikePlan" is true only if this genuinely looks like a structured exercise/rehab plan you can confidently read.
- If it's handwritten and illegible, low quality, not actually a training document, or you're not confident in the extraction, set "looksLikePlan" to false, leave "exercises" as an empty array, and put a short plain-English reason in "reason" (e.g. "This looks handwritten and I can't read it reliably" or "This doesn't look like an exercise plan").
- Each exercise's "prescription" should be the sets/reps or duration exactly as written (e.g. "3 x 15" or "hold 30s each side"), and "notes" should capture any specific instruction from the physio (tempo, equipment, form cues) — leave "notes" as an empty string if there's nothing beyond the name and prescription.
- Never invent an exercise, a number, or an instruction that isn't actually on the page.`;

// Reused by both the niggle-detail upload flow and the top-level Uploads
// screen — one extraction path, not two divergent ones. Never throws for a
// "this isn't a plan" case; only throws on a genuine request failure, which
// callers treat the same as looksLikePlan: false (plain message, fall back
// to manual entry).
async function extractPtPlanFromFile(file) {
  const base64 = await fileToBase64(file);
  const isPdf = file.type === "application/pdf";
  const contentBlock = isPdf
    ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
    : { type: "image", source: { type: "base64", media_type: file.type, data: base64 } };
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/.netlify/functions/kip-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({
      system: PT_PLAN_EXTRACTION_PROMPT,
      messages: [{ role: "user", content: [contentBlock, { type: "text", text: "Extract the exercises from this document as instructed." }] }],
      maxTokens: 2000,
    }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Extraction request failed");
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    return {
      looksLikePlan: !!parsed.looksLikePlan,
      exercises: Array.isArray(parsed.exercises) ? parsed.exercises : [],
      reason: parsed.reason || null,
    };
  } catch (e) {
    return { looksLikePlan: false, exercises: [], reason: "Kip's response wasn't in the expected format." };
  }
}

const SCHEDULE_EXTRACTION_PROMPT = `You are reading an uploaded season fixture list for a handball goalkeeper's team — could be a PDF, a photo of a printed schedule, or a table of rows extracted from a spreadsheet. Extract every dated match/fixture you can find. Respond with ONLY a single JSON object, no other text before or after it, in exactly this shape:

{"looksLikeSchedule": boolean, "fixtures": [{"date": "YYYY-MM-DD", "opponent": string, "competition": string}], "reason": string or null}

- "looksLikeSchedule" is true only if this genuinely looks like a fixture list with multiple dated matches — not a single invite (that's a different flow), not an unrelated document.
- "date" must be a real calendar date in YYYY-MM-DD form for every fixture — infer the year from context (a season header, other dated rows, etc.) if a row only gives day/month.
- "opponent" is the team name as written. "competition" is the league/competition/round if stated, otherwise an empty string — never invent one.
- If it's illegible, low quality, or doesn't look like a fixture list at all, set "looksLikeSchedule" to false, leave "fixtures" as an empty array, and give a short plain-English reason.
- Never invent a fixture, a date, or an opponent that isn't actually on the page. Skip a row rather than guess if a date genuinely can't be determined.`;

// Spreadsheet rows are already unambiguous, structured text — turning them
// into a document/image block for Claude to re-read visually would throw
// away that structure for no benefit, so this path sends plain text
// instead. XLSX is a binary zip/OOXML format that genuinely needs a real
// parser (not hand-rolled, unlike the plain-text .ics parser elsewhere in
// this build); CSV is already text, so it's sent as-is with no library.
async function spreadsheetToText(file) {
  if (file.type === "text/csv" || /\.csv$/i.test(file.name)) {
    return await file.text();
  }
  const ExcelJS = (await import("exceljs")).default;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(await file.arrayBuffer());
  const sheet = workbook.worksheets[0];
  if (!sheet) return "";
  const lines = [];
  sheet.eachRow((row) => {
    lines.push(row.values.slice(1).map((v) => (v == null ? "" : String(v))).join("\t"));
  });
  return lines.join("\n");
}

// Mirrors extractPtPlanFromFile's shape (same proxy call, same "never
// throws for a not-a-schedule case" contract) but branches on file type
// first: PDF/image go through Claude's vision/document input exactly like
// a PT plan upload; spreadsheets are parsed locally first and sent as
// plain text, since there's no vision step needed for already-structured
// rows.
async function extractScheduleFromFile(file) {
  const isSpreadsheet = /\.(xlsx|xls|csv)$/i.test(file.name) || file.type === "text/csv" || file.type.includes("spreadsheet");
  let content;
  if (isSpreadsheet) {
    const text = await spreadsheetToText(file);
    content = [{ type: "text", text: `Here is the fixture list, extracted from a spreadsheet as tab-separated rows:\n\n${text.slice(0, 12000)}` }];
  } else {
    const base64 = await fileToBase64(file);
    const isPdf = file.type === "application/pdf";
    const contentBlock = isPdf
      ? { type: "document", source: { type: "base64", media_type: "application/pdf", data: base64 } }
      : { type: "image", source: { type: "base64", media_type: file.type, data: base64 } };
    content = [contentBlock, { type: "text", text: "Extract the fixtures from this document as instructed." }];
  }
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/.netlify/functions/kip-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ system: SCHEDULE_EXTRACTION_PROMPT, messages: [{ role: "user", content }], maxTokens: 4000 }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Extraction request failed");
  const text = (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : text);
    return {
      looksLikeSchedule: !!parsed.looksLikeSchedule,
      fixtures: Array.isArray(parsed.fixtures) ? parsed.fixtures : [],
      reason: parsed.reason || null,
    };
  } catch (e) {
    return { looksLikeSchedule: false, fixtures: [], reason: "Kip's response wasn't in the expected format." };
  }
}

/* ---------------------------------------------------------------- */
/* Kip tool-calling                                                   */
/* Anthropic tool-use, executed entirely client-side against the same */
/* real functions the rest of the app already calls — Builder's own   */
/* generators and Stats' own aggregation functions. The proxy only    */
/* forwards the tool schema and returns whatever Claude replies with; */
/* it never runs any of this itself. See DECISIONS.md, "Kip across    */
/* the app."                                                          */
/* ---------------------------------------------------------------- */

const KIP_TOOLS = [
  {
    name: "build_training_block",
    description: "Generate a real 6-week training block using Keepr's own block generator. Call this whenever the keeper asks you to build, create, or put together a training block or program — never describe what a block would look like in prose, actually call this instead. The result is shown to the keeper to review and accept, so it's fine to call this even if you're not 100% sure of every parameter.",
    input_schema: {
      type: "object",
      properties: {
        mode: { type: "string", enum: ["goal", "freeform"], description: "\"goal\" auto-builds a progressive structure around a specific goal. \"freeform\" makes an empty 6-week skeleton with no exercises placed, for a keeper who wants to pick everything themselves." },
        goal_id: { type: "string", enum: GOALS.map((g) => g.id), description: `Required when mode is "goal". One of: ${GOALS.map((g) => `${g.id} = ${g.name} (${g.blurb})`).join("; ")}.` },
        season: { type: "string", enum: ["Winter", "Summer"], description: "Winter = indoor court handball, Summer = beach handball. Default to the keeper's current season context unless they ask for the other one." },
        use_data: { type: "boolean", description: "Whether to bias exercise selection toward the keeper's real weak zones, niggles, and training log. Default true — only set false if the keeper explicitly wants a plain, unbiased block." },
        sessions_per_week: { type: "integer", description: "Only used when mode is freeform. Default 3." },
        name: { type: "string", description: "A short name for the block. Make one up that fits if the keeper didn't give one." },
      },
      required: ["mode", "season"],
    },
  },
  {
    name: "get_stats",
    description: "Pull real, already-computed numbers from Keepr's own stats functions. Call this when the keeper actually asks something numeric, or right before you're about to state a specific save%, trend, weak zone, gym-lift number, or opponent breakdown yourself — never estimate or recompute these from context, which may be stale or incomplete. Don't call this speculatively on an ordinary check-in or greeting that doesn't call for a number.",
    input_schema: {
      type: "object",
      properties: {
        metric: {
          type: "string",
          enum: ["zone_breakdown", "shot_type_breakdown", "training_summary", "gym_progress", "opponent_breakdown"],
          description: "zone_breakdown = save% per goal zone. shot_type_breakdown = save% per shot type (wing/9m/6m/penalty indoors, spin/regular/etc beach). training_summary = session completion rate, RPE trend, weekly streak. gym_progress = top-set/1RM trend and PRs for logged gym exercises. opponent_breakdown = per-shooter save% against a named opponent — requires opponent_name.",
        },
        season: { type: "string", enum: ["Winter", "Summer", "All"], description: "Defaults to the keeper's current season context." },
        exercise_name: { type: "string", description: "Only for gym_progress — filter to one exercise by name. Omit for every logged gym exercise." },
        opponent_name: { type: "string", description: "Required for opponent_breakdown — the opponent's name exactly as logged in their matches." },
      },
      required: ["metric"],
    },
  },
];

// The block itself is never sent back to the model as text — Claude only
// gets a compact summary to narrate from, keeping tokens small and avoiding
// any temptation to enumerate every exercise in prose. The full block
// travels in the client-side result and only gets persisted (via savePlan)
// once the keeper explicitly accepts it — same "review before commit"
// discipline as every other generated-content flow in this app.
function executeBuildTrainingBlock(input, ctx) {
  const season = input.season || ctx.season;
  let block;
  if (input.mode === "freeform") {
    block = generateFreeformBlock(input.name?.trim() || "New Training Block", season, input.sessions_per_week || 3);
  } else {
    const goal = GOALS.find((g) => g.id === input.goal_id);
    if (!goal) return { summary: { error: `Unknown goal_id "${input.goal_id}". Valid options: ${GOALS.map((g) => g.id).join(", ")}.` } };
    const useData = input.use_data !== false;
    const dataContext = useData ? { useData: true, profile: ctx.profile, matches: ctx.matches, plans: ctx.plans, adHocSessions: ctx.adHocSessions } : null;
    block = generateGoalBlock(input.name?.trim() || `${goal.name} Block`, season, input.goal_id, ctx.exercises, dataContext);
  }
  const totalSessions = block.weeks.reduce((a, w) => a + w.sessions.length, 0);
  const totalExercises = block.weeks.reduce((a, w) => a + w.sessions.reduce((b, s) => b + s.exercises.length, 0), 0);
  return {
    block,
    summary: { name: block.name, season: block.season, goal: block.goal, weeks: block.weeks.length, sessions: totalSessions, exercisesPlaced: totalExercises },
  };
}

function executeGetStats(input, ctx) {
  const season = input.season || ctx.season;
  switch (input.metric) {
    case "zone_breakdown": {
      const agg = aggregateMatchStats(ctx.matches, season);
      const totalShots = agg.totalSaves + agg.totalGoals;
      const zones = Object.entries(agg.zones)
        .filter(([, z]) => z.saves + z.goals > 0)
        .map(([zone, z]) => ({ zone, label: ZONE_LABELS[zone], saves: z.saves, shots: z.saves + z.goals, savePct: Math.round((z.saves / (z.saves + z.goals)) * 100) }));
      return { season, totalShots, overallSavePct: totalShots > 0 ? Math.round((agg.totalSaves / totalShots) * 100) : null, zones };
    }
    case "shot_type_breakdown": {
      const filtered = ctx.matches.filter((m) => m.season === "Summer" && (season === "All" || season === "Summer"));
      const agg = aggregateShotTypeStats(filtered);
      const types = Object.entries(agg).map(([type, v]) => ({ type, saves: v.saves, shots: v.saves + v.goals, savePct: (v.saves + v.goals) > 0 ? Math.round((v.saves / (v.saves + v.goals)) * 100) : null }));
      if (types.length === 0) return { note: "Shot-type breakdown is only tracked for beach handball (Summer) matches, and none are logged for that filter yet." };
      return { types };
    }
    case "training_summary": {
      const recentRpe = rpeTrend(ctx.plans).slice(-5);
      const completed = completedSessionsWithMeta(ctx.plans);
      const dueSessions = ctx.plans.reduce((a, p) => a + p.weeks.reduce((b, w) => b + w.sessions.length, 0), 0);
      return {
        streakWeeks: weeklyStreak(ctx.plans),
        sessionsCompleted: completed.length,
        totalSessionsInPlans: dueSessions,
        recentRpe: recentRpe.map((r) => r.rpe),
      };
    }
    case "gym_progress": {
      const ids = [...loggedGymExerciseIds(ctx.plans, ctx.adHocSessions)];
      const filtered = input.exercise_name
        ? ids.filter((id) => ctx.exercises.find((e) => e.id === id)?.name.toLowerCase().includes(input.exercise_name.toLowerCase()))
        : ids;
      const lifts = filtered.map((id) => {
        const ex = ctx.exercises.find((e) => e.id === id);
        const history = exerciseLogHistory(ctx.plans, id, ctx.adHocSessions);
        if (!ex || history.length === 0) return null;
        const latest = history[history.length - 1];
        const first = history[0];
        return {
          exercise: ex.name,
          sessionsLogged: history.length,
          latestTopWeight: latest.topWeight,
          latestE1rm: latest.e1rm,
          trend: history.length > 1 ? (latest.topWeight > first.topWeight ? "up" : latest.topWeight < first.topWeight ? "down" : "flat") : "single session",
          prCount: history.filter((h) => h.isPr).length,
          plateaued: isPlateaued(history),
        };
      }).filter(Boolean);
      if (lifts.length === 0) return { note: input.exercise_name ? `No logged sets found matching "${input.exercise_name}".` : "No gym sets logged yet." };
      return { lifts };
    }
    case "opponent_breakdown": {
      if (!input.opponent_name) return { error: "opponent_name is required for opponent_breakdown." };
      const roster = findOpponentRoster(ctx.opponents, input.opponent_name)?.roster || [];
      const shooters = shooterStats(ctx.matches, input.opponent_name, roster);
      const record = opponentRecord(ctx.matches, input.opponent_name);
      if (!record) return { note: `No matches logged yet against "${input.opponent_name}".` };
      return { opponent: input.opponent_name, record, shooters: shooters.length ? shooters : undefined, note: shooters.length === 0 ? "No shots have shooter numbers attributed yet for this opponent." : undefined };
    }
    default:
      return { error: `Unknown metric "${input.metric}".` };
  }
}

function executeKipTool(name, input, ctx) {
  if (name === "build_training_block") return executeBuildTrainingBlock(input, ctx);
  if (name === "get_stats") return executeGetStats(input, ctx);
  return { error: `Unknown tool "${name}".` };
}

/* ---------------------------------------------------------------- */
/* Kip reports                                                        */
/* Deliberately NOT tool-calling — reuses the exact alerts pattern:    */
/* the client computes real numbers first via the same aggregation     */
/* functions everything else here uses, then makes one plain prompt    */
/* asking Kip to narrate them. "Compute then narrate" is already a      */
/* proven shape in this app; a report is that shape with more data in  */
/* one pass, not a reason to route through tool-use.                   */
/* computeReportData itself now lives in kipDomain.js (imported above) */
/* so the server-side coach-digest function can call the exact same    */
/* computation — this file only keeps the parts that need callKip.     */
/* ---------------------------------------------------------------- */

async function generateKipReport({ profile, plans, season, matches, exercises, adHocSessions }) {
  const data = computeReportData({ matches, plans, adHocSessions, exercises, season });
  const basePrompt = buildKipSystemPrompt(profile, plans, season, matches, exercises, adHocSessions);
  const reportPrompt = `${basePrompt}\n\nREPORT CONTEXT:\nYou're writing a short progress report for the keeper to read on their own, not replying to a question. Here's the real, already-computed data to cover — don't re-derive any of it, just narrate what's actually here:\n${JSON.stringify(data, null, 2)}\n\nWrite it as a few short natural paragraphs in your own voice — training consistency, match save% trend and weakest zones, and gym/rep progress if there's any logged data for it. Lead with whatever's most worth knowing. Stay grounded in the numbers given, don't invent anything beyond them. If there's genuinely very little data yet, say that plainly rather than padding it out. No headers, no bullet list of stats — write it the way you'd actually talk someone through their last stretch of training.`;
  const triggerMessage = { role: "user", content: "(Report generation trigger — not a message from the keeper. Write the report described in REPORT CONTEXT.)" };
  const narrative = await callKip(reportPrompt, [triggerMessage]);
  return { id: uid(), createdAt: new Date().toISOString(), season, data, narrative };
}

// One consistent visual signal for "Kip actually did something" — a real
// action taken (block built, report generated) or a proactive alert Kip
// surfaced on its own — versus ordinary conversational advice, which gets
// no badge at all. Previously only half-built: alert messages were tagged
// isAlert but nothing ever rendered differently for them. This is the
// single place that visual treatment lives now, reused everywhere a
// message carries an `action`.
const KIP_ACTION_META = {
  alert: { icon: Bell, label: "Kip noticed something" },
  block_built: { icon: Target, label: "Block built" },
  report_generated: { icon: BarChart3, label: "Report generated" },
};

function KipActionBadge({ action }) {
  const meta = KIP_ACTION_META[action?.type];
  if (!meta) return null;
  const Icon = meta.icon;
  return (
    <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide mb-1" style={{ color: "#0E8388" }}>
      <Icon size={11} /> {meta.label}
    </div>
  );
}

// Shared between the main Kip tab and the compact KipAssistantSheet used
// from Builder — one message-rendering implementation, so both surfaces
// stay visually identical rather than drifting into "two Kips" over time.
function KipMessageThread({ messages, sending, error, onSaveMessages, onSavePlan, scrollRef, emptyText }) {
  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 space-y-2.5">
      {messages.length === 0 && (
        <div className="text-xs text-gray-400 py-2">{emptyText}</div>
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
            <KipActionBadge action={m.action} />
            {m.content}
            {m.action?.type === "block_built" && m.action.block && (
              <div className="mt-2 pt-2 border-t" style={{ borderColor: "#DAD7CC" }}>
                <div className="text-xs font-bold" style={{ color: "#12213A" }}>{m.action.block.name}</div>
                <div className="text-[11px] text-gray-500 mb-2">{m.action.block.season} · {m.action.block.weeks.length} weeks{m.action.block.goal ? ` · ${m.action.block.goal}` : ""}</div>
                {m.action.added ? (
                  <div className="text-[11px] font-bold" style={{ color: "#0E8388" }}>Added to your blocks ✓</div>
                ) : (
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        onSaveMessages(messages.map((mm, ii) => (ii === i ? { ...mm, action: { ...mm.action, added: true } } : mm)));
                        onSavePlan(m.action.block);
                      }}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold text-white"
                      style={{ background: "#0E8388" }}
                    >
                      Add to my blocks
                    </button>
                    <button
                      onClick={() => onSaveMessages(messages.map((mm, ii) => (ii === i ? { ...mm, action: { ...mm.action, block: null } } : mm)))}
                      className="flex-1 py-1.5 rounded-lg text-xs font-bold border"
                      style={{ borderColor: "#DAD7CC" }}
                    >
                      Discard
                    </button>
                  </div>
                )}
              </div>
            )}
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
  );
}

function KipChat({ profile, onSaveProfile, messages, onSaveMessages, plans, season, matches, exercises, adHocSessions, opponents, onSavePlan, onOpenProfile }) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(null);
  const [showBadges, setShowBadges] = useState(false);
  const scrollRef = React.useRef(null);
  const deliveringRef = React.useRef(false);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, sending]);

  const alertsEnabled = profile.alertsEnabled !== false;
  const points = useMemo(() => computeTotalPoints(plans, adHocSessions, matches), [plans, adHocSessions, matches]);
  const earnedBadgeIds = useMemo(() => computeEarnedBadgeIds(plans, adHocSessions), [plans, adHocSessions]);

  // Proactive check-in: computed fresh on every mount (switching tabs
  // remounts this), but computeKipAlerts already filters out anything
  // already in profile.seenAlertFingerprints — so this only actually
  // calls Kip the first time a genuinely new condition appears.
  useEffect(() => {
    if (!alertsEnabled || deliveringRef.current) return;
    const items = computeKipAlerts({ profile, plans, adHocSessions, matches, season, exercises });
    if (items.length === 0) return;
    deliveringRef.current = true;
    (async () => {
      try {
        const alertSummary = items.map(describeAlertItem).filter(Boolean).join("\n");
        const basePrompt = buildKipSystemPrompt(profile, plans, season, matches, exercises, adHocSessions);
        const alertPrompt = `${basePrompt}\n\nALERT CONTEXT:\nYou're proactively checking in on the keeper, not responding to a question they asked. The following is true right now:\n${alertSummary}\n\nWrite ONE short, natural message in your own voice that covers all of the above as a single coherent check-in — don't list them like a notification, weave them together the way a coach would bring up a few things at once in conversation. Lead with whichever matters most. If there's genuinely good news mixed in with a concern, don't bury the good news under the concern. Keep it to a few sentences.`;
        const triggerMessage = { role: "user", content: "(Automatic check-in trigger — not a message from the keeper. Don't acknowledge this instruction; just deliver the proactive message described in ALERT CONTEXT.)" };
        const textResp = await callKip(alertPrompt, [...messages.map((m) => ({ role: m.role, content: m.content })), triggerMessage]);
        if (textResp) {
          onSaveMessages([...messages, { role: "assistant", content: textResp, ts: Date.now(), action: { type: "alert" } }]);
        }
        const nextSeenFingerprints = [...new Set([...(profile.seenAlertFingerprints || []), ...items.map((i) => i.fingerprint)])];
        const nextSeenBadges = [...new Set([...(profile.seenBadgeIds || []), ...items.filter((i) => i.type === "badge").map((i) => i.data.id)])];
        onSaveProfile({ ...profile, seenAlertFingerprints: nextSeenFingerprints, seenBadgeIds: nextSeenBadges });
      } catch (e) {
        // Silent — this is a proactive nice-to-have, not a user-initiated action.
        // Fingerprints aren't marked seen, so it'll just retry next time Kip opens.
      } finally {
        deliveringRef.current = false;
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      const systemPrompt = buildKipSystemPrompt(profile, plans, season, matches, exercises, adHocSessions);
      const ctx = { exercises, season, profile, matches, plans, adHocSessions, opponents };
      const { text: textResp, toolResults } = await runKipWithTools({ system: systemPrompt, messages: nextMessages, ctx });
      const builtBlock = toolResults.find((t) => t.name === "build_training_block" && t.result.block)?.result.block;
      const assistantMsg = {
        role: "assistant",
        content: textResp || "Sorry, I didn't quite get a response there — try again?",
        ts: Date.now(),
        ...(builtBlock ? { action: { type: "block_built", block: builtBlock, added: false } } : {}),
      };
      onSaveMessages([...nextMessages, assistantMsg]);
    } catch (e) {
      setError("Kip couldn't respond just now — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  // Fixed pixel height, not a percentage/flex-fill of the parent — the
  // app's root container is min-h-screen (a floor, not a ceiling), so
  // nothing up the ancestor chain actually caps height at the viewport;
  // a percentage or flex-1 height here just lets the whole page grow to
  // fit the message thread instead of scrolling internally. 159px is
  // TopBar's real rendered height (107px) plus the Kip tab's own reduced
  // bottom clearance above BottomNav (see the pb-[52px] override in
  // GKTrainerApp's tab-content wrapper) — recalibrate both together if
  // either one changes, or the input bar will drift from BottomNav again.
  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 159px)" }}>
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={15} color="#0E8388" />
            <span className="text-sm font-black" style={{ color: "#12213A" }}>Kip</span>
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "#F3F2ED", color: "#8A8779" }}>Beta</span>
          </div>
          <button onClick={onOpenProfile} className="text-[11px] font-semibold" style={{ color: "#0E8388" }}>Profile</button>
        </div>
        <div className="flex items-center justify-between">
          <button onClick={() => setShowBadges(true)} className="text-[11px] font-bold flex items-center gap-1" style={{ color: "#8A8779" }}>
            <Trophy size={12} color="#E2984B" /> {points.total.toLocaleString()} pts
          </button>
          <button
            onClick={() => onSaveProfile({ ...profile, alertsEnabled: !alertsEnabled })}
            className="flex items-center gap-1 text-[11px] font-semibold"
            style={{ color: alertsEnabled ? "#0E8388" : "#8A8779" }}
          >
            {alertsEnabled ? <Bell size={12} /> : <BellOff size={12} />}
            {alertsEnabled ? "Alerts on" : "Alerts off"}
          </button>
        </div>
      </div>

      <KipMessageThread
        messages={messages}
        sending={sending}
        error={error}
        onSaveMessages={onSaveMessages}
        onSavePlan={onSavePlan}
        scrollRef={scrollRef}
        emptyText="Say hi, or tap a suggestion below — Kip already knows your level, availability and current program."
      />

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

      {showBadges && (
        <BadgesModal points={points} earnedBadgeIds={earnedBadgeIds} onClose={() => setShowBadges(false)} />
      )}
    </div>
  );
}

// Compact, full-screen conversational entry point — same persona, same tool
// access, same kipMessages thread as the main tab, just reached from inside
// Builder instead of the bottom nav. Not a second Kip: closing this and
// opening the Kip tab shows the exact same conversation, mid-stream.
//
// When onBlockBuilt is given (the Builder case), a successful
// build_training_block call skips the inline Add/Discard card entirely and
// hands the draft straight to Builder's own review screen — Builder's Save
// button already IS that confirmation step, so a second one here would just
// be a redundant gate in front of the same decision.
function KipAssistantSheet({ profile, messages, onSaveMessages, plans, season, matches, exercises, adHocSessions, opponents, onSavePlan, onBlockBuilt, onClose }) {
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
      const systemPrompt = buildKipSystemPrompt(profile, plans, season, matches, exercises, adHocSessions);
      const ctx = { exercises, season, profile, matches, plans, adHocSessions, opponents };
      const { text: textResp, toolResults } = await runKipWithTools({ system: systemPrompt, messages: nextMessages, ctx });
      const builtBlock = toolResults.find((t) => t.name === "build_training_block" && t.result.block)?.result.block;
      if (builtBlock && onBlockBuilt) {
        onSaveMessages([...nextMessages, { role: "assistant", content: textResp || "Here's a draft — take a look.", ts: Date.now(), action: { type: "block_built" } }]);
        onBlockBuilt(builtBlock);
        return;
      }
      const assistantMsg = {
        role: "assistant",
        content: textResp || "Sorry, I didn't quite get a response there — try again?",
        ts: Date.now(),
        ...(builtBlock ? { action: { type: "block_built", block: builtBlock, added: false } } : {}),
      };
      onSaveMessages([...nextMessages, assistantMsg]);
    } catch (e) {
      setError("Kip couldn't respond just now — check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: "#F3F2ED" }}>
      <div className="px-4 pt-4 pb-3 shrink-0 flex items-center justify-between" style={{ background: "#12213A" }}>
        <div className="flex items-center gap-1.5">
          <Sparkles size={15} color="#0E8388" />
          <span className="text-sm font-black text-white">Kip</span>
          <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}>Beta</span>
        </div>
        <button onClick={onClose} className="text-xs font-semibold text-white/70">Close</button>
      </div>

      <KipMessageThread
        messages={messages}
        sending={sending}
        error={error}
        onSaveMessages={onSaveMessages}
        onSavePlan={onSavePlan}
        scrollRef={scrollRef}
        emptyText={onBlockBuilt ? "Tell Kip what you need — \"build me a beach block, my shoulder's a bit sore\" works." : "Say hi, or tap a suggestion below."}
      />

      <div className="shrink-0 px-4 pt-2 pb-3 border-t bg-white" style={{ borderColor: "#DAD7CC" }}>
        {onBlockBuilt && (
          <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-4 px-4">
            {["Build me a goal-based block", "Build one using my real data", "Just an empty freeform block"].map((p) => (
              <button key={p} onClick={() => sendMessage(p)} disabled={sending} className="shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold border whitespace-nowrap disabled:opacity-40" style={{ borderColor: "#DAD7CC", color: "#12213A" }}>
                {p}
              </button>
            ))}
          </div>
        )}
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

function BadgesModal({ points, earnedBadgeIds, onClose }) {
  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-black mb-1" style={{ color: "#12213A" }}>Your progress</h3>
      <p className="text-xs text-gray-500 mb-4">Points come from completed sessions ({SESSION_POINTS} pts), logged matches ({MATCH_POINTS} pts), and PRs ({PR_POINTS} pts).</p>

      <div className="grid grid-cols-3 gap-2 mb-5">
        <div className="bg-white rounded-lg border p-2.5 text-center" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-lg font-black" style={{ color: "#12213A" }}>{points.sessionsCompleted}</div>
          <div className="text-[10px] text-gray-500 font-semibold uppercase">Sessions</div>
        </div>
        <div className="bg-white rounded-lg border p-2.5 text-center" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-lg font-black" style={{ color: "#12213A" }}>{points.matchesLogged}</div>
          <div className="text-[10px] text-gray-500 font-semibold uppercase">Matches</div>
        </div>
        <div className="bg-white rounded-lg border p-2.5 text-center" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-lg font-black" style={{ color: "#E2984B" }}>{points.prsHit}</div>
          <div className="text-[10px] text-gray-500 font-semibold uppercase">PRs</div>
        </div>
      </div>

      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Milestones</div>
      <div className="space-y-2">
        {BADGES.map((b) => {
          const earned = earnedBadgeIds.has(b.id);
          return (
            <div key={b.id} className="flex items-center gap-3 bg-white rounded-lg border p-3" style={{ borderColor: "#DAD7CC", opacity: earned ? 1 : 0.5 }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: earned ? "#E2984B" : "#F3F2ED" }}>
                {earned ? <Trophy size={16} color="#fff" /> : <Lock size={14} color="#8A8779" />}
              </div>
              <div>
                <div className="text-sm font-bold" style={{ color: "#12213A" }}>{b.name}</div>
                <div className="text-[11px] text-gray-500">{b.description}</div>
              </div>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

// Header-less by design — the only caller is Library's "Coach's notes"
// segment, whose segmented control already labels this content; a second
// title here would just repeat it.
function AdviceHub({ profile }) {
  const [openId, setOpenId] = useState(ADVICE_TOPICS[0].id);
  return (
    <div className="px-4 pt-4 pb-6">
      <p className="text-xs text-gray-500 mb-4">
        Short, practical principles behind the exercises — the "why" to go with the "what".
      </p>
      <div className="space-y-2">
        {ADVICE_TOPICS.map((t) => {
          const open = openId === t.id;
          const Icon = ADVICE_ICONS[t.icon] || Lightbulb;
          const tips = t.id === "reading"
            ? [...t.tips, QUIET_EYE_DURATION_TIP, quietEyeCueTip(profile?.gender)]
            : t.tips;
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
                <>
                  <ul className="px-3 pb-3 space-y-2">
                    {tips.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-sm text-gray-700 leading-snug">
                        <span className="mt-1.5 w-1 h-1 rounded-full shrink-0" style={{ background: "#0E8388" }} />
                        {tip}
                      </li>
                    ))}
                  </ul>
                  {t.diagrams && t.diagrams.length > 0 && (
                    <div className="px-3 pb-3 space-y-3">
                      {t.diagrams.map((d) => {
                        const Diagram = ADVICE_DIAGRAMS[d.key];
                        if (!Diagram) return null;
                        return (
                          <div key={d.key} className="rounded-lg border p-3" style={{ borderColor: "#DAD7CC" }}>
                            <Diagram />
                            <p className="text-[11px] text-gray-500 text-center mt-2">{d.caption}</p>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
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

function ShotLogModal({ season, zone, videoUrl, roster = [], onClose, onSave }) {
  const [outcome, setOutcome] = useState(null);
  // undefined = not chosen yet; null = "logged without one" — both distinct
  // from "this step doesn't apply" (season/roster gating below).
  const [shotType, setShotType] = useState(undefined);
  const [position, setPosition] = useState(undefined);
  const [timestamp, setTimestamp] = useState("");
  const types = shotTypesFor(season);
  const videoTimestamp = timestamp.trim() || null;
  const isIndoor = season !== "Summer";

  function chooseType(t) {
    setShotType(t);
    // Beach has no position axis at all (3-a-side, no LW/LB/CB/RB/RW/Pivot
    // formation) — same immediate-finalize-if-no-roster shortcut as before.
    // Indoor always continues on to the position step next.
    if (!isIndoor && roster.length === 0) {
      onSave({ zone, outcome, shotType: t, videoTimestamp, shooterNumber: null, position: null });
    }
  }
  function choosePosition(p) {
    setPosition(p);
    if (roster.length === 0) {
      onSave({ zone, outcome, shotType, videoTimestamp, shooterNumber: null, position: p });
    }
  }
  function finalize(shooterNumber) {
    onSave({ zone, outcome, shotType, videoTimestamp, shooterNumber: shooterNumber || null, position: isIndoor ? position : null });
  }

  const showPositionStep = outcome && shotType !== undefined && isIndoor && position === undefined;
  const positionSatisfied = !isIndoor || position !== undefined;
  const showShooterStep = outcome && shotType !== undefined && positionSatisfied && roster.length > 0;

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
      {outcome && shotType === undefined && (
        <>
          <p className="text-xs text-gray-500 mb-3">
            {outcome} — {season === "Summer" ? "what type of shot?" : "shot origin (optional)"}
          </p>
          {videoUrl && (
            <input
              className="input mb-3"
              placeholder="Video timestamp, e.g. 12:34 (optional)"
              value={timestamp}
              onChange={(e) => setTimestamp(e.target.value)}
            />
          )}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {types.map((t) => (
              <button
                key={t}
                onClick={() => chooseType(t)}
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
            <button onClick={() => chooseType(null)} className="w-full py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>
              Log without a type
            </button>
          )}
        </>
      )}
      {showPositionStep && (
        <>
          <p className="text-xs text-gray-500 mb-3">Which position took it? (optional)</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {POSITIONS.map((p) => (
              <button
                key={p}
                onClick={() => choosePosition(p)}
                className="px-3 py-2 rounded-lg text-xs font-bold border"
                style={{ borderColor: "#DAD7CC" }}
              >
                {p}
              </button>
            ))}
          </div>
          <button onClick={() => choosePosition(null)} className="w-full py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>
            Skip
          </button>
        </>
      )}
      {showShooterStep && (
        <>
          <p className="text-xs text-gray-500 mb-3">Who took the shot? (optional)</p>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {roster.map((r, i) => (
              <button
                key={i}
                onClick={() => finalize(r.number)}
                className="px-3 py-2 rounded-lg text-xs font-bold border"
                style={{ borderColor: "#DAD7CC" }}
              >
                {r.number && `#${r.number}`}{r.number && r.name ? " " : ""}{r.name}
              </button>
            ))}
          </div>
          <button onClick={() => finalize(null)} className="w-full py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>
            Skip
          </button>
        </>
      )}
    </Modal>
  );
}

// Tappable even for an opponent with no match history yet — a roster can be
// built up-front, before the first match against a team is ever logged.
function OpponentHistoryNote({ matches, opponent, excludeId, roster, onTap }) {
  const rec = opponentRecord(matches, opponent, excludeId);
  const name = (opponent || "").trim();
  if (!name) return null;
  const danger = rec ? mostDangerousShooter(matches, opponent, roster) : null;
  return (
    <button type="button" onClick={onTap} className="text-[11px] text-gray-500 mt-1 text-left underline decoration-dotted underline-offset-2">
      {rec ? (
        <>
          {rec.count} previous match{rec.count !== 1 ? "es" : ""} vs {name}
          {rec.recordKnown && ` · ${rec.wins}W-${rec.losses}L${rec.draws ? `-${rec.draws}D` : ""}`}
          {rec.savePct !== null && ` · ${rec.savePct}% saved`}
          {danger && ` · watch #${danger.number}${danger.name ? ` ${danger.name}` : ""} (${danger.goals} goal${danger.goals !== 1 ? "s" : ""})`}
        </>
      ) : (
        `Manage roster for ${name}`
      )}
    </button>
  );
}

function OpponentDetailModal({ opponentName, opponents, matches, onClose, onSaveRoster }) {
  const existing = findOpponentRoster(opponents, opponentName);
  const [roster, setRoster] = useState(existing?.roster || []);
  const [numberInput, setNumberInput] = useState("");
  const [nameInput, setNameInput] = useState("");
  const name = (opponentName || "").trim();
  const rec = opponentRecord(matches, opponentName);
  const stats = shooterStats(matches, opponentName, roster);

  function addEntry() {
    const number = numberInput.trim();
    const shooterName = nameInput.trim();
    if (!number && !shooterName) return;
    const next = [...roster, { number: number || null, name: shooterName || null }];
    setRoster(next);
    onSaveRoster(next);
    setNumberInput("");
    setNameInput("");
  }
  function removeEntry(i) {
    const next = roster.filter((_, idx) => idx !== i);
    setRoster(next);
    onSaveRoster(next);
  }

  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-black mb-1" style={{ color: "#12213A" }}>{name}</h3>

      {rec ? (
        <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
          <span>{rec.count} match{rec.count !== 1 ? "es" : ""}</span>
          {rec.recordKnown && <span>{rec.wins}W-{rec.losses}L{rec.draws ? `-${rec.draws}D` : ""}</span>}
          {rec.savePct !== null && <span>{rec.savePct}% saved</span>}
        </div>
      ) : (
        <p className="text-xs text-gray-500 mb-3">No matches logged against this opponent yet.</p>
      )}

      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Roster</div>
      <div className="space-y-1.5 mb-3 max-h-48 overflow-y-auto">
        {roster.map((r, i) => (
          <div key={i} className="flex items-center justify-between bg-white rounded-md border px-2.5 py-1.5" style={{ borderColor: "#DAD7CC" }}>
            <div className="text-sm">
              {r.number && <span className="font-bold" style={{ color: "#12213A" }}>#{r.number}</span>}{r.number && r.name ? " " : ""}{r.name}
            </div>
            <button onClick={() => removeEntry(i)}><X size={13} color="#C1483B" /></button>
          </div>
        ))}
        {roster.length === 0 && <div className="text-xs text-gray-400">No shooters added yet.</div>}
      </div>

      <div className="flex gap-2 mb-4">
        <input className="input" style={{ width: "64px", flexShrink: 0 }} placeholder="#" value={numberInput} onChange={(e) => setNumberInput(e.target.value)} />
        <input className="input flex-1" placeholder="Shooter name (optional)" value={nameInput} onChange={(e) => setNameInput(e.target.value)} />
        <button onClick={addEntry} className="px-3 py-2 rounded-lg text-white text-xs font-bold shrink-0" style={{ background: "#0E8388" }}>Add</button>
      </div>

      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Per-shooter breakdown</div>
      {stats.length === 0 ? (
        <p className="text-xs text-gray-400">No shots logged with a shooter attached yet — pick a shooter after logging a zone/outcome to build this out.</p>
      ) : (
        <div className="space-y-1.5">
          {stats.map((s) => (
            <div key={s.number} className="flex items-center justify-between bg-white rounded-md border px-2.5 py-1.5" style={{ borderColor: "#DAD7CC" }}>
              <div className="text-sm">
                <span className="font-bold" style={{ color: "#12213A" }}>#{s.number}</span>{s.name ? ` ${s.name}` : ""}
              </div>
              <div className="text-xs text-gray-500">
                {s.goals} goal{s.goals !== 1 ? "s" : ""}{s.savePct !== null && ` · ${s.savePct}% saved (${s.total})`}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function MatchFormModal({ season, matches, onClose, onSave, initialDate, title = "New match", submitLabel = "Create match", opponents = [], onSaveOpponentRoster, teammateOptions = [] }) {
  const [form, setForm] = useState({ date: initialDate || new Date().toISOString().slice(0, 10), opponent: "", competition: "", result: "", season, videoUrl: "", teammateOwnerId: null });
  const [rosterOpen, setRosterOpen] = useState(false);
  const valid = form.date && form.opponent.trim();
  const selectedTeammate = teammateOptions.find((t) => t.ownerId === form.teammateOwnerId) || null;
  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-black mb-3" style={{ color: "#12213A" }}>{title}</h3>
      <div className="space-y-3">
        <Field label="Date">
          <input type="date" className="input" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
        </Field>
        <Field label="Opponent">
          <input className="input" placeholder="e.g. North Shore" value={form.opponent} onChange={(e) => setForm({ ...form, opponent: e.target.value })} />
          <OpponentHistoryNote matches={matches} opponent={form.opponent} roster={findOpponentRoster(opponents, form.opponent)?.roster} onTap={() => setRosterOpen(true)} />
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
        <Field label="Video link (optional)">
          <input className="input" placeholder="YouTube, Drive, wherever the footage lives" value={form.videoUrl} onChange={(e) => setForm({ ...form, videoUrl: e.target.value })} />
        </Field>
        {teammateOptions.length > 0 && (
          <Field label="Recording with a teammate?">
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => setForm({ ...form, teammateOwnerId: null })}
                className="px-2.5 py-1.5 rounded-lg text-xs font-bold border"
                style={!form.teammateOwnerId ? { background: "#12213A", color: "#fff", borderColor: "transparent" } : { borderColor: "#DAD7CC" }}
              >
                Just me
              </button>
              {teammateOptions.map((t) => (
                <button
                  key={t.ownerId}
                  onClick={() => setForm({ ...form, teammateOwnerId: t.ownerId })}
                  className="px-2.5 py-1.5 rounded-lg text-xs font-bold border"
                  style={form.teammateOwnerId === t.ownerId ? { background: "#0E8388", color: "#fff", borderColor: "transparent" } : { borderColor: "#DAD7CC" }}
                >
                  {t.email}
                </button>
              ))}
            </div>
            {selectedTeammate && (
              <p className="text-[11px] text-gray-500 mt-1.5">
                You'll get a switch to move between recording your own shots and {selectedTeammate.email}'s — theirs goes straight into their own account, and they can review or correct it afterward.
              </p>
            )}
          </Field>
        )}
        <button
          disabled={!valid}
          onClick={() => {
            const { teammateOwnerId, ...matchFields } = form;
            onSave({
              id: uid(),
              ...matchFields,
              shots: [],
              ...(teammateOwnerId ? { teammateOwnerId, teammateEmail: selectedTeammate?.email || null } : {}),
            });
          }}
          className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40"
          style={{ background: "#0E8388" }}
        >
          {submitLabel}
        </button>
      </div>

      {rosterOpen && (
        <OpponentDetailModal
          opponentName={form.opponent}
          opponents={opponents}
          matches={matches}
          onClose={() => setRosterOpen(false)}
          onSaveRoster={(roster) => onSaveOpponentRoster?.(form.opponent, roster)}
        />
      )}
    </Modal>
  );
}

function MatchVideoLink({ match, onSave }) {
  const [editing, setEditing] = useState(!match.videoUrl);
  const [local, setLocal] = useState(match.videoUrl || "");
  if (editing) {
    return (
      <div className="flex items-center gap-2 mt-2">
        <input
          className="input flex-1"
          placeholder="Video link (YouTube, Drive, etc.)"
          value={local}
          onChange={(e) => setLocal(e.target.value)}
        />
        <button
          onClick={() => { onSave(local.trim()); setEditing(false); }}
          className="text-xs font-bold px-2.5 py-1.5 rounded-lg text-white shrink-0"
          style={{ background: "#0E8388" }}
        >
          Save
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 mt-2">
      <a href={match.videoUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-bold flex items-center gap-1" style={{ color: "#0E8388" }}>
        <Video size={13} /> Watch video
      </a>
      <button onClick={() => { setLocal(match.videoUrl); setEditing(true); }} className="text-[11px] text-gray-400 font-semibold">Edit</button>
    </div>
  );
}

function MatchDetail({ match, matches, onBack, onSave, onDelete, opponents = [], onSaveOpponentRoster }) {
  const [zoneTap, setZoneTap] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [rosterOpen, setRosterOpen] = useState(false);
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

  function logShot({ zone, outcome, shotType, videoTimestamp, shooterNumber, position }) {
    const shot = { id: uid(), zone, outcome, shotType: shotType || null, videoTimestamp: videoTimestamp || null, shooterNumber: shooterNumber || null, position: position || null };
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
          {match.recordedBy && (
            <div className="flex items-center gap-1 text-[11px] font-semibold mt-0.5" style={{ color: "#0E8388" }}>
              <UserPlus size={11} /> Recorded by {match.recordedByEmail || "a teammate"} — edit anything below to correct it
            </div>
          )}
          <OpponentHistoryNote matches={matches} opponent={match.opponent} excludeId={match.id} roster={findOpponentRoster(opponents, match.opponent)?.roster} onTap={() => setRosterOpen(true)} />
        </div>
        <SeasonBadge season={match.season} />
      </div>

      <MatchVideoLink match={match} onSave={(videoUrl) => onSave({ ...match, videoUrl })} />

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
                  {s.shooterNumber && <span className="text-gray-400">· #{s.shooterNumber}</span>}
                  {s.position && <span className="text-gray-400">· {s.position}</span>}
                  {s.outcome === "Goal" && match.season === "Summer" && (
                    <span className="text-[10px] font-black" style={{ color: "#8A8779" }}>+{pointsForShot(match.season, s.shotType)}</span>
                  )}
                  {s.videoTimestamp && match.videoUrl && (
                    <a href={videoLinkForShot(match.videoUrl, s.videoTimestamp)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold flex items-center gap-0.5" style={{ color: "#0E8388" }}>
                      <Video size={10} /> {s.videoTimestamp}
                    </a>
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

      {zoneTap && <ShotLogModal season={match.season} zone={zoneTap} videoUrl={match.videoUrl} roster={findOpponentRoster(opponents, match.opponent)?.roster} onClose={() => setZoneTap(null)} onSave={logShot} />}

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

      {rosterOpen && (
        <OpponentDetailModal
          opponentName={match.opponent}
          opponents={opponents}
          matches={matches}
          onClose={() => setRosterOpen(false)}
          onSaveRoster={(roster) => onSaveOpponentRoster?.(match.opponent, roster)}
        />
      )}
    </div>
  );
}

// Shown on Finish only if the match has neither a competition nor a result
// yet — a live-recorded match is created with just an opponent, so these
// "post-match" fields (which MatchFormModal already collects for a
// retrospective match) are still outstanding at that point.
function MatchWrapUpModal({ match, durationMinutes, onClose, onSave }) {
  const [competition, setCompetition] = useState(match.competition || "");
  const [result, setResult] = useState(match.result || "");
  return (
    <Modal onClose={onClose}>
      <h3 className="text-base font-black mb-1" style={{ color: "#12213A" }}>Wrap up the match</h3>
      <p className="text-xs text-gray-500 mb-3">Optional — fill in the final score whenever you have it.</p>
      <div className="space-y-3">
        <Field label="Competition">
          <input className="input" placeholder="Optional" value={competition} onChange={(e) => setCompetition(e.target.value)} />
        </Field>
        <Field label="Result">
          <input className="input" placeholder="e.g. 24-19 W" value={result} onChange={(e) => setResult(e.target.value)} />
        </Field>
        <button onClick={() => onSave({ competition, result, durationMinutes })} className="w-full py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "#0E8388" }}>
          Save
        </button>
        <button onClick={() => onSave({ durationMinutes })} className="w-full py-1.5 text-xs font-semibold" style={{ color: "#8A8779" }}>
          Skip for now
        </button>
      </div>
    </Modal>
  );
}

function LiveMatchRecorder({ match, opponents = [], onUpdatePatch, onFinish, onExit, onDelete, profile, season, plans, matches, adHocSessions, exercises, onOpenKip, teammateOwnerId, teammateEmail }) {
  const [now, setNow] = useState(Date.now());
  const [zoneTap, setZoneTap] = useState(null);
  const [wrappingUp, setWrappingUp] = useState(false);
  const [confirmDeleting, setConfirmDeleting] = useState(false);
  const [showKipPanel, setShowKipPanel] = useState(false);
  const [activeRecorder, setActiveRecorder] = useState("self");
  const [teammateMatch, setTeammateMatch] = useState(null);
  const [teammateError, setTeammateError] = useState(null);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  // Created (or resumed, if this exact fixture was already started) the
  // moment a teammate is linked — not deferred until the switch is first
  // tapped — so the switch is immediately usable and there's no
  // create-on-first-tap latency mid-recording.
  useEffect(() => {
    if (!teammateOwnerId) return;
    let cancelled = false;
    createOrResumeTeammateMatch({ ownerId: teammateOwnerId, opponent: match.opponent, date: match.date, competition: match.competition, season: match.season })
      .then((m) => { if (!cancelled) setTeammateMatch(m); })
      .catch((e) => { if (!cancelled) setTeammateError(e.message || "Couldn't set up their match"); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teammateOwnerId]);

  const recording = match.recording;
  const isPaused = !!recording?.pausedAt;
  const elapsed = recordingElapsedMs(recording, now);

  const activeMatch = activeRecorder === "teammate" && teammateMatch ? teammateMatch : match;

  const zones = emptyZoneMap();
  (activeMatch.shots || []).forEach((s) => {
    if (!zones[s.zone]) return;
    if (s.outcome === "Save") zones[s.zone].saves++;
    else zones[s.zone].goals++;
  });
  const totalShots = (activeMatch.shots || []).length;
  const totalSaves = (activeMatch.shots || []).filter((s) => s.outcome === "Save").length;
  const savePct = totalShots > 0 ? Math.round((totalSaves / totalShots) * 100) : 0;

  function logShot({ zone, outcome, shotType, videoTimestamp, shooterNumber, position }) {
    const shot = { id: uid(), zone, outcome, shotType: shotType || null, videoTimestamp: videoTimestamp || null, shooterNumber: shooterNumber || null, position: position || null };
    const nextShots = [...(activeMatch.shots || []), shot];
    if (activeRecorder === "teammate" && teammateMatch) {
      patchTeammateMatch(teammateOwnerId, teammateMatch.id, { shots: nextShots })
        .then((updated) => setTeammateMatch(updated))
        .catch((e) => { setTeammateError(e.message || "Couldn't save that shot to their account"); setActiveRecorder("self"); });
    } else {
      onUpdatePatch({ shots: nextShots });
    }
    setZoneTap(null);
  }
  function removeShot(id) {
    const nextShots = (activeMatch.shots || []).filter((s) => s.id !== id);
    if (activeRecorder === "teammate" && teammateMatch) {
      patchTeammateMatch(teammateOwnerId, teammateMatch.id, { shots: nextShots })
        .then((updated) => setTeammateMatch(updated))
        .catch((e) => { setTeammateError(e.message || "Couldn't update their match"); setActiveRecorder("self"); });
    } else {
      onUpdatePatch({ shots: nextShots });
    }
  }

  function finish() {
    if (!match.competition && !match.result) setWrappingUp(true);
    else onFinish({ durationMinutes: recordingElapsedMinutes(recording) }, teammateMatch?.id);
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col" style={{ background: "#F3F2ED" }}>
      <div className="px-4 pt-4 pb-3 shrink-0" style={{ background: "#12213A" }}>
        <div className="flex items-center gap-3 mb-2">
          <button onClick={onExit} className="flex items-center gap-1 text-xs font-semibold text-white/70">
            <ChevronDown size={14} /> Minimize
          </button>
          <button onClick={() => setShowKipPanel(true)} className="flex items-center gap-1 text-xs font-semibold" style={{ color: "#0E8388" }}>
            <Sparkles size={13} /> Ask Kip
          </button>
          <button onClick={() => setConfirmDeleting(true)} className="ml-auto flex items-center gap-1 text-xs font-semibold text-white/70">
            <Trash2 size={13} /> Delete
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] font-bold uppercase tracking-wide text-white/50">Recording</div>
            <div className="text-lg font-black text-white">vs {match.opponent}</div>
          </div>
          <div className="text-right">
            <div className="text-2xl font-black tabular-nums" style={{ color: isPaused ? "#E2984B" : "#0E8388" }}>{formatElapsed(elapsed)}</div>
            {isPaused && <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "#E2984B" }}>Paused</div>}
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-2 text-[11px] text-white/70">
          <span>{totalShots} shot{totalShots !== 1 ? "s" : ""} faced</span>
          <span>· {savePct}% saved</span>
        </div>
      </div>

      {teammateOwnerId && (
        <div className="shrink-0 px-4 pt-3 bg-white">
          <div className="text-[10px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Now recording for</div>
          <div className="flex rounded-lg border p-1" style={{ borderColor: "#DAD7CC" }}>
            <button
              onClick={() => setActiveRecorder("self")}
              className="flex-1 py-1.5 rounded-md text-xs font-bold"
              style={activeRecorder === "self" ? { background: "#12213A", color: "#fff" } : { color: "#8A8779" }}
            >
              Me
            </button>
            <button
              disabled={!teammateMatch}
              onClick={() => setActiveRecorder("teammate")}
              className="flex-1 py-1.5 rounded-md text-xs font-bold disabled:opacity-40"
              style={activeRecorder === "teammate" ? { background: "#0E8388", color: "#fff" } : { color: "#8A8779" }}
            >
              {teammateMatch ? teammateEmail : "Setting up…"}
            </button>
          </div>
          {teammateError && <div className="text-[11px] font-semibold mt-1.5" style={{ color: "#C1483B" }}>{teammateError}</div>}
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Tap a zone to log a shot</div>
        <GoalGrid zones={zones} onZoneTap={(z) => setZoneTap(z)} />

        {totalShots > 0 && (
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Logged shots</div>
            <div className="space-y-1.5">
              {[...(activeMatch.shots || [])].reverse().map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-white rounded-md border px-2.5 py-1.5" style={{ borderColor: "#DAD7CC" }}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold" style={{ color: s.outcome === "Save" ? "#0E8388" : "#C1483B" }}>{s.outcome}</span>
                    <span className="text-gray-500">{ZONE_LABELS[s.zone]}</span>
                    {s.shotType && <span className="text-gray-400">· {s.shotType}</span>}
                  {s.shooterNumber && <span className="text-gray-400">· #{s.shooterNumber}</span>}
                  {s.position && <span className="text-gray-400">· {s.position}</span>}
                  </div>
                  <button onClick={() => removeShot(s.id)}><X size={13} color="#C1483B" /></button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="shrink-0 px-4 py-3 border-t bg-white flex gap-2" style={{ borderColor: "#DAD7CC" }}>
        <button
          onClick={() => onUpdatePatch({ recording: isPaused ? resumeRecording(recording) : pauseRecording(recording) })}
          className="flex-1 py-3 rounded-lg text-sm font-bold border"
          style={{ borderColor: "#DAD7CC", color: "#12213A" }}
        >
          {isPaused ? "Resume" : "Pause"}
        </button>
        <button onClick={finish} className="flex-1 py-3 rounded-lg text-sm font-bold text-white" style={{ background: "#0E8388" }}>
          Finish
        </button>
      </div>

      {zoneTap && <ShotLogModal season={activeMatch.season} zone={zoneTap} videoUrl={activeMatch.videoUrl} roster={findOpponentRoster(opponents, activeMatch.opponent)?.roster} onClose={() => setZoneTap(null)} onSave={logShot} />}

      {showKipPanel && (
        <KipQuickPanel
          kind="match"
          match={match}
          opponents={opponents}
          profile={profile}
          season={season}
          plans={plans}
          matches={matches}
          adHocSessions={adHocSessions}
          exercises={exercises}
          onClose={() => setShowKipPanel(false)}
          onOpenKip={onOpenKip}
        />
      )}

      {confirmDeleting && (
        <Modal onClose={() => setConfirmDeleting(false)}>
          <h3 className="text-base font-black mb-2" style={{ color: "#12213A" }}>Delete this match?</h3>
          <p className="text-sm text-gray-600 mb-4">
            This match was created for this recording, so deleting it removes it — and any shots already logged — completely.
            {teammateMatch ? ` Their linked match (and its shots) goes too.` : ""} This can't be undone.
          </p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDeleting(false)} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Keep it</button>
            <button onClick={() => onDelete(teammateMatch?.id)} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "#C1483B" }}>Delete</button>
          </div>
        </Modal>
      )}

      {wrappingUp && (
        <MatchWrapUpModal
          match={match}
          durationMinutes={recordingElapsedMinutes(recording)}
          onClose={() => setWrappingUp(false)}
          onSave={(patch) => onFinish(patch, teammateMatch?.id)}
        />
      )}
    </div>
  );
}

function StatsTab({ matches, season, onSave, onDelete, plans, exercises, adHocSessions, opponents = [], onSaveOpponentRoster, onOpenLiveRecorder, profile, onSaveProfile, reports = [], onReportGenerated, onOpenHelp, onOpenMatchSetup }) {
  const [openMatchId, setOpenMatchId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState(season);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [openReportId, setOpenReportId] = useState(null);
  const [showCoachShare, setShowCoachShare] = useState(false);

  async function handleGenerateReport() {
    setGeneratingReport(true);
    setReportError(null);
    try {
      const report = await generateKipReport({ profile, plans, season, matches, exercises, adHocSessions });
      onReportGenerated(report);
      setOpenReportId(report.id);
    } catch (e) {
      setReportError("Couldn't generate a report just now — try again.");
    } finally {
      setGeneratingReport(false);
    }
  }

  // Not auto-rendered on mount — only surfaced as a "Resume recording"
  // prompt, same convention as Plans' Today card, so Minimize actually
  // minimizes rather than re-forcing the recorder open. The recorder itself
  // renders once, at the App level, shared with Plans and the Record tab.
  const inProgressMatch = matches.find((m) => m.recording);

  const openMatch = matches.find((m) => m.id === openMatchId);
  if (openMatch) {
    return <MatchDetail match={openMatch} matches={matches} onBack={() => setOpenMatchId(null)} onSave={onSave} onDelete={onDelete} opponents={opponents} onSaveOpponentRoster={onSaveOpponentRoster} />;
  }

  const agg = aggregateMatchStats(matches, filter);
  const shotTypeAgg = filter !== "Winter" ? aggregateShotTypeStats(matches.filter((m) => filter === "All" || m.season === filter)) : {};
  const positionAgg = filter !== "Summer" ? aggregatePositionStats(matches.filter((m) => filter === "All" || m.season === filter)) : {};
  const hasData = agg.totalSaves + agg.totalGoals > 0;
  const overallSavePct = hasData ? Math.round((agg.totalSaves / (agg.totalSaves + agg.totalGoals)) * 100) : 0;
  const zoneEntries = Object.entries(agg.zones).filter(([, z]) => z.saves + z.goals > 0);
  const best = zoneEntries.length ? [...zoneEntries].sort((a, b) => (b[1].saves / (b[1].saves + b[1].goals)) - (a[1].saves / (a[1].saves + a[1].goals)))[0] : null;
  const worst = zoneEntries.length ? [...zoneEntries].sort((a, b) => (a[1].saves / (a[1].saves + a[1].goals)) - (b[1].saves / (b[1].saves + b[1].goals)))[0] : null;

  const sortedMatches = [...matches].sort((a, b) => new Date(b.date) - new Date(a.date));

  return (
    <div className="px-4 pt-4 pb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black" style={{ color: "#12213A" }}>Match stats</h2>
          {onOpenHelp && <HelpButton onClick={onOpenHelp} />}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => (inProgressMatch ? onOpenLiveRecorder({ kind: "match", matchId: inProgressMatch.id }) : onOpenMatchSetup())}
            className="px-3 py-2 rounded-lg text-xs font-bold text-white flex items-center gap-1.5"
            style={{ background: "#0E8388" }}
          >
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: "#fff" }} /> {inProgressMatch ? "Resume recording" : "Record"}
          </button>
          <button onClick={() => setShowForm(true)} className="p-2 rounded-lg text-white" style={{ background: "#12213A" }}>
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="flex gap-1.5 mb-4">
        {["All", "Winter", "Summer"].map((s) => (
          <Chip key={s} active={filter === s} onClick={() => setFilter(s)} accent={s === "Summer" ? "#E2984B" : s === "Winter" ? "#3B5BA5" : "#12213A"}>
            {s === "Winter" ? "Indoor" : s === "Summer" ? "Beach" : "All"}
          </Chip>
        ))}
      </div>

      <div className="bg-white rounded-lg border p-3 mb-4" style={{ borderColor: "#DAD7CC" }}>
        <div className="flex items-center justify-between mb-1.5">
          <div className="text-sm font-bold flex items-center gap-1.5" style={{ color: "#12213A" }}>
            <BarChart3 size={14} color="#0E8388" /> Reports
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => setShowCoachShare(true)} className="text-[11px] font-bold flex items-center gap-1" style={{ color: "#8A8779" }}>
              <Mail size={12} /> Coach
            </button>
            <button onClick={handleGenerateReport} disabled={generatingReport} className="text-[11px] font-bold disabled:opacity-40" style={{ color: "#0E8388" }}>
              {generatingReport ? "Generating…" : "+ Generate report"}
            </button>
          </div>
        </div>
        {reportError && <div className="text-[11px] mb-1" style={{ color: "#C1483B" }}>{reportError}</div>}
        {reports.length === 0 ? (
          <div className="text-[11px] text-gray-400">A real written summary of your training consistency, match trends, and rep progress — pulled together from your logged data, not just a chat message that scrolls away.</div>
        ) : (
          <div className="space-y-1.5">
            {[...reports].reverse().slice(0, 4).map((r) => (
              <button key={r.id} onClick={() => setOpenReportId(r.id)} className="w-full text-left flex items-center justify-between rounded-md px-2.5 py-2 text-xs" style={{ background: "#F3F2ED" }}>
                <span className="font-semibold flex items-center gap-1.5" style={{ color: "#12213A" }}>
                  {formatShortDate(r.createdAt.slice(0, 10))} report
                  {r.sentToCoach && <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "#fff", color: "#8A8779" }}>Sent to coach</span>}
                </span>
                <ChevronRight size={14} color="#8A8779" />
              </button>
            ))}
          </div>
        )}
      </div>

      {showCoachShare && (
        <Modal onClose={() => setShowCoachShare(false)}>
          <CoachSharingSection profile={profile} onSaveProfile={onSaveProfile} />
        </Modal>
      )}

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

          {filter !== "Summer" && Object.keys(positionAgg).length > 0 && (
            <div className="mb-4">
              <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Save % by position</div>
              <div className="space-y-1.5">
                {POSITIONS.filter((p) => positionAgg[p]).map((p) => {
                  const v = positionAgg[p];
                  const total = v.saves + v.goals;
                  const pct = total > 0 ? Math.round((v.saves / total) * 100) : 0;
                  return (
                    <div key={p} className="bg-white rounded-lg border px-3 py-2 flex items-center justify-between" style={{ borderColor: "#DAD7CC" }}>
                      <div className="text-xs font-bold">{p}</div>
                      <div className="text-xs text-gray-500">{pct}% saved ({total})</div>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-1.5">Only shots tagged with a position while logging show up here — it's optional.</p>
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
                {m.recordedBy && (
                  <div className="flex items-center gap-1 text-[10px] font-semibold mt-0.5" style={{ color: "#0E8388" }}>
                    <UserPlus size={10} /> Recorded by {m.recordedByEmail || "a teammate"}
                  </div>
                )}
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
          matches={matches}
          opponents={opponents}
          onSaveOpponentRoster={onSaveOpponentRoster}
          onClose={() => setShowForm(false)}
          onSave={(m) => { onSave(m); setShowForm(false); setOpenMatchId(m.id); }}
        />
      )}

      <WorkoutStats plans={plans} exercises={exercises} adHocSessions={adHocSessions} />

      {openReportId && (() => {
        const report = reports.find((r) => r.id === openReportId);
        if (!report) return null;
        return <ReportDetailModal report={report} profile={profile} onSaveProfile={onSaveProfile} onClose={() => setOpenReportId(null)} />;
      })()}
    </div>
  );
}

function ReportDetailModal({ report, profile, onSaveProfile, onClose }) {
  const d = report.data;
  const [showCoachShare, setShowCoachShare] = useState(false);
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5">
          <BarChart3 size={15} color="#0E8388" />
          <h3 className="text-base font-black" style={{ color: "#12213A" }}>{formatShortDate(report.createdAt.slice(0, 10))} report</h3>
        </div>
        <button onClick={() => setShowCoachShare(true)} className="text-[11px] font-bold flex items-center gap-1 shrink-0" style={{ color: "#0E8388" }}>
          <Mail size={12} /> Share with coach
        </button>
      </div>
      {report.sentToCoach && (
        <div className="text-[11px] font-semibold mb-2" style={{ color: "#8A8779" }}>Sent to {report.coachEmail}</div>
      )}
      <p className="text-sm text-gray-700 leading-relaxed mb-4 whitespace-pre-wrap">{report.narrative}</p>

      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="bg-white rounded-lg border p-2.5" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Save rate</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: "#12213A" }}>{d.overallSavePct != null ? `${d.overallSavePct}%` : "No shots logged"}</div>
        </div>
        <div className="bg-white rounded-lg border p-2.5" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Session completion</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: "#12213A" }}>{d.completionRate != null ? `${d.completionRate}%` : "No plan yet"}</div>
        </div>
        <div className="bg-white rounded-lg border p-2.5" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Streak</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: "#12213A" }}>{d.streakWeeks} week{d.streakWeeks !== 1 ? "s" : ""}</div>
        </div>
        <div className="bg-white rounded-lg border p-2.5" style={{ borderColor: "#DAD7CC" }}>
          <div className="text-[10px] uppercase tracking-wide text-gray-400 font-bold">Sessions completed</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: "#12213A" }}>{d.sessionsCompleted}</div>
        </div>
      </div>

      {d.weakestZones.length > 0 && (
        <div className="mb-3">
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Weakest zones</div>
          <div className="space-y-1">
            {d.weakestZones.map((z) => (
              <div key={z.zone} className="flex items-center justify-between bg-white rounded-md px-2.5 py-1.5 border text-xs" style={{ borderColor: "#DAD7CC" }}>
                <span>{z.label}</span>
                <span className="font-bold" style={{ color: "#12213A" }}>{z.savePct}% ({z.shots} shots)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {d.gymProgress.length > 0 && (
        <div>
          <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1">Gym progress</div>
          <div className="space-y-1">
            {d.gymProgress.map((g) => (
              <div key={g.exercise} className="flex items-center justify-between bg-white rounded-md px-2.5 py-1.5 border text-xs" style={{ borderColor: "#DAD7CC" }}>
                <span>{g.exercise}{g.prCount > 0 ? ` (${g.prCount} PR${g.prCount !== 1 ? "s" : ""})` : ""}</span>
                <span className="font-bold" style={{ color: g.trend === "up" ? "#0E8388" : g.trend === "down" ? "#C1483B" : "#8A8779" }}>{g.trend}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showCoachShare && (
        <Modal onClose={() => setShowCoachShare(false)}>
          <CoachSharingSection profile={profile} onSaveProfile={onSaveProfile} />
        </Modal>
      )}
    </Modal>
  );
}

function WorkoutStats({ plans, exercises, adHocSessions }) {
  const [openId, setOpenId] = useState(null);

  const withHistory = exercises
    .filter((ex) => ex.type === "Gym")
    .map((ex) => ({ ex, history: exerciseLogHistory(plans, ex.id, adHocSessions) }))
    .filter(({ history }) => history.length > 0);

  return (
    <div className="mt-6">
      <div className="text-lg font-black mb-3" style={{ color: "#12213A" }}>Workout stats</div>

      {withHistory.length === 0 ? (
        <div className="text-center py-8 bg-white rounded-lg border" style={{ borderColor: "#DAD7CC" }}>
          <Dumbbell size={24} color="#DAD7CC" className="mx-auto mb-2" />
          <div className="text-sm font-bold" style={{ color: "#12213A" }}>No gym sets logged yet</div>
          <div className="text-xs text-gray-500 mt-1">Log sets on a gym exercise when completing a session to see progress here.</div>
        </div>
      ) : (
        <div className="space-y-2">
          {withHistory.map(({ ex, history }) => {
            const open = openId === ex.id;
            const latest = history[history.length - 1];
            const prs = history.filter((h) => h.isPr);
            return (
              <div key={ex.id} className="bg-white rounded-lg border overflow-hidden" style={{ borderColor: "#DAD7CC" }}>
                <button onClick={() => setOpenId(open ? null : ex.id)} className="w-full p-3 text-left flex items-center justify-between">
                  <div>
                    <div className="font-bold text-sm" style={{ color: "#12213A" }}>{ex.name}</div>
                    <div className="text-[11px] text-gray-500 mt-0.5">{latest.topWeight}kg top set · {history.length} session{history.length !== 1 ? "s" : ""} logged</div>
                  </div>
                  <ChevronDown size={16} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>
                {open && (
                  <div className="px-3 pb-3 space-y-3">
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5 flex items-center gap-1">
                        <TrendingUp size={12} /> Weight progression (top set)
                      </div>
                      <div className="bg-white rounded-lg border p-2" style={{ borderColor: "#DAD7CC" }}>
                        <ResponsiveContainer width="100%" height={120}>
                          <LineChart data={history}>
                            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={30} />
                            <YAxis tick={{ fontSize: 9 }} width={26} />
                            <Tooltip />
                            <Line type="monotone" dataKey="topWeight" stroke="#0E8388" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Volume over time</div>
                      <div className="bg-white rounded-lg border p-2" style={{ borderColor: "#DAD7CC" }}>
                        <ResponsiveContainer width="100%" height={120}>
                          <LineChart data={history}>
                            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={30} />
                            <YAxis tick={{ fontSize: 9 }} width={30} />
                            <Tooltip />
                            <Line type="monotone" dataKey="volume" stroke="#3B5BA5" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div>
                      <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Estimated 1RM (Epley)</div>
                      <div className="bg-white rounded-lg border p-2" style={{ borderColor: "#DAD7CC" }}>
                        <ResponsiveContainer width="100%" height={120}>
                          <LineChart data={history}>
                            <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} angle={-20} textAnchor="end" height={30} />
                            <YAxis tick={{ fontSize: 9 }} width={30} />
                            <Tooltip />
                            <Line type="monotone" dataKey="e1rm" stroke="#E2984B" strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    {prs.length > 0 && (
                      <div>
                        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Personal records</div>
                        <div className="space-y-1">
                          {prs.map((p, i) => (
                            <div key={i} className="flex items-center gap-1.5 text-xs bg-white rounded-lg border px-2.5 py-1.5" style={{ borderColor: "#DAD7CC" }}>
                              <Sparkles size={12} color="#E2984B" />
                              <span className="font-semibold" style={{ color: "#12213A" }}>{p.label}</span>
                              <span className="text-gray-400">— {p.topWeight}kg top set · {p.volume}kg volume</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
