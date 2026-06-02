import json
import logging
import os
import re
import httpx

logger = logging.getLogger(__name__)

MINIMAX_API_KEY  = os.getenv("MINIMAX_API_KEY", "")
MINIMAX_MODEL    = "minimax-m2.7"
MINIMAX_ENDPOINT = "https://api.minimaxi.chat/v1/chat/completions"

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_MODEL   = "claude-sonnet-4-20250514"


def _sev_breakdown(findings: list, tool: str) -> dict:
    """Count findings by severity level for a given tool."""
    counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for f in findings:
        if tool == "semgrep":
            raw = f.get("extra", {}).get("severity", "").upper()
            sev = "high" if raw == "ERROR" else "medium" if raw == "WARNING" else "low"
        elif tool == "bandit":
            raw = f.get("issue_severity", "").upper()
            sev = "high" if raw == "HIGH" else "medium" if raw == "MEDIUM" else "low"
        elif tool == "malware":
            sev = f.get("severity", "low").lower()
            sev = sev if sev in counts else "low"
        else:
            sev = "medium"
        counts[sev] = counts.get(sev, 0) + 1
    return counts


def _weighted_score(secrets: int, sast_breakdown: dict, deps: int,
                    malware_crit: int, malware_high: int) -> int:
    """
    Heuristic score when no AI key is available.
    Weights: secrets=15, malware_crit=20, malware_high=10,
             sast_high=8, sast_med=3, deps=5.
    Capped at 95.
    """
    score = 0
    score += min(secrets * 15, 45)
    score += min(malware_crit * 20, 40)
    score += min(malware_high * 10, 20)
    score += min(sast_breakdown.get("high", 0) * 8, 24)
    score += min(sast_breakdown.get("medium", 0) * 3, 15)
    score += min(deps * 5, 25)
    return min(score, 95)


def _build_prompt(repo_url: str, raw: dict) -> str:
    secrets_findings  = raw.get("secrets", {}).get("findings", [])
    sast_findings     = raw.get("sast", {}).get("findings", [])
    deps_findings     = raw.get("dependencies", {}).get("findings", [])
    deps_runtime      = [f for f in deps_findings if not f.get("is_dev")]
    deps_dev          = [f for f in deps_findings if f.get("is_dev")]
    malware_findings  = raw.get("malware", {}).get("findings", [])

    secrets_count = len(secrets_findings)
    sast_count    = len(sast_findings)
    deps_count    = len(deps_runtime)  # only count runtime deps toward score
    malware_count = len(malware_findings)
    malware_crit  = raw.get("malware", {}).get("critical", 0)

    sast_tool = raw.get("sast", {}).get("tool", "unknown")
    sast_bd   = _sev_breakdown(sast_findings, sast_tool)

    secrets_sample = secrets_findings[:6]
    sast_sample    = sast_findings[:6]
    deps_sample    = deps_findings[:6]
    malware_sample = malware_findings[:6]

    return f"""You are gitscan, an expert security analysis AI for Gitlawb and GitHub repositories.

Repository: {repo_url}

SCAN RESULTS (all findings are already deduplicated — each entry is a unique issue type):
- Secrets found: {secrets_count}
- SAST issues: {sast_count} unique rules triggered (tool: {sast_tool})
  Severity breakdown: {sast_bd['high']} high, {sast_bd['medium']} medium, {sast_bd['low']} low
- Vulnerable dependencies: {len(deps_findings)} total ({len(deps_runtime)} runtime, {len(deps_dev)} dev-only — dev deps count 3× less)
- Malware indicators: {malware_count} ({malware_crit} critical)

SECRETS SAMPLE:
{json.dumps(secrets_sample, indent=2)}

SAST SAMPLE:
{json.dumps(sast_sample, indent=2)}

DEPENDENCIES SAMPLE:
{json.dumps(deps_sample, indent=2)}

MALWARE INDICATORS:
{json.dumps(malware_sample, indent=2)}

IMPORTANT CONTEXT FOR ACCURATE SCORING:
- Findings are already deduplicated. "3 SAST issues" means 3 distinct vulnerability categories, not 3 lines.
- Security tool repositories (scanners, linters, pentest tools) legitimately use subprocess, shell patterns, and references to malware/security strings. These are NOT vulnerabilities in that context.
- Subprocess calls using list form (not shell=True) are safe and should not meaningfully raise the score.
- Low/medium SAST findings without secrets or real CVEs should NOT push the score above 35.
- Dependency findings marked "is_dev: true" are dev/build tools not shipped to production — weight these 3× less than runtime deps.
- Popular open-source projects (React, Next.js, TypeScript, Vite, etc.) often have known CVEs in dev tooling — this does NOT make them "dangerous".

SCORING RUBRIC — follow this strictly:
- 0–10   (clean): Zero real issues. Only info-level or expected tool patterns.
- 11–25  (low): Minor SAST warnings only, no secrets, no CVEs, no malware. Subprocess/tool patterns OK.
- 26–45  (medium): Multiple real medium SAST issues, or 1–2 non-critical CVEs, no secrets.
- 46–65  (high): High-severity SAST findings, or real vulnerable dependencies, or minor secrets.
- 66–85  (critical): Hardcoded secrets/API keys, multiple high CVEs, or confirmed malware indicators.
- 86–100 (critical): Active malware, credential theft, backdoors, or multiple hardcoded secrets.

Respond ONLY with valid JSON (no markdown, no backticks, no extra text):
{{
  "severity": "critical|high|medium|low|clean",
  "risk_score": <integer 0-100>,
  "summary": "<2-3 sentence plain English summary of the security posture>",
  "findings_summary": [
    {{
      "category": "secrets|sast|dependencies|malware",
      "severity": "critical|high|medium|low",
      "title": "<short title>",
      "description": "<what the issue is and why it matters>",
      "recommendation": "<concrete fix action>"
    }}
  ],
  "top_recommendations": ["<actionable step 1>", "<actionable step 2>", "<actionable step 3>"],
  "gitlawb_notes": "<optional: notes for decentralized/Gitlawb repos — empty string if not relevant>"
}}

If total findings are 0, severity MUST be "clean" and risk_score MUST be 0-5."""


def _parse_response(text: str) -> dict:
    # Strip <think>...</think> reasoning chain (MiniMax M2.7 is a reasoning model)
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.DOTALL).strip()
    text = text.replace("```json", "").replace("```", "").strip()
    return json.loads(text)


async def _call_minimax(prompt: str) -> dict:
    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            MINIMAX_ENDPOINT,
            headers={
                "Authorization": f"Bearer {MINIMAX_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": MINIMAX_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 4096,
            },
        )
        resp.raise_for_status()
        data = resp.json()
    text = data["choices"][0]["message"]["content"].strip()
    return _parse_response(text)


async def _call_claude(prompt: str) -> dict:
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://api.anthropic.com/v1/messages",
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": 2000,
                "messages": [{"role": "user", "content": prompt}],
            },
        )
        resp.raise_for_status()
        data = resp.json()
    text = data["content"][0]["text"].strip()
    return _parse_response(text)


async def analyze_with_claude(repo_url: str, raw: dict) -> dict:
    """Primary: MiniMax. Fallback: Claude. Fallback: heuristic."""
    prompt = _build_prompt(repo_url, raw)

    if MINIMAX_API_KEY:
        try:
            return await _call_minimax(prompt)
        except Exception as e:
            logger.error(f"MiniMax failed: {e}")

    if ANTHROPIC_API_KEY:
        try:
            return await _call_claude(prompt)
        except Exception as e:
            logger.error(f"Claude failed: {e}")
            return {
                "severity": "unknown", "risk_score": 0,
                "summary": f"AI analysis failed: {str(e)[:100]}",
                "findings_summary": [], "top_recommendations": [], "gitlawb_notes": "",
            }

    return _no_key_report(raw)


def _no_key_report(raw: dict) -> dict:
    secrets_count  = raw.get("secrets", {}).get("count", 0) or 0
    sast_findings  = raw.get("sast", {}).get("findings", [])
    sast_tool      = raw.get("sast", {}).get("tool", "unknown")
    all_deps       = raw.get("dependencies", {}).get("findings", [])
    # Only runtime deps count toward the heuristic score; devDeps are low-weight
    runtime_deps   = [f for f in all_deps if not f.get("is_dev")]
    dev_deps       = [f for f in all_deps if f.get("is_dev")]
    deps_count     = len(runtime_deps) + len(dev_deps) // 3
    malware_crit   = raw.get("malware", {}).get("critical", 0) or 0
    malware_high   = raw.get("malware", {}).get("high", 0) or 0

    sast_bd = _sev_breakdown(sast_findings, sast_tool)
    score   = _weighted_score(secrets_count, sast_bd, deps_count, malware_crit, malware_high)

    if score == 0:
        severity = "clean"
    elif score <= 25:
        severity = "low"
    elif score <= 45:
        severity = "medium"
    elif score <= 65:
        severity = "high"
    else:
        severity = "critical"

    total = secrets_count + len(sast_findings) + len(all_deps)
    return {
        "severity": severity,
        "risk_score": score,
        "summary": (
            f"Found {total} total issue(s) across secrets, SAST, and dependencies. "
            "Set MINIMAX_API_KEY or ANTHROPIC_API_KEY for a full AI-powered analysis."
        ),
        "findings_summary": [],
        "top_recommendations": ["Set MINIMAX_API_KEY to enable AI-powered analysis."],
        "gitlawb_notes": "",
    }
