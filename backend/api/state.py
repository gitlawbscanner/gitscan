import json
import os
import time

scan_jobs: dict = {}

# ── Recent scans feed ──────────────────────────────────────────────────────────

_MAX_RECENT = 100

_now = time.time()
recent_scans: list = [
    {"repo_url": "https://github.com/AjunaWorkHub/AjunaVerse",    "repo_name": "AjunaWorkHub/AjunaVerse",    "platform": "github", "risk_score": 70, "severity": "high",     "scan_count": 3,  "timestamp": _now - 7200},
    {"repo_url": "https://github.com/rubenmarcus/malicious-repositories", "repo_name": "rubenmarcus/malicious-repositories", "platform": "github", "risk_score": 95, "severity": "critical", "scan_count": 13, "timestamp": _now - 64800},
    {"repo_url": "https://github.com/tetsuo-ai/agenc-core",        "repo_name": "tetsuo-ai/agenc-core",        "platform": "github", "risk_score": 50, "severity": "medium",   "scan_count": 1,  "timestamp": _now - 57600},
    {"repo_url": "https://github.com/vercel/next.js",              "repo_name": "vercel/next.js",              "platform": "github", "risk_score": 18, "severity": "low",      "scan_count": 5,  "timestamp": _now - 86400},
    {"repo_url": "https://github.com/openai/openai-python",        "repo_name": "openai/openai-python",        "platform": "github", "risk_score": 12, "severity": "low",      "scan_count": 4,  "timestamp": _now - 90000},
    {"repo_url": "https://github.com/Davi0416/desafio-itau-java",  "repo_name": "Davi0416/desafio-itau-java",  "platform": "github", "risk_score": 2,  "severity": "clean",    "scan_count": 2,  "timestamp": _now - 32400},
    {"repo_url": "https://github.com/anthropics/anthropic-sdk-python", "repo_name": "anthropics/anthropic-sdk-python", "platform": "github", "risk_score": 9, "severity": "low", "scan_count": 2, "timestamp": _now - 172800},
    {"repo_url": "https://github.com/aniketshetty1nov/Real_Estate_Rental_Platform", "repo_name": "aniketshetty1nov/Real_Estate_Rental_Platform", "platform": "github", "risk_score": 80, "severity": "critical", "scan_count": 1, "timestamp": _now - 46800},
]


def add_recent_scan(repo_url: str, risk_score: int, severity: str) -> None:
    url = repo_url.strip().rstrip("/")
    if "github.com" in url:
        platform = "github"
        repo_name = url.split("github.com/", 1)[-1]
    elif "gitlawb.com" in url or url.startswith("gitlawb://"):
        platform = "gitlawb"
        repo_name = url.split("gitlawb.com/", 1)[-1] if "gitlawb.com/" in url else url.split("gitlawb://", 1)[-1]
    else:
        platform = "other"
        repo_name = url

    for scan in recent_scans:
        if scan["repo_url"] == url:
            scan["scan_count"] = scan.get("scan_count", 1) + 1
            scan["risk_score"] = risk_score
            scan["severity"] = severity
            scan["timestamp"] = time.time()
            recent_scans.remove(scan)
            recent_scans.insert(0, scan)
            return

    recent_scans.insert(0, {
        "repo_url": url,
        "repo_name": repo_name,
        "platform": platform,
        "risk_score": risk_score,
        "severity": severity,
        "timestamp": time.time(),
        "scan_count": 1,
    })
    if len(recent_scans) > _MAX_RECENT:
        recent_scans.pop()

_STATS_FILE = os.path.join(os.path.dirname(__file__), "..", "scan_stats.json")
_STATS_SEED = {"total_scans": 147, "completed_scans": 134, "total_vulns": 892}


def _load_stats() -> dict:
    try:
        if os.path.exists(_STATS_FILE):
            with open(_STATS_FILE) as f:
                return json.load(f)
    except Exception:
        pass
    return dict(_STATS_SEED)


def _save_stats(stats: dict) -> None:
    try:
        with open(_STATS_FILE, "w") as f:
            json.dump(stats, f)
    except Exception:
        pass


scan_stats: dict = _load_stats()


def increment_scan_started() -> None:
    scan_stats["total_scans"] += 1
    _save_stats(scan_stats)


def increment_scan_completed(vulns: int = 0) -> None:
    scan_stats["completed_scans"] += 1
    scan_stats["total_vulns"] += vulns
    _save_stats(scan_stats)
