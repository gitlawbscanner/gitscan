"""
scanner/orchestrator.py — glscan

Gitlawb clone strategy (Windows-compatible, no gl CLI needed):

Gitlawb uses gitlawb:// transport which needs git-remote-gitlawb helper.
Since that helper has no Windows binary yet, we use two fallback layers:

  1. Try GitHub mirror: github.com/gitlawb/<repo>  (most gitlawb repos are mirrored)
  2. If no mirror found, try node HTTP API at node.gitlawb.com
  3. Clear error message telling user to install WSL + gl CLI for native support

Supported input URL formats:
  https://gitlawb.com/node/repos/z6MkkWwY/openclaude
  https://gitlawb.com/node/repos/z6MkqDnb.../openclaude   (full DID)
  https://gitlawb.com/z6MkkWwY/openclaude
  gitlawb://did:key:z6Mk.../openclaude
  gitlawb://z6MkkWwY/openclaude
  https://github.com/user/repo  (plain git, unchanged)
"""

import asyncio
import re
import shutil
import subprocess
import tempfile
import os
import logging

import httpx

from api.state import scan_jobs, increment_scan_completed, add_recent_scan
from scanner.secrets import scan_secrets
from scanner.sast import scan_sast
from scanner.deps import scan_dependencies
from scanner.malware import scan_malware
from ai.analyzer import analyze_with_claude
import db.database as database

logger = logging.getLogger(__name__)

GITLAWB_NODE = "https://node.gitlawb.com"


def _log(job_id: str, msg: str) -> None:
    if job_id in scan_jobs:
        scan_jobs[job_id].setdefault("logs", []).append(msg)


def _count_files(tmpdir: str):
    ext_counts: dict = {}
    total = 0
    for root, dirs, files in os.walk(tmpdir):
        dirs[:] = [d for d in dirs if d not in {".git", "node_modules", "__pycache__", ".venv", "vendor"}]
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext:
                ext_counts[ext] = ext_counts.get(ext, 0) + 1
            total += 1
    top = sorted(ext_counts.items(), key=lambda x: x[1], reverse=True)[:4]
    summary = ", ".join(f"{c} {e}" for e, c in top) if top else "various files"
    return total, summary
GITLAWB_GITHUB_ORG = "https://github.com/gitlawb"


# ── URL parsing ────────────────────────────────────────────────────────────────

SITE_PAGES = {"node", "start", "agents", "architecture", "journal",
              "openclaude", "token", "pricing", "install"}

def _parse_gitlawb_url(url: str):
    """
    Returns (did_short, repo_name) if Gitlawb URL, else (None, None).
    did_short = first 8 chars of the key part (enough to identify, not needed for clone).
    """
    url = url.strip()

    # gitlawb://did:key:z6Mk.../repo  or  gitlawb://z6Mk.../repo
    m = re.match(r"gitlawb://(?:did:key:)?([^/]+)/([^/?#]+)", url)
    if m:
        return m.group(1), m.group(2)

    # https://gitlawb.com/node/repos/<did>/<repo>
    m = re.match(r"https?://gitlawb\.com/node/repos/([^/]+)/([^/?#]+)", url)
    if m:
        return m.group(1), m.group(2)

    # https://gitlawb.com/<did>/<repo>
    m = re.match(r"https?://gitlawb\.com/([^/]+)/([^/?#]+)", url)
    if m and m.group(1) not in SITE_PAGES:
        return m.group(1), m.group(2)

    return None, None


# ── Clone helpers ──────────────────────────────────────────────────────────────

def _run_clone(clone_url: str, tmpdir: str, branch: str = None) -> subprocess.CompletedProcess:
    args = ["git", "clone", "--depth=1"]
    if branch:
        args += ["--branch", branch]
    args += [clone_url, tmpdir]
    return subprocess.run(args, capture_output=True, text=True, timeout=120)


def _clone_repo(repo_url: str, tmpdir: str, branch: str = "main") -> None:
    """
    Clone repo into tmpdir. Raises Exception on failure.

    For Gitlawb URLs, tries in order:
      1. GitHub mirror: github.com/gitlawb/<repo_name>
      2. Gitlawb node HTTP API: node.gitlawb.com/git/<short_did>/<repo>
    """
    did_key, repo_name = _parse_gitlawb_url(repo_url)

    if not did_key:
        # Plain GitHub or other git URL — clone directly
        result = _run_clone(repo_url, tmpdir, branch)
        if result.returncode != 0:
            result = _run_clone(repo_url, tmpdir, None)
        if result.returncode != 0:
            raise Exception(f"Git clone failed: {result.stderr[:400]}")
        return

    # ── Gitlawb repo ──────────────────────────────────────────────────────────
    errors = []
    short_did = did_key[:8] if len(did_key) > 8 else did_key

    def _try(url: str) -> bool:
        shutil.rmtree(tmpdir, ignore_errors=True)
        os.makedirs(tmpdir, exist_ok=True)
        for br in [branch, None]:
            r = _run_clone(url, tmpdir, br)
            if r.returncode == 0:
                logger.info(f"Cloned via: {url}")
                return True
        errors.append(f"{url}: {r.stderr.strip()[:200]}")
        return False

    # Strategy 0: Resolve clone URL via Gitlawb REST API v1
    for api_url in [
        f"{GITLAWB_NODE}/api/v1/repos/{did_key}/{repo_name}",
        f"{GITLAWB_NODE}/api/v1/repos/{short_did}/{repo_name}",
    ]:
        try:
            with httpx.Client(timeout=10, follow_redirects=True) as client:
                resp = client.get(api_url, headers={"Accept": "application/json"})
            if resp.status_code == 200:
                data = resp.json()
                clone_url = (
                    data.get("clone_url") or data.get("cloneUrl") or
                    data.get("http_url") or data.get("httpUrl")
                )
                if clone_url and _try(clone_url):
                    return
                # Also try owner_did + repo_name directly
                owner_did = data.get("owner_did", "").lstrip("did:key:")
                if owner_did:
                    if _try(f"{GITLAWB_NODE}/{owner_did}/{repo_name}.git"):
                        return
        except Exception as e:
            logger.debug(f"API resolve failed ({api_url}): {e}")

    # Strategy 1: GitHub mirror (gitlawb org mirrors many repos)
    if _try(f"{GITLAWB_GITHUB_ORG}/{repo_name}"):
        return

    # Strategy 2: Gitlawb node smart-HTTP (full DID)
    if _try(f"{GITLAWB_NODE}/git/{did_key}/{repo_name}"):
        return

    # Strategy 3: Gitlawb node smart-HTTP (short DID)
    if short_did != did_key and _try(f"{GITLAWB_NODE}/git/{short_did}/{repo_name}"):
        return

    # Strategy 4: gl CLI via WSL (Windows) or native gl (Linux/macOS)
    gl_wsl = subprocess.run(
        ["wsl", "-d", "Ubuntu", "-e", "bash", "-c", "which gl"],
        capture_output=True, text=True
    )
    if gl_wsl.returncode == 0:
        import uuid, shlex
        wsl_tmp = f"/tmp/glscan_{uuid.uuid4().hex[:8]}"
        gitlawb_url = shlex.quote(f"gitlawb://{did_key}/{repo_name}")
        wsl_tmp_q = shlex.quote(wsl_tmp)
        clone_cmd = f"git clone --depth=1 {gitlawb_url} {wsl_tmp_q} 2>&1"
        result = subprocess.run(
            ["wsl", "-d", "Ubuntu", "-e", "bash", "-c", clone_cmd],
            capture_output=True, text=True, timeout=120
        )
        if result.returncode == 0:
            logger.info(f"Cloned via WSL git-remote-gitlawb: gitlawb://{did_key}/{repo_name}")
            shutil.rmtree(tmpdir, ignore_errors=True)
            shutil.copytree(f"\\\\wsl.localhost\\Ubuntu{wsl_tmp}", tmpdir)
            subprocess.run(["wsl", "-d", "Ubuntu", "-e", "bash", "-c", f"rm -rf {wsl_tmp}"],
                           capture_output=True)
            return
        errors.append(f"wsl git clone gitlawb://: {result.stdout.strip()[:300]}")
    else:
        # Native gl CLI (Linux/macOS)
        native_gl = subprocess.run(["which", "gl"], capture_output=True, text=True)
        if native_gl.returncode == 0:
            shutil.rmtree(tmpdir, ignore_errors=True)
            result = subprocess.run(
                ["gl", "clone", f"gitlawb://{did_key}/{repo_name}", tmpdir],
                capture_output=True, text=True, timeout=120
            )
            if result.returncode == 0:
                logger.info(f"Cloned via native gl: gitlawb://{did_key}/{repo_name}")
                return
            errors.append(f"gl clone: {result.stderr.strip()[:200]}")

    raise Exception(
        f"Cannot clone Gitlawb repo '{repo_name}' — no accessible mirror found.\n"
        f"Tried all strategies including WSL gl CLI.\n"
        f"Errors:\n" + "\n".join(errors)
    )


# ── Persistence helper ─────────────────────────────────────────────────────────

def _repo_meta(url: str) -> tuple[str, str]:
    url = url.strip().rstrip("/")
    if "github.com" in url:
        return "github", url.split("github.com/", 1)[-1]
    if "gitlawb.com" in url:
        return "gitlawb", url.split("gitlawb.com/", 1)[-1]
    if url.startswith("gitlawb://"):
        return "gitlawb", url.split("gitlawb://", 1)[-1]
    return "other", url


async def _persist_scan(job_id: str, repo_url: str, report: dict) -> None:
    platform, repo_name = _repo_meta(repo_url)
    await database.upsert_scan(
        repo_url=repo_url.strip().rstrip("/"),
        repo_name=repo_name,
        platform=platform,
        risk_score=report.get("risk_score", 0),
        severity=report.get("severity", "unknown"),
        auto=scan_jobs[job_id].get("auto", False),
        job_id=job_id,
    )


# ── Main orchestrator ──────────────────────────────────────────────────────────

async def run_full_scan(job_id: str, repo_url: str, branch: str = "main"):
    tmpdir = None
    try:
        repo_short = repo_url.replace("https://", "").rstrip("/")

        scan_jobs[job_id]["status"] = "cloning"
        _log(job_id, f"Cloning {repo_short}...")
        tmpdir = tempfile.mkdtemp(prefix="glscan_")

        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, _clone_repo, repo_url, tmpdir, branch)

        total_files, file_summary = _count_files(tmpdir)
        _log(job_id, f"Cloned — {total_files} files ({file_summary})")

        scan_jobs[job_id]["status"] = "scanning"
        _log(job_id, f"Starting Semgrep SAST on {total_files} files...")
        _log(job_id, "Scanning for hardcoded secrets (Trufflehog)...")
        _log(job_id, "Auditing dependencies for CVEs...")

        secrets_res, sast_res, deps_res, malware_res = await asyncio.gather(
            scan_secrets(tmpdir),
            scan_sast(tmpdir),
            scan_dependencies(tmpdir),
            scan_malware(tmpdir),
            return_exceptions=True,
        )

        def safe(r):
            return r if not isinstance(r, Exception) else {
                "error": str(r), "findings": [], "count": 0
            }

        raw = {
            "secrets":      safe(secrets_res),
            "sast":         safe(sast_res),
            "dependencies": safe(deps_res),
            "malware":      safe(malware_res),
        }

        sc = raw["secrets"].get("count", 0) or 0
        sa = raw["sast"].get("count", 0) or 0
        dc = raw["dependencies"].get("count", 0) or 0
        mc = raw["malware"].get("count", 0) or 0

        _log(job_id, f"Secrets scan done — {sc} secret{'s' if sc != 1 else ''} found")
        _log(job_id, f"SAST done — {sa} issue{'s' if sa != 1 else ''} found")
        _log(job_id, f"Dependency audit done — {dc} vuln{'s' if dc != 1 else ''} found")
        if mc > 0:
            crit = raw["malware"].get("critical", 0)
            _log(job_id, f"Malware scan — {mc} indicator{'s' if mc != 1 else ''} found ({crit} critical)")
        else:
            _log(job_id, "Malware scan — clean")

        scan_jobs[job_id]["status"] = "analyzing"
        total_findings = sc + sa + dc + mc
        from ai.analyzer import MINIMAX_API_KEY, ANTHROPIC_API_KEY
        ai_name = "MiniMax M2.7" if MINIMAX_API_KEY else "Claude" if ANTHROPIC_API_KEY else "heuristic"
        _log(job_id, f"Sending {total_findings} findings to {ai_name}...")
        _log(job_id, "Generating executive summary and risk score...")

        report = await analyze_with_claude(repo_url, raw)

        # Embed raw counts so the frontend radar chart has data without re-fetching
        report["raw_counts"] = {
            "secrets": sc,
            "sast": sa,
            "deps": dc,
            "malware": mc,
            "malware_crit": raw["malware"].get("critical", 0),
            "malware_high": raw["malware"].get("high", 0),
        }

        risk = report.get("risk_score", "?")
        severity = report.get("severity", "").upper()
        _log(job_id, f"Analysis complete — Risk score: {risk} ({severity})")

        increment_scan_completed(total_findings)
        add_recent_scan(repo_url, report.get("risk_score", 0), report.get("severity", "unknown"))
        await _persist_scan(job_id, repo_url, report)
        await database.store_report(job_id, repo_url, report)
        scan_jobs[job_id]["status"] = "complete"
        scan_jobs[job_id]["result"] = {
            "repo_url": repo_url,
            "raw": raw,
            "report": report,
        }

    except Exception as e:
        logger.error(f"Scan {job_id} failed: {e}")
        scan_jobs[job_id]["status"] = "error"
        scan_jobs[job_id]["error"] = str(e)
    finally:
        if tmpdir and os.path.exists(tmpdir):
            shutil.rmtree(tmpdir, ignore_errors=True)
