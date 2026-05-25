#!/bin/bash
set -e

# Load .env
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✅ Loaded .env"
else
  echo "⚠️  No .env file found. Copy .env.example to .env and fill in your keys."
  exit 1
fi

# Check required env vars
if [ -z "$ANTHROPIC_API_KEY" ]; then
  echo "❌ ANTHROPIC_API_KEY is not set in .env"
  exit 1
fi

# Install Python deps
echo "📦 Installing Python dependencies..."
pip install -r requirements.txt -q

# Install security tools
echo "🔧 Checking security tools..."

if ! command -v semgrep &>/dev/null; then
  echo "  Installing semgrep..."
  pip install semgrep -q
else
  echo "  ✅ semgrep found"
fi

if ! command -v trufflehog &>/dev/null; then
  echo "  Installing trufflehog..."
  curl -sSfL https://raw.githubusercontent.com/trufflesecurity/trufflehog/main/scripts/install.sh | sh -s -- -b /usr/local/bin 2>/dev/null || echo "  ⚠️  trufflehog install failed, will use regex fallback"
else
  echo "  ✅ trufflehog found"
fi

if ! command -v bandit &>/dev/null; then
  pip install bandit -q
  echo "  ✅ bandit installed"
fi

echo ""
echo "🚀 Starting glscan backend on http://localhost:8000 ..."
uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
BACKEND_PID=$!

# Start Telegram bot if token is set
if [ -n "$TELEGRAM_BOT_TOKEN" ]; then
  echo "🤖 Starting Telegram bot..."
  sleep 2
  python -m bot.telegram &
  BOT_PID=$!
  echo "✅ Bot running (PID $BOT_PID)"
else
  echo "⚠️  TELEGRAM_BOT_TOKEN not set — skipping bot"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ glscan is running!"
echo "   API:  http://localhost:8000"
echo "   Docs: http://localhost:8000/docs"
echo "   Bot:  $([ -n "$TELEGRAM_BOT_TOKEN" ] && echo "running" || echo "not configured")"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "Press Ctrl+C to stop."

# Wait and handle exit
trap "kill $BACKEND_PID $BOT_PID 2>/dev/null; echo 'Stopped.'; exit 0" SIGINT SIGTERM
wait
