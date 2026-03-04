"""
Stripe billing endpoints for parent subscriptions and extra child slots.
"""

import logging
import os
import uuid
import base64
import hashlib
from datetime import datetime, timezone
from typing import Any, Dict

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from cryptography.fernet import Fernet

logger = logging.getLogger(__name__)

from app import database as db
from app.auth import (
    get_keycloak_email,
    get_keycloak_full_name,
    get_keycloak_roles,
    get_keycloak_user_id,
    verify_token,
)
from app.services.keycloak_admin import create_child_user, create_guardian_user

router = APIRouter()


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


def _decrypt_password(token: str) -> str:
    return _get_fernet().decrypt(token.encode("utf-8")).decode("utf-8")


def _require_parent(claims: Dict[str, Any]) -> None:
    roles = get_keycloak_roles(claims)
    if "parent" not in roles and "guardian" not in roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Guardian role required",
        )


def _require_stripe_env() -> None:
    key = os.getenv("STRIPE_SECRET_KEY", "")
    if not key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe is not configured",
        )
    stripe.api_key = key


def _app_base_url() -> str:
    return (
        os.getenv("APP_BASE_URL")
        or os.getenv("FRONTEND_URL")
        or "http://localhost:3000"
    ).rstrip("/")


def _price_parent_plan() -> str:
    price = os.getenv("STRIPE_PRICE_PARENT_MONTHLY", "")
    if not price:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Parent plan price is not configured",
        )
    return price


def _price_extra_child() -> str:
    price = os.getenv("STRIPE_PRICE_EXTRA_CHILD", "")
    if not price:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Extra child price is not configured",
        )
    return price


async def _get_or_create_user_and_subscription(
    claims: Dict[str, Any],
) -> tuple[Dict[str, Any], Dict[str, Any]]:
    keycloak_id = get_keycloak_user_id(claims)
    email = get_keycloak_email(claims) or f"{keycloak_id}@unknown.local"
    full_name = get_keycloak_full_name(claims) or email

    user = await db.get_or_create_user(
        keycloak_id=keycloak_id,
        email=email,
        full_name=full_name,
    )
    sub = await db.get_user_subscription(user["id"])
    if not sub:
        sub = await db.upsert_subscription(
            user["id"],
            {
                "plan": "free",
                "status": "active",
                "child_slots": 1,
            },
        )
    return user, sub


async def _get_or_create_stripe_customer(
    user: Dict[str, Any],
    subscription: Dict[str, Any],
) -> str:
    customer_id = subscription.get("stripe_customer_id")
    if customer_id:
        return customer_id

    customer = stripe.Customer.create(
        email=user.get("email"),
        name=user.get("full_name"),
        metadata={"db_user_id": str(user["id"])},
    )
    updated = await db.upsert_subscription(
        user["id"],
        {
            "plan": subscription.get("plan", "free"),
            "status": subscription.get("status", "active"),
            "child_slots": subscription.get("child_slots", 1),
            "stripe_customer_id": customer["id"],
            "stripe_subscription_id": subscription.get("stripe_subscription_id"),
            "current_period_end": subscription.get("current_period_end"),
        },
    )
    return updated.get("stripe_customer_id", customer["id"])


@router.get("/summary")
async def get_billing_summary(claims: Dict[str, Any] = Depends(verify_token)):
    _require_parent(claims)
    user, sub = await _get_or_create_user_and_subscription(claims)
    count = await db.get_parent_student_count(user["id"])
    slots = int(sub.get("child_slots") or 1)

    return {
        "subscription": sub,
        "children_count": count,
        "can_add_child": count < slots,
        "slots_remaining": max(0, slots - count),
    }


@router.post("/checkout/parent-plan")
async def create_parent_plan_checkout(claims: Dict[str, Any] = Depends(verify_token)):
    _require_parent(claims)
    _require_stripe_env()
    user, sub = await _get_or_create_user_and_subscription(claims)
    customer_id = await _get_or_create_stripe_customer(user, sub)

    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": _price_parent_plan(), "quantity": 1}],
        success_url=f"{_app_base_url()}/parent?checkout=parent_success",
        cancel_url=f"{_app_base_url()}/parent?checkout=parent_cancel",
        metadata={
            "kind": "parent_plan",
            "db_user_id": str(user["id"]),
        },
    )
    return {"url": session.url}


@router.post("/checkout/add-child-slot")
async def create_add_child_checkout(claims: Dict[str, Any] = Depends(verify_token)):
    _require_parent(claims)
    _require_stripe_env()
    user, sub = await _get_or_create_user_and_subscription(claims)

    # Parent plan must be active before buying extra slots.
    if sub.get("plan") == "free":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Upgrade to Parent plan first",
        )

    customer_id = await _get_or_create_stripe_customer(user, sub)
    # Extra child slots are billed monthly, so this checkout must be a subscription.
    session = stripe.checkout.Session.create(
        mode="subscription",
        customer=customer_id,
        line_items=[{"price": _price_extra_child(), "quantity": 1}],
        success_url=f"{_app_base_url()}/parent?checkout=child_slot_success",
        cancel_url=f"{_app_base_url()}/parent?checkout=child_slot_cancel",
        metadata={
            "kind": "add_child_slot",
            "db_user_id": str(user["id"]),
        },
    )
    return {"url": session.url}


@router.post("/portal")
async def create_billing_portal(claims: Dict[str, Any] = Depends(verify_token)):
    _require_parent(claims)
    _require_stripe_env()
    user, sub = await _get_or_create_user_and_subscription(claims)
    customer_id = await _get_or_create_stripe_customer(user, sub)

    session = stripe.billing_portal.Session.create(
        customer=customer_id,
        return_url=f"{_app_base_url()}/parent",
    )
    return {"url": session.url}


@router.post("/webhook")
async def stripe_webhook(request: Request):
    _require_stripe_env()
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET", "")
    if not webhook_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Stripe webhook secret is not configured",
        )

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe signature")

    try:
        event = stripe.Webhook.construct_event(payload, sig_header, webhook_secret)
    except Exception as exc:
        logger.warning("Stripe webhook signature verification failed: %s", exc)
        raise HTTPException(status_code=400, detail="Invalid webhook signature")

    event_type = event.get("type", "")
    obj = event.get("data", {}).get("object", {})

    if event_type == "checkout.session.completed":
        metadata = obj.get("metadata", {}) or {}
        kind = metadata.get("kind")
        user_id = metadata.get("db_user_id")

        if kind == "guardian_onboarding":
            onboarding_id = metadata.get("onboarding_id")
            if not onboarding_id:
                raise HTTPException(status_code=400, detail="Missing onboarding_id in metadata")

            onboarding = await db.get_onboarding_session(onboarding_id)
            if not onboarding:
                raise HTTPException(status_code=404, detail="Onboarding session not found")

            if onboarding.get("status") == "completed":
                return {"received": True}

            try:
                await db.update_onboarding_session(
                    onboarding_id,
                    {
                        "status": "processing",
                        "stripe_customer_id": obj.get("customer"),
                        "stripe_subscription_id": obj.get("subscription"),
                    },
                )

                password = _decrypt_password(onboarding["encrypted_password"])
                kc_user = await create_guardian_user(
                    username=onboarding["username"],
                    email=onboarding["email"],
                    first_name=onboarding["first_name"],
                    last_name=onboarding["last_name"],
                    password=password,
                )

                full_name = f"{onboarding['first_name']} {onboarding['last_name']}".strip()
                app_user = await db.get_or_create_user(
                    keycloak_id=kc_user["id"],
                    email=kc_user["email"],
                    full_name=full_name,
                )

                children = onboarding.get("children") or []
                for child in children:
                    child_password = _decrypt_password(
                        child.get("encrypted_temporary_password", "")
                    )
                    child_username = (child.get("username") or "").strip()
                    if not child_username:
                        raise HTTPException(
                            status_code=400,
                            detail="Child username is required in onboarding payload",
                        )
                    child_kc_user = await create_child_user(
                        username=child_username,
                        temporary_password=child_password,
                        first_name=child.get("name", "Child"),
                        last_name="",
                    )
                    student = await db.create_student(
                        {
                            "id": str(uuid.uuid4()),
                            "created_by": app_user["id"],
                            "keycloak_id": child_kc_user["id"],
                            "login_username": child_kc_user["username"],
                            "name": child.get("name", "Child"),
                            "age": int(child.get("age") or 8),
                            "grade": int(child.get("grade") or 3),
                            "language": child.get("language", "en"),
                            "interests": [],
                            "diagnostic": {},
                            "current_levels": {},
                        }
                    )
                    await db.link_parent_student(app_user["id"], student["id"])

                child_slots = max(1, int(onboarding.get("child_count") or 1))
                await db.upsert_subscription(
                    app_user["id"],
                    {
                        "stripe_customer_id": obj.get("customer"),
                        "stripe_subscription_id": obj.get("subscription"),
                        "plan": "guardian",
                        "status": "active",
                        "child_slots": child_slots,
                    },
                )

                await db.update_onboarding_session(
                    onboarding_id,
                    {
                        "status": "completed",
                        "keycloak_user_id": kc_user["id"],
                        "db_user_id": app_user["id"],
                        "completed_at": datetime.now(timezone.utc),
                        "error_message": None,
                    },
                )
            except Exception as exc:
                await db.update_onboarding_session(
                    onboarding_id,
                    {
                        "status": "failed",
                        "error_message": str(exc)[:1000],
                    },
                )
                raise
            return {"received": True}

        if user_id:
            existing = await db.get_user_subscription(user_id)
            if not existing:
                existing = await db.upsert_subscription(
                    user_id, {"plan": "free", "status": "active", "child_slots": 1}
                )

            if kind == "parent_plan":
                await db.upsert_subscription(
                    user_id,
                    {
                        "stripe_customer_id": obj.get("customer"),
                        "stripe_subscription_id": obj.get("subscription"),
                        "plan": "guardian",
                        "status": "active",
                        "child_slots": max(1, int(existing.get("child_slots") or 1)),
                        "current_period_end": existing.get("current_period_end"),
                    },
                )
            elif kind == "add_child_slot":
                await db.increment_child_slots(user_id, increment=1)

    elif event_type in ("customer.subscription.updated", "customer.subscription.deleted"):
        stripe_sub_id = obj.get("id")
        if stripe_sub_id:
            sub = await db.get_subscription_by_stripe_subscription_id(stripe_sub_id)
            if sub:
                period_end_ts = obj.get("current_period_end")
                period_end = (
                    datetime.fromtimestamp(period_end_ts, tz=timezone.utc)
                    if period_end_ts
                    else None
                )
                is_deleted = event_type == "customer.subscription.deleted"
                await db.upsert_subscription(
                    sub["user_id"],
                    {
                        "stripe_customer_id": obj.get("customer"),
                        "stripe_subscription_id": stripe_sub_id,
                        "plan": "free" if is_deleted else (sub.get("plan") or "guardian"),
                        "status": "canceled" if is_deleted else obj.get("status", "active"),
                        "child_slots": 1 if is_deleted else max(1, int(sub.get("child_slots") or 1)),
                        "current_period_end": period_end,
                    },
                )

    return {"received": True}
