import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Search, Plus, X, ChevronDown, ChevronRight, ChevronLeft, Dumbbell,
  Waves, Snowflake, Trash2, Check, Pencil, CalendarRange, Target,
  Users, User, ListChecks, BookOpen, ArrowLeft, Circle, CheckCircle2,
  Lightbulb, Eye, ShieldCheck, Zap, Brain, Compass, MessageCircle,
  Send, Sparkles, AlertTriangle, BarChart3, TrendingUp, LogOut, Flame, RotateCcw, Video,
  ClipboardList, Paperclip, Upload, Trophy, Bell, BellOff, Lock,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { loadUserData, saveUserData, uploadNiggleFile, uploadGeneralFile, getSignedNiggleFileUrl, deleteNiggleFile } from "./lib/storage.js";
import { supabase } from "./lib/supabaseClient.js";
import { useAuth } from "./auth/AuthProvider.jsx";
import { AngleNarrowingDiagram, ShadowOfBlockDiagram, WingShotGeometryDiagram, StraightShotCornerDiagram } from "./diagrams.jsx";
import {
  CATS, GOALS, PHASES, ZONE_GRID, ZONE_LABELS, INDOOR_SHOT_TYPES, BEACH_SHOT_TYPES, BEACH_TWO_POINT_TYPES,
  shotTypesFor, pointsForShot, emptyZoneMap, aggregateMatchStats, aggregateShotTypeStats, normalizeOpponentName,
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
  EMAIL_ALERT_CATEGORIES, categoryForAlertType,
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

const DEFAULT_EXERCISES = [
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
  const [tab, setTab] = useState("library");
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
  // Which live recorder overlay is currently shown (null = none). Lifted to
  // App level, not owned by Plans/Stats/Record individually, so starting a
  // recording from any one of them is immediately visible/resumable from the
  // others — one source of truth instead of three copies that could drift.
  // Independent of whether the underlying entity's `recording` field exists:
  // this is just "is the overlay open right now," not "is something in
  // progress" (that's still read straight off the data wherever it's shown).
  const [activeLiveTarget, setActiveLiveTarget] = useState(null);

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

  function updateAndSave({ nextCustom = customExercises, nextPlans = plans, nextSeason = season, nextProfile = profile, nextKip = kipMessages, nextMatches = matches, nextAdHoc = adHocSessions, nextOpponents = opponents, nextGeneralUploads = generalUploads, nextReports = reports }) {
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
    persist({ customExercises: nextCustom, plans: nextPlans, season: nextSeason, profile: nextProfile, kipMessages: nextKip, matches: nextMatches, adHocSessions: nextAdHoc, opponents: nextOpponents, generalUploads: nextGeneralUploads, reports: nextReports });
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
      <div className="flex-1 overflow-y-auto pb-20 max-w-md w-full mx-auto">
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
          />
        )}
        {tab === "record" && (
          <RecordTab
            plans={plans}
            adHocSessions={adHocSessions}
            matches={matches}
            exercises={allExercises}
            season={season}
            opponents={opponents}
            onSave={savePlan}
            onSaveAdHoc={saveAdHocSession}
            onSaveMatch={saveMatch}
            onSaveOpponentRoster={saveOpponentRoster}
            onOpenLiveRecorder={setActiveLiveTarget}
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
            reports={reports}
            onReportGenerated={addReportAndNotify}
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
            onUpdatePatch={(patch) => saveMatch({ ...liveMatch, ...patch })}
            onFinish={(patch) => {
              const { recording, ...rest } = liveMatch;
              saveMatch({ ...rest, ...patch });
              setActiveLiveTarget(null);
            }}
            onExit={() => setActiveLiveTarget(null)}
            onDelete={() => {
              deleteMatch(liveMatch.id);
              setActiveLiveTarget(null);
            }}
          />
        );
      })()}

      <BottomNav tab={tab} setTab={setTab} hasKipAlert={hasKipAlert} />
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
    { id: "library", label: "Library", Icon: BookOpen },
    { id: "record", label: "Record", Icon: Circle },
    { id: "plans", label: "Plans", Icon: ListChecks },
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

function Builder({ exercises, season, profile, matches, plans, adHocSessions, opponents = [], kipMessages = [], onSaveMessages, onSave, onBack }) {
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

function Plans({ plans, exercises, season, profile, onSave, onDelete, onSetSessionDate, matches, onSaveMatch, adHocSessions, onSaveAdHoc, onDeleteAdHoc, opponents = [], onSaveOpponentRoster, onOpenLiveRecorder, kipMessages, onSaveMessages }) {
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
      />
    );
  }

  const streak = weeklyStreak(plans);
  const next = nextSuggestedSession(plans);
  const trend = rpeTrend(plans);

  return (
    <div className="px-4 pt-4 pb-6 space-y-3">
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
              if (!next.session.recording) {
                const next2 = {
                  ...next.plan,
                  weeks: next.plan.weeks.map((ww) => ww.weekId === next.week.weekId
                    ? { ...ww, sessions: ww.sessions.map((ss) => (ss.sessionId === next.session.sessionId ? { ...ss, recording: startRecording() } : ss)) }
                    : ww),
                };
                onSave(next2);
              }
              onOpenLiveRecorder({ kind: "plan", planId: next.plan.id, weekId: next.week.weekId, sessionId: next.session.sessionId, focus: next.session.focus });
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
function RecordTab({ plans, adHocSessions, matches, season, opponents, onSave, onSaveAdHoc, onSaveMatch, onSaveOpponentRoster, onOpenLiveRecorder }) {
  const [showLiveMatchForm, setShowLiveMatchForm] = useState(false);
  const active = findActiveRecording({ plans, adHocSessions, matches });

  function startTraining() {
    const next = nextSuggestedSession(plans);
    if (next) {
      const nextPlan = {
        ...next.plan,
        weeks: next.plan.weeks.map((ww) => ww.weekId === next.week.weekId
          ? { ...ww, sessions: ww.sessions.map((ss) => (ss.sessionId === next.session.sessionId ? { ...ss, recording: startRecording() } : ss)) }
          : ww),
      };
      onSave(nextPlan);
      onOpenLiveRecorder({ kind: "plan", planId: next.plan.id, weekId: next.week.weekId, sessionId: next.session.sessionId, focus: next.session.focus });
    } else {
      const session = {
        id: uid(), title: "", notes: "", date: new Date().toISOString().slice(0, 10),
        exerciseIds: [], doneExerciseIds: [], exerciseLogs: {},
        completed: false, rpe: null, note: "", completedAt: null,
        recording: startRecording(),
      };
      onSaveAdHoc(session);
      onOpenLiveRecorder({ kind: "adhoc", sessionId: session.id });
    }
  }

  const resumeLabel = !active ? null
    : active.kind === "match"
      ? `Resume recording — vs ${matches.find((m) => m.id === active.matchId)?.opponent || "match"}`
      : "Resume recording — training";

  return (
    <div className="px-4 pt-4 pb-8">
      <h2 className="text-lg font-black mb-3" style={{ color: "#12213A" }}>Record</h2>

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
          <button onClick={startTraining} className="w-full text-left bg-white rounded-lg border-2 p-4 flex items-center gap-3" style={{ borderColor: "#0E8388" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: "#0E8388" }}>
              <span className="w-3 h-3 rounded-full" style={{ background: "#fff" }} />
            </div>
            <div>
              <div className="font-bold text-sm" style={{ color: "#12213A" }}>Record training session</div>
              <div className="text-xs text-gray-500 mt-0.5">Starts your next planned session, or a one-off if nothing's due</div>
            </div>
          </button>
          <button onClick={() => setShowLiveMatchForm(true)} className="w-full text-left bg-white rounded-lg border-2 p-4 flex items-center gap-3" style={{ borderColor: "#0E8388" }}>
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

      {showLiveMatchForm && (
        <MatchFormModal
          season={season}
          matches={matches}
          opponents={opponents}
          onSaveOpponentRoster={onSaveOpponentRoster}
          title="Start a live match"
          submitLabel="Start recording"
          onClose={() => setShowLiveMatchForm(false)}
          onSave={(m) => {
            const withRecording = { ...m, recording: startRecording() };
            onSaveMatch(withRecording);
            setShowLiveMatchForm(false);
            onOpenLiveRecorder({ kind: "match", matchId: withRecording.id });
          }}
        />
      )}
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
function UploadsScreen({ profile, onSaveProfile, generalUploads, onAddGeneralUpload, onRemoveGeneralUpload, plans, onApplyPtPlan, onBack }) {
  const niggles = profile.niggles || [];
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState(null);
  const [linkTo, setLinkTo] = useState("general");
  const [extracting, setExtracting] = useState(null); // { file, sourceNiggleId }
  const fileInputRef = React.useRef(null);

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
    </div>
  );
}

// The actual home for the profile form and Uploads — both previously only
// reachable via links buried inside Kip chat. Uploads is a local toggle
// (mirroring Plans' own showBuilder pattern) rather than an App-level
// overlay, since it's now scoped to this tab rather than floating above all
// of them. onCancel is deliberately omitted from KipOnboarding here: there's
// no other screen to cancel back to, Profile IS the destination.
function ProfileTab({ profile, onSaveProfile, exercises, plans, onApplyPtPlan, generalUploads, onAddGeneralUpload, onRemoveGeneralUpload }) {
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
        onBack={() => setShowUploads(false)}
      />
    );
  }

  return (
    <div>
      <div className="px-4 pt-4 flex justify-end">
        <button onClick={() => setShowUploads(true)} className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: "#0E8388" }}>
          <Paperclip size={12} /> Uploads
        </button>
      </div>
      <NotificationsSection profile={profile} onSaveProfile={onSaveProfile} />
      <KipOnboarding
        profile={profile}
        onSave={onSaveProfile}
        onCancel={null}
        onSaveProfile={onSaveProfile}
        exercises={exercises}
        plans={plans}
        onApplyPtPlan={onApplyPtPlan}
      />
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
/* ---------------------------------------------------------------- */

function computeReportData({ matches, plans, adHocSessions, exercises, season }) {
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

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 190px)" }}>
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
  // undefined = type not chosen yet; null = "logged without a type" — both
  // distinct from "no roster step needed", which is decided by roster.length.
  const [shotType, setShotType] = useState(undefined);
  const [timestamp, setTimestamp] = useState("");
  const types = shotTypesFor(season);
  const videoTimestamp = timestamp.trim() || null;

  function chooseType(t) {
    if (roster.length > 0) setShotType(t);
    else onSave({ zone, outcome, shotType: t, videoTimestamp, shooterNumber: null });
  }
  function finalize(shooterNumber) {
    onSave({ zone, outcome, shotType, videoTimestamp, shooterNumber: shooterNumber || null });
  }

  const showShooterStep = outcome && shotType !== undefined && roster.length > 0;

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

function MatchFormModal({ season, matches, onClose, onSave, initialDate, title = "New match", submitLabel = "Create match", opponents = [], onSaveOpponentRoster }) {
  const [form, setForm] = useState({ date: initialDate || new Date().toISOString().slice(0, 10), opponent: "", competition: "", result: "", season, videoUrl: "" });
  const [rosterOpen, setRosterOpen] = useState(false);
  const valid = form.date && form.opponent.trim();
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
        <button disabled={!valid} onClick={() => onSave({ id: uid(), ...form, shots: [] })} className="w-full py-2.5 rounded-lg text-sm font-bold text-white disabled:opacity-40" style={{ background: "#0E8388" }}>
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

  function logShot({ zone, outcome, shotType, videoTimestamp, shooterNumber }) {
    const shot = { id: uid(), zone, outcome, shotType: shotType || null, videoTimestamp: videoTimestamp || null, shooterNumber: shooterNumber || null };
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

function LiveMatchRecorder({ match, opponents = [], onUpdatePatch, onFinish, onExit, onDelete, profile, season, plans, matches, adHocSessions, exercises, onOpenKip }) {
  const [now, setNow] = useState(Date.now());
  const [zoneTap, setZoneTap] = useState(null);
  const [wrappingUp, setWrappingUp] = useState(false);
  const [confirmDeleting, setConfirmDeleting] = useState(false);
  const [showKipPanel, setShowKipPanel] = useState(false);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const recording = match.recording;
  const isPaused = !!recording?.pausedAt;
  const elapsed = recordingElapsedMs(recording, now);

  const zones = emptyZoneMap();
  (match.shots || []).forEach((s) => {
    if (!zones[s.zone]) return;
    if (s.outcome === "Save") zones[s.zone].saves++;
    else zones[s.zone].goals++;
  });
  const totalShots = (match.shots || []).length;
  const totalSaves = (match.shots || []).filter((s) => s.outcome === "Save").length;
  const savePct = totalShots > 0 ? Math.round((totalSaves / totalShots) * 100) : 0;

  function logShot({ zone, outcome, shotType, videoTimestamp, shooterNumber }) {
    const shot = { id: uid(), zone, outcome, shotType: shotType || null, videoTimestamp: videoTimestamp || null, shooterNumber: shooterNumber || null };
    onUpdatePatch({ shots: [...(match.shots || []), shot] });
    setZoneTap(null);
  }
  function removeShot(id) {
    onUpdatePatch({ shots: (match.shots || []).filter((s) => s.id !== id) });
  }

  function finish() {
    if (!match.competition && !match.result) setWrappingUp(true);
    else onFinish({ durationMinutes: recordingElapsedMinutes(recording) });
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

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Tap a zone to log a shot</div>
        <GoalGrid zones={zones} onZoneTap={(z) => setZoneTap(z)} />

        {totalShots > 0 && (
          <div className="mt-4">
            <div className="text-[11px] font-bold uppercase tracking-wide text-gray-400 mb-1.5">Logged shots</div>
            <div className="space-y-1.5">
              {[...(match.shots || [])].reverse().map((s) => (
                <div key={s.id} className="flex items-center justify-between bg-white rounded-md border px-2.5 py-1.5" style={{ borderColor: "#DAD7CC" }}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold" style={{ color: s.outcome === "Save" ? "#0E8388" : "#C1483B" }}>{s.outcome}</span>
                    <span className="text-gray-500">{ZONE_LABELS[s.zone]}</span>
                    {s.shotType && <span className="text-gray-400">· {s.shotType}</span>}
                  {s.shooterNumber && <span className="text-gray-400">· #{s.shooterNumber}</span>}
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

      {zoneTap && <ShotLogModal season={match.season} zone={zoneTap} videoUrl={match.videoUrl} roster={findOpponentRoster(opponents, match.opponent)?.roster} onClose={() => setZoneTap(null)} onSave={logShot} />}

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
          <p className="text-sm text-gray-600 mb-4">This match was created for this recording, so deleting it removes it — and any shots already logged — completely. This can't be undone.</p>
          <div className="flex gap-2">
            <button onClick={() => setConfirmDeleting(false)} className="flex-1 py-2.5 rounded-lg text-sm font-bold border" style={{ borderColor: "#DAD7CC" }}>Keep it</button>
            <button onClick={onDelete} className="flex-1 py-2.5 rounded-lg text-sm font-bold text-white" style={{ background: "#C1483B" }}>Delete</button>
          </div>
        </Modal>
      )}

      {wrappingUp && (
        <MatchWrapUpModal
          match={match}
          durationMinutes={recordingElapsedMinutes(recording)}
          onClose={() => setWrappingUp(false)}
          onSave={(patch) => onFinish(patch)}
        />
      )}
    </div>
  );
}

function StatsTab({ matches, season, onSave, onDelete, plans, exercises, adHocSessions, opponents = [], onSaveOpponentRoster, onOpenLiveRecorder, profile, reports = [], onReportGenerated }) {
  const [openMatchId, setOpenMatchId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showLiveForm, setShowLiveForm] = useState(false);
  const [filter, setFilter] = useState(season);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [reportError, setReportError] = useState(null);
  const [openReportId, setOpenReportId] = useState(null);

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
        <div className="flex items-center gap-2">
          <button
            onClick={() => (inProgressMatch ? onOpenLiveRecorder({ kind: "match", matchId: inProgressMatch.id }) : setShowLiveForm(true))}
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
          <button onClick={handleGenerateReport} disabled={generatingReport} className="text-[11px] font-bold disabled:opacity-40" style={{ color: "#0E8388" }}>
            {generatingReport ? "Generating…" : "+ Generate report"}
          </button>
        </div>
        {reportError && <div className="text-[11px] mb-1" style={{ color: "#C1483B" }}>{reportError}</div>}
        {reports.length === 0 ? (
          <div className="text-[11px] text-gray-400">A real written summary of your training consistency, match trends, and rep progress — pulled together from your logged data, not just a chat message that scrolls away.</div>
        ) : (
          <div className="space-y-1.5">
            {[...reports].reverse().slice(0, 4).map((r) => (
              <button key={r.id} onClick={() => setOpenReportId(r.id)} className="w-full text-left flex items-center justify-between rounded-md px-2.5 py-2 text-xs" style={{ background: "#F3F2ED" }}>
                <span className="font-semibold" style={{ color: "#12213A" }}>{formatShortDate(r.createdAt.slice(0, 10))} report</span>
                <ChevronRight size={14} color="#8A8779" />
              </button>
            ))}
          </div>
        )}
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
          matches={matches}
          opponents={opponents}
          onSaveOpponentRoster={onSaveOpponentRoster}
          onClose={() => setShowForm(false)}
          onSave={(m) => { onSave(m); setShowForm(false); setOpenMatchId(m.id); }}
        />
      )}

      {showLiveForm && (
        <MatchFormModal
          season={season}
          matches={matches}
          opponents={opponents}
          onSaveOpponentRoster={onSaveOpponentRoster}
          title="Start a live match"
          submitLabel="Start recording"
          onClose={() => setShowLiveForm(false)}
          onSave={(m) => {
            const withRecording = { ...m, recording: startRecording() };
            onSave(withRecording);
            setShowLiveForm(false);
            onOpenLiveRecorder({ kind: "match", matchId: withRecording.id });
          }}
        />
      )}

      <WorkoutStats plans={plans} exercises={exercises} adHocSessions={adHocSessions} />

      {openReportId && (() => {
        const report = reports.find((r) => r.id === openReportId);
        if (!report) return null;
        return <ReportDetailModal report={report} onClose={() => setOpenReportId(null)} />;
      })()}
    </div>
  );
}

function ReportDetailModal({ report, onClose }) {
  const d = report.data;
  return (
    <Modal onClose={onClose}>
      <div className="flex items-center gap-1.5 mb-1">
        <BarChart3 size={15} color="#0E8388" />
        <h3 className="text-base font-black" style={{ color: "#12213A" }}>{formatShortDate(report.createdAt.slice(0, 10))} report</h3>
      </div>
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
