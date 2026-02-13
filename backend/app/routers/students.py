"""
Student management endpoints.
"""

from fastapi import APIRouter, HTTPException
from datetime import datetime
import uuid

from app.models import Student, StudentCreate, StudentUpdate, EyeRadarAssessment
from app import database as db

router = APIRouter()


@router.post("", response_model=Student)
async def create_student(data: StudentCreate):
    """Create a new student profile."""
    student_data = {
        "id": str(uuid.uuid4()),
        "name": data.name,
        "age": data.age,
        "grade": data.grade,
        "language": data.language,
        "interests": data.interests,
        "diagnostic": data.diagnostic or {},
        "current_levels": {},
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await db.create_student(student_data)
    return result


@router.get("", response_model=list[Student])
async def list_students():
    """List all students."""
    return await db.get_all_students()


@router.get("/{student_id}", response_model=Student)
async def get_student(student_id: str):
    """Get a student by ID."""
    student = await db.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.patch("/{student_id}", response_model=Student)
async def update_student(student_id: str, data: StudentUpdate):
    """Update a student's profile."""
    existing = await db.get_student(student_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Student not found")

    update_data = data.model_dump(exclude_none=True)
    result = await db.update_student(student_id, update_data)
    return result


@router.put("/{student_id}", response_model=Student)
async def upsert_student(student_id: str, data: StudentCreate):
    """Create or update a student by ID (used for auto-provisioning on login)."""
    existing = await db.get_student(student_id)
    if existing:
        update_data = data.model_dump(exclude_none=True)
        result = await db.update_student(student_id, update_data)
        return result

    student_data = {
        "id": student_id,
        "name": data.name,
        "age": data.age,
        "grade": data.grade,
        "language": data.language,
        "interests": data.interests,
        "diagnostic": data.diagnostic or {},
        "current_levels": {},
        "created_at": datetime.utcnow().isoformat(),
    }
    result = await db.create_student(student_data)
    return result


@router.post("/{student_id}/assessment", response_model=Student)
async def import_assessment(student_id: str, assessment: EyeRadarAssessment):
    """Import EyeRadar assessment data for a student."""
    existing = await db.get_student(student_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Student not found")

    assessment_dict = assessment.model_dump()
    assessment_dict["assessment_date"] = assessment.assessment_date.isoformat()
    result = await db.save_assessment(student_id, assessment_dict)
    return result


@router.delete("/{student_id}")
async def delete_student(student_id: str):
    """Delete a student."""
    existing = await db.get_student(student_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Student not found")

    d = await db.get_db()
    await d.execute("DELETE FROM exercise_sessions WHERE student_id = ?", (student_id,))
    await d.execute("DELETE FROM students WHERE id = ?", (student_id,))
    await d.commit()
    return {"message": "Student deleted"}
