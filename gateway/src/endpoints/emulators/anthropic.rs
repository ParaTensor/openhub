use axum::extract::State;
use axum::http::StatusCode;
use axum::response::IntoResponse;
use axum::Json;
use serde_json::{json, Value};

use crate::endpoints::ProxyState;
use crate::endpoints::{error_response, handle_chat_completions};

pub async fn messages(
    State(state): State<ProxyState>,
    Json(payload): Json<Value>,
) -> impl IntoResponse {
    let model = payload
        .get("model")
        .cloned()
        .unwrap_or_else(|| json!("claude-3-haiku"));
    let stream = payload
        .get("stream")
        .and_then(Value::as_bool)
        .unwrap_or(false);
    let mut messages = vec![];
    if let Some(arr) = payload.get("messages").and_then(Value::as_array) {
        for item in arr {
            let role = match item.get("role").and_then(Value::as_str).unwrap_or("user") {
                "assistant" => "assistant",
                "system" => "system",
                _ => "user",
            };
            let content = match item.get("content") {
                Some(Value::String(s)) => s.clone(),
                Some(Value::Array(parts)) => parts
                    .iter()
                    .filter_map(|part| part.get("text").and_then(Value::as_str))
                    .collect::<Vec<_>>()
                    .join(""),
                _ => String::new(),
            };
            messages.push(json!({ "role": role, "content": content }));
        }
    }

    let openai_payload = json!({
        "model": model,
        "messages": messages,
        "stream": stream
    });

    let response = handle_chat_completions(State(state), Json(openai_payload))
        .await
        .into_response();

    if stream {
        return response;
    }

    let status = response.status();
    let body = axum::body::to_bytes(response.into_body(), usize::MAX).await;
    match body {
        Ok(bytes) => {
            let parsed: Value = match serde_json::from_slice(&bytes) {
                Ok(v) => v,
                Err(_) => {
                    return error_response(
                        StatusCode::BAD_GATEWAY,
                        "Failed to parse upstream response",
                        "upstream_error",
                    )
                    .into_response();
                }
            };
            if !status.is_success() {
                return (status, Json(parsed)).into_response();
            }
            let text = parsed
                .get("choices")
                .and_then(Value::as_array)
                .and_then(|arr| arr.first())
                .and_then(|v| v.get("message"))
                .and_then(|v| v.get("content"))
                .and_then(Value::as_str)
                .unwrap_or("")
                .to_string();
            let model_name = parsed
                .get("model")
                .and_then(Value::as_str)
                .unwrap_or("unknown");
            let usage = parsed.get("usage").cloned().unwrap_or_else(|| {
                json!({
                    "prompt_tokens": 0,
                    "completion_tokens": 0,
                    "total_tokens": 0
                })
            });
            Json(json!({
                "id": format!("msg_{}", uuid::Uuid::new_v4().simple()),
                "type": "message",
                "role": "assistant",
                "content": [{ "type": "text", "text": text }],
                "model": model_name,
                "stop_reason": "end_turn",
                "usage": {
                    "input_tokens": usage.get("prompt_tokens").cloned().unwrap_or(json!(0)),
                    "output_tokens": usage.get("completion_tokens").cloned().unwrap_or(json!(0))
                }
            }))
            .into_response()
        }
        Err(_) => error_response(
            StatusCode::BAD_GATEWAY,
            "Failed to read upstream response",
            "upstream_error",
        )
        .into_response(),
    }
}
