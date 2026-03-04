"""
Keycloak Admin API helpers used for app-managed user registration.
"""

import os
from typing import Any, Dict, Optional

import httpx
from fastapi import HTTPException, status


def _normalize(url: str) -> str:
    return url.rstrip("/")


def keycloak_base_url() -> str:
    url = os.getenv("KEYCLOAK_URL", "")
    issuer = os.getenv("KEYCLOAK_ISSUER", "")
    if url:
        return _normalize(url)
    if issuer and "/realms/" in issuer:
        return _normalize(issuer.split("/realms/")[0])
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Keycloak base URL is not configured",
    )


def keycloak_realm() -> str:
    realm = os.getenv("KEYCLOAK_REALM", "")
    issuer = os.getenv("KEYCLOAK_ISSUER", "")
    if realm:
        return realm
    if issuer and "/realms/" in issuer:
        return issuer.split("/realms/")[-1].strip("/")
    raise HTTPException(
        status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
        detail="Keycloak realm is not configured",
    )


def keycloak_admin_realm() -> str:
    return os.getenv("KEYCLOAK_ADMIN_REALM", "master")


def keycloak_admin_client_id() -> str:
    return os.getenv("KEYCLOAK_ADMIN_CLIENT_ID", "")


def keycloak_admin_client_secret() -> str:
    return os.getenv("KEYCLOAK_ADMIN_CLIENT_SECRET", "")


async def get_admin_access_token() -> str:
    client_id = keycloak_admin_client_id()
    client_secret = keycloak_admin_client_secret()
    if not client_id or not client_secret:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Keycloak admin client credentials are not configured",
        )

    token_url = (
        f"{keycloak_base_url()}/realms/{keycloak_admin_realm()}"
        "/protocol/openid-connect/token"
    )
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(
            token_url,
            data={
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret,
            },
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to authenticate Keycloak admin client ({resp.status_code})",
        )
    payload = resp.json()
    token = payload.get("access_token")
    if not token:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Missing access token from Keycloak admin auth",
        )
    return token


async def _get_user_by_username(token: str, username: str) -> Optional[Dict[str, Any]]:
    url = f"{keycloak_base_url()}/admin/realms/{keycloak_realm()}/users"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"username": username, "exact": "true"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=headers, params=params)
    if resp.status_code >= 400:
        return None
    users = resp.json()
    return users[0] if users else None


async def _get_user_by_email(token: str, email: str) -> Optional[Dict[str, Any]]:
    url = f"{keycloak_base_url()}/admin/realms/{keycloak_realm()}/users"
    headers = {"Authorization": f"Bearer {token}"}
    params = {"email": email, "exact": "true"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=headers, params=params)
    if resp.status_code >= 400:
        return None
    users = resp.json()
    return users[0] if users else None


def _safe_child_email_local_part(username: str, user_id: str) -> str:
    normalized = "".join(
        ch.lower() if (ch.isalnum() or ch in {"-", "_", "."}) else "-"
        for ch in (username or "")
    ).strip(".-_")
    if not normalized:
        normalized = f"child-{user_id[:8]}"
    return f"{normalized}.{user_id[:8]}"


async def _get_user_by_id(token: str, user_id: str) -> Optional[Dict[str, Any]]:
    url = f"{keycloak_base_url()}/admin/realms/{keycloak_realm()}/users/{user_id}"
    headers = {"Authorization": f"Bearer {token}"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.get(url, headers=headers)
    if resp.status_code >= 400:
        return None
    return resp.json()


async def _ensure_child_account_ready(token: str, user_id: str, username: str) -> None:
    """
    Ensure child account can use direct-grant login immediately.
    """
    user = await _get_user_by_id(token, user_id)
    if not user:
        return

    current_username = (user.get("username") or username or "").strip()
    # Some realms enforce profile completeness for direct-grant. Keep child names non-empty.
    first_name = (user.get("firstName") or "").strip() or "Child"
    last_name = (user.get("lastName") or "").strip() or "Child"
    email = (user.get("email") or "").strip()
    if not email:
        local_part = _safe_child_email_local_part(current_username, user_id)
        email = f"{local_part}@children.eyeradar.local"

    payload = {
        "username": current_username,
        "email": email,
        "enabled": True,
        "emailVerified": True,
        "firstName": first_name,
        "lastName": last_name,
        "attributes": user.get("attributes") or {},
        "requiredActions": [],
    }
    url = f"{keycloak_base_url()}/admin/realms/{keycloak_realm()}/users/{user_id}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.put(url, headers=headers, json=payload)
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to finalize child account in Keycloak ({resp.status_code})",
        )


async def assign_realm_role(token: str, user_id: str, role_name: str) -> None:
    base = f"{keycloak_base_url()}/admin/realms/{keycloak_realm()}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

    async with httpx.AsyncClient(timeout=10.0) as client:
        role_resp = await client.get(f"{base}/roles/{role_name}", headers=headers)
        if role_resp.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Realm role '{role_name}' not found in Keycloak",
            )
        role_repr = role_resp.json()

        map_resp = await client.post(
            f"{base}/users/{user_id}/role-mappings/realm",
            headers=headers,
            json=[role_repr],
        )
        if map_resp.status_code >= 400:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail=f"Failed to assign role '{role_name}' to user",
            )


async def create_guardian_user(
    *,
    username: str,
    email: str,
    first_name: str,
    last_name: str,
    password: str,
) -> Dict[str, Any]:
    token = await get_admin_access_token()
    base = f"{keycloak_base_url()}/admin/realms/{keycloak_realm()}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "username": username,
        "email": email,
        "enabled": True,
        "emailVerified": False,
        "firstName": first_name,
        "lastName": last_name,
        "credentials": [
            {
                "type": "password",
                "value": password,
                "temporary": False,
            }
        ],
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(f"{base}/users", headers=headers, json=payload)

    if resp.status_code == 409:
        existing = await _get_user_by_username(token, username)
        if existing and (existing.get("email") or "").lower() == email.lower():
            user_id = existing.get("id")
            if not user_id:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Username or email already exists",
                )
            await assign_realm_role(token, user_id, "guardian")
            return {
                "id": user_id,
                "username": username,
                "email": email,
                "first_name": first_name,
                "last_name": last_name,
            }
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username or email already exists",
        )
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to create user in Keycloak ({resp.status_code})",
        )

    location = resp.headers.get("Location", "")
    user_id = location.rstrip("/").split("/")[-1] if location else ""
    if not user_id:
        existing = await _get_user_by_username(token, username)
        user_id = (existing or {}).get("id", "")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="User created but user ID could not be determined",
        )

    await assign_realm_role(token, user_id, "guardian")
    return {
        "id": user_id,
        "username": username,
        "email": email,
        "first_name": first_name,
        "last_name": last_name,
    }


async def create_child_user(
    *,
    username: str,
    temporary_password: str,
    first_name: str = "",
    last_name: str = "",
) -> Dict[str, Any]:
    token = await get_admin_access_token()
    base = f"{keycloak_base_url()}/admin/realms/{keycloak_realm()}"
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    child_email = f"{_safe_child_email_local_part(username, 'newuser')}@children.eyeradar.local"
    normalized_first_name = (first_name or "").strip() or "Child"
    normalized_last_name = (last_name or "").strip() or "Child"
    payload = {
        "username": username,
        "email": child_email,
        "enabled": True,
        "emailVerified": True,
        "requiredActions": [],
        "firstName": normalized_first_name,
        "lastName": normalized_last_name,
        "credentials": [
            {
                "type": "password",
                "value": temporary_password,
                "temporary": False,
            }
        ],
    }

    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.post(f"{base}/users", headers=headers, json=payload)

    if resp.status_code == 409:
        existing = await _get_user_by_username(token, username)
        user_id = (existing or {}).get("id", "")
        if user_id:
            await _ensure_child_account_ready(token, user_id, username)
            # Ensure the latest provided password always works for this child account.
            await set_user_password(user_id=user_id, new_password=temporary_password, temporary=False)
            await assign_realm_role(token, user_id, "child")
            return {"id": user_id, "username": username}
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Child username '{username}' already exists",
        )
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to create child user in Keycloak ({resp.status_code})",
        )

    location = resp.headers.get("Location", "")
    user_id = location.rstrip("/").split("/")[-1] if location else ""
    if not user_id:
        existing = await _get_user_by_username(token, username)
        user_id = (existing or {}).get("id", "")
    if not user_id:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Child user created but user ID could not be determined",
        )

    # Some realm defaults can still leave users in a not-fully-configured state.
    # Ensure no required actions/profile blockers remain, then set password for direct-grant.
    await _ensure_child_account_ready(token, user_id, username)
    await set_user_password(user_id=user_id, new_password=temporary_password, temporary=False)
    await assign_realm_role(token, user_id, "child")
    return {"id": user_id, "username": username}


async def set_user_password(
    *,
    user_id: str,
    new_password: str,
    temporary: bool = False,
) -> None:
    token = await get_admin_access_token()
    url = (
        f"{keycloak_base_url()}/admin/realms/{keycloak_realm()}/users/{user_id}/reset-password"
    )
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    payload = {
        "type": "password",
        "value": new_password,
        "temporary": temporary,
    }
    async with httpx.AsyncClient(timeout=10.0) as client:
        resp = await client.put(url, headers=headers, json=payload)
    if resp.status_code >= 400:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Failed to update password in Keycloak ({resp.status_code})",
        )


async def get_keycloak_user_id_by_email(email: str) -> Optional[str]:
    token = await get_admin_access_token()
    user = await _get_user_by_email(token, email)
    return (user or {}).get("id")


async def is_username_available(username: str) -> bool:
    normalized = username.strip()
    if not normalized:
        return False
    token = await get_admin_access_token()
    existing = await _get_user_by_username(token, normalized)
    return existing is None


async def ensure_child_user_ready(*, user_id: str, username: str) -> None:
    """
    Public helper to normalize an existing child account for direct-grant login.
    """
    token = await get_admin_access_token()
    await _ensure_child_account_ready(token, user_id, username)
