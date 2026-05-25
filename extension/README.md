# gitscan Chrome Extension

Scan any GitHub or Gitlawb repository for security vulnerabilities directly from your browser.

## Install

### Option A — Load unpacked (manual, works now)

1. Click **Code → Download ZIP** on this repo (or clone it)
2. Extract, then navigate to the `extension/` folder
3. Open Chrome → go to `chrome://extensions`
4. Enable **Developer mode** (top-right toggle)
5. Click **Load unpacked** → select this `extension/` folder
6. Pin the gitscan icon to your toolbar

> Works on Chrome, Brave, Edge, Arc, and any Chromium-based browser.

### Option B — Chrome Web Store *(coming soon)*

Submission is pending review. Will be linked here once approved.

---

## Usage

1. Open any GitHub or Gitlawb repository page
2. Click the gitscan icon in your toolbar — the repo URL is auto-detected
3. Click **SCAN** and wait for the analysis (usually 30–90 seconds)
4. View your risk score, severity badge, AI summary, and recommendations
5. Click **⬡ SHARE CARD** to generate a pixel-art security card and share on X

---

## What it scans

| Check | Tool |
|-------|------|
| Leaked secrets & API keys | TruffleHog |
| Code vulnerabilities (SAST) | Semgrep + Bandit |
| Dependency CVEs | pip-audit / npm audit / OSV.dev |
| Malware patterns | Custom static analysis |
| AI risk summary | MiniMax M2.7 + Claude |

---

## Permissions used

| Permission | Why |
|------------|-----|
| `activeTab` | Read the current tab URL to detect the repo |
| `tabs` | Open the full report page and Twitter share link |
| `host_permissions` (github.com, gitlawb.com) | Auto-detect repo URLs on these sites |

No browsing history, no personal data, no tracking.  
Full privacy policy: [gitscan-production.up.railway.app/privacy](https://gitscan-production.up.railway.app/privacy)

---

## Live demo

Web app: [gitscan-production.up.railway.app](https://gitscan-production.up.railway.app)  
Telegram bot: [@gitlawbscanbot](https://t.me/gitlawbscanbot)
