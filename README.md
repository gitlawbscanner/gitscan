# gitscan

Security scanner for Gitlawb and GitHub repositories. Paste a repo URL, get a full AI-powered security report — secrets, SAST, dependency vulnerabilities, and malware detection.

Built to be the first security tool in the [Gitlawb](https://gitlawb.com) ecosystem.

---

## Chrome Extension

**Install from Chrome Web Store** *(pending review)*

**Or install manually (any Chrome-based browser):**

1. [Download the extension as a ZIP](https://github.com/gitlawbscanner/gitscan/archive/refs/heads/main.zip)
2. Extract the ZIP, then go to the `extension/` folder inside
3. Open Chrome and go to `chrome://extensions`
4. Enable **Developer mode** (toggle in the top-right corner)
5. Click **Load unpacked** and select the `extension/` folder
6. The gitscan icon will appear in your toolbar — pin it for easy access

> The extension auto-detects GitHub and Gitlawb repo pages and lets you scan with one click.

---

## What it does

- **Secrets detection** — TruffleHog scans your entire commit history for leaked API keys, tokens, and credentials
- **SAST analysis** — Semgrep + Bandit find injection flaws and security anti-patterns in your code
- **Dependency audit** — pip-audit, npm audit, and OSV.dev check your packages against known CVEs
- **Malware detection** — detects obfuscated eval, crypto miners, backdoors, and malicious install scripts
- **AI report** — MiniMax M2.7 (with Claude fallback) synthesizes findings into a plain-English report with risk scores and fix recommendations
- **Share card** — generate a pixel-art security card and share your scan result on X
- **Telegram bot** — run `/scan <url>` from Telegram and get the full report in your chat

---

## Requirements

**Backend**
- Python 3.10+
- pip
- git (must be in PATH)

**Frontend**
- Node.js 18+
- npm

**Optional tools** (auto-installed by `start.sh` if missing)
- [semgrep](https://semgrep.dev) — SAST scanner
- [trufflehog](https://github.com/trufflesecurity/trufflehog) — secrets scanner
- [bandit](https://bandit.readthedocs.io) — Python security linter

---

## Installation

### 1. Clone the repo

```bash
git clone https://github.com/gitlawbscanner/gitscan.git
cd gitscan
```

### 2. Set up the backend

```bash
cd backend
cp .env.example .env
```

Edit `.env` and fill in your keys:

```env
ANTHROPIC_API_KEY=sk-ant-...        # required — get one at console.anthropic.com
TELEGRAM_BOT_TOKEN=...              # optional — from @BotFather on Telegram
GLSCAN_API_URL=http://localhost:8000
```

Install dependencies and start:

```bash
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Or use the one-command script (also installs semgrep, trufflehog, bandit):

```bash
chmod +x start.sh
./start.sh
```

The API will be available at `http://localhost:8000`.

### 3. Set up the frontend

In a separate terminal:

```bash
cd app
cp .env.example .env
npm install
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/scan` | Start a scan — body: `{"repo_url": "https://..."}` |
| `GET` | `/scan/{job_id}` | Poll scan status and result |
| `GET` | `/health` | Health check |

**Example:**

```bash
# Start a scan
curl -X POST http://localhost:8000/scan \
  -H "Content-Type: application/json" \
  -d '{"repo_url": "https://github.com/owner/repo"}'

# Poll result (replace JOB_ID)
curl http://localhost:8000/scan/JOB_ID
```

---

## Production deployment

**Backend** — deploy to any Python host (Railway, Render, Fly.io):

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```

**Frontend** — build and deploy to Vercel, Netlify, or Cloudflare Pages:

```bash
cd app
VITE_API_URL=https://your-backend-url.com npm run build
# deploy the app/dist/ folder
```

---

## Tech stack

| Layer | Tech |
|-------|------|
| Frontend | React 19, Vite 7, TypeScript, Tailwind CSS |
| Backend | Python, FastAPI, asyncio |
| Secrets | TruffleHog → regex fallback |
| SAST | Semgrep → Bandit → regex fallback |
| Dependencies | pip-audit / npm audit → OSV.dev API |
| AI | MiniMax M2.7 (primary) + Claude Sonnet (fallback) |
| Bot | python-telegram-bot |

---

## CA

`0x46BC5B1b003e9659d5638715e3302e15C372d59d`
