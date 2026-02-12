"""
Exercise session management endpoints.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import uuid

from app.models import (
    ExerciseSession,
    ExerciseSessionCreate,
    ExerciseItemSubmission,
    ExerciseItemResult,
    ExerciseRecommendation,
)
from app import database as db
from app.games.game_definitions import get_game, get_games_for_student
from app.services.content_generator import generate_exercise_items
from app.services.adaptive_difficulty import (
    calculate_difficulty_level,
    calculate_session_parameters,
    get_recommended_deficit_areas,
)
from app.services.gamification_service import (
    calculate_session_points,
    calculate_level_info,
    update_streak,
    check_and_award_badges,
)

router = APIRouter()


@router.post("/start", response_model=ExerciseSession)
async def start_session(data: ExerciseSessionCreate):
    """Start a new exercise session."""
    student = await db.get_student(data.student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    game = get_game(data.game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")

    # Calculate difficulty
    deficit_area = game.deficit_area.value
    current_level = student.get("current_levels", {}).get(deficit_area, 1)
    recent_accuracies = await db.get_recent_accuracy_trend(
        data.student_id, deficit_area, limit=5
    )

    severity = 3
    assessment = student.get("assessment")
    if assessment and isinstance(assessment, dict):
        deficits = assessment.get("deficits", {})
        deficit_info = deficits.get(deficit_area, {})
        if isinstance(deficit_info, dict):
            severity = deficit_info.get("severity", 3)

    difficulty = calculate_difficulty_level(
        age=student["age"],
        deficit_severity=severity,
        current_level=current_level,
        recent_accuracies=recent_accuracies,
    )

    # Generate exercise items (AI-enhanced with template fallback)
    params = calculate_session_parameters(difficulty)
    items = await generate_exercise_items(
        game_id=data.game_id,
        difficulty_level=difficulty,
        item_count=params["item_count"],
        student_interests=student.get("interests"),
    )

    session_data = {
        "id": str(uuid.uuid4()),
        "student_id": data.student_id,
        "game_id": data.game_id,
        "game_name": game.name,
        "deficit_area": deficit_area,
        "difficulty_level": difficulty,
        "items": [item.model_dump() for item in items],
        "total_items": len(items),
        "started_at": datetime.utcnow().isoformat(),
        "status": "in_progress",
    }

    result = await db.create_session(session_data)
    return result


@router.get("/{session_id}", response_model=ExerciseSession)
async def get_session(session_id: str):
    """Get an exercise session by ID."""
    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session


@router.post("/{session_id}/submit", response_model=ExerciseItemResult)
async def submit_item(session_id: str, submission: ExerciseItemSubmission):
    """Submit a response for an exercise item."""
    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not in progress")

    # Find the item
    items = session.get("items", [])
    item = None
    for it in items:
        if it.get("index") == submission.item_index:
            item = it
            break

    if item is None:
        raise HTTPException(status_code=404, detail="Item not found")

    # Check answer
    is_correct = submission.student_answer.strip().lower() == item["correct_answer"].strip().lower()
    points = 10 if is_correct else 2  # Participation points even for wrong answers

    result = ExerciseItemResult(
        item_index=submission.item_index,
        is_correct=is_correct,
        student_answer=submission.student_answer,
        correct_answer=item["correct_answer"],
        response_time_ms=submission.response_time_ms,
        points_earned=points,
    )

    # Update session results
    results = session.get("results", [])
    results.append(result.model_dump())
    correct_count = sum(1 for r in results if r.get("is_correct"))

    await db.update_session(session_id, {
        "results": results,
        "correct_count": correct_count,
    })

    return result


@router.post("/{session_id}/complete", response_model=ExerciseSession)
async def complete_session(session_id: str):
    """Complete an exercise session and calculate final scores."""
    session = await db.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session["status"] != "in_progress":
        raise HTTPException(status_code=400, detail="Session is not in progress")

    results = session.get("results", [])
    total_items = session.get("total_items", 0)
    correct_count = sum(1 for r in results if r.get("is_correct"))
    accuracy = correct_count / total_items if total_items > 0 else 0

    response_times = [r.get("response_time_ms", 0) for r in results if r.get("response_time_ms")]
    avg_response_time = sum(response_times) / len(response_times) if response_times else 0

    # Calculate points
    points = calculate_session_points(correct_count, total_items, accuracy)

    # Update student points and XP
    student = await db.get_student(session["student_id"])
    if student:
        new_points = student.get("total_points", 0) + points
        new_xp = student.get("xp", 0) + points
        level_info = calculate_level_info(new_xp)

        # Update current level for the deficit area
        current_levels = student.get("current_levels", {})
        deficit_area = session.get("deficit_area", "")
        if accuracy > 0.85:
            current_levels[deficit_area] = min(10, current_levels.get(deficit_area, 1) + 1)
        elif accuracy < 0.50:
            current_levels[deficit_area] = max(1, current_levels.get(deficit_area, 1) - 1)

        await db.update_student(session["student_id"], {
            "total_points": new_points,
            "xp": new_xp,
            "level": level_info.level,
            "current_levels": current_levels,
        })

        # Update streak
        await update_streak(session["student_id"])

        # Check badges
        badges_earned = await check_and_award_badges(
            session["student_id"],
            {"accuracy": accuracy, "points": points},
        )
    else:
        badges_earned = []

    # Update session
    update_data = {
        "completed_at": datetime.utcnow().isoformat(),
        "correct_count": correct_count,
        "accuracy": round(accuracy, 4),
        "avg_response_time_ms": round(avg_response_time, 2),
        "points_earned": points,
        "badges_earned": badges_earned,
        "status": "completed",
    }

    result = await db.update_session(session_id, update_data)
    return result


@router.get("/student/{student_id}", response_model=list[ExerciseSession])
async def get_student_sessions(student_id: str, deficit_area: str | None = None):
    """Get all sessions for a student."""
    return await db.get_student_sessions(student_id, deficit_area=deficit_area)


@router.get("/recommendations/{student_id}", response_model=list[ExerciseRecommendation])
async def get_recommendations(student_id: str):
    """Get exercise recommendations for a student."""
    student = await db.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    assessment = student.get("assessment")
    if not assessment:
        # No assessment: recommend games by age
        games = get_games_for_student(student["age"])
        return [
            ExerciseRecommendation(
                game_id=g.id,
                game_name=g.name,
                deficit_area=g.deficit_area,
                priority=1,
                reason="Try this game to get started!",
                suggested_difficulty=1,
            )
            for g in games[:6]
        ]

    # Get session history by area
    deficits = assessment.get("deficits", {})
    session_history = {}
    for area in deficits:
        accuracies = await db.get_recent_accuracy_trend(student_id, area, limit=10)
        session_history[area] = accuracies

    # Get recommendations
    area_recs = get_recommended_deficit_areas(deficits, session_history)

    recommendations = []
    for rec in area_recs:
        area = rec["area"]
        games = get_games_for_student(student["age"], [area])
        for game in games[:2]:
            current_level = student.get("current_levels", {}).get(area, 1)
            recommendations.append(
                ExerciseRecommendation(
                    game_id=game.id,
                    game_name=game.name,
                    deficit_area=game.deficit_area,
                    priority=rec["priority"],
                    reason=f"Severity: {rec['severity']}/5, Accuracy: {rec['avg_accuracy']:.0%}",
                    suggested_difficulty=current_level,
                )
            )

    recommendations.sort(key=lambda x: x.priority, reverse=True)
    return recommendations[:10]
