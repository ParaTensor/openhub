use axum::{extract::{Path, State}, Json};
use crate::endpoints::ProxyState;
use serde_json::{json, Value};

pub async fn handle_list_models(
    State(_state): State<ProxyState>,
) -> Json<Value> {
    // Placeholder
    Json(json!({
        "object": "list",
        "data": [
            {
                "id": "gpt-3.5-turbo",
                "object": "model",
                "created": 1677610602,
                "owned_by": "openai"
            }
        ]
    }))
}

pub async fn handle_get_model(
    State(_state): State<ProxyState>,
    Path(id): Path<String>,
) -> Json<Value> {
    // Placeholder
    Json(json!({
        "id": id,
        "object": "model",
        "created": 1677610602,
        "owned_by": "openai"
    }))
}
