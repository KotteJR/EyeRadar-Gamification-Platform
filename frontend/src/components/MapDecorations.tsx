/**
 * Decorative SVG elements and animated clouds for the game world map.
 */

// ─── Pine Tree ─────────────────────────────────────────────────────────
export function PineTree({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 28 * size;
  const h = 44 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 28 44" className={className} aria-hidden>
      <rect x="11" y="32" width="6" height="12" rx="1" fill="#8B6914" />
      <polygon points="14,2 26,22 2,22" fill="#4AAE4A" />
      <polygon points="14,10 24,28 4,28" fill="#3D9140" />
      <polygon points="14,18 22,34 6,34" fill="#2E7D32" />
    </svg>
  );
}

// ─── Round Tree ────────────────────────────────────────────────────────
export function RoundTree({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 32 * size;
  const h = 42 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 32 42" className={className} aria-hidden>
      <rect x="13" y="28" width="6" height="14" rx="1" fill="#8B6914" />
      <circle cx="16" cy="17" r="14" fill="#66BB6A" />
      <circle cx="10" cy="14" r="9" fill="#81C784" opacity="0.7" />
      <circle cx="22" cy="19" r="7" fill="#4CAF50" opacity="0.6" />
    </svg>
  );
}

// ─── Hill ──────────────────────────────────────────────────────────────
export function Hill({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 120 * size;
  const h = 40 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 120 40" className={className} aria-hidden>
      <ellipse cx="60" cy="40" rx="60" ry="30" fill="#7CB342" opacity="0.5" />
      <ellipse cx="60" cy="40" rx="50" ry="22" fill="#8BC34A" opacity="0.4" />
    </svg>
  );
}

// ─── Rock ──────────────────────────────────────────────────────────────
export function Rock({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 24 * size;
  const h = 18 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 24 18" className={className} aria-hidden>
      <polygon points="2,18 6,4 12,1 20,5 22,18" fill="#9E9E9E" />
      <polygon points="6,4 12,1 14,8 8,10" fill="#BDBDBD" opacity="0.6" />
    </svg>
  );
}

// ─── Bush ──────────────────────────────────────────────────────────────
export function Bush({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 30 * size;
  const h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 30 22" className={className} aria-hidden>
      <ellipse cx="9" cy="12" rx="9" ry="8" fill="#66BB6A" />
      <ellipse cx="20" cy="11" rx="10" ry="9" fill="#4CAF50" />
      <ellipse cx="14" cy="10" rx="8" ry="9" fill="#81C784" />
    </svg>
  );
}

// ─── Flowers ───────────────────────────────────────────────────────────
export function Flowers({ className = "" }: { className?: string }) {
  return (
    <svg width="20" height="12" viewBox="0 0 20 12" className={className} aria-hidden>
      <circle cx="4" cy="6" r="2.5" fill="#F48FB1" />
      <circle cx="10" cy="4" r="2" fill="#FFD54F" />
      <circle cx="16" cy="7" r="2.5" fill="#CE93D8" />
      <circle cx="4" cy="6" r="1" fill="#F06292" />
      <circle cx="10" cy="4" r="0.8" fill="#FFB300" />
      <circle cx="16" cy="7" r="1" fill="#AB47BC" />
    </svg>
  );
}

// ─── Mushroom ─────────────────────────────────────────────────────────
export function Mushroom({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 18 * size;
  const h = 18 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 18" className={className} aria-hidden>
      <rect x="7" y="11" width="4" height="7" rx="1" fill="#E8D5B0" />
      <ellipse cx="9" cy="10" rx="8" ry="6" fill="#E53935" />
      <circle cx="6" cy="8" r="1.5" fill="white" opacity="0.8" />
      <circle cx="11" cy="7" r="1.2" fill="white" opacity="0.8" />
      <circle cx="9" cy="10" r="1" fill="white" opacity="0.6" />
    </svg>
  );
}

// ─── Signpost ─────────────────────────────────────────────────────────
export function Signpost({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 22 * size;
  const h = 32 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 32" className={className} aria-hidden>
      <rect x="9.5" y="8" width="3" height="24" rx="0.5" fill="#8D6E63" />
      <rect x="3" y="4" width="16" height="8" rx="2" fill="#A1887F" />
      <rect x="3" y="4" width="16" height="8" rx="2" fill="#BCAAA4" opacity="0.5" />
      <polygon points="19,4 22,8 19,12" fill="#A1887F" />
    </svg>
  );
}

// ─── Fence ────────────────────────────────────────────────────────────
export function Fence({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 40 * size;
  const h = 20 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 40 20" className={className} aria-hidden>
      <rect x="2" y="6" width="36" height="2" rx="0.5" fill="#A1887F" />
      <rect x="2" y="13" width="36" height="2" rx="0.5" fill="#A1887F" />
      <rect x="4" y="2" width="3" height="18" rx="0.5" fill="#8D6E63" />
      <polygon points="5.5,0 3,2 8,2" fill="#8D6E63" />
      <rect x="16" y="2" width="3" height="18" rx="0.5" fill="#8D6E63" />
      <polygon points="17.5,0 15,2 20,2" fill="#8D6E63" />
      <rect x="28" y="2" width="3" height="18" rx="0.5" fill="#8D6E63" />
      <polygon points="29.5,0 27,2 32,2" fill="#8D6E63" />
    </svg>
  );
}

// ─── Pond ─────────────────────────────────────────────────────────────
export function Pond({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 44 * size;
  const h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 44 22" className={className} aria-hidden>
      <ellipse cx="22" cy="14" rx="20" ry="8" fill="#81D4FA" opacity="0.5" />
      <ellipse cx="22" cy="13" rx="16" ry="6" fill="#4FC3F7" opacity="0.4" />
      <ellipse cx="18" cy="12" rx="4" ry="1.5" fill="white" opacity="0.3" />
    </svg>
  );
}

// ─── Walking Person (tiny character) ──────────────────────────────────
export function WalkingPerson({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 14 * size;
  const h = 24 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 14 24" className={`map-walk ${className}`} aria-hidden>
      {/* Head */}
      <circle cx="7" cy="4" r="3" fill="#FFCC80" />
      {/* Body */}
      <rect x="5" y="7" width="4" height="8" rx="1.5" fill="#42A5F5" />
      {/* Legs */}
      <line x1="6" y1="15" x2="4" y2="22" stroke="#5D4037" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="15" x2="10" y2="22" stroke="#5D4037" strokeWidth="1.5" strokeLinecap="round" />
      {/* Arms */}
      <line x1="5" y1="9" x2="2" y2="14" stroke="#42A5F5" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="9" y1="9" x2="12" y2="14" stroke="#42A5F5" strokeWidth="1.2" strokeLinecap="round" />
      {/* Hair */}
      <ellipse cx="7" cy="2.5" rx="3" ry="1.5" fill="#5D4037" />
    </svg>
  );
}

// ─── Walking Person Variant 2 (different colors) ──────────────────────
export function WalkingPerson2({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 14 * size;
  const h = 24 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 14 24" className={`map-walk ${className}`} aria-hidden>
      <circle cx="7" cy="4" r="3" fill="#FFCC80" />
      <rect x="5" y="7" width="4" height="8" rx="1.5" fill="#EF5350" />
      <line x1="6" y1="15" x2="4" y2="22" stroke="#3E2723" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="15" x2="10" y2="22" stroke="#3E2723" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="5" y1="9" x2="2" y2="14" stroke="#EF5350" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="9" y1="9" x2="12" y2="14" stroke="#EF5350" strokeWidth="1.2" strokeLinecap="round" />
      <ellipse cx="7" cy="2.5" rx="3" ry="1.8" fill="#FDD835" />
    </svg>
  );
}

// ─── Bird (flying) ────────────────────────────────────────────────────
export function Bird({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 20 * size;
  const h = 12 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 12" className={`map-fly ${className}`} aria-hidden>
      <path d="M10,8 Q6,2 1,4" fill="none" stroke="#455A64" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10,8 Q14,2 19,4" fill="none" stroke="#455A64" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="10" cy="8.5" r="1.5" fill="#455A64" />
      <circle cx="10.8" cy="8" r="0.5" fill="white" />
    </svg>
  );
}

// ─── Rabbit ───────────────────────────────────────────────────────────
export function Rabbit({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 16 * size;
  const h = 18 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 16 18" className={`map-hop ${className}`} aria-hidden>
      {/* Ears */}
      <ellipse cx="6" cy="3" rx="1.5" ry="4" fill="#E0E0E0" />
      <ellipse cx="10" cy="3" rx="1.5" ry="4" fill="#E0E0E0" />
      <ellipse cx="6" cy="3" rx="0.8" ry="3" fill="#F8BBD0" opacity="0.5" />
      <ellipse cx="10" cy="3" rx="0.8" ry="3" fill="#F8BBD0" opacity="0.5" />
      {/* Body */}
      <ellipse cx="8" cy="12" rx="5" ry="5.5" fill="#EEEEEE" />
      {/* Head */}
      <circle cx="8" cy="8" r="3.5" fill="#F5F5F5" />
      {/* Eyes */}
      <circle cx="6.5" cy="7.5" r="0.7" fill="#333" />
      <circle cx="9.5" cy="7.5" r="0.7" fill="#333" />
      {/* Nose */}
      <circle cx="8" cy="9" r="0.5" fill="#F48FB1" />
      {/* Tail */}
      <circle cx="12" cy="14" r="1.5" fill="white" />
    </svg>
  );
}

// ─── Butterfly ────────────────────────────────────────────────────────
export function Butterfly({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 18 * size;
  const h = 14 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 14" className={`map-flutter ${className}`} aria-hidden>
      {/* Body */}
      <line x1="9" y1="3" x2="9" y2="12" stroke="#5D4037" strokeWidth="1" strokeLinecap="round" />
      {/* Antennae */}
      <line x1="9" y1="3" x2="7" y2="0.5" stroke="#5D4037" strokeWidth="0.5" />
      <line x1="9" y1="3" x2="11" y2="0.5" stroke="#5D4037" strokeWidth="0.5" />
      <circle cx="7" cy="0.5" r="0.5" fill="#5D4037" />
      <circle cx="11" cy="0.5" r="0.5" fill="#5D4037" />
      {/* Wings */}
      <ellipse cx="5" cy="5" rx="4" ry="3" fill="#CE93D8" opacity="0.7" />
      <ellipse cx="13" cy="5" rx="4" ry="3" fill="#CE93D8" opacity="0.7" />
      <ellipse cx="5.5" cy="9" rx="3" ry="2.5" fill="#F48FB1" opacity="0.6" />
      <ellipse cx="12.5" cy="9" rx="3" ry="2.5" fill="#F48FB1" opacity="0.6" />
      {/* Wing dots */}
      <circle cx="5" cy="5" r="1" fill="#AB47BC" opacity="0.5" />
      <circle cx="13" cy="5" r="1" fill="#AB47BC" opacity="0.5" />
    </svg>
  );
}

// ─── Sheep ────────────────────────────────────────────────────────────
export function Sheep({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 24 * size;
  const h = 18 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 24 18" className={className} aria-hidden>
      {/* Body (wool) */}
      <circle cx="12" cy="10" r="5" fill="#EEEEEE" />
      <circle cx="9" cy="9" r="3.5" fill="#F5F5F5" />
      <circle cx="15" cy="9" r="3.5" fill="#F5F5F5" />
      <circle cx="12" cy="7" r="3" fill="#FAFAFA" />
      {/* Head */}
      <circle cx="19" cy="9" r="2.8" fill="#424242" />
      {/* Eyes */}
      <circle cx="20" cy="8.5" r="0.7" fill="white" />
      <circle cx="20.2" cy="8.5" r="0.35" fill="#333" />
      {/* Legs */}
      <line x1="9" y1="14" x2="9" y2="18" stroke="#424242" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="11" y1="14" x2="11" y2="18" stroke="#424242" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="13" y1="14" x2="13" y2="18" stroke="#424242" strokeWidth="1.2" strokeLinecap="round" />
      <line x1="15" y1="14" x2="15" y2="18" stroke="#424242" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

// ─── Grass Tuft ──────────────────────────────────────────────────────
export function GrassTuft({ size = 1, className = "" }: { size?: number; className?: string }) {
  const w = 18 * size;
  const h = 10 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 10" className={className} aria-hidden>
      <path d="M2,10 Q3,3 5,10" fill="#66BB6A" />
      <path d="M5,10 Q6,1 8,10" fill="#4CAF50" />
      <path d="M7,10 Q9,2 11,10" fill="#81C784" />
      <path d="M10,10 Q12,3 14,10" fill="#66BB6A" />
      <path d="M13,10 Q14,4 16,10" fill="#4CAF50" />
    </svg>
  );
}

// ─── Castle (Checkpoint Level) ─────────────────────────────────────────
export function CastleSVG({
  completed = false,
  color = "#F59E0B",
  size = 1,
}: {
  completed?: boolean;
  color?: string;
  size?: number;
}) {
  const w = 48 * size;
  const h = 56 * size;
  const flagColor = completed ? color : "#9E9E9E";
  const wallColor = completed ? "#FFF8E1" : "#E0E0E0";
  const roofColor = completed ? "#D84315" : "#757575";
  return (
    <svg width={w} height={h} viewBox="0 0 48 56" aria-hidden>
      {/* Base wall */}
      <rect x="8" y="24" width="32" height="28" rx="2" fill={wallColor} stroke="#bbb" strokeWidth="1" />
      {/* Battlements */}
      <rect x="6" y="22" width="8" height="6" rx="1" fill={wallColor} stroke="#bbb" strokeWidth="0.5" />
      <rect x="20" y="22" width="8" height="6" rx="1" fill={wallColor} stroke="#bbb" strokeWidth="0.5" />
      <rect x="34" y="22" width="8" height="6" rx="1" fill={wallColor} stroke="#bbb" strokeWidth="0.5" />
      {/* Tower */}
      <rect x="16" y="10" width="16" height="18" rx="1" fill={wallColor} stroke="#bbb" strokeWidth="1" />
      {/* Roof */}
      <polygon points="24,0 38,12 10,12" fill={roofColor} />
      {/* Door */}
      <rect x="19" y="38" width="10" height="14" rx="5" fill={roofColor} opacity="0.7" />
      {/* Flag pole */}
      <line x1="24" y1="0" x2="24" y2="-6" stroke="#555" strokeWidth="1.2" />
      {/* Flag */}
      <polygon
        points="24,-6 36,-3 24,0"
        fill={flagColor}
        className={completed ? "map-flag-wave" : ""}
      />
      {/* Window */}
      <rect x="20" y="14" width="3" height="4" rx="0.5" fill={roofColor} opacity="0.5" />
      <rect x="25" y="14" width="3" height="4" rx="0.5" fill={roofColor} opacity="0.5" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ─── CLOUD BORDER — big chunky CSS puffs forming a thick border ────────
// ═══════════════════════════════════════════════════════════════════════
//
// Simple approach that works: large white rounded divs stacked densely
// along each edge with a fog gradient behind them.

interface Puff {
  x: number;     // % or px from edge start
  y: number;     // px from outer edge (into viewport)
  w: number;     // width
  h: number;     // height
  drift: 1 | 2 | 3;
  opacity: number;
}

// Each edge has a "cloud bank" made of overlapping puffs
// Positions are relative: x = % along edge, y = px inward from edge
const TOP_PUFFS: Puff[] = [
  { x: -5, y: -30, w: 200, h: 80, drift: 1, opacity: 0.95 },
  { x: 8,  y: -20, w: 160, h: 70, drift: 2, opacity: 0.9 },
  { x: 18, y: -35, w: 220, h: 90, drift: 1, opacity: 0.95 },
  { x: 32, y: -18, w: 180, h: 75, drift: 3, opacity: 0.92 },
  { x: 44, y: -30, w: 200, h: 85, drift: 2, opacity: 0.95 },
  { x: 56, y: -22, w: 170, h: 70, drift: 1, opacity: 0.9 },
  { x: 67, y: -32, w: 210, h: 88, drift: 3, opacity: 0.95 },
  { x: 78, y: -20, w: 190, h: 78, drift: 2, opacity: 0.92 },
  { x: 90, y: -28, w: 200, h: 82, drift: 1, opacity: 0.95 },
  // Inner row (further inside, softer)
  { x: 2,  y: 15, w: 140, h: 55, drift: 3, opacity: 0.6 },
  { x: 20, y: 20, w: 160, h: 60, drift: 1, opacity: 0.55 },
  { x: 40, y: 12, w: 130, h: 50, drift: 2, opacity: 0.5 },
  { x: 60, y: 18, w: 150, h: 55, drift: 3, opacity: 0.55 },
  { x: 80, y: 15, w: 140, h: 52, drift: 1, opacity: 0.5 },
];

const BOTTOM_PUFFS: Puff[] = [
  { x: -3, y: -28, w: 190, h: 78, drift: 2, opacity: 0.95 },
  { x: 10, y: -35, w: 210, h: 85, drift: 1, opacity: 0.92 },
  { x: 22, y: -22, w: 180, h: 75, drift: 3, opacity: 0.95 },
  { x: 35, y: -30, w: 200, h: 82, drift: 2, opacity: 0.9 },
  { x: 48, y: -25, w: 190, h: 80, drift: 1, opacity: 0.95 },
  { x: 60, y: -32, w: 220, h: 88, drift: 3, opacity: 0.92 },
  { x: 72, y: -20, w: 170, h: 72, drift: 2, opacity: 0.95 },
  { x: 84, y: -30, w: 200, h: 80, drift: 1, opacity: 0.9 },
  { x: 95, y: -25, w: 180, h: 76, drift: 3, opacity: 0.95 },
  // Inner row
  { x: 5,  y: 16, w: 150, h: 55, drift: 1, opacity: 0.55 },
  { x: 25, y: 12, w: 130, h: 48, drift: 2, opacity: 0.5 },
  { x: 50, y: 18, w: 160, h: 58, drift: 3, opacity: 0.55 },
  { x: 75, y: 14, w: 140, h: 50, drift: 1, opacity: 0.5 },
];

const LEFT_PUFFS: Puff[] = [
  { x: -5, y: -30, w: 90, h: 160, drift: 1, opacity: 0.95 },
  { x: 8,  y: -35, w: 85, h: 180, drift: 3, opacity: 0.92 },
  { x: 20, y: -25, w: 80, h: 170, drift: 2, opacity: 0.95 },
  { x: 32, y: -30, w: 90, h: 190, drift: 1, opacity: 0.9 },
  { x: 45, y: -28, w: 85, h: 175, drift: 3, opacity: 0.95 },
  { x: 58, y: -32, w: 88, h: 185, drift: 2, opacity: 0.92 },
  { x: 70, y: -25, w: 82, h: 170, drift: 1, opacity: 0.95 },
  { x: 82, y: -30, w: 90, h: 180, drift: 3, opacity: 0.9 },
  { x: 93, y: -28, w: 85, h: 165, drift: 2, opacity: 0.95 },
  // Inner row
  { x: 5,  y: 18, w: 60, h: 120, drift: 2, opacity: 0.5 },
  { x: 25, y: 22, w: 55, h: 110, drift: 3, opacity: 0.45 },
  { x: 50, y: 15, w: 65, h: 130, drift: 1, opacity: 0.5 },
  { x: 75, y: 20, w: 58, h: 115, drift: 2, opacity: 0.45 },
];

const RIGHT_PUFFS: Puff[] = [
  { x: -3, y: -28, w: 88, h: 170, drift: 2, opacity: 0.95 },
  { x: 10, y: -32, w: 92, h: 185, drift: 1, opacity: 0.92 },
  { x: 22, y: -25, w: 82, h: 165, drift: 3, opacity: 0.95 },
  { x: 35, y: -30, w: 90, h: 180, drift: 2, opacity: 0.9 },
  { x: 48, y: -28, w: 86, h: 175, drift: 1, opacity: 0.95 },
  { x: 60, y: -35, w: 95, h: 190, drift: 3, opacity: 0.92 },
  { x: 72, y: -25, w: 84, h: 168, drift: 2, opacity: 0.95 },
  { x: 85, y: -30, w: 90, h: 178, drift: 1, opacity: 0.9 },
  { x: 96, y: -28, w: 86, h: 165, drift: 3, opacity: 0.95 },
  // Inner row
  { x: 8,  y: 20, w: 58, h: 115, drift: 3, opacity: 0.5 },
  { x: 30, y: 15, w: 62, h: 125, drift: 1, opacity: 0.45 },
  { x: 55, y: 22, w: 55, h: 110, drift: 2, opacity: 0.5 },
  { x: 80, y: 18, w: 60, h: 120, drift: 3, opacity: 0.45 },
];

function renderPuffRow(
  puffs: Puff[],
  edge: "top" | "bottom" | "left" | "right"
) {
  return puffs.map((p, i) => {
    const style: React.CSSProperties = {
      position: "absolute",
      width: p.w,
      height: p.h,
      borderRadius: "50%",
      background: "white",
      opacity: p.opacity,
    };

    if (edge === "top") {
      style.top = p.y;
      style.left = `${p.x}%`;
    } else if (edge === "bottom") {
      style.bottom = p.y;
      style.left = `${p.x}%`;
    } else if (edge === "left") {
      style.left = p.y;
      style.top = `${p.x}%`;
    } else {
      style.right = p.y;
      style.top = `${p.x}%`;
    }

    return (
      <div
        key={`${edge}-${i}`}
        className={`cloud-drift-${p.drift}`}
        style={style}
      />
    );
  });
}

export function CloudBorder() {
  return (
    <div className="fixed inset-0 pointer-events-none z-[45]" aria-hidden>
      {/* Fog gradient backing on all 4 edges */}
      {/* Top */}
      <div className="absolute top-0 left-0 right-0 h-[140px]"
        style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 50%, transparent 100%)" }} />
      {/* Bottom */}
      <div className="absolute bottom-0 left-0 right-0 h-[140px]"
        style={{ background: "linear-gradient(to top, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 50%, transparent 100%)" }} />
      {/* Left */}
      <div className="absolute top-0 bottom-0 left-0 w-[120px]"
        style={{ background: "linear-gradient(to right, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 50%, transparent 100%)" }} />
      {/* Right */}
      <div className="absolute top-0 bottom-0 right-0 w-[120px]"
        style={{ background: "linear-gradient(to left, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.4) 50%, transparent 100%)" }} />

      {/* Cloud puffs */}
      {renderPuffRow(TOP_PUFFS, "top")}
      {renderPuffRow(BOTTOM_PUFFS, "bottom")}
      {renderPuffRow(LEFT_PUFFS, "left")}
      {renderPuffRow(RIGHT_PUFFS, "right")}
    </div>
  );
}
