use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};

use crate::endpoints::ProxyState;

pub async fn chat(State(_state): State<ProxyState>, Json(payload): Json<Value>) -> Json<Value> {
    Json(json!({
        "id": "chatcmpl-openhub",
        "object": "chat.completion",
        "created": 1677652288,
        "model": payload.get("model").cloned().unwrap_or(json!("gpt-3.5-turbo")),
        "choices": [{
            "index": 0,
            "message": { "role": "assistant", "content": "Placeholder response." },
            "finish_reason": "stop"
        }],
        "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 }
    }))
}

pub async fn models(State(_state): State<ProxyState>) -> Json<Value> {
    Json(json!({
        "object": "list",
        "data": [{ "id": "gpt-3.5-turbo", "object": "model", "owned_by": "openhub" }]
    }))
}
