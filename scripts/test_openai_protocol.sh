#!/usr/bin/env bash
# 手工测试 ParaRouter 网关的 OpenAI 兼容协议：模型列表、非流式、流式，并打印耗时。
#
# 用法:
#   export PARAROUTER_API_KEY='sk-...'
#   ./scripts/test_openai_protocol.sh
#
# 或:
#   ./scripts/test_openai_protocol.sh 'sk-...'
#
# 可选环境变量:
#   GATEWAY_URL   默认 http://127.0.0.1:8000
#   MODEL         默认 claude-opus-4-6
#   PROMPT        默认「用一句话介绍上海。」
#   MAX_TOKENS    默认 120

set -euo pipefail

GATEWAY_URL="${GATEWAY_URL:-http://127.0.0.1:8000}"
MODEL="${MODEL:-claude-opus-4-6}"
PROMPT="${PROMPT:-用一句话介绍上海。}"
MAX_TOKENS="${MAX_TOKENS:-120}"

API_KEY="${1:-${PARAROUTER_API_KEY:-}}"
if [[ -z "$API_KEY" ]]; then
  echo "缺少 API 密钥。请设置 PARAROUTER_API_KEY 或传入第一个参数。" >&2
  echo "示例: export PARAROUTER_API_KEY='sk-...' && ./scripts/test_openai_protocol.sh" >&2
  exit 1
fi

BASE="${GATEWAY_URL%/}"
AUTH=(-H "Authorization: Bearer ${API_KEY}" -H "Content-Type: application/json")

json_escape() {
  python3 -c 'import json,sys; print(json.dumps(sys.argv[1]))' "$1"
}

PROMPT_JSON="$(json_escape "$PROMPT")"
CHAT_BODY_NONSTREAM="$(printf '{"model":"%s","messages":[{"role":"user","content":%s}],"max_tokens":%s}' "$MODEL" "$PROMPT_JSON" "$MAX_TOKENS")"
CHAT_BODY_STREAM="$(printf '{"model":"%s","messages":[{"role":"user","content":%s}],"max_tokens":%s,"stream":true}' "$MODEL" "$PROMPT_JSON" "$MAX_TOKENS")"

echo "== 配置 =="
echo "GATEWAY_URL=$BASE"
echo "MODEL=$MODEL"
echo "PROMPT=$PROMPT"
echo "MAX_TOKENS=$MAX_TOKENS"
echo

echo "== 1) GET /v1/models =="
code="$(curl -sS -m 30 -o /tmp/pr_models.json -w '%{http_code}' "${AUTH[@]}" "$BASE/v1/models")"
echo "HTTP $code"
if command -v jq >/dev/null 2>&1; then
  jq -C '.data[]? | {id}' /tmp/pr_models.json 2>/dev/null | head -n 20 || cat /tmp/pr_models.json
else
  head -c 800 /tmp/pr_models.json; echo
fi
echo

echo "== 2) POST /v1/chat/completions (非流式) =="
read -r ttfb total <<<"$(curl -sS -m 120 -o /tmp/pr_chat.json -w '%{time_starttransfer} %{time_total}' \
  "${AUTH[@]}" -d "$CHAT_BODY_NONSTREAM" "$BASE/v1/chat/completions")"
echo "TTFB(首字节): ${ttfb}s  总耗时: ${total}s"
if command -v jq >/dev/null 2>&1; then
  jq -C '.choices[0].message.content, .usage' /tmp/pr_chat.json 2>/dev/null || cat /tmp/pr_chat.json
else
  head -c 1200 /tmp/pr_chat.json; echo
fi
echo

echo "== 3) POST /v1/chat/completions (流式 SSE，正文丢弃，仅测速) =="
read -r ttfb_s total_s <<<"$(curl -sS -m 120 -N -o /dev/null -w '%{time_starttransfer} %{time_total}' \
  "${AUTH[@]}" -d "$CHAT_BODY_STREAM" "$BASE/v1/chat/completions")"
echo "TTFB(首字节): ${ttfb_s}s  总耗时: ${total_s}s"
echo
echo "完成。临时文件: /tmp/pr_models.json /tmp/pr_chat.json"
