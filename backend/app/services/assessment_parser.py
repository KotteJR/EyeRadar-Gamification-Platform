"""
AI-powered assessment parser.

Accepts any file format (PDF, image, Word doc, plain text, JSON, CSV, etc.)
and extracts a structured EyeRadarAssessment using GPT-4o.

JSON files bypass AI entirely — they are parsed and normalised directly.
All other types are sent to GPT-4o (text model or vision model for images).
"""

import base64
import json
import logging
import os
from datetime import datetime, timezone
from typing import Optional

import httpx

logger = logging.getLogger(__name__)

# ─── Schema hint for the AI prompt ───────────────────────────────────────────

_SCHEMA = """{
  "assessment_date": "<ISO 8601 datetime, e.g. '2024-03-15T10:00:00Z'>",
  "overall_severity": <1–5 integer, 1=mild, 5=severe>,
  "deficits": {
    "phonological_awareness": {"severity": <1–5>, "percentile": <0–100>},
    "rapid_naming":           {"severity": <1–5>, "percentile": <0–100>},
    "working_memory":         {"severity": <1–5>, "percentile": <0–100>},
    "visual_processing":      {"severity": <1–5>, "percentile": <0–100>},
    "reading_fluency":        {"severity": <1–5>, "percentile": <0–100>},
    "comprehension":          {"severity": <1–5>, "percentile": <0–100>}
  },
  "reading_metrics": {
    "fixation_duration_ms":      <float, typical 150–500>,
    "fixation_count_per_line":   <float, typical 3–20>,
    "regression_rate":           <float 0.0–1.0, fraction NOT percentage>,
    "words_per_minute":          <float, typical 30–250>
  }
}"""

_SYSTEM_PROMPT = f"""You are an expert educational psychologist and reading specialist.
You analyse clinical assessment reports for dyslexia and reading difficulties and map them to a structured schema.

TARGET SCHEMA (return ONLY valid JSON matching this exactly — no extra keys):
{_SCHEMA}

FIELD RULES:
- assessment_date   : Use the date from the report. If absent, use today in ISO format.
- overall_severity  : 1=mild, 2=low-moderate, 3=moderate, 4=high-moderate, 5=severe.
                      Infer from narrative descriptions when no explicit score is given.
- deficits.*.severity     : 1–5, same scale. Infer from test scores / narrative.
- deficits.*.percentile   : 0–100, LOWER = worse performance.
  • Standard scores (mean=100, SD=15): percentile ≈ convert via normal distribution.
  • Z-scores: percentile ≈ norm.cdf(z)*100.
  • If a deficit area is not mentioned, estimate from overall profile.
- reading_metrics.regression_rate : MUST be 0.0–1.0 (a fraction, NOT a percentage).
  • If the report says "25% regressions", output 0.25.
- For any missing metrics, make reasonable clinical estimates based on the available data.

Return ONLY the JSON object. No explanation, no markdown fences."""


# ─── PDF text extraction ─────────────────────────────────────────────────────

def _extract_pdf_text(file_bytes: bytes) -> str:
    """Extract plain text from a PDF using pypdf."""
    try:
        import io
        import pypdf  # type: ignore

        reader = pypdf.PdfReader(io.BytesIO(file_bytes))
        pages = [p.extract_text() or "" for p in reader.pages]
        return "\n\n".join(p for p in pages if p.strip())
    except ImportError:
        logger.warning("pypdf not installed — cannot extract PDF text")
        return ""
    except Exception as exc:
        logger.warning("PDF text extraction failed: %s", exc)
        return ""


# ─── OpenAI helpers ──────────────────────────────────────────────────────────

async def _openai_text(
    content: str,
    api_key: str,
    base_url: str,
    model: str,
) -> Optional[dict]:
    """Send text content to GPT-4o and parse JSON response."""
    user_msg = (
        "Below is the full text of an assessment report. "
        "Extract all relevant data and return JSON matching the schema.\n\n"
        f"{content[:14000]}"
    )
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        "temperature": 0.15,
        "max_tokens": 1200,
        "response_format": {"type": "json_object"},
    }
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"].strip()
            return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("GPT-4o returned invalid JSON for text extraction: %s", exc)
        return None
    except Exception as exc:
        logger.warning("OpenAI text extraction failed: %s", exc)
        return None


async def _openai_vision(
    image_bytes: bytes,
    mime_type: str,
    api_key: str,
    base_url: str,
    model: str,
) -> Optional[dict]:
    """Send a base64-encoded image to GPT-4o vision and parse JSON response."""
    b64 = base64.b64encode(image_bytes).decode()
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{mime_type};base64,{b64}",
                            "detail": "high",
                        },
                    },
                    {
                        "type": "text",
                        "text": (
                            "This image contains an assessment report. "
                            "Extract all relevant data and return JSON matching the schema."
                        ),
                    },
                ],
            },
        ],
        "temperature": 0.15,
        "max_tokens": 1200,
        "response_format": {"type": "json_object"},
    }
    try:
        async with httpx.AsyncClient(timeout=90) as client:
            resp = await client.post(
                f"{base_url}/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=payload,
            )
            resp.raise_for_status()
            raw = resp.json()["choices"][0]["message"]["content"].strip()
            return json.loads(raw)
    except json.JSONDecodeError as exc:
        logger.warning("GPT-4o returned invalid JSON for vision extraction: %s", exc)
        return None
    except Exception as exc:
        logger.warning("OpenAI vision extraction failed: %s", exc)
        return None


# ─── Normalisation ────────────────────────────────────────────────────────────

_DEFICIT_AREAS = [
    "phonological_awareness",
    "rapid_naming",
    "working_memory",
    "visual_processing",
    "reading_fluency",
    "comprehension",
]


def _normalize(raw: dict) -> dict:
    """Clamp, fill defaults, and ensure the dict matches the EyeRadarAssessment schema."""
    now = datetime.now(timezone.utc).isoformat()

    # assessment_date
    if not raw.get("assessment_date"):
        raw["assessment_date"] = now

    # overall_severity
    raw["overall_severity"] = max(1, min(5, int(raw.get("overall_severity", 3))))

    # deficits
    deficits: dict = raw.get("deficits", {})
    default_sev = raw["overall_severity"]
    default_pct = max(5, 35 - default_sev * 6)  # rough inverse mapping
    for area in _DEFICIT_AREAS:
        d = deficits.get(area, {})
        deficits[area] = {
            "severity": max(1, min(5, int(d.get("severity", default_sev)))),
            "percentile": max(0, min(100, int(d.get("percentile", default_pct)))),
        }
    raw["deficits"] = deficits

    # reading_metrics
    m: dict = raw.get("reading_metrics", {})
    # regression_rate: convert from percentage if someone passed > 1
    rr = float(m.get("regression_rate", 0.25))
    if rr > 1.0:
        rr = rr / 100.0
    raw["reading_metrics"] = {
        "fixation_duration_ms": float(m.get("fixation_duration_ms") or 250.0),
        "fixation_count_per_line": float(m.get("fixation_count_per_line") or 10.0),
        "regression_rate": max(0.0, min(1.0, rr)),
        "words_per_minute": float(m.get("words_per_minute") or 80.0),
    }

    return raw


# ─── Public API ───────────────────────────────────────────────────────────────

_IMAGE_EXTS = {"png", "jpg", "jpeg", "webp", "gif", "bmp", "tiff", "tif"}
_IMAGE_MIMES = {
    "image/png", "image/jpeg", "image/webp",
    "image/gif", "image/bmp", "image/tiff",
}


async def parse_assessment_file(
    file_bytes: bytes,
    filename: str,
    content_type: str,
) -> dict:
    """
    Parse any assessment file and return a dict matching the EyeRadarAssessment schema.

    - JSON  → parse directly, no AI required
    - PDF   → extract text → GPT-4o
    - Image → GPT-4o vision (base64)
    - Text  → GPT-4o (plain text content)

    Raises ValueError with a user-friendly message on failure.
    """
    from app.services.ollama_client import OPENAI_API_KEY, OPENAI_BASE_URL  # avoid circular

    model = os.getenv("ASSESSMENT_AI_MODEL", "gpt-4o")
    fname_lower = filename.lower()
    ext = fname_lower.rsplit(".", 1)[-1] if "." in fname_lower else ""
    mime = (content_type or "application/octet-stream").lower().split(";")[0].strip()

    # ── JSON: no AI needed ────────────────────────────────────────────────
    if ext == "json" or mime == "application/json":
        try:
            raw = json.loads(file_bytes.decode("utf-8"))
            return _normalize(raw)
        except (json.JSONDecodeError, UnicodeDecodeError) as exc:
            raise ValueError(f"Invalid JSON file: {exc}") from exc

    # Everything else requires OpenAI
    if not OPENAI_API_KEY:
        raise ValueError(
            "An OpenAI API key is required to extract data from non-JSON files. "
            "Set the OPENAI_API_KEY environment variable, or upload a JSON file instead."
        )

    # ── Image: GPT-4o vision ──────────────────────────────────────────────
    if ext in _IMAGE_EXTS or mime in _IMAGE_MIMES:
        # normalise mime for data URI
        img_mime = mime if mime in _IMAGE_MIMES else f"image/{ext.replace('jpg', 'jpeg')}"
        result = await _openai_vision(file_bytes, img_mime, OPENAI_API_KEY, OPENAI_BASE_URL, model)
        if result:
            return _normalize(result)
        raise ValueError(
            "AI could not extract assessment data from this image. "
            "Please ensure the image is clear and contains readable assessment data."
        )

    # ── PDF ───────────────────────────────────────────────────────────────
    if ext == "pdf" or mime == "application/pdf":
        text = _extract_pdf_text(file_bytes)
        if not text.strip():
            raise ValueError(
                "Could not read text from this PDF. "
                "If it is a scanned document, try uploading an image (PNG/JPG) instead."
            )
        result = await _openai_text(text, OPENAI_API_KEY, OPENAI_BASE_URL, model)
        if result:
            return _normalize(result)
        raise ValueError("AI could not extract assessment data from this PDF.")

    # ── Any other text-based file (TXT, CSV, DOCX plain text, HTML, etc.) ─
    try:
        text = file_bytes.decode("utf-8", errors="replace")
    except Exception as exc:
        raise ValueError(
            f"Cannot read '{filename}'. "
            "Supported formats: PDF, PNG/JPG/image, JSON, or any plain-text report."
        ) from exc

    result = await _openai_text(text, OPENAI_API_KEY, OPENAI_BASE_URL, model)
    if result:
        return _normalize(result)
    raise ValueError(
        f"AI could not extract assessment data from '{filename}'. "
        "Please check that the file contains readable assessment information."
    )
