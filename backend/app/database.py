"""
Database layer using asyncpg with PostgreSQL.
Replaces the previous SQLite/aiosqlite layer — same public API, all routers unchanged.
"""

import asyncpg
import json
import logging
import os
from datetime import datetime
from typing import Optional, List, Dict, Any

logger = logging.getLogger(__name__)

_pool: Optional[asyncpg.Pool] = None

# Fields that need ISO string → datetime conversion when passed to update functions
_TIMESTAMP_FIELDS = {"last_session_date", "created_at", "completed_at", "started_at", "updated_at"}


# ─── Connection Pool ──────────────────────────────────────────────────────────


async def _init_connection(conn: asyncpg.Connection) -> None:
    """Register JSONB/JSON codecs so JSONB columns come back as Python dicts/lists."""
    await conn.set_type_codec(
        "jsonb", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )
    await conn.set_type_codec(
        "json", encoder=json.dumps, decoder=json.loads, schema="pg_catalog"
    )


async def init_db() -> None:
    """Create the connection pool and run schema migrations."""
    global _pool
    database_url = os.getenv("DATABASE_URL", "")
    if not database_url:
        raise RuntimeError("DATABASE_URL environment variable is not set")

    # asyncpg needs postgres:// scheme (Railway uses postgresql://)
    database_url = database_url.replace("postgresql://", "postgres://", 1)

    _pool = await asyncpg.create_pool(
        database_url,
        min_size=2,
        max_size=10,
        init=_init_connection,
    )
    await _run_migrations()
    logger.info("PostgreSQL pool ready")


async def close_db() -> None:
    global _pool
    if _pool:
        await _pool.close()
        _pool = None


async def get_pool() -> asyncpg.Pool:
    global _pool
    if _pool is None:
        await init_db()
    return _pool


async def _run_migrations() -> None:
    """Create all tables and indexes if they don't exist."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute("""
            -- ── Users (Keycloak-linked accounts) ───────────────────────────
            CREATE TABLE IF NOT EXISTS users (
                id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                keycloak_id TEXT UNIQUE NOT NULL,
                email       TEXT UNIQUE NOT NULL,
                full_name   TEXT,
                created_at  TIMESTAMPTZ DEFAULT NOW()
            );

            -- ── Students ────────────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS students (
                id                TEXT PRIMARY KEY,
                created_by        UUID REFERENCES users(id) ON DELETE SET NULL,
                name              TEXT NOT NULL,
                age               INTEGER NOT NULL,
                grade             INTEGER NOT NULL,
                language          TEXT DEFAULT 'en',
                interests         JSONB DEFAULT '[]',
                assessment        JSONB,
                diagnostic        JSONB DEFAULT '{}',
                current_levels    JSONB DEFAULT '{}',
                total_points      INTEGER DEFAULT 0,
                current_streak    INTEGER DEFAULT 0,
                longest_streak    INTEGER DEFAULT 0,
                badges            JSONB DEFAULT '[]',
                level             INTEGER DEFAULT 1,
                xp                INTEGER DEFAULT 0,
                last_session_date TIMESTAMPTZ,
                created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            -- ── Parent → Student links ───────────────────────────────────────
            CREATE TABLE IF NOT EXISTS parent_student (
                parent_id  UUID REFERENCES users(id) ON DELETE CASCADE,
                student_id TEXT REFERENCES students(id) ON DELETE CASCADE,
                PRIMARY KEY (parent_id, student_id)
            );

            -- ── Exercise sessions ────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS exercise_sessions (
                id                  TEXT PRIMARY KEY,
                student_id          TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                game_id             TEXT NOT NULL,
                game_name           TEXT NOT NULL,
                deficit_area        TEXT NOT NULL,
                difficulty_level    INTEGER NOT NULL,
                items               JSONB DEFAULT '[]',
                results             JSONB DEFAULT '[]',
                started_at          TIMESTAMPTZ NOT NULL,
                completed_at        TIMESTAMPTZ,
                total_items         INTEGER DEFAULT 0,
                correct_count       INTEGER DEFAULT 0,
                accuracy            REAL DEFAULT 0.0,
                avg_response_time_ms REAL DEFAULT 0.0,
                points_earned       INTEGER DEFAULT 0,
                badges_earned       JSONB DEFAULT '[]',
                status              TEXT DEFAULT 'in_progress'
            );

            CREATE INDEX IF NOT EXISTS idx_sessions_student ON exercise_sessions(student_id);
            CREATE INDEX IF NOT EXISTS idx_sessions_status  ON exercise_sessions(status);
            CREATE INDEX IF NOT EXISTS idx_sessions_deficit ON exercise_sessions(deficit_area);
            CREATE INDEX IF NOT EXISTS idx_sessions_completed ON exercise_sessions(completed_at DESC)
                WHERE status = 'completed';

            -- ── Adventure maps ───────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS adventure_maps (
                id           TEXT PRIMARY KEY,
                student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                created_by   TEXT,
                title        TEXT DEFAULT 'My Adventure',
                worlds       JSONB DEFAULT '[]',
                theme_config JSONB DEFAULT '{}',
                status       TEXT DEFAULT 'active',
                created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_adventure_student ON adventure_maps(student_id);
            CREATE INDEX IF NOT EXISTS idx_adventure_status  ON adventure_maps(status);

            -- ── Shop catalog ─────────────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS shop_items (
                id            TEXT PRIMARY KEY,
                name          TEXT NOT NULL,
                category      TEXT NOT NULL,
                cost          INTEGER NOT NULL,
                rarity        TEXT NOT NULL,
                avatar_config JSONB DEFAULT '{}',
                icon          TEXT,
                description   TEXT,
                is_active     BOOLEAN DEFAULT TRUE
            );

            -- ── Purchases per student ─────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS user_purchases (
                id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id   TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                item_id      TEXT NOT NULL REFERENCES shop_items(id),
                purchased_at TIMESTAMPTZ DEFAULT NOW(),
                points_spent INTEGER NOT NULL
            );

            CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_unique
                ON user_purchases(student_id, item_id);

            -- ── Avatar state per student ──────────────────────────────────────
            CREATE TABLE IF NOT EXISTS student_avatar (
                student_id    TEXT PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
                avatar_config JSONB DEFAULT '{}',
                updated_at    TIMESTAMPTZ DEFAULT NOW()
            );

            -- ── Points ledger (full audit trail) ─────────────────────────────
            CREATE TABLE IF NOT EXISTS points_ledger (
                id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                student_id TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
                amount     INTEGER NOT NULL,
                reason     TEXT NOT NULL,
                session_id TEXT REFERENCES exercise_sessions(id) ON DELETE SET NULL,
                item_id    TEXT REFERENCES shop_items(id) ON DELETE SET NULL,
                created_at TIMESTAMPTZ DEFAULT NOW()
            );

            CREATE INDEX IF NOT EXISTS idx_ledger_student ON points_ledger(student_id);

            -- ── Subscriptions (Stripe) ────────────────────────────────────────
            CREATE TABLE IF NOT EXISTS subscriptions (
                id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id                UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
                stripe_customer_id     TEXT UNIQUE,
                stripe_subscription_id TEXT UNIQUE,
                plan                   TEXT NOT NULL DEFAULT 'free',
                status                 TEXT NOT NULL DEFAULT 'active',
                child_slots            INTEGER DEFAULT 1,
                current_period_end     TIMESTAMPTZ,
                created_at             TIMESTAMPTZ DEFAULT NOW(),
                updated_at             TIMESTAMPTZ DEFAULT NOW()
            );
        """)


# ─── Helpers ──────────────────────────────────────────────────────────────────


def _to_dt(value: Any) -> Optional[datetime]:
    """Convert an ISO string or datetime to a timezone-aware datetime."""
    if value is None:
        return None
    if isinstance(value, datetime):
        return value
    if isinstance(value, str):
        try:
            return datetime.fromisoformat(value.replace("Z", "+00:00"))
        except (ValueError, AttributeError):
            return None
    return None


def _row_to_dict(row: asyncpg.Record) -> Dict[str, Any]:
    """Convert an asyncpg Record to a plain dict, serialising datetimes to ISO strings."""
    d = dict(row)
    for k, v in d.items():
        if isinstance(v, datetime):
            d[k] = v.isoformat()
    return d


# ─── Student CRUD ─────────────────────────────────────────────────────────────


async def create_student(student_data: Dict[str, Any]) -> Dict[str, Any]:
    pool = await get_pool()
    created_at = _to_dt(student_data.get("created_at")) or datetime.utcnow()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO students
                (id, name, age, grade, language, interests, diagnostic, current_levels, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            student_data["id"],
            student_data["name"],
            student_data["age"],
            student_data["grade"],
            student_data.get("language", "en"),
            student_data.get("interests", []),
            student_data.get("diagnostic", {}),
            student_data.get("current_levels", {}),
            created_at,
        )
    return await get_student(student_data["id"])


async def get_student(student_id: str) -> Optional[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT * FROM students WHERE id = $1", student_id)
    return _row_to_dict(row) if row else None


async def get_all_students() -> List[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch("SELECT * FROM students ORDER BY created_at DESC")
    return [_row_to_dict(r) for r in rows]


async def update_student(student_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    filtered = {}
    for key, value in data.items():
        if value is None:
            continue
        if key in _TIMESTAMP_FIELDS and isinstance(value, str):
            value = _to_dt(value) or value
        filtered[key] = value

    if not filtered:
        return await get_student(student_id)

    pool = await get_pool()
    set_clauses = [f"{k} = ${i + 1}" for i, k in enumerate(filtered)]
    params = list(filtered.values()) + [student_id]
    query = f"UPDATE students SET {', '.join(set_clauses)} WHERE id = ${len(params)}"
    async with pool.acquire() as conn:
        await conn.execute(query, *params)
    return await get_student(student_id)


async def delete_student(student_id: str) -> bool:
    """Delete a student and all cascaded records (sessions, maps, purchases, ledger)."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute("DELETE FROM students WHERE id = $1", student_id)
    return result == "DELETE 1"


async def save_assessment(student_id: str, assessment: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    deficits = assessment.get("deficits", {})
    current_levels = {}
    for area, info in deficits.items():
        severity = info.get("severity", 3) if isinstance(info, dict) else 3
        current_levels[area] = max(1, 6 - severity)

    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            "UPDATE students SET assessment = $1, current_levels = $2 WHERE id = $3",
            assessment,
            current_levels,
            student_id,
        )
    return await get_student(student_id)


# ─── Exercise Session CRUD ────────────────────────────────────────────────────


async def create_session(session_data: Dict[str, Any]) -> Dict[str, Any]:
    pool = await get_pool()
    started_at = _to_dt(session_data.get("started_at")) or datetime.utcnow()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO exercise_sessions
                (id, student_id, game_id, game_name, deficit_area, difficulty_level,
                 items, total_items, started_at, status)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            """,
            session_data["id"],
            session_data["student_id"],
            session_data["game_id"],
            session_data["game_name"],
            session_data["deficit_area"],
            session_data["difficulty_level"],
            session_data.get("items", []),
            session_data.get("total_items", 0),
            started_at,
            session_data.get("status", "in_progress"),
        )
    return await get_session(session_data["id"])


async def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM exercise_sessions WHERE id = $1", session_id
        )
    return _row_to_dict(row) if row else None


async def get_student_sessions(
    student_id: str,
    deficit_area: Optional[str] = None,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        if deficit_area:
            rows = await conn.fetch(
                """SELECT * FROM exercise_sessions
                   WHERE student_id = $1 AND deficit_area = $2
                   ORDER BY started_at DESC LIMIT $3""",
                student_id, deficit_area, limit,
            )
        else:
            rows = await conn.fetch(
                """SELECT * FROM exercise_sessions
                   WHERE student_id = $1
                   ORDER BY started_at DESC LIMIT $2""",
                student_id, limit,
            )
    return [_row_to_dict(r) for r in rows]


async def update_session(session_id: str, data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
    filtered = {}
    for key, value in data.items():
        if key in _TIMESTAMP_FIELDS and isinstance(value, str):
            value = _to_dt(value) or value
        filtered[key] = value

    if not filtered:
        return await get_session(session_id)

    pool = await get_pool()
    set_clauses = [f"{k} = ${i + 1}" for i, k in enumerate(filtered)]
    params = list(filtered.values()) + [session_id]
    query = f"UPDATE exercise_sessions SET {', '.join(set_clauses)} WHERE id = ${len(params)}"
    async with pool.acquire() as conn:
        await conn.execute(query, *params)
    return await get_session(session_id)


# ─── Analytics ────────────────────────────────────────────────────────────────


async def get_student_stats(student_id: str) -> Dict[str, Any]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                COUNT(*)                                                        AS total_sessions,
                COALESCE(SUM(CASE WHEN status='completed' THEN 1 ELSE 0 END),0) AS completed_sessions,
                COALESCE(AVG(CASE WHEN status='completed' THEN accuracy END),0) AS avg_accuracy,
                COALESCE(SUM(correct_count), 0)                                 AS total_correct,
                COALESCE(SUM(total_items), 0)                                   AS total_items,
                COALESCE(SUM(points_earned), 0)                                 AS total_points_earned
            FROM exercise_sessions WHERE student_id = $1
            """,
            student_id,
        )
    return dict(row) if row else {}


async def get_deficit_area_stats(student_id: str, deficit_area: str) -> Dict[str, Any]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT
                COUNT(*)                                                        AS sessions,
                COALESCE(AVG(CASE WHEN status='completed' THEN accuracy END),0) AS avg_accuracy,
                COALESCE(SUM(correct_count), 0)                                 AS correct,
                COALESCE(SUM(total_items), 0)                                   AS total
            FROM exercise_sessions
            WHERE student_id = $1 AND deficit_area = $2 AND status = 'completed'
            """,
            student_id,
            deficit_area,
        )
    return dict(row) if row else {}


async def get_recent_accuracy_trend(
    student_id: str,
    deficit_area: str,
    limit: int = 10,
) -> List[float]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT accuracy FROM exercise_sessions
            WHERE student_id = $1 AND deficit_area = $2 AND status = 'completed'
            ORDER BY completed_at DESC LIMIT $3
            """,
            student_id,
            deficit_area,
            limit,
        )
    return [r["accuracy"] for r in reversed(rows)]


# ─── Adventure Map CRUD ───────────────────────────────────────────────────────


async def create_adventure_map(data: Dict[str, Any]) -> Dict[str, Any]:
    pool = await get_pool()
    now = datetime.utcnow()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO adventure_maps
                (id, student_id, created_by, title, worlds, theme_config, status, created_at, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            """,
            data["id"],
            data["student_id"],
            data.get("created_by"),
            data.get("title", "My Adventure"),
            data.get("worlds", []),
            data.get("theme_config", {}),
            data.get("status", "active"),
            now,
            now,
        )
    return await get_adventure_map(data["id"])


async def get_adventure_map(adventure_id: str) -> Optional[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM adventure_maps WHERE id = $1", adventure_id
        )
    return _row_to_dict(row) if row else None


async def get_student_adventure(student_id: str) -> Optional[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT * FROM adventure_maps
            WHERE student_id = $1 AND status = 'active'
            ORDER BY updated_at DESC LIMIT 1
            """,
            student_id,
        )
    return _row_to_dict(row) if row else None


async def get_all_adventure_statuses() -> Dict[str, Any]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT student_id, id, title, worlds, status FROM adventure_maps WHERE status = 'active'"
        )
    result = {}
    for row in rows:
        d = dict(row)
        worlds = d["worlds"] if isinstance(d["worlds"], list) else []
        total_games = sum(len(w.get("game_ids", [])) for w in worlds)
        result[d["student_id"]] = {
            "has_adventure": True,
            "adventure_id": d["id"],
            "title": d["title"],
            "world_count": len(worlds),
            "total_games": total_games,
        }
    return result


async def get_student_adventures(student_id: str) -> List[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT * FROM adventure_maps WHERE student_id = $1 ORDER BY updated_at DESC",
            student_id,
        )
    return [_row_to_dict(r) for r in rows]


async def update_adventure_map(
    adventure_id: str, data: Dict[str, Any]
) -> Optional[Dict[str, Any]]:
    filtered = {k: v for k, v in data.items() if v is not None}
    filtered["updated_at"] = datetime.utcnow()

    pool = await get_pool()
    set_clauses = [f"{k} = ${i + 1}" for i, k in enumerate(filtered)]
    params = list(filtered.values()) + [adventure_id]
    query = f"UPDATE adventure_maps SET {', '.join(set_clauses)} WHERE id = ${len(params)}"
    async with pool.acquire() as conn:
        await conn.execute(query, *params)
    return await get_adventure_map(adventure_id)


async def delete_adventure_map(adventure_id: str) -> bool:
    pool = await get_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            "DELETE FROM adventure_maps WHERE id = $1", adventure_id
        )
    return result == "DELETE 1"


# ─── Shop ─────────────────────────────────────────────────────────────────────


async def get_shop_items(category: Optional[str] = None) -> List[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        if category:
            rows = await conn.fetch(
                "SELECT * FROM shop_items WHERE is_active = TRUE AND category = $1 ORDER BY cost",
                category,
            )
        else:
            rows = await conn.fetch(
                "SELECT * FROM shop_items WHERE is_active = TRUE ORDER BY category, cost"
            )
    return [dict(r) for r in rows]


async def get_student_purchases(student_id: str) -> List[str]:
    """Return list of item IDs owned by a student."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT item_id FROM user_purchases WHERE student_id = $1", student_id
        )
    return [r["item_id"] for r in rows]


async def purchase_item(student_id: str, item_id: str) -> Dict[str, Any]:
    """Deduct points and record purchase + ledger entry atomically."""
    pool = await get_pool()
    async with pool.acquire() as conn:
        item = await conn.fetchrow(
            "SELECT * FROM shop_items WHERE id = $1 AND is_active = TRUE", item_id
        )
        if not item:
            raise ValueError("Item not found")

        student = await conn.fetchrow(
            "SELECT total_points FROM students WHERE id = $1", student_id
        )
        if not student:
            raise ValueError("Student not found")

        if student["total_points"] < item["cost"]:
            raise ValueError("Insufficient points")

        existing = await conn.fetchrow(
            "SELECT id FROM user_purchases WHERE student_id = $1 AND item_id = $2",
            student_id,
            item_id,
        )
        if existing:
            raise ValueError("Item already owned")

        async with conn.transaction():
            await conn.execute(
                "UPDATE students SET total_points = total_points - $1 WHERE id = $2",
                item["cost"],
                student_id,
            )
            await conn.execute(
                "INSERT INTO user_purchases (student_id, item_id, points_spent) VALUES ($1, $2, $3)",
                student_id,
                item_id,
                item["cost"],
            )
            await conn.execute(
                """INSERT INTO points_ledger (student_id, amount, reason, item_id)
                   VALUES ($1, $2, 'shop_purchase', $3)""",
                student_id,
                -item["cost"],
                item_id,
            )

    return dict(item)


async def get_student_avatar(student_id: str) -> Optional[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM student_avatar WHERE student_id = $1", student_id
        )
    return _row_to_dict(row) if row else None


async def upsert_student_avatar(
    student_id: str, avatar_config: Dict[str, Any]
) -> Dict[str, Any]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO student_avatar (student_id, avatar_config, updated_at)
            VALUES ($1, $2, NOW())
            ON CONFLICT (student_id) DO UPDATE
              SET avatar_config = EXCLUDED.avatar_config,
                  updated_at   = NOW()
            """,
            student_id,
            avatar_config,
        )
        row = await conn.fetchrow(
            "SELECT * FROM student_avatar WHERE student_id = $1", student_id
        )
    return _row_to_dict(row)


# ─── Points Ledger ────────────────────────────────────────────────────────────


async def add_points_ledger_entry(
    student_id: str,
    amount: int,
    reason: str,
    session_id: Optional[str] = None,
    item_id: Optional[str] = None,
) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO points_ledger (student_id, amount, reason, session_id, item_id)
               VALUES ($1, $2, $3, $4, $5)""",
            student_id,
            amount,
            reason,
            session_id,
            item_id,
        )


# ─── Users & Auth ─────────────────────────────────────────────────────────────


async def get_or_create_user(
    keycloak_id: str, email: str, full_name: str
) -> Dict[str, Any]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM users WHERE keycloak_id = $1", keycloak_id
        )
        if row:
            return _row_to_dict(row)
        row = await conn.fetchrow(
            """INSERT INTO users (keycloak_id, email, full_name)
               VALUES ($1, $2, $3) RETURNING *""",
            keycloak_id,
            email,
            full_name,
        )
    return _row_to_dict(row)


async def link_parent_student(parent_id: str, student_id: str) -> None:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """INSERT INTO parent_student (parent_id, student_id)
               VALUES ($1, $2) ON CONFLICT DO NOTHING""",
            parent_id,
            student_id,
        )


async def get_parent_students(parent_id: str) -> List[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """SELECT s.* FROM students s
               JOIN parent_student ps ON ps.student_id = s.id
               WHERE ps.parent_id = $1
               ORDER BY s.created_at DESC""",
            parent_id,
        )
    return [_row_to_dict(r) for r in rows]


# ─── Subscriptions ────────────────────────────────────────────────────────────


async def get_user_subscription(user_id: str) -> Optional[Dict[str, Any]]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            "SELECT * FROM subscriptions WHERE user_id = $1", user_id
        )
    return _row_to_dict(row) if row else None


async def upsert_subscription(user_id: str, data: Dict[str, Any]) -> Dict[str, Any]:
    pool = await get_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO subscriptions (user_id, stripe_customer_id, stripe_subscription_id,
                                       plan, status, child_slots, current_period_end, updated_at)
            VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
            ON CONFLICT (user_id) DO UPDATE
              SET stripe_customer_id     = EXCLUDED.stripe_customer_id,
                  stripe_subscription_id = EXCLUDED.stripe_subscription_id,
                  plan                   = EXCLUDED.plan,
                  status                 = EXCLUDED.status,
                  child_slots            = EXCLUDED.child_slots,
                  current_period_end     = EXCLUDED.current_period_end,
                  updated_at             = NOW()
            """,
            user_id,
            data.get("stripe_customer_id"),
            data.get("stripe_subscription_id"),
            data.get("plan", "free"),
            data.get("status", "active"),
            data.get("child_slots", 1),
            _to_dt(data.get("current_period_end")),
        )
        row = await conn.fetchrow(
            "SELECT * FROM subscriptions WHERE user_id = $1", user_id
        )
    return _row_to_dict(row)
