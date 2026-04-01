use axum::extract::State;
use axum::response::Json;
use serde_json::json;

pub async fn health_check(
    State(state): State<crate::endpoints::ProxyState>,
) -> Json<serde_json::Value> {
    Json(json!({
        "status": "ok",
        "service": "opengateway",
        "version": env!("CARGO_PKG_VERSION"),
        "timestamp": chrono::Utc::now().to_rfc3339(),
    }))
}
