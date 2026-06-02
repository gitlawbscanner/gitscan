"""
db/database.py — asyncpg PostgreSQL persistence for gitscan.

Uses DATABASE_URL env var (Railway auto-injects this when you add a Postgres service).
Falls back gracefully to no-op if the var is missing or connection fails.
"""
import json
import logging
import os
import time

logger = logging.getLogger(__name__)

_pool = None
_enabled = False

_SCHEMA = """
CREATE TABLE IF NOT EXISTS scans (
    repo_url     TEXT PRIMARY KEY,
    repo_name    TEXT NOT NULL,
    platform     TEXT NOT NULL DEFAULT 'github',
    risk_score   INTEGER NOT NULL DEFAULT 0,
    severity     TEXT NOT NULL DEFAULT 'unknown',
    scan_count   INTEGER NOT NULL DEFAULT 1,
    last_scanned DOUBLE PRECISION NOT NULL,
    auto         BOOLEAN NOT NULL DEFAULT FALSE,
    last_job_id  TEXT
);

ALTER TABLE scans ADD COLUMN IF NOT EXISTS last_job_id TEXT;

CREATE TABLE IF NOT EXISTS reports (
    job_id     TEXT PRIMARY KEY,
    repo_url   TEXT NOT NULL,
    report     TEXT NOT NULL,
    created_at DOUBLE PRECISION NOT NULL
);

CREATE TABLE IF NOT EXISTS scan_history (
    id          BIGSERIAL PRIMARY KEY,
    repo_url    TEXT NOT NULL,
    risk_score  INTEGER NOT NULL,
    severity    TEXT NOT NULL DEFAULT 'unknown',
    job_id      TEXT,
    scanned_at  DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_scan_history_repo
    ON scan_history(repo_url, scanned_at DESC);
"""


async def init_db() -> bool:
    global _pool, _enabled
    url = os.environ.get("DATABASE_URL", "")
    if not url:
        logger.info("DATABASE_URL not set — running without PostgreSQL persistence")
        return False
    try:
        import asyncpg
        url = url.replace("postgres://", "postgresql://", 1)
        _pool = await asyncpg.create_pool(url, min_size=1, max_size=5, command_timeout=30)
        async with _pool.acquire() as conn:
            await conn.execute(_SCHEMA)
        _enabled = True
        logger.info("PostgreSQL connected and schema ready")
        return True
    except Exception as e:
        logger.error(f"DB init failed — falling back to in-memory: {e}")
        _pool = None
        _enabled = False
        return False


def is_enabled() -> bool:
    return _enabled


async def upsert_scan(
    repo_url: str,
    repo_name: str,
    platform: str,
    risk_score: int,
    severity: str,
    auto: bool = False,
    job_id: str | None = None,
) -> None:
    if not _enabled or _pool is None:
        return
    try:
        async with _pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO scans (repo_url, repo_name, platform, risk_score, severity, scan_count, last_scanned, auto, last_job_id)
                VALUES ($1, $2, $3, $4, $5, 1, $6, $7, $8)
                ON CONFLICT (repo_url) DO UPDATE SET
                    risk_score   = EXCLUDED.risk_score,
                    severity     = EXCLUDED.severity,
                    scan_count   = scans.scan_count + 1,
                    last_scanned = EXCLUDED.last_scanned,
                    auto         = EXCLUDED.auto,
                    last_job_id  = EXCLUDED.last_job_id
                """,
                repo_url, repo_name, platform, risk_score, severity, time.time(), auto, job_id,
            )
    except Exception as e:
        logger.error(f"DB upsert_scan failed: {e}")


async def store_report(job_id: str, repo_url: str, report: dict) -> None:
    if not _enabled or _pool is None:
        return
    try:
        async with _pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO reports (job_id, repo_url, report, created_at) VALUES ($1, $2, $3, $4) ON CONFLICT (job_id) DO NOTHING",
                job_id, repo_url, json.dumps(report), time.time(),
            )
    except Exception as e:
        logger.error(f"DB store_report failed: {e}")


async def get_report(job_id: str) -> dict | None:
    if not _enabled or _pool is None:
        return None
    try:
        async with _pool.acquire() as conn:
            row = await conn.fetchrow("SELECT * FROM reports WHERE job_id = $1", job_id)
        if row:
            return {"job_id": row["job_id"], "repo_url": row["repo_url"], "report": json.loads(row["report"]), "created_at": row["created_at"]}
        return None
    except Exception as e:
        logger.error(f"DB get_report failed: {e}")
        return None


async def get_recent(limit: int = 100) -> list[dict]:
    if not _enabled or _pool is None:
        return []
    try:
        async with _pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM scans ORDER BY last_scanned DESC LIMIT $1", limit
            )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"DB get_recent failed: {e}")
        return []


async def get_all_urls() -> set[str]:
    if not _enabled or _pool is None:
        return set()
    try:
        async with _pool.acquire() as conn:
            rows = await conn.fetch("SELECT repo_url FROM scans")
        return {r["repo_url"] for r in rows}
    except Exception as e:
        logger.error(f"DB get_all_urls failed: {e}")
        return set()


async def insert_history(repo_url: str, risk_score: int, severity: str, job_id: str | None = None) -> None:
    if not _enabled or _pool is None:
        return
    try:
        async with _pool.acquire() as conn:
            await conn.execute(
                "INSERT INTO scan_history (repo_url, risk_score, severity, job_id, scanned_at) VALUES ($1, $2, $3, $4, $5)",
                repo_url, risk_score, severity, job_id, time.time(),
            )
    except Exception as e:
        logger.error(f"DB insert_history failed: {e}")


async def get_history(repo_url: str, limit: int = 30) -> list[dict]:
    if not _enabled or _pool is None:
        return []
    try:
        async with _pool.acquire() as conn:
            rows = await conn.fetch(
                "SELECT * FROM scan_history WHERE repo_url = $1 ORDER BY scanned_at DESC LIMIT $2",
                repo_url, limit,
            )
        return [dict(r) for r in rows]
    except Exception as e:
        logger.error(f"DB get_history failed: {e}")
        return []
