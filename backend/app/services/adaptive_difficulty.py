"""
Adaptive difficulty algorithm for exercise sessions.
Uses a modified Elo-like system that considers:
- Student's age and grade
- Deficit severity from EyeRadar assessment
- Recent performance history
- Performance trend analysis (improving, stable, declining)
- Warm-up protection (don't increase too early)
"""

from typing import Dict, List, Optional, Tuple


# ─── Configuration ────────────────────────────────────────────────────────────

# Performance thresholds
INCREASE_THRESHOLD = 0.85   # Accuracy above which to increase difficulty
MAINTAIN_MIN = 0.60         # Accuracy below which to decrease difficulty

# History settings
RECENT_SESSIONS_COUNT = 5
MIN_SESSIONS_BEFORE_INCREASE = 3  # Warm-up protection

# Smoothing weights
RECENT_WEIGHT = 0.7
HISTORY_WEIGHT = 0.3


# ─── Base Level Calculation ───────────────────────────────────────────────────

def get_base_level_for_age(age: int) -> int:
    """Determine base difficulty level from student's age."""
    if age <= 5:
        return 1
    elif age <= 7:
        return 2
    elif age <= 9:
        return 3
    elif age <= 11:
        return 4
    elif age <= 13:
        return 5
    else:
        return 6


def get_severity_adjustment(severity: int) -> float:
    """
    Adjust starting level based on deficit severity.
    Severity 3 is neutral; 1-2 increase; 4-5 decrease.
    """
    adjustments = {1: 1.0, 2: 0.5, 3: 0.0, 4: -0.5, 5: -1.0}
    return adjustments.get(severity, 0.0)


# ─── Performance Analysis ─────────────────────────────────────────────────────

def calculate_weighted_accuracy(recent_accuracies: List[float]) -> Optional[float]:
    """
    Calculate weighted accuracy from recent sessions.
    More recent sessions have higher weight.
    """
    if not recent_accuracies:
        return None

    total_weight = 0.0
    weighted_sum = 0.0
    for i, acc in enumerate(recent_accuracies):
        weight = (i + 1) / len(recent_accuracies)
        weighted_sum += acc * weight
        total_weight += weight

    return weighted_sum / total_weight if total_weight > 0 else None


def analyze_performance_trend(recent_accuracies: List[float]) -> str:
    """
    Determine if performance is improving, stable, or declining.
    Returns: "improving", "stable", "declining", or "insufficient_data"
    """
    if len(recent_accuracies) < 5:
        return "insufficient_data"

    mid = len(recent_accuracies) // 2
    first_half_avg = sum(recent_accuracies[:mid]) / mid
    second_half_avg = sum(recent_accuracies[mid:]) / (len(recent_accuracies) - mid)
    diff = second_half_avg - first_half_avg

    if diff > 0.10:
        return "improving"
    elif diff < -0.10:
        return "declining"
    else:
        return "stable"


# ─── Difficulty Calculation ───────────────────────────────────────────────────

def calculate_difficulty_level(
    age: int,
    deficit_severity: int,
    current_level: int,
    recent_accuracies: List[float],
) -> int:
    """
    Calculate the appropriate difficulty level for the next exercise session.

    Args:
        age: Student's age
        deficit_severity: Severity score (1-5) from EyeRadar assessment
        current_level: Current difficulty level for this deficit area
        recent_accuracies: List of accuracy scores from recent sessions

    Returns:
        New difficulty level (1-10)
    """
    if not recent_accuracies:
        # No history: use age and severity to set initial level
        base = get_base_level_for_age(age)
        severity_adj = get_severity_adjustment(deficit_severity)
        return _clamp(int(base + severity_adj), 1, 10)

    # Calculate weighted accuracy
    weighted_accuracy = calculate_weighted_accuracy(recent_accuracies)
    if weighted_accuracy is None:
        return current_level

    # Base delta from accuracy
    delta = 0

    # Warm-up protection: don't increase until enough sessions
    has_enough_sessions = len(recent_accuracies) >= MIN_SESSIONS_BEFORE_INCREASE

    if has_enough_sessions and weighted_accuracy > INCREASE_THRESHOLD:
        delta = 1
    elif weighted_accuracy < MAINTAIN_MIN:
        delta = -1

    # Check for consistent patterns (3+ sessions)
    if len(recent_accuracies) >= 3:
        last_three = recent_accuracies[-3:]
        if all(a < 0.50 for a in last_three):
            delta = -2  # Consistent struggles -> bigger decrease
        elif has_enough_sessions and all(a > 0.90 for a in last_three):
            delta = 2   # Consistent excellence -> bigger increase

    # Trend-based fine-tuning
    trend = analyze_performance_trend(recent_accuracies)
    if trend == "declining" and weighted_accuracy < 0.70:
        delta = min(delta, -1)  # Ensure decrease on declining trend
        if delta == -1:
            delta = -1  # Could add extra -0.2 but keep integer steps
    elif trend == "improving" and weighted_accuracy > 0.75 and has_enough_sessions:
        if delta == 0:
            delta = 1  # Nudge up if steadily improving even in maintain range

    new_level = current_level + delta
    return _clamp(new_level, 1, 10)


# ─── Session Parameters ──────────────────────────────────────────────────────

def calculate_session_parameters(difficulty_level: int) -> Dict:
    """
    Get session parameters based on difficulty level.
    Returns item count, time limits, and hint availability.
    """
    return {
        "item_count": _clamp(8 + difficulty_level * 2, 10, 30),
        "time_limit_seconds": max(5, 30 - difficulty_level * 2),
        "hints_available": max(0, 5 - difficulty_level // 2),
        "distractor_count": min(3, 1 + difficulty_level // 3),
    }


# ─── Deficit Area Recommendations ────────────────────────────────────────────

def get_recommended_deficit_areas(
    deficits: Dict[str, dict],
    session_history: Dict[str, List[float]],
) -> List[dict]:
    """
    Recommend which deficit areas to focus on next.

    Prioritizes:
    1. Areas with highest severity
    2. Areas with least recent practice
    3. Areas showing improvement (to maintain momentum)
    4. Areas showing decline (to course-correct)
    """
    recommendations = []

    for area, info in deficits.items():
        severity = info.get("severity", 3) if isinstance(info, dict) else 3
        recent = session_history.get(area, [])
        session_count = len(recent)

        # Priority score: higher = more important to practice
        priority = severity * 2  # Severity is most important factor

        # Bonus for under-practiced areas
        if session_count < 3:
            priority += 3
        elif session_count < 5:
            priority += 1

        # Analyze trend for this area
        trend = analyze_performance_trend(recent)

        # Bonus for areas showing decline (needs attention)
        if trend == "declining":
            priority += 2

        # Bonus for areas showing improvement (maintain momentum)
        if trend == "improving" and len(recent) >= 2 and recent[-1] > recent[-2]:
            priority += 1

        # Average accuracy
        avg_accuracy = sum(recent) / len(recent) if recent else 0

        # Penalty for areas that are already well-mastered
        if avg_accuracy > 0.90 and session_count >= 10:
            priority -= 2

        recommendations.append({
            "area": area,
            "severity": severity,
            "priority": max(1, priority),
            "sessions_completed": session_count,
            "avg_accuracy": round(avg_accuracy, 2),
            "trend": trend,
        })

    recommendations.sort(key=lambda x: x["priority"], reverse=True)
    return recommendations


def get_difficulty_preview(
    age: int,
    current_levels: Dict[str, int],
    deficits: Dict[str, dict],
    session_history: Dict[str, List[float]],
) -> Dict[str, dict]:
    """
    Get a preview of recommended difficulty levels across all deficit areas.
    Useful for dashboard display.
    """
    preview = {}
    for area, info in deficits.items():
        severity = info.get("severity", 3) if isinstance(info, dict) else 3
        current_level = current_levels.get(area, 1)
        recent = session_history.get(area, [])

        recommended_level = calculate_difficulty_level(
            age=age,
            deficit_severity=severity,
            current_level=current_level,
            recent_accuracies=recent,
        )

        trend = analyze_performance_trend(recent)
        avg_accuracy = sum(recent) / len(recent) if recent else 0

        preview[area] = {
            "current_level": current_level,
            "recommended_level": recommended_level,
            "recent_accuracy": round(avg_accuracy, 2) if recent else None,
            "trend": trend,
            "sessions_completed": len(recent),
        }

    return preview


# ─── Helpers ──────────────────────────────────────────────────────────────────

def _clamp(value: int, min_val: int, max_val: int) -> int:
    return max(min_val, min(max_val, value))
