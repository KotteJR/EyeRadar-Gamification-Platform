"""
Enhanced models for dyslexia-type-aware exercise personalization.

Adds:
- DyslexiaType enum (phonological, surface, rapid_naming, visual, double_deficit, mixed)
- SeverityLevel enum (mild, moderate, severe)
- AgeGroup-based configurations
- Intervention profiles per severity
- Dyslexia-type priority weights for deficit areas
- Teacher diagnostic input schema
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict
from enum import Enum


# ─── Enums ────────────────────────────────────────────────────────────────────

class DyslexiaType(str, Enum):
    PHONOLOGICAL = "phonological"
    SURFACE = "surface"
    RAPID_NAMING = "rapid_naming"
    VISUAL = "visual"
    DOUBLE_DEFICIT = "double_deficit"
    MIXED = "mixed"
    UNSPECIFIED = "unspecified"


class SeverityLevel(str, Enum):
    MILD = "mild"
    MODERATE = "moderate"
    SEVERE = "severe"


class AgeGroup(str, Enum):
    PRESCHOOL = "preschool"             # 4-6
    EARLY_ELEMENTARY = "early_elementary"  # 7-9
    LATE_ELEMENTARY = "late_elementary"    # 10-12
    SECONDARY = "secondary"               # 13+


# ─── Age configuration ────────────────────────────────────────────────────────

class AgeConfiguration(BaseModel):
    age_group: AgeGroup
    min_age: int
    max_age: int
    max_word_length: int
    max_syllables: int
    vocabulary_level: str  # "basic", "intermediate", "advanced"
    base_session_minutes: int
    time_per_item_seconds: Optional[int] = None
    gamification_emphasis: float = 0.7


AGE_CONFIGURATIONS: Dict[AgeGroup, AgeConfiguration] = {
    AgeGroup.PRESCHOOL: AgeConfiguration(
        age_group=AgeGroup.PRESCHOOL, min_age=4, max_age=6,
        max_word_length=4, max_syllables=2, vocabulary_level="basic",
        base_session_minutes=8, time_per_item_seconds=None,
        gamification_emphasis=0.9,
    ),
    AgeGroup.EARLY_ELEMENTARY: AgeConfiguration(
        age_group=AgeGroup.EARLY_ELEMENTARY, min_age=7, max_age=9,
        max_word_length=6, max_syllables=3, vocabulary_level="basic",
        base_session_minutes=12, time_per_item_seconds=30,
        gamification_emphasis=0.8,
    ),
    AgeGroup.LATE_ELEMENTARY: AgeConfiguration(
        age_group=AgeGroup.LATE_ELEMENTARY, min_age=10, max_age=12,
        max_word_length=8, max_syllables=4, vocabulary_level="intermediate",
        base_session_minutes=18, time_per_item_seconds=20,
        gamification_emphasis=0.6,
    ),
    AgeGroup.SECONDARY: AgeConfiguration(
        age_group=AgeGroup.SECONDARY, min_age=13, max_age=18,
        max_word_length=12, max_syllables=5, vocabulary_level="advanced",
        base_session_minutes=25, time_per_item_seconds=15,
        gamification_emphasis=0.4,
    ),
}


# ─── Intervention profiles per severity ──────────────────────────────────────

class InterventionProfile(BaseModel):
    items_per_session: int = 15
    starting_difficulty: int = 3
    max_difficulty: int = 10
    difficulty_increment: float = 0.3
    difficulty_decrement: float = 0.2
    increase_threshold: float = 0.85
    decrease_threshold: float = 0.60
    show_hints: bool = True
    repeat_on_error: bool = True
    max_attempts_per_item: int = 3
    time_per_item_seconds: Optional[int] = None
    pause_between_items_ms: int = 500


SEVERITY_PROFILES: Dict[SeverityLevel, InterventionProfile] = {
    SeverityLevel.MILD: InterventionProfile(
        items_per_session=20, starting_difficulty=4, max_difficulty=10,
        difficulty_increment=0.4, difficulty_decrement=0.2,
        increase_threshold=0.80, decrease_threshold=0.55,
        show_hints=False, repeat_on_error=False, max_attempts_per_item=2,
    ),
    SeverityLevel.MODERATE: InterventionProfile(
        items_per_session=15, starting_difficulty=3, max_difficulty=10,
        difficulty_increment=0.3, difficulty_decrement=0.2,
        increase_threshold=0.85, decrease_threshold=0.60,
        show_hints=True, repeat_on_error=True, max_attempts_per_item=3,
    ),
    SeverityLevel.SEVERE: InterventionProfile(
        items_per_session=10, starting_difficulty=1, max_difficulty=7,
        difficulty_increment=0.2, difficulty_decrement=0.3,
        increase_threshold=0.90, decrease_threshold=0.65,
        show_hints=True, repeat_on_error=True, max_attempts_per_item=4,
        time_per_item_seconds=None, pause_between_items_ms=1000,
    ),
}


# ─── Dyslexia type → deficit area priority weights ──────────────────────────

DYSLEXIA_TYPE_PRIORITIES: Dict[DyslexiaType, Dict[str, float]] = {
    DyslexiaType.PHONOLOGICAL: {
        "phonological_awareness": 1.0,
        "reading_fluency": 0.7,
        "comprehension": 0.5,
        "rapid_naming": 0.4,
        "working_memory": 0.3,
        "visual_processing": 0.2,
    },
    DyslexiaType.SURFACE: {
        "visual_processing": 0.9,
        "reading_fluency": 0.8,
        "comprehension": 0.6,
        "phonological_awareness": 0.4,
        "working_memory": 0.3,
        "rapid_naming": 0.3,
    },
    DyslexiaType.RAPID_NAMING: {
        "rapid_naming": 1.0,
        "reading_fluency": 0.8,
        "visual_processing": 0.5,
        "phonological_awareness": 0.4,
        "working_memory": 0.4,
        "comprehension": 0.3,
    },
    DyslexiaType.VISUAL: {
        "visual_processing": 1.0,
        "reading_fluency": 0.6,
        "rapid_naming": 0.5,
        "phonological_awareness": 0.3,
        "working_memory": 0.3,
        "comprehension": 0.4,
    },
    DyslexiaType.DOUBLE_DEFICIT: {
        "phonological_awareness": 1.0,
        "rapid_naming": 1.0,
        "reading_fluency": 0.8,
        "working_memory": 0.6,
        "visual_processing": 0.5,
        "comprehension": 0.5,
    },
    DyslexiaType.MIXED: {
        "phonological_awareness": 0.7,
        "rapid_naming": 0.7,
        "reading_fluency": 0.7,
        "working_memory": 0.7,
        "visual_processing": 0.7,
        "comprehension": 0.7,
    },
    DyslexiaType.UNSPECIFIED: {
        "phonological_awareness": 0.5,
        "rapid_naming": 0.5,
        "reading_fluency": 0.5,
        "working_memory": 0.5,
        "visual_processing": 0.5,
        "comprehension": 0.5,
    },
}

# ─── Game suitability per dyslexia type ──────────────────────────────────────

DYSLEXIA_TYPE_GAME_PREFERENCES: Dict[DyslexiaType, Dict[str, float]] = {
    DyslexiaType.PHONOLOGICAL: {
        "sound_safari": 1.0, "phoneme_blender": 1.0, "rhyme_time_race": 0.95,
        "syllable_stomper": 0.9, "sound_swap": 0.9,
        "repeated_reader": 0.7, "phrase_flash": 0.6,
        "letter_detective": 0.4, "memory_matrix": 0.3,
    },
    DyslexiaType.SURFACE: {
        "letter_detective": 1.0, "pattern_matcher": 0.95, "mirror_image": 0.95,
        "visual_closure": 0.9, "tracking_trail": 0.85,
        "sight_word_sprint": 0.9, "flash_card_frenzy": 0.85,
        "phrase_flash": 0.7, "word_ladder": 0.6,
    },
    DyslexiaType.RAPID_NAMING: {
        "speed_namer": 1.0, "flash_card_frenzy": 0.95, "object_blitz": 0.95,
        "letter_stream": 0.9, "sight_word_sprint": 0.85,
        "phrase_flash": 0.8, "repeated_reader": 0.7,
    },
    DyslexiaType.VISUAL: {
        "tracking_trail": 1.0, "letter_detective": 0.95,
        "pattern_matcher": 0.95, "visual_closure": 0.9, "mirror_image": 0.85,
    },
    DyslexiaType.DOUBLE_DEFICIT: {
        "sound_safari": 0.95, "phoneme_blender": 0.95, "rhyme_time_race": 0.9,
        "speed_namer": 0.95, "flash_card_frenzy": 0.9, "object_blitz": 0.85,
        "sight_word_sprint": 0.9, "repeated_reader": 0.85,
    },
    DyslexiaType.MIXED: {
        "sound_safari": 0.8, "letter_detective": 0.8, "speed_namer": 0.8,
        "memory_matrix": 0.8, "phrase_flash": 0.8, "question_quest": 0.8,
    },
}

# Severity-based game exclusions
SEVERITY_EXCLUSIONS: Dict[SeverityLevel, List[str]] = {
    SeverityLevel.MILD: [],
    SeverityLevel.MODERATE: ["dual_task_challenge"],
    SeverityLevel.SEVERE: ["dual_task_challenge", "backward_spell", "inference_detective"],
}


# ─── Teacher diagnostic input ────────────────────────────────────────────────

class TeacherDiagnosticInput(BaseModel):
    """Sent by teacher when creating/editing a student profile."""
    dyslexia_type: DyslexiaType = DyslexiaType.UNSPECIFIED
    severity_level: SeverityLevel = SeverityLevel.MODERATE
    # Per-area severity ratings 1-5
    phonological_severity: int = Field(default=3, ge=1, le=5)
    rapid_naming_severity: int = Field(default=3, ge=1, le=5)
    working_memory_severity: int = Field(default=3, ge=1, le=5)
    visual_processing_severity: int = Field(default=3, ge=1, le=5)
    reading_fluency_severity: int = Field(default=3, ge=1, le=5)
    comprehension_severity: int = Field(default=3, ge=1, le=5)
    # Co-occurring conditions
    has_adhd: bool = False
    has_dyscalculia: bool = False
    has_dysgraphia: bool = False
    notes: Optional[str] = None


# ─── Helper functions ─────────────────────────────────────────────────────────

def get_age_group(age: int) -> AgeGroup:
    if age <= 6:
        return AgeGroup.PRESCHOOL
    elif age <= 9:
        return AgeGroup.EARLY_ELEMENTARY
    elif age <= 12:
        return AgeGroup.LATE_ELEMENTARY
    return AgeGroup.SECONDARY


def get_age_config(age: int) -> AgeConfiguration:
    return AGE_CONFIGURATIONS[get_age_group(age)]


def get_intervention_profile(severity: SeverityLevel) -> InterventionProfile:
    return SEVERITY_PROFILES[severity]
