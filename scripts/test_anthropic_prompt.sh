#!/bin/bash
# 测试 ParaRouter Anthropic API - 显示完整请求和响应

API_KEY="sk-oh-v1-tyipara0tvmr913tvur5nn"
API_HOST="https://pararouter.com"

echo "========================================"
echo "ParaRouter Anthropic API 测试"
echo "========================================"
echo ""
echo "【请求信息】"
echo "URL: $API_HOST/v1/messages"
echo "Method: POST"
echo "Headers:"
echo "  Authorization: Bearer ${API_KEY:0:20}..."
echo "  Content-Type: application/json"
echo ""
echo "Body:"
cat << 'JSON' | python3 -m json.tool 2>/dev/null || cat
{
  "model": "claude-3-5-haiku-20241022",
  "max_tokens": 50,
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "text",
          "text": "hi"
        }
      ]
    }
  ],
  "stream": false
}
JSON

echo ""
echo "========================================"
echo "【执行请求】"
echo "========================================"
echo ""

# 执行请求并显示完整响应
RESPONSE=$(curl -s -w "\n\n【CURL 信息】\nHTTP Code: %{http_code}\nContent-Type: %{content_type}\nTotal Time: %{time_total}s\n" \
  -X POST "$API_HOST/v1/messages" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-haiku-20241022",
    "max_tokens": 50,
    "messages": [{"role": "user", "content": [{"type": "text", "text": "hi"}]}],
    "stream": false
  }')

echo "【响应结果】"
echo "$RESPONSE"
echo ""

# 尝试格式化 JSON
echo "【格式化后的响应 Body】"
echo "$RESPONSE" | head -1 | python3 -m json.tool 2>/dev/null || echo "$RESPONSE" | head -1
