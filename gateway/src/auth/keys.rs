use anyhow::{anyhow, Result};
use axum::{
    extract::{FromRequestParts, State},
    http::{request::Parts, StatusCode},
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::sync::Arc;

use crate::runtime::OpenHubRuntime;

/// Represents an authenticated OpenHub principal via user_api_keys
#[derive(Debug, Clone)]
pub struct AuthenticatedUser {
    pub key_id: String,
    pub uid: String,
    pub name: String,
}

#[axum::async_trait]
impl FromRequestParts<Arc<OpenHubRuntime>> for AuthenticatedUser {
    type Rejection = Response;

    async fn from_request_parts(
        parts: &mut Parts,
        state: &Arc<OpenHubRuntime>,
    ) -> std::result::Result<Self, Self::Rejection> {
        let auth_header = parts
            .headers
            .get(axum::http::header::AUTHORIZATION)
            .and_then(|h| h.to_str().ok())
            .unwrap_or_default();

        if !auth_header.starts_with("Bearer ") {
            return Err(unauthorized_response("Missing or invalid Bearer token"));
        }

        let token = auth_header["Bearer ".len()..].trim();

        // Perform the lookup directly in the gateway
        let user = lookup_user_api_key(state, token).await.map_err(|e| {
            tracing::error!("Auth lookup failed: {}", e);
            internal_error_response("Authentication service failed")
        })?;

        match user {
            Some(u) => Ok(u),
            None => Err(unauthorized_response("Invalid API key")),
        }
    }
}

async fn lookup_user_api_key(
    state: &Arc<OpenHubRuntime>,
    token: &str,
) -> Result<Option<AuthenticatedUser>> {
    #[derive(sqlx::FromRow)]
    struct UserKeyRow {
        id: String,
        uid: String,
        name: String,
    }

    let pool = &state.db;

    // In OpenHub schema, `user_api_keys` holds the gateway keys
    let row = sqlx::query_as::<_, UserKeyRow>(
        r#"
        SELECT id, uid, name
        FROM user_api_keys
        WHERE key = $1
        "#,
    )
    .bind(token)
    .fetch_optional(pool)
    .await?;

    Ok(row.map(|r| AuthenticatedUser {
        key_id: r.id,
        uid: r.uid,
        name: r.name,
    }))
}

fn unauthorized_response(msg: &str) -> Response {
    (
        StatusCode::UNAUTHORIZED,
        Json(json!({
            "error": {
                "message": msg,
                "type": "invalid_request_error",
                "param": null,
                "code": "invalid_api_key"
            }
        })),
    )
        .into_response()
}

fn internal_error_response(msg: &str) -> Response {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({
            "error": {
                "message": msg,
                "type": "api_error",
                "param": null,
                "code": "internal_error"
            }
        })),
    )
        .into_response()
}
