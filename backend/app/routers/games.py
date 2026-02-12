"""
Game catalog endpoints.
"""

from fastapi import APIRouter, HTTPException

from app.models import GameDefinition, DeficitArea
from app.games.game_definitions import get_all_games, get_game, get_games_by_area

router = APIRouter()


@router.get("", response_model=list[GameDefinition])
async def list_games():
    """List all available games."""
    return get_all_games()


@router.get("/by-area/{area}", response_model=list[GameDefinition])
async def list_games_by_area(area: DeficitArea):
    """List games by deficit area."""
    return get_games_by_area(area)


@router.get("/{game_id}", response_model=GameDefinition)
async def get_game_details(game_id: str):
    """Get details of a specific game."""
    game = get_game(game_id)
    if not game:
        raise HTTPException(status_code=404, detail="Game not found")
    return game
