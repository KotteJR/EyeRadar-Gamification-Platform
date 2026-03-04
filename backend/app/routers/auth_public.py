"""
Public auth endpoints (app-managed registration).
"""

import os
import uuid
import base64
import hashlib
from typing import List
from datetime import datetime, timedelta, timezone
import secrets
import smtplib
from email.message import EmailMessage

import stripe
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from cryptography.fernet import Fernet

from app import database as db
from app.services.keycloak_admin import (
    get_keycloak_user_id_by_email,
    is_username_available,
    set_user_password,
)

router = APIRouter()


class ChildDraft(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    username: str = Field(min_length=3, max_length=64)
    temporary_password: str = Field(min_length=8, max_length=128)
    confirm_temporary_password: str = Field(min_length=8, max_length=128)
    age: int = Field(ge=4, le=18)
    grade: int = Field(ge=0, le=12)
    language: str = Field(default="en", min_length=2, max_length=8)


class StartGuardianOnboardingRequest(BaseModel):
    username: str = Field(min_length=3, max_length=64)
    email: str = Field(min_length=5, max_length=254)
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)
    children: List[ChildDraft] = Field(min_length=1, max_length=10)


class ForgotPasswordRequest(BaseModel):
    email: str = Field(min_length=5, max_length=254)


class ResetPasswordRequest(BaseModel):
    token: str = Field(min_length=10, max_length=128)
    code: str = Field(min_length=6, max_length=12)
    new_password: str = Field(min_length=8, max_length=128)
    confirm_password: str = Field(min_length=8, max_length=128)


def _app_base_url() -> str:
    return (
        os.getenv("APP_BASE_URL")
        or os.getenv("FRONTEND_URL")
        or "http://localhost:3000"
    ).rstrip("/")


def _stripe_price_parent_plan() -> str:
    price = os.getenv("STRIPE_PRICE_PARENT_MONTHLY", "")
    if not price:
        raise HTTPException(status_code=503, detail="Parent monthly price not configured")
    return price


def _stripe_price_extra_child() -> str:
    price = os.getenv("STRIPE_PRICE_EXTRA_CHILD", "")
    if not price:
        raise HTTPException(status_code=503, detail="Extra child price not configured")
    return price


def _get_fernet() -> Fernet:
    source = (
        os.getenv("ONBOARDING_ENCRYPTION_KEY")
        or os.getenv("AUTH_SECRET")
        or os.getenv("KEYCLOAK_CLIENT_SECRET")
        or ""
    )
    if not source:
        raise HTTPException(status_code=503, detail="Onboarding encryption is not configured")
    digest = hashlib.sha256(source.encode("utf-8")).digest()
    return Fernet(base64.urlsafe_b64encode(digest))


def _encrypt_password(raw_password: str) -> str:
    f = _get_fernet()
    return f.encrypt(raw_password.encode("utf-8")).decode("utf-8")


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode("utf-8")).hexdigest()


def _is_dev_mode() -> bool:
    return os.getenv("DEV_MODE", "false").lower() in {"1", "true", "yes"}


def _send_reset_email(email: str, reset_link: str, code: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST", "")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_password = os.getenv("SMTP_PASSWORD", "")
    sender = os.getenv("SMTP_FROM_EMAIL", smtp_user or "no-reply@eyeradar.local")
    if not smtp_host or not smtp_user or not smtp_password:
        return False

    msg = EmailMessage()
    msg["Subject"] = "Reset your EyeRadar password"
    msg["From"] = sender
    msg["To"] = email
    msg.set_content(
        "We received a password reset request.\n\n"
        f"Code: {code}\n"
        f"Reset link: {reset_link}\n\n"
        "If you did not request this, you can ignore this email."
    )
    with smtplib.SMTP(smtp_host, smtp_port, timeout=10) as smtp:
        smtp.starttls()
        smtp.login(smtp_user, smtp_password)
        smtp.send_message(msg)
    return True


async def _create_checkout_for_onboarding(
    onboarding_id: str,
    email: str,
    full_name: str,
    child_count: int,
) -> tuple[str, str]:
    stripe_key = os.getenv("STRIPE_SECRET_KEY", "")
    if not stripe_key:
        raise HTTPException(status_code=503, detail="Stripe is not configured")

    stripe.api_key = stripe_key
    line_items = [{"price": _stripe_price_parent_plan(), "quantity": 1}]
    extra_children = max(0, child_count - 1)
    if extra_children > 0:
        line_items.append(
            {"price": _stripe_price_extra_child(), "quantity": extra_children}
        )

    app_base = _app_base_url()
    try:
        session = stripe.checkout.Session.create(
            mode="subscription",
            customer_email=email,
            line_items=line_items,
            success_url=(
                f"{app_base}/register/success"
                f"?onboarding_id={onboarding_id}"
                "&session_id={CHECKOUT_SESSION_ID}"
            ),
            cancel_url=f"{app_base}/register?canceled=1",
            metadata={
                "kind": "guardian_onboarding",
                "onboarding_id": onboarding_id,
                "name": full_name[:120],
                "child_count": str(child_count),
            },
        )
    except stripe.error.StripeError as exc:
        raise HTTPException(
            status_code=400,
            detail=f"Stripe checkout error: {getattr(exc, 'user_message', None) or str(exc)}",
        )
    return session.id, session.url


@router.post("/onboarding/start")
@router.post("/register")
async def start_guardian_onboarding(payload: StartGuardianOnboardingRequest):
    if payload.password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    if "@" not in payload.email or "." not in payload.email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Invalid email address")
    if len(payload.children) < 1:
        raise HTTPException(status_code=400, detail="At least one child is required")
    usernames = [c.username.strip().lower() for c in payload.children]
    if len(set(usernames)) != len(usernames):
        raise HTTPException(status_code=400, detail="Child usernames must be unique")

    email = payload.email.strip().lower()
    existing_app_user = await db.get_user_by_email(email)
    if existing_app_user:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Please sign in instead.",
        )
    existing_kc_user_id = await get_keycloak_user_id_by_email(email)
    if existing_kc_user_id:
        raise HTTPException(
            status_code=409,
            detail="An account with this email already exists. Please sign in instead.",
        )
    first_name = payload.first_name.strip()
    last_name = payload.last_name.strip()
    full_name = f"{first_name} {last_name}".strip()
    username = payload.username.strip()
    for c in payload.children:
        if c.temporary_password != c.confirm_temporary_password:
            raise HTTPException(
                status_code=400,
                detail=f"Temporary passwords do not match for child username '{c.username}'",
            )
    children = [
        {
            "name": c.name.strip(),
            "username": c.username.strip(),
            "age": int(c.age),
            "grade": int(c.grade),
            "language": c.language.strip().lower(),
            "encrypted_temporary_password": _encrypt_password(c.temporary_password),
        }
        for c in payload.children
    ]

    onboarding_id = str(uuid.uuid4())
    checkout_session_id, checkout_url = await _create_checkout_for_onboarding(
        onboarding_id=onboarding_id,
        email=email,
        full_name=full_name,
        child_count=len(children),
    )
    encrypted_password = _encrypt_password(payload.password)

    await db.create_onboarding_session(
        {
            "id": onboarding_id,
            "status": "pending_payment",
            "username": username,
            "email": email,
            "first_name": first_name,
            "last_name": last_name,
            "encrypted_password": encrypted_password,
            "children": children,
            "child_count": len(children),
            "stripe_checkout_session_id": checkout_session_id,
        }
    )

    return {
        "message": "Checkout created",
        "onboarding_id": onboarding_id,
        "checkout_url": checkout_url,
    }


@router.get("/onboarding/{onboarding_id}")
async def get_onboarding_status(onboarding_id: str):
    session = await db.get_onboarding_session(onboarding_id)
    if not session:
        raise HTTPException(status_code=404, detail="Onboarding session not found")
    return {
        "id": session["id"],
        "status": session.get("status"),
        "email": session.get("email"),
        "child_count": int(session.get("child_count") or 1),
        "error_message": session.get("error_message"),
    }


@router.get("/username/availability")
async def username_availability(
    username: str = Query(min_length=3, max_length=64),
):
    candidate = username.strip()
    if len(candidate) < 3:
        raise HTTPException(status_code=400, detail="Username must be at least 3 characters")
    available = await is_username_available(candidate)
    return {
        "username": candidate,
        "available": available,
    }


@router.get("/email/availability")
async def email_availability(
    email: str = Query(min_length=5, max_length=254),
):
    candidate = email.strip().lower()
    if "@" not in candidate or "." not in candidate.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Invalid email address")
    existing_app_user = await db.get_user_by_email(candidate)
    if existing_app_user:
        return {"email": candidate, "available": False}
    existing_kc_user_id = await get_keycloak_user_id_by_email(candidate)
    return {"email": candidate, "available": not bool(existing_kc_user_id)}


@router.post("/password/forgot")
async def forgot_password(payload: ForgotPasswordRequest):
    email = payload.email.strip().lower()
    user = await db.get_user_by_email(email)
    # Always return success shape to avoid account enumeration.
    response = {
        "message": "If an account exists for that email, reset instructions were sent."
    }
    if not user:
        return response

    token_id = str(uuid.uuid4())
    code = f"{secrets.randbelow(1_000_000):06d}"
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=20)
    await db.create_password_reset_token(
        {
            "id": token_id,
            "user_id": user["id"],
            "code_hash": _hash_code(code),
            "expires_at": expires_at,
        }
    )

    app_base = _app_base_url()
    reset_link = f"{app_base}/reset-password?token={token_id}"
    sent = False
    try:
        sent = _send_reset_email(email, reset_link, code)
    except Exception:
        sent = False

    if _is_dev_mode() and not sent:
        response["dev_reset_link"] = reset_link
        response["dev_code"] = code
    return response


@router.post("/password/reset")
async def reset_password(payload: ResetPasswordRequest):
    if payload.new_password != payload.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")

    token = await db.get_password_reset_token(payload.token)
    if not token:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    if token.get("consumed_at"):
        raise HTTPException(status_code=400, detail="Reset token has already been used")

    expires_at = token.get("expires_at")
    if not expires_at:
        raise HTTPException(status_code=400, detail="Invalid reset token")
    if datetime.fromisoformat(expires_at) < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")

    if token.get("code_hash") != _hash_code(payload.code):
        raise HTTPException(status_code=400, detail="Invalid verification code")

    user_id = str(token["user_id"])
    user = await db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found for reset token")

    keycloak_user_id = user.get("keycloak_id")
    if not keycloak_user_id:
        keycloak_user_id = await get_keycloak_user_id_by_email(user.get("email", ""))
    if not keycloak_user_id:
        raise HTTPException(status_code=404, detail="Unable to resolve identity account")

    await set_user_password(
        user_id=keycloak_user_id,
        new_password=payload.new_password,
        temporary=False,
    )
    await db.consume_password_reset_token(payload.token)
    return {"message": "Password reset successful"}
