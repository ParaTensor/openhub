#!/usr/bin/env bash
# 针对线上 ParaRouter（OpenAI 兼容网关）的手工协议测试。
# 默认网关: https://pararouter.com（当前线上解析在此；api 子域若无 DNS 可改用本默认）。
# 覆盖示例: GATEWAY_URL='https://api.example.com' ./scripts/test_openai_protocol_pararouter.com.sh
#
# 用法:
#   export PARAROUTER_API_KEY='sk-...'
#   ./scripts/test_openai_protocol_pararouter.com.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
export GATEWAY_URL="${GATEWAY_URL:-https://pararouter.com}"
exec "$ROOT/scripts/test_openai_protocol.sh" "$@"
