use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde_json::{json, Value};

use crate::endpoints::ProxyState;
use crate::endpoints::{error_response, handle_chat_completions, handle_list_models};

pub async fn chat(
    State(state): State<ProxyState>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let model = payload.get("model").cloned().unwrap_or_else(|| json!("llama2"));
    let stream = payload
        .get("stream")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let mut messages = vec![];
    if let Some(arr) = payload.get("messages").and_then(Value::as_array) {
        for item in arr {
            let role = item
                .get("role")
                .cloned()
                .unwrap_or_else(|| json!("user"));
            let content = item
                .get("content")
                .cloned()
                .unwrap_or_else(|| json!(""));
            messages.push(json!({ "role": role, "content": content }));
        }
    }

    let openai_payload = json!({
        "model": model,
        "messages": messages,
        "stream": stream
    });

    handle_chat_completions(State(state), Json(openai_payload)).await
}

pub async fn models(State(state): State<ProxyState>) -> impl IntoResponse {
    let resp = handle_list_models(State(state)).await.into_response();
    if !resp.status().is_success() {
        return resp;
    }

    let body = axum::body::to_bytes(resp.into_body(), usize::MAX).await;
    match body {
        Ok(bytes) => {
            if let Ok(value) = serde_json::from_slice::<Value>(&bytes) {
                let models = value
                    .get("data")
                    .and_then(Value::as_array)
                    .cloned()
                    .unwrap_or_default()
                    .into_iter()
                    .map(|m| {
                        let id = m.get("id").cloned().unwrap_or_else(|| json!("unknown"));
                        json!({ "name": id, "model": id })
                    })
                    .collect::<Vec<_>>();
                Json(json!({ "models": models })).into_response()
            } else {
                error_response(
                    StatusCode::BAD_GATEWAY,
                    "Failed to parse model response",
                    "upstream_error",
                )
                .into_response()
            }
        }
        Err(_) => error_response(
            StatusCode::BAD_GATEWAY,
            "Failed to read model response",
            "upstream_error",
        )
        .into_response(),
    }
}

pub async fn show_handler(
    State(state): State<ProxyState>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let requested = payload
        .get("name")
        .and_then(Value::as_str)
        .unwrap_or("unknown");
    let resp = handle_list_models(State(state)).await.into_response();
    if !resp.status().is_success() {
        return resp;
    }

    let body = axum::body::to_bytes(resp.into_body(), usize::MAX).await;
    match body {
        Ok(bytes) => {
            if let Ok(value) = serde_json::from_slice::<Value>(&bytes) {
                let found = value
                    .get("data")
                    .and_then(Value::as_array)
                    .map(|arr| {
                        arr.iter().any(|m| {
                            m.get("id")
                                .and_then(Value::as_str)
                                .map(|id| id == requested)
                                .unwrap_or(false)
                        })
                    })
                    .unwrap_or(false);
                if found {
                    Json(json!({
                        "modelfile": "",
                        "parameters": "",
                        "template": "",
                        "details": { "family": requested, "format": "openai-compatible" }
                    }))
                    .into_response()
                } else {
                    error_response(
                        StatusCode::NOT_FOUND,
                        format!("Model {} not found", requested),
                        "model_not_found",
                    )
                    .into_response()
                }
            } else {
                error_response(
                    StatusCode::BAD_GATEWAY,
                    "Failed to parse model response",
                    "upstream_error",
                )
                .into_response()
            }
        }
        Err(_) => error_response(
            StatusCode::BAD_GATEWAY,
            "Failed to read model response",
            "upstream_error",
        )
        .into_response(),
    }
}
