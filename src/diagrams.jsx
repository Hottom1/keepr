// Original schematic diagrams illustrating GK positioning/tactical concepts.
// Top-down court geometry only — no illustrated people, reusing the app's
// existing design tokens (see the palette comment at the top of App.jsx).
const INK = "#12213A";
const PAPER = "#F3F2ED";
const TEAL = "#0E8388";
const WINTER = "#3B5BA5";
const SUMMER = "#E2984B";
const LINE = "#DAD7CC";
const DANGER = "#C1483B";
const MUTED = "#8A8779";

function DiagramLabel({ x, y, children, anchor = "middle" }) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      style={{ fontSize: 9, fontWeight: 700, fill: MUTED, letterSpacing: "0.05em", textTransform: "uppercase" }}
    >
      {children}
    </text>
  );
}

export function AngleNarrowingDiagram() {
  return (
    <svg viewBox="0 0 300 190" className="w-full h-auto">
      <rect x="0" y="0" width="300" height="190" fill={PAPER} />

      {/* 6m arc */}
      <path d="M 60,20 A 90,90 0 0 1 240,20" fill="none" stroke={LINE} strokeWidth="1.5" strokeDasharray="4 3" />

      {/* angle lines from shooter to each post */}
      <line x1="230" y1="140" x2="110" y2="20" stroke={LINE} strokeWidth="1.5" strokeDasharray="4 3" />
      <line x1="230" y1="140" x2="190" y2="20" stroke={LINE} strokeWidth="1.5" strokeDasharray="4 3" />

      {/* bisector — the correct line to the goal */}
      <line x1="230" y1="140" x2="155.8" y2="20" stroke={TEAL} strokeWidth="2" />

      {/* goal line + posts */}
      <line x1="110" y1="20" x2="190" y2="20" stroke={INK} strokeWidth="4" strokeLinecap="round" />
      <circle cx="110" cy="20" r="3.5" fill={INK} />
      <circle cx="190" cy="20" r="3.5" fill={INK} />

      {/* shooter */}
      <circle cx="230" cy="140" r="6" fill={DANGER} />
      <DiagramLabel x="230" y="158">Shooter</DiagramLabel>

      {/* keeper, sitting on the bisector */}
      <circle cx="177.4" cy="54.9" r="6" fill={TEAL} stroke="#fff" strokeWidth="1.5" />
      <DiagramLabel x="177.4" y="78">Keeper</DiagramLabel>

      <DiagramLabel x="150" y="14">Goal</DiagramLabel>
    </svg>
  );
}

export function ShadowOfBlockDiagram() {
  return (
    <svg viewBox="0 0 300 200" className="w-full h-auto">
      <rect x="0" y="0" width="300" height="200" fill={PAPER} />
      <line x1="147" y1="25" x2="147" y2="190" stroke={LINE} strokeWidth="1" />

      {/* WRONG panel */}
      <DiagramLabel x="70" y="14" anchor="middle">Wrong</DiagramLabel>
      <line x1="35" y1="30" x2="105" y2="30" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="35" cy="30" r="3" fill={INK} />
      <circle cx="105" cy="30" r="3" fill={INK} />
      <line x1="70" y1="175" x2="70" y2="85" stroke={DANGER} strokeWidth="2" strokeDasharray="4 3" />
      <rect x="61" y="100" width="18" height="18" fill={INK} />
      <circle cx="70" cy="85" r="5" fill={TEAL} stroke="#fff" strokeWidth="1.5" />
      <circle cx="70" cy="175" r="5" fill={DANGER} />

      {/* SAFE panel */}
      <DiagramLabel x="225" y="14" anchor="middle">Safe</DiagramLabel>
      <line x1="190" y1="30" x2="260" y2="30" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="190" cy="30" r="3" fill={INK} />
      <circle cx="260" cy="30" r="3" fill={INK} />
      <line x1="225" y1="175" x2="248" y2="78" stroke={TEAL} strokeWidth="2" strokeDasharray="4 3" />
      <rect x="216" y="100" width="18" height="18" fill={INK} />
      <circle cx="248" cy="78" r="5" fill={TEAL} stroke="#fff" strokeWidth="1.5" />
      <circle cx="225" cy="175" r="5" fill={DANGER} />
    </svg>
  );
}

export function WingShotGeometryDiagram() {
  return (
    <svg viewBox="0 0 300 200" className="w-full h-auto">
      <rect x="0" y="0" width="300" height="200" fill={PAPER} />
      <line x1="147" y1="25" x2="147" y2="190" stroke={LINE} strokeWidth="1" />

      {/* Small angle panel */}
      <DiagramLabel x="70" y="14" anchor="middle">Small angle</DiagramLabel>
      <line x1="35" y1="30" x2="105" y2="30" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="35" cy="30" r="3" fill={INK} />
      <circle cx="105" cy="30" r="3" fill={INK} />
      <line x1="18" y1="50" x2="35" y2="30" stroke={LINE} strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="18" y1="50" x2="105" y2="30" stroke={LINE} strokeWidth="1.5" strokeDasharray="3 2" />
      <circle cx="18" cy="50" r="5" fill={DANGER} />
      <circle cx="40" cy="35" r="5" fill={TEAL} stroke="#fff" strokeWidth="1.5" />

      {/* Wide angle panel */}
      <DiagramLabel x="225" y="14" anchor="middle">Wide angle</DiagramLabel>
      <line x1="190" y1="30" x2="260" y2="30" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="190" cy="30" r="3" fill={INK} />
      <circle cx="260" cy="30" r="3" fill={INK} />
      <line x1="173" y1="150" x2="190" y2="30" stroke={LINE} strokeWidth="1.5" strokeDasharray="3 2" />
      <line x1="173" y1="150" x2="260" y2="30" stroke={LINE} strokeWidth="1.5" strokeDasharray="3 2" />
      <circle cx="173" cy="150" r="5" fill={DANGER} />
      <circle cx="208" cy="45" r="5" fill={TEAL} stroke="#fff" strokeWidth="1.5" />
    </svg>
  );
}

export function StraightShotCornerDiagram() {
  return (
    <svg viewBox="0 0 300 190" className="w-full h-auto">
      <rect x="0" y="0" width="300" height="190" fill={PAPER} />

      <line x1="35" y1="30" x2="105" y2="30" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <circle cx="35" cy="30" r="4" fill={WINTER} />
      <circle cx="105" cy="30" r="4" fill={SUMMER} />

      {/* two possible ball paths, one each side of the defender */}
      <polyline points="70,175 50,105 35,30" fill="none" stroke={WINTER} strokeWidth="2" />
      <polyline points="70,175 90,105 105,30" fill="none" stroke={SUMMER} strokeWidth="2" />

      <rect x="61" y="97" width="18" height="18" fill={INK} />
      <circle cx="70" cy="175" r="6" fill={DANGER} />

      <DiagramLabel x="150" y="14">Goal</DiagramLabel>
      <DiagramLabel x="70" y="188">Shooter, defender between</DiagramLabel>
    </svg>
  );
}
