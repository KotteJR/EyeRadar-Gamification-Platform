"""
Student management endpoints.
"""

import asyncio
from datetime import datetime
import uuid
from typing import Any, Dict

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status

from app import database as db
from app.auth import (
    get_keycloak_email,
    get_keycloak_full_name,
    get_keycloak_roles,
    get_keycloak_user_id,
    require_role,
    verify_token,
)
from app.models import EyeRadarAssessment, Student, StudentCreate, StudentUpdate
from app.services.assessment_parser import parse_assessment_file
from app.services.keycloak_admin import create_child_user, ensure_child_user_ready

router = APIRouter()


class ParentChildCreate(StudentCreate):
    username: str
    password: str
    confirm_password: str


async def _db_user_from_claims(claims: Dict[str, Any]) -> Dict[str, Any]:
    keycloak_id = get_keycloak_user_id(claims)
    email = get_keycloak_email(claims) or f"{keycloak_id}@unknown.local"
    full_name = get_keycloak_full_name(claims) or email
    return await db.get_or_create_user(
        keycloak_id=keycloak_id,
        email=email,
        full_name=full_name,
    )


async def _student_record_from_claims(claims: Dict[str, Any]) -> Dict[str, Any] | None:
    """Resolve logged-in student's DB record by Keycloak subject."""
    keycloak_id = get_keycloak_user_id(claims)
    student = await db.get_student_by_keycloak_id(keycloak_id)
    if student:
        return student
    # Backward compatibility for legacy rows where student.id == keycloak sub.
    return await db.get_student(keycloak_id)


async def _repair_child_accounts_for_parent(students: list[Dict[str, Any]]) -> None:
    """
    Best-effort Keycloak normalization for existing linked child users.
    """
    tasks = []
    for student in students:
        keycloak_id = (student.get("keycloak_id") or "").strip()
        username = (student.get("login_username") or "").strip()
        if keycloak_id and username:
            tasks.append(ensure_child_user_ready(user_id=keycloak_id, username=username))
    if tasks:
        await asyncio.gather(*tasks, return_exceptions=True)


@router.post("", response_model=Student)
async def create_student(
    data: StudentCreate,
    claims: Dict[str, Any] = Depends(verify_token),
):
    """Create student. Teacher: unrestricted. Parent: constrained by child slots."""
    roles = get_keycloak_roles(claims)
    created_by = None

    if "teacher" in roles:
        created_by = None
    elif "parent" in roles or "guardian" in roles:
        parent_user = await _db_user_from_claims(claims)
        created_by = parent_user["id"]

        sub = await db.get_user_subscription(parent_user["id"])
        if not sub:
            sub = await db.upsert_subscription(
                parent_user["id"],
                {"plan": "free", "status": "active", "child_slots": 1},
            )

        current_children = await db.get_parent_student_count(parent_user["id"])
        child_slots = int(sub.get("child_slots") or 1)
        if current_children >= child_slots:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail="Child limit reached. Purchase an extra child slot.",
            )
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    student_data = {
        "id": str(uuid.uuid4()),
        "created_by": created_by,
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

    if ("parent" in roles or "guardian" in roles) and created_by:
        await db.link_parent_student(created_by, result["id"])

    return result


@router.get("", response_model=list[Student])
async def list_students(claims: Dict[str, Any] = Depends(verify_token)):
    """Teachers see all students; parents see linked students."""
    roles = get_keycloak_roles(claims)
    is_student_role = "student" in roles or "child" in roles
    if "teacher" in roles:
        return await db.get_all_students()
    if "parent" in roles or "guardian" in roles:
        parent_user = await _db_user_from_claims(claims)
        students = await db.get_parent_students(parent_user["id"])
        await _repair_child_accounts_for_parent(students)
        return students
    if is_student_role:
        me = await _student_record_from_claims(claims)
        return [me] if me else []
    raise HTTPException(status_code=403, detail="Access denied")


@router.get("/parent/mine", response_model=list[Student])
async def list_my_parent_students(claims: Dict[str, Any] = Depends(verify_token)):
    roles = get_keycloak_roles(claims)
    if "parent" not in roles and "guardian" not in roles:
        raise HTTPException(status_code=403, detail="Guardian role required")
    parent_user = await _db_user_from_claims(claims)
    students = await db.get_parent_students(parent_user["id"])
    await _repair_child_accounts_for_parent(students)
    return students


@router.get("/parent/limits")
async def get_parent_limits(claims: Dict[str, Any] = Depends(verify_token)):
    roles = get_keycloak_roles(claims)
    if "parent" not in roles and "guardian" not in roles:
        raise HTTPException(status_code=403, detail="Guardian role required")
    parent_user = await _db_user_from_claims(claims)
    sub = await db.get_user_subscription(parent_user["id"])
    if not sub:
        sub = await db.upsert_subscription(
            parent_user["id"],
            {"plan": "free", "status": "active", "child_slots": 1},
        )
    children_count = await db.get_parent_student_count(parent_user["id"])
    child_slots = int(sub.get("child_slots") or 1)
    return {
        "children_count": children_count,
        "child_slots": child_slots,
        "can_add_child": children_count < child_slots,
        "subscription": sub,
    }


@router.post("/parent/create", response_model=Student)
async def create_parent_student(
    data: ParentChildCreate,
    claims: Dict[str, Any] = Depends(verify_token),
):
    """Create child account for guardian and link to guardian profile."""
    roles = get_keycloak_roles(claims)
    if "parent" not in roles and "guardian" not in roles:
        raise HTTPException(status_code=403, detail="Guardian role required")

    if data.password != data.confirm_password:
        raise HTTPException(status_code=400, detail="Child passwords do not match")

    parent_user = await _db_user_from_claims(claims)
    sub = await db.get_user_subscription(parent_user["id"])
    if not sub:
        sub = await db.upsert_subscription(
            parent_user["id"],
            {"plan": "free", "status": "active", "child_slots": 1},
        )
    current_children = await db.get_parent_student_count(parent_user["id"])
    child_slots = int(sub.get("child_slots") or 1)
    if current_children >= child_slots:
        raise HTTPException(
            status_code=status.HTTP_402_PAYMENT_REQUIRED,
            detail="Child limit reached. Purchase an extra child slot.",
        )

    child_kc_user = await create_child_user(
        username=data.username.strip(),
        temporary_password=data.password,
        first_name=data.name.strip() or "Child",
        last_name="",
    )

    student_data = {
        "id": str(uuid.uuid4()),
        "created_by": parent_user["id"],
        "keycloak_id": child_kc_user["id"],
        "login_username": child_kc_user["username"],
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
    await db.link_parent_student(parent_user["id"], result["id"])
    return result


@router.get("/{student_id}", response_model=Student)
async def get_student(
    student_id: str,
    claims: Dict[str, Any] = Depends(verify_token),
):
    """Teachers any; students self; parents linked students."""
    roles = get_keycloak_roles(claims)
    is_student_role = "student" in roles or "child" in roles
    own_student = await _student_record_from_claims(claims) if is_student_role else None

    if "teacher" in roles:
        pass
    elif is_student_role and own_student and own_student["id"] == student_id:
        pass
    elif "parent" in roles or "guardian" in roles:
        parent_user = await _db_user_from_claims(claims)
        if not await db.parent_has_student(parent_user["id"], student_id):
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    student = await db.get_student(student_id)
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    return student


@router.patch("/{student_id}", response_model=Student)
async def update_student(
    student_id: str,
    data: StudentUpdate,
    claims: Dict[str, Any] = Depends(verify_token),
):
    roles = get_keycloak_roles(claims)
    is_student_role = "student" in roles or "child" in roles
    own_student = await _student_record_from_claims(claims) if is_student_role else None

    if "teacher" in roles:
        pass
    elif is_student_role and own_student and own_student["id"] == student_id:
        pass
    elif "parent" in roles or "guardian" in roles:
        parent_user = await _db_user_from_claims(claims)
        if not await db.parent_has_student(parent_user["id"], student_id):
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    existing = await db.get_student(student_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Student not found")

    update_data = data.model_dump(exclude_none=True)
    return await db.update_student(student_id, update_data)


@router.put("/{student_id}", response_model=Student)
async def upsert_student(
    student_id: str,
    data: StudentCreate,
    claims: Dict[str, Any] = Depends(verify_token),
):
    """Used for student auto-provisioning on login."""
    roles = get_keycloak_roles(claims)
    caller_id = get_keycloak_user_id(claims)
    effective_student_id = student_id
    existing = await db.get_student(student_id)
    if "teacher" not in roles:
        own_student = await _student_record_from_claims(claims)
        if own_student:
            effective_student_id = own_student["id"]
            existing = own_student
        elif caller_id != student_id:
            raise HTTPException(status_code=403, detail="Access denied")

    if existing:
        update_data = data.model_dump(exclude_none=True)
        return await db.update_student(effective_student_id, update_data)

    student_data = {
        "id": effective_student_id,
        "keycloak_id": caller_id if "teacher" not in roles else None,
        "login_username": caller_id if "teacher" not in roles else None,
        "name": data.name,
        "age": data.age,
        "grade": data.grade,
        "language": data.language,
        "interests": data.interests,
        "diagnostic": data.diagnostic or {},
        "current_levels": {},
        "created_at": datetime.utcnow().isoformat(),
    }
    return await db.create_student(student_data)


@router.post("/{student_id}/assessment", response_model=Student)
async def import_assessment(
    student_id: str,
    assessment: EyeRadarAssessment,
    _claims: Dict[str, Any] = Depends(require_role("teacher")),
):
    """Import EyeRadar assessment data for a student (JSON body). Teacher-only."""
    existing = await db.get_student(student_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Student not found")

    assessment_dict = assessment.model_dump()
    assessment_dict["assessment_date"] = assessment.assessment_date.isoformat()
    return await db.save_assessment(student_id, assessment_dict)


@router.post("/{student_id}/assessment/upload", response_model=Student)
async def upload_assessment_file(
    student_id: str,
    file: UploadFile = File(...),
    _claims: Dict[str, Any] = Depends(require_role("teacher")),
):
    """
    Upload any assessment file and extract structured assessment data using AI (GPT-4o).
    Teacher-only.
    """
    existing = await db.get_student(student_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Student not found")

    file_bytes = await file.read()
    content_type = file.content_type or "application/octet-stream"
    filename = file.filename or "upload"

    try:
        assessment_dict = await parse_assessment_file(file_bytes, filename, content_type)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))

    ad = assessment_dict.get("assessment_date")
    if isinstance(ad, datetime):
        assessment_dict["assessment_date"] = ad.isoformat()

    return await db.save_assessment(student_id, assessment_dict)


@router.delete("/{student_id}")
async def delete_student(
    student_id: str,
    claims: Dict[str, Any] = Depends(verify_token),
):
    """Delete student. Teachers any; parents linked students."""
    roles = get_keycloak_roles(claims)
    is_student_role = "student" in roles or "child" in roles
    if "teacher" in roles:
        pass
    elif is_student_role:
        own_student = await _student_record_from_claims(claims)
        if not own_student or own_student["id"] != student_id:
            raise HTTPException(status_code=403, detail="Access denied")
    elif "parent" in roles or "guardian" in roles:
        parent_user = await _db_user_from_claims(claims)
        if not await db.parent_has_student(parent_user["id"], student_id):
            raise HTTPException(status_code=403, detail="Access denied")
    else:
        raise HTTPException(status_code=403, detail="Access denied")

    existing = await db.get_student(student_id)
    if not existing:
        raise HTTPException(status_code=404, detail="Student not found")

    await db.delete_student(student_id)
    return {"message": "Student deleted"}
