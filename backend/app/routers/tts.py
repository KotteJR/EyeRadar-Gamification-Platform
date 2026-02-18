"""
Text-to-Speech endpoint using Microsoft Edge neural voices.
Supports English (en) and Greek (el) with high-quality voices.
"""

import io
import hashlib
import logging
from pathlib import Path
from typing import Optional

import edge_tts
from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse

logger = logging.getLogger(__name__)
router = APIRouter()

VOICE_MAP = {
    "en": "en-US-AriaNeural",
    "en-US": "en-US-AriaNeural",
    "en-GB": "en-GB-SoniaNeural",
    "el": "el-GR-AthinaNeural",
    "el-GR": "el-GR-AthinaNeural",
}

CACHE_DIR = Path(__file__).resolve().parent.parent.parent / ".tts_cache"
CACHE_DIR.mkdir(exist_ok=True)


def _cache_key(text: str, lang: str, rate: str) -> str:
    raw = f"{text}|{lang}|{rate}"
    return hashlib.sha256(raw.encode()).hexdigest()


@router.get("")
async def synthesize_speech(
    text: str = Query(..., min_length=1, max_length=500),
    lang: str = Query("el", description="Language code: en, el, en-US, el-GR"),
    rate: Optional[str] = Query(None, description="Speed adjustment e.g. -10% or +20%"),
):
    """Generate speech audio from text using Microsoft Edge neural voices."""
    voice = VOICE_MAP.get(lang, VOICE_MAP.get(lang.split("-")[0], "en-US-AriaNeural"))
    speed = rate or "+0%"

    cache_file = CACHE_DIR / f"{_cache_key(text, voice, speed)}.mp3"
    if cache_file.exists():
        return StreamingResponse(
            open(cache_file, "rb"),
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=86400"},
        )

    try:
        communicate = edge_tts.Communicate(text, voice, rate=speed)
        buffer = io.BytesIO()
        async for chunk in communicate.stream():
            if chunk["type"] == "audio":
                buffer.write(chunk["data"])

        audio_bytes = buffer.getvalue()

        try:
            cache_file.write_bytes(audio_bytes)
        except Exception:
            pass

        return StreamingResponse(
            io.BytesIO(audio_bytes),
            media_type="audio/mpeg",
            headers={"Cache-Control": "public, max-age=86400"},
        )
    except Exception as exc:
        logger.error("TTS generation failed: %s", exc)
        from fastapi.responses import JSONResponse
        return JSONResponse(
            status_code=500,
            content={"detail": f"TTS generation failed: {str(exc)}"},
        )
