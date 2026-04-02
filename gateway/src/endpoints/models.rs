use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::{json, Value};

use crate::endpoints::{error_response, ProxyState};

pub async fn handle_list_models(State(state): State<ProxyState>) -> impl IntoResponse {
    let llm_service = state.llm_service.read().await;
    let models = match llm_service.list_models().await {
        Ok(models) => models,
        Err(err) => {
            return error_response(
                StatusCode::BAD_GATEWAY,
                format!("Failed to list models: {}", err),
                "upstream_error",
            );
        }
    };

    let data: Vec<Value> = models
        .into_iter()
        .map(|model| {
            json!({
                "id": model.id,
                "object": "model",
                "created": chrono::Utc::now().timestamp(),
                "owned_by": "openhub"
            })
        })
        .collect();

    (StatusCode::OK, Json(json!({ "object": "list", "data": data })))
}

pub async fn handle_get_model(
    State(state): State<ProxyState>,
    Path(id): Path<String>,
) -> impl IntoResponse {
    let llm_service = state.llm_service.read().await;
    let models = match llm_service.list_models().await {
        Ok(models) => models,
        Err(err) => {
            return error_response(
                StatusCode::BAD_GATEWAY,
                format!("Failed to list models: {}", err),
                "upstream_error",
            );
        }
    };

    if let Some(model) = models.into_iter().find(|m| m.id == id) {
        return (
            StatusCode::OK,
            Json(json!({
                "id": model.id,
                "object": "model",
                "created": chrono::Utc::now().timestamp(),
                "owned_by": "openhub"
            })),
        );
    }

    error_response(
        StatusCode::NOT_FOUND,
        format!("Model {} not found", id),
        "model_not_found",
    )
}
