#!/usr/bin/env bash
set -euo pipefail

API="${GITSCAN_API_URL:-https://gitscan-production.up.railway.app}"
REPO_URL="${GITSCAN_REPO_URL:-}"
FAIL_ON="${GITSCAN_FAIL_ON:-high}"
SCORE_THRESHOLD="${GITSCAN_SCORE_THRESHOLD:-80}"
POST_COMMENT="${GITSCAN_POST_COMMENT:-true}"
GH_TOKEN="${GITSCAN_GITHUB_TOKEN:-}"
BRANCH="${GITSCAN_BRANCH:-main}"

# Default repo URL from GitHub context
if [ -z "$REPO_URL" ]; then
  REPO_URL="https://github.com/${GITHUB_REPOSITORY}"
fi

echo "::group::gitscan — initiating scan"
echo "  repo:   $REPO_URL"
echo "  api:    $API"
echo "  branch: $BRANCH"
echo "::endgroup::"

# Submit scan
SUBMIT=$(curl -sf -X POST "${API}/scan" \
  -H 'Content-Type: application/json' \
  -d "{\"repo_url\":\"${REPO_URL}\",\"branch\":\"${BRANCH}\"}")

JOB_ID=$(echo "$SUBMIT" | python3 -c "import sys,json; print(json.load(sys.stdin)['job_id'])")
echo "Job ID: ${JOB_ID}"
REPORT_URL="https://gitscan.gitlawbscanner.com/report/${JOB_ID}"

# Poll until complete (max 10 min)
echo "::group::Polling for results…"
ELAPSED=0
POLL_INTERVAL=10
MAX_WAIT=600

while [ $ELAPSED -lt $MAX_WAIT ]; do
  sleep $POLL_INTERVAL
  ELAPSED=$((ELAPSED + POLL_INTERVAL))

  STATUS_JSON=$(curl -sf "${API}/scan/${JOB_ID}" || echo '{"status":"error"}')
  STATUS=$(echo "$STATUS_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('status','error'))")

  echo "  [${ELAPSED}s] status: ${STATUS}"

  if [ "$STATUS" = "complete" ]; then
    RISK_SCORE=$(echo "$STATUS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('report',{}).get('risk_score',0))")
    SEVERITY=$(echo "$STATUS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('report',{}).get('severity','unknown'))")
    SUMMARY=$(echo "$STATUS_JSON" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('result',{}).get('report',{}).get('summary','')[:300])")
    break
  fi

  if [ "$STATUS" = "error" ]; then
    ERR=$(echo "$STATUS_JSON" | python3 -c "import sys,json; print(json.load(sys.stdin).get('error','unknown error'))")
    echo "::error::gitscan failed: ${ERR}"
    exit 1
  fi
done
echo "::endgroup::"

if [ "$STATUS" != "complete" ]; then
  echo "::error::gitscan timed out after ${MAX_WAIT}s"
  exit 1
fi

# Write outputs
{
  echo "job_id=${JOB_ID}"
  echo "risk_score=${RISK_SCORE}"
  echo "severity=${SEVERITY}"
  echo "report_url=${REPORT_URL}"
} >> "$GITHUB_OUTPUT"

# Print summary
echo "::group::gitscan Results"
echo "  Risk Score : ${RISK_SCORE}/100"
echo "  Severity   : ${SEVERITY}"
echo "  Report     : ${REPORT_URL}"
echo "  Summary    : ${SUMMARY}"
echo "::endgroup::"

# Write step summary
cat >> "$GITHUB_STEP_SUMMARY" << EOF
## gitscan Security Report

| | |
|---|---|
| **Risk Score** | ${RISK_SCORE}/100 |
| **Severity** | ${SEVERITY} |
| **Report** | [View full report](${REPORT_URL}) |

${SUMMARY}
EOF

# Post PR comment
if [ "$POST_COMMENT" = "true" ] && [ -n "$GH_TOKEN" ] && [ "$GITHUB_EVENT_NAME" = "pull_request" ] && [ -n "${GITHUB_PR_NUMBER:-}" ]; then
  SEV_EMOJI="✅"
  case "$SEVERITY" in
    critical) SEV_EMOJI="🚨" ;;
    high)     SEV_EMOJI="🔴" ;;
    medium)   SEV_EMOJI="🟡" ;;
    low)      SEV_EMOJI="🟢" ;;
  esac

  COMMENT_BODY="## ${SEV_EMOJI} gitscan Security Scan

**Risk Score:** \`${RISK_SCORE}/100\` &nbsp;|&nbsp; **Severity:** \`${SEVERITY}\`

${SUMMARY}

[View full report →](${REPORT_URL})

---
*Powered by [gitscan](https://github.com/gitlawbscanner/gitscan)*"

  curl -sf -X POST \
    "https://api.github.com/repos/${GITHUB_REPOSITORY}/issues/${GITHUB_PR_NUMBER}/comments" \
    -H "Authorization: Bearer ${GH_TOKEN}" \
    -H "Accept: application/vnd.github+json" \
    -d "{\"body\":$(echo "$COMMENT_BODY" | python3 -c 'import sys,json; print(json.dumps(sys.stdin.read()))')}" \
    > /dev/null && echo "PR comment posted."
fi

# Determine whether to fail
SEV_RANK_critical=4
SEV_RANK_high=3
SEV_RANK_medium=2
SEV_RANK_low=1
SEV_RANK_clean=0
SEV_RANK_unknown=0

FAIL_RANK_VAR="SEV_RANK_${FAIL_ON}"
SEVERITY_RANK_VAR="SEV_RANK_${SEVERITY}"
FAIL_RANK="${!FAIL_RANK_VAR:-0}"
SEVERITY_RANK="${!SEVERITY_RANK_VAR:-0}"

FAILED=0
if [ "$FAIL_ON" != "never" ] && [ "$SEVERITY_RANK" -ge "$FAIL_RANK" ] && [ "$FAIL_RANK" -gt 0 ]; then
  echo "::error::gitscan: severity '${SEVERITY}' meets or exceeds fail threshold '${FAIL_ON}'"
  FAILED=1
fi

if [ "$SCORE_THRESHOLD" -gt 0 ] && [ "$RISK_SCORE" -ge "$SCORE_THRESHOLD" ]; then
  echo "::error::gitscan: risk score ${RISK_SCORE} meets or exceeds threshold ${SCORE_THRESHOLD}"
  FAILED=1
fi

exit $FAILED
