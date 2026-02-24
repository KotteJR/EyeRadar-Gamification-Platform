"""
Keycloak JWT authentication for FastAPI.

Environment variables required:
  KEYCLOAK_URL        Base URL of your Keycloak instance (e.g. https://auth.example.com)
  KEYCLOAK_REALM      Realm name (e.g. eyeradar)
  KEYCLOAK_CLIENT_ID  Client ID configured in the realm (e.g. eyeradar-backend)
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
KEYCLOAK_REALM = os.getenv("KEYCLOAK_REALM", "eyeradar")
KEYCLOAK_CLIENT_ID = os.getenv("KEYCLOAK_CLIENT_ID", "eyeradar-backend")

# Simple in-memory cache for the JWKS so we don't hit Keycloak on every request
_jwks_cache: Optional[Dict[str, Any]] = None


def _jwks_url() -> str:
    return f"{KEYCLOAK_URL}/realms/{KEYCLOAK_REALM}/protocol/openid-connect/certs"


async def _get_jwks() -> Dict[str, Any]:
    global _jwks_cache
    if _jwks_cache:
        return _jwks_cache
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
            audience=KEYCLOAK_CLIENT_ID,
            options={"verify_exp": True},
        )
        return claims

    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid token: {exc}",
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
