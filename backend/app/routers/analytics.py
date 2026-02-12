"""
Analytics and reporting endpoints.
"""

from fastapi import APIRouter, HTTPException
from typing import Optional

from app.models import AnalyticsOverview, DeficitProgress, DeficitArea
from app import database as db

router = APIRouter()


@router.get("/{student_id}/overview", response_model=AnalyticsOverview)
async def get_overview(student_id: str):
    """Get analytics overview for a student."""
    student = await db.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    stats = await db.get_student_stats(student_id)
    sessions = await db.get_student_sessions(student_id, limit=10)

    # Build deficit progress
    deficit_progress = []
    assessment = student.get("assessment")
    areas = [a.value for a in DeficitArea]

    for area in areas:
        area_stats = await db.get_deficit_area_stats(student_id, area)
        accuracy_trend = await db.get_recent_accuracy_trend(student_id, area, limit=10)

        initial_severity = 0
        if assessment and isinstance(assessment, dict):
            deficits = assessment.get("deficits", {})
            deficit_info = deficits.get(area, {})
            if isinstance(deficit_info, dict):
                initial_severity = deficit_info.get("severity", 0)

        deficit_progress.append(DeficitProgress(
            area=DeficitArea(area),
            initial_severity=initial_severity,
            current_level=student.get("current_levels", {}).get(area, 0),
            sessions_completed=area_stats.get("sessions", 0),
            accuracy_trend=accuracy_trend,
            avg_accuracy=round(area_stats.get("avg_accuracy", 0), 4),
        ))

    # Calculate total time (estimate from session count)
    total_sessions = stats.get("total_sessions", 0)
    total_time = total_sessions * 10  # Estimate 10 min per session

    # Determine improvement trend
    recent = sessions[:5] if sessions else []
    older = sessions[5:10] if len(sessions) > 5 else []
    if recent and older:
        recent_avg = sum(s.get("accuracy", 0) for s in recent) / len(recent)
        older_avg = sum(s.get("accuracy", 0) for s in older) / len(older)
        if recent_avg > older_avg + 0.05:
            trend = "improving"
        elif recent_avg < older_avg - 0.05:
            trend = "declining"
        else:
            trend = "stable"
    elif recent:
        trend = "new"
    else:
        trend = "no_data"

    # Format recent sessions for response
    recent_session_data = []
    for s in sessions[:10]:
        recent_session_data.append({
            "id": s.get("id"),
            "game_name": s.get("game_name"),
            "deficit_area": s.get("deficit_area"),
            "accuracy": s.get("accuracy", 0),
            "points_earned": s.get("points_earned", 0),
            "completed_at": s.get("completed_at"),
            "status": s.get("status"),
        })

    return AnalyticsOverview(
        student_id=student_id,
        student_name=student["name"],
        total_sessions=total_sessions,
        total_time_minutes=total_time,
        overall_accuracy=round(stats.get("avg_accuracy", 0), 4),
        deficit_progress=deficit_progress,
        recent_sessions=recent_session_data,
        improvement_trend=trend,
    )


@router.get("/{student_id}/report")
async def get_report(student_id: str):
    """Get a detailed report suitable for educators/parents."""
    student = await db.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")

    stats = await db.get_student_stats(student_id)

    # Build area reports
    area_reports = []
    for area in DeficitArea:
        area_stats = await db.get_deficit_area_stats(student_id, area.value)
        accuracy_trend = await db.get_recent_accuracy_trend(student_id, area.value, limit=20)

        current_level = student.get("current_levels", {}).get(area.value, 0)

        # Determine status
        sessions = area_stats.get("sessions", 0)
        avg_acc = area_stats.get("avg_accuracy", 0)
        if sessions == 0:
            status = "Not started"
        elif avg_acc >= 0.85:
            status = "Excelling"
        elif avg_acc >= 0.70:
            status = "On track"
        elif avg_acc >= 0.50:
            status = "Needs practice"
        else:
            status = "Needs support"

        area_reports.append({
            "area": area.value,
            "area_name": area.value.replace("_", " ").title(),
            "sessions_completed": sessions,
            "current_level": current_level,
            "avg_accuracy": round(avg_acc, 4),
            "accuracy_trend": accuracy_trend,
            "status": status,
        })

    return {
        "student": {
            "id": student["id"],
            "name": student["name"],
            "age": student["age"],
            "grade": student["grade"],
        },
        "summary": {
            "total_sessions": stats.get("total_sessions", 0),
            "completed_sessions": stats.get("completed_sessions", 0),
            "overall_accuracy": round(stats.get("avg_accuracy", 0), 4),
            "total_points": student.get("total_points", 0),
            "level": student.get("level", 1),
            "current_streak": student.get("current_streak", 0),
            "badges_earned": len(student.get("badges", [])),
        },
        "deficit_areas": area_reports,
        "generated_at": __import__("datetime").datetime.utcnow().isoformat(),
    }
