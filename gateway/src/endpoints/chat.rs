use axum::{extract::State, Json};
use crate::endpoints::ProxyState;
use serde_json::{json, Value};

pub async fn handle_chat_completions(
    State(_state): State<ProxyState>,
    Json(payload): Json<Value>,
) -> Json<Value> {
    // Placeholder
    Json(json!({
        "id": "chatcmpl-123",
        "object": "chat.completion",
        "created": 1677652288,
        "model": payload.get("model").unwrap_or(&json!("gpt-3.5-turbo")),
        "choices": [{
            "index": 0,
            "message": {
                "role": "assistant",
                "content": "Hello! I am OpenGateway. This is a placeholder response.",
            },
            "finish_reason": "stop"
        }],
        "usage": {
            "prompt_tokens": 9,
            "completion_tokens": 12,
            "total_tokens": 21
        }
    }))
}
