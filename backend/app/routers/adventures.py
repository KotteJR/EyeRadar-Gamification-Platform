"""
Adventure Map API endpoints.

Manages per-student personalized adventure maps:
- CRUD operations for adventure configurations
- AI-assisted adventure suggestion based on diagnostic profile
- Available games listing for the adventure builder
"""

import uuid
from datetime import datetime
from fastapi import APIRouter, HTTPException

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
    get_available_games_for_area,
)

router = APIRouter()


@router.get("/status/all")
async def get_all_adventure_status():
    """Get adventure status for all students (batch). Returns {student_id: {has_adventure, world_count, title}}."""
    statuses = await get_all_adventure_statuses()
    return statuses


@router.post("", response_model=AdventureMap)
async def create_adventure(data: AdventureMapCreate):
    """Create a new adventure map for a student."""
    student = await get_student(data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    # Deactivate any existing active adventures for this student
    existing = await get_student_adventures(data.student_id)
    for adv in existing:
        if adv["status"] == "active":
            await update_adventure_map(adv["id"], {"status": "archived"})

    now = datetime.utcnow().isoformat()
    adventure_data = {
        "id": str(uuid.uuid4()),
        "student_id": data.student_id,
        "created_by": data.created_by,
        "title": data.title,
        "worlds": [w.model_dump() for w in data.worlds],
        "theme_config": data.theme_config.model_dump(),
        "status": "active",
        "created_at": now,
        "updated_at": now,
    }

    result = await create_adventure_map(adventure_data)
    return _to_response(result)


@router.get("/student/{student_id}", response_model=AdventureMap | None)
async def get_student_active_adventure(student_id: str):
    """Get the active adventure map for a student."""
    result = await get_student_adventure(student_id)
    if not result:
        return None
    return _to_response(result)


@router.get("/student/{student_id}/all", response_model=list[AdventureMap])
async def get_all_student_adventures(student_id: str):
    """Get all adventure maps for a student (including archived)."""
    results = await get_student_adventures(student_id)
    return [_to_response(r) for r in results]


@router.get("/{adventure_id}", response_model=AdventureMap)
async def get_adventure(adventure_id: str):
    """Get an adventure map by ID."""
    result = await get_adventure_map(adventure_id)
    if not result:
        raise HTTPException(status_code=404, detail="Adventure not found")
    return _to_response(result)


@router.put("/{adventure_id}", response_model=AdventureMap)
async def update_adventure(adventure_id: str, data: AdventureMapUpdate):
    """Update an adventure map."""
    existing = await get_adventure_map(adventure_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Adventure not found")

    update_data = {}
    if data.title is not None:
        update_data["title"] = data.title
    if data.worlds is not None:
        update_data["worlds"] = [w.model_dump() for w in data.worlds]
    if data.theme_config is not None:
        update_data["theme_config"] = data.theme_config.model_dump()
    if data.status is not None:
        update_data["status"] = data.status
    update_data["updated_at"] = datetime.utcnow().isoformat()

    result = await update_adventure_map(adventure_id, update_data)
    return _to_response(result)


@router.delete("/{adventure_id}")
async def delete_adventure(adventure_id: str):
    """Delete an adventure map."""
    deleted = await delete_adventure_map(adventure_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Adventure not found")
    return {"message": "Adventure deleted"}


@router.post("/suggest", response_model=AdventureSuggestResponse)
async def suggest_adventure_map(data: AdventureSuggestRequest):
    """AI-assisted adventure suggestion based on student diagnostic profile."""
    student = await get_student(data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    suggestion = suggest_adventure(
        student=student,
        dyslexia_type_override=data.dyslexia_type,
        severity_override=data.severity_level,
        age_override=data.age,
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
