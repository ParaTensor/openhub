use axum::extract::State;
use axum::Json;
use serde_json::{json, Value};

use crate::endpoints::ProxyState;

pub async fn chat(State(_state): State<ProxyState>, Json(_payload): Json<Value>) -> Json<Value> {
    Json(json!({
        "model": "llama2",
        "message": { "role": "assistant", "content": "Placeholder response." },
        "done": true
    }))
}

pub async fn models(State(_state): State<ProxyState>) -> Json<Value> {
    Json(json!({
        "models": [{ "name": "llama2", "model": "llama2" }]
    }))
}

pub async fn show_handler(State(_state): State<ProxyState>, Json(payload): Json<Value>) -> Json<Value> {
    Json(json!({
        "modelfile": "",
        "parameters": "",
        "template": "",
        "details": { "family": payload.get("name").cloned().unwrap_or(json!("llama2")) }
    }))
}
