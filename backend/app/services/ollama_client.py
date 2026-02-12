"""
Unified LLM client — auto-switches between OpenAI and Ollama.

Priority:
  1. If OPENAI_API_KEY is set → use OpenAI
  2. Otherwise → try local Ollama

Two model tiers:
  - HEAVY: stories, comprehension, inference, vocabulary
  - LIGHT: word banks, hints, feedback, simple generation

Falls back gracefully when no LLM is available.
"""

import json
import logging
import os
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ─── Provider Detection ──────────────────────────────────────────────────────

# Explicit override: "openai" | "ollama" | "auto" (default)
LLM_PROVIDER = os.getenv("LLM_PROVIDER", "auto")

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
OPENAI_HEAVY_MODEL = os.getenv("OPENAI_HEAVY_MODEL", "gpt-4o-mini")
OPENAI_LIGHT_MODEL = os.getenv("OPENAI_LIGHT_MODEL", "gpt-4o-mini")

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_HEAVY_MODEL = os.getenv("OLLAMA_HEAVY_MODEL", "llama3.2:8b")
OLLAMA_LIGHT_MODEL = os.getenv("OLLAMA_LIGHT_MODEL", "llama3.2:3b")

REQUEST_TIMEOUT = float(os.getenv("LLM_TIMEOUT", "60"))

# ─── State ────────────────────────────────────────────────────────────────────

_active_provider: str = "none"  # "openai" | "ollama" | "none"
_ollama_models: set[str] = set()
_ollama_reachable: bool = False

HEAVY_MODEL: str = ""
LIGHT_MODEL: str = ""


# ─── Lifecycle ────────────────────────────────────────────────────────────────

async def check_ollama() -> dict:
    """
    Probe available LLM providers on startup. Returns status dict.
    Tries OpenAI first (if key is set), then Ollama.
    """
    global _active_provider, _ollama_models, _ollama_reachable
    global HEAVY_MODEL, LIGHT_MODEL

    _active_provider = "none"
    _ollama_models = set()
    _ollama_reachable = False

    # ── Try OpenAI ────────────────────────────────────────────────────────
    use_openai = (
        (LLM_PROVIDER == "openai") or
        (LLM_PROVIDER == "auto" and bool(OPENAI_API_KEY))
    )

    if use_openai and OPENAI_API_KEY:
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                resp = await client.get(
                    f"{OPENAI_BASE_URL}/models",
                    headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                )
                resp.raise_for_status()

            _active_provider = "openai"
            HEAVY_MODEL = OPENAI_HEAVY_MODEL
            LIGHT_MODEL = OPENAI_LIGHT_MODEL

            logger.info(
                "LLM provider: OpenAI — heavy=%s, light=%s",
                HEAVY_MODEL, LIGHT_MODEL,
            )
            return {
                "status": "ready",
                "provider": "openai",
                "heavy_model": HEAVY_MODEL,
                "heavy_available": True,
                "light_model": LIGHT_MODEL,
                "light_available": True,
            }
        except Exception as exc:
            logger.warning("OpenAI API not reachable: %s", exc)
            if LLM_PROVIDER == "openai":
                # Explicit openai requested but failed
                return {
                    "status": "unavailable",
                    "provider": "openai",
                    "error": str(exc),
                    "heavy_model": OPENAI_HEAVY_MODEL,
                    "light_model": OPENAI_LIGHT_MODEL,
                }

    # ── Try Ollama ────────────────────────────────────────────────────────
    if LLM_PROVIDER in ("ollama", "auto"):
        try:
            async with httpx.AsyncClient(timeout=5) as client:
                resp = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
                resp.raise_for_status()
                data = resp.json()
                _ollama_models = {m["name"] for m in data.get("models", [])}
                _ollama_reachable = True
        except Exception as exc:
            logger.warning("Ollama not reachable: %s", exc)
            return {
                "status": "unavailable",
                "provider": "none",
                "error": str(exc),
                "heavy_model": OLLAMA_HEAVY_MODEL,
                "light_model": OLLAMA_LIGHT_MODEL,
            }

        heavy_ok = OLLAMA_HEAVY_MODEL in _ollama_models
        light_ok = OLLAMA_LIGHT_MODEL in _ollama_models

        if heavy_ok or light_ok:
            _active_provider = "ollama"
            HEAVY_MODEL = OLLAMA_HEAVY_MODEL
            LIGHT_MODEL = OLLAMA_LIGHT_MODEL

            logger.info(
                "LLM provider: Ollama — heavy=%s(%s) light=%s(%s)",
                HEAVY_MODEL, "OK" if heavy_ok else "MISSING",
                LIGHT_MODEL, "OK" if light_ok else "MISSING",
            )
        else:
            logger.warning(
                "Ollama reachable but models missing. "
                "Run: ollama pull %s && ollama pull %s",
                OLLAMA_HEAVY_MODEL, OLLAMA_LIGHT_MODEL,
            )

        return {
            "status": "ready" if (heavy_ok or light_ok) else "models_missing",
            "provider": "ollama",
            "ollama_url": OLLAMA_BASE_URL,
            "heavy_model": OLLAMA_HEAVY_MODEL,
            "heavy_available": heavy_ok,
            "light_model": OLLAMA_LIGHT_MODEL,
            "light_available": light_ok,
            "all_models": sorted(_ollama_models),
        }

    return {
        "status": "unavailable",
        "provider": "none",
        "error": "No LLM provider configured",
    }


def is_available() -> bool:
    """Check if any LLM provider is active."""
    return _active_provider != "none"


def is_model_available(model: str) -> bool:
    """Check if a specific model is available."""
    if _active_provider == "openai":
        return True  # OpenAI models are always available if API key works
    if _active_provider == "ollama":
        return _ollama_reachable and model in _ollama_models
    return False


def is_heavy_available() -> bool:
    return is_available() and (_active_provider == "openai" or is_model_available(HEAVY_MODEL))


def is_light_available() -> bool:
    return is_available() and (_active_provider == "openai" or is_model_available(LIGHT_MODEL))


def get_provider() -> str:
    return _active_provider


# ─── OpenAI Generation ────────────────────────────────────────────────────────

async def _openai_generate(
    prompt: str,
    model: str,
    system: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    json_mode: bool = False,
) -> Optional[str]:
    """Call OpenAI Chat Completions API."""
    messages = []
    if system:
        messages.append({"role": "system", "content": system})
    messages.append({"role": "user", "content": prompt})

    payload: dict = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    if json_mode:
        payload["response_format"] = {"type": "json_object"}

    try:
        async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
            resp = await client.post(
                f"{OPENAI_BASE_URL}/chat/completions",
                headers={
                    "Authorization": f"Bearer {OPENAI_API_KEY}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()
            return data["choices"][0]["message"]["content"].strip()
    except httpx.TimeoutException:
        logger.warning("OpenAI request timed out (model=%s)", model)
        return None
    except Exception as exc:
        logger.warning("OpenAI generation failed: %s", exc)
        return None


# ─── Ollama Generation ────────────────────────────────────────────────────────

async def _ollama_generate(
    prompt: str,
    model: str,
    system: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
    json_mode: bool = False,
) -> Optional[str]:
    """Call Ollama /api/generate endpoint."""
    if not _ollama_reachable or model not in _ollama_models:
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
    if json_mode:
        payload["format"] = "json"

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


# ─── Unified Generation ──────────────────────────────────────────────────────

async def generate(
    prompt: str,
    model: str | None = None,
    system: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> Optional[str]:
    """
    Generate text using the active LLM provider.
    Returns generated text, or None if unavailable.
    """
    model = model or HEAVY_MODEL

    if _active_provider == "openai":
        return await _openai_generate(prompt, model, system, temperature, max_tokens)
    elif _active_provider == "ollama":
        return await _ollama_generate(prompt, model, system, temperature, max_tokens)
    return None


async def generate_json(
    prompt: str,
    model: str | None = None,
    system: str | None = None,
    temperature: float = 0.7,
    max_tokens: int = 1024,
) -> Optional[dict | list]:
    """
    Generate and parse JSON from the active LLM provider.
    Returns parsed JSON or None on failure.
    """
    model = model or HEAVY_MODEL

    if _active_provider == "openai":
        raw = await _openai_generate(
            prompt, model, system, temperature, max_tokens, json_mode=True,
        )
    elif _active_provider == "ollama":
        raw = await _ollama_generate(
            prompt, model, system, temperature, max_tokens, json_mode=True,
        )
    else:
        return None

    if not raw:
        return None

    try:
        return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("LLM returned invalid JSON: %s — raw: %.200s", exc, raw)
        return None


# ─── Convenience helpers ──────────────────────────────────────────────────────

async def heavy(prompt: str, system: str | None = None, **kw) -> Optional[str]:
    """Generate with the heavy model."""
    return await generate(prompt, model=HEAVY_MODEL, system=system, **kw)


async def light(prompt: str, system: str | None = None, **kw) -> Optional[str]:
    """Generate with the light model."""
    return await generate(prompt, model=LIGHT_MODEL, system=system, **kw)


async def heavy_json(prompt: str, system: str | None = None, **kw) -> Optional[dict | list]:
    """Generate JSON with the heavy model."""
    return await generate_json(prompt, model=HEAVY_MODEL, system=system, **kw)


async def light_json(prompt: str, system: str | None = None, **kw) -> Optional[dict | list]:
    """Generate JSON with the light model."""
    return await generate_json(prompt, model=LIGHT_MODEL, system=system, **kw)
