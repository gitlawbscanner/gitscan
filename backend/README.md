# glscan backend

## Setup (say this to Claude Code)

"Copy .env.example to .env, fill in ANTHROPIC_API_KEY and TELEGRAM_BOT_TOKEN, then run start.sh"

## Manual run

```bash
cp .env.example .env
# edit .env with your keys

chmod +x start.sh
./start.sh
```

## Test the API

```bash
# Start a scan
curl -X POST http://localhost:8000/scan \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/gitlawb/openclaude"}'

# Returns: {"job_id": "abc-123", "status": "queued"}

# Poll result
curl http://localhost:8000/scan/abc-123
```

## Project structure

```
glscan/
├── main.py              # FastAPI app
├── api/state.py         # In-memory job store
├── scanner/
│   ├── orchestrator.py  # Runs all scanners
│   ├── secrets.py       # TruffleHog + regex
│   ├── sast.py          # Semgrep + Bandit + regex
│   └── deps.py          # OSV.dev + pip-audit + npm audit
├── ai/analyzer.py       # Claude API integration
├── bot/telegram.py      # Telegram bot
├── requirements.txt
├── .env.example
└── start.sh
```

## What actually runs a scan

1. `git clone --depth=1 <repo_url>` into a temp dir
2. **Secrets**: TruffleHog (if installed) or regex patterns
3. **SAST**: Semgrep self-hosted → Bandit → basic regex (in that order)
4. **Deps**: pip-audit/npm audit/OSV.dev API (free, no key needed)
5. **AI**: Claude API summarizes everything
6. Temp dir deleted, result stored in memory

## Env vars

| Var | Required | Description |
|-----|----------|-------------|
| ANTHROPIC_API_KEY | Yes (for AI) | Claude API key |
| TELEGRAM_BOT_TOKEN | Yes (for bot) | From @BotFather |
| GLSCAN_API_URL | No | Backend URL for bot (default: localhost:8000) |
