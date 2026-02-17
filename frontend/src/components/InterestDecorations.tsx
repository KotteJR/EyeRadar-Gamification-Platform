/**
 * Interest-specific SVG decorations for the adventure map.
 * Each interest has 5-6 themed SVG components that replace/supplement
 * the default nature decorations when a student's interests are set.
 */

type SVGProps = { size?: number; className?: string };

// ═══════════════════════════════════════════════════════════════════════
// CARS / RACING
// ═══════════════════════════════════════════════════════════════════════

export function RaceCar({ size = 1, className = "" }: SVGProps) {
  const w = 36 * size, h = 20 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 36 20" className={className} aria-hidden>
      <rect x="4" y="8" width="28" height="9" rx="3" fill="#EF4444" />
      <rect x="10" y="3" width="14" height="8" rx="2" fill="#DC2626" />
      <rect x="12" y="4" width="4" height="5" rx="1" fill="#93C5FD" opacity="0.7" />
      <rect x="18" y="4" width="4" height="5" rx="1" fill="#93C5FD" opacity="0.7" />
      <circle cx="10" cy="17" r="3" fill="#1F2937" />
      <circle cx="10" cy="17" r="1.5" fill="#6B7280" />
      <circle cx="26" cy="17" r="3" fill="#1F2937" />
      <circle cx="26" cy="17" r="1.5" fill="#6B7280" />
      <rect x="0" y="10" width="4" height="3" rx="1" fill="#FBBF24" />
      <rect x="32" y="10" width="4" height="3" rx="1" fill="#EF4444" opacity="0.8" />
    </svg>
  );
}

export function TrafficCone({ size = 1, className = "" }: SVGProps) {
  const w = 16 * size, h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 16 22" className={className} aria-hidden>
      <polygon points="8,1 14,18 2,18" fill="#F97316" />
      <rect x="4" y="7" width="8" height="2.5" rx="0.5" fill="white" opacity="0.8" />
      <rect x="5" y="12" width="6" height="2" rx="0.5" fill="white" opacity="0.7" />
      <rect x="1" y="18" width="14" height="3" rx="1" fill="#EA580C" />
    </svg>
  );
}

export function CheckeredFlag({ size = 1, className = "" }: SVGProps) {
  const w = 20 * size, h = 28 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 28" className={className} aria-hidden>
      <rect x="2" y="4" width="16" height="12" rx="1" fill="white" />
      <rect x="2" y="4" width="4" height="3" fill="#1F2937" />
      <rect x="10" y="4" width="4" height="3" fill="#1F2937" />
      <rect x="6" y="7" width="4" height="3" fill="#1F2937" />
      <rect x="14" y="7" width="4" height="3" fill="#1F2937" />
      <rect x="2" y="10" width="4" height="3" fill="#1F2937" />
      <rect x="10" y="10" width="4" height="3" fill="#1F2937" />
      <rect x="6" y="13" width="4" height="3" fill="#1F2937" />
      <rect x="14" y="13" width="4" height="3" fill="#1F2937" />
      <rect x="3" y="4" width="2" height="24" rx="0.5" fill="#78716C" />
    </svg>
  );
}

export function SteeringWheel({ size = 1, className = "" }: SVGProps) {
  const w = 22 * size, h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 22" className={className} aria-hidden>
      <circle cx="11" cy="11" r="10" fill="none" stroke="#374151" strokeWidth="2.5" />
      <circle cx="11" cy="11" r="3" fill="#374151" />
      <line x1="11" y1="3" x2="11" y2="8" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
      <line x1="3.5" y1="15" x2="8" y2="12.5" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
      <line x1="18.5" y1="15" x2="14" y2="12.5" stroke="#374151" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function SpeedSign({ size = 1, className = "" }: SVGProps) {
  const w = 18 * size, h = 28 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 28" className={className} aria-hidden>
      <rect x="7.5" y="12" width="3" height="16" rx="0.5" fill="#78716C" />
      <circle cx="9" cy="8" r="7.5" fill="white" stroke="#EF4444" strokeWidth="2" />
      <text x="9" y="11" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#1F2937">50</text>
    </svg>
  );
}

export function Tire({ size = 1, className = "" }: SVGProps) {
  const w = 18 * size, h = 18 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 18" className={className} aria-hidden>
      <circle cx="9" cy="9" r="8" fill="#1F2937" />
      <circle cx="9" cy="9" r="5" fill="#374151" />
      <circle cx="9" cy="9" r="2" fill="#6B7280" />
      <line x1="9" y1="4" x2="9" y2="5" stroke="#6B7280" strokeWidth="1" />
      <line x1="9" y1="13" x2="9" y2="14" stroke="#6B7280" strokeWidth="1" />
      <line x1="4" y1="9" x2="5" y2="9" stroke="#6B7280" strokeWidth="1" />
      <line x1="13" y1="9" x2="14" y2="9" stroke="#6B7280" strokeWidth="1" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAGIC / FAIRY TALES
// ═══════════════════════════════════════════════════════════════════════

export function MagicWand({ size = 1, className = "" }: SVGProps) {
  const w = 20 * size, h = 28 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 28" className={className} aria-hidden>
      <line x1="10" y1="8" x2="10" y2="26" stroke="#4B3621" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="7" y="6" width="6" height="4" rx="1" fill="#FBBF24" />
      <polygon points="10,0 11.5,4 14,4 12,6.5 13,10 10,7.5 7,10 8,6.5 6,4 8.5,4" fill="#FCD34D" />
      <circle cx="5" cy="3" r="1" fill="#FCD34D" opacity="0.6" />
      <circle cx="15" cy="5" r="0.8" fill="#FCD34D" opacity="0.5" />
      <circle cx="14" cy="1" r="0.6" fill="#FBBF24" opacity="0.7" />
    </svg>
  );
}

export function CrystalBall({ size = 1, className = "" }: SVGProps) {
  const w = 22 * size, h = 26 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 26" className={className} aria-hidden>
      <ellipse cx="11" cy="22" rx="7" ry="3" fill="#78716C" />
      <rect x="7" y="18" width="8" height="4" rx="1" fill="#A8A29E" />
      <circle cx="11" cy="11" r="9" fill="#C4B5FD" opacity="0.5" />
      <circle cx="11" cy="11" r="9" fill="none" stroke="#7C3AED" strokeWidth="1" opacity="0.6" />
      <circle cx="8" cy="8" r="2.5" fill="white" opacity="0.4" />
      <circle cx="13" cy="13" r="1" fill="#DDD6FE" opacity="0.5" />
      <circle cx="9" cy="14" r="0.7" fill="#A78BFA" opacity="0.6" />
    </svg>
  );
}

export function PotionBottle({ size = 1, className = "" }: SVGProps) {
  const w = 16 * size, h = 24 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 16 24" className={className} aria-hidden>
      <rect x="5.5" y="1" width="5" height="5" rx="1" fill="#D6D3D1" />
      <rect x="6" y="0" width="4" height="2" rx="0.5" fill="#A8A29E" />
      <path d="M5.5,6 L3,12 L3,20 Q3,22 5,22 L11,22 Q13,22 13,20 L13,12 L10.5,6 Z" fill="#A78BFA" opacity="0.6" />
      <path d="M5.5,6 L3,12 L3,20 Q3,22 5,22 L11,22 Q13,22 13,20 L13,12 L10.5,6 Z" fill="none" stroke="#7C3AED" strokeWidth="0.8" opacity="0.5" />
      <ellipse cx="8" cy="18" rx="3" ry="1.5" fill="#7C3AED" opacity="0.3" />
      <circle cx="6" cy="15" r="1" fill="#DDD6FE" opacity="0.6" />
      <circle cx="9" cy="17" r="0.6" fill="#C4B5FD" opacity="0.5" />
    </svg>
  );
}

export function TopHat({ size = 1, className = "" }: SVGProps) {
  const w = 22 * size, h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 22" className={className} aria-hidden>
      <ellipse cx="11" cy="18" rx="10" ry="3" fill="#1F2937" />
      <rect x="5" y="4" width="12" height="14" rx="1" fill="#374151" />
      <ellipse cx="11" cy="4" rx="6" ry="2" fill="#4B5563" />
      <rect x="4" y="14" width="14" height="3" rx="0.5" fill="#7C3AED" opacity="0.8" />
      <polygon points="17,15 20,13 18,15.5" fill="#FCD34D" />
    </svg>
  );
}

export function MagicStar({ size = 1, className = "" }: SVGProps) {
  const w = 20 * size, h = 20 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 20" className={`map-flutter ${className}`} aria-hidden>
      <polygon points="10,1 12.5,7 19,7.5 14,12 15.5,19 10,15.5 4.5,19 6,12 1,7.5 7.5,7" fill="#FCD34D" />
      <polygon points="10,4 11.5,8 15,8.3 12,11 13,15.5 10,13 7,15.5 8,11 5,8.3 8.5,8" fill="#FBBF24" opacity="0.6" />
    </svg>
  );
}

export function SparkleCluster({ size = 1, className = "" }: SVGProps) {
  const w = 22 * size, h = 18 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 18" className={`map-flutter ${className}`} aria-hidden>
      <polygon points="6,0 7,4 11,5 7,6 6,10 5,6 1,5 5,4" fill="#FBBF24" opacity="0.8" />
      <polygon points="16,4 17,7 20,8 17,9 16,12 15,9 12,8 15,7" fill="#A78BFA" opacity="0.7" />
      <polygon points="10,10 10.8,12.5 13,13 10.8,13.5 10,16 9.2,13.5 7,13 9.2,12.5" fill="#F472B6" opacity="0.6" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SPACE
// ═══════════════════════════════════════════════════════════════════════

export function Rocket({ size = 1, className = "" }: SVGProps) {
  const w = 18 * size, h = 32 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 32" className={className} aria-hidden>
      <path d="M9,2 Q14,8 14,18 L4,18 Q4,8 9,2Z" fill="#E5E7EB" />
      <path d="M9,2 Q12,6 13,14 L9,14 Z" fill="#D1D5DB" opacity="0.5" />
      <circle cx="9" cy="12" r="2.5" fill="#60A5FA" />
      <circle cx="9" cy="12" r="1.5" fill="#93C5FD" opacity="0.7" />
      <polygon points="4,16 1,22 4,20" fill="#EF4444" />
      <polygon points="14,16 17,22 14,20" fill="#EF4444" />
      <rect x="6" y="18" width="6" height="4" rx="1" fill="#9CA3AF" />
      <polygon points="7,22 5,28 9,25 13,28 11,22" fill="#F97316" opacity="0.8" />
      <polygon points="8,23 7,27 9,25 11,27 10,23" fill="#FBBF24" opacity="0.6" />
    </svg>
  );
}

export function Planet({ size = 1, className = "" }: SVGProps) {
  const w = 28 * size, h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 28 22" className={className} aria-hidden>
      <circle cx="14" cy="11" r="8" fill="#818CF8" />
      <circle cx="11" cy="8" r="2.5" fill="#A5B4FC" opacity="0.5" />
      <circle cx="16" cy="13" r="1.5" fill="#6366F1" opacity="0.4" />
      <ellipse cx="14" cy="11" rx="13" ry="3" fill="none" stroke="#C4B5FD" strokeWidth="1.5" opacity="0.6" transform="rotate(-20 14 11)" />
    </svg>
  );
}

export function UFO({ size = 1, className = "" }: SVGProps) {
  const w = 26 * size, h = 18 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 26 18" className={`map-fly ${className}`} aria-hidden>
      <ellipse cx="13" cy="10" rx="12" ry="4" fill="#9CA3AF" />
      <ellipse cx="13" cy="10" rx="12" ry="4" fill="none" stroke="#6B7280" strokeWidth="0.5" />
      <ellipse cx="13" cy="8" rx="6" ry="5" fill="#D1D5DB" />
      <ellipse cx="13" cy="7" rx="5" ry="4" fill="#60A5FA" opacity="0.3" />
      <circle cx="13" cy="6" r="2" fill="#93C5FD" opacity="0.4" />
      <circle cx="7" cy="11" r="1" fill="#FBBF24" />
      <circle cx="13" cy="12" r="1" fill="#FBBF24" />
      <circle cx="19" cy="11" r="1" fill="#FBBF24" />
    </svg>
  );
}

export function Astronaut({ size = 1, className = "" }: SVGProps) {
  const w = 18 * size, h = 26 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 26" className={className} aria-hidden>
      <ellipse cx="9" cy="7" rx="6" ry="6.5" fill="#E5E7EB" />
      <rect x="5" y="3" width="8" height="7" rx="3" fill="#93C5FD" opacity="0.4" />
      <circle cx="7" cy="6" r="0.8" fill="#1F2937" />
      <circle cx="11" cy="6" r="0.8" fill="#1F2937" />
      <rect x="4" y="13" width="10" height="9" rx="3" fill="#E5E7EB" />
      <rect x="5.5" y="14" width="7" height="4" rx="1" fill="#60A5FA" opacity="0.3" />
      <line x1="6" y1="22" x2="5" y2="26" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" />
      <line x1="12" y1="22" x2="13" y2="26" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="16" x2="1" y2="20" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" />
      <line x1="14" y1="16" x2="17" y2="20" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Meteor({ size = 1, className = "" }: SVGProps) {
  const w = 20 * size, h = 14 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 14" className={`map-fly ${className}`} aria-hidden>
      <circle cx="14" cy="7" r="5" fill="#F59E0B" />
      <circle cx="12" cy="5" r="2" fill="#FCD34D" opacity="0.6" />
      <path d="M10,7 Q5,4 1,2" fill="none" stroke="#FBBF24" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M10,9 Q6,8 2,9" fill="none" stroke="#F97316" strokeWidth="1.5" strokeLinecap="round" opacity="0.4" />
    </svg>
  );
}

export function SpaceStar({ size = 1, className = "" }: SVGProps) {
  const w = 14 * size, h = 14 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 14 14" className={`map-flutter ${className}`} aria-hidden>
      <polygon points="7,0 8.5,5 14,5.5 9.5,9 11,14 7,11 3,14 4.5,9 0,5.5 5.5,5" fill="#FCD34D" opacity="0.7" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DINOSAURS
// ═══════════════════════════════════════════════════════════════════════

export function DinoSilhouette({ size = 1, className = "" }: SVGProps) {
  const w = 36 * size, h = 28 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 36 28" className={className} aria-hidden>
      <path d="M8,26 L8,18 Q6,14 8,10 Q10,6 14,6 L18,6 Q20,4 22,4 Q24,4 24,6 L26,6 Q28,6 30,8 L32,8 Q34,10 32,12 L30,12 Q28,14 28,18 L28,26"
        fill="#4ADE80" opacity="0.8" />
      <circle cx="27" cy="8" r="1" fill="#1F2937" />
      <path d="M4,22 L8,20" fill="none" stroke="#4ADE80" strokeWidth="2" strokeLinecap="round" opacity="0.6" />
    </svg>
  );
}

export function DinoEgg({ size = 1, className = "" }: SVGProps) {
  const w = 16 * size, h = 20 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 16 20" className={className} aria-hidden>
      <ellipse cx="8" cy="12" rx="7" ry="8" fill="#FDE68A" />
      <ellipse cx="8" cy="12" rx="7" ry="8" fill="none" stroke="#F59E0B" strokeWidth="0.8" opacity="0.5" />
      <path d="M4,8 Q6,6 8,8 Q10,6 12,8" fill="none" stroke="#D97706" strokeWidth="0.8" opacity="0.4" />
      <circle cx="6" cy="14" r="1" fill="#FCD34D" opacity="0.4" />
      <circle cx="10" cy="11" r="0.8" fill="#FCD34D" opacity="0.3" />
    </svg>
  );
}

export function Volcano({ size = 1, className = "" }: SVGProps) {
  const w = 36 * size, h = 30 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 36 30" className={className} aria-hidden>
      <polygon points="18,4 32,28 4,28" fill="#78716C" />
      <polygon points="18,4 26,20 10,20" fill="#A8A29E" opacity="0.5" />
      <ellipse cx="18" cy="5" rx="4" ry="2" fill="#EF4444" opacity="0.7" />
      <ellipse cx="18" cy="4" rx="3" ry="1.5" fill="#F97316" opacity="0.5" />
      <circle cx="16" cy="1" r="2" fill="#F97316" opacity="0.3" />
      <circle cx="20" cy="2" r="1.5" fill="#EF4444" opacity="0.25" />
    </svg>
  );
}

export function DinoBone({ size = 1, className = "" }: SVGProps) {
  const w = 22 * size, h = 12 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 12" className={className} aria-hidden>
      <line x1="4" y1="6" x2="18" y2="6" stroke="#E7E5E4" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="3" cy="4" r="2" fill="#E7E5E4" />
      <circle cx="5" cy="3.5" r="2" fill="#E7E5E4" />
      <circle cx="19" cy="4" r="2" fill="#E7E5E4" />
      <circle cx="17" cy="3.5" r="2" fill="#E7E5E4" />
      <circle cx="3" cy="8" r="2" fill="#E7E5E4" />
      <circle cx="5" cy="8.5" r="2" fill="#E7E5E4" />
      <circle cx="19" cy="8" r="2" fill="#E7E5E4" />
      <circle cx="17" cy="8.5" r="2" fill="#E7E5E4" />
    </svg>
  );
}

export function DinoFootprint({ size = 1, className = "" }: SVGProps) {
  const w = 16 * size, h = 18 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 16 18" className={className} aria-hidden>
      <ellipse cx="8" cy="12" rx="5" ry="5.5" fill="#A8A29E" opacity="0.5" />
      <ellipse cx="4" cy="4" rx="2" ry="2.5" fill="#A8A29E" opacity="0.5" />
      <ellipse cx="8" cy="2.5" rx="2" ry="2.5" fill="#A8A29E" opacity="0.5" />
      <ellipse cx="12" cy="4" rx="2" ry="2.5" fill="#A8A29E" opacity="0.5" />
    </svg>
  );
}

export function Palm({ size = 1, className = "" }: SVGProps) {
  const w = 28 * size, h = 38 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 28 38" className={className} aria-hidden>
      <path d="M14,14 Q13,24 14,38" fill="none" stroke="#92400E" strokeWidth="3" strokeLinecap="round" />
      <path d="M14,14 Q6,8 1,10" fill="none" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" />
      <path d="M14,14 Q22,8 27,10" fill="none" stroke="#4ADE80" strokeWidth="3" strokeLinecap="round" />
      <path d="M14,14 Q8,4 4,2" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14,14 Q20,4 24,2" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M14,14 Q14,6 14,1" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ANIMALS
// ═══════════════════════════════════════════════════════════════════════

export function PawPrint({ size = 1, className = "" }: SVGProps) {
  const w = 18 * size, h = 18 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 18" className={className} aria-hidden>
      <ellipse cx="9" cy="12" rx="4.5" ry="4" fill="#A8A29E" opacity="0.6" />
      <ellipse cx="5" cy="6" rx="2.2" ry="2.5" fill="#A8A29E" opacity="0.6" />
      <ellipse cx="9" cy="4.5" rx="2" ry="2.5" fill="#A8A29E" opacity="0.6" />
      <ellipse cx="13" cy="6" rx="2.2" ry="2.5" fill="#A8A29E" opacity="0.6" />
    </svg>
  );
}

export function DogSVG({ size = 1, className = "" }: SVGProps) {
  const w = 24 * size, h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 24 22" className={className} aria-hidden>
      <ellipse cx="12" cy="14" rx="7" ry="6" fill="#D4A76A" />
      <circle cx="17" cy="9" r="4.5" fill="#C4956A" />
      <circle cx="18.5" cy="7.5" r="1" fill="#1F2937" />
      <ellipse cx="19.5" cy="10" rx="1.5" ry="1" fill="#1F2937" />
      <polygon points="14,5 12,1 15,4" fill="#B8845A" />
      <polygon points="20,5 22,1 19,4" fill="#B8845A" />
      <path d="M5,14 Q3,12 2,14" fill="none" stroke="#D4A76A" strokeWidth="2" strokeLinecap="round" />
      <line x1="9" y1="20" x2="9" y2="22" stroke="#C4956A" strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="20" x2="15" y2="22" stroke="#C4956A" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function CatSVG({ size = 1, className = "" }: SVGProps) {
  const w = 20 * size, h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 22" className={className} aria-hidden>
      <ellipse cx="10" cy="14" rx="6" ry="6" fill="#9CA3AF" />
      <circle cx="10" cy="8" r="5" fill="#A1A1AA" />
      <polygon points="5,5 3,0 7,3" fill="#A1A1AA" />
      <polygon points="15,5 17,0 13,3" fill="#A1A1AA" />
      <circle cx="8" cy="7" r="1" fill="#22C55E" />
      <circle cx="12" cy="7" r="1" fill="#22C55E" />
      <ellipse cx="10" cy="9.5" rx="0.8" ry="0.5" fill="#F472B6" />
      <path d="M8,10 Q10,11.5 12,10" fill="none" stroke="#6B7280" strokeWidth="0.5" />
      <path d="M16,14 Q18,13 20,14" fill="none" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function FishSVG({ size = 1, className = "" }: SVGProps) {
  const w = 22 * size, h = 14 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 14" className={className} aria-hidden>
      <ellipse cx="12" cy="7" rx="8" ry="5" fill="#60A5FA" />
      <polygon points="4,7 0,2 0,12" fill="#3B82F6" />
      <circle cx="16" cy="6" r="1.2" fill="white" />
      <circle cx="16.5" cy="5.8" r="0.6" fill="#1F2937" />
      <ellipse cx="12" cy="7" rx="5" ry="3" fill="#93C5FD" opacity="0.3" />
    </svg>
  );
}

export function Beehive({ size = 1, className = "" }: SVGProps) {
  const w = 20 * size, h = 24 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 24" className={className} aria-hidden>
      <ellipse cx="10" cy="14" rx="8" ry="9" fill="#FBBF24" />
      <ellipse cx="10" cy="8" rx="6" ry="4" fill="#FCD34D" />
      <line x1="3" y1="11" x2="17" y2="11" stroke="#F59E0B" strokeWidth="0.8" opacity="0.5" />
      <line x1="3" y1="15" x2="17" y2="15" stroke="#F59E0B" strokeWidth="0.8" opacity="0.5" />
      <line x1="4" y1="19" x2="16" y2="19" stroke="#F59E0B" strokeWidth="0.8" opacity="0.5" />
      <ellipse cx="10" cy="22" rx="3" ry="1.5" fill="#92400E" opacity="0.5" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MUSIC
// ═══════════════════════════════════════════════════════════════════════

export function MusicNote({ size = 1, className = "" }: SVGProps) {
  const w = 16 * size, h = 24 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 16 24" className={`map-flutter ${className}`} aria-hidden>
      <line x1="12" y1="4" x2="12" y2="18" stroke="#1F2937" strokeWidth="1.5" />
      <ellipse cx="8" cy="19" rx="4" ry="3" fill="#1F2937" transform="rotate(-15 8 19)" />
      <rect x="12" y="3" width="4" height="2.5" rx="0.5" fill="#1F2937" />
    </svg>
  );
}

export function Guitar({ size = 1, className = "" }: SVGProps) {
  const w = 18 * size, h = 34 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 34" className={className} aria-hidden>
      <rect x="8" y="2" width="2" height="18" rx="0.5" fill="#78716C" />
      <rect x="6" y="0" width="6" height="4" rx="1" fill="#A8A29E" />
      <ellipse cx="9" cy="26" rx="7" ry="7" fill="#D4A76A" />
      <ellipse cx="9" cy="26" rx="5" ry="5" fill="#C4956A" opacity="0.5" />
      <circle cx="9" cy="26" r="2" fill="#78716C" />
      <line x1="7" y1="12" x2="11" y2="12" stroke="#A8A29E" strokeWidth="0.5" />
      <line x1="7" y1="14" x2="11" y2="14" stroke="#A8A29E" strokeWidth="0.5" />
    </svg>
  );
}

export function Headphones({ size = 1, className = "" }: SVGProps) {
  const w = 22 * size, h = 20 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 20" className={className} aria-hidden>
      <path d="M3,12 Q3,4 11,4 Q19,4 19,12" fill="none" stroke="#374151" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="1" y="11" width="4" height="7" rx="2" fill="#374151" />
      <rect x="17" y="11" width="4" height="7" rx="2" fill="#374151" />
      <rect x="2" y="12" width="2" height="5" rx="1" fill="#6366F1" />
      <rect x="18" y="12" width="2" height="5" rx="1" fill="#6366F1" />
    </svg>
  );
}

export function Drum({ size = 1, className = "" }: SVGProps) {
  const w = 24 * size, h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 24 22" className={className} aria-hidden>
      <rect x="3" y="6" width="18" height="12" rx="2" fill="#EF4444" />
      <ellipse cx="12" cy="6" rx="9" ry="3" fill="#F87171" />
      <ellipse cx="12" cy="18" rx="9" ry="3" fill="#DC2626" />
      <line x1="3" y1="8" x2="21" y2="16" stroke="#FCD34D" strokeWidth="0.8" opacity="0.5" />
      <line x1="21" y1="8" x2="3" y2="16" stroke="#FCD34D" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

export function DoubleNote({ size = 1, className = "" }: SVGProps) {
  const w = 20 * size, h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 22" className={`map-flutter ${className}`} aria-hidden>
      <line x1="6" y1="4" x2="6" y2="16" stroke="#1F2937" strokeWidth="1.5" />
      <line x1="16" y1="2" x2="16" y2="14" stroke="#1F2937" strokeWidth="1.5" />
      <line x1="6" y1="4" x2="16" y2="2" stroke="#1F2937" strokeWidth="2" />
      <ellipse cx="4" cy="17" rx="3.5" ry="2.5" fill="#1F2937" transform="rotate(-15 4 17)" />
      <ellipse cx="14" cy="15" rx="3.5" ry="2.5" fill="#1F2937" transform="rotate(-15 14 15)" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SPORTS
// ═══════════════════════════════════════════════════════════════════════

export function SoccerBall({ size = 1, className = "" }: SVGProps) {
  const w = 18 * size, h = 18 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 18" className={className} aria-hidden>
      <circle cx="9" cy="9" r="8" fill="white" stroke="#D1D5DB" strokeWidth="1" />
      <polygon points="9,3 11,6 9,8 7,6" fill="#374151" opacity="0.6" />
      <polygon points="14,7 13,10 15,12" fill="#374151" opacity="0.5" />
      <polygon points="4,7 5,10 3,12" fill="#374151" opacity="0.5" />
      <polygon points="7,12 9,15 11,12" fill="#374151" opacity="0.5" />
    </svg>
  );
}

export function TrophySVG({ size = 1, className = "" }: SVGProps) {
  const w = 20 * size, h = 24 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 24" className={className} aria-hidden>
      <rect x="6" y="16" width="8" height="3" rx="0.5" fill="#D97706" />
      <rect x="5" y="19" width="10" height="3" rx="1" fill="#B45309" />
      <path d="M5,2 L5,10 Q5,14 10,14 Q15,14 15,10 L15,2 Z" fill="#FBBF24" />
      <path d="M5,2 L1,2 L1,6 Q1,9 5,9" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
      <path d="M15,2 L19,2 L19,6 Q19,9 15,9" fill="none" stroke="#F59E0B" strokeWidth="1.5" />
      <polygon points="10,5 11,8 14,8 11.5,10 12.5,13 10,11 7.5,13 8.5,10 6,8 9,8" fill="#FCD34D" opacity="0.6" />
    </svg>
  );
}

export function Medal({ size = 1, className = "" }: SVGProps) {
  const w = 16 * size, h = 24 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 16 24" className={className} aria-hidden>
      <polygon points="4,0 8,8 0,8" fill="#3B82F6" />
      <polygon points="12,0 16,8 8,8" fill="#EF4444" />
      <circle cx="8" cy="16" r="7" fill="#FBBF24" />
      <circle cx="8" cy="16" r="5" fill="#F59E0B" />
      <polygon points="8,11 9,14 12,14 9.5,16 10.5,19 8,17 5.5,19 6.5,16 4,14 7,14" fill="#FCD34D" />
    </svg>
  );
}

export function Sneaker({ size = 1, className = "" }: SVGProps) {
  const w = 24 * size, h = 16 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 24 16" className={className} aria-hidden>
      <path d="M4,6 L4,12 Q4,14 6,14 L22,14 Q24,14 24,12 L24,10 Q20,8 16,8 L12,8 Q10,4 8,4 L6,4 Q4,4 4,6Z" fill="#3B82F6" />
      <path d="M4,12 L22,12 Q24,12 24,10 L24,12 Q24,14 22,14 L6,14 Q4,14 4,12Z" fill="white" />
      <circle cx="8" cy="8" r="1" fill="white" opacity="0.5" />
      <circle cx="11" cy="7" r="0.8" fill="white" opacity="0.4" />
    </svg>
  );
}

export function Whistle({ size = 1, className = "" }: SVGProps) {
  const w = 22 * size, h = 14 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 14" className={className} aria-hidden>
      <rect x="4" y="4" width="14" height="6" rx="3" fill="#6B7280" />
      <circle cx="18" cy="7" r="4" fill="#9CA3AF" />
      <circle cx="18" cy="7" r="2" fill="#6B7280" />
      <rect x="0" y="2" width="6" height="2" rx="1" fill="#A8A29E" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// OCEAN / UNDERWATER
// ═══════════════════════════════════════════════════════════════════════

export function Seashell({ size = 1, className = "" }: SVGProps) {
  const w = 18 * size, h = 16 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 16" className={className} aria-hidden>
      <path d="M9,2 Q16,2 16,10 Q16,14 9,14 Q2,14 2,10 Q2,2 9,2Z" fill="#FECDD3" />
      <path d="M9,4 L9,14" fill="none" stroke="#FDA4AF" strokeWidth="0.5" opacity="0.6" />
      <path d="M5,5 L7,14" fill="none" stroke="#FDA4AF" strokeWidth="0.5" opacity="0.5" />
      <path d="M13,5 L11,14" fill="none" stroke="#FDA4AF" strokeWidth="0.5" opacity="0.5" />
    </svg>
  );
}

export function Starfish({ size = 1, className = "" }: SVGProps) {
  const w = 20 * size, h = 20 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 20" className={className} aria-hidden>
      <polygon points="10,1 12,7 18.5,7.5 13.5,11.5 15,18 10,14 5,18 6.5,11.5 1.5,7.5 8,7" fill="#F97316" />
      <polygon points="10,4 11.2,8 15,8.3 12,10.5 13,15 10,12.5 7,15 8,10.5 5,8.3 8.8,8" fill="#FDBA74" opacity="0.5" />
    </svg>
  );
}

export function Coral({ size = 1, className = "" }: SVGProps) {
  const w = 24 * size, h = 24 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 24 24" className={className} aria-hidden>
      <path d="M8,22 Q8,14 4,10 Q2,8 4,6" fill="none" stroke="#F472B6" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M12,22 Q12,12 12,6 Q12,3 14,2" fill="none" stroke="#EC4899" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M16,22 Q16,14 20,10 Q22,8 20,6" fill="none" stroke="#F9A8D4" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="4" cy="5.5" r="1.5" fill="#F472B6" />
      <circle cx="14" cy="1.5" r="1.5" fill="#EC4899" />
      <circle cx="20" cy="5.5" r="1.5" fill="#F9A8D4" />
    </svg>
  );
}

export function Anchor({ size = 1, className = "" }: SVGProps) {
  const w = 18 * size, h = 24 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 24" className={className} aria-hidden>
      <circle cx="9" cy="4" r="3" fill="none" stroke="#475569" strokeWidth="2" />
      <line x1="9" y1="7" x2="9" y2="20" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      <line x1="3" y1="14" x2="15" y2="14" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
      <path d="M3,20 Q3,16 9,20 Q15,16 15,20" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function Wave({ size = 1, className = "" }: SVGProps) {
  const w = 30 * size, h = 12 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 30 12" className={className} aria-hidden>
      <path d="M0,8 Q5,2 10,8 Q15,14 20,8 Q25,2 30,8" fill="none" stroke="#60A5FA" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      <path d="M0,10 Q5,4 10,10 Q15,16 20,10 Q25,4 30,10" fill="none" stroke="#93C5FD" strokeWidth="1.5" strokeLinecap="round" opacity="0.3" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ART / CREATIVE
// ═══════════════════════════════════════════════════════════════════════

export function Paintbrush({ size = 1, className = "" }: SVGProps) {
  const w = 14 * size, h = 30 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 14 30" className={className} aria-hidden>
      <rect x="5" y="12" width="4" height="16" rx="0.5" fill="#D4A76A" />
      <rect x="4" y="10" width="6" height="4" rx="0.5" fill="#A8A29E" />
      <path d="M4,10 Q3,4 7,1 Q11,4 10,10Z" fill="#EC4899" />
      <path d="M5,8 Q4,4 7,2 Q10,4 9,8Z" fill="#F472B6" opacity="0.5" />
    </svg>
  );
}

export function Palette({ size = 1, className = "" }: SVGProps) {
  const w = 26 * size, h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 26 22" className={className} aria-hidden>
      <ellipse cx="13" cy="11" rx="12" ry="10" fill="#FDE68A" />
      <circle cx="8" cy="8" r="2.5" fill="#EF4444" />
      <circle cx="14" cy="6" r="2" fill="#3B82F6" />
      <circle cx="19" cy="9" r="2" fill="#22C55E" />
      <circle cx="17" cy="14" r="2.2" fill="#A855F7" />
      <circle cx="10" cy="14" r="2" fill="#F97316" />
      <circle cx="20" cy="16" r="3" fill="#FDE68A" />
    </svg>
  );
}

export function Pencil({ size = 1, className = "" }: SVGProps) {
  const w = 10 * size, h = 28 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 10 28" className={className} aria-hidden>
      <rect x="2" y="6" width="6" height="18" rx="0.5" fill="#FBBF24" />
      <polygon points="2,24 5,28 8,24" fill="#FFEDD5" />
      <polygon points="4,26 5,28 6,26" fill="#374151" />
      <rect x="2" y="4" width="6" height="3" rx="0.5" fill="#F472B6" />
      <rect x="2" y="3" width="6" height="2" rx="0.5" fill="#A8A29E" />
    </svg>
  );
}

export function PaintSplatter({ size = 1, className = "" }: SVGProps) {
  const w = 22 * size, h = 16 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 16" className={className} aria-hidden>
      <ellipse cx="11" cy="9" rx="8" ry="5" fill="#A855F7" opacity="0.5" />
      <circle cx="6" cy="5" r="3" fill="#EC4899" opacity="0.4" />
      <circle cx="16" cy="6" r="2.5" fill="#3B82F6" opacity="0.4" />
      <circle cx="14" cy="12" r="2" fill="#22C55E" opacity="0.4" />
      <circle cx="4" cy="11" r="1.5" fill="#F97316" opacity="0.5" />
    </svg>
  );
}

export function Easel({ size = 1, className = "" }: SVGProps) {
  const w = 22 * size, h = 30 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 30" className={className} aria-hidden>
      <line x1="3" y1="4" x2="6" y2="28" stroke="#8B6914" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="19" y1="4" x2="16" y2="28" stroke="#8B6914" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="11" y1="16" x2="11" y2="30" stroke="#8B6914" strokeWidth="1.5" strokeLinecap="round" />
      <rect x="3" y="2" width="16" height="14" rx="1" fill="white" stroke="#D1D5DB" strokeWidth="1" />
      <rect x="5" y="4" width="12" height="10" rx="0.5" fill="#DBEAFE" />
      <circle cx="14" cy="7" r="2" fill="#FBBF24" opacity="0.6" />
      <path d="M5,14 Q8,8 11,12 Q14,10 17,14Z" fill="#4ADE80" opacity="0.4" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// ROBOTS / TECH
// ═══════════════════════════════════════════════════════════════════════

export function RobotSVG({ size = 1, className = "" }: SVGProps) {
  const w = 20 * size, h = 26 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 26" className={className} aria-hidden>
      <line x1="10" y1="0" x2="10" y2="3" stroke="#6B7280" strokeWidth="1.5" />
      <circle cx="10" cy="0" r="1.5" fill="#60A5FA" />
      <rect x="4" y="3" width="12" height="10" rx="2" fill="#9CA3AF" />
      <rect x="6" y="5" width="3" height="2.5" rx="0.5" fill="#60A5FA" />
      <rect x="11" y="5" width="3" height="2.5" rx="0.5" fill="#60A5FA" />
      <rect x="7" y="9" width="6" height="2" rx="1" fill="#6B7280" />
      <rect x="5" y="14" width="10" height="8" rx="1.5" fill="#A1A1AA" />
      <rect x="7" y="16" width="6" height="3" rx="0.5" fill="#4ADE80" opacity="0.4" />
      <line x1="1" y1="16" x2="5" y2="16" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
      <line x1="15" y1="16" x2="19" y2="16" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
      <rect x="6" y="22" width="3" height="4" rx="1" fill="#9CA3AF" />
      <rect x="11" y="22" width="3" height="4" rx="1" fill="#9CA3AF" />
    </svg>
  );
}

export function GearSVG({ size = 1, className = "" }: SVGProps) {
  const w = 20 * size, h = 20 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 20" className={className} aria-hidden>
      <circle cx="10" cy="10" r="4" fill="#6B7280" />
      <circle cx="10" cy="10" r="2" fill="#9CA3AF" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
        const rad = (angle * Math.PI) / 180;
        const x1 = 10 + Math.cos(rad) * 5.5;
        const y1 = 10 + Math.sin(rad) * 5.5;
        const x2 = 10 + Math.cos(rad) * 8;
        const y2 = 10 + Math.sin(rad) * 8;
        return <line key={angle} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#6B7280" strokeWidth="3" strokeLinecap="round" />;
      })}
    </svg>
  );
}

export function CircuitBoard({ size = 1, className = "" }: SVGProps) {
  const w = 24 * size, h = 18 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 24 18" className={className} aria-hidden>
      <rect x="1" y="1" width="22" height="16" rx="2" fill="#065F46" opacity="0.7" />
      <line x1="4" y1="5" x2="12" y2="5" stroke="#4ADE80" strokeWidth="0.8" opacity="0.7" />
      <line x1="12" y1="5" x2="12" y2="13" stroke="#4ADE80" strokeWidth="0.8" opacity="0.7" />
      <line x1="12" y1="13" x2="20" y2="13" stroke="#4ADE80" strokeWidth="0.8" opacity="0.7" />
      <line x1="8" y1="9" x2="20" y2="9" stroke="#4ADE80" strokeWidth="0.8" opacity="0.6" />
      <circle cx="4" cy="5" r="1.5" fill="#4ADE80" />
      <circle cx="12" cy="9" r="2" fill="#374151" stroke="#4ADE80" strokeWidth="0.5" />
      <circle cx="20" cy="13" r="1.5" fill="#4ADE80" />
      <rect x="16" y="3" width="4" height="3" rx="0.5" fill="#374151" stroke="#4ADE80" strokeWidth="0.5" />
    </svg>
  );
}

export function Laptop({ size = 1, className = "" }: SVGProps) {
  const w = 26 * size, h = 18 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 26 18" className={className} aria-hidden>
      <rect x="4" y="2" width="18" height="11" rx="1.5" fill="#374151" />
      <rect x="5.5" y="3.5" width="15" height="8" rx="0.5" fill="#60A5FA" opacity="0.4" />
      <path d="M1,14 L4,13 L22,13 L25,14 Q26,16 24,16 L2,16 Q0,16 1,14Z" fill="#6B7280" />
    </svg>
  );
}

export function Antenna({ size = 1, className = "" }: SVGProps) {
  const w = 16 * size, h = 28 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 16 28" className={className} aria-hidden>
      <line x1="8" y1="8" x2="8" y2="26" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
      <line x1="4" y1="26" x2="12" y2="26" stroke="#6B7280" strokeWidth="2" strokeLinecap="round" />
      <line x1="8" y1="8" x2="3" y2="2" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
      <line x1="8" y1="8" x2="13" y2="2" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="8" cy="8" r="2" fill="#EF4444" />
      <circle cx="8" cy="8" r="1" fill="#FCA5A5" className="map-flutter" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// COOKING
// ═══════════════════════════════════════════════════════════════════════

export function ChefHat({ size = 1, className = "" }: SVGProps) {
  const w = 22 * size, h = 24 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 24" className={className} aria-hidden>
      <circle cx="6" cy="8" r="5" fill="white" stroke="#E5E7EB" strokeWidth="0.5" />
      <circle cx="16" cy="8" r="5" fill="white" stroke="#E5E7EB" strokeWidth="0.5" />
      <circle cx="11" cy="6" r="6" fill="white" stroke="#E5E7EB" strokeWidth="0.5" />
      <rect x="4" y="14" width="14" height="8" rx="1" fill="white" stroke="#E5E7EB" strokeWidth="0.5" />
      <line x1="4" y1="16" x2="18" y2="16" stroke="#E5E7EB" strokeWidth="0.5" />
    </svg>
  );
}

export function Cupcake({ size = 1, className = "" }: SVGProps) {
  const w = 18 * size, h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 18 22" className={className} aria-hidden>
      <path d="M4,12 L2,20 Q2,22 4,22 L14,22 Q16,22 16,20 L14,12Z" fill="#D4A76A" />
      <line x1="5" y1="14" x2="4" y2="20" stroke="#C4956A" strokeWidth="0.5" opacity="0.5" />
      <line x1="9" y1="12" x2="9" y2="22" stroke="#C4956A" strokeWidth="0.5" opacity="0.5" />
      <line x1="13" y1="14" x2="14" y2="20" stroke="#C4956A" strokeWidth="0.5" opacity="0.5" />
      <ellipse cx="9" cy="11" rx="7" ry="4" fill="#F472B6" />
      <ellipse cx="7" cy="10" rx="3" ry="2.5" fill="#F9A8D4" opacity="0.5" />
      <ellipse cx="12" cy="10" rx="3" ry="2" fill="#EC4899" opacity="0.4" />
      <circle cx="9" cy="7" r="2" fill="#EF4444" />
      <line x1="9" y1="5" x2="9" y2="7" stroke="#22C55E" strokeWidth="0.8" />
    </svg>
  );
}

export function Pizza({ size = 1, className = "" }: SVGProps) {
  const w = 22 * size, h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 22" className={className} aria-hidden>
      <path d="M11,2 L20,20 L2,20 Z" fill="#FBBF24" />
      <path d="M11,4 L18,18 L4,18 Z" fill="#FCD34D" opacity="0.5" />
      <circle cx="10" cy="12" r="2" fill="#EF4444" opacity="0.7" />
      <circle cx="14" cy="16" r="1.5" fill="#EF4444" opacity="0.6" />
      <circle cx="7" cy="15" r="1.8" fill="#EF4444" opacity="0.7" />
      <circle cx="12" cy="8" r="1" fill="#22C55E" opacity="0.5" />
    </svg>
  );
}

export function CookingPot({ size = 1, className = "" }: SVGProps) {
  const w = 24 * size, h = 22 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 24 22" className={className} aria-hidden>
      <ellipse cx="12" cy="8" rx="10" ry="3" fill="#9CA3AF" />
      <rect x="2" y="8" width="20" height="10" rx="2" fill="#6B7280" />
      <ellipse cx="12" cy="18" rx="10" ry="3" fill="#4B5563" />
      <line x1="0" y1="8" x2="4" y2="8" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
      <line x1="20" y1="8" x2="24" y2="8" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" />
      <path d="M8,5 Q8,2 10,3" fill="none" stroke="#D1D5DB" strokeWidth="0.8" opacity="0.5" />
      <path d="M12,4 Q12,1 14,2" fill="none" stroke="#D1D5DB" strokeWidth="0.8" opacity="0.5" />
      <path d="M16,5 Q16,2 18,3" fill="none" stroke="#D1D5DB" strokeWidth="0.8" opacity="0.5" />
    </svg>
  );
}

export function Apple({ size = 1, className = "" }: SVGProps) {
  const w = 16 * size, h = 18 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 16 18" className={className} aria-hidden>
      <path d="M8,4 Q2,4 2,10 Q2,16 8,16 Q14,16 14,10 Q14,4 8,4Z" fill="#EF4444" />
      <path d="M8,4 Q5,4 4,8 Q3,6 4,4 Q6,3 8,4Z" fill="#F87171" opacity="0.4" />
      <line x1="8" y1="1" x2="8" y2="5" stroke="#78716C" strokeWidth="1.2" strokeLinecap="round" />
      <path d="M8,2 Q10,1 12,2" fill="none" stroke="#22C55E" strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// SUPERHEROES
// ═══════════════════════════════════════════════════════════════════════

export function HeroMask({ size = 1, className = "" }: SVGProps) {
  const w = 24 * size, h = 14 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 24 14" className={className} aria-hidden>
      <path d="M2,7 Q2,2 7,2 L10,2 Q12,5 14,2 L17,2 Q22,2 22,7 Q22,12 17,12 L14,12 Q12,9 10,12 L7,12 Q2,12 2,7Z" fill="#EF4444" />
      <ellipse cx="7" cy="7" rx="3.5" ry="3" fill="white" />
      <ellipse cx="17" cy="7" rx="3.5" ry="3" fill="white" />
    </svg>
  );
}

export function HeroShield({ size = 1, className = "" }: SVGProps) {
  const w = 20 * size, h = 24 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 24" className={className} aria-hidden>
      <path d="M10,2 L18,6 L18,14 Q18,20 10,22 Q2,20 2,14 L2,6 Z" fill="#3B82F6" />
      <path d="M10,4 L16,7 L16,14 Q16,18 10,20 Q4,18 4,14 L4,7 Z" fill="#60A5FA" opacity="0.5" />
      <polygon points="10,7 11.5,11 15.5,11 12.5,13.5 13.5,17.5 10,15 6.5,17.5 7.5,13.5 4.5,11 8.5,11" fill="#FBBF24" />
    </svg>
  );
}

export function LightningBolt({ size = 1, className = "" }: SVGProps) {
  const w = 16 * size, h = 24 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 16 24" className={`map-flutter ${className}`} aria-hidden>
      <polygon points="10,0 4,10 8,10 2,24 14,12 9,12 14,0" fill="#FBBF24" />
      <polygon points="10,2 6,10 9,10 4,20 12,12 9.5,12 13,2" fill="#FCD34D" opacity="0.5" />
    </svg>
  );
}

export function HeroCape({ size = 1, className = "" }: SVGProps) {
  const w = 22 * size, h = 28 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 22 28" className={className} aria-hidden>
      <path d="M4,2 L18,2 Q20,2 18,8 L18,24 Q14,20 11,24 Q8,20 4,24 L4,8 Q2,2 4,2Z" fill="#EF4444" />
      <path d="M4,2 L18,2 Q19,2 17,6 L5,6 Q3,2 4,2Z" fill="#F87171" opacity="0.4" />
    </svg>
  );
}

export function StarBadge({ size = 1, className = "" }: SVGProps) {
  const w = 20 * size, h = 20 * size;
  return (
    <svg width={w} height={h} viewBox="0 0 20 20" className={className} aria-hidden>
      <circle cx="10" cy="10" r="9" fill="#3B82F6" />
      <circle cx="10" cy="10" r="7" fill="#60A5FA" opacity="0.5" />
      <polygon points="10,4 11.5,8 15.5,8 12.5,10.5 13.5,14.5 10,12 6.5,14.5 7.5,10.5 4.5,8 8.5,8" fill="#FBBF24" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// EXPORT: Interest → Decoration type mapping
// ═══════════════════════════════════════════════════════════════════════

export type InterestDecorationType =
  | "race_car" | "traffic_cone" | "checkered_flag" | "steering_wheel" | "speed_sign" | "tire"
  | "magic_wand" | "crystal_ball" | "potion" | "top_hat" | "magic_star" | "sparkle"
  | "rocket" | "planet" | "ufo" | "astronaut" | "meteor" | "space_star"
  | "dino" | "dino_egg" | "volcano" | "dino_bone" | "dino_footprint" | "palm"
  | "paw_print" | "dog" | "cat" | "fish" | "beehive"
  | "music_note" | "guitar" | "headphones" | "drum" | "double_note"
  | "soccer_ball" | "trophy" | "medal" | "sneaker" | "whistle"
  | "seashell" | "starfish" | "coral" | "anchor" | "wave"
  | "paintbrush" | "palette" | "pencil" | "paint_splatter" | "easel"
  | "robot" | "gear" | "circuit" | "laptop" | "antenna"
  | "chef_hat" | "cupcake" | "pizza" | "cooking_pot" | "apple"
  | "hero_mask" | "hero_shield" | "lightning" | "hero_cape" | "star_badge";

export const INTEREST_DECORATION_SETS: Record<string, InterestDecorationType[]> = {
  cars:         ["race_car", "traffic_cone", "checkered_flag", "steering_wheel", "speed_sign", "tire"],
  racing:       ["race_car", "traffic_cone", "checkered_flag", "steering_wheel", "speed_sign", "tire"],
  magic:        ["magic_wand", "crystal_ball", "potion", "top_hat", "magic_star", "sparkle"],
  "fairy tales":["magic_wand", "crystal_ball", "potion", "top_hat", "magic_star", "sparkle"],
  fantasy:      ["magic_wand", "crystal_ball", "potion", "top_hat", "magic_star", "sparkle"],
  space:        ["rocket", "planet", "ufo", "astronaut", "meteor", "space_star"],
  dinosaurs:    ["dino", "dino_egg", "volcano", "dino_bone", "dino_footprint", "palm"],
  prehistoric:  ["dino", "dino_egg", "volcano", "dino_bone", "dino_footprint", "palm"],
  animals:      ["paw_print", "dog", "cat", "fish", "beehive"],
  wildlife:     ["paw_print", "dog", "cat", "fish", "beehive"],
  music:        ["music_note", "guitar", "headphones", "drum", "double_note"],
  musical:      ["music_note", "guitar", "headphones", "drum", "double_note"],
  sports:       ["soccer_ball", "trophy", "medal", "sneaker", "whistle"],
  athletic:     ["soccer_ball", "trophy", "medal", "sneaker", "whistle"],
  ocean:        ["seashell", "starfish", "coral", "anchor", "wave"],
  underwater:   ["seashell", "starfish", "coral", "anchor", "wave"],
  art:          ["paintbrush", "palette", "pencil", "paint_splatter", "easel"],
  creative:     ["paintbrush", "palette", "pencil", "paint_splatter", "easel"],
  robots:       ["robot", "gear", "circuit", "laptop", "antenna"],
  tech:         ["robot", "gear", "circuit", "laptop", "antenna"],
  futuristic:   ["robot", "gear", "circuit", "laptop", "antenna"],
  science:      ["robot", "gear", "circuit", "laptop", "antenna"],
  cooking:      ["chef_hat", "cupcake", "pizza", "cooking_pot", "apple"],
  culinary:     ["chef_hat", "cupcake", "pizza", "cooking_pot", "apple"],
  superheroes:  ["hero_mask", "hero_shield", "lightning", "hero_cape", "star_badge"],
  heroic:       ["hero_mask", "hero_shield", "lightning", "hero_cape", "star_badge"],
};

/** Render an interest decoration by type */
export function renderInterestDecoration(type: InterestDecorationType, size: number, className: string = ""): React.ReactNode {
  const props = { size, className };
  switch (type) {
    case "race_car": return <RaceCar {...props} />;
    case "traffic_cone": return <TrafficCone {...props} />;
    case "checkered_flag": return <CheckeredFlag {...props} />;
    case "steering_wheel": return <SteeringWheel {...props} />;
    case "speed_sign": return <SpeedSign {...props} />;
    case "tire": return <Tire {...props} />;
    case "magic_wand": return <MagicWand {...props} />;
    case "crystal_ball": return <CrystalBall {...props} />;
    case "potion": return <PotionBottle {...props} />;
    case "top_hat": return <TopHat {...props} />;
    case "magic_star": return <MagicStar {...props} />;
    case "sparkle": return <SparkleCluster {...props} />;
    case "rocket": return <Rocket {...props} />;
    case "planet": return <Planet {...props} />;
    case "ufo": return <UFO {...props} />;
    case "astronaut": return <Astronaut {...props} />;
    case "meteor": return <Meteor {...props} />;
    case "space_star": return <SpaceStar {...props} />;
    case "dino": return <DinoSilhouette {...props} />;
    case "dino_egg": return <DinoEgg {...props} />;
    case "volcano": return <Volcano {...props} />;
    case "dino_bone": return <DinoBone {...props} />;
    case "dino_footprint": return <DinoFootprint {...props} />;
    case "palm": return <Palm {...props} />;
    case "paw_print": return <PawPrint {...props} />;
    case "dog": return <DogSVG {...props} />;
    case "cat": return <CatSVG {...props} />;
    case "fish": return <FishSVG {...props} />;
    case "beehive": return <Beehive {...props} />;
    case "music_note": return <MusicNote {...props} />;
    case "guitar": return <Guitar {...props} />;
    case "headphones": return <Headphones {...props} />;
    case "drum": return <Drum {...props} />;
    case "double_note": return <DoubleNote {...props} />;
    case "soccer_ball": return <SoccerBall {...props} />;
    case "trophy": return <TrophySVG {...props} />;
    case "medal": return <Medal {...props} />;
    case "sneaker": return <Sneaker {...props} />;
    case "whistle": return <Whistle {...props} />;
    case "seashell": return <Seashell {...props} />;
    case "starfish": return <Starfish {...props} />;
    case "coral": return <Coral {...props} />;
    case "anchor": return <Anchor {...props} />;
    case "wave": return <Wave {...props} />;
    case "paintbrush": return <Paintbrush {...props} />;
    case "palette": return <Palette {...props} />;
    case "pencil": return <Pencil {...props} />;
    case "paint_splatter": return <PaintSplatter {...props} />;
    case "easel": return <Easel {...props} />;
    case "robot": return <RobotSVG {...props} />;
    case "gear": return <GearSVG {...props} />;
    case "circuit": return <CircuitBoard {...props} />;
    case "laptop": return <Laptop {...props} />;
    case "antenna": return <Antenna {...props} />;
    case "chef_hat": return <ChefHat {...props} />;
    case "cupcake": return <Cupcake {...props} />;
    case "pizza": return <Pizza {...props} />;
    case "cooking_pot": return <CookingPot {...props} />;
    case "apple": return <Apple {...props} />;
    case "hero_mask": return <HeroMask {...props} />;
    case "hero_shield": return <HeroShield {...props} />;
    case "lightning": return <LightningBolt {...props} />;
    case "hero_cape": return <HeroCape {...props} />;
    case "star_badge": return <StarBadge {...props} />;
    default: return null;
  }
}
