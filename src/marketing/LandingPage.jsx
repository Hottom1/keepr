import { Link } from "react-router-dom";
import {
  BookOpen, CalendarRange, BarChart3, Sparkles, Snowflake, Waves, ArrowRight,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider.jsx";
import { INK, PAPER, TEAL, WINTER, SUMMER, LINE } from "./theme.js";

function GoalGridVisual() {
  const cells = [
    { pct: 82, bg: TEAL }, { pct: null, bg: "#fff" }, { pct: 45, bg: SUMMER },
    { pct: null, bg: "#fff" }, { pct: 91, bg: TEAL }, { pct: null, bg: "#fff" },
    { pct: 38, bg: "#C1483B" }, { pct: null, bg: "#fff" }, { pct: 67, bg: TEAL },
  ];
  return (
    <div className="rounded-xl overflow-hidden border-2 w-full max-w-[280px] mx-auto" style={{ borderColor: INK, background: INK }}>
      <div className="grid grid-cols-3 gap-[2px]">
        {cells.map((c, i) => (
          <div key={i} className="aspect-square flex items-center justify-center" style={{ background: c.bg }}>
            {c.pct !== null && (
              <span className="text-sm font-black" style={{ color: c.bg === "#fff" ? INK : "#fff" }}>{c.pct}%</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function FeatureCard({ Icon, title, children }) {
  return (
    <div className="bg-white rounded-xl border p-5" style={{ borderColor: LINE }}>
      <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ background: PAPER }}>
        <Icon size={19} color={TEAL} strokeWidth={2.2} />
      </div>
      <h3 className="text-base font-black mb-1.5" style={{ color: INK }}>{title}</h3>
      <p className="text-sm text-gray-600 leading-relaxed">{children}</p>
    </div>
  );
}

export default function LandingPage() {
  const { session } = useAuth();
  const primaryCta = session ? { to: "/app", label: "Go to your training" } : { to: "/signup", label: "Start training free" };

  return (
    <div style={{ background: PAPER, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Header */}
      <header style={{ background: INK }}>
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <h1 className="text-xl font-black tracking-tight text-white">
            Keepr<span style={{ color: TEAL }}>.</span>
          </h1>
          {session ? (
            <Link to="/app" className="text-xs font-bold uppercase tracking-wide text-white/80">
              Open app
            </Link>
          ) : (
            <Link to="/login" className="text-xs font-bold uppercase tracking-wide text-white/80">
              Log in
            </Link>
          )}
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-5 pt-12 pb-14 md:pt-20 md:pb-20">
        <div className="md:grid md:grid-cols-2 md:gap-12 md:items-center">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-widest mb-3" style={{ color: TEAL }}>
              Handball &amp; Beach Handball · Goalkeepers
            </div>
            <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-4" style={{ color: INK }}>
              Built for the goal.<br />Not the outfield.
            </h2>
            <p className="text-base text-gray-600 leading-relaxed mb-7 max-w-md">
              Keepr is a drill library, 6-week block builder, match stat tracker, and AI coach —
              all built specifically for handball goalkeepers, indoor and beach.
              No generic fitness programming adapted after the fact.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link
                to={primaryCta.to}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-lg text-sm font-bold text-white"
                style={{ background: TEAL }}
              >
                {primaryCta.label} <ArrowRight size={15} />
              </Link>
              {!session && (
                <Link to="/login" className="text-sm font-semibold" style={{ color: INK }}>
                  Already training? Log in
                </Link>
              )}
            </div>
          </div>
          <div className="mt-12 md:mt-0">
            <GoalGridVisual />
            <p className="text-center text-[11px] text-gray-400 mt-3">
              Save% by zone, logged shot by shot — indoor or beach scoring, done correctly.
            </p>
          </div>
        </div>
      </section>

      {/* Positioning strip */}
      <section style={{ background: INK }}>
        <div className="max-w-3xl mx-auto px-5 py-10 text-center">
          <p className="text-lg md:text-xl font-bold text-white leading-snug">
            Most training tools are built for outfield players and adapted for keepers as an afterthought.
            <span style={{ color: TEAL }}> Keepr starts from the goal line.</span>
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-5 py-14">
        <div className="grid sm:grid-cols-2 gap-4">
          <FeatureCard Icon={BookOpen} title="A library that's actually about your position">
            Drills organised by what a keeper actually trains — reflexes, diving &amp; ground work, footwork,
            positioning, shot reading, 1v1s, strength, and conditioning. Filtered by season, tagged by what
            you need to run them. Add your own alongside the built-in set.
          </FeatureCard>
          <FeatureCard Icon={CalendarRange} title="A 6-week block, not a generic program">
            Pick a goal — reaction speed, diving coverage, explosive power, footwork — and get a structured,
            progressive 6-week block generated for you. Or build one from scratch, session by session.
            Either way, it's yours to edit.
          </FeatureCard>
          <FeatureCard Icon={BarChart3} title="Stats that speak keeper, not just 'shots on target'">
            Tap a 3×3 goal grid to log every save and goal by zone. Live save% heatmaps, trend charts across
            matches — and scoring that actually knows the difference between an indoor goal and a 2-point
            beach handball spin shot.
          </FeatureCard>
          <FeatureCard Icon={Sparkles} title="Kip, an AI coach that knows your season">
            Kip knows your level, discipline, availability, current block, and recent match stats — so its
            advice is about your training, not a generic chatbot answer to a generic question.
          </FeatureCard>
        </div>
      </section>

      {/* Dual discipline */}
      <section className="max-w-5xl mx-auto px-5 pb-14">
        <div className="rounded-xl overflow-hidden border" style={{ borderColor: LINE }}>
          <div className="grid grid-cols-2">
            <div className="p-6 text-white" style={{ background: WINTER }}>
              <Snowflake size={18} strokeWidth={2.5} className="mb-2" />
              <div className="text-sm font-black uppercase tracking-wide">Winter · Court</div>
            </div>
            <div className="p-6 text-white" style={{ background: SUMMER }}>
              <Waves size={18} strokeWidth={2.5} className="mb-2" />
              <div className="text-sm font-black uppercase tracking-wide">Summer · Sand</div>
            </div>
          </div>
          <div className="bg-white p-6 text-center">
            <p className="text-sm text-gray-600">
              One app, two disciplines — drills, scoring, and shot types switch with you, not the other way around.
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-5 py-16 text-center" style={{ background: TEAL }}>
        <h3 className="text-2xl font-black text-white mb-3">Every save starts with the right prep.</h3>
        <Link
          to={primaryCta.to}
          className="inline-flex items-center gap-1.5 px-6 py-3 rounded-lg text-sm font-bold"
          style={{ background: "#fff", color: INK }}
        >
          {primaryCta.label} <ArrowRight size={15} />
        </Link>
      </section>

      {/* Footer */}
      <footer style={{ background: INK }}>
        <div className="max-w-5xl mx-auto px-5 py-8 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm font-black text-white">
            Keepr<span style={{ color: TEAL }}>.</span>
          </span>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="text-xs font-semibold text-white/60">Privacy</Link>
            <Link to="/terms" className="text-xs font-semibold text-white/60">Terms</Link>
            <Link to="/login" className="text-xs font-semibold text-white/60">Log in</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
