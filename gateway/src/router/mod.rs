use crate::db::DatabasePool;
use crate::pool::PoolManager;
use axum::Router;
use std::sync::Arc;
use tower_http::cors::{Any, CorsLayer};

mod admin;
mod basic;
mod llm;

use admin::admin_auth_middleware;
use basic::build_basic_routes;
use llm::build_llm_proxy_routes;
use axum::{routing::{get, post}, middleware};

use crate::service::Service as LlmService;
use crate::settings::Settings;
use tokio::sync::RwLock;

/// Build the CORS layer based on environment configuration.
fn build_cors_layer() -> CorsLayer {
    let cors = CorsLayer::new().allow_methods(Any).allow_headers(Any);
    let configured_origin = std::env::var("OPENGATEWAY_CORS_ORIGIN").ok();

    match configured_origin {
        Some(origin) if !origin.is_empty() && origin != "*" => {
            match origin.parse::<axum::http::HeaderValue>() {
                Ok(origin_value) => {
                    tracing::info!("CORS: restricting allowed origin to {}", origin);
                    cors.allow_origin(origin_value)
                }
                Err(_) => {
                    tracing::warn!(
                        "CORS: invalid OPENGATEWAY_CORS_ORIGIN value '{}', falling back to allow all origins",
                        origin
                    );
                    cors.allow_origin(Any)
                }
            }
        }
        _ => {
            tracing::debug!("CORS: allowing all origins (set OPENGATEWAY_CORS_ORIGIN to restrict)");
            cors.allow_origin(Any)
        }
    }
}

pub fn build_multi_mode_app(
    db_pool: DatabasePool,
    pool_manager: Arc<PoolManager>,
    llm_service: Arc<RwLock<LlmService>>,
    config_settings: Arc<RwLock<Settings>>,
    _config: Arc<crate::config::Config>,
    trace: Option<Arc<crate::trace::TraceClient>>,
) -> Router {
    let llm_proxy_routes = build_llm_proxy_routes(
        db_pool.clone(),
        pool_manager.clone(),
        llm_service.clone(),
        config_settings.clone(),
        trace.clone(),
    );

    // Create state for direct use in basic routes
    let state = crate::endpoints::ProxyState {
        db_pool,
        pool_manager,
        llm_service: llm_service.clone(),
        config: config_settings.clone(),
        trace,
    };
    let basic_routes = build_basic_routes(state.clone());

    let admin_routes = Router::new()
        .route("/providers", get(crate::endpoints::admin::list_providers).post(crate::endpoints::admin::create_provider))
        .route("/providers/:id", get(crate::endpoints::admin::get_provider).put(crate::endpoints::admin::update_provider).delete(crate::endpoints::admin::delete_provider))
        .route("/api-keys", get(crate::endpoints::admin::list_api_keys).post(crate::endpoints::admin::create_api_key))
        .route("/api-keys/:id", get(crate::endpoints::admin::get_api_key).put(crate::endpoints::admin::update_api_key).delete(crate::endpoints::admin::delete_api_key))
        .route("/api-keys/:id/rotate", post(crate::endpoints::admin::rotate_api_key))
        .layer(middleware::from_fn(admin_auth_middleware))
        .with_state(state);

    basic_routes
        .merge(llm_proxy_routes)
        .nest("/admin", admin_routes)
        .layer(build_cors_layer())
}
