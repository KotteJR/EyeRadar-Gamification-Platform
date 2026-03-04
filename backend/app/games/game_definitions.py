"""
Game catalog loaded from JSON files.

Primary source of truth:
  backend/app/games/definitions/games.json
"""

from __future__ import annotations

import json
from pathlib import Path

from app.models import DeficitArea, GameDefinition


DEFINITIONS_DIR = Path(__file__).resolve().parent / "definitions"
GAMES_FILE = DEFINITIONS_DIR / "games.json"

GAMES: dict[str, GameDefinition] = {}


def _load_games() -> dict[str, GameDefinition]:
    if not GAMES_FILE.exists():
        raise RuntimeError(f"Missing game definitions file: {GAMES_FILE}")

    raw = json.loads(GAMES_FILE.read_text(encoding="utf-8"))
    if not isinstance(raw, list):
        raise RuntimeError(f"Invalid JSON format in {GAMES_FILE}: expected a list")

    loaded: dict[str, GameDefinition] = {}
    for entry in raw:
        game = GameDefinition.model_validate(entry)
        loaded[game.id] = game

    return loaded


GAMES = _load_games()


def get_all_games() -> list[GameDefinition]:
    return list(GAMES.values())


def get_game(game_id: str) -> GameDefinition | None:
    return GAMES.get(game_id)


def get_games_by_area(area: DeficitArea) -> list[GameDefinition]:
    return [g for g in GAMES.values() if g.deficit_area == area]


def get_games_for_student(age: int, deficit_areas: list[str] | None = None) -> list[GameDefinition]:
    """Get games suitable for a student's age and deficit areas."""
    result = []
    for g in GAMES.values():
        if g.age_range_min <= age <= g.age_range_max:
            if deficit_areas is None or g.deficit_area.value in deficit_areas:
                result.append(g)
    return result
