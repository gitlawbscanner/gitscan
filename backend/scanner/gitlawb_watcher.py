"""
Background watcher: polls Gitlawb node for new repos and auto-scans them.
Uses Gitea-compatible API (/api/v1/repos/search) with resilient fallbacks.
"""
import asyncio
import logging
import uuid
import httpx

from api.state import scan_jobs, increment_scan_started
import db.database as database

logger = logging.getLogger(__name__)

GITLAWB_NODE = "https://node.gitlawb.com"
POLL_INTERVAL = 90          # seconds between polls
MAX_CONCURRENT = 2          # max simultaneous auto-scans
MAX_AUTO_PER_CYCLE = 5      # cap new repos scanned per poll cycle

_seen: set = set()
_semaphore: asyncio.Semaphore | None = None


def _get_semaphore() -> asyncio.Semaphore:
    global _semaphore
    if _semaphore is None:
        _semaphore = asyncio.Semaphore(MAX_CONCURRENT)
    return _semaphore


async def _fetch_latest_repos() -> list[dict]:
    """Try multiple Gitea-compatible endpoints to get recent repos."""
    candidates = [
        f"{GITLAWB_NODE}/api/v1/repos/search?limit=50&sort=newest&order=desc",
        f"{GITLAWB_NODE}/api/v1/repos/search?limit=50",
        f"{GITLAWB_NODE}/api/v1/repos/search",
        f"{GITLAWB_NODE}/api/v1/repos?page=1&limit=50",
    ]
    for url in candidates:
        try:
            async with httpx.AsyncClient(timeout=15, follow_redirects=True) as client:
                r = await client.get(url, headers={"Accept": "application/json"})
            if r.status_code == 200:
                data = r.json()
                repos = data if isinstance(data, list) else data.get("data", data.get("repos", []))
                if repos:
                    logger.info(f"Watcher: fetched {len(repos)} repos from {url}")
                    return repos
        except Exception as e:
            logger.debug(f"Watcher endpoint failed ({url}): {e}")
    return []


def _extract_clone_url(repo: dict) -> str | None:
    """Pull the best clone/web URL from a Gitea repo object."""
    for key in ("clone_url", "html_url", "http_url_to_repo", "web_url"):
        val = repo.get(key, "")
        if val and val.startswith("http"):
            return val.rstrip("/").removesuffix(".git")
    # Build from owner + name
    owner = (repo.get("owner") or {}).get("login", "")
    name = repo.get("name", "")
    if owner and name:
        return f"{GITLAWB_NODE}/{owner}/{name}"
    return None


async def _auto_scan(repo_url: str) -> None:
    from scanner.orchestrator import run_full_scan
    async with _get_semaphore():
        job_id = str(uuid.uuid4())
        scan_jobs[job_id] = {
            "status": "queued", "result": None, "error": None,
            "repo_url": repo_url, "logs": [], "auto": True,
        }
        increment_scan_started()
        logger.info(f"Auto-scanning: {repo_url}")
        try:
            await run_full_scan(job_id, repo_url)
        except Exception as e:
            logger.error(f"Auto-scan failed ({repo_url}): {e}")


async def watch_gitlawb() -> None:
    """Infinite loop: poll Gitlawb, auto-scan new repos."""
    logger.info("Gitlawb watcher started")
    # Seed _seen from DB (preferred) or in-memory fallback
    if database.is_enabled():
        _seen.update(await database.get_all_urls())
    else:
        from api.state import recent_scans
        for s in recent_scans:
            _seen.add(s["repo_url"])

    while True:
        try:
            repos = await _fetch_latest_repos()
            new_this_cycle = 0
            tasks = []
            for repo in repos:
                if new_this_cycle >= MAX_AUTO_PER_CYCLE:
                    break
                url = _extract_clone_url(repo)
                if url and url not in _seen:
                    _seen.add(url)
                    new_this_cycle += 1
                    tasks.append(asyncio.create_task(_auto_scan(url)))

            if tasks:
                logger.info(f"Watcher: queued {len(tasks)} new repos for scanning")
        except Exception as e:
            logger.error(f"Watcher cycle error: {e}")

        await asyncio.sleep(POLL_INTERVAL)
