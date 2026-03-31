"""
Adventure Builder Service — personalized adventure maps for students.

1. AI mode (OPENAI_API_KEY set): model only chooses (a) which fixed worlds appear and in what order,
   and (b) which catalog game ids (levels) go in each world. World titles/colors are never model-authored.
2. Template mode: rule-based fallback when AI is unavailable.

Environment:
  OPENAI_API_KEY, ADVENTURE_AI_MODEL (default gpt-4o)
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
)
from app.games.game_definitions import get_all_games, get_game, get_games_by_area
from app.models import DeficitArea

logger = logging.getLogger(__name__)

# ─── AI config ───────────────────────────────────────────────────────────────

ADVENTURE_AI_MODEL = os.getenv("ADVENTURE_AI_MODEL", "gpt-4o")

# Dungeon/recap games — not assignable via the adventure builder (same as API normalization).
_BUILDER_EXCLUDED_GAME_IDS = frozenset(
    {"castle_challenge", "dungeon_forest", "dungeon_beach", "dungeon_3stage"}
)

# Only these worlds exist on the map; the model picks a subset + order — never invents worlds.
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

FIXED_WORLD_DEFICIT_AREAS: tuple[str, ...] = tuple(WORLD_NAMES.keys())

ADVENTURE_AI_SYSTEM_PROMPT = """You are a routing assistant for a reading intervention app.

The app has exactly six fixed worlds (skill areas). Each world has a fixed display name and color — you do not invent worlds or rename them.

Your job is only:
1) Choose which of those six worlds appear on this student's map, in what order (3–6 worlds, each deficit_area at most once). ALWAYS CHOOSE 3 WORLDS AT LEAST!!!! 3 OR MORE!!! NEVER LESS THAN 3!!!! THE MORE THE BETTER!!!! FOLLOW STRICTLY WHAT DEFICIT AREAS THE CHILD HAS AND BY THIS CHOOSE WORLDS AND LEVELS!!! IMPORTNAT AT LEAST 3 BUT MORE IS ALWAYS BETTER!!!! BUT DONT SUGGEST LIKE A PSEUDO-SCIENTIEST A WORLD THAT THE CHILD DOES NOT NEED OR HAS A DEFICIT AREA IN!!!!!!!!!!
2) For each chosen world, choose !!!!!!5+!!!!!! exercise levels by listing game ids from the allowed list for that world (the user message includes JSON: allowed ids per world for this student's age).

Rules:
- Output JSON only. Each world object must have exactly "deficit_area" and "game_ids".
- deficit_area must be one of the keys from FIXED_WORLDS in the user message.
- Every id in game_ids must appear in GAMES_BY_AREA[deficit_area] in the user message — copy strings exactly.
- Do not output world_name, color, or new game names — the server fills those from deficit_area.
- Prefer higher per-area severity and dyslexia profile when ordering worlds and picking exercises; avoid overloading ADHD learners with many worlds."""


def _sanitize_ai_worlds_to_catalog(worlds: List[AdventureWorld], age: int) -> List[AdventureWorld]:
    """
    Keep only game ids that exist in games.json, match the world's deficit area, fit age,
    and are allowed in the builder. If a world has no valid picks left, backfill from catalog.
    """
    out: List[AdventureWorld] = []
    for w in worlds:
        try:
            area_enum = DeficitArea(w.deficit_area)
        except ValueError:
            logger.warning("Skipping world with unknown deficit_area: %s", w.deficit_area)
            continue

        seen: set[str] = set()
        valid_ids: List[str] = []
        for gid in w.game_ids or []:
            if gid in _BUILDER_EXCLUDED_GAME_IDS:
                continue
            game = get_game(gid)
            if game is None or game.deficit_area != area_enum:
                continue
            if not (game.age_range_min <= age <= game.age_range_max):
                continue
            if gid in seen:
                continue
            seen.add(gid)
            valid_ids.append(gid)

        if not valid_ids:
            pool = [
                g
                for g in get_games_by_area(area_enum)
                if g.age_range_min <= age <= g.age_range_max and g.id not in _BUILDER_EXCLUDED_GAME_IDS
            ]
            if not pool:
                logger.warning(
                    "World %s: no valid catalog games after sanitization (age %s)",
                    w.deficit_area,
                    age,
                )
                continue
            take = min(4, len(pool))
            valid_ids = [pool[i].id for i in range(take)]

        area_key = w.deficit_area
        out.append(
            AdventureWorld(
                deficit_area=area_key,
                world_number=len(out) + 1,
                world_name=WORLD_NAMES.get(area_key, area_key.replace("_", " ").title()),
                color=WORLD_COLORS.get(area_key, "#6366f1"),
                game_ids=valid_ids,
            )
        )
    return out


def _allowed_game_ids_by_area_for_age(age: int) -> Dict[str, List[str]]:
    """Catalog game ids per deficit area for this age (builder-eligible only)."""
    by_area: Dict[str, List[str]] = {k: [] for k in FIXED_WORLD_DEFICIT_AREAS}
    for game in get_all_games():
        area = game.deficit_area.value
        if area not in by_area:
            continue
        if game.id in _BUILDER_EXCLUDED_GAME_IDS:
            continue
        if game.age_range_min <= age <= game.age_range_max:
            by_area[area].append(game.id)
    return by_area


async def suggest_adventure_ai(
    student: Dict[str, Any],
    dyslexia_type_override: Optional[str] = None,
    severity_override: Optional[str] = None,
    age_override: Optional[int] = None,
) -> Optional[Dict[str, Any]]:
    """
    Ask the model to pick worlds (from fixed six) and game_ids per world from allowed lists.
    Returns None if OpenAI is unavailable or output is unusable — caller uses suggest_adventure().
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

    games_by_area_ids = _allowed_game_ids_by_area_for_age(age)
    fixed_worlds_payload = {k: {"world_name": WORLD_NAMES[k], "color": WORLD_COLORS[k]} for k in FIXED_WORLD_DEFICIT_AREAS}

    area_sev_keys = [
        ("phonological_awareness", "phonological_severity"),
        ("rapid_naming", "rapid_naming_severity"),
        ("working_memory", "working_memory_severity"),
        ("visual_processing", "visual_processing_severity"),
        ("reading_fluency", "reading_fluency_severity"),
        ("comprehension", "comprehension_severity"),
    ]
    per_area = {area: diag.get(key, None) for area, key in area_sev_keys}

    student_context = {
        "name": student.get("name", "Student"),
        "age": age,
        "grade": student.get("grade"),
        "language": student.get("language", "en"),
        "interests": interests,
        "dyslexia_type": dyslexia_type,
        "severity_level": severity,
        "per_area_severity_1_to_5": per_area,
        "has_adhd": diag.get("has_adhd", False),
        "has_dyscalculia": diag.get("has_dyscalculia", False),
        "has_dysgraphia": diag.get("has_dysgraphia", False),
        "notes": diag.get("notes") or "",
    }
    if assessment:
        student_context["eye_tracking_summary"] = {
            "overall_severity": assessment.get("overall_severity"),
            "reading_metrics": assessment.get("reading_metrics"),
            "deficits": assessment.get("deficits"),
        }

    user_prompt = f"""Configure this student's adventure map.

FIXED_WORLDS — you may ONLY use these deficit_area keys (each has a fixed map name and color; do not output names/colors):
{json.dumps(fixed_worlds_payload, indent=2)}

GAMES_BY_AREA — allowed game ids for age {age} (each id is one exercise level). game_ids MUST be copied from the list for that world only:
{json.dumps(games_by_area_ids, indent=2)}

STUDENT_CONTEXT (use to prioritize world order and which exercises):
{json.dumps(student_context, indent=2, default=str)}

THEME_CONFIG options:
- color_palette: warm|cosmic|nature|vibrant|energetic|rainbow|forest|aquatic|tech|magical|default
- decoration_style: prehistoric|space|wildlife|musical|athletic|creative|nature|underwater|futuristic|fantasy|culinary|racing|heroic|default

Return JSON with this exact shape (worlds: 2–6 entries, unique deficit_area, 3–5 game_ids each when enough ids exist):
{{
  "worlds": [
    {{ "deficit_area": "phonological_awareness", "game_ids": ["sound_safari", "rhyme_time_race"] }}
  ],
  "reasoning": ["short string", "..."],
  "theme_config": {{
    "primary_interest": "",
    "color_palette": "default",
    "decoration_style": "nature"
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
                        {"role": "system", "content": ADVENTURE_AI_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                    "temperature": 0.15,
                    "max_tokens": 2800,
                    "response_format": {"type": "json_object"},
                },
            )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"].strip()
    except httpx.TimeoutException:
        logger.warning("Adventure AI suggestion timed out")
        return None
    except Exception as exc:
        logger.warning("Adventure AI suggestion failed: %s", exc)
        return None

    try:
        result = json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("Adventure AI returned invalid JSON: %s", exc)
        return None

    try:
        worlds: List[AdventureWorld] = []
        seen_areas: set[str] = set()
        for w in result.get("worlds", []):
            if not isinstance(w, dict):
                continue
            area = w.get("deficit_area")
            if not isinstance(area, str) or area not in WORLD_NAMES:
                continue
            if area in seen_areas:
                continue
            seen_areas.add(area)
            gids = w.get("game_ids")
            if not isinstance(gids, list):
                gids = []
            gids = [x for x in gids if isinstance(x, str)]
            worlds.append(
                AdventureWorld(
                    deficit_area=area,
                    world_number=len(worlds) + 1,
                    world_name=WORLD_NAMES[area],
                    color=WORLD_COLORS[area],
                    game_ids=gids,
                )
            )

        if not worlds:
            logger.warning("Adventure AI returned no valid worlds — falling back to template")
            return None

        worlds = _sanitize_ai_worlds_to_catalog(worlds, age)
        if not worlds:
            logger.warning("Adventure AI worlds empty after catalog validation — falling back to template")
            return None

        td = result.get("theme_config") if isinstance(result.get("theme_config"), dict) else {}
        theme_config = AdventureThemeConfig(
            primary_interest=str(td.get("primary_interest", interests[0] if interests else "") or "").lower(),
            color_palette=str(td.get("color_palette", "default") or "default"),
            decoration_style=str(td.get("decoration_style", "nature") or "nature"),
        )

        reasoning = result.get("reasoning")
        if not isinstance(reasoning, list):
            reasoning = []
        reasoning = [str(x) for x in reasoning if x]
        if not reasoning:
            reasoning = [f"Selected {len(worlds)} worlds and exercises from catalog for age {age}."]

        logger.info(
            "Adventure AI returned %d worlds for student %s",
            len(worlds),
            student.get("id", "unknown"),
        )
        return {
            "suggested_worlds": worlds,
            "reasoning": reasoning,
            "theme_config": theme_config,
        }

    except Exception as exc:
        logger.warning("Failed to parse adventure AI response: %s", exc)
        return None


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

    try:
        dyslexia_type = DyslexiaType(
            dyslexia_type_override or diag.get("dyslexia_type") or "unspecified"
        )
    except ValueError:
        dyslexia_type = DyslexiaType.UNSPECIFIED

    try:
        severity = SeverityLevel(
            severity_override or diag.get("severity_level") or "moderate"
        )
    except ValueError:
        severity = SeverityLevel.MODERATE

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
