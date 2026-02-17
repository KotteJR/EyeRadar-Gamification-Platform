"""
Database layer using SQLite with aiosqlite.
Stores student profiles, exercise sessions, and gamification data.
"""

import aiosqlite
import json
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "eyeradar.db")

_db: Optional[aiosqlite.Connection] = None


async def get_db() -> aiosqlite.Connection:
    global _db
    if _db is None:
        _db = await aiosqlite.connect(DB_PATH)
        _db.row_factory = aiosqlite.Row
        # Enable WAL mode for better concurrent read/write
        await _db.execute("PRAGMA journal_mode=WAL")
        await _db.execute("PRAGMA busy_timeout=5000")
        # Enable foreign key constraints
        await _db.execute("PRAGMA foreign_keys=ON")
    return _db


async def reset_db_connection():
    """Reset the DB connection if it gets into a bad state."""
    global _db
    if _db is not None:
        try:
            await _db.close()
        except Exception:
            pass
    _db = None


async def init_db():
    """Create tables if they don't exist."""
    db = await get_db()
    await db.executescript(
        """
        CREATE TABLE IF NOT EXISTS students (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            age INTEGER NOT NULL,
            grade INTEGER NOT NULL,
            language TEXT DEFAULT 'en',
            interests TEXT DEFAULT '[]',
            assessment TEXT,
            diagnostic TEXT DEFAULT '{}',
            current_levels TEXT DEFAULT '{}',
            total_points INTEGER DEFAULT 0,
            current_streak INTEGER DEFAULT 0,
            longest_streak INTEGER DEFAULT 0,
            badges TEXT DEFAULT '[]',
            level INTEGER DEFAULT 1,
            xp INTEGER DEFAULT 0,
            last_session_date TEXT,
            created_at TEXT NOT NULL
        );

        CREATE TABLE IF NOT EXISTS exercise_sessions (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            game_id TEXT NOT NULL,
            game_name TEXT NOT NULL,
            deficit_area TEXT NOT NULL,
            difficulty_level INTEGER NOT NULL,
            items TEXT DEFAULT '[]',
            results TEXT DEFAULT '[]',
            started_at TEXT NOT NULL,
            completed_at TEXT,
            total_items INTEGER DEFAULT 0,
            correct_count INTEGER DEFAULT 0,
            accuracy REAL DEFAULT 0.0,
            avg_response_time_ms REAL DEFAULT 0.0,
            points_earned INTEGER DEFAULT 0,
            badges_earned TEXT DEFAULT '[]',
            status TEXT DEFAULT 'in_progress',
            FOREIGN KEY (student_id) REFERENCES students(id)
        );

        CREATE INDEX IF NOT EXISTS idx_sessions_student
            ON exercise_sessions(student_id);
        CREATE INDEX IF NOT EXISTS idx_sessions_status
            ON exercise_sessions(status);
        CREATE INDEX IF NOT EXISTS idx_sessions_deficit
            ON exercise_sessions(deficit_area);

        CREATE TABLE IF NOT EXISTS adventure_maps (
            id TEXT PRIMARY KEY,
            student_id TEXT NOT NULL,
            created_by TEXT,
            title TEXT DEFAULT 'My Adventure',
            worlds TEXT DEFAULT '[]',
            theme_config TEXT DEFAULT '{}',
            status TEXT DEFAULT 'active',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (student_id) REFERENCES students(id)
        );

        CREATE INDEX IF NOT EXISTS idx_adventure_student
            ON adventure_maps(student_id);
        CREATE INDEX IF NOT EXISTS idx_adventure_status
            ON adventure_maps(status);

    """
    )
    await db.commit()

    # Migrate: add diagnostic column if missing (for existing DBs)
    try:
        await db.execute("SELECT diagnostic FROM students LIMIT 1")
    except Exception:
        await db.execute("ALTER TABLE students ADD COLUMN diagnostic TEXT DEFAULT '{}'")
        await db.commit()



# ─── Student CRUD ─────────────────────────────────────────────────────────────


async def create_student(student_data: Dict[str, Any]) -> Dict[str, Any]:
    db = await get_db()
    await db.execute(
        """INSERT INTO students (id, name, age, grade, language, interests, diagnostic, current_levels, created_at)
           VALUES (:id, :name, :age, :grade, :language, :interests, :diagnostic, :current_levels, :created_at)""",
        {
            **student_data,
            "interests": json.dumps(student_data.get("interests", [])),
            "diagnostic": json.dumps(student_data.get("diagnostic", {})),
            "current_levels": json.dumps(student_data.get("current_levels", {})),
        },
    )
    await db.commit()
    return await get_student(student_data["id"])


async def get_student(student_id: str) -> Optional[Dict[str, Any]]:
    db = await get_db()
    cursor = await db.execute("SELECT * FROM students WHERE id = ?", (student_id,))
    row = await cursor.fetchone()
    if row is None:
        return None
    return _parse_student_row(dict(row))


async def get_all_students() -> List[Dict[str, Any]]:
    db = await get_db()
    cursor = await db.execute("SELECT * FROM students ORDER BY created_at DESC")
    rows = await cursor.fetchall()
    return [_parse_student_row(dict(row)) for row in rows]


async def update_student(student_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    db = await get_db()
    set_clauses = []
    params = {}
    for key, value in data.items():
        if value is not None:
            if key in ("interests", "current_levels", "badges", "assessment", "diagnostic"):
                params[key] = json.dumps(value) if isinstance(value, (list, dict)) else value
            else:
                params[key] = value
            set_clauses.append(f"{key} = :{key}")

    if not set_clauses:
        return await get_student(student_id)

    params["id"] = student_id
    query = f"UPDATE students SET {', '.join(set_clauses)} WHERE id = :id"
    await db.execute(query, params)
    await db.commit()
    return await get_student(student_id)


async def save_assessment(student_id: str, assessment: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    db = await get_db()
    # Set initial levels based on assessment severity (inverse: higher severity = lower starting level)
    deficits = assessment.get("deficits", {})
    current_levels = {}
    for area, info in deficits.items():
        severity = info.get("severity", 3) if isinstance(info, dict) else 3
        current_levels[area] = max(1, 6 - severity)

    await db.execute(
        """UPDATE students SET assessment = ?, current_levels = ? WHERE id = ?""",
        (json.dumps(assessment), json.dumps(current_levels), student_id),
    )
    await db.commit()
    return await get_student(student_id)


def _parse_student_row(row: Dict[str, Any]) -> Dict[str, Any]:
    for field in ("interests", "current_levels", "badges"):
        if isinstance(row.get(field), str):
            row[field] = json.loads(row[field])
    if isinstance(row.get("assessment"), str):
        row["assessment"] = json.loads(row["assessment"])
    if isinstance(row.get("diagnostic"), str):
        try:
            row["diagnostic"] = json.loads(row["diagnostic"])
        except (json.JSONDecodeError, TypeError):
            row["diagnostic"] = {}
    if row.get("diagnostic") is None:
        row["diagnostic"] = {}
    return row


# ─── Exercise Session CRUD ───────────────────────────────────────────────────


async def create_session(session_data: Dict[str, Any]) -> Dict[str, Any]:
    db = await get_db()
    await db.execute(
        """INSERT INTO exercise_sessions
           (id, student_id, game_id, game_name, deficit_area, difficulty_level,
            items, total_items, started_at, status)
           VALUES (:id, :student_id, :game_id, :game_name, :deficit_area,
                   :difficulty_level, :items, :total_items, :started_at, :status)""",
        {
            **session_data,
            "items": json.dumps(session_data.get("items", [])),
        },
    )
    await db.commit()
    return await get_session(session_data["id"])


async def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM exercise_sessions WHERE id = ?", (session_id,)
    )
    row = await cursor.fetchone()
    if row is None:
        return None
    return _parse_session_row(dict(row))


async def get_student_sessions(
    student_id: str,
    deficit_area: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    db = await get_db()
    query = "SELECT * FROM exercise_sessions WHERE student_id = ?"
    params: list = [student_id]
    if deficit_area:
        query += " AND deficit_area = ?"
        params.append(deficit_area)
    query += " ORDER BY started_at DESC LIMIT ?"
    params.append(limit)
    cursor = await db.execute(query, params)
    rows = await cursor.fetchall()
    return [_parse_session_row(dict(row)) for row in rows]


async def update_session(session_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    db = await get_db()
    set_clauses = []
    params = {}
    for key, value in data.items():
        if key in ("items", "results", "badges_earned"):
            params[key] = json.dumps(value) if isinstance(value, (list, dict)) else value
        else:
            params[key] = value
        set_clauses.append(f"{key} = :{key}")

    params["id"] = session_id
    query = f"UPDATE exercise_sessions SET {', '.join(set_clauses)} WHERE id = :id"
    await db.execute(query, params)
    await db.commit()
    return await get_session(session_id)


def _parse_session_row(row: Dict[str, Any]) -> Dict[str, Any]:
    for field in ("items", "results", "badges_earned"):
        if isinstance(row.get(field), str):
            row[field] = json.loads(row[field])
    return row


# ─── Analytics Queries ────────────────────────────────────────────────────────


async def get_student_stats(student_id: str) -> Dict[str, Any]:
    db = await get_db()
    cursor = await db.execute(
        """SELECT
            COUNT(*) as total_sessions,
            COALESCE(SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END), 0) as completed_sessions,
            COALESCE(AVG(CASE WHEN status = 'completed' THEN accuracy END), 0) as avg_accuracy,
            COALESCE(SUM(correct_count), 0) as total_correct,
            COALESCE(SUM(total_items), 0) as total_items,
            COALESCE(SUM(points_earned), 0) as total_points_earned
        FROM exercise_sessions WHERE student_id = ?""",
        (student_id,),
    )
    row = await cursor.fetchone()
    return dict(row) if row else {}


async def get_deficit_area_stats(student_id: str, deficit_area: str) -> Dict[str, Any]:
    db = await get_db()
    cursor = await db.execute(
        """SELECT
            COUNT(*) as sessions,
            COALESCE(AVG(CASE WHEN status = 'completed' THEN accuracy END), 0) as avg_accuracy,
            COALESCE(SUM(correct_count), 0) as correct,
            COALESCE(SUM(total_items), 0) as total
        FROM exercise_sessions
        WHERE student_id = ? AND deficit_area = ? AND status = 'completed'""",
        (student_id, deficit_area),
    )
    row = await cursor.fetchone()
    return dict(row) if row else {}


async def get_recent_accuracy_trend(
    student_id: str, deficit_area: str, limit: int = 10
) -> List[float]:
    db = await get_db()
    cursor = await db.execute(
        """SELECT accuracy FROM exercise_sessions
        WHERE student_id = ? AND deficit_area = ? AND status = 'completed'
        ORDER BY completed_at DESC LIMIT ?""",
        (student_id, deficit_area, limit),
    )
    rows = await cursor.fetchall()
    return [row["accuracy"] for row in reversed(rows)]


# ─── Adventure Map CRUD ──────────────────────────────────────────────────────


async def create_adventure_map(data: Dict[str, Any]) -> Dict[str, Any]:
    db = await get_db()
    await db.execute(
        """INSERT INTO adventure_maps
           (id, student_id, created_by, title, worlds, theme_config, status, created_at, updated_at)
           VALUES (:id, :student_id, :created_by, :title, :worlds, :theme_config, :status, :created_at, :updated_at)""",
        {
            **data,
            "worlds": json.dumps(data.get("worlds", [])),
            "theme_config": json.dumps(data.get("theme_config", {})),
        },
    )
    await db.commit()
    return await get_adventure_map(data["id"])


async def get_adventure_map(adventure_id: str) -> Optional[Dict[str, Any]]:
    db = await get_db()
    cursor = await db.execute("SELECT * FROM adventure_maps WHERE id = ?", (adventure_id,))
    row = await cursor.fetchone()
    if row is None:
        return None
    return _parse_adventure_row(dict(row))


async def get_student_adventure(student_id: str) -> Optional[Dict[str, Any]]:
    """Get the active adventure map for a student."""
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM adventure_maps WHERE student_id = ? AND status = 'active' ORDER BY updated_at DESC LIMIT 1",
        (student_id,),
    )
    row = await cursor.fetchone()
    if row is None:
        return None
    return _parse_adventure_row(dict(row))


async def get_all_adventure_statuses() -> Dict[str, Any]:
    """Get adventure status for all students with an active adventure."""
    db = await get_db()
    cursor = await db.execute(
        "SELECT student_id, id, title, worlds, status FROM adventure_maps WHERE status = 'active'"
    )
    rows = await cursor.fetchall()
    result = {}
    for row in rows:
        row_dict = dict(row)
        worlds = json.loads(row_dict["worlds"]) if isinstance(row_dict["worlds"], str) else row_dict["worlds"]
        total_games = sum(len(w.get("game_ids", [])) for w in worlds)
        result[row_dict["student_id"]] = {
            "has_adventure": True,
            "adventure_id": row_dict["id"],
            "title": row_dict["title"],
            "world_count": len(worlds),
            "total_games": total_games,
        }
    return result


async def get_student_adventures(student_id: str) -> List[Dict[str, Any]]:
    """Get all adventure maps for a student."""
    db = await get_db()
    cursor = await db.execute(
        "SELECT * FROM adventure_maps WHERE student_id = ? ORDER BY updated_at DESC",
        (student_id,),
    )
    rows = await cursor.fetchall()
    return [_parse_adventure_row(dict(row)) for row in rows]


async def update_adventure_map(adventure_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    db = await get_db()
    set_clauses = []
    params = {}
    for key, value in data.items():
        if value is not None:
            if key in ("worlds", "theme_config"):
                params[key] = json.dumps(value) if isinstance(value, (list, dict)) else value
            else:
                params[key] = value
            set_clauses.append(f"{key} = :{key}")

    if not set_clauses:
        return await get_adventure_map(adventure_id)

    params["id"] = adventure_id
    query = f"UPDATE adventure_maps SET {', '.join(set_clauses)} WHERE id = :id"
    await db.execute(query, params)
    await db.commit()
    return await get_adventure_map(adventure_id)


async def delete_adventure_map(adventure_id: str) -> bool:
    db = await get_db()
    cursor = await db.execute("DELETE FROM adventure_maps WHERE id = ?", (adventure_id,))
    await db.commit()
    return cursor.rowcount > 0


def _parse_adventure_row(row: Dict[str, Any]) -> Dict[str, Any]:
    for field in ("worlds",):
        if isinstance(row.get(field), str):
            row[field] = json.loads(row[field])
    if isinstance(row.get("theme_config"), str):
        try:
            row["theme_config"] = json.loads(row["theme_config"])
        except (json.JSONDecodeError, TypeError):
            row["theme_config"] = {}
    return row
