use axum::extract::State;
use axum::response::IntoResponse;
use axum::Json;
use serde_json::Value;

use crate::endpoints::ProxyState;
use crate::endpoints::{handle_chat_completions, handle_list_models};

pub async fn chat(State(state): State<ProxyState>, Json(payload): Json<Value>) -> impl IntoResponse {
    handle_chat_completions(State(state), Json(payload)).await
}

pub async fn models(State(state): State<ProxyState>) -> impl IntoResponse {
    handle_list_models(State(state)).await
}
