use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};

use crate::endpoints::ProxyState;

pub async fn messages(
    State(_state): State<ProxyState>,
    Json(_payload): Json<Value>,
) -> Json<Value> {
    Json(json!({
        "id": "msg_openhub",
        "type": "message",
        "role": "assistant",
        "content": [{ "type": "text", "text": "Placeholder response." }],
        "model": "claude-3-haiku",
        "stop_reason": "end_turn"
    }))
}
