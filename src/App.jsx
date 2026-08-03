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
import { loadUserData, saveUserData, uploadNiggleFile, getSignedNiggleFileUrl, deleteNiggleFile } from "./lib/storage.js";
import { supabase } from "./lib/supabaseClient.js";
import { useAuth } from "./auth/AuthProvider.jsx";
import { AngleNarrowingDiagram, ShadowOfBlockDiagram, WingShotGeometryDiagram, StraightShotCornerDiagram } from "./diagrams.jsx";

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

// Shared key for anything grouped by opponent name — matches, opponent
// records, and the roster below all key off this exact normalization so a
// team is recognized as "the same opponent" regardless of casing/whitespace.
function normalizeOpponentName(name) {
  return (name || "").trim().toLowerCase();
}

// Best-effort record: only counts matches whose free-text "result" field ends in a
// standalone W/L/D (the form's own placeholder convention, e.g. "24-19 W"). Matches that
// don't parse still count toward the match total and save% below, just not the record.
function opponentRecord(matches, opponentName, excludeId) {
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
function findOpponentRoster(opponents, opponentName) {
  const key = normalizeOpponentName(opponentName);
  if (!key) return null;
  return (opponents || []).find((o) => o.key === key) || null;
}

function upsertOpponentRoster(opponents, opponentName, roster) {
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
function shooterStats(matches, opponentName, roster) {
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
function mostDangerousShooter(matches, opponentName, roster) {
  const stats = shooterStats(matches, opponentName, roster).filter((s) => s.goals > 0);
  return stats.length ? stats[0] : null;
}

// mm:ss or h:mm:ss free text (matches whatever convention the keeper's video platform uses).
function parseTimestampToSeconds(ts) {
  if (!ts) return null;
  const parts = ts.split(":").map((p) => Number(p.trim()));
  if (parts.length === 0 || parts.some((n) => Number.isNaN(n))) return null;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0];
}

// Deep-links only for recognisable YouTube URLs (the one host with a reliable &t= param);
// everything else falls back to the plain video link — no automatic detection, per the brief.
function videoLinkForShot(videoUrl, timestamp) {
  if (!videoUrl) return null;
  const seconds = parseTimestampToSeconds(timestamp);
  if (seconds == null) return videoUrl;
  if (/youtu\.?be/i.test(videoUrl)) {
    const sep = videoUrl.includes("?") ? "&" : "?";
    return `${videoUrl}${sep}t=${seconds}s`;
  }
  return videoUrl;
}

function zoneColor(z) {
  const total = z.saves + z.goals;
  if (total === 0) return "#F3F2ED";
  const pct = z.saves / total;
  if (pct >= 0.6) return "#0E8388";
  if (pct >= 0.4) return "#E2984B";
  return "#C1483B";
}

function buildKipSystemPrompt(profile, plans, season, matches, exercises = [], adHocSessions = []) {
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
const NIGGLE_AREA_KEYWORDS = {
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

function matchNiggleAreas(partText) {
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
function excludedExerciseIdsForNiggles(exercises, niggles) {
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
const NEAR_POST_ZONES = ["TL", "ML", "BL", "TR", "MR", "BR"];
const LOW_ZONES = ["BL", "BM", "BR"];
const EXERCISE_ZONE_MAP = {
  e17: NEAR_POST_ZONES, // Near-Post Coverage Drill
  e22: NEAR_POST_ZONES, // Wing Shot Angle Reading
  e8: LOW_ZONES, // Low Ball Smother Drill
};
const EXERCISE_SHOTTYPE_MAP = {
  e21: "Spin / 360", // Spin Shot Anticipation
  e26: "Spin / 360", // Beach Penalty (Spin) Reps
};

const MATCH_DATA_MIN_MATCHES = 3;
const MATCH_DATA_MIN_SHOTS = 15;
const TRAINING_LOG_MIN_SESSIONS = 4;
const TRAINING_LOG_WINDOW_DAYS = 42; // 6 weeks

function weakestZoneSignal(matches, season) {
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

function weakestShotTypeSignal(matches, season) {
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
function categoryTrainingSignal(plans, season, exercises) {
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
function isPlateaued(history) {
  if (history.length < 3) return false;
  const last3 = history.slice(-3);
  return last3[2].e1rm <= last3[0].e1rm * 1.02;
}

function exerciseGenWeight(ex, ctx) {
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

  return { weight, reason };
}

// Weighted sampling without replacement, auto-refilling once exhausted.
// Keeps higher-weight exercises appearing more often across a block's
// slots without ever guaranteeing a fixed "data-driven slot" count, and
// without repeating an exercise twice in the same pass through the pool.
function makeWeightedPicker(items, weightFn) {
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

function generateGoalBlock(name, season, goalId, exercises, dataContext = null) {
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
    const hasSignal = niggleExcluded.size > 0 || zoneSignal || shotTypeSignal || trainingSignal || anyPlateaued;
    if (hasSignal) {
      excludedIds = niggleExcluded;
      ctx = { zoneSignal, shotTypeSignal, trainingSignal, plans, adHocSessions };
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

function completedSessionsWithMeta(plans) {
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

function rpeTrend(plans) {
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
function weekStartKey(dateLike) {
  const dt = new Date(dateLike);
  const day = (dt.getDay() + 6) % 7;
  dt.setDate(dt.getDate() - day);
  dt.setHours(0, 0, 0, 0);
  return dt.toISOString().slice(0, 10);
}

function formatShortDate(dateStr) {
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

function startRecording() {
  return { startedAt: new Date().toISOString(), pausedAt: null, totalPausedMs: 0 };
}

function pauseRecording(recording) {
  if (!recording || recording.pausedAt) return recording;
  return { ...recording, pausedAt: new Date().toISOString() };
}

function resumeRecording(recording) {
  if (!recording || !recording.pausedAt) return recording;
  const pausedMs = Date.now() - new Date(recording.pausedAt).getTime();
  return { ...recording, pausedAt: null, totalPausedMs: (recording.totalPausedMs || 0) + pausedMs };
}

function recordingElapsedMs(recording, now = Date.now()) {
  if (!recording) return 0;
  const end = recording.pausedAt ? new Date(recording.pausedAt).getTime() : now;
  return Math.max(0, end - new Date(recording.startedAt).getTime() - (recording.totalPausedMs || 0));
}

function formatElapsed(ms) {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

// Minutes, rounded, for auto-filling a duration field from a finished recording.
function recordingElapsedMinutes(recording) {
  return Math.round(recordingElapsedMs(recording) / 60000);
}

// Scans freshly-loaded data (not React state, which wouldn't be updated yet)
// for any plan session, ad-hoc session, or match left with an unfinished
// `recording` — e.g. the app was closed mid-recording. Used once on app load
// to jump straight back into the live recorder instead of defaulting to Library.
function findActiveRecording({ plans, adHocSessions, matches }) {
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
function dateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

// Monday-start month grid: array of 42 cells (6 weeks), each either a day
// number or null for the leading/trailing blanks.
function monthMatrix(year, month) {
  const first = new Date(year, month, 1);
  const startOffset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function weeklyStreak(plans) {
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
function nextSuggestedSession(plans) {
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

function parseRepsFromFormat(format) {
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

function makeReps(format) {
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
function repsDisplay(entry) {
  return entry.repsRaw ?? entry.prescription ?? "";
}

function epley1RM(weight, reps) {
  return (weight || 0) * (1 + (reps || 0) / 30);
}

// Library exercise descriptions are written as three "\n\n"-separated parts —
// what it trains, how to do it (one step per line), common mistake. Custom
// user-written descriptions won't match this shape, so callers must fall
// back to rendering the raw string when this returns null.
function parseExerciseDesc(desc) {
  if (!desc) return null;
  const parts = desc.split("\n\n").map((p) => p.trim()).filter(Boolean);
  if (parts.length !== 3) return null;
  const [whatWhy, howTo, mistake] = parts;
  const steps = howTo.split("\n").map((s) => s.trim()).filter(Boolean);
  return { whatWhy, steps, mistake };
}

// History for one exercise's logged gym sets, across every completed
// session in every plan — same flatten-then-sort shape as rpeTrend.
function exerciseLogHistory(plans, exerciseId, adHocSessions = []) {
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

const SESSION_POINTS = 10;
const MATCH_POINTS = 15;
const PR_POINTS = 25;

function loggedGymExerciseIds(plans, adHocSessions = []) {
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

function totalPrCount(plans, adHocSessions = []) {
  let count = 0;
  loggedGymExerciseIds(plans, adHocSessions).forEach((id) => {
    count += exerciseLogHistory(plans, id, adHocSessions).filter((h) => h.isPr).length;
  });
  return count;
}

function computeTotalPoints(plans, adHocSessions, matches) {
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

const BADGES = [
  { id: "first_save", name: "First Save", description: "Completed your first training session." },
  { id: "clean_week", name: "Clean Sheet Week", description: "Completed every session in a planned week." },
  { id: "month_streak", name: "Month of Reps", description: "Trained four weeks in a row." },
  { id: "block_complete", name: "Block Complete", description: "Finished every session in a full 6-week block." },
];

function computeEarnedBadgeIds(plans, adHocSessions) {
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
const TREND_MIN_MATCHES = 4;
const TREND_MIN_SHOTS_PER_HALF = 4;
const TREND_SWING_POINTS = 15;

function splitMatchHalves(matches, seasonFilter) {
  const subset = matches.filter((m) => m.season === seasonFilter).sort((a, b) => new Date(a.date) - new Date(b.date));
  if (subset.length < TREND_MIN_MATCHES) return null;
  const mid = Math.floor(subset.length / 2);
  return { older: subset.slice(0, mid), newer: subset.slice(mid) };
}

function zoneTallies(matchesSubset) {
  const zones = emptyZoneMap();
  matchesSubset.forEach((m) => (m.shots || []).forEach((s) => {
    const z = zones[s.zone];
    if (!z) return;
    if (s.outcome === "Save") z.saves++; else z.goals++;
  }));
  return zones;
}

function zoneTrendSignals(matches, season) {
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

function shotTypeTallies(matchesSubset) {
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
function shotTypeTrendSignals(matches) {
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
function missedSessionsSignals(plans) {
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

function rpeHighSignal(plans, adHocSessions) {
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
function streakAtRiskSignal(plans) {
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

const NIGGLE_QUIET_DAYS = 10;

function niggleQuietSignals(profile) {
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

function newPrSignals(plans, exercises, adHocSessions = []) {
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

function completedBlockSignals(plans) {
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
function computeKipAlerts({ profile, plans, adHocSessions, matches, season, exercises }) {
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

function describeAlertItem(item) {
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
  // One-shot seed for auto-resuming into a live recorder right after app
  // load — never set again afterward, so normal tab navigation later still
  // shows the ordinary "Resume recording" prompt rather than force-opening it.
  const [resumeTarget, setResumeTarget] = useState(null);

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

          const active = findActiveRecording({ plans: parsed.plans, adHocSessions: parsed.adHocSessions, matches: parsed.matches });
          if (active) {
            setTab(active.kind === "match" ? "stats" : "plans");
            setResumeTarget(active);
          }
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

  function updateAndSave({ nextCustom = customExercises, nextPlans = plans, nextSeason = season, nextProfile = profile, nextKip = kipMessages, nextMatches = matches, nextAdHoc = adHocSessions, nextOpponents = opponents }) {
    setCustomExercises(nextCustom);
    setPlans(nextPlans);
    setSeason(nextSeason);
    setProfile(nextProfile);
    setKipMessages(nextKip);
    setMatches(nextMatches);
    setAdHocSessions(nextAdHoc);
    setOpponents(nextOpponents);
    persist({ customExercises: nextCustom, plans: nextPlans, season: nextSeason, profile: nextProfile, kipMessages: nextKip, matches: nextMatches, adHocSessions: nextAdHoc, opponents: nextOpponents });
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

  function saveOpponentRoster(opponentName, roster) {
    updateAndSave({ nextOpponents: upsertOpponentRoster(opponents, opponentName, roster) });
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
          />
        )}
        {tab === "builder" && (
          <Builder
            exercises={allExercises}
            season={season}
            profile={profile}
            matches={matches}
            plans={plans}
            adHocSessions={adHocSessions}
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
            onSetSessionDate={setPlanSessionDate}
            matches={matches}
            onSaveMatch={saveMatch}
            adHocSessions={adHocSessions}
            onSaveAdHoc={saveAdHocSession}
            onDeleteAdHoc={deleteAdHocSession}
            opponents={opponents}
            onSaveOpponentRoster={saveOpponentRoster}
            initialLiveTarget={resumeTarget && resumeTarget.kind !== "match" ? resumeTarget : null}
            onConsumedInitialLiveTarget={() => setResumeTarget(null)}
          />
        )}
        {tab === "advice" && <AdviceHub />}
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
            initialLiveMatchId={resumeTarget && resumeTarget.kind === "match" ? resumeTarget.matchId : null}
            onConsumedInitialLiveMatchId={() => setResumeTarget(null)}
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
          />
        )}
      </div>
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

function Builder({ exercises, season, profile, matches, plans, adHocSessions, onSave }) {
  const [step, setStep] = useState("setup");
  const [name, setName] = useState("");
  const [blockSeason, setBlockSeason] = useState(season);
  const [method, setMethod] = useState(null);
  const [goalId, setGoalId] = useState(null);
  const [sessionsPerWeek, setSessionsPerWeek] = useState(3);
  const [useData, setUseData] = useState(false);
  const [draft, setDraft] = useState(null);

  // Same eligibility checks generateGoalBlock itself runs — shown here only
  // so the toggle can be honest about whether it'll actually change anything,
  // never so it blocks or errors when data is thin.
  const hasAnySignal = Boolean(
    weakestZoneSignal(matches || [], blockSeason)
    || weakestShotTypeSignal(matches || [], blockSeason)
    || categoryTrainingSignal(plans || [], blockSeason, exercises)
    || (profile?.niggles || []).some((n) => n.severity === "Significant" || !n.clearedByPhysio)
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

          <label className="flex items-start gap-2.5 mt-4 bg-white rounded-lg border p-3 cursor-pointer" style={{ borderColor: useData ? "#0E8388" : "#DAD7CC", borderWidth: useData ? 2 : 1 }}>
            <input type="checkbox" checked={useData} onChange={(e) => setUseData(e.target.checked)} className="mt-0.5" />
            <div>
              <div className="text-sm font-bold" style={{ color: "#12213A" }}>Use my data</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {hasAnySignal
                  ? "Bias exercise selection toward your weak zones, high-effort categories, and any niggles."
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
                              <div className="text-xs font-semibold truncate">{ex.name}</div>
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

function Plans({ plans, exercises, onSave, onDelete, onSetSessionDate, matches, onSaveMatch, adHocSessions, onSaveAdHoc, onDeleteAdHoc, opponents = [], onSaveOpponentRoster, initialLiveTarget = null, onConsumedInitialLiveTarget }) {
  const [view, setView] = useState("list"); // "list" | "calendar"
  const [openId, setOpenId] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [logTarget, setLogTarget] = useState(null); // { plan, weekId, sessionId }
  const [dateTarget, setDateTarget] = useState(null); // { plan, weekId, sessionId, current }
  const [adHocFormTarget, setAdHocFormTarget] = useState(null); // { session } | { date } | null-but-open via boolean below
  const [showAdHocForm, setShowAdHocForm] = useState(false);
  const [adHocLogTarget, setAdHocLogTarget] = useState(null); // adHocSession
  const [confirmDeleteAdHoc, setConfirmDeleteAdHoc] = useState(null);
  const [matchFormDate, setMatchFormDate] = useState(null); // date string, non-null means "open match form"
  const [liveTarget, setLiveTarget] = useState(initialLiveTarget); // { kind: "plan", planId, weekId, sessionId, focus } | { kind: "adhoc", sessionId }

  // Seeds liveTarget on the very first mount right after an app-load
  // auto-resume, then reports back so the parent clears its one-shot state —
  // otherwise a later, ordinary visit to this tab would wrongly re-trigger it.
  useEffect(() => {
    if (initialLiveTarget) onConsumedInitialLiveTarget?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Re-derived fresh from current plans/adHocSessions every render (never
  // stored as a snapshot) so live updates during recording — and resuming
  // after the tab was closed — always show the real current state.
  const livePlan = liveTarget?.kind === "plan" ? plans.find((p) => p.id === liveTarget.planId) : null;
  const liveSession = liveTarget?.kind === "plan"
    ? livePlan?.weeks.find((w) => w.weekId === liveTarget.weekId)?.sessions.find((s) => s.sessionId === liveTarget.sessionId)
    : liveTarget?.kind === "adhoc"
      ? adHocSessions.find((s) => s.id === liveTarget.sessionId)
      : null;

  if (liveTarget && liveSession) {
    return (
      <LiveSessionRecorder
        session={liveSession}
        kind={liveTarget.kind}
        exercises={exercises}
        focus={liveTarget.focus}
        onUpdatePatch={(patch) => {
          if (liveTarget.kind === "plan") {
            const next = {
              ...livePlan,
              weeks: livePlan.weeks.map((ww) => ww.weekId === liveTarget.weekId
                ? { ...ww, sessions: ww.sessions.map((ss) => (ss.sessionId === liveTarget.sessionId ? { ...ss, ...patch } : ss)) }
                : ww),
            };
            onSave(next);
          } else {
            onSaveAdHoc({ ...liveSession, ...patch });
          }
        }}
        onFinish={({ rpe, note, durationMinutes, exercises: exercisesNext, exerciseLogs }) => {
          if (liveTarget.kind === "plan") {
            const { recording, ...rest } = liveSession;
            const next = {
              ...livePlan,
              weeks: livePlan.weeks.map((ww) => ww.weekId === liveTarget.weekId
                ? { ...ww, sessions: ww.sessions.map((ss) => (ss.sessionId === liveTarget.sessionId
                    ? { ...rest, completed: true, rpe, note, durationMinutes, completedAt: new Date().toISOString(), exercises: exercisesNext }
                    : ss)) }
                : ww),
            };
            onSave(next);
          } else {
            const { recording, ...rest } = liveSession;
            onSaveAdHoc({ ...rest, completed: true, rpe, note, durationMinutes, completedAt: new Date().toISOString(), exerciseLogs });
          }
          setLiveTarget(null);
        }}
        onExit={() => setLiveTarget(null)}
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
          <div className="text-xs text-gray-500 mt-1">Head to Build to create your first 6-week block, or switch to Calendar to add a one-off session.</div>
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
              setLiveTarget({ kind: "plan", planId: next.plan.id, weekId: next.week.weekId, sessionId: next.session.sessionId, focus: next.session.focus });
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
                                  {ex.name} <span className="text-gray-400">— {repsDisplay(entry)}</span>
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
              setLiveTarget({ kind: "adhoc", sessionId: session.id });
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
            onClick={() => (s.recording ? setLiveTarget({ kind: "adhoc", sessionId: s.id }) : setAdHocLogTarget(s))}
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
function LiveSessionRecorder({ session, kind, exercises, focus, onUpdatePatch, onFinish, onExit }) {
  const [now, setNow] = useState(Date.now());
  const [picker, setPicker] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [finishing, setFinishing] = useState(false);

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
        <button onClick={onExit} className="flex items-center gap-1 text-xs font-semibold text-white/70 mb-2">
          <ChevronDown size={14} /> Minimize
        </button>
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
                  <div className="text-sm font-semibold" style={{ color: "#12213A" }}>{ex.name}</div>
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

function KipTab({ profile, onSaveProfile, messages, onSaveMessages, plans, season, matches, exercises, adHocSessions }) {
  const [editing, setEditing] = useState(!profile.onboarded);

  if (editing) {
    return (
      <KipOnboarding
        profile={profile}
        onSave={(p) => { onSaveProfile(p); setEditing(false); }}
        onCancel={profile.onboarded ? () => setEditing(false) : null}
        onSaveProfile={onSaveProfile}
        exercises={exercises}
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
      onEditProfile={() => setEditing(true)}
    />
  );
}

function NiggleDetailModal({ niggle, exercises, onClose, onSave }) {
  const [addingLog, setAddingLog] = useState(false);
  const [logDate, setLogDate] = useState(new Date().toISOString().slice(0, 10));
  const [logNote, setLogNote] = useState("");
  const [logExerciseIds, setLogExerciseIds] = useState([]);
  const [picker, setPicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileError, setFileError] = useState(null);
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
        <p className="text-[10px] text-gray-400 mt-1.5">Stored privately — only you can access these. Not parsed or scheduled automatically; create a one-off session yourself if you want to work from what's here.</p>
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
      <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.875rem;outline:none;}`}</style>
    </Modal>
  );
}

function KipOnboarding({ profile, onSave, onCancel, onSaveProfile, exercises }) {
  const [niggleDetailId, setNiggleDetailId] = useState(null);
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
          onClose={() => setNiggleDetailId(null)}
          onSave={saveNiggleImmediately}
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
          {onCancel ? "Save changes" : "Start chatting with Kip"}
        </button>
      </div>
      <style>{`.input{width:100%;background:#fff;border:1px solid #DAD7CC;border-radius:0.5rem;padding:0.55rem 0.7rem;font-size:0.875rem;outline:none;}`}</style>
    </div>
  );
}

async function callKip(systemPrompt, apiMessages) {
  const { data: { session } } = await supabase.auth.getSession();
  const response = await fetch("/.netlify/functions/kip-chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session?.access_token}`,
    },
    body: JSON.stringify({ system: systemPrompt, messages: apiMessages }),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Kip request failed");
  return (data.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
}

function KipChat({ profile, onSaveProfile, messages, onSaveMessages, plans, season, matches, exercises, adHocSessions, onEditProfile }) {
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
          onSaveMessages([...messages, { role: "assistant", content: textResp, ts: Date.now(), isAlert: true }]);
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
      const textResp = await callKip(systemPrompt, nextMessages.map((m) => ({ role: m.role, content: m.content })));
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
      <div className="px-4 pt-3 pb-2 shrink-0">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-1.5">
            <Sparkles size={15} color="#0E8388" />
            <span className="text-sm font-black" style={{ color: "#12213A" }}>Kip</span>
            <span className="text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded" style={{ background: "#F3F2ED", color: "#8A8779" }}>Beta</span>
          </div>
          <button onClick={onEditProfile} className="text-[11px] font-semibold" style={{ color: "#0E8388" }}>Edit profile</button>
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

      {showBadges && (
        <BadgesModal points={points} earnedBadgeIds={earnedBadgeIds} onClose={() => setShowBadges(false)} />
      )}
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
                <>
                  <ul className="px-3 pb-3 space-y-2">
                    {t.tips.map((tip, i) => (
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

function LiveMatchRecorder({ match, opponents = [], onUpdatePatch, onFinish, onExit }) {
  const [now, setNow] = useState(Date.now());
  const [zoneTap, setZoneTap] = useState(null);
  const [wrappingUp, setWrappingUp] = useState(false);

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
        <button onClick={onExit} className="flex items-center gap-1 text-xs font-semibold text-white/70 mb-2">
          <ChevronDown size={14} /> Minimize
        </button>
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

function StatsTab({ matches, season, onSave, onDelete, plans, exercises, adHocSessions, opponents = [], onSaveOpponentRoster, initialLiveMatchId = null, onConsumedInitialLiveMatchId }) {
  const [openMatchId, setOpenMatchId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showLiveForm, setShowLiveForm] = useState(false);
  const [liveMatchId, setLiveMatchId] = useState(initialLiveMatchId);
  const [filter, setFilter] = useState(season);

  // Seeds liveMatchId on the very first mount right after an app-load
  // auto-resume, then reports back so the parent clears its one-shot state —
  // otherwise a later, ordinary visit to this tab would wrongly re-trigger it.
  useEffect(() => {
    if (initialLiveMatchId) onConsumedInitialLiveMatchId?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Otherwise not auto-rendered on mount — only surfaced as a "Resume
  // recording" prompt, same convention as Plans' Today card, so Minimize
  // actually minimizes rather than re-forcing the recorder open.
  const inProgressMatch = matches.find((m) => m.recording);

  const liveMatch = matches.find((m) => m.id === liveMatchId);
  if (liveMatch) {
    return (
      <LiveMatchRecorder
        match={liveMatch}
        opponents={opponents}
        onUpdatePatch={(patch) => onSave({ ...liveMatch, ...patch })}
        onFinish={(patch) => {
          const { recording, ...rest } = liveMatch;
          onSave({ ...rest, ...patch });
          setLiveMatchId(null);
          setOpenMatchId(liveMatch.id);
        }}
        onExit={() => setLiveMatchId(null)}
      />
    );
  }

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
            onClick={() => (inProgressMatch ? setLiveMatchId(inProgressMatch.id) : setShowLiveForm(true))}
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
            setLiveMatchId(withRecording.id);
          }}
        />
      )}

      <WorkoutStats plans={plans} exercises={exercises} adHocSessions={adHocSessions} />
    </div>
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
