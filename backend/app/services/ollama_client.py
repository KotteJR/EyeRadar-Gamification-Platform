"""
Async client for local Ollama LLM inference.

Two model tiers:
  - HEAVY_MODEL (llama3.2:8b): story generation, comprehension, inference, vocabulary
  - LIGHT_MODEL (llama3.2:3b): word banks, hints, feedback, simple generation

Falls back gracefully when Ollama is unavailable.
"""

import json
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ─── Configuration ────────────────────────────────────────────────────────────

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
HEAVY_MODEL = os.getenv("OLLAMA_HEAVY_MODEL", "llama3.2:8b")
LIGHT_MODEL = os.getenv("OLLAMA_LIGHT_MODEL", "llama3.2:3b")
REQUEST_TIMEOUT = float(os.getenv("OLLAMA_TIMEOUT", "30"))  # seconds

# ─── State ────────────────────────────────────────────────────────────────────

_available_models: set[str] = set()
_ollama_reachable: bool = False


# ─── Lifecycle ────────────────────────────────────────────────────────────────

async def check_ollama() -> dict:
    """
    Probe Ollama on startup. Returns status dict.
    Call this during app lifespan init.
    """
    global _available_models, _ollama_reachable
    _available_models = set()
    _ollama_reachable = False

    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            resp.raise_for_status()
            data = resp.json()
            _available_models = {m["name"] for m in data.get("models", [])}
            _ollama_reachable = True
    except Exception as exc:
        logger.warning("Ollama not reachable: %s", exc)
        return {
            "status": "unavailable",
            "error": str(exc),
            "heavy_model": HEAVY_MODEL,
            "light_model": LIGHT_MODEL,
        }

    heavy_ok = HEAVY_MODEL in _available_models
    light_ok = LIGHT_MODEL in _available_models

    status = {
        "status": "ready" if (heavy_ok or light_ok) else "models_missing",
        "ollama_url": OLLAMA_BASE_URL,
        "heavy_model": HEAVY_MODEL,
        "heavy_available": heavy_ok,
        "light_model": LIGHT_MODEL,
        "light_available": light_ok,
        "all_models": sorted(_available_models),
    }

    if heavy_ok or light_ok:
        logger.info(
            "Ollama ready — heavy=%s(%s) light=%s(%s)",
            HEAVY_MODEL, "OK" if heavy_ok else "MISSING",
            LIGHT_MODEL, "OK" if light_ok else "MISSING",
        )
    else:
        logger.warning(
            "Ollama reachable but models missing. "
            "Run: ollama pull %s && ollama pull %s",
            HEAVY_MODEL, LIGHT_MODEL,
        )

    return status


def is_model_available(model: str) -> bool:
    """Check if a specific model is available."""
    return _ollama_reachable and model in _available_models


def is_heavy_available() -> bool:
    return is_model_available(HEAVY_MODEL)


def is_light_available() -> bool:
    return is_model_available(LIGHT_MODEL)


# ─── Generation ───────────────────────────────────────────────────────────────

async def generate(
    prompt: str,
    model: str | None = None,
    system: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> Optional[str]:
    """
    Send a generation request to Ollama.

    Args:
        prompt: The user prompt.
        model: Which model to use (defaults to HEAVY_MODEL).
        system: Optional system prompt.
        temperature: Sampling temperature.
        max_tokens: Max tokens to generate.

    Returns:
        Generated text, or None if Ollama is unavailable / errors.
    """
    model = model or HEAVY_MODEL

    if not is_model_available(model):
        return None

    payload: dict = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    if system:
        payload["system"] = system

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data.get("response", "").strip()
    except httpx.TimeoutException:
        logger.warning("Ollama request timed out (model=%s)", model)
        return None
    except Exception as exc:
        logger.warning("Ollama generation failed: %s", exc)
        return None


async def generate_json(
    prompt: str,
    model: str | None = None,
    system: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> Optional[dict | list]:
    """
    Generate and parse JSON from Ollama.
    Returns parsed JSON or None on failure.
    """
    model = model or HEAVY_MODEL

    if not is_model_available(model):
        return None

    payload: dict = {
        "model": model,
        "prompt": prompt,
        "stream": False,
        "format": "json",
        "options": {
            "temperature": temperature,
            "num_predict": max_tokens,
        },
    }
    if system:
        payload["system"] = system

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.post(
                f"{OLLAMA_BASE_URL}/api/generate",
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            raw = data.get("response", "").strip()
            return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("Ollama returned invalid JSON: %s", exc)
        return None
    except httpx.TimeoutException:
        logger.warning("Ollama JSON request timed out (model=%s)", model)
        return None
    except Exception as exc:
        logger.warning("Ollama JSON generation failed: %s", exc)
        return None


# ─── Convenience helpers ──────────────────────────────────────────────────────

async def heavy(prompt: str, system: str | None = None, **kw) -> Optional[str]:
    """Generate with the heavy (8b) model."""
    return await generate(prompt, model=HEAVY_MODEL, system=system, **kw)


async def light(prompt: str, system: str | None = None, **kw) -> Optional[str]:
    """Generate with the light (3b) model."""
    return await generate(prompt, model=LIGHT_MODEL, system=system, **kw)


async def heavy_json(prompt: str, system: str | None = None, **kw) -> Optional[dict | list]:
    """Generate JSON with the heavy (8b) model."""
    return await generate_json(prompt, model=HEAVY_MODEL, system=system, **kw)


async def light_json(prompt: str, system: str | None = None, **kw) -> Optional[dict | list]:
    """Generate JSON with the light (3b) model."""
    return await generate_json(prompt, model=LIGHT_MODEL, system=system, **kw)
