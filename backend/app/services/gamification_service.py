"""
Gamification service: points, levels, streaks, and badge checking.
"""

from datetime import datetime, date
from typing import Dict, List, Optional, Any
from app.models import LevelInfo, GamificationSummary, Badge
from app.services.gamification_badges import BADGES, get_all_badges
from app import database as db


# ─── Points System ────────────────────────────────────────────────────────────

POINTS_PER_CORRECT = 10
POINTS_PARTICIPATION = 2
ACCURACY_BONUS_THRESHOLD = 0.80
ACCURACY_BONUS_MULTIPLIER = 1.5
PERFECT_SCORE_BONUS = 50
SESSION_COMPLETION_BONUS = 20


def calculate_session_points(
    correct_count: int,
    total_items: int,
    accuracy: float,
) -> int:
    """Calculate points earned for a session."""
    base_points = correct_count * POINTS_PER_CORRECT
    participation = total_items * POINTS_PARTICIPATION

    # Accuracy bonus
    bonus = 0
    if accuracy >= ACCURACY_BONUS_THRESHOLD:
        bonus = int(base_points * (ACCURACY_BONUS_MULTIPLIER - 1))

    # Perfect score bonus
    perfect = PERFECT_SCORE_BONUS if accuracy >= 1.0 else 0

    # Completion bonus
    completion = SESSION_COMPLETION_BONUS

    return base_points + participation + bonus + perfect + completion


# ─── Leveling System ─────────────────────────────────────────────────────────

LEVEL_TITLES = {
    1: "Beginner", 5: "Apprentice", 10: "Reader", 15: "Scholar",
    20: "Expert", 25: "Master", 30: "Champion", 35: "Legend",
    40: "Grandmaster", 45: "Mythic", 50: "Transcendent",
}


def xp_for_level(level: int) -> int:
    """Calculate XP required to reach a given level."""
    return int(100 * (level ** 1.5))


def get_level_title(level: int) -> str:
    """Get the title for a given level."""
    title = "Beginner"
    for threshold, t in sorted(LEVEL_TITLES.items()):
        if level >= threshold:
            title = t
    return title


def calculate_level_info(xp: int) -> LevelInfo:
    """Calculate level info from total XP."""
    level = 1
    while level < 50 and xp >= xp_for_level(level + 1):
        level += 1

    current_xp_threshold = xp_for_level(level)
    next_xp_threshold = xp_for_level(level + 1)
    xp_in_level = xp - current_xp_threshold
    xp_needed = next_xp_threshold - current_xp_threshold
    progress = (xp_in_level / xp_needed * 100) if xp_needed > 0 else 100

    return LevelInfo(
        level=level,
        title=get_level_title(level),
        xp=xp,
        xp_for_next_level=next_xp_threshold,
        progress_percent=round(max(0, min(100, progress)), 1),
    )


# ─── Streak System ───────────────────────────────────────────────────────────

async def update_streak(student_id: str) -> tuple[int, int]:
    """
    Update the student's streak based on today's activity.
    Returns (current_streak, longest_streak).
    """
    student = await db.get_student(student_id)
    if not student:
        return 0, 0

    today = date.today().isoformat()
    last_session_date = student.get("last_session_date")
    current_streak = student.get("current_streak", 0)
    longest_streak = student.get("longest_streak", 0)

    if last_session_date == today:
        # Already played today, no change
        return current_streak, longest_streak

    yesterday = date.today().replace(day=date.today().day - 1) if date.today().day > 1 else date.today()
    yesterday_str = yesterday.isoformat()

    if last_session_date == yesterday_str:
        current_streak += 1
    elif last_session_date is None:
        current_streak = 1
    else:
        current_streak = 1  # Streak broken

    longest_streak = max(longest_streak, current_streak)

    await db.update_student(student_id, {
        "current_streak": current_streak,
        "longest_streak": longest_streak,
        "last_session_date": today,
    })

    return current_streak, longest_streak


# ─── Badge Checking ──────────────────────────────────────────────────────────

async def check_and_award_badges(
    student_id: str,
    session_data: Optional[Dict[str, Any]] = None,
) -> List[str]:
    """
    Check all badge conditions and award new badges.
    Returns list of newly earned badge IDs.
    """
    student = await db.get_student(student_id)
    if not student:
        return []

    current_badges = set(student.get("badges", []))
    new_badges = []
    stats = await db.get_student_stats(student_id)
    total_sessions = stats.get("completed_sessions", 0)
    total_points = student.get("total_points", 0)
    current_streak = student.get("current_streak", 0)
    level = student.get("level", 1)

    # Progress badges
    if total_sessions >= 1 and "first_steps" not in current_badges:
        new_badges.append("first_steps")
    if total_sessions >= 5 and "getting_started" not in current_badges:
        new_badges.append("getting_started")
    if total_sessions >= 25 and "dedicated_learner" not in current_badges:
        new_badges.append("dedicated_learner")
    if total_sessions >= 100 and "champion" not in current_badges:
        new_badges.append("champion")

    # Mastery badges
    mastery_map = {
        "phonological_awareness": "sound_master",
        "rapid_naming": "speed_demon",
        "working_memory": "memory_champion",
        "visual_processing": "eagle_eye",
        "reading_fluency": "fluent_reader",
        "comprehension": "comprehension_king",
    }
    for area, badge_id in mastery_map.items():
        if badge_id not in current_badges:
            area_stats = await db.get_deficit_area_stats(student_id, area)
            if area_stats.get("sessions", 0) >= 5 and area_stats.get("avg_accuracy", 0) >= 0.90:
                new_badges.append(badge_id)

    # Consistency badges
    if current_streak >= 3 and "three_day_streak" not in current_badges:
        new_badges.append("three_day_streak")
    if current_streak >= 7 and "week_warrior" not in current_badges:
        new_badges.append("week_warrior")
    if current_streak >= 14 and "two_week_champion" not in current_badges:
        new_badges.append("two_week_champion")
    if current_streak >= 30 and "month_master" not in current_badges:
        new_badges.append("month_master")

    # Special badges
    if session_data and session_data.get("accuracy", 0) >= 1.0 and "perfect_score" not in current_badges:
        new_badges.append("perfect_score")

    if level >= 5 and "level_up" not in current_badges:
        new_badges.append("level_up")
    if level >= 10 and "level_up_10" not in current_badges:
        new_badges.append("level_up_10")

    if total_points >= 500 and "point_collector" not in current_badges:
        new_badges.append("point_collector")
    if total_points >= 5000 and "point_master" not in current_badges:
        new_badges.append("point_master")

    # All-rounder check
    if "all_rounder" not in current_badges:
        areas_played = set()
        sessions = await db.get_student_sessions(student_id, limit=200)
        for s in sessions:
            if s.get("status") == "completed":
                areas_played.add(s.get("deficit_area"))
        if len(areas_played) >= 6:
            new_badges.append("all_rounder")

    # Save new badges
    if new_badges:
        all_badges = list(current_badges | set(new_badges))
        await db.update_student(student_id, {"badges": all_badges})

    return new_badges


async def get_gamification_summary(student_id: str) -> Optional[GamificationSummary]:
    """Build the full gamification summary for a student."""
    student = await db.get_student(student_id)
    if not student:
        return None

    stats = await db.get_student_stats(student_id)
    level_info = calculate_level_info(student.get("xp", 0))

    # Build badge list with earned status
    earned_badges = set(student.get("badges", []))
    badges = []
    for bid, bdata in BADGES.items():
        badges.append(Badge(
            id=bid,
            earned=bid in earned_badges,
            **bdata,
        ))

    return GamificationSummary(
        student_id=student_id,
        total_points=student.get("total_points", 0) or 0,
        level_info=level_info,
        current_streak=student.get("current_streak", 0) or 0,
        longest_streak=student.get("longest_streak", 0) or 0,
        badges=badges,
        total_sessions=stats.get("completed_sessions") or 0,
        total_correct=stats.get("total_correct") or 0,
    )
