#!/bin/bash
# Legacy pipeline fallback for LangGraph hybrid system
# Usage: bash runtime/legacy-pipeline.sh <workspace-prefix>
# Input: JSON via stdin or ISSUE_PAYLOAD env var

set -euo pipefail

WORKSPACE_PREFIX="${1:-workspace/issues}"
MAX_RETRY=3
API_KEY="${OPENAI_API_KEY:-}"

if [ -z "$API_KEY" ]; then
  echo "{\"status\":\"CHANGES_REQUESTED\",\"architecture\":{\"summary\":\"Legacy fallback failed\",\"flow\":\"\",\"decisions\":[\"No API key\"]},\"files\":[],\"logs\":{\"orchestrator\":\"Legacy fallback: no API key\",\"architect\":\"\",\"backend\":\"\",\"frontend\":\"\",\"qa\":\"\",\"reviewer\":\"Legacy fallback: no API key\"}}"
  exit 0
fi

# Read issue payload from env or stdin
ISSUE_JSON="${ISSUE_PAYLOAD:-$(cat)}"
ISSUE_ID=$(echo "$ISSUE_JSON" | jq -r '.id // 0')
ISSUE_TITLE=$(echo "$ISSUE_JSON" | jq -r '.title // "unknown"')
ISSUE_SLUG=$(echo "$ISSUE_JSON" | jq -r '.slug // "unknown"')

DIR="${WORKSPACE_PREFIX}/${ISSUE_ID}-${ISSUE_SLUG}"
mkdir -p "$DIR/00-architect" "$DIR/01-backend-engineer" "$DIR/02-frontend-engineer" "$DIR/03-qa-engineer" "$DIR/04-code-reviewer" "$DIR/shared" "$DIR/logs"

PROMPT='You are an AI Orchestrator. Output strict JSON:
{"architecture":{"summary":"","flow":"","decisions":[]},"files":[{"path":"","content":""}],"logs":{"architect":"","backend":"","frontend":"","qa":"","reviewer":""},"status":"READY_FOR_PR"}
JSON only.'

SUCCESS=false
for i in $(seq 1 "$MAX_RETRY"); do
  RESPONSE=$(curl -s -X POST "https://api.openai.com/v1/chat/completions" \
    -H "Authorization: Bearer $API_KEY" \
    -H "Content-Type: application/json" \
    -d "$(jq -n --arg m gpt-4o-mini --arg s "$PROMPT" --arg u "Issue #${ISSUE_ID}: ${ISSUE_TITLE}" '{model:$m,messages:[{role:"system",content:$s},{role:"user",content:$u}],temperature:0.3}')")
  
  if echo "$RESPONSE" | jq -e '.choices[0].message.content' > /dev/null 2>&1; then
    echo "$RESPONSE" | jq -r '.choices[0].message.content' > "$DIR/ai-output.json"
    cat "$DIR/ai-output.json"
    SUCCESS=true
    break
  fi
  sleep $((i * 5))
done

if [ "$SUCCESS" != "true" ]; then
  echo "{\"status\":\"CHANGES_REQUESTED\",\"architecture\":{\"summary\":\"Legacy fallback failed after retries\",\"flow\":\"\",\"decisions\":[\"All API retries exhausted\"]},\"files\":[],\"logs\":{\"orchestrator\":\"Legacy fallback: all retries failed\",\"architect\":\"\",\"backend\":\"\",\"frontend\":\"\",\"qa\":\"\",\"reviewer\":\"Legacy fallback: all retries failed\"}}"
fi
