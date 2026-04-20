#!/bin/bash
# Test ParaRouter OpenAI API endpoint

API_KEY="sk-oh-v1-tyipara0tvmr913tvur5nn"
API_HOST="https://pararouter.com"

echo "=== Testing ParaRouter API ==="
echo "API Key: ${API_KEY:0:20}..."
echo "API Host: $API_HOST"
echo ""

# Test 1: List models
echo "Test 1: GET /v1/models"
curl -s -X GET "$API_HOST/v1/models" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" | head -c 500
echo ""
echo ""

# Test 2: Chat completions (non-streaming)
echo "Test 2: POST /v1/chat/completions (non-streaming)"
curl -s -X POST "$API_HOST/v1/chat/completions" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-haiku-20241022",
    "messages": [{"role": "user", "content": "Hello"}],
    "max_tokens": 50,
    "stream": false
  }' | head -c 800
echo ""
echo ""

# Test 3: CORS preflight (OPTIONS)
echo "Test 3: OPTIONS /v1/chat/completions (CORS preflight)"
curl -s -X OPTIONS "$API_HOST/v1/chat/completions" \
  -H "Origin: http://localhost" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type,Authorization" \
  -D - \
  -o /dev/null | head -20
echo ""

echo "=== Tests complete ==="
