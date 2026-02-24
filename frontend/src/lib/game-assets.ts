import type { DeficitArea, GameType } from "@/types";

export interface GameAsset {
  /** Lucide icon name */
  icon: string;
  /** Background image path (relative to /public/) */
  image: string;
  /** Card gradient colors [from, to] */
  gradient: [string, string];
  /** Light background color for cards */
  bgLight: string;
  /** Accent color */
  accent: string;
}

export const GAME_ASSETS: Record<string, GameAsset> = {
  // ─── Phonological Awareness ──────────────────────────
  sound_safari: {
    icon: "Ear",
    image: "/game-assets/game-card-images/category_phonological.png",
    gradient: ["#FEF3F2", "#FEE5E2"],
    bgLight: "#FEF3F2",
    accent: "#F97068",
  },
  rhyme_time_race: {
    icon: "Timer",
    image: "/game-assets/game-card-images/category_phonological.png",
    gradient: ["#EFF8FF", "#DBEFFE"],
    bgLight: "#EFF8FF",
    accent: "#5EB8FB",
  },
  syllable_stomper: {
    icon: "Music",
    image: "/game-assets/game-card-images/letter_stream.png",
    gradient: ["#ECFDF5", "#D1FAE5"],
    bgLight: "#ECFDF5",
    accent: "#34D399",
  },
  phoneme_blender: {
    icon: "FlaskConical",
    image: "/game-assets/game-card-images/letter_detective.png",
    gradient: ["#FAF5FF", "#F3E8FF"],
    bgLight: "#FAF5FF",
    accent: "#A855F7",
  },
  sound_swap: {
    icon: "ArrowLeftRight",
    image: "/game-assets/game-card-images/pattern_matcher_test2.png",
    gradient: ["#FFF7ED", "#FFEDD5"],
    bgLight: "#FFF7ED",
    accent: "#FB923C",
  },
  sound_matching: {
    icon: "Ear",
    image: "/game-assets/game-card-images/letter_stream.png",
    gradient: ["#FEF3F2", "#FEE5E2"],
    bgLight: "#FEF3F2",
    accent: "#F97068",
  },
  word_sound_match: {
    icon: "Volume2",
    image: "/game-assets/game-card-images/category_working_memory.png",
    gradient: ["#EFF8FF", "#DBEFFE"],
    bgLight: "#EFF8FF",
    accent: "#5EB8FB",
  },

  // ─── Rapid Naming ──────────────────────────────────────
  speed_namer: {
    icon: "Rocket",
    image: "/game-assets/game-card-images/category_rapid_naming.png",
    gradient: ["#FEF3F2", "#FECFCB"],
    bgLight: "#FEF3F2",
    accent: "#F04438",
  },
  flash_card_frenzy: {
    icon: "Layers",
    image: "/game-assets/game-card-images/flash_card_frenzy.png",
    gradient: ["#FFFBEB", "#FEF3C7"],
    bgLight: "#FFFBEB",
    accent: "#F59E0B",
  },
  object_blitz: {
    icon: "Shapes",
    image: "/game-assets/game-card-images/pattern_matcher_test2.png",
    gradient: ["#FDF2F8", "#FCE7F3"],
    bgLight: "#FDF2F8",
    accent: "#EC4899",
  },
  letter_stream: {
    icon: "Waves",
    image: "/game-assets/game-card-images/letter_stream.png",
    gradient: ["#EFF8FF", "#BFDBFE"],
    bgLight: "#EFF8FF",
    accent: "#3B82F6",
  },
  ran_grid: {
    icon: "LayoutGrid",
    image: "/game-assets/game-card-images/category_rapid_naming.png",
    gradient: ["#FDF2F8", "#FCE7F3"],
    bgLight: "#FDF2F8",
    accent: "#EC4899",
  },

  // ─── Working Memory ────────────────────────────────────
  memory_matrix: {
    icon: "Grid3x3",
    image: "/game-assets/game-card-images/memory_matrix.png",
    gradient: ["#FAF5FF", "#E9D5FF"],
    bgLight: "#FAF5FF",
    accent: "#8B5CF6",
  },
  sequence_keeper: {
    icon: "ListOrdered",
    image: "/game-assets/game-card-images/letter_detective.png",
    gradient: ["#FFF7ED", "#FED7AA"],
    bgLight: "#FFF7ED",
    accent: "#F97316",
  },
  backward_spell: {
    icon: "RotateCcw",
    image: "/game-assets/game-card-images/backward_spell.png",
    gradient: ["#F0F9FF", "#BAE6FD"],
    bgLight: "#F0F9FF",
    accent: "#0EA5E9",
  },
  story_recall: {
    icon: "BookOpen",
    image: "/game-assets/game-card-images/category_visual_processing.png",
    gradient: ["#ECFDF5", "#A7F3D0"],
    bgLight: "#ECFDF5",
    accent: "#10B981",
  },
  dual_task_challenge: {
    icon: "Brain",
    image: "/game-assets/game-card-images/dual_task_challenge.png",
    gradient: ["#FEF3F2", "#FCA5A5"],
    bgLight: "#FEF3F2",
    accent: "#EF4444",
  },

  // ─── Visual Processing ─────────────────────────────────
  letter_detective: {
    icon: "Search",
    image: "/game-assets/game-card-images/letter_detective.png",
    gradient: ["#FFFBEB", "#FDE68A"],
    bgLight: "#FFFBEB",
    accent: "#D97706",
  },
  tracking_trail: {
    icon: "Route",
    image: "/game-assets/game-card-images/inference_detective.png",
    gradient: ["#ECFDF5", "#6EE7B7"],
    bgLight: "#ECFDF5",
    accent: "#059669",
  },
  pattern_matcher: {
    icon: "Puzzle",
    image: "/game-assets/game-card-images/pattern_matcher_test2.png",
    gradient: ["#EFF8FF", "#93C5FD"],
    bgLight: "#EFF8FF",
    accent: "#2563EB",
  },
  mirror_image: {
    icon: "FlipHorizontal",
    image: "/game-assets/game-card-images/mirror_image.png",
    gradient: ["#FDF2F8", "#F9A8D4"],
    bgLight: "#FDF2F8",
    accent: "#DB2777",
  },
  visual_closure: {
    icon: "PuzzleIcon",
    image: "/game-assets/game-card-images/dual_task_challenge.png",
    gradient: ["#FAF5FF", "#C4B5FD"],
    bgLight: "#FAF5FF",
    accent: "#7C3AED",
  },

  // ─── Reading Fluency ───────────────────────────────────
  phrase_flash: {
    icon: "Zap",
    image: "/game-assets/game-card-images/flash_card_frenzy.png",
    gradient: ["#FFFBEB", "#FCD34D"],
    bgLight: "#FFFBEB",
    accent: "#EAB308",
  },
  word_ladder: {
    icon: "TrendingUp",
    image: "/game-assets/game-card-images/main_idea_hunter.png",
    gradient: ["#EFF8FF", "#60A5FA"],
    bgLight: "#EFF8FF",
    accent: "#3B82F6",
  },
  repeated_reader: {
    icon: "BookMarked",
    image: "/game-assets/game-card-images/category_visual_processing.png",
    gradient: ["#ECFDF5", "#34D399"],
    bgLight: "#ECFDF5",
    accent: "#10B981",
  },
  sight_word_sprint: {
    icon: "Rabbit",
    image: "/game-assets/game-card-images/letter_detective.png",
    gradient: ["#FEF3F2", "#F97068"],
    bgLight: "#FEF3F2",
    accent: "#DC2626",
  },
  prosody_practice: {
    icon: "Mic",
    image: "/game-assets/game-card-images/inference_detective.png",
    gradient: ["#FAF5FF", "#D8B4FE"],
    bgLight: "#FAF5FF",
    accent: "#9333EA",
  },
  decoding_read_aloud: {
    icon: "Mic",
    image: "/game-assets/game-card-images/inference_detective.png",
    gradient: ["#EFF8FF", "#93C5FD"],
    bgLight: "#EFF8FF",
    accent: "#3B82F6",
  },

  // ─── Comprehension ──────────────────────────────────────
  question_quest: {
    icon: "Map",
    image: "/game-assets/game-card-images/main_idea_hunter.png",
    gradient: ["#FFF7ED", "#FDBA74"],
    bgLight: "#FFF7ED",
    accent: "#EA580C",
  },
  main_idea_hunter: {
    icon: "Target",
    image: "/game-assets/game-card-images/flash_card_frenzy.png",
    gradient: ["#ECFDF5", "#6EE7B7"],
    bgLight: "#ECFDF5",
    accent: "#059669",
  },
  inference_detective: {
    icon: "ScanSearch",
    image: "/game-assets/game-card-images/inference_detective.png",
    gradient: ["#FAF5FF", "#C084FC"],
    bgLight: "#FAF5FF",
    accent: "#7E22CE",
  },
  vocabulary_builder: {
    icon: "Building2",
    image: "/game-assets/game-card-images/pattern_matcher_test2.png",
    gradient: ["#EFF8FF", "#93C5FD"],
    bgLight: "#EFF8FF",
    accent: "#1D4ED8",
  },
  story_sequencer: {
    icon: "Film",
    image: "/game-assets/game-card-images/memory_matrix.png",
    gradient: ["#FDF2F8", "#F472B6"],
    bgLight: "#FDF2F8",
    accent: "#DB2777",
  },
  word_image_match: {
    icon: "Image",
    image: "/game-assets/game-card-images/mirror_image.png",
    gradient: ["#ECFDF5", "#6EE7B7"],
    bgLight: "#ECFDF5",
    accent: "#059669",
  },
  rapid_naming: {
    icon: "LayoutGrid",
    image: "/game-assets/game-card-images/dual_task_challenge.png",
    gradient: ["#FEF3F2", "#FECFCB"],
    bgLight: "#FEF3F2",
    accent: "#F04438",
  },
  memory_recall: {
    icon: "Brain",
    image: "/game-assets/game-card-images/memory_matrix.png",
    gradient: ["#FAF5FF", "#E9D5FF"],
    bgLight: "#FAF5FF",
    accent: "#8B5CF6",
  },
  read_aloud: {
    icon: "Mic",
    image: "/game-assets/game-card-images/letter_detective.png",
    gradient: ["#EFF8FF", "#93C5FD"],
    bgLight: "#EFF8FF",
    accent: "#3B82F6",
  },
  // ─── Dungeon Adventures (NO IMAGES) ──────────────────────────────
  castle_challenge: {
    icon: "Castle",
    image: "",
    gradient: ["#4A1D6B", "#7C3AED"],
    bgLight: "#F5F3FF",
    accent: "#7C3AED",
  },
  dungeon_forest: {
    icon: "Swords",
    image: "",
    gradient: ["#14532D", "#22C55E"],
    bgLight: "#F0FDF4",
    accent: "#16A34A",
  },
  dungeon_beach: {
    icon: "Swords",
    image: "",
    gradient: ["#854D0E", "#EAB308"],
    bgLight: "#FEFCE8",
    accent: "#CA8A04",
  },
  dungeon_3stage: {
    icon: "Swords",
    image: "",
    gradient: ["#4A0E6B", "#9333EA"],
    bgLight: "#FAF5FF",
    accent: "#7C3AED",
  },
};

/** Category images for browsing - using dedicated category images only */
export const CATEGORY_ASSETS: Record<DeficitArea, { icon: string; image: string; gradient: [string, string]; bgLight: string }> = {
  phonological_awareness: {
    icon: "Ear",
    image: "/game-assets/game-card-images/category_phonological.png",
    gradient: ["#6366F1", "#818CF8"],
    bgLight: "#EEF2FF",
  },
  rapid_naming: {
    icon: "Zap",
    image: "/game-assets/game-card-images/category_rapid_naming.png",
    gradient: ["#F59E0B", "#FBBF24"],
    bgLight: "#FFFBEB",
  },
  working_memory: {
    icon: "Brain",
    image: "/game-assets/game-card-images/category_working_memory.png",
    gradient: ["#8B5CF6", "#A78BFA"],
    bgLight: "#FAF5FF",
  },
  visual_processing: {
    icon: "Eye",
    image: "/game-assets/game-card-images/category_visual_processing.png",
    gradient: ["#10B981", "#34D399"],
    bgLight: "#ECFDF5",
  },
  reading_fluency: {
    icon: "BookOpen",
    image: "/game-assets/game-card-images/letter_detective.png",
    gradient: ["#3B82F6", "#60A5FA"],
    bgLight: "#EFF6FF",
  },
  comprehension: {
    icon: "Lightbulb",
    image: "/game-assets/game-card-images/category_comprehension.png",
    gradient: ["#EF4444", "#F87171"],
    bgLight: "#FEF2F2",
  },
};

/** Game type icon mapping */
export const GAME_TYPE_ICONS: Record<GameType, string> = {
  multiple_choice: "CircleDot",
  grid_memory: "Grid3x3",
  sequence_tap: "ListOrdered",
  text_input: "Keyboard",
  sorting: "ArrowUpDown",
  speed_round: "Timer",
  word_building: "Puzzle",
  timed_reading: "Clock",
  spot_target: "Crosshair",
  fill_blank: "PenTool",
  tracking: "Navigation",
  pattern_match: "Shapes",
  dual_task: "Brain",
  yes_no: "ThumbsUp",
  voice_input: "Mic",
  image_match: "Image",
  grid_naming: "LayoutGrid",
  sound_matching: "Ear",
  word_sound_match: "Volume2",
  read_aloud: "Mic",
  word_image_match: "Image",
  rapid_naming: "LayoutGrid",
  memory_recall: "Brain",
  castle_boss: "Castle",
  castle_dungeon: "Swords",
  castle_dungeon_3stage: "Swords",
  wizard_test: "Sparkles",
};

/** Default asset for unknown games */
export const DEFAULT_GAME_ASSET: GameAsset = {
  icon: "Gamepad2",
  image: "/game-assets/game-card-images/category_comprehension.png",
  gradient: ["#F3F4F6", "#E5E7EB"],
  bgLight: "#F9FAFB",
  accent: "#6B7280",
};

export function getGameAsset(gameId: string): GameAsset {
  return GAME_ASSETS[gameId] || DEFAULT_GAME_ASSET;
}
