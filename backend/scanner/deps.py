import asyncio
import json
import os
import re
import httpx


OSV_API = "https://api.osv.dev/v1/query"


async def scan_dependencies(repo_path: str) -> dict:
    """
    Detect vulnerable dependencies.
    Primary: OSV.dev API (free, no rate limit, Google-maintained).
    Also runs pip-audit / npm audit / cargo audit if available.
    """
    tasks = []

    if _exists(repo_path, ["requirements.txt", "pyproject.toml", "setup.py", "Pipfile"]):
        tasks.append(_scan_python(repo_path))

    if _exists(repo_path, ["package.json"]):
        tasks.append(_scan_node(repo_path))

    if _exists(repo_path, ["Cargo.toml"]):
        tasks.append(_scan_rust(repo_path))

    if _exists(repo_path, ["go.mod"]):
        tasks.append(_scan_go(repo_path))

    if not tasks:
        return {"findings": [], "count": 0, "message": "No supported manifest found"}

    results = await asyncio.gather(*tasks, return_exceptions=True)
    all_findings = []
    for r in results:
        if isinstance(r, Exception):
            continue
        all_findings.extend(r.get("findings", []))

    return {"findings": all_findings, "count": len(all_findings)}


def _exists(repo_path: str, filenames: list) -> bool:
    return any(os.path.exists(os.path.join(repo_path, f)) for f in filenames)


# ─── Python ───────────────────────────────────────────────────────────────────

async def _scan_python(repo_path: str) -> dict:
    # Try pip-audit first
    try:
        req_file = os.path.join(repo_path, "requirements.txt")
        cmd = ["pip-audit", "--format", "json"]
        if os.path.exists(req_file):
            cmd += ["-r", req_file]
        else:
            cmd += ["--local"]

        proc = await asyncio.create_subprocess_exec(
            *cmd, stdout=asyncio.subprocess.PIPE, stderr=asyncio.subprocess.PIPE,
            cwd=repo_path
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
        data = json.loads(stdout.decode(errors="ignore"))
        findings = []
        for dep in data.get("dependencies", []):
            for v in dep.get("vulns", []):
                findings.append({
                    "ecosystem": "PyPI",
                    "package": dep.get("name"),
                    "version": dep.get("version"),
                    "vuln_id": v.get("id"),
                    "description": v.get("description", ""),
                    "fix_versions": v.get("fix_versions", []),
                })
        return {"tool": "pip-audit", "findings": findings}
    except Exception:
        pass

    # Fallback: parse requirements.txt and query OSV.dev
    req_path = os.path.join(repo_path, "requirements.txt")
    if os.path.exists(req_path):
        packages = _parse_requirements(req_path)
        return await _query_osv(packages, "PyPI")

    return {"tool": "osv", "findings": []}


def _parse_requirements(path: str) -> list:
    packages = []
    with open(path, "r", errors="ignore") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or line.startswith("-"):
                continue
            # Handle: package==1.0.0, package>=1.0.0, package~=1.0.0
            m = re.match(r"^([A-Za-z0-9_\-\.]+)\s*[=~><!\^]+\s*([0-9][^\s,;#]*)", line)
            if m:
                packages.append({"name": m.group(1), "version": m.group(2)})
            else:
                m2 = re.match(r"^([A-Za-z0-9_\-\.]+)", line)
                if m2:
                    packages.append({"name": m2.group(1), "version": None})
    return packages


# ─── Node ─────────────────────────────────────────────────────────────────────

async def _scan_node(repo_path: str) -> dict:
    # Try npm audit
    try:
        proc = await asyncio.create_subprocess_exec(
            "npm", "audit", "--json",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=repo_path,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
        data = json.loads(stdout.decode(errors="ignore"))
        vulns = data.get("vulnerabilities", {})
        findings = []
        for pkg, info in vulns.items():
            findings.append({
                "ecosystem": "npm",
                "package": pkg,
                "severity": info.get("severity"),
                "via": [v if isinstance(v, str) else v.get("title", "") for v in info.get("via", [])],
                "fix_available": info.get("fixAvailable", False),
            })
        return {"tool": "npm-audit", "findings": findings}
    except Exception:
        pass

    # Fallback: parse package.json and query OSV.dev
    pkg_path = os.path.join(repo_path, "package.json")
    if os.path.exists(pkg_path):
        try:
            with open(pkg_path) as f:
                pkg = json.load(f)
            deps = {}
            deps.update(pkg.get("dependencies", {}))
            deps.update(pkg.get("devDependencies", {}))
            packages = [
                {"name": k, "version": re.sub(r"[^0-9\.]", "", v)[:20]}
                for k, v in deps.items()
            ]
            return await _query_osv(packages, "npm")
        except Exception:
            pass

    return {"tool": "osv", "findings": []}


# ─── Rust ─────────────────────────────────────────────────────────────────────

async def _scan_rust(repo_path: str) -> dict:
    try:
        proc = await asyncio.create_subprocess_exec(
            "cargo", "audit", "--json",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=repo_path,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
        data = json.loads(stdout.decode(errors="ignore"))
        vulns = data.get("vulnerabilities", {}).get("list", [])
        findings = []
        for v in vulns:
            adv = v.get("advisory", {})
            findings.append({
                "ecosystem": "crates.io",
                "package": v.get("package", {}).get("name"),
                "version": v.get("package", {}).get("version"),
                "advisory_id": adv.get("id"),
                "title": adv.get("title"),
            })
        return {"tool": "cargo-audit", "findings": findings}
    except Exception:
        return {"tool": "cargo-audit", "findings": []}


# ─── Go ───────────────────────────────────────────────────────────────────────

async def _scan_go(repo_path: str) -> dict:
    try:
        proc = await asyncio.create_subprocess_exec(
            "govulncheck", "./...",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
            cwd=repo_path,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
        output = stdout.decode(errors="ignore")
        findings = []
        for line in output.splitlines():
            if "Vulnerability" in line or "GO-" in line:
                findings.append({"ecosystem": "Go", "raw": line.strip()})
        return {"tool": "govulncheck", "findings": findings}
    except Exception:
        return {"tool": "govulncheck", "findings": []}


# ─── OSV.dev API ──────────────────────────────────────────────────────────────

async def _query_osv(packages: list, ecosystem: str) -> dict:
    """
    Query OSV.dev API for vulnerabilities.
    Free, no API key, maintained by Google.
    https://osv.dev/docs/
    """
    if not packages:
        return {"tool": "osv.dev", "findings": []}

    findings = []
    # OSV supports batch query — max 1000 queries per request
    queries = []
    for pkg in packages[:100]:  # limit to 100 packages
        q = {"package": {"name": pkg["name"], "ecosystem": ecosystem}}
        if pkg.get("version"):
            q["version"] = pkg["version"]
        queries.append(q)

    try:
        async with httpx.AsyncClient(timeout=30) as client:
            resp = await client.post(
                "https://api.osv.dev/v1/querybatch",
                json={"queries": queries},
            )
            resp.raise_for_status()
            data = resp.json()

        for i, result in enumerate(data.get("results", [])):
            vulns = result.get("vulns", [])
            if vulns:
                pkg = packages[i] if i < len(packages) else {}
                for v in vulns:
                    findings.append({
                        "ecosystem": ecosystem,
                        "package": pkg.get("name"),
                        "version": pkg.get("version"),
                        "vuln_id": v.get("id"),
                        "summary": v.get("summary", ""),
                        "severity": _extract_severity(v),
                        "references": [r.get("url") for r in v.get("references", [])[:2]],
                    })
    except Exception as e:
        return {"tool": "osv.dev", "findings": [], "error": str(e)}

    return {"tool": "osv.dev", "findings": findings}


def _extract_severity(vuln: dict) -> str:
    for severity in vuln.get("severity", []):
        score = severity.get("score", "")
        if "CRITICAL" in score:
            return "critical"
        if "HIGH" in score:
            return "high"
        if "MEDIUM" in score:
            return "medium"
        if "LOW" in score:
            return "low"
    return "unknown"
