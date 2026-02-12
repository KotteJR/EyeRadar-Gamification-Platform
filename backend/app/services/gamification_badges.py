"""
Badge definitions for the gamification system.
21 badges across 4 categories: Progress, Mastery, Consistency, Special.
"""

from app.models import Badge

BADGES: dict[str, dict] = {
    # ─── Progress Badges ──────────────────────────────────────────────────────
    "first_steps": {
        "name": "First Steps",
        "description": "Complete your first exercise session",
        "icon": "👶",
        "category": "progress",
        "requirement": "Complete 1 session",
    },
    "getting_started": {
        "name": "Getting Started",
        "description": "Complete 5 exercise sessions",
        "icon": "🚶",
        "category": "progress",
        "requirement": "Complete 5 sessions",
    },
    "dedicated_learner": {
        "name": "Dedicated Learner",
        "description": "Complete 25 exercise sessions",
        "icon": "📚",
        "category": "progress",
        "requirement": "Complete 25 sessions",
    },
    "champion": {
        "name": "Champion",
        "description": "Complete 100 exercise sessions",
        "icon": "🏆",
        "category": "progress",
        "requirement": "Complete 100 sessions",
    },

    # ─── Mastery Badges ──────────────────────────────────────────────────────
    "sound_master": {
        "name": "Sound Master",
        "description": "Achieve 90% accuracy in Phonological Awareness exercises",
        "icon": "🔊",
        "category": "mastery",
        "requirement": "90% accuracy in phonological_awareness (5+ sessions)",
    },
    "speed_demon": {
        "name": "Speed Demon",
        "description": "Achieve 90% accuracy in Rapid Naming exercises",
        "icon": "⚡",
        "category": "mastery",
        "requirement": "90% accuracy in rapid_naming (5+ sessions)",
    },
    "memory_champion": {
        "name": "Memory Champion",
        "description": "Achieve 90% accuracy in Working Memory exercises",
        "icon": "🧠",
        "category": "mastery",
        "requirement": "90% accuracy in working_memory (5+ sessions)",
    },
    "eagle_eye": {
        "name": "Eagle Eye",
        "description": "Achieve 90% accuracy in Visual Processing exercises",
        "icon": "🦅",
        "category": "mastery",
        "requirement": "90% accuracy in visual_processing (5+ sessions)",
    },
    "fluent_reader": {
        "name": "Fluent Reader",
        "description": "Achieve 90% accuracy in Reading Fluency exercises",
        "icon": "📖",
        "category": "mastery",
        "requirement": "90% accuracy in reading_fluency (5+ sessions)",
    },
    "comprehension_king": {
        "name": "Comprehension King",
        "description": "Achieve 90% accuracy in Reading Comprehension exercises",
        "icon": "👑",
        "category": "mastery",
        "requirement": "90% accuracy in comprehension (5+ sessions)",
    },

    # ─── Consistency Badges ──────────────────────────────────────────────────
    "three_day_streak": {
        "name": "3-Day Streak",
        "description": "Practice for 3 days in a row",
        "icon": "🔥",
        "category": "consistency",
        "requirement": "3-day streak",
    },
    "week_warrior": {
        "name": "Week Warrior",
        "description": "Practice for 7 days in a row",
        "icon": "⚔️",
        "category": "consistency",
        "requirement": "7-day streak",
    },
    "two_week_champion": {
        "name": "Two Week Champion",
        "description": "Practice for 14 days in a row",
        "icon": "🛡️",
        "category": "consistency",
        "requirement": "14-day streak",
    },
    "month_master": {
        "name": "Month Master",
        "description": "Practice for 30 days in a row",
        "icon": "🌟",
        "category": "consistency",
        "requirement": "30-day streak",
    },

    # ─── Special Badges ──────────────────────────────────────────────────────
    "perfect_score": {
        "name": "Perfect Score",
        "description": "Get 100% accuracy in any exercise session",
        "icon": "💯",
        "category": "special",
        "requirement": "100% accuracy in any session",
    },
    "level_up": {
        "name": "Level Up",
        "description": "Reach level 5",
        "icon": "⬆️",
        "category": "special",
        "requirement": "Reach level 5",
    },
    "level_up_10": {
        "name": "Double Digits",
        "description": "Reach level 10",
        "icon": "🔟",
        "category": "special",
        "requirement": "Reach level 10",
    },
    "all_rounder": {
        "name": "All-Rounder",
        "description": "Complete at least one session in every deficit area",
        "icon": "🎯",
        "category": "special",
        "requirement": "Play all 6 deficit areas",
    },
    "point_collector": {
        "name": "Point Collector",
        "description": "Earn 500 total points",
        "icon": "💰",
        "category": "special",
        "requirement": "Earn 500 points",
    },
    "point_master": {
        "name": "Point Master",
        "description": "Earn 5000 total points",
        "icon": "💎",
        "category": "special",
        "requirement": "Earn 5000 points",
    },
    "speed_learner": {
        "name": "Speed Learner",
        "description": "Complete 5 sessions in one day",
        "icon": "🚀",
        "category": "special",
        "requirement": "5 sessions in one day",
    },
}


def get_all_badges() -> list[Badge]:
    return [
        Badge(id=bid, earned=False, **bdata)
        for bid, bdata in BADGES.items()
    ]


def get_badge(badge_id: str) -> Badge | None:
    bdata = BADGES.get(badge_id)
    if bdata is None:
        return None
    return Badge(id=badge_id, **bdata)
