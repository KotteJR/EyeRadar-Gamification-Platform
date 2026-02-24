"""
Adventure Builder Service — creates personalized adventure maps for students.

Two modes:
1. AI mode (GPT-4o): Full clinical reasoning using student profile + assessment data.
   Activated automatically when OPENAI_API_KEY is set.
2. Template mode: Rule-based fallback when OpenAI is unavailable.

Environment variables:
  OPENAI_API_KEY       — enables AI mode (same key used by the rest of the app)
  ADVENTURE_AI_MODEL   — model to use for adventure generation (default: gpt-4o)
"""

import json
import logging
import os
from typing import List, Dict, Any, Optional

import httpx

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

# ─── AI config ───────────────────────────────────────────────────────────────

ADVENTURE_AI_MODEL = os.getenv("ADVENTURE_AI_MODEL", "gpt-4o")

_SYSTEM_PROMPT = """You are an expert educational psychologist and dyslexia intervention specialist \
with 20+ years of clinical experience designing evidence-based personalized learning programs for \
children with dyslexia across all age groups and severity levels.

Your deep expertise includes:
- All dyslexia subtypes: phonological (~75% of cases), surface, rapid naming, visual, double deficit, mixed
- Evidence-based interventions: Orton-Gillingham, Wilson Reading System, RAVE-O, PHAST, multisensory instruction
- Vygotsky's Zone of Proximal Development — sequencing tasks just beyond current ability
- Motivational design for children with learning differences: interest-based hooks, scaffolding, gamification
- Co-occurring conditions: ADHD (attention management), Dysgraphia (motor load), Dyscalculia (number cognition)
- Interpreting eye-tracking diagnostic data (fixation duration, regression rates, words per minute)
- Age-appropriate intervention sequencing: younger children need phonological foundations first, \
  older children benefit more from fluency automaticity and comprehension strategies

DYSLEXIA SUBTYPE INTERVENTION PRIORITIES:
- Phonological (most common): Core deficit in phoneme awareness and grapheme-phoneme mapping. \
  PRIORITY: phonological_awareness first, then reading_fluency, then working_memory
- Surface: Difficulty with orthographic whole-word recognition. \
  PRIORITY: reading_fluency, rapid_naming, then phonological_awareness
- Rapid Naming: Slow automatic retrieval of verbal labels. \
  PRIORITY: rapid_naming, phonological_awareness, then reading_fluency
- Visual: Visual-spatial processing, letter orientation. \
  PRIORITY: visual_processing, working_memory, then reading_fluency
- Double Deficit: Both phonological + rapid naming. \
  PRIORITY: phonological_awareness AND rapid_naming equally, then reading_fluency
- Mixed: Multiple deficit types. Balanced across phonological, rapid_naming, reading_fluency, working_memory
- Unspecified: Evidence-based balanced intervention — include foundational phonological work \
  plus fluency and comprehension

SEVERITY-BASED WORLD AND GAME COUNT:
- Mild (severity 1-2/5): 5-6 worlds, 5 games per world — broad intervention
- Moderate (severity 3/5): 4-5 worlds, 4 games per world — focused intervention
- Severe (severity 4-5/5): 2-3 worlds, 3 games per world — intensive narrow focus

WORLD SEQUENCING PRINCIPLES:
1. Always start with the most foundational deficit area first (phonological before fluency before comprehension)
2. Working memory and visual processing are support systems — include when severity >= 3/5 in that area
3. For severe cases: narrow focus — only the 2-3 most critical areas
4. For mild/moderate: broader coverage builds a more complete reading profile
5. Avoid cognitive overload — if ADHD is present, fewer worlds, more focused worlds

GAME SELECTION PRINCIPLES:
1. Do NOT repeat the same game mechanic in the same world
2. Balance speed-based vs. untimed games (anxious learners need some untimed options)
3. If ADHD is present: prefer shorter, more engaging games; avoid long text-heavy games
4. If Dysgraphia is present: minimize text-input games (backward_spell, word_ladder)
5. Sequence from concrete/accessible to abstract within each world
6. Younger students (age 4-7): sound-based, visual, and kinesthetic games only
7. Older students (age 11+): can include text-input and dual-task games
8. CRITICAL: Only use game IDs from the provided catalog — never invent IDs

EYE-TRACKING DATA INTERPRETATION:
- WPM < 60 (ages 8-10) or < 80 (ages 11+): Reading fluency is a critical priority
- Fixation duration > 250ms: Visual processing and working memory need support
- Regression rate > 15%: Phonological decoding and comprehension are breaking down
- Overall severity 4-5: Reduce worlds to 2-3, intensive scaffolding, max 3 games per world

THEME PERSONALIZATION:
Match the student's primary interest to a color palette and decoration style that will \
motivate engagement. Children with dyslexia especially benefit from interest-based motivation \
as it counteracts the frustration of effortful reading tasks."""


async def suggest_adventure_ai(
    student: Dict[str, Any],
    dyslexia_type_override: Optional[str] = None,
    severity_override: Optional[str] = None,
    age_override: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """
    Use GPT-4o to generate a clinically-reasoned, personalized adventure map.
    Returns None if OpenAI is unavailable — caller falls back to suggest_adventure().
    """
    from app.services.ollama_client import OPENAI_API_KEY, OPENAI_BASE_URL

    if not OPENAI_API_KEY:
        return None

    diag = student.get("diagnostic") or {}
    age = age_override or student.get("age", 8)
    interests = student.get("interests", [])
    assessment = student.get("assessment")

    dyslexia_type = dyslexia_type_override or diag.get("dyslexia_type", "unspecified")
    severity = severity_override or diag.get("severity_level", "moderate")

    # Build age-filtered game catalog text
    all_games = get_all_games()
    games_by_area: Dict[str, list] = {}
    for game in all_games.values():
        area = game.deficit_area.value
        if game.age_range_min <= age <= game.age_range_max:
            games_by_area.setdefault(area, []).append({
                "id": game.id,
                "name": game.name,
                "description": game.description,
                "mechanics": game.mechanics,
            })

    games_catalog_text = ""
    for area, games in sorted(games_by_area.items()):
        label = area.upper().replace("_", " ")
        games_catalog_text += f"\n{label} ({len(games)} games available for age {age}):\n"
        for g in games:
            games_catalog_text += (
                f"  [{g['id']}] {g['name']} — {g['description']} | Mechanic: {g['mechanics']}\n"
            )

    # Per-area severity lines
    area_sev_keys = [
        ("phonological_awareness", "phonological_severity"),
        ("rapid_naming", "rapid_naming_severity"),
        ("working_memory", "working_memory_severity"),
        ("visual_processing", "visual_processing_severity"),
        ("reading_fluency", "reading_fluency_severity"),
        ("comprehension", "comprehension_severity"),
    ]
    per_area_lines = "\n".join(
        f"  {area}: {diag.get(diag_key, 'not set')}/5"
        for area, diag_key in area_sev_keys
    )

    # Assessment section
    assessment_section = "(No EyeRadar assessment data — use diagnostic profile only)"
    if assessment:
        rm = assessment.get("reading_metrics", {})
        assessment_section = (
            f"EyeRadar Eye-Tracking Assessment:\n"
            f"  Overall Severity: {assessment.get('overall_severity', 'N/A')}/5\n"
            f"  Words Per Minute: {rm.get('words_per_minute', 'N/A')}\n"
            f"  Fixation Duration: {rm.get('fixation_duration_ms', 'N/A')} ms (norm ~200ms)\n"
            f"  Fixations Per Line: {rm.get('fixation_count_per_line', 'N/A')}\n"
            f"  Regression Rate: {rm.get('regression_rate', 'N/A')}% (norm <10%)\n"
            f"  Per-Area Deficit Scores from Eye-Tracking:\n"
            f"{json.dumps(assessment.get('deficits', {}), indent=4)}"
        )

    user_prompt = f"""Design a personalized adventure map for this student. Analyze every data point.

STUDENT PROFILE
Name: {student.get('name', 'Student')} | Age: {age} | Grade: {student.get('grade', 'N/A')} | Language: {student.get('language', 'en')}
Interests: {', '.join(interests) if interests else 'None specified'}
Dyslexia Type: {dyslexia_type} | Overall Severity: {severity}
Co-occurring: ADHD={diag.get('has_adhd', False)}, Dyscalculia={diag.get('has_dyscalculia', False)}, Dysgraphia={diag.get('has_dysgraphia', False)}
Specialist Notes: {diag.get('notes') or 'None'}

PER-AREA SEVERITY (1=mild, 5=severe):
{per_area_lines}

{assessment_section}

AVAILABLE GAMES FOR AGE {age}:
{games_catalog_text}

WORLD METADATA (use these exact values):
phonological_awareness → world_name: "Sound Kingdom",    color: "#6366f1"
rapid_naming           → world_name: "Speed Valley",     color: "#f59e0b"
working_memory         → world_name: "Memory Mountains", color: "#8b5cf6"
visual_processing      → world_name: "Vision Forest",    color: "#10b981"
reading_fluency        → world_name: "Fluency River",    color: "#3b82f6"
comprehension          → world_name: "Story Castle",     color: "#ef4444"

THEME OPTIONS:
color_palette: "warm"|"cosmic"|"nature"|"vibrant"|"energetic"|"rainbow"|"forest"|"aquatic"|"tech"|"magical"|"default"
decoration_style: "prehistoric"|"space"|"wildlife"|"musical"|"athletic"|"creative"|"nature"|"underwater"|"futuristic"|"fantasy"|"culinary"|"racing"|"heroic"|"default"

Respond ONLY with valid JSON:
{{
  "worlds": [
    {{
      "deficit_area": "phonological_awareness",
      "world_number": 1,
      "world_name": "Sound Kingdom",
      "color": "#6366f1",
      "game_ids": ["sound_safari", "rhyme_time_race", "phoneme_blender"]
    }}
  ],
  "reasoning": [
    "Profile analysis: [specific observations about this student's data]",
    "Priority selection: [why these areas in this order]",
    "World 1 (Sound Kingdom): [clinical justification referencing actual scores]",
    "World 1 games: [why these specific games suit this student]"
  ],
  "theme_config": {{
    "primary_interest": "ocean",
    "color_palette": "aquatic",
    "decoration_style": "underwater"
  }}
}}"""

    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(
                f"{OPENAI_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": ADVENTURE_AI_MODEL,
                    "messages": [
                        {"role": "system", "content": _SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.35,
                    "max_tokens": 3500,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"].strip()
    except httpx.TimeoutException:
        logger.warning("GPT-4o adventure suggestion timed out")
        return None
    except Exception as exc:
        logger.warning("GPT-4o adventure suggestion failed: %s", exc)
        return None

    try:
        result = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("GPT-4o returned invalid JSON for adventure: %s", exc)
        return None

    try:
        worlds: List[AdventureWorld] = []
        for w in result.get("worlds", []):
            worlds.append(AdventureWorld(
                deficit_area=w["deficit_area"],
                world_number=w["world_number"],
                world_name=w["world_name"],
                color=w["color"],
                game_ids=w["game_ids"],
            ))

        if not worlds:
            logger.warning("GPT-4o returned no worlds — falling back to template")
            return None

        td = result.get("theme_config", {})
        theme_config = AdventureThemeConfig(
            primary_interest=td.get("primary_interest", interests[0].lower() if interests else ""),
            color_palette=td.get("color_palette", "default"),
            decoration_style=td.get("decoration_style", "nature"),
        )

        reasoning = result.get("reasoning") or [
            f"GPT-4o generated adventure map for {student.get('name', 'student')}"
        ]

        logger.info(
            "GPT-4o generated %d worlds for student %s",
            len(worlds), student.get("id", "unknown"),
        )
        return {
            "suggested_worlds": worlds,
            "reasoning": reasoning,
            "theme_config": theme_config,
        }

    except Exception as exc:
        logger.warning("Failed to parse GPT-4o adventure response: %s", exc)
        return None

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
