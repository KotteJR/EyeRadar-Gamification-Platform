// ─── Enums ────────────────────────────────────────────────────────────────────

export type DeficitArea =
  | "phonological_awareness"
  | "rapid_naming"
  | "working_memory"
  | "visual_processing"
  | "reading_fluency"
  | "comprehension";

export type SessionStatus = "in_progress" | "completed" | "abandoned";

export const DEFICIT_AREA_LABELS: Record<DeficitArea, string> = {
  phonological_awareness: "Phonological Awareness",
  rapid_naming: "Rapid Naming",
  working_memory: "Working Memory",
  visual_processing: "Visual Processing",
  reading_fluency: "Reading Fluency",
  comprehension: "Comprehension",
};

export const DEFICIT_AREA_COLORS: Record<DeficitArea, string> = {
  phonological_awareness: "#6366f1",
  rapid_naming: "#f59e0b",
  working_memory: "#8b5cf6",
  visual_processing: "#10b981",
  reading_fluency: "#3b82f6",
  comprehension: "#ef4444",
};

// ─── Assessment ──────────────────────────────────────────────────────────────

export interface DeficitInfo {
  severity: number;
  percentile: number;
}

export interface ReadingMetrics {
  fixation_duration_ms: number;
  fixation_count_per_line: number;
  regression_rate: number;
  words_per_minute: number;
}

export interface EyeRadarAssessment {
  assessment_date: string;
  overall_severity: number;
  deficits: Record<string, DeficitInfo>;
  reading_metrics: ReadingMetrics;
}

// ─── Student ─────────────────────────────────────────────────────────────────

export interface Student {
  id: string;
  name: string;
  age: number;
  grade: number;
  language: string;
  interests: string[];
  assessment: EyeRadarAssessment | null;
  current_levels: Record<string, number>;
  total_points: number;
  current_streak: number;
  longest_streak: number;
  badges: string[];
  level: number;
  xp: number;
  created_at: string;
}

export interface StudentCreate {
  name: string;
  age: number;
  grade: number;
  language?: string;
  interests?: string[];
}

// ─── Games ───────────────────────────────────────────────────────────────────

export type GameType =
  | "multiple_choice"
  | "grid_memory"
  | "sequence_tap"
  | "text_input"
  | "sorting"
  | "speed_round"
  | "word_building"
  | "timed_reading"
  | "spot_target"
  | "fill_blank"
  | "tracking"
  | "pattern_match"
  | "dual_task";

export interface GameDefinition {
  id: string;
  name: string;
  description: string;
  deficit_area: DeficitArea;
  game_type: GameType;
  age_range_min: number;
  age_range_max: number;
  mechanics: string;
  instructions: string;
  icon: string;
  difficulty_levels: number;
}

// ─── Exercises ───────────────────────────────────────────────────────────────

export interface ExerciseItem {
  index: number;
  question: string;
  options: string[];
  correct_answer: string;
  hint?: string;
  item_type: string;
  extra_data: Record<string, unknown>;
}

export interface ExerciseItemResult {
  item_index: number;
  is_correct: boolean;
  student_answer: string;
  correct_answer: string;
  response_time_ms: number;
  points_earned: number;
}

export interface ExerciseSession {
  id: string;
  student_id: string;
  game_id: string;
  game_name: string;
  deficit_area: DeficitArea;
  difficulty_level: number;
  items: ExerciseItem[];
  results: ExerciseItemResult[];
  started_at: string;
  completed_at: string | null;
  total_items: number;
  correct_count: number;
  accuracy: number;
  avg_response_time_ms: number;
  points_earned: number;
  badges_earned: string[];
  status: SessionStatus;
}

// ─── Gamification ────────────────────────────────────────────────────────────

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  requirement: string;
  earned: boolean;
  earned_at?: string;
}

export interface LevelInfo {
  level: number;
  title: string;
  xp: number;
  xp_for_next_level: number;
  progress_percent: number;
}

export interface GamificationSummary {
  student_id: string;
  total_points: number;
  level_info: LevelInfo;
  current_streak: number;
  longest_streak: number;
  badges: Badge[];
  total_sessions: number;
  total_correct: number;
}

// ─── Analytics ───────────────────────────────────────────────────────────────

export interface DeficitProgress {
  area: DeficitArea;
  initial_severity: number;
  current_level: number;
  sessions_completed: number;
  accuracy_trend: number[];
  avg_accuracy: number;
}

export interface AnalyticsOverview {
  student_id: string;
  student_name: string;
  total_sessions: number;
  total_time_minutes: number;
  overall_accuracy: number;
  deficit_progress: DeficitProgress[];
  recent_sessions: {
    id: string;
    game_name: string;
    deficit_area: DeficitArea;
    accuracy: number;
    points_earned: number;
    completed_at: string;
    status: string;
  }[];
  improvement_trend: string;
}

export interface ExerciseRecommendation {
  game_id: string;
  game_name: string;
  deficit_area: DeficitArea;
  priority: number;
  reason: string;
  suggested_difficulty: number;
}

// ─── AI Status ──────────────────────────────────────────────────────────────

export interface AIStatus {
  status: "ready" | "models_missing" | "unavailable" | "not_initialized";
  ollama_url?: string;
  heavy_model?: string;
  heavy_available?: boolean;
  light_model?: string;
  light_available?: boolean;
  all_models?: string[];
  error?: string;
}
