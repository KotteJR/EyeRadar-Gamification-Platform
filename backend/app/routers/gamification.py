"""
Gamification endpoints: points, levels, badges, streaks, shop.
"""

from typing import Any, Dict, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.auth import verify_token, verify_student_access
from app.models import GamificationSummary, Badge
from app.services.gamification_service import get_gamification_summary
from app.services.gamification_badges import get_all_badges
from app import database as db

router = APIRouter()


@router.get("/{student_id}/summary", response_model=GamificationSummary)
async def get_summary(
    student_id: str,
    claims: Dict[str, Any] = Depends(verify_token),
):
    """Get full gamification summary for a student."""
    await verify_student_access(claims, student_id)
    summary = await get_gamification_summary(student_id)
    if not summary:
        raise HTTPException(status_code=404, detail="Student not found")
    return summary


@router.get("/{student_id}/badges", response_model=list[Badge])
async def get_student_badges(
    student_id: str,
    claims: Dict[str, Any] = Depends(verify_token),
):
    """Get all badges with earned status for a student."""
    await verify_student_access(claims, student_id)
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


# ─── Shop ─────────────────────────────────────────────────────────────────────


@router.get("/{student_id}/purchases", response_model=List[str])
async def get_purchases(
    student_id: str,
    claims: Dict[str, Any] = Depends(verify_token),
):
    """Return item IDs owned by this student."""
    await verify_student_access(claims, student_id)
    return await db.get_student_purchases(student_id)


class PurchaseRequest(BaseModel):
    item_id: str


class PurchaseResponse(BaseModel):
    item_id: str
    remaining_points: int


@router.post("/{student_id}/purchase", response_model=PurchaseResponse)
async def purchase_shop_item(
    student_id: str,
    body: PurchaseRequest,
    claims: Dict[str, Any] = Depends(verify_token),
):
    """Buy a shop item — deducts points atomically."""
    await verify_student_access(claims, student_id)
    try:
        await db.purchase_item(student_id, body.item_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))

    student = await db.get_student(student_id)
    return PurchaseResponse(
        item_id=body.item_id,
        remaining_points=student["total_points"] if student else 0,
    )
