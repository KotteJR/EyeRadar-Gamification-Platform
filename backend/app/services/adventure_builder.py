"""
Adventure Builder Service — creates personalized adventure maps for students.

Uses dyslexia diagnostic data, age, severity, and interests to:
1. Select which worlds (deficit areas) a student needs
2. Choose appropriate games per world (3-6 per world)
3. Generate interest-based theme configuration
"""

import logging
from typing import List, Dict, Any, Optional

from app.models import AdventureWorld, AdventureThemeConfig
from app.models_enhanced import (
    DyslexiaType,
    SeverityLevel,
    DYSLEXIA_TYPE_PRIORITIES,
    SEVERITY_EXCLUSIONS,
    DYSLEXIA_TYPE_GAME_PREFERENCES,
    get_age_group,
)
from app.games.game_definitions import get_all_games, get_games_by_area
from app.models import DeficitArea

logger = logging.getLogger(__name__)

# World metadata
WORLD_NAMES: Dict[str, str] = {
    "phonological_awareness": "Sound Kingdom",
    "rapid_naming": "Speed Valley",
    "working_memory": "Memory Mountains",
    "visual_processing": "Vision Forest",
    "reading_fluency": "Fluency River",
    "comprehension": "Story Castle",
}

WORLD_COLORS: Dict[str, str] = {
    "phonological_awareness": "#6366f1",
    "rapid_naming": "#f59e0b",
    "working_memory": "#8b5cf6",
    "visual_processing": "#10b981",
    "reading_fluency": "#3b82f6",
    "comprehension": "#ef4444",
}

# Interest → decoration style mapping
INTEREST_THEME_MAP: Dict[str, Dict[str, str]] = {
    "dinosaurs": {"color_palette": "warm", "decoration_style": "prehistoric"},
    "space": {"color_palette": "cosmic", "decoration_style": "space"},
    "animals": {"color_palette": "nature", "decoration_style": "wildlife"},
    "music": {"color_palette": "vibrant", "decoration_style": "musical"},
    "sports": {"color_palette": "energetic", "decoration_style": "athletic"},
    "art": {"color_palette": "rainbow", "decoration_style": "creative"},
    "nature": {"color_palette": "forest", "decoration_style": "nature"},
    "ocean": {"color_palette": "aquatic", "decoration_style": "underwater"},
    "robots": {"color_palette": "tech", "decoration_style": "futuristic"},
    "fairy tales": {"color_palette": "magical", "decoration_style": "fantasy"},
    "cooking": {"color_palette": "warm", "decoration_style": "culinary"},
    "cars": {"color_palette": "energetic", "decoration_style": "racing"},
    "superheroes": {"color_palette": "vibrant", "decoration_style": "heroic"},
}

# Minimum per-area severity to warrant a world (1-5 scale, threshold = 2)
SEVERITY_THRESHOLD_FOR_WORLD = 2


def suggest_adventure(
    student: Dict[str, Any],
    dyslexia_type_override: Optional[str] = None,
    severity_override: Optional[str] = None,
    age_override: Optional[int] = None,
) -> Dict[str, Any]:
    """
    Generate a suggested adventure map configuration for a student.

    Returns dict with: suggested_worlds, reasoning, theme_config
    """
    diag = student.get("diagnostic") or {}
    age = age_override or student.get("age", 8)
    interests = student.get("interests", [])

    dyslexia_type = DyslexiaType(
        dyslexia_type_override or diag.get("dyslexia_type", "unspecified")
    )
    severity = SeverityLevel(
        severity_override or diag.get("severity_level", "moderate")
    )

    all_games = get_all_games()
    reasoning: List[str] = []

    # 1. Determine which deficit areas need worlds
    priorities = DYSLEXIA_TYPE_PRIORITIES.get(
        dyslexia_type, DYSLEXIA_TYPE_PRIORITIES[DyslexiaType.UNSPECIFIED]
    )

    # Boost areas based on per-area severity from diagnostic
    area_scores: Dict[str, float] = {}
    severity_map = {
        "phonological_awareness": "phonological_severity",
        "rapid_naming": "rapid_naming_severity",
        "working_memory": "working_memory_severity",
        "visual_processing": "visual_processing_severity",
        "reading_fluency": "reading_fluency_severity",
        "comprehension": "comprehension_severity",
    }

    for area, base_weight in priorities.items():
        per_area_sev = diag.get(severity_map.get(area, ""), 3)
        area_scores[area] = base_weight + (per_area_sev / 5.0) * 0.4

    # Sort by score descending
    sorted_areas = sorted(area_scores.items(), key=lambda x: x[1], reverse=True)

    # Select worlds: include areas with score > 0.5, minimum 2, maximum 6
    selected_areas = []
    for area, score in sorted_areas:
        if score >= 0.5 or len(selected_areas) < 2:
            per_area_sev = diag.get(severity_map.get(area, ""), 3)
            if per_area_sev >= SEVERITY_THRESHOLD_FOR_WORLD or len(selected_areas) < 2:
                selected_areas.append(area)

    selected_areas = selected_areas[:6]

    reasoning.append(
        f"Selected {len(selected_areas)} worlds based on {dyslexia_type.value} "
        f"dyslexia profile ({severity.value} severity)"
    )

    # 2. For each selected area, pick appropriate games
    excluded_games = SEVERITY_EXCLUSIONS.get(severity, [])
    type_prefs = DYSLEXIA_TYPE_GAME_PREFERENCES.get(dyslexia_type, {})

    worlds: List[AdventureWorld] = []
    for idx, area in enumerate(selected_areas):
        area_enum = DeficitArea(area)
        area_games = get_games_by_area(area_enum)

        # Filter by age
        age_filtered = [
            g for g in area_games
            if g.age_range_min <= age <= g.age_range_max
            and g.id not in excluded_games
        ]

        if not age_filtered:
            reasoning.append(f"Skipped {WORLD_NAMES[area]}: no age-appropriate games for age {age}")
            continue

        # Score games by type preference
        scored = []
        for g in age_filtered:
            pref_score = type_prefs.get(g.id, 0.5)
            scored.append((g, pref_score))
        scored.sort(key=lambda x: x[1], reverse=True)

        # Pick 3-5 games depending on severity
        if severity == SeverityLevel.SEVERE:
            max_games = 3
        elif severity == SeverityLevel.MODERATE:
            max_games = 4
        else:
            max_games = 5

        selected_games = [g for g, _ in scored[:max_games]]

        if not selected_games:
            continue

        world = AdventureWorld(
            deficit_area=area,
            world_number=idx + 1,
            world_name=WORLD_NAMES.get(area, area.replace("_", " ").title()),
            color=WORLD_COLORS.get(area, "#6366f1"),
            game_ids=[g.id for g in selected_games],
        )
        worlds.append(world)

        reasoning.append(
            f"World {idx + 1} ({world.world_name}): "
            f"{len(selected_games)} exercises selected "
            f"[{', '.join(g.name for g in selected_games)}]"
        )

    # 3. Generate theme config from interests
    theme_config = _build_theme_config(interests)
    if interests:
        reasoning.append(
            f"Theme personalized for interests: {', '.join(interests[:3])}"
        )

    return {
        "suggested_worlds": worlds,
        "reasoning": reasoning,
        "theme_config": theme_config,
    }


def _build_theme_config(interests: List[str]) -> AdventureThemeConfig:
    """Generate a theme config based on student interests."""
    if not interests:
        return AdventureThemeConfig(
            primary_interest="",
            color_palette="default",
            decoration_style="nature",
        )

    primary = interests[0].lower()

    # Try to match against known interest themes
    best_match = None
    for keyword, theme in INTEREST_THEME_MAP.items():
        if keyword in primary:
            best_match = theme
            break

    if not best_match:
        # Check secondary interests
        for interest in interests[1:]:
            for keyword, theme in INTEREST_THEME_MAP.items():
                if keyword in interest.lower():
                    best_match = theme
                    break
            if best_match:
                break

    if not best_match:
        best_match = {"color_palette": "default", "decoration_style": "nature"}

    return AdventureThemeConfig(
        primary_interest=primary,
        color_palette=best_match["color_palette"],
        decoration_style=best_match["decoration_style"],
    )


def get_available_games_for_area(
    area: str,
    age: int,
    severity: Optional[str] = None,
) -> List[Dict[str, Any]]:
    """Get all available games for a given area, filtered by age and severity."""
    area_enum = DeficitArea(area)
    area_games = get_games_by_area(area_enum)

    excluded = SEVERITY_EXCLUSIONS.get(
        SeverityLevel(severity) if severity else SeverityLevel.MODERATE, []
    )

    result = []
    for g in area_games:
        if g.age_range_min <= age <= g.age_range_max and g.id not in excluded:
            result.append({
                "id": g.id,
                "name": g.name,
                "description": g.description,
                "game_type": g.game_type.value,
                "age_range_min": g.age_range_min,
                "age_range_max": g.age_range_max,
                "icon": g.icon,
            })

    return result
