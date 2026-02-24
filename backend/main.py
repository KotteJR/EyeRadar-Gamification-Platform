# EyeRadar Dyslexia Exercise Generation System
# Main Application Entry Point

"""
This system generates personalized dyslexia intervention exercises
based on EyeRadar eye-tracking diagnostic data.

LLM support (auto-switches based on environment):
  - OpenAI: set OPENAI_API_KEY env var (used on Railway/cloud)
  - Ollama: local llama3.2 models (used in development)

Author: EyeRadar Team
Version: 1.2.0
"""

import logging
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from app.database import init_db, close_db
from app.routers import students, exercises, games, gamification, analytics, adventures, tts
from app.services.ollama_client import check_ollama

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup application resources"""
    logger.info("Starting EyeRadar API — initializing database...")
    try:
        await init_db()
        app.state.db_ready = True
        logger.info("Database initialized successfully.")
    except Exception as exc:
        app.state.db_ready = False
        logger.error("Database init failed (app will start but DB calls will fail): %s", exc)

    # Probe LLM providers (OpenAI or Ollama) — never let this crash the app
    try:
        llm_status = await check_ollama()
    except Exception as exc:
        logger.error("LLM probe crashed unexpectedly: %s", exc)
        llm_status = {"status": "unavailable", "provider": "none", "error": str(exc)}

    app.state.ollama_status = llm_status

    provider = llm_status.get("provider", "none")
    status = llm_status.get("status", "unknown")

    if status == "ready":
        logger.info(
            "AI content generation ACTIVE via %s (heavy=%s, light=%s)",
            provider.upper(),
            llm_status.get("heavy_model"),
            llm_status.get("light_model"),
        )
    elif status == "models_missing":
        logger.warning(
            "LLM provider %s is running but models not found. "
            "Pull them with:  ollama pull %s && ollama pull %s",
            provider,
            llm_status.get("heavy_model"),
            llm_status.get("light_model"),
        )
    else:
        logger.warning(
            "No LLM available — using template-based content generation. "
            "Set OPENAI_API_KEY for cloud AI or start Ollama for local AI."
        )

    logger.info("EyeRadar API ready on port %s", os.getenv("PORT", "8000"))
    yield
    await close_db()
    logger.info("Database pool closed.")


app = FastAPI(
    title="EyeRadar Dyslexia Exercise API",
    description="AI-powered personalized exercise generation for dyslexia intervention",
    version="1.2.0",
    lifespan=lifespan,
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(students.router, prefix="/api/v1/students", tags=["Students"])
app.include_router(exercises.router, prefix="/api/v1/exercises", tags=["Exercises"])
app.include_router(games.router, prefix="/api/v1/games", tags=["Games"])
app.include_router(
    gamification.router, prefix="/api/v1/gamification", tags=["Gamification"]
)
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
app.include_router(
    adventures.router, prefix="/api/v1/adventures", tags=["Adventures"]
)
app.include_router(tts.router, prefix="/api/v1/tts", tags=["TTS"])


@app.get("/")
async def root():
    return {
        "message": "EyeRadar Dyslexia Exercise API",
        "version": "1.2.0",
        "documentation": "/docs",
    }


@app.get("/health")
async def health_check():
    db_ready = getattr(app.state, "db_ready", False)
    return {
        "status": "healthy" if db_ready else "degraded",
        "db": "connected" if db_ready else "unavailable",
        "ai_provider": getattr(app.state, "ollama_status", {}).get("provider", "none"),
        "ai_status": getattr(app.state, "ollama_status", {}).get("status", "unknown"),
    }


@app.get("/ai-status")
async def ai_status():
    """Check the status of the LLM integration (OpenAI or Ollama)."""
    return getattr(app.state, "ollama_status", {"status": "not_initialized"})


if __name__ == "__main__":
    port = int(os.getenv("PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=True)
