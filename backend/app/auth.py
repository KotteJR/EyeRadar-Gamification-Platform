"""
Keycloak JWT authentication for FastAPI.

Environment variables required:
  KEYCLOAK_ISSUER     Full realm issuer URL (preferred, e.g. http://localhost:8080/realms/game_dev)
      OR
  KEYCLOAK_URL        Base URL of your Keycloak instance (e.g. http://localhost:8080)
  KEYCLOAK_REALM      Realm name (e.g. game_dev)
  KEYCLOAK_CLIENT_ID  Frontend client ID — used only for logging/context (e.g. eyeradar-frontend)

Token validation strategy:
  - Signature verified against Keycloak JWKS endpoint (RS256)
  - Expiry verified
  - Issuer verified against {KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}
  - Audience check is skipped; Keycloak access tokens include 'account' in aud
    by default and the audience varies by client configuration.
"""

import logging
import os
from typing import Any, Dict, Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwk, jwt

logger = logging.getLogger(__name__)

security = HTTPBearer(auto_error=False)

KEYCLOAK_URL = os.getenv("KEYCLOAK_URL", "")
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "game_dev")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "eyeradar-frontend")
KEYCLOAK_ISSUER = os.getenv("KEYCLOAK_ISSUER", "")

# Simple in-memory cache for the JWKS so we don't hit Keycloak on every request
_jwks_cache: Optional[Dict[str, Any]] = None


def _normalize_url(url: str) -> str:
    return url.rstrip("/")


def _issuer() -> str:
    if KEYCLOAK_ISSUER:
        return _normalize_url(KEYCLOAK_ISSUER)
    if KEYCLOAK_URL and KEYCLOAK_REALM:
        return f"{_normalize_url(KEYCLOAK_URL)}/realms/{KEYCLOAK_REALM}"
    return ""


def _jwks_url() -> str:
    issuer = _issuer()
    if not issuer:
        return ""
    return f"{issuer}/protocol/openid-connect/certs"


def _expected_issuer() -> str:
    return _issuer()


async def _get_jwks() -> Dict[str, Any]:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
    if not _jwks_url():
        logger.warning("Keycloak auth is not configured: missing issuer URL")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            resp = await client.get(_jwks_url())
            resp.raise_for_status()
            _jwks_cache = resp.json()
            return _jwks_cache
    except Exception as exc:
        logger.warning("Failed to fetch JWKS from Keycloak: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Authentication service unavailable",
        )


def _invalidate_jwks_cache() -> None:
    """Call this if a token signature fails — forces re-fetch on next request."""
    global _jwks_cache
    _jwks_cache = None


async def _get_public_key(kid: str) -> str:
    """Find the public key for the given key ID from Keycloak's JWKS endpoint."""
    jwks = await _get_jwks()
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            return jwk.construct(key_data).to_pem().decode()

    # Try once more with a fresh cache in case keys were rotated
    _invalidate_jwks_cache()
    jwks = await _get_jwks()
    for key_data in jwks.get("keys", []):
        if key_data.get("kid") == kid:
            return jwk.construct(key_data).to_pem().decode()

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Unknown token signing key",
    )


async def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Dict[str, Any]:
    """
    Verify a Keycloak-issued JWT and return its claims.
    Raises HTTP 401 if the token is missing, expired, or invalid.
    """
    if not credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    try:
        header = jwt.get_unverified_header(token)
        kid = header.get("kid")
        public_key = await _get_public_key(kid)

        claims = jwt.decode(
            token,
            public_key,
            algorithms=["RS256"],
            options={
                "verify_exp": True,
                "verify_aud": False,  # audience varies by Keycloak client config
            },
        )

        # Manually verify the issuer
        expected = _expected_issuer()
        if expected and claims.get("iss") != expected:
            raise JWTError(f"Invalid issuer: {claims.get('iss')!r}")

        return claims

    except JWTError as exc:
        logger.warning("JWT validation failed: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


async def optional_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[Dict[str, Any]]:
    """
    Like verify_token but returns None instead of raising if no token is present.
    Useful for endpoints that work both authenticated and unauthenticated.
    """
    if not credentials:
        return None
    try:
        return await verify_token(credentials)
    except HTTPException:
        return None


def get_keycloak_user_id(claims: Dict[str, Any]) -> str:
    """Extract the Keycloak user ID (sub) from token claims."""
    return claims.get("sub", "")


def get_keycloak_email(claims: Dict[str, Any]) -> str:
    return claims.get("email", "")


def get_keycloak_full_name(claims: Dict[str, Any]) -> str:
    return claims.get("name", claims.get("preferred_username", ""))


def get_keycloak_roles(claims: Dict[str, Any]) -> list[str]:
    """Extract realm-level roles from token claims."""
    return claims.get("realm_access", {}).get("roles", [])


def require_role(role: str):
    """
    Dependency factory that requires a specific Keycloak realm role.

    Usage:
        @router.get("/admin")
        async def admin(claims=Depends(require_role("teacher"))):
            ...
    """
    async def _check(claims: Dict[str, Any] = Depends(verify_token)) -> Dict[str, Any]:
        if role not in get_keycloak_roles(claims):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{role}' required",
            )
        return claims
    return _check


async def verify_student_access(claims: Dict[str, Any], student_id: str) -> None:
    """
    Verify the caller has access to the given student_id.
    Teachers: unrestricted.  Parents: must be linked.  Students: self only.
    Raises HTTP 403 on denial.
    """
    from app import database as _db

    roles = get_keycloak_roles(claims)
    if "teacher" in roles:
        return

    keycloak_id = get_keycloak_user_id(claims)

    if "student" in roles or "child" in roles:
        student = await _db.get_student_by_keycloak_id(keycloak_id)
        if not student:
            student = await _db.get_student(keycloak_id)
        if student and student["id"] == student_id:
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    if "parent" in roles or "guardian" in roles:
        email = claims.get("email", f"{keycloak_id}@unknown.local")
        full_name = claims.get("name", claims.get("preferred_username", email))
        parent_user = await _db.get_or_create_user(
            keycloak_id=keycloak_id, email=email, full_name=full_name,
        )
        if await _db.parent_has_student(parent_user["id"], student_id):
            return
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")

    raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied")
