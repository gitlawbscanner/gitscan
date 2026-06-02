import asyncio
import json
import os
import re


REGEX_PATTERNS = {
    "AWS Access Key":     r"AKIA[0-9A-Z]{16}",
    "AWS Secret Key":     r"(?i)aws.{0,20}secret.{0,20}['\"]([A-Za-z0-9/+=]{40})['\"]",
    "GitHub Token":       r"ghp_[a-zA-Z0-9]{36}",
    "GitHub OAuth":       r"gho_[a-zA-Z0-9]{36}",
    "Slack Token":        r"xox[baprs]-[0-9a-zA-Z\-]{10,72}",
    "Private Key":        r"-----BEGIN (RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----",
    "Generic API Key":    r"(?i)(api[_\-]?key|apikey)\s*[:=]\s*['\"]?([a-zA-Z0-9_\-]{20,})['\"]?",
    "Generic Secret":     r"(?i)(secret|password|passwd|pwd)\s*[:=]\s*['\"]([^'\"]{8,})['\"]",
    "Bearer Token":       r"(?i)bearer\s+[a-zA-Z0-9_\-\.]{20,}",
    "Database URL":       r"(?i)(postgres|mysql|mongodb|redis):\/\/[^\s\"']+:[^\s\"']+@",
    "Anthropic API Key":  r"sk-ant-[a-zA-Z0-9\-_]{32,}",
    "OpenAI API Key":     r"sk-[a-zA-Z0-9]{48}",
    "Stripe Key":         r"(?:sk|pk)_(test|live)_[a-zA-Z0-9]{24,}",
}

SKIP_DIRS = {
    ".git", "node_modules", "__pycache__", ".venv", "venv", "vendor",
    "dist", "build", ".next", "out", "coverage", ".turbo", ".cache",
    "__tests__", "fixtures", "testdata", ".nuxt", ".output",
    "storybook-static", "generated", "gen", ".pytest_cache",
    "test", "tests", "spec", "e2e", "cypress",
}
SKIP_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".woff", ".woff2",
             ".ttf", ".eot", ".mp4", ".mp3", ".zip", ".tar", ".gz", ".pdf",
             ".lock", ".sum", ".min.js", ".min.css"}
# Example/template files contain placeholder values, not real secrets
SKIP_FILENAMES = {
    ".env.example", ".env.template", ".env.sample", ".env.test",
    ".env.development", ".env.staging", "example.env", "sample.env",
    ".env.local.example",
}
# Test file patterns — security values in tests are intentionally fake
TEST_FILE_RE = re.compile(
    r"(?:\.test\.|\.spec\.|_test\.|_spec\.)|(?:test_|spec_)"
)
# Placeholder values — common dummy tokens in docs/examples
_PLACEHOLDER_RE = re.compile(
    r"(?i)(xxx|your[_\-]?(?:key|token|secret|api)|example|placeholder|changeme|"
    r"replace.?me|xxxxxxxx|12345678|<[^>]+>|my[_\-]?(?:key|token|secret)|"
    r"dummy|fake|sample|test[_\-]?(?:key|token)|insert[_\-]?(?:key|token))"
)
MAX_FILE_BYTES = 500_000


async def scan_secrets(repo_path: str) -> dict:
    # Try TruffleHog first
    try:
        proc = await asyncio.create_subprocess_exec(
            "trufflehog", "filesystem", repo_path,
            "--json", "--no-update", "--only-verified",
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )
        stdout, _ = await asyncio.wait_for(proc.communicate(), timeout=120)
        findings = []
        for line in stdout.decode(errors="ignore").splitlines():
            line = line.strip()
            if line:
                try:
                    findings.append(json.loads(line))
                except json.JSONDecodeError:
                    pass
        return {"tool": "trufflehog", "findings": findings, "count": len(findings)}

    except FileNotFoundError:
        pass
    except asyncio.TimeoutError:
        return {"tool": "trufflehog", "findings": [], "count": 0, "error": "timeout"}

    # Regex fallback
    return await _regex_scan(repo_path)


async def _regex_scan(repo_path: str) -> dict:
    findings = []

    for root, dirs, files in os.walk(repo_path):
        dirs[:] = [d for d in dirs if d not in SKIP_DIRS]
        for fname in files:
            if fname in SKIP_FILENAMES:
                continue
            if any(fname.endswith(ext) for ext in SKIP_EXTS):
                continue
            if TEST_FILE_RE.search(fname):
                continue
            fpath = os.path.join(root, fname)
            try:
                if os.path.getsize(fpath) > MAX_FILE_BYTES:
                    continue
                with open(fpath, "r", encoding="utf-8", errors="ignore") as f:
                    content = f.read()
                for pattern_name, pattern in REGEX_PATTERNS.items():
                    for match in re.finditer(pattern, content):
                        matched = match.group(0)
                        # Skip obvious placeholder values
                        if _PLACEHOLDER_RE.search(matched):
                            continue
                        line_no = content[: match.start()].count("\n") + 1
                        # Redact long values
                        if len(matched) > 60:
                            matched = matched[:30] + "...[REDACTED]"
                        findings.append({
                            "type": pattern_name,
                            "file": os.path.relpath(fpath, repo_path),
                            "line": line_no,
                            "match": matched,
                        })
            except Exception:
                continue

    return {"tool": "regex", "findings": findings, "count": len(findings)}
