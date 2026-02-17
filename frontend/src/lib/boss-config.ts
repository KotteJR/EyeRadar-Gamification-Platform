// ─── Boss Configuration ──────────────────────────────────────────────────────
// Maps each game mode to a unique boss with PixelLab-ready descriptions
// and SVG fallback colors for immediate use.

export type BossType =
  | "dark_sorcerer"
  | "giant_golem"
  | "shadow_beast"
  | "dragon"
  | "corrupted_knight";

export interface BossConfig {
  id: BossType;
  name: string;
  title: string;
  pixellab_description: string;
  taunt: string;
  defeatLine: string;
  colors: {
    body: string;
    bodyLight: string;
    accent: string;
    eyes: string;
    detail: string;
  };
  size: number;
}

export const BOSSES: Record<BossType, BossConfig> = {
  dark_sorcerer: {
    id: "dark_sorcerer",
    name: "Dark Sorcerer",
    title: "The Spell Weaver",
    pixellab_description:
      "evil sorcerer boss, tattered black robes, glowing red eyes, skull staff, dark aura, menacing pose, detailed villain, large character",
    taunt: "Your words have no power here!",
    defeatLine: "Impossible... my spells...",
    colors: {
      body: "#1a1a2e",
      bodyLight: "#2d2d4e",
      accent: "#FF2222",
      eyes: "#FF0000",
      detail: "#6B21A8",
    },
    size: 120,
  },
  giant_golem: {
    id: "giant_golem",
    name: "Giant Golem",
    title: "The Stone Guardian",
    pixellab_description:
      "stone golem boss, cracked rocky body, glowing core chest, moss covered, ancient runes, towering creature, heavy armored",
    taunt: "Remember... if you can!",
    defeatLine: "Crumbling... to dust...",
    colors: {
      body: "#6B7280",
      bodyLight: "#9CA3AF",
      accent: "#FCD34D",
      eyes: "#FBBF24",
      detail: "#4ADE80",
    },
    size: 130,
  },
  shadow_beast: {
    id: "shadow_beast",
    name: "Shadow Beast",
    title: "The Nightmare Runner",
    pixellab_description:
      "shadow monster boss, wispy dark form, multiple glowing eyes, sharp claws, ethereal smoke body, nightmare creature",
    taunt: "Can you keep up?!",
    defeatLine: "Fading... into nothing...",
    colors: {
      body: "#1F2937",
      bodyLight: "#374151",
      accent: "#A78BFA",
      eyes: "#C084FC",
      detail: "#818CF8",
    },
    size: 110,
  },
  dragon: {
    id: "dragon",
    name: "Dragon",
    title: "The Fire Lord",
    pixellab_description:
      "pixel dragon boss, dark scales, fiery eyes, large wings folded, smoke from nostrils, intimidating, detailed scales",
    taunt: "Solve this... or burn!",
    defeatLine: "My flames... extinguished...",
    colors: {
      body: "#991B1B",
      bodyLight: "#DC2626",
      accent: "#F97316",
      eyes: "#FFA500",
      detail: "#7F1D1D",
    },
    size: 120,
  },
  corrupted_knight: {
    id: "corrupted_knight",
    name: "Corrupted Knight",
    title: "The Fallen Guardian",
    pixellab_description:
      "fallen knight boss, rusted dark armor, broken helmet showing skull, cursed sword, tattered cape, undead warrior",
    taunt: "Match my pattern!",
    defeatLine: "My armor... shatters...",
    colors: {
      body: "#44403C",
      bodyLight: "#57534E",
      accent: "#22D3EE",
      eyes: "#06B6D4",
      detail: "#78716C",
    },
    size: 115,
  },
};

// Map game modes to boss types
export const GAME_MODE_BOSS: Record<string, BossType> = {
  // BossEncounter modes
  multiple_choice: "dark_sorcerer",
  yes_no: "dark_sorcerer",
  image_match: "dark_sorcerer",
  // RunnerMode modes
  speed_round: "shadow_beast",
  spot_target: "shadow_beast",
  tracking: "shadow_beast",
  timed_reading: "shadow_beast",
  grid_naming: "shadow_beast",
  voice_input: "shadow_beast",
  // MemoryBlocks mode
  grid_memory: "giant_golem",
  // CardDealer mode
  pattern_match: "corrupted_knight",
  // PuzzleBridge modes
  word_building: "dragon",
  sorting: "dragon",
  fill_blank: "dragon",
  text_input: "dragon",
  sequence_tap: "dragon",
  dual_task: "dragon",
};

// PixelLab animation templates for each boss action
export const BOSS_ANIMATIONS = {
  idle: "breathing-idle",
  death: "falling-back-death",
  attack: "fireball",
  hurt: "hit",
  walk: "walking",
} as const;

// Player character PixelLab description
export const PLAYER_CHARACTER = {
  name: "Hero Student",
  pixellab_description:
    "brave young hero character, blue tunic, red cap, friendly face, adventurer outfit, pixel art protagonist",
  animations: ["breathing-idle", "walking", "jumping", "hit", "fireball"],
};
