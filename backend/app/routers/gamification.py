"""
Gamification endpoints: points, levels, badges, streaks.
"""

from fastapi import APIRouter, HTTPException

from app.models import GamificationSummary, Badge
from app.services.gamification_service import get_gamification_summary
from app.services.gamification_badges import get_all_badges
from app import database as db

router = APIRouter()


@router.get("/{student_id}/summary", response_model=GamificationSummary)
async def get_summary(student_id: str):
    """Get full gamification summary for a student."""
    summary = await get_gamification_summary(student_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Student not found")
    return summary


@router.get("/{student_id}/badges", response_model=list[Badge])
async def get_student_badges(student_id: str):
    """Get all badges with earned status for a student."""
    student = await db.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    earned = set(student.get("badges", []))
    all_badges = get_all_badges()
    for badge in all_badges:
        badge.earned = badge.id in earned
    return all_badges


@router.get("/badges/all", response_model=list[Badge])
async def list_all_badges():
    """List all available badges."""
    return get_all_badges()
