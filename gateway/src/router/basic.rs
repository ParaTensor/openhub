use crate::endpoints::basic::health_check;
use crate::endpoints::ProxyState;
use axum::{routing::get, Router};

pub fn build_basic_routes(state: ProxyState) -> Router {
    Router::new()
        .route("/health", get(health_check))
        .with_state(state)
}
