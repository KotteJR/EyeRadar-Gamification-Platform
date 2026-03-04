"""
Account/user profile sync endpoints.
"""

from typing import Any, Dict

from fastapi import APIRouter, Depends

from app import database as db
from app.auth import (
    get_keycloak_email,
    get_keycloak_full_name,
    get_keycloak_roles,
    get_keycloak_user_id,
    verify_token,
)

router = APIRouter()


@router.get("/me")
async def sync_and_get_me(claims: Dict[str, Any] = Depends(verify_token)):
    """
    Ensure the authenticated Keycloak user exists in DB and return account snapshot.
    Called by frontend after login to sync Keycloak -> Postgres.
    """
    keycloak_id = get_keycloak_user_id(claims)
    email = get_keycloak_email(claims) or f"{keycloak_id}@unknown.local"
    full_name = get_keycloak_full_name(claims) or email
    roles = get_keycloak_roles(claims)

    user = await db.get_or_create_user(
        keycloak_id=keycloak_id,
        email=email,
        full_name=full_name,
    )

    subscription = await db.get_user_subscription(user["id"])
    if not subscription:
        subscription = await db.upsert_subscription(
            user["id"],
            {
                "plan": "free",
                "status": "active",
                "child_slots": 1,
            },
        )

    parent_student_count = (
        await db.get_parent_student_count(user["id"])
        if ("parent" in roles or "guardian" in roles)
        else 0
    )

    return {
        "user": user,
        "roles": roles,
        "subscription": subscription,
        "parent_student_count": parent_student_count,
    }
