"""
glscan Telegram Bot
Commands: /start, /scan <url>, /help
"""
import asyncio
import os
import httpx
from telegram import Update
from telegram.ext import ApplicationBuilder, CommandHandler, ContextTypes
from telegram.constants import ParseMode

GLSCAN_API   = os.getenv("GLSCAN_API_URL", "http://localhost:8000")
BOT_TOKEN    = os.getenv("TELEGRAM_BOT_TOKEN", "")
POLL_INTERVAL = 4   # seconds between polls
MAX_POLLS    = 90   # max ~6 minutes

SEVERITY_EMOJI = {
    "critical": "🔴",
    "high":     "🟠",
    "medium":   "🟡",
    "low":      "🟢",
    "clean":    "✅",
    "unknown":  "⚪",
}


# ─── Handlers ────────────────────────────────────────────────────────────────

async def cmd_start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🔍 *glscan — Gitlawb Security Scanner*\n\n"
        "Scan any Gitlawb or GitHub repo for:\n"
        "• 🔑 Leaked secrets & API keys\n"
        "• 🛡️ Code vulnerabilities (SAST)\n"
        "• 📦 Vulnerable dependencies (CVEs)\n"
        "• 🧠 AI-powered analysis & fix recommendations\n\n"
        "*Usage:*\n"
        "`/scan <repo-url>`\n\n"
        "*Example:*\n"
        "`/scan https://github.com/gitlawb/openclaude`",
        parse_mode=ParseMode.MARKDOWN,
    )


async def cmd_help(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "*glscan commands:*\n\n"
        "`/scan <url>` — Run a full security scan\n"
        "`/help` — Show this message\n"
        "`/start` — Welcome message\n\n"
        "Supports Gitlawb and GitHub repos.\n"
        "No sign-up required.",
        parse_mode=ParseMode.MARKDOWN,
    )


async def cmd_scan(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    if not ctx.args:
        await update.message.reply_text(
            "❌ Please provide a repo URL.\n\n"
            "Usage: `/scan <repo-url>`",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    repo_url = ctx.args[0].strip()

    # Basic URL validation
    if not (repo_url.startswith("http://") or repo_url.startswith("https://")):
        await update.message.reply_text(
            "❌ Invalid URL. Please use a full URL starting with `https://`",
            parse_mode=ParseMode.MARKDOWN,
        )
        return

    # Start scan
    status_msg = await update.message.reply_text(
        f"🔄 Starting scan...\n`{repo_url}`",
        parse_mode=ParseMode.MARKDOWN,
    )

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            r = await client.post(
                f"{GLSCAN_API}/scan",
                json={"repo_url": repo_url},
            )
            r.raise_for_status()
            job_id = r.json()["job_id"]
    except Exception as e:
        await status_msg.edit_text(f"❌ Could not start scan: `{str(e)[:200]}`", parse_mode=ParseMode.MARKDOWN)
        return

    # Poll
    step_msgs = {
        "queued":    "⏳ Queued...",
        "cloning":   "📥 Cloning repository...",
        "scanning":  "🔬 Running security scanners...\n_(secrets · SAST · dependencies)_",
        "analyzing": "🧠 AI analyzing results...",
    }

    last_status = ""
    for _ in range(MAX_POLLS):
        await asyncio.sleep(POLL_INTERVAL)
        try:
            async with httpx.AsyncClient(timeout=10) as client:
                r = await client.get(f"{GLSCAN_API}/scan/{job_id}")
                data = r.json()
        except Exception:
            continue

        status = data.get("status", "")

        if status != last_status and status in step_msgs:
            try:
                await status_msg.edit_text(step_msgs[status], parse_mode=ParseMode.MARKDOWN)
            except Exception:
                pass
            last_status = status

        if status == "complete":
            report_text = _format_report(repo_url, data["result"])
            try:
                await status_msg.edit_text(report_text, parse_mode=ParseMode.MARKDOWN)
            except Exception:
                # Message too long — send separately
                await status_msg.delete()
                # Split into chunks of 4096
                for chunk in _split_message(report_text, 4096):
                    await update.message.reply_text(chunk, parse_mode=ParseMode.MARKDOWN)
            return

        if status == "error":
            await status_msg.edit_text(
                f"❌ *Scan failed*\n\n`{data.get('error', 'Unknown error')[:300]}`",
                parse_mode=ParseMode.MARKDOWN,
            )
            return

    await status_msg.edit_text("⏱️ Scan timed out. Please try again.")


# ─── Formatting ───────────────────────────────────────────────────────────────

def _format_report(repo_url: str, result: dict) -> str:
    report = result.get("report", {})
    raw    = result.get("raw", {})

    severity   = report.get("severity", "unknown")
    emoji      = SEVERITY_EMOJI.get(severity, "⚪")
    risk_score = report.get("risk_score", "N/A")

    secrets_count = raw.get("secrets", {}).get("count", 0)
    sast_count    = raw.get("sast", {}).get("count", 0)
    deps_count    = raw.get("dependencies", {}).get("count", 0)

    lines = [
        f"🔍 *glscan Security Report*",
        f"`{repo_url}`",
        "",
        f"{emoji} *{severity.upper()}* · Risk Score: *{risk_score}/100*",
        "",
        f"🔑 Secrets: `{secrets_count}`  🛡️ SAST: `{sast_count}`  📦 Deps: `{deps_count}`",
        "",
        f"*Summary*",
        f"{report.get('summary', 'N/A')}",
    ]

    findings = report.get("findings_summary", [])
    if findings:
        lines.append("\n*Key Findings*")
        for f in findings[:5]:
            sev_e = SEVERITY_EMOJI.get(f.get("severity", "unknown"), "⚪")
            lines.append(f"{sev_e} *{f.get('title', '')}* `[{f.get('category', '')}]`")
            lines.append(f"  ↳ {f.get('recommendation', '')}")

    recs = report.get("top_recommendations", [])
    if recs:
        lines.append("\n*Top Recommendations*")
        for i, r in enumerate(recs[:3], 1):
            lines.append(f"`{i}.` {r}")

    notes = report.get("gitlawb_notes", "")
    if notes:
        lines.append(f"\n⬡ _Gitlawb note: {notes}_")

    lines.append("\n_Powered by glscan · gitlawb.com_")
    return "\n".join(lines)


def _split_message(text: str, max_len: int) -> list:
    chunks = []
    while len(text) > max_len:
        split_at = text.rfind("\n", 0, max_len)
        if split_at == -1:
            split_at = max_len
        chunks.append(text[:split_at])
        text = text[split_at:].lstrip("\n")
    if text:
        chunks.append(text)
    return chunks


# ─── Main ─────────────────────────────────────────────────────────────────────

def run():
    if not BOT_TOKEN:
        raise RuntimeError("TELEGRAM_BOT_TOKEN is not set")

    app = ApplicationBuilder().token(BOT_TOKEN).build()
    app.add_handler(CommandHandler("start", cmd_start))
    app.add_handler(CommandHandler("help",  cmd_help))
    app.add_handler(CommandHandler("scan",  cmd_scan))

    print("🤖 glscan bot running...")
    app.run_polling(allowed_updates=["message"])


if __name__ == "__main__":
    run()
