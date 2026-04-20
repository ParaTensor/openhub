#!/bin/bash
# 测试 ParaRouter API 连通性

API_KEY="sk-oh-v1-tyipara0tvmr913tvur5nn"
API_HOST="https://pararouter.com"

echo "=== 测试 ParaRouter API ==="
echo "API Key: ${API_KEY:0:20}..."
echo "API Host: $API_HOST"
echo ""

# 测试 1: CORS 预检
echo "1. OPTIONS 预检请求:"
curl -s -X OPTIONS "$API_HOST/v1/messages" \
  -H "Origin: http://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -v 2>&1 | grep -E "(HTTP|Access-Control)"
echo ""

# 测试 2: Anthropic 格式调用
echo "2. POST /v1/messages (Anthropic 格式):"
curl -s -X POST "$API_HOST/v1/messages" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-haiku-20241022",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }' | head -c 500
echo ""
echo ""

# 测试 3: OpenAI 格式调用
echo "3. POST /v1/chat/completions (OpenAI 格式):"
curl -s -X POST "$API_HOST/v1/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-haiku-20241022",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50
  }' | head -c 500
echo ""
echo ""

# 测试 4: 检查模型列表
echo "4. GET /v1/models:"
curl -s -X GET "$API_HOST/v1/models" \
  -H "Authorization: Bearer $API_KEY" | head -c 300
echo ""
echo ""

echo "=== 测试完成 ==="
