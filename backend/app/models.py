"""
Pydantic data models for the EyeRadar Dyslexia Exercise System.
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from enum import Enum
from datetime import datetime


# ─── Enums ────────────────────────────────────────────────────────────────────


class DeficitArea(str, Enum):
    PHONOLOGICAL_AWARENESS = "phonological_awareness"
    RAPID_NAMING = "rapid_naming"
    WORKING_MEMORY = "working_memory"
    VISUAL_PROCESSING = "visual_processing"
    READING_FLUENCY = "reading_fluency"
    COMPREHENSION = "comprehension"


class SessionStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"


# ─── Assessment Models ────────────────────────────────────────────────────────


class DeficitInfo(BaseModel):
    severity: int = Field(ge=1, le=5, description="1=mild, 5=severe")
    percentile: int = Field(ge=0, le=100)


class ReadingMetrics(BaseModel):
    fixation_duration_ms: float
    fixation_count_per_line: float
    regression_rate: float = Field(ge=0, le=1)
    words_per_minute: float


class EyeRadarAssessment(BaseModel):
    assessment_date: datetime
    overall_severity: int = Field(ge=1, le=5)
    deficits: Dict[str, DeficitInfo]
    reading_metrics: ReadingMetrics


# ─── Student Models ──────────────────────────────────────────────────────────


class StudentCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    age: int = Field(ge=4, le=18)
    grade: int = Field(ge=0, le=12)
    language: str = "en"
    interests: List[str] = []
    diagnostic: Optional[Dict[str, Any]] = None


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    grade: Optional[int] = None
    language: Optional[str] = None
    interests: Optional[List[str]] = None
    diagnostic: Optional[Dict[str, Any]] = None


class Student(BaseModel):
    id: str
    name: str
    age: int
    grade: int
    language: str
    interests: List[str] = []
    assessment: Optional[EyeRadarAssessment] = None
    diagnostic: Dict[str, Any] = {}
    current_levels: Dict[str, int] = {}
    total_points: int = 0
    current_streak: int = 0
    longest_streak: int = 0
    badges: List[str] = []
    level: int = 1
    xp: int = 0
    created_at: datetime


# ─── Game Models ─────────────────────────────────────────────────────────────


class GameType(str, Enum):
    """Determines how the game is rendered/played in the frontend."""
    MULTIPLE_CHOICE = "multiple_choice"
    GRID_MEMORY = "grid_memory"          # Memory Matrix: tap grid cells
    SEQUENCE_TAP = "sequence_tap"        # Sequence Keeper: tap numbers in order
    TEXT_INPUT = "text_input"            # Backward Spell: type answer
    SORTING = "sorting"                  # Story Sequencer: arrange items in order
    SPEED_ROUND = "speed_round"          # Speed Namer, Sight Words: timed rapid ID
    WORD_BUILDING = "word_building"      # Word Ladder: interactive chain building
    TIMED_READING = "timed_reading"      # Phrase Flash: read under time pressure
    SPOT_TARGET = "spot_target"          # Letter Detective, Mirror Image: find target
    FILL_BLANK = "fill_blank"            # Visual Closure: fill in missing letters
    TRACKING = "tracking"                # Tracking Trail: follow a visual path
    PATTERN_MATCH = "pattern_match"      # Pattern Matcher: visual comparison
    DUAL_TASK = "dual_task"              # Dual Task: split attention challenge
    YES_NO = "yes_no"                    # Sound Matching: binary yes/no response
    VOICE_INPUT = "voice_input"          # Decoding / RAN: microphone-based input
    IMAGE_MATCH = "image_match"          # Word-Image Matching: match words to pictures
    GRID_NAMING = "grid_naming"          # RAN Grid: name a grid of items rapidly


class GameDefinition(BaseModel):
    id: str
    name: str
    description: str
    deficit_area: DeficitArea
    game_type: GameType = GameType.MULTIPLE_CHOICE
    age_range_min: int
    age_range_max: int
    mechanics: str
    instructions: str
    icon: str
    difficulty_levels: int = 10


# ─── Exercise Models ─────────────────────────────────────────────────────────


class ExerciseItem(BaseModel):
    index: int
    question: str
    options: List[str] = []
    correct_answer: str
    hint: Optional[str] = None
    item_type: str = "multiple_choice"
    extra_data: Dict[str, Any] = {}  # Structured data for interactive game types


class ExerciseItemSubmission(BaseModel):
    item_index: int
    student_answer: str
    response_time_ms: int


class ExerciseItemResult(BaseModel):
    item_index: int
    is_correct: bool
    student_answer: str
    correct_answer: str
    response_time_ms: int
    points_earned: int


class ExerciseSessionCreate(BaseModel):
    student_id: str
    game_id: str


class ExerciseSession(BaseModel):
    id: str
    student_id: str
    game_id: str
    game_name: str
    deficit_area: DeficitArea
    difficulty_level: int
    items: List[ExerciseItem] = []
    results: List[ExerciseItemResult] = []
    started_at: datetime
    completed_at: Optional[datetime] = None
    total_items: int = 0
    correct_count: int = 0
    accuracy: float = 0.0
    avg_response_time_ms: float = 0.0
    points_earned: int = 0
    badges_earned: List[str] = []
    status: SessionStatus = SessionStatus.IN_PROGRESS


# ─── Gamification Models ─────────────────────────────────────────────────────


class Badge(BaseModel):
    id: str
    name: str
    description: str
    icon: str
    category: str
    requirement: str
    earned: bool = False
    earned_at: Optional[datetime] = None


class LevelInfo(BaseModel):
    level: int
    title: str
    xp: int
    xp_for_next_level: int
    progress_percent: float


class GamificationSummary(BaseModel):
    student_id: str
    total_points: int
    level_info: LevelInfo
    current_streak: int
    longest_streak: int
    badges: List[Badge]
    total_sessions: int
    total_correct: int


# ─── Analytics Models ────────────────────────────────────────────────────────


class DeficitProgress(BaseModel):
    area: DeficitArea
    initial_severity: int
    current_level: int
    sessions_completed: int
    accuracy_trend: List[float]
    avg_accuracy: float


class AnalyticsOverview(BaseModel):
    student_id: str
    student_name: str
    total_sessions: int
    total_time_minutes: float
    overall_accuracy: float
    deficit_progress: List[DeficitProgress]
    recent_sessions: List[Dict[str, Any]]
    improvement_trend: str


class ExerciseRecommendation(BaseModel):
    game_id: str
    game_name: str
    deficit_area: DeficitArea
    priority: int
    reason: str
    suggested_difficulty: int


# ─── Adventure Map Models ────────────────────────────────────────────────────


class AdventureWorld(BaseModel):
    """A single world within a student's adventure map."""
    deficit_area: str
    world_number: int
    world_name: str
    color: str
    game_ids: List[str] = []


class AdventureThemeConfig(BaseModel):
    """Interest-based visual theming for the adventure map."""
    primary_interest: str = ""
    color_palette: str = "default"
    decoration_style: str = "nature"


class AdventureMapCreate(BaseModel):
    """Request body to create an adventure map for a student."""
    student_id: str
    created_by: Optional[str] = None
    title: str = "My Adventure"
    worlds: List[AdventureWorld]
    theme_config: AdventureThemeConfig = AdventureThemeConfig()


class AdventureMapUpdate(BaseModel):
    """Request body to update an adventure map."""
    title: Optional[str] = None
    worlds: Optional[List[AdventureWorld]] = None
    theme_config: Optional[AdventureThemeConfig] = None
    status: Optional[str] = None


class AdventureMap(BaseModel):
    """Full adventure map response."""
    id: str
    student_id: str
    created_by: Optional[str] = None
    title: str
    worlds: List[AdventureWorld]
    theme_config: AdventureThemeConfig = AdventureThemeConfig()
    status: str = "active"
    created_at: str
    updated_at: str


class AdventureSuggestRequest(BaseModel):
    """Request body for AI-assisted adventure suggestion."""
    student_id: str
    dyslexia_type: Optional[str] = None
    severity_level: Optional[str] = None
    age: Optional[int] = None


class AdventureSuggestResponse(BaseModel):
    """AI-generated adventure suggestion."""
    suggested_worlds: List[AdventureWorld]
    reasoning: List[str]
    theme_config: AdventureThemeConfig
