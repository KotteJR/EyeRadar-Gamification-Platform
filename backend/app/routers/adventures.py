"""
Adventure Map API endpoints.

Manages per-student personalized adventure maps:
- CRUD operations for adventure configurations
- AI-assisted adventure suggestion based on diagnostic profile
- Available games listing for the adventure builder
"""

import logging
import uuid
from datetime import datetime
from typing import Any, Dict
from fastapi import APIRouter, Depends, HTTPException

logger = logging.getLogger(__name__)

from app.models import (
    AdventureMap,
    AdventureMapCreate,
    AdventureMapUpdate,
    AdventureSuggestRequest,
    AdventureSuggestResponse,
)
from app.database import (
    create_adventure_map,
    get_adventure_map,
    get_student_adventure,
    get_student_adventures,
    get_all_adventure_statuses,
    update_adventure_map,
    delete_adventure_map,
    get_student,
)
from app.services.adventure_builder import (
    suggest_adventure,
    suggest_adventure_ai,
    get_available_games_for_area,
)
from app.games.game_definitions import get_all_games
from app.auth import verify_token, require_role, verify_student_access

router = APIRouter()


def _normalize_worlds_input(worlds: list) -> list:
    """Keep only worlds with valid, unique game IDs and reindex world numbers."""
    valid_game_ids = {g.id for g in get_all_games()}
    disallowed_game_ids = {"castle_challenge", "dungeon_forest", "dungeon_beach", "dungeon_3stage"}
    normalized = []
    for idx, world in enumerate(worlds):
        # Accept both pydantic model and dict-like values
        raw = world.model_dump() if hasattr(world, "model_dump") else dict(world)
        unique_ids = []
        seen = set()
        for gid in raw.get("game_ids", []) or []:
            if gid in disallowed_game_ids:
                continue
            if gid in valid_game_ids and gid not in seen:
                unique_ids.append(gid)
                seen.add(gid)
        if not unique_ids:
            continue
        raw["game_ids"] = unique_ids
        raw["world_number"] = len(normalized) + 1
        normalized.append(raw)
    return normalized


@router.get("/status/all")
async def get_all_adventure_status(
    _claims: Dict[str, Any] = Depends(require_role("teacher")),
):
    """Get adventure status for all students (batch). Teacher-only."""
    statuses = await get_all_adventure_statuses()
    return statuses


@router.post("", response_model=AdventureMap)
async def create_adventure(
    data: AdventureMapCreate,
    _claims: Dict[str, Any] = Depends(verify_token),
):
    """Create a new adventure map for a student."""
    await verify_student_access(_claims, data.student_id)
    student = await get_student(data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Deactivate any existing active adventures for this student
    existing = await get_student_adventures(data.student_id)
    for adv in existing:
        if adv["status"] == "active":
            await update_adventure_map(adv["id"], {"status": "archived"})

    now = datetime.utcnow().isoformat()
    normalized_worlds = _normalize_worlds_input(data.worlds)
    if not normalized_worlds:
        raise HTTPException(status_code=400, detail="Adventure must include at least one world with selected games")
    adventure_data = {
        "id": str(uuid.uuid4()),
        "student_id": data.student_id,
        "created_by": data.created_by,
        "title": data.title,
        "worlds": normalized_worlds,
        "theme_config": data.theme_config.model_dump(),
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    result = await create_adventure_map(adventure_data)
    return _to_response(result)


@router.get("/student/{student_id}", response_model=AdventureMap | None)
async def get_student_active_adventure(
    student_id: str,
    _claims: Dict[str, Any] = Depends(verify_token),
):
    """Get the active adventure map for a student."""
    await verify_student_access(_claims, student_id)
    result = await get_student_adventure(student_id)
    if not result:
        return None
    return _to_response(result)


@router.get("/student/{student_id}/all", response_model=list[AdventureMap])
async def get_all_student_adventures(
    student_id: str,
    _claims: Dict[str, Any] = Depends(verify_token),
):
    """Get all adventure maps for a student (including archived)."""
    await verify_student_access(_claims, student_id)
    results = await get_student_adventures(student_id)
    return [_to_response(r) for r in results]


@router.get("/{adventure_id}", response_model=AdventureMap)
async def get_adventure(
    adventure_id: str,
    _claims: Dict[str, Any] = Depends(verify_token),
):
    """Get an adventure map by ID."""
    result = await get_adventure_map(adventure_id)
    if not result:
        raise HTTPException(status_code=404, detail="Adventure not found")
    await verify_student_access(_claims, result["student_id"])
    return _to_response(result)


@router.put("/{adventure_id}", response_model=AdventureMap)
async def update_adventure(
    adventure_id: str,
    data: AdventureMapUpdate,
    _claims: Dict[str, Any] = Depends(verify_token),
):
    """Update an adventure map."""
    existing = await get_adventure_map(adventure_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Adventure not found")
    await verify_student_access(_claims, existing["student_id"])

    update_data = {}
    if data.title is not None:
        update_data["title"] = data.title
    if data.worlds is not None:
        normalized_worlds = _normalize_worlds_input(data.worlds)
        if not normalized_worlds:
            raise HTTPException(status_code=400, detail="Adventure must include at least one world with selected games")
        update_data["worlds"] = normalized_worlds
    if data.theme_config is not None:
        update_data["theme_config"] = data.theme_config.model_dump()
    if data.status is not None:
        update_data["status"] = data.status
    update_data["updated_at"] = datetime.utcnow().isoformat()

    result = await update_adventure_map(adventure_id, update_data)
    return _to_response(result)


@router.delete("/{adventure_id}")
async def delete_adventure(
    adventure_id: str,
    _claims: Dict[str, Any] = Depends(verify_token),
):
    """Delete an adventure map."""
    existing = await get_adventure_map(adventure_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Adventure not found")
    await verify_student_access(_claims, existing["student_id"])
    await delete_adventure_map(adventure_id)
    return {"message": "Adventure deleted"}


@router.post("/suggest", response_model=AdventureSuggestResponse)
async def suggest_adventure_map(
    data: AdventureSuggestRequest,
    _claims: Dict[str, Any] = Depends(verify_token),
):
    """
    Generate a personalized adventure map for a student.
    Uses GPT-4o when OPENAI_API_KEY is set, falls back to template-based selection.
    """
    await verify_student_access(_claims, data.student_id)
    student = await get_student(data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Try GPT-4o first
    suggestion = await suggest_adventure_ai(
        student=student,
        dyslexia_type_override=data.dyslexia_type,
        severity_override=data.severity_level,
        age_override=data.age,
    )

    if suggestion is None:
        logger.info(
            "GPT-4o unavailable for student %s — using template-based selection",
            data.student_id,
        )
        try:
            suggestion = suggest_adventure(
                student=student,
                dyslexia_type_override=data.dyslexia_type,
                severity_override=data.severity_level,
                age_override=data.age,
            )
        except Exception as exc:
            logger.error(
                "Template adventure suggestion failed for student %s: %s",
                data.student_id, exc,
            )
            raise HTTPException(
                status_code=500,
                detail="Adventure suggestion failed",
            )

    return AdventureSuggestResponse(
        suggested_worlds=suggestion["suggested_worlds"],
        reasoning=suggestion["reasoning"],
        theme_config=suggestion["theme_config"],
    )


@router.get("/games-for-area/{area}")
async def get_games_for_area(area: str, age: int = 8, severity: str | None = None):
    """Get available games for a specific deficit area, filtered by age/severity."""
    try:
        games = get_available_games_for_area(area, age, severity)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid deficit area: {area}")
    return games


def _to_response(data: dict) -> AdventureMap:
    """Convert raw DB dict to AdventureMap response."""
    from app.models import AdventureWorld, AdventureThemeConfig

    worlds = []
    for w in data.get("worlds", []):
        if isinstance(w, dict):
            worlds.append(AdventureWorld(**w))
        else:
            worlds.append(w)

    theme = data.get("theme_config", {})
    if isinstance(theme, dict):
        theme = AdventureThemeConfig(**theme)

    return AdventureMap(
        id=data["id"],
        student_id=data["student_id"],
        created_by=data.get("created_by"),
        title=data.get("title", "My Adventure"),
        worlds=worlds,
        theme_config=theme,
        status=data.get("status", "active"),
        created_at=data.get("created_at", ""),
        updated_at=data.get("updated_at", ""),
    )
