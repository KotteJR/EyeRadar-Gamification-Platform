"""
Exercise Selection Agent — selects and personalizes games per student profile.

Ensures:
1. Different ages → age-appropriate content
2. Different dyslexia types → targeted exercises
3. Different severities → appropriate difficulty/pacing
4. Same student doesn't repeat recent exercises
5. AI content generation receives student-specific parameters
"""

import random
import logging
from typing import List, Dict, Optional, Any, Tuple
from dataclasses import dataclass, field

from app.models_enhanced import (
    DyslexiaType, SeverityLevel,
    DYSLEXIA_TYPE_PRIORITIES,
    DYSLEXIA_TYPE_GAME_PREFERENCES,
    SEVERITY_EXCLUSIONS,
    SEVERITY_PROFILES,
    get_age_group, get_age_config,
)
from app.models import GameDefinition

logger = logging.getLogger(__name__)


@dataclass
class GameRecommendation:
    game: GameDefinition
    score: float = 0.5
    reasons: List[str] = field(default_factory=list)
    recommended_difficulty: int = 3
    recommended_items: int = 15


@dataclass
class SessionPlan:
    game: GameDefinition
    deficit_area: str
    difficulty: int
    item_count: int
    reasons: List[str]
    content_params: Dict[str, Any]


class ExerciseSelectionAgent:
    """
    AI agent that selects and configures exercises based on student profile.
    """

    def __init__(self):
        self.recent_games_window = 5

    def select_exercise(
        self,
        student: Dict[str, Any],
        available_games: List[GameDefinition],
        session_history: List[Dict[str, Any]],
        preferred_area: Optional[str] = None,
        preferred_game: Optional[str] = None,
    ) -> SessionPlan:
        """Main entry: select the best exercise for a student."""

        diag = student.get("diagnostic") or {}
        dyslexia_type = DyslexiaType(diag.get("dyslexia_type", "unspecified"))
        severity = SeverityLevel(diag.get("severity_level", "moderate"))
        age = student.get("age", 8)

        # 1. Pick target deficit area
        target_area = self._select_deficit_area(
            dyslexia_type, diag, session_history, preferred_area
        )

        # 2. Filter & score games
        area_games = [g for g in available_games if g.deficit_area.value == target_area]
        if not area_games:
            # Fallback: any game for this age
            area_games = [
                g for g in available_games
                if g.age_range_min <= age <= g.age_range_max
            ]

        recommendations = []
        for game in area_games:
            score, reasons = self._score_game(
                game, age, dyslexia_type, severity, session_history
            )
            if score > 0:
                rec = GameRecommendation(
                    game=game, score=score, reasons=reasons,
                    recommended_difficulty=self._calc_difficulty(student, game, severity),
                    recommended_items=self._calc_items(age, severity),
                )
                recommendations.append(rec)

        recommendations.sort(key=lambda r: r.score, reverse=True)

        # 3. Handle preferred game
        if preferred_game:
            match = next(
                (r for r in recommendations if r.game.id == preferred_game), None
            )
            if match:
                selected = match
            else:
                # Still allow it, but with default params
                fallback = next(
                    (g for g in available_games if g.id == preferred_game), None
                )
                if fallback:
                    selected = GameRecommendation(
                        game=fallback,
                        score=0.5,
                        reasons=["Teacher/student selected"],
                        recommended_difficulty=self._calc_difficulty(student, fallback, severity),
                        recommended_items=self._calc_items(age, severity),
                    )
                else:
                    selected = recommendations[0] if recommendations else None
        else:
            selected = self._weighted_select(recommendations)

        if not selected:
            raise ValueError("No suitable games found for this profile")

        # 4. Build content params for AI generation
        content_params = self._build_content_params(
            student, selected.game, dyslexia_type, severity
        )

        return SessionPlan(
            game=selected.game,
            deficit_area=target_area,
            difficulty=selected.recommended_difficulty,
            item_count=selected.recommended_items,
            reasons=selected.reasons,
            content_params=content_params,
        )

    # ─── Internal helpers ─────────────────────────────────────────────────

    def _select_deficit_area(
        self,
        dyslexia_type: DyslexiaType,
        diag: Dict,
        history: List[Dict],
        preferred: Optional[str],
    ) -> str:
        if preferred:
            return preferred

        priorities = DYSLEXIA_TYPE_PRIORITIES.get(
            dyslexia_type, DYSLEXIA_TYPE_PRIORITIES[DyslexiaType.UNSPECIFIED]
        )

        # Boost areas with high per-area severity from teacher input
        area_scores: Dict[str, float] = {}
        for area, weight in priorities.items():
            sev_key = f"{area}_severity" if area != "phonological_awareness" else "phonological_severity"
            # Map common area names
            sev_map = {
                "phonological_awareness": "phonological_severity",
                "rapid_naming": "rapid_naming_severity",
                "working_memory": "working_memory_severity",
                "visual_processing": "visual_processing_severity",
                "reading_fluency": "reading_fluency_severity",
                "comprehension": "comprehension_severity",
            }
            sev_val = diag.get(sev_map.get(area, ""), 3) / 5.0
            area_scores[area] = weight + sev_val * 0.3

        # Penalize recently-practiced areas
        recent_areas = [s.get("deficit_area") for s in history[-10:]]
        for area in area_scores:
            count = recent_areas.count(area)
            area_scores[area] -= count * 0.1

        return max(area_scores, key=lambda a: area_scores[a])

    def _score_game(
        self,
        game: GameDefinition,
        age: int,
        dyslexia_type: DyslexiaType,
        severity: SeverityLevel,
        history: List[Dict],
    ) -> Tuple[float, List[str]]:
        score = 0.5
        reasons = []

        # Age check
        if age < game.age_range_min or age > game.age_range_max:
            return 0, ["Age not suitable"]

        age_center = (game.age_range_min + game.age_range_max) / 2
        age_range = max((game.age_range_max - game.age_range_min) / 2, 1)
        age_fit = 1 - abs(age - age_center) / age_range
        score += max(0, age_fit) * 0.2
        if age_fit > 0.7:
            reasons.append(f"Well-suited for age {age}")

        # Dyslexia type preference
        type_prefs = DYSLEXIA_TYPE_GAME_PREFERENCES.get(dyslexia_type, {})
        type_score = type_prefs.get(game.id, 0.5)
        score += type_score * 0.3
        if type_score >= 0.9:
            reasons.append(f"Excellent for {dyslexia_type.value} dyslexia")
        elif type_score >= 0.7:
            reasons.append(f"Recommended for {dyslexia_type.value} dyslexia")

        # Severity exclusion
        if game.id in SEVERITY_EXCLUSIONS.get(severity, []):
            return 0, [f"Not recommended for {severity.value} severity"]

        if severity == SeverityLevel.SEVERE:
            score += 0.1
            reasons.append("Appropriate for intensive support")

        # Recent play penalty
        recent_games = [s.get("game_id") for s in history[-self.recent_games_window:]]
        if game.id in recent_games:
            idx = list(reversed(recent_games)).index(game.id)
            penalty = (self.recent_games_window - idx) / self.recent_games_window * 0.3
            score -= penalty
            reasons.append("Recently played (variety encouraged)")

        return score, reasons

    def _calc_difficulty(
        self,
        student: Dict,
        game: GameDefinition,
        severity: SeverityLevel,
    ) -> int:
        current_levels = student.get("current_levels", {})
        area = game.deficit_area.value
        current = current_levels.get(area, 1)

        adjust = {
            SeverityLevel.MILD: 1,
            SeverityLevel.MODERATE: 0,
            SeverityLevel.SEVERE: -1,
        }.get(severity, 0)

        profile = SEVERITY_PROFILES[severity]
        diff = max(1, min(profile.max_difficulty, current + adjust))
        return diff

    def _calc_items(self, age: int, severity: SeverityLevel) -> int:
        profile = SEVERITY_PROFILES[severity]
        base = profile.items_per_session
        age_group = get_age_group(age)
        if age_group.value == "preschool":
            return max(5, int(base * 0.7))
        elif age_group.value == "secondary":
            return min(30, int(base * 1.2))
        return base

    def _weighted_select(
        self, recs: List[GameRecommendation]
    ) -> Optional[GameRecommendation]:
        if not recs:
            return None
        top = recs[:3]
        if len(top) == 1:
            return top[0]
        total = sum(r.score for r in top)
        weights = [r.score / total for r in top]
        return random.choices(top, weights=weights, k=1)[0]

    def _build_content_params(
        self,
        student: Dict,
        game: GameDefinition,
        dyslexia_type: DyslexiaType,
        severity: SeverityLevel,
    ) -> Dict[str, Any]:
        """Parameters sent to the AI content generator for personalization."""
        age = student.get("age", 8)
        age_cfg = get_age_config(age)
        diag = student.get("diagnostic") or {}

        return {
            "max_word_length": age_cfg.max_word_length,
            "max_syllables": age_cfg.max_syllables,
            "vocabulary_level": age_cfg.vocabulary_level,
            "interests": student.get("interests", []),
            "dyslexia_type": dyslexia_type.value,
            "severity": severity.value,
            "show_hints": SEVERITY_PROFILES[severity].show_hints,
            "age_group": age_cfg.age_group.value,
            "notes": diag.get("notes", ""),
        }


# ─── Singleton ────────────────────────────────────────────────────────────────

exercise_agent = ExerciseSelectionAgent()
