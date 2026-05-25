import asyncio
import json
import os
import re


SKIP_DIRS = {".git", "node_modules", "__pycache__", ".venv", "venv", "dist", "build"}

# Basic pattern-based SAST as last resort
BASIC_PATTERNS = {
    "python": {
        "SQL Injection Risk":     r"(?i)(execute|cursor\.execute)\s*\(\s*['\"].*%[s|d]",
        "eval() Usage":           r"(?<![_\w])eval\s*\(",
        "Shell Injection Risk":   r"(?i)(os\.system|subprocess\.call|popen)\s*\([^)]*\+[^)]*\)",
        "Hardcoded Debug":        r"(?i)^[^#]*DEBUG\s*=\s*True",
        "pickle.loads":           r"pickle\.loads\s*\(",
        "MD5/SHA1 Usage":         r"hashlib\.(md5|sha1)\s*\(",
    },
    "javascript": {
        "eval() Usage":           r"(?<![_\w])eval\s*\(",
        "innerHTML Assignment":   r"\.innerHTML\s*=(?!=)",
        "document.write":         r"document\.write\s*\(",
        "setTimeout String":      r"setTimeout\s*\(\s*['\"]",
        "Prototype Pollution":    r"__proto__\s*\[",
        "SQL Injection Risk":     r"(?i)(query|execute)\s*\([^)]*\+\s*req\.",
    },
    "generic": {
        "Hardcoded Password":     r"(?i)(?:password|passwd|pwd)\s*=\s*['\"][^'\"]{6,}['\"](?!\s*#\s*example)",
    },
}

EXT_LANG = {
    ".py": "python",
    ".js": "javascript", ".jsx": "javascript",
    ".ts": "javascript", ".tsx": "javascript",
}

# Bandit tests to skip — these are extremely noisy for any codebase that
# legitimately uses subprocess (scanners, CLIs, devtools). They are not real
# vulnerabilities when subprocess is called with a list (not shell=True).
# B404=import-subprocess, B603=subprocess-without-shell, B605=start-with-shell,
# B606=start-without-shell, B607=partial-path, B608=hardcoded-sql (FP-prone).
_BANDIT_SKIP = "B404,B603,B605,B606,B607,B608"


def _dedup_findings(findings: list, tool: str) -> list:
    """
    Deduplicate by rule/test ID so the same issue pattern across many files
    counts as one finding. Keeps the highest-severity example of each rule.
    """
    seen: dict = {}
    for f in findings:
        if tool == "semgrep":
            key = f.get("check_id", "")
        elif tool == "bandit":
            key = f.get("test_id", "")
        else:
            key = f.get("check_id", f.get("extra", {}).get("message", ""))

        if not key:
            seen[id(f)] = f
            continue

        if key not in seen:
            seen[key] = f
        else:
            # Keep the higher-severity example
            existing_sev = _sev_rank(seen[key], tool)
            new_sev      = _sev_rank(f, tool)
            if new_sev > existing_sev:
                seen[key] = f

    return list(seen.values())


def _sev_rank(finding: dict, tool: str) -> int:
    if tool == "semgrep":
        s = finding.get("extra", {}).get("severity", "").upper()
        return {"ERROR": 3, "WARNING": 2, "INFO": 1}.get(s, 0)
    elif tool == "bandit":
        s = finding.get("issue_severity", "").upper()
        return {"HIGH": 3, "MEDIUM": 2, "LOW": 1}.get(s, 0)
    return 0


async def scan_sast(repo_path: str) -> dict:
    # 1. Try Semgrep — only ERROR-level (high severity) to cut noise
    try:
        proc = await asyncio.create_subprocess_exec(
            "semgrep", "--config=auto", "--json", "--quiet",
            "--severity", "ERROR",
            "--timeout", "30",
            repo_path,
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=300)
        data = json.loads(stdout.decode(errors="ignore"))
        raw = data.get("results", [])
        findings = _dedup_findings(raw, "semgrep")
        return {"tool": "semgrep", "findings": findings, "count": len(findings)}
    except FileNotFoundError:
        pass
    except (asyncio.TimeoutError, json.JSONDecodeError):
        pass

    # 2. Try Bandit (Python only) — skip subprocess noise, medium+ only
    if _has_python(repo_path):
        try:
            proc = await asyncio.create_subprocess_exec(
                "bandit", "-r", repo_path, "-f", "json", "-q",
                "-ll",                    # medium severity and above
                "-s", _BANDIT_SKIP,       # skip subprocess-related tests
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
            data = json.loads(stdout.decode(errors="ignore"))
            raw = data.get("results", [])
            findings = _dedup_findings(raw, "bandit")
            return {"tool": "bandit", "findings": findings, "count": len(findings)}
        except (FileNotFoundError, asyncio.TimeoutError, json.JSONDecodeError):
            pass

    # 3. Basic regex SAST fallback
    return await _basic_sast(repo_path)


def _has_python(repo_path: str) -> bool:
    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        if any(f.endswith(".py") for f in files):
            return True
    return False


async def _basic_sast(repo_path: str) -> dict:
    findings = []
    seen_issues: set = set()

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in files:
            ext = os.path.splitext(fname)[1].lower()
            lang = EXT_LANG.get(ext, "generic")
            patterns = {**BASIC_PATTERNS.get(lang, {}), **BASIC_PATTERNS["generic"]}
            fpath = os.path.join(root, fname)
            try:
                if os.path.getsize(fpath) > 300_000:
                    continue
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    lines = f.readlines()
                for i, line in enumerate(lines, 1):
                    stripped = line.strip()
                    if stripped.startswith("#"):
                        continue
                    for issue, pattern in patterns.items():
                        if issue in seen_issues:
                            continue
                        if re.search(pattern, line):
                            seen_issues.add(issue)
                            findings.append({
                                "check_id": issue.lower().replace(" ", "_"),
                                "path": os.path.relpath(fpath, repo_path),
                                "start": {"line": i},
                                "extra": {
                                    "message": issue,
                                    "severity": "WARNING",
                                    "lines": line.rstrip(),
                                },
                            })
            except Exception:
                continue
    return {"tool": "basic-regex", "findings": findings, "count": len(findings)}
