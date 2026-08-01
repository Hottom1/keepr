import { Link } from "react-router-dom";
import { INK, PAPER, TEAL, LINE } from "./theme.js";

export default function LegalLayout({ title, updated, children }) {
  return (
    <div style={{ background: PAPER, fontFamily: "system-ui, -apple-system, sans-serif" }} className="min-h-screen">
      <header style={{ background: INK }}>
        <div className="max-w-3xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="text-xl font-black tracking-tight text-white">
            Keepr<span style={{ color: TEAL }}>.</span>
          </Link>
          <Link to="/" className="text-xs font-bold uppercase tracking-wide text-white/80">
            Back home
          </Link>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-5 py-12">
        <h1 className="text-3xl font-black tracking-tight mb-1" style={{ color: INK }}>{title}</h1>
        <p className="text-xs text-gray-500 mb-8">Last updated {updated}</p>
        <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
          {children}
        </div>
      </div>

      <footer style={{ background: INK }}>
        <div className="max-w-3xl mx-auto px-5 py-8 flex items-center justify-between">
          <span className="text-sm font-black text-white">
            Keepr<span style={{ color: TEAL }}>.</span>
          </span>
          <div className="flex items-center gap-5">
            <Link to="/privacy" className="text-xs font-semibold text-white/60">Privacy</Link>
            <Link to="/terms" className="text-xs font-semibold text-white/60">Terms</Link>
          </div>
        </div>
      </footer>
      <style>{`.legal-h2{color:${INK};font-size:1rem;font-weight:900;margin-top:0.5rem;margin-bottom:0.5rem;}`}</style>
    </div>
  );
}
