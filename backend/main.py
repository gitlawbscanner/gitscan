import asyncio
import os
import re
import uuid
from contextlib import asynccontextmanager

from fastapi import FastAPI, BackgroundTasks, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, Response
from pydantic import BaseModel
from typing import Optional

from api.state import scan_jobs, scan_stats, recent_scans, increment_scan_started
from scanner.orchestrator import run_full_scan
from scanner.gitlawb_watcher import watch_gitlawb
import db.database as database


@asynccontextmanager
async def lifespan(app: FastAPI):
    await database.init_db()
    watcher = asyncio.create_task(watch_gitlawb())
    yield
    watcher.cancel()


app = FastAPI(title="gitscan API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

_VALID_BRANCH = re.compile(r'^[a-zA-Z0-9._/\-]{1,128}$')


class ScanRequest(BaseModel):
    repo_url: str
    branch: Optional[str] = "main"


@app.post("/scan")
async def create_scan(request: ScanRequest, background_tasks: BackgroundTasks):
    url = request.repo_url.strip()
    if not url.startswith(("https://", "http://", "gitlawb://")):
        raise HTTPException(status_code=400, detail="Invalid repo URL")
    branch = request.branch or "main"
    if not _VALID_BRANCH.match(branch):
        raise HTTPException(status_code=400, detail="Invalid branch name")
    job_id = str(uuid.uuid4())
    scan_jobs[job_id] = {"status": "queued", "result": None, "error": None, "repo_url": url, "logs": []}
    increment_scan_started()
    background_tasks.add_task(run_full_scan, job_id, url, branch)
    return {"job_id": job_id, "status": "queued"}


@app.get("/scan/{job_id}")
async def get_scan(job_id: str):
    if job_id not in scan_jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    return scan_jobs[job_id]


@app.get("/stats")
async def get_stats():
    return scan_stats


@app.get("/recent")
async def get_recent():
    if database.is_enabled():
        return await database.get_recent(100)
    return recent_scans


@app.get("/live")
async def get_live():
    return [
        {"job_id": jid, "repo_url": j.get("repo_url", ""), "status": j["status"], "logs": j.get("logs", []), "auto": j.get("auto", False)}
        for jid, j in scan_jobs.items()
        if j["status"] not in ("complete", "error")
    ]


@app.get("/intel")
async def get_intel():
    scans = await database.get_recent(500) if database.is_enabled() else recent_scans

    if not scans:
        return {"total_scanned": 0, "severity_dist": {}, "avg_risk_score": 0,
                "most_dangerous": [], "most_scanned": [], "recent_critical": [],
                "auto_scanned": 0, "gitlawb_count": 0, "github_count": 0}

    sev_dist: dict = {}
    scores = []
    auto_count = 0
    gl_count = 0
    gh_count = 0

    for s in scans:
        sev = s.get("severity", "unknown")
        sev_dist[sev] = sev_dist.get(sev, 0) + 1
        if s.get("risk_score"):
            scores.append(s["risk_score"])
        if s.get("auto"):
            auto_count += 1
        if s.get("platform") == "gitlawb":
            gl_count += 1
        else:
            gh_count += 1

    avg_score = round(sum(scores) / len(scores), 1) if scores else 0
    by_risk = sorted(scans, key=lambda x: x.get("risk_score", 0), reverse=True)
    by_count = sorted(scans, key=lambda x: x.get("scan_count", 0), reverse=True)
    critical = [s for s in scans if s.get("severity") == "critical"]

    return {
        "total_scanned": len(scans),
        "severity_dist": sev_dist,
        "avg_risk_score": avg_score,
        "most_dangerous": by_risk[:10],
        "most_scanned": by_count[:5],
        "recent_critical": critical[:8],
        "auto_scanned": auto_count,
        "gitlawb_count": gl_count,
        "github_count": gh_count,
    }


@app.get("/trending")
async def get_trending():
    import math, time as _time
    scans = await database.get_recent(500) if database.is_enabled() else recent_scans
    now = _time.time()
    def trending_score(s):
        hours_ago = (now - s.get("last_scanned", s.get("timestamp", now))) / 3600
        return s.get("scan_count", 1) / (1 + math.log1p(hours_ago))
    ranked = sorted(scans, key=trending_score, reverse=True)
    return ranked[:50]


@app.get("/report/{job_id}")
async def get_report(job_id: str):
    # Check in-memory first (fast path)
    if job_id in scan_jobs:
        job = scan_jobs[job_id]
        if job["status"] == "complete" and job.get("result"):
            return {"job_id": job_id, "repo_url": job["result"]["repo_url"], "report": job["result"]["report"]}
        if job["status"] == "error":
            raise HTTPException(status_code=400, detail=job.get("error", "Scan failed"))
        raise HTTPException(status_code=202, detail="Scan still in progress")
    # Fall back to DB
    data = await database.get_report(job_id)
    if not data:
        raise HTTPException(status_code=404, detail="Report not found")
    return data


@app.get("/privacy", response_class=HTMLResponse)
async def privacy_policy():
    return """<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Privacy Policy — gitscan</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{background:#000;color:rgba(255,255,255,.8);font-family:'IBM Plex Mono','Courier New',monospace;padding:clamp(48px,8vw,96px) clamp(20px,8vw,48px);line-height:1.7}
    .wrap{max-width:800px;margin:0 auto}
    h1{font-size:clamp(22px,4vw,30px);font-weight:700;color:#fff;letter-spacing:.04em;text-transform:uppercase;margin-bottom:8px}
    .meta{font-size:11px;color:rgba(255,255,255,.3);letter-spacing:.05em;margin-bottom:32px}
    p{font-size:12px;color:rgba(255,255,255,.55);margin-bottom:12px;max-width:720px}
    h2{font-size:12px;font-weight:700;color:#fff;letter-spacing:.1em;text-transform:uppercase;margin-top:40px;margin-bottom:12px;border-left:2px solid rgba(255,255,255,.3);padding-left:12px}
    ul{padding-left:20px;margin-bottom:12px}
    li{font-size:12px;color:rgba(255,255,255,.55);margin-bottom:6px}
    strong{color:#fff}
    code{color:rgba(255,255,255,.6);background:rgba(255,255,255,.06);padding:1px 5px}
    a{color:rgba(255,255,255,.6)}
    a:hover{color:#fff}
    footer{margin-top:64px;padding-top:24px;border-top:1px solid rgba(255,255,255,.07);font-size:10px;color:rgba(255,255,255,.2);letter-spacing:.06em;text-transform:uppercase}
  </style>
</head>
<body>
<div class="wrap">
  <h1>Privacy Policy</h1>
  <p class="meta">Last updated: May 2026 &middot; gitscan Chrome Extension &amp; Web App</p>

  <p>gitscan is an open-source security scanner for Git repositories. This policy explains what data is collected, how it is used, and your rights.</p>

  <h2>1. Data We Collect</h2>
  <p>The extension collects only the minimum data required to perform a security scan:</p>
  <ul>
    <li><strong>Repository URL</strong> &mdash; the public Git repository URL you submit. Sent to our backend API to initiate the scan.</li>
    <li><strong>Scan results</strong> &mdash; security findings returned by the backend, displayed in the extension popup.</li>
  </ul>
  <p>We do <strong>not</strong> collect your name, email, IP address, browsing history, authentication tokens, or any personal information.</p>

  <h2>2. How Data Is Used</h2>
  <ul>
    <li>Repository URLs are cloned temporarily on our server for static analysis, then deleted immediately.</li>
    <li>Scan results are stored to generate a shareable report link (e.g. <code>/report/UUID</code>).</li>
    <li>No data is sold, rented, or shared with advertisers.</li>
  </ul>

  <h2>3. Remote Connections</h2>
  <p>The extension communicates exclusively with the gitscan backend at <code>gitscan-production.up.railway.app</code> to submit repository URLs and retrieve JSON scan results. No scripts or executable code are ever received from the remote server.</p>

  <h2>4. Third-Party AI Services</h2>
  <p>Scan analysis may use AI services (MiniMax, Anthropic Claude) to generate security summaries. Only sanitized code content from the scanned repository is sent &mdash; no user identity data.</p>

  <h2>5. Data Retention</h2>
  <p>Scan results are stored for 30 days then automatically deleted. Cloned repository files are deleted immediately after scanning completes.</p>

  <h2>6. Your Rights</h2>
  <p>Since we do not collect personal data, there is no personal profile to delete. You may request deletion of a specific scan report by contacting us.</p>

  <h2>7. Contact</h2>
  <p>Open an issue at <a href="https://github.com/gitlawbscanner/gitscan" target="_blank" rel="noopener">github.com/gitlawbscanner/gitscan</a> or message <a href="https://x.com/gitlawbscan" target="_blank" rel="noopener">@gitlawbscan on X</a>.</p>

  <footer>&copy; 2026 gitscan &middot; Open source &middot; No tracking</footer>
</div>
</body>
</html>"""


@app.get("/search")
async def search_repos(q: str = Query("", min_length=0), limit: int = Query(20, le=100)):
    scans = await database.get_recent(500) if database.is_enabled() else recent_scans
    q = q.strip().lower()
    if not q:
        return scans[:limit]
    results = [s for s in scans if q in (s.get("repo_url") or "").lower()]
    return results[:limit]


@app.get("/history")
async def get_scan_history(repo: str = Query(...), limit: int = Query(30, le=100)):
    return await database.get_history(repo.strip().rstrip("/"), limit)


@app.get("/badge")
async def get_badge(repo: str = Query(...)):
    scans = await database.get_recent(500) if database.is_enabled() else recent_scans
    match = next((s for s in scans if (s.get("repo_url") or "").lower().rstrip("/") == repo.lower().rstrip("/")), None)

    if not match:
        color, label, score = "9e9e9e", "not scanned", "?"
    else:
        sev = match.get("severity", "unknown").lower()
        score = match.get("risk_score", "?")
        color = {"critical": "d32f2f", "high": "f57c00", "medium": "f9a825", "low": "388e3c", "clean": "388e3c"}.get(sev, "9e9e9e")
        label = sev.upper()

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" width="180" height="20">
  <linearGradient id="b" x2="0" y2="100%"><stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="180" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="110" height="20" fill="#555"/>
    <rect x="110" width="70" height="20" fill="#{color}"/>
    <rect width="180" height="20" fill="url(#b)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="11">
    <text x="55" y="15" fill="#010101" fill-opacity=".3">gitscan score</text>
    <text x="55" y="14">gitscan score</text>
    <text x="145" y="15" fill="#010101" fill-opacity=".3">{score} · {label}</text>
    <text x="145" y="14">{score} · {label}</text>
  </g>
</svg>"""
    return Response(content=svg, media_type="image/svg+xml", headers={"Cache-Control": "max-age=300"})


@app.get("/health")
async def health():
    import os
    return {
        "status": "ok",
        "minimax": bool(os.getenv("MINIMAX_API_KEY")),
        "claude": bool(os.getenv("ANTHROPIC_API_KEY")),
        "db": database.is_enabled(),
    }
