use axum::{
    extract::{Path, State},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use crate::endpoints::ProxyState;
use crate::db::{NewApiKey, NewProvider, UpdateApiKey, UpdateProvider};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize)]
pub struct AdminError {
    pub message: String,
}

impl IntoResponse for AdminError {
    fn into_response(self) -> Response {
        (StatusCode::BAD_REQUEST, Json(self)).into_response()
    }
}

pub async fn list_providers(
    State(state): State<ProxyState>,
) -> Result<impl IntoResponse, AdminError> {
    state.db_pool.list_providers().await
        .map(Json)
        .map_err(|e: anyhow::Error| AdminError { message: e.to_string() })
}

pub async fn get_provider(
    State(state): State<ProxyState>,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, AdminError> {
    match state.db_pool.get_provider(id).await {
        Ok(Some(provider)) => Ok(Json(provider)),
        Ok(None) => Err(AdminError { message: "Provider not found".to_string() }),
        Err(e) => Err(AdminError { message: e.to_string() }),
    }
}

pub async fn create_provider(
    State(state): State<ProxyState>,
    Json(payload): Json<NewProvider>,
) -> Result<impl IntoResponse, AdminError> {
    state.db_pool.create_provider(payload).await
        .map(|id| (StatusCode::CREATED, Json(serde_json::json!({ "id": id }))))
        .map_err(|e: anyhow::Error| AdminError { message: e.to_string() })
}

pub async fn update_provider(
    State(state): State<ProxyState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateProvider>,
) -> Result<impl IntoResponse, AdminError> {
    state.db_pool.update_provider(id, payload).await
        .map(|_| StatusCode::OK)
        .map_err(|e: anyhow::Error| AdminError { message: e.to_string() })
}

pub async fn delete_provider(
    State(state): State<ProxyState>,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, AdminError> {
    state.db_pool.delete_provider(id).await
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(|e: anyhow::Error| AdminError { message: e.to_string() })
}

pub async fn list_api_keys(
    State(state): State<ProxyState>,
) -> Result<impl IntoResponse, AdminError> {
    state.db_pool.list_api_keys().await
        .map(Json)
        .map_err(|e: anyhow::Error| AdminError { message: e.to_string() })
}

pub async fn get_api_key(
    State(state): State<ProxyState>,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, AdminError> {
    match state.db_pool.get_api_key_by_id(id).await {
        Ok(Some(key)) => Ok(Json(key)),
        Ok(None) => Err(AdminError { message: "API Key not found".to_string() }),
        Err(e) => Err(AdminError { message: e.to_string() }),
    }
}

pub async fn create_api_key(
    State(state): State<ProxyState>,
    Json(mut payload): Json<NewApiKey>,
) -> Result<impl IntoResponse, AdminError> {
    let full_key = format!("sk-link-{}", Uuid::new_v4().simple());
    payload.key_hash = full_key.clone();
    state.db_pool.create_api_key(payload).await
        .map(|id| (StatusCode::CREATED, Json(serde_json::json!({ "id": id, "full_key": full_key }))))
        .map_err(|e: anyhow::Error| AdminError { message: e.to_string() })
}

pub async fn update_api_key(
    State(state): State<ProxyState>,
    Path(id): Path<i64>,
    Json(payload): Json<UpdateApiKey>,
) -> Result<impl IntoResponse, AdminError> {
    state.db_pool.update_api_key(id, payload).await
        .map(|_| StatusCode::OK)
        .map_err(|e: anyhow::Error| AdminError { message: e.to_string() })
}

pub async fn rotate_api_key(
    State(state): State<ProxyState>,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, AdminError> {
    let full_key = format!("sk-link-{}", Uuid::new_v4().simple());
    match state.db_pool.update_api_key_hash(id, &full_key).await {
        Ok(true) => Ok(Json(serde_json::json!({ "id": id, "full_key": full_key }))),
        Ok(false) => Err(AdminError { message: "API Key not found".to_string() }),
        Err(e) => Err(AdminError { message: e.to_string() }),
    }
}

pub async fn delete_api_key(
    State(state): State<ProxyState>,
    Path(id): Path<i64>,
) -> Result<impl IntoResponse, AdminError> {
    state.db_pool.delete_api_key(id).await
        .map(|_| StatusCode::NO_CONTENT)
        .map_err(|e: anyhow::Error| AdminError { message: e.to_string() })
}
