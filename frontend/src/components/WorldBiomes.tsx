/**
 * Themed SVG biome scenes for each adventure map world.
 * Each biome is a self-contained illustrated zone with decorative elements
 * surrounding a central area where the world number badge is placed.
 */

interface BiomeProps {
  className?: string;
}

// ─── World 1: Sound Kingdom — Musical forest with notes ─────────────
export function SoundKingdomBiome({ className = "" }: BiomeProps) {
  return (
    <svg viewBox="0 0 200 180" className={className} aria-hidden>
      {/* Ground */}
      <ellipse cx="100" cy="170" rx="95" ry="20" fill="#C8E6C9" opacity="0.6" />

      {/* Left tree */}
      <rect x="22" y="100" width="6" height="35" rx="1" fill="#6D4C41" />
      <circle cx="25" cy="85" r="18" fill="#66BB6A" />
      <circle cx="18" cy="80" r="12" fill="#81C784" opacity="0.7" />

      {/* Right tree */}
      <rect x="162" y="95" width="6" height="38" rx="1" fill="#6D4C41" />
      <circle cx="165" cy="78" r="20" fill="#4CAF50" />
      <circle cx="172" cy="74" r="13" fill="#66BB6A" opacity="0.7" />

      {/* Musical notes */}
      <g fill="#7E57C2" opacity="0.7">
        <circle cx="42" cy="55" r="4" />
        <rect x="45.5" y="30" width="2" height="25" rx="0.5" />
        <path d="M47.5,30 Q55,25 47.5,20" fill="none" stroke="#7E57C2" strokeWidth="2" />

        <circle cx="155" cy="45" r="3.5" />
        <rect x="158" y="22" width="1.8" height="23" rx="0.5" />
        <path d="M159.8,22 Q167,17 159.8,13" fill="none" stroke="#7E57C2" strokeWidth="1.8" />
      </g>

      {/* Small notes scattered */}
      <g fill="#AB47BC" opacity="0.5">
        <circle cx="70" cy="40" r="2.5" />
        <rect x="72" y="25" width="1.5" height="15" rx="0.5" />
        <circle cx="140" cy="60" r="2" />
        <rect x="141.5" y="48" width="1.3" height="12" rx="0.5" />
      </g>

      {/* Bushes */}
      <ellipse cx="55" cy="148" rx="14" ry="8" fill="#66BB6A" />
      <ellipse cx="150" cy="150" rx="12" ry="7" fill="#4CAF50" />

      {/* Flowers */}
      <circle cx="75" cy="155" r="3" fill="#F48FB1" />
      <circle cx="130" cy="158" r="2.5" fill="#CE93D8" />
      <circle cx="85" cy="160" r="2" fill="#FFD54F" />
    </svg>
  );
}

// ─── World 2: Speed Valley — Valley with clock elements ─────────────
export function SpeedValleyBiome({ className = "" }: BiomeProps) {
  return (
    <svg viewBox="0 0 200 180" className={className} aria-hidden>
      {/* Valley ground */}
      <ellipse cx="100" cy="170" rx="95" ry="20" fill="#FFF9C4" opacity="0.6" />

      {/* Left hill */}
      <ellipse cx="30" cy="140" rx="45" ry="30" fill="#DCE775" opacity="0.5" />

      {/* Right hill */}
      <ellipse cx="170" cy="145" rx="40" ry="25" fill="#D4E157" opacity="0.5" />

      {/* Clock/timer symbol (left) */}
      <circle cx="45" cy="65" r="18" fill="none" stroke="#FF8F00" strokeWidth="2.5" />
      <circle cx="45" cy="65" r="15" fill="#FFF8E1" opacity="0.8" />
      <line x1="45" y1="65" x2="45" y2="54" stroke="#FF8F00" strokeWidth="2" strokeLinecap="round" />
      <line x1="45" y1="65" x2="53" y2="65" stroke="#FF8F00" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="45" cy="65" r="1.5" fill="#FF8F00" />

      {/* Lightning bolt (right, for speed) */}
      <polygon points="155,35 148,65 156,62 150,90 165,55 157,58" fill="#FFD54F" opacity="0.7" />

      {/* Speed lines */}
      <g stroke="#FFAB40" strokeWidth="1.5" opacity="0.4" strokeLinecap="round">
        <line x1="65" y1="100" x2="90" y2="100" />
        <line x1="70" y1="108" x2="95" y2="108" />
        <line x1="110" y1="105" x2="135" y2="105" />
      </g>

      {/* Grass tufts */}
      <g fill="#8BC34A" opacity="0.6">
        <path d="M80,158 Q82,150 84,158" />
        <path d="M82,158 Q85,148 88,158" />
        <path d="M120,155 Q122,147 124,155" />
        <path d="M122,155 Q125,145 128,155" />
      </g>
    </svg>
  );
}

// ─── World 3: Memory Mountains — Mountain peaks ─────────────────────
export function MemoryMountainsBiome({ className = "" }: BiomeProps) {
  return (
    <svg viewBox="0 0 200 180" className={className} aria-hidden>
      {/* Ground */}
      <ellipse cx="100" cy="170" rx="95" ry="20" fill="#E1BEE7" opacity="0.4" />

      {/* Back mountain */}
      <polygon points="100,20 160,120 40,120" fill="#CE93D8" opacity="0.4" />
      <polygon points="100,20 115,40 85,40" fill="white" opacity="0.5" />

      {/* Left mountain */}
      <polygon points="45,45 90,130 0,130" fill="#AB47BC" opacity="0.5" />
      <polygon points="45,45 55,60 35,60" fill="white" opacity="0.4" />

      {/* Right mountain */}
      <polygon points="160,50 200,130 120,130" fill="#9C27B0" opacity="0.45" />
      <polygon points="160,50 168,65 152,65" fill="white" opacity="0.4" />

      {/* Pine trees at base */}
      <g>
        <polygon points="30,125 35,145 25,145" fill="#4CAF50" opacity="0.6" />
        <polygon points="175,120 180,140 170,140" fill="#388E3C" opacity="0.6" />
        <polygon points="70,130 75,150 65,150" fill="#66BB6A" opacity="0.5" />
        <polygon points="140,128 145,148 135,148" fill="#4CAF50" opacity="0.5" />
      </g>

      {/* Brain/puzzle symbols */}
      <g opacity="0.5">
        <circle cx="100" cy="90" r="3" fill="#BA68C8" />
        <circle cx="108" cy="88" r="3" fill="#CE93D8" />
        <circle cx="96" cy="86" r="2.5" fill="#AB47BC" />
        <circle cx="104" cy="84" r="2.5" fill="#BA68C8" />
      </g>

      {/* Stars */}
      <polygon points="85,35 87,40 92,40 88,43 89,48 85,45 81,48 82,43 78,40 83,40" fill="#FFD54F" opacity="0.5" />
    </svg>
  );
}

// ─── World 4: Vision Forest — Dense forest with eye elements ────────
export function VisionForestBiome({ className = "" }: BiomeProps) {
  return (
    <svg viewBox="0 0 200 180" className={className} aria-hidden>
      {/* Ground */}
      <ellipse cx="100" cy="170" rx="95" ry="20" fill="#C8E6C9" opacity="0.5" />

      {/* Dense trees (back layer) */}
      <g opacity="0.4">
        <rect x="18" y="85" width="5" height="30" fill="#5D4037" />
        <circle cx="20" cy="70" r="16" fill="#2E7D32" />
        <rect x="170" y="80" width="5" height="32" fill="#5D4037" />
        <circle cx="172" cy="64" r="18" fill="#388E3C" />
      </g>

      {/* Dense trees (front layer) */}
      <rect x="40" y="95" width="6" height="35" fill="#6D4C41" />
      <circle cx="43" cy="78" r="20" fill="#4CAF50" />
      <circle cx="35" cy="73" r="13" fill="#66BB6A" opacity="0.7" />

      <rect x="150" y="90" width="6" height="38" fill="#6D4C41" />
      <circle cx="153" cy="73" r="22" fill="#388E3C" />
      <circle cx="162" cy="68" r="14" fill="#4CAF50" opacity="0.7" />

      {/* Eye symbol */}
      <g transform="translate(100,50)">
        <ellipse cx="0" cy="0" rx="18" ry="10" fill="none" stroke="#26A69A" strokeWidth="2" opacity="0.6" />
        <circle cx="0" cy="0" r="6" fill="#26A69A" opacity="0.4" />
        <circle cx="0" cy="0" r="3" fill="#00897B" opacity="0.5" />
        <circle cx="1" cy="-1" r="1" fill="white" opacity="0.6" />
      </g>

      {/* Bushes */}
      <ellipse cx="70" cy="150" rx="15" ry="8" fill="#66BB6A" opacity="0.6" />
      <ellipse cx="135" cy="148" rx="13" ry="7" fill="#4CAF50" opacity="0.6" />

      {/* Mushrooms */}
      <g>
        <rect x="88" y="150" width="3" height="5" fill="#E8D5B0" />
        <ellipse cx="89.5" cy="149" rx="5" ry="3.5" fill="#E53935" />
        <circle cx="87.5" cy="148" r="1" fill="white" opacity="0.7" />
        <circle cx="91" cy="147.5" r="0.8" fill="white" opacity="0.7" />
      </g>
    </svg>
  );
}

// ─── World 5: Fluency River — River/waterway scene ──────────────────
export function FluencyRiverBiome({ className = "" }: BiomeProps) {
  return (
    <svg viewBox="0 0 200 180" className={className} aria-hidden>
      {/* Ground */}
      <ellipse cx="100" cy="170" rx="95" ry="20" fill="#B3E5FC" opacity="0.4" />

      {/* River flowing through */}
      <path
        d="M20,70 Q60,60 80,80 Q100,100 120,85 Q140,70 180,75"
        fill="none"
        stroke="#4FC3F7"
        strokeWidth="18"
        strokeLinecap="round"
        opacity="0.35"
      />
      <path
        d="M20,70 Q60,60 80,80 Q100,100 120,85 Q140,70 180,75"
        fill="none"
        stroke="#81D4FA"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.4"
      />

      {/* River sparkles */}
      <g fill="white" opacity="0.5">
        <ellipse cx="55" cy="68" rx="4" ry="1.5" />
        <ellipse cx="100" cy="88" rx="5" ry="1.5" />
        <ellipse cx="150" cy="76" rx="4" ry="1.5" />
      </g>

      {/* Trees on banks */}
      <rect x="25" y="100" width="5" height="28" fill="#6D4C41" />
      <circle cx="27" cy="86" r="15" fill="#66BB6A" />

      <rect x="165" y="95" width="5" height="30" fill="#6D4C41" />
      <circle cx="167" cy="80" r="16" fill="#4CAF50" />

      {/* Book/reading symbol */}
      <g transform="translate(100, 40)" opacity="0.55">
        <rect x="-10" y="-5" width="9" height="12" rx="1" fill="#42A5F5" transform="rotate(-10)" />
        <rect x="1" y="-5" width="9" height="12" rx="1" fill="#1E88E5" transform="rotate(10)" />
        <line x1="0" y1="-6" x2="0" y2="8" stroke="#0D47A1" strokeWidth="1" opacity="0.4" />
      </g>

      {/* Stepping stones */}
      <g fill="#B0BEC5" opacity="0.5">
        <ellipse cx="45" cy="138" rx="6" ry="3" />
        <ellipse cx="80" cy="142" rx="5" ry="2.5" />
        <ellipse cx="120" cy="140" rx="6" ry="3" />
        <ellipse cx="155" cy="137" rx="5" ry="2.5" />
      </g>
    </svg>
  );
}

// ─── World 6: Story Castle — Grand castle scene ─────────────────────
export function StoryCastleBiome({ className = "" }: BiomeProps) {
  return (
    <svg viewBox="0 0 200 180" className={className} aria-hidden>
      {/* Ground */}
      <ellipse cx="100" cy="170" rx="95" ry="20" fill="#FFCDD2" opacity="0.4" />

      {/* Castle back towers */}
      <rect x="50" y="50" width="16" height="70" fill="#FFCDD2" />
      <rect x="134" y="50" width="16" height="70" fill="#FFCDD2" />
      {/* Battlements */}
      <rect x="48" y="45" width="6" height="8" fill="#FFCDD2" />
      <rect x="55" y="45" width="6" height="8" fill="#FFCDD2" />
      <rect x="134" y="45" width="6" height="8" fill="#FFCDD2" />
      <rect x="141" y="45" width="6" height="8" fill="#FFCDD2" />

      {/* Main castle body */}
      <rect x="60" y="65" width="80" height="55" rx="2" fill="#EF9A9A" opacity="0.7" />

      {/* Central tower */}
      <rect x="85" y="30" width="30" height="45" rx="1" fill="#FFCDD2" />
      <polygon points="100,10 120,30 80,30" fill="#D32F2F" opacity="0.6" />

      {/* Flag */}
      <line x1="100" y1="10" x2="100" y2="0" stroke="#5D4037" strokeWidth="1.5" />
      <polygon points="100,0 115,4 100,8" fill="#F44336" opacity="0.7" />

      {/* Windows */}
      <rect x="90" y="40" width="5" height="7" rx="1" fill="#D32F2F" opacity="0.4" />
      <rect x="105" y="40" width="5" height="7" rx="1" fill="#D32F2F" opacity="0.4" />

      {/* Door */}
      <rect x="92" y="98" width="16" height="22" rx="8" fill="#C62828" opacity="0.5" />

      {/* Side bushes */}
      <ellipse cx="42" cy="140" rx="12" ry="7" fill="#66BB6A" opacity="0.5" />
      <ellipse cx="160" cy="142" rx="11" ry="6" fill="#4CAF50" opacity="0.5" />

      {/* Scroll/book symbols */}
      <g opacity="0.4" transform="translate(30, 80)">
        <rect x="0" y="0" width="12" height="8" rx="3" fill="#FFE0B2" />
        <line x1="3" y1="3" x2="9" y2="3" stroke="#BF360C" strokeWidth="0.5" />
        <line x1="3" y1="5" x2="8" y2="5" stroke="#BF360C" strokeWidth="0.5" />
      </g>
      <g opacity="0.4" transform="translate(158, 85)">
        <rect x="0" y="0" width="12" height="8" rx="3" fill="#FFE0B2" />
        <line x1="3" y1="3" x2="9" y2="3" stroke="#BF360C" strokeWidth="0.5" />
        <line x1="3" y1="5" x2="8" y2="5" stroke="#BF360C" strokeWidth="0.5" />
      </g>
    </svg>
  );
}

// ─── Biome lookup by world area ─────────────────────────────────────
export const WORLD_BIOMES: Record<string, React.FC<BiomeProps>> = {
  phonological_awareness: SoundKingdomBiome,
  rapid_naming: SpeedValleyBiome,
  working_memory: MemoryMountainsBiome,
  visual_processing: VisionForestBiome,
  reading_fluency: FluencyRiverBiome,
  comprehension: StoryCastleBiome,
};
