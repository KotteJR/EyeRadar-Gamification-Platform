# EyeRadar Dyslexia Exercise Generation System
# Main Application Entry Point

"""
This system generates personalized dyslexia intervention exercises
based on EyeRadar eye-tracking diagnostic data.

Uses local Ollama LLMs for AI-enhanced content generation:
  - qwen3-vl:8b  (heavy): stories, comprehension, inference
  - qwen3-vl:4b  (light): word banks, rhymes, hints

Author: EyeRadar Team
Version: 1.1.0
"""

import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

from app.database import init_db
from app.routers import students, exercises, games, gamification, analytics
from app.services.ollama_client import check_ollama

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize and cleanup application resources"""
    await init_db()

    # Probe local Ollama for AI content generation
    ollama_status = await check_ollama()
    app.state.ollama_status = ollama_status
    if ollama_status["status"] == "ready":
        logger.info("Ollama AI content generation is ACTIVE")
    elif ollama_status["status"] == "models_missing":
        logger.warning(
            "Ollama is running but models not found. "
            "Pull them with:  ollama pull %s && ollama pull %s",
            ollama_status["heavy_model"],
            ollama_status["light_model"],
        )
    else:
        logger.warning(
            "Ollama not available — using template-based content generation. "
            "Start Ollama for AI-enhanced exercises."
        )

    yield


app = FastAPI(
    title="EyeRadar Dyslexia Exercise API",
    description="AI-powered personalized exercise generation for dyslexia intervention",
    version="1.1.0",
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


@app.get("/")
async def root():
    return {
        "message": "EyeRadar Dyslexia Exercise API",
        "version": "1.0.0",
        "documentation": "/docs",
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "ai_content": getattr(app.state, "ollama_status", {}).get("status", "unknown"),
    }


@app.get("/ai-status")
async def ai_status():
    """Check the status of the local Ollama LLM integration."""
    return getattr(app.state, "ollama_status", {"status": "not_initialized"})


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
