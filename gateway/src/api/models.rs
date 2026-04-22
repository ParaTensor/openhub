use axum::{
    extract::State,
    response::{IntoResponse, Response},
    Json,
};
use serde_json::json;
use std::sync::Arc;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::auth::keys::AuthenticatedUser;
use crate::runtime::ParaRouterRuntime;

pub async fn list_models(
    auth: AuthenticatedUser,
    State(runtime): State<Arc<ParaRouterRuntime>>,
) -> Response {
    let pool = &runtime.db;

    #[derive(sqlx::FromRow)]
    struct ModelRow {
        model_id: String,
    }

    let current_version = match sqlx::query_scalar::<_, String>(
        "SELECT current_version FROM pricing_state WHERE id = 1",
    )
    .fetch_optional(pool)
    .await
    {
        Ok(version) => version.unwrap_or_else(|| "bootstrap".to_string()),
        Err(e) => {
            tracing::error!("Failed to fetch pricing state: {}", e);
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error",
            )
                .into_response();
        }
    };

    let result = sqlx::query_as::<_, ModelRow>(
        r#"
        SELECT DISTINCT model_id
        FROM model_provider_pricings
        WHERE version = $1 AND status = 'online'
        ORDER BY model_id ASC
        "#,
    )
    .bind(&current_version)
    .fetch_all(pool)
    .await;

    let rows = match result {
        Ok(rows) => rows,
        Err(e) => {
            tracing::error!("Failed to fetch models: {}", e);
            return (
                axum::http::StatusCode::INTERNAL_SERVER_ERROR,
                "Internal Server Error",
            )
                .into_response();
        }
    };

    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_secs();

    let data: Vec<_> = rows
        .into_iter()
        .filter(|row| {
            auth.user_allowed_models
                .as_ref()
                .is_none_or(|models| models.contains(&row.model_id))
                && auth
                    .key_allowed_models
                    .as_ref()
                    .is_none_or(|models| models.contains(&row.model_id))
        })
        .map(|row| {
            json!({
                "id": row.model_id,
                "object": "model",
                "created": now,
                "owned_by": "pararouter"
            })
        })
        .collect();

    (
        axum::http::StatusCode::OK,
        Json(json!({
            "object": "list",
            "data": data
        })),
    )
        .into_response()
}
